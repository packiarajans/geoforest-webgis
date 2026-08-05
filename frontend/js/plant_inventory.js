"use strict";

/***********************************************************
Plant Inventory
***********************************************************/

let plantsTable = null;
let PlantInventorymap = null;
let marker = null;
let plantMarkers = L.layerGroup();
let gpsSource = "BEAT";
let currentPhotoPath = "";



async function initializePlantInventory() {

    console.log("Initialize");

    registerPlantInventoryEvents();

    console.log("Loading Species...");
    await loadPlantInventorySpecies();

    console.log("Loading Beats...");
    await loadBeats();

    document
        .getElementById("cmbBeat")
        .addEventListener("change", beatChanged);

    console.log("Loading Conditions...");
    await loadConditions();

    console.log("Loading Plants...");
    await loadPlantInventory();

    initializePlantInventorymap();

    clearPlantInventoryForm();

}
function registerPlantInventoryEvents() {

    document
        .getElementById("btnSave")
        .addEventListener("click", savePlant);

    document
        .getElementById("btnUpdate")
        .addEventListener("click", updateCurrentPlant);

    document
        .getElementById("btnDelete")
        .addEventListener("click", deleteCurrentPlant);

    document
        .getElementById("btnClear")
        .addEventListener("click", clearPlantInventoryForm);

    document
        .getElementById("filePhoto")
        .addEventListener("change", previewPhoto);

    document.getElementById("dtObservedOn").value =
        new Date().toISOString().split("T")[0];


}

async function loadPlantInventorySpecies() {

    const data = await getSpecies();

    console.log("Species:", data);

    const cmb = document.getElementById("cmbSpecies");

    console.log(cmb);

    cmb.innerHTML = "";

    data.forEach(item => {

        cmb.innerHTML +=
            `<option value="${item.species_id}">
                ${item.scientific_name}
            </option>`;

    });

}

async function loadBeats() {

    const data = await getBeats();

    console.log("Beats:", data);

    const cmb = document.getElementById("cmbBeat");

    cmb.innerHTML = "";

    data.forEach(item => {

        cmb.innerHTML += `
            <option value="${item.beat_id}">
                ${item.beat_name}
            </option>`;

    });

}

async function loadConditions() {

    const data = await getPlantConditions();

    console.log("Conditions:", data);

    const cmb = document.getElementById("cmbCondition");

    cmb.innerHTML = "";

    data.forEach(item => {

        cmb.innerHTML += `
            <option value="${item.condition_id}">
                ${item.condition_name}
            </option>`;

    });

}

/************************************************************
LOAD PLANTS
************************************************************/

async function loadPlantInventory() {

    const data = await getPlants();

    console.log(data);

    if (plantsTable !== null) {

        plantsTable.destroy();

    }

    $("#tblPlants tbody").empty();

    data.forEach(item => {

        $("#tblPlants tbody").append(`

<tr>

<td>${item.observation_no}</td>

<td>${item.scientific_name}</td>

<td>${item.beat_name}</td>

<td>${item.condition_name}</td>

<td>${item.observed_on}</td>

    <td>

<button
    class="btn btn-success btn-sm"
    onclick="editPlant('${item.plant_id}')">

    <i class="bi bi-pencil-square"></i>

</button>

    </td>

</tr>

`);

    });

    plantsTable = new DataTable(

        "#tblPlants",

        TABLE_OPTIONS

    );

}



// If a plant was opened from the map, load it automatically
if (window.selectedPlantId) {

    editPlant(window.selectedPlantId);

    window.selectedPlantId = null;

}
/************************************************************
VALIDATE
************************************************************/

function validatePlantInventoryForm() {

    if (!document.getElementById("cmbSpecies").value) {

        showWarning("Please select Species.");

        return false;

    }

    if (!document.getElementById("cmbBeat").value) {

        showWarning("Please select Beat.");

        return false;

    }

    if (!document.getElementById("cmbCondition").value) {

        showWarning("Please select Condition.");

        return false;

    }

    return true;

}



