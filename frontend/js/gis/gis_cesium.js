/******************************************************************************
 * GeoForest Enterprise
 * File : frontend/js/gis/gis_cesium.js
 * Description : CesiumJS 3D globe integration for the GIS Portal.
 *
 * Adds a 2D / 3D toggle to the GIS Portal. The existing Leaflet map stays
 * as the 2D engine; clicking "3D" reveals a Cesium globe overlaid on the
 * same map area, mirroring the four GeoServer WMS layers. Cesium assets are
 * lazy-loaded on first use so the rest of the app is not slowed down.
 ******************************************************************************/

"use strict";

/******************************************************************************
 * >>> PASTE YOUR CESIUM ION ACCESS TOKEN BELOW <<<
 *
 * Get a free token at https://ion.cesium.com/tokens
 * The token is required for Cesium World Terrain + World Imagery (3D basemap).
 ******************************************************************************/

const CESIUM_ION_TOKEN = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJqdGkiOiJmZDlhYjIwZC05ZDc4LTQyOGEtYjI0Yi1mNDk4YzJiMjljYWQiLCJpZCI6MzExNjE1LCJpYXQiOjE3NDk3MjgyMTJ9.yrEeQkNBc_eUgAe0RI1JSgnRwgLt5i682FmGLTntUjM";

/******************************************************************************
 * Configuration
 ******************************************************************************/

const CESIUM_VERSION = "1.121";

const CESIUM_BASE =
    "https://cdn.jsdelivr.net/npm/cesium@" + CESIUM_VERSION + "/Build/Cesium/";

// GeoServer WMS layers to mirror from the Leaflet map (portal.js).
const CESIUM_WMS_LAYERS = [
    "GeoForest:forest_divisions",
    "GeoForest:forest_ranges",
    "GeoForest:forest_beats",
    "GeoForest:plants"
];

/******************************************************************************
 * State
 ******************************************************************************/

let cesiumViewer = null;      // active Cesium.Viewer instance (or null)
let cesiumAssetsPromise = null; // memoised loader for the Cesium library

/******************************************************************************
 * Lazy-load Cesium JS + CSS from CDN (once)
 ******************************************************************************/

function loadCesiumAssets() {

    if (window.Cesium) {
        return Promise.resolve();
    }

    if (cesiumAssetsPromise) {
        return cesiumAssetsPromise;
    }

    // Cesium needs this set before the script runs so it can locate workers,
    // assets and web-worker files.
    window.CESIUM_BASE_URL = CESIUM_BASE;

    cesiumAssetsPromise = new Promise((resolve, reject) => {

        // Widgets stylesheet
        const link = document.createElement("link");
        link.rel = "stylesheet";
        link.href = CESIUM_BASE + "Widgets/widgets.css";
        document.head.appendChild(link);

        // Core library
        const script = document.createElement("script");
        script.src = CESIUM_BASE + "Cesium.js";
        script.onload = () => resolve();
        script.onerror = () =>
            reject(new Error("Failed to load CesiumJS from CDN."));
        document.body.appendChild(script);

    });

    return cesiumAssetsPromise;
}

/******************************************************************************
 * Toggle handler (wired via event delegation, see bottom of file)
 ******************************************************************************/

async function toggleCesium3D() {

    const container = document.getElementById("cesiumContainer");
    const mapEl = document.getElementById("map");
    const btn = document.getElementById("btn3DToggle");

    if (!container || !mapEl) {
        return;
    }

    const currentlyIn3D =
        container.style.display && container.style.display !== "none";

    if (currentlyIn3D) {
        // ---- Switch back to 2D ----
        syncLeafletFromCesium();
        destroyCesium();
        container.style.display = "none";
        mapEl.style.visibility = "visible";
        setToggleButton(btn, false);
        return;
    }

    // ---- Switch to 3D ----
    if (typeof showLoading === "function") showLoading();

    try {
        await loadCesiumAssets();
        await initCesium(container);
        container.style.display = "block";
        mapEl.style.visibility = "hidden";
        setToggleButton(btn, true);
    }
    catch (err) {
        console.error("Cesium 3D failed:", err);
        if (window.Swal) {
            Swal.fire({
                icon: "error",
                title: "3D view unavailable",
                text: err.message
            });
        } else {
            alert("3D view unavailable: " + err.message);
        }
    }
    finally {
        if (typeof hideLoading === "function") hideLoading();
    }
}

function setToggleButton(btn, active) {
    if (!btn) return;
    if (active) {
        btn.classList.add("active");
        btn.innerHTML = '<i class="bi bi-map"></i> 2D';
        btn.title = "Switch back to the 2D map";
    } else {
        btn.classList.remove("active");
        btn.innerHTML = '<i class="bi bi-badge-3d"></i> 3D';
        btn.title = "Switch to the 3D globe";
    }
}

/******************************************************************************
 * Initialise the Cesium viewer
 ******************************************************************************/

