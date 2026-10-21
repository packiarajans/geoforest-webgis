--
-- PostgreSQL database dump
--

\restrict Ygee91NnjdKD0VIvdRebnm0fgekd3tRsTQx0s3Pf9ROerk9ccIpNPlur8fEgfRf

-- Dumped from database version 18.4
-- Dumped by pg_dump version 18.4

SET statement_timeout = 0;
SET lock_timeout = 0;
SET idle_in_transaction_session_timeout = 0;
SET transaction_timeout = 0;
SET client_encoding = 'UTF8';
SET standard_conforming_strings = on;
SELECT pg_catalog.set_config('search_path', '', false);
SET check_function_bodies = false;
SET xmloption = content;
SET client_min_messages = warning;
SET row_security = off;

--
-- Name: api; Type: SCHEMA; Schema: -; Owner: postgres
--

CREATE SCHEMA api;


ALTER SCHEMA api OWNER TO postgres;

--
-- Name: SCHEMA api; Type: COMMENT; Schema: -; Owner: postgres
--

COMMENT ON SCHEMA api IS 'PostgREST RPC Functions';


--
-- Name: public; Type: SCHEMA; Schema: -; Owner: pg_database_owner
--

CREATE SCHEMA public;


ALTER SCHEMA public OWNER TO pg_database_owner;

--
-- Name: SCHEMA public; Type: COMMENT; Schema: -; Owner: pg_database_owner
--

COMMENT ON SCHEMA public IS 'standard public schema';


--
-- Name: add_beat(integer, character varying, text); Type: FUNCTION; Schema: api; Owner: postgres
--

CREATE FUNCTION api.add_beat(p_range_id integer, p_beat_name character varying, p_description text) RETURNS integer
    LANGUAGE plpgsql
    AS $$

DECLARE

    v_beat_id INTEGER;

BEGIN

INSERT INTO core.forest_beats
(
    range_id,
    beat_name,
    description
)

VALUES
(
    p_range_id,
    p_beat_name,
    p_description
)

RETURNING beat_id
INTO v_beat_id;

RETURN v_beat_id;

END;

$$;


ALTER FUNCTION api.add_beat(p_range_id integer, p_beat_name character varying, p_description text) OWNER TO postgres;

--
-- Name: add_division(character varying, text); Type: FUNCTION; Schema: api; Owner: postgres
--

CREATE FUNCTION api.add_division(p_division_name character varying, p_description text) RETURNS integer
    LANGUAGE plpgsql
    AS $$

DECLARE

    v_division_id INTEGER;

BEGIN

    INSERT INTO core.forest_divisions
    (
        division_name,
        description
    )

    VALUES
    (
        p_division_name,
        p_description
    )

    RETURNING division_id

    INTO v_division_id;

    RETURN v_division_id;

END;

$$;


ALTER FUNCTION api.add_division(p_division_name character varying, p_description text) OWNER TO postgres;

--
-- Name: add_plant(integer, integer, date, character varying, smallint, character varying, double precision, double precision, double precision, character varying, text); Type: FUNCTION; Schema: api; Owner: postgres
--

CREATE FUNCTION api.add_plant(p_species_id integer, p_beat_id integer, p_observed_on date, p_observed_by character varying, p_condition_id smallint, p_age_class character varying, p_latitude double precision DEFAULT NULL::double precision, p_longitude double precision DEFAULT NULL::double precision, p_gps_accuracy double precision DEFAULT NULL::double precision, p_photo_path character varying DEFAULT NULL::character varying, p_remarks text DEFAULT NULL::text) RETURNS uuid
    LANGUAGE plpgsql
    AS $$

DECLARE

    v_geom      geometry(Point,4326);

    v_lat       DOUBLE PRECISION;

    v_lon       DOUBLE PRECISION;

    v_plant_id  UUID;

BEGIN

    ----------------------------------------------------------------
    -- Use GPS from Photo if available
    ----------------------------------------------------------------

    IF p_latitude IS NOT NULL
    AND p_longitude IS NOT NULL THEN

        v_lat := p_latitude;

        v_lon := p_longitude;

        v_geom :=
            ST_SetSRID(
                ST_MakePoint(v_lon, v_lat),
                4326
            );

    ELSE

        ------------------------------------------------------------
        -- Otherwise use Beat centre
        ------------------------------------------------------------

        SELECT
            ST_PointOnSurface(geom)
        INTO
            v_geom
        FROM
            core.forest_beats
        WHERE
            beat_id = p_beat_id;

        IF v_geom IS NULL THEN

            RAISE EXCEPTION
                'Beat geometry not found for Beat ID %',
                p_beat_id;

        END IF;

        v_lat := ST_Y(v_geom);

        v_lon := ST_X(v_geom);

    END IF;

    ------------------------------------------------------------
    -- Insert Observation
    ------------------------------------------------------------

    INSERT INTO core.plants
    (

        species_id,

        beat_id,

        observed_on,

        observed_by,

        condition_id,

        age_class,

        latitude,

        longitude,

        gps_accuracy,

        photo_path,

        remarks,

        geom

    )

    VALUES
    (

        p_species_id,

        p_beat_id,

        NULLIF(p_observed_on,NULL),

        NULLIF(TRIM(p_observed_by),''),

        p_condition_id,

        NULLIF(TRIM(p_age_class),''),

        v_lat,

        v_lon,

        p_gps_accuracy,

        NULLIF(TRIM(p_photo_path),''),

        NULLIF(TRIM(p_remarks),''),

        v_geom

    )

    RETURNING plant_id

    INTO v_plant_id;

    RETURN v_plant_id;

END;

$$;


ALTER FUNCTION api.add_plant(p_species_id integer, p_beat_id integer, p_observed_on date, p_observed_by character varying, p_condition_id smallint, p_age_class character varying, p_latitude double precision, p_longitude double precision, p_gps_accuracy double precision, p_photo_path character varying, p_remarks text) OWNER TO postgres;

--
-- Name: add_range(integer, character varying, text); Type: FUNCTION; Schema: api; Owner: postgres
--

CREATE FUNCTION api.add_range(p_division_id integer, p_range_name character varying, p_description text) RETURNS integer
    LANGUAGE plpgsql
    AS $$

DECLARE

v_range_id INTEGER;

BEGIN

INSERT INTO core.forest_ranges
(
division_id,
range_name,
description
)

VALUES
(
p_division_id,
p_range_name,
p_description
)

RETURNING range_id
INTO v_range_id;

RETURN v_range_id;

END;

$$;


ALTER FUNCTION api.add_range(p_division_id integer, p_range_name character varying, p_description text) OWNER TO postgres;

--
-- Name: add_species(character varying, character varying, character varying, integer, integer, character varying); Type: FUNCTION; Schema: api; Owner: postgres
--

CREATE FUNCTION api.add_species(p_scientific_name character varying, p_common_name character varying, p_family character varying, p_category_id integer, p_iucn_status_id integer, p_origin_type character varying) RETURNS integer
    LANGUAGE plpgsql
    AS $$
DECLARE v_species_id integer;
BEGIN
  INSERT INTO core.species (scientific_name, common_name, family, category_id, iucn_status_id, origin_type)
  VALUES (p_scientific_name, p_common_name, p_family, p_category_id, p_iucn_status_id, NULLIF(p_origin_type,''))
  RETURNING species_id INTO v_species_id;
  RETURN v_species_id;
END; $$;


ALTER FUNCTION api.add_species(p_scientific_name character varying, p_common_name character varying, p_family character varying, p_category_id integer, p_iucn_status_id integer, p_origin_type character varying) OWNER TO postgres;

--
-- Name: add_user(text, text, text, text); Type: FUNCTION; Schema: api; Owner: postgres
--

CREATE FUNCTION api.add_user(p_username text, p_full_name text, p_role text, p_password text) RETURNS json
    LANGUAGE plpgsql SECURITY DEFINER
    AS $$
DECLARE v_id int;
BEGIN
  IF length(trim(p_password)) < 6 THEN
    RAISE EXCEPTION 'Password must be at least 6 characters';
  END IF;
  INSERT INTO core.users (username, full_name, role, password_hash)
  VALUES (lower(trim(p_username)), p_full_name, upper(p_role), crypt(p_password, gen_salt('bf')))
  RETURNING user_id INTO v_id;
  RETURN json_build_object('user_id', v_id);
END $$;


ALTER FUNCTION api.add_user(p_username text, p_full_name text, p_role text, p_password text) OWNER TO postgres;

--
-- Name: approve_user(integer, text, integer); Type: FUNCTION; Schema: api; Owner: postgres
--

CREATE FUNCTION api.approve_user(p_user_id integer, p_role text DEFAULT 'VIEWER'::text, p_approved_by integer DEFAULT NULL::integer) RETURNS json
    LANGUAGE plpgsql SECURITY DEFINER
    AS $$
DECLARE v_role text := upper(trim(coalesce(p_role,'VIEWER')));
BEGIN
    IF v_role NOT IN ('ADMIN','RANGER','VIEWER') THEN
        RAISE EXCEPTION 'Role must be ADMIN, RANGER or VIEWER';
    END IF;
    UPDATE core.users
       SET is_active = true, role = v_role,
           approved_at = now(), approved_by = p_approved_by
     WHERE user_id = p_user_id;
    IF NOT FOUND THEN RAISE EXCEPTION 'User not found'; END IF;
    RETURN json_build_object('user_id', p_user_id, 'role', v_role, 'status','approved');
END $$;


ALTER FUNCTION api.approve_user(p_user_id integer, p_role text, p_approved_by integer) OWNER TO postgres;

