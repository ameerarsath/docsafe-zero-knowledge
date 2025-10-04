--
-- PostgreSQL database dump
--

-- Dumped from database version 15.13
-- Dumped by pg_dump version 17.0

-- Started on 2025-10-04 10:31:45

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

DROP DATABASE securevault;
--
-- TOC entry 4000 (class 1262 OID 24629)
-- Name: securevault; Type: DATABASE; Schema: -; Owner: securevault_user
--

CREATE DATABASE securevault WITH TEMPLATE = template0 ENCODING = 'UTF8' LOCALE_PROVIDER = libc LOCALE = 'en_US.utf8';


ALTER DATABASE securevault OWNER TO securevault_user;

\connect securevault

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
-- TOC entry 8 (class 2615 OID 24630)
-- Name: docsafe; Type: SCHEMA; Schema: -; Owner: securevault_user
--

CREATE SCHEMA docsafe;


ALTER SCHEMA docsafe OWNER TO securevault_user;

--
-- TOC entry 6 (class 2615 OID 2200)
-- Name: public; Type: SCHEMA; Schema: -; Owner: pg_database_owner
--

CREATE SCHEMA public;


ALTER SCHEMA public OWNER TO pg_database_owner;

--
-- TOC entry 4003 (class 0 OID 0)
-- Dependencies: 6
-- Name: SCHEMA public; Type: COMMENT; Schema: -; Owner: pg_database_owner
--

COMMENT ON SCHEMA public IS 'standard public schema';


--
-- TOC entry 941 (class 1247 OID 24680)
-- Name: eventstatus; Type: TYPE; Schema: public; Owner: securevault_user
--

CREATE TYPE public.eventstatus AS ENUM (
    'ACTIVE',
    'INVESTIGATING',
    'RESOLVED',
    'FALSE_POSITIVE'
);


ALTER TYPE public.eventstatus OWNER TO securevault_user;

--
-- TOC entry 944 (class 1247 OID 24690)
-- Name: responseaction; Type: TYPE; Schema: public; Owner: securevault_user
--

CREATE TYPE public.responseaction AS ENUM (
    'LOG_ONLY',
    'ALERT',
    'RATE_LIMIT',
    'BLOCK_IP',
    'DISABLE_USER',
    'REQUIRE_MFA'
);


ALTER TYPE public.responseaction OWNER TO securevault_user;

--
-- TOC entry 947 (class 1247 OID 24704)
-- Name: threatlevel; Type: TYPE; Schema: public; Owner: securevault_user
--

CREATE TYPE public.threatlevel AS ENUM (
    'LOW',
    'MEDIUM',
    'HIGH',
    'CRITICAL'
);


ALTER TYPE public.threatlevel OWNER TO securevault_user;

SET default_tablespace = '';

SET default_table_access_method = heap;

--
-- TOC entry 217 (class 1259 OID 24713)
-- Name: alembic_version; Type: TABLE; Schema: public; Owner: securevault_user
--

CREATE TABLE public.alembic_version (
    version_num character varying(32) NOT NULL
);


ALTER TABLE public.alembic_version OWNER TO securevault_user;

--
-- TOC entry 218 (class 1259 OID 24716)
-- Name: crypto_randomness_tests; Type: TABLE; Schema: public; Owner: securevault_user
--

CREATE TABLE public.crypto_randomness_tests (
    id integer NOT NULL,
    test_type character varying(50) NOT NULL,
    test_timestamp timestamp with time zone DEFAULT now() NOT NULL,
    sample_size integer NOT NULL,
    test_parameters json,
    test_passed boolean NOT NULL,
    test_score double precision,
    p_value double precision,
    entropy_bits double precision,
    quality_grade character varying(10),
    details json,
    recommendations text
);


ALTER TABLE public.crypto_randomness_tests OWNER TO securevault_user;

--
-- TOC entry 219 (class 1259 OID 24722)
-- Name: crypto_randomness_tests_id_seq; Type: SEQUENCE; Schema: public; Owner: securevault_user
--

CREATE SEQUENCE public.crypto_randomness_tests_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE public.crypto_randomness_tests_id_seq OWNER TO securevault_user;

--
-- TOC entry 4004 (class 0 OID 0)
-- Dependencies: 219
-- Name: crypto_randomness_tests_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: securevault_user
--

ALTER SEQUENCE public.crypto_randomness_tests_id_seq OWNED BY public.crypto_randomness_tests.id;


--
-- TOC entry 220 (class 1259 OID 24723)
-- Name: document_access_logs; Type: TABLE; Schema: public; Owner: securevault_user
--

CREATE TABLE public.document_access_logs (
    id integer NOT NULL,
    document_id integer NOT NULL,
    user_id integer,
    action character varying(50) NOT NULL,
    access_method character varying(50),
    success boolean NOT NULL,
    ip_address character varying(45),
    user_agent text,
    referer character varying(500),
    accessed_at timestamp with time zone DEFAULT now() NOT NULL,
    duration_ms integer,
    details jsonb,
    error_message text,
    CONSTRAINT check_action_type CHECK (((action)::text = ANY (ARRAY[('read'::character varying)::text, ('write'::character varying)::text, ('delete'::character varying)::text, ('share'::character varying)::text, ('download'::character varying)::text, ('preview'::character varying)::text, ('move'::character varying)::text, ('copy'::character varying)::text, ('recover'::character varying)::text])))
);


ALTER TABLE public.document_access_logs OWNER TO securevault_user;

--
-- TOC entry 221 (class 1259 OID 24730)
-- Name: document_access_logs_id_seq; Type: SEQUENCE; Schema: public; Owner: securevault_user
--

CREATE SEQUENCE public.document_access_logs_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE public.document_access_logs_id_seq OWNER TO securevault_user;

--
-- TOC entry 4005 (class 0 OID 0)
-- Dependencies: 221
-- Name: document_access_logs_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: securevault_user
--

ALTER SEQUENCE public.document_access_logs_id_seq OWNED BY public.document_access_logs.id;


--
-- TOC entry 222 (class 1259 OID 24731)
-- Name: document_permissions; Type: TABLE; Schema: public; Owner: securevault_user
--

CREATE TABLE public.document_permissions (
    id integer NOT NULL,
    document_id integer NOT NULL,
    user_id integer NOT NULL,
    permission_type character varying(50) NOT NULL,
    granted boolean NOT NULL,
    inheritable boolean NOT NULL,
    granted_at timestamp with time zone DEFAULT now() NOT NULL,
    expires_at timestamp with time zone,
    granted_by integer NOT NULL,
    revoked_by integer,
    revoked_at timestamp with time zone,
    conditions jsonb,
    CONSTRAINT check_permission_type CHECK (((permission_type)::text = ANY (ARRAY[('read'::character varying)::text, ('write'::character varying)::text, ('delete'::character varying)::text, ('admin'::character varying)::text, ('share'::character varying)::text])))
);


ALTER TABLE public.document_permissions OWNER TO securevault_user;

--
-- TOC entry 223 (class 1259 OID 24738)
-- Name: document_permissions_id_seq; Type: SEQUENCE; Schema: public; Owner: securevault_user
--

CREATE SEQUENCE public.document_permissions_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE public.document_permissions_id_seq OWNER TO securevault_user;

--
-- TOC entry 4006 (class 0 OID 0)
-- Dependencies: 223
-- Name: document_permissions_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: securevault_user
--

ALTER SEQUENCE public.document_permissions_id_seq OWNED BY public.document_permissions.id;


--
-- TOC entry 224 (class 1259 OID 24739)
-- Name: document_shares; Type: TABLE; Schema: public; Owner: securevault_user
--

CREATE TABLE public.document_shares (
    id integer NOT NULL,
    uuid uuid NOT NULL,
    document_id integer NOT NULL,
    share_token character varying(100) NOT NULL,
    share_name character varying(100),
    share_type character varying(20) NOT NULL,
    allow_download boolean NOT NULL,
    allow_preview boolean NOT NULL,
    allow_comment boolean NOT NULL,
    require_password boolean NOT NULL,
    password_hash character varying(100),
    encryption_password character varying(255),
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    expires_at timestamp with time zone,
    accessed_at timestamp with time zone,
    access_count integer NOT NULL,
    max_access_count integer,
    created_by integer NOT NULL,
    is_active boolean NOT NULL,
    revoked_at timestamp with time zone,
    revoked_by integer,
    last_accessed_ip character varying(45),
    last_accessed_user_agent text,
    access_restrictions jsonb,
    CONSTRAINT check_access_count_positive CHECK ((access_count >= 0)),
    CONSTRAINT check_share_type CHECK (((share_type)::text = ANY (ARRAY[('private'::character varying)::text, ('internal'::character varying)::text, ('external'::character varying)::text, ('public'::character varying)::text])))
);


ALTER TABLE public.document_shares OWNER TO securevault_user;

--
-- TOC entry 225 (class 1259 OID 24747)
-- Name: document_shares_id_seq; Type: SEQUENCE; Schema: public; Owner: securevault_user
--

CREATE SEQUENCE public.document_shares_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE public.document_shares_id_seq OWNER TO securevault_user;

--
-- TOC entry 4007 (class 0 OID 0)
-- Dependencies: 225
-- Name: document_shares_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: securevault_user
--

ALTER SEQUENCE public.document_shares_id_seq OWNED BY public.document_shares.id;


--
-- TOC entry 226 (class 1259 OID 24748)
-- Name: document_versions; Type: TABLE; Schema: public; Owner: securevault_user
--

CREATE TABLE public.document_versions (
    id integer NOT NULL,
    document_id integer NOT NULL,
    version_number integer NOT NULL,
    version_name character varying(100),
    change_description text,
    file_size bigint NOT NULL,
    file_hash_sha256 character varying(64) NOT NULL,
    storage_path character varying(500) NOT NULL,
    encryption_key_id character varying(100),
    encryption_iv bytea,
    encryption_auth_tag bytea,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    created_by integer NOT NULL,
    is_current boolean NOT NULL,
    CONSTRAINT check_file_size_positive CHECK ((file_size >= 0)),
    CONSTRAINT check_version_number_positive CHECK ((version_number > 0))
);


ALTER TABLE public.document_versions OWNER TO securevault_user;

--
-- TOC entry 227 (class 1259 OID 24756)
-- Name: document_versions_id_seq; Type: SEQUENCE; Schema: public; Owner: securevault_user
--

CREATE SEQUENCE public.document_versions_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE public.document_versions_id_seq OWNER TO securevault_user;

--
-- TOC entry 4008 (class 0 OID 0)
-- Dependencies: 227
-- Name: document_versions_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: securevault_user
--

ALTER SEQUENCE public.document_versions_id_seq OWNED BY public.document_versions.id;


--
-- TOC entry 228 (class 1259 OID 24757)
-- Name: documents; Type: TABLE; Schema: public; Owner: securevault_user
--

CREATE TABLE public.documents (
    id integer NOT NULL,
    uuid uuid NOT NULL,
    name character varying(255) NOT NULL,
    description text,
    document_type character varying(20) NOT NULL,
    mime_type character varying(100),
    original_filename character varying(255),
    file_extension character varying(20),
    file_size bigint,
    file_hash_sha256 character varying(64),
    storage_path character varying(500),
    storage_backend character varying(50),
    encryption_algorithm character varying(50),
    encryption_key_id character varying(100),
    encrypted_dek text,
    encryption_iv character varying(255),
    encryption_auth_tag character varying(255),
    encryption_key bytea,
    encryption_salt bytea,
    is_encrypted boolean NOT NULL,
    parent_id integer,
    path character varying(1000),
    depth_level integer,
    owner_id integer NOT NULL,
    created_by integer NOT NULL,
    updated_by integer,
    status character varying(20) NOT NULL,
    share_type character varying(20) NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now(),
    accessed_at timestamp with time zone,
    archived_at timestamp with time zone,
    deleted_at timestamp with time zone,
    is_shared boolean NOT NULL,
    share_expires_at timestamp with time zone,
    allow_download boolean NOT NULL,
    allow_preview boolean NOT NULL,
    version_number integer NOT NULL,
    is_latest_version boolean NOT NULL,
    previous_version_id integer,
    doc_metadata jsonb,
    tags jsonb,
    is_sensitive boolean NOT NULL,
    retention_policy_id character varying(50),
    compliance_flags jsonb,
    child_count integer,
    total_size bigint,
    CONSTRAINT check_child_count_positive CHECK ((child_count >= 0)),
    CONSTRAINT check_depth_level_positive CHECK ((depth_level >= 0)),
    CONSTRAINT check_document_type CHECK (((document_type)::text = ANY (ARRAY[('document'::character varying)::text, ('folder'::character varying)::text]))),
    CONSTRAINT check_file_size_positive CHECK ((file_size >= 0)),
    CONSTRAINT check_share_type CHECK (((share_type)::text = ANY (ARRAY[('private'::character varying)::text, ('internal'::character varying)::text, ('external'::character varying)::text, ('public'::character varying)::text]))),
    CONSTRAINT check_status CHECK (((status)::text = ANY (ARRAY[('active'::character varying)::text, ('archived'::character varying)::text, ('deleted'::character varying)::text, ('quarantined'::character varying)::text]))),
    CONSTRAINT check_total_size_positive CHECK ((total_size >= 0)),
    CONSTRAINT check_version_positive CHECK ((version_number > 0))
);


ALTER TABLE public.documents OWNER TO securevault_user;

--
-- TOC entry 229 (class 1259 OID 24772)
-- Name: documents_id_seq; Type: SEQUENCE; Schema: public; Owner: securevault_user
--

CREATE SEQUENCE public.documents_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE public.documents_id_seq OWNER TO securevault_user;

--
-- TOC entry 4009 (class 0 OID 0)
-- Dependencies: 229
-- Name: documents_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: securevault_user
--

ALTER SEQUENCE public.documents_id_seq OWNED BY public.documents.id;


--
-- TOC entry 230 (class 1259 OID 24773)
-- Name: encryption_audit_logs; Type: TABLE; Schema: public; Owner: securevault_user
--

CREATE TABLE public.encryption_audit_logs (
    id integer NOT NULL,
    user_id integer NOT NULL,
    key_id character varying(255),
    action character varying(100) NOT NULL,
    operation_id character varying(36) NOT NULL,
    ip_address character varying(45),
    user_agent character varying(500),
    session_id character varying(255),
    success boolean NOT NULL,
    error_code character varying(50),
    error_message text,
    details json,
    risk_score integer,
    "timestamp" timestamp with time zone DEFAULT now() NOT NULL,
    duration_ms integer
);


ALTER TABLE public.encryption_audit_logs OWNER TO securevault_user;

--
-- TOC entry 231 (class 1259 OID 24779)
-- Name: encryption_audit_logs_id_seq; Type: SEQUENCE; Schema: public; Owner: securevault_user
--

CREATE SEQUENCE public.encryption_audit_logs_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE public.encryption_audit_logs_id_seq OWNER TO securevault_user;

--
-- TOC entry 4010 (class 0 OID 0)
-- Dependencies: 231
-- Name: encryption_audit_logs_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: securevault_user
--

ALTER SEQUENCE public.encryption_audit_logs_id_seq OWNED BY public.encryption_audit_logs.id;


--
-- TOC entry 232 (class 1259 OID 24780)
-- Name: ip_blocklist; Type: TABLE; Schema: public; Owner: securevault_user
--

CREATE TABLE public.ip_blocklist (
    id integer NOT NULL,
    ip_address character varying(45) NOT NULL,
    reason character varying(255) NOT NULL,
    blocked_at timestamp with time zone DEFAULT now() NOT NULL,
    blocked_by character varying(100) NOT NULL,
    expires_at timestamp with time zone,
    is_permanent boolean NOT NULL,
    block_count integer NOT NULL,
    last_attempt timestamp with time zone,
    event_id character varying(36),
    manually_removed boolean NOT NULL,
    removed_at timestamp with time zone,
    removed_by integer,
    removal_reason character varying(255)
);


ALTER TABLE public.ip_blocklist OWNER TO securevault_user;

--
-- TOC entry 233 (class 1259 OID 24786)
-- Name: ip_blocklist_id_seq; Type: SEQUENCE; Schema: public; Owner: securevault_user
--

CREATE SEQUENCE public.ip_blocklist_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE public.ip_blocklist_id_seq OWNER TO securevault_user;

--
-- TOC entry 4011 (class 0 OID 0)
-- Dependencies: 233
-- Name: ip_blocklist_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: securevault_user
--

ALTER SEQUENCE public.ip_blocklist_id_seq OWNED BY public.ip_blocklist.id;


--
-- TOC entry 234 (class 1259 OID 24787)
-- Name: key_escrow; Type: TABLE; Schema: public; Owner: securevault_user
--

CREATE TABLE public.key_escrow (
    id integer NOT NULL,
    key_id character varying(255) NOT NULL,
    user_id integer NOT NULL,
    master_key_id character varying(255),
    escrow_data bytea NOT NULL,
    escrow_method character varying(50) NOT NULL,
    escrow_parameters json,
    recovery_hint character varying(500),
    recovery_threshold integer,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    created_by integer NOT NULL,
    recovered_at timestamp with time zone,
    recovered_by integer,
    recovery_reason character varying(500)
);


ALTER TABLE public.key_escrow OWNER TO securevault_user;

--
-- TOC entry 235 (class 1259 OID 24793)
-- Name: key_escrow_id_seq; Type: SEQUENCE; Schema: public; Owner: securevault_user
--

CREATE SEQUENCE public.key_escrow_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE public.key_escrow_id_seq OWNER TO securevault_user;

--
-- TOC entry 4012 (class 0 OID 0)
-- Dependencies: 235
-- Name: key_escrow_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: securevault_user
--

ALTER SEQUENCE public.key_escrow_id_seq OWNED BY public.key_escrow.id;


--
-- TOC entry 236 (class 1259 OID 24794)
-- Name: key_rotation_logs; Type: TABLE; Schema: public; Owner: securevault_user
--

CREATE TABLE public.key_rotation_logs (
    id integer NOT NULL,
    old_key_id character varying(255) NOT NULL,
    new_key_id character varying(255) NOT NULL,
    user_id integer NOT NULL,
    rotation_type character varying(50) NOT NULL,
    rotation_reason character varying(500) NOT NULL,
    documents_migrated integer NOT NULL,
    documents_total integer NOT NULL,
    migration_completed boolean NOT NULL,
    started_at timestamp with time zone DEFAULT now() NOT NULL,
    completed_at timestamp with time zone,
    status character varying(50) NOT NULL,
    error_message text
);


ALTER TABLE public.key_rotation_logs OWNER TO securevault_user;

--
-- TOC entry 237 (class 1259 OID 24800)
-- Name: key_rotation_logs_id_seq; Type: SEQUENCE; Schema: public; Owner: securevault_user
--

CREATE SEQUENCE public.key_rotation_logs_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE public.key_rotation_logs_id_seq OWNER TO securevault_user;

--
-- TOC entry 4013 (class 0 OID 0)
-- Dependencies: 237
-- Name: key_rotation_logs_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: securevault_user
--

ALTER SEQUENCE public.key_rotation_logs_id_seq OWNED BY public.key_rotation_logs.id;


--
-- TOC entry 238 (class 1259 OID 24801)
-- Name: master_keys; Type: TABLE; Schema: public; Owner: securevault_user
--

CREATE TABLE public.master_keys (
    id integer NOT NULL,
    key_id character varying(255) NOT NULL,
    purpose character varying(100) NOT NULL,
    algorithm character varying(50) NOT NULL,
    key_material bytea NOT NULL,
    protection_method character varying(50) NOT NULL,
    protection_parameters json,
    is_active boolean NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    created_by integer NOT NULL,
    expires_at timestamp with time zone,
    previous_key_id character varying(255),
    next_rotation_at timestamp with time zone
);


ALTER TABLE public.master_keys OWNER TO securevault_user;

--
-- TOC entry 239 (class 1259 OID 24807)
-- Name: master_keys_id_seq; Type: SEQUENCE; Schema: public; Owner: securevault_user
--

CREATE SEQUENCE public.master_keys_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE public.master_keys_id_seq OWNER TO securevault_user;

--
-- TOC entry 4014 (class 0 OID 0)
-- Dependencies: 239
-- Name: master_keys_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: securevault_user
--

ALTER SEQUENCE public.master_keys_id_seq OWNED BY public.master_keys.id;


--
-- TOC entry 240 (class 1259 OID 24808)
-- Name: mfa_audit_logs; Type: TABLE; Schema: public; Owner: securevault_user
--

CREATE TABLE public.mfa_audit_logs (
    id integer NOT NULL,
    user_id integer NOT NULL,
    event_type character varying(50) NOT NULL,
    event_result character varying(20) NOT NULL,
    event_details text,
    ip_address character varying(45),
    user_agent character varying(500),
    session_id character varying(255),
    performed_by integer,
    created_at timestamp without time zone NOT NULL
);


ALTER TABLE public.mfa_audit_logs OWNER TO securevault_user;

--
-- TOC entry 241 (class 1259 OID 24813)
-- Name: mfa_audit_logs_id_seq; Type: SEQUENCE; Schema: public; Owner: securevault_user
--

CREATE SEQUENCE public.mfa_audit_logs_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE public.mfa_audit_logs_id_seq OWNER TO securevault_user;

--
-- TOC entry 4015 (class 0 OID 0)
-- Dependencies: 241
-- Name: mfa_audit_logs_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: securevault_user
--

ALTER SEQUENCE public.mfa_audit_logs_id_seq OWNED BY public.mfa_audit_logs.id;


--
-- TOC entry 242 (class 1259 OID 24814)
-- Name: mfa_configuration; Type: TABLE; Schema: public; Owner: securevault_user
--

CREATE TABLE public.mfa_configuration (
    id integer NOT NULL,
    require_mfa_for_roles text,
    mfa_grace_period_hours integer NOT NULL,
    backup_codes_count integer NOT NULL,
    totp_window_tolerance integer NOT NULL,
    max_failed_attempts integer NOT NULL,
    lockout_duration_minutes integer NOT NULL,
    created_at timestamp without time zone NOT NULL,
    updated_at timestamp without time zone NOT NULL,
    updated_by integer
);


ALTER TABLE public.mfa_configuration OWNER TO securevault_user;

--
-- TOC entry 243 (class 1259 OID 24819)
-- Name: mfa_configuration_id_seq; Type: SEQUENCE; Schema: public; Owner: securevault_user
--

CREATE SEQUENCE public.mfa_configuration_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE public.mfa_configuration_id_seq OWNER TO securevault_user;

--
-- TOC entry 4016 (class 0 OID 0)
-- Dependencies: 243
-- Name: mfa_configuration_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: securevault_user
--

ALTER SEQUENCE public.mfa_configuration_id_seq OWNED BY public.mfa_configuration.id;


--
-- TOC entry 244 (class 1259 OID 24820)
-- Name: mfa_failed_attempts; Type: TABLE; Schema: public; Owner: securevault_user
--

CREATE TABLE public.mfa_failed_attempts (
    id integer NOT NULL,
    user_id integer NOT NULL,
    attempt_type character varying(20) NOT NULL,
    ip_address character varying(45),
    user_agent character varying(500),
    attempted_at timestamp without time zone NOT NULL
);


ALTER TABLE public.mfa_failed_attempts OWNER TO securevault_user;

--
-- TOC entry 245 (class 1259 OID 24825)
-- Name: mfa_failed_attempts_id_seq; Type: SEQUENCE; Schema: public; Owner: securevault_user
--

CREATE SEQUENCE public.mfa_failed_attempts_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE public.mfa_failed_attempts_id_seq OWNER TO securevault_user;

--
-- TOC entry 4017 (class 0 OID 0)
-- Dependencies: 245
-- Name: mfa_failed_attempts_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: securevault_user
--

ALTER SEQUENCE public.mfa_failed_attempts_id_seq OWNED BY public.mfa_failed_attempts.id;


--
-- TOC entry 246 (class 1259 OID 24826)
-- Name: mfa_used_codes; Type: TABLE; Schema: public; Owner: securevault_user
--

CREATE TABLE public.mfa_used_codes (
    id integer NOT NULL,
    user_id integer NOT NULL,
    code_hash character varying(255) NOT NULL,
    time_window integer NOT NULL,
    used_at timestamp without time zone NOT NULL,
    expires_at timestamp without time zone NOT NULL
);


ALTER TABLE public.mfa_used_codes OWNER TO securevault_user;

--
-- TOC entry 247 (class 1259 OID 24829)
-- Name: mfa_used_codes_id_seq; Type: SEQUENCE; Schema: public; Owner: securevault_user
--

CREATE SEQUENCE public.mfa_used_codes_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE public.mfa_used_codes_id_seq OWNER TO securevault_user;

--
-- TOC entry 4018 (class 0 OID 0)
-- Dependencies: 247
-- Name: mfa_used_codes_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: securevault_user
--

ALTER SEQUENCE public.mfa_used_codes_id_seq OWNED BY public.mfa_used_codes.id;


--
-- TOC entry 248 (class 1259 OID 24830)
-- Name: permissions; Type: TABLE; Schema: public; Owner: securevault_user
--

CREATE TABLE public.permissions (
    id integer NOT NULL,
    name character varying(100) NOT NULL,
    display_name character varying(100),
    description text,
    resource_type character varying(50) NOT NULL,
    action character varying(50) NOT NULL,
    is_system boolean NOT NULL,
    requires_resource_ownership boolean NOT NULL,
    created_at timestamp without time zone NOT NULL,
    updated_at timestamp without time zone NOT NULL
);


ALTER TABLE public.permissions OWNER TO securevault_user;

--
-- TOC entry 249 (class 1259 OID 24835)
-- Name: permissions_id_seq; Type: SEQUENCE; Schema: public; Owner: securevault_user
--

CREATE SEQUENCE public.permissions_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE public.permissions_id_seq OWNER TO securevault_user;

--
-- TOC entry 4019 (class 0 OID 0)
-- Dependencies: 249
-- Name: permissions_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: securevault_user
--

ALTER SEQUENCE public.permissions_id_seq OWNED BY public.permissions.id;


--
-- TOC entry 250 (class 1259 OID 24836)
-- Name: resource_permissions; Type: TABLE; Schema: public; Owner: securevault_user
--

CREATE TABLE public.resource_permissions (
    id integer NOT NULL,
    resource_type character varying(50) NOT NULL,
    resource_id integer NOT NULL,
    subject_type character varying(20) NOT NULL,
    subject_id integer NOT NULL,
    permission character varying(50) NOT NULL,
    granted boolean NOT NULL,
    inheritable boolean NOT NULL,
    inherited_from integer,
    granted_at timestamp without time zone NOT NULL,
    granted_by integer,
    expires_at timestamp without time zone,
    conditions text
);


ALTER TABLE public.resource_permissions OWNER TO securevault_user;

--
-- TOC entry 251 (class 1259 OID 24841)
-- Name: resource_permissions_id_seq; Type: SEQUENCE; Schema: public; Owner: securevault_user
--

CREATE SEQUENCE public.resource_permissions_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE public.resource_permissions_id_seq OWNER TO securevault_user;

--
-- TOC entry 4020 (class 0 OID 0)
-- Dependencies: 251
-- Name: resource_permissions_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: securevault_user
--

ALTER SEQUENCE public.resource_permissions_id_seq OWNED BY public.resource_permissions.id;


--
-- TOC entry 252 (class 1259 OID 24842)
-- Name: role_hierarchy; Type: TABLE; Schema: public; Owner: securevault_user
--

CREATE TABLE public.role_hierarchy (
    id integer NOT NULL,
    parent_role_id integer NOT NULL,
    child_role_id integer NOT NULL,
    inherit_permissions boolean NOT NULL,
    inherit_resource_access boolean NOT NULL,
    created_at timestamp without time zone NOT NULL,
    created_by integer
);


ALTER TABLE public.role_hierarchy OWNER TO securevault_user;

--
-- TOC entry 253 (class 1259 OID 24845)
-- Name: role_hierarchy_id_seq; Type: SEQUENCE; Schema: public; Owner: securevault_user
--

CREATE SEQUENCE public.role_hierarchy_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE public.role_hierarchy_id_seq OWNER TO securevault_user;

--
-- TOC entry 4021 (class 0 OID 0)
-- Dependencies: 253
-- Name: role_hierarchy_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: securevault_user
--

