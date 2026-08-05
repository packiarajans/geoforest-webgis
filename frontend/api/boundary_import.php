<?php
/* ===========================================================================
   Boundary import endpoint  —  GeoForest Enterprise
   Two actions:
     action=inspect : upload a .zip of shapefiles, get back layers + fields
     action=import  : create a NEW study area from those shapefiles
   Existing study areas are never modified.
   Uses ogr2ogr + psql via exec(), so no PHP PostgreSQL driver is required.
   =========================================================================== */

header("Content-Type: application/json");
header("Access-Control-Allow-Origin: *");
header("Access-Control-Allow-Headers: Content-Type");
if ($_SERVER["REQUEST_METHOD"] === "OPTIONS") { exit; }

// ------------------------------------------------------------------ config
$OGR   = 'C:\Program Files\QGIS 3.44.10\bin\ogr2ogr.exe';
$OGRINFO = 'C:\Program Files\QGIS 3.44.10\bin\ogrinfo.exe';
/* PostgreSQL ships its own older proj.db. Without pinning PROJ_LIB to QGIS's
   copy, ogr2ogr picks the wrong one and every reprojection fails with
   "DATABASE.LAYOUT.VERSION.MINOR = 2 whereas a number >= 6 is expected". */
$PROJ_LIB = 'C:\Program Files\QGIS 3.44.10\share\proj';
putenv("PROJ_LIB=$PROJ_LIB");
putenv("PROJ_DATA=$PROJ_LIB");
$PSQL  = 'C:\Program Files\PostgreSQL\18\bin\psql.exe';
$DB    = ["host"=>"localhost","port"=>"5432","name"=>"geoforest_enterprise",
          "user"=>"postgres","pass"=>"postgres"];
$WORK  = sys_get_temp_dir() . DIRECTORY_SEPARATOR . "gf_boundary";

function fail($msg, $detail = null) {
    http_response_code(400);
    echo json_encode(["ok"=>false, "error"=>$msg, "detail"=>$detail]);
    exit;
}
function ok($payload) { echo json_encode(["ok"=>true] + $payload); exit; }

function runCmd($cmd) {
    $out = []; $rc = 0;
    exec($cmd . " 2>&1", $out, $rc);
    return ["rc"=>$rc, "out"=>implode("\n", $out)];
}

function psqlQuery($sql, $tuplesOnly = true) {
    global $PSQL, $DB;
    putenv("PGPASSWORD=" . $DB["pass"]);
    $tmp = tempnam(sys_get_temp_dir(), "sql");
    file_put_contents($tmp, $sql);
    $flag = $tuplesOnly ? "-tA" : "-A";
    $cmd = escapeshellarg($PSQL) . " -U {$DB['user']} -h {$DB['host']} -p {$DB['port']}"
         . " -d {$DB['name']} -v ON_ERROR_STOP=1 $flag -f " . escapeshellarg($tmp);
    $r = runCmd($cmd);
    @unlink($tmp);
    if ($r["rc"] !== 0) fail("Database error", $r["out"]);
    return trim($r["out"]);
}

/* SQL string literal escaping — single quotes doubled */
function q($s) { return "'" . str_replace("'", "''", $s) . "'"; }

/* identifiers from shapefile fields: letters, digits, underscore only */
function safeField($s) {
    if (!preg_match('/^[A-Za-z_][A-Za-z0-9_]{0,62}$/', $s)) fail("Invalid field name: $s");
    return strtolower($s);
}

function rrmdir($dir) {
    if (!is_dir($dir)) return;
    foreach (array_diff(scandir($dir), ['.','..']) as $f) {
        $p = "$dir/$f";
        is_dir($p) ? rrmdir($p) : @unlink($p);
    }
    @rmdir($dir);
}

// ------------------------------------------------------------------ router
$action = $_POST["action"] ?? $_GET["action"] ?? "";

/* =========================================================== ACTION: inspect
   Receives a zip, extracts it, lists every .shp with its fields and CRS. */
