export default class Device {
    static getData(projectUuid, contact, subscription) {
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

}