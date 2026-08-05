/******************************************************************************
GeoForest Enterprise
File : frontend/js/plant_species.js
******************************************************************************/

"use strict";

let speciesTable = null;

/************************************************************
INITIALIZE
************************************************************/

async function initializePlantSpecies() {

    console.log("Initializing Plant Species");

    registerPlantSpeciesEvents();

    await loadCategories();

    await loadIUCNStatus();


    await loadPlantSpecies();

}
/************************************************************
EVENTS
************************************************************/

function registerPlantSpeciesEvents() {

    document
        .getElementById("btnSave")
        .addEventListener("click", saveSpecies);

    document
        .getElementById("btnUpdate")
        .addEventListener("click", updateCurrentSpecies);

    document
        .getElementById("btnDelete")
        .addEventListener("click", deleteCurrentSpecies);

    document
        .getElementById("btnClear")
        .addEventListener("click", clearPlantSpeciesForm);

    document
        .getElementById("txtSearch")
        .addEventListener("keyup", function () {

            if (speciesTable) {

                speciesTable.search(this.value).draw();

            }

        });

}

/************************************************************
LOAD SPECIES
************************************************************/

async function loadPlantSpecies() {

    const data = await getSpecies();

    if (speciesTable !== null) {

        speciesTable.destroy();

    }

    $("#tblSpecies tbody").empty();

    data.forEach(item => {

        $("#tblSpecies tbody").append(`

<tr>

<td>${item.species_id}</td>

<td>${item.scientific_name}</td>

<td>${item.common_name ?? ""}</td>

<td>${item.family ?? ""}</td>

<td>${item.origin_type ?? ""}</td>

<td>${item.category ?? ""}</td>

<td>${item.iucn_status ?? ""}</td>

<td>${item.is_active ? "Yes" : "No"}</td>

<td>

<button
class="btn btn-sm btn-success"
onclick="editSpecies(${item.species_id})">

<i class="bi bi-pencil-square"></i>

</button>

</td>

</tr>

`);

    });

    speciesTable = new DataTable("#tblSpecies", TABLE_OPTIONS);

}

/************************************************************
LOAD CATEGORIES
************************************************************/

async function loadCategories() {

    const data = await getCategories();

    const cmb = document.getElementById("cmbCategory");

    cmb.innerHTML = "";

    data.forEach(item => {

        cmb.innerHTML +=

            `<option value="${item.category_id}">

            ${item.category_name}

        </option>`;

    });

}

/************************************************************
LOAD IUCN
************************************************************/

async function loadIUCNStatus() {

    const data = await getIUCNStatus();

    const cmb = document.getElementById("cmbIUCN");

    cmb.innerHTML = "";

    data.forEach(item => {

        cmb.innerHTML +=

            `<option value="${item.iucn_status_id}">

            ${item.status_name}

        </option>`;

    });

}



/************************************************************
SAVE
************************************************************/

async function saveSpecies() {

    if (!validatePlantSpeciesForm())
        return;

    const species = {

        p_scientific_name:
            document.getElementById("txtScientificName").value,

        p_common_name:
            document.getElementById("txtCommonName").value,

        p_family:
            document.getElementById("txtFamily").value,

        p_origin_type:
            document.getElementById("cmbOriginType").value,

        p_category_id:
            parseInt(document.getElementById("cmbCategory").value),

        p_iucn_status_id:
            parseInt(document.getElementById("cmbIUCN").value)

    };

    const result = await addSpecies(species);

    if (result !== null) {

        showSuccess("Species added successfully.");

        clearPlantSpeciesForm();

        await loadPlantSpecies();

    }

}

/************************************************************
EDIT
************************************************************/

async function editSpecies(id) {

    const data = await getSpeciesById(id);

    if (!data || data.length === 0) {

        showError("Species not found.");

        return;

    }

    const item = data[0];

    document.getElementById("speciesId").value =
        item.species_id;

    document.getElementById("txtScientificName").value =
        item.scientific_name ?? "";

    document.getElementById("txtCommonName").value =
        item.common_name ?? "";

    document.getElementById("txtFamily").value =
        item.family ?? "";

    document.getElementById("cmbOriginType").value =
        item.origin_type ?? "";

    document.getElementById("cmbCategory").value =
        item.category_id;

    document.getElementById("cmbIUCN").value =
        item.iucn_status_id;

    document.getElementById("chkActive").checked =
        item.is_active;

    window.scrollTo({

        top: 0,

        behavior: "smooth"

    });

}
/************************************************************
UPDATE
************************************************************/

async function updateCurrentSpecies() {

    const id = parseInt(document.getElementById("speciesId").value);

    if (!id) {

        showWarning("Please select a species to update.");

        return;

    }

    if (!validatePlantSpeciesForm())
        return;

    const species = {

        p_species_id: id,

        p_scientific_name:
            document.getElementById("txtScientificName").value.trim(),

        p_common_name:
            document.getElementById("txtCommonName").value.trim(),

        p_family:
            document.getElementById("txtFamily").value.trim(),

        p_origin_type:
            document.getElementById("cmbOriginType").value,

        p_category_id:
            parseInt(document.getElementById("cmbCategory").value),

        p_iucn_status_id:
            parseInt(document.getElementById("cmbIUCN").value),

    };

    const result = await updateSpecies(species);

    if (result !== null) {

        showSuccess("Species updated successfully.");

        clearPlantSpeciesForm();

        await loadPlantSpecies();

    }

}
/************************************************************
DELETE
************************************************************/

async function deleteCurrentSpecies() {

    const id = parseInt(document.getElementById("speciesId").value);

    if (!id) {

        showWarning("Please select a species.");

        return;

    }

    const answer = await Swal.fire({

        title: "Delete Species?",

        text: "This action cannot be undone.",

        icon: "warning",

        showCancelButton: true,

        confirmButtonColor: "#d33",

        cancelButtonColor: "#3085d6",

        confirmButtonText: "Delete"

    });

    if (!answer.isConfirmed)
        return;

    const result = await deleteSpecies(id);

    if (result !== null) {

        showSuccess("Species deleted successfully.");

        clearPlantSpeciesForm();

        await loadPlantSpecies();

    }

}

/************************************************************
CLEAR
************************************************************/

function clearPlantSpeciesForm() {

    document.getElementById("speciesId").value = "";

    document.getElementById("txtScientificName").value = "";

    document.getElementById("txtCommonName").value = "";

    document.getElementById("txtFamily").value = "";

    document.getElementById("cmbOriginType").selectedIndex = 0;

    document.getElementById("cmbCategory").selectedIndex = 0;

    document.getElementById("cmbIUCN").selectedIndex = 0;

    document.getElementById("chkActive").checked = true;

    document.getElementById("txtScientificName").focus();

}

/************************************************************
VALIDATION
************************************************************/

function validatePlantSpeciesForm() {

    if (document.getElementById("txtScientificName").value.trim() === "") {

        showWarning("Scientific Name is required.");

        document.getElementById("txtScientificName").focus();

        return false;

    }

    return true;

}
