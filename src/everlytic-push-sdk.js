window.EverlyticPushSDK = new function () {
    const anonymousEmail = 'anonymous@everlytic.com';

    let install = '';
    let projectUuid = '';
    let publicKey = '';

    let debug = false;

    let that = this;

    this.init = function (config) {
        if (!config.hash) {
            throw 'config.hash is required';
        }

        if (config.debug) {
            debug = true;
        }

        initializeServiceWorker(config);
    };

    this.subscribeAnonymous = function () {
        return subscribeContact({"email": anonymousEmail});
    };

    this.subscribeWithAskEmailPrompt = function() {
        const email = prompt("Please enter your Email Address so we can send you Push Notifications");
        if (email !== null && email !== "") {
            return subscribeContact({"email": email}, true);
        } else {
            return Promise.reject();
        }
    };

    this.subscribe = function (contact) {
        if (!contact.email) {
            throw 'contact.email is required.';
        }

        return subscribeContact(contact);
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

    function subscribeContact (contact, bypassPreflight = false) {
        return checkNotificationPermission(bypassPreflight).then(function () {
            return navigator.serviceWorker.ready;
        }).then(function (serviceWorkerRegistration) {
            return serviceWorkerRegistration.pushManager.subscribe({
                userVisibleOnly: true,
                applicationServerKey: urlBase64ToUint8Array(publicKey)
            });
        }).then(function (subscription) {
            let data = getDeviceData(contact, subscription);

            if (contact.unique_id && contact.email !== anonymousEmail) {
                data.contact.unique_id = contact.unique_id;
            }

            return makeRequest('subscribe', data).then(function (response) {
                return new Promise(function(resolve, reject) {
                    if (response.data && response.data.subscription.pns_id) {
                        window.localStorage.setItem("everlytic.subscription_id", response.data.subscription.pns_id);
                        resolve(event.data);
                    } else {
                        unsubscribeFromServiceWorker().then(function(){
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

        if (!window.localStorage.getItem('everlytic.device_id')) {
            window.localStorage.setItem('everlytic.device_id', uuidv4());
        }

        navigator.serviceWorker.register('load-worker.js').then(
            function () {
                if (navigator.serviceWorker.controller) {
                    const response = postMessageToServiceWorker({
                        'type': 'initialize',
                        'projectUuid': projectUuid,
                        'install': install
                    });
                    outputDebug('[SW] Service worker has been registered');

                    if (config.autoSubscribe) {
                        response.then(function(){
                            that.subscribeAnonymous();
                        });
                    }
                } else {
                    window.location.reload(); // TODO Fix this.
                    outputDebug('[SW] Service worker has been registered, but not loaded. Reloading page.');
                }
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

    function checkNotificationPermission(bypassPreflight = false) {
        return new Promise(function (resolve, reject) {
            if (Notification.permission === 'denied') {
                setLSPermissionDenied();
                return reject(new Error('Push messages are blocked.'));
            }

            if (Notification.permission === 'granted') {
                setLSPermissionGranted();
                return resolve();
            }

            if (
                (window.localStorage.getItem('everlytic.permission_granted') !== 'no' || debug)
                && (bypassPreflight || confirm("We would like to send you Push Notifications"))
            ) {
                if (Notification.permission === 'default') {
                    return Notification.requestPermission().then(function (result) {
                        if (result !== 'granted') {
                            setLSPermissionDenied();
                            reject(new Error('Bad permission result'));
                        }

                        setLSPermissionGranted();
                        resolve();
                    });
                }
            } else {
                setLSPermissionDenied();
                return reject();
            }
        });
    }

    function setLSPermissionDenied()
    {
        window.localStorage.setItem('everlytic.permission_granted', 'no');
    }

    function setLSPermissionGranted()
    {
        window.localStorage.setItem('everlytic.permission_granted', 'yes');
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

    function getDeviceData(contact, subscription) {
        return {
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
                'id': window.localStorage.getItem('everlytic.device_id'),
                'manufacturer': navigator.appCodeName,
                'model': navigator.userAgent,
                'type': 'N/A'
            },
            'datetime': new Date().toISOString(),
            'metadata': {},
        };
    }

    function outputDebug(string)
    {
        if (debug) {
            console.warn(string);
        }
    }
};