--
-- Name: complete_password_reset(text, text); Type: FUNCTION; Schema: api; Owner: postgres
--

CREATE FUNCTION api.complete_password_reset(p_token text, p_password text) RETURNS json
    LANGUAGE plpgsql SECURITY DEFINER
    AS $$
DECLARE t record;
BEGIN
    IF length(trim(coalesce(p_password,''))) < 8 THEN
        RAISE EXCEPTION 'Password must be at least 8 characters';
    END IF;

    SELECT token_id, user_id, used_at, expires_at INTO t
      FROM core.password_reset_tokens
     WHERE token_hash = encode(digest(coalesce(p_token,''), 'sha256'), 'hex')
     LIMIT 1;

    IF t.token_id IS NULL    THEN RAISE EXCEPTION 'This reset link is not valid'; END IF;
    IF t.used_at IS NOT NULL THEN RAISE EXCEPTION 'This reset link has already been used'; END IF;
    IF t.expires_at < now()  THEN RAISE EXCEPTION 'This reset link has expired. Please request a new one'; END IF;

    UPDATE core.users
       SET password_hash = crypt(p_password, gen_salt('bf'))
     WHERE user_id = t.user_id;

    UPDATE core.password_reset_tokens SET used_at = now() WHERE token_id = t.token_id;

    -- close any open manual requests for this user
    UPDATE core.password_reset_requests
       SET resolved_at = now()
     WHERE user_id = t.user_id AND resolved_at IS NULL;

    RETURN json_build_object('status','reset','message','Your password has been changed. You can now sign in.');
END $$;


ALTER FUNCTION api.complete_password_reset(p_token text, p_password text) OWNER TO postgres;

--
-- Name: delete_beat(integer); Type: FUNCTION; Schema: api; Owner: postgres
--

CREATE FUNCTION api.delete_beat(p_beat_id integer) RETURNS integer
    LANGUAGE plpgsql
    AS $$

BEGIN

DELETE

FROM core.forest_beats

WHERE beat_id = p_beat_id;

RETURN p_beat_id;

END;

$$;


ALTER FUNCTION api.delete_beat(p_beat_id integer) OWNER TO postgres;

--
-- Name: delete_division(integer); Type: FUNCTION; Schema: api; Owner: postgres
--

CREATE FUNCTION api.delete_division(p_division_id integer) RETURNS boolean
    LANGUAGE plpgsql
    AS $$

BEGIN

    UPDATE core.forest_divisions

    SET

        is_active  = FALSE,

        modified_on = CURRENT_TIMESTAMP

    WHERE division_id = p_division_id;

    RETURN FOUND;

END;

$$;


ALTER FUNCTION api.delete_division(p_division_id integer) OWNER TO postgres;

--
-- Name: delete_plant(uuid); Type: FUNCTION; Schema: api; Owner: postgres
--

CREATE FUNCTION api.delete_plant(p_plant_id uuid) RETURNS boolean
    LANGUAGE plpgsql
    AS $$

BEGIN

    UPDATE core.plants

    SET

        is_active = FALSE,

        modified_on = NOW()

    WHERE plant_id = p_plant_id;

    RETURN TRUE;

END;

$$;


ALTER FUNCTION api.delete_plant(p_plant_id uuid) OWNER TO postgres;

--
-- Name: delete_range(integer); Type: FUNCTION; Schema: api; Owner: postgres
--

CREATE FUNCTION api.delete_range(p_range_id integer) RETURNS integer
    LANGUAGE plpgsql
    AS $$

BEGIN

DELETE

FROM core.forest_ranges

WHERE range_id=p_range_id;

RETURN p_range_id;

END;

$$;


ALTER FUNCTION api.delete_range(p_range_id integer) OWNER TO postgres;

--
-- Name: delete_species(integer); Type: FUNCTION; Schema: api; Owner: postgres
--

CREATE FUNCTION api.delete_species(p_species_id integer) RETURNS integer
    LANGUAGE plpgsql
    AS $$

DECLARE

    v_rows INTEGER;

BEGIN

DELETE

FROM core.species

WHERE species_id = p_species_id;

GET DIAGNOSTICS v_rows = ROW_COUNT;

RETURN v_rows;

END;

$$;


ALTER FUNCTION api.delete_species(p_species_id integer) OWNER TO postgres;

--
-- Name: delete_user(integer); Type: FUNCTION; Schema: api; Owner: postgres
--

CREATE FUNCTION api.delete_user(p_user_id integer) RETURNS json
    LANGUAGE plpgsql SECURITY DEFINER
    AS $$
BEGIN
  IF (SELECT count(*) FROM core.users WHERE role = 'ADMIN' AND is_active AND user_id <> p_user_id) = 0
     AND (SELECT role FROM core.users WHERE user_id = p_user_id) = 'ADMIN' THEN
    RAISE EXCEPTION 'Cannot delete the last active admin';
  END IF;
  DELETE FROM core.users WHERE user_id = p_user_id;
  RETURN json_build_object('deleted', p_user_id);
END $$;


ALTER FUNCTION api.delete_user(p_user_id integer) OWNER TO postgres;

--
-- Name: get_beat_landuse(); Type: FUNCTION; Schema: api; Owner: postgres
--

CREATE FUNCTION api.get_beat_landuse() RETURNS TABLE(beat_id integer, beat_name character varying, year smallint, class_code smallint, class_name character varying, area_ha numeric)
    LANGUAGE sql STABLE
    AS $$
  SELECT beat_id, beat_name, year, class_code, class_name, area_ha
  FROM core.beat_landuse ORDER BY beat_name, year, class_code;
$$;


ALTER FUNCTION api.get_beat_landuse() OWNER TO postgres;

--
-- Name: get_beat_location(integer); Type: FUNCTION; Schema: api; Owner: postgres
--

CREATE FUNCTION api.get_beat_location(p_beat_id integer) RETURNS TABLE(latitude double precision, longitude double precision)
    LANGUAGE sql STABLE
    AS $$
SELECT
    ST_Y(ST_PointOnSurface(geom)) AS latitude,
    ST_X(ST_PointOnSurface(geom)) AS longitude
FROM core.forest_beats
WHERE beat_id = p_beat_id;
$$;


ALTER FUNCTION api.get_beat_location(p_beat_id integer) OWNER TO postgres;

--
-- Name: get_beat_survey(integer); Type: FUNCTION; Schema: api; Owner: postgres
--

CREATE FUNCTION api.get_beat_survey(p_area_id integer DEFAULT NULL::integer) RETURNS TABLE(area_id integer, area_code character varying, beat_id integer, beat_name character varying, range_name character varying, division_name character varying, observations integer, species_count integer, last_survey date, stream_km numeric, road_km numeric, coverage text, no_road_access boolean)
    LANGUAGE sql STABLE
    AS $$
    SELECT v.area_id, v.area_code, v.beat_id, v.beat_name, v.range_name, v.division_name,
           v.observations, v.species_count, v.last_survey, v.stream_km, v.road_km,
           v.coverage, v.no_road_access
    FROM core.v_beat_survey v
    WHERE v.area_id = COALESCE(p_area_id, core.default_area())
    ORDER BY v.observations ASC, v.stream_km DESC;
$$;


ALTER FUNCTION api.get_beat_survey(p_area_id integer) OWNER TO postgres;

--
-- Name: get_beats(); Type: FUNCTION; Schema: api; Owner: postgres
--

CREATE FUNCTION api.get_beats() RETURNS TABLE(beat_id integer, range_id integer, range_name character varying, beat_name character varying, description text, is_active boolean)
    LANGUAGE sql
    AS $$

SELECT

    b.beat_id,

    r.range_id,

    r.range_name,

    b.beat_name,

    b.description,

    b.is_active

FROM core.forest_beats b

INNER JOIN core.forest_ranges r
ON b.range_id = r.range_id

ORDER BY
r.range_name,
b.beat_name;

$$;


ALTER FUNCTION api.get_beats() OWNER TO postgres;

--
-- Name: get_beats_by_range(integer); Type: FUNCTION; Schema: api; Owner: postgres
--

CREATE FUNCTION api.get_beats_by_range(p_range_id integer) RETURNS TABLE(beat_id integer, beat_name character varying)
    LANGUAGE sql
    AS $$

SELECT

    beat_id,

    beat_name

FROM core.forest_beats

WHERE range_id = p_range_id
AND is_active = TRUE

ORDER BY beat_name;

$$;


ALTER FUNCTION api.get_beats_by_range(p_range_id integer) OWNER TO postgres;

--
-- Name: get_categories(); Type: FUNCTION; Schema: api; Owner: postgres
--

CREATE FUNCTION api.get_categories() RETURNS TABLE(category_id integer, category_name character varying)
    LANGUAGE sql
    AS $$

SELECT

    category_id,
    category_name

FROM core.categories

WHERE is_active = TRUE

ORDER BY category_name;

$$;


ALTER FUNCTION api.get_categories() OWNER TO postgres;

--
-- Name: get_division(integer); Type: FUNCTION; Schema: api; Owner: postgres
--

CREATE FUNCTION api.get_division(p_division_id integer) RETURNS TABLE(division_id integer, division_name character varying, description text, is_active boolean, created_on timestamp without time zone, modified_on timestamp without time zone)
    LANGUAGE sql STABLE
    AS $$

SELECT

    d.division_id,
    d.division_name,
    d.description,
    d.is_active,
    d.created_on,
    d.modified_on

FROM core.forest_divisions d

WHERE d.division_id = p_division_id;

$$;


