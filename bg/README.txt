GeoForest login backgrounds
===========================
Drop your own JPGs in this folder, then list them in manifest.json.
The login screen picks them up on next page load - no rebuild needed.

manifest.json example:

[
  { "file": "tiger.jpg",   "label": "Tiger, Bhavanisagar range" },
  { "file": "elephant.jpg","label": "Elephant herd, Thalamalai" },
  { "file": "leopard.jpg", "label": "Leopard, Hasanur" },
  { "file": "deer.jpg",    "label": "Spotted deer, Germalam" }
]

"label" may be left as "" for no caption.
Recommended: landscape, at least 1920x1080, under about 400 KB each so the
login screen stays quick over a departmental link.

Delete or rename manifest.json to fall back to the bundled textures
(01_forest / 02_teal / 03_moss / 04_slate).
