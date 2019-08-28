import ModalHandler from './lib/Modal/ModalHandler';
import Device from './lib/Device';
import Helper from './lib/Helper';

window.EverlyticPushSDK = new function () {
    const anonymousEmail = 'anonymous@everlytic.com';
    let install = '';
    let publicKey = '';
    let projectUuid = '';
    let debug = false;
    let modalHandler = {};
    let worker = {
        "file": "load-worker.js",
        "scope": "/",
    };
    let that = this;

    this.init = function (config) {
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

    this.subscribeAnonymous = function () {
        return this.subscribe({"email": anonymousEmail});
    };

    this.subscribeWithAskEmailPrompt = function() {
        return new Promise(function(resolve, reject) {
            if (debug || window.localStorage.getItem('everlytic.permission_granted') !== 'no') {
                modalHandler.openAskEmailPrompt(
                    anonymousEmail,
                    function (email) {
                        subscribeContact({"email": email}).then(function (result) {
                            resolve(result);
                        }).catch(function (err) {
                            setLSPermissionDenied();
                            reject(err);
                        });
                    },
                    function () {
                        setLSPermissionDenied();
                        reject('User denied pre-flight');
                    }
                )
            } else {
                reject('User has denied pre-flight recently. You will need to reset this manually.');
            }
        });
    };

    this.subscribe = function (contact) {
        if (!contact.email) {
            throw 'contact.email is required.';
        }
        return new Promise(function(resolve, reject) {
            let pfPermission = window.localStorage.getItem('everlytic.permission_granted');
            if (debug || pfPermission !== 'no') {
                if (pfPermission === 'yes') {
                    subscribeContact(contact).then(function(result) {
                        resolve(result);
                    }).catch(function(err) {
                        setLSPermissionDenied();
                        reject(err);
                    });
                } else {
                    modalHandler.open(
                        function() {
                            subscribeContact(contact).then(function(result) {
                                resolve(result);
                            }).catch(function(err) {
                                setLSPermissionDenied();
                                reject(err);
                            });
                        }, function() {
                            setLSPermissionDenied();
                            reject('User denied pre-flight');
                        }
                    );
                }
            } else {
                reject('User has denied pre-flight recently. You will need to reset this manually.');
            }
        });
    };

    this.unsubscribe = function () {
        return unsubscribeFromServiceWorker().then(function() {
            let data = {
                'subscription_id': window.localStorage.getItem('everlytic.subscription_id'),
                'device_id': window.localStorage.getItem('everlytic.device_id'),
                'datetime': new Date().toISOString(),
                'metadata': {},
            };

            return makeRequest('unsubscribe', data);
        });
    };

    this.resetPreflightCheck = function() {
        window.localStorage.removeItem('everlytic.permission_granted');
    };


    /*****************************
     ***** Private Functions *****
     *****************************/


    function initializeServiceWorker(config) {
        const configDecoded = atob(config.hash);
        const configArray = configDecoded.split(";");

        configArray.forEach(function (configString) {
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

            navigator.serviceWorker.getRegistrations().then(function(registrations) {
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
                scope: worker.scope,
                updateViaCache: 'none',
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
                        response.then(function() {
                            that.subscribeAnonymous();
                        });
                    }
                } else {
                    outputDebug('[SW] Service worker has been registered, but not loaded. Reload page.');
                    // window.location.reload(); // TODO Fix this.
                }
            },
            function (e) {
                console.error('[SW] Service worker registration failed', e);
            }
        );
    }

    function subscribeContact (contact) {
        return checkNotificationPermission().then(function () {
            return navigator.serviceWorker.ready;
        }).then(function (serviceWorkerRegistration) {
            return serviceWorkerRegistration.pushManager.subscribe({
                userVisibleOnly: true,
                applicationServerKey: Helper.urlBase64ToUint8Array(publicKey)
            });
        }).then(function (subscription) {
            let data = Device.getData(projectUuid, contact, subscription);

            if (contact.unique_id && contact.email !== anonymousEmail) {
                data.contact.unique_id = contact.unique_id;
            }

            return makeRequest('subscribe', data).then(function (response) {
                return new Promise(function(resolve, reject) {
                    if (response.data && response.data.subscription.pns_id) {
                        window.localStorage.setItem("everlytic.subscription_id", response.data.subscription.pns_id);
                        resolve(event.data);
                    } else {
                        unsubscribeFromServiceWorker().then(function() {
                            reject('Could not subscribe to Everlytic');
                        });
                    }
                });
            });
        }).catch(function (e) {
            if (Notification.permission === 'denied') {
                outputDebug('Notifications are denied by the user.');
            } else {
                console.error('Impossible to subscribe to push notifications', e);
            }
            throw e;
        });
    }

    function checkNotificationPermission() {
        return new Promise(function (resolve, reject) {
            if (Notification.permission === 'denied') {
                setLSPermissionDenied();
                return reject(new Error('Push messages are blocked.'));
            }

            if (Notification.permission === 'granted') {
                setLSPermissionGranted();
                return resolve();
            }

            if (Notification.permission === 'default') {
                return Notification.requestPermission().then(function (result) {
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
        return navigator.serviceWorker.ready.then(function (serviceWorkerRegistration) {
            return serviceWorkerRegistration.pushManager.getSubscription();
        }).then(function (subscription) {
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
        return new Promise(function(resolve, reject) {
            let channel = new MessageChannel();
            channel.port1.onmessage = function (event) {
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
            console.warn(string);
        }
    }
};
