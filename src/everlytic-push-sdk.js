window.EverlyticPushSDK = new function () {
    const anonymousEmail = 'anonymous@everlytic.com';
    let install = '';
    let projectUuid = '';
    let publicKey = '';

    let that = this;

    this.init = function (config) {
        if (!config.hash) {
            throw 'config.hash is required';
        }

        if (window.localStorage.getItem('everlytic.permission_granted') === 'no') {
            console.warn('User denied Preflight permission check. You may attempt to reset this by passing a parameter in the subscribe method.');
        }

        initializeServiceWorker(config);
    };

    this.subscribeAnonymous = function () {
        return this.subscribe({"email": anonymousEmail});
    };

    this.subscribeWithAskPrompt = function() {
        const email = prompt("Please enter your email address so we can send you Push Notifications", "foo@bar.com");
        if (email == null || email == "") {
            return this.subscribe({
                "email": email
            });
        }
    };

    this.subscribe = function (contact) {
        if (!contact.email) {
            throw 'contact.email is required.';
        }

        return checkNotificationPermission().then(function () {
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
                console.warn('Notifications are denied by the user.');
            } else {
                console.error('Impossible to subscribe to push notifications', e);
            }
            throw e;
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
                    console.log('[SW] Service worker has been registered');

                    if (config.autoSubscribe) {
                        response.then(function(){
                            that.subscribeAnonymous();
                        });
                    }
                } else {
                    window.location.reload(); // TODO Fix this.
                    console.log('[SW] Service worker has been registered, but not loaded. Reloading page.');
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

            if (
                window.localStorage.getItem('everlytic.permission_granted') !== 'no'
                && confirm("We would like to send you Push Notifications")
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
};