ALTER FUNCTION api.get_division(p_division_id integer) OWNER TO postgres;

--
-- Name: get_divisions(); Type: FUNCTION; Schema: api; Owner: postgres
--

CREATE FUNCTION api.get_divisions() RETURNS TABLE(division_id integer, division_name character varying, description text, is_active boolean, created_on timestamp without time zone, modified_on timestamp without time zone)
    LANGUAGE sql STABLE
    AS $$
SELECT
    d.division_id,
    d.division_name,
    d.description,
    d.is_active,
    d.created_on,
    d.modified_on
FROM core.forest_divisions d
ORDER BY d.division_name;
$$;


ALTER FUNCTION api.get_divisions() OWNER TO postgres;

--
-- Name: get_iucn_status(); Type: FUNCTION; Schema: api; Owner: postgres
--

CREATE FUNCTION api.get_iucn_status() RETURNS TABLE(iucn_status_id integer, code character varying, status_name character varying)
    LANGUAGE sql
    AS $$

SELECT

    iucn_status_id,
    code,
    status_name

FROM core.iucn_status

WHERE is_active = TRUE

ORDER BY iucn_status_id;

$$;


ALTER FUNCTION api.get_iucn_status() OWNER TO postgres;

--
-- Name: get_nearby_plants(uuid, double precision); Type: FUNCTION; Schema: api; Owner: postgres
--

CREATE FUNCTION api.get_nearby_plants(p_plant_id uuid, p_radius double precision) RETURNS TABLE(plant_id uuid, observation_no character varying, common_name text, scientific_name text, beat_name character varying, range_name character varying, division_name character varying, latitude double precision, longitude double precision, distance_m double precision)
    LANGUAGE sql STABLE
    AS $$

SELECT

    p2.plant_id,
    p2.observation_no,
    s.common_name,
    s.scientific_name,
    b.beat_name,
    r.range_name,
    d.division_name,
    p2.latitude,
    p2.longitude,

    ROUND(
        ST_Distance(
            p1.geom::geography,
            p2.geom::geography
        )::numeric,
        2
    )::double precision AS distance_m

FROM core.plants p1

JOIN core.plants p2
ON ST_DWithin(
        p1.geom::geography,
        p2.geom::geography,
        p_radius
   )

LEFT JOIN core.species s
ON p2.species_id = s.species_id

LEFT JOIN core.forest_beats b
ON p2.beat_id = b.beat_id

LEFT JOIN core.forest_ranges r
ON b.range_id = r.range_id

LEFT JOIN core.forest_divisions d
ON r.division_id = d.division_id

WHERE
    p1.plant_id = p_plant_id
AND p2.plant_id <> p_plant_id

ORDER BY distance_m;

$$;


ALTER FUNCTION api.get_nearby_plants(p_plant_id uuid, p_radius double precision) OWNER TO postgres;

--
-- Name: get_pending_users(); Type: FUNCTION; Schema: api; Owner: postgres
--

CREATE FUNCTION api.get_pending_users() RETURNS TABLE(user_id integer, username text, full_name text, email text, mobile text, designation text, created_at timestamp with time zone)
    LANGUAGE sql STABLE SECURITY DEFINER
    AS $$
    SELECT user_id, username, full_name, email, mobile, designation, created_at
    FROM core.users
    WHERE registered AND NOT is_active
    ORDER BY created_at;
$$;


ALTER FUNCTION api.get_pending_users() OWNER TO postgres;

--
-- Name: get_plant_by_id(uuid); Type: FUNCTION; Schema: api; Owner: postgres
--

CREATE FUNCTION api.get_plant_by_id(p_plant_id uuid) RETURNS TABLE(plant_id uuid, observation_no character varying, common_name character varying, scientific_name character varying, family character varying, origin_type character varying, beat_name character varying, condition_name character varying, observed_on date, observed_by character varying, age_class character varying, latitude double precision, longitude double precision, gps_accuracy double precision, remarks text, photo_path character varying, is_active boolean, species_id integer, beat_id integer, condition_id integer)
    LANGUAGE sql
    AS $$
  SELECT p.plant_id, p.observation_no, s.common_name, s.scientific_name, s.family, s.origin_type,
         b.beat_name, c.condition_name, p.observed_on, p.observed_by, p.age_class,
         p.latitude, p.longitude, p.gps_accuracy, p.remarks, p.photo_path, p.is_active,
         p.species_id, p.beat_id, p.condition_id::integer
  FROM core.plants p
  JOIN core.species s        ON s.species_id = p.species_id
  JOIN core.forest_beats b   ON b.beat_id   = p.beat_id
  JOIN core.plant_condition c ON c.condition_id = p.condition_id
  WHERE p.plant_id = p_plant_id;
$$;


ALTER FUNCTION api.get_plant_by_id(p_plant_id uuid) OWNER TO postgres;

--
-- Name: get_plant_conditions(); Type: FUNCTION; Schema: api; Owner: postgres
--

CREATE FUNCTION api.get_plant_conditions() RETURNS TABLE(condition_id smallint, condition_name character varying)
    LANGUAGE sql
    AS $$

SELECT

    condition_id,

    condition_name

FROM core.plant_condition

WHERE is_active = TRUE

ORDER BY
    display_order,
    condition_name;

$$;


ALTER FUNCTION api.get_plant_conditions() OWNER TO postgres;

--
-- Name: get_plant_details(uuid); Type: FUNCTION; Schema: api; Owner: postgres
--

CREATE FUNCTION api.get_plant_details(p_plant_id uuid) RETURNS TABLE(plant_id uuid, observation_no character varying, common_name character varying, scientific_name character varying, origin_type character varying, beat_name character varying, condition_name character varying, observed_on date, observed_by character varying, age_class character varying, latitude double precision, longitude double precision, gps_accuracy double precision, remarks text, photo_path character varying, is_active boolean)
    LANGUAGE sql
    AS $$
SELECT
    p.plant_id,
    p.observation_no,
    s.common_name,
    s.scientific_name,
    s.origin_type,
    b.beat_name,
    c.condition_name,
    p.observed_on,
    p.observed_by,
    p.age_class,
    p.latitude,
    p.longitude,
    p.gps_accuracy,
    p.remarks,
    p.photo_path,
    p.is_active
FROM core.plants p
JOIN core.species s
    ON s.species_id = p.species_id
JOIN core.forest_beats b
    ON b.beat_id = p.beat_id
JOIN core.plant_condition c
    ON c.condition_id = p.condition_id
WHERE p.plant_id = p_plant_id
  AND p.is_active = TRUE;
$$;


ALTER FUNCTION api.get_plant_details(p_plant_id uuid) OWNER TO postgres;

--
-- Name: get_plant_status(); Type: FUNCTION; Schema: api; Owner: postgres
--

CREATE FUNCTION api.get_plant_status() RETURNS TABLE(plant_status_id integer, status_name character varying)
    LANGUAGE sql
    AS $$

SELECT

    plant_status_id,
    status_name

FROM core.plant_status

WHERE is_active = TRUE

ORDER BY plant_status_id;

$$;


ALTER FUNCTION api.get_plant_status() OWNER TO postgres;

--
-- Name: get_plants(); Type: FUNCTION; Schema: api; Owner: postgres
--

CREATE FUNCTION api.get_plants() RETURNS TABLE(plant_id uuid, observation_no character varying, scientific_name character varying, origin_type character varying, beat_name character varying, condition_name character varying, observed_on date, observed_by character varying, age_class character varying, latitude double precision, longitude double precision, gps_accuracy double precision, remarks text, photo_path character varying, is_active boolean)
    LANGUAGE sql
    AS $$
  SELECT p.plant_id, p.observation_no, s.scientific_name, s.origin_type, b.beat_name, c.condition_name,
         p.observed_on, p.observed_by, p.age_class, p.latitude, p.longitude, p.gps_accuracy,
         p.remarks, p.photo_path, p.is_active
  FROM core.plants p
  JOIN core.species s ON s.species_id = p.species_id
  JOIN core.forest_beats b ON b.beat_id = p.beat_id
  JOIN core.plant_condition c ON c.condition_id = p.condition_id
  WHERE p.is_active = TRUE
  ORDER BY p.observed_on DESC, p.observation_no DESC;
$$;


ALTER FUNCTION api.get_plants() OWNER TO postgres;

--
-- Name: get_population(); Type: FUNCTION; Schema: api; Owner: postgres
--

CREATE FUNCTION api.get_population() RETURNS TABLE(vill_lgd text, district text, name text, vill_name text, tru text, no_hh integer, tot_p integer, tot_m integer, tot_f integer, p_lit integer, p_sc integer, p_st integer, area_sqkm double precision, pop_density double precision)
    LANGUAGE sql STABLE SECURITY DEFINER
    AS $$
  SELECT vill_lgd::text, district, name, vill_name, tru,
         no_hh::int, tot_p::int, tot_m::int, tot_f::int, p_lit::int, p_sc::int, p_st::int,
         round(area_sqkm::numeric,3)::float8, round(pop_density::numeric,1)::float8
  FROM core.population
$$;


ALTER FUNCTION api.get_population() OWNER TO postgres;

--
-- Name: get_population_by_unit(); Type: FUNCTION; Schema: api; Owner: postgres
--

CREATE FUNCTION api.get_population_by_unit() RETURNS TABLE(level text, name text, villages integer, tot_p bigint, tot_m bigint, tot_f bigint, no_hh bigint, p_lit bigint)
    LANGUAGE sql STABLE SECURITY DEFINER
    AS $$
  SELECT level,name,villages,tot_p,tot_m,tot_f,no_hh,p_lit FROM core.population_by_unit
