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
});
