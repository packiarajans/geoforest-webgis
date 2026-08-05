console.log("***** NOTECAM.JS LOADED *****");

/******************************************************************
 * GeoForest Enterprise
 * NoteCam OCR Engine
 ******************************************************************/

async function readNoteCamPhoto(file) {

    console.log("================================");
    console.log("NoteCam OCR Started");
    console.log(file.name);
    console.log("================================");

    try {

        const result = await Tesseract.recognize(
            file,
            "eng"
        );

        console.log("========== OCR RESULT ==========");
        console.log(result.data.text);
        console.log("===============================");

        return parseNoteCam(result.data.text);

    }
    catch (error) {

        console.error("OCR ERROR:", error);

        return null;

    }

}


function parseNoteCam(text) {

    console.log("============== OCR TEXT ==============");
    console.log(text);
    console.log("======================================");

    const gps = {

        latitude: null,
        longitude: null,
        elevation: null,
        accuracy: null,
        datetime: null,
        note: null

    };

    let m;

    m = text.match(/Latitude\s*:\s*([0-9.-]+)/i);
    if (m)
        gps.latitude = parseFloat(m[1]);

    m = text.match(/Longitude\s*:\s*([0-9.-]+)/i);
    if (m)
        gps.longitude = parseFloat(m[1]);

    m = text.match(/Elevation\s*:\s*([0-9.]+)/i);
    if (m)
        gps.elevation = parseFloat(m[1]);

    m = text.match(/Accuracy\s*:\s*([0-9.]+)/i);
    if (m)
        gps.accuracy = parseFloat(m[1]);

    m = text.match(/Time\s*:\s*([^\n\r]+)/i);
    if (m)
        gps.datetime = m[1].trim();

    m = text.match(/Note\s*:\s*([^\n\r]+)/i);
    if (m)
        gps.note = m[1].trim();

    console.log("GPS Extracted");
    console.log(gps);

    return gps;

}