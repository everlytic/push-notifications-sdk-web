self.addEventListener('push', function (event) {
    if (!(self.Notification && self.Notification.permission === 'granted')) {
        return;
    }

    const sendNotification = notificationEncoded => {

        let notification = JSON.parse(notificationEncoded);

        return self.registration.showNotification(notification.title, {
            body: notification.body,
        });
    };

    if (event.data) {
        const message = event.data.text();
        event.waitUntil(sendNotification(message));
    }

    //talkToEverlytic('http://local.everlytic.com', 'e29b63f4-93be-41cb-bd74-03d40527339e', 'deliveries', {});
});

self.addEventListener('message', function(event){
    return talkToEverlytic(event.data.install, event.data.projectUuid, event.data.type, event.data.data);
});

function talkToEverlytic(install, projectUuid, type, data) {
    if (['subscribe', 'unsubscribe', 'deliveries', 'clicks', 'dismissals'].indexOf(type) === -1) {
        throw 'Invalid event type';
    }

    return fetch(
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
    ).then(response => response.json());
}