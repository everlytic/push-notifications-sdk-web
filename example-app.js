document.addEventListener('DOMContentLoaded', () => {

  let SDK = new EverlyticPushSDK();

  let isPushEnabled = false;

  const pushButton = document.querySelector('#push-subscription-button');
  if (!pushButton) {
    return;
  }

  pushButton.addEventListener('click', function() {
    if (isPushEnabled) {
      push_unsubscribe();
    } else {
      SDK.subscribe({
              "email" : document.querySelector('#push-subscription-email')
          },
          function() {
              alert('success');
          },
          function(e) {
              changePushButtonState('incompatible');
          }
      );
    }
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
