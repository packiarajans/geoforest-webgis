/******************************************************************************
GeoForest Enterprise
File : frontend/js/core/toast.js
******************************************************************************/

"use strict";

/******************************************************************************
 Toast Notification Manager
******************************************************************************/

const Toast = (() => {

    let container = null;

    /**************************************************************************
     Initialize
    **************************************************************************/

    function initialize() {

        container = document.createElement("div");

        container.id = "gf-toast-container";

        container.className =
            "toast-container position-fixed top-0 end-0 p-3";

        document.body.appendChild(container);

    }

    /**************************************************************************
     Show
    **************************************************************************/

    function show(title, message, cssClass = "bg-primary") {

        if (!container)
            initialize();

        const id =
            "toast_" + Date.now();

        const html = `

        <div
            id="${id}"
            class="toast align-items-center text-white ${cssClass}"
            role="alert">

            <div class="d-flex">

                <div class="toast-body">

                    <strong>${title}</strong>

                    <br>

                    ${message}

                </div>

                <button
                    class="btn-close btn-close-white me-2 m-auto"
                    data-bs-dismiss="toast">

                </button>

            </div>

        </div>

        `;

        container.insertAdjacentHTML(
            "beforeend",
            html
        );

        const toastElement =
            document.getElementById(id);

        const toast =
            new bootstrap.Toast(
                toastElement,
                {
                    delay: 3000
                }
            );

        toast.show();

        toastElement.addEventListener(
            "hidden.bs.toast",
            () => toastElement.remove()
        );

    }

    /**************************************************************************
     Success
    **************************************************************************/

    function success(message) {

        show(
            "Success",
            message,
            "bg-success"
        );

    }

    /**************************************************************************
     Error
    **************************************************************************/

    function error(message) {

        show(
            "Error",
            message,
            "bg-danger"
        );

    }

    /**************************************************************************
     Warning
    **************************************************************************/

    function warning(message) {

        show(
            "Warning",
            message,
            "bg-warning text-dark"
        );

    }

    /**************************************************************************
     Info
    **************************************************************************/

    function info(message) {

        show(
            "Information",
            message,
            "bg-primary"
        );

    }

    return {

        success,

        error,

        warning,

        info

    };

})();