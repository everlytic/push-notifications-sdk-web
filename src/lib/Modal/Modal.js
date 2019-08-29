export default class Modal {
    constructor ()
    {
        this.settings = {};

        this.modalOverlay = document.createElement('div');
        this.modalContainer = document.createElement('div');
        this.modalHeader = document.createElement('div');
        this.modalContent = document.createElement('div');
        this.modalClose = document.createElement('div');

        this.defaultSettings = {
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

        // Set the id's, append the nested elements, and append the complete modal to the document body
        this.modalOverlay.setAttribute('id', 'eve-modal-overlay');
        this.modalContainer.setAttribute('id', 'eve-modal-container');
        this.modalHeader.setAttribute('id', 'eve-modal-header');
        this.modalContent.setAttribute('id', 'eve-modal-content');
        this.modalClose.setAttribute('id', 'eve-modal-close');
        this.modalHeader.appendChild(this.modalClose);
        this.modalContainer.appendChild(this.modalHeader);
        this.modalContainer.appendChild(this.modalContent);

        this.modalOverlay.style.visibility = 'hidden';
        this.modalContainer.style.visibility = 'hidden';

        document.body.appendChild(this.modalOverlay);
        document.body.appendChild(this.modalContainer);
    }

    open(parameters)
    {
        this.settings.width = parameters.width || this.defaultSettings.width;
        this.settings.height = parameters.height || this.defaultSettings.height;
        this.settings.lock = parameters.lock || this.defaultSettings.lock;
        this.settings.hideClose = parameters.hideClose || this.defaultSettings.hideClose;
        this.settings.draggable = parameters.draggable || this.defaultSettings.draggable;
        this.settings.closeAfter = parameters.closeAfter || this.defaultSettings.closeAfter;
        this.settings.closeCallback = parameters.closeCallback || this.defaultSettings.closeCallback;
        this.settings.openCallback = parameters.openCallback || this.defaultSettings.openCallback;
        this.settings.hideOverlay = parameters.hideOverlay || this.defaultSettings.hideOverlay;

        if (parameters.content) {
            this.modalContent.innerHTML = parameters.content;
        } else {
            this.modalContent.innerHTML = '';
        }

        this.modalContainer.style.width = this.settings.width;
        this.modalContainer.style.height = this.settings.height;

        this.center({});

        if (this.settings.lock || settings.hideClose) {
            this.modalClose.style.visibility = 'hidden';
        }
        if (!this.settings.hideOverlay) {
            this.modalOverlay.style.visibility = 'visible';
        }
        this.modalContainer.style.visibility = 'visible';

        document.onkeypress = (e) => {
            if (e.keyCode === 27 && settings.lock !== true) {
                this.close();
            }
        };

        this.modalClose.onclick = () => {
            if (!this.settings.hideClose) {
                this.close();
            } else {
                return false;
            }
        };
        this.modalOverlay.onclick = () => {
            if (!this.settings.lock) {
                this.close();
            } else {
                return false;
            }
        };

        if (window.addEventListener) {
            window.addEventListener('resize', this.center({}), false);
        } else if (window.attachEvent) {
            window.attachEvent('onresize', this.center({}));
        }

        if (this.settings.draggable) {
            this.modalHeader.style.cursor = 'move';
            this.modalHeader.onmousedown = (e) => {
                this.drag(e);
                return false;
            };
        } else {
            this.modalHeader.onmousedown = function () {
                return false;
            };
        }

        if (this.settings.openCallback) {
            this.settings.openCallback();
        }
    };

    drag(e)
    {
        let xPosition = (window.event !== undefined) ? window.event.clientX : e.clientX,
            yPosition = (window.event !== undefined) ? window.event.clientY : e.clientY,
            differenceX = xPosition - this.modalContainer.offsetLeft,
            differenceY = yPosition - this.modalContainer.offsetTop;

        document.onmousemove = (e) => {
            xPosition = (window.event !== undefined) ? window.event.clientX : e.clientX;
            yPosition = (window.event !== undefined) ? window.event.clientY : e.clientY;

            this.modalContainer.style.left = ((xPosition - differenceX) > 0) ? (xPosition - differenceX) + 'px' : 0;
            this.modalContainer.style.top = ((yPosition - differenceY) > 0) ? (yPosition - differenceY) + 'px' : 0;

            document.onmouseup = function () {
                window.document.onmousemove = null;
            };
        };
    };

    close()
    {
        this.modalContent.innerHTML = '';
        this.modalOverlay.setAttribute('style', '');
        this.modalOverlay.style.cssText = '';
        this.modalOverlay.style.visibility = 'hidden';
        this.modalContainer.setAttribute('style', '');
        this.modalContainer.style.cssText = '';
        this.modalContainer.style.visibility = 'hidden';
        this.modalHeader.style.cursor = 'default';
        this.modalClose.setAttribute('style', '');
        this.modalClose.style.cssText = '';

        if (this.settings.closeCallback) {
            this.settings.closeCallback();
        }

        if (window.removeEventListener) {
            window.removeEventListener('resize', this.center({}), false);
        } else if (window.detachEvent) {
            window.detachEvent('onresize', this.center({}));
        }
    };

    center (parameters)
    {
        let documentHeight = Math.max(document.body.scrollHeight, document.documentElement.scrollHeight),

            modalWidth = Math.max(this.modalContainer.clientWidth, this.modalContainer.offsetWidth),
            modalHeight = Math.max(this.modalContainer.clientHeight, this.modalContainer.offsetHeight),

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
            this.modalContainer.style.top = amountScrolledY + (browserHeight / 2) - (modalHeight / 2) + 'px';
        }

        this.modalContainer.style.left = amountScrolledX + (browserWidth / 2) - (modalWidth / 2) + 'px';

        this.modalOverlay.style.height = documentHeight + 'px';
        this.modalOverlay.style.width = '100%';
    };
}