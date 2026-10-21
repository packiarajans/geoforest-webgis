-- ===========================================================================
-- GeoForest Enterprise — export all PostgREST RPC / stored-function definitions
-- ---------------------------------------------------------------------------
-- Dumps the full CREATE OR REPLACE FUNCTION source for every function in the
-- 'public' and 'api' schemas (adjust the schema list below if PostgREST uses
-- a different exposed schema).
--
-- Run:
--   psql -h localhost -U <user> -d <db> -f export_rpc_functions.sql -o rpc_functions.sql
-- ===========================================================================

\pset format unaligned
\pset tuples_only on

SELECT pg_get_functiondef(p.oid) || E';\n'
FROM   pg_proc p
JOIN   pg_namespace n ON n.oid = p.pronamespace
WHERE  n.nspname IN ('public', 'api')   -- add your PostgREST schema if different
  AND  p.prokind = 'f'                  -- 'f' = normal functions (not aggregates/procedures)
ORDER  BY n.nspname, p.proname;