ALTER SEQUENCE public.role_hierarchy_id_seq OWNED BY public.role_hierarchy.id;


--
-- TOC entry 254 (class 1259 OID 24846)
-- Name: role_permissions; Type: TABLE; Schema: public; Owner: securevault_user
--

CREATE TABLE public.role_permissions (
    role_id integer NOT NULL,
    permission_id integer NOT NULL,
    granted_at timestamp without time zone NOT NULL,
    granted_by integer,
    conditions text,
    expires_at timestamp without time zone
);


ALTER TABLE public.role_permissions OWNER TO securevault_user;

--
-- TOC entry 255 (class 1259 OID 24851)
-- Name: roles; Type: TABLE; Schema: public; Owner: securevault_user
--

CREATE TABLE public.roles (
    id integer NOT NULL,
    name character varying(50) NOT NULL,
    display_name character varying(100),
    description text,
    hierarchy_level integer NOT NULL,
    is_system boolean NOT NULL,
    is_active boolean NOT NULL,
    created_at timestamp without time zone NOT NULL,
    updated_at timestamp without time zone NOT NULL,
    created_by integer
);


ALTER TABLE public.roles OWNER TO securevault_user;

--
-- TOC entry 256 (class 1259 OID 24856)
-- Name: roles_id_seq; Type: SEQUENCE; Schema: public; Owner: securevault_user
--

CREATE SEQUENCE public.roles_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE public.roles_id_seq OWNER TO securevault_user;

--
-- TOC entry 4022 (class 0 OID 0)
-- Dependencies: 256
-- Name: roles_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: securevault_user
--

ALTER SEQUENCE public.roles_id_seq OWNED BY public.roles.id;


--
-- TOC entry 257 (class 1259 OID 24857)
-- Name: security_alerts; Type: TABLE; Schema: public; Owner: securevault_user
--

CREATE TABLE public.security_alerts (
    id integer NOT NULL,
    alert_id character varying(36) NOT NULL,
    event_id character varying(36) NOT NULL,
    alert_type character varying(100) NOT NULL,
    recipient character varying(255) NOT NULL,
    subject character varying(255) NOT NULL,
    message text NOT NULL,
    sent_at timestamp with time zone,
    delivered_at timestamp with time zone,
    delivery_status character varying(50) NOT NULL,
    delivery_error text,
    viewed_at timestamp with time zone,
    acknowledged_at timestamp with time zone,
    acknowledged_by integer
);


ALTER TABLE public.security_alerts OWNER TO securevault_user;

--
-- TOC entry 258 (class 1259 OID 24862)
-- Name: security_alerts_id_seq; Type: SEQUENCE; Schema: public; Owner: securevault_user
--

CREATE SEQUENCE public.security_alerts_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE public.security_alerts_id_seq OWNER TO securevault_user;

--
-- TOC entry 4023 (class 0 OID 0)
-- Dependencies: 258
-- Name: security_alerts_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: securevault_user
--

ALTER SEQUENCE public.security_alerts_id_seq OWNED BY public.security_alerts.id;


--
-- TOC entry 259 (class 1259 OID 24863)
-- Name: security_events; Type: TABLE; Schema: public; Owner: securevault_user
--

CREATE TABLE public.security_events (
    id integer NOT NULL,
    event_id character varying(36) NOT NULL,
    event_type character varying(100) NOT NULL,
    threat_level public.threatlevel NOT NULL,
    status public.eventstatus NOT NULL,
    title character varying(255) NOT NULL,
    description text NOT NULL,
    source_ip character varying(45),
    user_id integer,
    document_id integer,
    risk_score double precision NOT NULL,
    confidence double precision NOT NULL,
    detection_method character varying(100) NOT NULL,
    detection_rule character varying(255),
    user_agent character varying(500),
    session_id character varying(255),
    additional_data json,
    related_events json,
    correlation_id character varying(36),
    detected_at timestamp with time zone DEFAULT now() NOT NULL,
    first_seen timestamp with time zone,
    last_seen timestamp with time zone,
    resolved_at timestamp with time zone,
    resolved_by integer,
    resolution_notes text
);


ALTER TABLE public.security_events OWNER TO securevault_user;

--
-- TOC entry 260 (class 1259 OID 24869)
-- Name: security_events_id_seq; Type: SEQUENCE; Schema: public; Owner: securevault_user
--

CREATE SEQUENCE public.security_events_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE public.security_events_id_seq OWNER TO securevault_user;

--
-- TOC entry 4024 (class 0 OID 0)
-- Dependencies: 260
-- Name: security_events_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: securevault_user
--

ALTER SEQUENCE public.security_events_id_seq OWNED BY public.security_events.id;


--
-- TOC entry 261 (class 1259 OID 24870)
-- Name: security_metrics; Type: TABLE; Schema: public; Owner: securevault_user
--

CREATE TABLE public.security_metrics (
    id integer NOT NULL,
    metric_date timestamp with time zone NOT NULL,
    total_events integer NOT NULL,
    critical_events integer NOT NULL,
    high_events integer NOT NULL,
    medium_events integer NOT NULL,
    low_events integer NOT NULL,
    automated_responses integer NOT NULL,
    blocked_ips integer NOT NULL,
    disabled_users integer NOT NULL,
    average_detection_time_seconds double precision,
    average_response_time_seconds double precision,
    false_positive_rate double precision,
    highest_risk_score double precision,
    average_risk_score double precision,
    unique_threat_sources integer NOT NULL,
    metrics_data json
);


ALTER TABLE public.security_metrics OWNER TO securevault_user;

--
-- TOC entry 262 (class 1259 OID 24875)
-- Name: security_metrics_id_seq; Type: SEQUENCE; Schema: public; Owner: securevault_user
--

CREATE SEQUENCE public.security_metrics_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE public.security_metrics_id_seq OWNER TO securevault_user;

--
-- TOC entry 4025 (class 0 OID 0)
-- Dependencies: 262
-- Name: security_metrics_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: securevault_user
--

ALTER SEQUENCE public.security_metrics_id_seq OWNED BY public.security_metrics.id;


--
-- TOC entry 263 (class 1259 OID 24876)
-- Name: suspicious_patterns; Type: TABLE; Schema: public; Owner: securevault_user
--

CREATE TABLE public.suspicious_patterns (
    id integer NOT NULL,
    pattern_id character varying(36) NOT NULL,
    name character varying(255) NOT NULL,
    description text NOT NULL,
    pattern_type character varying(100) NOT NULL,
    conditions json NOT NULL,
    threshold double precision NOT NULL,
    time_window_minutes integer NOT NULL,
    base_risk_score double precision NOT NULL,
    threat_level public.threatlevel NOT NULL,
    auto_response public.responseaction NOT NULL,
    response_parameters json,
    is_active boolean NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    created_by integer NOT NULL,
    updated_at timestamp with time zone,
    detection_count integer NOT NULL,
    last_detection timestamp with time zone,
    false_positive_count integer NOT NULL
);


ALTER TABLE public.suspicious_patterns OWNER TO securevault_user;

--
-- TOC entry 264 (class 1259 OID 24882)
-- Name: suspicious_patterns_id_seq; Type: SEQUENCE; Schema: public; Owner: securevault_user
--

CREATE SEQUENCE public.suspicious_patterns_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE public.suspicious_patterns_id_seq OWNER TO securevault_user;

--
-- TOC entry 4026 (class 0 OID 0)
-- Dependencies: 264
-- Name: suspicious_patterns_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: securevault_user
--

ALTER SEQUENCE public.suspicious_patterns_id_seq OWNED BY public.suspicious_patterns.id;


--
-- TOC entry 265 (class 1259 OID 24883)
-- Name: threat_responses; Type: TABLE; Schema: public; Owner: securevault_user
--

CREATE TABLE public.threat_responses (
    id integer NOT NULL,
    response_id character varying(36) NOT NULL,
    event_id character varying(36) NOT NULL,
    action public.responseaction NOT NULL,
    target_type character varying(50) NOT NULL,
    target_value character varying(255) NOT NULL,
    duration_minutes integer,
    parameters json,
    executed_at timestamp with time zone DEFAULT now() NOT NULL,
    executed_by character varying(100) NOT NULL,
    success boolean NOT NULL,
    error_message text,
    reversed_at timestamp with time zone,
    reversed_by integer,
    reversal_reason character varying(255)
);


ALTER TABLE public.threat_responses OWNER TO securevault_user;

--
-- TOC entry 266 (class 1259 OID 24889)
-- Name: threat_responses_id_seq; Type: SEQUENCE; Schema: public; Owner: securevault_user
--

CREATE SEQUENCE public.threat_responses_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE public.threat_responses_id_seq OWNER TO securevault_user;

--
-- TOC entry 4027 (class 0 OID 0)
-- Dependencies: 266
-- Name: threat_responses_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: securevault_user
--

ALTER SEQUENCE public.threat_responses_id_seq OWNED BY public.threat_responses.id;


--
-- TOC entry 267 (class 1259 OID 24890)
-- Name: token_families; Type: TABLE; Schema: public; Owner: securevault_user
--

CREATE TABLE public.token_families (
    id character varying(255) NOT NULL,
    user_id integer NOT NULL,
    is_revoked boolean NOT NULL,
    created_at timestamp without time zone NOT NULL,
    revoked_at timestamp without time zone
);


ALTER TABLE public.token_families OWNER TO securevault_user;

--
-- TOC entry 268 (class 1259 OID 24893)
-- Name: user_encryption_keys; Type: TABLE; Schema: public; Owner: securevault_user
--

CREATE TABLE public.user_encryption_keys (
    id integer NOT NULL,
    user_id integer NOT NULL,
    key_id character varying(255) NOT NULL,
    algorithm character varying(50) NOT NULL,
    key_derivation_method character varying(50) NOT NULL,
    iterations integer NOT NULL,
    salt text NOT NULL,
    validation_hash character varying(64) NOT NULL,
    hint character varying(255),
    is_active boolean NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    created_by integer NOT NULL,
    expires_at timestamp with time zone,
    deactivated_at timestamp with time zone,
    deactivated_reason character varying(255)
);


ALTER TABLE public.user_encryption_keys OWNER TO securevault_user;

--
-- TOC entry 269 (class 1259 OID 24899)
-- Name: user_encryption_keys_id_seq; Type: SEQUENCE; Schema: public; Owner: securevault_user
--

CREATE SEQUENCE public.user_encryption_keys_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE public.user_encryption_keys_id_seq OWNER TO securevault_user;

--
-- TOC entry 4028 (class 0 OID 0)
-- Dependencies: 269
-- Name: user_encryption_keys_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: securevault_user
--

ALTER SEQUENCE public.user_encryption_keys_id_seq OWNED BY public.user_encryption_keys.id;


--
-- TOC entry 270 (class 1259 OID 24900)
-- Name: user_roles; Type: TABLE; Schema: public; Owner: securevault_user
--

CREATE TABLE public.user_roles (
    user_id integer NOT NULL,
    role_id integer NOT NULL,
    assigned_at timestamp without time zone NOT NULL,
    assigned_by integer,
    expires_at timestamp without time zone,
    is_primary boolean NOT NULL,
    is_active boolean NOT NULL
);


ALTER TABLE public.user_roles OWNER TO securevault_user;

--
-- TOC entry 271 (class 1259 OID 24903)
-- Name: users; Type: TABLE; Schema: public; Owner: securevault_user
--

CREATE TABLE public.users (
    id integer NOT NULL,
    username character varying(50) NOT NULL,
    email character varying(255) NOT NULL,
    password_hash character varying(255) NOT NULL,
    encryption_salt character varying(64),
    key_verification_payload text,
    encryption_method character varying(50) NOT NULL,
    key_derivation_iterations integer NOT NULL,
    is_active boolean NOT NULL,
    is_verified boolean NOT NULL,
    must_change_password boolean NOT NULL,
    role character varying(50) NOT NULL,
    mfa_enabled boolean NOT NULL,
    mfa_secret character varying(255),
    mfa_setup_date timestamp without time zone,
    mfa_last_used timestamp without time zone,
    backup_codes text,
    backup_codes_generated_at timestamp without time zone,
    failed_login_attempts integer NOT NULL,
    locked_until timestamp without time zone,
    last_login timestamp without time zone,
    last_password_change timestamp without time zone NOT NULL,
    created_at timestamp without time zone NOT NULL,
    updated_at timestamp without time zone NOT NULL,
    created_by integer,
    full_name character varying(100),
    department character varying(100)
);


ALTER TABLE public.users OWNER TO securevault_user;

--
-- TOC entry 272 (class 1259 OID 24908)
-- Name: users_id_seq; Type: SEQUENCE; Schema: public; Owner: securevault_user
--

CREATE SEQUENCE public.users_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE public.users_id_seq OWNER TO securevault_user;

--
-- TOC entry 4029 (class 0 OID 0)
-- Dependencies: 272
-- Name: users_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: securevault_user
--

ALTER SEQUENCE public.users_id_seq OWNED BY public.users.id;


--
-- TOC entry 3461 (class 2604 OID 24909)
-- Name: crypto_randomness_tests id; Type: DEFAULT; Schema: public; Owner: securevault_user
--

ALTER TABLE ONLY public.crypto_randomness_tests ALTER COLUMN id SET DEFAULT nextval('public.crypto_randomness_tests_id_seq'::regclass);


--
-- TOC entry 3463 (class 2604 OID 24910)
-- Name: document_access_logs id; Type: DEFAULT; Schema: public; Owner: securevault_user
--

ALTER TABLE ONLY public.document_access_logs ALTER COLUMN id SET DEFAULT nextval('public.document_access_logs_id_seq'::regclass);


--
-- TOC entry 3465 (class 2604 OID 24911)
-- Name: document_permissions id; Type: DEFAULT; Schema: public; Owner: securevault_user
--

ALTER TABLE ONLY public.document_permissions ALTER COLUMN id SET DEFAULT nextval('public.document_permissions_id_seq'::regclass);


--
-- TOC entry 3467 (class 2604 OID 24912)
-- Name: document_shares id; Type: DEFAULT; Schema: public; Owner: securevault_user
--

ALTER TABLE ONLY public.document_shares ALTER COLUMN id SET DEFAULT nextval('public.document_shares_id_seq'::regclass);


--
-- TOC entry 3469 (class 2604 OID 24913)
-- Name: document_versions id; Type: DEFAULT; Schema: public; Owner: securevault_user
--

ALTER TABLE ONLY public.document_versions ALTER COLUMN id SET DEFAULT nextval('public.document_versions_id_seq'::regclass);


--
-- TOC entry 3471 (class 2604 OID 24914)
-- Name: documents id; Type: DEFAULT; Schema: public; Owner: securevault_user
--

ALTER TABLE ONLY public.documents ALTER COLUMN id SET DEFAULT nextval('public.documents_id_seq'::regclass);


--
-- TOC entry 3474 (class 2604 OID 24915)
-- Name: encryption_audit_logs id; Type: DEFAULT; Schema: public; Owner: securevault_user
--

ALTER TABLE ONLY public.encryption_audit_logs ALTER COLUMN id SET DEFAULT nextval('public.encryption_audit_logs_id_seq'::regclass);


--
-- TOC entry 3476 (class 2604 OID 24916)
-- Name: ip_blocklist id; Type: DEFAULT; Schema: public; Owner: securevault_user
--

ALTER TABLE ONLY public.ip_blocklist ALTER COLUMN id SET DEFAULT nextval('public.ip_blocklist_id_seq'::regclass);


--
-- TOC entry 3478 (class 2604 OID 24917)
-- Name: key_escrow id; Type: DEFAULT; Schema: public; Owner: securevault_user
--

ALTER TABLE ONLY public.key_escrow ALTER COLUMN id SET DEFAULT nextval('public.key_escrow_id_seq'::regclass);


--
-- TOC entry 3480 (class 2604 OID 24918)
-- Name: key_rotation_logs id; Type: DEFAULT; Schema: public; Owner: securevault_user
--

ALTER TABLE ONLY public.key_rotation_logs ALTER COLUMN id SET DEFAULT nextval('public.key_rotation_logs_id_seq'::regclass);


--
-- TOC entry 3482 (class 2604 OID 24919)
-- Name: master_keys id; Type: DEFAULT; Schema: public; Owner: securevault_user
--

ALTER TABLE ONLY public.master_keys ALTER COLUMN id SET DEFAULT nextval('public.master_keys_id_seq'::regclass);


--
-- TOC entry 3484 (class 2604 OID 24920)
-- Name: mfa_audit_logs id; Type: DEFAULT; Schema: public; Owner: securevault_user
--

ALTER TABLE ONLY public.mfa_audit_logs ALTER COLUMN id SET DEFAULT nextval('public.mfa_audit_logs_id_seq'::regclass);


--
-- TOC entry 3485 (class 2604 OID 24921)
-- Name: mfa_configuration id; Type: DEFAULT; Schema: public; Owner: securevault_user
--

ALTER TABLE ONLY public.mfa_configuration ALTER COLUMN id SET DEFAULT nextval('public.mfa_configuration_id_seq'::regclass);


--
-- TOC entry 3486 (class 2604 OID 24922)
-- Name: mfa_failed_attempts id; Type: DEFAULT; Schema: public; Owner: securevault_user
--

ALTER TABLE ONLY public.mfa_failed_attempts ALTER COLUMN id SET DEFAULT nextval('public.mfa_failed_attempts_id_seq'::regclass);


--
-- TOC entry 3487 (class 2604 OID 24923)
-- Name: mfa_used_codes id; Type: DEFAULT; Schema: public; Owner: securevault_user
--

ALTER TABLE ONLY public.mfa_used_codes ALTER COLUMN id SET DEFAULT nextval('public.mfa_used_codes_id_seq'::regclass);


--
-- TOC entry 3488 (class 2604 OID 24924)
-- Name: permissions id; Type: DEFAULT; Schema: public; Owner: securevault_user
--

ALTER TABLE ONLY public.permissions ALTER COLUMN id SET DEFAULT nextval('public.permissions_id_seq'::regclass);


--
-- TOC entry 3489 (class 2604 OID 24925)
-- Name: resource_permissions id; Type: DEFAULT; Schema: public; Owner: securevault_user
--

ALTER TABLE ONLY public.resource_permissions ALTER COLUMN id SET DEFAULT nextval('public.resource_permissions_id_seq'::regclass);


--
-- TOC entry 3490 (class 2604 OID 24926)
-- Name: role_hierarchy id; Type: DEFAULT; Schema: public; Owner: securevault_user
--

ALTER TABLE ONLY public.role_hierarchy ALTER COLUMN id SET DEFAULT nextval('public.role_hierarchy_id_seq'::regclass);


--
-- TOC entry 3491 (class 2604 OID 24927)
-- Name: roles id; Type: DEFAULT; Schema: public; Owner: securevault_user
--

ALTER TABLE ONLY public.roles ALTER COLUMN id SET DEFAULT nextval('public.roles_id_seq'::regclass);


--
-- TOC entry 3492 (class 2604 OID 24928)
-- Name: security_alerts id; Type: DEFAULT; Schema: public; Owner: securevault_user
--

ALTER TABLE ONLY public.security_alerts ALTER COLUMN id SET DEFAULT nextval('public.security_alerts_id_seq'::regclass);


--
-- TOC entry 3493 (class 2604 OID 24929)
-- Name: security_events id; Type: DEFAULT; Schema: public; Owner: securevault_user
--

ALTER TABLE ONLY public.security_events ALTER COLUMN id SET DEFAULT nextval('public.security_events_id_seq'::regclass);


--
-- TOC entry 3495 (class 2604 OID 24930)
-- Name: security_metrics id; Type: DEFAULT; Schema: public; Owner: securevault_user
--

ALTER TABLE ONLY public.security_metrics ALTER COLUMN id SET DEFAULT nextval('public.security_metrics_id_seq'::regclass);


--
-- TOC entry 3496 (class 2604 OID 24931)
-- Name: suspicious_patterns id; Type: DEFAULT; Schema: public; Owner: securevault_user
--

ALTER TABLE ONLY public.suspicious_patterns ALTER COLUMN id SET DEFAULT nextval('public.suspicious_patterns_id_seq'::regclass);


--
-- TOC entry 3498 (class 2604 OID 24932)
-- Name: threat_responses id; Type: DEFAULT; Schema: public; Owner: securevault_user
--

ALTER TABLE ONLY public.threat_responses ALTER COLUMN id SET DEFAULT nextval('public.threat_responses_id_seq'::regclass);


--
-- TOC entry 3500 (class 2604 OID 24933)
-- Name: user_encryption_keys id; Type: DEFAULT; Schema: public; Owner: securevault_user
--

ALTER TABLE ONLY public.user_encryption_keys ALTER COLUMN id SET DEFAULT nextval('public.user_encryption_keys_id_seq'::regclass);


--
-- TOC entry 3502 (class 2604 OID 24934)
-- Name: users id; Type: DEFAULT; Schema: public; Owner: securevault_user
--

ALTER TABLE ONLY public.users ALTER COLUMN id SET DEFAULT nextval('public.users_id_seq'::regclass);


--
-- TOC entry 3939 (class 0 OID 24713)
-- Dependencies: 217
-- Data for Name: alembic_version; Type: TABLE DATA; Schema: public; Owner: securevault_user
--

INSERT INTO public.alembic_version VALUES ('4fc4dab4fda6');


--
-- TOC entry 3940 (class 0 OID 24716)
-- Dependencies: 218
-- Data for Name: crypto_randomness_tests; Type: TABLE DATA; Schema: public; Owner: securevault_user
--



--
-- TOC entry 3942 (class 0 OID 24723)
-- Dependencies: 220
-- Data for Name: document_access_logs; Type: TABLE DATA; Schema: public; Owner: securevault_user
--

