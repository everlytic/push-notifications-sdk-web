import Modal from "./Modal";

export default class ModalCustomizer {
    constructor(primaryColour) {
        this.primaryColour = primaryColour;
        this.confirmButtonId = "eve-modal-confirm-button";
        this.cancelButtonId = "eve-modal-cancel-button";
        this.formId = "eve-modal-form";

        this.modal = new Modal();
    }

    open(title, body, iconSrc, callbacks, confirmText, cancelText) {

        if (!confirmText) {
            confirmText = "Allow";
        }
        if (!cancelText) {
            cancelText = "Maybe Later";
        }

        this.modal.open({
            lock: true,
            content: this.getModalBasicCss() + `
<form id="${this.formId}" name="${this.formId}" action="#">
<div style="display: table !important; padding: 0px 10px 10px 10px !important;">
    <div style="display: table-row !important">
        <div style="display: table-cell !important"><img src="${iconSrc}" class="eve-modal-icon" /></div>
        <div style="display: table-cell !important; vertical-align: middle !important; padding-left:10px !important">
            <div class="eve-modal-title">
                ${title}
            </div>
            <br/>
            <span class="eve-modal-body">${body}</span>
            <br/>
            <br/>
        </div>
    </div>
</div>
<div style="padding: 0px 10px 10px 10px !important;">
    <div style="text-align:right !important;">
        <input class="eve-modal-btn eve-modal-btn-grey" id="${this.cancelButtonId}" type="button" value="${cancelText}"/>
        <input class="eve-modal-btn" id="${this.confirmButtonId}" type="submit" value="${confirmText}"/>
    </div>    
</div>
</form>`,
            draggable: true,
            openCallback: () => {
                document.getElementById(this.formId).onsubmit = (event) => {
                    event.preventDefault();

                    if (typeof callbacks.beforeConfirmCallback === 'function') {
                        callbacks.beforeConfirmCallback();
                    }

                    this.modal.close();

                    if (typeof callbacks.afterConfirmCallback === 'function') {
                        callbacks.afterConfirmCallback();
                    }
                };

                document.getElementById(this.cancelButtonId).onclick = () => {
                    if (typeof callbacks.cancelCallback === 'function') {
                        callbacks.cancelCallback();
                    }
                    this.modal.close();
                };
            }
        });
    }

    getModalBasicCss() {
        return `
<style>
    #eve-modal-form {
        all:initial !important;
    }

    .eve-modal-btn {
        all: initial !important;
        font-family: Muli, Arial, Helvetica, sans-serif !important;
        background-color: ${this.primaryColour} !important;
        border: none !important;
        color: white !important;
        padding: 15px 32px !important;
        text-align: center !important;
        text-decoration: none !important;
        display: inline-block !important;
        font-size: 16px !important;
        cursor: pointer !important;
        border-radius: 2px!important;
    }
    
    .eve-modal-icon {
        width: 125px !important;
    }
    
    .eve-modal-btn-grey {
        background-color: #e7e7e7 !important; 
        color: black !important;
    }
    
    .eve-modal-input {
        all: initial !important;
        font-family: Muli, Arial, Helvetica, sans-serif !important;
        width: 100% !important;
        padding: 12px 20px !important;
        margin: 8px 0 !important;
        box-sizing: border-box !important;
        border: 1px solid lightgray !important;
    }
    
    .eve-modal-title {
        font-size: larger !important;
        font-weight: bold !important;
        font-family: Muli, Arial, Helvetica, sans-serif;
        color: #4d4d4f !important;
    }

    .eve-modal-body {
        font-family: Muli, Arial, Helvetica, sans-serif;
    }
    
    #eve-modal-overlay { 
        background: #fff !important; 
        filter: alpha(opacity=60) !important; 
        height: 100%; left: 0 !important; 
        -moz-opacity: 0.6 !important; 
        -webkit-opacity: 0.6 !important; 
        -ms-filter: alpha(opacity=60) !important; 
        opacity: 0.6; position: absolute !important; 
        top: 0 !important; 
        width: 100% !important; 
        z-index: 998 !important;
    } 
    
    #eve-modal-container { 
        max-width: 650px !important;
        background: #fff !important; 
        border: 1px solid #ababab !important; 
        box-shadow: 0px 4px 16px rgba(0, 0, 0, 0.2) !important; 
        height: auto !important; 
        padding: 10px !important; 
        font-family: arial,sans-serif !important; 
        font-size: 14px !important; 
        position: absolute !important; 
        z-index: 2147483648 !important;
    }     
    
    #eve-modal-header { 
        height: 20px !important; 
        overflow: hidden !important;   
        clear: both !important; 
    } 
    
    #eve-modal-close { 
        background: #fff url('https://d1vjq17neg4i9o.cloudfront.net/modal-close.png') no-repeat center center !important; 
        cursor: pointer !important; 
        display: block !important; 
        filter: alpha(opacity=60) !important; 
        -moz-opacity: 0.6 !important; 
        -webkit-opacity: 0.6 !important; 
        -ms-filter: alpha(opacity=60) !important; 
        opacity: 0.6 !important; 
        float: right !important; 
        height: 20px !important; 
        width: 20px !important;
    } 
    
    #modal-close:hover { 
        filter: alpha(opacity=100) !important; 
        -moz-opacity: 1.0 !important; 
        -webkit-opacity: 1.0 !important; 
        -ms-filter: alpha(opacity=100) !important; 
        opacity: 1.0 !important;
    } 
        
    #eve-modal-content { 
        display: block !important; 
        z-index: 999 !important;
    } 
    
    #eve-modal-content td {
        vertical-align: top !important;
        padding: 0 15px 15px 15px !important;
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
            visibility: hidden !important;
            position: absolute !important;
        }
    }
</style>`;
    }
}