/******************************************************************************
GeoForest Enterprise
File : frontend/js/api.js
******************************************************************************/

"use strict";

/************************************************************
GET
************************************************************/

async function apiGet(url) {

    showLoader();

    try {

        const response = await fetch(url);

        if (!response.ok)
            throw new Error(response.statusText);

        return await response.json();

    }

    catch (error) {

        showError(error.message);

        return [];

    }

    finally {

        hideLoader();

    }

}

/************************************************************
POST
************************************************************/

async function apiPost(url, data) {

    showLoader();

    try {

        console.log("POST URL:", url);
        console.log("POST BODY:", JSON.stringify(data));

        const response = await fetch(url, {

            method: "POST",

            headers: JSON_HEADERS,

            body: JSON.stringify(data)

        });

        console.log("HTTP Status:", response.status);

        const text = await response.text();

        console.log("Raw Response:", text);

        if (!response.ok) {

            throw new Error(text);

        }

        return JSON.parse(text);

    }
    catch (error) {

        console.error("API ERROR:", error);

        showError(error.message);

        return null;

    }
    finally {

        hideLoader();

    }

}
/************************************************************
PUT
************************************************************/

async function apiPut(url, data) {

    showLoader();

    try {

        const response = await fetch(url, {

            method: "POST",

            headers: JSON_HEADERS,

            body: JSON.stringify(data)

        });

        if (!response.ok)
            throw new Error(response.statusText);

        return await response.json();

    }

    catch (error) {

        showError(error.message);

        return null;

    }

    finally {

        hideLoader();

    }

}

/************************************************************
DELETE
************************************************************/

async function apiDelete(url, data) {

    showLoader();

    try {

        const response = await fetch(url, {

            method: "POST",

            headers: JSON_HEADERS,

            body: JSON.stringify(data)

        });

        if (!response.ok)
            throw new Error(response.statusText);

        return await response.json();

    }

    catch (error) {

        showError(error.message);

        return null;

    }

    finally {

        hideLoader();

    }

}

/************************************************************
SPECIES API
************************************************************/

async function getSpecies() {

    return await apiGet(API.getSpecies);

}

async function addSpecies(species) {

    return await apiPost(API.addSpecies, species);

}

async function updateSpecies(species) {

    return await apiPut(API.updateSpecies, species);

}

async function deleteSpecies(speciesId) {

    return await apiDelete(API.deleteSpecies, {

        p_species_id: speciesId

    });

}

async function getSpeciesById(id) {

    console.log("ID =", id);

    const body = {

        p_species_id: Number(id)

    };

    console.log("Request Body =", body);

    return await apiPost(API.getSpeciesById, body);

}

async function getCategories() {

    return await apiGet(API.getCategories);

}

async function getIUCNStatus() {

    return await apiGet(API.getIUCNStatus);

}

async function getPlantStatus() {

    return await apiGet(API.getPlantStatus);

}

/************************************************************
FOREST BEATS
************************************************************/

async function getBeats() {

    return await apiGet(API.getBeats);

}



async function getBeatLocation(beatId) {

    return await apiPost(

        API.getBeatLocation,

        {
            p_beat_id: beatId
        }

    );

}

/************************************************************
PLANT CONDITIONS
************************************************************/

async function getPlantConditions() {

    return await apiGet(API.getPlantConditions);

}

/************************************************************
PLANT INVENTORY
************************************************************/

async function getPlants() {

    return await apiGet(API.getPlants);

}

async function getPlantById(id) {

    return await apiPost(

        API.getPlantById,

        {
            p_plant_id: id
        }

    );

}

async function addPlant(plant) {

    return await apiPost(

        API.addPlant,

        plant

    );

}

async function updatePlant(plant) {

    return await apiPost(

        API.updatePlant,

        plant

    );

}

async function deletePlant(id) {

    return await apiPost(

        API.deletePlant,

        {
            p_plant_id: id
        }

    );

}

/************************************************************
NEARBY PLANTS
************************************************************/
async function getNearbyPlants(plantId, radius) {

    return await apiPost(

        API.getNearbyPlants,

        {
            p_plant_id: plantId,
            p_radius: radius
        }

    );

}
/************************************************************
UPLOAD PHOTO
************************************************************/

async function uploadPhoto(file) {

    const formData = new FormData();

    formData.append("photo", file);

    try {

        const response = await fetch(
            "/geoforest_enterprise/frontend/api/media_upload.php",
            {
                method: "POST",
                body: formData
            }
        );

        if (!response.ok) {

            throw new Error(
                "Upload failed. HTTP " + response.status
            );

        }

        const result = await response.json();

        console.log(result);

        return result;

    }
    catch (error) {

        console.error("Upload Error:", error);

        return null;

    }

}