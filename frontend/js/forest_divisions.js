/******************************************************************************
GeoForest Enterprise
File : frontend/js/forest_divisions.js
******************************************************************************/

"use strict";

/******************************************************************************
 Configuration
******************************************************************************/

const DIVISION_API = {

    list: "/rpc/get_divisions",

    get: "/rpc/get_division",

    add: "/rpc/add_division",

    update: "/rpc/update_division",

    remove: "/rpc/delete_division"

};

let divisionModal = null;

let divisions = [];

/******************************************************************************
 Initialize
******************************************************************************/

document.addEventListener("DOMContentLoaded", () => {

    divisionModal =
        new bootstrap.Modal(
            document.getElementById("divisionModal")
        );

    registerEvents();

    loadDivisions();

});

/******************************************************************************
 Event Registration
******************************************************************************/

function registerEvents() {

    document
        .getElementById("btnAddDivision")
        .addEventListener("click", addDivision);

    document
        .getElementById("btnSaveDivision")
        .addEventListener("click", saveDivision);

}


/******************************************************************************
 Load Divisions
******************************************************************************/

/******************************************************************************
 Load Divisions
******************************************************************************/

async function loadDivisions() {

    try {

        const response = await fetch(DIVISION_API.list, {

            method: "POST",

            headers: {

                "Content-Type": "application/json"

            },

            body: "{}"

        });

        if (!response.ok)
            throw new Error("Unable to load divisions.");

        divisions = await response.json();

        renderGrid();

    }

    catch (error) {

        console.error(error);

        alert(error.message);

    }

}


/******************************************************************************
 Render Table
******************************************************************************/

function renderGrid() {

    const tbody =
        document.querySelector("#tblDivisions tbody");

    tbody.innerHTML = "";

    divisions.forEach(d => {

        const row = document.createElement("tr");

        row.innerHTML = `

            <td>${d.division_id}</td>

            <td>${d.division_name}</td>

            <td>${d.description ?? ""}</td>

            <td class="text-center">

                ${d.is_active

                ?

                '<span class="badge bg-success">Active</span>'

                :

                '<span class="badge bg-danger">Inactive</span>'
            }

            </td>

            <td>

                ${formatDate(d.created_on)}

            </td>

            <td class="text-center">

                <button
                    class="btn btn-sm btn-primary"

                    onclick="editDivision(${d.division_id})">

                    <i class="bi bi-pencil"></i>

                </button>

                <button
                    class="btn btn-sm btn-danger"

                    onclick="deleteDivision(${d.division_id})">

                    <i class="bi bi-trash"></i>

                </button>

            </td>

        `;

        tbody.appendChild(row);

    });

}


/******************************************************************************
 Format Date
******************************************************************************/

function formatDate(dateValue) {

    if (!dateValue)
        return "";

    return new Date(dateValue)
        .toLocaleDateString();

}


/******************************************************************************
 Add Division
******************************************************************************/

function addDivision() {

    document.getElementById("divisionModalTitle").innerText =
        "Add Forest Division";

    document.getElementById("divisionId").value = "";

    document.getElementById("divisionName").value = "";

    document.getElementById("divisionDescription").value = "";

    document.getElementById("divisionActive").checked = true;

    divisionModal.show();

}

/******************************************************************************
 Edit Division
******************************************************************************/

async function editDivision(id) {

    try {

        const response = await fetch(DIVISION_API.get, {

            method: "POST",

            headers: {
                "Content-Type": "application/json"
            },

            body: JSON.stringify({
                p_division_id: id
            })

        });

        if (!response.ok)
            throw new Error("Unable to load division.");

        const division = await response.json();

        document.getElementById("divisionModalTitle").innerText =
            "Edit Forest Division";

        document.getElementById("divisionId").value =
            division.division_id;

        document.getElementById("divisionName").value =
            division.division_name;

        document.getElementById("divisionDescription").value =
            division.description ?? "";

        document.getElementById("divisionActive").checked =
            division.is_active;

        divisionModal.show();

    }

    catch (error) {

        console.error(error);

        showError(error.message);

    }

}

/******************************************************************************
 Save Division
******************************************************************************/

async function saveDivision() {

    const id =
        document.getElementById("divisionId").value;

    const name =
        document.getElementById("divisionName").value.trim();

    const description =
        document.getElementById("divisionDescription").value.trim();

    const active =
        document.getElementById("divisionActive").checked;

    if (name === "") {

        showError("Division name is required.");

        return;

    }

    const url =
        id === ""
            ? DIVISION_API.add
            : DIVISION_API.update;

    const payload =
        id === ""
            ? {
                p_division_name: name,
                p_description: description
            }
            : {
                p_division_id: Number(id),
                p_division_name: name,
                p_description: description,
                p_is_active: active
            };

    try {

        const response = await fetch(url, {

            method: "POST",

            headers: {
                "Content-Type": "application/json"
            },

            body: JSON.stringify(payload)

        });

        if (!response.ok)
            throw new Error("Unable to save division.");

        divisionModal.hide();

        await loadDivisions();

        showSuccess("Division saved successfully.");

    }

    catch (error) {

        console.error(error);

        showError(error.message);

    }

}

/******************************************************************************
 Delete Division
******************************************************************************/

async function deleteDivision(id) {

    if (!confirm("Delete this Forest Division?"))
        return;

    try {

        const response = await fetch(DIVISION_API.remove, {

            method: "POST",

            headers: {
                "Content-Type": "application/json"
            },

            body: JSON.stringify({

                p_division_id: id

            })

        });

        if (!response.ok)
            throw new Error("Unable to delete division.");

        await loadDivisions();

        showSuccess("Division deleted.");

    }

    catch (error) {

        console.error(error);

        showError(error.message);

    }

}

/******************************************************************************
 Success
******************************************************************************/

function showSuccess(message) {

    alert(message);

}

/******************************************************************************
 Error
******************************************************************************/

function showError(message) {

    alert(message);

}
/******************************************************************************
 Refresh
******************************************************************************/

async function refreshDivisions() {

    await loadDivisions();

}



