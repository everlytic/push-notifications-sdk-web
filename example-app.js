document.addEventListener('DOMContentLoaded', () => {

    let SDK = new EverlyticPushSDK();

    let isPushEnabled = false;

    const pushButton = document.querySelector('#push-subscription-button');
    if (!pushButton) {
        return;
    }

    pushButton.addEventListener('click', function () {
        if (isPushEnabled) {
            SDK.unsubscribe();
        } else {
            SDK.subscribe({
                    "email": document.querySelector('#push-subscription-email').value
                },
                function () {
                    console.log('subscribe success');
                },
                function (e) {
                    console.log(e);
                    changePushButtonState('incompatible');
                }
            );
        }
    });

    document.querySelector('#push-unsubscription-button').addEventListener('click', function () {
        SDK.unsubscribe(
            function () {
                console.log('unsubcribe success');
            },
            function (e) {
                console.log(e);
            }
        );
    });

    document.querySelector('#push-anonymous-subscription-button').addEventListener('click', function () {
        SDK.subscribeAnonymous(
            function () {
                console.log('anon subscribe success');
            },
            function (e) {
                console.log(e);
            }
        );
    });

    document.querySelector('#push-delivery-button').addEventListener('click', function () {
        SDK.event(
            'deliveries',
            1,
            function () {
                console.log('delivery success');
            },
            function (e) {
                console.log(e);
            }
        );
    });

    document.querySelector('#push-click-button').addEventListener('click', function () {
        SDK.event(
            'clicks',
            1,
            function () {
                console.log('click success');
            },
            function (e) {
                console.log(e);
            }
        );
    });

    document.querySelector('#push-dismiss-button').addEventListener('click', function () {
        SDK.event(
            'dismissals',
            1,
            function () {
                console.log('dismiss success');
            },
            function (e) {
                console.log(e);
            }
        );
    });

    function changePushButtonState(state) {
        switch (state) {
            case 'enabled':
                pushButton.disabled = false;
                pushButton.textContent = 'Disable Push notifications';
                isPushEnabled = true;
                break;
            case 'disabled':
                pushButton.disabled = false;
                pushButton.textContent = 'Enable Push notifications';
                isPushEnabled = false;
                break;
            case 'computing':
                pushButton.disabled = true;
                pushButton.textContent = 'Loading...';
                break;
            case 'incompatible':
                pushButton.disabled = true;
                pushButton.textContent = 'Push notifications are not compatible with this browser';
                break;
            default:
                console.error('Unhandled push button state', state);
                break;
        }
    }
});