if ($action === "inspect") {

    if (!isset($_FILES["archive"])) fail("No file uploaded.");
    if ($_FILES["archive"]["error"] !== UPLOAD_ERR_OK)
        fail("Upload failed (code {$_FILES['archive']['error']}). Check file size limits.");

    $token = bin2hex(random_bytes(8));
    $dir   = "$WORK/$token";
    if (!mkdir($dir, 0777, true)) fail("Cannot create work directory.");

    $zip = new ZipArchive();
    if ($zip->open($_FILES["archive"]["tmp_name"]) !== true) fail("Not a valid .zip archive.");

    for ($i = 0; $i < $zip->numFiles; $i++) {
        $name = $zip->getNameIndex($i);
        $base = basename($name);                       // flatten, blocks zip-slip
        if ($base === "" || substr($name, -1) === "/") continue;
        $ext = strtolower(pathinfo($base, PATHINFO_EXTENSION));
        if (!in_array($ext, ["shp","shx","dbf","prj","cpg","sbn","sbx"])) continue;
        copy("zip://" . $_FILES["archive"]["tmp_name"] . "#" . $name, "$dir/$base");
    }
    $zip->close();

    $shps = glob("$dir/*.shp");
    if (!$shps) { rrmdir($dir); fail("No .shp file found inside the archive."); }

    $layers = [];
    foreach ($shps as $shp) {
        $r = runCmd(escapeshellarg($OGRINFO) . " -so -al " . escapeshellarg($shp));
        $fields = []; $count = null; $geom = null; $crs = null;
        foreach (explode("\n", $r["out"]) as $line) {
            if (preg_match('/^Feature Count:\s*(\d+)/', $line, $m))        $count = (int)$m[1];
            if (preg_match('/^Geometry:\s*(.+)$/', $line, $m))             $geom  = trim($m[1]);
            if ($crs === null && preg_match('/ID\["EPSG",(\d+)\]/', $line, $m)) $crs = "EPSG:".$m[1];
            if (preg_match('/^([A-Za-z_][A-Za-z0-9_]*):\s*(String|Integer|Real|Date)/', $line, $m))
                $fields[] = $m[1];
        }
        // has the shapefile got its sidecars?
        $miss = [];
        foreach (["shx","dbf","prj"] as $e)
            if (!file_exists(preg_replace('/\.shp$/i', ".$e", $shp))) $miss[] = ".$e";

        $layers[] = [
            "file"     => basename($shp),
            "features" => $count,
            "geometry" => $geom,
            "crs"      => $crs ?: "undeclared",
            "fields"   => $fields,
            "missing"  => $miss
        ];
    }
    ok(["token"=>$token, "layers"=>$layers]);
}

