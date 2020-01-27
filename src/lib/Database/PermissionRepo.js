import Model from './Model';

export default class PermissionRepo {
    static userHasGranted() {
        return Model.get('permission_granted') === 'yes';
    }

    static userHasNotDenied() {
        return Model.get('permission_granted') !== 'no'
    }

    static userHasNotDeniedOrExpired() {
        const diffTime = Math.abs(new Date() - new Date(Model.get('date')));
        const diffHours = Math.ceil(diffTime / (1000 * 60 * 60));

        return this.userHasNotDenied() || diffHours > 720;
    }

    static userHasNotBeenAsked() {
        return Model.get('permission_granted') !== 'no' && Model.get('permission_granted') !== 'yes';
    }

    static denyPermission() {
        Model.set('permission_granted', 'no');
    }

    static grantPermission() {
        Model.set('permission_granted', 'yes');
    }

    static resetPermission() {
        Model.unset('permission_granted');
    }
}