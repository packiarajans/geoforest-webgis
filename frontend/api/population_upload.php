<?php
/* ============================================================================
   GeoForest Enterprise — Update Population
   Accepts census rows (parsed from the uploaded Excel/CSV in the browser),
   updates core.population by matching on vill_lgd, then recomputes the derived
   density column and the area-weighted per-unit table so the map and reports
   reflect the new figures immediately. Existing village geometry is untouched.

     POST application/json  { "rows": [ { "vill_lgd": "634769", "tot_p": 5100, ... }, ... ] }
   ============================================================================ */

header("Content-Type: application/json");
header("Access-Control-Allow-Origin: *");
header("Access-Control-Allow-Headers: Content-Type");
if ($_SERVER["REQUEST_METHOD"] === "OPTIONS") { exit; }

function out($a) { echo json_encode($a); exit; }
function fail($m) { http_response_code(400); out(["ok" => false, "error" => $m]); }

$DB = ["host"=>"localhost","port"=>"5432","dbname"=>"geoforest_enterprise",
       "user"=>"postgres","password"=>"postgres"];

$raw = file_get_contents("php://input");
$in  = json_decode($raw, true);
if (!is_array($in) || !isset($in["rows"]) || !is_array($in["rows"]))
    fail("Expected JSON { rows: [...] }.");
$rows = $in["rows"];
if (count($rows) === 0) fail("No rows in the upload.");
if (count($rows) > 100000) fail("Too many rows.");

if (!function_exists("pg_connect")) fail("PHP pgsql extension is not enabled on the server.");
$conn = @pg_connect("host={$DB['host']} port={$DB['port']} dbname={$DB['dbname']} "
                  . "user={$DB['user']} password={$DB['password']}");
if (!$conn) fail("Database connection failed.");

/* only these numeric census columns are updated; vill_lgd is the match key */
$FIELDS = ["no_hh","tot_p","tot_m","tot_f","p_lit","p_sc","p_st"];

$updated = 0; $unmatched = []; $bad = 0;
pg_query($conn, "BEGIN");
try {
    foreach ($rows as $r) {
        $key = isset($r["vill_lgd"]) ? preg_replace('/\D/', '', (string)$r["vill_lgd"]) : "";
        if ($key === "") { $bad++; continue; }

        $sets = []; $vals = []; $i = 1;
        foreach ($FIELDS as $f) {
            if (array_key_exists($f, $r) && $r[$f] !== null && $r[$f] !== "") {
                $sets[] = "$f = \$" . (++$i);          // $2, $3, ...
                $vals[] = (int)round((float)$r[$f]);
            }
        }
        if (!$sets) { continue; }                       // nothing to update for this row
        $sql = "UPDATE core.population SET " . implode(", ", $sets) . " WHERE vill_lgd = $1";
        $res = pg_query_params($conn, $sql, array_merge([$key], $vals));
        if ($res === false) throw new Exception(pg_last_error($conn));
        $n = pg_affected_rows($res);
        if ($n > 0) $updated += 1; else $unmatched[] = $key;
    }
    // recompute density + per-unit aggregates in the same transaction
    $rc = pg_query($conn, "SELECT core.recompute_population()");
    if ($rc === false) throw new Exception(pg_last_error($conn));
    pg_query($conn, "COMMIT");
} catch (Exception $e) {
    pg_query($conn, "ROLLBACK");
    fail("Update failed: " . $e->getMessage());
}

out([
    "ok"        => true,
    "received"  => count($rows),
    "updated"   => $updated,
    "skipped"   => count($unmatched) + $bad,
    "unmatched" => array_slice($unmatched, 0, 25),
    "message"   => "$updated village(s) updated; density and per-unit totals recomputed."
]);