$$;


ALTER FUNCTION api.get_population_by_unit() OWNER TO postgres;

--
-- Name: get_ranges(); Type: FUNCTION; Schema: api; Owner: postgres
--

CREATE FUNCTION api.get_ranges() RETURNS TABLE(range_id integer, division_id integer, division_name character varying, range_name character varying, description text, is_active boolean)
    LANGUAGE sql
    AS $$

SELECT

    r.range_id,

    d.division_id,

    d.division_name,

    r.range_name,

    r.description,

    r.is_active

FROM core.forest_ranges r

JOIN core.forest_divisions d
ON d.division_id = r.division_id

ORDER BY
d.division_name,
r.range_name;

$$;


ALTER FUNCTION api.get_ranges() OWNER TO postgres;

--
-- Name: get_ranges_by_division(integer); Type: FUNCTION; Schema: api; Owner: postgres
--

CREATE FUNCTION api.get_ranges_by_division(p_division_id integer) RETURNS TABLE(range_id integer, range_name character varying)
    LANGUAGE sql
    AS $$

SELECT

range_id,

range_name

FROM core.forest_ranges

WHERE division_id=p_division_id
AND is_active=TRUE

ORDER BY range_name;

$$;


ALTER FUNCTION api.get_ranges_by_division(p_division_id integer) OWNER TO postgres;

--
-- Name: get_reset_requests(); Type: FUNCTION; Schema: api; Owner: postgres
--

CREATE FUNCTION api.get_reset_requests() RETURNS TABLE(request_id integer, user_id integer, identifier text, username text, full_name text, email text, mobile text, note text, requested_at timestamp with time zone)
    LANGUAGE sql STABLE SECURITY DEFINER
    AS $$
    SELECT r.request_id, r.user_id, r.identifier, u.username, u.full_name,
           u.email, u.mobile, r.note, r.requested_at
    FROM core.password_reset_requests r
    LEFT JOIN core.users u ON u.user_id = r.user_id
    WHERE r.resolved_at IS NULL
    ORDER BY r.requested_at;
$$;


ALTER FUNCTION api.get_reset_requests() OWNER TO postgres;

--
-- Name: get_roads(); Type: FUNCTION; Schema: api; Owner: postgres
--

CREATE FUNCTION api.get_roads() RETURNS TABLE(road_id integer, label character varying, road_name character varying, ref character varying, fclass character varying, length_km double precision, beat_name character varying)
    LANGUAGE sql STABLE
    AS $$
    SELECT r.road_id, r.label, r.road_name, r.ref, r.fclass, r.length_km, r.beat_name
    FROM   core.road_network r
    ORDER  BY r.fclass, r.label;
$$;


ALTER FUNCTION api.get_roads() OWNER TO postgres;

--
-- Name: get_roads_summary(integer); Type: FUNCTION; Schema: api; Owner: postgres
--

CREATE FUNCTION api.get_roads_summary(p_area_id integer DEFAULT NULL::integer) RETURNS TABLE(fclass character varying, roads bigint, length_km numeric)
    LANGUAGE sql STABLE
    AS $$
    SELECT r.fclass,
           count(DISTINCT a.feature_id)::bigint,
           ROUND(sum(a.measure), 2)
    FROM core.area_attribution a
    JOIN core.road_network r ON r.road_id = a.feature_id::int
    WHERE a.feature_type = 'road'
      AND a.area_id = COALESCE(p_area_id, core.default_area())
    GROUP BY r.fclass ORDER BY 3 DESC;
$$;


ALTER FUNCTION api.get_roads_summary(p_area_id integer) OWNER TO postgres;

--
-- Name: get_species(); Type: FUNCTION; Schema: api; Owner: postgres
--

CREATE FUNCTION api.get_species() RETURNS TABLE(species_id integer, species_code character varying, scientific_name character varying, common_name character varying, family character varying, category character varying, iucn_status character varying, origin_type character varying, is_active boolean)
    LANGUAGE sql
    AS $$
  SELECT s.species_id, s.species_code, s.scientific_name, s.common_name, s.family,
         c.category_name, i.status_name, s.origin_type, s.is_active
  FROM core.species s
  LEFT JOIN core.categories c ON s.category_id = c.category_id
  LEFT JOIN core.iucn_status i ON s.iucn_status_id = i.iucn_status_id
  ORDER BY s.scientific_name;
$$;


ALTER FUNCTION api.get_species() OWNER TO postgres;

--
-- Name: get_species_by_id(integer); Type: FUNCTION; Schema: api; Owner: postgres
--

CREATE FUNCTION api.get_species_by_id(p_species_id integer) RETURNS TABLE(species_id integer, scientific_name character varying, common_name character varying, family character varying, category_id integer, iucn_status_id integer, plant_status_id integer, origin_type character varying, is_active boolean)
    LANGUAGE sql
    AS $$
  SELECT species_id, scientific_name, common_name, family, category_id, iucn_status_id,
         plant_status_id, origin_type, is_active
  FROM core.species WHERE species_id = p_species_id;
$$;


ALTER FUNCTION api.get_species_by_id(p_species_id integer) OWNER TO postgres;

--
-- Name: get_streams(); Type: FUNCTION; Schema: api; Owner: postgres
--

CREATE FUNCTION api.get_streams() RETURNS TABLE(stream_id integer, segment_no integer, stream_order smallint, length_m double precision, beat_name character varying)
    LANGUAGE sql STABLE
    AS $$
    SELECT s.stream_id, s.segment_no, s.stream_order, s.length_m, s.beat_name
    FROM   core.streams s
    ORDER  BY s.stream_order, s.segment_no;
$$;


ALTER FUNCTION api.get_streams() OWNER TO postgres;

--
-- Name: get_streams_in_unit(text, text); Type: FUNCTION; Schema: api; Owner: postgres
--

CREATE FUNCTION api.get_streams_in_unit(p_level text DEFAULT NULL::text, p_name text DEFAULT NULL::text) RETURNS TABLE(stream_order smallint, segments bigint, length_km numeric)
    LANGUAGE sql STABLE
    AS $$
    WITH scope AS (
        SELECT b.geom
        FROM   core.forest_beats b
        LEFT   JOIN core.forest_ranges     r ON r.range_id    = b.range_id
        LEFT   JOIN core.forest_divisions  d ON d.division_id = r.division_id
        WHERE  b.geom IS NOT NULL
          AND (p_name IS NULL
               OR (lower(p_level) = 'beat'     AND lower(b.beat_name)     = lower(p_name))
               OR (lower(p_level) = 'range'    AND lower(r.range_name)    = lower(p_name))
               OR (lower(p_level) = 'division' AND lower(d.division_name) = lower(p_name)))
    )
    SELECT s.stream_order,
           count(DISTINCT s.stream_id)                 AS segments,
           round((sum(s.length_m) / 1000)::numeric, 2) AS length_km
    FROM   core.streams s
    WHERE  p_name IS NULL
       OR  EXISTS (SELECT 1 FROM scope sc WHERE ST_Intersects(s.geom, sc.geom))
    GROUP  BY s.stream_order
    ORDER  BY s.stream_order;
$$;


ALTER FUNCTION api.get_streams_in_unit(p_level text, p_name text) OWNER TO postgres;

--
-- Name: get_streams_summary(integer); Type: FUNCTION; Schema: api; Owner: postgres
--

CREATE FUNCTION api.get_streams_summary(p_area_id integer DEFAULT NULL::integer) RETURNS TABLE(stream_order smallint, segments bigint, length_km numeric)
    LANGUAGE sql STABLE
    AS $$
    SELECT s.stream_order,
           count(DISTINCT a.feature_id)::bigint,
           ROUND(sum(a.measure), 2)
    FROM core.area_attribution a
    JOIN core.streams s ON s.stream_id = a.feature_id::int
    WHERE a.feature_type = 'stream'
      AND a.area_id = COALESCE(p_area_id, core.default_area())
    GROUP BY s.stream_order ORDER BY s.stream_order;
$$;


ALTER FUNCTION api.get_streams_summary(p_area_id integer) OWNER TO postgres;

--
-- Name: get_study_areas(); Type: FUNCTION; Schema: api; Owner: postgres
--

CREATE FUNCTION api.get_study_areas() RETURNS TABLE(area_id integer, area_code character varying, area_name character varying, description text, is_default boolean, divisions bigint, ranges bigint, beats bigint, observations bigint, stream_km numeric, road_km numeric)
    LANGUAGE sql STABLE
    AS $$
    SELECT sa.area_id, sa.area_code, sa.area_name, sa.description, sa.is_default,
           (SELECT count(*) FROM core.forest_divisions d WHERE d.area_id = sa.area_id),
           (SELECT count(*) FROM core.forest_ranges    r WHERE r.area_id = sa.area_id),
           (SELECT count(*) FROM core.forest_beats     b WHERE b.area_id = sa.area_id),
           (SELECT count(*) FROM core.area_attribution a
             WHERE a.area_id = sa.area_id AND a.feature_type='plant'),
           (SELECT ROUND(COALESCE(sum(measure),0),2) FROM core.area_attribution a
             WHERE a.area_id = sa.area_id AND a.feature_type='stream'),
           (SELECT ROUND(COALESCE(sum(measure),0),2) FROM core.area_attribution a
             WHERE a.area_id = sa.area_id AND a.feature_type='road')
    FROM core.study_areas sa
    WHERE sa.is_active
    ORDER BY sa.is_default DESC, sa.area_name;
$$;


