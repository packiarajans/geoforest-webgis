<?php

header("Content-Type: application/json");

$response = [];

try {

    if (!isset($_FILES["photo"])) {

        throw new Exception("No file uploaded.");

    }

    $folder = "../media/images/";

    if (!is_dir($folder)) {

        mkdir($folder, 0777, true);

    }

    $extension = strtolower(
        pathinfo(
            $_FILES["photo"]["name"],
            PATHINFO_EXTENSION
        )
    );

    $allowed = ["jpg", "jpeg", "png", "webp"];

    if (!in_array($extension, $allowed)) {

        throw new Exception("Invalid image type.");

    }

    $filename =
        uniqid("PLANT_", true) .
        "." .
        $extension;

    $destination =
        $folder .
        $filename;

    move_uploaded_file(

        $_FILES["photo"]["tmp_name"],

        $destination

    );

    $response["success"] = true;

    $response["photo_path"] =
        "media/images/" . $filename;

}
catch (Exception $e) {

    $response["success"] = false;

    $response["message"] =
        $e->getMessage();

}

echo json_encode($response);

?>