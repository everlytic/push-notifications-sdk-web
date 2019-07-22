let install = '';
let projectUuid = '';

self.addEventListener('push', function (event) {
    if (!(self.Notification && self.Notification.permission === 'granted')) {
        return;
    }

    const sendNotification = function(notificationEncoded) {
        let notification = JSON.parse(notificationEncoded);

        talkToEverlytic('deliveries', {
            'message_id': notification.data.message_id,
            'subscription_id': notification.data.subscription_id,
            'metadata': {},
            'datetime': new Date().toISOString()
        });

        return self.registration.showNotification(notification.title, {
            body: notification.body,
            data: notification.data
        });
    };

    if (event.data) {
        const message = event.data.text();
        event.waitUntil(sendNotification(message));
    }
});

self.addEventListener('notificationclick', function(event) {
    talkToEverlytic('clicks', {
        'message_id': event.notification.data.message_id,
        'subscription_id': event.notification.data.subscription_id,
        'metadata': {},
        'datetime': new Date().toISOString()
    });

    event.notification.close();

    if (event.notification.data.url) {
        event.waitUntil(
            clients.openWindow(event.notification.data.url)
        );
    }
});

self.addEventListener('notificationclose', function(event) {
    talkToEverlytic('dismissals', {
        'message_id': event.notification.data.message_id,
        'subscription_id': event.notification.data.subscription_id,
        'metadata': {},
        'datetime': new Date().toISOString()
    });
});

self.addEventListener('message', function(event) {
    if (event.data.type === 'initialize') {
        install = event.data.install;
        projectUuid = event.data.projectUuid;
        event.ports[0].postMessage('success');
    } else if (['subscribe', 'unsubscribe'].indexOf(event.data.type) !== -1) {
        talkToEverlytic(event.data.type, event.data.data, function(result){
            event.ports[0].postMessage(result);
        });
    }
});

function talkToEverlytic(type, data, successCallback) {
    if (['subscribe', 'unsubscribe', 'deliveries', 'clicks', 'dismissals'].indexOf(type) === -1) {
        throw 'Invalid event type';
    }

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
            result.json().then(function(jsonResult){
                successCallback(jsonResult);
            });
        }
    }).catch(function(err) {
        console.error(err);
    });

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