ALTER FUNCTION api.get_study_areas() OWNER TO postgres;

--
-- Name: get_unit_geom(text, integer); Type: FUNCTION; Schema: api; Owner: postgres
--

CREATE FUNCTION api.get_unit_geom(p_level text, p_id integer) RETURNS text
    LANGUAGE plpgsql SECURITY DEFINER
    AS $$
DECLARE g text;
BEGIN
  IF p_level = 'division' THEN SELECT ST_AsGeoJSON(geom) INTO g FROM core.forest_divisions WHERE division_id=p_id;
  ELSIF p_level = 'range' THEN SELECT ST_AsGeoJSON(geom) INTO g FROM core.forest_ranges WHERE range_id=p_id;
  ELSE SELECT ST_AsGeoJSON(geom) INTO g FROM core.forest_beats WHERE beat_id=p_id;
  END IF;
  RETURN g;
END $$;


ALTER FUNCTION api.get_unit_geom(p_level text, p_id integer) OWNER TO postgres;

--
-- Name: get_users(); Type: FUNCTION; Schema: api; Owner: postgres
--

CREATE FUNCTION api.get_users() RETURNS TABLE(user_id integer, username text, full_name text, role text, is_active boolean, email text, mobile text, designation text, registered boolean, created_at timestamp with time zone)
    LANGUAGE sql STABLE SECURITY DEFINER
    AS $$
    SELECT user_id, username, full_name, role, is_active,
           email, mobile, designation, registered, created_at
    FROM   core.users
    ORDER  BY username;
$$;


ALTER FUNCTION api.get_users() OWNER TO postgres;

--
-- Name: issue_reset_token(text, text); Type: FUNCTION; Schema: api; Owner: postgres
--

CREATE FUNCTION api.issue_reset_token(p_identifier text, p_ip text DEFAULT NULL::text) RETURNS TABLE(found boolean, email text, full_name text, username text, raw_token text)
    LANGUAGE plpgsql SECURITY DEFINER
    AS $$
DECLARE
    u   core.users;
    tok text;
    key text := lower(trim(coalesce(p_identifier,'')));
    recent int;
BEGIN
    IF key = '' THEN RAISE EXCEPTION 'Enter your username or registered email address'; END IF;

    SELECT * INTO u FROM core.users AS cu
    WHERE (cu.username = key OR lower(cu.email) = key) AND cu.is_active
    LIMIT 1;

    IF u.user_id IS NULL OR coalesce(u.email,'') = '' THEN
        RETURN QUERY SELECT false, NULL::text, NULL::text, NULL::text, NULL::text;
        RETURN;
    END IF;

    -- throttle: at most 3 links in 15 minutes per account
    SELECT count(*) INTO recent FROM core.password_reset_tokens
    WHERE user_id = u.user_id AND issued_at > now() - interval '15 minutes';
    IF recent >= 3 THEN
        RETURN QUERY SELECT false, NULL::text, NULL::text, NULL::text, NULL::text;
        RETURN;
    END IF;

    -- invalidate any outstanding links for this account
    UPDATE core.password_reset_tokens
       SET used_at = now()
     WHERE user_id = u.user_id AND used_at IS NULL AND expires_at > now();

    tok := encode(gen_random_bytes(32), 'hex');

    INSERT INTO core.password_reset_tokens (user_id, token_hash, expires_at, request_ip)
    VALUES (u.user_id, encode(digest(tok, 'sha256'), 'hex'),
            now() + core.reset_token_ttl(), p_ip);

    RETURN QUERY SELECT true, u.email, u.full_name, u.username, tok;
END $$;


ALTER FUNCTION api.issue_reset_token(p_identifier text, p_ip text) OWNER TO postgres;

--
-- Name: login(text, text); Type: FUNCTION; Schema: api; Owner: postgres
--

CREATE FUNCTION api.login(p_username text, p_password text) RETURNS json
    LANGUAGE plpgsql SECURITY DEFINER
    AS $$
DECLARE u core.users;
BEGIN
    SELECT * INTO u FROM core.users
    WHERE username = lower(trim(p_username))
      AND password_hash = crypt(p_password, password_hash);

    IF u.user_id IS NULL THEN
        RAISE EXCEPTION 'Invalid username or password';
    END IF;

    -- correct credentials but not yet approved / disabled
    IF NOT u.is_active THEN
        IF u.registered AND u.approved_at IS NULL THEN
            RAISE EXCEPTION 'Your registration is awaiting administrator approval';
        ELSE
            RAISE EXCEPTION 'This account has been disabled. Contact the administrator';
        END IF;
    END IF;

    RETURN json_build_object('user_id', u.user_id, 'username', u.username,
                             'full_name', u.full_name, 'role', u.role,
                             'email', u.email, 'mobile', u.mobile);
END $$;


ALTER FUNCTION api.login(p_username text, p_password text) OWNER TO postgres;

--
-- Name: purge_reset_tokens(); Type: FUNCTION; Schema: api; Owner: postgres
--

CREATE FUNCTION api.purge_reset_tokens() RETURNS integer
    LANGUAGE sql SECURITY DEFINER
    AS $$
    WITH d AS (DELETE FROM core.password_reset_tokens
               WHERE issued_at < now() - interval '1 day' RETURNING 1)
    SELECT count(*)::int FROM d;
$$;


ALTER FUNCTION api.purge_reset_tokens() OWNER TO postgres;

--
-- Name: refresh_population(); Type: FUNCTION; Schema: api; Owner: postgres
--

CREATE FUNCTION api.refresh_population() RETURNS json
    LANGUAGE sql SECURITY DEFINER
    AS $$
  SELECT core.recompute_population();
  SELECT json_build_object('ok',true,'villages',(SELECT count(*) FROM core.population),
                           'units',(SELECT count(*) FROM core.population_by_unit));
$$;


ALTER FUNCTION api.refresh_population() OWNER TO postgres;

--
-- Name: register_user(text, text, text, text, text, text); Type: FUNCTION; Schema: api; Owner: postgres
--

CREATE FUNCTION api.register_user(p_username text, p_full_name text, p_email text, p_mobile text, p_password text, p_designation text DEFAULT NULL::text) RETURNS json
    LANGUAGE plpgsql SECURITY DEFINER
    AS $_$
DECLARE
    v_id  int;
    v_usr text := lower(trim(p_username));
    v_eml text := lower(trim(coalesce(p_email, '')));
    v_mob text := regexp_replace(coalesce(p_mobile, ''), '[^0-9]', '', 'g');
BEGIN
    IF v_usr !~ '^[a-z0-9._-]{3,30}$' THEN
        RAISE EXCEPTION 'Username must be 3-30 characters: letters, digits, dot, dash or underscore';
    END IF;
    IF length(trim(coalesce(p_full_name,''))) < 3 THEN
        RAISE EXCEPTION 'Please enter your full name';
    END IF;
    IF NOT core.is_email(v_eml) THEN
        RAISE EXCEPTION 'Please enter a valid email address';
    END IF;
    IF NOT core.is_mobile(v_mob) THEN
        RAISE EXCEPTION 'Please enter a valid 10-digit mobile number';
    END IF;
    IF length(trim(p_password)) < 8 THEN
        RAISE EXCEPTION 'Password must be at least 8 characters';
    END IF;

    IF EXISTS (SELECT 1 FROM core.users WHERE username = v_usr) THEN
        RAISE EXCEPTION 'That username is already taken';
    END IF;
    IF EXISTS (SELECT 1 FROM core.users WHERE lower(email) = v_eml) THEN
        RAISE EXCEPTION 'That email address is already registered';
    END IF;

    -- role is fixed and the account starts inactive: an administrator must approve
    INSERT INTO core.users (username, full_name, email, mobile, designation,
                            role, password_hash, is_active, registered)
    VALUES (v_usr, trim(p_full_name), v_eml, v_mob, nullif(trim(coalesce(p_designation,'')),''),
            'VIEWER', crypt(p_password, gen_salt('bf')), false, true)
    RETURNING user_id INTO v_id;

    RETURN json_build_object(
        'user_id', v_id,
        'status',  'pending',
        'message', 'Registration received. An administrator must approve your account before you can sign in.');
END $_$;


ALTER FUNCTION api.register_user(p_username text, p_full_name text, p_email text, p_mobile text, p_password text, p_designation text) OWNER TO postgres;

--
-- Name: reject_user(integer); Type: FUNCTION; Schema: api; Owner: postgres
--

CREATE FUNCTION api.reject_user(p_user_id integer) RETURNS json
    LANGUAGE plpgsql SECURITY DEFINER
    AS $$
BEGIN
    DELETE FROM core.users WHERE user_id = p_user_id AND registered AND NOT is_active;
    IF NOT FOUND THEN RAISE EXCEPTION 'No pending registration with that id'; END IF;
    RETURN json_build_object('user_id', p_user_id, 'status','rejected');
END $$;


ALTER FUNCTION api.reject_user(p_user_id integer) OWNER TO postgres;

--
-- Name: request_password_reset(text, text); Type: FUNCTION; Schema: api; Owner: postgres
--

CREATE FUNCTION api.request_password_reset(p_identifier text, p_note text DEFAULT NULL::text) RETURNS json
    LANGUAGE plpgsql SECURITY DEFINER
    AS $$
DECLARE
    v_id  int;
    v_key text := lower(trim(coalesce(p_identifier,'')));
