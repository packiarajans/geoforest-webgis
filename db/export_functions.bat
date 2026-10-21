@echo off
REM ===========================================================================
REM  GeoForest Enterprise - export PostgreSQL RPC functions + schema
REM  Edit the settings below, then double-click this file.
REM ===========================================================================

REM ---- EDIT THESE ----------------------------------------------------------
set "PGBIN=C:\Program Files\PostgreSQL\18\bin"
set "PGHOST=localhost"
set "PGPORT=5432"
set "PGUSER=postgres"
set "PGDATABASE=geoforest_enterprise"
REM --------------------------------------------------------------------------

cd /d "%~dp0"

echo.
echo Exporting RPC function definitions from database "%PGDATABASE%" ...
"%PGBIN%\psql" -h %PGHOST% -p %PGPORT% -U %PGUSER% -d %PGDATABASE% ^
    -f "%~dp0export_rpc_functions.sql" -o "%~dp0rpc_functions.sql"

echo.
echo Dumping full schema (schema-only: tables, views, functions) ...
"%PGBIN%\pg_dump" -h %PGHOST% -p %PGPORT% -U %PGUSER% -d %PGDATABASE% ^
    --schema-only -n public -n api -f "%~dp0schema_public_api.sql"

echo.
echo Done.
echo   - rpc_functions.sql        (function bodies only)
echo   - schema_public_api.sql    (full schema-only dump)
echo Both written next to this script: %~dp0
echo.
pause
