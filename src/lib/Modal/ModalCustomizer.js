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
<form id="${this.formId}" action="#">
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
            <input class="eve-modal-btn eve-modal-btn-grey" id="${this.cancelButtonId}" type="button" value="${cancelText}"/>
            <input class="eve-modal-btn" id="${this.confirmButtonId}" type="submit" value="${confirmText}"/>
        </div>    
    </td>
</tr>
</table>
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
    .eve-modal-btn {
        background-color: ${this.primaryColour};
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
        z-index: 2147483648;
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
}