export default class PostData {
    static getSubscribeData(projectUuid, contact, subscription) {
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

    static getUpdateTokenData(subscription) {
        return {
            'contact': {
                "push_token": JSON.stringify(subscription)
            },
            'device': {
                'id': window.localStorage.getItem('everlytic.device_id')
            }
        };
    }

}