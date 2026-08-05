/******************************************************************************
 * GeoForest Enterprise — Standalone 3D (Cesium) overlay
 * File : cesium3d.js  (project root)
 *
 * Self-contained: adds a floating "3D" button to the compiled root app and,
 * on click, opens a full-screen CesiumJS globe (World Terrain + satellite
 * imagery) with the GeoForest GeoServer WMS layers and click-to-identify.
 * It does NOT depend on the React/Leaflet internals of the app, so it works
 * on the compiled build without needing the source.
 ******************************************************************************/

(function () {
    "use strict";

    /**************************************************************************
     * Configuration
     **************************************************************************/

    // Cesium ion token (World Terrain + satellite imagery).
    const CESIUM_ION_TOKEN =
        "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJqdGkiOiJmZDlhYjIwZC05ZDc4LTQyOGEtYjI0Yi1mNDk4YzJiMjljYWQiLCJpZCI6MzExNjE1LCJpYXQiOjE3NDk3MjgyMTJ9.yrEeQkNBc_eUgAe0RI1JSgnRwgLt5i682FmGLTntUjM";

    const CESIUM_VERSION = "1.121";
    const CESIUM_BASE =
        "https://cdn.jsdelivr.net/npm/cesium@" + CESIUM_VERSION + "/Build/Cesium/";

    // GeoServer: matches the compiled app -> http://<host>:8595/geoserver
    function geoserverBase() {
        const host = window.location.hostname || "localhost";
        return "http://" + host + ":8595/geoserver";
    }
    const WMS_URL = () => geoserverBase() + "/GeoForest/wms";
    const OWS_URL = () => geoserverBase() + "/GeoForest/ows";

    // Forest boundary layers to drape over the terrain.
    const WMS_LAYERS = [
        "GeoForest:forest_divisions",
        "GeoForest:forest_ranges",
        "GeoForest:forest_beats"
    ];

    // Default 3D extent — Nilgiris forest region (west, south, east, north).
    const HOME_RECT = { west: 76.3, south: 11.0, east: 77.6, north: 12.0 };

    /**************************************************************************
     * State
     **************************************************************************/

    let viewer = null;
    let assetsPromise = null;

    /**************************************************************************
     * Lazy-load Cesium from CDN
     **************************************************************************/

    function loadCesium() {
        if (window.Cesium) return Promise.resolve();
        if (assetsPromise) return assetsPromise;

        window.CESIUM_BASE_URL = CESIUM_BASE;

        assetsPromise = new Promise((resolve, reject) => {
            const link = document.createElement("link");
            link.rel = "stylesheet";
            link.href = CESIUM_BASE + "Widgets/widgets.css";
            document.head.appendChild(link);

            const s = document.createElement("script");
            s.src = CESIUM_BASE + "Cesium.js";
            s.onload = () => resolve();
            s.onerror = () => reject(new Error("Failed to load CesiumJS from CDN."));
            document.body.appendChild(s);
        });
        return assetsPromise;
    }

    /**************************************************************************
     * UI — floating button + full-screen overlay
     **************************************************************************/

    // Lucide-style globe icon, sized by the app's own `.btn svg` rule.
    const GLOBE_SVG =
        '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" ' +
        'fill="none" stroke="currentColor" stroke-width="2" ' +
        'stroke-linecap="round" stroke-linejoin="round">' +
        '<circle cx="12" cy="12" r="10"></circle>' +
        '<path d="M12 2a14.5 14.5 0 0 0 0 20 14.5 14.5 0 0 0 0-20"></path>' +
        '<path d="M2 12h20"></path></svg>';

    // Lucide-style "maximize" (zoom to extent) icon.
    const ZOOM_SVG =
        '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" ' +
        'fill="none" stroke="currentColor" stroke-width="2" ' +
        'stroke-linecap="round" stroke-linejoin="round">' +
        '<path d="M8 3H5a2 2 0 0 0-2 2v3"></path>' +
        '<path d="M21 8V5a2 2 0 0 0-2-2h-3"></path>' +
        '<path d="M3 16v3a2 2 0 0 0 2 2h3"></path>' +
        '<path d="M16 21h3a2 2 0 0 0 2-2v-3"></path></svg>';

    // Lucide-style "x" (close) icon.
    const CLOSE_SVG =
        '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" ' +
        'fill="none" stroke="currentColor" stroke-width="2" ' +
        'stroke-linecap="round" stroke-linejoin="round">' +
        '<path d="M18 6 6 18"></path><path d="m6 6 12 12"></path></svg>';

    // Create the toolbar button that matches the app's existing tool buttons.
    function makeToolbarButton() {
        const b = document.createElement("button");
        b.id = "gfCesiumBtn";
        b.type = "button";
        b.className = "btn ghost icon";
        b.title = "3D View";
        b.setAttribute("aria-label", "3D View");
        b.innerHTML = GLOBE_SVG;
        b.addEventListener("click", toggleMenu);
        return b;
    }

    // Inject the button into the app's .map-toolbar (re-inject on re-render).
    function injectToolbarButton() {
        const bar = document.querySelector(".map-toolbar");
        if (!bar) return;
        if (bar.querySelector("#gfCesiumBtn")) return;
        bar.appendChild(makeToolbarButton());
    }

    function startToolbarInjection() {
        injectToolbarButton();
        const obs = new MutationObserver(() => injectToolbarButton());
        obs.observe(document.body, { childList: true, subtree: true });
    }

    // Build one row of the 3D popup menu (icon + label), app-dropdown style.
    function makeMenuItem(svg, label, iconColor, onClick) {
        const b = document.createElement("button");
        b.type = "button";
        Object.assign(b.style, {
            display: "flex",
            alignItems: "center",
            gap: "9px",
            width: "100%",
            padding: "11px 15px",
            border: "none",
            background: "#fff",
            color: "#1c3d2e",
            font: "inherit",
            fontSize: "14px",
            fontWeight: "600",
            textAlign: "left",
            cursor: "pointer"
        });
        b.innerHTML =
            '<span style="display:inline-flex;color:' + iconColor +
            '">' + svg + "</span><span>" + label + "</span>";
        b.addEventListener("mouseenter", () => (b.style.background = "#f1f6f3"));
        b.addEventListener("mouseleave", () => (b.style.background = "#fff"));
        b.addEventListener("click", onClick);
        return b;
    }

    function buildUI() {

        startToolbarInjection();

        // Full-screen 3D overlay (hidden until opened).
        const overlay = document.createElement("div");
        overlay.id = "gfCesiumOverlay";
        Object.assign(overlay.style, {
            position: "fixed",
            inset: "0",
            zIndex: "99999",
            display: "none",
            background: "#000"
        });

        const container = document.createElement("div");
        container.id = "gfCesiumContainer";
        Object.assign(container.style, {
            position: "absolute",
            inset: "0"
        });
        overlay.appendChild(container);

        // Close control inside the 3D view (top-right) — shown while open.
        const closeBtn = document.createElement("button");
        closeBtn.type = "button";
        closeBtn.title = "Close 3D View";
        closeBtn.innerHTML =
            CLOSE_SVG + '<span style="margin-left:6px">Close 3D</span>';
        Object.assign(closeBtn.style, {
            position: "absolute",
            top: "12px",
            left: "12px",
            zIndex: "100000",
            display: "inline-flex",
            alignItems: "center",
            padding: "6px 10px",
            fontSize: "12px",
            fontWeight: "600",
            color: "#fff",
            background: "#dc3545",
            border: "none",
            borderRadius: "7px",
            boxShadow: "0 2px 8px rgba(0,0,0,.4)",
            cursor: "pointer"
        });
        const closeIcon = closeBtn.querySelector("svg");
        if (closeIcon) {
            closeIcon.style.width = "13px";
            closeIcon.style.height = "13px";
            closeIcon.style.flex = "0 0 13px";
        }
        closeBtn.addEventListener("click", closeOverlay);
        overlay.appendChild(closeBtn);

        // Dropdown menu anchored to the 3D toolbar button (like the app's
        // Basemap popup). Lives on <body> above the overlay so it stays
        // beside the button. Styled like the app's tool dropdowns.
        const menu = document.createElement("div");
        menu.id = "gfCesiumMenu";
        Object.assign(menu.style, {
            position: "fixed",
            zIndex: "100001",
            display: "none",
            background: "#fff",
            borderRadius: "9px",
            boxShadow: "0 6px 22px rgba(0,0,0,.35)",
            overflow: "hidden",
            minWidth: "190px",
            fontFamily: "Segoe UI, Arial, sans-serif"
        });

        const view = makeMenuItem(GLOBE_SVG, "3D View", "#198754",
            () => { hideMenu(); openOverlay(); });
        const zoom = makeMenuItem(ZOOM_SVG, "Zoom to layer", "#198754",
            () => { hideMenu(); zoomToActiveLayer(); });
        zoom.style.borderTop = "1px solid #ececec";

        menu.appendChild(view);
        menu.appendChild(zoom);

        document.body.appendChild(overlay);
        document.body.appendChild(menu);

        // Close the dropdown when clicking anywhere outside it or the button.
        document.addEventListener("click", (e) => {
            const m = document.getElementById("gfCesiumMenu");
            if (!m || m.style.display === "none") return;
            if (m.contains(e.target)) return;
            if (e.target.closest && e.target.closest("#gfCesiumBtn")) return;
            hideMenu();
        });
    }

    /**************************************************************************
     * Open / close
     **************************************************************************/

    // Toggle the dropdown attached to the 3D toolbar button.
    function toggleMenu() {
        const menu = document.getElementById("gfCesiumMenu");
        if (!menu) return;
        if (menu.style.display === "none" || !menu.style.display) {
            positionMenu();
        } else {
            hideMenu();
        }
    }

    async function openOverlay() {
        const overlay = document.getElementById("gfCesiumOverlay");
        overlay.style.display = "block";

        try {
            await loadCesium();
            initViewer();
        } catch (err) {
            console.error(err);
            alert("3D view unavailable: " + err.message);
            overlay.style.display = "none";
            hideMenu();
        }
    }

    // Show the dropdown just to the LEFT of the 3D toolbar button.
    function positionMenu() {
        const menu = document.getElementById("gfCesiumMenu");
        const btn = document.getElementById("gfCesiumBtn");
        if (!menu) return;

        menu.style.display = "block";
        if (btn) {
            const r = btn.getBoundingClientRect();
            menu.style.top = r.top + "px";
            menu.style.left = "auto";
            menu.style.right = (window.innerWidth - r.left + 8) + "px";
        } else {
            menu.style.top = "14px";
            menu.style.right = "14px";
            menu.style.left = "auto";
        }
    }

    function hideMenu() {
        const menu = document.getElementById("gfCesiumMenu");
        if (menu) menu.style.display = "none";
    }

    function closeOverlay() {
        const overlay = document.getElementById("gfCesiumOverlay");
        overlay.style.display = "none";
        hideMenu();
        if (viewer && !viewer.isDestroyed()) {
            viewer.destroy();
        }
        viewer = null;
    }

    /**************************************************************************
     * Cesium viewer
     **************************************************************************/

    function initViewer() {

        if (viewer && !viewer.isDestroyed()) return;

        Cesium.Ion.defaultAccessToken = CESIUM_ION_TOKEN;

        viewer = new Cesium.Viewer("gfCesiumContainer", {
            terrain: Cesium.Terrain.fromWorldTerrain(),
            baseLayerPicker: true,   // let the user pick satellite / other bases
            geocoder: false,
            homeButton: true,
            sceneModePicker: true,
            navigationHelpButton: false,
            animation: false,
            timeline: false,
            fullscreenButton: true,
            infoBox: true,
            selectionIndicator: true
        });

        viewer.scene.globe.depthTestAgainstTerrain = true;

        // Drape whatever GeoServer layers are currently shown on the 2D map.
        // If none are detected, fall back to the default forest layers.
        const active = collectActiveWmsLayers();
        const configs = active.length
            ? active
            : WMS_LAYERS.map((l) => ({
                  layers: l,
                  styles: "",
                  cql: "",
                  format: "image/png"
              }));

        configs.forEach((cfg) => {
            const parameters = {
                service: "WMS",
                version: "1.1.1",
                format: cfg.format || "image/png",
                transparent: true
            };
            if (cfg.styles) parameters.styles = cfg.styles;
            if (cfg.cql) parameters.cql_filter = cfg.cql;

            viewer.imageryLayers.addImageryProvider(
                new Cesium.WebMapServiceImageryProvider({
                    url: WMS_URL(),
                    layers: cfg.layers,
                    parameters: parameters
                })
            );
        });

        // Position the camera on the broad study region (zoomed OUT) so the
        // layer is on-screen. No tight zoom — the user zooms in manually.
        viewer.camera.setView({
            destination: Cesium.Rectangle.fromDegrees(75.6, 10.4, 78.3, 12.6)
        });

        registerIdentify();
    }

    /**************************************************************************
     * Read the live 2D map — which GeoServer layers are shown, and where
     *
     * The 2D app renders GeoServer layers as WMS "GetMap" <img> requests in
     * the DOM. We scan those images to mirror the user's current selection
     * (layer name, style, CQL filter) and current extent into the 3D view.
     **************************************************************************/

    // Only images that are WMS GetMap requests AND currently visible on
    // screen (stale/faded leaflet images left in the DOM are excluded).
    function wmsImages() {
        const out = [];
        document.querySelectorAll("img").forEach((img) => {
            const src = img.currentSrc || img.src || "";
            if (!/[?&]request=getmap/i.test(src)) return;
            if (!/[?&]layers=/i.test(src)) return;

            const st = window.getComputedStyle(img);
            if (st.display === "none" || st.visibility === "hidden") return;
            if (parseFloat(st.opacity || "1") < 0.5) return;

            const r = img.getBoundingClientRect();
            if (r.width < 40 || r.height < 40) return; // skip tiny tiles

            out.push({ src: src, area: r.width * r.height });
        });
        return out;
    }

    function param(url, name) {
        try {
            const u = new URL(url, window.location.href);
            // Case-insensitive lookup.
            for (const [k, v] of u.searchParams.entries()) {
                if (k.toLowerCase() === name.toLowerCase()) return v;
            }
        } catch (e) { /* ignore */ }
        return null;
    }

    function collectActiveWmsLayers() {
        const seen = new Map();
        wmsImages().forEach((item) => {
            const src = item.src;
            const layers = param(src, "layers");
            if (!layers) return;
            if (seen.has(layers)) return;
            seen.set(layers, {
                layers: layers,
                styles: param(src, "styles") || "",
                cql: param(src, "cql_filter") || "",
                format: param(src, "format") || "image/png"
            });
        });
        return Array.from(seen.values());
    }

    // Web-Mercator metre -> degree helpers.
    function mercToLon(x) {
        return (x / 20037508.34) * 180;
    }
    function mercToLat(y) {
        let lat = (y / 20037508.34) * 180;
        lat =
            (180 / Math.PI) *
            (2 * Math.atan(Math.exp((lat * Math.PI) / 180)) - Math.PI / 2);
        return lat;
    }

    // Derive the current view extent (in degrees) from the WMS image that
    // fills the map (largest ON-SCREEN area = the current view, not a
    // stale/state-wide one). Returns {west, south, east, north} or null.
    function activeViewBounds() {
        const imgs = wmsImages();
        if (!imgs.length) return null;

        // The current full-view image renders largest on screen.
        imgs.sort((a, b) => b.area - a.area);
        const src = imgs[0].src;

        const bbox = param(src, "bbox");
        if (!bbox) return null;
        const p = bbox.split(",").map(Number);
        if (p.length !== 4 || p.some(isNaN)) return null;

        const srs = (param(src, "srs") || param(src, "crs") || "").toUpperCase();
        let west, south, east, north;

        if (srs.indexOf("4326") !== -1) {
            // 1.3.0/4326 axis order is lat,lon; 1.1.1/4326 is lon,lat.
            const ver = param(src, "version") || "1.1.1";
            if (ver === "1.3.0") {
                south = p[0]; west = p[1]; north = p[2]; east = p[3];
            } else {
                west = p[0]; south = p[1]; east = p[2]; north = p[3];
            }
        } else {
            // Assume Web Mercator (3857 / 900913) in metres.
            west = mercToLon(p[0]);
            south = mercToLat(p[1]);
            east = mercToLon(p[2]);
            north = mercToLat(p[3]);
        }

        return { west: west, south: south, east: east, north: north };
    }

    /**************************************************************************
     * Authoritative extent from GeoServer WMS GetCapabilities
     **************************************************************************/

    let capsPromise = null;

    function fetchCapabilities() {
        if (capsPromise) return capsPromise;
        const url =
            WMS_URL() +
            "?service=WMS&version=1.1.1&request=GetCapabilities";
        capsPromise = fetch(url)
            .then((r) => r.text())
            .then((txt) =>
                new DOMParser().parseFromString(txt, "text/xml")
            )
            .catch(() => null);
        return capsPromise;
    }

    // Return {west,south,east,north} for a layer, or null.
    async function fetchLayerBounds(layerName) {
        const doc = await fetchCapabilities();
        if (!doc) return null;

        const layers = doc.getElementsByTagName("Layer");
        for (let i = 0; i < layers.length; i++) {
            const nameEl = layers[i].getElementsByTagName("Name")[0];
            if (!nameEl) continue;
            if (nameEl.textContent.trim() !== layerName) continue;

            // WMS 1.1.1 lat/lon bbox is EPSG:4326 (lon/lat), degrees.
            const bb = layers[i].getElementsByTagName("LatLonBoundingBox")[0];
            if (!bb) return null;
            const west = parseFloat(bb.getAttribute("minx"));
            const south = parseFloat(bb.getAttribute("miny"));
            const east = parseFloat(bb.getAttribute("maxx"));
            const north = parseFloat(bb.getAttribute("maxy"));
            if ([west, south, east, north].some(isNaN)) return null;
            return { west: west, south: south, east: east, north: north };
        }
        return null;
    }

    function boundsArea(b) {
        return Math.abs(b.east - b.west) * Math.abs(b.north - b.south);
    }

    // Fly to the tightest (most specific) active layer's extent.
    async function flyToActiveLayer() {
        const active = collectActiveWmsLayers();
        let chosen = null;

        for (const cfg of active) {
            const b = await fetchLayerBounds(cfg.layers);
            if (b && (!chosen || boundsArea(b) < boundsArea(chosen))) {
                chosen = b;
            }
        }

        flyToBounds(chosen || activeViewBounds() || HOME_RECT);
        return chosen;
    }

    // Button handler: zoom to the active layer, with user feedback.
    async function zoomToActiveLayer() {
        if (!viewer || viewer.isDestroyed()) return;

        if (collectActiveWmsLayers().length === 0) {
            alert("No layer is active. Turn a layer on in the 2D map first.");
            return;
        }

        const bounds = await flyToActiveLayer();
        if (!bounds) {
            // GetCapabilities unreachable — flyToActiveLayer already fell back
            // to the current view / default region, so just inform the user.
            console.warn(
                "Could not read the layer extent from GeoServer; " +
                "used the current view extent instead."
            );
        }
    }

    // Point the camera straight down at the centre of the given bounds,
    // at a height that frames the extent (avoids rectangle-fit drift).
    function flyToBounds(b) {
        const centerLon = (b.west + b.east) / 2;
        const centerLat = (b.south + b.north) / 2;
        const latRad = (centerLat * Math.PI) / 180;

        const widthM = Math.abs(b.east - b.west) * 111320 * Math.cos(latRad);
        const heightM = Math.abs(b.north - b.south) * 110540;
        const span = Math.max(widthM, heightM, 500);

        const fovy = (viewer.camera.frustum && viewer.camera.frustum.fovy)
            ? viewer.camera.frustum.fovy
            : Math.PI / 3;

        let height = (span / 2) / Math.tan(fovy / 2) * 1.15;
        if (!isFinite(height) || height < 800) height = 800;

        viewer.camera.flyTo({
            destination: Cesium.Cartesian3.fromDegrees(
                centerLon, centerLat, height
            ),
            orientation: {
                heading: 0.0,
                pitch: -Math.PI / 2, // straight down
                roll: 0.0
            },
            duration: 1.5
        });
    }

    /**************************************************************************
     * Click-to-identify plants (WFS) -> Cesium info panel
     **************************************************************************/

    function registerIdentify() {

        const handler = new Cesium.ScreenSpaceEventHandler(viewer.scene.canvas);

        handler.setInputAction((click) => {
            const ray = viewer.camera.getPickRay(click.position);
            const cart = viewer.scene.globe.pick(ray, viewer.scene);
            if (!cart) return;

            const c = Cesium.Cartographic.fromCartesian(cart);
            identifyPlant(
                Cesium.Math.toDegrees(c.longitude),
                Cesium.Math.toDegrees(c.latitude)
            );
        }, Cesium.ScreenSpaceEventType.LEFT_CLICK);
    }

    async function identifyPlant(lng, lat) {
        try {
            const radius = 15; // metres
            const url =
                OWS_URL() +
                "?service=WFS&version=2.0.0&request=GetFeature" +
                "&typeNames=GeoForest:plants" +
                "&outputFormat=application/json" +
                "&cql_filter=DWITHIN(geom,POINT(" + lng + " " + lat + ")," +
                radius + ",meters)";

            const res = await fetch(url);
            if (!res.ok) return;
            const json = await res.json();
            if (!json.features || json.features.length === 0) return;

            const p = json.features[0].properties;
            showInfo(p, lng, lat);
        } catch (e) {
            console.error("3D identify failed:", e);
        }
    }

    function showInfo(props, lng, lat) {
        const name =
            props.common_name || props.scientific_name || "Plant";

        const rows = [
            ["🌿 Common", props.common_name],
            ["🔬 Scientific", props.scientific_name],
            ["👪 Family", props.family],
            ["🌲 Beat", props.beat_name],
            ["🍂 Condition", props.condition_name],
            ["📍 Location", lat.toFixed(6) + ", " + lng.toFixed(6)]
        ]
            .filter((r) => r[1])
            .map(
                (r) =>
                    "<tr><td style='padding:2px 6px'><b>" +
                    r[0] +
                    "</b></td><td style='padding:2px 6px'>" +
                    r[1] +
                    "</td></tr>"
            )
            .join("");

        const photo = props.photo_path
            ? "<div style='text-align:center;margin-bottom:8px'><img src='" +
              props.photo_path +
              "' style='max-width:100%;max-height:170px;border-radius:6px'></div>"
            : "";

        const entity = viewer.entities.getOrCreateEntity("gf-plant-info");
        entity.position = Cesium.Cartesian3.fromDegrees(lng, lat);
        entity.point = {
            pixelSize: 14,
            color: Cesium.Color.YELLOW,
            outlineColor: Cesium.Color.RED,
            outlineWidth: 3,
            heightReference: Cesium.HeightReference.CLAMP_TO_GROUND,
            disableDepthTestDistance: Number.POSITIVE_INFINITY
        };
        entity.name = name;
        entity.description =
            "<div style='font-family:Segoe UI,Arial,sans-serif'>" +
            photo +
            "<table style='width:100%;border-collapse:collapse;font-size:13px'>" +
            rows +
            "</table></div>";

        viewer.selectedEntity = entity;
    }

    /**************************************************************************
     * Boot
     **************************************************************************/

    if (document.readyState === "loading") {
        document.addEventListener("DOMContentLoaded", buildUI);
    } else {
        buildUI();
    }
})();
