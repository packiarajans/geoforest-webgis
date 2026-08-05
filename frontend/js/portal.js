"use strict";

/****************************************************************
GeoServer
****************************************************************/

const GEOSERVER_URL = "http://localhost:8595/geoserver";

let map = null;
let gisEventsRegistered = false;
let layerEventsRegistered = false;


/******************************************************************************
GIS VARIABLES
******************************************************************************/



let divisionLayer;

let rangeLayer;

let beatLayer;

let plantLayer;

let layerControl;

let homeExtent = [

    [7.8, 76.8],

    [13.7, 80.5]

];


/****************************************************************
 GeoForest Enterprise Portal
****************************************************************/

document.addEventListener("DOMContentLoaded", () => {

    initializePortal();

});

/****************************************************************
 INITIALIZE
****************************************************************/

function initializePortal() {

    registerMenuEvents();

    loadPage("dashboard.html");

}

/****************************************************************
 MENU EVENTS
****************************************************************/

function registerMenuEvents() {

    document
        .querySelectorAll(".sidebar a")
        .forEach(link => {

            link.addEventListener("click", function (e) {

                e.preventDefault();

                document
                    .querySelectorAll(".sidebar a")
                    .forEach(a => a.classList.remove("active"));

                this.classList.add("active");

                const page =
                    this.dataset.page;

                if (page)
                    loadPage(page);

            });

        });

}

/****************************************************************
LOAD PAGE
****************************************************************/

async function loadPage(page) {

    try {

        const response = await fetch("html/" + page);

        if (!response.ok)
            throw new Error("Unable to load " + page);

        const html = await response.text();

        document.getElementById("content").innerHTML = html;

        requestAnimationFrame(async () => {

            switch (page) {

                case "dashboard.html":

                    if (typeof initializeDashboard === "function")
                        await initializeDashboard();

                    break;

                case "plant_species.html":

                    if (typeof initializePlantSpecies === "function")
                        await initializePlantSpecies();

                    break;

                case "plant_inventory.html":

                    if (typeof initializePlantInventory === "function")
                        await initializePlantInventory();

                    break;

                case "forest_divisions.html":

                    if (typeof initializeForestDivisions === "function")
                        await initializeForestDivisions();

                    break;

                case "forest_ranges.html":

                    if (typeof initializeForestRanges === "function")
                        await initializeForestRanges();

                    break;

                case "forest_beats.html":

                    if (typeof initializeForestBeats === "function")
                        await initializeForestBeats();

                    break;


                case "gis_portal.html":

                    if (typeof initializeMap === "function") {

                        await initializeMap();

                        registerGISEvents();

                        registerLayerVisibility();

                    }

                    break;
            }

        });

    }

    catch (error) {

        document.getElementById("content").innerHTML =

            `<div class="alert alert-danger">

            ${error.message}

        </div>`;

    }

}


/****************************************************************
 LOGOUT
****************************************************************/

function logout() {

    if (!confirm("Do you want to logout?"))
        return;

    window.location.href = "login.html";

}

