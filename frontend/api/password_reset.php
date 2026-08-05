<?php
/* ============================================================================
   Password reset by email — GeoForest Enterprise

   POST action=request  { identifier }   issue a token and email the link
   POST action=validate { token }        check a link before showing the form
   POST action=complete { token, password }  set the new password

   The raw token never reaches the browser from this endpoint: it is generated
   in the database, emailed, and only comes back when the user clicks the link.
   The response to "request" is identical whether or not the account exists.
   ============================================================================ */

header("Content-Type: application/json");
header("Access-Control-Allow-Origin: *");
header("Access-Control-Allow-Headers: Content-Type");
if ($_SERVER["REQUEST_METHOD"] === "OPTIONS") { exit; }

$PSQL = 'C:\Program Files\PostgreSQL\18\bin\psql.exe';
$DB   = ["host"=>"localhost","port"=>"5432","name"=>"geoforest_enterprise",
         "user"=>"postgres","pass"=>"postgres"];
$CFG  = @include __DIR__ . "/mail_config.php";
if (!is_array($CFG)) $CFG = ["enabled"=>false];
/* Google shows App Passwords as "abcd efgh ijkl mnop". Strip whitespace so the
   value works whether it is pasted with or without the spaces. */
foreach (["user","pass","host","from_addr"] as $k)
    if (isset($CFG[$k])) $CFG[$k] = preg_replace('/\s+/', '', (string)$CFG[$k]);

function out($a) { echo json_encode($a); exit; }
function fail($m, $d = null) { http_response_code(400); out(["ok"=>false,"error"=>$m,"detail"=>$d]); }

function psql($sql) {
    global $PSQL, $DB;
    putenv("PGPASSWORD=" . $DB["pass"]);
    $tmp = tempnam(sys_get_temp_dir(), "pr");
    file_put_contents($tmp, $sql);
    $cmd = escapeshellarg($PSQL) . " -U {$DB['user']} -h {$DB['host']} -p {$DB['port']}"
         . " -d {$DB['name']} -v ON_ERROR_STOP=1 -tA -f " . escapeshellarg($tmp) . " 2>&1";
    exec($cmd, $o, $rc);
    @unlink($tmp);
    $txt = trim(implode("\n", $o));
    if ($rc !== 0) {
        // surface the RAISE EXCEPTION message, not the psql noise
        if (preg_match('/ERROR:\s*(.+)/', $txt, $m)) fail(trim($m[1]));
        fail("Database error", $txt);
    }
    return $txt;
}
function q($s) { return "'" . str_replace("'", "''", $s) . "'"; }

/* ------------------------------------------------------- minimal SMTP client
   Dependency free: fsockopen + STARTTLS + AUTH LOGIN. Enough for Gmail,
   Office 365 and a plain departmental relay. */