BEGIN
    IF v_key = '' THEN
        RAISE EXCEPTION 'Enter your username or registered email address';
    END IF;

    SELECT user_id INTO v_id FROM core.users
    WHERE username = v_key OR lower(email) = v_key
    LIMIT 1;

    -- log the request whether or not we matched a user
    INSERT INTO core.password_reset_requests (user_id, identifier, note)
    VALUES (v_id, v_key, nullif(trim(coalesce(p_note,'')),''));

    RETURN json_build_object(
        'status',  'received',
        'message', 'Your request has been sent to the administrator. '
                || 'You will be contacted on your registered mobile or email.');
END $$;


ALTER FUNCTION api.request_password_reset(p_identifier text, p_note text) OWNER TO postgres;

--
-- Name: reset_password(integer, text); Type: FUNCTION; Schema: api; Owner: postgres
--

CREATE FUNCTION api.reset_password(p_user_id integer, p_password text) RETURNS json
    LANGUAGE plpgsql SECURITY DEFINER
    AS $$
BEGIN
  IF length(trim(p_password)) < 6 THEN
    RAISE EXCEPTION 'Password must be at least 6 characters';
  END IF;
  UPDATE core.users SET password_hash = crypt(p_password, gen_salt('bf'))
  WHERE user_id = p_user_id;
  RETURN json_build_object('user_id', p_user_id);
END $$;


ALTER FUNCTION api.reset_password(p_user_id integer, p_password text) OWNER TO postgres;

--
-- Name: resolve_reset_request(integer, integer); Type: FUNCTION; Schema: api; Owner: postgres
--

CREATE FUNCTION api.resolve_reset_request(p_request_id integer, p_resolved_by integer DEFAULT NULL::integer) RETURNS json
    LANGUAGE plpgsql SECURITY DEFINER
    AS $$
BEGIN
    UPDATE core.password_reset_requests
       SET resolved_at = now(), resolved_by = p_resolved_by
     WHERE request_id = p_request_id AND resolved_at IS NULL;
    IF NOT FOUND THEN RAISE EXCEPTION 'Request not found or already resolved'; END IF;
    RETURN json_build_object('request_id', p_request_id, 'status','resolved');
END $$;


ALTER FUNCTION api.resolve_reset_request(p_request_id integer, p_resolved_by integer) OWNER TO postgres;

--
-- Name: set_beat_geom(integer, text); Type: FUNCTION; Schema: api; Owner: postgres
--

CREATE FUNCTION api.set_beat_geom(p_beat_id integer, p_geojson text) RETURNS json
    LANGUAGE plpgsql SECURITY DEFINER
    AS $$
BEGIN
  UPDATE core.forest_beats
     SET geom = ST_Multi(ST_SetSRID(ST_GeomFromGeoJSON(p_geojson),4326)), modified_on = now()
   WHERE beat_id = p_beat_id;
  RETURN json_build_object('beat_id', p_beat_id, 'ok', true);
END $$;


ALTER FUNCTION api.set_beat_geom(p_beat_id integer, p_geojson text) OWNER TO postgres;

--
-- Name: set_division_geom(integer, text); Type: FUNCTION; Schema: api; Owner: postgres
--

CREATE FUNCTION api.set_division_geom(p_division_id integer, p_geojson text) RETURNS json
    LANGUAGE plpgsql SECURITY DEFINER
    AS $$
BEGIN
  UPDATE core.forest_divisions
     SET geom = ST_Multi(ST_SetSRID(ST_GeomFromGeoJSON(p_geojson),4326)), modified_on = now()
   WHERE division_id = p_division_id;
  RETURN json_build_object('division_id', p_division_id, 'ok', true);
END $$;


ALTER FUNCTION api.set_division_geom(p_division_id integer, p_geojson text) OWNER TO postgres;

--
-- Name: set_range_geom(integer, text); Type: FUNCTION; Schema: api; Owner: postgres
--

CREATE FUNCTION api.set_range_geom(p_range_id integer, p_geojson text) RETURNS json
    LANGUAGE plpgsql SECURITY DEFINER
    AS $$
BEGIN
  UPDATE core.forest_ranges
     SET geom = ST_Multi(ST_SetSRID(ST_GeomFromGeoJSON(p_geojson),4326)), modified_on = now()
   WHERE range_id = p_range_id;
  RETURN json_build_object('range_id', p_range_id, 'ok', true);
END $$;


ALTER FUNCTION api.set_range_geom(p_range_id integer, p_geojson text) OWNER TO postgres;

--
-- Name: update_beat(integer, integer, character varying, text, boolean); Type: FUNCTION; Schema: api; Owner: postgres
--

CREATE FUNCTION api.update_beat(p_beat_id integer, p_range_id integer, p_beat_name character varying, p_description text, p_is_active boolean) RETURNS integer
    LANGUAGE plpgsql
    AS $$

BEGIN

UPDATE core.forest_beats

SET

range_id = p_range_id,

beat_name = p_beat_name,

description = p_description,

is_active = p_is_active,

modified_on = CURRENT_TIMESTAMP

WHERE beat_id = p_beat_id;

RETURN p_beat_id;

END;

$$;


ALTER FUNCTION api.update_beat(p_beat_id integer, p_range_id integer, p_beat_name character varying, p_description text, p_is_active boolean) OWNER TO postgres;

--
-- Name: update_division(integer, character varying, text, boolean); Type: FUNCTION; Schema: api; Owner: postgres
--

CREATE FUNCTION api.update_division(p_division_id integer, p_division_name character varying, p_description text, p_is_active boolean) RETURNS boolean
    LANGUAGE plpgsql
    AS $$

BEGIN

    UPDATE core.forest_divisions

    SET

        division_name = p_division_name,

        description   = p_description,

        is_active     = p_is_active,

        modified_on   = CURRENT_TIMESTAMP

    WHERE division_id = p_division_id;

    RETURN FOUND;

END;

$$;


ALTER FUNCTION api.update_division(p_division_id integer, p_division_name character varying, p_description text, p_is_active boolean) OWNER TO postgres;

--
-- Name: update_plant(uuid, integer, integer, date, character varying, integer, character varying, double precision, double precision, double precision, character varying, text); Type: FUNCTION; Schema: api; Owner: postgres
--

CREATE FUNCTION api.update_plant(p_plant_id uuid, p_species_id integer, p_beat_id integer, p_observed_on date, p_observed_by character varying, p_condition_id integer, p_age_class character varying, p_latitude double precision, p_longitude double precision, p_gps_accuracy double precision, p_photo_path character varying, p_remarks text) RETURNS boolean
    LANGUAGE plpgsql
    AS $$
BEGIN

    UPDATE core.plants
    SET
        species_id    = p_species_id,
        beat_id       = p_beat_id,
        observed_on   = p_observed_on,
        observed_by   = NULLIF(TRIM(p_observed_by), ''),
        condition_id  = p_condition_id,
        age_class     = NULLIF(TRIM(p_age_class), ''),
        latitude      = p_latitude,
        longitude     = p_longitude,
        geom          = CASE
                            WHEN p_latitude IS NOT NULL
                             AND p_longitude IS NOT NULL
                            THEN ST_SetSRID(
                                     ST_MakePoint(p_longitude, p_latitude),
                                     4326)
                            ELSE geom
                        END,
        gps_accuracy  = p_gps_accuracy,
        photo_path    = NULLIF(TRIM(p_photo_path), ''),
        remarks       = NULLIF(TRIM(p_remarks), ''),
        modified_on   = CURRENT_TIMESTAMP
    WHERE plant_id = p_plant_id;

    RETURN FOUND;

END;
$$;


ALTER FUNCTION api.update_plant(p_plant_id uuid, p_species_id integer, p_beat_id integer, p_observed_on date, p_observed_by character varying, p_condition_id integer, p_age_class character varying, p_latitude double precision, p_longitude double precision, p_gps_accuracy double precision, p_photo_path character varying, p_remarks text) OWNER TO postgres;

--
-- Name: update_range(integer, integer, character varying, text, boolean); Type: FUNCTION; Schema: api; Owner: postgres
--

CREATE FUNCTION api.update_range(p_range_id integer, p_division_id integer, p_range_name character varying, p_description text, p_is_active boolean) RETURNS integer
    LANGUAGE plpgsql
    AS $$

BEGIN

UPDATE core.forest_ranges

SET

division_id=p_division_id,

range_name=p_range_name,

description=p_description,

is_active=p_is_active,

modified_on=CURRENT_TIMESTAMP

WHERE range_id=p_range_id;

RETURN p_range_id;

END;

$$;


ALTER FUNCTION api.update_range(p_range_id integer, p_division_id integer, p_range_name character varying, p_description text, p_is_active boolean) OWNER TO postgres;

--
-- Name: update_species(integer, character varying, character varying, character varying, integer, integer, character varying); Type: FUNCTION; Schema: api; Owner: postgres
--

CREATE FUNCTION api.update_species(p_species_id integer, p_scientific_name character varying, p_common_name character varying, p_family character varying, p_category_id integer, p_iucn_status_id integer, p_origin_type character varying) RETURNS integer
    LANGUAGE plpgsql
    AS $$
BEGIN
  UPDATE core.species SET scientific_name=p_scientific_name, common_name=p_common_name, family=p_family,
    category_id=p_category_id, iucn_status_id=p_iucn_status_id, origin_type=NULLIF(p_origin_type,''),
    modified_on=now()
  WHERE species_id=p_species_id;
  RETURN p_species_id;
END; $$;


ALTER FUNCTION api.update_species(p_species_id integer, p_scientific_name character varying, p_common_name character varying, p_family character varying, p_category_id integer, p_iucn_status_id integer, p_origin_type character varying) OWNER TO postgres;