/******************************************************************************
INITIALIZE GIS
******************************************************************************/
async function initializeMap() {

    // Destroy previous map if it exists
    if (map) {
        map.off();      // Remove all event listeners
        map.remove();   // Destroy Leaflet instance
        map = null;
    }

    map = L.map("map", {
        zoomControl: true,
        attributionControl: true
    });

    map.fitBounds(homeExtent);

    /****************************************************************
    Base Maps
    ****************************************************************/

    const osm = L.tileLayer(
        "https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png",
        {
            maxZoom: 22,
            attribution: "&copy; OpenStreetMap contributors"
        }
    );

    const satellite = L.tileLayer(
        "https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}",
        {
            maxZoom: 22,
            attribution: "Esri World Imagery"
        }
    );

    const positron = L.tileLayer(
        "https://{s}.basemaps.cartocdn.com/light_all/{z}/{x}/{y}{r}.png",
        {
            maxZoom: 22,
            attribution: "&copy; CartoDB"
        }
    );

    const topo = L.tileLayer(
        "https://{s}.tile.opentopomap.org/{z}/{x}/{y}.png",
        {
            maxZoom: 17,
            attribution: "&copy; OpenTopoMap"
        }
    );

    // Default basemap

    osm.addTo(map);

    if (!nearbyPlantsLayer) {
        nearbyPlantsLayer = L.layerGroup().addTo(map);
    }

    divisionLayer = createWMSLayer(
        "GeoForest:forest_divisions");

    rangeLayer = createWMSLayer(
        "GeoForest:forest_ranges");

    beatLayer = createWMSLayer(
        "GeoForest:forest_beats");

    plantLayer = createWMSLayer(
        "GeoForest:plants");

    divisionLayer.addTo(map);

    rangeLayer.addTo(map);

    beatLayer.addTo(map);

    plantLayer.addTo(map);

    layerControl = L.control.layers(

        {
            "🗺 OpenStreetMap": osm,
            "🛰 Satellite": satellite,
            "🌍 CartoDB Positron": positron,
            "🏔 OpenTopoMap": topo
        },

        {
            "🌲 Forest Divisions": divisionLayer,
            "🌳 Forest Ranges": rangeLayer,
            "🪵 Forest Beats": beatLayer,
            "🌿 Plants": plantLayer
        }

    ).addTo(map);

    L.control.scale().addTo(map);

    map.off("mousemove", updateCoordinates);
    map.on("mousemove", updateCoordinates);

    /*map.off("click", identifyFeature);*/
    map.on("click", function (e) {

        identifyPlant(e.latlng);

    });

}

/******************************************************************************
CREATE WMS
******************************************************************************/

function createWMSLayer(layerName, cql = "") {

    return L.tileLayer.wms(

        GEOSERVER_URL + "/GeoForest/wms",

        {

            layers: layerName,

            format: "image/png",

            transparent: true,

            version: "1.1.1",

            cql_filter: cql

        }

    );

}

/******************************************************************************
COORDINATES
******************************************************************************/

function updateCoordinates(e) {

    document.getElementById("lblCoordinates").innerHTML =

        e.latlng.lat.toFixed(6) +

        ", " +

        e.latlng.lng.toFixed(6);

}

/******************************************************************************
GeoForest Enterprise
Identify Feature
******************************************************************************/

async function identifyPlant(latlng) {

    try {

        const radius = 15;   // metres

        const url =
            `http://localhost:8595/geoserver/GeoForest/ows?` +
            `service=WFS&` +
            `version=2.0.0&` +
            `request=GetFeature&` +
            `typeNames=GeoForest:plants&` +
            `outputFormat=application/json&` +
            `cql_filter=DWITHIN(` +
            `geom,POINT(${latlng.lng} ${latlng.lat}),${radius},meters)`;

        console.log(url);

        const response = await fetch(url);

        const json = await response.json();

        console.log(json);

        if (!json.features || json.features.length === 0) {

            console.log("No plants found.");

            return;
        }

        if (json.features.length === 1) {

            const plantId =
                json.features[0].properties.plant_id;

            displayPlantPopup(plantId, latlng);

            return;
        }

        showPlantChooser(json.features, latlng);

    }
    catch (err) {

        console.error(err);

    }

}

/******************************************************************************
GeoForest Enterprise
Display Plant Popup
******************************************************************************/

