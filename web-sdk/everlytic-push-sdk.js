window.EverlyticPushSDK = new function () {
    const anonymousEmail = 'anonymous@everlytic.com';
    let install = '';
    let projectUuid = '';
    let publicKey = '';

    this.init = function (config) {
        initialize(config);
    };

    this.subscribeAnonymous = function() {
        return this.subscribe({"email": anonymousEmail})
    };

    this.subscribe = function (contact) {
        if (!contact.email) {
            throw 'contact.email is required.';
        }

        return checkNotificationPermission()
            .then(function () {
                return navigator.serviceWorker.ready;
            })
            .then(function (serviceWorkerRegistration) {
                    return serviceWorkerRegistration.pushManager.subscribe({
                        userVisibleOnly: true,
                        applicationServerKey: urlBase64ToUint8Array(publicKey)
                    });
                }
            )
            .then(function (subscription) {
                console.log(subscription);
                let data = {
                    'push_project_uuid': projectUuid,
                    'contact': {
                        "email": contact.email,
                        "push_token": JSON.stringify(subscription)
                    },
                    'platform': {
                        'type': navigator.appName,
                        'version': navigator.appVersion
                    },
                    'device': {
                        'id': window.localStorage.getItem('device_id'),
                        'manufacturer': navigator.appCodeName,
                        'model': navigator.userAgent,
                        'type': 'N/A'
                    },
                    'datetime': new Date().toISOString(),
                    'metadata': {},
                };

                if (contact.unique_id && contact.email !== anonymousEmail) {
                    data.contact.unique_id = contact.unique_id;
                }

                return makeRequest('subscribe', data);
            })
            .catch(function (e) {
                if (Notification.permission === 'denied') {
                    console.warn('Notifications are denied by the user.');
                } else {
                    console.error('Impossible to subscribe to push notifications', e);
                }
            });
    };

    this.unsubscribe = function () {
        navigator.serviceWorker.ready
            .then(function (serviceWorkerRegistration) {
                return serviceWorkerRegistration.pushManager.getSubscription();
            })
            .then(function (subscription) {
                if (!subscription) {
                    return;
                }

                let data = {
                    'subscription_id': window.localStorage.getItem('subscription_id'),
                    'device_id': window.localStorage.getItem('device_id'),
                    'datetime': new Date().toISOString(),
                    'metadata': {},
                };

                makeRequest('unsubscribe', data);

                return subscription.unsubscribe();
            });
    };

    /*****************************
     ***** Private Functions *****
     *****************************/

    function initialize(config) {
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

        if (!window.localStorage.getItem('device_id')) {
            window.localStorage.setItem('device_id', uuidv4());
        }

        navigator.serviceWorker.register('load-worker.js').then(
            function () {
                navigator.serviceWorker.controller.postMessage({
                    'type': 'initialize',
                    'projectUuid': projectUuid,
                    'install': install
                });
                console.log('[SW] Service worker has been registered');
            },
            function (e) {
                console.error('[SW] Service worker registration failed', e);
            }
        );
    }

    function uuidv4() {
        return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, function (c) {
            var r = Math.random() * 16 | 0, v = c == 'x' ? r : (r & 0x3 | 0x8);
            return v.toString(16);
        });
    }

    function urlBase64ToUint8Array(base64String) {
        const padding = '='.repeat((4 - (base64String.length % 4)) % 4);
        const base64 = (base64String + padding).replace(/\-/g, '+').replace(/_/g, '/');

        const rawData = window.atob(base64);
        const outputArray = new Uint8Array(rawData.length);

        for (let i = 0; i < rawData.length; ++i) {
            outputArray[i] = rawData.charCodeAt(i);
        }
        return outputArray;
    }

    function checkNotificationPermission() {
        return new Promise(function (resolve, reject) {
            if (Notification.permission === 'denied') {
                return reject(new Error('Push messages are blocked.'));
            }

            if (Notification.permission === 'granted') {
                return resolve();
            }

            if (Notification.permission === 'default') {
                return Notification.requestPermission().then(function (result) {
                    if (result !== 'granted') {
                        reject(new Error('Bad permission result'));
                    }

                    resolve();
                });
            }
        });
    }

    function makeRequest(type, data = {}) {
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
                {
                    "type": type,
                    'projectUuid': projectUuid,
                    "install": install,
                    "data": data,
                },
                [channel.port2]
            );
        });
    }
};
