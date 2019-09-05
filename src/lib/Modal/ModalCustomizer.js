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
<table width="100%">
<tr>
    <td><img src="${iconSrc}" class="eve-modal-icon" /></td>
    <td>
        <div class="eve-modal-title">
            ${title}
        </div>
        <br/>
        <span class="eve-modal-body">${body}</span>
        <br/>
        <br/>
    </td>
</tr>
<tr>
    <td colspan="2">
        <div style="text-align:right !important;">
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
                        // console.log(document.getElementById(this.formId).checkValidity());
                        // return;
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
        font-family: Muli, Arial, Helvetica, sans-serif;
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
        animation-delay:0s !important;
        animation-direction:normal !important;
        animation-duration:0s !important;
        animation-fill-mode:none !important;
        animation-iteration-count:1 !important;
        animation-name:none !important;
        animation-play-state:running !important;
        animation-timing-function:ease !important;
        background-attachment:scroll !important;
        background-blend-mode:normal !important;
        background-clip:border-box !important;
        background-color:rgb(255, 255, 255) !important;
        background-image:none !important;
        background-origin:padding-box !important;
        background-position:0% 0% !important;
        background-repeat:repeat !important;
        background-size:auto !important;
        border-bottom-color:rgb(211, 211, 211) !important;
        border-bottom-left-radius:0px !important;
        border-bottom-right-radius:0px !important;
        border-bottom-style:solid !important;
        border-bottom-width:0.994318px !important;
        border-collapse:collapse !important;
        border-image-outset:0px !important;
        border-image-repeat:stretch !important;
        border-image-slice:100% !important;
        border-image-source:none !important;
        border-image-width:1 !important;
        border-left-color:rgb(211, 211, 211) !important;
        border-left-style:solid !important;
        border-left-width:0.994318px !important;
        border-right-color:rgb(211, 211, 211) !important;
        border-right-style:solid !important;
        border-right-width:0.994318px !important;
        border-top-color:rgb(211, 211, 211) !important;
        border-top-left-radius:0px !important;
        border-top-right-radius:0px !important;
        border-top-style:solid !important;
        border-top-width:0.994318px !important;
        bottom:auto !important;
        box-shadow:none !important;
        box-sizing:border-box !important;
        break-after:auto !important;
        break-before:auto !important;
        break-inside:auto !important;
        caption-side:top !important;
        clear:none !important;
        clip:auto !important;
        color:rgb(0, 0, 0) !important;
        content:normal !important;
        cursor:text !important;
        direction:ltr !important;
        display:inline-block !important;
        empty-cells:show !important;
        float:none !important;
        font-family:Muli, Arial, Helvetica, sans-serif !important;
        font-kerning:auto !important;
        font-size:14px !important;
        font-stretch:100% !important;
        font-style:normal !important;
        font-variant:normal !important;
        font-variant-ligatures:normal !important;
        font-variant-caps:normal !important;
        font-variant-numeric:normal !important;
        font-variant-east-asian:normal !important;
        font-weight:400 !important;
        height:46.875px !important;
        image-rendering:auto !important;
        isolation:auto !important;
        justify-items:normal !important;
        justify-self:auto !important;
        left:auto !important;
        letter-spacing:normal !important;
        line-height:21px !important;
        list-style-image:none !important;
        list-style-position:outside !important;
        list-style-type:disc !important;
        margin-bottom:8px !important;
        margin-left:0px !important;
        margin-right:0px !important;
        margin-top:8px !important;
        max-height:none !important;
        max-width:none !important;
        min-height:0px !important;
        min-width:0px !important;
        mix-blend-mode:normal !important;
        object-fit:fill !important;
        object-position:50% 50% !important;
        offset-distance:0px !important;
        offset-path:none !important;
        offset-rotate:auto 0deg !important;
        opacity:1 !important;
        orphans:2 !important;
        outline-color:rgb(0, 0, 0) !important;
        outline-offset:0px !important;
        outline-style:none !important;
        outline-width:0px !important;
        overflow-anchor:auto !important;
        overflow-wrap:normal !important;
        overflow-x:visible !important;
        overflow-y:visible !important;
        padding-bottom:12px !important;
        padding-left:20px !important;
        padding-right:20px !important;
        padding-top:12px !important;
        pointer-events:auto !important;
        position:static !important;
        resize:none !important;
        right:auto !important;
        scroll-behavior:auto !important;
        speak:normal !important;
        table-layout:auto !important;
        tab-size:8 !important;
        text-align:start !important;
        text-align-last:auto !important;
        text-decoration:none solid rgb(0, 0, 0) !important;
        text-decoration-line:none !important;
        text-decoration-style:solid !important;
        text-decoration-color:rgb(0, 0, 0) !important;
        text-decoration-skip-ink:auto !important;
        text-underline-position:auto !important;
        text-indent:0px !important;
        text-rendering:auto !important;
        text-shadow:none !important;
        text-size-adjust:100% !important;
        text-overflow:clip !important;
        text-transform:none !important;
        top:auto !important;
        touch-action:auto !important;
        transition-delay:0s !important;
        transition-duration:0s !important;
        transition-property:all !important;
        transition-timing-function:ease !important;
        unicode-bidi:normal !important;
        vertical-align:baseline !important;
        visibility:visible !important;
        white-space:normal !important;
        widows:2 !important;
        width:441.818px !important;
        will-change:auto !important;
        word-break:normal !important;
        word-spacing:0px !important;
        z-index:auto !important;
        zoom:1 !important;
        -webkit-appearance:none !important;
        backface-visibility:visible !important;
        -webkit-border-horizontal-spacing:1.81818px !important;
        -webkit-border-image:none !important;
        -webkit-border-vertical-spacing:1.81818px !important;
        -webkit-box-align:stretch !important;
        -webkit-box-decoration-break:slice !important;
        -webkit-box-direction:normal !important;
        -webkit-box-flex:0 !important;
        -webkit-box-ordinal-group:1 !important;
        -webkit-box-orient:horizontal !important;
        -webkit-box-pack:start !important;
        -webkit-box-reflect:none !important;
        column-count:auto !important;
        column-gap:normal !important;
        column-rule-color:rgb(0, 0, 0) !important;
        column-rule-style:none !important;
        column-rule-width:0px !important;
        column-span:none !important;
        column-width:auto !important;
        backdrop-filter:none !important;
        align-content:normal !important;
        align-items:normal !important;
        align-self:auto !important;
        flex-basis:auto !important;
        flex-grow:0 !important;
        flex-shrink:1 !important;
        flex-direction:row !important;
        flex-wrap:nowrap !important;
        justify-content:normal !important;
        -webkit-font-smoothing:auto !important;
        grid-auto-columns:auto !important;
        grid-auto-flow:row !important;
        grid-auto-rows:auto !important;
        grid-column-end:auto !important;
        grid-column-start:auto !important;
        grid-template-areas:none !important;
        grid-template-columns:none !important;
        grid-template-rows:none !important;
        grid-row-end:auto !important;
        grid-row-start:auto !important;
        row-gap:normal !important;
        -webkit-highlight:none !important;
        hyphens:manual !important;
        -webkit-hyphenate-character:auto !important;
        -webkit-line-break:auto !important;
        -webkit-line-clamp:none !important;
        -webkit-locale:"en" !important;
        -webkit-margin-before-collapse:collapse !important;
        -webkit-margin-after-collapse:collapse !important;
        -webkit-mask-box-image:none !important;
        -webkit-mask-box-image-outset:0px !important;
        -webkit-mask-box-image-repeat:stretch !important;
        -webkit-mask-box-image-slice:0 fill !important;
        -webkit-mask-box-image-source:none !important;
        -webkit-mask-box-image-width:auto !important;
        -webkit-mask-clip:border-box !important;
        -webkit-mask-composite:source-over !important;
        -webkit-mask-image:none !important;
        -webkit-mask-origin:border-box !important;
        -webkit-mask-position:0% 0% !important;
        -webkit-mask-repeat:repeat !important;
        -webkit-mask-size:auto !important;
        order:0 !important;
        perspective:none !important;
        perspective-origin:220.909px 23.4375px !important;
        -webkit-print-color-adjust:economy !important;
        -webkit-rtl-ordering:logical !important;
        shape-outside:none !important;
        shape-image-threshold:0 !important;
        shape-margin:0px !important;
        -webkit-tap-highlight-color:rgba(0, 0, 0, 0) !important;
        -webkit-text-combine:none !important;
        -webkit-text-decorations-in-effect:none !important;
        -webkit-text-emphasis-color:rgb(0, 0, 0) !important;
        -webkit-text-emphasis-position:over right !important;
        -webkit-text-emphasis-style:none !important;
        -webkit-text-fill-color:rgb(0, 0, 0) !important;
        -webkit-text-orientation:vertical-right !important;
        -webkit-text-security:none !important;
        -webkit-text-stroke-color:rgb(0, 0, 0) !important;
        -webkit-text-stroke-width:0px !important;
        transform:none !important;
        transform-origin:220.909px 23.4375px !important;
        transform-style:flat !important;
        -webkit-user-drag:auto !important;
        -webkit-user-modify:read-only !important;
        user-select:auto !important;
        -webkit-writing-mode:horizontal-tb !important;
        -webkit-app-region:none !important;
        buffered-rendering:auto !important;
        clip-path:none !important;
        clip-rule:nonzero !important;
        mask:none !important;
        filter:none !important;
        flood-color:rgb(0, 0, 0) !important;
        flood-opacity:1 !important;
        lighting-color:rgb(255, 255, 255) !important;
        stop-color:rgb(0, 0, 0) !important;
        stop-opacity:1 !important;
        color-interpolation:srgb !important;
        color-interpolation-filters:linearrgb !important;
        color-rendering:auto !important;
        fill:rgb(0, 0, 0) !important;
        fill-opacity:1 !important;
        fill-rule:nonzero !important;
        marker-end:none !important;
        marker-mid:none !important;
        marker-start:none !important;
        mask-type:luminance !important;
        shape-rendering:auto !important;
        stroke:none !important;
        stroke-dasharray:none !important;
        stroke-dashoffset:0px !important;
        stroke-linecap:butt !important;
        stroke-linejoin:miter !important;
        stroke-miterlimit:4 !important;
        stroke-opacity:1 !important;
        stroke-width:1px !important;
        alignment-baseline:auto !important;
        baseline-shift:0px !important;
        dominant-baseline:auto !important;
        text-anchor:start !important;
        writing-mode:horizontal-tb !important;
        vector-effect:none !important;
        paint-order:normal !important;
        d:none !important;
        cx:0px !important;
        cy:0px !important;
        x:0px !important;
        y:0px !important;
        r:0px !important;
        rx:auto !important;
        ry:auto !important;
        caret-color:rgb(0, 0, 0) !important;
        line-break:auto !important;
        
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