async function initCesium(container) {

    // Guard against a stale viewer whose DOM was replaced by page navigation.
    if (cesiumViewer && !cesiumViewer.isDestroyed()) {
        destroyCesium();
    }

    const tokenSet =
        CESIUM_ION_TOKEN &&
        CESIUM_ION_TOKEN !== "PASTE_YOUR_CESIUM_ION_TOKEN_HERE";

    if (tokenSet) {
        Cesium.Ion.defaultAccessToken = CESIUM_ION_TOKEN;
    } else {
        console.warn(
            "gis_cesium.js: Cesium ion token not set. Falling back to " +
            "OpenStreetMap imagery and ellipsoid terrain."
        );
    }

    // Build the viewer. With a valid ion token we get World Terrain +
    // ion imagery; without one we fall back to OSM so the globe still works.
    const viewerOptions = {
        baseLayerPicker: false,
        geocoder: false,
        homeButton: false,
        sceneModePicker: false,
        navigationHelpButton: false,
        animation: false,
        timeline: false,
        fullscreenButton: false,
        infoBox: true,
        selectionIndicator: true
    };

    if (tokenSet) {
        viewerOptions.terrain = Cesium.Terrain.fromWorldTerrain();
    } else {
        viewerOptions.baseLayer = Cesium.ImageryLayer.fromProviderAsync(
            Promise.resolve(
                new Cesium.OpenStreetMapImageryProvider({
                    url: "https://tile.openstreetmap.org/"
                })
            )
        );
    }

    cesiumViewer = new Cesium.Viewer(container, viewerOptions);

    // Remove the Cesium ion credit clutter but keep attribution container.
    cesiumViewer.scene.globe.depthTestAgainstTerrain = true;

    // ---- Mirror the GeoServer WMS layers as imagery overlays ----
    const wmsUrl = getGeoserverWmsUrl();

    CESIUM_WMS_LAYERS.forEach((layerName) => {
        cesiumViewer.imageryLayers.addImageryProvider(
            new Cesium.WebMapServiceImageryProvider({
                url: wmsUrl,
                layers: layerName,
                parameters: {
                    service: "WMS",
                    version: "1.1.1",
                    format: "image/png",
                    transparent: true
                }
            })
        );
    });

    // ---- Enable click-to-identify plants (mirrors the 2D popup) ----
    registerCesiumIdentify();

    // ---- Point the camera at the current 2D extent ----
    syncCesiumFromLeaflet();
}

/******************************************************************************
 * 3D click-to-identify — mirrors identifyPlant() / displayPlantPopup()
 ******************************************************************************/

function registerCesiumIdentify() {

    const handler = new Cesium.ScreenSpaceEventHandler(
        cesiumViewer.scene.canvas
    );

    handler.setInputAction((click) => {

        // Convert the clicked screen pixel to a lon/lat on the globe surface.
        const ray = cesiumViewer.camera.getPickRay(click.position);
        const cartesian = cesiumViewer.scene.globe.pick(ray, cesiumViewer.scene);

        if (!cartesian) {
            return;
        }

        const carto = Cesium.Cartographic.fromCartesian(cartesian);
        const lng = Cesium.Math.toDegrees(carto.longitude);
        const lat = Cesium.Math.toDegrees(carto.latitude);

        cesiumIdentifyPlant(lng, lat);

    }, Cesium.ScreenSpaceEventType.LEFT_CLICK);
}

async function cesiumIdentifyPlant(lng, lat) {

    try {
        const radius = 15; // metres — same as the 2D identify

        const url =
            getGeoserverOwsUrl() +
            `?service=WFS&version=2.0.0&request=GetFeature` +
            `&typeNames=GeoForest:plants` +
            `&outputFormat=application/json` +
            `&cql_filter=DWITHIN(geom,POINT(${lng} ${lat}),${radius},meters)`;

        const response = await fetch(url);
        const json = await response.json();

        if (!json.features || json.features.length === 0) {
            return;
        }

        const plantId = json.features[0].properties.plant_id;
        await showPlantInInfoBox(plantId, lng, lat);
    }
    catch (err) {
        console.error("3D identify failed:", err);
    }
}

async function showPlantInInfoBox(plantId, lng, lat) {

    // Reuse the same backend call as the 2D popup.
    if (typeof getPlantById !== "function") {
        return;
    }

    const result = await getPlantById(plantId);
    if (!result || result.length === 0) {
        return;
    }

    const plant = result[0];

    // Drop a marker at the plant and open Cesium's info panel with the card.
    const entity = cesiumViewer.entities.getOrCreateEntity("gf-plant-info");
    entity.position = Cesium.Cartesian3.fromDegrees(lng, lat);
    entity.point = {
        pixelSize: 14,
        color: Cesium.Color.YELLOW,
        outlineColor: Cesium.Color.RED,
        outlineWidth: 3,
        heightReference: Cesium.HeightReference.CLAMP_TO_GROUND,
        disableDepthTestDistance: Number.POSITIVE_INFINITY
    };
    entity.name = plant.common_name || plant.scientific_name || "Plant";
    entity.description = buildPlantCardHtml(plant);

    cesiumViewer.selectedEntity = entity;
    cesiumViewer.flyTo(entity, {
        duration: 1.0,
        offset: new Cesium.HeadingPitchRange(
            0,
            Cesium.Math.toRadians(-45),
            600
        )
    });
}

