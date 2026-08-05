<?php
/* ============================================================================
   GeoForest Enterprise — Media Library
   Server-backed store for field videos and satellite image snapshots, kept
   separate from the change-detection tool in the map viewer.

     GET  ?action=list                 -> { ok, videos:[...], satellite:[...] }
     POST action=upload  section file  -> { ok, item }
     POST action=delete  section name  -> { ok }

   Files live under  frontend/media/library/{videos,satellite}/  which is inside
   the folder the daily backup already archives, so uploads are captured with no
   extra configuration.
   ============================================================================ */

header("Content-Type: application/json");
header("Access-Control-Allow-Origin: *");
header("Access-Control-Allow-Headers: Content-Type");
if ($_SERVER["REQUEST_METHOD"] === "OPTIONS") { exit; }

/* section -> [sub-folder, allowed extensions] */
$SECTIONS = [
    "videos"    => ["videos",    ["mp4", "webm", "ogg", "ogv", "mov", "m4v"]],
    "satellite" => ["satellite", ["jpg", "jpeg", "png", "webp", "tif", "tiff"]],
];

$ROOT     = __DIR__ . "/../media/library";        // filesystem
$URL_BASE = "media/library";                      // relative to MEDIA_BASE_URL

function out($a) { echo json_encode($a); exit; }
function fail($m) { http_response_code(400); out(["ok" => false, "error" => $m]); }

/* keep a filename to its own basename — never let it escape the folder */
function safeName($name) {
    $name = basename(str_replace("\\", "/", $name));
    $name = preg_replace('/[^A-Za-z0-9._-]/', "_", $name);
    return $name === "" ? "file" : $name;
}

function listSection($dir, $urlBase, $sub) {
    $path = "$dir/$sub";
    if (!is_dir($path)) return [];
    $items = [];
    foreach (scandir($path) as $f) {
        if ($f === "." || $f === "..") continue;
        $full = "$path/$f";
        if (!is_file($full)) continue;
        $items[] = [
            "name"     => $f,
            "path"     => "$urlBase/$sub/" . rawurlencode($f),
            "ext"      => strtolower(pathinfo($f, PATHINFO_EXTENSION)),
            "size"     => filesize($full),
            "uploaded" => date("c", filemtime($full)),
        ];
    }
    // newest first
    usort($items, fn($a, $b) => strcmp($b["uploaded"], $a["uploaded"]));
    return $items;
}

$action = $_GET["action"] ?? ($_POST["action"] ?? "list");

if ($action === "list") {
    out([
        "ok"        => true,
        "videos"    => listSection($ROOT, $URL_BASE, "videos"),
        "satellite" => listSection($ROOT, $URL_BASE, "satellite"),
    ]);
}

if ($action === "upload") {
    $section = $_POST["section"] ?? "";
    if (!isset($SECTIONS[$section])) fail("Unknown section.");
    [$sub, $allowed] = $SECTIONS[$section];

    if (!isset($_FILES["file"]) || $_FILES["file"]["error"] !== UPLOAD_ERR_OK) {
        // the most common cause is the file exceeding PHP's upload_max_filesize
        $code = $_FILES["file"]["error"] ?? -1;
        if ($code === UPLOAD_ERR_INI_SIZE || $code === UPLOAD_ERR_FORM_SIZE)
            fail("File is larger than the server upload limit. Raise upload_max_filesize / post_max_size in php.ini.");
        fail("No file received (upload error $code).");
    }

    $orig = $_FILES["file"]["name"];
    $ext  = strtolower(pathinfo($orig, PATHINFO_EXTENSION));
    if (!in_array($ext, $allowed, true))
        fail("Unsupported file type for $section. Allowed: " . implode(", ", $allowed));

    $dir = "$ROOT/$sub";
    if (!is_dir($dir) && !mkdir($dir, 0775, true)) fail("Could not create the storage folder.");

    // <original-base>__<uniq>.<ext> keeps the readable name and avoids clashes
    $base = safeName(pathinfo($orig, PATHINFO_FILENAME));
    $fname = $base . "__" . substr(bin2hex(random_bytes(4)), 0, 8) . "." . $ext;
    $dest  = "$dir/$fname";

    if (!move_uploaded_file($_FILES["file"]["tmp_name"], $dest))
        fail("Could not save the uploaded file.");

    out([
        "ok"   => true,
        "item" => [
            "name"     => $fname,
            "path"     => "$URL_BASE/$sub/" . rawurlencode($fname),
            "ext"      => $ext,
            "size"     => filesize($dest),
            "uploaded" => date("c", filemtime($dest)),
        ],
    ]);
}

if ($action === "delete") {
    $section = $_POST["section"] ?? "";
    if (!isset($SECTIONS[$section])) fail("Unknown section.");
    [$sub] = $SECTIONS[$section];
    $name = safeName($_POST["name"] ?? "");
    $full = "$ROOT/$sub/$name";
    if (!is_file($full)) fail("File not found.");
    if (!unlink($full)) fail("Could not delete the file.");
    out(["ok" => true]);
}

fail("Unknown action.");