--
-- Name: update_user(integer, text, text, boolean); Type: FUNCTION; Schema: api; Owner: postgres
--

CREATE FUNCTION api.update_user(p_user_id integer, p_full_name text, p_role text, p_is_active boolean) RETURNS json
    LANGUAGE plpgsql SECURITY DEFINER
    AS $$
BEGIN
  UPDATE core.users SET full_name = p_full_name, role = upper(p_role), is_active = p_is_active
  WHERE user_id = p_user_id;
  RETURN json_build_object('user_id', p_user_id);
END $$;


ALTER FUNCTION api.update_user(p_user_id integer, p_full_name text, p_role text, p_is_active boolean) OWNER TO postgres;

--
-- Name: update_user_profile(integer, text, text, text, text); Type: FUNCTION; Schema: api; Owner: postgres
--

CREATE FUNCTION api.update_user_profile(p_user_id integer, p_full_name text, p_email text DEFAULT NULL::text, p_mobile text DEFAULT NULL::text, p_designation text DEFAULT NULL::text) RETURNS json
    LANGUAGE plpgsql SECURITY DEFINER
    AS $$
DECLARE
    v_eml text := lower(trim(coalesce(p_email, '')));
    v_mob text := regexp_replace(coalesce(p_mobile, ''), '[^0-9]', '', 'g');
BEGIN
    IF length(trim(coalesce(p_full_name, ''))) < 3 THEN
        RAISE EXCEPTION 'Full name is required';
    END IF;

    -- contact details are optional, but must be valid when supplied
    IF v_eml <> '' AND NOT core.is_email(v_eml) THEN
        RAISE EXCEPTION 'Please enter a valid email address';
    END IF;
    IF v_mob <> '' AND NOT core.is_mobile(v_mob) THEN
        RAISE EXCEPTION 'Please enter a valid 10-digit mobile number';
    END IF;

    IF v_eml <> '' AND EXISTS (
        SELECT 1 FROM core.users
        WHERE lower(email) = v_eml AND user_id <> p_user_id
    ) THEN
        RAISE EXCEPTION 'That email address is already used by another account';
    END IF;

    UPDATE core.users
       SET full_name   = trim(p_full_name),
           email       = nullif(v_eml, ''),
           mobile      = nullif(v_mob, ''),
           designation = nullif(trim(coalesce(p_designation, '')), '')
     WHERE user_id = p_user_id;

    IF NOT FOUND THEN RAISE EXCEPTION 'User not found'; END IF;

    RETURN json_build_object('user_id', p_user_id, 'status', 'updated');
END $$;


ALTER FUNCTION api.update_user_profile(p_user_id integer, p_full_name text, p_email text, p_mobile text, p_designation text) OWNER TO postgres;

--
-- Name: validate_reset_token(text); Type: FUNCTION; Schema: api; Owner: postgres
--

CREATE FUNCTION api.validate_reset_token(p_token text) RETURNS json
    LANGUAGE plpgsql SECURITY DEFINER
    AS $$
DECLARE r record;
BEGIN
    SELECT t.token_id AS tid, t.expires_at AS exp, t.used_at AS used,
           u.username AS uname, u.full_name AS fname
      INTO r
      FROM core.password_reset_tokens t
      JOIN core.users u ON u.user_id = t.user_id
     WHERE t.token_hash = encode(digest(coalesce(p_token,''), 'sha256'), 'hex')
     LIMIT 1;

    IF r.tid IS NULL         THEN RETURN json_build_object('valid', false, 'reason', 'invalid'); END IF;
    IF r.used IS NOT NULL    THEN RETURN json_build_object('valid', false, 'reason', 'used');    END IF;
    IF r.exp < now()         THEN RETURN json_build_object('valid', false, 'reason', 'expired'); END IF;

    RETURN json_build_object('valid', true, 'username', r.uname, 'full_name', r.fname,
                             'expires_at', r.exp);
END $$;


ALTER FUNCTION api.validate_reset_token(p_token text) OWNER TO postgres;

--
-- Name: SCHEMA api; Type: ACL; Schema: -; Owner: postgres
--

GRANT USAGE ON SCHEMA api TO web_anon;


--
-- Name: FUNCTION add_beat(p_range_id integer, p_beat_name character varying, p_description text); Type: ACL; Schema: api; Owner: postgres
--

GRANT ALL ON FUNCTION api.add_beat(p_range_id integer, p_beat_name character varying, p_description text) TO web_anon;


--
-- Name: FUNCTION add_division(p_division_name character varying, p_description text); Type: ACL; Schema: api; Owner: postgres
--

GRANT ALL ON FUNCTION api.add_division(p_division_name character varying, p_description text) TO web_anon;


--
-- Name: FUNCTION add_range(p_division_id integer, p_range_name character varying, p_description text); Type: ACL; Schema: api; Owner: postgres
--

GRANT ALL ON FUNCTION api.add_range(p_division_id integer, p_range_name character varying, p_description text) TO web_anon;


--
-- Name: FUNCTION add_species(p_scientific_name character varying, p_common_name character varying, p_family character varying, p_category_id integer, p_iucn_status_id integer, p_origin_type character varying); Type: ACL; Schema: api; Owner: postgres
--

GRANT ALL ON FUNCTION api.add_species(p_scientific_name character varying, p_common_name character varying, p_family character varying, p_category_id integer, p_iucn_status_id integer, p_origin_type character varying) TO web_anon;


--
-- Name: FUNCTION add_user(p_username text, p_full_name text, p_role text, p_password text); Type: ACL; Schema: api; Owner: postgres
--

GRANT ALL ON FUNCTION api.add_user(p_username text, p_full_name text, p_role text, p_password text) TO web_anon;


--
-- Name: FUNCTION approve_user(p_user_id integer, p_role text, p_approved_by integer); Type: ACL; Schema: api; Owner: postgres
--

GRANT ALL ON FUNCTION api.approve_user(p_user_id integer, p_role text, p_approved_by integer) TO web_anon;


--
-- Name: FUNCTION complete_password_reset(p_token text, p_password text); Type: ACL; Schema: api; Owner: postgres
--

GRANT ALL ON FUNCTION api.complete_password_reset(p_token text, p_password text) TO web_anon;


--
-- Name: FUNCTION delete_beat(p_beat_id integer); Type: ACL; Schema: api; Owner: postgres
--

GRANT ALL ON FUNCTION api.delete_beat(p_beat_id integer) TO web_anon;


--
-- Name: FUNCTION delete_division(p_division_id integer); Type: ACL; Schema: api; Owner: postgres
--

GRANT ALL ON FUNCTION api.delete_division(p_division_id integer) TO web_anon;


--
-- Name: FUNCTION delete_range(p_range_id integer); Type: ACL; Schema: api; Owner: postgres
--

GRANT ALL ON FUNCTION api.delete_range(p_range_id integer) TO web_anon;


--
-- Name: FUNCTION delete_species(p_species_id integer); Type: ACL; Schema: api; Owner: postgres
--

GRANT ALL ON FUNCTION api.delete_species(p_species_id integer) TO web_anon;


--
-- Name: FUNCTION delete_user(p_user_id integer); Type: ACL; Schema: api; Owner: postgres
--

GRANT ALL ON FUNCTION api.delete_user(p_user_id integer) TO web_anon;


--
-- Name: FUNCTION get_beat_landuse(); Type: ACL; Schema: api; Owner: postgres
--

GRANT ALL ON FUNCTION api.get_beat_landuse() TO web_anon;


--
-- Name: FUNCTION get_beat_location(p_beat_id integer); Type: ACL; Schema: api; Owner: postgres
--

GRANT ALL ON FUNCTION api.get_beat_location(p_beat_id integer) TO web_anon;


--
-- Name: FUNCTION get_beat_survey(p_area_id integer); Type: ACL; Schema: api; Owner: postgres
--

GRANT ALL ON FUNCTION api.get_beat_survey(p_area_id integer) TO web_anon;


--
-- Name: FUNCTION get_beats(); Type: ACL; Schema: api; Owner: postgres
--

GRANT ALL ON FUNCTION api.get_beats() TO web_anon;


--
-- Name: FUNCTION get_beats_by_range(p_range_id integer); Type: ACL; Schema: api; Owner: postgres
--

GRANT ALL ON FUNCTION api.get_beats_by_range(p_range_id integer) TO web_anon;


--
-- Name: FUNCTION get_categories(); Type: ACL; Schema: api; Owner: postgres
--

GRANT ALL ON FUNCTION api.get_categories() TO web_anon;


--
-- Name: FUNCTION get_division(p_division_id integer); Type: ACL; Schema: api; Owner: postgres
--

GRANT ALL ON FUNCTION api.get_division(p_division_id integer) TO web_anon;


--
-- Name: FUNCTION get_divisions(); Type: ACL; Schema: api; Owner: postgres
--

GRANT ALL ON FUNCTION api.get_divisions() TO web_anon;


--
-- Name: FUNCTION get_iucn_status(); Type: ACL; Schema: api; Owner: postgres
--

GRANT ALL ON FUNCTION api.get_iucn_status() TO web_anon;


--
-- Name: FUNCTION get_nearby_plants(p_plant_id uuid, p_radius double precision); Type: ACL; Schema: api; Owner: postgres
--

GRANT ALL ON FUNCTION api.get_nearby_plants(p_plant_id uuid, p_radius double precision) TO web_anon;


--
-- Name: FUNCTION get_pending_users(); Type: ACL; Schema: api; Owner: postgres
--

GRANT ALL ON FUNCTION api.get_pending_users() TO web_anon;