/************************************************************
CLEAR
************************************************************/

function clearPlantInventoryForm() {

    document.getElementById("plantId").value = "";

    document.getElementById("txtObservationNo").value = "";

    document.getElementById("cmbSpecies").selectedIndex = 0;

    document.getElementById("cmbBeat").selectedIndex = 0;

    document.getElementById("cmbCondition").selectedIndex = 0;

    document.getElementById("txtAgeClass").value = "";

    document.getElementById("dtObservedOn").value =
        new Date().toISOString().split("T")[0];

    document.getElementById("txtLatitude").value = "";

    document.getElementById("txtLongitude").value = "";

    document.getElementById("txtAccuracy").value = "";

    document.getElementById("txtObservedBy").value = "";

    document.getElementById("txtRemarks").value = "";

    document.getElementById("filePhoto").value = "";

    document.getElementById("photoPreview").src = "";

    document.getElementById("photoPreview").style.display = "none";

    currentPhotoPath = "";

    if (marker && PlantInventorymap) {

        PlantInventorymap.removeLayer(marker);

        marker = null;

    }

}

/************************************************************
BEAT CHANGED
************************************************************/

async function beatChanged() {

    const beatId = parseInt(
        document.getElementById("cmbBeat").value
    );

    if (!beatId)
        return;

    // NEW
    if (gpsSource === "PHOTO") {

        console.log("GPS already obtained from photograph.");

        return;

    }

    const data = await getBeatLocation(beatId);

    if (!data || data.length === 0)
        return;

    const point = data[0];

    document.getElementById("txtLatitude").value =
        Number(point.latitude).toFixed(6);

    document.getElementById("txtLongitude").value =
        Number(point.longitude).toFixed(6);

    if (marker) {

        PlantInventorymap.removeLayer(marker);

    }

    marker = L.marker([
        point.latitude,
        point.longitude
    ]).addTo(PlantInventorymap);

    PlantInventorymap.flyTo(
        [point.latitude, point.longitude],
        16
    );

}
/************************************************************
PHOTO PREVIEW
************************************************************/

function previewPhoto() {


    console.log("Preview Photo Called");

    console.log(document.getElementById("photoPreview"));

    const file = document.getElementById("filePhoto").files[0];


    if (!file)
        return;

    // Allow only image files
    if (!file.type.startsWith("image/")) {

        showWarning("Please select a valid image file.");

        document.getElementById("filePhoto").value = "";

        return;

    }

    const reader = new FileReader();

    reader.onload = async function (e) {

        const img = document.getElementById("photoPreview");

        img.src = e.target.result;

        img.style.display = "block";

        const gps = await readNoteCamPhoto(file);

        if (gps && gps.latitude && gps.longitude) {

            document.getElementById("txtLatitude").value =
                gps.latitude.toFixed(6);

            document.getElementById("txtLongitude").value =
                gps.longitude.toFixed(6);

            document.getElementById("txtAccuracy").value =
                gps.accuracy ?? 0;

            gpsSource = "PHOTO";

            showSuccess("GPS extracted from NoteCam photograph.");

            if (marker && PlantInventorymap) {
                PlantInventorymap.removeLayer(marker);
            }

            marker = L.marker([
                gps.latitude,
                gps.longitude
            ]).addTo(PlantInventorymap);

            PlantInventorymap.flyTo([
                gps.latitude,
                gps.longitude
            ], 18);

        }

        console.log(gps);

        /* EXIF.getData(file, function () {
 
             console.log("==================================");
             console.log("All EXIF Tags");
             console.log(EXIF.getAllTags(this));
             console.log("==================================");
 
             const lat = EXIF.getTag(this, "GPSLatitude");
             const lon = EXIF.getTag(this, "GPSLongitude");
 
             const latRef = EXIF.getTag(this, "GPSLatitudeRef");
             const lonRef = EXIF.getTag(this, "GPSLongitudeRef");
 
             console.log("Latitude :", lat);
             console.log("Longitude:", lon);
 
             if (lat && lon) {
 
                 const latitude = convertDMSToDD(lat, latRef);
 
                 const longitude = convertDMSToDD(lon, lonRef);
 
                 document.getElementById("txtLatitude").value =
                     latitude.toFixed(6);
 
                 document.getElementById("txtLongitude").value =
                     longitude.toFixed(6);
 
                 if (marker) {
 
                     map.removeLayer(marker);
 
                 }
 
                 marker = L.marker([latitude, longitude]).addTo(map);
 
                 map.flyTo([latitude, longitude], 18);
 
                 showSuccess("GPS coordinates extracted from photograph.");
 
             }
             else {
 
                 console.log("No GPS information found.");
 
             }
 
         });
         */

    };

    reader.readAsDataURL(file);

}