async function displayPlantPopup(plantId, latlng) {

    console.log("Plant ID:", plantId);

    const result = await getPlantById(plantId);

    console.log("RPC Result:", result);

    if (!result || result.length === 0) {
        return;
    }

    const plant = result[0];



    try {
        console.log("Plant ID:", plant.plant_id);
        console.log("Latitude:", plant.latitude);
        console.log("Longitude:", plant.longitude);
        console.log("Photo:", plant.photo_path);
    } catch (e) {
        console.error(e);
    }

    console.log("Plant:", plant);



    // --- 2. Extract plant data safely ---
    const commonName = plant["common_name"] || "";
    const scientificName = plant["scientific_name"] || "";
    const observedDate = plant["observed_on"] ? new Date(plant["observed_on"]).toDateString() : "";
    const conditionName = plant["condition_name"] || "";
    const latitude = plant["latitude"] || "";
    const longitude = plant["longitude"] || "";
    const photoPath = plant.photo_path || "";
    const family = plant.family || "";
    const origin = plant.origin_type || "";
    const beat = plant.beat_name || "";


    const html = `

<div class="card border-0">

    <div class="card-header bg-success text-white text-center py-2">
        <strong>🌿 Plant Observation</strong>
    </div>

    <div class="card-body p-2">

        ${photoPath
            ? `
                <div class="text-center mb-3">
                    <a href="${photoPath}" target="_blank">
                        <img
                            src="${photoPath}"
                            class="img-fluid rounded shadow"
                            style="
                                width:100%;
                                max-height:180px;
                                object-fit:cover;
                                cursor:pointer;
                            ">
                    </a>
                </div>
                `
            :
            `
                <div class="text-center text-muted mb-3">
                    <i class="bi bi-image fs-2"></i><br>
                    No Photo Available
                </div>
                `
        }

        <div class="small">

        <div class="mb-2">
            <strong>🌿 Common Name</strong><br>
            ${commonName}
        </div>

        <div class="mb-2">
            <strong>🔬 Scientific Name</strong><br>
            <em>${scientificName}</em>
        </div>

        <div class="mb-2">
            <strong>👪 Family</strong><br>
            ${family}
        </div>

        <div class="mb-2">
            <strong>🌎 Origin</strong><br>
            ${origin}
        </div>

        <div class="mb-2">
            <strong>🌲 Beat</strong><br>
            ${beat}
        </div>

        <div class="mb-2">
            <strong>🍂 Condition</strong><br>
            ${conditionName}
        </div>

        <div class="mb-2">
            <strong>📅 Observed</strong><br>
            ${observedDate}
        </div>

        <div>
            <strong>📍 Location</strong><br>

            ${Number(latitude).toFixed(6)}, 
            ${Number(longitude).toFixed(6)}
        
        </div>

        </div>

<div class="row g-2 mt-2">

      <div class="col-4">

        <button
            class="btn btn-success btn-sm w-100 d-flex align-items-center justify-content-center"
            onclick="event.stopPropagation(); zoomToPlant(${plant.latitude}, ${plant.longitude})">

            <i class="bi bi-crosshair"></i>
            Zoom

        </button>

    </div>

    <div class="col-4">

       <button
            class="btn btn-success btn-sm w-100 d-flex align-items-center justify-content-center"
            onclick="event.stopPropagation();showNearbyPlants('${plant.plant_id}',100)">

            <i class="bi bi-geo-alt-fill"></i>
            Nearby

        </button>

    </div>

    ${photoPath
            ?
            `
        <div class="col-4">

        <a
            href="${photoPath}"
            target="_blank"
            onclick="event.stopPropagation();"
            class="btn btn-outline-secondary btn-sm w-100 d-flex align-items-center justify-content-center">
            
            <i class="bi bi-image me-1"></i>
            Photo

</a>
        </div>
        `
            : ""
        }

        </div>

    </div>

</div>

`;

    const popup = L.popup({
        maxWidth: 320,
        minWidth: 300,
        maxHeight: 500,
        autoPan: true,
        keepInView: true,
        autoPanPaddingBottomRight: [20, 120]
    })
        .setLatLng(latlng || [plant.latitude, plant.longitude])
        .setContent(html)
        .openOn(map);

    popup.once("add", function () {
        const el = popup.getElement();
        if (el) {
            L.DomEvent.disableClickPropagation(el);
            L.DomEvent.disableScrollPropagation(el);
        }
    });
}

/******************************************************************************
GeoForest Enterprise
Show Plant Chooser (Multiple Plants)
******************************************************************************/

function showPlantChooser(features, latlng) {

    let html = `
<div class="card border-0" style="min-width: 250px;">
    <div class="card-header bg-success text-white text-center py-2">
        <strong>🌿 Multiple Plants Found</strong>
    </div>
    <div class="card-body p-2">
        <p class="small text-muted mb-2">Select a plant to view details:</p>
        <div class="list-group list-group-flush">
    `;

    features.forEach(f => {
        const p = f.properties;
        const name = p.common_name || p.scientific_name || `Observation #${p.observation_no || p.plant_id.substring(0, 8)}`;
        
        html += `
        <a href="#" class="list-group-item list-group-item-action p-2 small" 
           onclick="event.preventDefault(); event.stopPropagation(); displayPlantPopup('${p.plant_id}', L.latLng(${latlng.lat}, ${latlng.lng}));">
            🔍 ${name} (Obs: ${p.observation_no || 'N/A'})
        </a>
        `;
    });

    html += `
        </div>
    </div>
</div>
    `;

    const popup = L.popup({
        maxWidth: 320,
        minWidth: 260,
        autoPan: true,
        keepInView: true
    })
        .setLatLng(latlng)
        .setContent(html)
        .openOn(map);

    popup.once("add", function () {
        const el = popup.getElement();
        if (el) {
            L.DomEvent.disableClickPropagation(el);
            L.DomEvent.disableScrollPropagation(el);
        }
    });

}

