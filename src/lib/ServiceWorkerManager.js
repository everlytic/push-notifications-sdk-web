import Helper from "./Helper";
import PermissionRepo from "./Database/PermissionRepo";
import Model from "./Database/Model";

export default class ServiceWorkerManager {
    constructor(config) {
        this.worker = {
            "file": "/load-worker.js"
        };

        if (config.worker) {
            this.worker = Object.assign(this.worker, config.worker);
        }
    }

    registerSW(projectUuid, install, beforeInitializedCallback, afterInitializedCallback) {
        let currentHour = Math.floor(Date.now() / (1000 * 60 * 60));

        return navigator.serviceWorker.register(
            this.worker.file + '?h=' + currentHour.toString(),
            {
                updateViaCache: 'none'
            }
        ).then(
            () => {
                if (this.isInitialized()) {
                    const response = this.sendMessageToSW({
                        'type': 'initialize',
                        'projectUuid': projectUuid,
                        'install': install
                    });

                    if (Model.get('fresh') === '1' || PermissionRepo.userHasNotBeenAsked()) {
                        afterInitializedCallback(response);
                    }
                    Model.set('fresh', '0');
                } else {
                    beforeInitializedCallback();
                    Model.set('fresh', '1');
                }
            }
        ).catch((err) => {
            console.error('[SW] Service worker registration failed', err);
        });
    }

    sendMessageToSW(data) {
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

    subscribe(publicKey, callback) {
        return this._checkNotificationPermission().then(() => {
            return navigator.serviceWorker.ready;
        }).then((serviceWorkerRegistration) => {
            return serviceWorkerRegistration.pushManager.subscribe({
                userVisibleOnly: true,
                applicationServerKey: Helper.urlBase64ToUint8Array(publicKey)
            });
        }).then((subscription) => {
            callback(subscription);
        }).catch((e) => {
            if (Notification.permission === 'denied') {
                outputDebug('Notifications are denied by the user.');
            } else {
                console.error('Impossible to subscribe to push notifications', e);
            }
            throw e;
        });
    }

    _checkNotificationPermission() {
        return new Promise((resolve, reject) => {
            if (Notification.permission === 'denied') {
                PermissionRepo.denyPermission();
                return reject(new Error('Push messages are blocked.'));
            }

            if (Notification.permission === 'granted') {
                PermissionRepo.grantPermission();
                return resolve();
            }

            if (Notification.permission === 'default') {
                return Notification.requestPermission().then((result) => {
                    if (result !== 'granted') {
                        PermissionRepo.denyPermission();
                        return reject(new Error('Bad permission result'));
                    }

                    PermissionRepo.grantPermission();
                    return resolve();
                });
            }
        });
    }

    unsubscribe() {
        return navigator.serviceWorker.ready.then((serviceWorkerRegistration) => {
            return serviceWorkerRegistration.pushManager.getSubscription();
        }).then((subscription) => {
            if (!subscription) {
                return Promise.resolve();
            }

            return subscription.unsubscribe();
        });
    }

    freshen() {
        Model.set('fresh', '1');
    }

    checkSupported() {
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
    }

    isInitialized() {
        return !!navigator.serviceWorker.controller;
    }

}