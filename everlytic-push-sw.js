self.addEventListener('push', function (event) {
    if (!(self.Notification && self.Notification.permission === 'granted')) {
        return;
    }

    const sendNotification = notificationEncoded => {
        let notification = JSON.parse(notificationEncoded);

        talkToEverlytic('deliveries', {
            'message_id': notification.message_id,
            'subscription_id': notification.subscription_id,
            'metadata': {},
            'datetime': new Date().toISOString()
        });

        return self.registration.showNotification(notification.title, {
            body: notification.body,
        });
    };

    if (event.data) {
        const message = event.data.text();
        event.waitUntil(sendNotification(message));
    }
});

self.addEventListener('message', function(event){
    if (event.data.type === 'initialize') {
        saveSetting('projectUuid', event.data.projectUuid);
        saveSetting('install', event.data.install);
    } else if (['subscribe', 'unsubscribe'].indexOf(event.data.type) !== -1) {
        talkToEverlytic(event.data.type, event.data.data);
    }
});

function talkToEverlytic(type, data, successCallback) {
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
                headers: {
                    'Content-Type': 'application/json',
                    'X-EV-Project-UUID': projectUuid
                },
                body: JSON.stringify(data)
            }
        ).then(function(result){
            if (successCallback && successCallback instanceof Function) {
                successCallback(result.json())
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

function saveSetting (name, data) {
    let openDB = openIndexedDB();

    openDB.onsuccess = function() {
        let db = getStoreIndexedDB(openDB);
        db.store.put({id: name, data: data});
    };

    return true;
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