/************************************************************
CONVERT GPS DMS TO DECIMAL DEGREES
************************************************************/

function convertDMSToDD(dms, ref) {

    let degrees = dms[0];

    let minutes = dms[1];

    let seconds = dms[2];

    let dd =
        degrees +
        (minutes / 60) +
        (seconds / 3600);

    if (ref === "S" || ref === "W") {

        dd *= -1;

    }

    return dd;

}
/************************************************************
LEAFLET MAP
************************************************************/

function initializePlantInventorymap() {

    PlantInventorymap = L.map("map").setView(
        [11.55, 76.95],
        11
    );

    L.tileLayer(

        "https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png",

        {

            attribution:
                "&copy; OpenStreetMap"

        }

    ).addTo(PlantInventorymap);

    /*  map.on("click", function (e) {

    const lat = e.latlng.lat.toFixed(6);

    const lng = e.latlng.lng.toFixed(6);

    document.getElementById("txtLatitude").value = lat;

    document.getElementById("txtLongitude").value = lng;

    if (marker) {

        map.removeLayer(marker);

    }

    marker = L.marker([lat, lng]).addTo(map);

}); */

}


/************************************************************
SAVE
************************************************************/

async function savePlant() {

    if (!validatePlantInventoryForm())
        return;

    let photoPath = "";

    const photoFile =
        document.getElementById("filePhoto").files[0];

    if (photoFile) {

        const uploadResult =
            await uploadPhoto(photoFile);

        if (!uploadResult ||
            !uploadResult.success) {

            showError("Photo upload failed.");
            return;

        }

        photoPath = uploadResult.photo_path;

    }   // <-- IMPORTANT: the if(photoFile) ends here

    const plant = {

        p_species_id:
            parseInt(document.getElementById("cmbSpecies").value),

        p_beat_id:
            parseInt(document.getElementById("cmbBeat").value),

        p_observed_on:
            document.getElementById("dtObservedOn").value || null,

        p_observed_by:
            document.getElementById("txtObservedBy").value.trim(),

        p_condition_id:
            parseInt(document.getElementById("cmbCondition").value),

        p_age_class:
            document.getElementById("txtAgeClass").value.trim(),

        p_latitude:
            parseFloat(document.getElementById("txtLatitude").value),

        p_longitude:
            parseFloat(document.getElementById("txtLongitude").value),


        p_gps_accuracy:
            parseFloat(
                document.getElementById("txtAccuracy").value || 0
            ),

        p_photo_path:
            photoPath,

        p_remarks:
            document.getElementById("txtRemarks").value.trim()

    };

    console.log("Plant Payload:");
    console.log(JSON.stringify(plant, null, 2));

    const result = await addPlant(plant);

    if (result !== null) {

        showSuccess("Plant observation saved successfully.");

        clearPlantInventoryForm();

        await loadPlantInventory();

    }

}


/************************************************************
EDIT
************************************************************/

