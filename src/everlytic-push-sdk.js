import ModalHandler from './lib/Modal/ModalHandler';
import PostData from './lib/PostData';
import Helper from './lib/Helper';
import Model from './lib/Database/Model';
import PermissionRepo from './lib/Database/PermissionRepo';
import ServiceWorkerManager from "./lib/ServiceWorkerManager";

window.EverlyticPushSDK = new function () {
    const anonymousEmail = 'anonymous@everlytic.com';
    let install = '';
    let publicKey = '';
    let projectUuid = '';
    let debug = false;

    let modalHandler = {};
    let swManager = {};

    let that = this;

    this.init = (config) => {
        if (!config.hash) {
            throw 'config.hash is required';
        }

        if (config.debug) {
            debug = true;
        }

        modalHandler = new ModalHandler(config.preflight);
        swManager = new ServiceWorkerManager(config);

        freshenEveryHour();

        return initializeServiceWorker(config);
    };

    this.subscribeAnonymous = (disableDoubleOptIn) => {
        return this.subscribe({"email": anonymousEmail}, disableDoubleOptIn);
    };

    this.subscribeWithAskEmailPrompt = (optionsParam) => {
        let options = {force: false};
        if (optionsParam) {
            options = Object.assign(options, optionsParam);
        }

        return new Promise((resolve, reject) => {
            if (swManager.isInitialized()) {
                if (PermissionRepo.userHasNotDeniedOrExpired()) {
                    if (PermissionRepo.userHasGranted() && !options.force) {
                        reject('User already subscribed. Use force option to ask anyway.');
                    } else {
                        modalHandler.openAskEmailPrompt(
                            anonymousEmail,
                            (email) => {
                                subscribeContact({"email": email}).then((result) => {
                                    resolve(result);
                                }).catch((err) => {
                                    PermissionRepo.denyPermission();
                                    reject(err);
                                });
                            },
                            () => {
                                PermissionRepo.denyPermission();
                                reject('User denied pre-flight');
                            }
                        )
                    }
                } else {
                    reject('User has denied pre-flight recently. You will need to reset this manually. Or wait 30 days');
                    outputDebug('You can reset `pre-flight` now while debugging easily by clearing your browsers localStorage.');
                }
            } else {
                reject('Service Worker is not yet ready. Waiting on page reload.');
            }
        });
    };

    this.subscribe = (contact, disableDoubleOptIn) => {
        if (!contact.email) {
            throw 'contact.email is required.';
        }

        return new Promise((resolve, reject) => {
            if (swManager.isInitialized()) {
                if (PermissionRepo.userHasNotDeniedOrExpired()) {
                    if (disableDoubleOptIn || PermissionRepo.userHasGranted()) {
                        subscribeContact(contact).then((result) => {
                            resolve(result);
                        }).catch((err) => {
                            PermissionRepo.denyPermission();
                            reject(err);
                        });
                    } else {
                        modalHandler.open(
                            () => {
                                subscribeContact(contact).then((result) => {
                                    resolve(result);
                                }).catch((err) => {
                                    PermissionRepo.denyPermission();
                                    reject(err);
                                });
                            }, () => {
                                PermissionRepo.denyPermission();
                                reject('User denied pre-flight');
                            }
                        );
                    }
                } else {
                    reject('User has denied pre-flight recently. You will need to reset this manually.');
                    outputDebug('You can reset `pre-flight` now while debugging easily by clearing your browsers localStorage.');
                }
            } else {
                reject('Service Worker is not yet ready. Waiting on page reload.');
            }
        });
    };

    this.unsubscribe = () => {
        if (swManager.isInitialized()) {
            return swManager.unsubscribe().then(() => {
                this.resetPreflightCheck();
                return makeRequest('unsubscribe', PostData.getUnsubscribeData());
            });
        } else {
            return Promise.reject('Service Worker not ready, please reload the page.');
        }
    };

    this.resetPreflightCheck = () => {
        PermissionRepo.resetPermission();
    };


    /*****************************
     ***** Private Functions *****
     *****************************/

    function freshenEveryHour() {
        const diffTime = Math.abs(new Date() - new Date(Model.get('date')));
        const diffHours = Math.ceil(diffTime / (1000 * 60 * 60));

        if (PermissionRepo.userHasNotDenied() && diffHours > 1) {
            swManager.freshen();
            Model.set('date', Date().toString())
        }
    }

    function initializeServiceWorker(config) {
        const configDecoded = atob(config.hash);
        const configArray = configDecoded.split(";");

        configArray.forEach((configString) => {
            const configValue = configString.split('=');
            if (configValue[0] === 'i') {
                install = configValue[1];
            } else if (configValue[0] === 'p') {
                projectUuid = configValue[1];
            } else if (configValue[0] === 'pubk') {
                publicKey = configValue[1];
            }
        });

        swManager.checkSupported();

        let oldProjectUuid = window.localStorage.getItem('projectUuid');

        if (oldProjectUuid !== projectUuid) {
            outputDebug('Old Project: ' + oldProjectUuid + ' does not match new Project: ' + projectUuid + ' - Resetting registration.');
            return resetRegistration(config);
        } else {
            return registerServiceWorker(config);
        }
    }

    function resetRegistration(config) {
        unsetEverlyticStorage();
        window.localStorage.setItem('projectUuid', projectUuid);

        return navigator.serviceWorker.getRegistrations().then((registrations) => {
            for (let registration of registrations) {
                registration.unregister();
            }

            return registerServiceWorker(config);
        });
    }

    function unsetEverlyticStorage() {
        Model.unset('fresh');
        Model.unset('device_id');
        Model.unset('subscription_id');
        PermissionRepo.resetPermission();
    }

    function registerServiceWorker(config) {
        if (!Model.get('device_id')) {
            Model.set('device_id', Helper.uuidv4());
        }

        return swManager.registerSW(
            projectUuid,
            install,
            function () {
                outputDebug('[SW] Service worker has been registered, but not loaded.');
                if (config.installImmediately) {
                    outputDebug('[SW] `installImmediately` set, reloading page.');
                    window.location.reload();
                } else {
                    outputDebug('[SW] Pass in the `installImmediately` flag to reload the page automatically.');
                }
            },
            function (response) {
                outputDebug('[SW] Service worker has been registered');
                response.then(() => {
                    if (config.autoSubscribe) {
                        that.subscribeWithAskEmailPrompt().catch((err) => {
                            console.warn(err);
                        });
                    }
                });

                if (Model.get('device_id') && PermissionRepo.userHasGranted()) {
                    updateTokenOnServer();
                }
            }
        );
    }

    function updateTokenOnServer() {
        return swManager.subscribe(publicKey, function (subscription) {
            return makeRequest('update-token', PostData.getUpdateTokenData(subscription)).then((response) => {
                return new Promise((resolve, reject) => {
                    if (response.data && response.data.subscription && response.data.subscription.pns_id) {
                        Model.set("subscription_id", response.data.subscription.pns_id);
                        resolve(response.data);
                    } else {
                        swManager.unsubscribe().then(() => {
                            unsetEverlyticStorage();
                            reject('Could not refresh token on Everlytic');
                        });
                    }
                });
            });
        });
    }

    function subscribeContact(contact) {
        return swManager.subscribe(publicKey, function (subscription) {
            let data = PostData.getSubscribeData(projectUuid, contact, subscription);

            if (contact.unique_id && contact.email !== anonymousEmail) {
                data.contact.unique_id = contact.unique_id;
            }

            return makeRequest('subscribe', data).then((response) => {
                return new Promise((resolve, reject) => {
                    if (response.data && response.data.subscription && response.data.subscription.pns_id) {
                        Model.set("subscription_id", response.data.subscription.pns_id);
                        resolve(response.data);
                    } else {
                        swManager.unsubscribe().then(() => {
                            unsetEverlyticStorage();
                            reject('Could not subscribe to Everlytic');
                        });
                    }
                });
            });
        });
    }

    function makeRequest(type, data = {}) {
        return swManager.sendMessageToSW({
            "type": type,
            'projectUuid': projectUuid,
            "install": install,
            "data": data,
        });
    }

    function outputDebug(string) {
        if (debug) {
            console.info(string);
        }
    }
};
