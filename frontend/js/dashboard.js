"use strict";

/************************************************************
Dashboard
************************************************************/

let dashboardMap = null;
let dashboardMarkers = [];

/************************************************************
INITIALIZE
************************************************************/

async function initializeDashboard() {

    if (!document.getElementById("lblSpeciesCount"))
        return;

    initializeDashboardMap();

    await loadDashboard();

}

/************************************************************
LOAD DASHBOARD
************************************************************/

async function loadDashboard() {

    await loadCounts();

    await loadRecentPlants();

    await loadPlantMarkers();

}

/************************************************************
COUNTS
************************************************************/

async function loadCounts() {

    try {

        const species = await getSpecies();
        const plants = await getPlants();
        const beats = await getBeats();

        document.getElementById("lblSpeciesCount").innerHTML =
            species.length;

        document.getElementById("lblPlantCount").innerHTML =
            plants.length;

        document.getElementById("lblBeatCount").innerHTML =
            beats.length;

        const ranges = [...new Set(beats.map(x => x.range_name))];

        document.getElementById("lblRangeCount").innerHTML =
            ranges.length;

    }

    catch (e) {

        console.error(e);

    }

}

/************************************************************
MAP
************************************************************/

function initializeDashboardMap() {

    dashboardMap = L.map("dashboardMap").setView(

        [11.40, 76.95],

        10

    );

    L.tileLayer(

        "https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png",

        {

            attribution:

                "&copy; OpenStreetMap"

        }

    ).addTo(dashboardMap);

}

/************************************************************
RECENT OBSERVATIONS
************************************************************/

async function loadRecentPlants() {

    const plants = await getPlants();

    const tbody =

        document.querySelector("#tblRecentPlants tbody");

    tbody.innerHTML = "";

    plants.forEach(p => {

        tbody.innerHTML += `

<tr>

<td>${p.observation_no}</td>

<td>${p.scientific_name}</td>

<td>${p.beat_name}</td>

<td>${p.observed_on}</td>

</tr>

`;

    });

}

/************************************************************
MARKERS
************************************************************/

async function loadPlantMarkers() {

    const plants = await getPlants();

    dashboardMarkers.forEach(m => dashboardMap.removeLayer(m));

    dashboardMarkers = [];

    plants.forEach(p => {

        if (!p.latitude || !p.longitude)
            return;

        const marker =

            L.marker([

                p.latitude,

                p.longitude

            ]).addTo(dashboardMap);

        marker.bindPopup(

            "<b>" + p.observation_no + "</b><br>" +

            p.scientific_name + "<br>" +

            p.beat_name

        );

        dashboardMarkers.push(marker);

    });

}