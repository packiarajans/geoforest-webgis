/******************************************************************************
 * GeoForest Enterprise
 * File: frontend/js/core/gf-config.js
 * Description: Global application configuration
 ******************************************************************************/

"use strict";

const CONFIG = Object.freeze({

    APP: {
        NAME: "GeoForest Enterprise",
        VERSION: "1.0.0",
        DEBUG: true
    },

    API: {
        BASE_URL: "http://localhost:3000",
        TIMEOUT: 30000
    },

    MAP: {
        DEFAULT_CENTER: [11.1271, 78.6569],   // Tamil Nadu
        DEFAULT_ZOOM: 7,
        MIN_ZOOM: 5,
        MAX_ZOOM: 22
    },

    GEOSERVER: {

        URL: "http://localhost:8595/geoserver",

        WORKSPACE: "GeoForest",

        WMS: "/wms",

        WFS: "/ows"
    },

    LAYERS: {

        DIVISIONS: {
            name: "GeoForest:forest_divisions",
            visible: true
        },

        RANGES: {
            name: "GeoForest:forest_ranges",
            visible: true
        },

        BEATS: {
            name: "GeoForest:forest_beats",
            visible: true
        },

        PLANTS: {
            name: "GeoForest:plants",
            visible: true
        },

        ANIMALS: {
            name: "GeoForest:animals",
            visible: true
        }

    },

    DRAWING: {

        polygon: true,

        rectangle: false,

        polyline: false,

        marker: false,

        circle: false,

        circlemarker: false

    }

});