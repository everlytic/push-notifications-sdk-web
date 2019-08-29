import ModalCustomizer from './ModalCustomizer';

export default class ModalHandler {
    constructor(preflightOptions) {
        this.preflight = {
            "title": "We would like to send you notifications for the latest news and updates.",
            "message": "Unsubscribe anytime in your browser settings.",
            "icon": "https://d1vjq17neg4i9o.cloudfront.net/icon.png",
            "primaryColour": "#94d229"
        };

        if (preflightOptions && typeof preflightOptions === 'object') {
            this.preflight = Object.assign(this.preflight, preflightOptions);
        }

        // Pre-cache icon
        let tempImage = new Image();
        tempImage.src = this.preflight.icon;

        this.modalCustomizer = new ModalCustomizer(this.preflight.primaryColour);
    }

    open(confirmCallback, cancelCallback) {
        this.modalCustomizer.open(
            this.preflight.title,
            this.preflight.message,
            this.preflight.icon,
            {
                afterConfirmCallback: confirmCallback,
                cancelCallback: cancelCallback
            },
        );
    }

    openAskEmailPrompt(anonymousEmail, confirmCallback, cancelCallback) {
        const emailInputId = 'eve-modal-email';

        this.open(
            () => {
                this.modalCustomizer.open(
                    "Please enter your email address to receive Push Notifications.",
                    `<input class="eve-modal-input" type="email" placeholder="hello@example.com" id="${emailInputId}" name="${emailInputId}" required />`,
                    this.preflight.icon,
                    {
                        beforeConfirmCallback: () => {
                            confirmCallback(document.getElementById(emailInputId).value);
                        },
                        cancelCallback: () => {
                            confirmCallback(anonymousEmail);
                        },
                    },
                    'Subscribe with email',
                    'Subscribe anonymously'
                );
            },
            cancelCallback
        );
    }
}