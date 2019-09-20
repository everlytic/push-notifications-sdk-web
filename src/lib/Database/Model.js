export default class Model {
    static get(key) {
        return window.localStorage.getItem('everlytic.' + key);
    }

    static set(key, value) {
        return window.localStorage.setItem('everlytic.' + key, value);
    }

    static unset(key) {
        return window.localStorage.removeItem('everlytic.' + key);
    }
}