function smtpSend($cfg, $toAddr, $toName, $subject, $html, $text) {
    $log = [];
    /* stream_socket_client rather than fsockopen: fsockopen cannot carry a
       context, so TLS has no peer_name to verify the certificate against and
       verification fails even with a valid CA bundle. Verification stays ON —
       these are live credentials and must not travel over an unverified link. */
    $ca = $cfg["cafile"] ?? "";
    if ($ca === "") {
        foreach ([ini_get("openssl.cafile"), ini_get("curl.cainfo"),
                  "C:/xampp/apache/bin/curl-ca-bundle.crt"] as $cand)
            if ($cand && is_readable($cand)) { $ca = $cand; break; }
    }
    $ssl = ["peer_name" => $cfg["host"], "verify_peer" => true,
            "verify_peer_name" => true, "SNI_enabled" => true];
    if ($ca) $ssl["cafile"] = $ca;
    $ctx = stream_context_create(["ssl" => $ssl]);

    $scheme  = ($cfg["secure"] ?? "") === "ssl" ? "ssl://" : "tcp://";
    $timeout = (int)($cfg["timeout"] ?? 20);
    $fp = @stream_socket_client($scheme . $cfg["host"] . ":" . (int)$cfg["port"],
            $en, $es, $timeout, STREAM_CLIENT_CONNECT, $ctx);
    if (!$fp) return [false, "Cannot reach {$cfg['host']}:{$cfg['port']} — $es"];
    stream_set_timeout($fp, $timeout);
    $log[] = "CA bundle: " . ($ca ?: "(none found)");

    $read = function () use ($fp, &$log) {
        $data = "";
        while ($line = fgets($fp, 1024)) {
            $data .= $line; $log[] = "S: " . rtrim($line);
            if (isset($line[3]) && $line[3] === " ") break;
        }
        return $data;
    };
    $say = function ($cmd, $hide = false) use ($fp, &$log, $read) {
        fwrite($fp, $cmd . "\r\n");
        $log[] = "C: " . ($hide ? "***" : $cmd);
        return $read();
    };
    $code = fn($r) => (int)substr(trim($r), 0, 3);

    $r = $read();
    if ($code($r) !== 220) { fclose($fp); return [false, "Unexpected greeting: " . trim($r)]; }

    $ehlo = $say("EHLO geoforest.local");
    if ($code($ehlo) !== 250) { fclose($fp); return [false, "EHLO refused: " . trim($ehlo)]; }

    if (($cfg["secure"] ?? "") === "tls") {
        $r = $say("STARTTLS");
        if ($code($r) !== 220) { fclose($fp); return [false, "STARTTLS refused: " . trim($r)]; }
        $err = "";
        set_error_handler(function ($n, $m) use (&$err) { $err = $m; return true; });
        $up = stream_socket_enable_crypto($fp, true, STREAM_CRYPTO_METHOD_TLS_CLIENT);
        restore_error_handler();
        if (!$up) {
            fclose($fp);
            $hint = (stripos($err, "certificate verify failed") !== false)
                ? " — the CA bundle may be missing or out of date (checked: " . ($ca ?: "none") . ")"
                : "";
            return [false, "TLS negotiation failed" . $hint . ($err ? " [{$err}]" : "")];
        }
        $ehlo = $say("EHLO geoforest.local");
    }

    if (!empty($cfg["user"])) {
        $r = $say("AUTH LOGIN");
        if ($code($r) !== 334) { fclose($fp); return [false, "AUTH not accepted: " . trim($r)]; }
        $r = $say(base64_encode($cfg["user"]), true);
        if ($code($r) !== 334) { fclose($fp); return [false, "Username rejected"]; }
        $r = $say(base64_encode($cfg["pass"]), true);
        if ($code($r) !== 235) {
            fclose($fp);
            return [false, "Login failed — check the password. Gmail requires an App Password, not the account password."];
        }
    }

    $from = $cfg["from_addr"] ?: $cfg["user"];
    $r = $say("MAIL FROM:<{$from}>");
    if ($code($r) !== 250) { fclose($fp); return [false, "Sender rejected: " . trim($r)]; }
    $r = $say("RCPT TO:<{$toAddr}>");
    if ($code($r) !== 250 && $code($r) !== 251) { fclose($fp); return [false, "Recipient rejected: " . trim($r)]; }
    $r = $say("DATA");
    if ($code($r) !== 354) { fclose($fp); return [false, "DATA refused: " . trim($r)]; }

    $b = "=_gf_" . bin2hex(random_bytes(8));
    $enc = fn($s) => "=?UTF-8?B?" . base64_encode($s) . "?=";
    $headers = [
        "Date: " . date("r"),
        "From: " . $enc($cfg["from_name"] ?? "GeoForest") . " <{$from}>",
        "To: " . ($toName ? $enc($toName) . " <{$toAddr}>" : "<{$toAddr}>"),
        "Subject: " . $enc($subject),
        "MIME-Version: 1.0",
        "Content-Type: multipart/alternative; boundary=\"{$b}\"",
        "X-Mailer: GeoForest Enterprise"
    ];
    $body = implode("\r\n", $headers) . "\r\n\r\n"
        . "--{$b}\r\nContent-Type: text/plain; charset=UTF-8\r\n"
        . "Content-Transfer-Encoding: base64\r\n\r\n" . chunk_split(base64_encode($text)) . "\r\n"
        . "--{$b}\r\nContent-Type: text/html; charset=UTF-8\r\n"
        . "Content-Transfer-Encoding: base64\r\n\r\n" . chunk_split(base64_encode($html)) . "\r\n"
        . "--{$b}--\r\n.";

    fwrite($fp, $body . "\r\n");
    $r = $read();
    $ok = $code($r) === 250;
    $say("QUIT");
    fclose($fp);

    if (!empty($cfg["debug"])) @file_put_contents(__DIR__ . "/mail_debug.log",
        date("c") . "\n" . implode("\n", $log) . "\n\n", FILE_APPEND);

    return [$ok, $ok ? "sent" : "Server rejected the message: " . trim($r)];
}

