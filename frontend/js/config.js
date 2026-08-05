/******************************************************************************
GeoForest Enterprise
File : frontend/js/config.js
******************************************************************************/

"use strict";

/************************************************************
APPLICATION
************************************************************/

const APP_NAME = "GeoForest Enterprise";

const APP_VERSION = "1.0.0";

/************************************************************
POSTGREST
************************************************************/

const API_BASE_URL = "http://localhost:3000";

/************************************************************
RPC ENDPOINTS
************************************************************/

const API = {

    //==========================
    // Species
    //==========================

    getSpecies:
        `${API_BASE_URL}/rpc/get_species`,

    getSpeciesById:
        `${API_BASE_URL}/rpc/get_species_by_id`,

    addSpecies:
        `${API_BASE_URL}/rpc/add_species`,

    updateSpecies:
        `${API_BASE_URL}/rpc/update_species`,

    deleteSpecies:
        `${API_BASE_URL}/rpc/delete_species`,

    //==========================
    // Lookup Tables
    //==========================

    getCategories:
        `${API_BASE_URL}/rpc/get_categories`,

    getIUCNStatus:
        `${API_BASE_URL}/rpc/get_iucn_status`,

    getPlantStatus:
        `${API_BASE_URL}/rpc/get_plant_status`,

    //==========================
    // Forest Beats
    //==========================

    getBeats:
        `${API_BASE_URL}/rpc/get_beats`,

    getBeatLocation:
        `${API_BASE_URL}/rpc/get_beat_location`,

    //==========================
    // Plant Conditions
    //==========================

    getPlantConditions:
        `${API_BASE_URL}/rpc/get_plant_conditions`,

    //==========================
    // Plant Inventory
    //==========================

    getPlants:
        `${API_BASE_URL}/rpc/get_plants`,

    getPlantById:
        `${API_BASE_URL}/rpc/get_plant_by_id`,

    getNearbyPlants:
        `${API_BASE_URL}/rpc/get_nearby_plants`,

    getNearbyPlants:
        `${API_BASE_URL}/rpc/get_nearby_plants`,

    addPlant:
        `${API_BASE_URL}/rpc/add_plant`,

    updatePlant:
        `${API_BASE_URL}/rpc/update_plant`,

    deletePlant:
        `${API_BASE_URL}/rpc/delete_plant`

};
/************************************************************
DEFAULT HEADERS
************************************************************/

const JSON_HEADERS = {

    "Content-Type": "application/json"

};

/************************************************************
DATATABLE
************************************************************/

const TABLE_OPTIONS = {

    paging: true,

    searching: true,

    ordering: true,

    responsive: true,

    pageLength: 10,

    lengthMenu: [10, 25, 50, 100],

    autoWidth: false,

    destroy: true

};

/************************************************************
SWEET ALERT
************************************************************/

const ALERT_SUCCESS = "success";

const ALERT_ERROR = "error";

const ALERT_WARNING = "warning";

const ALERT_INFO = "info";

/************************************************************
LOADING
************************************************************/

function showLoader() {

    const spinner = document.getElementById("loadingSpinner");

    if (spinner) {

        spinner.classList.remove("d-none");

    }

}

function hideLoader() {

    const spinner = document.getElementById("loadingSpinner");

    if (spinner) {

        spinner.classList.add("d-none");

    }

}
/************************************************************
TOAST
************************************************************/

function showSuccess(message) {

    Swal.fire({

        icon: "success",

        title: "Success",

        text: message,

        timer: 1500,

        showConfirmButton: false

    });

}

function showError(message) {

    Swal.fire({

        icon: "error",

        title: "Error",

        text: message

    });

}

function showWarning(message) {

    Swal.fire({

        icon: "warning",

        title: "Warning",

        text: message

    });

}