let nearbyPlantsLayer = null;

/*let nearbyPlantsLayer = L.layerGroup().addTo(map);*/

async function showNearbyPlants(plantId, radius = 100) {

    const plants = await getNearbyPlants(plantId, radius);

    if (!plants || plants.length === 0) {
        alert("No nearby plants found.");
        return;
    }

    nearbyPlantsLayer.clearLayers();

    plants.forEach(p => {

        const marker = L.circleMarker(
            [p.latitude, p.longitude],
            {
                radius: 8,
                color: "#ff0000",
                fillColor: "#ffff00",
                fillOpacity: 0.9,
                weight: 2
            }
        );

        marker.bindPopup(`
            <b>${p.common_name}</b><br>
            <i>${p.scientific_name}</i><br>
            Observation: ${p.observation_no}<br>
            Beat: ${p.beat_name}<br>
            Distance: ${Math.round(p.distance_m)} m
        `);

        nearbyPlantsLayer.addLayer(marker);

    });

    map.fitBounds(
        nearbyPlantsLayer.getBounds(),
        { padding: [40, 40] }
    );

}


/******************************************************************************
GeoForest Enterprise
Open Plant Record
******************************************************************************/

async function openPlantRecord(plantId) {

    window.selectedPlantId = plantId;

    await loadPage("plant_inventory.html");

}

/******************************************************************************
GeoForest Enterprise
Zoom To Plant
******************************************************************************/

function zoomToPlant(lat, lon) {

    if (!map)
        return;

    map.closePopup();

    map.flyTo(
        [lat, lon],
        19,
        {
            animate: true,
            duration: 1.5
        }
    );

    const flash = L.circleMarker(
        [lat, lon],
        {
            radius: 18,
            color: "#ff0000",
            weight: 3,
            fillColor: "#ffcc00",
            fillOpacity: 0.4
        }
    ).addTo(map);

    setTimeout(() => {

        map.removeLayer(flash);

    }, 2000);

}


/******************************************************************************
HOME EXTENT
******************************************************************************/

document.addEventListener("click", function (e) {

    if (e.target.id === "btnHomeExtent") {

        map.fitBounds(homeExtent);

    }

});

/******************************************************************************
GeoForest Enterprise
Update WMS Layer Filter
******************************************************************************/

function updateLayerFilter(layer, cqlFilter = "") {


    if (!layer) return;

    layer.setParams({
        cql_filter: cqlFilter
    });

}


/******************************************************************************
GeoForest Enterprise
Refresh WMS Layers
******************************************************************************/

function refreshMapLayers() {

    const divisionId = document.getElementById("cmbDivisionGIS").value;
    const rangeId = document.getElementById("cmbRangeGIS").value;
    const beatId = document.getElementById("cmbBeatGIS").value;

    let divisionFilter = "";
    let rangeFilter = "";
    let beatFilter = "";
    let plantFilter = "";

    if (divisionId) {

        divisionFilter = `division_id=${divisionId}`;
        rangeFilter = `division_id=${divisionId}`;
        beatFilter = `division_id=${divisionId}`;
        plantFilter = `division_id=${divisionId}`;

    }

    if (rangeId) {

        rangeFilter = `range_id=${rangeId}`;
        beatFilter = `range_id=${rangeId}`;
        plantFilter = `range_id=${rangeId}`;

    }

    if (beatId) {

        beatFilter = `beat_id=${beatId}`;
        plantFilter = `beat_id=${beatId}`;

    }

    updateLayerFilter(divisionLayer, divisionFilter);
    updateLayerFilter(rangeLayer, rangeFilter);
    updateLayerFilter(beatLayer, beatFilter);
    updateLayerFilter(plantLayer, plantFilter);

}

