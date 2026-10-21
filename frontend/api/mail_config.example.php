<?php
/* ============================================================================
   SMTP settings for password-reset email.
   Fill these in, then password reset links are emailed automatically.
   While 'enabled' is false the system falls back to logging a request for the
   administrator, exactly as it does today.

   GMAIL
     host "smtp.gmail.com", port 587, secure "tls"
     user = the full Gmail address
     pass = a 16-character App Password (NOT the account password).
            Enable 2-Step Verification, then create one at:
            https://myaccount.google.com/apppasswords

   OFFICE 365
     host "smtp.office365.com", port 587, secure "tls"
     user = full mailbox address, pass = its password
     SMTP AUTH must be enabled for that mailbox by your M365 admin.

   DEPARTMENTAL / NIC RELAY
     host = your relay, port 25 or 587
     If the relay accepts this server without credentials, leave user/pass
     empty and set secure to "" (or "tls" if it requires STARTTLS).
   ============================================================================ */

return [
    // set to true once the details below are filled in
    "enabled"   => true,

    "host"      => "smtp.gmail.com",
    "port"      => 587,
    "secure"    => "tls",        // "tls" (STARTTLS), "ssl", or "" for none
    "user"      => "p15rajan@gmail.com",   // the Gmail address
    "pass"      => "PUT-YOUR-16-CHAR-APP-PASSWORD-HERE",           // <-- PASTE THE 16-CHARACTER APP PASSWORD HERE

    "from_addr" => "p15rajan@gmail.com",
    "from_name" => "GeoForest Enterprise — Sathyamangalam Tiger Reserve",

    // Public address of the web app, used to build the reset link.
    // Leave blank to derive it from the incoming request.
    "app_url"   => "",           // e.g. http://192.168.31.6/geoforest_webgis

    "cafile"    => "C:/xampp/php/extras/ssl/cacert-windows.pem",

    "timeout"   => 20,
    "debug"     => true         // true writes an SMTP transcript to mail_debug.log
];