/* ============================================================ ACTION: import */
if ($action === "import") {

    $token = $_POST["token"] ?? "";
    if (!preg_match('/^[a-f0-9]{16}$/', $token)) fail("Invalid or missing token.");
    $dir = "$WORK/$token";
    if (!is_dir($dir)) fail("Upload expired. Please choose the file again.");

    $areaCode = strtoupper(trim($_POST["area_code"] ?? ""));
    $areaName = trim($_POST["area_name"] ?? "");
    $areaDesc = trim($_POST["description"] ?? "");
    if (!preg_match('/^[A-Z0-9_]{2,30}$/', $areaCode))
        fail("Area code must be 2-30 characters: letters, digits or underscore.");
    if ($areaName === "") fail("Area name is required.");

    $divFile = basename($_POST["division_file"] ?? "");
    $rngFile = basename($_POST["range_file"] ?? "");
    $beatFile= basename($_POST["beat_file"] ?? "");
    foreach ([$divFile,$rngFile,$beatFile] as $f)
        if (!$f || !file_exists("$dir/$f")) fail("Missing shapefile selection: $f");

    $divName = safeField($_POST["division_name_field"] ?? "");
    $rngName = safeField($_POST["range_name_field"] ?? "");
    $rngPar  = safeField($_POST["range_parent_field"] ?? "");
    $beatName= safeField($_POST["beat_name_field"] ?? "");
    $beatPar = safeField($_POST["beat_parent_field"] ?? "");

    // duplicate code?
    $n = psqlQuery("SELECT count(*) FROM core.study_areas WHERE area_code = " . q($areaCode) . ";");
    if ((int)$n > 0) fail("A study area with code '$areaCode' already exists.");

    // ---- create the area
    $areaId = (int) psqlQuery(
        "INSERT INTO core.study_areas (area_code, area_name, description, is_default)
         VALUES (" . q($areaCode) . ", " . q($areaName) . ", " . q($areaDesc) . ", false)
         RETURNING area_id;");
    if ($areaId <= 0) fail("Could not create study area.");

    // ---- stage the three shapefiles, reprojected to 4326
    putenv("PGPASSWORD=" . $DB["pass"]);
    $conn = "PG:host={$DB['host']} port={$DB['port']} dbname={$DB['name']} "
          . "user={$DB['user']} password={$DB['pass']}";
    $stage = ["division"=>$divFile, "range"=>$rngFile, "beat"=>$beatFile];
    foreach ($stage as $kind => $file) {
        $tbl = "staging.imp_$kind";
        psqlQuery("DROP TABLE IF EXISTS $tbl;");
        $cmd = escapeshellarg($OGR) . " -f \"PostgreSQL\" " . escapeshellarg($conn) . " "
             . escapeshellarg("$dir/$file")
             . " -nln $tbl -nlt PROMOTE_TO_MULTI -t_srs EPSG:4326"
             . " -lco GEOMETRY_NAME=geom -lco FID=gid -lco PRECISION=NO -overwrite";
        $r = runCmd($cmd);
        if ($r["rc"] !== 0) {
            psqlQuery("DELETE FROM core.study_areas WHERE area_id = $areaId;");
            fail("Could not load $kind shapefile.", $r["out"]);
        }
    }

    // ---- build the hierarchy
    $sql = "
    INSERT INTO core.forest_divisions (area_id, division_name, geom, is_active)
    SELECT $areaId, TRIM(s.$divName::text), ST_Multi(ST_MakeValid(s.geom)), true
    FROM staging.imp_division s WHERE s.$divName IS NOT NULL
    GROUP BY TRIM(s.$divName::text), s.geom;

    INSERT INTO core.forest_ranges (area_id, division_id, range_name, geom, is_active)
    SELECT $areaId, d.division_id, TRIM(s.$rngName::text), ST_Multi(ST_MakeValid(s.geom)), true
    FROM staging.imp_range s
    JOIN core.forest_divisions d ON d.area_id = $areaId
      AND UPPER(TRIM(d.division_name)) = UPPER(TRIM(s.$rngPar::text))
    WHERE s.$rngName IS NOT NULL;

    INSERT INTO core.forest_beats (area_id, range_id, beat_name, geom, is_active)
    SELECT $areaId, r.range_id, TRIM(s.$beatName::text), ST_Multi(ST_MakeValid(s.geom)), true
    FROM staging.imp_beat s
    JOIN core.forest_ranges r ON r.area_id = $areaId
      AND UPPER(TRIM(r.range_name)) = UPPER(TRIM(s.$beatPar::text))
    WHERE s.$beatName IS NOT NULL;
    ";
    psqlQuery($sql);

    // ---- what failed to match a parent?
    $orphanR = (int) psqlQuery("SELECT count(*) FROM staging.imp_range s
        WHERE NOT EXISTS (SELECT 1 FROM core.forest_divisions d WHERE d.area_id=$areaId
          AND UPPER(TRIM(d.division_name))=UPPER(TRIM(s.$rngPar::text)));");
    $orphanB = (int) psqlQuery("SELECT count(*) FROM staging.imp_beat s
        WHERE NOT EXISTS (SELECT 1 FROM core.forest_ranges r WHERE r.area_id=$areaId
          AND UPPER(TRIM(r.range_name))=UPPER(TRIM(s.$beatPar::text)));");

    // ---- attribution + summary
    psqlQuery("SELECT core.refresh_area_attribution($areaId);");
    $counts = psqlQuery("SELECT
        (SELECT count(*) FROM core.forest_divisions WHERE area_id=$areaId) || ',' ||
        (SELECT count(*) FROM core.forest_ranges    WHERE area_id=$areaId) || ',' ||
        (SELECT count(*) FROM core.forest_beats     WHERE area_id=$areaId) || ',' ||
        (SELECT count(*) FROM core.area_attribution WHERE area_id=$areaId);");
    [$nd,$nr,$nb,$na] = array_map('intval', explode(',', $counts));

    psqlQuery("DROP TABLE IF EXISTS staging.imp_division, staging.imp_range, staging.imp_beat;");
    rrmdir($dir);

    if ($nb === 0) {
        psqlQuery("DELETE FROM core.study_areas WHERE area_id = $areaId;");
        fail("No beats could be linked. Check the parent field mappings.",
             "Ranges unmatched: $orphanR, beats unmatched: $orphanB");
    }

    ok([
        "area_id"=>$areaId, "area_code"=>$areaCode, "area_name"=>$areaName,
        "divisions"=>$nd, "ranges"=>$nr, "beats"=>$nb, "attributed"=>$na,
        "unmatched_ranges"=>$orphanR, "unmatched_beats"=>$orphanB
    ]);
}

/* ============================================================ ACTION: delete */
if ($action === "delete") {
    $areaId = (int)($_POST["area_id"] ?? 0);
    if ($areaId <= 0) fail("Invalid area id.");
    $isDef = psqlQuery("SELECT is_default FROM core.study_areas WHERE area_id=$areaId;");
    if ($isDef === "t") fail("The default study area cannot be deleted.");
    psqlQuery("DELETE FROM core.study_areas WHERE area_id=$areaId;");
    ok(["deleted"=>$areaId]);
}

fail("Unknown action. Use inspect, import or delete.");
