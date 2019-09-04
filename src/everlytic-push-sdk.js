import ModalHandler from './lib/Modal/ModalHandler';
import Device from './lib/Device';
import Helper from './lib/Helper';

window.EverlyticPushSDK = new function () {
    let worker = {
        "file": "/load-worker.js"
    };

    const anonymousEmail = 'anonymous@everlytic.com';
    let install = '';
    let publicKey = '';
    let projectUuid = '';
    let debug = false;
    let modalHandler = {};

    let that = this;

    this.init = (config) => {
        if (!config.hash) {
            throw 'config.hash is required';
        }

        if (config.debug) {
            debug = true;
        }

        if (config.worker) {
            worker = Object.assign(worker, config.worker);
        }

        modalHandler = new ModalHandler(config.preflight);

        initializeServiceWorker(config);
    };

    this.subscribeAnonymous = () => {
        return this.subscribe({"email": anonymousEmail});
    };

    this.subscribeWithAskEmailPrompt = (optionsParam) => {
        let options = {force:false};
        if (optionsParam) {
            options = Object.assign(options, optionsParam);
        }

        return new Promise((resolve, reject) => {
            if (navigator.serviceWorker.controller) {
                if (debug || window.localStorage.getItem('everlytic.permission_granted') !== 'no') {
                    if (window.localStorage.getItem('everlytic.permission_granted') === 'yes' && !options.force) {
                        reject('User already subscribed. Use force option to ask anyway.');
                    } else {
                        modalHandler.openAskEmailPrompt(
                            anonymousEmail,
                            (email) => {
                                subscribeContact({"email": email}).then( (result) => {
                                    resolve(result);
                                }).catch((err) => {
                                    setLSPermissionDenied();
                                    reject(err);
                                });
                            },
                            () => {
                                setLSPermissionDenied();
                                reject('User denied pre-flight');
                            }
                        )
                    }
                } else {
                    reject('User has denied pre-flight recently. You will need to reset this manually.');
                }
            } else {
                reject('Service Worker is not yet ready. Waiting on page reload.');
            }
        });
    };

    this.subscribe = (contact) => {
        if (!contact.email) {
            throw 'contact.email is required.';
        }
        return new Promise((resolve, reject) => {
            if (navigator.serviceWorker.controller) {
                let pfPermission = window.localStorage.getItem('everlytic.permission_granted');
                if (debug || pfPermission !== 'no') {
                    if (pfPermission === 'yes') {
                        subscribeContact(contact).then((result) => {
                            resolve(result);
                        }).catch((err) => {
                            setLSPermissionDenied();
                            reject(err);
                        });
                    } else {
                        modalHandler.open(
                            () => {
                                subscribeContact(contact).then((result) => {
                                    resolve(result);
                                }).catch((err) => {
                                    setLSPermissionDenied();
                                    reject(err);
                                });
                            }, () => {
                                setLSPermissionDenied();
                                reject('User denied pre-flight');
                            }
                        );
                    }
                } else {
                    reject('User has denied pre-flight recently. You will need to reset this manually.');
                }
            } else {
                reject('Service Worker is not yet ready. Waiting on page reload.');
            }
        });
    };

    this.unsubscribe = () => {
        if (navigator.serviceWorker.controller) {
            return unsubscribeFromServiceWorker().then(() => {
                let data = {
                    'subscription_id': window.localStorage.getItem('everlytic.subscription_id'),
                    'device_id': window.localStorage.getItem('everlytic.device_id'),
                    'datetime': new Date().toISOString(),
                    'metadata': {},
                };

                return makeRequest('unsubscribe', data);
            });
        } else {
            return Promise.reject('Service Worker not ready, please reload the page.');
        }
    };

    this.resetPreflightCheck = () => {
        window.localStorage.removeItem('everlytic.permission_granted');
    };


    /*****************************
     ***** Private Functions *****
     *****************************/


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

        if (!('serviceWorker' in navigator)) {
            throw 'Service workers are not supported by this browser';
        }

        if (!('PushManager' in window)) {
            throw 'Push notifications are not supported by this browser';
        }

        if (!('showNotification' in ServiceWorkerRegistration.prototype)) {
            throw 'Notifications are not supported by this browser';
        }

        if (Notification.permission === 'denied') {
            throw 'Notifications are denied by the user';
        }

        let oldProjectUuid = window.localStorage.getItem('projectUuid');

        // If the project changed, reset all data.
        if (oldProjectUuid !== projectUuid) {
            outputDebug('Old Project: ' + oldProjectUuid + ' does not match new Project: ' + projectUuid + ' - Resetting localstorage.');
            window.localStorage.clear();
            window.localStorage.setItem('projectUuid', projectUuid);

            navigator.serviceWorker.getRegistrations().then((registrations) => {
                for(let registration of registrations) {
                    registration.unregister();
                }

                registerServiceWorker(config);
            });
        } else {
            registerServiceWorker(config);
        }
    }

    function registerServiceWorker(config)
    {
        if (!window.localStorage.getItem('everlytic.device_id')) {
            window.localStorage.setItem('everlytic.device_id', Helper.uuidv4());
        }

        navigator.serviceWorker.register(
            worker.file,
            {
                updateViaCache: 'none'
            }
        ).then(
            function () {
                if (navigator.serviceWorker.controller) {
                    const response = postMessageToServiceWorker({
                        'type': 'initialize',
                        'projectUuid': projectUuid,
                        'install': install
                    });
                    outputDebug('[SW] Service worker has been registered');

                    if (config.autoSubscribe) {
                        response.then(() => {
                            that.subscribeWithAskEmailPrompt().catch((err) => {
                                console.warn(err);
                            })
                        });
                    }
                } else {
                    outputDebug('[SW] Service worker has been registered, but not loaded.');
                    if (config.installImmediately) {
                        outputDebug('[SW] `installImmediately` set, reloading page.');
                        window.location.reload();
                    } else {
                        outputDebug('[SW] Pass in the `installImmediately` flag to reload the page automatically.');
                    }
                }
            },
            (e) => {
                console.error('[SW] Service worker registration failed', e);
            }
        );
    }

    function subscribeContact (contact) {
        return checkNotificationPermission().then(() => {
            return navigator.serviceWorker.ready;
        }).then((serviceWorkerRegistration) => {
            return serviceWorkerRegistration.pushManager.subscribe({
                userVisibleOnly: true,
                applicationServerKey: Helper.urlBase64ToUint8Array(publicKey)
            });
        }).then((subscription) => {
            let data = Device.getData(projectUuid, contact, subscription);

            if (contact.unique_id && contact.email !== anonymousEmail) {
                data.contact.unique_id = contact.unique_id;
            }

            return makeRequest('subscribe', data).then((response) => {
                return new Promise((resolve, reject) => {
                    if (response.data && response.data.subscription.pns_id) {
                        window.localStorage.setItem("everlytic.subscription_id", response.data.subscription.pns_id);
                        resolve(response.data);
                    } else {
                        unsubscribeFromServiceWorker().then(() => {
                            reject('Could not subscribe to Everlytic');
                        });
                    }
                });
            });
        }).catch((e) => {
            if (Notification.permission === 'denied') {
                outputDebug('Notifications are denied by the user.');
            } else {
                console.error('Impossible to subscribe to push notifications', e);
            }
            throw e;
        });
    }

    function checkNotificationPermission() {
        return new Promise((resolve, reject) => {
            if (Notification.permission === 'denied') {
                setLSPermissionDenied();
                return reject(new Error('Push messages are blocked.'));
            }

            if (Notification.permission === 'granted') {
                setLSPermissionGranted();
                return resolve();
            }

            if (Notification.permission === 'default') {
                return Notification.requestPermission().then((result) => {
                    if (result !== 'granted') {
                        setLSPermissionDenied();
                        return reject(new Error('Bad permission result'));
                    }

                    setLSPermissionGranted();
                    return resolve();
                });
            }
        });
    }

    function setLSPermissionDenied() {
        window.localStorage.setItem('everlytic.permission_granted', 'no');
    }

    function setLSPermissionGranted() {
        window.localStorage.setItem('everlytic.permission_granted', 'yes');
    }

    function unsubscribeFromServiceWorker () {
        return navigator.serviceWorker.ready.then((serviceWorkerRegistration) => {
            return serviceWorkerRegistration.pushManager.getSubscription();
        }).then((subscription) => {
            if (!subscription) {
                return Promise.resolve();
            }

            return subscription.unsubscribe();
        });
    }

    function makeRequest(type, data = {}) {
        return postMessageToServiceWorker({
            "type": type,
            'projectUuid': projectUuid,
            "install": install,
            "data": data,
        });
    }

    function postMessageToServiceWorker(data) {
        return new Promise((resolve, reject) => {
            let channel = new MessageChannel();
            channel.port1.onmessage = (event) => {
                if (event.data.error) {
                    reject(event.data.error);
                } else {
                    resolve(event.data);
                }
            };

            navigator.serviceWorker.controller.postMessage(
                data,
                [channel.port2]
            );
        });
    }

    function outputDebug(string)
    {
        if (debug) {
            console.info(string);
        }
    }
};
