/******************************************************************************
 * GeoForest Enterprise
 * GIS Portal
 * Main Controller
 ******************************************************************************/

"use strict";

/******************************************************************************
 * Global Variables
 ******************************************************************************/

let gisMap = null;

const DEFAULT_CENTER = [11.5565, 76.9489];
const DEFAULT_ZOOM = 11;

const GEOSERVER_URL =
    "http://localhost:8595/geoserver/GeoForest/wms";

/******************************************************************************
 * Application Startup
 ******************************************************************************/

document.addEventListener("DOMContentLoaded", () => {

    console.log("Starting GeoForest GIS Portal...");

    initializeGISPortal();

});

/******************************************************************************
 * Initialize GIS Portal
 ******************************************************************************/

function initializeGISPortal() {

    initializeMap();

    initializeBaseMaps();

    initializeGeoServerLayers();

    initializeControls();

    initializeEvents();

    console.log("GIS Portal Ready");

}

/******************************************************************************
 * Initialize Leaflet Map
 ******************************************************************************/

function initializeMap() {

    gisMap = L.map("map", {

        zoomControl: true,

        attributionControl: true

    });

    gisMap.setView(DEFAULT_CENTER, DEFAULT_ZOOM);
  
    
}
 