/******************************************************************************
Division Changed
******************************************************************************/

async function filterByDivision() {

    const divisionId = document.getElementById("cmbDivisionGIS").value;

    await loadRanges(divisionId);

    document.getElementById("cmbBeatGIS").innerHTML =
        "<option value=''>All Beats</option>";

    refreshMapLayers();

    if (divisionId) {

        zoomToBoundary(
            "GeoForest:forest_divisions",
            "division_id",
            divisionId
        );

    }

}

/******************************************************************************
Range Changed
******************************************************************************/

async function filterByRange() {

    const rangeId = document.getElementById("cmbRangeGIS").value;

    await loadBeats(rangeId);

    refreshMapLayers();

    if (rangeId) {

        zoomToBoundary(
            "GeoForest:forest_ranges",
            "range_id",
            rangeId
        );

    }

}

/******************************************************************************
Beat Changed
******************************************************************************/

function filterByBeat() {

    const beatId = document.getElementById("cmbBeatGIS").value;

    refreshMapLayers();

    if (beatId) {

        zoomToBoundary(
            "GeoForest:forest_beats",
            "beat_id",
            beatId
        );

    }

}

/******************************************************************************
Clear GIS Filters
******************************************************************************/

function clearMapFilters() {

    document.getElementById("cmbDivisionGIS").selectedIndex = 0;
    document.getElementById("cmbRangeGIS").selectedIndex = 0;
    document.getElementById("cmbBeatGIS").selectedIndex = 0;

    refreshMapLayers();

    map.fitBounds(homeExtent);

}

/******************************************************************************
Register GIS Events
******************************************************************************/

function registerGISEvents() {

    document
        .getElementById("cmbDivisionGIS")
        .addEventListener("change", filterByDivision);

    document
        .getElementById("cmbRangeGIS")
        .addEventListener("change", filterByRange);

    document
        .getElementById("cmbBeatGIS")
        .addEventListener("change", filterByBeat);

    document
        .getElementById("btnClearFilter")
        .addEventListener("click", clearMapFilters);

}

/******************************************************************************
GeoForest Enterprise
Zoom to Selected Boundary using WFS
******************************************************************************/

async function zoomToBoundary(layerName, fieldName, fieldValue) {

    if (!fieldValue) {
        return;
    }

    try {

        const url =
            `${GEOSERVER_URL}/GeoForest/ows` +
            `?service=WFS` +
            `&version=2.0.0` +
            `&request=GetFeature` +
            `&typeNames=${layerName}` +
            `&outputFormat=application/json` +
            `&CQL_FILTER=${fieldName}=${fieldValue}`;

        const response = await fetch(url);

        if (!response.ok) {
            throw new Error("Unable to retrieve boundary.");
        }

        const geojson = await response.json();

        if (!geojson.features || geojson.features.length === 0) {
            return;
        }

        const feature = L.geoJSON(geojson);

        map.fitBounds(feature.getBounds(), {
            padding: [20, 20],
            maxZoom: 15
        });

    }
    catch (error) {

        console.error("Zoom failed:", error);

    }

}
/******************************************************************************
Layer Visibility
******************************************************************************/

function registerLayerVisibility() {

    document.getElementById("chkDivisions")
        .addEventListener("change", function () {

            this.checked
                ? map.addLayer(divisionLayer)
                : map.removeLayer(divisionLayer);

        });

    document.getElementById("chkRanges")
        .addEventListener("change", function () {

            this.checked
                ? map.addLayer(rangeLayer)
                : map.removeLayer(rangeLayer);

        });

    document.getElementById("chkBeats")
        .addEventListener("change", function () {

            this.checked
                ? map.addLayer(beatLayer)
                : map.removeLayer(beatLayer);

        });

    document.getElementById("chkPlants")
        .addEventListener("change", function () {

            this.checked
                ? map.addLayer(plantLayer)
                : map.removeLayer(plantLayer);

        });

}

/******************************************************************************
Loading Spinner
******************************************************************************/

function showLoading() {

    document
        .getElementById("loadingSpinner")
        .classList.remove("d-none");

}

function hideLoading() {

    document
        .getElementById("loadingSpinner")
        .classList.add("d-none");

}

