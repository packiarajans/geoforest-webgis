/******************************************************************************
GeoForest Enterprise
File : frontend/js/core/loader.js
******************************************************************************/

"use strict";

/******************************************************************************
 Loader
******************************************************************************/

const Loader = (() => {

    let overlay = null;

    let counter = 0;

    /**************************************************************************
     Initialize
    **************************************************************************/

    function initialize() {

        overlay = document.createElement("div");

        overlay.id = "gf-loader";

        overlay.innerHTML = `

            <div class="gf-loader-backdrop">

                <div class="gf-loader-panel">

                    <div
                        class="spinner-border text-success"
                        role="status">

                    </div>

                    <div class="mt-3">

                        Please wait...

                    </div>

                </div>

            </div>

        `;

        overlay.style.display = "none";

        document.body.appendChild(overlay);

    }

    /**************************************************************************
     Show
    **************************************************************************/

    function show() {

        counter++;

        if (!overlay)
            initialize();

        overlay.style.display = "block";

    }

    /**************************************************************************
     Hide
    **************************************************************************/

    function hide() {

        if (counter > 0)
            counter--;

        if (counter === 0 && overlay)
            overlay.style.display = "none";

    }

    /**************************************************************************
     Public
    **************************************************************************/

    return {

        show,

        hide

    };

})();