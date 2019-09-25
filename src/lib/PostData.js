import Model from "./Database/Model";

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
                'id': Model.get('device_id'),
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
                'id': Model.get('device_id')
            }
        };
    }

    static getUnsubscribeData() {
        return {
            'subscription_id': Model.get('subscription_id'),
            'device_id': Model.get('device_id'),
            'datetime': new Date().toISOString(),
            'metadata': {},
        };
    }

}