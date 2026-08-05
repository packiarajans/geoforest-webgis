/******************************************************************************
GeoForest Enterprise
File : frontend/js/core/api.js
******************************************************************************/

"use strict";

/******************************************************************************
 GeoForest Enterprise API Client
******************************************************************************/

const API = (() => {

    /**************************************************************************
     Private
    **************************************************************************/

    const BASE_URL = CONFIG.API.BASE_URL;

    const DEFAULT_HEADERS = {

        "Content-Type": "application/json"

    };

    /**************************************************************************
     Timeout
    **************************************************************************/

    async function fetchWithTimeout(url, options = {}) {

        const controller = new AbortController();

        const timeout = setTimeout(() => {

            controller.abort();

        }, CONFIG.API.TIMEOUT);

        try {

            const response = await fetch(url, {

                ...options,

                signal: controller.signal

            });

            clearTimeout(timeout);

            return response;

        }

        catch (error) {

            clearTimeout(timeout);

            throw error;

        }

    }

    /**************************************************************************
     HTTP Error Handler
    **************************************************************************/

    async function handleResponse(response) {

        if (response.ok) {

            if (response.status === 204)
                return null;

            return await response.json();

        }

        let message = "Server Error";

        try {

            const error = await response.json();

            message =
                error.message ||
                error.details ||
                JSON.stringify(error);

        }

        catch {

            message =
                response.statusText;

        }

        throw new Error(message);

    }

    /**************************************************************************
     POST
    **************************************************************************/

    async function post(endpoint, data = {}) {

        Loader.show();

        try {

            if (CONFIG.APP.DEBUG) {

                console.log("POST", endpoint);

                console.log(data);

            }

            const response =
                await fetchWithTimeout(

                    BASE_URL + "/rpc/" + endpoint,

                    {

                        method: "POST",

                        headers: DEFAULT_HEADERS,

                        body: JSON.stringify(data)

                    }

                );

            return await handleResponse(response);

        }

        finally {

            Loader.hide();

        }

    }

    /**************************************************************************
     GET
    **************************************************************************/

    async function get(endpoint) {

        Loader.show();

        try {

            const response =
                await fetchWithTimeout(

                    BASE_URL + endpoint,

                    {

                        method: "GET",

                        headers: DEFAULT_HEADERS

                    }

                );

            return await handleResponse(response);

        }

        finally {

            Loader.hide();

        }

    }

    /**************************************************************************
     DELETE
    **************************************************************************/

    async function remove(endpoint, data) {

        Loader.show();

        try {

            const response =
                await fetchWithTimeout(

                    BASE_URL + "/rpc/" + endpoint,

                    {

                        method: "POST",

                        headers: DEFAULT_HEADERS,

                        body: JSON.stringify(data)

                    }

                );

            return await handleResponse(response);

        }

        finally {

            Loader.hide();

        }

    }

    /**************************************************************************
     Public Interface
    **************************************************************************/

    return {

        post,

        get,

        remove

    };

})();