// Read-only plant card for Cesium's sandboxed info panel (no JS buttons).
function buildPlantCardHtml(plant) {

    const commonName = plant.common_name || "";
    const scientificName = plant.scientific_name || "";
    const family = plant.family || "";
    const origin = plant.origin_type || "";
    const beat = plant.beat_name || "";
    const condition = plant.condition_name || "";
    const observed = plant.observed_on
        ? new Date(plant.observed_on).toDateString()
        : "";
    const lat = plant.latitude != null ? Number(plant.latitude).toFixed(6) : "";
    const lng = plant.longitude != null ? Number(plant.longitude).toFixed(6) : "";
    const photo = plant.photo_path || "";

    return `
        <div style="font-family:Segoe UI,Arial,sans-serif;">
            ${photo
                ? `<div style="text-align:center;margin-bottom:10px;">
                       <img src="${photo}" style="max-width:100%;max-height:180px;
                            border-radius:6px;object-fit:cover;">
                   </div>`
                : `<div style="text-align:center;color:#888;margin-bottom:10px;">
                       No Photo Available</div>`
            }
            <table style="width:100%;border-collapse:collapse;font-size:13px;">
                <tr><td><b>🌿 Common</b></td><td>${commonName}</td></tr>
                <tr><td><b>🔬 Scientific</b></td><td><i>${scientificName}</i></td></tr>
                <tr><td><b>👪 Family</b></td><td>${family}</td></tr>
                <tr><td><b>🌎 Origin</b></td><td>${origin}</td></tr>
                <tr><td><b>🌲 Beat</b></td><td>${beat}</td></tr>
                <tr><td><b>🍂 Condition</b></td><td>${condition}</td></tr>
                <tr><td><b>📅 Observed</b></td><td>${observed}</td></tr>
                <tr><td><b>📍 Location</b></td><td>${lat}, ${lng}</td></tr>
            </table>
        </div>
    `;
}

/******************************************************************************
 * Destroy the viewer and free the WebGL context
 ******************************************************************************/

function destroyCesium() {
    if (cesiumViewer && !cesiumViewer.isDestroyed()) {
        cesiumViewer.destroy();
    }
    cesiumViewer = null;
}

/******************************************************************************
 * Camera synchronisation between Leaflet (2D) and Cesium (3D)
 ******************************************************************************/

// Approximate the Cesium camera height (metres) for a given Leaflet zoom.
function zoomToHeight(zoom) {
    // 591657550.5 m ~= full-globe view at zoom 0 for the default FOV.
    return 591657550.5 / Math.pow(2, zoom);
}

function heightToZoom(height) {
    return Math.round(Math.log2(591657550.5 / Math.max(height, 1)));
}

function syncCesiumFromLeaflet() {

    if (!cesiumViewer) return;

    let lat = 11.5565;   // Nilgiris fallback (matches portal default)
    let lng = 76.9489;
    let zoom = 11;

    if (typeof map !== "undefined" && map && map.getCenter) {
        try {
            const c = map.getCenter();
            lat = c.lat;
            lng = c.lng;
            zoom = map.getZoom();
        } catch (e) { /* keep fallback */ }
    }

    cesiumViewer.camera.setView({
        destination: Cesium.Cartesian3.fromDegrees(
            lng,
            lat,
            zoomToHeight(zoom)
        ),
        orientation: {
            heading: 0.0,
            pitch: Cesium.Math.toRadians(-90.0), // straight down, like 2D
            roll: 0.0
        }
    });
}

function syncLeafletFromCesium() {

    if (!cesiumViewer || typeof map === "undefined" || !map) return;

    try {
        const carto = Cesium.Cartographic.fromCartesian(
            cesiumViewer.camera.positionWC
        );
        const lat = Cesium.Math.toDegrees(carto.latitude);
        const lng = Cesium.Math.toDegrees(carto.longitude);
        const zoom = Math.min(Math.max(heightToZoom(carto.height), 3), 20);

        map.setView([lat, lng], zoom, { animate: false });
    } catch (e) {
        console.warn("Could not sync 2D view from 3D camera:", e);
    }
}

/******************************************************************************
 * Resolve the GeoServer WMS endpoint (reuse portal.js global when present)
 ******************************************************************************/

function getGeoserverWmsUrl() {
    const base =
        (typeof GEOSERVER_URL !== "undefined" && GEOSERVER_URL)
            ? GEOSERVER_URL
            : "http://localhost:8595/geoserver";
    return base.replace(/\/+$/, "") + "/GeoForest/wms";
}

function getGeoserverOwsUrl() {
    const base =
        (typeof GEOSERVER_URL !== "undefined" && GEOSERVER_URL)
            ? GEOSERVER_URL
            : "http://localhost:8595/geoserver";
    return base.replace(/\/+$/, "") + "/GeoForest/ows";
}

/******************************************************************************
 * Event wiring — delegation survives SPA page re-injection (portal.js)
 ******************************************************************************/

document.addEventListener("click", function (e) {
    const btn = e.target.closest && e.target.closest("#btn3DToggle");
    if (btn) {
        e.preventDefault();
        toggleCesium3D();
    }
});
