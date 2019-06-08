function EverlyticPushSDK () {
    let install = '';
    let projectUuid = '';
    let publicKey = '';

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

    navigator.serviceWorker.register('serviceWorker.js').then(
        function() {
            console.log('[SW] Service worker has been registered');
        },
        function(e) {
            console.error('[SW] Service worker registration failed', e);
        }
    );

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
        return new Promise((resolve, reject) => {
            if (Notification.permission === 'denied') {
                return reject(new Error('Push messages are blocked.'));
            }

            if (Notification.permission === 'granted') {
                return resolve();
            }

            if (Notification.permission === 'default') {
                return Notification.requestPermission().then(result => {
                    if (result !== 'granted') {
                        reject(new Error('Bad permission result'));
                    }

                    resolve();
                });
            }
        });
    }

    this.subscribe = function(contact, successCallback, errorCallback) {
        if (!contact.email) {
            throw 'contact.email is required.';
        }

        return checkNotificationPermission()
            .then(() => navigator.serviceWorker.ready)
            .then(serviceWorkerRegistration =>
                serviceWorkerRegistration.pushManager.subscribe({
                    userVisibleOnly: true,
                    applicationServerKey: urlBase64ToUint8Array(publicKey),
                })
            )
            .then(subscription => {
                const contactData = {
                    "email": contact.email,
                    "push_token": subscription
                };
                if (contact.unique_id) {
                    contactData.unique_id = contact.unique_id;
                }

                let data = new FormData();
                data.append('push_project_uuid', projectUuid);
                data.append('contact', JSON.stringify(contactData));

                try {
                    makeCorsRequest(install + '/servlet/push-notifications/subscribe', 'POST', data, successCallback, errorCallback);
                    // TODO: Need to store subscription ID from request.
                } catch (e) {
                    if (errorCallback && errorCallback instanceof Function) {
                        errorCallback(e);
                    }
                }
            })
            .catch(e => {
                if (Notification.permission === 'denied') {
                    console.warn('Notifications are denied by the user.');
                } else {
                    console.error('Impossible to subscribe to push notifications', e);
                }
                if (errorCallback && errorCallback instanceof Function) {
                    errorCallback(e);
                }
            });
    };

    this.unsubscribe = function (successCallback, errorCallback) {
        navigator.serviceWorker.ready
            .then(serviceWorkerRegistration => serviceWorkerRegistration.pushManager.getSubscription())
            .then(subscription => {
                if (!subscription) {
                    return;
                }

                // TODO put the CORS request here. Need to get the subscription ID some how.
            })
            .then(subscription => subscription.unsubscribe())
            .catch(function(e) {
                if (errorCallback && errorCallback instanceof Function) {
                    errorCallback(e);
                }
            });
    };

    this.deliveryEvent = function() {

    };

    this.clickEvent = function () {

    };

    this.dismissEvent = function () {

    };

    function makeCorsRequest(url, method, data = "", successCallback, errorCallback) {
        let xhr = createCORSRequest(method, url);

        if (!xhr) {
            throw new Error('CORS not supported');
        }

        xhr.onload = function () {
            console.log('Response received', xhr.responseText);
        };

        xhr.onerror = function () {
            const err = 'There was a problem making the request.';
            if (errorCallback && errorCallback instanceof Function) {
                errorCallback(err);
            } else {
                throw err;
            }
        };

        xhr.onsuccess = function () {
            if (successCallback && successCallback instanceof Function) {
                successCallback();
            }
        };

        xhr.send(data);
    }

    function createCORSRequest(method, url) {
        let xhr = new XMLHttpRequest();
        if ("withCredentials" in xhr) {
            xhr.open(method, url, true);
        } else if (typeof XDomainRequest != "undefined") {
            xhr = new XDomainRequest();
            xhr.open(method, url);
        } else {
            xhr = null;
        }
        return xhr;
    }
}