/******************************************************************************
 * GeoForest Enterprise
 * File : frontend/js/components/gf-map.js
 * Description : Leaflet Map Engine
 ******************************************************************************/

"use strict";

class GFMap {

    constructor(containerId = "map") {

        this.containerId = containerId;

        this.map = null;

        this.baseLayers = {};

        this.overlayLayers = {};

        this.drawLayer = new L.FeatureGroup();

        this.highlightLayer = new L.FeatureGroup();

        this.layerControl = null;

        this.coordinateControl = null;

    }

    initialize() {

        if (this.map) {
            return this.map;
        }

        this.map = L.map(this.containerId, {

            center: CONFIG.MAP.DEFAULT_CENTER,

            zoom: CONFIG.MAP.DEFAULT_ZOOM,

            minZoom: CONFIG.MAP.MIN_ZOOM,

            maxZoom: CONFIG.MAP.MAX_ZOOM,

            zoomControl: true

        });

        this.createBaseLayers();

        this.map.addLayer(this.drawLayer);

        this.map.addLayer(this.highlightLayer);

        this.createCoordinateControl();

        L.control.scale({

            metric: true,

            imperial: false

        }).addTo(this.map);

        this.layerControl = L.control.layers(

            this.baseLayers,

            this.overlayLayers,

            {

                collapsed: false

            }

        ).addTo(this.map);

        this.map.on("mousemove", (e) => {

            this.updateCoordinates(e.latlng);

        });

        return this.map;

    }

    createBaseLayers() {

        const osm = L.tileLayer(

            "https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png",

            {

                attribution: "&copy; OpenStreetMap"

            }

        );

        osm.addTo(this.map);

        this.baseLayers["OpenStreetMap"] = osm;

    }

    createCoordinateControl() {

        this.coordinateControl = L.control({

            position: "bottomleft"

        });

        this.coordinateControl.onAdd = function () {

            this._div = L.DomUtil.create(

                "div",

                "gf-coordinate-box"

            );

            this._div.innerHTML = "Lat : 0.000000<br>Lon : 0.000000";

            return this._div;

        };

        this.coordinateControl.addTo(this.map);

    }

    updateCoordinates(latlng) {

        this.coordinateControl._div.innerHTML =

            "Lat : " + latlng.lat.toFixed(6) +

            "<br>Lon : " +

            latlng.lng.toFixed(6);

    }

}