function resetEmail($name, $link, $mins) {
    $safeName = htmlspecialchars($name ?: "there", ENT_QUOTES, "UTF-8");
    $html = <<<HTML
<!doctype html><html><body style="margin:0;padding:0;background:#f2f5f3;
 font-family:Segoe UI,Roboto,Helvetica,Arial,sans-serif;">
 <table width="100%" cellpadding="0" cellspacing="0"><tr><td align="center" style="padding:28px 12px;">
  <table width="520" cellpadding="0" cellspacing="0" style="max-width:520px;background:#fff;
    border-radius:14px;overflow:hidden;box-shadow:0 2px 14px rgba(0,0,0,.08);">
   <tr><td style="background:#1a4d2e;padding:20px 26px;color:#fff;font-size:17px;font-weight:600;">
     GeoForest Enterprise</td></tr>
   <tr><td style="padding:26px;color:#233;font-size:14.5px;line-height:1.6;">
     <p style="margin:0 0 14px;">Hello {$safeName},</p>
     <p style="margin:0 0 18px;">We received a request to reset your GeoForest password.
        Click the button below to choose a new one.</p>
     <p style="margin:0 0 22px;text-align:center;">
       <a href="{$link}" style="display:inline-block;background:#2e7d52;color:#fff;
          text-decoration:none;padding:12px 26px;border-radius:9px;font-weight:600;">
          Reset my password</a></p>
     <p style="margin:0 0 8px;color:#5c6b62;font-size:12.5px;">
        This link expires in {$mins} minutes and can be used once.</p>
     <p style="margin:0 0 16px;color:#5c6b62;font-size:12.5px;">
        If you did not request this, you can ignore this email — your password will not change.</p>
     <p style="margin:0;color:#8a968f;font-size:11.5px;word-break:break-all;">
        If the button does not work, paste this into your browser:<br>{$link}</p>
   </td></tr>
   <tr><td style="background:#f6f9f7;padding:14px 26px;color:#8a968f;font-size:11.5px;">
     Sathyamangalam Tiger Reserve · automated message, please do not reply</td></tr>
  </table></td></tr></table></body></html>
HTML;
    $text = "Hello {$name},\n\nReset your GeoForest password using this link:\n{$link}\n\n"
          . "The link expires in {$mins} minutes and can be used once.\n"
          . "If you did not request this, ignore this email.\n";
    return [$html, $text];
}

// ------------------------------------------------------------------- router
$action = $_POST["action"] ?? $_GET["action"] ?? "";

if ($action === "request") {
    $id = trim($_POST["identifier"] ?? "");
    if ($id === "") fail("Enter your username or registered email address.");

    $ip  = $_SERVER["REMOTE_ADDR"] ?? "";
    // cast the boolean explicitly: psql renders it as "true"/"false", not t/f
    $row = psql("SELECT (CASE WHEN found THEN '1' ELSE '0' END)||'|'||coalesce(email,'')
                     ||'|'||coalesce(full_name,'')||'|'||coalesce(raw_token,'')
                 FROM api.issue_reset_token(" . q($id) . ", " . q($ip) . ");");
    [$found, $email, $name, $token] = array_pad(explode("|", $row, 4), 4, "");

    $generic = ["ok"=>true, "status"=>"sent",
        "message"=>"If that account exists, a reset link has been sent to its registered email address."];

    if ($found !== "1" || $email === "" || $token === "") out($generic);

    if (empty($CFG["enabled"])) {
        // Email not configured: queue it for the administrator, but reply with the
        // SAME message as for an unknown account. A different response here would
        // let anyone test whether a username or address is registered.
        psql("SELECT api.request_password_reset(" . q($id) . ", 'Email delivery not configured');");
        out($generic);
    }

    $base = $CFG["app_url"] ?: ((isset($_SERVER["HTTPS"]) && $_SERVER["HTTPS"] !== "off" ? "https" : "http")
            . "://" . ($_SERVER["HTTP_HOST"] ?? "localhost") . "/geoforest_webgis");
    $link = rtrim($base, "/") . "/#/reset?token=" . urlencode($token);
    $mins = 30;

    [$html, $text] = resetEmail($name, $link, $mins);
    [$sent, $why]  = smtpSend($CFG, $email, $name, "Reset your GeoForest password", $html, $text);

    if (!$sent) {
        // same reasoning: fall back silently, do not reveal that the account exists
        psql("SELECT api.request_password_reset(" . q($id) . ", " . q("Email send failed: " . $why) . ");");
        @file_put_contents(__DIR__ . "/mail_debug.log",
            date("c") . "  send failed: {$why}\n", FILE_APPEND);
        out($generic);
    }
    out($generic);
}

if ($action === "validate") {
    $t = trim($_POST["token"] ?? $_GET["token"] ?? "");
    if ($t === "") fail("Missing token.");
    out(["ok"=>true, "result"=>json_decode(psql("SELECT api.validate_reset_token(" . q($t) . ");"), true)]);
}

if ($action === "complete") {
    $t = trim($_POST["token"] ?? "");
    $p = (string)($_POST["password"] ?? "");
    if ($t === "") fail("Missing token.");
    if (strlen(trim($p)) < 8) fail("Password must be at least 8 characters.");
    out(["ok"=>true, "result"=>json_decode(psql("SELECT api.complete_password_reset(" . q($t) . ", " . q($p) . ");"), true)]);
}

if ($action === "selftest") {
    out(["ok"=>true, "configured"=>!empty($CFG["enabled"]),
         "host"=>$CFG["host"] ?? "", "port"=>$CFG["port"] ?? "",
         "secure"=>$CFG["secure"] ?? "", "from"=>$CFG["from_addr"] ?? ""]);
}

fail("Unknown action. Use request, validate, complete or selftest.");
