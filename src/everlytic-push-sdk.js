window.EverlyticPushSDK = new function () {
    const anonymousEmail = 'anonymous@everlytic.com';
    let preflight = {
        "title": "We would like to send you notifications for the latest news and updates.",
        "message": "Unsubscribe anytime in your browser settings.",
        "icon": "https://d1vjq17neg4i9o.cloudfront.net/icon.png"
    };

    let install = '';
    let projectUuid = '';
    let publicKey = '';

    let debug = false;

    let that = this;

    this.init = function (config) {
        if (!config.hash) {
            throw 'config.hash is required';
        }

        if (config.debug) {
            debug = true;
        }

        if (config.preflight && typeof config.preflight === 'object') {
            preflight = Object.assign(preflight, config.preflight);
        }

        // Pre-cache icon
        let tempImage = new Image();
        tempImage.src = preflight.icon;

        initializeServiceWorker(config);
    };

    this.subscribeAnonymous = function () {
        return subscribeContact({"email": anonymousEmail});
    };

    this.subscribeWithAskEmailPrompt = function(askMessage = "Please enter your email address to receive Push Notifications.") {
        const emailInputId = 'eve-modal-email';
        return new Promise(function(resolve, reject) {
            if (debug || window.localStorage.getItem('everlytic.permission_granted') !== 'no') {
                openModal(
                    askMessage,
                    `<input class="eve-modal-input" type="email" placeholder="hello@example.com" id="${emailInputId}" name="${emailInputId}" required />`,
                    preflight.icon,
                    function () {
                        let email = document.getElementById(emailInputId).value;
                        subscribeContact({"email": email}).then(function (result) {
                            resolve(result);
                        }).catch(function (err) {
                            setLSPermissionDenied();
                            reject(err);
                        });
                    },
                    function () {
                        setLSPermissionDenied();
                        reject('User denied pre-flight');
                    }
                );
            } else {
                reject('User has denied pre-flight recently. You will need to reset this manually.');
            }
        });
    };

    this.subscribe = function (contact) {
        if (!contact.email) {
            throw 'contact.email is required.';
        }
        return new Promise(function(resolve, reject) {
            if (debug || window.localStorage.getItem('everlytic.permission_granted') !== 'no') {
                openModal(preflight.title, preflight.message, preflight.icon, function() {
                    subscribeContact(contact).then(function(result) {
                        resolve(result);
                    }).catch(function(err) {
                        setLSPermissionDenied();
                        reject(err);
                    });
                }, function() {
                    setLSPermissionDenied();
                    reject('User denied pre-flight');
                });
            } else {
                reject('User has denied pre-flight recently. You will need to reset this manually.');
            }
        });

    };

    this.unsubscribe = function () {
        return unsubscribeFromServiceWorker().then(function() {
            let data = {
                'subscription_id': window.localStorage.getItem('everlytic.subscription_id'),
                'device_id': window.localStorage.getItem('everlytic.device_id'),
                'datetime': new Date().toISOString(),
                'metadata': {},
            };

            return makeRequest('unsubscribe', data);
        });
    };

    this.resetPreflightCheck = function() {
        window.localStorage.removeItem('everlytic.permission_granted');
    };


    /*****************************
     ***** Private Functions *****
     *****************************/

    function initializeServiceWorker(config) {
        const configDecoded = atob(config.hash);
        const configArray = configDecoded.split(";");

        configArray.forEach(function (configString) {
            const configValue = configString.split('=');
            if (configValue[0] === 'i') {
                install = configValue[1];
            } else if (configValue[0] === 'p') {
                projectUuid = configValue[1];
            } else if (configValue[0] === 'pubk') {
                publicKey = configValue[1];
            }
        });

        if (!('serviceWorker' in navigator)) {
            throw 'Service workers are not supported by this browser';
        }

        if (!('PushManager' in window)) {
            throw 'Push notifications are not supported by this browser';
        }

        if (!('showNotification' in ServiceWorkerRegistration.prototype)) {
            throw 'Notifications are not supported by this browser';
        }

        if (Notification.permission === 'denied') {
            throw 'Notifications are denied by the user';
        }

        if (!window.localStorage.getItem('everlytic.device_id')) {
            window.localStorage.setItem('everlytic.device_id', uuidv4());
        }

        navigator.serviceWorker.register(
            'load-worker.js',
            {updateViaCache: 'none'}
        ).then(
            function () {
                if (navigator.serviceWorker.controller) {
                    const response = postMessageToServiceWorker({
                        'type': 'initialize',
                        'projectUuid': projectUuid,
                        'install': install
                    });
                    outputDebug('[SW] Service worker has been registered');

                    if (config.autoSubscribe) {
                        response.then(function() {
                            that.subscribeAnonymous();
                        });
                    }
                } else {
                    outputDebug('[SW] Service worker has been registered, but not loaded. Reloading page.');
                    window.location.reload(); // TODO Fix this.
                }
            },
            function (e) {
                console.error('[SW] Service worker registration failed', e);
            }
        );
    }

    function uuidv4() {
        return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, function (c) {
            var r = Math.random() * 16 | 0, v = c == 'x' ? r : (r & 0x3 | 0x8);
            return v.toString(16);
        });
    }

    function subscribeContact (contact) {
        return checkNotificationPermission().then(function () {
            return navigator.serviceWorker.ready;
        }).then(function (serviceWorkerRegistration) {
            return serviceWorkerRegistration.pushManager.subscribe({
                userVisibleOnly: true,
                applicationServerKey: urlBase64ToUint8Array(publicKey)
            });
        }).then(function (subscription) {
            let data = getDeviceData(contact, subscription);

            if (contact.unique_id && contact.email !== anonymousEmail) {
                data.contact.unique_id = contact.unique_id;
            }

            return makeRequest('subscribe', data).then(function (response) {
                return new Promise(function(resolve, reject) {
                    if (response.data && response.data.subscription.pns_id) {
                        window.localStorage.setItem("everlytic.subscription_id", response.data.subscription.pns_id);
                        resolve(event.data);
                    } else {
                        unsubscribeFromServiceWorker().then(function() {
                            reject('Could not subscribe to Everlytic');
                        });
                    }
                });
            });
        }).catch(function (e) {
            if (Notification.permission === 'denied') {
                outputDebug('Notifications are denied by the user.');
            } else {
                console.error('Impossible to subscribe to push notifications', e);
            }
            throw e;
        });
    }

    function checkNotificationPermission() {
        return new Promise(function (resolve, reject) {
            if (Notification.permission === 'denied') {
                setLSPermissionDenied();
                return reject(new Error('Push messages are blocked.'));
            }

            if (Notification.permission === 'granted') {
                setLSPermissionGranted();
                return resolve();
            }

            if (Notification.permission === 'default') {
                return Notification.requestPermission().then(function (result) {
                    if (result !== 'granted') {
                        setLSPermissionDenied();
                        return reject(new Error('Bad permission result'));
                    }

                    setLSPermissionGranted();
                    return resolve();
                });
            }
        });
    }

    function setLSPermissionDenied() {
        window.localStorage.setItem('everlytic.permission_granted', 'no');
    }

    function setLSPermissionGranted() {
        window.localStorage.setItem('everlytic.permission_granted', 'yes');
    }

    function urlBase64ToUint8Array(base64String) {
        const padding = '='.repeat((4 - (base64String.length % 4)) % 4);
        const base64 = (base64String + padding).replace(/\-/g, '+').replace(/_/g, '/');

        const rawData = window.atob(base64);
        const outputArray = new Uint8Array(rawData.length);

        for (let i = 0; i < rawData.length; ++i) {
            outputArray[i] = rawData.charCodeAt(i);
        }
        return outputArray;
    }

    function getDeviceData(contact, subscription) {
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

    function unsubscribeFromServiceWorker () {
        return navigator.serviceWorker.ready.then(function (serviceWorkerRegistration) {
            return serviceWorkerRegistration.pushManager.getSubscription();
        }).then(function (subscription) {
            if (!subscription) {
                return Promise.resolve();
            }

            return subscription.unsubscribe();
        });
    }

    function makeRequest(type, data = {}) {
        return postMessageToServiceWorker({
            "type": type,
            'projectUuid': projectUuid,
            "install": install,
            "data": data,
        });
    }

    function postMessageToServiceWorker(data) {
        return new Promise(function(resolve, reject) {
            let channel = new MessageChannel();
            channel.port1.onmessage = function (event) {
                if (event.data.error) {
                    reject(event.data.error);
                } else {
                    resolve(event.data);
                }
            };

            navigator.serviceWorker.controller.postMessage(
                data,
                [channel.port2]
            );
        });
    }

    function outputDebug(string)
    {
        if (debug) {
            console.warn(string);
        }
    }


    /*****************************
     ****** Modal Functions ******
     *****************************/


    function openModal(title, body, iconSrc, confirmCallback, cancelCallback) {
        const confirmButtonId = "eve-modal-confirm-button";
        const cancelButtonId = "eve-modal-cancel-button";
        const formId = "eve-modal-form";

        EverlyticPushModal.open({
            lock: true,
            content: getModalBasicCss() + `
<form id="${formId}" action="#">
<table width="100%">
<tr>
    <td><img src="${iconSrc}" class="eve-modal-icon" /></td>
    <td>
        <div>
            <strong>${title}</strong>
        </div>
        <br/>
        ${body}
        <br/>
        <br/>
    </td>
</tr>
<tr>
    <td colspan="2">
        <div style="text-align:right;">
            <input class="eve-modal-btn eve-modal-btn-grey" id="${cancelButtonId}" type="button" value="Maybe Later"/>
            <input class="eve-modal-btn" id="${confirmButtonId}" type="submit" value="Allow"/>
        </div>    
    </td>
</tr>
</table>
</form>`,
            draggable: true,
            openCallback: function () {
                document.getElementById(formId).onsubmit = function (event) {
                    event.preventDefault();
                    confirmCallback();
                    EverlyticPushModal.close();
                };

                document.getElementById(cancelButtonId).onclick = function () {
                    cancelCallback();
                    EverlyticPushModal.close();
                };
            }
        });
    }

    function getModalBasicCss() {
        return `
<style>
    .eve-modal-btn {
        background-color: #94d229;
        border: none;
        color: white;
        padding: 15px 32px;
        text-align: center;
        text-decoration: none;
        display: inline-block;
        font-size: 16px;
    }
    
    .eve-modal-icon {
        width: 125px;
    }
    
    .eve-modal-btn-grey {
        background-color: #e7e7e7; 
        color: black;
    }
    
    .eve-modal-input {
        width: 100%;
        padding: 12px 20px;
        margin: 8px 0;
        box-sizing: border-box;
    }
    
    #eve-modal-overlay { 
        background: #fff; 
        filter: alpha(opacity=60); 
        height: 100%; left: 0; 
        -moz-opacity: 0.6; 
        -webkit-opacity: 0.6; 
        -ms-filter: alpha(opacity=60); 
        opacity: 0.6; position: absolute; 
        top: 0; 
        width: 100%; 
        z-index: 998;
    } 
    
    #eve-modal-container { 
        max-width: 650px;
        background: #fff; 
        border: 1px solid #ababab; 
        box-shadow: 0px 4px 16px rgba(0, 0, 0, 0.2); 
        height: auto; 
        padding: 10px; 
        font-family: arial,sans-serif; 
        font-size: 14px; 
        position: absolute; 
        z-index: 998;
    }     
    
    #eve-modal-header { 
        height: 20px; 
        overflow: hidden;   
        clear: both; 
    } 
    
    #eve-modal-close { 
        background: #fff url('https://d1vjq17neg4i9o.cloudfront.net/modal-close.png') no-repeat center center; 
        cursor: pointer; 
        display: block; 
        filter: alpha(opacity=60); 
        -moz-opacity: 0.6; 
        -webkit-opacity: 0.6; 
        -ms-filter: alpha(opacity=60); 
        opacity: 0.6; 
        float: right; 
        height: 20px; 
        width: 20px;
    } 
    
    #modal-close:hover { 
        filter: alpha(opacity=100); 
        -moz-opacity: 1.0; 
        -webkit-opacity: 1.0; 
        -ms-filter: alpha(opacity=100); 
        opacity: 1.0;
    } 
        
    #eve-modal-content { 
        display: block; 
        padding: 15px;
        z-index: 999;
    } 
    
    #eve-modal-content td {
        vertical-align: top;
        padding: 0 15px 15px 15px;
    }
    

    @media only screen and (max-width: 600px) {
        #eve-modal-container {
            width: 99% !important;
            top: 1px !important;
            left: 1px !important;
        }
        #eve-modal-content {
            padding: 0 !important;
        }
        #eve-modal-content td {
            padding: 0 5px 5px 5px !important;
        }
        #eve-modal-header {
            height: 5px !important;
        }
        .eve-modal-icon {
            width: 100% !important;
        }
    }
</style>`;
    }

    let EverlyticPushModal = (function () {
        "use strict";
        /*global document: false */
        /*global window: false */

        // create object method
        var method = {},
            settings = {},

            modalOverlay = document.createElement('div'),
            modalContainer = document.createElement('div'),
            modalHeader = document.createElement('div'),
            modalContent = document.createElement('div'),
            modalClose = document.createElement('div'),

            centerModal,

            closeModalEvent,

            defaultSettings = {
                width: 'auto',
                height: 'auto',
                lock: false,
                hideClose: false,
                draggable: false,
                closeAfter: 0,
                openCallback: false,
                closeCallback: false,
                hideOverlay: false
            };

        // Open the modal
        method.open = function (parameters) {
            settings.width = parameters.width || defaultSettings.width;
            settings.height = parameters.height || defaultSettings.height;
            settings.lock = parameters.lock || defaultSettings.lock;
            settings.hideClose = parameters.hideClose || defaultSettings.hideClose;
            settings.draggable = parameters.draggable || defaultSettings.draggable;
            settings.closeAfter = parameters.closeAfter || defaultSettings.closeAfter;
            settings.closeCallback = parameters.closeCallback || defaultSettings.closeCallback;
            settings.openCallback = parameters.openCallback || defaultSettings.openCallback;
            settings.hideOverlay = parameters.hideOverlay || defaultSettings.hideOverlay;

            centerModal = function () {
                method.center({});
            };

            if (parameters.content) {
                modalContent.innerHTML = parameters.content;
            } else {
                modalContent.innerHTML = '';
            }

            modalContainer.style.width = settings.width;
            modalContainer.style.height = settings.height;

            method.center({});

            if (settings.lock || settings.hideClose) {
                modalClose.style.visibility = 'hidden';
            }
            if (!settings.hideOverlay) {
                modalOverlay.style.visibility = 'visible';
            }
            modalContainer.style.visibility = 'visible';

            document.onkeypress = function (e) {
                if (e.keyCode === 27 && settings.lock !== true) {
                    method.close();
                }
            };

            modalClose.onclick = function () {
                if (!settings.hideClose) {
                    method.close();
                } else {
                    return false;
                }
            };
            modalOverlay.onclick = function () {
                if (!settings.lock) {
                    method.close();
                } else {
                    return false;
                }
            };

            if (window.addEventListener) {
                window.addEventListener('resize', centerModal, false);
            } else if (window.attachEvent) {
                window.attachEvent('onresize', centerModal);
            }

            if (settings.draggable) {
                modalHeader.style.cursor = 'move';
                modalHeader.onmousedown = function (e) {
                    method.drag(e);
                    return false;
                };
            } else {
                modalHeader.onmousedown = function () {
                    return false;
                };
            }
            if (settings.closeAfter > 0) {
                closeModalEvent = window.setTimeout(function () {
                    method.close();
                }, settings.closeAfter * 1000);
            }
            if (settings.openCallback) {
                settings.openCallback();
            }
        };

        // Drag the modal
        method.drag = function (e) {
            var xPosition = (window.event !== undefined) ? window.event.clientX : e.clientX,
                yPosition = (window.event !== undefined) ? window.event.clientY : e.clientY,
                differenceX = xPosition - modalContainer.offsetLeft,
                differenceY = yPosition - modalContainer.offsetTop;

            document.onmousemove = function (e) {
                xPosition = (window.event !== undefined) ? window.event.clientX : e.clientX;
                yPosition = (window.event !== undefined) ? window.event.clientY : e.clientY;

                modalContainer.style.left = ((xPosition - differenceX) > 0) ? (xPosition - differenceX) + 'px' : 0;
                modalContainer.style.top = ((yPosition - differenceY) > 0) ? (yPosition - differenceY) + 'px' : 0;

                document.onmouseup = function () {
                    window.document.onmousemove = null;
                };
            };
        };

        // Close the modal
        method.close = function () {
            modalContent.innerHTML = '';
            modalOverlay.setAttribute('style', '');
            modalOverlay.style.cssText = '';
            modalOverlay.style.visibility = 'hidden';
            modalContainer.setAttribute('style', '');
            modalContainer.style.cssText = '';
            modalContainer.style.visibility = 'hidden';
            modalHeader.style.cursor = 'default';
            modalClose.setAttribute('style', '');
            modalClose.style.cssText = '';

            if (closeModalEvent) {
                window.clearTimeout(closeModalEvent);
            }

            if (settings.closeCallback) {
                settings.closeCallback();
            }

            if (window.removeEventListener) {
                window.removeEventListener('resize', centerModal, false);
            } else if (window.detachEvent) {
                window.detachEvent('onresize', centerModal);
            }
        };

        // Center the modal in the viewport
        method.center = function (parameters) {
            var documentHeight = Math.max(document.body.scrollHeight, document.documentElement.scrollHeight),

                modalWidth = Math.max(modalContainer.clientWidth, modalContainer.offsetWidth),
                modalHeight = Math.max(modalContainer.clientHeight, modalContainer.offsetHeight),

                browserWidth = 0,
                browserHeight = 0,

                amountScrolledX = 0,
                amountScrolledY = 0;

            if (typeof (window.innerWidth) === 'number') {
                browserWidth = window.innerWidth;
                browserHeight = window.innerHeight;
            } else if (document.documentElement && document.documentElement.clientWidth) {
                browserWidth = document.documentElement.clientWidth;
                browserHeight = document.documentElement.clientHeight;
            }

            if (typeof (window.pageYOffset) === 'number') {
                amountScrolledY = window.pageYOffset;
                amountScrolledX = window.pageXOffset;
            } else if (document.body && document.body.scrollLeft) {
                amountScrolledY = document.body.scrollTop;
                amountScrolledX = document.body.scrollLeft;
            } else if (document.documentElement && document.documentElement.scrollLeft) {
                amountScrolledY = document.documentElement.scrollTop;
                amountScrolledX = document.documentElement.scrollLeft;
            }

            if (!parameters.horizontalOnly) {
                modalContainer.style.top = amountScrolledY + (browserHeight / 2) - (modalHeight / 2) + 'px';
            }

            modalContainer.style.left = amountScrolledX + (browserWidth / 2) - (modalWidth / 2) + 'px';

            modalOverlay.style.height = documentHeight + 'px';
            modalOverlay.style.width = '100%';
        };

        // Set the id's, append the nested elements, and append the complete modal to the document body
        modalOverlay.setAttribute('id', 'eve-modal-overlay');
        modalContainer.setAttribute('id', 'eve-modal-container');
        modalHeader.setAttribute('id', 'eve-modal-header');
        modalContent.setAttribute('id', 'eve-modal-content');
        modalClose.setAttribute('id', 'eve-modal-close');
        modalHeader.appendChild(modalClose);
        modalContainer.appendChild(modalHeader);
        modalContainer.appendChild(modalContent);

        modalOverlay.style.visibility = 'hidden';
        modalContainer.style.visibility = 'hidden';

        if (window.addEventListener) {
            window.addEventListener('load', function () {
                document.body.appendChild(modalOverlay);
                document.body.appendChild(modalContainer);
            }, false);
        } else if (window.attachEvent) {
            window.attachEvent('onload', function () {
                document.body.appendChild(modalOverlay);
                document.body.appendChild(modalContainer);
            });
        }

        return method;
    }());
};