INSERT INTO public.document_access_logs VALUES (185, 13, 3, 'write', 'api', true, NULL, NULL, NULL, '2025-10-03 16:35:42.981424+00', NULL, '{"file_size": 347556, "mime_type": "application/pdf", "operation": "upload"}', NULL);
INSERT INTO public.document_access_logs VALUES (186, 13, 3, 'download', 'api', true, NULL, NULL, NULL, '2025-10-03 16:35:47.67916+00', NULL, '{}', NULL);
INSERT INTO public.document_access_logs VALUES (187, 13, 3, 'download', 'api', true, '127.0.0.1', NULL, NULL, '2025-10-03 16:35:47.890342+00', NULL, '{}', NULL);
INSERT INTO public.document_access_logs VALUES (188, 14, 3, 'write', 'api', true, NULL, NULL, NULL, '2025-10-03 16:36:22.405899+00', NULL, '{"file_size": 111, "mime_type": "text/csv", "operation": "upload"}', NULL);
INSERT INTO public.document_access_logs VALUES (189, 14, 3, 'download', 'api', true, NULL, NULL, NULL, '2025-10-03 16:36:29.339588+00', NULL, '{}', NULL);
INSERT INTO public.document_access_logs VALUES (190, 14, 3, 'download', 'api', true, '127.0.0.1', NULL, NULL, '2025-10-03 16:36:29.45844+00', NULL, '{}', NULL);
INSERT INTO public.document_access_logs VALUES (191, 13, 3, 'download', 'api', true, NULL, NULL, NULL, '2025-10-03 16:36:41.574443+00', NULL, '{}', NULL);
INSERT INTO public.document_access_logs VALUES (192, 13, 3, 'download', 'api', true, '127.0.0.1', NULL, NULL, '2025-10-03 16:36:41.659843+00', NULL, '{}', NULL);
INSERT INTO public.document_access_logs VALUES (193, 13, NULL, 'share', NULL, true, '127.0.0.1', 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/140.0.0.0 Safari/537.36', NULL, '2025-10-03 16:37:04.920812+00', NULL, '{"share_id": 3, "share_type": "external", "access_time": "2025-10-03T16:37:04.770278+00:00", "share_token": "39qgEmDHWCy897FLUNovW2pOaSOIV5lW-Tew1uxcfg4"}', NULL);
INSERT INTO public.document_access_logs VALUES (194, 13, NULL, 'share', NULL, true, '127.0.0.1', 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/140.0.0.0 Safari/537.36', NULL, '2025-10-03 16:37:04.999153+00', NULL, '{"share_id": 3, "share_type": "external", "access_time": "2025-10-03T16:37:04.845633+00:00", "share_token": "39qgEmDHWCy897FLUNovW2pOaSOIV5lW-Tew1uxcfg4"}', NULL);
INSERT INTO public.document_access_logs VALUES (195, 13, NULL, 'share', NULL, true, '127.0.0.1', 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/140.0.0.0 Safari/537.36', NULL, '2025-10-03 16:37:05.148486+00', NULL, '{"share_id": 3, "share_type": "external", "access_time": "2025-10-03T16:37:05.007974+00:00", "share_token": "39qgEmDHWCy897FLUNovW2pOaSOIV5lW-Tew1uxcfg4"}', NULL);
INSERT INTO public.document_access_logs VALUES (196, 13, NULL, 'share', NULL, true, '127.0.0.1', 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/140.0.0.0 Safari/537.36', NULL, '2025-10-03 16:37:05.284012+00', NULL, '{"share_id": 3, "share_type": "external", "access_time": "2025-10-03T16:37:05.124046+00:00", "share_token": "39qgEmDHWCy897FLUNovW2pOaSOIV5lW-Tew1uxcfg4"}', NULL);
INSERT INTO public.document_access_logs VALUES (197, 13, 3, 'download', 'api', true, NULL, NULL, NULL, '2025-10-03 16:49:17.130367+00', NULL, '{}', NULL);
INSERT INTO public.document_access_logs VALUES (198, 13, 3, 'download', 'api', true, '127.0.0.1', NULL, NULL, '2025-10-03 16:49:17.223999+00', NULL, '{}', NULL);
INSERT INTO public.document_access_logs VALUES (199, 14, 3, 'download', 'api', true, NULL, NULL, NULL, '2025-10-03 16:52:10.150743+00', NULL, '{}', NULL);
INSERT INTO public.document_access_logs VALUES (200, 14, 3, 'download', 'api', true, '127.0.0.1', NULL, NULL, '2025-10-03 16:52:10.231159+00', NULL, '{}', NULL);
INSERT INTO public.document_access_logs VALUES (201, 13, NULL, 'share', NULL, true, '127.0.0.1', 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/140.0.0.0 Safari/537.36', NULL, '2025-10-03 16:59:08.612375+00', NULL, '{"share_id": 3, "share_type": "external", "access_time": "2025-10-03T16:59:08.659321+00:00", "share_token": "39qgEmDHWCy897FLUNovW2pOaSOIV5lW-Tew1uxcfg4"}', NULL);
INSERT INTO public.document_access_logs VALUES (202, 13, NULL, 'share', NULL, true, '127.0.0.1', 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/140.0.0.0 Safari/537.36', NULL, '2025-10-03 16:59:08.695113+00', NULL, '{"share_id": 3, "share_type": "external", "access_time": "2025-10-03T16:59:08.725176+00:00", "share_token": "39qgEmDHWCy897FLUNovW2pOaSOIV5lW-Tew1uxcfg4"}', NULL);
INSERT INTO public.document_access_logs VALUES (203, 13, NULL, 'share', NULL, true, '127.0.0.1', 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/140.0.0.0 Safari/537.36', NULL, '2025-10-03 16:59:08.787063+00', NULL, '{"share_id": 3, "share_type": "external", "access_time": "2025-10-03T16:59:08.819004+00:00", "share_token": "39qgEmDHWCy897FLUNovW2pOaSOIV5lW-Tew1uxcfg4"}', NULL);
INSERT INTO public.document_access_logs VALUES (204, 13, NULL, 'share', NULL, true, '127.0.0.1', 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/140.0.0.0 Safari/537.36', NULL, '2025-10-03 16:59:08.898061+00', NULL, '{"share_id": 3, "share_type": "external", "access_time": "2025-10-03T16:59:08.923276+00:00", "share_token": "39qgEmDHWCy897FLUNovW2pOaSOIV5lW-Tew1uxcfg4"}', NULL);
INSERT INTO public.document_access_logs VALUES (205, 13, NULL, 'share', NULL, true, '127.0.0.1', 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/140.0.0.0 Safari/537.36', NULL, '2025-10-03 16:59:08.992123+00', NULL, '{"share_id": 3, "share_type": "external", "access_time": "2025-10-03T16:59:09.028052+00:00", "share_token": "39qgEmDHWCy897FLUNovW2pOaSOIV5lW-Tew1uxcfg4"}', NULL);
INSERT INTO public.document_access_logs VALUES (206, 14, 3, 'download', 'api', true, NULL, NULL, NULL, '2025-10-03 16:59:40.021853+00', NULL, '{}', NULL);
INSERT INTO public.document_access_logs VALUES (207, 14, 3, 'download', 'api', true, '127.0.0.1', NULL, NULL, '2025-10-03 16:59:40.093337+00', NULL, '{}', NULL);
INSERT INTO public.document_access_logs VALUES (208, 15, 3, 'write', 'api', true, NULL, NULL, NULL, '2025-10-03 17:00:20.100173+00', NULL, '{"file_size": 216323, "mime_type": "application/vnd.openxmlformats-officedocument.presentationml.presentation", "operation": "upload"}', NULL);
INSERT INTO public.document_access_logs VALUES (209, 15, 3, 'download', 'api', true, NULL, NULL, NULL, '2025-10-03 17:00:26.165368+00', NULL, '{}', NULL);
INSERT INTO public.document_access_logs VALUES (210, 15, 3, 'download', 'api', true, '127.0.0.1', NULL, NULL, '2025-10-03 17:00:26.267046+00', NULL, '{}', NULL);
INSERT INTO public.document_access_logs VALUES (211, 16, 3, 'write', 'api', true, NULL, NULL, NULL, '2025-10-03 17:00:54.716921+00', NULL, '{"file_size": 761175, "mime_type": "image/png", "operation": "upload"}', NULL);
INSERT INTO public.document_access_logs VALUES (212, 16, 3, 'download', 'api', true, NULL, NULL, NULL, '2025-10-03 17:00:59.462378+00', NULL, '{}', NULL);
INSERT INTO public.document_access_logs VALUES (213, 16, 3, 'download', 'api', true, '127.0.0.1', NULL, NULL, '2025-10-03 17:00:59.555306+00', NULL, '{}', NULL);
INSERT INTO public.document_access_logs VALUES (214, 13, 3, 'download', 'api', true, NULL, NULL, NULL, '2025-10-03 17:01:07.721986+00', NULL, '{}', NULL);
INSERT INTO public.document_access_logs VALUES (215, 13, 3, 'download', 'api', true, '127.0.0.1', NULL, NULL, '2025-10-03 17:01:07.793694+00', NULL, '{}', NULL);
INSERT INTO public.document_access_logs VALUES (216, 17, 3, 'write', 'api', true, NULL, NULL, NULL, '2025-10-03 17:01:35.212222+00', NULL, '{"file_size": 111508, "mime_type": "image/jpeg", "operation": "upload"}', NULL);
INSERT INTO public.document_access_logs VALUES (217, 17, 3, 'download', 'api', true, NULL, NULL, NULL, '2025-10-03 17:01:40.874733+00', NULL, '{}', NULL);
INSERT INTO public.document_access_logs VALUES (218, 17, 3, 'download', 'api', true, '127.0.0.1', NULL, NULL, '2025-10-03 17:01:40.959657+00', NULL, '{}', NULL);
INSERT INTO public.document_access_logs VALUES (219, 18, 3, 'write', 'api', true, NULL, NULL, NULL, '2025-10-03 17:02:23.370346+00', NULL, '{"file_size": 13279, "mime_type": "text/html", "operation": "upload"}', NULL);
INSERT INTO public.document_access_logs VALUES (220, 19, 3, 'write', 'api', true, NULL, NULL, NULL, '2025-10-03 17:02:23.708264+00', NULL, '{"file_size": 23695, "mime_type": "application/vnd.openxmlformats-officedocument.wordprocessingml.document", "operation": "upload"}', NULL);
INSERT INTO public.document_access_logs VALUES (221, 19, 3, 'download', 'api', true, NULL, NULL, NULL, '2025-10-03 17:02:27.596632+00', NULL, '{}', NULL);
INSERT INTO public.document_access_logs VALUES (222, 19, 3, 'download', 'api', true, '127.0.0.1', NULL, NULL, '2025-10-03 17:02:27.710186+00', NULL, '{}', NULL);
INSERT INTO public.document_access_logs VALUES (223, 20, 3, 'write', 'api', true, NULL, NULL, NULL, '2025-10-03 17:04:18.392887+00', NULL, '{"file_size": 1960, "mime_type": "text/plain", "operation": "upload"}', NULL);
INSERT INTO public.document_access_logs VALUES (224, 20, 3, 'download', 'api', true, NULL, NULL, NULL, '2025-10-03 17:04:24.319725+00', NULL, '{}', NULL);
INSERT INTO public.document_access_logs VALUES (225, 20, 3, 'download', 'api', true, '127.0.0.1', NULL, NULL, '2025-10-03 17:04:24.432771+00', NULL, '{}', NULL);
INSERT INTO public.document_access_logs VALUES (226, 20, 3, 'download', 'api', true, NULL, NULL, NULL, '2025-10-03 17:04:44.149232+00', NULL, '{}', NULL);
INSERT INTO public.document_access_logs VALUES (227, 20, 3, 'download', 'api', true, '127.0.0.1', NULL, NULL, '2025-10-03 17:04:44.225078+00', NULL, '{}', NULL);
INSERT INTO public.document_access_logs VALUES (228, 20, NULL, 'share', NULL, true, '127.0.0.1', 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/140.0.0.0 Safari/537.36', NULL, '2025-10-03 17:05:06.207745+00', NULL, '{"share_id": 4, "share_type": "external", "access_time": "2025-10-03T17:05:06.266380+00:00", "share_token": "Q14x1OcHrnZ5JowYKq-OpVcBZD7QemTietv64Nfj9ZU"}', NULL);
INSERT INTO public.document_access_logs VALUES (229, 20, NULL, 'share', NULL, true, '127.0.0.1', 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/140.0.0.0 Safari/537.36', NULL, '2025-10-03 17:05:06.303703+00', NULL, '{"share_id": 4, "share_type": "external", "access_time": "2025-10-03T17:05:06.356710+00:00", "share_token": "Q14x1OcHrnZ5JowYKq-OpVcBZD7QemTietv64Nfj9ZU"}', NULL);
INSERT INTO public.document_access_logs VALUES (230, 20, NULL, 'share', NULL, true, '127.0.0.1', 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/140.0.0.0 Safari/537.36', NULL, '2025-10-03 17:05:06.399977+00', NULL, '{"share_id": 4, "share_type": "external", "access_time": "2025-10-03T17:05:06.453823+00:00", "share_token": "Q14x1OcHrnZ5JowYKq-OpVcBZD7QemTietv64Nfj9ZU"}', NULL);
INSERT INTO public.document_access_logs VALUES (235, 21, 3, 'download', 'api', true, NULL, NULL, NULL, '2025-10-03 17:13:19.834787+00', NULL, '{}', NULL);
INSERT INTO public.document_access_logs VALUES (231, 20, NULL, 'share', NULL, true, '127.0.0.1', 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/140.0.0.0 Safari/537.36', NULL, '2025-10-03 17:05:06.518446+00', NULL, '{"share_id": 4, "share_type": "external", "access_time": "2025-10-03T17:05:06.571222+00:00", "share_token": "Q14x1OcHrnZ5JowYKq-OpVcBZD7QemTietv64Nfj9ZU"}', NULL);
INSERT INTO public.document_access_logs VALUES (232, 20, NULL, 'share', NULL, true, '127.0.0.1', 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/140.0.0.0 Safari/537.36', NULL, '2025-10-03 17:05:06.644767+00', NULL, '{"share_id": 4, "share_type": "external", "access_time": "2025-10-03T17:05:06.692655+00:00", "share_token": "Q14x1OcHrnZ5JowYKq-OpVcBZD7QemTietv64Nfj9ZU"}', NULL);
INSERT INTO public.document_access_logs VALUES (236, 21, 3, 'download', 'api', true, '127.0.0.1', NULL, NULL, '2025-10-03 17:13:19.924413+00', NULL, '{}', NULL);
INSERT INTO public.document_access_logs VALUES (233, 20, NULL, 'share', NULL, true, '127.0.0.1', 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/140.0.0.0 Safari/537.36', NULL, '2025-10-03 17:05:11.517506+00', NULL, '{"share_id": 4, "share_type": "external", "access_time": "2025-10-03T17:05:11.524769+00:00", "share_token": "Q14x1OcHrnZ5JowYKq-OpVcBZD7QemTietv64Nfj9ZU"}', NULL);
INSERT INTO public.document_access_logs VALUES (234, 21, 3, 'write', 'api', true, NULL, NULL, NULL, '2025-10-03 17:13:12.08825+00', NULL, '{"file_size": 1970246, "mime_type": "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet", "operation": "upload"}', NULL);
INSERT INTO public.document_access_logs VALUES (237, 21, 3, 'download', 'api', true, NULL, NULL, NULL, '2025-10-03 17:29:20.254537+00', NULL, '{}', NULL);
INSERT INTO public.document_access_logs VALUES (238, 21, 3, 'download', 'api', true, '127.0.0.1', NULL, NULL, '2025-10-03 17:29:20.346662+00', NULL, '{}', NULL);
INSERT INTO public.document_access_logs VALUES (239, 15, 3, 'download', 'api', true, NULL, NULL, NULL, '2025-10-03 17:29:38.687824+00', NULL, '{}', NULL);
INSERT INTO public.document_access_logs VALUES (240, 15, 3, 'download', 'api', true, '127.0.0.1', NULL, NULL, '2025-10-03 17:29:39.004186+00', NULL, '{}', NULL);
INSERT INTO public.document_access_logs VALUES (241, 19, 3, 'download', 'api', true, NULL, NULL, NULL, '2025-10-03 17:30:17.331063+00', NULL, '{}', NULL);
INSERT INTO public.document_access_logs VALUES (242, 19, 3, 'download', 'api', true, '127.0.0.1', NULL, NULL, '2025-10-03 17:30:17.445433+00', NULL, '{}', NULL);
INSERT INTO public.document_access_logs VALUES (243, 19, NULL, 'share', NULL, true, '127.0.0.1', 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/140.0.0.0 Safari/537.36', NULL, '2025-10-03 17:31:47.376013+00', NULL, '{"share_id": 5, "share_type": "external", "access_time": "2025-10-03T17:31:47.385929+00:00", "share_token": "bmeHKROkWnA3AbsELjJO0iK4sj5zjbXyu8MwQ7bTJNw"}', NULL);
INSERT INTO public.document_access_logs VALUES (244, 19, NULL, 'share', NULL, true, '127.0.0.1', 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/140.0.0.0 Safari/537.36', NULL, '2025-10-03 17:31:47.453419+00', NULL, '{"share_id": 5, "share_type": "external", "access_time": "2025-10-03T17:31:47.462683+00:00", "share_token": "bmeHKROkWnA3AbsELjJO0iK4sj5zjbXyu8MwQ7bTJNw"}', NULL);
INSERT INTO public.document_access_logs VALUES (245, 19, NULL, 'share', NULL, true, '127.0.0.1', 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/140.0.0.0 Safari/537.36', NULL, '2025-10-03 17:31:47.596789+00', NULL, '{"share_id": 5, "share_type": "external", "access_time": "2025-10-03T17:31:47.604996+00:00", "share_token": "bmeHKROkWnA3AbsELjJO0iK4sj5zjbXyu8MwQ7bTJNw"}', NULL);
INSERT INTO public.document_access_logs VALUES (246, 19, NULL, 'share', NULL, true, '127.0.0.1', 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/140.0.0.0 Safari/537.36', NULL, '2025-10-03 17:31:47.736995+00', NULL, '{"share_id": 5, "share_type": "external", "access_time": "2025-10-03T17:31:47.739577+00:00", "share_token": "bmeHKROkWnA3AbsELjJO0iK4sj5zjbXyu8MwQ7bTJNw"}', NULL);
INSERT INTO public.document_access_logs VALUES (247, 19, NULL, 'share', NULL, true, '127.0.0.1', 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/140.0.0.0 Safari/537.36', NULL, '2025-10-03 17:31:48.032833+00', NULL, '{"share_id": 5, "share_type": "external", "access_time": "2025-10-03T17:31:48.035082+00:00", "share_token": "bmeHKROkWnA3AbsELjJO0iK4sj5zjbXyu8MwQ7bTJNw"}', NULL);
INSERT INTO public.document_access_logs VALUES (248, 14, 3, 'download', 'api', true, NULL, NULL, NULL, '2025-10-03 17:32:45.517966+00', NULL, '{}', NULL);
INSERT INTO public.document_access_logs VALUES (249, 14, 3, 'download', 'api', true, '127.0.0.1', NULL, NULL, '2025-10-03 17:32:45.635201+00', NULL, '{}', NULL);
INSERT INTO public.document_access_logs VALUES (250, 19, 3, 'download', 'api', true, NULL, NULL, NULL, '2025-10-03 17:32:56.612049+00', NULL, '{}', NULL);
INSERT INTO public.document_access_logs VALUES (251, 19, 3, 'download', 'api', true, '127.0.0.1', NULL, NULL, '2025-10-03 17:32:56.812045+00', NULL, '{}', NULL);
INSERT INTO public.document_access_logs VALUES (252, 22, 3, 'write', 'api', true, NULL, NULL, NULL, '2025-10-03 17:33:56.44436+00', NULL, '{"file_size": 5740084, "mime_type": "application/vnd.openxmlformats-officedocument.presentationml.presentation", "operation": "upload"}', NULL);
INSERT INTO public.document_access_logs VALUES (253, 22, 3, 'download', 'api', true, NULL, NULL, NULL, '2025-10-03 17:34:00.595949+00', NULL, '{}', NULL);
INSERT INTO public.document_access_logs VALUES (254, 22, 3, 'download', 'api', true, '127.0.0.1', NULL, NULL, '2025-10-03 17:34:00.769318+00', NULL, '{}', NULL);
INSERT INTO public.document_access_logs VALUES (255, 15, 3, 'delete', 'api', true, NULL, NULL, NULL, '2025-10-03 17:34:31.001228+00', NULL, '{}', NULL);
INSERT INTO public.document_access_logs VALUES (256, 22, 3, 'download', 'api', true, NULL, NULL, NULL, '2025-10-03 17:34:37.196327+00', NULL, '{}', NULL);
INSERT INTO public.document_access_logs VALUES (257, 22, 3, 'download', 'api', true, '127.0.0.1', NULL, NULL, '2025-10-03 17:34:37.304708+00', NULL, '{}', NULL);
INSERT INTO public.document_access_logs VALUES (258, 22, 3, 'download', 'api', true, NULL, NULL, NULL, '2025-10-03 17:39:58.605366+00', NULL, '{}', NULL);
INSERT INTO public.document_access_logs VALUES (259, 22, 3, 'download', 'api', true, '127.0.0.1', NULL, NULL, '2025-10-03 17:39:58.754319+00', NULL, '{}', NULL);
INSERT INTO public.document_access_logs VALUES (260, 23, 3, 'write', 'api', true, NULL, NULL, NULL, '2025-10-03 17:41:55.852509+00', NULL, '{"file_size": 15469, "mime_type": "text/html", "operation": "upload"}', NULL);
INSERT INTO public.document_access_logs VALUES (261, 18, 3, 'delete', 'api', true, NULL, NULL, NULL, '2025-10-03 17:42:17.683293+00', NULL, '{}', NULL);
INSERT INTO public.document_access_logs VALUES (262, 22, 3, 'download', 'api', true, NULL, NULL, NULL, '2025-10-03 17:44:45.63599+00', NULL, '{}', NULL);
INSERT INTO public.document_access_logs VALUES (263, 22, 3, 'download', 'api', true, '127.0.0.1', NULL, NULL, '2025-10-03 17:44:45.777878+00', NULL, '{}', NULL);
INSERT INTO public.document_access_logs VALUES (264, 22, 3, 'download', 'api', true, NULL, NULL, NULL, '2025-10-03 17:48:09.45923+00', NULL, '{}', NULL);
INSERT INTO public.document_access_logs VALUES (265, 22, 3, 'download', 'api', true, '127.0.0.1', NULL, NULL, '2025-10-03 17:48:09.588552+00', NULL, '{}', NULL);
INSERT INTO public.document_access_logs VALUES (266, 22, 3, 'download', 'api', true, NULL, NULL, NULL, '2025-10-03 17:49:17.890942+00', NULL, '{}', NULL);
INSERT INTO public.document_access_logs VALUES (267, 22, 3, 'download', 'api', true, '127.0.0.1', NULL, NULL, '2025-10-03 17:49:18.003253+00', NULL, '{}', NULL);
INSERT INTO public.document_access_logs VALUES (268, 22, 3, 'download', 'api', true, NULL, NULL, NULL, '2025-10-04 03:17:04.526592+00', NULL, '{}', NULL);
INSERT INTO public.document_access_logs VALUES (269, 22, 3, 'download', 'api', true, '127.0.0.1', NULL, NULL, '2025-10-04 03:17:04.67278+00', NULL, '{}', NULL);
INSERT INTO public.document_access_logs VALUES (270, 22, 3, 'download', 'api', true, NULL, NULL, NULL, '2025-10-04 03:17:34.205207+00', NULL, '{}', NULL);
INSERT INTO public.document_access_logs VALUES (271, 22, 3, 'download', 'api', true, '127.0.0.1', NULL, NULL, '2025-10-04 03:17:34.306486+00', NULL, '{}', NULL);
INSERT INTO public.document_access_logs VALUES (272, 22, 3, 'download', 'api', true, NULL, NULL, NULL, '2025-10-04 03:21:00.920746+00', NULL, '{}', NULL);
INSERT INTO public.document_access_logs VALUES (273, 22, 3, 'download', 'api', true, '127.0.0.1', NULL, NULL, '2025-10-04 03:21:01.045247+00', NULL, '{}', NULL);
INSERT INTO public.document_access_logs VALUES (274, 17, 3, 'download', 'api', true, NULL, NULL, NULL, '2025-10-04 03:26:38.193417+00', NULL, '{}', NULL);
INSERT INTO public.document_access_logs VALUES (275, 17, 3, 'download', 'api', true, '127.0.0.1', NULL, NULL, '2025-10-04 03:26:38.302136+00', NULL, '{}', NULL);
INSERT INTO public.document_access_logs VALUES (276, 17, NULL, 'share', NULL, true, '127.0.0.1', 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/140.0.0.0 Safari/537.36', NULL, '2025-10-04 03:26:58.846203+00', NULL, '{"share_id": 6, "share_type": "external", "access_time": "2025-10-04T03:26:59.517573+00:00", "share_token": "FD0YU_pqcxsdwFYCHzM2eyyKv20h6tBAUZTohZGvbYg"}', NULL);
INSERT INTO public.document_access_logs VALUES (277, 17, NULL, 'share', NULL, true, '127.0.0.1', 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/140.0.0.0 Safari/537.36', NULL, '2025-10-04 03:26:58.973734+00', NULL, '{"share_id": 6, "share_type": "external", "access_time": "2025-10-04T03:26:59.628437+00:00", "share_token": "FD0YU_pqcxsdwFYCHzM2eyyKv20h6tBAUZTohZGvbYg"}', NULL);
INSERT INTO public.document_access_logs VALUES (278, 17, NULL, 'share', NULL, true, '127.0.0.1', 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/140.0.0.0 Safari/537.36', NULL, '2025-10-04 03:26:59.144687+00', NULL, '{"share_id": 6, "share_type": "external", "access_time": "2025-10-04T03:26:59.785467+00:00", "share_token": "FD0YU_pqcxsdwFYCHzM2eyyKv20h6tBAUZTohZGvbYg"}', NULL);
INSERT INTO public.document_access_logs VALUES (279, 17, NULL, 'share', NULL, true, '127.0.0.1', 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/140.0.0.0 Safari/537.36', NULL, '2025-10-04 03:26:59.320098+00', NULL, '{"share_id": 6, "share_type": "external", "access_time": "2025-10-04T03:26:59.945112+00:00", "share_token": "FD0YU_pqcxsdwFYCHzM2eyyKv20h6tBAUZTohZGvbYg"}', NULL);
INSERT INTO public.document_access_logs VALUES (280, 17, NULL, 'share', NULL, true, '127.0.0.1', 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/140.0.0.0 Safari/537.36', NULL, '2025-10-04 03:26:59.425799+00', NULL, '{"share_id": 6, "share_type": "external", "access_time": "2025-10-04T03:27:00.044613+00:00", "share_token": "FD0YU_pqcxsdwFYCHzM2eyyKv20h6tBAUZTohZGvbYg"}', NULL);
INSERT INTO public.document_access_logs VALUES (281, 17, NULL, 'share', NULL, true, '127.0.0.1', 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/140.0.0.0 Safari/537.36', NULL, '2025-10-04 03:31:47.871178+00', NULL, '{"share_id": 6, "share_type": "external", "access_time": "2025-10-04T03:31:47.770130+00:00", "share_token": "FD0YU_pqcxsdwFYCHzM2eyyKv20h6tBAUZTohZGvbYg"}', NULL);
INSERT INTO public.document_access_logs VALUES (282, 17, NULL, 'share', NULL, true, '127.0.0.1', 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/140.0.0.0 Safari/537.36', NULL, '2025-10-04 03:32:44.03127+00', NULL, '{"share_id": 6, "share_type": "external", "access_time": "2025-10-04T03:32:45.882281+00:00", "share_token": "FD0YU_pqcxsdwFYCHzM2eyyKv20h6tBAUZTohZGvbYg"}', NULL);
INSERT INTO public.document_access_logs VALUES (283, 17, NULL, 'share', NULL, true, '127.0.0.1', 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/140.0.0.0 Safari/537.36', NULL, '2025-10-04 03:33:01.130609+00', NULL, '{"share_id": 6, "share_type": "external", "access_time": "2025-10-04T03:33:01.769637+00:00", "share_token": "FD0YU_pqcxsdwFYCHzM2eyyKv20h6tBAUZTohZGvbYg"}', NULL);
INSERT INTO public.document_access_logs VALUES (284, 17, NULL, 'share', NULL, true, '127.0.0.1', 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/140.0.0.0 Safari/537.36', NULL, '2025-10-04 03:33:10.808198+00', NULL, '{"share_id": 6, "share_type": "external", "access_time": "2025-10-04T03:33:10.724379+00:00", "share_token": "FD0YU_pqcxsdwFYCHzM2eyyKv20h6tBAUZTohZGvbYg"}', NULL);
INSERT INTO public.document_access_logs VALUES (288, 17, NULL, 'share', NULL, true, '127.0.0.1', 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/140.0.0.0 Safari/537.36', NULL, '2025-10-04 03:33:11.156393+00', NULL, '{"share_id": 6, "share_type": "external", "access_time": "2025-10-04T03:33:11.042735+00:00", "share_token": "FD0YU_pqcxsdwFYCHzM2eyyKv20h6tBAUZTohZGvbYg"}', NULL);
INSERT INTO public.document_access_logs VALUES (285, 17, NULL, 'share', NULL, true, '127.0.0.1', 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/140.0.0.0 Safari/537.36', NULL, '2025-10-04 03:33:10.908843+00', NULL, '{"share_id": 6, "share_type": "external", "access_time": "2025-10-04T03:33:10.816097+00:00", "share_token": "FD0YU_pqcxsdwFYCHzM2eyyKv20h6tBAUZTohZGvbYg"}', NULL);
INSERT INTO public.document_access_logs VALUES (286, 17, NULL, 'share', NULL, true, '127.0.0.1', 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/140.0.0.0 Safari/537.36', NULL, '2025-10-04 03:33:10.996355+00', NULL, '{"share_id": 6, "share_type": "external", "access_time": "2025-10-04T03:33:10.895196+00:00", "share_token": "FD0YU_pqcxsdwFYCHzM2eyyKv20h6tBAUZTohZGvbYg"}', NULL);
INSERT INTO public.document_access_logs VALUES (287, 17, NULL, 'share', NULL, true, '127.0.0.1', 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/140.0.0.0 Safari/537.36', NULL, '2025-10-04 03:33:11.05746+00', NULL, '{"share_id": 6, "share_type": "external", "access_time": "2025-10-04T03:33:10.951420+00:00", "share_token": "FD0YU_pqcxsdwFYCHzM2eyyKv20h6tBAUZTohZGvbYg"}', NULL);
INSERT INTO public.document_access_logs VALUES (289, 13, NULL, 'share', NULL, true, '127.0.0.1', 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/140.0.0.0 Safari/537.36', NULL, '2025-10-04 03:36:09.297827+00', NULL, '{"share_id": 3, "share_type": "external", "access_time": "2025-10-04T03:36:10.295576+00:00", "share_token": "39qgEmDHWCy897FLUNovW2pOaSOIV5lW-Tew1uxcfg4"}', NULL);
INSERT INTO public.document_access_logs VALUES (291, 13, NULL, 'share', NULL, true, '127.0.0.1', 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/140.0.0.0 Safari/537.36', NULL, '2025-10-04 03:36:09.804388+00', NULL, '{"share_id": 3, "share_type": "external", "access_time": "2025-10-04T03:36:10.758585+00:00", "share_token": "39qgEmDHWCy897FLUNovW2pOaSOIV5lW-Tew1uxcfg4"}', NULL);
INSERT INTO public.document_access_logs VALUES (293, 13, NULL, 'share', NULL, true, '127.0.0.1', 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/140.0.0.0 Safari/537.36', NULL, '2025-10-04 03:36:10.045674+00', NULL, '{"share_id": 3, "share_type": "external", "access_time": "2025-10-04T03:36:10.980513+00:00", "share_token": "39qgEmDHWCy897FLUNovW2pOaSOIV5lW-Tew1uxcfg4"}', NULL);
INSERT INTO public.document_access_logs VALUES (290, 13, NULL, 'share', NULL, true, '127.0.0.1', 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/140.0.0.0 Safari/537.36', NULL, '2025-10-04 03:36:09.443818+00', NULL, '{"share_id": 3, "share_type": "external", "access_time": "2025-10-04T03:36:10.425403+00:00", "share_token": "39qgEmDHWCy897FLUNovW2pOaSOIV5lW-Tew1uxcfg4"}', NULL);
INSERT INTO public.document_access_logs VALUES (292, 13, NULL, 'share', NULL, true, '127.0.0.1', 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/140.0.0.0 Safari/537.36', NULL, '2025-10-04 03:36:09.899364+00', NULL, '{"share_id": 3, "share_type": "external", "access_time": "2025-10-04T03:36:10.846038+00:00", "share_token": "39qgEmDHWCy897FLUNovW2pOaSOIV5lW-Tew1uxcfg4"}', NULL);
INSERT INTO public.document_access_logs VALUES (294, 13, NULL, 'share', NULL, true, '127.0.0.1', 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/140.0.0.0 Safari/537.36', NULL, '2025-10-04 03:37:45.709679+00', NULL, '{"share_id": 3, "share_type": "external", "access_time": "2025-10-04T03:37:45.303195+00:00", "share_token": "39qgEmDHWCy897FLUNovW2pOaSOIV5lW-Tew1uxcfg4"}', NULL);
INSERT INTO public.document_access_logs VALUES (295, 13, NULL, 'share', NULL, true, '127.0.0.1', 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/140.0.0.0 Safari/537.36', NULL, '2025-10-04 03:37:45.866155+00', NULL, '{"share_id": 3, "share_type": "external", "access_time": "2025-10-04T03:37:45.446156+00:00", "share_token": "39qgEmDHWCy897FLUNovW2pOaSOIV5lW-Tew1uxcfg4"}', NULL);
INSERT INTO public.document_access_logs VALUES (296, 13, NULL, 'share', NULL, true, '127.0.0.1', 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/140.0.0.0 Safari/537.36', NULL, '2025-10-04 03:38:34.978436+00', NULL, '{"share_id": 3, "share_type": "external", "access_time": "2025-10-04T03:38:35.226376+00:00", "share_token": "39qgEmDHWCy897FLUNovW2pOaSOIV5lW-Tew1uxcfg4"}', NULL);
INSERT INTO public.document_access_logs VALUES (297, 13, NULL, 'share', NULL, true, '127.0.0.1', 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/140.0.0.0 Safari/537.36', NULL, '2025-10-04 03:38:35.174652+00', NULL, '{"share_id": 3, "share_type": "external", "access_time": "2025-10-04T03:38:35.412940+00:00", "share_token": "39qgEmDHWCy897FLUNovW2pOaSOIV5lW-Tew1uxcfg4"}', NULL);
INSERT INTO public.document_access_logs VALUES (298, 13, NULL, 'share', NULL, true, '127.0.0.1', 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/140.0.0.0 Safari/537.36', NULL, '2025-10-04 03:38:35.331003+00', NULL, '{"share_id": 3, "share_type": "external", "access_time": "2025-10-04T03:38:35.553204+00:00", "share_token": "39qgEmDHWCy897FLUNovW2pOaSOIV5lW-Tew1uxcfg4"}', NULL);
INSERT INTO public.document_access_logs VALUES (299, 17, NULL, 'share', NULL, true, '127.0.0.1', 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/140.0.0.0 Safari/537.36', NULL, '2025-10-04 03:40:47.730573+00', NULL, '{"share_id": 6, "share_type": "external", "access_time": "2025-10-04T03:40:48.372424+00:00", "share_token": "FD0YU_pqcxsdwFYCHzM2eyyKv20h6tBAUZTohZGvbYg"}', NULL);
INSERT INTO public.document_access_logs VALUES (300, 17, NULL, 'share', NULL, true, '127.0.0.1', 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/140.0.0.0 Safari/537.36', NULL, '2025-10-04 03:40:47.818707+00', NULL, '{"share_id": 6, "share_type": "external", "access_time": "2025-10-04T03:40:48.453083+00:00", "share_token": "FD0YU_pqcxsdwFYCHzM2eyyKv20h6tBAUZTohZGvbYg"}', NULL);
INSERT INTO public.document_access_logs VALUES (301, 17, NULL, 'share', NULL, true, '127.0.0.1', 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/140.0.0.0 Safari/537.36', NULL, '2025-10-04 03:40:47.879347+00', NULL, '{"share_id": 6, "share_type": "external", "access_time": "2025-10-04T03:40:48.505111+00:00", "share_token": "FD0YU_pqcxsdwFYCHzM2eyyKv20h6tBAUZTohZGvbYg"}', NULL);
INSERT INTO public.document_access_logs VALUES (302, 17, NULL, 'share', NULL, true, '127.0.0.1', 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/140.0.0.0 Safari/537.36', NULL, '2025-10-04 03:40:47.941937+00', NULL, '{"share_id": 6, "share_type": "external", "access_time": "2025-10-04T03:40:48.562853+00:00", "share_token": "FD0YU_pqcxsdwFYCHzM2eyyKv20h6tBAUZTohZGvbYg"}', NULL);
INSERT INTO public.document_access_logs VALUES (303, 17, NULL, 'share', NULL, true, '127.0.0.1', 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/140.0.0.0 Safari/537.36', NULL, '2025-10-04 03:40:48.021669+00', NULL, '{"share_id": 6, "share_type": "external", "access_time": "2025-10-04T03:40:48.634040+00:00", "share_token": "FD0YU_pqcxsdwFYCHzM2eyyKv20h6tBAUZTohZGvbYg"}', NULL);
INSERT INTO public.document_access_logs VALUES (304, 22, 3, 'download', 'api', true, NULL, NULL, NULL, '2025-10-04 03:47:46.532343+00', NULL, '{}', NULL);
INSERT INTO public.document_access_logs VALUES (305, 22, 3, 'download', 'api', true, '127.0.0.1', NULL, NULL, '2025-10-04 03:47:46.634761+00', NULL, '{}', NULL);
INSERT INTO public.document_access_logs VALUES (306, 17, NULL, 'share', NULL, true, '127.0.0.1', 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/140.0.0.0 Safari/537.36', NULL, '2025-10-04 03:49:26.265122+00', NULL, '{"share_id": 6, "share_type": "external", "access_time": "2025-10-04T03:49:26.897845+00:00", "share_token": "FD0YU_pqcxsdwFYCHzM2eyyKv20h6tBAUZTohZGvbYg"}', NULL);
INSERT INTO public.document_access_logs VALUES (307, 22, 3, 'download', 'api', true, NULL, NULL, NULL, '2025-10-04 03:51:48.007914+00', NULL, '{}', NULL);
INSERT INTO public.document_access_logs VALUES (308, 22, 3, 'download', 'api', true, '127.0.0.1', NULL, NULL, '2025-10-04 03:51:48.068296+00', NULL, '{}', NULL);
INSERT INTO public.document_access_logs VALUES (309, 17, NULL, 'share', NULL, true, '127.0.0.1', 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/140.0.0.0 Safari/537.36', NULL, '2025-10-04 03:52:49.609774+00', NULL, '{"share_id": 6, "share_type": "external", "access_time": "2025-10-04T03:52:49.117335+00:00", "share_token": "FD0YU_pqcxsdwFYCHzM2eyyKv20h6tBAUZTohZGvbYg"}', NULL);
INSERT INTO public.document_access_logs VALUES (310, 17, NULL, 'share', NULL, true, '127.0.0.1', 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/140.0.0.0 Safari/537.36', NULL, '2025-10-04 03:52:49.690928+00', NULL, '{"share_id": 6, "share_type": "external", "access_time": "2025-10-04T03:52:49.189507+00:00", "share_token": "FD0YU_pqcxsdwFYCHzM2eyyKv20h6tBAUZTohZGvbYg"}', NULL);
INSERT INTO public.document_access_logs VALUES (311, 17, NULL, 'share', NULL, true, '127.0.0.1', 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/140.0.0.0 Safari/537.36', NULL, '2025-10-04 03:52:49.827545+00', NULL, '{"share_id": 6, "share_type": "external", "access_time": "2025-10-04T03:52:49.313955+00:00", "share_token": "FD0YU_pqcxsdwFYCHzM2eyyKv20h6tBAUZTohZGvbYg"}', NULL);
INSERT INTO public.document_access_logs VALUES (312, 17, NULL, 'share', NULL, true, '127.0.0.1', 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/140.0.0.0 Safari/537.36', NULL, '2025-10-04 03:52:49.942205+00', NULL, '{"share_id": 6, "share_type": "external", "access_time": "2025-10-04T03:52:49.412730+00:00", "share_token": "FD0YU_pqcxsdwFYCHzM2eyyKv20h6tBAUZTohZGvbYg"}', NULL);
INSERT INTO public.document_access_logs VALUES (313, 17, NULL, 'share', NULL, true, '127.0.0.1', 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/140.0.0.0 Safari/537.36', NULL, '2025-10-04 03:53:00.726335+00', NULL, '{"share_id": 6, "share_type": "external", "access_time": "2025-10-04T03:53:01.711253+00:00", "share_token": "FD0YU_pqcxsdwFYCHzM2eyyKv20h6tBAUZTohZGvbYg"}', NULL);
INSERT INTO public.document_access_logs VALUES (314, 17, NULL, 'share', NULL, true, '127.0.0.1', 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/140.0.0.0 Safari/537.36', NULL, '2025-10-04 03:53:00.811341+00', NULL, '{"share_id": 6, "share_type": "external", "access_time": "2025-10-04T03:53:01.788161+00:00", "share_token": "FD0YU_pqcxsdwFYCHzM2eyyKv20h6tBAUZTohZGvbYg"}', NULL);
INSERT INTO public.document_access_logs VALUES (315, 17, NULL, 'share', NULL, true, '127.0.0.1', 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/140.0.0.0 Safari/537.36', NULL, '2025-10-04 03:53:00.86524+00', NULL, '{"share_id": 6, "share_type": "external", "access_time": "2025-10-04T03:53:01.836402+00:00", "share_token": "FD0YU_pqcxsdwFYCHzM2eyyKv20h6tBAUZTohZGvbYg"}', NULL);
INSERT INTO public.document_access_logs VALUES (316, 17, NULL, 'share', NULL, true, '127.0.0.1', 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/140.0.0.0 Safari/537.36', NULL, '2025-10-04 03:53:00.935925+00', NULL, '{"share_id": 6, "share_type": "external", "access_time": "2025-10-04T03:53:01.898459+00:00", "share_token": "FD0YU_pqcxsdwFYCHzM2eyyKv20h6tBAUZTohZGvbYg"}', NULL);
INSERT INTO public.document_access_logs VALUES (317, 17, NULL, 'share', NULL, true, '127.0.0.1', 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/140.0.0.0 Safari/537.36', NULL, '2025-10-04 03:53:01.008448+00', NULL, '{"share_id": 6, "share_type": "external", "access_time": "2025-10-04T03:53:01.970057+00:00", "share_token": "FD0YU_pqcxsdwFYCHzM2eyyKv20h6tBAUZTohZGvbYg"}', NULL);
INSERT INTO public.document_access_logs VALUES (318, 16, 3, 'download', 'api', true, NULL, NULL, NULL, '2025-10-04 03:54:08.649101+00', NULL, '{}', NULL);
INSERT INTO public.document_access_logs VALUES (319, 16, 3, 'download', 'api', true, '127.0.0.1', NULL, NULL, '2025-10-04 03:54:08.759089+00', NULL, '{}', NULL);
INSERT INTO public.document_access_logs VALUES (320, 16, NULL, 'share', NULL, true, '127.0.0.1', 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/140.0.0.0 Safari/537.36', NULL, '2025-10-04 03:54:38.045436+00', NULL, '{"share_id": 7, "share_type": "external", "access_time": "2025-10-04T03:54:37.633419+00:00", "share_token": "puV-Ds4YrVYOwqsIRpp5LpTXVrlSapcB1XgI43DM6So"}', NULL);
INSERT INTO public.document_access_logs VALUES (321, 16, NULL, 'share', NULL, true, '127.0.0.1', 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/140.0.0.0 Safari/537.36', NULL, '2025-10-04 03:54:38.130763+00', NULL, '{"share_id": 7, "share_type": "external", "access_time": "2025-10-04T03:54:37.695699+00:00", "share_token": "puV-Ds4YrVYOwqsIRpp5LpTXVrlSapcB1XgI43DM6So"}', NULL);
INSERT INTO public.document_access_logs VALUES (322, 16, NULL, 'share', NULL, true, '127.0.0.1', 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/140.0.0.0 Safari/537.36', NULL, '2025-10-04 03:54:38.247663+00', NULL, '{"share_id": 7, "share_type": "external", "access_time": "2025-10-04T03:54:37.801328+00:00", "share_token": "puV-Ds4YrVYOwqsIRpp5LpTXVrlSapcB1XgI43DM6So"}', NULL);
INSERT INTO public.document_access_logs VALUES (323, 16, NULL, 'share', NULL, true, '127.0.0.1', 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/140.0.0.0 Safari/537.36', NULL, '2025-10-04 03:54:38.348455+00', NULL, '{"share_id": 7, "share_type": "external", "access_time": "2025-10-04T03:54:37.890701+00:00", "share_token": "puV-Ds4YrVYOwqsIRpp5LpTXVrlSapcB1XgI43DM6So"}', NULL);


--
-- TOC entry 3944 (class 0 OID 24731)
-- Dependencies: 222
-- Data for Name: document_permissions; Type: TABLE DATA; Schema: public; Owner: securevault_user
--



--
-- TOC entry 3946 (class 0 OID 24739)
-- Dependencies: 224
-- Data for Name: document_shares; Type: TABLE DATA; Schema: public; Owner: securevault_user
--

INSERT INTO public.document_shares VALUES (6, 'b8787866-92eb-449f-acbb-ee3a2a81122b', 17, 'FD0YU_pqcxsdwFYCHzM2eyyKv20h6tBAUZTohZGvbYg', 'demo', 'external', false, true, false, false, NULL, 'JHNpAZ39g!&Y', '2025-10-04 03:26:48.667367+00', NULL, '2025-10-04 03:53:01.970057+00', 28, NULL, 3, true, NULL, NULL, '127.0.0.1', 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/140.0.0.0 Safari/537.36', '{}');
INSERT INTO public.document_shares VALUES (4, '6d2306de-f300-4a9a-b646-e85a85745583', 20, 'Q14x1OcHrnZ5JowYKq-OpVcBZD7QemTietv64Nfj9ZU', 'demo', 'external', false, true, false, false, NULL, 'JHNpAZ39g!&Y', '2025-10-03 17:04:56.354694+00', NULL, '2025-10-03 17:05:11.524769+00', 6, NULL, 3, true, NULL, NULL, '127.0.0.1', 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/140.0.0.0 Safari/537.36', '{}');
INSERT INTO public.document_shares VALUES (7, '1180fb15-f607-4864-a51f-8e725e444522', 16, 'puV-Ds4YrVYOwqsIRpp5LpTXVrlSapcB1XgI43DM6So', 'demo', 'external', false, true, false, false, NULL, 'JHNpAZ39g!&Y', '2025-10-04 03:54:28.582628+00', NULL, '2025-10-04 03:54:37.891709+00', 4, NULL, 3, true, NULL, NULL, '127.0.0.1', 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/140.0.0.0 Safari/537.36', '{}');
INSERT INTO public.document_shares VALUES (5, '9dc92ccb-8409-4b62-919a-a3088230ae9b', 19, 'bmeHKROkWnA3AbsELjJO0iK4sj5zjbXyu8MwQ7bTJNw', 'demo', 'external', false, true, false, false, NULL, 'JHNpAZ39g!&Y', '2025-10-03 17:31:38.817167+00', NULL, '2025-10-03 17:31:48.036092+00', 5, NULL, 3, true, NULL, NULL, '127.0.0.1', 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/140.0.0.0 Safari/537.36', '{}');
INSERT INTO public.document_shares VALUES (3, '75207cd3-dd26-4078-ab04-7fe7da2800fc', 13, '39qgEmDHWCy897FLUNovW2pOaSOIV5lW-Tew1uxcfg4', 'rest', 'external', false, true, false, false, NULL, 'JHNpAZ39g!&Y', '2025-10-03 16:36:57.075193+00', NULL, '2025-10-04 03:38:35.553204+00', 19, NULL, 3, true, NULL, NULL, '127.0.0.1', 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/140.0.0.0 Safari/537.36', '{}');


--
-- TOC entry 3948 (class 0 OID 24748)
-- Dependencies: 226
-- Data for Name: document_versions; Type: TABLE DATA; Schema: public; Owner: securevault_user
--



--
-- TOC entry 3950 (class 0 OID 24757)
-- Dependencies: 228
-- Data for Name: documents; Type: TABLE DATA; Schema: public; Owner: securevault_user
--

INSERT INTO public.documents VALUES (13, '5abb7d4f-2c68-4191-9dea-9ab16d4ce3fa', 'ameer aia infosys[1].pdf', '', 'document', 'application/pdf', NULL, '.pdf', 347572, '85c11589686c5a07c8bd232f021c8613ec7b2fe40b51e94b43142abf1d2a4a48', 'data/encrypted-files/3/03/038e7b947c4eff50ea8021d096934f1e3891b95ff8749794398dbcf1ddd7dfa3.enc', 'local', 'AES-256-GCM', NULL, 'eyJjaXBoZXJ0ZXh0IjoiZU1jbTR3cHlqQWE0UnhGQzNLSGp3T1RlTXlxdHVKZFNtUTRyd09BWXp5bz0iLCJpdiI6IituWjFBTzFGK1VyeVd6R2kiLCJhdXRoVGFnIjoibXQ1anEvcTdEVkZHVS95RTlFZW0rQT09IiwiYWxnb3JpdGhtIjoiQUVTLTI1Ni1HQ00ifQ==', 'Wyu6nrnF/APtVfK1', 'uitQ7w1s/GuF26ZkBLSMuw==', NULL, '\xdf158b4f9921abf3e591f3d59dabfbbc6274ca8f2e7ff42ac4be63ff873c8738', true, NULL, NULL, 0, 3, 3, NULL, 'active', 'private', '2025-10-03 16:35:42.941432+00', '2025-10-03 17:01:07.755552+00', '2025-10-03 22:31:07.817214+00', NULL, NULL, false, NULL, true, true, 1, true, NULL, '{}', '[]', false, NULL, '{}', 0, 0);
INSERT INTO public.documents VALUES (20, '5480aaf7-74eb-4aab-b39f-91647092daac', 'sensor_data_csv.txt', '', 'document', 'text/plain', NULL, '.txt', 1976, '56ffabf406fa403b1e6963ca5c3d22159d4a38887d9fc27c4857362d571fc10b', 'data/encrypted-files/3/19/198bbd89ba88a739bcabc2b6b3f003e9e404115ab0a0ac27e669912186e3a833.enc', 'local', 'AES-256-GCM', NULL, 'eyJjaXBoZXJ0ZXh0IjoiaGJCM2VWVXBpczd2cWJFY1g3Z1NqMTVFMk1TZVdZamNIdHo0L3N1Q2k3dz0iLCJpdiI6Iit1dmpFVzVpeWNRay9YZloiLCJhdXRoVGFnIjoiMTNFMkZmTXlxY1k4UzhiREl3WjhtZz09IiwiYWxnb3JpdGhtIjoiQUVTLTI1Ni1HQ00ifQ==', '5XarN5zVG7dquDdn', 'd5zF4bQGrF1BrO6d9f3mLA==', NULL, '\xdf158b4f9921abf3e591f3d59dabfbbc6274ca8f2e7ff42ac4be63ff873c8738', true, NULL, NULL, 0, 3, 3, NULL, 'active', 'private', '2025-10-03 17:04:18.363613+00', '2025-10-03 17:04:44.190267+00', '2025-10-03 22:34:44.148519+00', NULL, NULL, false, NULL, true, true, 1, true, NULL, '{}', '[]', false, NULL, '{}', 0, 0);
INSERT INTO public.documents VALUES (21, '9c23dd16-a185-43be-9c8c-07a6891caf66', 'Registered Student Information_26-07-2025.xlsx', '', 'document', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet', NULL, '.xlsx', 1970262, '5305a79fd44d943bd725d5fe32238037e4e9a2ac2558dacfa30c1857b561e36a', 'data/encrypted-files/3/be/be4aaad7c0ce1b7bb0250cc68542294f74e8d8113743cb1b00b6c67108f0dc6a.enc', 'local', 'AES-256-GCM', NULL, 'eyJjaXBoZXJ0ZXh0IjoiWEw3anJjVy9pU2xqdzJ4QlBMVG9SQnpkWlB6NE1tdHlEZ0tmeFFUQ0J1UT0iLCJpdiI6IlQ1ZitxcGV5bmVzbzZRSWEiLCJhdXRoVGFnIjoiQVRPcExIaEFpVUQzakZJVkdKOEllZz09IiwiYWxnb3JpdGhtIjoiQUVTLTI1Ni1HQ00ifQ==', 'fgj5E7liKKhWMXJx', 'unlHh4iLERbAueZyPsbOeA==', NULL, '\xdf158b4f9921abf3e591f3d59dabfbbc6274ca8f2e7ff42ac4be63ff873c8738', true, NULL, NULL, 0, 3, 3, NULL, 'active', 'private', '2025-10-03 17:13:12.058673+00', '2025-10-03 17:29:20.296636+00', '2025-10-03 22:59:20.296624+00', NULL, NULL, false, NULL, true, true, 1, true, NULL, '{}', '[]', false, NULL, '{}', 0, 0);
INSERT INTO public.documents VALUES (14, 'b1e2b81a-6b70-4a77-bf33-9447f620215a', 'db93cfc7-3f44-4dbe-947a-b9fbe4d43a61.csv', '', 'document', 'text/csv', NULL, '.csv', 127, '7e391a1ddc0f5ed1ed3a2b7a52dc422ad1238294b3662f9938219677faefcc19', 'data/encrypted-files/3/90/9078e7d7514f33e934f04c1419e36f67f7c54114dbe53f1f54add028b2713f7c.enc', 'local', 'AES-256-GCM', NULL, 'eyJjaXBoZXJ0ZXh0IjoiM2lIditOQWliNXZMdUlsVXpvd2l3b1N1Z0dLVXVkdFRDMXBZR3FrUFBKUT0iLCJpdiI6Ikt1ajF1cnZVVUd1aG1PdmEiLCJhdXRoVGFnIjoiMGYzYVplckMwNlZHM1pJeStsQlFBUT09IiwiYWxnb3JpdGhtIjoiQUVTLTI1Ni1HQ00ifQ==', '1VDfPcnz0lPLjSAx', 'XDiMecTzkCXg5cOdZYg9ww==', NULL, '\xdf158b4f9921abf3e591f3d59dabfbbc6274ca8f2e7ff42ac4be63ff873c8738', true, NULL, NULL, 0, 3, 3, NULL, 'active', 'private', '2025-10-03 16:36:22.375334+00', '2025-10-03 17:32:45.592044+00', '2025-10-03 23:02:45.481195+00', NULL, NULL, false, NULL, true, true, 1, true, NULL, '{}', '[]', false, NULL, '{}', 0, 0);
INSERT INTO public.documents VALUES (19, 'e31a8a0f-2e06-4044-a4d6-309bd820061b', 'updated_resume (1).docx', '', 'document', 'application/vnd.openxmlformats-officedocument.wordprocessingml.document', NULL, '.docx', 23711, '26cec02ea0c1412980c5f8323a613028d3d0cdafe9abbffa4c5674f003ad0fec', 'data/encrypted-files/3/8c/8c7d296f2068bb28e6a3330a446297fe8208cb3f17c128465fb023ce675bfd46.enc', 'local', 'AES-256-GCM', NULL, 'eyJjaXBoZXJ0ZXh0IjoiMUtYM042ci9RQS95Q3lWNmZuNTUzS2x5RDdBNGd4SWNSOWI5b2JXaURjWT0iLCJpdiI6IkRuenVsQWpZQVMzTXB0MksiLCJhdXRoVGFnIjoiaUwzN3FqTjh4bVlaYkR6MkQyUWwvQT09IiwiYWxnb3JpdGhtIjoiQUVTLTI1Ni1HQ00ifQ==', 'u5fV05ymQiOgtdeY', '1HsU4hOcreoxtZ2g9P6pgg==', NULL, '\xdf158b4f9921abf3e591f3d59dabfbbc6274ca8f2e7ff42ac4be63ff873c8738', true, NULL, NULL, 0, 3, 3, NULL, 'active', 'private', '2025-10-03 17:02:23.678167+00', '2025-10-03 17:32:56.718712+00', '2025-10-03 23:02:56.789749+00', NULL, NULL, false, NULL, true, true, 1, true, NULL, '{}', '[]', false, NULL, '{}', 0, 0);
INSERT INTO public.documents VALUES (15, 'd04a8bbe-e19c-4d28-b582-050bc817ccd1', 'fd1cf9e9-7e8a-4070-9200-508d9be6e575.pptx', '', 'document', 'application/vnd.openxmlformats-officedocument.presentationml.presentation', NULL, '.pptx', 216339, 'b40af2d2b848200d949c7f13e1b1518f9a5032c4d05500a94780109cbac38d28', 'data/encrypted-files/3/97/97221baf2e137d4f771c6087caa031f84f65153524ddce0278c1941f8bea93d5.enc', 'local', 'AES-256-GCM', NULL, 'eyJjaXBoZXJ0ZXh0IjoialM3WDhWamEwWDdITGt6TDNrczd3L0xBR05pVDlWL3ZWRERnM3hWK2VsYz0iLCJpdiI6ImJQSXVDUUQrT1Mrbnc1elgiLCJhdXRoVGFnIjoiU1JRK0dpaDh5R1FzYnZncWcvN0VsZz09IiwiYWxnb3JpdGhtIjoiQUVTLTI1Ni1HQ00ifQ==', '4sqhnd8C6SvHxL3Z', 'rE1QXbcleALTh1rpwCGsSA==', NULL, '\xdf158b4f9921abf3e591f3d59dabfbbc6274ca8f2e7ff42ac4be63ff873c8738', true, NULL, NULL, 0, 3, 3, NULL, 'deleted', 'private', '2025-10-03 17:00:20.072326+00', '2025-10-03 17:34:31.001228+00', '2025-10-03 22:59:38.863108+00', NULL, '2025-10-03 23:04:31.00878+00', false, NULL, true, true, 1, true, NULL, '{}', '[]', false, NULL, '{}', 0, 0);
INSERT INTO public.documents VALUES (23, 'b8f85099-cbb4-456b-943a-18d11875b4eb', 'Trip_Map.html', '', 'document', 'text/html', NULL, '.html', 15469, 'ec999bd160ba9473df7f054cef3e2e232ae7dd44564952b8246626d74de96f65', 'data/encrypted-files/3/0c/0c80f9e1888d82f8533bc428c97609040a31356be76a85138a8f5f2803403d08.enc', 'local', 'AES-256-GCM', NULL, 'eyJjaXBoZXJ0ZXh0IjoiMXYzVWo2Q3VVNlNiQmMrSUFjdDdZdy9FbXFSekdhS2V0a1VCVWhOMU80RT0iLCJpdiI6Im91WWx4QXc3ODBTTWJMKy8iLCJhdXRoVGFnIjoieDNHSXJ5M3Z6UVZPZTVxVnZKM0RVUT09IiwiYWxnb3JpdGhtIjoiQUVTLTI1Ni1HQ00ifQ==', 'txePlimZcx2XSQRy', 'X/fe4lnpJ7IeA56QuZPtzg==', NULL, '\xdf158b4f9921abf3e591f3d59dabfbbc6274ca8f2e7ff42ac4be63ff873c8738', true, NULL, NULL, 0, 3, 3, NULL, 'active', 'private', '2025-10-03 17:41:55.802857+00', '2025-10-03 17:41:55.802857+00', NULL, NULL, NULL, false, NULL, true, true, 1, true, NULL, '{}', '[]', false, NULL, '{}', 0, 0);
INSERT INTO public.documents VALUES (17, 'afcc8369-ed41-4590-aa50-8b28e1f61d64', 'WhatsApp Image 2025-09-22 at 20.41.55_c62a75c3.jpg', '', 'document', 'image/jpeg', NULL, '.jpg', 111524, '26ca2e81f99a5cdd83c6ddd9187f75db5029f6d6ceb6f32e8d1a9253b978dc0d', 'data/encrypted-files/3/9d/9de7c918fa61fd3aa7db9ad283b69cb243713613748c47a4b3ab2759e33f78e1.enc', 'local', 'AES-256-GCM', NULL, 'eyJjaXBoZXJ0ZXh0IjoiSTVkTTNyUGxtUUpqb0dncDdybTRraDJoZTBuWmVaWFN6WmJURzdKdzZtZz0iLCJpdiI6Imh3QkMxNXBCT3poTnNIYjgiLCJhdXRoVGFnIjoiTU5zaVBIdHN5emtjOHliVmFnV01ldz09IiwiYWxnb3JpdGhtIjoiQUVTLTI1Ni1HQ00ifQ==', 'Y/ORIR1uxtTxTrGQ', 'hpasAAtRHwhdvPvejTmd/Q==', NULL, '\xdf158b4f9921abf3e591f3d59dabfbbc6274ca8f2e7ff42ac4be63ff873c8738', true, NULL, NULL, 0, 3, 3, NULL, 'active', 'private', '2025-10-03 17:01:35.189262+00', '2025-10-04 03:26:38.235859+00', '2025-10-04 08:56:38.386604+00', NULL, NULL, false, NULL, true, true, 1, true, NULL, '{}', '[]', false, NULL, '{}', 0, 0);
INSERT INTO public.documents VALUES (22, '6337f31d-5bed-44c0-b361-829150b4323c', 'Online Pharmacy System.pptx', '', 'document', 'application/vnd.openxmlformats-officedocument.presentationml.presentation', NULL, '.pptx', 5740100, 'd22c6520b8547f83913ac970cacda08582dfc5e168fd5da70655745a115c4ffa', 'data/encrypted-files/3/0c/0c65b15dbe35350b3fe9609c0eb3eac5cf6934b1786eefc489286804bc7a24f2.enc', 'local', 'AES-256-GCM', NULL, 'eyJjaXBoZXJ0ZXh0IjoiWmZLMEVkU3pPV2RydnIyKy9nTHU4UUlqU1M0QUVyUjlwOSt5dXIzUDdmND0iLCJpdiI6ImNJaWlWYTRKOTlkYTN0cDgiLCJhdXRoVGFnIjoidFFTc2N6Z0tNb2V0b0tXQTlqWjhjZz09IiwiYWxnb3JpdGhtIjoiQUVTLTI1Ni1HQ00ifQ==', 'OoVxez4pEuTO31+A', 'MmRdK3VS02RdDylqz00DyA==', NULL, '\xdf158b4f9921abf3e591f3d59dabfbbc6274ca8f2e7ff42ac4be63ff873c8738', true, NULL, NULL, 0, 3, 3, NULL, 'active', 'private', '2025-10-03 17:33:56.380704+00', '2025-10-04 03:51:48.034168+00', '2025-10-04 09:21:48.214436+00', NULL, NULL, false, NULL, true, true, 1, true, NULL, '{}', '[]', false, NULL, '{}', 0, 0);
INSERT INTO public.documents VALUES (16, '0e9593a0-0f05-4783-b3b6-4646767b441c', 'Gemini_Generated_Image_uzpslguzpslguzps.png', '', 'document', 'image/png', NULL, '.png', 761191, '9ea7d4d2e065e62ab2bdb712fb0faabded80e7c70ab199392e76aba8aed75dca', 'data/encrypted-files/3/da/da1751bc311701ed15cb1a6ee0e5d016eb720095412494a3445a055e3bbf62b7.enc', 'local', 'AES-256-GCM', NULL, 'eyJjaXBoZXJ0ZXh0IjoiUm1XeXhBdjgxN2REV1Y2NmhnNDFMMlZQZnVrK3dQSkQrOC9kYkJRcVdTUT0iLCJpdiI6InlPRXliZTdFZng1R3FzRDYiLCJhdXRoVGFnIjoiNWJZZkd6bzhUcCtJaUZaVWNIckFpdz09IiwiYWxnb3JpdGhtIjoiQUVTLTI1Ni1HQ00ifQ==', '3jTcHg7Mfm19cZOg', 'eHfaSrPp4RgNdXAERmQG3g==', NULL, '\xdf158b4f9921abf3e591f3d59dabfbbc6274ca8f2e7ff42ac4be63ff873c8738', true, NULL, NULL, 0, 3, 3, NULL, 'active', 'private', '2025-10-03 17:00:54.696827+00', '2025-10-04 03:54:08.696126+00', '2025-10-04 09:24:08.440852+00', NULL, NULL, false, NULL, true, true, 1, true, NULL, '{}', '[]', false, NULL, '{}', 0, 0);
INSERT INTO public.documents VALUES (18, '68e845b7-db71-4c5f-92db-1652c6bb19bb', 'updated_resume (1).html', '', 'document', 'text/html', NULL, '.html', 13279, '310065196a8975d6b54e4863c6d6f2e00e6971aab14602025b94856bccaf371f', 'data/encrypted-files/3/be/be3f2062c3d0f898814c7732a66d33b217bc23c65a72047f848ce6273568beda.enc', 'local', 'AES-256-GCM', NULL, 'eyJjaXBoZXJ0ZXh0IjoiY3NmTTBLdkZ4K0p4TC95NGlnVnB0N05KNUhNTlYzNnI3QStrSEVGRE5PVT0iLCJpdiI6InBsbHBSQUx1bEdWSFlNRS8iLCJhdXRoVGFnIjoidXF4R1owSkZMajhpMDU5ejNWYWtjUT09IiwiYWxnb3JpdGhtIjoiQUVTLTI1Ni1HQ00ifQ==', '8nnWTWhgUnyaQ10n', 'cfyVWPd2mbbZE0Jvq9djBg==', NULL, '\xdf158b4f9921abf3e591f3d59dabfbbc6274ca8f2e7ff42ac4be63ff873c8738', true, NULL, NULL, 0, 3, 3, NULL, 'deleted', 'private', '2025-10-03 17:02:23.339897+00', '2025-10-03 17:42:17.683293+00', NULL, NULL, '2025-10-03 23:12:17.732375+00', false, NULL, true, true, 1, true, NULL, '{}', '[]', false, NULL, '{}', 0, 0);


--
-- TOC entry 3952 (class 0 OID 24773)
-- Dependencies: 230
-- Data for Name: encryption_audit_logs; Type: TABLE DATA; Schema: public; Owner: securevault_user
--

INSERT INTO public.encryption_audit_logs VALUES (1, 3, 'key_3_77465b09a42608277d25dc593bfac3af', 'create_key', '50192416-ac70-4266-987f-0bc7743d99d3', NULL, NULL, NULL, true, NULL, NULL, '{"algorithm": "AES-256-GCM", "derivation_method": "PBKDF2-SHA256", "iterations": 500000, "replaced_existing": false}', NULL, '2025-10-02 06:57:55.365515+00', NULL);


--
-- TOC entry 3954 (class 0 OID 24780)
-- Dependencies: 232
-- Data for Name: ip_blocklist; Type: TABLE DATA; Schema: public; Owner: securevault_user
--



--
-- TOC entry 3956 (class 0 OID 24787)
-- Dependencies: 234
-- Data for Name: key_escrow; Type: TABLE DATA; Schema: public; Owner: securevault_user
--



--
-- TOC entry 3958 (class 0 OID 24794)
-- Dependencies: 236
-- Data for Name: key_rotation_logs; Type: TABLE DATA; Schema: public; Owner: securevault_user
--



--
-- TOC entry 3960 (class 0 OID 24801)
-- Dependencies: 238
-- Data for Name: master_keys; Type: TABLE DATA; Schema: public; Owner: securevault_user
--



--
-- TOC entry 3962 (class 0 OID 24808)
-- Dependencies: 240
-- Data for Name: mfa_audit_logs; Type: TABLE DATA; Schema: public; Owner: securevault_user
--



--
-- TOC entry 3964 (class 0 OID 24814)
-- Dependencies: 242
-- Data for Name: mfa_configuration; Type: TABLE DATA; Schema: public; Owner: securevault_user
--



--
-- TOC entry 3966 (class 0 OID 24820)
-- Dependencies: 244
-- Data for Name: mfa_failed_attempts; Type: TABLE DATA; Schema: public; Owner: securevault_user
--



--
-- TOC entry 3968 (class 0 OID 24826)
-- Dependencies: 246
-- Data for Name: mfa_used_codes; Type: TABLE DATA; Schema: public; Owner: securevault_user
--



--
-- TOC entry 3970 (class 0 OID 24830)
-- Dependencies: 248
-- Data for Name: permissions; Type: TABLE DATA; Schema: public; Owner: securevault_user
--

INSERT INTO public.permissions VALUES (1, 'documents:read', 'Read documents', 'Read documents permission for documents', 'documents', 'read', true, false, '2025-10-02 04:19:35.694271', '2025-10-02 04:19:35.694271');
INSERT INTO public.permissions VALUES (2, 'documents:create', 'Create documents', 'Create documents permission for documents', 'documents', 'create', true, false, '2025-10-02 04:19:35.694271', '2025-10-02 04:19:35.694271');
INSERT INTO public.permissions VALUES (3, 'documents:update', 'Update documents', 'Update documents permission for documents', 'documents', 'update', true, false, '2025-10-02 04:19:35.694271', '2025-10-02 04:19:35.694271');
INSERT INTO public.permissions VALUES (4, 'documents:delete', 'Delete documents', 'Delete documents permission for documents', 'documents', 'delete', true, false, '2025-10-02 04:19:35.694271', '2025-10-02 04:19:35.694271');
INSERT INTO public.permissions VALUES (5, 'documents:admin', 'Administer documents', 'Administer documents permission for documents', 'documents', 'admin', true, false, '2025-10-02 04:19:35.694271', '2025-10-02 04:19:35.694271');
INSERT INTO public.permissions VALUES (6, 'users:read', 'Read users', 'Read users permission for users', 'users', 'read', true, false, '2025-10-02 04:19:35.694271', '2025-10-02 04:19:35.694271');
INSERT INTO public.permissions VALUES (7, 'users:create', 'Create users', 'Create users permission for users', 'users', 'create', true, false, '2025-10-02 04:19:35.694271', '2025-10-02 04:19:35.694271');
INSERT INTO public.permissions VALUES (8, 'users:update', 'Update users', 'Update users permission for users', 'users', 'update', true, false, '2025-10-02 04:19:35.694271', '2025-10-02 04:19:35.694271');
INSERT INTO public.permissions VALUES (9, 'users:delete', 'Delete users', 'Delete users permission for users', 'users', 'delete', true, false, '2025-10-02 04:19:35.694271', '2025-10-02 04:19:35.694271');
INSERT INTO public.permissions VALUES (10, 'users:admin', 'Administer users', 'Administer users permission for users', 'users', 'admin', true, false, '2025-10-02 04:19:35.694271', '2025-10-02 04:19:35.694271');
INSERT INTO public.permissions VALUES (11, 'roles:read', 'Read roles', 'Read roles permission for roles', 'roles', 'read', true, false, '2025-10-02 04:19:35.694271', '2025-10-02 04:19:35.694271');
INSERT INTO public.permissions VALUES (12, 'roles:create', 'Create roles', 'Create roles permission for roles', 'roles', 'create', true, false, '2025-10-02 04:19:35.694271', '2025-10-02 04:19:35.694271');
INSERT INTO public.permissions VALUES (13, 'roles:update', 'Update roles', 'Update roles permission for roles', 'roles', 'update', true, false, '2025-10-02 04:19:35.694271', '2025-10-02 04:19:35.694271');
INSERT INTO public.permissions VALUES (14, 'roles:delete', 'Delete roles', 'Delete roles permission for roles', 'roles', 'delete', true, false, '2025-10-02 04:19:35.694271', '2025-10-02 04:19:35.694271');
INSERT INTO public.permissions VALUES (15, 'roles:admin', 'Administer roles', 'Administer roles permission for roles', 'roles', 'admin', true, false, '2025-10-02 04:19:35.694271', '2025-10-02 04:19:35.694271');
INSERT INTO public.permissions VALUES (16, 'folders:read', 'Read folders', 'Read folders permission for folders', 'folders', 'read', false, false, '2025-10-02 04:19:35.694271', '2025-10-02 04:19:35.694271');
INSERT INTO public.permissions VALUES (17, 'folders:create', 'Create folders', 'Create folders permission for folders', 'folders', 'create', false, false, '2025-10-02 04:19:35.694271', '2025-10-02 04:19:35.694271');
INSERT INTO public.permissions VALUES (18, 'folders:update', 'Update folders', 'Update folders permission for folders', 'folders', 'update', false, false, '2025-10-02 04:19:35.694271', '2025-10-02 04:19:35.694271');
INSERT INTO public.permissions VALUES (19, 'folders:delete', 'Delete folders', 'Delete folders permission for folders', 'folders', 'delete', false, false, '2025-10-02 04:19:35.694271', '2025-10-02 04:19:35.694271');
INSERT INTO public.permissions VALUES (20, 'folders:admin', 'Administer folders', 'Administer folders permission for folders', 'folders', 'admin', false, false, '2025-10-02 04:19:35.694271', '2025-10-02 04:19:35.694271');
INSERT INTO public.permissions VALUES (21, 'system:read', 'Read system information', 'Read system information permission for system', 'system', 'read', true, false, '2025-10-02 04:19:35.694271', '2025-10-02 04:19:35.694271');
INSERT INTO public.permissions VALUES (22, 'system:admin', 'System administration', 'System administration permission for system', 'system', 'admin', true, false, '2025-10-02 04:19:35.694271', '2025-10-02 04:19:35.694271');
INSERT INTO public.permissions VALUES (23, 'system:audit', 'System audit access', 'System audit access permission for system', 'system', 'audit', true, false, '2025-10-02 04:19:35.694271', '2025-10-02 04:19:35.694271');
INSERT INTO public.permissions VALUES (24, 'system:backup', 'System backup access', 'System backup access permission for system', 'system', 'backup', true, false, '2025-10-02 04:19:35.694271', '2025-10-02 04:19:35.694271');
INSERT INTO public.permissions VALUES (25, 'system:config', 'System configuration', 'System configuration permission for system', 'system', 'config', true, false, '2025-10-02 04:19:35.694271', '2025-10-02 04:19:35.694271');
INSERT INTO public.permissions VALUES (26, 'audit:read', 'Read audit logs', 'Read audit logs permission for audit', 'audit', 'read', true, false, '2025-10-02 04:19:35.694271', '2025-10-02 04:19:35.694271');
INSERT INTO public.permissions VALUES (27, 'audit:create', 'Create audit entries', 'Create audit entries permission for audit', 'audit', 'create', true, false, '2025-10-02 04:19:35.694271', '2025-10-02 04:19:35.694271');
INSERT INTO public.permissions VALUES (28, 'audit:admin', 'Administer audit system', 'Administer audit system permission for audit', 'audit', 'admin', true, false, '2025-10-02 04:19:35.694271', '2025-10-02 04:19:35.694271');
INSERT INTO public.permissions VALUES (29, 'security:read', 'Read security information', 'Read security information permission for security', 'security', 'read', true, false, '2025-10-02 04:19:35.694271', '2025-10-02 04:19:35.694271');
INSERT INTO public.permissions VALUES (30, 'security:create', 'Create security events', 'Create security events permission for security', 'security', 'create', true, false, '2025-10-02 04:19:35.694271', '2025-10-02 04:19:35.694271');
INSERT INTO public.permissions VALUES (31, 'security:update', 'Update security information', 'Update security information permission for security', 'security', 'update', true, false, '2025-10-02 04:19:35.694271', '2025-10-02 04:19:35.694271');
INSERT INTO public.permissions VALUES (32, 'security:delete', 'Delete security information', 'Delete security information permission for security', 'security', 'delete', true, false, '2025-10-02 04:19:35.694271', '2025-10-02 04:19:35.694271');
INSERT INTO public.permissions VALUES (33, 'security:admin', 'Administer security system', 'Administer security system permission for security', 'security', 'admin', true, false, '2025-10-02 04:19:35.694271', '2025-10-02 04:19:35.694271');


--
-- TOC entry 3972 (class 0 OID 24836)
-- Dependencies: 250
-- Data for Name: resource_permissions; Type: TABLE DATA; Schema: public; Owner: securevault_user
--



--
-- TOC entry 3974 (class 0 OID 24842)
-- Dependencies: 252
-- Data for Name: role_hierarchy; Type: TABLE DATA; Schema: public; Owner: securevault_user
--



--
-- TOC entry 3976 (class 0 OID 24846)
-- Dependencies: 254
-- Data for Name: role_permissions; Type: TABLE DATA; Schema: public; Owner: securevault_user
--

INSERT INTO public.role_permissions VALUES (1, 1, '2025-10-02 04:19:35.694271', NULL, NULL, NULL);
INSERT INTO public.role_permissions VALUES (1, 16, '2025-10-02 04:19:35.694271', NULL, NULL, NULL);
INSERT INTO public.role_permissions VALUES (2, 1, '2025-10-02 04:19:35.694271', NULL, NULL, NULL);
INSERT INTO public.role_permissions VALUES (2, 2, '2025-10-02 04:19:35.694271', NULL, NULL, NULL);
INSERT INTO public.role_permissions VALUES (2, 16, '2025-10-02 04:19:35.694271', NULL, NULL, NULL);
INSERT INTO public.role_permissions VALUES (2, 17, '2025-10-02 04:19:35.694271', NULL, NULL, NULL);
INSERT INTO public.role_permissions VALUES (3, 1, '2025-10-02 04:19:35.694271', NULL, NULL, NULL);
INSERT INTO public.role_permissions VALUES (3, 2, '2025-10-02 04:19:35.694271', NULL, NULL, NULL);
INSERT INTO public.role_permissions VALUES (3, 3, '2025-10-02 04:19:35.694271', NULL, NULL, NULL);
INSERT INTO public.role_permissions VALUES (3, 4, '2025-10-02 04:19:35.694271', NULL, NULL, NULL);
INSERT INTO public.role_permissions VALUES (3, 16, '2025-10-02 04:19:35.694271', NULL, NULL, NULL);
INSERT INTO public.role_permissions VALUES (3, 17, '2025-10-02 04:19:35.694271', NULL, NULL, NULL);
INSERT INTO public.role_permissions VALUES (3, 18, '2025-10-02 04:19:35.694271', NULL, NULL, NULL);
INSERT INTO public.role_permissions VALUES (3, 19, '2025-10-02 04:19:35.694271', NULL, NULL, NULL);
INSERT INTO public.role_permissions VALUES (3, 6, '2025-10-02 04:19:35.694271', NULL, NULL, NULL);
INSERT INTO public.role_permissions VALUES (4, 1, '2025-10-02 04:19:35.694271', NULL, NULL, NULL);
INSERT INTO public.role_permissions VALUES (4, 2, '2025-10-02 04:19:35.694271', NULL, NULL, NULL);
INSERT INTO public.role_permissions VALUES (4, 3, '2025-10-02 04:19:35.694271', NULL, NULL, NULL);
INSERT INTO public.role_permissions VALUES (4, 4, '2025-10-02 04:19:35.694271', NULL, NULL, NULL);
INSERT INTO public.role_permissions VALUES (4, 5, '2025-10-02 04:19:35.694271', NULL, NULL, NULL);
INSERT INTO public.role_permissions VALUES (4, 16, '2025-10-02 04:19:35.694271', NULL, NULL, NULL);
INSERT INTO public.role_permissions VALUES (4, 17, '2025-10-02 04:19:35.694271', NULL, NULL, NULL);
INSERT INTO public.role_permissions VALUES (4, 18, '2025-10-02 04:19:35.694271', NULL, NULL, NULL);
INSERT INTO public.role_permissions VALUES (4, 19, '2025-10-02 04:19:35.694271', NULL, NULL, NULL);
INSERT INTO public.role_permissions VALUES (4, 20, '2025-10-02 04:19:35.694271', NULL, NULL, NULL);
INSERT INTO public.role_permissions VALUES (4, 6, '2025-10-02 04:19:35.694271', NULL, NULL, NULL);
INSERT INTO public.role_permissions VALUES (4, 7, '2025-10-02 04:19:35.694271', NULL, NULL, NULL);
INSERT INTO public.role_permissions VALUES (4, 8, '2025-10-02 04:19:35.694271', NULL, NULL, NULL);
INSERT INTO public.role_permissions VALUES (4, 10, '2025-10-02 04:19:35.694271', NULL, NULL, NULL);
INSERT INTO public.role_permissions VALUES (4, 11, '2025-10-02 04:19:35.694271', NULL, NULL, NULL);
INSERT INTO public.role_permissions VALUES (4, 21, '2025-10-02 04:19:35.694271', NULL, NULL, NULL);
INSERT INTO public.role_permissions VALUES (4, 23, '2025-10-02 04:19:35.694271', NULL, NULL, NULL);
INSERT INTO public.role_permissions VALUES (4, 24, '2025-10-02 04:19:35.694271', NULL, NULL, NULL);
INSERT INTO public.role_permissions VALUES (4, 26, '2025-10-02 04:19:35.694271', NULL, NULL, NULL);
INSERT INTO public.role_permissions VALUES (4, 29, '2025-10-02 04:19:35.694271', NULL, NULL, NULL);
INSERT INTO public.role_permissions VALUES (4, 30, '2025-10-02 04:19:35.694271', NULL, NULL, NULL);
INSERT INTO public.role_permissions VALUES (4, 31, '2025-10-02 04:19:35.694271', NULL, NULL, NULL);
INSERT INTO public.role_permissions VALUES (5, 1, '2025-10-02 04:19:35.694271', NULL, NULL, NULL);
INSERT INTO public.role_permissions VALUES (5, 2, '2025-10-02 04:19:35.694271', NULL, NULL, NULL);
INSERT INTO public.role_permissions VALUES (5, 3, '2025-10-02 04:19:35.694271', NULL, NULL, NULL);
INSERT INTO public.role_permissions VALUES (5, 4, '2025-10-02 04:19:35.694271', NULL, NULL, NULL);
INSERT INTO public.role_permissions VALUES (5, 5, '2025-10-02 04:19:35.694271', NULL, NULL, NULL);
INSERT INTO public.role_permissions VALUES (5, 16, '2025-10-02 04:19:35.694271', NULL, NULL, NULL);
INSERT INTO public.role_permissions VALUES (5, 17, '2025-10-02 04:19:35.694271', NULL, NULL, NULL);
INSERT INTO public.role_permissions VALUES (5, 18, '2025-10-02 04:19:35.694271', NULL, NULL, NULL);
INSERT INTO public.role_permissions VALUES (5, 19, '2025-10-02 04:19:35.694271', NULL, NULL, NULL);
INSERT INTO public.role_permissions VALUES (5, 20, '2025-10-02 04:19:35.694271', NULL, NULL, NULL);
INSERT INTO public.role_permissions VALUES (5, 6, '2025-10-02 04:19:35.694271', NULL, NULL, NULL);
INSERT INTO public.role_permissions VALUES (5, 7, '2025-10-02 04:19:35.694271', NULL, NULL, NULL);
INSERT INTO public.role_permissions VALUES (5, 8, '2025-10-02 04:19:35.694271', NULL, NULL, NULL);
INSERT INTO public.role_permissions VALUES (5, 9, '2025-10-02 04:19:35.694271', NULL, NULL, NULL);
INSERT INTO public.role_permissions VALUES (5, 10, '2025-10-02 04:19:35.694271', NULL, NULL, NULL);
INSERT INTO public.role_permissions VALUES (5, 11, '2025-10-02 04:19:35.694271', NULL, NULL, NULL);
INSERT INTO public.role_permissions VALUES (5, 12, '2025-10-02 04:19:35.694271', NULL, NULL, NULL);
INSERT INTO public.role_permissions VALUES (5, 13, '2025-10-02 04:19:35.694271', NULL, NULL, NULL);
INSERT INTO public.role_permissions VALUES (5, 14, '2025-10-02 04:19:35.694271', NULL, NULL, NULL);
INSERT INTO public.role_permissions VALUES (5, 15, '2025-10-02 04:19:35.694271', NULL, NULL, NULL);
INSERT INTO public.role_permissions VALUES (5, 21, '2025-10-02 04:19:35.694271', NULL, NULL, NULL);
INSERT INTO public.role_permissions VALUES (5, 22, '2025-10-02 04:19:35.694271', NULL, NULL, NULL);
INSERT INTO public.role_permissions VALUES (5, 23, '2025-10-02 04:19:35.694271', NULL, NULL, NULL);
INSERT INTO public.role_permissions VALUES (5, 24, '2025-10-02 04:19:35.694271', NULL, NULL, NULL);
INSERT INTO public.role_permissions VALUES (5, 25, '2025-10-02 04:19:35.694271', NULL, NULL, NULL);
INSERT INTO public.role_permissions VALUES (5, 26, '2025-10-02 04:19:35.694271', NULL, NULL, NULL);
INSERT INTO public.role_permissions VALUES (5, 27, '2025-10-02 04:19:35.694271', NULL, NULL, NULL);
INSERT INTO public.role_permissions VALUES (5, 28, '2025-10-02 04:19:35.694271', NULL, NULL, NULL);
INSERT INTO public.role_permissions VALUES (5, 29, '2025-10-02 04:19:35.694271', NULL, NULL, NULL);
INSERT INTO public.role_permissions VALUES (5, 30, '2025-10-02 04:19:35.694271', NULL, NULL, NULL);
INSERT INTO public.role_permissions VALUES (5, 31, '2025-10-02 04:19:35.694271', NULL, NULL, NULL);
INSERT INTO public.role_permissions VALUES (5, 32, '2025-10-02 04:19:35.694271', NULL, NULL, NULL);
INSERT INTO public.role_permissions VALUES (5, 33, '2025-10-02 04:19:35.694271', NULL, NULL, NULL);


--
-- TOC entry 3977 (class 0 OID 24851)
-- Dependencies: 255
-- Data for Name: roles; Type: TABLE DATA; Schema: public; Owner: securevault_user
--

INSERT INTO public.roles VALUES (1, 'viewer', 'Viewer', 'Can view documents and basic information', 1, true, true, '2025-10-02 04:19:35.694271', '2025-10-02 04:19:35.694271', NULL);
INSERT INTO public.roles VALUES (2, 'user', 'User', 'Standard user with document creation privileges', 2, true, true, '2025-10-02 04:19:35.694271', '2025-10-02 04:19:35.694271', NULL);
INSERT INTO public.roles VALUES (3, 'manager', 'Manager', 'Can manage team documents and users', 3, true, true, '2025-10-02 04:19:35.694271', '2025-10-02 04:19:35.694271', NULL);
INSERT INTO public.roles VALUES (4, 'admin', 'Administrator', 'Can manage system users and configurations', 4, true, true, '2025-10-02 04:19:35.694271', '2025-10-02 04:19:35.694271', NULL);
INSERT INTO public.roles VALUES (5, 'super_admin', 'Super Administrator', 'Full system access', 5, true, true, '2025-10-02 04:19:35.694271', '2025-10-02 04:19:35.694271', NULL);


--
-- TOC entry 3979 (class 0 OID 24857)
-- Dependencies: 257
-- Data for Name: security_alerts; Type: TABLE DATA; Schema: public; Owner: securevault_user
--



--
-- TOC entry 3981 (class 0 OID 24863)
-- Dependencies: 259
-- Data for Name: security_events; Type: TABLE DATA; Schema: public; Owner: securevault_user
--



--
-- TOC entry 3983 (class 0 OID 24870)
-- Dependencies: 261
-- Data for Name: security_metrics; Type: TABLE DATA; Schema: public; Owner: securevault_user
--



--
-- TOC entry 3985 (class 0 OID 24876)
-- Dependencies: 263
-- Data for Name: suspicious_patterns; Type: TABLE DATA; Schema: public; Owner: securevault_user
--



--
-- TOC entry 3987 (class 0 OID 24883)
-- Dependencies: 265
-- Data for Name: threat_responses; Type: TABLE DATA; Schema: public; Owner: securevault_user
--



--
-- TOC entry 3989 (class 0 OID 24890)
-- Dependencies: 267
-- Data for Name: token_families; Type: TABLE DATA; Schema: public; Owner: securevault_user
--



--
-- TOC entry 3990 (class 0 OID 24893)
-- Dependencies: 268
-- Data for Name: user_encryption_keys; Type: TABLE DATA; Schema: public; Owner: securevault_user
--

INSERT INTO public.user_encryption_keys VALUES (1, 3, 'key_3_77465b09a42608277d25dc593bfac3af', 'AES-256-GCM', 'PBKDF2-SHA256', 500000, '3xWLT5khq/PlkfPVnav7vGJ0yo8uf/QqxL5j/4c8hzg=', '4c8810d026cefeefe35fb2e6514097d8ef7f67fe23bb1d1aee2079974cefdab1', 'Default encryption key for document uploads', true, '2025-10-02 06:57:54.187278+00', 3, NULL, NULL, NULL);


--
-- TOC entry 3992 (class 0 OID 24900)
-- Dependencies: 270
-- Data for Name: user_roles; Type: TABLE DATA; Schema: public; Owner: securevault_user
--

INSERT INTO public.user_roles VALUES (1, 4, '2025-10-02 04:53:48.027921', NULL, NULL, true, true);
INSERT INTO public.user_roles VALUES (2, 2, '2025-10-02 05:02:21.318657', NULL, NULL, true, true);
INSERT INTO public.user_roles VALUES (3, 5, '2025-10-02 05:06:02.169946', NULL, NULL, true, true);
INSERT INTO public.user_roles VALUES (4, 2, '2025-10-02 06:57:07.627335', 3, NULL, true, true);


--
-- TOC entry 3993 (class 0 OID 24903)
-- Dependencies: 271
-- Data for Name: users; Type: TABLE DATA; Schema: public; Owner: securevault_user
--

INSERT INTO public.users VALUES (1, 'admin', 'admin@example.com', '$2b$12$25zHmY4iASJHAcI/bnRhYez2sgZo7UMO1IT6It9uwB4ULY.6XSMam', NULL, NULL, 'PBKDF2-SHA256', 500000, true, true, false, 'admin', false, NULL, NULL, NULL, NULL, NULL, 0, NULL, NULL, '2025-10-02 04:42:14.700727', '2025-10-02 04:42:14.700727', '2025-10-02 04:42:14.700727', NULL, NULL, NULL);
INSERT INTO public.users VALUES (2, 'ameer_arsath', 'ameerarsath2@gmail.com', '$2b$12$jDL6i2jLdDuUkOnb0KcdfORcDfrHQzo9hLV6H9PgvuNycB.U3FKim', 'V6Vi46InLBidRtjm4Mx/C8+NUA4IR8k/rRFCrGlkaas=', '{"ciphertext": "TweslEngSlvbeQuxZ1A6HwunhwTutUo=", "iv": "x1q3+g+jRT74CQm+", "authTag": "wSV4hqDxtjIaQWyb/6Xk3g=="}', 'PBKDF2-SHA256', 500000, true, true, false, 'user', false, NULL, NULL, NULL, NULL, NULL, 0, NULL, NULL, '2025-10-02 05:02:07.824521', '2025-10-02 05:02:09.100245', '2025-10-02 05:06:27.80659', NULL, 'ameer_arsath', NULL);
INSERT INTO public.users VALUES (4, 'test23', 'tes12d@gmail.com', '$2b$12$FTiixMur82R9O.ucP9HdGewYEo4tC8IdPtgS/ba.u1SGZYfJLJZm2', 'ulooaA+jS5mNcI/ivLTvcZGh9s6w4Je9kYdWPPOX1rY=', '{"ciphertext": "QQ05Mv8hZ+qzeGu0qbaZonU=", "iv": "WRFrmxUJB5DH0VhR", "authTag": "oQvdrM6h1UVYM4V02r0BJQ=="}', 'PBKDF2-SHA256', 500000, true, true, true, 'user', false, NULL, NULL, NULL, NULL, NULL, 0, NULL, NULL, '2025-10-02 06:57:05.606317', '2025-10-02 06:57:05.606317', '2025-10-02 06:57:05.606317', NULL, NULL, NULL);
INSERT INTO public.users VALUES (3, 'rahumana', 'rahumana@test.com', '$2b$12$bWINlzucx/7Pq7EO8pPiJufDZQsHSxDlbtvTVP7H.oKnaRC4mZNE6', 'A4eSOJpzoRq/yynj+IaQTXHVmqKUklJqAb/9Yc/Qa90=', '{"ciphertext": "P3bZ1OsawduG/2pIZRV6IsaPzg==", "iv": "C6/FBeluM5hhWbWz", "authTag": "pYiTEYjij8vG3qlU5FQEJQ=="}', 'PBKDF2-SHA256', 500000, true, true, false, 'super_admin', false, NULL, NULL, NULL, NULL, NULL, 0, NULL, '2025-10-04 03:53:45.744263', '2025-10-02 05:04:02.529396', '2025-10-02 10:34:03.177688', '2025-10-04 03:53:45.86412', NULL, 'Test User', NULL);


--
-- TOC entry 4030 (class 0 OID 0)
-- Dependencies: 219
-- Name: crypto_randomness_tests_id_seq; Type: SEQUENCE SET; Schema: public; Owner: securevault_user
--

SELECT pg_catalog.setval('public.crypto_randomness_tests_id_seq', 1, false);


--
-- TOC entry 4031 (class 0 OID 0)
-- Dependencies: 221
-- Name: document_access_logs_id_seq; Type: SEQUENCE SET; Schema: public; Owner: securevault_user
--

SELECT pg_catalog.setval('public.document_access_logs_id_seq', 323, true);


--
-- TOC entry 4032 (class 0 OID 0)
-- Dependencies: 223
-- Name: document_permissions_id_seq; Type: SEQUENCE SET; Schema: public; Owner: securevault_user
--

SELECT pg_catalog.setval('public.document_permissions_id_seq', 1, false);


--
-- TOC entry 4033 (class 0 OID 0)
-- Dependencies: 225
-- Name: document_shares_id_seq; Type: SEQUENCE SET; Schema: public; Owner: securevault_user
--

SELECT pg_catalog.setval('public.document_shares_id_seq', 7, true);


--
-- TOC entry 4034 (class 0 OID 0)
-- Dependencies: 227
-- Name: document_versions_id_seq; Type: SEQUENCE SET; Schema: public; Owner: securevault_user
--

SELECT pg_catalog.setval('public.document_versions_id_seq', 1, false);


--
-- TOC entry 4035 (class 0 OID 0)
-- Dependencies: 229
-- Name: documents_id_seq; Type: SEQUENCE SET; Schema: public; Owner: securevault_user
--

SELECT pg_catalog.setval('public.documents_id_seq', 23, true);


--
-- TOC entry 4036 (class 0 OID 0)
-- Dependencies: 231
-- Name: encryption_audit_logs_id_seq; Type: SEQUENCE SET; Schema: public; Owner: securevault_user
--

SELECT pg_catalog.setval('public.encryption_audit_logs_id_seq', 1, true);


--
-- TOC entry 4037 (class 0 OID 0)
-- Dependencies: 233
-- Name: ip_blocklist_id_seq; Type: SEQUENCE SET; Schema: public; Owner: securevault_user
--

SELECT pg_catalog.setval('public.ip_blocklist_id_seq', 1, false);


--
-- TOC entry 4038 (class 0 OID 0)
-- Dependencies: 235
-- Name: key_escrow_id_seq; Type: SEQUENCE SET; Schema: public; Owner: securevault_user
--

SELECT pg_catalog.setval('public.key_escrow_id_seq', 1, false);


--
-- TOC entry 4039 (class 0 OID 0)
-- Dependencies: 237
-- Name: key_rotation_logs_id_seq; Type: SEQUENCE SET; Schema: public; Owner: securevault_user
--

SELECT pg_catalog.setval('public.key_rotation_logs_id_seq', 1, false);


--
-- TOC entry 4040 (class 0 OID 0)
-- Dependencies: 239
-- Name: master_keys_id_seq; Type: SEQUENCE SET; Schema: public; Owner: securevault_user
--

SELECT pg_catalog.setval('public.master_keys_id_seq', 1, false);


--
-- TOC entry 4041 (class 0 OID 0)
-- Dependencies: 241
-- Name: mfa_audit_logs_id_seq; Type: SEQUENCE SET; Schema: public; Owner: securevault_user
--

SELECT pg_catalog.setval('public.mfa_audit_logs_id_seq', 1, false);


--
-- TOC entry 4042 (class 0 OID 0)
-- Dependencies: 243
-- Name: mfa_configuration_id_seq; Type: SEQUENCE SET; Schema: public; Owner: securevault_user
--

SELECT pg_catalog.setval('public.mfa_configuration_id_seq', 1, false);


--
-- TOC entry 4043 (class 0 OID 0)
-- Dependencies: 245
-- Name: mfa_failed_attempts_id_seq; Type: SEQUENCE SET; Schema: public; Owner: securevault_user
--

SELECT pg_catalog.setval('public.mfa_failed_attempts_id_seq', 1, false);


--
-- TOC entry 4044 (class 0 OID 0)
-- Dependencies: 247
-- Name: mfa_used_codes_id_seq; Type: SEQUENCE SET; Schema: public; Owner: securevault_user
--

SELECT pg_catalog.setval('public.mfa_used_codes_id_seq', 1, false);


--
-- TOC entry 4045 (class 0 OID 0)
-- Dependencies: 249
-- Name: permissions_id_seq; Type: SEQUENCE SET; Schema: public; Owner: securevault_user
--

SELECT pg_catalog.setval('public.permissions_id_seq', 33, true);


--
-- TOC entry 4046 (class 0 OID 0)
-- Dependencies: 251
-- Name: resource_permissions_id_seq; Type: SEQUENCE SET; Schema: public; Owner: securevault_user
--

SELECT pg_catalog.setval('public.resource_permissions_id_seq', 1, false);


--
-- TOC entry 4047 (class 0 OID 0)
-- Dependencies: 253
-- Name: role_hierarchy_id_seq; Type: SEQUENCE SET; Schema: public; Owner: securevault_user
--

SELECT pg_catalog.setval('public.role_hierarchy_id_seq', 1, false);


--
-- TOC entry 4048 (class 0 OID 0)
-- Dependencies: 256
-- Name: roles_id_seq; Type: SEQUENCE SET; Schema: public; Owner: securevault_user
--

SELECT pg_catalog.setval('public.roles_id_seq', 5, true);


--
-- TOC entry 4049 (class 0 OID 0)
-- Dependencies: 258
-- Name: security_alerts_id_seq; Type: SEQUENCE SET; Schema: public; Owner: securevault_user
--

SELECT pg_catalog.setval('public.security_alerts_id_seq', 1, false);


--
-- TOC entry 4050 (class 0 OID 0)
-- Dependencies: 260
-- Name: security_events_id_seq; Type: SEQUENCE SET; Schema: public; Owner: securevault_user
--

SELECT pg_catalog.setval('public.security_events_id_seq', 1, false);


--
-- TOC entry 4051 (class 0 OID 0)
-- Dependencies: 262
-- Name: security_metrics_id_seq; Type: SEQUENCE SET; Schema: public; Owner: securevault_user
--

SELECT pg_catalog.setval('public.security_metrics_id_seq', 1, false);


--
-- TOC entry 4052 (class 0 OID 0)
-- Dependencies: 264
-- Name: suspicious_patterns_id_seq; Type: SEQUENCE SET; Schema: public; Owner: securevault_user
--

SELECT pg_catalog.setval('public.suspicious_patterns_id_seq', 1, false);


--
-- TOC entry 4053 (class 0 OID 0)
-- Dependencies: 266
-- Name: threat_responses_id_seq; Type: SEQUENCE SET; Schema: public; Owner: securevault_user
--

SELECT pg_catalog.setval('public.threat_responses_id_seq', 1, false);


--
-- TOC entry 4054 (class 0 OID 0)
-- Dependencies: 269
-- Name: user_encryption_keys_id_seq; Type: SEQUENCE SET; Schema: public; Owner: securevault_user
--

SELECT pg_catalog.setval('public.user_encryption_keys_id_seq', 1, true);


--
-- TOC entry 4055 (class 0 OID 0)
-- Dependencies: 272
-- Name: users_id_seq; Type: SEQUENCE SET; Schema: public; Owner: securevault_user
--

SELECT pg_catalog.setval('public.users_id_seq', 4, true);


--
-- TOC entry 3518 (class 2606 OID 24936)
-- Name: alembic_version alembic_version_pkc; Type: CONSTRAINT; Schema: public; Owner: securevault_user
--

ALTER TABLE ONLY public.alembic_version
    ADD CONSTRAINT alembic_version_pkc PRIMARY KEY (version_num);


--
-- TOC entry 3520 (class 2606 OID 24938)
-- Name: crypto_randomness_tests crypto_randomness_tests_pkey; Type: CONSTRAINT; Schema: public; Owner: securevault_user
--

ALTER TABLE ONLY public.crypto_randomness_tests
    ADD CONSTRAINT crypto_randomness_tests_pkey PRIMARY KEY (id);


--
-- TOC entry 3528 (class 2606 OID 24940)
-- Name: document_access_logs document_access_logs_pkey; Type: CONSTRAINT; Schema: public; Owner: securevault_user
--

ALTER TABLE ONLY public.document_access_logs
    ADD CONSTRAINT document_access_logs_pkey PRIMARY KEY (id);


--
-- TOC entry 3537 (class 2606 OID 24942)
-- Name: document_permissions document_permissions_pkey; Type: CONSTRAINT; Schema: public; Owner: securevault_user
--

ALTER TABLE ONLY public.document_permissions
    ADD CONSTRAINT document_permissions_pkey PRIMARY KEY (id);


--
-- TOC entry 3544 (class 2606 OID 24944)
-- Name: document_shares document_shares_pkey; Type: CONSTRAINT; Schema: public; Owner: securevault_user
--

ALTER TABLE ONLY public.document_shares
    ADD CONSTRAINT document_shares_pkey PRIMARY KEY (id);


--
-- TOC entry 3552 (class 2606 OID 24946)
-- Name: document_versions document_versions_pkey; Type: CONSTRAINT; Schema: public; Owner: securevault_user
--

ALTER TABLE ONLY public.document_versions
    ADD CONSTRAINT document_versions_pkey PRIMARY KEY (id);


--
-- TOC entry 3558 (class 2606 OID 24948)
-- Name: documents documents_pkey; Type: CONSTRAINT; Schema: public; Owner: securevault_user
--

ALTER TABLE ONLY public.documents
    ADD CONSTRAINT documents_pkey PRIMARY KEY (id);


--
-- TOC entry 3574 (class 2606 OID 24950)
-- Name: encryption_audit_logs encryption_audit_logs_pkey; Type: CONSTRAINT; Schema: public; Owner: securevault_user
--

ALTER TABLE ONLY public.encryption_audit_logs
    ADD CONSTRAINT encryption_audit_logs_pkey PRIMARY KEY (id);


--
-- TOC entry 3590 (class 2606 OID 24952)
-- Name: ip_blocklist ip_blocklist_pkey; Type: CONSTRAINT; Schema: public; Owner: securevault_user
--

ALTER TABLE ONLY public.ip_blocklist
    ADD CONSTRAINT ip_blocklist_pkey PRIMARY KEY (id);


--
-- TOC entry 3602 (class 2606 OID 24954)
-- Name: key_escrow key_escrow_pkey; Type: CONSTRAINT; Schema: public; Owner: securevault_user
--

ALTER TABLE ONLY public.key_escrow
    ADD CONSTRAINT key_escrow_pkey PRIMARY KEY (id);


--
-- TOC entry 3613 (class 2606 OID 24956)
-- Name: key_rotation_logs key_rotation_logs_pkey; Type: CONSTRAINT; Schema: public; Owner: securevault_user
--

ALTER TABLE ONLY public.key_rotation_logs
    ADD CONSTRAINT key_rotation_logs_pkey PRIMARY KEY (id);


--
-- TOC entry 3620 (class 2606 OID 24958)
-- Name: master_keys master_keys_pkey; Type: CONSTRAINT; Schema: public; Owner: securevault_user
--

ALTER TABLE ONLY public.master_keys
    ADD CONSTRAINT master_keys_pkey PRIMARY KEY (id);


--
-- TOC entry 3628 (class 2606 OID 24960)
-- Name: mfa_audit_logs mfa_audit_logs_pkey; Type: CONSTRAINT; Schema: public; Owner: securevault_user
--

ALTER TABLE ONLY public.mfa_audit_logs
    ADD CONSTRAINT mfa_audit_logs_pkey PRIMARY KEY (id);


--
-- TOC entry 3631 (class 2606 OID 24962)
-- Name: mfa_configuration mfa_configuration_pkey; Type: CONSTRAINT; Schema: public; Owner: securevault_user
--

ALTER TABLE ONLY public.mfa_configuration
    ADD CONSTRAINT mfa_configuration_pkey PRIMARY KEY (id);


--
-- TOC entry 3637 (class 2606 OID 24964)
-- Name: mfa_failed_attempts mfa_failed_attempts_pkey; Type: CONSTRAINT; Schema: public; Owner: securevault_user
--

ALTER TABLE ONLY public.mfa_failed_attempts
    ADD CONSTRAINT mfa_failed_attempts_pkey PRIMARY KEY (id);


--
-- TOC entry 3643 (class 2606 OID 24966)
-- Name: mfa_used_codes mfa_used_codes_pkey; Type: CONSTRAINT; Schema: public; Owner: securevault_user
--

ALTER TABLE ONLY public.mfa_used_codes
    ADD CONSTRAINT mfa_used_codes_pkey PRIMARY KEY (id);


--
-- TOC entry 3650 (class 2606 OID 24968)
-- Name: permissions permissions_pkey; Type: CONSTRAINT; Schema: public; Owner: securevault_user
--

ALTER TABLE ONLY public.permissions
    ADD CONSTRAINT permissions_pkey PRIMARY KEY (id);


--
-- TOC entry 3657 (class 2606 OID 24970)
-- Name: resource_permissions resource_permissions_pkey; Type: CONSTRAINT; Schema: public; Owner: securevault_user
--

ALTER TABLE ONLY public.resource_permissions
    ADD CONSTRAINT resource_permissions_pkey PRIMARY KEY (id);


--
-- TOC entry 3664 (class 2606 OID 24972)
-- Name: role_hierarchy role_hierarchy_pkey; Type: CONSTRAINT; Schema: public; Owner: securevault_user
--

ALTER TABLE ONLY public.role_hierarchy
    ADD CONSTRAINT role_hierarchy_pkey PRIMARY KEY (id);


--
-- TOC entry 3668 (class 2606 OID 24974)
-- Name: role_permissions role_permissions_pkey; Type: CONSTRAINT; Schema: public; Owner: securevault_user
--

ALTER TABLE ONLY public.role_permissions
    ADD CONSTRAINT role_permissions_pkey PRIMARY KEY (role_id, permission_id);


--
-- TOC entry 3673 (class 2606 OID 24976)
-- Name: roles roles_pkey; Type: CONSTRAINT; Schema: public; Owner: securevault_user
--

ALTER TABLE ONLY public.roles
    ADD CONSTRAINT roles_pkey PRIMARY KEY (id);


--
-- TOC entry 3682 (class 2606 OID 24978)
-- Name: security_alerts security_alerts_pkey; Type: CONSTRAINT; Schema: public; Owner: securevault_user
--

ALTER TABLE ONLY public.security_alerts
    ADD CONSTRAINT security_alerts_pkey PRIMARY KEY (id);


--
-- TOC entry 3699 (class 2606 OID 24980)
-- Name: security_events security_events_pkey; Type: CONSTRAINT; Schema: public; Owner: securevault_user
--

ALTER TABLE ONLY public.security_events
    ADD CONSTRAINT security_events_pkey PRIMARY KEY (id);


--
-- TOC entry 3704 (class 2606 OID 24982)
-- Name: security_metrics security_metrics_pkey; Type: CONSTRAINT; Schema: public; Owner: securevault_user
--

ALTER TABLE ONLY public.security_metrics
    ADD CONSTRAINT security_metrics_pkey PRIMARY KEY (id);


--
-- TOC entry 3713 (class 2606 OID 24984)
-- Name: suspicious_patterns suspicious_patterns_pkey; Type: CONSTRAINT; Schema: public; Owner: securevault_user
--

ALTER TABLE ONLY public.suspicious_patterns
    ADD CONSTRAINT suspicious_patterns_pkey PRIMARY KEY (id);


--
-- TOC entry 3722 (class 2606 OID 24986)
-- Name: threat_responses threat_responses_pkey; Type: CONSTRAINT; Schema: public; Owner: securevault_user
--

ALTER TABLE ONLY public.threat_responses
    ADD CONSTRAINT threat_responses_pkey PRIMARY KEY (id);


--
-- TOC entry 3726 (class 2606 OID 24988)
-- Name: token_families token_families_pkey; Type: CONSTRAINT; Schema: public; Owner: securevault_user
--

ALTER TABLE ONLY public.token_families
    ADD CONSTRAINT token_families_pkey PRIMARY KEY (id);


--
-- TOC entry 3604 (class 2606 OID 24990)
-- Name: key_escrow uq_key_escrow_key_id; Type: CONSTRAINT; Schema: public; Owner: securevault_user
--

ALTER TABLE ONLY public.key_escrow
    ADD CONSTRAINT uq_key_escrow_key_id UNIQUE (key_id);


--
-- TOC entry 3659 (class 2606 OID 24992)
-- Name: resource_permissions uq_resource_permission; Type: CONSTRAINT; Schema: public; Owner: securevault_user
--

ALTER TABLE ONLY public.resource_permissions
    ADD CONSTRAINT uq_resource_permission UNIQUE (resource_type, resource_id, subject_type, subject_id, permission);


--
-- TOC entry 3666 (class 2606 OID 24994)
-- Name: role_hierarchy uq_role_hierarchy; Type: CONSTRAINT; Schema: public; Owner: securevault_user
--

ALTER TABLE ONLY public.role_hierarchy
    ADD CONSTRAINT uq_role_hierarchy UNIQUE (parent_role_id, child_role_id);


--
-- TOC entry 3737 (class 2606 OID 24996)
-- Name: user_roles uq_user_role; Type: CONSTRAINT; Schema: public; Owner: securevault_user
--

ALTER TABLE ONLY public.user_roles
    ADD CONSTRAINT uq_user_role PRIMARY KEY (user_id, role_id);


--
-- TOC entry 3734 (class 2606 OID 24998)
-- Name: user_encryption_keys user_encryption_keys_pkey; Type: CONSTRAINT; Schema: public; Owner: securevault_user
--

ALTER TABLE ONLY public.user_encryption_keys
    ADD CONSTRAINT user_encryption_keys_pkey PRIMARY KEY (id);


--
-- TOC entry 3742 (class 2606 OID 25000)
-- Name: users users_pkey; Type: CONSTRAINT; Schema: public; Owner: securevault_user
--

ALTER TABLE ONLY public.users
    ADD CONSTRAINT users_pkey PRIMARY KEY (id);


--
-- TOC entry 3521 (class 1259 OID 25001)
-- Name: idx_crypto_randomness_passed; Type: INDEX; Schema: public; Owner: securevault_user
--

CREATE INDEX idx_crypto_randomness_passed ON public.crypto_randomness_tests USING btree (test_passed);


--
-- TOC entry 3522 (class 1259 OID 25002)
-- Name: idx_crypto_randomness_timestamp; Type: INDEX; Schema: public; Owner: securevault_user
--

CREATE INDEX idx_crypto_randomness_timestamp ON public.crypto_randomness_tests USING btree (test_timestamp);


--
-- TOC entry 3523 (class 1259 OID 25003)
-- Name: idx_crypto_randomness_type; Type: INDEX; Schema: public; Owner: securevault_user
--

CREATE INDEX idx_crypto_randomness_type ON public.crypto_randomness_tests USING btree (test_type);


--
-- TOC entry 3529 (class 1259 OID 25004)
-- Name: idx_doc_access_logs_accessed_at; Type: INDEX; Schema: public; Owner: securevault_user
--

CREATE INDEX idx_doc_access_logs_accessed_at ON public.document_access_logs USING btree (accessed_at);


--
-- TOC entry 3530 (class 1259 OID 25005)
-- Name: idx_doc_access_logs_doc_action; Type: INDEX; Schema: public; Owner: securevault_user
--

CREATE INDEX idx_doc_access_logs_doc_action ON public.document_access_logs USING btree (document_id, action);


--
-- TOC entry 3531 (class 1259 OID 25006)
-- Name: idx_doc_access_logs_user_accessed; Type: INDEX; Schema: public; Owner: securevault_user
--

CREATE INDEX idx_doc_access_logs_user_accessed ON public.document_access_logs USING btree (user_id, accessed_at);


--
-- TOC entry 3538 (class 1259 OID 25007)
-- Name: idx_doc_permissions_doc_user; Type: INDEX; Schema: public; Owner: securevault_user
--

CREATE INDEX idx_doc_permissions_doc_user ON public.document_permissions USING btree (document_id, user_id);


--
-- TOC entry 3539 (class 1259 OID 25008)
-- Name: idx_doc_permissions_type_granted; Type: INDEX; Schema: public; Owner: securevault_user
--

CREATE INDEX idx_doc_permissions_type_granted ON public.document_permissions USING btree (permission_type, granted);


--
-- TOC entry 3545 (class 1259 OID 25009)
-- Name: idx_doc_shares_document_active; Type: INDEX; Schema: public; Owner: securevault_user
--

CREATE INDEX idx_doc_shares_document_active ON public.document_shares USING btree (document_id, is_active);


--
-- TOC entry 3546 (class 1259 OID 25010)
-- Name: idx_doc_shares_token_active; Type: INDEX; Schema: public; Owner: securevault_user
--

CREATE INDEX idx_doc_shares_token_active ON public.document_shares USING btree (share_token, is_active);


--
-- TOC entry 3553 (class 1259 OID 25011)
-- Name: idx_doc_versions_doc_current; Type: INDEX; Schema: public; Owner: securevault_user
--

CREATE INDEX idx_doc_versions_doc_current ON public.document_versions USING btree (document_id, is_current);


--
-- TOC entry 3554 (class 1259 OID 25012)
-- Name: idx_doc_versions_doc_version; Type: INDEX; Schema: public; Owner: securevault_user
--

CREATE INDEX idx_doc_versions_doc_version ON public.document_versions USING btree (document_id, version_number);


--
-- TOC entry 3559 (class 1259 OID 25013)
-- Name: idx_documents_created_at; Type: INDEX; Schema: public; Owner: securevault_user
--

CREATE INDEX idx_documents_created_at ON public.documents USING btree (created_at);


--
-- TOC entry 3560 (class 1259 OID 25014)
-- Name: idx_documents_name_type; Type: INDEX; Schema: public; Owner: securevault_user
--

CREATE INDEX idx_documents_name_type ON public.documents USING btree (name, document_type);


--
-- TOC entry 3561 (class 1259 OID 25015)
-- Name: idx_documents_owner_status; Type: INDEX; Schema: public; Owner: securevault_user
--

CREATE INDEX idx_documents_owner_status ON public.documents USING btree (owner_id, status);


--
-- TOC entry 3562 (class 1259 OID 25016)
-- Name: idx_documents_parent_type; Type: INDEX; Schema: public; Owner: securevault_user
--

CREATE INDEX idx_documents_parent_type ON public.documents USING btree (parent_id, document_type);


--
-- TOC entry 3563 (class 1259 OID 25017)
-- Name: idx_documents_path_status; Type: INDEX; Schema: public; Owner: securevault_user
--

CREATE INDEX idx_documents_path_status ON public.documents USING btree (path, status);


--
-- TOC entry 3564 (class 1259 OID 25018)
-- Name: idx_documents_updated_at; Type: INDEX; Schema: public; Owner: securevault_user
--

CREATE INDEX idx_documents_updated_at ON public.documents USING btree (updated_at);


--
-- TOC entry 3575 (class 1259 OID 25019)
-- Name: idx_encryption_audit_operation; Type: INDEX; Schema: public; Owner: securevault_user
--

CREATE INDEX idx_encryption_audit_operation ON public.encryption_audit_logs USING btree (operation_id);


--
-- TOC entry 3576 (class 1259 OID 25020)
-- Name: idx_encryption_audit_risk; Type: INDEX; Schema: public; Owner: securevault_user
--

CREATE INDEX idx_encryption_audit_risk ON public.encryption_audit_logs USING btree (risk_score);


--
-- TOC entry 3577 (class 1259 OID 25021)
-- Name: idx_encryption_audit_success; Type: INDEX; Schema: public; Owner: securevault_user
--

CREATE INDEX idx_encryption_audit_success ON public.encryption_audit_logs USING btree (success);


--
-- TOC entry 3578 (class 1259 OID 25022)
-- Name: idx_encryption_audit_timestamp; Type: INDEX; Schema: public; Owner: securevault_user
--

CREATE INDEX idx_encryption_audit_timestamp ON public.encryption_audit_logs USING btree ("timestamp");


--
-- TOC entry 3579 (class 1259 OID 25023)
-- Name: idx_encryption_audit_user_action; Type: INDEX; Schema: public; Owner: securevault_user
--

CREATE INDEX idx_encryption_audit_user_action ON public.encryption_audit_logs USING btree (user_id, action);


--
-- TOC entry 3587 (class 1259 OID 25024)
-- Name: idx_ip_blocklist_expires; Type: INDEX; Schema: public; Owner: securevault_user
--

CREATE INDEX idx_ip_blocklist_expires ON public.ip_blocklist USING btree (expires_at);


--
-- TOC entry 3588 (class 1259 OID 25025)
-- Name: idx_ip_blocklist_permanent; Type: INDEX; Schema: public; Owner: securevault_user
--

CREATE INDEX idx_ip_blocklist_permanent ON public.ip_blocklist USING btree (is_permanent);


--
-- TOC entry 3594 (class 1259 OID 25026)
-- Name: idx_key_escrow_created; Type: INDEX; Schema: public; Owner: securevault_user
--

CREATE INDEX idx_key_escrow_created ON public.key_escrow USING btree (created_at);


--
-- TOC entry 3595 (class 1259 OID 25027)
-- Name: idx_key_escrow_recovered; Type: INDEX; Schema: public; Owner: securevault_user
--

CREATE INDEX idx_key_escrow_recovered ON public.key_escrow USING btree (recovered_at);


--
-- TOC entry 3596 (class 1259 OID 25028)
-- Name: idx_key_escrow_user; Type: INDEX; Schema: public; Owner: securevault_user
--

CREATE INDEX idx_key_escrow_user ON public.key_escrow USING btree (user_id);


--
-- TOC entry 3605 (class 1259 OID 25029)
-- Name: idx_key_rotation_started; Type: INDEX; Schema: public; Owner: securevault_user
--

CREATE INDEX idx_key_rotation_started ON public.key_rotation_logs USING btree (started_at);


--
-- TOC entry 3606 (class 1259 OID 25030)
-- Name: idx_key_rotation_status; Type: INDEX; Schema: public; Owner: securevault_user
--

CREATE INDEX idx_key_rotation_status ON public.key_rotation_logs USING btree (status);


--
-- TOC entry 3607 (class 1259 OID 25031)
-- Name: idx_key_rotation_user; Type: INDEX; Schema: public; Owner: securevault_user
--

CREATE INDEX idx_key_rotation_user ON public.key_rotation_logs USING btree (user_id);


--
-- TOC entry 3614 (class 1259 OID 25032)
-- Name: idx_master_keys_purpose_active; Type: INDEX; Schema: public; Owner: securevault_user
--

CREATE INDEX idx_master_keys_purpose_active ON public.master_keys USING btree (purpose, is_active);


--
-- TOC entry 3615 (class 1259 OID 25033)
-- Name: idx_master_keys_rotation; Type: INDEX; Schema: public; Owner: securevault_user
--

CREATE INDEX idx_master_keys_rotation ON public.master_keys USING btree (next_rotation_at);


--
-- TOC entry 3621 (class 1259 OID 25034)
-- Name: idx_mfa_audit_event_time; Type: INDEX; Schema: public; Owner: securevault_user
--

CREATE INDEX idx_mfa_audit_event_time ON public.mfa_audit_logs USING btree (event_type, created_at);


--
-- TOC entry 3622 (class 1259 OID 25035)
-- Name: idx_mfa_audit_user_time; Type: INDEX; Schema: public; Owner: securevault_user
--

CREATE INDEX idx_mfa_audit_user_time ON public.mfa_audit_logs USING btree (user_id, created_at);


--
-- TOC entry 3632 (class 1259 OID 25036)
-- Name: idx_mfa_failed_user_time; Type: INDEX; Schema: public; Owner: securevault_user
--

CREATE INDEX idx_mfa_failed_user_time ON public.mfa_failed_attempts USING btree (user_id, attempted_at);


--
-- TOC entry 3638 (class 1259 OID 25037)
-- Name: idx_mfa_used_codes_expires; Type: INDEX; Schema: public; Owner: securevault_user
--

CREATE INDEX idx_mfa_used_codes_expires ON public.mfa_used_codes USING btree (expires_at);


--
-- TOC entry 3639 (class 1259 OID 25038)
-- Name: idx_mfa_used_codes_user_time; Type: INDEX; Schema: public; Owner: securevault_user
--

CREATE INDEX idx_mfa_used_codes_user_time ON public.mfa_used_codes USING btree (user_id, time_window);


--
-- TOC entry 3644 (class 1259 OID 25039)
-- Name: idx_permission_resource_action; Type: INDEX; Schema: public; Owner: securevault_user
--

CREATE INDEX idx_permission_resource_action ON public.permissions USING btree (resource_type, action);


--
-- TOC entry 3651 (class 1259 OID 25040)
-- Name: idx_resource_permission_inheritance; Type: INDEX; Schema: public; Owner: securevault_user
--

CREATE INDEX idx_resource_permission_inheritance ON public.resource_permissions USING btree (inheritable, inherited_from);


--
-- TOC entry 3652 (class 1259 OID 25041)
-- Name: idx_resource_permission_lookup; Type: INDEX; Schema: public; Owner: securevault_user
--

CREATE INDEX idx_resource_permission_lookup ON public.resource_permissions USING btree (resource_type, resource_id, subject_type, subject_id);


--
-- TOC entry 3660 (class 1259 OID 25042)
-- Name: idx_role_hierarchy_child; Type: INDEX; Schema: public; Owner: securevault_user
--

CREATE INDEX idx_role_hierarchy_child ON public.role_hierarchy USING btree (child_role_id);


--
-- TOC entry 3661 (class 1259 OID 25043)
-- Name: idx_role_hierarchy_parent; Type: INDEX; Schema: public; Owner: securevault_user
--

CREATE INDEX idx_role_hierarchy_parent ON public.role_hierarchy USING btree (parent_role_id);


--
-- TOC entry 3674 (class 1259 OID 25044)
-- Name: idx_security_alerts_sent; Type: INDEX; Schema: public; Owner: securevault_user
--

CREATE INDEX idx_security_alerts_sent ON public.security_alerts USING btree (sent_at);


--
-- TOC entry 3675 (class 1259 OID 25045)
-- Name: idx_security_alerts_status; Type: INDEX; Schema: public; Owner: securevault_user
--

CREATE INDEX idx_security_alerts_status ON public.security_alerts USING btree (delivery_status);


--
-- TOC entry 3676 (class 1259 OID 25046)
-- Name: idx_security_alerts_type; Type: INDEX; Schema: public; Owner: securevault_user
--

CREATE INDEX idx_security_alerts_type ON public.security_alerts USING btree (alert_type);


--
-- TOC entry 3683 (class 1259 OID 25047)
-- Name: idx_security_events_correlation; Type: INDEX; Schema: public; Owner: securevault_user
--

CREATE INDEX idx_security_events_correlation ON public.security_events USING btree (correlation_id);


--
-- TOC entry 3684 (class 1259 OID 25048)
-- Name: idx_security_events_detected; Type: INDEX; Schema: public; Owner: securevault_user
--

CREATE INDEX idx_security_events_detected ON public.security_events USING btree (detected_at);


--
-- TOC entry 3685 (class 1259 OID 25049)
-- Name: idx_security_events_type_level; Type: INDEX; Schema: public; Owner: securevault_user
--

CREATE INDEX idx_security_events_type_level ON public.security_events USING btree (event_type, threat_level);


--
-- TOC entry 3686 (class 1259 OID 25050)
-- Name: idx_security_events_user_ip; Type: INDEX; Schema: public; Owner: securevault_user
--

CREATE INDEX idx_security_events_user_ip ON public.security_events USING btree (user_id, source_ip);


--
-- TOC entry 3700 (class 1259 OID 25051)
-- Name: idx_security_metrics_date; Type: INDEX; Schema: public; Owner: securevault_user
--

CREATE INDEX idx_security_metrics_date ON public.security_metrics USING btree (metric_date);


--
-- TOC entry 3705 (class 1259 OID 25052)
-- Name: idx_suspicious_patterns_active; Type: INDEX; Schema: public; Owner: securevault_user
--

CREATE INDEX idx_suspicious_patterns_active ON public.suspicious_patterns USING btree (is_active);


--
-- TOC entry 3706 (class 1259 OID 25053)
-- Name: idx_suspicious_patterns_level; Type: INDEX; Schema: public; Owner: securevault_user
--

CREATE INDEX idx_suspicious_patterns_level ON public.suspicious_patterns USING btree (threat_level);


--
-- TOC entry 3707 (class 1259 OID 25054)
-- Name: idx_suspicious_patterns_type; Type: INDEX; Schema: public; Owner: securevault_user
--

CREATE INDEX idx_suspicious_patterns_type ON public.suspicious_patterns USING btree (pattern_type);


--
-- TOC entry 3714 (class 1259 OID 25055)
-- Name: idx_threat_responses_action; Type: INDEX; Schema: public; Owner: securevault_user
--

CREATE INDEX idx_threat_responses_action ON public.threat_responses USING btree (action);


--
-- TOC entry 3715 (class 1259 OID 25056)
-- Name: idx_threat_responses_executed; Type: INDEX; Schema: public; Owner: securevault_user
--

CREATE INDEX idx_threat_responses_executed ON public.threat_responses USING btree (executed_at);


--
-- TOC entry 3716 (class 1259 OID 25057)
-- Name: idx_threat_responses_target; Type: INDEX; Schema: public; Owner: securevault_user
--

CREATE INDEX idx_threat_responses_target ON public.threat_responses USING btree (target_type, target_value);


--
-- TOC entry 3727 (class 1259 OID 25058)
-- Name: idx_user_encryption_keys_created; Type: INDEX; Schema: public; Owner: securevault_user
--

CREATE INDEX idx_user_encryption_keys_created ON public.user_encryption_keys USING btree (created_at);


--
-- TOC entry 3728 (class 1259 OID 25059)
-- Name: idx_user_encryption_keys_user_active; Type: INDEX; Schema: public; Owner: securevault_user
--

CREATE INDEX idx_user_encryption_keys_user_active ON public.user_encryption_keys USING btree (user_id, is_active);


--
-- TOC entry 3735 (class 1259 OID 25060)
-- Name: idx_user_role_active; Type: INDEX; Schema: public; Owner: securevault_user
--

CREATE INDEX idx_user_role_active ON public.user_roles USING btree (user_id, is_active);


--
-- TOC entry 3524 (class 1259 OID 25061)
-- Name: ix_crypto_randomness_tests_id; Type: INDEX; Schema: public; Owner: securevault_user
--

CREATE INDEX ix_crypto_randomness_tests_id ON public.crypto_randomness_tests USING btree (id);


--
-- TOC entry 3525 (class 1259 OID 25062)
-- Name: ix_crypto_randomness_tests_test_passed; Type: INDEX; Schema: public; Owner: securevault_user
--

CREATE INDEX ix_crypto_randomness_tests_test_passed ON public.crypto_randomness_tests USING btree (test_passed);


--
-- TOC entry 3526 (class 1259 OID 25063)
-- Name: ix_crypto_randomness_tests_test_type; Type: INDEX; Schema: public; Owner: securevault_user
--

CREATE INDEX ix_crypto_randomness_tests_test_type ON public.crypto_randomness_tests USING btree (test_type);


--
-- TOC entry 3532 (class 1259 OID 25064)
-- Name: ix_document_access_logs_action; Type: INDEX; Schema: public; Owner: securevault_user
--

CREATE INDEX ix_document_access_logs_action ON public.document_access_logs USING btree (action);


--
-- TOC entry 3533 (class 1259 OID 25065)
-- Name: ix_document_access_logs_document_id; Type: INDEX; Schema: public; Owner: securevault_user
--

CREATE INDEX ix_document_access_logs_document_id ON public.document_access_logs USING btree (document_id);


--
-- TOC entry 3534 (class 1259 OID 25066)
-- Name: ix_document_access_logs_id; Type: INDEX; Schema: public; Owner: securevault_user
--

CREATE INDEX ix_document_access_logs_id ON public.document_access_logs USING btree (id);


--
-- TOC entry 3535 (class 1259 OID 25067)
-- Name: ix_document_access_logs_user_id; Type: INDEX; Schema: public; Owner: securevault_user
--

CREATE INDEX ix_document_access_logs_user_id ON public.document_access_logs USING btree (user_id);


--
-- TOC entry 3540 (class 1259 OID 25068)
-- Name: ix_document_permissions_document_id; Type: INDEX; Schema: public; Owner: securevault_user
--

CREATE INDEX ix_document_permissions_document_id ON public.document_permissions USING btree (document_id);


--
-- TOC entry 3541 (class 1259 OID 25069)
-- Name: ix_document_permissions_id; Type: INDEX; Schema: public; Owner: securevault_user
--

CREATE INDEX ix_document_permissions_id ON public.document_permissions USING btree (id);


--
-- TOC entry 3542 (class 1259 OID 25070)
-- Name: ix_document_permissions_user_id; Type: INDEX; Schema: public; Owner: securevault_user
--

CREATE INDEX ix_document_permissions_user_id ON public.document_permissions USING btree (user_id);


--
-- TOC entry 3547 (class 1259 OID 25071)
-- Name: ix_document_shares_document_id; Type: INDEX; Schema: public; Owner: securevault_user
--

CREATE INDEX ix_document_shares_document_id ON public.document_shares USING btree (document_id);


--
-- TOC entry 3548 (class 1259 OID 25072)
-- Name: ix_document_shares_id; Type: INDEX; Schema: public; Owner: securevault_user
--

CREATE INDEX ix_document_shares_id ON public.document_shares USING btree (id);


--
-- TOC entry 3549 (class 1259 OID 25073)
-- Name: ix_document_shares_share_token; Type: INDEX; Schema: public; Owner: securevault_user
--

CREATE UNIQUE INDEX ix_document_shares_share_token ON public.document_shares USING btree (share_token);


--
-- TOC entry 3550 (class 1259 OID 25074)
-- Name: ix_document_shares_uuid; Type: INDEX; Schema: public; Owner: securevault_user
--

CREATE UNIQUE INDEX ix_document_shares_uuid ON public.document_shares USING btree (uuid);


--
-- TOC entry 3555 (class 1259 OID 25075)
-- Name: ix_document_versions_document_id; Type: INDEX; Schema: public; Owner: securevault_user
--

CREATE INDEX ix_document_versions_document_id ON public.document_versions USING btree (document_id);


--
-- TOC entry 3556 (class 1259 OID 25076)
-- Name: ix_document_versions_id; Type: INDEX; Schema: public; Owner: securevault_user
--

CREATE INDEX ix_document_versions_id ON public.document_versions USING btree (id);


--
-- TOC entry 3565 (class 1259 OID 25077)
-- Name: ix_documents_depth_level; Type: INDEX; Schema: public; Owner: securevault_user
--

CREATE INDEX ix_documents_depth_level ON public.documents USING btree (depth_level);


--
-- TOC entry 3566 (class 1259 OID 25078)
-- Name: ix_documents_id; Type: INDEX; Schema: public; Owner: securevault_user
--

CREATE INDEX ix_documents_id ON public.documents USING btree (id);


--
-- TOC entry 3567 (class 1259 OID 25079)
-- Name: ix_documents_name; Type: INDEX; Schema: public; Owner: securevault_user
--

CREATE INDEX ix_documents_name ON public.documents USING btree (name);


--
-- TOC entry 3568 (class 1259 OID 25080)
-- Name: ix_documents_owner_id; Type: INDEX; Schema: public; Owner: securevault_user
--

CREATE INDEX ix_documents_owner_id ON public.documents USING btree (owner_id);


--
-- TOC entry 3569 (class 1259 OID 25081)
-- Name: ix_documents_parent_id; Type: INDEX; Schema: public; Owner: securevault_user
--

CREATE INDEX ix_documents_parent_id ON public.documents USING btree (parent_id);


--
-- TOC entry 3570 (class 1259 OID 25082)
-- Name: ix_documents_path; Type: INDEX; Schema: public; Owner: securevault_user
--

CREATE INDEX ix_documents_path ON public.documents USING btree (path);


--
-- TOC entry 3571 (class 1259 OID 25083)
-- Name: ix_documents_status; Type: INDEX; Schema: public; Owner: securevault_user
--

CREATE INDEX ix_documents_status ON public.documents USING btree (status);


--
-- TOC entry 3572 (class 1259 OID 25084)
-- Name: ix_documents_uuid; Type: INDEX; Schema: public; Owner: securevault_user
--

CREATE UNIQUE INDEX ix_documents_uuid ON public.documents USING btree (uuid);


--
-- TOC entry 3580 (class 1259 OID 25085)
-- Name: ix_encryption_audit_logs_action; Type: INDEX; Schema: public; Owner: securevault_user
--

CREATE INDEX ix_encryption_audit_logs_action ON public.encryption_audit_logs USING btree (action);


--
-- TOC entry 3581 (class 1259 OID 25086)
-- Name: ix_encryption_audit_logs_id; Type: INDEX; Schema: public; Owner: securevault_user
--

CREATE INDEX ix_encryption_audit_logs_id ON public.encryption_audit_logs USING btree (id);


--
-- TOC entry 3582 (class 1259 OID 25087)
-- Name: ix_encryption_audit_logs_key_id; Type: INDEX; Schema: public; Owner: securevault_user
--

CREATE INDEX ix_encryption_audit_logs_key_id ON public.encryption_audit_logs USING btree (key_id);


--
-- TOC entry 3583 (class 1259 OID 25088)
-- Name: ix_encryption_audit_logs_operation_id; Type: INDEX; Schema: public; Owner: securevault_user
--

CREATE INDEX ix_encryption_audit_logs_operation_id ON public.encryption_audit_logs USING btree (operation_id);


--
-- TOC entry 3584 (class 1259 OID 25089)
-- Name: ix_encryption_audit_logs_success; Type: INDEX; Schema: public; Owner: securevault_user
--

CREATE INDEX ix_encryption_audit_logs_success ON public.encryption_audit_logs USING btree (success);


--
-- TOC entry 3585 (class 1259 OID 25090)
-- Name: ix_encryption_audit_logs_timestamp; Type: INDEX; Schema: public; Owner: securevault_user
--

CREATE INDEX ix_encryption_audit_logs_timestamp ON public.encryption_audit_logs USING btree ("timestamp");


--
-- TOC entry 3586 (class 1259 OID 25091)
-- Name: ix_encryption_audit_logs_user_id; Type: INDEX; Schema: public; Owner: securevault_user
--

CREATE INDEX ix_encryption_audit_logs_user_id ON public.encryption_audit_logs USING btree (user_id);


--
-- TOC entry 3591 (class 1259 OID 25092)
-- Name: ix_ip_blocklist_expires_at; Type: INDEX; Schema: public; Owner: securevault_user
--

CREATE INDEX ix_ip_blocklist_expires_at ON public.ip_blocklist USING btree (expires_at);


--
-- TOC entry 3592 (class 1259 OID 25093)
-- Name: ix_ip_blocklist_id; Type: INDEX; Schema: public; Owner: securevault_user
--

CREATE INDEX ix_ip_blocklist_id ON public.ip_blocklist USING btree (id);


--
-- TOC entry 3593 (class 1259 OID 25094)
-- Name: ix_ip_blocklist_ip_address; Type: INDEX; Schema: public; Owner: securevault_user
--

CREATE UNIQUE INDEX ix_ip_blocklist_ip_address ON public.ip_blocklist USING btree (ip_address);


--
-- TOC entry 3597 (class 1259 OID 25095)
-- Name: ix_key_escrow_id; Type: INDEX; Schema: public; Owner: securevault_user
--

CREATE INDEX ix_key_escrow_id ON public.key_escrow USING btree (id);


--
-- TOC entry 3598 (class 1259 OID 25096)
-- Name: ix_key_escrow_key_id; Type: INDEX; Schema: public; Owner: securevault_user
--

CREATE INDEX ix_key_escrow_key_id ON public.key_escrow USING btree (key_id);


--
-- TOC entry 3599 (class 1259 OID 25097)
-- Name: ix_key_escrow_master_key_id; Type: INDEX; Schema: public; Owner: securevault_user
--

CREATE INDEX ix_key_escrow_master_key_id ON public.key_escrow USING btree (master_key_id);


--
-- TOC entry 3600 (class 1259 OID 25098)
-- Name: ix_key_escrow_user_id; Type: INDEX; Schema: public; Owner: securevault_user
--

CREATE INDEX ix_key_escrow_user_id ON public.key_escrow USING btree (user_id);


--
-- TOC entry 3608 (class 1259 OID 25099)
-- Name: ix_key_rotation_logs_id; Type: INDEX; Schema: public; Owner: securevault_user
--

CREATE INDEX ix_key_rotation_logs_id ON public.key_rotation_logs USING btree (id);


--
-- TOC entry 3609 (class 1259 OID 25100)
-- Name: ix_key_rotation_logs_new_key_id; Type: INDEX; Schema: public; Owner: securevault_user
--

CREATE INDEX ix_key_rotation_logs_new_key_id ON public.key_rotation_logs USING btree (new_key_id);


--
-- TOC entry 3610 (class 1259 OID 25101)
-- Name: ix_key_rotation_logs_old_key_id; Type: INDEX; Schema: public; Owner: securevault_user
--

CREATE INDEX ix_key_rotation_logs_old_key_id ON public.key_rotation_logs USING btree (old_key_id);


--
-- TOC entry 3611 (class 1259 OID 25102)
-- Name: ix_key_rotation_logs_user_id; Type: INDEX; Schema: public; Owner: securevault_user
--

CREATE INDEX ix_key_rotation_logs_user_id ON public.key_rotation_logs USING btree (user_id);


--
-- TOC entry 3616 (class 1259 OID 25103)
-- Name: ix_master_keys_id; Type: INDEX; Schema: public; Owner: securevault_user
--

CREATE INDEX ix_master_keys_id ON public.master_keys USING btree (id);


--
-- TOC entry 3617 (class 1259 OID 25104)
-- Name: ix_master_keys_is_active; Type: INDEX; Schema: public; Owner: securevault_user
--

CREATE INDEX ix_master_keys_is_active ON public.master_keys USING btree (is_active);


--
-- TOC entry 3618 (class 1259 OID 25105)
-- Name: ix_master_keys_key_id; Type: INDEX; Schema: public; Owner: securevault_user
--

CREATE UNIQUE INDEX ix_master_keys_key_id ON public.master_keys USING btree (key_id);


--
-- TOC entry 3623 (class 1259 OID 25106)
-- Name: ix_mfa_audit_logs_created_at; Type: INDEX; Schema: public; Owner: securevault_user
--

CREATE INDEX ix_mfa_audit_logs_created_at ON public.mfa_audit_logs USING btree (created_at);


--
-- TOC entry 3624 (class 1259 OID 25107)
-- Name: ix_mfa_audit_logs_event_type; Type: INDEX; Schema: public; Owner: securevault_user
--

CREATE INDEX ix_mfa_audit_logs_event_type ON public.mfa_audit_logs USING btree (event_type);


--
-- TOC entry 3625 (class 1259 OID 25108)
-- Name: ix_mfa_audit_logs_id; Type: INDEX; Schema: public; Owner: securevault_user
--

CREATE INDEX ix_mfa_audit_logs_id ON public.mfa_audit_logs USING btree (id);


--
-- TOC entry 3626 (class 1259 OID 25109)
-- Name: ix_mfa_audit_logs_user_id; Type: INDEX; Schema: public; Owner: securevault_user
--

CREATE INDEX ix_mfa_audit_logs_user_id ON public.mfa_audit_logs USING btree (user_id);


--
-- TOC entry 3629 (class 1259 OID 25110)
-- Name: ix_mfa_configuration_id; Type: INDEX; Schema: public; Owner: securevault_user
--

CREATE INDEX ix_mfa_configuration_id ON public.mfa_configuration USING btree (id);


--
-- TOC entry 3633 (class 1259 OID 25111)
-- Name: ix_mfa_failed_attempts_attempted_at; Type: INDEX; Schema: public; Owner: securevault_user
--

CREATE INDEX ix_mfa_failed_attempts_attempted_at ON public.mfa_failed_attempts USING btree (attempted_at);


--
-- TOC entry 3634 (class 1259 OID 25112)
-- Name: ix_mfa_failed_attempts_id; Type: INDEX; Schema: public; Owner: securevault_user
--

CREATE INDEX ix_mfa_failed_attempts_id ON public.mfa_failed_attempts USING btree (id);


--
-- TOC entry 3635 (class 1259 OID 25113)
-- Name: ix_mfa_failed_attempts_user_id; Type: INDEX; Schema: public; Owner: securevault_user
--

CREATE INDEX ix_mfa_failed_attempts_user_id ON public.mfa_failed_attempts USING btree (user_id);


--
-- TOC entry 3640 (class 1259 OID 25114)
-- Name: ix_mfa_used_codes_id; Type: INDEX; Schema: public; Owner: securevault_user
--

CREATE INDEX ix_mfa_used_codes_id ON public.mfa_used_codes USING btree (id);


--
-- TOC entry 3641 (class 1259 OID 25115)
-- Name: ix_mfa_used_codes_user_id; Type: INDEX; Schema: public; Owner: securevault_user
--

CREATE INDEX ix_mfa_used_codes_user_id ON public.mfa_used_codes USING btree (user_id);


--
-- TOC entry 3645 (class 1259 OID 25116)
-- Name: ix_permissions_action; Type: INDEX; Schema: public; Owner: securevault_user
--

CREATE INDEX ix_permissions_action ON public.permissions USING btree (action);


--
-- TOC entry 3646 (class 1259 OID 25117)
-- Name: ix_permissions_id; Type: INDEX; Schema: public; Owner: securevault_user
--

CREATE INDEX ix_permissions_id ON public.permissions USING btree (id);


--
-- TOC entry 3647 (class 1259 OID 25118)
-- Name: ix_permissions_name; Type: INDEX; Schema: public; Owner: securevault_user
--

CREATE UNIQUE INDEX ix_permissions_name ON public.permissions USING btree (name);


--
-- TOC entry 3648 (class 1259 OID 25119)
-- Name: ix_permissions_resource_type; Type: INDEX; Schema: public; Owner: securevault_user
--

CREATE INDEX ix_permissions_resource_type ON public.permissions USING btree (resource_type);


--
-- TOC entry 3653 (class 1259 OID 25120)
-- Name: ix_resource_permissions_id; Type: INDEX; Schema: public; Owner: securevault_user
--

CREATE INDEX ix_resource_permissions_id ON public.resource_permissions USING btree (id);


--
-- TOC entry 3654 (class 1259 OID 25121)
-- Name: ix_resource_permissions_resource_id; Type: INDEX; Schema: public; Owner: securevault_user
--

CREATE INDEX ix_resource_permissions_resource_id ON public.resource_permissions USING btree (resource_id);


--
-- TOC entry 3655 (class 1259 OID 25122)
-- Name: ix_resource_permissions_resource_type; Type: INDEX; Schema: public; Owner: securevault_user
--

CREATE INDEX ix_resource_permissions_resource_type ON public.resource_permissions USING btree (resource_type);


--
-- TOC entry 3662 (class 1259 OID 25123)
-- Name: ix_role_hierarchy_id; Type: INDEX; Schema: public; Owner: securevault_user
--

CREATE INDEX ix_role_hierarchy_id ON public.role_hierarchy USING btree (id);


--
-- TOC entry 3669 (class 1259 OID 25124)
-- Name: ix_roles_hierarchy_level; Type: INDEX; Schema: public; Owner: securevault_user
--

CREATE INDEX ix_roles_hierarchy_level ON public.roles USING btree (hierarchy_level);


--
-- TOC entry 3670 (class 1259 OID 25125)
-- Name: ix_roles_id; Type: INDEX; Schema: public; Owner: securevault_user
--

CREATE INDEX ix_roles_id ON public.roles USING btree (id);


--
-- TOC entry 3671 (class 1259 OID 25126)
-- Name: ix_roles_name; Type: INDEX; Schema: public; Owner: securevault_user
--

CREATE UNIQUE INDEX ix_roles_name ON public.roles USING btree (name);


--
-- TOC entry 3677 (class 1259 OID 25127)
-- Name: ix_security_alerts_alert_id; Type: INDEX; Schema: public; Owner: securevault_user
--

CREATE UNIQUE INDEX ix_security_alerts_alert_id ON public.security_alerts USING btree (alert_id);


--
-- TOC entry 3678 (class 1259 OID 25128)
-- Name: ix_security_alerts_alert_type; Type: INDEX; Schema: public; Owner: securevault_user
--

CREATE INDEX ix_security_alerts_alert_type ON public.security_alerts USING btree (alert_type);


--
-- TOC entry 3679 (class 1259 OID 25129)
-- Name: ix_security_alerts_event_id; Type: INDEX; Schema: public; Owner: securevault_user
--

CREATE INDEX ix_security_alerts_event_id ON public.security_alerts USING btree (event_id);


--
-- TOC entry 3680 (class 1259 OID 25130)
-- Name: ix_security_alerts_id; Type: INDEX; Schema: public; Owner: securevault_user
--

CREATE INDEX ix_security_alerts_id ON public.security_alerts USING btree (id);


--
-- TOC entry 3687 (class 1259 OID 25131)
-- Name: ix_security_events_correlation_id; Type: INDEX; Schema: public; Owner: securevault_user
--

CREATE INDEX ix_security_events_correlation_id ON public.security_events USING btree (correlation_id);


--
-- TOC entry 3688 (class 1259 OID 25132)
-- Name: ix_security_events_detected_at; Type: INDEX; Schema: public; Owner: securevault_user
--

CREATE INDEX ix_security_events_detected_at ON public.security_events USING btree (detected_at);


--
-- TOC entry 3689 (class 1259 OID 25133)
-- Name: ix_security_events_document_id; Type: INDEX; Schema: public; Owner: securevault_user
--

CREATE INDEX ix_security_events_document_id ON public.security_events USING btree (document_id);


--
-- TOC entry 3690 (class 1259 OID 25134)
-- Name: ix_security_events_event_id; Type: INDEX; Schema: public; Owner: securevault_user
--

CREATE UNIQUE INDEX ix_security_events_event_id ON public.security_events USING btree (event_id);


--
-- TOC entry 3691 (class 1259 OID 25135)
-- Name: ix_security_events_event_type; Type: INDEX; Schema: public; Owner: securevault_user
--

CREATE INDEX ix_security_events_event_type ON public.security_events USING btree (event_type);


--
-- TOC entry 3692 (class 1259 OID 25136)
-- Name: ix_security_events_id; Type: INDEX; Schema: public; Owner: securevault_user
--

CREATE INDEX ix_security_events_id ON public.security_events USING btree (id);


--
-- TOC entry 3693 (class 1259 OID 25137)
-- Name: ix_security_events_risk_score; Type: INDEX; Schema: public; Owner: securevault_user
--

CREATE INDEX ix_security_events_risk_score ON public.security_events USING btree (risk_score);


--
-- TOC entry 3694 (class 1259 OID 25138)
-- Name: ix_security_events_source_ip; Type: INDEX; Schema: public; Owner: securevault_user
--

CREATE INDEX ix_security_events_source_ip ON public.security_events USING btree (source_ip);


--
-- TOC entry 3695 (class 1259 OID 25139)
-- Name: ix_security_events_status; Type: INDEX; Schema: public; Owner: securevault_user
--

CREATE INDEX ix_security_events_status ON public.security_events USING btree (status);


--
-- TOC entry 3696 (class 1259 OID 25140)
-- Name: ix_security_events_threat_level; Type: INDEX; Schema: public; Owner: securevault_user
--

CREATE INDEX ix_security_events_threat_level ON public.security_events USING btree (threat_level);


--
-- TOC entry 3697 (class 1259 OID 25141)
-- Name: ix_security_events_user_id; Type: INDEX; Schema: public; Owner: securevault_user
--

CREATE INDEX ix_security_events_user_id ON public.security_events USING btree (user_id);


--
-- TOC entry 3701 (class 1259 OID 25142)
-- Name: ix_security_metrics_id; Type: INDEX; Schema: public; Owner: securevault_user
--

CREATE INDEX ix_security_metrics_id ON public.security_metrics USING btree (id);


--
-- TOC entry 3702 (class 1259 OID 25143)
-- Name: ix_security_metrics_metric_date; Type: INDEX; Schema: public; Owner: securevault_user
--

CREATE INDEX ix_security_metrics_metric_date ON public.security_metrics USING btree (metric_date);


--
-- TOC entry 3708 (class 1259 OID 25144)
-- Name: ix_suspicious_patterns_id; Type: INDEX; Schema: public; Owner: securevault_user
--

CREATE INDEX ix_suspicious_patterns_id ON public.suspicious_patterns USING btree (id);


--
-- TOC entry 3709 (class 1259 OID 25145)
-- Name: ix_suspicious_patterns_is_active; Type: INDEX; Schema: public; Owner: securevault_user
--

CREATE INDEX ix_suspicious_patterns_is_active ON public.suspicious_patterns USING btree (is_active);


--
-- TOC entry 3710 (class 1259 OID 25146)
-- Name: ix_suspicious_patterns_pattern_id; Type: INDEX; Schema: public; Owner: securevault_user
--

CREATE UNIQUE INDEX ix_suspicious_patterns_pattern_id ON public.suspicious_patterns USING btree (pattern_id);


--
-- TOC entry 3711 (class 1259 OID 25147)
-- Name: ix_suspicious_patterns_pattern_type; Type: INDEX; Schema: public; Owner: securevault_user
--

CREATE INDEX ix_suspicious_patterns_pattern_type ON public.suspicious_patterns USING btree (pattern_type);


--
-- TOC entry 3717 (class 1259 OID 25148)
-- Name: ix_threat_responses_action; Type: INDEX; Schema: public; Owner: securevault_user
--

CREATE INDEX ix_threat_responses_action ON public.threat_responses USING btree (action);


--
-- TOC entry 3718 (class 1259 OID 25149)
-- Name: ix_threat_responses_event_id; Type: INDEX; Schema: public; Owner: securevault_user
--

CREATE INDEX ix_threat_responses_event_id ON public.threat_responses USING btree (event_id);


--
-- TOC entry 3719 (class 1259 OID 25150)
-- Name: ix_threat_responses_id; Type: INDEX; Schema: public; Owner: securevault_user
--

CREATE INDEX ix_threat_responses_id ON public.threat_responses USING btree (id);


--
-- TOC entry 3720 (class 1259 OID 25151)
-- Name: ix_threat_responses_response_id; Type: INDEX; Schema: public; Owner: securevault_user
--

CREATE UNIQUE INDEX ix_threat_responses_response_id ON public.threat_responses USING btree (response_id);


--
-- TOC entry 3723 (class 1259 OID 25152)
-- Name: ix_token_families_id; Type: INDEX; Schema: public; Owner: securevault_user
--

CREATE INDEX ix_token_families_id ON public.token_families USING btree (id);


--
-- TOC entry 3724 (class 1259 OID 25153)
-- Name: ix_token_families_user_id; Type: INDEX; Schema: public; Owner: securevault_user
--

CREATE INDEX ix_token_families_user_id ON public.token_families USING btree (user_id);


--
-- TOC entry 3729 (class 1259 OID 25154)
-- Name: ix_user_encryption_keys_id; Type: INDEX; Schema: public; Owner: securevault_user
--

CREATE INDEX ix_user_encryption_keys_id ON public.user_encryption_keys USING btree (id);


--
-- TOC entry 3730 (class 1259 OID 25155)
-- Name: ix_user_encryption_keys_is_active; Type: INDEX; Schema: public; Owner: securevault_user
--

CREATE INDEX ix_user_encryption_keys_is_active ON public.user_encryption_keys USING btree (is_active);


--
-- TOC entry 3731 (class 1259 OID 25156)
-- Name: ix_user_encryption_keys_key_id; Type: INDEX; Schema: public; Owner: securevault_user
--

CREATE UNIQUE INDEX ix_user_encryption_keys_key_id ON public.user_encryption_keys USING btree (key_id);


--
-- TOC entry 3732 (class 1259 OID 25157)
-- Name: ix_user_encryption_keys_user_id; Type: INDEX; Schema: public; Owner: securevault_user
--

CREATE INDEX ix_user_encryption_keys_user_id ON public.user_encryption_keys USING btree (user_id);


--
-- TOC entry 3738 (class 1259 OID 25158)
-- Name: ix_users_email; Type: INDEX; Schema: public; Owner: securevault_user
--

CREATE UNIQUE INDEX ix_users_email ON public.users USING btree (email);


--
-- TOC entry 3739 (class 1259 OID 25159)
-- Name: ix_users_id; Type: INDEX; Schema: public; Owner: securevault_user
--

CREATE INDEX ix_users_id ON public.users USING btree (id);


--
-- TOC entry 3740 (class 1259 OID 25160)
-- Name: ix_users_username; Type: INDEX; Schema: public; Owner: securevault_user
--

CREATE UNIQUE INDEX ix_users_username ON public.users USING btree (username);


--
-- TOC entry 3743 (class 2606 OID 25161)
-- Name: document_access_logs document_access_logs_document_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: securevault_user
--

ALTER TABLE ONLY public.document_access_logs
    ADD CONSTRAINT document_access_logs_document_id_fkey FOREIGN KEY (document_id) REFERENCES public.documents(id);


--
-- TOC entry 3744 (class 2606 OID 25166)
-- Name: document_access_logs document_access_logs_user_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: securevault_user
--

ALTER TABLE ONLY public.document_access_logs
    ADD CONSTRAINT document_access_logs_user_id_fkey FOREIGN KEY (user_id) REFERENCES public.users(id);


--
-- TOC entry 3745 (class 2606 OID 25171)
-- Name: document_permissions document_permissions_document_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: securevault_user
--

ALTER TABLE ONLY public.document_permissions
    ADD CONSTRAINT document_permissions_document_id_fkey FOREIGN KEY (document_id) REFERENCES public.documents(id);


--
-- TOC entry 3746 (class 2606 OID 25176)
-- Name: document_permissions document_permissions_granted_by_fkey; Type: FK CONSTRAINT; Schema: public; Owner: securevault_user
--

ALTER TABLE ONLY public.document_permissions
    ADD CONSTRAINT document_permissions_granted_by_fkey FOREIGN KEY (granted_by) REFERENCES public.users(id);


--
-- TOC entry 3747 (class 2606 OID 25181)
-- Name: document_permissions document_permissions_revoked_by_fkey; Type: FK CONSTRAINT; Schema: public; Owner: securevault_user
--

ALTER TABLE ONLY public.document_permissions
    ADD CONSTRAINT document_permissions_revoked_by_fkey FOREIGN KEY (revoked_by) REFERENCES public.users(id);


--
-- TOC entry 3748 (class 2606 OID 25186)
-- Name: document_permissions document_permissions_user_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: securevault_user
--

ALTER TABLE ONLY public.document_permissions
    ADD CONSTRAINT document_permissions_user_id_fkey FOREIGN KEY (user_id) REFERENCES public.users(id);


--
-- TOC entry 3749 (class 2606 OID 25191)
-- Name: document_shares document_shares_created_by_fkey; Type: FK CONSTRAINT; Schema: public; Owner: securevault_user
--

ALTER TABLE ONLY public.document_shares
    ADD CONSTRAINT document_shares_created_by_fkey FOREIGN KEY (created_by) REFERENCES public.users(id);


--
-- TOC entry 3750 (class 2606 OID 25196)
-- Name: document_shares document_shares_document_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: securevault_user
--

ALTER TABLE ONLY public.document_shares
    ADD CONSTRAINT document_shares_document_id_fkey FOREIGN KEY (document_id) REFERENCES public.documents(id);


--
-- TOC entry 3751 (class 2606 OID 25201)
-- Name: document_shares document_shares_revoked_by_fkey; Type: FK CONSTRAINT; Schema: public; Owner: securevault_user
--

ALTER TABLE ONLY public.document_shares
    ADD CONSTRAINT document_shares_revoked_by_fkey FOREIGN KEY (revoked_by) REFERENCES public.users(id);


--
-- TOC entry 3752 (class 2606 OID 25206)
-- Name: document_versions document_versions_created_by_fkey; Type: FK CONSTRAINT; Schema: public; Owner: securevault_user
--

ALTER TABLE ONLY public.document_versions
    ADD CONSTRAINT document_versions_created_by_fkey FOREIGN KEY (created_by) REFERENCES public.users(id);


--
-- TOC entry 3753 (class 2606 OID 25211)
-- Name: document_versions document_versions_document_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: securevault_user
--

ALTER TABLE ONLY public.document_versions
    ADD CONSTRAINT document_versions_document_id_fkey FOREIGN KEY (document_id) REFERENCES public.documents(id);


--
-- TOC entry 3754 (class 2606 OID 25216)
-- Name: documents documents_created_by_fkey; Type: FK CONSTRAINT; Schema: public; Owner: securevault_user
--

ALTER TABLE ONLY public.documents
    ADD CONSTRAINT documents_created_by_fkey FOREIGN KEY (created_by) REFERENCES public.users(id);


--
-- TOC entry 3755 (class 2606 OID 25221)
-- Name: documents documents_owner_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: securevault_user
--

ALTER TABLE ONLY public.documents
    ADD CONSTRAINT documents_owner_id_fkey FOREIGN KEY (owner_id) REFERENCES public.users(id);


--
-- TOC entry 3756 (class 2606 OID 25226)
-- Name: documents documents_parent_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: securevault_user
--

ALTER TABLE ONLY public.documents
    ADD CONSTRAINT documents_parent_id_fkey FOREIGN KEY (parent_id) REFERENCES public.documents(id);


--
-- TOC entry 3757 (class 2606 OID 25231)
-- Name: documents documents_previous_version_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: securevault_user
--

ALTER TABLE ONLY public.documents
    ADD CONSTRAINT documents_previous_version_id_fkey FOREIGN KEY (previous_version_id) REFERENCES public.documents(id);


--
-- TOC entry 3758 (class 2606 OID 25236)
-- Name: documents documents_updated_by_fkey; Type: FK CONSTRAINT; Schema: public; Owner: securevault_user
--

ALTER TABLE ONLY public.documents
    ADD CONSTRAINT documents_updated_by_fkey FOREIGN KEY (updated_by) REFERENCES public.users(id);


--
-- TOC entry 3759 (class 2606 OID 25241)
-- Name: encryption_audit_logs encryption_audit_logs_key_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: securevault_user
--

ALTER TABLE ONLY public.encryption_audit_logs
    ADD CONSTRAINT encryption_audit_logs_key_id_fkey FOREIGN KEY (key_id) REFERENCES public.user_encryption_keys(key_id);


--
-- TOC entry 3760 (class 2606 OID 25246)
-- Name: encryption_audit_logs encryption_audit_logs_user_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: securevault_user
--

ALTER TABLE ONLY public.encryption_audit_logs
    ADD CONSTRAINT encryption_audit_logs_user_id_fkey FOREIGN KEY (user_id) REFERENCES public.users(id);


--
-- TOC entry 3761 (class 2606 OID 25251)
-- Name: ip_blocklist ip_blocklist_event_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: securevault_user
--

ALTER TABLE ONLY public.ip_blocklist
    ADD CONSTRAINT ip_blocklist_event_id_fkey FOREIGN KEY (event_id) REFERENCES public.security_events(event_id);


--
-- TOC entry 3762 (class 2606 OID 25256)
-- Name: ip_blocklist ip_blocklist_removed_by_fkey; Type: FK CONSTRAINT; Schema: public; Owner: securevault_user
--

ALTER TABLE ONLY public.ip_blocklist
    ADD CONSTRAINT ip_blocklist_removed_by_fkey FOREIGN KEY (removed_by) REFERENCES public.users(id);


--
-- TOC entry 3763 (class 2606 OID 25261)
-- Name: key_escrow key_escrow_created_by_fkey; Type: FK CONSTRAINT; Schema: public; Owner: securevault_user
--

ALTER TABLE ONLY public.key_escrow
    ADD CONSTRAINT key_escrow_created_by_fkey FOREIGN KEY (created_by) REFERENCES public.users(id);


--
-- TOC entry 3764 (class 2606 OID 25266)
-- Name: key_escrow key_escrow_key_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: securevault_user
--

ALTER TABLE ONLY public.key_escrow
    ADD CONSTRAINT key_escrow_key_id_fkey FOREIGN KEY (key_id) REFERENCES public.user_encryption_keys(key_id);


--
-- TOC entry 3765 (class 2606 OID 25271)
-- Name: key_escrow key_escrow_master_key_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: securevault_user
--

ALTER TABLE ONLY public.key_escrow
    ADD CONSTRAINT key_escrow_master_key_id_fkey FOREIGN KEY (master_key_id) REFERENCES public.master_keys(key_id);


--
-- TOC entry 3766 (class 2606 OID 25276)
-- Name: key_escrow key_escrow_recovered_by_fkey; Type: FK CONSTRAINT; Schema: public; Owner: securevault_user
--

ALTER TABLE ONLY public.key_escrow
    ADD CONSTRAINT key_escrow_recovered_by_fkey FOREIGN KEY (recovered_by) REFERENCES public.users(id);


--
-- TOC entry 3767 (class 2606 OID 25281)
-- Name: key_escrow key_escrow_user_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: securevault_user
--

ALTER TABLE ONLY public.key_escrow
    ADD CONSTRAINT key_escrow_user_id_fkey FOREIGN KEY (user_id) REFERENCES public.users(id);


--
-- TOC entry 3768 (class 2606 OID 25286)
-- Name: key_rotation_logs key_rotation_logs_user_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: securevault_user
--

ALTER TABLE ONLY public.key_rotation_logs
    ADD CONSTRAINT key_rotation_logs_user_id_fkey FOREIGN KEY (user_id) REFERENCES public.users(id);


--
-- TOC entry 3769 (class 2606 OID 25291)
-- Name: master_keys master_keys_created_by_fkey; Type: FK CONSTRAINT; Schema: public; Owner: securevault_user
--

ALTER TABLE ONLY public.master_keys
    ADD CONSTRAINT master_keys_created_by_fkey FOREIGN KEY (created_by) REFERENCES public.users(id);


--
-- TOC entry 3770 (class 2606 OID 25296)
-- Name: mfa_audit_logs mfa_audit_logs_performed_by_fkey; Type: FK CONSTRAINT; Schema: public; Owner: securevault_user
--

ALTER TABLE ONLY public.mfa_audit_logs
    ADD CONSTRAINT mfa_audit_logs_performed_by_fkey FOREIGN KEY (performed_by) REFERENCES public.users(id);


--
-- TOC entry 3771 (class 2606 OID 25301)
-- Name: mfa_audit_logs mfa_audit_logs_user_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: securevault_user
--

ALTER TABLE ONLY public.mfa_audit_logs
    ADD CONSTRAINT mfa_audit_logs_user_id_fkey FOREIGN KEY (user_id) REFERENCES public.users(id);


--
-- TOC entry 3772 (class 2606 OID 25306)
-- Name: mfa_configuration mfa_configuration_updated_by_fkey; Type: FK CONSTRAINT; Schema: public; Owner: securevault_user
--

ALTER TABLE ONLY public.mfa_configuration
    ADD CONSTRAINT mfa_configuration_updated_by_fkey FOREIGN KEY (updated_by) REFERENCES public.users(id);


--
-- TOC entry 3773 (class 2606 OID 25311)
-- Name: mfa_failed_attempts mfa_failed_attempts_user_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: securevault_user
--

ALTER TABLE ONLY public.mfa_failed_attempts
    ADD CONSTRAINT mfa_failed_attempts_user_id_fkey FOREIGN KEY (user_id) REFERENCES public.users(id);


--
-- TOC entry 3774 (class 2606 OID 25316)
-- Name: mfa_used_codes mfa_used_codes_user_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: securevault_user
--

ALTER TABLE ONLY public.mfa_used_codes
    ADD CONSTRAINT mfa_used_codes_user_id_fkey FOREIGN KEY (user_id) REFERENCES public.users(id);


--
-- TOC entry 3775 (class 2606 OID 25321)
-- Name: resource_permissions resource_permissions_granted_by_fkey; Type: FK CONSTRAINT; Schema: public; Owner: securevault_user
--

ALTER TABLE ONLY public.resource_permissions
    ADD CONSTRAINT resource_permissions_granted_by_fkey FOREIGN KEY (granted_by) REFERENCES public.users(id);


--
-- TOC entry 3776 (class 2606 OID 25326)
-- Name: resource_permissions resource_permissions_inherited_from_fkey; Type: FK CONSTRAINT; Schema: public; Owner: securevault_user
--

ALTER TABLE ONLY public.resource_permissions
    ADD CONSTRAINT resource_permissions_inherited_from_fkey FOREIGN KEY (inherited_from) REFERENCES public.resource_permissions(id);


--
-- TOC entry 3777 (class 2606 OID 25331)
-- Name: role_hierarchy role_hierarchy_child_role_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: securevault_user
--

ALTER TABLE ONLY public.role_hierarchy
    ADD CONSTRAINT role_hierarchy_child_role_id_fkey FOREIGN KEY (child_role_id) REFERENCES public.roles(id) ON DELETE CASCADE;


--
-- TOC entry 3778 (class 2606 OID 25336)
-- Name: role_hierarchy role_hierarchy_created_by_fkey; Type: FK CONSTRAINT; Schema: public; Owner: securevault_user
--

ALTER TABLE ONLY public.role_hierarchy
    ADD CONSTRAINT role_hierarchy_created_by_fkey FOREIGN KEY (created_by) REFERENCES public.users(id);


--
-- TOC entry 3779 (class 2606 OID 25341)
-- Name: role_hierarchy role_hierarchy_parent_role_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: securevault_user
--

ALTER TABLE ONLY public.role_hierarchy
    ADD CONSTRAINT role_hierarchy_parent_role_id_fkey FOREIGN KEY (parent_role_id) REFERENCES public.roles(id) ON DELETE CASCADE;


--
-- TOC entry 3780 (class 2606 OID 25346)
-- Name: role_permissions role_permissions_granted_by_fkey; Type: FK CONSTRAINT; Schema: public; Owner: securevault_user
--

ALTER TABLE ONLY public.role_permissions
    ADD CONSTRAINT role_permissions_granted_by_fkey FOREIGN KEY (granted_by) REFERENCES public.users(id);


--
-- TOC entry 3781 (class 2606 OID 25351)
-- Name: role_permissions role_permissions_permission_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: securevault_user
--

ALTER TABLE ONLY public.role_permissions
    ADD CONSTRAINT role_permissions_permission_id_fkey FOREIGN KEY (permission_id) REFERENCES public.permissions(id) ON DELETE CASCADE;


--
-- TOC entry 3782 (class 2606 OID 25356)
-- Name: role_permissions role_permissions_role_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: securevault_user
--

ALTER TABLE ONLY public.role_permissions
    ADD CONSTRAINT role_permissions_role_id_fkey FOREIGN KEY (role_id) REFERENCES public.roles(id) ON DELETE CASCADE;


--
-- TOC entry 3783 (class 2606 OID 25361)
-- Name: roles roles_created_by_fkey; Type: FK CONSTRAINT; Schema: public; Owner: securevault_user
--

ALTER TABLE ONLY public.roles
    ADD CONSTRAINT roles_created_by_fkey FOREIGN KEY (created_by) REFERENCES public.users(id);


--
-- TOC entry 3784 (class 2606 OID 25366)
-- Name: security_alerts security_alerts_acknowledged_by_fkey; Type: FK CONSTRAINT; Schema: public; Owner: securevault_user
--

ALTER TABLE ONLY public.security_alerts
    ADD CONSTRAINT security_alerts_acknowledged_by_fkey FOREIGN KEY (acknowledged_by) REFERENCES public.users(id);


--
-- TOC entry 3785 (class 2606 OID 25371)
-- Name: security_alerts security_alerts_event_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: securevault_user
--

ALTER TABLE ONLY public.security_alerts
    ADD CONSTRAINT security_alerts_event_id_fkey FOREIGN KEY (event_id) REFERENCES public.security_events(event_id);


--
-- TOC entry 3786 (class 2606 OID 25376)
-- Name: security_events security_events_document_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: securevault_user
--

ALTER TABLE ONLY public.security_events
    ADD CONSTRAINT security_events_document_id_fkey FOREIGN KEY (document_id) REFERENCES public.documents(id);


--
-- TOC entry 3787 (class 2606 OID 25381)
-- Name: security_events security_events_resolved_by_fkey; Type: FK CONSTRAINT; Schema: public; Owner: securevault_user
--

ALTER TABLE ONLY public.security_events
    ADD CONSTRAINT security_events_resolved_by_fkey FOREIGN KEY (resolved_by) REFERENCES public.users(id);


--
-- TOC entry 3788 (class 2606 OID 25386)
-- Name: security_events security_events_user_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: securevault_user
--

ALTER TABLE ONLY public.security_events
    ADD CONSTRAINT security_events_user_id_fkey FOREIGN KEY (user_id) REFERENCES public.users(id);


--
-- TOC entry 3789 (class 2606 OID 25391)
-- Name: suspicious_patterns suspicious_patterns_created_by_fkey; Type: FK CONSTRAINT; Schema: public; Owner: securevault_user
--

ALTER TABLE ONLY public.suspicious_patterns
    ADD CONSTRAINT suspicious_patterns_created_by_fkey FOREIGN KEY (created_by) REFERENCES public.users(id);


--
-- TOC entry 3790 (class 2606 OID 25396)
-- Name: threat_responses threat_responses_event_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: securevault_user
--

ALTER TABLE ONLY public.threat_responses
    ADD CONSTRAINT threat_responses_event_id_fkey FOREIGN KEY (event_id) REFERENCES public.security_events(event_id);


--
-- TOC entry 3791 (class 2606 OID 25401)
-- Name: threat_responses threat_responses_reversed_by_fkey; Type: FK CONSTRAINT; Schema: public; Owner: securevault_user
--

ALTER TABLE ONLY public.threat_responses
    ADD CONSTRAINT threat_responses_reversed_by_fkey FOREIGN KEY (reversed_by) REFERENCES public.users(id);


--
-- TOC entry 3792 (class 2606 OID 25406)
-- Name: user_encryption_keys user_encryption_keys_created_by_fkey; Type: FK CONSTRAINT; Schema: public; Owner: securevault_user
--

ALTER TABLE ONLY public.user_encryption_keys
    ADD CONSTRAINT user_encryption_keys_created_by_fkey FOREIGN KEY (created_by) REFERENCES public.users(id);


--
-- TOC entry 3793 (class 2606 OID 25411)
-- Name: user_encryption_keys user_encryption_keys_user_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: securevault_user
--

ALTER TABLE ONLY public.user_encryption_keys
    ADD CONSTRAINT user_encryption_keys_user_id_fkey FOREIGN KEY (user_id) REFERENCES public.users(id);


--
-- TOC entry 3794 (class 2606 OID 25416)
-- Name: user_roles user_roles_assigned_by_fkey; Type: FK CONSTRAINT; Schema: public; Owner: securevault_user
--

ALTER TABLE ONLY public.user_roles
    ADD CONSTRAINT user_roles_assigned_by_fkey FOREIGN KEY (assigned_by) REFERENCES public.users(id);


--
-- TOC entry 3795 (class 2606 OID 25421)
-- Name: user_roles user_roles_role_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: securevault_user
--

ALTER TABLE ONLY public.user_roles
    ADD CONSTRAINT user_roles_role_id_fkey FOREIGN KEY (role_id) REFERENCES public.roles(id) ON DELETE CASCADE;


--
-- TOC entry 3796 (class 2606 OID 25426)
-- Name: user_roles user_roles_user_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: securevault_user
--

ALTER TABLE ONLY public.user_roles
    ADD CONSTRAINT user_roles_user_id_fkey FOREIGN KEY (user_id) REFERENCES public.users(id) ON DELETE CASCADE;


--
-- TOC entry 4001 (class 0 OID 0)
-- Dependencies: 4000
-- Name: DATABASE securevault; Type: ACL; Schema: -; Owner: securevault_user
--

GRANT CONNECT ON DATABASE securevault TO docsafe_app;


--
-- TOC entry 4002 (class 0 OID 0)
-- Dependencies: 8
-- Name: SCHEMA docsafe; Type: ACL; Schema: -; Owner: securevault_user
--

GRANT ALL ON SCHEMA docsafe TO docsafe_app;


--
-- TOC entry 2234 (class 826 OID 25431)
-- Name: DEFAULT PRIVILEGES FOR SEQUENCES; Type: DEFAULT ACL; Schema: docsafe; Owner: securevault_user
--

ALTER DEFAULT PRIVILEGES FOR ROLE securevault_user IN SCHEMA docsafe GRANT ALL ON SEQUENCES TO securevault_user;
ALTER DEFAULT PRIVILEGES FOR ROLE securevault_user IN SCHEMA docsafe GRANT ALL ON SEQUENCES TO docsafe_app;


--
-- TOC entry 2235 (class 826 OID 25432)
-- Name: DEFAULT PRIVILEGES FOR TABLES; Type: DEFAULT ACL; Schema: docsafe; Owner: securevault_user
--

ALTER DEFAULT PRIVILEGES FOR ROLE securevault_user IN SCHEMA docsafe GRANT SELECT,INSERT,REFERENCES,DELETE,TRIGGER,TRUNCATE,UPDATE ON TABLES TO securevault_user;
ALTER DEFAULT PRIVILEGES FOR ROLE securevault_user IN SCHEMA docsafe GRANT SELECT,INSERT,REFERENCES,DELETE,TRIGGER,TRUNCATE,UPDATE ON TABLES TO docsafe_app;


-- Completed on 2025-10-04 10:31:46

--
-- PostgreSQL database dump complete
--

