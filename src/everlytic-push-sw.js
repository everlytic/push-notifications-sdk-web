self.addEventListener('push', function (event) {
    event.waitUntil(new Promise(function(resolve, reject) {
        if (!(self.Notification && self.Notification.permission === 'granted')) {
            reject();
        }

        if (event.data) {
            let notification = JSON.parse(event.data.text());

            self.registration.showNotification(notification.title, {
                body: notification.body,
                data: notification.data,
                icon: notification.data.icon,
                requireInteraction: true
            }).then(function(){
                talkToEverlytic('deliveries', {
                    'message_id': notification.data.message_id,
                    'subscription_id': notification.data.subscription_id,
                    'metadata': {},
                    'datetime': new Date().toISOString()
                }, function(){
                    resolve();
                }, function() {
                    reject();
                });
            });
        }
    }));
});

// TODO CHECK THAT THIS STILL WORKS WITH CLOSE BUTTON
self.addEventListener('notificationclose', function(event) {
    event.waitUntil(new Promise(function(resolve, reject) {
        talkToEverlytic('dismissals', {
            'message_id': event.notification.data.message_id,
            'subscription_id': event.notification.data.subscription_id,
            'metadata': {},
            'datetime': new Date().toISOString()
        }, function() {
            resolve();
        }, function() {
            reject();
        });
    }));
});

self.addEventListener('notificationclick', function(event) {
    event.waitUntil(new Promise(function(resolve, reject) {
        let recordClick = function(successCallback, errorCallback) {
            talkToEverlytic('clicks', {
                'message_id': event.notification.data.message_id,
                'subscription_id': event.notification.data.subscription_id,
                'metadata': {},
                'datetime': new Date().toISOString()
            }, successCallback, errorCallback);
        };

        if (event.notification.data.url && event.notification.data.url != '') {
            clients.openWindow(event.notification.data.url).then(function(){
                recordClick(function(){
                    event.notification.close();
                    resolve();
                }, function() {
                    reject();
                });
            });
        } else {
            recordClick(function(){
                resolve();
            }, function() {
                reject();
            });
        }
    }));
});

self.addEventListener('message', function(event) {
    if (event.data.type === 'initialize') {
        saveSettings({
            'projectUuid': event.data.projectUuid,
            'install': event.data.install
        }, function() {
            event.ports[0].postMessage({'status':'success'});
        });
    } else if (['subscribe', 'unsubscribe'].indexOf(event.data.type) !== -1) {
        talkToEverlytic(event.data.type, event.data.data, function(result){
            event.ports[0].postMessage(result);
        });
    }
});

function talkToEverlytic(type, data, successCallback, errorCallback) {
    if (['subscribe', 'unsubscribe', 'deliveries', 'clicks', 'dismissals'].indexOf(type) === -1) {
        throw 'Invalid event type';
    }

    loadSettings(function(settings) {
        let install = '';
        let projectUuid = '';

        settings.forEach(function(setting){
            if (setting.id === 'install') {
                install = setting.data;
            } else if (setting.id === 'projectUuid') {
                projectUuid = setting.data;
            }
        });

        fetch(
            install + '/servlet/push-notifications/' + type,
            {
                method: 'POST',
                mode: 'cors',
                credentials: 'omit',
                headers: {
                    'Content-Type': 'application/json',
                    'X-EV-Project-UUID': projectUuid
                },
                body: JSON.stringify(data)
            }
        ).then(function(result){
            if (successCallback && successCallback instanceof Function) {
                result.json().then(function(jsonResult){
                    successCallback(jsonResult);
                });
            }
        }).catch(function(err) {
            console.error(err);
            if (errorCallback && errorCallback instanceof Function) {
                errorCallback(err);
            }
        });
    });
}

/****************************
 ** Start of IndexDB Stuff **
 ****************************/

function openIndexedDB () {
    let openDB = indexedDB.open("everlytic", 1);

    openDB.onupgradeneeded = function() {
        let db = {};
        db.result = openDB.result;
        db.store = db.result.createObjectStore("settings", {keyPath: "id"});
    };

    return openDB;
}

function getStoreIndexedDB (openDB) {
    let db = {};
    db.result = openDB.result;
    db.tx = db.result.transaction("settings", "readwrite");
    db.store = db.tx.objectStore("settings");

    return db;
}

function saveSettings (settings, successCallback) {
    let openDB = openIndexedDB();

    openDB.onsuccess = function() {
        let db = getStoreIndexedDB(openDB);
        for (let key in settings) {
            if (!settings.hasOwnProperty(key)) continue;
            let value = settings[key];

            db.store.put({id: key, data: value});
        }

        successCallback();
    };
}

function loadSettings (callback) {
    let openDB = openIndexedDB();

    openDB.onsuccess = function() {
        let db = getStoreIndexedDB(openDB);
        let getData = db.store.getAll();

        getData.onsuccess = function() {
            callback(getData.result);
        };

        db.tx.oncomplete = function() {
            db.result.close();
        };
    };

    return true;
}

/************************
 ** Other random stuff **
 ************************/

self.addEventListener('install', function(event) {
    event.waitUntil(self.skipWaiting()); // Activate worker immediately
});

self.addEventListener('activate', function(event) {
    event.waitUntil(self.clients.claim()); // Become available to all pages
});
