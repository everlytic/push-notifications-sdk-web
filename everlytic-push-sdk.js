function EverlyticPushSDK() {
    let install = '';
    let projectUuid = '';
    let publicKey = '';

    initialize();

    this.subscribe = function (contact, successCallback, errorCallback) {
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

                if (contact.unique_id) {
                    data.contact.unique_id = contact.unique_id;
                }

                try {
                    makeCorsRequest(install + '/servlet/push-notifications/subscribe', 'POST', data, function (response) {
                        if (response.status === 'success' && response.data) {
                            window.localStorage.setItem("subscription_id", response.data.subscription.pns_id);
                            successCallback();
                        } else {
                            errorCallback(response);
                        }
                    }, errorCallback);
                } catch (e) {
                    if (errorCallback && errorCallback instanceof Function) {
                        errorCallback(e);
                    }
                }
            })
            .catch(function (e) {
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

                try {
                    makeCorsRequest(install + '/servlet/push-notifications/unsubscribe', 'POST', data, function (response) {
                        console.log(response.status);
                        if (response.status === 'success' && response.data) {
                            window.localStorage.removeItem("subscription_id");
                            successCallback();
                        } else {
                            errorCallback(response);
                        }
                    }, errorCallback);
                } catch (e) {
                    if (errorCallback && errorCallback instanceof Function) {
                        errorCallback(e);
                    }
                }

                return subscription;
            })
            .then(function (subscription) {
                return subscription.unsubscribe();
            })
            .catch(function (e) {
                if (errorCallback && errorCallback instanceof Function) {
                    errorCallback(e);
                }
            });
    };

    this.event = function (eventType, messageId, successCallback, errorCallback) {
        if (['deliveries', 'clicks', 'dismissals'].indexOf(eventType) === -1) {
            throw 'Invalid event type';
        }
        navigator.serviceWorker.ready
            .then(function (serviceWorkerRegistration) {
                return serviceWorkerRegistration.pushManager.getSubscription();
            })
            .then(function (subscription) {
                if (!subscription) {
                    return;
                }

                let data = {
                    'message_id': messageId,
                    'subscription_id': window.localStorage.getItem('subscription_id'),
                    'datetime': new Date().toISOString(),
                    'metadata': {},
                };

                try {
                    makeCorsRequest(install + '/servlet/push-notifications/' + eventType, 'POST', data, function (response) {
                        console.log(response.status);
                        if (response.status === 'success' && response.data) {
                            window.localStorage.removeItem("subscription_id");
                            successCallback();
                        } else {
                            errorCallback(response);
                        }
                    }, errorCallback);
                } catch (e) {
                    if (errorCallback && errorCallback instanceof Function) {
                        errorCallback(e);
                    }
                }

                return subscription;
            })
            .catch(function (e) {
                if (errorCallback && errorCallback instanceof Function) {
                    errorCallback(e);
                }
            });
    };

    /*****************************
     ***** Private Functions *****
     *****************************/

    function initialize() {
        const configDecoded = atob(everlyticPushConfig.hash);
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

        navigator.serviceWorker.register('everlytic-push-sw.js').then(
            function () {
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

    function makeCorsRequest(url, method, data = {}, successCallback, errorCallback) {
        let xhr = createCORSRequest(method, url);

        if (!xhr) {
            throw 'CORS not supported';
        }

        xhr.onload = function () {
            if (successCallback && successCallback instanceof Function) {
                successCallback(JSON.parse(xhr.responseText));
            }
        };

        xhr.onerror = function () {
            const err = 'There was a problem making the request.';
            if (errorCallback && errorCallback instanceof Function) {
                errorCallback(err);
            } else {
                throw err;
            }
        };

        xhr.setRequestHeader('X-EV-Project-UUID', projectUuid);
        xhr.setRequestHeader('Content-Type', 'application/json');
        xhr.send(JSON.stringify(data));
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