async function editPlant(id) {

    const data = await getPlantById(id);

    if (!data || data.length === 0) {

        showError("Plant observation not found.");

        return;

    }

    const item = data[0];

    console.log("Photo Path:", item.photo_path);

    currentPhotoPath = item.photo_path || "";

    console.log("Plant returned from API:");
    console.log(item);

    document.getElementById("plantId").value =
        item.plant_id;

    document.getElementById("txtObservationNo").value =
        item.observation_no ?? "";

    document.getElementById("cmbSpecies").value =
        item.species_id;

    document.getElementById("cmbBeat").value =
        item.beat_id;

    document.getElementById("cmbCondition").value =
        item.condition_id;

    document.getElementById("txtAgeClass").value =
        item.age_class ?? "";

    document.getElementById("dtObservedOn").value =
        item.observed_on;

    document.getElementById("txtObservedBy").value =
        item.observed_by ?? "";

    document.getElementById("txtLatitude").value =
        item.latitude;

    document.getElementById("txtLongitude").value =
        item.longitude;

    document.getElementById("txtAccuracy").value =
        item.gps_accuracy ?? "";

    document.getElementById("txtRemarks").value =
        item.remarks ?? "";

    if (marker && PlantInventorymap) {

        PlantInventorymap.removeLayer(marker);
    }

    marker = L.marker([item.latitude, item.longitude]).addTo(PlantInventorymap);

    PlantInventorymap.setView([item.latitude, item.longitude], 16);



    window.scrollTo({

        top: 0,

        behavior: "smooth"

    });

    highlightSelectedPlant(id);

}

/************************************************************
UPDATE
************************************************************/

async function updateCurrentPlant() {

    if (!validatePlantInventoryForm())
        return;

    let photoPath = currentPhotoPath;

    const photoFile =
        document.getElementById("filePhoto").files[0];

    if (photoFile) {

        const uploadResult =
            await uploadPhoto(photoFile);

        if (!uploadResult ||
            !uploadResult.success) {

            showError("Photo upload failed.");
            return;

        }

        photoPath = uploadResult.photo_path;

    }

    const plant = {

        p_plant_id:
            document.getElementById("plantId").value,

        p_species_id:
            parseInt(document.getElementById("cmbSpecies").value),

        p_beat_id:
            parseInt(document.getElementById("cmbBeat").value),

        p_observed_on:
            document.getElementById("dtObservedOn").value || null,

        p_observed_by:
            document.getElementById("txtObservedBy").value.trim(),

        p_condition_id:
            parseInt(document.getElementById("cmbCondition").value),

        p_age_class:
            document.getElementById("txtAgeClass").value.trim(),

        p_latitude:
            parseFloat(document.getElementById("txtLatitude").value),

        p_longitude:
            parseFloat(document.getElementById("txtLongitude").value),

        p_gps_accuracy:
            parseFloat(document.getElementById("txtAccuracy").value || 0),

        p_photo_path:
            photoPath,

        p_remarks:
            document.getElementById("txtRemarks").value.trim()

    };

    const result = await updatePlant(plant);

    if (result) {

        showSuccess("Plant updated successfully.");

        clearPlantInventoryForm();

        await loadPlantInventory();

    }

}
/************************************************************
DELETE
************************************************************/

async function deleteCurrentPlant() {

    const plantId =
        document.getElementById("plantId").value;

    if (!plantId) {

        showWarning("Please select a plant first.");

        return;

    }

    if (!confirm(
        "Are you sure you want to delete this plant observation?"
    )) {

        return;

    }

    const result = await deletePlant(plantId);

    if (result) {

        showSuccess("Plant deleted successfully.");

        clearPlantInventoryForm();

        await loadPlantInventory();

    }
    else {

        showError("Unable to delete plant.");

    }

}

function highlightSelectedPlant(plantId) {

    // remove previous highlight
    $("#tblPlants tbody tr").removeClass("selected-plant");

    // find the edit button that calls editPlant('<id>')
    $("#tblPlants tbody button").each(function () {

        const onclick = $(this).attr("onclick");

        if (onclick && onclick.includes(plantId)) {

            const row = $(this).closest("tr");

            row.addClass("selected-plant");

            row[0].scrollIntoView({

                behavior: "smooth",

                block: "center"

            });

        }

    });

}

