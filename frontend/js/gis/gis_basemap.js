/******************************************************************************
 * GeoForest Enterprise
 * GIS Basemaps
 ******************************************************************************/

"use strict";

/******************************************************************************
 * Basemap Variables
 ******************************************************************************/

let osmLayer = null;
let satelliteLayer = null;
let topoLayer = null;

let baseMaps = {};
let currentBaseMap = null;

/******************************************************************************
 * Initialize Basemaps
 ******************************************************************************/

function initializeBaseMaps() {

    createBaseMaps();

    createLayerControl();

    currentBaseMap = osmLayer;

    currentBaseMap.addTo(gisMap);

}

/******************************************************************************
 * Create Basemaps
 ******************************************************************************/

function createBaseMaps() {

    // ----------------------------------------------------------
    // OpenStreetMap
    // ----------------------------------------------------------

    osmLayer = L.tileLayer(

        "https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png",

        {
            maxZoom: 22,
            attribution: "&copy; OpenStreetMap Contributors"
        }

    );

    // ----------------------------------------------------------
    // ESRI Satellite
    // ----------------------------------------------------------

    satelliteLayer = L.tileLayer(

        "https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}",

        {
            maxZoom: 22,
            attribution: "&copy; Esri"
        }

    );

    // ----------------------------------------------------------
    // ESRI Topographic
    // ----------------------------------------------------------

    topoLayer = L.tileLayer(

        "https://server.arcgisonline.com/ArcGIS/rest/services/World_Topo_Map/MapServer/tile/{z}/{y}/{x}",

        {
            maxZoom: 22,
            attribution: "&copy; Esri"
        }

    );

    baseMaps = {

        "OpenStreetMap": osmLayer,

        "ESRI Satellite": satelliteLayer,

        "ESRI Topographic": topoLayer

    };

}

/******************************************************************************
 * Layer Control
 ******************************************************************************/

function createLayerControl() {

    L.control.layers(

        baseMaps,

        {},

        {
            collapsed: false
        }

    ).addTo(gisMap);

}