--
-- Name: FUNCTION get_plant_by_id(p_plant_id uuid); Type: ACL; Schema: api; Owner: postgres
--

GRANT ALL ON FUNCTION api.get_plant_by_id(p_plant_id uuid) TO web_anon;


--
-- Name: FUNCTION get_plant_status(); Type: ACL; Schema: api; Owner: postgres
--

GRANT ALL ON FUNCTION api.get_plant_status() TO web_anon;


--
-- Name: FUNCTION get_plants(); Type: ACL; Schema: api; Owner: postgres
--

GRANT ALL ON FUNCTION api.get_plants() TO web_anon;


--
-- Name: FUNCTION get_population(); Type: ACL; Schema: api; Owner: postgres
--

GRANT ALL ON FUNCTION api.get_population() TO web_anon;


--
-- Name: FUNCTION get_population_by_unit(); Type: ACL; Schema: api; Owner: postgres
--

GRANT ALL ON FUNCTION api.get_population_by_unit() TO web_anon;


--
-- Name: FUNCTION get_ranges(); Type: ACL; Schema: api; Owner: postgres
--

GRANT ALL ON FUNCTION api.get_ranges() TO web_anon;


--
-- Name: FUNCTION get_ranges_by_division(p_division_id integer); Type: ACL; Schema: api; Owner: postgres
--

GRANT ALL ON FUNCTION api.get_ranges_by_division(p_division_id integer) TO web_anon;


--
-- Name: FUNCTION get_reset_requests(); Type: ACL; Schema: api; Owner: postgres
--

GRANT ALL ON FUNCTION api.get_reset_requests() TO web_anon;


--
-- Name: FUNCTION get_roads(); Type: ACL; Schema: api; Owner: postgres
--

GRANT ALL ON FUNCTION api.get_roads() TO web_anon;


--
-- Name: FUNCTION get_roads_summary(p_area_id integer); Type: ACL; Schema: api; Owner: postgres
--

GRANT ALL ON FUNCTION api.get_roads_summary(p_area_id integer) TO web_anon;


--
-- Name: FUNCTION get_species(); Type: ACL; Schema: api; Owner: postgres
--

GRANT ALL ON FUNCTION api.get_species() TO web_anon;


--
-- Name: FUNCTION get_species_by_id(p_species_id integer); Type: ACL; Schema: api; Owner: postgres
--

GRANT ALL ON FUNCTION api.get_species_by_id(p_species_id integer) TO web_anon;


--
-- Name: FUNCTION get_streams(); Type: ACL; Schema: api; Owner: postgres
--

GRANT ALL ON FUNCTION api.get_streams() TO web_anon;


--
-- Name: FUNCTION get_streams_in_unit(p_level text, p_name text); Type: ACL; Schema: api; Owner: postgres
--

GRANT ALL ON FUNCTION api.get_streams_in_unit(p_level text, p_name text) TO web_anon;


--
-- Name: FUNCTION get_streams_summary(p_area_id integer); Type: ACL; Schema: api; Owner: postgres
--

GRANT ALL ON FUNCTION api.get_streams_summary(p_area_id integer) TO web_anon;


--
-- Name: FUNCTION get_study_areas(); Type: ACL; Schema: api; Owner: postgres
--

GRANT ALL ON FUNCTION api.get_study_areas() TO web_anon;


--
-- Name: FUNCTION get_unit_geom(p_level text, p_id integer); Type: ACL; Schema: api; Owner: postgres
--

GRANT ALL ON FUNCTION api.get_unit_geom(p_level text, p_id integer) TO web_anon;


--
-- Name: FUNCTION get_users(); Type: ACL; Schema: api; Owner: postgres
--

GRANT ALL ON FUNCTION api.get_users() TO web_anon;


--
-- Name: FUNCTION login(p_username text, p_password text); Type: ACL; Schema: api; Owner: postgres
--

GRANT ALL ON FUNCTION api.login(p_username text, p_password text) TO web_anon;


--
-- Name: FUNCTION refresh_population(); Type: ACL; Schema: api; Owner: postgres
--

GRANT ALL ON FUNCTION api.refresh_population() TO web_anon;


--
-- Name: FUNCTION register_user(p_username text, p_full_name text, p_email text, p_mobile text, p_password text, p_designation text); Type: ACL; Schema: api; Owner: postgres
--

GRANT ALL ON FUNCTION api.register_user(p_username text, p_full_name text, p_email text, p_mobile text, p_password text, p_designation text) TO web_anon;


--
-- Name: FUNCTION reject_user(p_user_id integer); Type: ACL; Schema: api; Owner: postgres
--

GRANT ALL ON FUNCTION api.reject_user(p_user_id integer) TO web_anon;


--
-- Name: FUNCTION request_password_reset(p_identifier text, p_note text); Type: ACL; Schema: api; Owner: postgres
--

GRANT ALL ON FUNCTION api.request_password_reset(p_identifier text, p_note text) TO web_anon;


--
-- Name: FUNCTION reset_password(p_user_id integer, p_password text); Type: ACL; Schema: api; Owner: postgres
--

GRANT ALL ON FUNCTION api.reset_password(p_user_id integer, p_password text) TO web_anon;


--
-- Name: FUNCTION resolve_reset_request(p_request_id integer, p_resolved_by integer); Type: ACL; Schema: api; Owner: postgres
--

GRANT ALL ON FUNCTION api.resolve_reset_request(p_request_id integer, p_resolved_by integer) TO web_anon;


--
-- Name: FUNCTION set_beat_geom(p_beat_id integer, p_geojson text); Type: ACL; Schema: api; Owner: postgres
--

GRANT ALL ON FUNCTION api.set_beat_geom(p_beat_id integer, p_geojson text) TO web_anon;


--
-- Name: FUNCTION set_division_geom(p_division_id integer, p_geojson text); Type: ACL; Schema: api; Owner: postgres
--

GRANT ALL ON FUNCTION api.set_division_geom(p_division_id integer, p_geojson text) TO web_anon;


--
-- Name: FUNCTION set_range_geom(p_range_id integer, p_geojson text); Type: ACL; Schema: api; Owner: postgres
--

GRANT ALL ON FUNCTION api.set_range_geom(p_range_id integer, p_geojson text) TO web_anon;


--
-- Name: FUNCTION update_beat(p_beat_id integer, p_range_id integer, p_beat_name character varying, p_description text, p_is_active boolean); Type: ACL; Schema: api; Owner: postgres
--

GRANT ALL ON FUNCTION api.update_beat(p_beat_id integer, p_range_id integer, p_beat_name character varying, p_description text, p_is_active boolean) TO web_anon;


--
-- Name: FUNCTION update_division(p_division_id integer, p_division_name character varying, p_description text, p_is_active boolean); Type: ACL; Schema: api; Owner: postgres
--

GRANT ALL ON FUNCTION api.update_division(p_division_id integer, p_division_name character varying, p_description text, p_is_active boolean) TO web_anon;


--
-- Name: FUNCTION update_plant(p_plant_id uuid, p_species_id integer, p_beat_id integer, p_observed_on date, p_observed_by character varying, p_condition_id integer, p_age_class character varying, p_latitude double precision, p_longitude double precision, p_gps_accuracy double precision, p_photo_path character varying, p_remarks text); Type: ACL; Schema: api; Owner: postgres
--

GRANT ALL ON FUNCTION api.update_plant(p_plant_id uuid, p_species_id integer, p_beat_id integer, p_observed_on date, p_observed_by character varying, p_condition_id integer, p_age_class character varying, p_latitude double precision, p_longitude double precision, p_gps_accuracy double precision, p_photo_path character varying, p_remarks text) TO web_anon;


--
-- Name: FUNCTION update_range(p_range_id integer, p_division_id integer, p_range_name character varying, p_description text, p_is_active boolean); Type: ACL; Schema: api; Owner: postgres
--

GRANT ALL ON FUNCTION api.update_range(p_range_id integer, p_division_id integer, p_range_name character varying, p_description text, p_is_active boolean) TO web_anon;


--
-- Name: FUNCTION update_species(p_species_id integer, p_scientific_name character varying, p_common_name character varying, p_family character varying, p_category_id integer, p_iucn_status_id integer, p_origin_type character varying); Type: ACL; Schema: api; Owner: postgres
--

GRANT ALL ON FUNCTION api.update_species(p_species_id integer, p_scientific_name character varying, p_common_name character varying, p_family character varying, p_category_id integer, p_iucn_status_id integer, p_origin_type character varying) TO web_anon;


--
-- Name: FUNCTION update_user(p_user_id integer, p_full_name text, p_role text, p_is_active boolean); Type: ACL; Schema: api; Owner: postgres
--

GRANT ALL ON FUNCTION api.update_user(p_user_id integer, p_full_name text, p_role text, p_is_active boolean) TO web_anon;


--
-- Name: FUNCTION update_user_profile(p_user_id integer, p_full_name text, p_email text, p_mobile text, p_designation text); Type: ACL; Schema: api; Owner: postgres
--

GRANT ALL ON FUNCTION api.update_user_profile(p_user_id integer, p_full_name text, p_email text, p_mobile text, p_designation text) TO web_anon;


--
-- Name: FUNCTION validate_reset_token(p_token text); Type: ACL; Schema: api; Owner: postgres
--

GRANT ALL ON FUNCTION api.validate_reset_token(p_token text) TO web_anon;


--
-- PostgreSQL database dump complete
--

\unrestrict Ygee91NnjdKD0VIvdRebnm0fgekd3tRsTQx0s3Pf9ROerk9ccIpNPlur8fEgfRf

