--
-- PostgreSQL database dump
--

-- Dumped from database version 15.13
-- Dumped by pg_dump version 16.2

-- Started on 2025-08-11 16:27:23 IST

SET statement_timeout = 0;
SET lock_timeout = 0;
SET idle_in_transaction_session_timeout = 0;
SET client_encoding = 'UTF8';
SET standard_conforming_strings = on;
SELECT pg_catalog.set_config('search_path', '', false);
SET check_function_bodies = false;
SET xmloption = content;
SET client_min_messages = warning;
SET row_security = off;

DROP DATABASE securevault;
--
-- TOC entry 3995 (class 1262 OID 16384)
-- Name: securevault; Type: DATABASE; Schema: -; Owner: securevault_user
--

CREATE DATABASE securevault WITH TEMPLATE = template0 ENCODING = 'UTF8' LOCALE_PROVIDER = libc LOCALE = 'en_US.utf8';


ALTER DATABASE securevault OWNER TO securevault_user;

\connect securevault

SET statement_timeout = 0;
SET lock_timeout = 0;
SET idle_in_transaction_session_timeout = 0;
SET client_encoding = 'UTF8';
SET standard_conforming_strings = on;
SELECT pg_catalog.set_config('search_path', '', false);
SET check_function_bodies = false;
SET xmloption = content;
SET client_min_messages = warning;
SET row_security = off;

--
-- TOC entry 8 (class 2615 OID 16433)
-- Name: securevault; Type: SCHEMA; Schema: -; Owner: securevault_user
--

CREATE SCHEMA securevault;


ALTER SCHEMA securevault OWNER TO securevault_user;

--
-- TOC entry 3 (class 3079 OID 16396)
-- Name: pgcrypto; Type: EXTENSION; Schema: -; Owner: -
--

CREATE EXTENSION IF NOT EXISTS pgcrypto WITH SCHEMA public;


--
-- TOC entry 3996 (class 0 OID 0)
-- Dependencies: 3
-- Name: EXTENSION pgcrypto; Type: COMMENT; Schema: -; Owner: 
--

COMMENT ON EXTENSION pgcrypto IS 'cryptographic functions';


--
-- TOC entry 2 (class 3079 OID 16385)
-- Name: uuid-ossp; Type: EXTENSION; Schema: -; Owner: -
--

CREATE EXTENSION IF NOT EXISTS "uuid-ossp" WITH SCHEMA public;


--
-- TOC entry 3997 (class 0 OID 0)
-- Dependencies: 2
-- Name: EXTENSION "uuid-ossp"; Type: COMMENT; Schema: -; Owner: 
--

COMMENT ON EXTENSION "uuid-ossp" IS 'generate universally unique identifiers (UUIDs)';


--
-- TOC entry 1012 (class 1247 OID 25118)
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
-- TOC entry 1015 (class 1247 OID 25128)
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
-- TOC entry 1009 (class 1247 OID 25109)
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
-- TOC entry 255 (class 1259 OID 25017)
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
-- TOC entry 254 (class 1259 OID 25016)
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
-- TOC entry 3998 (class 0 OID 0)
-- Dependencies: 254
-- Name: crypto_randomness_tests_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: securevault_user
--

ALTER SEQUENCE public.crypto_randomness_tests_id_seq OWNED BY public.crypto_randomness_tests.id;


--
-- TOC entry 247 (class 1259 OID 24920)
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
    CONSTRAINT check_action_type CHECK (((action)::text = ANY ((ARRAY['read'::character varying, 'write'::character varying, 'delete'::character varying, 'share'::character varying, 'download'::character varying, 'preview'::character varying, 'move'::character varying, 'copy'::character varying, 'recover'::character varying])::text[])))
);


ALTER TABLE public.document_access_logs OWNER TO securevault_user;

--
-- TOC entry 246 (class 1259 OID 24919)
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
-- TOC entry 3999 (class 0 OID 0)
-- Dependencies: 246
-- Name: document_access_logs_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: securevault_user
--

ALTER SEQUENCE public.document_access_logs_id_seq OWNED BY public.document_access_logs.id;


--
-- TOC entry 241 (class 1259 OID 24825)
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
    CONSTRAINT check_permission_type CHECK (((permission_type)::text = ANY ((ARRAY['read'::character varying, 'write'::character varying, 'delete'::character varying, 'admin'::character varying, 'share'::character varying])::text[])))
);


ALTER TABLE public.document_permissions OWNER TO securevault_user;

--
-- TOC entry 240 (class 1259 OID 24824)
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
-- TOC entry 4000 (class 0 OID 0)
-- Dependencies: 240
-- Name: document_permissions_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: securevault_user
--

ALTER SEQUENCE public.document_permissions_id_seq OWNED BY public.document_permissions.id;


--
-- TOC entry 243 (class 1259 OID 24861)
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
    CONSTRAINT check_share_type CHECK (((share_type)::text = ANY ((ARRAY['private'::character varying, 'internal'::character varying, 'external'::character varying, 'public'::character varying])::text[])))
);


ALTER TABLE public.document_shares OWNER TO securevault_user;

--
-- TOC entry 242 (class 1259 OID 24860)
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
-- TOC entry 4001 (class 0 OID 0)
-- Dependencies: 242
-- Name: document_shares_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: securevault_user
--

ALTER SEQUENCE public.document_shares_id_seq OWNED BY public.document_shares.id;


--
-- TOC entry 245 (class 1259 OID 24894)
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
-- TOC entry 244 (class 1259 OID 24893)
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
-- TOC entry 4002 (class 0 OID 0)
-- Dependencies: 244
-- Name: document_versions_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: securevault_user
--

ALTER SEQUENCE public.document_versions_id_seq OWNED BY public.document_versions.id;


--
-- TOC entry 239 (class 1259 OID 24767)
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
    encryption_iv bytea,
    encryption_auth_tag bytea,
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
    encrypted_dek text,
    CONSTRAINT check_child_count_positive CHECK ((child_count >= 0)),
    CONSTRAINT check_depth_level_positive CHECK ((depth_level >= 0)),
    CONSTRAINT check_document_type CHECK (((document_type)::text = ANY ((ARRAY['document'::character varying, 'folder'::character varying])::text[]))),
    CONSTRAINT check_file_size_positive CHECK ((file_size >= 0)),
    CONSTRAINT check_share_type CHECK (((share_type)::text = ANY ((ARRAY['private'::character varying, 'internal'::character varying, 'external'::character varying, 'public'::character varying])::text[]))),
    CONSTRAINT check_status CHECK (((status)::text = ANY ((ARRAY['active'::character varying, 'archived'::character varying, 'deleted'::character varying, 'quarantined'::character varying])::text[]))),
    CONSTRAINT check_total_size_positive CHECK ((total_size >= 0)),
    CONSTRAINT check_version_positive CHECK ((version_number > 0))
);


ALTER TABLE public.documents OWNER TO securevault_user;

--
-- TOC entry 238 (class 1259 OID 24766)
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
-- TOC entry 4003 (class 0 OID 0)
-- Dependencies: 238
-- Name: documents_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: securevault_user
--

ALTER SEQUENCE public.documents_id_seq OWNED BY public.documents.id;


--
-- TOC entry 259 (class 1259 OID 25077)
-- Name: encryption_audit_logs; Type: TABLE; Schema: public; Owner: securevault_user
--

CREATE TABLE public.encryption_audit_logs (
    id integer NOT NULL,
    user_id integer NOT NULL,
    key_id character varying(255),
    action character varying(100) NOT NULL,
    operation_id uuid NOT NULL,
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
-- TOC entry 258 (class 1259 OID 25076)
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
-- TOC entry 4004 (class 0 OID 0)
-- Dependencies: 258
-- Name: encryption_audit_logs_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: securevault_user
--

ALTER SEQUENCE public.encryption_audit_logs_id_seq OWNED BY public.encryption_audit_logs.id;


--
-- TOC entry 271 (class 1259 OID 25269)
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
-- TOC entry 270 (class 1259 OID 25268)
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
-- TOC entry 4005 (class 0 OID 0)
-- Dependencies: 270
-- Name: ip_blocklist_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: securevault_user
--

ALTER SEQUENCE public.ip_blocklist_id_seq OWNED BY public.ip_blocklist.id;


--
-- TOC entry 257 (class 1259 OID 25033)
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
-- TOC entry 256 (class 1259 OID 25032)
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
-- TOC entry 4006 (class 0 OID 0)
-- Dependencies: 256
-- Name: key_escrow_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: securevault_user
--

ALTER SEQUENCE public.key_escrow_id_seq OWNED BY public.key_escrow.id;


--
-- TOC entry 253 (class 1259 OID 24995)
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
-- TOC entry 252 (class 1259 OID 24994)
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
-- TOC entry 4007 (class 0 OID 0)
-- Dependencies: 252
-- Name: key_rotation_logs_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: securevault_user
--

ALTER SEQUENCE public.key_rotation_logs_id_seq OWNED BY public.key_rotation_logs.id;


--
-- TOC entry 251 (class 1259 OID 24975)
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
-- TOC entry 250 (class 1259 OID 24974)
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
-- TOC entry 4008 (class 0 OID 0)
-- Dependencies: 250
-- Name: master_keys_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: securevault_user
--

ALTER SEQUENCE public.master_keys_id_seq OWNED BY public.master_keys.id;


--
-- TOC entry 222 (class 1259 OID 16469)
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
-- TOC entry 221 (class 1259 OID 16468)
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
-- TOC entry 4009 (class 0 OID 0)
-- Dependencies: 221
-- Name: mfa_audit_logs_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: securevault_user
--

ALTER SEQUENCE public.mfa_audit_logs_id_seq OWNED BY public.mfa_audit_logs.id;


--
-- TOC entry 224 (class 1259 OID 16494)
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
-- TOC entry 223 (class 1259 OID 16493)
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
-- TOC entry 4010 (class 0 OID 0)
-- Dependencies: 223
-- Name: mfa_configuration_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: securevault_user
--

ALTER SEQUENCE public.mfa_configuration_id_seq OWNED BY public.mfa_configuration.id;


--
-- TOC entry 226 (class 1259 OID 16509)
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
-- TOC entry 225 (class 1259 OID 16508)
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
-- TOC entry 4011 (class 0 OID 0)
-- Dependencies: 225
-- Name: mfa_failed_attempts_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: securevault_user
--

ALTER SEQUENCE public.mfa_failed_attempts_id_seq OWNED BY public.mfa_failed_attempts.id;


--
-- TOC entry 220 (class 1259 OID 16453)
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
-- TOC entry 219 (class 1259 OID 16452)
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
-- TOC entry 4012 (class 0 OID 0)
-- Dependencies: 219
-- Name: mfa_used_codes_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: securevault_user
--

ALTER SEQUENCE public.mfa_used_codes_id_seq OWNED BY public.mfa_used_codes.id;


--
-- TOC entry 230 (class 1259 OID 24650)
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
-- TOC entry 229 (class 1259 OID 24649)
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
-- TOC entry 4013 (class 0 OID 0)
-- Dependencies: 229
-- Name: permissions_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: securevault_user
--

ALTER SEQUENCE public.permissions_id_seq OWNED BY public.permissions.id;


--
-- TOC entry 232 (class 1259 OID 24664)
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
-- TOC entry 231 (class 1259 OID 24663)
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
-- TOC entry 4014 (class 0 OID 0)
-- Dependencies: 231
-- Name: resource_permissions_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: securevault_user
--

ALTER SEQUENCE public.resource_permissions_id_seq OWNED BY public.resource_permissions.id;


--
-- TOC entry 236 (class 1259 OID 24733)
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
-- TOC entry 235 (class 1259 OID 24732)
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
-- TOC entry 4015 (class 0 OID 0)
-- Dependencies: 235
-- Name: role_hierarchy_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: securevault_user
--

ALTER SEQUENCE public.role_hierarchy_id_seq OWNED BY public.role_hierarchy.id;


--
-- TOC entry 233 (class 1259 OID 24689)
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
-- TOC entry 228 (class 1259 OID 24633)
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
-- TOC entry 227 (class 1259 OID 24632)
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
-- TOC entry 4016 (class 0 OID 0)
-- Dependencies: 227
-- Name: roles_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: securevault_user
--

ALTER SEQUENCE public.roles_id_seq OWNED BY public.roles.id;


--
-- TOC entry 269 (class 1259 OID 25243)
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
-- TOC entry 268 (class 1259 OID 25242)
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
-- TOC entry 4017 (class 0 OID 0)
-- Dependencies: 268
-- Name: security_alerts_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: securevault_user
--

ALTER SEQUENCE public.security_alerts_id_seq OWNED BY public.security_alerts.id;


--
-- TOC entry 261 (class 1259 OID 25142)
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
-- TOC entry 260 (class 1259 OID 25141)
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
-- TOC entry 4018 (class 0 OID 0)
-- Dependencies: 260
-- Name: security_events_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: securevault_user
--

ALTER SEQUENCE public.security_events_id_seq OWNED BY public.security_events.id;


--
-- TOC entry 265 (class 1259 OID 25204)
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
-- TOC entry 264 (class 1259 OID 25203)
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
-- TOC entry 4019 (class 0 OID 0)
-- Dependencies: 264
-- Name: security_metrics_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: securevault_user
--

ALTER SEQUENCE public.security_metrics_id_seq OWNED BY public.security_metrics.id;


--
-- TOC entry 263 (class 1259 OID 25182)
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
-- TOC entry 262 (class 1259 OID 25181)
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
-- TOC entry 4020 (class 0 OID 0)
-- Dependencies: 262
-- Name: suspicious_patterns_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: securevault_user
--

ALTER SEQUENCE public.suspicious_patterns_id_seq OWNED BY public.suspicious_patterns.id;


--
-- TOC entry 267 (class 1259 OID 25216)
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
-- TOC entry 266 (class 1259 OID 25215)
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
-- TOC entry 4021 (class 0 OID 0)
-- Dependencies: 266
-- Name: threat_responses_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: securevault_user
--

ALTER SEQUENCE public.threat_responses_id_seq OWNED BY public.threat_responses.id;


--
-- TOC entry 237 (class 1259 OID 24759)
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
-- TOC entry 249 (class 1259 OID 24949)
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
-- TOC entry 248 (class 1259 OID 24948)
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
-- TOC entry 4022 (class 0 OID 0)
-- Dependencies: 248
-- Name: user_encryption_keys_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: securevault_user
--

ALTER SEQUENCE public.user_encryption_keys_id_seq OWNED BY public.user_encryption_keys.id;


--
-- TOC entry 234 (class 1259 OID 24711)
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
-- TOC entry 218 (class 1259 OID 16441)
-- Name: users; Type: TABLE; Schema: public; Owner: securevault_user
--

CREATE TABLE public.users (
    id integer NOT NULL,
    username character varying(50) NOT NULL,
    email character varying(255) NOT NULL,
    password_hash character varying(255) NOT NULL,
    is_active boolean NOT NULL,
    is_verified boolean NOT NULL,
    must_change_password boolean NOT NULL,
    role character varying(50) NOT NULL,
    mfa_enabled boolean NOT NULL,
    mfa_secret character varying(255),
    backup_codes text,
    failed_login_attempts integer NOT NULL,
    locked_until timestamp without time zone,
    last_login timestamp without time zone,
    last_password_change timestamp without time zone NOT NULL,
    created_at timestamp without time zone NOT NULL,
    updated_at timestamp without time zone NOT NULL,
    created_by integer,
    full_name character varying(100),
    department character varying(100),
    mfa_setup_date timestamp without time zone,
    mfa_last_used timestamp without time zone,
    backup_codes_generated_at timestamp without time zone,
    encryption_salt character varying(64),
    key_verification_payload text,
    encryption_method character varying(50) DEFAULT 'PBKDF2-SHA256'::character varying,
    key_derivation_iterations integer DEFAULT 500000
);


ALTER TABLE public.users OWNER TO securevault_user;

--
-- TOC entry 217 (class 1259 OID 16440)
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
-- TOC entry 4023 (class 0 OID 0)
-- Dependencies: 217
-- Name: users_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: securevault_user
--

ALTER SEQUENCE public.users_id_seq OWNED BY public.users.id;


--
-- TOC entry 3485 (class 2604 OID 25020)
-- Name: crypto_randomness_tests id; Type: DEFAULT; Schema: public; Owner: securevault_user
--

ALTER TABLE ONLY public.crypto_randomness_tests ALTER COLUMN id SET DEFAULT nextval('public.crypto_randomness_tests_id_seq'::regclass);


--
-- TOC entry 3477 (class 2604 OID 24923)
-- Name: document_access_logs id; Type: DEFAULT; Schema: public; Owner: securevault_user
--

ALTER TABLE ONLY public.document_access_logs ALTER COLUMN id SET DEFAULT nextval('public.document_access_logs_id_seq'::regclass);


--
-- TOC entry 3471 (class 2604 OID 24828)
-- Name: document_permissions id; Type: DEFAULT; Schema: public; Owner: securevault_user
--

ALTER TABLE ONLY public.document_permissions ALTER COLUMN id SET DEFAULT nextval('public.document_permissions_id_seq'::regclass);


--
-- TOC entry 3473 (class 2604 OID 24864)
-- Name: document_shares id; Type: DEFAULT; Schema: public; Owner: securevault_user
--

ALTER TABLE ONLY public.document_shares ALTER COLUMN id SET DEFAULT nextval('public.document_shares_id_seq'::regclass);


--
-- TOC entry 3475 (class 2604 OID 24897)
-- Name: document_versions id; Type: DEFAULT; Schema: public; Owner: securevault_user
--

ALTER TABLE ONLY public.document_versions ALTER COLUMN id SET DEFAULT nextval('public.document_versions_id_seq'::regclass);


--
-- TOC entry 3468 (class 2604 OID 24770)
-- Name: documents id; Type: DEFAULT; Schema: public; Owner: securevault_user
--

ALTER TABLE ONLY public.documents ALTER COLUMN id SET DEFAULT nextval('public.documents_id_seq'::regclass);


--
-- TOC entry 3489 (class 2604 OID 25080)
-- Name: encryption_audit_logs id; Type: DEFAULT; Schema: public; Owner: securevault_user
--

ALTER TABLE ONLY public.encryption_audit_logs ALTER COLUMN id SET DEFAULT nextval('public.encryption_audit_logs_id_seq'::regclass);


--
-- TOC entry 3499 (class 2604 OID 25272)
-- Name: ip_blocklist id; Type: DEFAULT; Schema: public; Owner: securevault_user
--

ALTER TABLE ONLY public.ip_blocklist ALTER COLUMN id SET DEFAULT nextval('public.ip_blocklist_id_seq'::regclass);


--
-- TOC entry 3487 (class 2604 OID 25036)
-- Name: key_escrow id; Type: DEFAULT; Schema: public; Owner: securevault_user
--

ALTER TABLE ONLY public.key_escrow ALTER COLUMN id SET DEFAULT nextval('public.key_escrow_id_seq'::regclass);


--
-- TOC entry 3483 (class 2604 OID 24998)
-- Name: key_rotation_logs id; Type: DEFAULT; Schema: public; Owner: securevault_user
--

ALTER TABLE ONLY public.key_rotation_logs ALTER COLUMN id SET DEFAULT nextval('public.key_rotation_logs_id_seq'::regclass);


--
-- TOC entry 3481 (class 2604 OID 24978)
-- Name: master_keys id; Type: DEFAULT; Schema: public; Owner: securevault_user
--

ALTER TABLE ONLY public.master_keys ALTER COLUMN id SET DEFAULT nextval('public.master_keys_id_seq'::regclass);


--
-- TOC entry 3461 (class 2604 OID 16472)
-- Name: mfa_audit_logs id; Type: DEFAULT; Schema: public; Owner: securevault_user
--

ALTER TABLE ONLY public.mfa_audit_logs ALTER COLUMN id SET DEFAULT nextval('public.mfa_audit_logs_id_seq'::regclass);


--
-- TOC entry 3462 (class 2604 OID 16497)
-- Name: mfa_configuration id; Type: DEFAULT; Schema: public; Owner: securevault_user
--

ALTER TABLE ONLY public.mfa_configuration ALTER COLUMN id SET DEFAULT nextval('public.mfa_configuration_id_seq'::regclass);


--
-- TOC entry 3463 (class 2604 OID 16512)
-- Name: mfa_failed_attempts id; Type: DEFAULT; Schema: public; Owner: securevault_user
--

ALTER TABLE ONLY public.mfa_failed_attempts ALTER COLUMN id SET DEFAULT nextval('public.mfa_failed_attempts_id_seq'::regclass);


--
-- TOC entry 3460 (class 2604 OID 16456)
-- Name: mfa_used_codes id; Type: DEFAULT; Schema: public; Owner: securevault_user
--

ALTER TABLE ONLY public.mfa_used_codes ALTER COLUMN id SET DEFAULT nextval('public.mfa_used_codes_id_seq'::regclass);


--
-- TOC entry 3465 (class 2604 OID 24653)
-- Name: permissions id; Type: DEFAULT; Schema: public; Owner: securevault_user
--

ALTER TABLE ONLY public.permissions ALTER COLUMN id SET DEFAULT nextval('public.permissions_id_seq'::regclass);


--
-- TOC entry 3466 (class 2604 OID 24667)
-- Name: resource_permissions id; Type: DEFAULT; Schema: public; Owner: securevault_user
--

ALTER TABLE ONLY public.resource_permissions ALTER COLUMN id SET DEFAULT nextval('public.resource_permissions_id_seq'::regclass);


--
-- TOC entry 3467 (class 2604 OID 24736)
-- Name: role_hierarchy id; Type: DEFAULT; Schema: public; Owner: securevault_user
--

ALTER TABLE ONLY public.role_hierarchy ALTER COLUMN id SET DEFAULT nextval('public.role_hierarchy_id_seq'::regclass);


--
-- TOC entry 3464 (class 2604 OID 24636)
-- Name: roles id; Type: DEFAULT; Schema: public; Owner: securevault_user
--

ALTER TABLE ONLY public.roles ALTER COLUMN id SET DEFAULT nextval('public.roles_id_seq'::regclass);


--
-- TOC entry 3498 (class 2604 OID 25246)
-- Name: security_alerts id; Type: DEFAULT; Schema: public; Owner: securevault_user
--

ALTER TABLE ONLY public.security_alerts ALTER COLUMN id SET DEFAULT nextval('public.security_alerts_id_seq'::regclass);


--
-- TOC entry 3491 (class 2604 OID 25145)
-- Name: security_events id; Type: DEFAULT; Schema: public; Owner: securevault_user
--

ALTER TABLE ONLY public.security_events ALTER COLUMN id SET DEFAULT nextval('public.security_events_id_seq'::regclass);


--
-- TOC entry 3495 (class 2604 OID 25207)
-- Name: security_metrics id; Type: DEFAULT; Schema: public; Owner: securevault_user
--

ALTER TABLE ONLY public.security_metrics ALTER COLUMN id SET DEFAULT nextval('public.security_metrics_id_seq'::regclass);


--
-- TOC entry 3493 (class 2604 OID 25185)
-- Name: suspicious_patterns id; Type: DEFAULT; Schema: public; Owner: securevault_user
--

ALTER TABLE ONLY public.suspicious_patterns ALTER COLUMN id SET DEFAULT nextval('public.suspicious_patterns_id_seq'::regclass);


--
-- TOC entry 3496 (class 2604 OID 25219)
-- Name: threat_responses id; Type: DEFAULT; Schema: public; Owner: securevault_user
--

ALTER TABLE ONLY public.threat_responses ALTER COLUMN id SET DEFAULT nextval('public.threat_responses_id_seq'::regclass);


--
-- TOC entry 3479 (class 2604 OID 24952)
-- Name: user_encryption_keys id; Type: DEFAULT; Schema: public; Owner: securevault_user
--

ALTER TABLE ONLY public.user_encryption_keys ALTER COLUMN id SET DEFAULT nextval('public.user_encryption_keys_id_seq'::regclass);


--
-- TOC entry 3457 (class 2604 OID 16444)
-- Name: users id; Type: DEFAULT; Schema: public; Owner: securevault_user
--

ALTER TABLE ONLY public.users ALTER COLUMN id SET DEFAULT nextval('public.users_id_seq'::regclass);


--
-- TOC entry 3973 (class 0 OID 25017)
-- Dependencies: 255
-- Data for Name: crypto_randomness_tests; Type: TABLE DATA; Schema: public; Owner: securevault_user
--



--
-- TOC entry 3965 (class 0 OID 24920)
-- Dependencies: 247
-- Data for Name: document_access_logs; Type: TABLE DATA; Schema: public; Owner: securevault_user
--

INSERT INTO public.document_access_logs VALUES (540, 185, 3, 'write', 'api', true, NULL, NULL, NULL, '2025-07-28 14:59:00.502194+00', NULL, '{"file_size": 674895, "mime_type": "image/jpeg", "operation": "upload"}', NULL);
INSERT INTO public.document_access_logs VALUES (541, 186, 3, 'write', 'api', true, NULL, NULL, NULL, '2025-07-28 14:59:00.533905+00', NULL, '{"file_size": 1686373, "mime_type": "image/jpeg", "operation": "upload"}', NULL);
INSERT INTO public.document_access_logs VALUES (542, 187, 3, 'write', 'api', true, NULL, NULL, NULL, '2025-07-28 14:59:00.550041+00', NULL, '{"file_size": 1877442, "mime_type": "image/jpeg", "operation": "upload"}', NULL);
INSERT INTO public.document_access_logs VALUES (543, 188, 3, 'write', 'api', true, NULL, NULL, NULL, '2025-07-28 14:59:00.563519+00', NULL, '{"file_size": 1622232, "mime_type": "image/jpeg", "operation": "upload"}', NULL);
INSERT INTO public.document_access_logs VALUES (544, 189, 3, 'write', 'api', true, NULL, NULL, NULL, '2025-07-28 14:59:00.932547+00', NULL, '{"file_size": 704566, "mime_type": "image/jpeg", "operation": "upload"}', NULL);
INSERT INTO public.document_access_logs VALUES (545, 190, 3, 'write', 'api', true, NULL, NULL, NULL, '2025-07-28 14:59:00.959099+00', NULL, '{"file_size": 952726, "mime_type": "image/jpeg", "operation": "upload"}', NULL);
INSERT INTO public.document_access_logs VALUES (546, 191, 3, 'write', 'api', true, NULL, NULL, NULL, '2025-07-28 14:59:00.970654+00', NULL, '{"file_size": 841125, "mime_type": "image/jpeg", "operation": "upload"}', NULL);
INSERT INTO public.document_access_logs VALUES (547, 192, 3, 'write', 'api', true, NULL, NULL, NULL, '2025-07-28 14:59:00.991306+00', NULL, '{"file_size": 1119933, "mime_type": "image/jpeg", "operation": "upload"}', NULL);
INSERT INTO public.document_access_logs VALUES (548, 193, 3, 'write', 'api', true, NULL, NULL, NULL, '2025-07-28 14:59:01.013179+00', NULL, '{"file_size": 1153704, "mime_type": "image/jpeg", "operation": "upload"}', NULL);
INSERT INTO public.document_access_logs VALUES (549, 194, 3, 'write', 'api', true, NULL, NULL, NULL, '2025-07-28 14:59:01.471848+00', NULL, '{"file_size": 1017565, "mime_type": "image/jpeg", "operation": "upload"}', NULL);
INSERT INTO public.document_access_logs VALUES (550, 195, 3, 'write', 'api', true, NULL, NULL, NULL, '2025-07-28 14:59:01.48819+00', NULL, '{"file_size": 870735, "mime_type": "image/jpeg", "operation": "upload"}', NULL);
INSERT INTO public.document_access_logs VALUES (551, 196, 3, 'write', 'api', true, NULL, NULL, NULL, '2025-07-28 14:59:01.501175+00', NULL, '{"file_size": 1060533, "mime_type": "image/jpeg", "operation": "upload"}', NULL);
INSERT INTO public.document_access_logs VALUES (552, 197, 3, 'write', 'api', true, NULL, NULL, NULL, '2025-07-28 14:59:01.518001+00', NULL, '{"file_size": 1083224, "mime_type": "image/jpeg", "operation": "upload"}', NULL);
INSERT INTO public.document_access_logs VALUES (553, 198, 3, 'write', 'api', true, NULL, NULL, NULL, '2025-07-28 14:59:01.541028+00', NULL, '{"file_size": 1643452, "mime_type": "image/jpeg", "operation": "upload"}', NULL);
INSERT INTO public.document_access_logs VALUES (554, 199, 3, 'write', 'api', true, NULL, NULL, NULL, '2025-07-28 14:59:02.007332+00', NULL, '{"file_size": 1305509, "mime_type": "image/jpeg", "operation": "upload"}', NULL);
INSERT INTO public.document_access_logs VALUES (555, 200, 3, 'write', 'api', true, NULL, NULL, NULL, '2025-07-28 14:59:02.031595+00', NULL, '{"file_size": 1584565, "mime_type": "image/jpeg", "operation": "upload"}', NULL);
INSERT INTO public.document_access_logs VALUES (556, 201, 3, 'write', 'api', true, NULL, NULL, NULL, '2025-07-28 14:59:02.048876+00', NULL, '{"file_size": 1619427, "mime_type": "image/jpeg", "operation": "upload"}', NULL);
INSERT INTO public.document_access_logs VALUES (557, 202, 3, 'write', 'api', true, NULL, NULL, NULL, '2025-07-28 14:59:02.069974+00', NULL, '{"file_size": 1561076, "mime_type": "image/jpeg", "operation": "upload"}', NULL);
INSERT INTO public.document_access_logs VALUES (561, 183, 3, 'read', 'api', true, NULL, NULL, NULL, '2025-07-28 19:43:17.157819+00', NULL, '{}', NULL);
INSERT INTO public.document_access_logs VALUES (562, 183, 3, 'read', 'api', true, NULL, NULL, NULL, '2025-07-28 19:43:17.186936+00', NULL, '{}', NULL);
INSERT INTO public.document_access_logs VALUES (563, 199, 3, 'delete', 'api', true, NULL, NULL, NULL, '2025-07-28 19:43:25.162328+00', NULL, '{}', NULL);
INSERT INTO public.document_access_logs VALUES (564, 183, 3, 'read', 'api', true, NULL, NULL, NULL, '2025-07-28 19:43:53.482258+00', NULL, '{}', NULL);
INSERT INTO public.document_access_logs VALUES (565, 183, 3, 'read', 'api', true, NULL, NULL, NULL, '2025-07-28 19:43:53.51013+00', NULL, '{}', NULL);
INSERT INTO public.document_access_logs VALUES (566, 199, 3, 'recover', 'api', true, NULL, NULL, NULL, '2025-07-28 19:44:17.648804+00', NULL, '{}', NULL);
INSERT INTO public.document_access_logs VALUES (567, 183, 3, 'read', 'api', true, NULL, NULL, NULL, '2025-07-28 19:44:21.089102+00', NULL, '{}', NULL);
INSERT INTO public.document_access_logs VALUES (568, 183, 3, 'read', 'api', true, NULL, NULL, NULL, '2025-07-28 19:44:21.12241+00', NULL, '{}', NULL);
INSERT INTO public.document_access_logs VALUES (569, 199, 3, 'delete', 'api', true, NULL, NULL, NULL, '2025-07-28 19:44:32.672856+00', NULL, '{}', NULL);
INSERT INTO public.document_access_logs VALUES (570, 188, 3, 'delete', 'api', true, NULL, NULL, NULL, '2025-07-28 19:44:32.680698+00', NULL, '{}', NULL);
INSERT INTO public.document_access_logs VALUES (571, 187, 3, 'delete', 'api', true, NULL, NULL, NULL, '2025-07-28 19:44:32.68539+00', NULL, '{}', NULL);
INSERT INTO public.document_access_logs VALUES (572, 202, 3, 'delete', 'api', true, NULL, NULL, NULL, '2025-07-28 19:44:32.690228+00', NULL, '{}', NULL);
INSERT INTO public.document_access_logs VALUES (573, 188, 3, 'recover', 'api', true, NULL, NULL, NULL, '2025-07-28 19:44:50.476269+00', NULL, '{}', NULL);
INSERT INTO public.document_access_logs VALUES (574, 187, 3, 'recover', 'api', true, NULL, NULL, NULL, '2025-07-28 19:44:50.476269+00', NULL, '{}', NULL);
INSERT INTO public.document_access_logs VALUES (575, 202, 3, 'recover', 'api', true, NULL, NULL, NULL, '2025-07-28 19:44:50.476269+00', NULL, '{}', NULL);
INSERT INTO public.document_access_logs VALUES (576, 199, 3, 'recover', 'api', true, NULL, NULL, NULL, '2025-07-28 19:44:50.476269+00', NULL, '{}', NULL);
INSERT INTO public.document_access_logs VALUES (589, 183, 3, 'read', 'api', true, NULL, NULL, NULL, '2025-07-28 20:09:57.922179+00', NULL, '{}', NULL);
INSERT INTO public.document_access_logs VALUES (590, 183, 3, 'read', 'api', true, NULL, NULL, NULL, '2025-07-28 20:09:57.960556+00', NULL, '{}', NULL);
INSERT INTO public.document_access_logs VALUES (603, 183, 3, 'write', 'api', true, NULL, NULL, NULL, '2025-07-28 20:19:19.380292+00', NULL, '{}', NULL);
INSERT INTO public.document_access_logs VALUES (604, 183, 3, 'read', 'api', true, NULL, NULL, NULL, '2025-07-28 20:19:39.478291+00', NULL, '{}', NULL);
INSERT INTO public.document_access_logs VALUES (605, 183, 3, 'read', 'api', true, NULL, NULL, NULL, '2025-07-28 20:19:39.512508+00', NULL, '{}', NULL);
INSERT INTO public.document_access_logs VALUES (606, 199, 3, 'download', 'api', true, NULL, NULL, NULL, '2025-07-28 20:19:46.95006+00', NULL, '{}', NULL);
INSERT INTO public.document_access_logs VALUES (607, 198, 3, 'download', 'api', true, NULL, NULL, NULL, '2025-07-28 20:20:02.764859+00', NULL, '{}', NULL);
INSERT INTO public.document_access_logs VALUES (608, 201, 3, 'download', 'api', true, NULL, NULL, NULL, '2025-07-28 20:20:16.287695+00', NULL, '{}', NULL);
INSERT INTO public.document_access_logs VALUES (609, 195, 3, 'download', 'api', true, NULL, NULL, NULL, '2025-07-28 20:20:27.491074+00', NULL, '{}', NULL);
INSERT INTO public.document_access_logs VALUES (610, 195, 3, 'download', 'api', true, NULL, NULL, NULL, '2025-07-28 20:20:31.797203+00', NULL, '{}', NULL);
INSERT INTO public.document_access_logs VALUES (611, 400, 3, 'write', 'api', true, NULL, NULL, NULL, '2025-07-28 20:26:26.232918+00', NULL, '{}', NULL);
INSERT INTO public.document_access_logs VALUES (612, 400, 3, 'read', 'api', true, NULL, NULL, NULL, '2025-07-28 20:26:37.611712+00', NULL, '{}', NULL);
INSERT INTO public.document_access_logs VALUES (613, 400, 3, 'read', 'api', true, NULL, NULL, NULL, '2025-07-28 20:26:37.636137+00', NULL, '{}', NULL);
INSERT INTO public.document_access_logs VALUES (614, 401, 3, 'read', 'api', true, NULL, NULL, NULL, '2025-07-28 20:26:47.170411+00', NULL, '{}', NULL);
INSERT INTO public.document_access_logs VALUES (615, 401, 3, 'read', 'api', true, NULL, NULL, NULL, '2025-07-28 20:26:47.198422+00', NULL, '{}', NULL);
INSERT INTO public.document_access_logs VALUES (616, 400, 3, 'read', 'api', true, NULL, NULL, NULL, '2025-07-28 20:26:47.21746+00', NULL, '{}', NULL);
INSERT INTO public.document_access_logs VALUES (617, 402, 3, 'read', 'api', true, NULL, NULL, NULL, '2025-07-28 20:26:48.305785+00', NULL, '{}', NULL);
INSERT INTO public.document_access_logs VALUES (618, 402, 3, 'read', 'api', true, NULL, NULL, NULL, '2025-07-28 20:26:48.334938+00', NULL, '{}', NULL);
INSERT INTO public.document_access_logs VALUES (619, 401, 3, 'read', 'api', true, NULL, NULL, NULL, '2025-07-28 20:26:48.353379+00', NULL, '{}', NULL);
INSERT INTO public.document_access_logs VALUES (620, 400, 3, 'read', 'api', true, NULL, NULL, NULL, '2025-07-28 20:26:48.370016+00', NULL, '{}', NULL);
INSERT INTO public.document_access_logs VALUES (621, 400, 3, 'read', 'api', true, NULL, NULL, NULL, '2025-07-28 20:26:50.056829+00', NULL, '{}', NULL);
INSERT INTO public.document_access_logs VALUES (622, 400, 3, 'read', 'api', true, NULL, NULL, NULL, '2025-07-28 20:26:50.076743+00', NULL, '{}', NULL);
INSERT INTO public.document_access_logs VALUES (623, 400, 3, 'delete', 'api', true, NULL, NULL, NULL, '2025-07-28 20:26:54.251208+00', NULL, '{}', NULL);
INSERT INTO public.document_access_logs VALUES (624, 417, 3, 'write', 'api', true, NULL, NULL, NULL, '2025-07-28 21:13:32.683052+00', NULL, '{}', NULL);
INSERT INTO public.document_access_logs VALUES (625, 417, 3, 'read', 'api', true, NULL, NULL, NULL, '2025-07-28 21:13:36.825493+00', NULL, '{}', NULL);
INSERT INTO public.document_access_logs VALUES (626, 417, 3, 'read', 'api', true, NULL, NULL, NULL, '2025-07-28 21:13:36.856556+00', NULL, '{}', NULL);
INSERT INTO public.document_access_logs VALUES (627, 418, 3, 'write', 'api', true, NULL, NULL, NULL, '2025-07-28 21:14:00.290479+00', NULL, '{"file_size": 22742, "mime_type": "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet", "operation": "upload"}', NULL);
INSERT INTO public.document_access_logs VALUES (628, 183, 3, 'read', 'api', true, NULL, NULL, NULL, '2025-07-28 22:01:24.841896+00', NULL, '{}', NULL);
INSERT INTO public.document_access_logs VALUES (629, 183, 3, 'read', 'api', true, NULL, NULL, NULL, '2025-07-28 22:01:24.883274+00', NULL, '{}', NULL);
INSERT INTO public.document_access_logs VALUES (630, 183, 3, 'read', 'api', true, NULL, NULL, NULL, '2025-07-29 15:58:29.498613+00', NULL, '{}', NULL);
INSERT INTO public.document_access_logs VALUES (631, 183, 3, 'read', 'api', true, NULL, NULL, NULL, '2025-07-29 15:58:29.54534+00', NULL, '{}', NULL);
INSERT INTO public.document_access_logs VALUES (632, 183, 3, 'read', 'api', true, NULL, NULL, NULL, '2025-07-29 15:59:58.622527+00', NULL, '{}', NULL);
INSERT INTO public.document_access_logs VALUES (633, 183, 3, 'read', 'api', true, NULL, NULL, NULL, '2025-07-29 15:59:58.653751+00', NULL, '{}', NULL);
INSERT INTO public.document_access_logs VALUES (634, 419, 3, 'write', 'api', true, NULL, NULL, NULL, '2025-07-29 16:00:10.378907+00', NULL, '{}', NULL);
INSERT INTO public.document_access_logs VALUES (635, 419, 3, 'read', 'api', true, NULL, NULL, NULL, '2025-07-29 16:00:20.169979+00', NULL, '{}', NULL);
INSERT INTO public.document_access_logs VALUES (636, 419, 3, 'read', 'api', true, NULL, NULL, NULL, '2025-07-29 16:00:20.201476+00', NULL, '{}', NULL);
INSERT INTO public.document_access_logs VALUES (637, 183, 3, 'read', 'api', true, NULL, NULL, NULL, '2025-07-29 16:00:20.220785+00', NULL, '{}', NULL);
INSERT INTO public.document_access_logs VALUES (638, 431, 3, 'read', 'api', true, NULL, NULL, NULL, '2025-07-29 16:00:22.982024+00', NULL, '{}', NULL);
INSERT INTO public.document_access_logs VALUES (639, 431, 3, 'read', 'api', true, NULL, NULL, NULL, '2025-07-29 16:00:23.004217+00', NULL, '{}', NULL);
INSERT INTO public.document_access_logs VALUES (640, 419, 3, 'read', 'api', true, NULL, NULL, NULL, '2025-07-29 16:00:23.018815+00', NULL, '{}', NULL);
INSERT INTO public.document_access_logs VALUES (641, 183, 3, 'read', 'api', true, NULL, NULL, NULL, '2025-07-29 16:00:23.031886+00', NULL, '{}', NULL);
INSERT INTO public.document_access_logs VALUES (642, 419, 3, 'read', 'api', true, NULL, NULL, NULL, '2025-07-29 16:00:36.380447+00', NULL, '{}', NULL);
INSERT INTO public.document_access_logs VALUES (643, 419, 3, 'read', 'api', true, NULL, NULL, NULL, '2025-07-29 16:00:36.410235+00', NULL, '{}', NULL);
INSERT INTO public.document_access_logs VALUES (644, 183, 3, 'read', 'api', true, NULL, NULL, NULL, '2025-07-29 16:00:36.428724+00', NULL, '{}', NULL);
INSERT INTO public.document_access_logs VALUES (645, 183, 3, 'read', 'api', true, NULL, NULL, NULL, '2025-07-29 16:00:39.782596+00', NULL, '{}', NULL);
INSERT INTO public.document_access_logs VALUES (646, 183, 3, 'read', 'api', true, NULL, NULL, NULL, '2025-07-29 16:00:39.811767+00', NULL, '{}', NULL);
INSERT INTO public.document_access_logs VALUES (647, 183, 3, 'read', 'api', true, NULL, NULL, NULL, '2025-07-29 16:15:29.063156+00', NULL, '{}', NULL);
INSERT INTO public.document_access_logs VALUES (648, 183, 3, 'read', 'api', true, NULL, NULL, NULL, '2025-07-29 16:15:29.092794+00', NULL, '{}', NULL);
INSERT INTO public.document_access_logs VALUES (649, 199, 3, 'download', 'api', true, NULL, NULL, NULL, '2025-07-29 16:16:22.025058+00', NULL, '{}', NULL);
INSERT INTO public.document_access_logs VALUES (650, 202, 3, 'download', 'api', true, NULL, NULL, NULL, '2025-07-29 16:16:37.515919+00', NULL, '{}', NULL);
INSERT INTO public.document_access_logs VALUES (752, 452, 14, 'write', 'api', true, NULL, NULL, NULL, '2025-08-01 13:40:59.798751+00', NULL, '{"file_size": 257974, "mime_type": "image/jpeg", "operation": "upload"}', NULL);
INSERT INTO public.document_access_logs VALUES (754, 453, 14, 'read', 'api', true, NULL, NULL, NULL, '2025-08-01 13:43:50.802851+00', NULL, '{}', NULL);
INSERT INTO public.document_access_logs VALUES (762, 454, 14, 'download', 'api', true, NULL, NULL, NULL, '2025-08-01 13:45:00.342367+00', NULL, '{}', NULL);
INSERT INTO public.document_access_logs VALUES (767, 452, 14, 'download', 'api', true, NULL, NULL, NULL, '2025-08-01 13:45:07.657163+00', NULL, '{}', NULL);
INSERT INTO public.document_access_logs VALUES (788, 199, 3, 'download', 'api', true, NULL, NULL, NULL, '2025-08-01 15:27:19.007586+00', NULL, '{}', NULL);
INSERT INTO public.document_access_logs VALUES (800, 481, 14, 'write', 'api', true, NULL, NULL, NULL, '2025-08-01 17:50:18.890035+00', NULL, '{"file_size": 216, "mime_type": "text/plain", "operation": "upload"}', NULL);
INSERT INTO public.document_access_logs VALUES (805, 481, 14, 'download', 'api', true, NULL, NULL, NULL, '2025-08-01 20:31:43.910856+00', NULL, '{}', NULL);
INSERT INTO public.document_access_logs VALUES (808, 482, 14, 'download', 'api', true, NULL, NULL, NULL, '2025-08-01 20:32:05.107268+00', NULL, '{}', NULL);
INSERT INTO public.document_access_logs VALUES (821, 452, 14, 'download', 'api', true, NULL, NULL, NULL, '2025-08-10 11:03:48.962051+00', NULL, '{}', NULL);
INSERT INTO public.document_access_logs VALUES (822, 452, 14, 'download', 'api', true, NULL, NULL, NULL, '2025-08-10 11:03:48.974142+00', NULL, '{}', NULL);
INSERT INTO public.document_access_logs VALUES (823, 452, 14, 'download', 'api', true, NULL, NULL, NULL, '2025-08-10 11:10:43.558262+00', NULL, '{}', NULL);
INSERT INTO public.document_access_logs VALUES (825, 452, 14, 'download', 'api', true, NULL, NULL, NULL, '2025-08-10 11:10:43.596706+00', NULL, '{}', NULL);
INSERT INTO public.document_access_logs VALUES (828, 481, 14, 'download', 'api', true, NULL, NULL, NULL, '2025-08-10 11:26:22.794268+00', NULL, '{}', NULL);
INSERT INTO public.document_access_logs VALUES (651, 198, 3, 'download', 'api', true, NULL, NULL, NULL, '2025-07-29 16:16:46.244759+00', NULL, '{}', NULL);
INSERT INTO public.document_access_logs VALUES (652, 197, 3, 'download', 'api', true, NULL, NULL, NULL, '2025-07-29 16:16:54.237161+00', NULL, '{}', NULL);
INSERT INTO public.document_access_logs VALUES (654, 183, 3, 'read', 'api', true, NULL, NULL, NULL, '2025-07-29 16:23:15.144557+00', NULL, '{}', NULL);
INSERT INTO public.document_access_logs VALUES (753, 453, 14, 'write', 'api', true, NULL, NULL, NULL, '2025-08-01 13:43:23.426695+00', NULL, '{}', NULL);
INSERT INTO public.document_access_logs VALUES (764, 454, 14, 'download', 'api', true, NULL, NULL, NULL, '2025-08-01 13:45:00.374134+00', NULL, '{}', NULL);
INSERT INTO public.document_access_logs VALUES (768, 452, 14, 'download', 'api', true, NULL, NULL, NULL, '2025-08-01 13:45:07.675637+00', NULL, '{}', NULL);
INSERT INTO public.document_access_logs VALUES (770, 452, 14, 'download', 'api', true, NULL, NULL, NULL, '2025-08-01 13:45:07.716515+00', NULL, '{}', NULL);
INSERT INTO public.document_access_logs VALUES (776, 452, 14, 'download', 'api', true, NULL, NULL, NULL, '2025-08-01 13:45:27.904559+00', NULL, '{}', NULL);
INSERT INTO public.document_access_logs VALUES (791, 452, 14, 'download', 'api', true, NULL, NULL, NULL, '2025-08-01 17:14:10.285095+00', NULL, '{}', NULL);
INSERT INTO public.document_access_logs VALUES (812, 481, 14, 'download', 'api', true, NULL, NULL, NULL, '2025-08-10 10:56:15.84332+00', NULL, '{}', NULL);
INSERT INTO public.document_access_logs VALUES (824, 452, 14, 'download', 'api', true, NULL, NULL, NULL, '2025-08-10 11:10:43.573805+00', NULL, '{}', NULL);
INSERT INTO public.document_access_logs VALUES (829, 481, 14, 'download', 'api', true, NULL, NULL, NULL, '2025-08-10 11:26:22.805161+00', NULL, '{}', NULL);
INSERT INTO public.document_access_logs VALUES (830, 481, 14, 'download', 'api', true, NULL, NULL, NULL, '2025-08-10 11:26:22.838457+00', NULL, '{}', NULL);
INSERT INTO public.document_access_logs VALUES (653, 183, 3, 'read', 'api', true, NULL, NULL, NULL, '2025-07-29 16:23:15.111431+00', NULL, '{}', NULL);
INSERT INTO public.document_access_logs VALUES (655, 201, 3, 'download', 'api', true, NULL, NULL, NULL, '2025-07-29 16:23:22.937447+00', NULL, '{}', NULL);
INSERT INTO public.document_access_logs VALUES (656, 430, 3, 'write', 'api', true, NULL, NULL, NULL, '2025-07-29 16:36:25.597549+00', NULL, '{}', NULL);
INSERT INTO public.document_access_logs VALUES (657, 183, 3, 'read', 'api', true, NULL, NULL, NULL, '2025-07-30 04:28:35.151897+00', NULL, '{}', NULL);
INSERT INTO public.document_access_logs VALUES (658, 183, 3, 'read', 'api', true, NULL, NULL, NULL, '2025-07-30 04:28:35.178582+00', NULL, '{}', NULL);
INSERT INTO public.document_access_logs VALUES (659, 417, 3, 'delete', 'api', true, NULL, NULL, NULL, '2025-07-30 16:22:21.758565+00', NULL, '{}', NULL);
INSERT INTO public.document_access_logs VALUES (660, 183, 3, 'read', 'api', true, NULL, NULL, NULL, '2025-07-30 16:22:26.545798+00', NULL, '{}', NULL);
INSERT INTO public.document_access_logs VALUES (661, 183, 3, 'read', 'api', true, NULL, NULL, NULL, '2025-07-30 16:22:26.58374+00', NULL, '{}', NULL);
INSERT INTO public.document_access_logs VALUES (662, 199, 3, 'download', 'api', true, NULL, NULL, NULL, '2025-07-30 16:22:31.443345+00', NULL, '{}', NULL);
INSERT INTO public.document_access_logs VALUES (663, 434, 3, 'write', 'api', true, NULL, NULL, NULL, '2025-07-30 16:23:22.009536+00', NULL, '{"file_size": 257958, "mime_type": "image/jpeg", "operation": "upload"}', NULL);
INSERT INTO public.document_access_logs VALUES (664, 435, 3, 'write', 'api', true, NULL, NULL, NULL, '2025-07-30 16:23:22.063485+00', NULL, '{"file_size": 272845, "mime_type": "image/jpeg", "operation": "upload"}', NULL);
INSERT INTO public.document_access_logs VALUES (665, 419, 3, 'read', 'api', true, NULL, NULL, NULL, '2025-07-30 16:23:35.111229+00', NULL, '{}', NULL);
INSERT INTO public.document_access_logs VALUES (666, 419, 3, 'read', 'api', true, NULL, NULL, NULL, '2025-07-30 16:23:35.134804+00', NULL, '{}', NULL);
INSERT INTO public.document_access_logs VALUES (667, 183, 3, 'read', 'api', true, NULL, NULL, NULL, '2025-07-30 16:23:35.152318+00', NULL, '{}', NULL);
INSERT INTO public.document_access_logs VALUES (668, 183, 3, 'read', 'api', true, NULL, NULL, NULL, '2025-07-30 16:23:41.730071+00', NULL, '{}', NULL);
INSERT INTO public.document_access_logs VALUES (669, 183, 3, 'read', 'api', true, NULL, NULL, NULL, '2025-07-30 16:23:41.748575+00', NULL, '{}', NULL);
INSERT INTO public.document_access_logs VALUES (670, 435, 3, 'download', 'api', true, NULL, NULL, NULL, '2025-07-30 16:23:48.975632+00', NULL, '{}', NULL);
INSERT INTO public.document_access_logs VALUES (755, 453, 14, 'read', 'api', true, NULL, NULL, NULL, '2025-08-01 13:43:50.827077+00', NULL, '{}', NULL);
INSERT INTO public.document_access_logs VALUES (772, 452, 14, 'download', 'api', true, NULL, NULL, NULL, '2025-08-01 13:45:27.838918+00', NULL, '{}', NULL);
INSERT INTO public.document_access_logs VALUES (777, 455, 14, 'write', 'api', true, NULL, NULL, NULL, '2025-08-01 15:19:26.20194+00', NULL, '{"file_size": 33147, "mime_type": "application/vnd.openxmlformats-officedocument.wordprocessingml.document", "operation": "upload"}', NULL);
INSERT INTO public.document_access_logs VALUES (787, 183, 3, 'read', 'api', true, NULL, NULL, NULL, '2025-08-01 15:26:58.220895+00', NULL, '{}', NULL);
INSERT INTO public.document_access_logs VALUES (792, 452, 14, 'download', 'api', true, NULL, NULL, NULL, '2025-08-01 17:14:10.30087+00', NULL, '{}', NULL);
INSERT INTO public.document_access_logs VALUES (813, 481, 14, 'download', 'api', true, NULL, NULL, NULL, '2025-08-10 10:56:15.899624+00', NULL, '{}', NULL);
INSERT INTO public.document_access_logs VALUES (816, 481, 14, 'download', 'api', true, NULL, NULL, NULL, '2025-08-10 10:56:15.968418+00', NULL, '{}', NULL);
INSERT INTO public.document_access_logs VALUES (831, 481, 14, 'download', 'api', true, NULL, NULL, NULL, '2025-08-10 11:26:22.854259+00', NULL, '{}', NULL);
INSERT INTO public.document_access_logs VALUES (756, 454, 14, 'write', 'api', true, NULL, NULL, NULL, '2025-08-01 13:44:34.073254+00', NULL, '{"file_size": 272861, "mime_type": "image/jpeg", "operation": "upload"}', NULL);
INSERT INTO public.document_access_logs VALUES (759, 454, 14, 'download', 'api', true, NULL, NULL, NULL, '2025-08-01 13:44:55.329008+00', NULL, '{}', NULL);
INSERT INTO public.document_access_logs VALUES (760, 454, 14, 'download', 'api', true, NULL, NULL, NULL, '2025-08-01 13:44:55.348384+00', NULL, '{}', NULL);
INSERT INTO public.document_access_logs VALUES (771, 452, 14, 'download', 'api', true, NULL, NULL, NULL, '2025-08-01 13:45:07.725094+00', NULL, '{}', NULL);
INSERT INTO public.document_access_logs VALUES (774, 452, 14, 'download', 'api', true, NULL, NULL, NULL, '2025-08-01 13:45:27.883238+00', NULL, '{}', NULL);
INSERT INTO public.document_access_logs VALUES (778, 456, 14, 'write', 'api', true, NULL, NULL, NULL, '2025-08-01 15:20:52.303787+00', NULL, '{}', NULL);
INSERT INTO public.document_access_logs VALUES (779, 456, 14, 'read', 'api', true, NULL, NULL, NULL, '2025-08-01 15:21:16.616322+00', NULL, '{}', NULL);
INSERT INTO public.document_access_logs VALUES (814, 481, 14, 'download', 'api', true, NULL, NULL, NULL, '2025-08-10 10:56:15.923273+00', NULL, '{}', NULL);
INSERT INTO public.document_access_logs VALUES (818, 452, 14, 'download', 'api', true, NULL, NULL, NULL, '2025-08-10 11:03:48.899794+00', NULL, '{}', NULL);
INSERT INTO public.document_access_logs VALUES (820, 452, 14, 'download', 'api', true, NULL, NULL, NULL, '2025-08-10 11:03:48.946576+00', NULL, '{}', NULL);
INSERT INTO public.document_access_logs VALUES (826, 452, 14, 'download', 'api', true, NULL, NULL, NULL, '2025-08-10 11:10:43.610847+00', NULL, '{}', NULL);
INSERT INTO public.document_access_logs VALUES (827, 452, 14, 'download', 'api', true, NULL, NULL, NULL, '2025-08-10 11:10:43.619557+00', NULL, '{}', NULL);
INSERT INTO public.document_access_logs VALUES (757, 454, 14, 'download', 'api', true, NULL, NULL, NULL, '2025-08-01 13:44:55.284335+00', NULL, '{}', NULL);
INSERT INTO public.document_access_logs VALUES (761, 454, 14, 'download', 'api', true, NULL, NULL, NULL, '2025-08-01 13:44:55.358007+00', NULL, '{}', NULL);
INSERT INTO public.document_access_logs VALUES (763, 454, 14, 'download', 'api', true, NULL, NULL, NULL, '2025-08-01 13:45:00.357957+00', NULL, '{}', NULL);
INSERT INTO public.document_access_logs VALUES (780, 456, 14, 'read', 'api', true, NULL, NULL, NULL, '2025-08-01 15:21:16.64794+00', NULL, '{}', NULL);
INSERT INTO public.document_access_logs VALUES (781, 459, 14, 'read', 'api', true, NULL, NULL, NULL, '2025-08-01 15:21:19.783438+00', NULL, '{}', NULL);
INSERT INTO public.document_access_logs VALUES (783, 456, 14, 'read', 'api', true, NULL, NULL, NULL, '2025-08-01 15:21:19.824226+00', NULL, '{}', NULL);
INSERT INTO public.document_access_logs VALUES (793, 452, 14, 'download', 'api', true, NULL, NULL, NULL, '2025-08-01 17:14:10.309298+00', NULL, '{}', NULL);
INSERT INTO public.document_access_logs VALUES (801, 481, 14, 'download', 'api', true, NULL, NULL, NULL, '2025-08-01 20:31:43.852062+00', NULL, '{}', NULL);
INSERT INTO public.document_access_logs VALUES (802, 481, 14, 'download', 'api', true, NULL, NULL, NULL, '2025-08-01 20:31:43.86937+00', NULL, '{}', NULL);
INSERT INTO public.document_access_logs VALUES (803, 481, 14, 'download', 'api', true, NULL, NULL, NULL, '2025-08-01 20:31:43.890368+00', NULL, '{}', NULL);
INSERT INTO public.document_access_logs VALUES (806, 482, 14, 'write', 'api', true, NULL, NULL, NULL, '2025-08-01 20:31:54.936644+00', NULL, '{"file_size": 195595, "mime_type": "image/jpeg", "operation": "upload"}', NULL);
INSERT INTO public.document_access_logs VALUES (807, 482, 14, 'download', 'api', true, NULL, NULL, NULL, '2025-08-01 20:32:05.090923+00', NULL, '{}', NULL);
INSERT INTO public.document_access_logs VALUES (809, 482, 14, 'download', 'api', true, NULL, NULL, NULL, '2025-08-01 20:32:05.128574+00', NULL, '{}', NULL);
INSERT INTO public.document_access_logs VALUES (811, 482, 14, 'download', 'api', true, NULL, NULL, NULL, '2025-08-01 20:32:05.14866+00', NULL, '{}', NULL);
INSERT INTO public.document_access_logs VALUES (815, 481, 14, 'download', 'api', true, NULL, NULL, NULL, '2025-08-10 10:56:15.952414+00', NULL, '{}', NULL);
INSERT INTO public.document_access_logs VALUES (758, 454, 14, 'download', 'api', true, NULL, NULL, NULL, '2025-08-01 13:44:55.29917+00', NULL, '{}', NULL);
INSERT INTO public.document_access_logs VALUES (769, 452, 14, 'download', 'api', true, NULL, NULL, NULL, '2025-08-01 13:45:07.701561+00', NULL, '{}', NULL);
INSERT INTO public.document_access_logs VALUES (775, 452, 14, 'download', 'api', true, NULL, NULL, NULL, '2025-08-01 13:45:27.895752+00', NULL, '{}', NULL);
INSERT INTO public.document_access_logs VALUES (782, 459, 14, 'read', 'api', true, NULL, NULL, NULL, '2025-08-01 15:21:19.806341+00', NULL, '{}', NULL);
INSERT INTO public.document_access_logs VALUES (784, 456, 14, 'read', 'api', true, NULL, NULL, NULL, '2025-08-01 15:21:25.040521+00', NULL, '{}', NULL);
INSERT INTO public.document_access_logs VALUES (785, 456, 14, 'read', 'api', true, NULL, NULL, NULL, '2025-08-01 15:21:25.064997+00', NULL, '{}', NULL);
INSERT INTO public.document_access_logs VALUES (786, 183, 3, 'read', 'api', true, NULL, NULL, NULL, '2025-08-01 15:26:58.19719+00', NULL, '{}', NULL);
INSERT INTO public.document_access_logs VALUES (789, 452, 14, 'download', 'api', true, NULL, NULL, NULL, '2025-08-01 17:14:10.242131+00', NULL, '{}', NULL);
INSERT INTO public.document_access_logs VALUES (794, 480, 14, 'write', 'api', true, NULL, NULL, NULL, '2025-08-01 17:25:16.910898+00', NULL, '{"file_size": 191952, "mime_type": "image/jpeg", "operation": "upload"}', NULL);
INSERT INTO public.document_access_logs VALUES (799, 480, 14, 'download', 'api', true, NULL, NULL, NULL, '2025-08-01 17:25:26.403548+00', NULL, '{}', NULL);
INSERT INTO public.document_access_logs VALUES (810, 482, 14, 'download', 'api', true, NULL, NULL, NULL, '2025-08-01 20:32:05.140079+00', NULL, '{}', NULL);
INSERT INTO public.document_access_logs VALUES (817, 483, 14, 'write', 'api', true, NULL, NULL, NULL, '2025-08-10 11:03:41.594552+00', NULL, '{"file_size": 257974, "mime_type": "image/jpeg", "operation": "upload"}', NULL);
INSERT INTO public.document_access_logs VALUES (765, 454, 14, 'download', 'api', true, NULL, NULL, NULL, '2025-08-01 13:45:00.386021+00', NULL, '{}', NULL);
INSERT INTO public.document_access_logs VALUES (766, 454, 14, 'download', 'api', true, NULL, NULL, NULL, '2025-08-01 13:45:00.394879+00', NULL, '{}', NULL);
INSERT INTO public.document_access_logs VALUES (773, 452, 14, 'download', 'api', true, NULL, NULL, NULL, '2025-08-01 13:45:27.857588+00', NULL, '{}', NULL);
INSERT INTO public.document_access_logs VALUES (790, 452, 14, 'download', 'api', true, NULL, NULL, NULL, '2025-08-01 17:14:10.259076+00', NULL, '{}', NULL);
INSERT INTO public.document_access_logs VALUES (795, 480, 14, 'download', 'api', true, NULL, NULL, NULL, '2025-08-01 17:25:26.341794+00', NULL, '{}', NULL);
INSERT INTO public.document_access_logs VALUES (796, 480, 14, 'download', 'api', true, NULL, NULL, NULL, '2025-08-01 17:25:26.357789+00', NULL, '{}', NULL);
INSERT INTO public.document_access_logs VALUES (797, 480, 14, 'download', 'api', true, NULL, NULL, NULL, '2025-08-01 17:25:26.380781+00', NULL, '{}', NULL);
INSERT INTO public.document_access_logs VALUES (798, 480, 14, 'download', 'api', true, NULL, NULL, NULL, '2025-08-01 17:25:26.396723+00', NULL, '{}', NULL);
INSERT INTO public.document_access_logs VALUES (804, 481, 14, 'download', 'api', true, NULL, NULL, NULL, '2025-08-01 20:31:43.904482+00', NULL, '{}', NULL);
INSERT INTO public.document_access_logs VALUES (819, 452, 14, 'download', 'api', true, NULL, NULL, NULL, '2025-08-10 11:03:48.918555+00', NULL, '{}', NULL);
INSERT INTO public.document_access_logs VALUES (832, 481, 14, 'download', 'api', true, NULL, NULL, NULL, '2025-08-10 11:26:22.863544+00', NULL, '{}', NULL);


--
-- TOC entry 3959 (class 0 OID 24825)
-- Dependencies: 241
-- Data for Name: document_permissions; Type: TABLE DATA; Schema: public; Owner: securevault_user
--



--
-- TOC entry 3961 (class 0 OID 24861)
-- Dependencies: 243
-- Data for Name: document_shares; Type: TABLE DATA; Schema: public; Owner: securevault_user
--



--
-- TOC entry 3963 (class 0 OID 24894)
-- Dependencies: 245
-- Data for Name: document_versions; Type: TABLE DATA; Schema: public; Owner: securevault_user
--



--
-- TOC entry 3957 (class 0 OID 24767)
-- Dependencies: 239
-- Data for Name: documents; Type: TABLE DATA; Schema: public; Owner: securevault_user
--

INSERT INTO public.documents VALUES (480, 'a799994b-5a6b-4816-b5ff-678eb320f4e9', 'IMG_0111.JPG', '', 'document', 'image/jpeg', NULL, '.JPG', 191936, NULL, '/app/encrypted-files/14/14/14_3456621508073562564.enc', 'local', 'AES-GCM', NULL, '\xae264fde82c1f4ef4f373eea', NULL, true, NULL, NULL, 0, 14, 14, NULL, 'active', 'private', '2025-08-01 17:25:16.908788+00', '2025-08-01 17:25:16.908788+00', NULL, NULL, NULL, false, NULL, true, true, 1, true, NULL, '{}', '[]', true, NULL, '{}', 0, 0, '{"dekId":"dek:mdt3gon6_asgj8RbfAk","encryptedDek":"8vAXem4eetf7hLRBOi8fNmjlPJK6rnSlLNUqTWQ1N50=","dekIv":"riZP3oLB9O9PNz7q","dekAuthTag":"c85wUSwWTnnvP8Uzoiicyw==","algorithm":"AES-GCM","keyLength":32,"version":1,"createdAt":"2025-08-01T17:25:16.866Z"}');
INSERT INTO public.documents VALUES (483, '0a91a464-c877-47a3-8957-4a4aa6b35925', 'IMG_0098.JPG', '', 'document', 'image/jpeg', NULL, '.JPG', 257958, NULL, '/app/encrypted-files/14/14/14_-6174174202634616774.enc', 'local', 'AES-GCM', NULL, '\xe861d3b203210f303f6d7f53', NULL, true, NULL, NULL, 0, 14, 14, NULL, 'active', 'private', '2025-08-10 11:03:41.588823+00', '2025-08-10 11:03:41.588823+00', NULL, NULL, NULL, false, NULL, true, true, 1, true, NULL, '{}', '[]', true, NULL, '{}', 0, 0, '{"dekId":"dek:me5ksmhx_ztLVliP0K80","encryptedDek":"pHI2tMOg93gUvtFn5szDThfX0XDGhp7hIfw0ro4eZqA=","dekIv":"6GHTsgMhDzA/bX9T","dekAuthTag":"cX0DRXgb8ohZgmCMWKaIZw==","algorithm":"AES-GCM","keyLength":32,"version":1,"createdAt":"2025-08-10T11:03:41.542Z"}');
INSERT INTO public.documents VALUES (406, '7cd238af-8585-45ab-8046-f540eb66490a', 'Contracts', 'Financial contracts and agreements', 'folder', NULL, NULL, NULL, 0, NULL, NULL, 'local', 'aes-256-gcm', NULL, NULL, NULL, true, 405, NULL, 0, 3, 3, NULL, 'active', 'private', '2025-07-28 20:26:33.234934+00', '2025-07-28 20:26:33.234934+00', NULL, NULL, NULL, false, NULL, true, true, 1, true, NULL, '{"original_name": "Contracts", "template_item_type": "folder", "created_from_template": true}', '["contracts"]', false, NULL, '{}', 0, 0, NULL);
INSERT INTO public.documents VALUES (410, '09d65fff-2d65-44ba-a0e8-b43671626a9b', 'Monthly Reports', 'Monthly financial reports', 'folder', NULL, NULL, NULL, 0, NULL, NULL, 'local', 'aes-256-gcm', NULL, NULL, NULL, true, 409, NULL, 0, 3, 3, NULL, 'active', 'private', '2025-07-28 20:26:33.246715+00', '2025-07-28 20:26:33.246715+00', NULL, NULL, NULL, false, NULL, true, true, 1, true, NULL, '{"original_name": "Monthly Reports", "template_item_type": "folder", "created_from_template": true}', '["monthly"]', false, NULL, '{}', 0, 0, NULL);
INSERT INTO public.documents VALUES (414, '6cf58104-aa63-4c09-a6df-9d98bca44554', 'Audit Trail', 'Transaction audit trails', 'folder', NULL, NULL, NULL, 0, NULL, NULL, 'local', 'aes-256-gcm', NULL, NULL, NULL, true, 413, NULL, 0, 3, 3, NULL, 'active', 'private', '2025-07-28 20:26:33.256183+00', '2025-07-28 20:26:33.256183+00', NULL, NULL, NULL, false, NULL, true, true, 1, true, NULL, '{"original_name": "Audit Trail", "template_item_type": "folder", "created_from_template": true}', '["audit-trail"]', false, NULL, '{}', 0, 0, NULL);
INSERT INTO public.documents VALUES (402, 'c9840ba8-b9d3-453d-849a-3e46d227aa6d', 'Budget Planning', 'Budget development and planning', 'folder', NULL, NULL, NULL, 0, NULL, NULL, 'local', 'aes-256-gcm', NULL, NULL, NULL, true, 401, NULL, 0, 3, 3, NULL, 'active', 'private', '2025-07-28 20:26:33.215098+00', '2025-07-28 20:26:48.339698+00', '2025-07-28 20:26:48.339698+00', NULL, NULL, false, NULL, true, true, 1, true, NULL, '{"original_name": "Budget Planning", "template_item_type": "folder", "created_from_template": true}', '["budget"]', false, NULL, '{}', 0, 0, NULL);
INSERT INTO public.documents VALUES (400, '51341877-9658-4cdd-bb15-1c62da2d6fb5', 'Socrates', NULL, 'folder', NULL, NULL, NULL, 0, NULL, NULL, 'local', 'aes-256-gcm', NULL, NULL, NULL, true, NULL, '', 0, 3, 3, NULL, 'deleted', 'private', '2025-07-28 20:26:26.225006+00', '2025-07-28 20:26:54.251208+00', '2025-07-28 20:26:50.079436+00', NULL, '2025-07-28 20:26:54.251208+00', false, NULL, true, true, 1, true, NULL, '{"template_id": "financial_project", "template_name": "Financial Project", "template_version": 1, "template_applied_at": "2025-07-28T20:26:33.200696", "created_from_template": true}', '["project", "confidential", "finance"]', false, NULL, '{}', 0, 0, NULL);
INSERT INTO public.documents VALUES (431, '18dfa652-2534-4a9d-9e0c-05bc089531c4', '04_Delivery', 'Project delivery and closure documents', 'folder', NULL, NULL, NULL, 0, NULL, NULL, 'local', 'aes-256-gcm', NULL, NULL, NULL, true, 419, NULL, 0, 3, 3, NULL, 'active', 'private', '2025-07-29 16:00:14.175715+00', '2025-07-29 16:00:23.007386+00', '2025-07-29 16:00:23.007386+00', NULL, NULL, false, NULL, true, true, 1, true, NULL, '{"original_name": "04_Delivery", "template_item_type": "folder", "created_from_template": true}', '["delivery", "closure"]', false, NULL, '{}', 0, 0, NULL);
INSERT INTO public.documents VALUES (460, '93dcb5eb-aa2d-4de6-a254-a625c3016fc1', 'Database Design', 'Database schemas and ERDs', 'folder', NULL, NULL, NULL, 0, NULL, NULL, 'local', 'aes-256-gcm', NULL, NULL, NULL, true, 459, NULL, 0, 14, 14, NULL, 'active', 'private', '2025-08-01 15:21:09.937486+00', '2025-08-01 15:21:09.937486+00', NULL, NULL, NULL, false, NULL, true, true, 1, true, NULL, '{"original_name": "Database Design", "template_item_type": "folder", "created_from_template": true}', '["database"]', false, NULL, '{}', 0, 0, NULL);
INSERT INTO public.documents VALUES (467, 'e28e63ab-ad76-4679-8281-fe8b84e50428', '04_Testing', 'Testing documentation and results', 'folder', NULL, NULL, NULL, 0, NULL, NULL, 'local', 'aes-256-gcm', NULL, NULL, NULL, true, 456, NULL, 0, 14, 14, NULL, 'active', 'private', '2025-08-01 15:21:09.958356+00', '2025-08-01 15:21:09.958356+00', NULL, NULL, NULL, false, NULL, true, true, 1, true, NULL, '{"original_name": "04_Testing", "template_item_type": "folder", "created_from_template": true}', '["testing", "qa"]', false, NULL, '{}', 0, 0, NULL);
INSERT INTO public.documents VALUES (475, 'e814b632-cd50-425c-a5bb-93e9d08d05a3', 'Monitoring', 'Monitoring and alerting setup', 'folder', NULL, NULL, NULL, 0, NULL, NULL, 'local', 'aes-256-gcm', NULL, NULL, NULL, true, 472, NULL, 0, 14, 14, NULL, 'active', 'private', '2025-08-01 15:21:09.973534+00', '2025-08-01 15:21:09.973534+00', NULL, NULL, NULL, false, NULL, true, true, 1, true, NULL, '{"original_name": "Monitoring", "template_item_type": "folder", "created_from_template": true}', '["monitoring"]', false, NULL, '{}', 0, 0, NULL);
INSERT INTO public.documents VALUES (481, '984e2215-d0c9-470a-bd51-409442f78913', 'test-document.txt', '', 'document', 'text/plain', NULL, '.txt', 200, NULL, '/app/encrypted-files/14/14/14_-1975671705690198059.enc', 'local', 'AES-GCM', NULL, '\x13f7521675c57d32a0c58d0a', NULL, true, NULL, NULL, 0, 14, 14, NULL, 'active', 'private', '2025-08-01 17:50:18.885487+00', '2025-08-01 17:50:18.885487+00', NULL, NULL, NULL, false, NULL, true, true, 1, true, NULL, '{}', '[]', true, NULL, '{}', 0, 0, '{"dekId":"dek:mdt4cvl9_WIqxukzastA","encryptedDek":"bvE56RLMH438ggY3HDQ1Ysey0eAho4aqRYY18MhuoVU=","dekIv":"E/dSFnXFfTKgxY0K","dekAuthTag":"SJzdsGh9c/lJGi/97XktXg==","algorithm":"AES-GCM","keyLength":32,"version":1,"createdAt":"2025-08-01T17:50:18.861Z"}');
INSERT INTO public.documents VALUES (405, '488228af-d421-4cc3-a7f1-574132e36d1a', '02_Documentation', 'Financial documentation and compliance', 'folder', NULL, NULL, NULL, 0, NULL, NULL, 'local', 'aes-256-gcm', NULL, NULL, NULL, true, 400, NULL, 0, 3, 3, NULL, 'active', 'private', '2025-07-28 20:26:33.23055+00', '2025-07-28 20:26:33.23055+00', NULL, NULL, NULL, false, NULL, true, true, 1, true, NULL, '{"original_name": "02_Documentation", "template_item_type": "folder", "created_from_template": true}', '["documentation", "compliance"]', false, NULL, '{}', 0, 0, NULL);
INSERT INTO public.documents VALUES (409, 'c4f7ca9f-c4be-4016-a53a-5c4d7aa68ab4', '03_Reporting', 'Financial reporting and analysis', 'folder', NULL, NULL, NULL, 0, NULL, NULL, 'local', 'aes-256-gcm', NULL, NULL, NULL, true, 400, NULL, 0, 3, 3, NULL, 'active', 'private', '2025-07-28 20:26:33.24382+00', '2025-07-28 20:26:33.24382+00', NULL, NULL, NULL, false, NULL, true, true, 1, true, NULL, '{"original_name": "03_Reporting", "template_item_type": "folder", "created_from_template": true}', '["reporting", "analysis"]', false, NULL, '{}', 0, 0, NULL);
INSERT INTO public.documents VALUES (413, '9b90509b-22a1-497b-b680-c95a112ebd20', '04_Audit', 'Audit preparation and documentation', 'folder', NULL, NULL, NULL, 0, NULL, NULL, 'local', 'aes-256-gcm', NULL, NULL, NULL, true, 400, NULL, 0, 3, 3, NULL, 'active', 'private', '2025-07-28 20:26:33.253956+00', '2025-07-28 20:26:33.253956+00', NULL, NULL, NULL, false, NULL, true, true, 1, true, NULL, '{"original_name": "04_Audit", "template_item_type": "folder", "created_from_template": true}', '["audit", "compliance"]', false, NULL, '{}', 0, 0, NULL);
INSERT INTO public.documents VALUES (401, '64223b25-d883-4c5a-a254-09ebf582cde6', '01_Planning', 'Financial planning and analysis', 'folder', NULL, NULL, NULL, 0, NULL, NULL, 'local', 'aes-256-gcm', NULL, NULL, NULL, true, 400, NULL, 0, 3, 3, NULL, 'active', 'private', '2025-07-28 20:26:33.207566+00', '2025-07-28 20:26:48.358485+00', '2025-07-28 20:26:48.358485+00', NULL, NULL, false, NULL, true, true, 1, true, NULL, '{"original_name": "01_Planning", "template_item_type": "folder", "created_from_template": true}', '["planning", "analysis"]', false, NULL, '{}', 0, 0, NULL);
INSERT INTO public.documents VALUES (434, '98d94175-d04a-4428-bf33-0ce595a06250', 'IMG_0098.JPG', '', 'document', 'image/jpeg', NULL, '.JPG', 257958, '5ebafae13fd4859c19dac7a1d6fef253386e9227a4c47d17db011f05f3fd1a2c', '/app/encrypted-files/3/3_/3_-4441857065581905325.enc', 'local', 'aes-256-gcm', 'key_1753892564907_fpwb1wivd', '\xe62e75cd97df3fcacc6ca24f', '\x26d8171cca9d8189a71af39a49305790', true, 183, NULL, 0, 3, 3, NULL, 'active', 'private', '2025-07-30 16:23:22.005021+00', '2025-07-30 16:23:22.005021+00', NULL, NULL, NULL, false, NULL, true, true, 1, true, NULL, '{"encryption_salt": "27kjGPFs8CKpQINZcwYcAf7rf9P6fP8PLv0zZ6oPkSM=", "encryption_algorithm": "AES-256-GCM", "encryption_iterations": 100000}', '[]', true, NULL, '{}', 0, 0, NULL);
INSERT INTO public.documents VALUES (462, 'e9a35b1f-9385-455a-a613-a1077546f922', 'UI-UX Design', 'User interface designs and mockups', 'folder', NULL, NULL, NULL, 0, NULL, NULL, 'local', 'aes-256-gcm', NULL, NULL, NULL, true, 459, NULL, 0, 14, 14, NULL, 'active', 'private', '2025-08-01 15:21:09.944795+00', '2025-08-01 15:21:09.944795+00', NULL, NULL, NULL, false, NULL, true, true, 1, true, NULL, '{"original_name": "UI-UX Design", "template_item_type": "folder", "created_from_template": true}', '["ui", "ux"]', false, NULL, '{}', 0, 0, NULL);
INSERT INTO public.documents VALUES (470, '1314ea06-c56b-4ef1-b9c2-b908b63df406', 'Test Results', 'Test execution results', 'folder', NULL, NULL, NULL, 0, NULL, NULL, 'local', 'aes-256-gcm', NULL, NULL, NULL, true, 467, NULL, 0, 14, 14, NULL, 'active', 'private', '2025-08-01 15:21:09.963974+00', '2025-08-01 15:21:09.963974+00', NULL, NULL, NULL, false, NULL, true, true, 1, true, NULL, '{"original_name": "Test Results", "template_item_type": "folder", "created_from_template": true}', '["test-results"]', false, NULL, '{}', 0, 0, NULL);
INSERT INTO public.documents VALUES (478, '19e2e1bd-0689-4158-b326-0cbd58770b88', 'Developer Documentation', 'Developer guides and API docs', 'folder', NULL, NULL, NULL, 0, NULL, NULL, 'local', 'aes-256-gcm', NULL, NULL, NULL, true, 476, NULL, 0, 14, 14, NULL, 'active', 'private', '2025-08-01 15:21:09.978677+00', '2025-08-01 15:21:09.978677+00', NULL, NULL, NULL, false, NULL, true, true, 1, true, NULL, '{"original_name": "Developer Documentation", "template_item_type": "folder", "created_from_template": true}', '["dev-docs"]', false, NULL, '{}', 0, 0, NULL);
INSERT INTO public.documents VALUES (403, '8e3ed7a8-dc74-4251-af20-06068938a55f', 'Financial Models', 'Financial modeling and projections', 'folder', NULL, NULL, NULL, 0, NULL, NULL, 'local', 'aes-256-gcm', NULL, NULL, NULL, true, 401, NULL, 0, 3, 3, NULL, 'active', 'private', '2025-07-28 20:26:33.219839+00', '2025-07-28 20:26:33.219839+00', NULL, NULL, NULL, false, NULL, true, true, 1, true, NULL, '{"original_name": "Financial Models", "template_item_type": "folder", "created_from_template": true}', '["models"]', false, NULL, '{}', 0, 0, NULL);
INSERT INTO public.documents VALUES (407, '49de32a3-f3ad-4a32-9116-13f8757cb48f', 'Invoices', 'Invoice processing and tracking', 'folder', NULL, NULL, NULL, 0, NULL, NULL, 'local', 'aes-256-gcm', NULL, NULL, NULL, true, 405, NULL, 0, 3, 3, NULL, 'active', 'private', '2025-07-28 20:26:33.237782+00', '2025-07-28 20:26:33.237782+00', NULL, NULL, NULL, false, NULL, true, true, 1, true, NULL, '{"original_name": "Invoices", "template_item_type": "folder", "created_from_template": true}', '["invoices"]', false, NULL, '{}', 0, 0, NULL);
INSERT INTO public.documents VALUES (411, '8953aa0b-db94-4c92-b78b-0f0459d1c5b6', 'Quarterly Reports', 'Quarterly financial analysis', 'folder', NULL, NULL, NULL, 0, NULL, NULL, 'local', 'aes-256-gcm', NULL, NULL, NULL, true, 409, NULL, 0, 3, 3, NULL, 'active', 'private', '2025-07-28 20:26:33.248922+00', '2025-07-28 20:26:33.248922+00', NULL, NULL, NULL, false, NULL, true, true, 1, true, NULL, '{"original_name": "Quarterly Reports", "template_item_type": "folder", "created_from_template": true}', '["quarterly"]', false, NULL, '{}', 0, 0, NULL);
INSERT INTO public.documents VALUES (415, 'd3273f1d-ef61-4979-8e23-2f009c47be2e', 'Supporting Documents', 'Audit supporting documentation', 'folder', NULL, NULL, NULL, 0, NULL, NULL, 'local', 'aes-256-gcm', NULL, NULL, NULL, true, 413, NULL, 0, 3, 3, NULL, 'active', 'private', '2025-07-28 20:26:33.258188+00', '2025-07-28 20:26:33.258188+00', NULL, NULL, NULL, false, NULL, true, true, 1, true, NULL, '{"original_name": "Supporting Documents", "template_item_type": "folder", "created_from_template": true}', '["supporting-docs"]', false, NULL, '{}', 0, 0, NULL);
INSERT INTO public.documents VALUES (435, 'd45a1c88-7b5a-4986-81f7-49d92c4d0f5a', 'IMG_0105.JPG', '', 'document', 'image/jpeg', NULL, '.JPG', 272845, 'f0cc28a0d8eb5f078f7a17b9811be82fedaaae02dc615841b502a4306874258a', '/app/encrypted-files/3/3_/3_-5312490098988632511.enc', 'local', 'aes-256-gcm', 'key_1753892564907_fpwb1wivd', '\x45a68e4af191c74be8963709', '\xe28ea1fa08d91f2c41e2ea686814c107', true, 183, NULL, 0, 3, 3, NULL, 'active', 'private', '2025-07-30 16:23:22.061134+00', '2025-07-30 16:23:22.061134+00', NULL, NULL, NULL, false, NULL, true, true, 1, true, NULL, '{"encryption_salt": "27kjGPFs8CKpQINZcwYcAf7rf9P6fP8PLv0zZ6oPkSM=", "encryption_algorithm": "AES-256-GCM", "encryption_iterations": 100000}', '[]', true, NULL, '{}', 0, 0, NULL);
INSERT INTO public.documents VALUES (482, 'a2b9c21a-4fb4-44be-9395-0fffd666e0c8', 'IMG_0110.JPG', '', 'document', 'image/jpeg', NULL, '.JPG', 195579, NULL, '/app/encrypted-files/14/14/14_-7694157433998947598.enc', 'local', 'AES-GCM', NULL, '\x2ce7219882f05ff9dcaa9def', NULL, true, NULL, NULL, 0, 14, 14, NULL, 'active', 'private', '2025-08-01 20:31:54.934029+00', '2025-08-01 20:31:54.934029+00', NULL, NULL, NULL, false, NULL, true, true, 1, true, NULL, '{}', '[]', true, NULL, '{}', 0, 0, '{"dekId":"dek:mdta4p3d_25qdRVSHQtE","encryptedDek":"/6B++r15p+Uf/q/UnhYE0zZER3BO9ujVzkOnkDyXA9I=","dekIv":"LOchmILwX/ncqp3v","dekAuthTag":"W/9ymavkpGLDIHeGEtB5kQ==","algorithm":"AES-GCM","keyLength":32,"version":1,"createdAt":"2025-08-01T20:31:54.889Z"}');
INSERT INTO public.documents VALUES (463, 'dd71281f-7da6-4634-b8e8-2e38d35fb0d8', '03_Development', 'Development artifacts and code documentation', 'folder', NULL, NULL, NULL, 0, NULL, NULL, 'local', 'aes-256-gcm', NULL, NULL, NULL, true, 456, NULL, 0, 14, 14, NULL, 'active', 'private', '2025-08-01 15:21:09.94909+00', '2025-08-01 15:21:09.94909+00', NULL, NULL, NULL, false, NULL, true, true, 1, true, NULL, '{"original_name": "03_Development", "template_item_type": "folder", "created_from_template": true}', '["development", "code"]', false, NULL, '{}', 0, 0, NULL);
INSERT INTO public.documents VALUES (471, 'ee039db8-6c20-4b6d-b4c8-400c64062c35', 'Bug Reports', 'Bug tracking and reports', 'folder', NULL, NULL, NULL, 0, NULL, NULL, 'local', 'aes-256-gcm', NULL, NULL, NULL, true, 467, NULL, 0, 14, 14, NULL, 'active', 'private', '2025-08-01 15:21:09.965814+00', '2025-08-01 15:21:09.965814+00', NULL, NULL, NULL, false, NULL, true, true, 1, true, NULL, '{"original_name": "Bug Reports", "template_item_type": "folder", "created_from_template": true}', '["bugs"]', false, NULL, '{}', 0, 0, NULL);
INSERT INTO public.documents VALUES (479, '3a5d0ea1-3d16-4197-bdc4-bdb6c169ed44', 'Operations Manual', 'Operations and maintenance guides', 'folder', NULL, NULL, NULL, 0, NULL, NULL, 'local', 'aes-256-gcm', NULL, NULL, NULL, true, 476, NULL, 0, 14, 14, NULL, 'active', 'private', '2025-08-01 15:21:09.980464+00', '2025-08-01 15:21:09.980464+00', NULL, NULL, NULL, false, NULL, true, true, 1, true, NULL, '{"original_name": "Operations Manual", "template_item_type": "folder", "created_from_template": true}', '["ops-docs"]', false, NULL, '{}', 0, 0, NULL);
INSERT INTO public.documents VALUES (404, 'c01b6ec4-e113-429d-bc6e-113bc509c398', 'Risk Assessment', 'Financial risk analysis', 'folder', NULL, NULL, NULL, 0, NULL, NULL, 'local', 'aes-256-gcm', NULL, NULL, NULL, true, 401, NULL, 0, 3, 3, NULL, 'active', 'private', '2025-07-28 20:26:33.225361+00', '2025-07-28 20:26:33.225361+00', NULL, NULL, NULL, false, NULL, true, true, 1, true, NULL, '{"original_name": "Risk Assessment", "template_item_type": "folder", "created_from_template": true}', '["risk"]', false, NULL, '{}', 0, 0, NULL);
INSERT INTO public.documents VALUES (408, '26c14688-cc30-42cf-9f65-c7d3379f061f', 'Receipts', 'Expense receipts and documentation', 'folder', NULL, NULL, NULL, 0, NULL, NULL, 'local', 'aes-256-gcm', NULL, NULL, NULL, true, 405, NULL, 0, 3, 3, NULL, 'active', 'private', '2025-07-28 20:26:33.240823+00', '2025-07-28 20:26:33.240823+00', NULL, NULL, NULL, false, NULL, true, true, 1, true, NULL, '{"original_name": "Receipts", "template_item_type": "folder", "created_from_template": true}', '["receipts"]', false, NULL, '{}', 0, 0, NULL);
INSERT INTO public.documents VALUES (412, '58b12a5e-253b-4c74-9061-688370dcb164', 'Annual Reports', 'Annual financial statements', 'folder', NULL, NULL, NULL, 0, NULL, NULL, 'local', 'aes-256-gcm', NULL, NULL, NULL, true, 409, NULL, 0, 3, 3, NULL, 'active', 'private', '2025-07-28 20:26:33.251546+00', '2025-07-28 20:26:33.251546+00', NULL, NULL, NULL, false, NULL, true, true, 1, true, NULL, '{"original_name": "Annual Reports", "template_item_type": "folder", "created_from_template": true}', '["annual"]', false, NULL, '{}', 0, 0, NULL);
INSERT INTO public.documents VALUES (416, '487779b2-b46a-4aad-905e-d056f44f924a', 'Audit Reports', 'Audit findings and reports', 'folder', NULL, NULL, NULL, 0, NULL, NULL, 'local', 'aes-256-gcm', NULL, NULL, NULL, true, 413, NULL, 0, 3, 3, NULL, 'active', 'private', '2025-07-28 20:26:33.260392+00', '2025-07-28 20:26:33.260392+00', NULL, NULL, NULL, false, NULL, true, true, 1, true, NULL, '{"original_name": "Audit Reports", "template_item_type": "folder", "created_from_template": true}', '["audit-reports"]', false, NULL, '{}', 0, 0, NULL);
INSERT INTO public.documents VALUES (452, '51a9095f-bc45-4366-aebf-b4de8b0fbb70', 'IMG_0098.JPG', '', 'document', 'image/jpeg', NULL, '.JPG', 257958, NULL, '/app/encrypted-files/14/14/14_6982146677935936545.enc', 'local', 'AES-GCM', NULL, '\x72cb456fb78c75062655e3c8', NULL, true, NULL, NULL, 0, 14, 14, NULL, 'active', 'private', '2025-08-01 13:40:59.796049+00', '2025-08-01 13:40:59.796049+00', NULL, NULL, NULL, false, NULL, true, true, 1, true, NULL, '{}', '[]', true, NULL, '{}', 0, 0, '{"dekId":"dek:mdsvg92g_s9MOpu5EZtM","encryptedDek":"Yi7qBxcsFxC8nqZ6R8XfWNdGZy1Zp0acUpFzyHEv2Vo=","dekIv":"cstFb7eMdQYmVePI","dekAuthTag":"4Sj4X7ddINKTI00bgeTK7A==","algorithm":"AES-GCM","keyLength":32,"version":1,"createdAt":"2025-08-01T13:40:59.752Z"}');
INSERT INTO public.documents VALUES (418, 'fdce43fe-d55a-4946-8b8f-249b21e463bc', 'List of Change Mgmt Ticket 4.2023 - 4.2024.xlsx', '', 'document', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet', NULL, '.xlsx', 22742, '513e871c2694ecd8b0f8bf62a5e56b276a830def01729990edd6147774a61d5b', '/app/encrypted-files/3/3_/3_-5328223324904680937.enc', 'local', 'aes-256-gcm', 'key_1753737230288_0jfpxgt2d', '\x12f5dd4d88203e0ed66abc55', '\xeb737e21acf730d3d1ce5cac422bd376', true, 417, NULL, 0, 3, 3, NULL, 'active', 'private', '2025-07-28 21:14:00.288795+00', '2025-07-28 21:14:00.288795+00', NULL, NULL, NULL, false, NULL, true, true, 1, true, NULL, '{"encryption_salt": "fzMYfILYcz4YKLXBkeWgU+mVrbqQ2XuKyr9/5zV2uyw=", "encryption_algorithm": "AES-256-GCM", "encryption_iterations": 100000}', '[]', true, NULL, '{}', 0, 0, NULL);
INSERT INTO public.documents VALUES (417, '1ca39d26-9c98-4b66-934f-6180cdb70cd0', 'Excel', NULL, 'folder', NULL, NULL, NULL, 0, NULL, NULL, 'local', 'aes-256-gcm', NULL, NULL, NULL, true, NULL, '', 0, 3, 3, NULL, 'deleted', 'private', '2025-07-28 21:13:32.675366+00', '2025-07-30 16:22:21.758565+00', '2025-07-28 21:13:36.861494+00', NULL, '2025-07-30 16:22:21.758565+00', false, NULL, true, true, 1, true, NULL, '{}', '[]', false, NULL, '{}', 0, 0, NULL);
INSERT INTO public.documents VALUES (453, '0ce05dbe-55ec-42c8-9a58-f821f822b23c', 'test', NULL, 'folder', NULL, NULL, NULL, 0, NULL, NULL, 'local', 'aes-256-gcm', NULL, NULL, NULL, true, NULL, '', 0, 14, 14, NULL, 'active', 'private', '2025-08-01 13:43:23.420268+00', '2025-08-01 13:43:50.831705+00', '2025-08-01 13:43:50.831705+00', NULL, NULL, false, NULL, true, true, 1, true, NULL, '{}', '[]', false, NULL, '{}', 0, 0, NULL);
INSERT INTO public.documents VALUES (461, 'e4a4f019-854a-47a1-af4f-d9e5b68068b9', 'API Design', 'API specifications and documentation', 'folder', NULL, NULL, NULL, 0, NULL, NULL, 'local', 'aes-256-gcm', NULL, NULL, NULL, true, 459, NULL, 0, 14, 14, NULL, 'active', 'private', '2025-08-01 15:21:09.941087+00', '2025-08-01 15:21:09.941087+00', NULL, NULL, NULL, false, NULL, true, true, 1, true, NULL, '{"original_name": "API Design", "template_item_type": "folder", "created_from_template": true}', '["api"]', false, NULL, '{}', 0, 0, NULL);
INSERT INTO public.documents VALUES (468, '827b1a87-a11b-4cec-a4b1-608161339ed0', 'Test Plans', 'Test planning documents', 'folder', NULL, NULL, NULL, 0, NULL, NULL, 'local', 'aes-256-gcm', NULL, NULL, NULL, true, 467, NULL, 0, 14, 14, NULL, 'active', 'private', '2025-08-01 15:21:09.960466+00', '2025-08-01 15:21:09.960466+00', NULL, NULL, NULL, false, NULL, true, true, 1, true, NULL, '{"original_name": "Test Plans", "template_item_type": "folder", "created_from_template": true}', '["test-plans"]', false, NULL, '{}', 0, 0, NULL);
INSERT INTO public.documents VALUES (476, '436230cf-5db4-4717-b6b8-8c114fda665c', '06_Documentation', 'Project documentation and guides', 'folder', NULL, NULL, NULL, 0, NULL, NULL, 'local', 'aes-256-gcm', NULL, NULL, NULL, true, 456, NULL, 0, 14, 14, NULL, 'active', 'private', '2025-08-01 15:21:09.975391+00', '2025-08-01 15:21:09.975391+00', NULL, NULL, NULL, false, NULL, true, true, 1, true, NULL, '{"original_name": "06_Documentation", "template_item_type": "folder", "created_from_template": true}', '["documentation"]', false, NULL, '{}', 0, 0, NULL);
INSERT INTO public.documents VALUES (183, 'cdb7a425-c5b6-441f-8186-a2f4502d4140', 'Natchez_2004', '', 'folder', NULL, NULL, NULL, 0, NULL, NULL, 'local', 'aes-256-gcm', NULL, NULL, NULL, true, NULL, NULL, 0, 3, 3, 3, 'active', 'private', '2025-07-28 14:58:59.944468+00', '2025-08-01 15:26:58.225427+00', '2025-08-01 15:26:58.225427+00', NULL, NULL, false, NULL, true, true, 1, true, NULL, '{}', '["Photos"]', false, NULL, '{}', 0, 0, NULL);
INSERT INTO public.documents VALUES (185, '015ecf76-037b-4277-ab20-5b644a6fdf82', 'natchez 013.jpg', '', 'document', 'image/jpeg', NULL, '.jpg', 674895, '89bf18114b248eb9a77a9567a27efe3a978fa08321dfb7b05fe29bf3fd18f402', '/app/encrypted-files/3/3_/3_-6170519651197891212.enc', 'local', 'aes-256-gcm', 'key_1753714735024_mfi3xl2he', '\x38aaef6ed705a7e24d00b527', '\x9c109c1101b54f676606211dd425176d', true, 183, NULL, 0, 3, 3, NULL, 'active', 'private', '2025-07-28 14:59:00.499768+00', '2025-07-28 14:59:00.499768+00', NULL, NULL, NULL, false, NULL, true, true, 1, true, NULL, '{"encryption_salt": "BPhYO0PpGc91CHkuKPaPfCiD+Rk44c6xQNW0hZFtGus=", "encryption_algorithm": "AES-256-GCM", "encryption_iterations": 100000}', '[]', true, NULL, '{}', 0, 0, NULL);
INSERT INTO public.documents VALUES (186, '826562f1-9625-4f34-aab4-e1002488bd7f', 'natchez 012.jpg', '', 'document', 'image/jpeg', NULL, '.jpg', 1686373, '089b4c77b620a56bec3ec2257943c271edb8513a256308ffb4a247d534aefd32', '/app/encrypted-files/3/3_/3_583112043721022567.enc', 'local', 'aes-256-gcm', 'key_1753714735024_mfi3xl2he', '\x1a8d7702f44b6983e43f002c', '\x8c4034f0e79e526402c5cba241e1e06d', true, 183, NULL, 0, 3, 3, NULL, 'active', 'private', '2025-07-28 14:59:00.532462+00', '2025-07-28 14:59:00.532462+00', NULL, NULL, NULL, false, NULL, true, true, 1, true, NULL, '{"encryption_salt": "BPhYO0PpGc91CHkuKPaPfCiD+Rk44c6xQNW0hZFtGus=", "encryption_algorithm": "AES-256-GCM", "encryption_iterations": 100000}', '[]', true, NULL, '{}', 0, 0, NULL);
INSERT INTO public.documents VALUES (189, 'c89873b2-b041-452a-b0bd-f067063efe37', 'natchez 014.jpg', '', 'document', 'image/jpeg', NULL, '.jpg', 704566, 'cfa62e707946647c63ac94511e0e3f5df7e953492214801301f8af985a68e5f4', '/app/encrypted-files/3/3_/3_5567944453821823203.enc', 'local', 'aes-256-gcm', 'key_1753714735024_mfi3xl2he', '\xfc96b9bfa838914b2a7abd50', '\x4ec0e418cbe6fa6a02ee2922498d5ffe', true, 183, NULL, 0, 3, 3, NULL, 'active', 'private', '2025-07-28 14:59:00.92783+00', '2025-07-28 14:59:00.92783+00', NULL, NULL, NULL, false, NULL, true, true, 1, true, NULL, '{"encryption_salt": "BPhYO0PpGc91CHkuKPaPfCiD+Rk44c6xQNW0hZFtGus=", "encryption_algorithm": "AES-256-GCM", "encryption_iterations": 100000}', '[]', true, NULL, '{}', 0, 0, NULL);
INSERT INTO public.documents VALUES (190, '28bbf93b-4202-451f-96d5-230b8c690e73', 'natchez 016.jpg', '', 'document', 'image/jpeg', NULL, '.jpg', 952726, '69429d2b80c26d15c6711971149000198c9f0fc9f6ac742f4c180ab342ce0ba4', '/app/encrypted-files/3/3_/3_4332161043395819224.enc', 'local', 'aes-256-gcm', 'key_1753714735024_mfi3xl2he', '\x52ad08204ce6fe83f8a1ba5c', '\x870dcc7a38ed108be7193414794919e5', true, 183, NULL, 0, 3, 3, NULL, 'active', 'private', '2025-07-28 14:59:00.955266+00', '2025-07-28 14:59:00.955266+00', NULL, NULL, NULL, false, NULL, true, true, 1, true, NULL, '{"encryption_salt": "BPhYO0PpGc91CHkuKPaPfCiD+Rk44c6xQNW0hZFtGus=", "encryption_algorithm": "AES-256-GCM", "encryption_iterations": 100000}', '[]', true, NULL, '{}', 0, 0, NULL);
INSERT INTO public.documents VALUES (191, '26f5988c-d24d-4e7e-8d41-a8d2652e039a', 'natchez 017.jpg', '', 'document', 'image/jpeg', NULL, '.jpg', 841125, 'c0d420e652d85b39d7c7a9d9f4185315c504d8ccc79101b240f7cb3e083a9379', '/app/encrypted-files/3/3_/3_9139450922281430013.enc', 'local', 'aes-256-gcm', 'key_1753714735024_mfi3xl2he', '\x4d412dddd5dfb4be0c158e53', '\xe23f53672627df25cf4729915a2096e6', true, 183, NULL, 0, 3, 3, NULL, 'active', 'private', '2025-07-28 14:59:00.969244+00', '2025-07-28 14:59:00.969244+00', NULL, NULL, NULL, false, NULL, true, true, 1, true, NULL, '{"encryption_salt": "BPhYO0PpGc91CHkuKPaPfCiD+Rk44c6xQNW0hZFtGus=", "encryption_algorithm": "AES-256-GCM", "encryption_iterations": 100000}', '[]', true, NULL, '{}', 0, 0, NULL);
INSERT INTO public.documents VALUES (192, '353c918d-ae07-4a0e-873f-a14b5d9c9a3d', 'natchez 025.jpg', '', 'document', 'image/jpeg', NULL, '.jpg', 1119933, 'f3a61cbd1da595d838f1c468c615b1856eb21df3772915e0ba1deb9a5ae992f3', '/app/encrypted-files/3/3_/3_2567124762711211849.enc', 'local', 'aes-256-gcm', 'key_1753714735024_mfi3xl2he', '\x7ce122ee59b0b6a4e04cb095', '\xcfd8db5c894aba937859aac2aecf5818', true, 183, NULL, 0, 3, 3, NULL, 'active', 'private', '2025-07-28 14:59:00.989739+00', '2025-07-28 14:59:00.989739+00', NULL, NULL, NULL, false, NULL, true, true, 1, true, NULL, '{"encryption_salt": "BPhYO0PpGc91CHkuKPaPfCiD+Rk44c6xQNW0hZFtGus=", "encryption_algorithm": "AES-256-GCM", "encryption_iterations": 100000}', '[]', true, NULL, '{}', 0, 0, NULL);
INSERT INTO public.documents VALUES (193, '98f9b585-e08c-4730-a764-f97f3dc10277', 'natchez 015.jpg', '', 'document', 'image/jpeg', NULL, '.jpg', 1153704, 'e7746259e2040ff8c35de8a83b17f88dae0e0ab534d4741b39fb96105aefe195', '/app/encrypted-files/3/3_/3_7644664434277026387.enc', 'local', 'aes-256-gcm', 'key_1753714735024_mfi3xl2he', '\xb4216a61119568810f4df2bd', '\x835488fa6506e4443d67140cc83fae7d', true, 183, NULL, 0, 3, 3, NULL, 'active', 'private', '2025-07-28 14:59:01.00964+00', '2025-07-28 14:59:01.00964+00', NULL, NULL, NULL, false, NULL, true, true, 1, true, NULL, '{"encryption_salt": "BPhYO0PpGc91CHkuKPaPfCiD+Rk44c6xQNW0hZFtGus=", "encryption_algorithm": "AES-256-GCM", "encryption_iterations": 100000}', '[]', true, NULL, '{}', 0, 0, NULL);
INSERT INTO public.documents VALUES (194, 'bc68e860-ca52-4d06-acc7-8105b58153b4', 'natchez 018.jpg', '', 'document', 'image/jpeg', NULL, '.jpg', 1017565, '770b571cf33d48e677735515431454b7617e609ee4dad7496990bb4702bf84b3', '/app/encrypted-files/3/3_/3_4960760682887592678.enc', 'local', 'aes-256-gcm', 'key_1753714735024_mfi3xl2he', '\xf29e22e6ad6a390d8d0513c1', '\x090651b3a99fa29c0d41b06a8636f014', true, 183, NULL, 0, 3, 3, NULL, 'active', 'private', '2025-07-28 14:59:01.47011+00', '2025-07-28 14:59:01.47011+00', NULL, NULL, NULL, false, NULL, true, true, 1, true, NULL, '{"encryption_salt": "BPhYO0PpGc91CHkuKPaPfCiD+Rk44c6xQNW0hZFtGus=", "encryption_algorithm": "AES-256-GCM", "encryption_iterations": 100000}', '[]', true, NULL, '{}', 0, 0, NULL);
INSERT INTO public.documents VALUES (187, '8844a4ed-b50e-47a6-95d8-1bd5bd39e7c0', 'natchez 010.jpg', '', 'document', 'image/jpeg', NULL, '.jpg', 1877442, '19aeb9827d4189419ff2fa4925a6fd053c662b250e9ed129ea64bd8c1a871e8a', '/app/encrypted-files/3/3_/3_-3482105444032893172.enc', 'local', 'aes-256-gcm', 'key_1753714735024_mfi3xl2he', '\x2768097d052f278a6387dd63', '\x35ce95b8952c2c0f4d2749af4c62379e', true, 183, NULL, 0, 3, 3, NULL, 'active', 'private', '2025-07-28 14:59:00.548761+00', '2025-07-28 19:44:50.476269+00', NULL, NULL, NULL, false, NULL, true, true, 1, true, NULL, '{"encryption_salt": "BPhYO0PpGc91CHkuKPaPfCiD+Rk44c6xQNW0hZFtGus=", "encryption_algorithm": "AES-256-GCM", "encryption_iterations": 100000}', '[]', true, NULL, '{}', 0, 0, NULL);
INSERT INTO public.documents VALUES (188, 'a63ba04b-cb68-41cc-ad74-9a1f65e4e22c', 'natchez 011.jpg', '', 'document', 'image/jpeg', NULL, '.jpg', 1622232, '64b25afb08b08e92373d95ea8f31266fb7887e7726bcde8c34362408af1e241c', '/app/encrypted-files/3/3_/3_-5483514283568425215.enc', 'local', 'aes-256-gcm', 'key_1753714735024_mfi3xl2he', '\xd352505a467995ccdb75eecd', '\x807ca3e7a14312f12407648363bbc4aa', true, 183, NULL, 0, 3, 3, NULL, 'active', 'private', '2025-07-28 14:59:00.562104+00', '2025-07-28 19:44:50.476269+00', NULL, NULL, NULL, false, NULL, true, true, 1, true, NULL, '{"encryption_salt": "BPhYO0PpGc91CHkuKPaPfCiD+Rk44c6xQNW0hZFtGus=", "encryption_algorithm": "AES-256-GCM", "encryption_iterations": 100000}', '[]', true, NULL, '{}', 0, 0, NULL);
INSERT INTO public.documents VALUES (423, 'e293126e-809a-4c8f-a34c-ab5616df860d', 'Design', 'Design documents and mockups', 'folder', NULL, NULL, NULL, 0, NULL, NULL, 'local', 'aes-256-gcm', NULL, NULL, NULL, true, 422, NULL, 0, 3, 3, NULL, 'active', 'private', '2025-07-29 16:00:14.149367+00', '2025-07-29 16:00:14.149367+00', NULL, NULL, NULL, false, NULL, true, true, 1, true, NULL, '{"original_name": "Design", "template_item_type": "folder", "created_from_template": true}', '["design"]', false, NULL, '{}', 0, 0, NULL);
INSERT INTO public.documents VALUES (428, '0984ef8d-ed8e-4d18-b65b-30c0ef7d4029', 'Meeting Notes', 'Meeting notes and minutes', 'folder', NULL, NULL, NULL, 0, NULL, NULL, 'local', 'aes-256-gcm', NULL, NULL, NULL, true, 427, NULL, 0, 3, 3, NULL, 'active', 'private', '2025-07-29 16:00:14.167951+00', '2025-07-29 16:00:14.167951+00', NULL, NULL, NULL, false, NULL, true, true, 1, true, NULL, '{"original_name": "Meeting Notes", "template_item_type": "folder", "created_from_template": true}', '["meetings"]', false, NULL, '{}', 0, 0, NULL);
INSERT INTO public.documents VALUES (419, '10f4a699-3726-4829-80b2-04519b6990aa', 'schrute', NULL, 'folder', NULL, NULL, NULL, 0, NULL, NULL, 'local', 'aes-256-gcm', NULL, NULL, NULL, true, 183, 'Natchez_2004', 1, 3, 3, NULL, 'active', 'private', '2025-07-29 16:00:10.366221+00', '2025-07-30 16:23:35.139486+00', '2025-07-30 16:23:35.139486+00', NULL, NULL, false, NULL, true, true, 1, true, NULL, '{"template_id": "business_project", "template_name": "Business Project", "template_version": 1, "template_applied_at": "2025-07-29T16:00:14.130259", "created_from_template": true}', '["project", "business"]', false, NULL, '{}', 0, 0, NULL);
INSERT INTO public.documents VALUES (454, 'ea252e0f-6c03-42e8-82fb-2900680c8a47', 'IMG_0105.JPG', '', 'document', 'image/jpeg', NULL, '.JPG', 272845, NULL, '/app/encrypted-files/14/14/14_6628427272035576101.enc', 'local', 'AES-GCM', NULL, '\x1431bfd4534d2347590d5817', NULL, true, NULL, NULL, 0, 14, 14, NULL, 'active', 'private', '2025-08-01 13:44:34.068325+00', '2025-08-01 13:44:34.068325+00', NULL, NULL, NULL, false, NULL, true, true, 1, true, NULL, '{}', '[]', true, NULL, '{}', 0, 0, '{"dekId":"dek:mdsvkuec_I9FbgW2n3lk","encryptedDek":"RWV91IGMDLXqQ+0hZL3tbId72lbCWgRmATkdpaXIHsw=","dekIv":"FDG/1FNNI0dZDVgX","dekAuthTag":"rIfw3liHG2jLxWa66bFFaw==","algorithm":"AES-GCM","keyLength":32,"version":1,"createdAt":"2025-08-01T13:44:34.020Z"}');
INSERT INTO public.documents VALUES (195, '27e2196b-3e04-4b85-b227-d7a329e1d11d', 'natchez 023.jpg', '', 'document', 'image/jpeg', NULL, '.jpg', 870735, 'daed7527708fb413240207ea805b30a250cd2a69d3a43317c123e28c2f4d47d8', '/app/encrypted-files/3/3_/3_-7575636651799268126.enc', 'local', 'aes-256-gcm', 'key_1753714735024_mfi3xl2he', '\xba545eed9337393bd07883b9', '\x24a23d96d6cbfed3c03be199d49b4a0b', true, 183, NULL, 0, 3, 3, NULL, 'active', 'private', '2025-07-28 14:59:01.486473+00', '2025-07-28 14:59:01.486473+00', NULL, NULL, NULL, false, NULL, true, true, 1, true, NULL, '{"encryption_salt": "BPhYO0PpGc91CHkuKPaPfCiD+Rk44c6xQNW0hZFtGus=", "encryption_algorithm": "AES-256-GCM", "encryption_iterations": 100000}', '[]', true, NULL, '{}', 0, 0, NULL);
INSERT INTO public.documents VALUES (196, 'a31817db-1b27-4b17-a285-aeb33c8e4224', 'natchez 024.jpg', '', 'document', 'image/jpeg', NULL, '.jpg', 1060533, '98a54555aab962156efe77184165b3c1f346e55237c77965a2e815794da1dd49', '/app/encrypted-files/3/3_/3_5181386646446183349.enc', 'local', 'aes-256-gcm', 'key_1753714735024_mfi3xl2he', '\x5130ec7c346c697661db544d', '\x1b490643264eeac97cd0db5bba163799', true, 183, NULL, 0, 3, 3, NULL, 'active', 'private', '2025-07-28 14:59:01.499797+00', '2025-07-28 14:59:01.499797+00', NULL, NULL, NULL, false, NULL, true, true, 1, true, NULL, '{"encryption_salt": "BPhYO0PpGc91CHkuKPaPfCiD+Rk44c6xQNW0hZFtGus=", "encryption_algorithm": "AES-256-GCM", "encryption_iterations": 100000}', '[]', true, NULL, '{}', 0, 0, NULL);
INSERT INTO public.documents VALUES (201, '67918bd9-bc74-475b-93d0-60fd0e4886a2', 'natchez 021.jpg', '', 'document', 'image/jpeg', NULL, '.jpg', 1619427, 'a94a51fc4745f67d43b446d91f2fc2c01b4090adf7c56d872851eb38a902b730', '/app/encrypted-files/3/3_/3_4547794924613266181.enc', 'local', 'aes-256-gcm', 'key_1753714735024_mfi3xl2he', '\xa432307353042d89b1c6c1b7', '\xac7245f53e5d766577cd73baa96d5edf', true, 183, NULL, 0, 3, 3, NULL, 'active', 'private', '2025-07-28 14:59:02.047502+00', '2025-07-28 14:59:02.047502+00', NULL, NULL, NULL, false, NULL, true, true, 1, true, NULL, '{"encryption_salt": "BPhYO0PpGc91CHkuKPaPfCiD+Rk44c6xQNW0hZFtGus=", "encryption_algorithm": "AES-256-GCM", "encryption_iterations": 100000}', '[]', true, NULL, '{}', 0, 0, NULL);
INSERT INTO public.documents VALUES (420, 'baecdb1b-dd01-4132-bb89-1a95f2f6d0e3', '01_Planning', 'Project planning and initiation documents', 'folder', NULL, NULL, NULL, 0, NULL, NULL, 'local', 'aes-256-gcm', NULL, NULL, NULL, true, 419, NULL, 0, 3, 3, NULL, 'active', 'private', '2025-07-29 16:00:14.134578+00', '2025-07-29 16:00:14.134578+00', NULL, NULL, NULL, false, NULL, true, true, 1, true, NULL, '{"original_name": "01_Planning", "template_item_type": "folder", "created_from_template": true}', '["planning", "initiation"]', false, NULL, '{}', 0, 0, NULL);
INSERT INTO public.documents VALUES (425, '40f3b0a5-06da-44b5-bbf9-ae7fbffe0cfb', 'Testing', 'Testing plans and results', 'folder', NULL, NULL, NULL, 0, NULL, NULL, 'local', 'aes-256-gcm', NULL, NULL, NULL, true, 422, NULL, 0, 3, 3, NULL, 'active', 'private', '2025-07-29 16:00:14.15728+00', '2025-07-29 16:00:14.15728+00', NULL, NULL, NULL, false, NULL, true, true, 1, true, NULL, '{"original_name": "Testing", "template_item_type": "folder", "created_from_template": true}', '["testing"]', false, NULL, '{}', 0, 0, NULL);
INSERT INTO public.documents VALUES (430, '63e73058-f968-4404-8a6d-6e97ba21e5b2', 'ppt', 'Stakeholder presentations', 'folder', NULL, NULL, NULL, 0, NULL, NULL, 'local', 'aes-256-gcm', NULL, NULL, NULL, true, 427, NULL, 0, 3, 3, 3, 'active', 'private', '2025-07-29 16:00:14.173308+00', '2025-07-29 16:36:25.579922+00', NULL, NULL, NULL, false, NULL, true, true, 1, true, NULL, '{"original_name": "Presentations", "template_item_type": "folder", "created_from_template": true}', '["presentations"]', false, NULL, '{}', 0, 0, NULL);
INSERT INTO public.documents VALUES (455, '56f3bda7-c6c6-43cc-b47b-715cb6f9d4ad', 'Data Movement to Data Warehouse.docx', '', 'document', 'application/vnd.openxmlformats-officedocument.wordprocessingml.document', NULL, '.docx', 33131, NULL, '/app/encrypted-files/14/14/14_5782473202269471426.enc', 'local', 'AES-GCM', NULL, '\xb708208a4795ff431fbb4f57', NULL, true, NULL, NULL, 0, 14, 14, NULL, 'active', 'private', '2025-08-01 15:19:26.199227+00', '2025-08-01 15:19:26.199227+00', NULL, NULL, NULL, false, NULL, true, true, 1, true, NULL, '{}', '[]', true, NULL, '{}', 0, 0, '{"dekId":"dek:mdsyyuhj_E3od8lqrpNc","encryptedDek":"skH15oiw4s2UNYqdozbizScyVEU40boQPDgRTNWdnYc=","dekIv":"twggikeV/0Mfu09X","dekAuthTag":"2GzBkqu09IWdnZowQUa8Kw==","algorithm":"AES-GCM","keyLength":32,"version":1,"createdAt":"2025-08-01T15:19:26.167Z"}');
INSERT INTO public.documents VALUES (469, '03781d10-5bf2-45b2-81e9-1549dcc95031', 'Test Cases', 'Individual test cases', 'folder', NULL, NULL, NULL, 0, NULL, NULL, 'local', 'aes-256-gcm', NULL, NULL, NULL, true, 467, NULL, 0, 14, 14, NULL, 'active', 'private', '2025-08-01 15:21:09.962065+00', '2025-08-01 15:21:09.962065+00', NULL, NULL, NULL, false, NULL, true, true, 1, true, NULL, '{"original_name": "Test Cases", "template_item_type": "folder", "created_from_template": true}', '["test-cases"]', false, NULL, '{}', 0, 0, NULL);
INSERT INTO public.documents VALUES (477, 'c325785e-7db2-4d60-a3cd-86ec6d5cbd38', 'User Documentation', 'End-user guides and manuals', 'folder', NULL, NULL, NULL, 0, NULL, NULL, 'local', 'aes-256-gcm', NULL, NULL, NULL, true, 476, NULL, 0, 14, 14, NULL, 'active', 'private', '2025-08-01 15:21:09.97725+00', '2025-08-01 15:21:09.97725+00', NULL, NULL, NULL, false, NULL, true, true, 1, true, NULL, '{"original_name": "User Documentation", "template_item_type": "folder", "created_from_template": true}', '["user-docs"]', false, NULL, '{}', 0, 0, NULL);
INSERT INTO public.documents VALUES (456, '4a5745c8-cbba-42a0-9742-065cb4c35c24', 'Pathiram', NULL, 'folder', NULL, NULL, NULL, 0, NULL, NULL, 'local', 'aes-256-gcm', NULL, NULL, NULL, true, NULL, '', 0, 14, 14, NULL, 'active', 'private', '2025-08-01 15:20:52.299238+00', '2025-08-01 15:21:25.07009+00', '2025-08-01 15:21:25.07009+00', NULL, NULL, false, NULL, true, true, 1, true, NULL, '{"template_id": "software_development", "template_name": "Software Development Project", "template_version": 1, "template_applied_at": "2025-08-01T15:21:09.914532", "created_from_template": true}', '["software", "development", "project"]', false, NULL, '{}', 0, 0, NULL);
INSERT INTO public.documents VALUES (197, '08f4c308-086e-4460-958e-d85c7e7285cd', 'natchez 022.jpg', '', 'document', 'image/jpeg', NULL, '.jpg', 1083224, 'f515b29f0481bb60c173728150a4cb787d891f5b9b4cfa23cfeb9bf424f1b944', '/app/encrypted-files/3/3_/3_3033239222948065344.enc', 'local', 'aes-256-gcm', 'key_1753714735024_mfi3xl2he', '\x16cf372a3e9dd5c79b5d928f', '\xea8604e5e89c101db0342d7e548bc3e4', true, 183, NULL, 0, 3, 3, NULL, 'active', 'private', '2025-07-28 14:59:01.516543+00', '2025-07-28 14:59:01.516543+00', NULL, NULL, NULL, false, NULL, true, true, 1, true, NULL, '{"encryption_salt": "BPhYO0PpGc91CHkuKPaPfCiD+Rk44c6xQNW0hZFtGus=", "encryption_algorithm": "AES-256-GCM", "encryption_iterations": 100000}', '[]', true, NULL, '{}', 0, 0, NULL);
INSERT INTO public.documents VALUES (421, 'ddf0eda8-55c7-4479-90ac-2fffedfadc94', 'Requirements', 'Business requirements and specifications', 'folder', NULL, NULL, NULL, 0, NULL, NULL, 'local', 'aes-256-gcm', NULL, NULL, NULL, true, 420, NULL, 0, 3, 3, NULL, 'active', 'private', '2025-07-29 16:00:14.139954+00', '2025-07-29 16:00:14.139954+00', NULL, NULL, NULL, false, NULL, true, true, 1, true, NULL, '{"original_name": "Requirements", "template_item_type": "folder", "created_from_template": true}', '["requirements"]', false, NULL, '{}', 0, 0, NULL);
INSERT INTO public.documents VALUES (426, 'ac9dac32-fa4c-4c2b-a9c5-deaa7611fca6', 'Documentation', 'Technical documentation', 'folder', NULL, NULL, NULL, 0, NULL, NULL, 'local', 'aes-256-gcm', NULL, NULL, NULL, true, 422, NULL, 0, 3, 3, NULL, 'active', 'private', '2025-07-29 16:00:14.161059+00', '2025-07-29 16:00:14.161059+00', NULL, NULL, NULL, false, NULL, true, true, 1, true, NULL, '{"original_name": "Documentation", "template_item_type": "folder", "created_from_template": true}', '["documentation"]', false, NULL, '{}', 0, 0, NULL);
INSERT INTO public.documents VALUES (202, 'f169a0a3-7d3f-4a60-a609-55db1d8ce4c9', 'natchez 009.jpg', '', 'document', 'image/jpeg', NULL, '.jpg', 1561076, 'cae474b736dd823a573f19fcb047115cd004146907293d9340eafa323f0fd11a', '/app/encrypted-files/3/3_/3_-8366959340157063287.enc', 'local', 'aes-256-gcm', 'key_1753714735024_mfi3xl2he', '\x786a5505477159a370db7602', '\x9141d8b219503c3eb2d53281b1195213', true, 183, NULL, 0, 3, 3, NULL, 'active', 'private', '2025-07-28 14:59:02.06774+00', '2025-07-28 19:44:50.476269+00', NULL, NULL, NULL, false, NULL, true, true, 1, true, NULL, '{"encryption_salt": "BPhYO0PpGc91CHkuKPaPfCiD+Rk44c6xQNW0hZFtGus=", "encryption_algorithm": "AES-256-GCM", "encryption_iterations": 100000}', '[]', true, NULL, '{}', 0, 0, NULL);
INSERT INTO public.documents VALUES (432, '2f0e06bb-25e8-48a6-9463-f4540d86e57f', 'Final Deliverables', 'Final project outputs', 'folder', NULL, NULL, NULL, 0, NULL, NULL, 'local', 'aes-256-gcm', NULL, NULL, NULL, true, 431, NULL, 0, 3, 3, NULL, 'active', 'private', '2025-07-29 16:00:14.178939+00', '2025-07-29 16:00:14.178939+00', NULL, NULL, NULL, false, NULL, true, true, 1, true, NULL, '{"original_name": "Final Deliverables", "template_item_type": "folder", "created_from_template": true}', '["deliverables", "final"]', false, NULL, '{}', 0, 0, NULL);
INSERT INTO public.documents VALUES (457, 'cac31ff2-cd36-4729-bc96-e3a4d5ca88e5', '01_Requirements', 'Project requirements and specifications', 'folder', NULL, NULL, NULL, 0, NULL, NULL, 'local', 'aes-256-gcm', NULL, NULL, NULL, true, 456, NULL, 0, 14, 14, NULL, 'active', 'private', '2025-08-01 15:21:09.920363+00', '2025-08-01 15:21:09.920363+00', NULL, NULL, NULL, false, NULL, true, true, 1, true, NULL, '{"original_name": "01_Requirements", "template_item_type": "folder", "created_from_template": true}', '["requirements", "planning"]', false, NULL, '{}', 0, 0, NULL);
INSERT INTO public.documents VALUES (464, '5b3df584-f22b-464d-800b-24706a833d1c', 'Code Reviews', 'Code review documentation', 'folder', NULL, NULL, NULL, 0, NULL, NULL, 'local', 'aes-256-gcm', NULL, NULL, NULL, true, 463, NULL, 0, 14, 14, NULL, 'active', 'private', '2025-08-01 15:21:09.952004+00', '2025-08-01 15:21:09.952004+00', NULL, NULL, NULL, false, NULL, true, true, 1, true, NULL, '{"original_name": "Code Reviews", "template_item_type": "folder", "created_from_template": true}', '["code-review"]', false, NULL, '{}', 0, 0, NULL);
INSERT INTO public.documents VALUES (472, '9f895b9a-99e6-45dd-8c6c-e90dc9d68805', '05_Deployment', 'Deployment and operations documentation', 'folder', NULL, NULL, NULL, 0, NULL, NULL, 'local', 'aes-256-gcm', NULL, NULL, NULL, true, 456, NULL, 0, 14, 14, NULL, 'active', 'private', '2025-08-01 15:21:09.967831+00', '2025-08-01 15:21:09.967831+00', NULL, NULL, NULL, false, NULL, true, true, 1, true, NULL, '{"original_name": "05_Deployment", "template_item_type": "folder", "created_from_template": true}', '["deployment", "devops"]', false, NULL, '{}', 0, 0, NULL);
INSERT INTO public.documents VALUES (198, 'ac514e70-5628-4708-8629-405d9ed23972', 'natchez 019.jpg', '', 'document', 'image/jpeg', NULL, '.jpg', 1643452, 'e751e0bc2e13aa3dce5d1078515cc42585bd3e80c6a72411029df68a6f41a71d', '/app/encrypted-files/3/3_/3_1878982299882966199.enc', 'local', 'aes-256-gcm', 'key_1753714735024_mfi3xl2he', '\x91e72ca32a472983cab627ad', '\x59691fba7dc0f3bdd7bbf7b10a430ea6', true, 183, NULL, 0, 3, 3, NULL, 'active', 'private', '2025-07-28 14:59:01.539322+00', '2025-07-28 14:59:01.539322+00', NULL, NULL, NULL, false, NULL, true, true, 1, true, NULL, '{"encryption_salt": "BPhYO0PpGc91CHkuKPaPfCiD+Rk44c6xQNW0hZFtGus=", "encryption_algorithm": "AES-256-GCM", "encryption_iterations": 100000}', '[]', true, NULL, '{}', 0, 0, NULL);
INSERT INTO public.documents VALUES (200, 'f6da441e-ceb1-4255-a19b-e202e83ff2f4', 'natchez 020.jpg', '', 'document', 'image/jpeg', NULL, '.jpg', 1584565, '96db77e668168626810c8793055048f27479fb4fbb002c02e2a0b56009e953a0', '/app/encrypted-files/3/3_/3_-6495061785041145375.enc', 'local', 'aes-256-gcm', 'key_1753714735024_mfi3xl2he', '\x5091c9360ca8bad9babd60dd', '\xfd080ed6415a541e807d09e2279b57c2', true, 183, NULL, 0, 3, 3, NULL, 'active', 'private', '2025-07-28 14:59:02.029638+00', '2025-07-28 14:59:02.029638+00', NULL, NULL, NULL, false, NULL, true, true, 1, true, NULL, '{"encryption_salt": "BPhYO0PpGc91CHkuKPaPfCiD+Rk44c6xQNW0hZFtGus=", "encryption_algorithm": "AES-256-GCM", "encryption_iterations": 100000}', '[]', true, NULL, '{}', 0, 0, NULL);
INSERT INTO public.documents VALUES (422, '576f603b-5e8f-4bdb-94c3-e068d0ac4c22', '02_Execution', 'Project execution and development materials', 'folder', NULL, NULL, NULL, 0, NULL, NULL, 'local', 'aes-256-gcm', NULL, NULL, NULL, true, 419, NULL, 0, 3, 3, NULL, 'active', 'private', '2025-07-29 16:00:14.143669+00', '2025-07-29 16:00:14.143669+00', NULL, NULL, NULL, false, NULL, true, true, 1, true, NULL, '{"original_name": "02_Execution", "template_item_type": "folder", "created_from_template": true}', '["execution", "development"]', false, NULL, '{}', 0, 0, NULL);
INSERT INTO public.documents VALUES (427, 'f9e468be-b1d7-4016-a8d5-00ecc96c0300', '03_Communication', 'Project communication and stakeholder updates', 'folder', NULL, NULL, NULL, 0, NULL, NULL, 'local', 'aes-256-gcm', NULL, NULL, NULL, true, 419, NULL, 0, 3, 3, NULL, 'active', 'private', '2025-07-29 16:00:14.165048+00', '2025-07-29 16:00:14.165048+00', NULL, NULL, NULL, false, NULL, true, true, 1, true, NULL, '{"original_name": "03_Communication", "template_item_type": "folder", "created_from_template": true}', '["communication", "stakeholders"]', false, NULL, '{}', 0, 0, NULL);
INSERT INTO public.documents VALUES (433, 'ef46666c-3a61-4758-aa4c-5275bc055109', 'Handover', 'Project handover materials', 'folder', NULL, NULL, NULL, 0, NULL, NULL, 'local', 'aes-256-gcm', NULL, NULL, NULL, true, 431, NULL, 0, 3, 3, NULL, 'active', 'private', '2025-07-29 16:00:14.181118+00', '2025-07-29 16:00:14.181118+00', NULL, NULL, NULL, false, NULL, true, true, 1, true, NULL, '{"original_name": "Handover", "template_item_type": "folder", "created_from_template": true}', '["handover"]', false, NULL, '{}', 0, 0, NULL);
INSERT INTO public.documents VALUES (458, '13430b5f-0f1a-454a-8f47-183bf002b478', 'User Stories', 'User stories and epics', 'folder', NULL, NULL, NULL, 0, NULL, NULL, 'local', 'aes-256-gcm', NULL, NULL, NULL, true, 457, NULL, 0, 14, 14, NULL, 'active', 'private', '2025-08-01 15:21:09.926887+00', '2025-08-01 15:21:09.926887+00', NULL, NULL, NULL, false, NULL, true, true, 1, true, NULL, '{"original_name": "User Stories", "template_item_type": "folder", "created_from_template": true}', '["user-stories"]', false, NULL, '{}', 0, 0, NULL);
INSERT INTO public.documents VALUES (465, 'af32fb16-aec9-4c02-903a-720b0b2553a0', 'Development Notes', 'Development notes and decisions', 'folder', NULL, NULL, NULL, 0, NULL, NULL, 'local', 'aes-256-gcm', NULL, NULL, NULL, true, 463, NULL, 0, 14, 14, NULL, 'active', 'private', '2025-08-01 15:21:09.953975+00', '2025-08-01 15:21:09.953975+00', NULL, NULL, NULL, false, NULL, true, true, 1, true, NULL, '{"original_name": "Development Notes", "template_item_type": "folder", "created_from_template": true}', '["notes"]', false, NULL, '{}', 0, 0, NULL);
INSERT INTO public.documents VALUES (473, 'e7dbfbc0-84d3-4b0c-a6bf-82fca798852f', 'Deployment Scripts', 'Deployment automation scripts', 'folder', NULL, NULL, NULL, 0, NULL, NULL, 'local', 'aes-256-gcm', NULL, NULL, NULL, true, 472, NULL, 0, 14, 14, NULL, 'active', 'private', '2025-08-01 15:21:09.969962+00', '2025-08-01 15:21:09.969962+00', NULL, NULL, NULL, false, NULL, true, true, 1, true, NULL, '{"original_name": "Deployment Scripts", "template_item_type": "folder", "created_from_template": true}', '["deployment", "scripts"]', false, NULL, '{}', 0, 0, NULL);
INSERT INTO public.documents VALUES (424, 'e64c4f2f-beee-40b3-aac2-debac35e5f06', 'Development', 'Development artifacts', 'folder', NULL, NULL, NULL, 0, NULL, NULL, 'local', 'aes-256-gcm', NULL, NULL, NULL, true, 422, NULL, 0, 3, 3, NULL, 'active', 'private', '2025-07-29 16:00:14.152984+00', '2025-07-29 16:00:14.152984+00', NULL, NULL, NULL, false, NULL, true, true, 1, true, NULL, '{"original_name": "Development", "template_item_type": "folder", "created_from_template": true}', '["development"]', false, NULL, '{}', 0, 0, NULL);
INSERT INTO public.documents VALUES (429, '2f5ff272-4c0e-419b-9013-38584f5ee511', 'Status Reports', 'Regular status updates', 'folder', NULL, NULL, NULL, 0, NULL, NULL, 'local', 'aes-256-gcm', NULL, NULL, NULL, true, 427, NULL, 0, 3, 3, NULL, 'active', 'private', '2025-07-29 16:00:14.170424+00', '2025-07-29 16:00:14.170424+00', NULL, NULL, NULL, false, NULL, true, true, 1, true, NULL, '{"original_name": "Status Reports", "template_item_type": "folder", "created_from_template": true}', '["status", "reports"]', false, NULL, '{}', 0, 0, NULL);
INSERT INTO public.documents VALUES (199, '7f0f7350-df8d-444a-b786-495a94a07d0b', 'natchez 008.jpg', '', 'document', 'image/jpeg', NULL, '.jpg', 1305509, '156e3909286650a556803162fed3748185a12d9fdf341f6ebaafa37e1904aa96', '/app/encrypted-files/3/3_/3_555831136507900770.enc', 'local', 'aes-256-gcm', 'key_1753714735024_mfi3xl2he', '\xd0792cb71570c439dc92d5e7', '\x83a5f8fc7aaf63ac0cc016491c8368b0', true, 183, NULL, 0, 3, 3, NULL, 'active', 'private', '2025-07-28 14:59:02.005539+00', '2025-07-28 19:44:50.476269+00', NULL, NULL, NULL, false, NULL, true, true, 1, true, NULL, '{"encryption_salt": "BPhYO0PpGc91CHkuKPaPfCiD+Rk44c6xQNW0hZFtGus=", "encryption_algorithm": "AES-256-GCM", "encryption_iterations": 100000}', '[]', true, NULL, '{}', 0, 0, NULL);
INSERT INTO public.documents VALUES (466, 'd8e61dfa-76c7-4511-975b-4d8d9f86fdb2', 'Configuration', 'Configuration files and environment setup', 'folder', NULL, NULL, NULL, 0, NULL, NULL, 'local', 'aes-256-gcm', NULL, NULL, NULL, true, 463, NULL, 0, 14, 14, NULL, 'active', 'private', '2025-08-01 15:21:09.956138+00', '2025-08-01 15:21:09.956138+00', NULL, NULL, NULL, false, NULL, true, true, 1, true, NULL, '{"original_name": "Configuration", "template_item_type": "folder", "created_from_template": true}', '["configuration"]', false, NULL, '{}', 0, 0, NULL);
INSERT INTO public.documents VALUES (474, 'af42accf-7b39-4e17-b1e0-de1d784bbc61', 'Infrastructure', 'Infrastructure as code', 'folder', NULL, NULL, NULL, 0, NULL, NULL, 'local', 'aes-256-gcm', NULL, NULL, NULL, true, 472, NULL, 0, 14, 14, NULL, 'active', 'private', '2025-08-01 15:21:09.9714+00', '2025-08-01 15:21:09.9714+00', NULL, NULL, NULL, false, NULL, true, true, 1, true, NULL, '{"original_name": "Infrastructure", "template_item_type": "folder", "created_from_template": true}', '["infrastructure"]', false, NULL, '{}', 0, 0, NULL);
INSERT INTO public.documents VALUES (459, 'e9590f19-fca5-4547-9b0e-270e097de6ed', '02_Architecture', 'System architecture and design documents', 'folder', NULL, NULL, NULL, 0, NULL, NULL, 'local', 'aes-256-gcm', NULL, NULL, NULL, true, 456, NULL, 0, 14, 14, NULL, 'active', 'private', '2025-08-01 15:21:09.931662+00', '2025-08-01 15:21:19.81157+00', '2025-08-01 15:21:19.81157+00', NULL, NULL, false, NULL, true, true, 1, true, NULL, '{"original_name": "02_Architecture", "template_item_type": "folder", "created_from_template": true}', '["architecture", "design"]', false, NULL, '{}', 0, 0, NULL);


--
-- TOC entry 3977 (class 0 OID 25077)
-- Dependencies: 259
-- Data for Name: encryption_audit_logs; Type: TABLE DATA; Schema: public; Owner: securevault_user
--

INSERT INTO public.encryption_audit_logs VALUES (1, 3, 'key_3_3ebcccac42e5e0e292a1f4157d15c07c', 'create_key', '9560d62d-410c-45f8-b991-17ee084ab469', NULL, NULL, NULL, true, NULL, NULL, '{"algorithm": "AES-256-GCM", "derivation_method": "PBKDF2-SHA256", "iterations": 500000, "replaced_existing": false}', NULL, '2025-07-26 14:09:40.266502+00', NULL);
INSERT INTO public.encryption_audit_logs VALUES (2, 3, NULL, 'derive_key', '029539aa-6e2e-4e54-b049-efa92d0ece82', NULL, NULL, NULL, true, NULL, NULL, '{"iterations": 100000, "salt_length": 32}', NULL, '2025-07-27 20:44:54.661264+00', NULL);
INSERT INTO public.encryption_audit_logs VALUES (3, 3, NULL, 'derive_key', '20c9c97e-e98f-43d6-b8f4-c38fc2d6a230', NULL, NULL, NULL, true, NULL, NULL, '{"iterations": 100000, "salt_length": 32}', NULL, '2025-07-27 22:11:01.328221+00', NULL);
INSERT INTO public.encryption_audit_logs VALUES (4, 3, NULL, 'derive_key', '1f7250b1-0ee9-4db1-b27c-f351ee595d6b', NULL, NULL, NULL, true, NULL, NULL, '{"iterations": 100000, "salt_length": 32}', NULL, '2025-07-27 22:11:05.817947+00', NULL);
INSERT INTO public.encryption_audit_logs VALUES (5, 3, NULL, 'derive_key', 'b332c94d-1fbc-43a6-9fd8-6447c46f7d2a', NULL, NULL, NULL, true, NULL, NULL, '{"iterations": 100000, "salt_length": 32}', NULL, '2025-07-27 22:11:50.330142+00', NULL);
INSERT INTO public.encryption_audit_logs VALUES (6, 3, NULL, 'derive_key', '6b06802e-a833-42a4-b195-cd7204fe44c2', NULL, NULL, NULL, true, NULL, NULL, '{"iterations": 100000, "salt_length": 32}', NULL, '2025-07-27 22:36:36.615779+00', NULL);
INSERT INTO public.encryption_audit_logs VALUES (7, 3, NULL, 'derive_key', 'd57f738d-c03e-433b-9e6d-97039bdfcee2', NULL, NULL, NULL, true, NULL, NULL, '{"iterations": 100000, "salt_length": 32}', NULL, '2025-07-27 22:46:20.386429+00', NULL);
INSERT INTO public.encryption_audit_logs VALUES (8, 3, NULL, 'derive_key', '7a7ba931-acef-40ea-a3d9-46a3f25428b7', NULL, NULL, NULL, true, NULL, NULL, '{"iterations": 100000, "salt_length": 32}', NULL, '2025-07-27 22:51:35.080698+00', NULL);
INSERT INTO public.encryption_audit_logs VALUES (9, 3, NULL, 'derive_key', '820bed8a-5263-4b75-806b-c9c4d1210f56', NULL, NULL, NULL, true, NULL, NULL, '{"iterations": 100000, "salt_length": 32}', NULL, '2025-07-27 23:14:38.285365+00', NULL);
INSERT INTO public.encryption_audit_logs VALUES (10, 3, NULL, 'derive_key', '0d9cc318-1361-4dcb-b7ce-3222c29b06fb', NULL, NULL, NULL, true, NULL, NULL, '{"iterations": 100000, "salt_length": 32}', NULL, '2025-07-28 00:00:31.571744+00', NULL);
INSERT INTO public.encryption_audit_logs VALUES (11, 3, NULL, 'derive_key', '20278ab4-1ad3-485c-a5f2-5a4c094104e3', NULL, NULL, NULL, true, NULL, NULL, '{"iterations": 100000, "salt_length": 32}', NULL, '2025-07-28 00:01:12.699244+00', NULL);
INSERT INTO public.encryption_audit_logs VALUES (12, 3, NULL, 'derive_key', '360d252c-ea89-4c04-9d77-cbd92f84a31d', NULL, NULL, NULL, true, NULL, NULL, '{"iterations": 100000, "salt_length": 32}', NULL, '2025-07-28 00:10:26.865391+00', NULL);
INSERT INTO public.encryption_audit_logs VALUES (13, 3, NULL, 'derive_key', 'd7be9b78-de38-4118-ab67-99a6840b0ba6', NULL, NULL, NULL, true, NULL, NULL, '{"iterations": 100000, "salt_length": 32}', NULL, '2025-07-28 00:31:32.506285+00', NULL);
INSERT INTO public.encryption_audit_logs VALUES (14, 3, NULL, 'derive_key', '9b4ff265-e518-4298-b38a-a482ad37e791', NULL, NULL, NULL, true, NULL, NULL, '{"iterations": 100000, "salt_length": 32}', NULL, '2025-07-28 00:32:04.415248+00', NULL);
INSERT INTO public.encryption_audit_logs VALUES (15, 3, NULL, 'derive_key', '5a1a4eaf-48fb-4eff-9dfb-ee6c25cd8cfd', NULL, NULL, NULL, true, NULL, NULL, '{"iterations": 100000, "salt_length": 32}', NULL, '2025-07-28 00:32:24.529558+00', NULL);
INSERT INTO public.encryption_audit_logs VALUES (16, 3, NULL, 'derive_key', '7f703fd3-cd3f-4cdb-959a-ef1a168905ca', NULL, NULL, NULL, true, NULL, NULL, '{"iterations": 100000, "salt_length": 32}', NULL, '2025-07-28 00:36:05.419452+00', NULL);
INSERT INTO public.encryption_audit_logs VALUES (17, 3, NULL, 'derive_key', '4ec5719c-af26-4754-aa7c-3986f8fa960f', NULL, NULL, NULL, true, NULL, NULL, '{"iterations": 100000, "salt_length": 32}', NULL, '2025-07-28 00:37:31.997927+00', NULL);
INSERT INTO public.encryption_audit_logs VALUES (18, 3, NULL, 'derive_key', '12e6809f-1202-49a8-8fe0-25f84eb40ff6', NULL, NULL, NULL, true, NULL, NULL, '{"iterations": 100000, "salt_length": 32}', NULL, '2025-07-28 12:16:03.162069+00', NULL);
INSERT INTO public.encryption_audit_logs VALUES (19, 3, NULL, 'derive_key', '93967c23-a680-496f-b4db-150ed37d63f5', NULL, NULL, NULL, true, NULL, NULL, '{"iterations": 100000, "salt_length": 32}', NULL, '2025-07-28 13:37:53.769066+00', NULL);
INSERT INTO public.encryption_audit_logs VALUES (20, 3, NULL, 'derive_key', '3bbe519d-b5b8-47aa-80e3-03e73224ac13', NULL, NULL, NULL, true, NULL, NULL, '{"iterations": 100000, "salt_length": 32}', NULL, '2025-07-28 13:44:16.553035+00', NULL);
INSERT INTO public.encryption_audit_logs VALUES (21, 3, NULL, 'derive_key', '15babb53-5e8b-4f18-a666-c91e17cab5bf', NULL, NULL, NULL, true, NULL, NULL, '{"iterations": 100000, "salt_length": 32}', NULL, '2025-07-28 13:49:55.454174+00', NULL);
INSERT INTO public.encryption_audit_logs VALUES (22, 3, NULL, 'derive_key', 'e941bc6c-c5c8-48ab-9af3-369ab719f58f', NULL, NULL, NULL, true, NULL, NULL, '{"iterations": 100000, "salt_length": 32}', NULL, '2025-07-28 13:55:04.022994+00', NULL);
INSERT INTO public.encryption_audit_logs VALUES (23, 3, NULL, 'derive_key', '4601af21-389f-4232-adf2-d5e8bd116201', NULL, NULL, NULL, true, NULL, NULL, '{"iterations": 100000, "salt_length": 32}', NULL, '2025-07-28 13:58:10.931455+00', NULL);
INSERT INTO public.encryption_audit_logs VALUES (24, 3, NULL, 'derive_key', '261516e8-e636-46d2-ad07-068651aba90e', NULL, NULL, NULL, true, NULL, NULL, '{"iterations": 100000, "salt_length": 32}', NULL, '2025-07-28 14:00:51.263714+00', NULL);
INSERT INTO public.encryption_audit_logs VALUES (25, 3, NULL, 'derive_key', '732dbd66-3c2c-4c33-b11d-de1c47319c09', NULL, NULL, NULL, true, NULL, NULL, '{"iterations": 100000, "salt_length": 32}', NULL, '2025-07-28 14:01:46.981267+00', NULL);
INSERT INTO public.encryption_audit_logs VALUES (26, 3, NULL, 'derive_key', '484d6ce6-ec37-4733-9e07-e113ed4d891d', NULL, NULL, NULL, true, NULL, NULL, '{"iterations": 100000, "salt_length": 32}', NULL, '2025-07-28 14:06:12.400182+00', NULL);
INSERT INTO public.encryption_audit_logs VALUES (27, 3, NULL, 'derive_key', '69b0fe09-1fd0-4c82-afbd-b0a317436428', NULL, NULL, NULL, true, NULL, NULL, '{"iterations": 100000, "salt_length": 32}', NULL, '2025-07-28 14:10:28.108861+00', NULL);
INSERT INTO public.encryption_audit_logs VALUES (28, 3, NULL, 'derive_key', '8af5cf55-0e5d-46b2-a501-d7c3ec82dc87', NULL, NULL, NULL, true, NULL, NULL, '{"iterations": 100000, "salt_length": 32}', NULL, '2025-07-28 14:12:44.319261+00', NULL);
INSERT INTO public.encryption_audit_logs VALUES (29, 3, NULL, 'derive_key', '06bcd689-82dd-4533-9009-3baf27529214', NULL, NULL, NULL, true, NULL, NULL, '{"iterations": 100000, "salt_length": 32}', NULL, '2025-07-28 14:50:49.261337+00', NULL);
INSERT INTO public.encryption_audit_logs VALUES (30, 3, NULL, 'derive_key', '223f3075-2571-4efc-8195-a373009c167a', NULL, NULL, NULL, true, NULL, NULL, '{"iterations": 100000, "salt_length": 32}', NULL, '2025-07-28 14:52:35.74432+00', NULL);
INSERT INTO public.encryption_audit_logs VALUES (31, 3, NULL, 'derive_key', '5049a354-65f8-4d98-b73b-e620f23e4da4', NULL, NULL, NULL, true, NULL, NULL, '{"iterations": 100000, "salt_length": 32}', NULL, '2025-07-28 14:58:54.998318+00', NULL);
INSERT INTO public.encryption_audit_logs VALUES (32, 3, NULL, 'derive_key', '6f7a8721-16a9-41c4-a4a0-b60c473ad1d5', NULL, NULL, NULL, true, NULL, NULL, '{"iterations": 100000, "salt_length": 32}', NULL, '2025-07-28 21:13:50.265092+00', NULL);
INSERT INTO public.encryption_audit_logs VALUES (33, 3, NULL, 'derive_key', 'b4ddbe57-c7cd-4f5f-915a-95e28e24d6b9', NULL, NULL, NULL, true, NULL, NULL, '{"iterations": 100000, "salt_length": 32}', NULL, '2025-07-30 16:22:44.877146+00', NULL);
INSERT INTO public.encryption_audit_logs VALUES (34, 3, NULL, 'derive_key', '1e23529d-2d5c-4a11-a153-92c162e22f8a', NULL, NULL, NULL, true, NULL, NULL, '{"iterations": 100000, "salt_length": 32}', NULL, '2025-07-30 17:53:21.797783+00', NULL);
INSERT INTO public.encryption_audit_logs VALUES (35, 14, NULL, 'derive_key', 'fb3368b3-0d0e-44e3-9838-2bf9ff959fe8', NULL, NULL, NULL, true, NULL, NULL, '{"iterations": 100000, "salt_length": 32}', NULL, '2025-08-01 00:16:48.651141+00', NULL);
INSERT INTO public.encryption_audit_logs VALUES (36, 14, NULL, 'derive_key', 'c77c52f7-b20f-495a-b7ab-45020952e2cd', NULL, NULL, NULL, true, NULL, NULL, '{"iterations": 100000, "salt_length": 32}', NULL, '2025-08-01 01:27:05.038042+00', NULL);
INSERT INTO public.encryption_audit_logs VALUES (37, 14, NULL, 'derive_key', '22bf7db5-f690-4115-96ba-ab822cbabb62', NULL, NULL, NULL, true, NULL, NULL, '{"iterations": 100000, "salt_length": 32}', NULL, '2025-08-01 03:14:56.871426+00', NULL);
INSERT INTO public.encryption_audit_logs VALUES (38, 14, NULL, 'derive_key', 'a4a29780-c6e3-4f4d-bd55-72194f440c7f', NULL, NULL, NULL, true, NULL, NULL, '{"iterations": 100000, "salt_length": 32}', NULL, '2025-08-01 13:33:14.999335+00', NULL);
INSERT INTO public.encryption_audit_logs VALUES (39, 14, NULL, 'derive_key', '32170d3f-ef24-461b-afd9-1447b60fe04e', NULL, NULL, NULL, true, NULL, NULL, '{"iterations": 100000, "salt_length": 32}', NULL, '2025-08-01 13:40:47.355384+00', NULL);


--
-- TOC entry 3989 (class 0 OID 25269)
-- Dependencies: 271
-- Data for Name: ip_blocklist; Type: TABLE DATA; Schema: public; Owner: securevault_user
--



--
-- TOC entry 3975 (class 0 OID 25033)
-- Dependencies: 257
-- Data for Name: key_escrow; Type: TABLE DATA; Schema: public; Owner: securevault_user
--



--
-- TOC entry 3971 (class 0 OID 24995)
-- Dependencies: 253
-- Data for Name: key_rotation_logs; Type: TABLE DATA; Schema: public; Owner: securevault_user
--



--
-- TOC entry 3969 (class 0 OID 24975)
-- Dependencies: 251
-- Data for Name: master_keys; Type: TABLE DATA; Schema: public; Owner: securevault_user
--



--
-- TOC entry 3940 (class 0 OID 16469)
-- Dependencies: 222
-- Data for Name: mfa_audit_logs; Type: TABLE DATA; Schema: public; Owner: securevault_user
--

INSERT INTO public.mfa_audit_logs VALUES (1, 3, 'setup', 'success', '{"issuer": "SecureVault"}', NULL, NULL, NULL, NULL, '2025-07-26 01:26:57.267186');
INSERT INTO public.mfa_audit_logs VALUES (2, 3, 'setup', 'success', '{"issuer": "SecureVault"}', NULL, NULL, NULL, NULL, '2025-07-26 01:30:23.362187');
INSERT INTO public.mfa_audit_logs VALUES (3, 3, 'totp_verify', 'success', NULL, NULL, NULL, NULL, NULL, '2025-07-26 01:30:40.821403');
INSERT INTO public.mfa_audit_logs VALUES (4, 3, 'enable', 'success', NULL, NULL, NULL, NULL, NULL, '2025-07-26 01:30:40.828048');
INSERT INTO public.mfa_audit_logs VALUES (5, 3, 'setup', 'success', '{"issuer": "SecureVault"}', NULL, NULL, NULL, NULL, '2025-07-26 02:47:56.235869');
INSERT INTO public.mfa_audit_logs VALUES (6, 3, 'totp_verify', 'success', NULL, NULL, NULL, NULL, NULL, '2025-07-26 02:48:18.996203');
INSERT INTO public.mfa_audit_logs VALUES (7, 3, 'enable', 'success', NULL, NULL, NULL, NULL, NULL, '2025-07-26 02:48:19.000071');
INSERT INTO public.mfa_audit_logs VALUES (8, 3, 'setup', 'success', '{"issuer": "SecureVault"}', NULL, NULL, NULL, NULL, '2025-07-26 02:59:25.191838');
INSERT INTO public.mfa_audit_logs VALUES (9, 3, 'totp_verify', 'success', NULL, NULL, NULL, NULL, NULL, '2025-07-26 02:59:42.798903');
INSERT INTO public.mfa_audit_logs VALUES (10, 3, 'enable', 'success', NULL, NULL, NULL, NULL, NULL, '2025-07-26 02:59:42.805649');
INSERT INTO public.mfa_audit_logs VALUES (11, 3, 'disable', 'success', '{"admin_override": false}', NULL, NULL, NULL, NULL, '2025-07-26 03:00:15.554631');
INSERT INTO public.mfa_audit_logs VALUES (12, 3, 'disable', 'success', '{"admin_override": false}', NULL, NULL, NULL, NULL, '2025-07-26 03:09:59.800053');
INSERT INTO public.mfa_audit_logs VALUES (13, 3, 'setup', 'success', '{"issuer": "SecureVault"}', NULL, NULL, NULL, NULL, '2025-07-26 03:10:09.024264');
INSERT INTO public.mfa_audit_logs VALUES (14, 3, 'totp_verify', 'success', NULL, NULL, NULL, NULL, NULL, '2025-07-26 03:10:27.996833');
INSERT INTO public.mfa_audit_logs VALUES (15, 3, 'enable', 'success', NULL, NULL, NULL, NULL, NULL, '2025-07-26 03:10:28.002959');
INSERT INTO public.mfa_audit_logs VALUES (16, 3, 'disable', 'success', '{"admin_override": false}', NULL, NULL, NULL, NULL, '2025-07-26 03:37:48.77947');
INSERT INTO public.mfa_audit_logs VALUES (17, 3, 'setup', 'success', '{"issuer": "SecureVault"}', NULL, NULL, NULL, NULL, '2025-07-26 18:21:31.397091');
INSERT INTO public.mfa_audit_logs VALUES (18, 3, 'totp_verify', 'success', NULL, NULL, NULL, NULL, NULL, '2025-07-26 18:21:55.793493');
INSERT INTO public.mfa_audit_logs VALUES (19, 3, 'enable', 'success', NULL, NULL, NULL, NULL, NULL, '2025-07-26 18:21:55.79906');
INSERT INTO public.mfa_audit_logs VALUES (20, 3, 'disable', 'success', '{"admin_override": false}', NULL, NULL, NULL, NULL, '2025-07-26 18:23:08.275894');


--
-- TOC entry 3942 (class 0 OID 16494)
-- Dependencies: 224
-- Data for Name: mfa_configuration; Type: TABLE DATA; Schema: public; Owner: securevault_user
--



--
-- TOC entry 3944 (class 0 OID 16509)
-- Dependencies: 226
-- Data for Name: mfa_failed_attempts; Type: TABLE DATA; Schema: public; Owner: securevault_user
--



--
-- TOC entry 3938 (class 0 OID 16453)
-- Dependencies: 220
-- Data for Name: mfa_used_codes; Type: TABLE DATA; Schema: public; Owner: securevault_user
--



--
-- TOC entry 3948 (class 0 OID 24650)
-- Dependencies: 230
-- Data for Name: permissions; Type: TABLE DATA; Schema: public; Owner: securevault_user
--

INSERT INTO public.permissions VALUES (1, 'documents:read', 'Read documents', 'Read documents permission for documents', 'documents', 'read', true, false, '2025-07-26 03:54:48.629486', '2025-07-26 03:54:48.629486');
INSERT INTO public.permissions VALUES (2, 'documents:create', 'Create documents', 'Create documents permission for documents', 'documents', 'create', true, false, '2025-07-26 03:54:48.629486', '2025-07-26 03:54:48.629486');
INSERT INTO public.permissions VALUES (3, 'documents:update', 'Update documents', 'Update documents permission for documents', 'documents', 'update', true, false, '2025-07-26 03:54:48.629486', '2025-07-26 03:54:48.629486');
INSERT INTO public.permissions VALUES (4, 'documents:delete', 'Delete documents', 'Delete documents permission for documents', 'documents', 'delete', true, false, '2025-07-26 03:54:48.629486', '2025-07-26 03:54:48.629486');
INSERT INTO public.permissions VALUES (5, 'documents:admin', 'Administer documents', 'Administer documents permission for documents', 'documents', 'admin', true, false, '2025-07-26 03:54:48.629486', '2025-07-26 03:54:48.629486');
INSERT INTO public.permissions VALUES (6, 'users:read', 'Read users', 'Read users permission for users', 'users', 'read', true, false, '2025-07-26 03:54:48.629486', '2025-07-26 03:54:48.629486');
INSERT INTO public.permissions VALUES (7, 'users:create', 'Create users', 'Create users permission for users', 'users', 'create', true, false, '2025-07-26 03:54:48.629486', '2025-07-26 03:54:48.629486');
INSERT INTO public.permissions VALUES (8, 'users:update', 'Update users', 'Update users permission for users', 'users', 'update', true, false, '2025-07-26 03:54:48.629486', '2025-07-26 03:54:48.629486');
INSERT INTO public.permissions VALUES (9, 'users:delete', 'Delete users', 'Delete users permission for users', 'users', 'delete', true, false, '2025-07-26 03:54:48.629486', '2025-07-26 03:54:48.629486');
INSERT INTO public.permissions VALUES (10, 'users:admin', 'Administer users', 'Administer users permission for users', 'users', 'admin', true, false, '2025-07-26 03:54:48.629486', '2025-07-26 03:54:48.629486');
INSERT INTO public.permissions VALUES (11, 'roles:read', 'Read roles', 'Read roles permission for roles', 'roles', 'read', true, false, '2025-07-26 03:54:48.629486', '2025-07-26 03:54:48.629486');
INSERT INTO public.permissions VALUES (12, 'roles:create', 'Create roles', 'Create roles permission for roles', 'roles', 'create', true, false, '2025-07-26 03:54:48.629486', '2025-07-26 03:54:48.629486');
INSERT INTO public.permissions VALUES (13, 'roles:update', 'Update roles', 'Update roles permission for roles', 'roles', 'update', true, false, '2025-07-26 03:54:48.629486', '2025-07-26 03:54:48.629486');
INSERT INTO public.permissions VALUES (14, 'roles:delete', 'Delete roles', 'Delete roles permission for roles', 'roles', 'delete', true, false, '2025-07-26 03:54:48.629486', '2025-07-26 03:54:48.629486');
INSERT INTO public.permissions VALUES (15, 'roles:admin', 'Administer roles', 'Administer roles permission for roles', 'roles', 'admin', true, false, '2025-07-26 03:54:48.629486', '2025-07-26 03:54:48.629486');
INSERT INTO public.permissions VALUES (16, 'folders:read', 'Read folders', 'Read folders permission for folders', 'folders', 'read', false, false, '2025-07-26 03:54:48.629486', '2025-07-26 03:54:48.629486');
INSERT INTO public.permissions VALUES (17, 'folders:create', 'Create folders', 'Create folders permission for folders', 'folders', 'create', false, false, '2025-07-26 03:54:48.629486', '2025-07-26 03:54:48.629486');
INSERT INTO public.permissions VALUES (18, 'folders:update', 'Update folders', 'Update folders permission for folders', 'folders', 'update', false, false, '2025-07-26 03:54:48.629486', '2025-07-26 03:54:48.629486');
INSERT INTO public.permissions VALUES (19, 'folders:delete', 'Delete folders', 'Delete folders permission for folders', 'folders', 'delete', false, false, '2025-07-26 03:54:48.629486', '2025-07-26 03:54:48.629486');
INSERT INTO public.permissions VALUES (20, 'folders:admin', 'Administer folders', 'Administer folders permission for folders', 'folders', 'admin', false, false, '2025-07-26 03:54:48.629486', '2025-07-26 03:54:48.629486');
INSERT INTO public.permissions VALUES (21, 'system:admin', 'System administration', 'System administration permission for system', 'system', 'admin', true, false, '2025-07-26 03:54:48.629486', '2025-07-26 03:54:48.629486');
INSERT INTO public.permissions VALUES (22, 'system:audit', 'System audit access', 'System audit access permission for system', 'system', 'audit', true, false, '2025-07-26 03:54:48.629486', '2025-07-26 03:54:48.629486');
INSERT INTO public.permissions VALUES (23, 'system:backup', 'System backup access', 'System backup access permission for system', 'system', 'backup', true, false, '2025-07-26 03:54:48.629486', '2025-07-26 03:54:48.629486');
INSERT INTO public.permissions VALUES (24, 'system:config', 'System configuration', 'System configuration permission for system', 'system', 'config', true, false, '2025-07-26 03:54:48.629486', '2025-07-26 03:54:48.629486');
INSERT INTO public.permissions VALUES (25, 'encryption:manage', 'Manage Encryption', 'Manage encryption keys permission', 'encryption', 'manage', true, false, '2025-07-26 14:23:15.766756', '2025-07-26 14:23:15.766756');
INSERT INTO public.permissions VALUES (26, 'encryption:admin', 'Administer Encryption', 'Administer encryption system permission', 'encryption', 'admin', true, false, '2025-07-26 14:23:15.766756', '2025-07-26 14:23:15.766756');
INSERT INTO public.permissions VALUES (27, 'encryption:create', 'Create Encryption Keys', 'Create encryption keys permission', 'encryption', 'create', true, false, '2025-07-26 14:23:15.766756', '2025-07-26 14:23:15.766756');
INSERT INTO public.permissions VALUES (28, 'encryption:read', 'Read Encryption Keys', 'Read encryption keys permission', 'encryption', 'read', true, false, '2025-07-26 14:23:15.766756', '2025-07-26 14:23:15.766756');
INSERT INTO public.permissions VALUES (29, 'encryption:update', 'Update Encryption Keys', 'Update encryption keys permission', 'encryption', 'update', true, false, '2025-07-26 14:23:15.766756', '2025-07-26 14:23:15.766756');
INSERT INTO public.permissions VALUES (30, 'encryption:delete', 'Delete Encryption Keys', 'Delete encryption keys permission', 'encryption', 'delete', true, false, '2025-07-26 14:23:15.766756', '2025-07-26 14:23:15.766756');


--
-- TOC entry 3950 (class 0 OID 24664)
-- Dependencies: 232
-- Data for Name: resource_permissions; Type: TABLE DATA; Schema: public; Owner: securevault_user
--



--
-- TOC entry 3954 (class 0 OID 24733)
-- Dependencies: 236
-- Data for Name: role_hierarchy; Type: TABLE DATA; Schema: public; Owner: securevault_user
--



--
-- TOC entry 3951 (class 0 OID 24689)
-- Dependencies: 233
-- Data for Name: role_permissions; Type: TABLE DATA; Schema: public; Owner: securevault_user
--

INSERT INTO public.role_permissions VALUES (1, 1, '2025-07-26 03:54:48.629486', NULL, NULL, NULL);
INSERT INTO public.role_permissions VALUES (1, 16, '2025-07-26 03:54:48.629486', NULL, NULL, NULL);
INSERT INTO public.role_permissions VALUES (2, 1, '2025-07-26 03:54:48.629486', NULL, NULL, NULL);
INSERT INTO public.role_permissions VALUES (2, 2, '2025-07-26 03:54:48.629486', NULL, NULL, NULL);
INSERT INTO public.role_permissions VALUES (2, 16, '2025-07-26 03:54:48.629486', NULL, NULL, NULL);
INSERT INTO public.role_permissions VALUES (2, 17, '2025-07-26 03:54:48.629486', NULL, NULL, NULL);
INSERT INTO public.role_permissions VALUES (3, 1, '2025-07-26 03:54:48.629486', NULL, NULL, NULL);
INSERT INTO public.role_permissions VALUES (3, 2, '2025-07-26 03:54:48.629486', NULL, NULL, NULL);
INSERT INTO public.role_permissions VALUES (3, 3, '2025-07-26 03:54:48.629486', NULL, NULL, NULL);
INSERT INTO public.role_permissions VALUES (3, 4, '2025-07-26 03:54:48.629486', NULL, NULL, NULL);
INSERT INTO public.role_permissions VALUES (3, 16, '2025-07-26 03:54:48.629486', NULL, NULL, NULL);
INSERT INTO public.role_permissions VALUES (3, 17, '2025-07-26 03:54:48.629486', NULL, NULL, NULL);
INSERT INTO public.role_permissions VALUES (3, 18, '2025-07-26 03:54:48.629486', NULL, NULL, NULL);
INSERT INTO public.role_permissions VALUES (3, 19, '2025-07-26 03:54:48.629486', NULL, NULL, NULL);
INSERT INTO public.role_permissions VALUES (3, 6, '2025-07-26 03:54:48.629486', NULL, NULL, NULL);
INSERT INTO public.role_permissions VALUES (4, 1, '2025-07-26 03:54:48.629486', NULL, NULL, NULL);
INSERT INTO public.role_permissions VALUES (4, 2, '2025-07-26 03:54:48.629486', NULL, NULL, NULL);
INSERT INTO public.role_permissions VALUES (4, 3, '2025-07-26 03:54:48.629486', NULL, NULL, NULL);
INSERT INTO public.role_permissions VALUES (4, 4, '2025-07-26 03:54:48.629486', NULL, NULL, NULL);
INSERT INTO public.role_permissions VALUES (4, 5, '2025-07-26 03:54:48.629486', NULL, NULL, NULL);
INSERT INTO public.role_permissions VALUES (4, 16, '2025-07-26 03:54:48.629486', NULL, NULL, NULL);
INSERT INTO public.role_permissions VALUES (4, 17, '2025-07-26 03:54:48.629486', NULL, NULL, NULL);
INSERT INTO public.role_permissions VALUES (4, 18, '2025-07-26 03:54:48.629486', NULL, NULL, NULL);
INSERT INTO public.role_permissions VALUES (4, 19, '2025-07-26 03:54:48.629486', NULL, NULL, NULL);
INSERT INTO public.role_permissions VALUES (4, 20, '2025-07-26 03:54:48.629486', NULL, NULL, NULL);
INSERT INTO public.role_permissions VALUES (4, 6, '2025-07-26 03:54:48.629486', NULL, NULL, NULL);
INSERT INTO public.role_permissions VALUES (4, 7, '2025-07-26 03:54:48.629486', NULL, NULL, NULL);
INSERT INTO public.role_permissions VALUES (4, 8, '2025-07-26 03:54:48.629486', NULL, NULL, NULL);
INSERT INTO public.role_permissions VALUES (4, 10, '2025-07-26 03:54:48.629486', NULL, NULL, NULL);
INSERT INTO public.role_permissions VALUES (4, 11, '2025-07-26 03:54:48.629486', NULL, NULL, NULL);
INSERT INTO public.role_permissions VALUES (4, 22, '2025-07-26 03:54:48.629486', NULL, NULL, NULL);
INSERT INTO public.role_permissions VALUES (4, 23, '2025-07-26 03:54:48.629486', NULL, NULL, NULL);
INSERT INTO public.role_permissions VALUES (5, 1, '2025-07-26 03:54:48.629486', NULL, NULL, NULL);
INSERT INTO public.role_permissions VALUES (5, 2, '2025-07-26 03:54:48.629486', NULL, NULL, NULL);
INSERT INTO public.role_permissions VALUES (5, 3, '2025-07-26 03:54:48.629486', NULL, NULL, NULL);
INSERT INTO public.role_permissions VALUES (5, 4, '2025-07-26 03:54:48.629486', NULL, NULL, NULL);
INSERT INTO public.role_permissions VALUES (5, 5, '2025-07-26 03:54:48.629486', NULL, NULL, NULL);
INSERT INTO public.role_permissions VALUES (5, 16, '2025-07-26 03:54:48.629486', NULL, NULL, NULL);
INSERT INTO public.role_permissions VALUES (5, 17, '2025-07-26 03:54:48.629486', NULL, NULL, NULL);
INSERT INTO public.role_permissions VALUES (5, 18, '2025-07-26 03:54:48.629486', NULL, NULL, NULL);
INSERT INTO public.role_permissions VALUES (5, 19, '2025-07-26 03:54:48.629486', NULL, NULL, NULL);
INSERT INTO public.role_permissions VALUES (5, 20, '2025-07-26 03:54:48.629486', NULL, NULL, NULL);
INSERT INTO public.role_permissions VALUES (5, 6, '2025-07-26 03:54:48.629486', NULL, NULL, NULL);
INSERT INTO public.role_permissions VALUES (5, 7, '2025-07-26 03:54:48.629486', NULL, NULL, NULL);
INSERT INTO public.role_permissions VALUES (5, 8, '2025-07-26 03:54:48.629486', NULL, NULL, NULL);
INSERT INTO public.role_permissions VALUES (5, 9, '2025-07-26 03:54:48.629486', NULL, NULL, NULL);
INSERT INTO public.role_permissions VALUES (5, 10, '2025-07-26 03:54:48.629486', NULL, NULL, NULL);
INSERT INTO public.role_permissions VALUES (5, 11, '2025-07-26 03:54:48.629486', NULL, NULL, NULL);
INSERT INTO public.role_permissions VALUES (5, 12, '2025-07-26 03:54:48.629486', NULL, NULL, NULL);
INSERT INTO public.role_permissions VALUES (5, 13, '2025-07-26 03:54:48.629486', NULL, NULL, NULL);
INSERT INTO public.role_permissions VALUES (5, 14, '2025-07-26 03:54:48.629486', NULL, NULL, NULL);
INSERT INTO public.role_permissions VALUES (5, 15, '2025-07-26 03:54:48.629486', NULL, NULL, NULL);
INSERT INTO public.role_permissions VALUES (5, 21, '2025-07-26 03:54:48.629486', NULL, NULL, NULL);
INSERT INTO public.role_permissions VALUES (5, 22, '2025-07-26 03:54:48.629486', NULL, NULL, NULL);
INSERT INTO public.role_permissions VALUES (5, 23, '2025-07-26 03:54:48.629486', NULL, NULL, NULL);
INSERT INTO public.role_permissions VALUES (5, 24, '2025-07-26 03:54:48.629486', NULL, NULL, NULL);
INSERT INTO public.role_permissions VALUES (5, 25, '2025-07-26 14:23:51.146189', 2, NULL, NULL);
INSERT INTO public.role_permissions VALUES (5, 26, '2025-07-26 14:23:51.146189', 2, NULL, NULL);
INSERT INTO public.role_permissions VALUES (5, 27, '2025-07-26 14:23:51.146189', 2, NULL, NULL);
INSERT INTO public.role_permissions VALUES (5, 28, '2025-07-26 14:23:51.146189', 2, NULL, NULL);
INSERT INTO public.role_permissions VALUES (5, 29, '2025-07-26 14:23:51.146189', 2, NULL, NULL);
INSERT INTO public.role_permissions VALUES (5, 30, '2025-07-26 14:23:51.146189', 2, NULL, NULL);


--
-- TOC entry 3946 (class 0 OID 24633)
-- Dependencies: 228
-- Data for Name: roles; Type: TABLE DATA; Schema: public; Owner: securevault_user
--

INSERT INTO public.roles VALUES (1, 'viewer', 'Viewer', 'Can view documents and basic information', 1, true, true, '2025-07-26 03:54:48.629486', '2025-07-26 03:54:48.629486', NULL);
INSERT INTO public.roles VALUES (2, 'user', 'User', 'Standard user with document creation privileges', 2, true, true, '2025-07-26 03:54:48.629486', '2025-07-26 03:54:48.629486', NULL);
INSERT INTO public.roles VALUES (3, 'manager', 'Manager', 'Can manage team documents and users', 3, true, true, '2025-07-26 03:54:48.629486', '2025-07-26 03:54:48.629486', NULL);
INSERT INTO public.roles VALUES (4, 'admin', 'Administrator', 'Can manage system users and configurations', 4, true, true, '2025-07-26 03:54:48.629486', '2025-07-26 03:54:48.629486', NULL);
INSERT INTO public.roles VALUES (5, 'super_admin', 'Super Administrator', 'Full system access', 5, true, true, '2025-07-26 03:54:48.629486', '2025-07-26 03:54:48.629486', NULL);


--
-- TOC entry 3987 (class 0 OID 25243)
-- Dependencies: 269
-- Data for Name: security_alerts; Type: TABLE DATA; Schema: public; Owner: securevault_user
--



--
-- TOC entry 3979 (class 0 OID 25142)
-- Dependencies: 261
-- Data for Name: security_events; Type: TABLE DATA; Schema: public; Owner: securevault_user
--

INSERT INTO public.security_events VALUES (1, 'efacd6eb-35d6-4e20-b3a8-5329c4f972bd', 'api_abuse', 'HIGH', 'ACTIVE', 'API Abuse Detected', 'Rapid API calls indicating automated abuse. Risk score: 7.0', '172.27.0.1', NULL, NULL, 7, 0.9, 'rule_based', 'API Abuse', 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/138.0.0.0 Safari/537.36', NULL, '{"event_type": "api_call", "ip_address": "172.27.0.1", "user_id": null, "user_agent": "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/138.0.0.0 Safari/537.36", "session_id": null, "timestamp": "2025-07-28T04:30:39.043444", "additional_data": {"method": "GET", "path": "/api/v1/rbac/users/3/permission-summary", "status_code": 200, "request_size": 0, "referer": "http://localhost:3005/", "query_params": null}}', NULL, NULL, '2025-07-28 04:30:39.047351+00', '2025-07-28 04:30:39.05049+00', '2025-07-28 04:30:39.050491+00', NULL, NULL, NULL);
INSERT INTO public.security_events VALUES (2, '9c2161d4-87ef-4ce7-be8b-6f28b66c4d6b', 'api_abuse', 'HIGH', 'ACTIVE', 'API Abuse Detected', 'Rapid API calls indicating automated abuse. Risk score: 7.5', '172.27.0.1', NULL, NULL, 7.5, 0.9, 'rule_based', 'API Abuse', 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/138.0.0.0 Safari/537.36', NULL, '{"event_type": "api_call", "ip_address": "172.27.0.1", "user_id": null, "user_agent": "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/138.0.0.0 Safari/537.36", "session_id": null, "timestamp": "2025-07-28T04:30:39.043677", "additional_data": {"method": "GET", "path": "/api/v1/rbac/users/3/permissions", "status_code": 200, "request_size": 0, "referer": "http://localhost:3005/", "query_params": null}}', NULL, NULL, '2025-07-28 04:30:39.060879+00', '2025-07-28 04:30:39.062492+00', '2025-07-28 04:30:39.062493+00', NULL, NULL, NULL);
INSERT INTO public.security_events VALUES (3, '23c715ee-7f62-4fbc-9b19-0d7cc27fb57c', 'api_abuse', 'HIGH', 'ACTIVE', 'API Abuse Detected', 'Rapid API calls indicating automated abuse. Risk score: 8.0', '172.27.0.1', NULL, NULL, 8, 0.9, 'rule_based', 'API Abuse', 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/138.0.0.0 Safari/537.36', NULL, '{"event_type": "api_call", "ip_address": "172.27.0.1", "user_id": null, "user_agent": "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/138.0.0.0 Safari/537.36", "session_id": null, "timestamp": "2025-07-28T04:30:39.067486", "additional_data": {"method": "GET", "path": "/api/v1/documents", "status_code": 307, "request_size": 0, "referer": "http://localhost:3005/", "query_params": "sort_by=name&sort_order=asc"}}', NULL, NULL, '2025-07-28 04:30:39.068601+00', '2025-07-28 04:30:39.070053+00', '2025-07-28 04:30:39.070053+00', NULL, NULL, NULL);
INSERT INTO public.security_events VALUES (4, '22809af2-b0f7-4634-af83-9d0d78761383', 'api_abuse', 'HIGH', 'ACTIVE', 'API Abuse Detected', 'Rapid API calls indicating automated abuse. Risk score: 8.5', '172.27.0.1', NULL, NULL, 8.5, 0.9, 'rule_based', 'API Abuse', 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/138.0.0.0 Safari/537.36', NULL, '{"event_type": "api_call", "ip_address": "172.27.0.1", "user_id": null, "user_agent": "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/138.0.0.0 Safari/537.36", "session_id": null, "timestamp": "2025-07-28T04:30:39.083296", "additional_data": {"method": "GET", "path": "/api/auth/me", "status_code": 200, "request_size": 0, "referer": "http://localhost:3005/", "query_params": null}}', NULL, NULL, '2025-07-28 04:30:39.084045+00', '2025-07-28 04:30:39.084345+00', '2025-07-28 04:30:39.084346+00', NULL, NULL, NULL);
INSERT INTO public.security_events VALUES (5, '269741d8-38e4-4973-8078-4ddc9d4a1035', 'api_abuse', 'HIGH', 'ACTIVE', 'API Abuse Detected', 'Rapid API calls indicating automated abuse. Risk score: 9.0', '172.27.0.1', NULL, NULL, 9, 0.9, 'rule_based', 'API Abuse', 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/138.0.0.0 Safari/537.36', NULL, '{"event_type": "api_call", "ip_address": "172.27.0.1", "user_id": null, "user_agent": "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/138.0.0.0 Safari/537.36", "session_id": null, "timestamp": "2025-07-28T04:30:39.089007", "additional_data": {"method": "GET", "path": "/api/v1/documents", "status_code": 307, "request_size": 0, "referer": "http://localhost:3005/", "query_params": "sort_by=name&sort_order=asc"}}', NULL, NULL, '2025-07-28 04:30:39.089741+00', '2025-07-28 04:30:39.091522+00', '2025-07-28 04:30:39.091522+00', NULL, NULL, NULL);
INSERT INTO public.security_events VALUES (6, '204c0d47-9bbb-4e4b-9318-31c700d648c3', 'api_abuse', 'HIGH', 'ACTIVE', 'API Abuse Detected', 'Rapid API calls indicating automated abuse. Risk score: 9.5', '172.27.0.1', NULL, NULL, 9.5, 0.9, 'rule_based', 'API Abuse', 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/138.0.0.0 Safari/537.36', NULL, '{"event_type": "api_call", "ip_address": "172.27.0.1", "user_id": null, "user_agent": "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/138.0.0.0 Safari/537.36", "session_id": null, "timestamp": "2025-07-28T04:30:39.097112", "additional_data": {"method": "GET", "path": "/api/v1/rbac/users/3/permission-summary", "status_code": 200, "request_size": 0, "referer": "http://localhost:3005/", "query_params": null}}', NULL, NULL, '2025-07-28 04:30:39.098612+00', '2025-07-28 04:30:39.099062+00', '2025-07-28 04:30:39.099063+00', NULL, NULL, NULL);
INSERT INTO public.security_events VALUES (7, '37209144-3b9d-47be-8955-2c1093cc972b', 'api_abuse', 'HIGH', 'ACTIVE', 'API Abuse Detected', 'Rapid API calls indicating automated abuse. Risk score: 10.0', '172.27.0.1', NULL, NULL, 10, 0.9, 'rule_based', 'API Abuse', 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/138.0.0.0 Safari/537.36', NULL, '{"event_type": "api_call", "ip_address": "172.27.0.1", "user_id": null, "user_agent": "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/138.0.0.0 Safari/537.36", "session_id": null, "timestamp": "2025-07-28T04:30:39.107416", "additional_data": {"method": "GET", "path": "/api/v1/documents", "status_code": 307, "request_size": 0, "referer": "http://localhost:3005/", "query_params": "sort_by=name&sort_order=asc"}}', NULL, NULL, '2025-07-28 04:30:39.108415+00', '2025-07-28 04:30:39.110146+00', '2025-07-28 04:30:39.110147+00', NULL, NULL, NULL);
INSERT INTO public.security_events VALUES (8, 'adb2fd2d-3097-4fef-8835-eff8134e1881', 'api_abuse', 'HIGH', 'ACTIVE', 'API Abuse Detected', 'Rapid API calls indicating automated abuse. Risk score: 10.0', '172.27.0.1', NULL, NULL, 10, 0.9, 'rule_based', 'API Abuse', 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/138.0.0.0 Safari/537.36', NULL, '{"event_type": "api_call", "ip_address": "172.27.0.1", "user_id": null, "user_agent": "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/138.0.0.0 Safari/537.36", "session_id": null, "timestamp": "2025-07-28T04:30:40.976854", "additional_data": {"method": "GET", "path": "/api/v1/documents", "status_code": 307, "request_size": 0, "referer": "http://localhost:3005/", "query_params": "parent_id=16&sort_by=name&sort_order=asc"}}', NULL, NULL, '2025-07-28 04:30:40.978914+00', '2025-07-28 04:30:40.97992+00', '2025-07-28 04:30:40.979921+00', NULL, NULL, NULL);
INSERT INTO public.security_events VALUES (9, 'e4375003-65a2-4ff3-8412-53a27c7887da', 'api_abuse', 'HIGH', 'ACTIVE', 'API Abuse Detected', 'Rapid API calls indicating automated abuse. Risk score: 10.0', '172.27.0.1', NULL, NULL, 10, 0.9, 'rule_based', 'API Abuse', 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/138.0.0.0 Safari/537.36', NULL, '{"event_type": "api_call", "ip_address": "172.27.0.1", "user_id": null, "user_agent": "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/138.0.0.0 Safari/537.36", "session_id": null, "timestamp": "2025-07-28T04:30:43.726881", "additional_data": {"method": "GET", "path": "/api/v1/documents", "status_code": 307, "request_size": 0, "referer": "http://localhost:3005/", "query_params": "parent_id=26&sort_by=name&sort_order=asc"}}', NULL, NULL, '2025-07-28 04:30:43.728912+00', '2025-07-28 04:30:43.732817+00', '2025-07-28 04:30:43.732819+00', NULL, NULL, NULL);
INSERT INTO public.security_events VALUES (10, 'af9e78c6-f9d4-4024-906f-3ac4e192d314', 'api_abuse', 'HIGH', 'ACTIVE', 'API Abuse Detected', 'Rapid API calls indicating automated abuse. Risk score: 10.0', '172.27.0.1', NULL, NULL, 10, 0.9, 'rule_based', 'API Abuse', 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/138.0.0.0 Safari/537.36', NULL, '{"event_type": "api_call", "ip_address": "172.27.0.1", "user_id": null, "user_agent": "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/138.0.0.0 Safari/537.36", "session_id": null, "timestamp": "2025-07-28T04:30:46.051202", "additional_data": {"method": "GET", "path": "/api/v1/documents", "status_code": 307, "request_size": 0, "referer": "http://localhost:3005/", "query_params": "sort_by=name&sort_order=asc"}}', NULL, NULL, '2025-07-28 04:30:46.055923+00', '2025-07-28 04:30:46.05868+00', '2025-07-28 04:30:46.058684+00', NULL, NULL, NULL);
INSERT INTO public.security_events VALUES (15, '9326541b-c80d-46dc-af7c-d695dd915feb', 'api_abuse', 'HIGH', 'ACTIVE', 'API Abuse Detected', 'Rapid API calls indicating automated abuse. Risk score: 10.0', '172.27.0.1', NULL, NULL, 10, 0.9, 'rule_based', 'API Abuse', 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/138.0.0.0 Safari/537.36', NULL, '{"event_type": "api_call", "ip_address": "172.27.0.1", "user_id": null, "user_agent": "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/138.0.0.0 Safari/537.36", "session_id": null, "timestamp": "2025-07-28T04:33:12.476449", "additional_data": {"method": "GET", "path": "/api/v1/documents", "status_code": 307, "request_size": 0, "referer": "http://localhost:3005/", "query_params": "sort_by=name&sort_order=asc"}}', NULL, NULL, '2025-07-28 04:33:12.478019+00', '2025-07-28 04:33:12.478491+00', '2025-07-28 04:33:12.478492+00', NULL, NULL, NULL);
INSERT INTO public.security_events VALUES (42, '820bf479-8d48-49e7-b009-cafae44f4234', 'api_abuse', 'HIGH', 'ACTIVE', 'API Abuse Detected', 'Rapid API calls indicating automated abuse. Risk score: 10.0', '172.27.0.1', NULL, NULL, 10, 0.9, 'rule_based', 'API Abuse', 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/138.0.0.0 Safari/537.36', NULL, '{"event_type": "api_call", "ip_address": "172.27.0.1", "user_id": null, "user_agent": "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/138.0.0.0 Safari/537.36", "session_id": null, "timestamp": "2025-07-28T04:33:13.749513", "additional_data": {"method": "GET", "path": "/api/v1/documents", "status_code": 307, "request_size": 0, "referer": "http://localhost:3005/", "query_params": "sort_by=name&sort_order=asc"}}', NULL, NULL, '2025-07-28 04:33:13.751655+00', '2025-07-28 04:33:13.75222+00', '2025-07-28 04:33:13.752221+00', NULL, NULL, NULL);
INSERT INTO public.security_events VALUES (43, '9994f5f4-fd53-4834-8c89-c3e70040fa7d', 'api_abuse', 'HIGH', 'ACTIVE', 'API Abuse Detected', 'Rapid API calls indicating automated abuse. Risk score: 10.0', '172.27.0.1', NULL, NULL, 10, 0.9, 'rule_based', 'API Abuse', 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/138.0.0.0 Safari/537.36', NULL, '{"event_type": "api_call", "ip_address": "172.27.0.1", "user_id": null, "user_agent": "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/138.0.0.0 Safari/537.36", "session_id": null, "timestamp": "2025-07-28T04:33:13.764127", "additional_data": {"method": "GET", "path": "/api/auth/me", "status_code": 200, "request_size": 0, "referer": "http://localhost:3005/", "query_params": null}}', NULL, NULL, '2025-07-28 04:33:13.765603+00', '2025-07-28 04:33:13.766033+00', '2025-07-28 04:33:13.766033+00', NULL, NULL, NULL);
INSERT INTO public.security_events VALUES (58, 'd6abee1a-b5c2-4cc2-90ce-169bfa946978', 'api_abuse', 'HIGH', 'ACTIVE', 'API Abuse Detected', 'Rapid API calls indicating automated abuse. Risk score: 10.0', '172.27.0.1', NULL, NULL, 10, 0.9, 'rule_based', 'API Abuse', 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/138.0.0.0 Safari/537.36', NULL, '{"event_type": "api_call", "ip_address": "172.27.0.1", "user_id": null, "user_agent": "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/138.0.0.0 Safari/537.36", "session_id": null, "timestamp": "2025-07-28T04:33:14.280756", "additional_data": {"method": "GET", "path": "/api/v1/rbac/users/3/permissions", "status_code": 200, "request_size": 0, "referer": "http://localhost:3005/", "query_params": null}}', NULL, NULL, '2025-07-28 04:33:14.28184+00', '2025-07-28 04:33:14.282257+00', '2025-07-28 04:33:14.282258+00', NULL, NULL, NULL);
INSERT INTO public.security_events VALUES (60, 'a87b2d8a-9e25-484b-8300-6b440a727164', 'api_abuse', 'HIGH', 'ACTIVE', 'API Abuse Detected', 'Rapid API calls indicating automated abuse. Risk score: 10.0', '172.27.0.1', NULL, NULL, 10, 0.9, 'rule_based', 'API Abuse', 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/138.0.0.0 Safari/537.36', NULL, '{"event_type": "api_call", "ip_address": "172.27.0.1", "user_id": null, "user_agent": "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/138.0.0.0 Safari/537.36", "session_id": null, "timestamp": "2025-07-28T04:33:14.301022", "additional_data": {"method": "GET", "path": "/api/v1/documents", "status_code": 307, "request_size": 0, "referer": "http://localhost:3005/", "query_params": "sort_by=name&sort_order=asc"}}', NULL, NULL, '2025-07-28 04:33:14.302115+00', '2025-07-28 04:33:14.302578+00', '2025-07-28 04:33:14.302578+00', NULL, NULL, NULL);
INSERT INTO public.security_events VALUES (66, 'd57f48e3-debe-40aa-b2f8-307cfd308b69', 'api_abuse', 'HIGH', 'ACTIVE', 'API Abuse Detected', 'Rapid API calls indicating automated abuse. Risk score: 10.0', '172.27.0.1', NULL, NULL, 10, 0.9, 'rule_based', 'API Abuse', 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/138.0.0.0 Safari/537.36', NULL, '{"event_type": "api_call", "ip_address": "172.27.0.1", "user_id": null, "user_agent": "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/138.0.0.0 Safari/537.36", "session_id": null, "timestamp": "2025-07-28T04:33:14.590775", "additional_data": {"method": "GET", "path": "/api/v1/rbac/users/3/permissions", "status_code": 200, "request_size": 0, "referer": "http://localhost:3005/", "query_params": null}}', NULL, NULL, '2025-07-28 04:33:14.592127+00', '2025-07-28 04:33:14.592569+00', '2025-07-28 04:33:14.59257+00', NULL, NULL, NULL);
INSERT INTO public.security_events VALUES (73, 'c6637ec1-476f-4c4e-8cd5-7bfc69598c42', 'api_abuse', 'HIGH', 'ACTIVE', 'API Abuse Detected', 'Rapid API calls indicating automated abuse. Risk score: 10.0', '172.27.0.1', NULL, NULL, 10, 0.9, 'rule_based', 'API Abuse', 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/138.0.0.0 Safari/537.36', NULL, '{"event_type": "api_call", "ip_address": "172.27.0.1", "user_id": null, "user_agent": "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/138.0.0.0 Safari/537.36", "session_id": null, "timestamp": "2025-07-28T04:33:15.579777", "additional_data": {"method": "GET", "path": "/api/v1/documents", "status_code": 307, "request_size": 0, "referer": "http://localhost:3005/", "query_params": "size=5&sort_by=updated_at&sort_order=desc"}}', NULL, NULL, '2025-07-28 04:33:15.580565+00', '2025-07-28 04:33:15.580866+00', '2025-07-28 04:33:15.580866+00', NULL, NULL, NULL);
INSERT INTO public.security_events VALUES (11, 'f84cadb2-99d9-4c30-a98b-fab521b7e8aa', 'api_abuse', 'HIGH', 'ACTIVE', 'API Abuse Detected', 'Rapid API calls indicating automated abuse. Risk score: 10.0', '172.27.0.1', NULL, NULL, 10, 0.9, 'rule_based', 'API Abuse', 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/138.0.0.0 Safari/537.36', NULL, '{"event_type": "api_call", "ip_address": "172.27.0.1", "user_id": null, "user_agent": "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/138.0.0.0 Safari/537.36", "session_id": null, "timestamp": "2025-07-28T04:31:04.170646", "additional_data": {"method": "GET", "path": "/api/v1/documents", "status_code": 307, "request_size": 0, "referer": "http://localhost:3005/", "query_params": "parent_id=16&sort_by=name&sort_order=asc"}}', NULL, NULL, '2025-07-28 04:31:04.172342+00', '2025-07-28 04:31:04.173036+00', '2025-07-28 04:31:04.173037+00', NULL, NULL, NULL);
INSERT INTO public.security_events VALUES (26, '611ceb88-911d-4417-ad1c-35acb91c8c53', 'api_abuse', 'HIGH', 'ACTIVE', 'API Abuse Detected', 'Rapid API calls indicating automated abuse. Risk score: 10.0', '172.27.0.1', NULL, NULL, 10, 0.9, 'rule_based', 'API Abuse', 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/138.0.0.0 Safari/537.36', NULL, '{"event_type": "api_call", "ip_address": "172.27.0.1", "user_id": null, "user_agent": "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/138.0.0.0 Safari/537.36", "session_id": null, "timestamp": "2025-07-28T04:33:13.021703", "additional_data": {"method": "GET", "path": "/api/v1/rbac/users/3/permissions", "status_code": 200, "request_size": 0, "referer": "http://localhost:3005/", "query_params": null}}', NULL, NULL, '2025-07-28 04:33:13.022966+00', '2025-07-28 04:33:13.023287+00', '2025-07-28 04:33:13.023288+00', NULL, NULL, NULL);
INSERT INTO public.security_events VALUES (28, '1203b00d-fe6b-4cc9-8bbd-1176a3d4a621', 'api_abuse', 'HIGH', 'ACTIVE', 'API Abuse Detected', 'Rapid API calls indicating automated abuse. Risk score: 10.0', '172.27.0.1', NULL, NULL, 10, 0.9, 'rule_based', 'API Abuse', 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/138.0.0.0 Safari/537.36', NULL, '{"event_type": "api_call", "ip_address": "172.27.0.1", "user_id": null, "user_agent": "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/138.0.0.0 Safari/537.36", "session_id": null, "timestamp": "2025-07-28T04:33:13.035277", "additional_data": {"method": "GET", "path": "/api/v1/documents", "status_code": 307, "request_size": 0, "referer": "http://localhost:3005/", "query_params": "sort_by=name&sort_order=asc"}}', NULL, NULL, '2025-07-28 04:33:13.036735+00', '2025-07-28 04:33:13.037126+00', '2025-07-28 04:33:13.037127+00', NULL, NULL, NULL);
INSERT INTO public.security_events VALUES (31, '4c742fdc-4b5b-499c-af5d-2a518decc41c', 'api_abuse', 'HIGH', 'ACTIVE', 'API Abuse Detected', 'Rapid API calls indicating automated abuse. Risk score: 10.0', '172.27.0.1', NULL, NULL, 10, 0.9, 'rule_based', 'API Abuse', 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/138.0.0.0 Safari/537.36', NULL, '{"event_type": "api_call", "ip_address": "172.27.0.1", "user_id": null, "user_agent": "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/138.0.0.0 Safari/537.36", "session_id": null, "timestamp": "2025-07-28T04:33:13.066631", "additional_data": {"method": "GET", "path": "/api/v1/rbac/users/3/permission-summary", "status_code": 200, "request_size": 0, "referer": "http://localhost:3005/", "query_params": null}}', NULL, NULL, '2025-07-28 04:33:13.067761+00', '2025-07-28 04:33:13.06817+00', '2025-07-28 04:33:13.068171+00', NULL, NULL, NULL);
INSERT INTO public.security_events VALUES (34, '37c229cd-a0a1-4bc6-8c1b-05963231d9bf', 'api_abuse', 'HIGH', 'ACTIVE', 'API Abuse Detected', 'Rapid API calls indicating automated abuse. Risk score: 10.0', '172.27.0.1', NULL, NULL, 10, 0.9, 'rule_based', 'API Abuse', 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/138.0.0.0 Safari/537.36', NULL, '{"event_type": "api_call", "ip_address": "172.27.0.1", "user_id": null, "user_agent": "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/138.0.0.0 Safari/537.36", "session_id": null, "timestamp": "2025-07-28T04:33:13.336487", "additional_data": {"method": "GET", "path": "/api/auth/me", "status_code": 200, "request_size": 0, "referer": "http://localhost:3005/", "query_params": null}}', NULL, NULL, '2025-07-28 04:33:13.342422+00', '2025-07-28 04:33:13.342817+00', '2025-07-28 04:33:13.342818+00', NULL, NULL, NULL);
INSERT INTO public.security_events VALUES (45, 'a2c0a5ab-813f-4591-a487-4105b14a5623', 'api_abuse', 'HIGH', 'ACTIVE', 'API Abuse Detected', 'Rapid API calls indicating automated abuse. Risk score: 10.0', '172.27.0.1', NULL, NULL, 10, 0.9, 'rule_based', 'API Abuse', 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/138.0.0.0 Safari/537.36', NULL, '{"event_type": "api_call", "ip_address": "172.27.0.1", "user_id": null, "user_agent": "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/138.0.0.0 Safari/537.36", "session_id": null, "timestamp": "2025-07-28T04:33:13.772875", "additional_data": {"method": "GET", "path": "/api/v1/documents", "status_code": 307, "request_size": 0, "referer": "http://localhost:3005/", "query_params": "sort_by=name&sort_order=asc"}}', NULL, NULL, '2025-07-28 04:33:13.774335+00', '2025-07-28 04:33:13.774805+00', '2025-07-28 04:33:13.774806+00', NULL, NULL, NULL);
INSERT INTO public.security_events VALUES (51, '4abe2aa5-c48d-484a-92cb-93a5fc56a633', 'api_abuse', 'HIGH', 'ACTIVE', 'API Abuse Detected', 'Rapid API calls indicating automated abuse. Risk score: 10.0', '172.27.0.1', NULL, NULL, 10, 0.9, 'rule_based', 'API Abuse', 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/138.0.0.0 Safari/537.36', NULL, '{"event_type": "api_call", "ip_address": "172.27.0.1", "user_id": null, "user_agent": "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/138.0.0.0 Safari/537.36", "session_id": null, "timestamp": "2025-07-28T04:33:13.840276", "additional_data": {"method": "GET", "path": "/api/v1/rbac/users/3/permission-summary", "status_code": 200, "request_size": 0, "referer": "http://localhost:3005/", "query_params": null}}', NULL, NULL, '2025-07-28 04:33:13.841427+00', '2025-07-28 04:33:13.841859+00', '2025-07-28 04:33:13.841859+00', NULL, NULL, NULL);
INSERT INTO public.security_events VALUES (80, '6e5f6a97-67c9-4b1a-a590-744e1e722c5c', 'api_abuse', 'HIGH', 'ACTIVE', 'API Abuse Detected', 'Rapid API calls indicating automated abuse. Risk score: 10.0', '172.27.0.1', NULL, NULL, 10, 0.9, 'rule_based', 'API Abuse', 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/138.0.0.0 Safari/537.36', NULL, '{"event_type": "api_call", "ip_address": "172.27.0.1", "user_id": null, "user_agent": "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/138.0.0.0 Safari/537.36", "session_id": null, "timestamp": "2025-07-28T04:33:32.745677", "additional_data": {"method": "GET", "path": "/api/v1/documents", "status_code": 307, "request_size": 0, "referer": "http://localhost:3005/", "query_params": "sort_by=name&sort_order=asc"}}', NULL, NULL, '2025-07-28 04:33:32.746963+00', '2025-07-28 04:33:32.747445+00', '2025-07-28 04:33:32.747445+00', NULL, NULL, NULL);
INSERT INTO public.security_events VALUES (12, 'a7baf6d4-e3d7-4b4a-9274-11b0e9790231', 'api_abuse', 'HIGH', 'ACTIVE', 'API Abuse Detected', 'Rapid API calls indicating automated abuse. Risk score: 10.0', '172.27.0.1', NULL, NULL, 10, 0.9, 'rule_based', 'API Abuse', 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/138.0.0.0 Safari/537.36', NULL, '{"event_type": "api_call", "ip_address": "172.27.0.1", "user_id": null, "user_agent": "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/138.0.0.0 Safari/537.36", "session_id": null, "timestamp": "2025-07-28T04:31:08.199943", "additional_data": {"method": "GET", "path": "/api/v1/documents", "status_code": 307, "request_size": 0, "referer": "http://localhost:3005/", "query_params": "parent_id=26&sort_by=name&sort_order=asc"}}', NULL, NULL, '2025-07-28 04:31:08.201059+00', '2025-07-28 04:31:08.201485+00', '2025-07-28 04:31:08.201485+00', NULL, NULL, NULL);
INSERT INTO public.security_events VALUES (13, '25801977-503e-4fde-b070-231b369885d4', 'api_abuse', 'HIGH', 'ACTIVE', 'API Abuse Detected', 'Rapid API calls indicating automated abuse. Risk score: 10.0', '172.27.0.1', NULL, NULL, 10, 0.9, 'rule_based', 'API Abuse', 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/138.0.0.0 Safari/537.36', NULL, '{"event_type": "api_call", "ip_address": "172.27.0.1", "user_id": null, "user_agent": "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/138.0.0.0 Safari/537.36", "session_id": null, "timestamp": "2025-07-28T04:33:12.451722", "additional_data": {"method": "GET", "path": "/api/v1/rbac/users/3/permissions", "status_code": 200, "request_size": 0, "referer": "http://localhost:3005/", "query_params": null}}', NULL, NULL, '2025-07-28 04:33:12.452879+00', '2025-07-28 04:33:12.453443+00', '2025-07-28 04:33:12.453443+00', NULL, NULL, NULL);
INSERT INTO public.security_events VALUES (14, '33b3433a-7906-43c2-aa30-22956530453d', 'api_abuse', 'HIGH', 'ACTIVE', 'API Abuse Detected', 'Rapid API calls indicating automated abuse. Risk score: 10.0', '172.27.0.1', NULL, NULL, 10, 0.9, 'rule_based', 'API Abuse', 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/138.0.0.0 Safari/537.36', NULL, '{"event_type": "api_call", "ip_address": "172.27.0.1", "user_id": null, "user_agent": "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/138.0.0.0 Safari/537.36", "session_id": null, "timestamp": "2025-07-28T04:33:12.457628", "additional_data": {"method": "GET", "path": "/api/auth/me", "status_code": 200, "request_size": 0, "referer": "http://localhost:3005/", "query_params": null}}', NULL, NULL, '2025-07-28 04:33:12.460477+00', '2025-07-28 04:33:12.462335+00', '2025-07-28 04:33:12.462335+00', NULL, NULL, NULL);
INSERT INTO public.security_events VALUES (16, '63c4f077-973f-49f0-ba87-21b155e284f3', 'api_abuse', 'HIGH', 'ACTIVE', 'API Abuse Detected', 'Rapid API calls indicating automated abuse. Risk score: 10.0', '172.27.0.1', NULL, NULL, 10, 0.9, 'rule_based', 'API Abuse', 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/138.0.0.0 Safari/537.36', NULL, '{"event_type": "api_call", "ip_address": "172.27.0.1", "user_id": null, "user_agent": "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/138.0.0.0 Safari/537.36", "session_id": null, "timestamp": "2025-07-28T04:33:12.481486", "additional_data": {"method": "GET", "path": "/api/v1/rbac/users/3/permissions", "status_code": 200, "request_size": 0, "referer": "http://localhost:3005/", "query_params": null}}', NULL, NULL, '2025-07-28 04:33:12.482569+00', '2025-07-28 04:33:12.483191+00', '2025-07-28 04:33:12.483191+00', NULL, NULL, NULL);
INSERT INTO public.security_events VALUES (18, '26427a31-319c-4583-af68-9c8ecd57edce', 'api_abuse', 'HIGH', 'ACTIVE', 'API Abuse Detected', 'Rapid API calls indicating automated abuse. Risk score: 10.0', '172.27.0.1', NULL, NULL, 10, 0.9, 'rule_based', 'API Abuse', 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/138.0.0.0 Safari/537.36', NULL, '{"event_type": "api_call", "ip_address": "172.27.0.1", "user_id": null, "user_agent": "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/138.0.0.0 Safari/537.36", "session_id": null, "timestamp": "2025-07-28T04:33:12.499638", "additional_data": {"method": "GET", "path": "/api/v1/rbac/users/3/permission-summary", "status_code": 200, "request_size": 0, "referer": "http://localhost:3005/", "query_params": null}}', NULL, NULL, '2025-07-28 04:33:12.500434+00', '2025-07-28 04:33:12.50074+00', '2025-07-28 04:33:12.500741+00', NULL, NULL, NULL);
INSERT INTO public.security_events VALUES (23, 'ee78d730-4d69-4653-b98c-8e1f60912092', 'api_abuse', 'HIGH', 'ACTIVE', 'API Abuse Detected', 'Rapid API calls indicating automated abuse. Risk score: 10.0', '172.27.0.1', NULL, NULL, 10, 0.9, 'rule_based', 'API Abuse', 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/138.0.0.0 Safari/537.36', NULL, '{"event_type": "api_call", "ip_address": "172.27.0.1", "user_id": null, "user_agent": "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/138.0.0.0 Safari/537.36", "session_id": null, "timestamp": "2025-07-28T04:33:12.997904", "additional_data": {"method": "GET", "path": "/api/v1/rbac/users/3/permissions", "status_code": 200, "request_size": 0, "referer": "http://localhost:3005/", "query_params": null}}', NULL, NULL, '2025-07-28 04:33:12.999002+00', '2025-07-28 04:33:12.9994+00', '2025-07-28 04:33:12.9994+00', NULL, NULL, NULL);
INSERT INTO public.security_events VALUES (25, '98f48b1f-941a-4c5f-adbc-9cbc07f18983', 'api_abuse', 'HIGH', 'ACTIVE', 'API Abuse Detected', 'Rapid API calls indicating automated abuse. Risk score: 10.0', '172.27.0.1', NULL, NULL, 10, 0.9, 'rule_based', 'API Abuse', 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/138.0.0.0 Safari/537.36', NULL, '{"event_type": "api_call", "ip_address": "172.27.0.1", "user_id": null, "user_agent": "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/138.0.0.0 Safari/537.36", "session_id": null, "timestamp": "2025-07-28T04:33:13.006456", "additional_data": {"method": "GET", "path": "/api/v1/documents", "status_code": 307, "request_size": 0, "referer": "http://localhost:3005/", "query_params": "sort_by=name&sort_order=asc"}}', NULL, NULL, '2025-07-28 04:33:13.007775+00', '2025-07-28 04:33:13.008699+00', '2025-07-28 04:33:13.008699+00', NULL, NULL, NULL);
INSERT INTO public.security_events VALUES (29, 'ee932cee-add9-49a5-bcc4-dedec7626fae', 'api_abuse', 'HIGH', 'ACTIVE', 'API Abuse Detected', 'Rapid API calls indicating automated abuse. Risk score: 10.0', '172.27.0.1', NULL, NULL, 10, 0.9, 'rule_based', 'API Abuse', 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/138.0.0.0 Safari/537.36', NULL, '{"event_type": "api_call", "ip_address": "172.27.0.1", "user_id": null, "user_agent": "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/138.0.0.0 Safari/537.36", "session_id": null, "timestamp": "2025-07-28T04:33:13.043921", "additional_data": {"method": "GET", "path": "/api/v1/rbac/users/3/permission-summary", "status_code": 200, "request_size": 0, "referer": "http://localhost:3005/", "query_params": null}}', NULL, NULL, '2025-07-28 04:33:13.045906+00', '2025-07-28 04:33:13.046234+00', '2025-07-28 04:33:13.046234+00', NULL, NULL, NULL);
INSERT INTO public.security_events VALUES (33, '6bcf7e73-6b6b-43ec-bab6-25ea5a37a41f', 'api_abuse', 'HIGH', 'ACTIVE', 'API Abuse Detected', 'Rapid API calls indicating automated abuse. Risk score: 10.0', '172.27.0.1', NULL, NULL, 10, 0.9, 'rule_based', 'API Abuse', 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/138.0.0.0 Safari/537.36', NULL, '{"event_type": "api_call", "ip_address": "172.27.0.1", "user_id": null, "user_agent": "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/138.0.0.0 Safari/537.36", "session_id": null, "timestamp": "2025-07-28T04:33:13.336010", "additional_data": {"method": "GET", "path": "/api/v1/rbac/users/3/permissions", "status_code": 200, "request_size": 0, "referer": "http://localhost:3005/", "query_params": null}}', NULL, NULL, '2025-07-28 04:33:13.337895+00', '2025-07-28 04:33:13.338289+00', '2025-07-28 04:33:13.33829+00', NULL, NULL, NULL);
INSERT INTO public.security_events VALUES (17, '510ebeba-d9bf-4083-bd12-b396b5cbe675', 'api_abuse', 'HIGH', 'ACTIVE', 'API Abuse Detected', 'Rapid API calls indicating automated abuse. Risk score: 10.0', '172.27.0.1', NULL, NULL, 10, 0.9, 'rule_based', 'API Abuse', 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/138.0.0.0 Safari/537.36', NULL, '{"event_type": "api_call", "ip_address": "172.27.0.1", "user_id": null, "user_agent": "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/138.0.0.0 Safari/537.36", "session_id": null, "timestamp": "2025-07-28T04:33:12.481694", "additional_data": {"method": "GET", "path": "/api/auth/me", "status_code": 200, "request_size": 0, "referer": "http://localhost:3005/", "query_params": null}}', NULL, NULL, '2025-07-28 04:33:12.486701+00', '2025-07-28 04:33:12.487085+00', '2025-07-28 04:33:12.487086+00', NULL, NULL, NULL);
INSERT INTO public.security_events VALUES (21, 'c818985b-aef5-49f2-a3da-2ec7f43cd37d', 'api_abuse', 'HIGH', 'ACTIVE', 'API Abuse Detected', 'Rapid API calls indicating automated abuse. Risk score: 10.0', '172.27.0.1', NULL, NULL, 10, 0.9, 'rule_based', 'API Abuse', 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/138.0.0.0 Safari/537.36', NULL, '{"event_type": "api_call", "ip_address": "172.27.0.1", "user_id": null, "user_agent": "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/138.0.0.0 Safari/537.36", "session_id": null, "timestamp": "2025-07-28T04:33:12.524476", "additional_data": {"method": "GET", "path": "/api/v1/documents", "status_code": 307, "request_size": 0, "referer": "http://localhost:3005/", "query_params": "sort_by=name&sort_order=asc"}}', NULL, NULL, '2025-07-28 04:33:12.525478+00', '2025-07-28 04:33:12.525853+00', '2025-07-28 04:33:12.525854+00', NULL, NULL, NULL);
INSERT INTO public.security_events VALUES (30, '57b32365-47a5-469d-a253-05f5ae671be9', 'api_abuse', 'HIGH', 'ACTIVE', 'API Abuse Detected', 'Rapid API calls indicating automated abuse. Risk score: 10.0', '172.27.0.1', NULL, NULL, 10, 0.9, 'rule_based', 'API Abuse', 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/138.0.0.0 Safari/537.36', NULL, '{"event_type": "api_call", "ip_address": "172.27.0.1", "user_id": null, "user_agent": "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/138.0.0.0 Safari/537.36", "session_id": null, "timestamp": "2025-07-28T04:33:13.056095", "additional_data": {"method": "GET", "path": "/api/v1/documents", "status_code": 307, "request_size": 0, "referer": "http://localhost:3005/", "query_params": "sort_by=name&sort_order=asc"}}', NULL, NULL, '2025-07-28 04:33:13.056891+00', '2025-07-28 04:33:13.057256+00', '2025-07-28 04:33:13.057257+00', NULL, NULL, NULL);
INSERT INTO public.security_events VALUES (32, '2ac7481c-0ac4-4ca5-b65a-96976012b391', 'api_abuse', 'HIGH', 'ACTIVE', 'API Abuse Detected', 'Rapid API calls indicating automated abuse. Risk score: 10.0', '172.27.0.1', NULL, NULL, 10, 0.9, 'rule_based', 'API Abuse', 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/138.0.0.0 Safari/537.36', NULL, '{"event_type": "api_call", "ip_address": "172.27.0.1", "user_id": null, "user_agent": "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/138.0.0.0 Safari/537.36", "session_id": null, "timestamp": "2025-07-28T04:33:13.325888", "additional_data": {"method": "GET", "path": "/api/v1/documents", "status_code": 307, "request_size": 0, "referer": "http://localhost:3005/", "query_params": "sort_by=name&sort_order=asc"}}', NULL, NULL, '2025-07-28 04:33:13.32787+00', '2025-07-28 04:33:13.328539+00', '2025-07-28 04:33:13.328539+00', NULL, NULL, NULL);
INSERT INTO public.security_events VALUES (46, '37cd7509-7aa6-4e3a-9847-daeb7bc416e3', 'api_abuse', 'HIGH', 'ACTIVE', 'API Abuse Detected', 'Rapid API calls indicating automated abuse. Risk score: 10.0', '172.27.0.1', NULL, NULL, 10, 0.9, 'rule_based', 'API Abuse', 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/138.0.0.0 Safari/537.36', NULL, '{"event_type": "api_call", "ip_address": "172.27.0.1", "user_id": null, "user_agent": "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/138.0.0.0 Safari/537.36", "session_id": null, "timestamp": "2025-07-28T04:33:13.796918", "additional_data": {"method": "GET", "path": "/api/v1/rbac/users/3/permissions", "status_code": 200, "request_size": 0, "referer": "http://localhost:3005/", "query_params": null}}', NULL, NULL, '2025-07-28 04:33:13.798332+00', '2025-07-28 04:33:13.798697+00', '2025-07-28 04:33:13.798697+00', NULL, NULL, NULL);
INSERT INTO public.security_events VALUES (50, '3f910121-11ed-4033-8b1e-4cc37bc6f14a', 'api_abuse', 'HIGH', 'ACTIVE', 'API Abuse Detected', 'Rapid API calls indicating automated abuse. Risk score: 10.0', '172.27.0.1', NULL, NULL, 10, 0.9, 'rule_based', 'API Abuse', 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/138.0.0.0 Safari/537.36', NULL, '{"event_type": "api_call", "ip_address": "172.27.0.1", "user_id": null, "user_agent": "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/138.0.0.0 Safari/537.36", "session_id": null, "timestamp": "2025-07-28T04:33:13.832784", "additional_data": {"method": "GET", "path": "/api/v1/documents", "status_code": 307, "request_size": 0, "referer": "http://localhost:3005/", "query_params": "sort_by=name&sort_order=asc"}}', NULL, NULL, '2025-07-28 04:33:13.83541+00', '2025-07-28 04:33:13.835703+00', '2025-07-28 04:33:13.835704+00', NULL, NULL, NULL);
INSERT INTO public.security_events VALUES (19, '50e17cb7-9089-4288-8e87-d32e40d63012', 'api_abuse', 'HIGH', 'ACTIVE', 'API Abuse Detected', 'Rapid API calls indicating automated abuse. Risk score: 10.0', '172.27.0.1', NULL, NULL, 10, 0.9, 'rule_based', 'API Abuse', 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/138.0.0.0 Safari/537.36', NULL, '{"event_type": "api_call", "ip_address": "172.27.0.1", "user_id": null, "user_agent": "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/138.0.0.0 Safari/537.36", "session_id": null, "timestamp": "2025-07-28T04:33:12.503152", "additional_data": {"method": "GET", "path": "/api/v1/documents", "status_code": 307, "request_size": 0, "referer": "http://localhost:3005/", "query_params": "sort_by=name&sort_order=asc"}}', NULL, NULL, '2025-07-28 04:33:12.505212+00', '2025-07-28 04:33:12.505541+00', '2025-07-28 04:33:12.505542+00', NULL, NULL, NULL);
INSERT INTO public.security_events VALUES (20, 'a3ed1f98-f5d3-4252-84d9-26ce8e45cc81', 'api_abuse', 'HIGH', 'ACTIVE', 'API Abuse Detected', 'Rapid API calls indicating automated abuse. Risk score: 10.0', '172.27.0.1', NULL, NULL, 10, 0.9, 'rule_based', 'API Abuse', 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/138.0.0.0 Safari/537.36', NULL, '{"event_type": "api_call", "ip_address": "172.27.0.1", "user_id": null, "user_agent": "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/138.0.0.0 Safari/537.36", "session_id": null, "timestamp": "2025-07-28T04:33:12.518142", "additional_data": {"method": "GET", "path": "/api/v1/rbac/users/3/permission-summary", "status_code": 200, "request_size": 0, "referer": "http://localhost:3005/", "query_params": null}}', NULL, NULL, '2025-07-28 04:33:12.519807+00', '2025-07-28 04:33:12.520114+00', '2025-07-28 04:33:12.520115+00', NULL, NULL, NULL);
INSERT INTO public.security_events VALUES (38, '30d90d09-4abe-465b-b517-cb399b0916b8', 'api_abuse', 'HIGH', 'ACTIVE', 'API Abuse Detected', 'Rapid API calls indicating automated abuse. Risk score: 10.0', '172.27.0.1', NULL, NULL, 10, 0.9, 'rule_based', 'API Abuse', 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/138.0.0.0 Safari/537.36', NULL, '{"event_type": "api_call", "ip_address": "172.27.0.1", "user_id": null, "user_agent": "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/138.0.0.0 Safari/537.36", "session_id": null, "timestamp": "2025-07-28T04:33:13.383890", "additional_data": {"method": "GET", "path": "/api/v1/documents", "status_code": 307, "request_size": 0, "referer": "http://localhost:3005/", "query_params": "sort_by=name&sort_order=asc"}}', NULL, NULL, '2025-07-28 04:33:13.385322+00', '2025-07-28 04:33:13.385738+00', '2025-07-28 04:33:13.385738+00', NULL, NULL, NULL);
INSERT INTO public.security_events VALUES (48, '36bcf399-3acb-4450-8271-49e94e6a47db', 'api_abuse', 'HIGH', 'ACTIVE', 'API Abuse Detected', 'Rapid API calls indicating automated abuse. Risk score: 10.0', '172.27.0.1', NULL, NULL, 10, 0.9, 'rule_based', 'API Abuse', 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/138.0.0.0 Safari/537.36', NULL, '{"event_type": "api_call", "ip_address": "172.27.0.1", "user_id": null, "user_agent": "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/138.0.0.0 Safari/537.36", "session_id": null, "timestamp": "2025-07-28T04:33:13.809945", "additional_data": {"method": "GET", "path": "/api/v1/documents", "status_code": 307, "request_size": 0, "referer": "http://localhost:3005/", "query_params": "sort_by=name&sort_order=asc"}}', NULL, NULL, '2025-07-28 04:33:13.810851+00', '2025-07-28 04:33:13.811224+00', '2025-07-28 04:33:13.811225+00', NULL, NULL, NULL);
INSERT INTO public.security_events VALUES (62, 'd5253dfc-f9d1-4f22-9659-6ab8abc5320f', 'api_abuse', 'HIGH', 'ACTIVE', 'API Abuse Detected', 'Rapid API calls indicating automated abuse. Risk score: 10.0', '172.27.0.1', NULL, NULL, 10, 0.9, 'rule_based', 'API Abuse', 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/138.0.0.0 Safari/537.36', NULL, '{"event_type": "api_call", "ip_address": "172.27.0.1", "user_id": null, "user_agent": "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/138.0.0.0 Safari/537.36", "session_id": null, "timestamp": "2025-07-28T04:33:14.548681", "additional_data": {"method": "GET", "path": "/api/v1/documents", "status_code": 307, "request_size": 0, "referer": "http://localhost:3005/", "query_params": "sort_by=name&sort_order=asc"}}', NULL, NULL, '2025-07-28 04:33:14.55019+00', '2025-07-28 04:33:14.550774+00', '2025-07-28 04:33:14.550775+00', NULL, NULL, NULL);
INSERT INTO public.security_events VALUES (74, '7b071a1a-9027-4e4f-8dc0-1780905aa73c', 'api_abuse', 'HIGH', 'ACTIVE', 'API Abuse Detected', 'Rapid API calls indicating automated abuse. Risk score: 10.0', '172.27.0.1', NULL, NULL, 10, 0.9, 'rule_based', 'API Abuse', 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/138.0.0.0 Safari/537.36', NULL, '{"event_type": "api_call", "ip_address": "172.27.0.1", "user_id": null, "user_agent": "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/138.0.0.0 Safari/537.36", "session_id": null, "timestamp": "2025-07-28T04:33:15.583905", "additional_data": {"method": "GET", "path": "/api/v1/rbac/roles", "status_code": 200, "request_size": 0, "referer": "http://localhost:3005/", "query_params": "include_stats=true"}}', NULL, NULL, '2025-07-28 04:33:15.584878+00', '2025-07-28 04:33:15.585267+00', '2025-07-28 04:33:15.585267+00', NULL, NULL, NULL);
INSERT INTO public.security_events VALUES (76, '5f423232-9c9a-4d6a-89ae-d7fdb3963608', 'api_abuse', 'HIGH', 'ACTIVE', 'API Abuse Detected', 'Rapid API calls indicating automated abuse. Risk score: 10.0', '172.27.0.1', NULL, NULL, 10, 0.9, 'rule_based', 'API Abuse', 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/138.0.0.0 Safari/537.36', NULL, '{"event_type": "api_call", "ip_address": "172.27.0.1", "user_id": null, "user_agent": "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/138.0.0.0 Safari/537.36", "session_id": null, "timestamp": "2025-07-28T04:33:16.988061", "additional_data": {"method": "GET", "path": "/api/v1/documents", "status_code": 307, "request_size": 0, "referer": "http://localhost:3005/", "query_params": "sort_by=name&sort_order=asc"}}', NULL, NULL, '2025-07-28 04:33:16.991148+00', '2025-07-28 04:33:16.992275+00', '2025-07-28 04:33:16.992277+00', NULL, NULL, NULL);
INSERT INTO public.security_events VALUES (78, 'fe888f8b-2496-4fa9-b064-2deb3fa2c465', 'api_abuse', 'HIGH', 'ACTIVE', 'API Abuse Detected', 'Rapid API calls indicating automated abuse. Risk score: 10.0', '172.27.0.1', NULL, NULL, 10, 0.9, 'rule_based', 'API Abuse', 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/138.0.0.0 Safari/537.36', NULL, '{"event_type": "api_call", "ip_address": "172.27.0.1", "user_id": null, "user_agent": "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/138.0.0.0 Safari/537.36", "session_id": null, "timestamp": "2025-07-28T04:33:18.162961", "additional_data": {"method": "GET", "path": "/api/v1/folders/16/path", "status_code": 404, "request_size": 0, "referer": "http://localhost:3005/", "query_params": null}}', NULL, NULL, '2025-07-28 04:33:18.1637+00', '2025-07-28 04:33:18.164107+00', '2025-07-28 04:33:18.164107+00', NULL, NULL, NULL);
INSERT INTO public.security_events VALUES (22, '7d97ff09-63d4-4174-89ec-2f75e7bf5678', 'api_abuse', 'HIGH', 'ACTIVE', 'API Abuse Detected', 'Rapid API calls indicating automated abuse. Risk score: 10.0', '172.27.0.1', NULL, NULL, 10, 0.9, 'rule_based', 'API Abuse', 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/138.0.0.0 Safari/537.36', NULL, '{"event_type": "api_call", "ip_address": "172.27.0.1", "user_id": null, "user_agent": "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/138.0.0.0 Safari/537.36", "session_id": null, "timestamp": "2025-07-28T04:33:12.988631", "additional_data": {"method": "GET", "path": "/api/v1/documents", "status_code": 307, "request_size": 0, "referer": "http://localhost:3005/", "query_params": "sort_by=name&sort_order=asc"}}', NULL, NULL, '2025-07-28 04:33:12.989606+00', '2025-07-28 04:33:12.989987+00', '2025-07-28 04:33:12.989987+00', NULL, NULL, NULL);
INSERT INTO public.security_events VALUES (24, 'a00913f2-63d1-45f2-a576-f9bf433eb246', 'api_abuse', 'HIGH', 'ACTIVE', 'API Abuse Detected', 'Rapid API calls indicating automated abuse. Risk score: 10.0', '172.27.0.1', NULL, NULL, 10, 0.9, 'rule_based', 'API Abuse', 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/138.0.0.0 Safari/537.36', NULL, '{"event_type": "api_call", "ip_address": "172.27.0.1", "user_id": null, "user_agent": "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/138.0.0.0 Safari/537.36", "session_id": null, "timestamp": "2025-07-28T04:33:12.998193", "additional_data": {"method": "GET", "path": "/api/auth/me", "status_code": 200, "request_size": 0, "referer": "http://localhost:3005/", "query_params": null}}', NULL, NULL, '2025-07-28 04:33:13.003379+00', '2025-07-28 04:33:13.00373+00', '2025-07-28 04:33:13.003731+00', NULL, NULL, NULL);
INSERT INTO public.security_events VALUES (27, '3b720549-ea34-4cb4-9e7c-83587f8c401a', 'api_abuse', 'HIGH', 'ACTIVE', 'API Abuse Detected', 'Rapid API calls indicating automated abuse. Risk score: 10.0', '172.27.0.1', NULL, NULL, 10, 0.9, 'rule_based', 'API Abuse', 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/138.0.0.0 Safari/537.36', NULL, '{"event_type": "api_call", "ip_address": "172.27.0.1", "user_id": null, "user_agent": "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/138.0.0.0 Safari/537.36", "session_id": null, "timestamp": "2025-07-28T04:33:13.022098", "additional_data": {"method": "GET", "path": "/api/auth/me", "status_code": 200, "request_size": 0, "referer": "http://localhost:3005/", "query_params": null}}', NULL, NULL, '2025-07-28 04:33:13.026956+00', '2025-07-28 04:33:13.027339+00', '2025-07-28 04:33:13.02734+00', NULL, NULL, NULL);
INSERT INTO public.security_events VALUES (35, '6bdbe89f-da0c-4764-aeb7-6591b63486b8', 'api_abuse', 'HIGH', 'ACTIVE', 'API Abuse Detected', 'Rapid API calls indicating automated abuse. Risk score: 10.0', '172.27.0.1', NULL, NULL, 10, 0.9, 'rule_based', 'API Abuse', 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/138.0.0.0 Safari/537.36', NULL, '{"event_type": "api_call", "ip_address": "172.27.0.1", "user_id": null, "user_agent": "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/138.0.0.0 Safari/537.36", "session_id": null, "timestamp": "2025-07-28T04:33:13.351868", "additional_data": {"method": "GET", "path": "/api/v1/documents", "status_code": 307, "request_size": 0, "referer": "http://localhost:3005/", "query_params": "sort_by=name&sort_order=asc"}}', NULL, NULL, '2025-07-28 04:33:13.354165+00', '2025-07-28 04:33:13.354527+00', '2025-07-28 04:33:13.354528+00', NULL, NULL, NULL);
INSERT INTO public.security_events VALUES (37, '4e163c8f-c78d-4130-aa07-d758170b73a8', 'api_abuse', 'HIGH', 'ACTIVE', 'API Abuse Detected', 'Rapid API calls indicating automated abuse. Risk score: 10.0', '172.27.0.1', NULL, NULL, 10, 0.9, 'rule_based', 'API Abuse', 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/138.0.0.0 Safari/537.36', NULL, '{"event_type": "api_call", "ip_address": "172.27.0.1", "user_id": null, "user_agent": "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/138.0.0.0 Safari/537.36", "session_id": null, "timestamp": "2025-07-28T04:33:13.372926", "additional_data": {"method": "GET", "path": "/api/auth/me", "status_code": 200, "request_size": 0, "referer": "http://localhost:3005/", "query_params": null}}', NULL, NULL, '2025-07-28 04:33:13.378315+00', '2025-07-28 04:33:13.3786+00', '2025-07-28 04:33:13.378601+00', NULL, NULL, NULL);
INSERT INTO public.security_events VALUES (39, 'd278eef8-2a4d-4c8f-a194-2432e4c77a41', 'api_abuse', 'HIGH', 'ACTIVE', 'API Abuse Detected', 'Rapid API calls indicating automated abuse. Risk score: 10.0', '172.27.0.1', NULL, NULL, 10, 0.9, 'rule_based', 'API Abuse', 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/138.0.0.0 Safari/537.36', NULL, '{"event_type": "api_call", "ip_address": "172.27.0.1", "user_id": null, "user_agent": "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/138.0.0.0 Safari/537.36", "session_id": null, "timestamp": "2025-07-28T04:33:13.391936", "additional_data": {"method": "GET", "path": "/api/v1/rbac/users/3/permission-summary", "status_code": 200, "request_size": 0, "referer": "http://localhost:3005/", "query_params": null}}', NULL, NULL, '2025-07-28 04:33:13.393024+00', '2025-07-28 04:33:13.393353+00', '2025-07-28 04:33:13.393353+00', NULL, NULL, NULL);
INSERT INTO public.security_events VALUES (52, '6f24b3a8-afaa-454d-bcd3-33032a7a226d', 'api_abuse', 'HIGH', 'ACTIVE', 'API Abuse Detected', 'Rapid API calls indicating automated abuse. Risk score: 10.0', '172.27.0.1', NULL, NULL, 10, 0.9, 'rule_based', 'API Abuse', 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/138.0.0.0 Safari/537.36', NULL, '{"event_type": "api_call", "ip_address": "172.27.0.1", "user_id": null, "user_agent": "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/138.0.0.0 Safari/537.36", "session_id": null, "timestamp": "2025-07-28T04:33:14.215172", "additional_data": {"method": "GET", "path": "/api/v1/documents", "status_code": 307, "request_size": 0, "referer": "http://localhost:3005/", "query_params": "sort_by=name&sort_order=asc"}}', NULL, NULL, '2025-07-28 04:33:14.218356+00', '2025-07-28 04:33:14.21961+00', '2025-07-28 04:33:14.219612+00', NULL, NULL, NULL);
INSERT INTO public.security_events VALUES (64, 'e624e329-d1de-4f7f-8478-3b085085a6ea', 'api_abuse', 'HIGH', 'ACTIVE', 'API Abuse Detected', 'Rapid API calls indicating automated abuse. Risk score: 10.0', '172.27.0.1', NULL, NULL, 10, 0.9, 'rule_based', 'API Abuse', 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/138.0.0.0 Safari/537.36', NULL, '{"event_type": "api_call", "ip_address": "172.27.0.1", "user_id": null, "user_agent": "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/138.0.0.0 Safari/537.36", "session_id": null, "timestamp": "2025-07-28T04:33:14.559649", "additional_data": {"method": "GET", "path": "/api/v1/rbac/users/3/permissions", "status_code": 200, "request_size": 0, "referer": "http://localhost:3005/", "query_params": null}}', NULL, NULL, '2025-07-28 04:33:14.566386+00', '2025-07-28 04:33:14.56678+00', '2025-07-28 04:33:14.566781+00', NULL, NULL, NULL);
INSERT INTO public.security_events VALUES (68, '6257c186-476d-4ee8-b8a0-a62526136d65', 'api_abuse', 'HIGH', 'ACTIVE', 'API Abuse Detected', 'Rapid API calls indicating automated abuse. Risk score: 10.0', '172.27.0.1', NULL, NULL, 10, 0.9, 'rule_based', 'API Abuse', 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/138.0.0.0 Safari/537.36', NULL, '{"event_type": "api_call", "ip_address": "172.27.0.1", "user_id": null, "user_agent": "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/138.0.0.0 Safari/537.36", "session_id": null, "timestamp": "2025-07-28T04:33:14.612206", "additional_data": {"method": "GET", "path": "/api/v1/rbac/users/3/permission-summary", "status_code": 200, "request_size": 0, "referer": "http://localhost:3005/", "query_params": null}}', NULL, NULL, '2025-07-28 04:33:14.61313+00', '2025-07-28 04:33:14.613469+00', '2025-07-28 04:33:14.613469+00', NULL, NULL, NULL);
INSERT INTO public.security_events VALUES (36, '7ee61985-aba6-4838-80fd-fb927f80a639', 'api_abuse', 'HIGH', 'ACTIVE', 'API Abuse Detected', 'Rapid API calls indicating automated abuse. Risk score: 10.0', '172.27.0.1', NULL, NULL, 10, 0.9, 'rule_based', 'API Abuse', 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/138.0.0.0 Safari/537.36', NULL, '{"event_type": "api_call", "ip_address": "172.27.0.1", "user_id": null, "user_agent": "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/138.0.0.0 Safari/537.36", "session_id": null, "timestamp": "2025-07-28T04:33:13.372659", "additional_data": {"method": "GET", "path": "/api/v1/rbac/users/3/permissions", "status_code": 200, "request_size": 0, "referer": "http://localhost:3005/", "query_params": null}}', NULL, NULL, '2025-07-28 04:33:13.373954+00', '2025-07-28 04:33:13.374272+00', '2025-07-28 04:33:13.374273+00', NULL, NULL, NULL);
INSERT INTO public.security_events VALUES (41, '4c38723b-6b07-4dd6-944c-7d3b7c59bbf4', 'api_abuse', 'HIGH', 'ACTIVE', 'API Abuse Detected', 'Rapid API calls indicating automated abuse. Risk score: 10.0', '172.27.0.1', NULL, NULL, 10, 0.9, 'rule_based', 'API Abuse', 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/138.0.0.0 Safari/537.36', NULL, '{"event_type": "api_call", "ip_address": "172.27.0.1", "user_id": null, "user_agent": "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/138.0.0.0 Safari/537.36", "session_id": null, "timestamp": "2025-07-28T04:33:13.412239", "additional_data": {"method": "GET", "path": "/api/v1/rbac/users/3/permission-summary", "status_code": 200, "request_size": 0, "referer": "http://localhost:3005/", "query_params": null}}', NULL, NULL, '2025-07-28 04:33:13.413448+00', '2025-07-28 04:33:13.41386+00', '2025-07-28 04:33:13.41386+00', NULL, NULL, NULL);
INSERT INTO public.security_events VALUES (44, 'abe0bf5e-e373-4dba-97e9-33d12192def1', 'api_abuse', 'HIGH', 'ACTIVE', 'API Abuse Detected', 'Rapid API calls indicating automated abuse. Risk score: 10.0', '172.27.0.1', NULL, NULL, 10, 0.9, 'rule_based', 'API Abuse', 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/138.0.0.0 Safari/537.36', NULL, '{"event_type": "api_call", "ip_address": "172.27.0.1", "user_id": null, "user_agent": "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/138.0.0.0 Safari/537.36", "session_id": null, "timestamp": "2025-07-28T04:33:13.764439", "additional_data": {"method": "GET", "path": "/api/v1/rbac/users/3/permissions", "status_code": 200, "request_size": 0, "referer": "http://localhost:3005/", "query_params": null}}', NULL, NULL, '2025-07-28 04:33:13.769618+00', '2025-07-28 04:33:13.769945+00', '2025-07-28 04:33:13.769956+00', NULL, NULL, NULL);
INSERT INTO public.security_events VALUES (49, '9d780199-8026-48bd-8c1c-760cb6850c01', 'api_abuse', 'HIGH', 'ACTIVE', 'API Abuse Detected', 'Rapid API calls indicating automated abuse. Risk score: 10.0', '172.27.0.1', NULL, NULL, 10, 0.9, 'rule_based', 'API Abuse', 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/138.0.0.0 Safari/537.36', NULL, '{"event_type": "api_call", "ip_address": "172.27.0.1", "user_id": null, "user_agent": "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/138.0.0.0 Safari/537.36", "session_id": null, "timestamp": "2025-07-28T04:33:13.820071", "additional_data": {"method": "GET", "path": "/api/v1/rbac/users/3/permission-summary", "status_code": 200, "request_size": 0, "referer": "http://localhost:3005/", "query_params": null}}', NULL, NULL, '2025-07-28 04:33:13.820978+00', '2025-07-28 04:33:13.82126+00', '2025-07-28 04:33:13.821261+00', NULL, NULL, NULL);
INSERT INTO public.security_events VALUES (40, '188e25ae-b62a-4f63-8ee3-20cc7a935471', 'api_abuse', 'HIGH', 'ACTIVE', 'API Abuse Detected', 'Rapid API calls indicating automated abuse. Risk score: 10.0', '172.27.0.1', NULL, NULL, 10, 0.9, 'rule_based', 'API Abuse', 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/138.0.0.0 Safari/537.36', NULL, '{"event_type": "api_call", "ip_address": "172.27.0.1", "user_id": null, "user_agent": "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/138.0.0.0 Safari/537.36", "session_id": null, "timestamp": "2025-07-28T04:33:13.406097", "additional_data": {"method": "GET", "path": "/api/v1/documents", "status_code": 307, "request_size": 0, "referer": "http://localhost:3005/", "query_params": "sort_by=name&sort_order=asc"}}', NULL, NULL, '2025-07-28 04:33:13.407925+00', '2025-07-28 04:33:13.408277+00', '2025-07-28 04:33:13.408277+00', NULL, NULL, NULL);
INSERT INTO public.security_events VALUES (47, '92552306-e7ff-4e11-bfb7-c98c5ad3c1e2', 'api_abuse', 'HIGH', 'ACTIVE', 'API Abuse Detected', 'Rapid API calls indicating automated abuse. Risk score: 10.0', '172.27.0.1', NULL, NULL, 10, 0.9, 'rule_based', 'API Abuse', 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/138.0.0.0 Safari/537.36', NULL, '{"event_type": "api_call", "ip_address": "172.27.0.1", "user_id": null, "user_agent": "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/138.0.0.0 Safari/537.36", "session_id": null, "timestamp": "2025-07-28T04:33:13.797247", "additional_data": {"method": "GET", "path": "/api/auth/me", "status_code": 200, "request_size": 0, "referer": "http://localhost:3005/", "query_params": null}}', NULL, NULL, '2025-07-28 04:33:13.801998+00', '2025-07-28 04:33:13.802291+00', '2025-07-28 04:33:13.802291+00', NULL, NULL, NULL);
INSERT INTO public.security_events VALUES (53, 'f14f78f0-c12b-462d-9a34-bd0569fbbe80', 'api_abuse', 'HIGH', 'ACTIVE', 'API Abuse Detected', 'Rapid API calls indicating automated abuse. Risk score: 10.0', '172.27.0.1', NULL, NULL, 10, 0.9, 'rule_based', 'API Abuse', 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/138.0.0.0 Safari/537.36', NULL, '{"event_type": "api_call", "ip_address": "172.27.0.1", "user_id": null, "user_agent": "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/138.0.0.0 Safari/537.36", "session_id": null, "timestamp": "2025-07-28T04:33:14.226603", "additional_data": {"method": "GET", "path": "/api/auth/me", "status_code": 200, "request_size": 0, "referer": "http://localhost:3005/", "query_params": null}}', NULL, NULL, '2025-07-28 04:33:14.229282+00', '2025-07-28 04:33:14.231101+00', '2025-07-28 04:33:14.231103+00', NULL, NULL, NULL);
INSERT INTO public.security_events VALUES (57, '1ebc4acc-0b75-451f-914b-3831004c124e', 'api_abuse', 'HIGH', 'ACTIVE', 'API Abuse Detected', 'Rapid API calls indicating automated abuse. Risk score: 10.0', '172.27.0.1', NULL, NULL, 10, 0.9, 'rule_based', 'API Abuse', 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/138.0.0.0 Safari/537.36', NULL, '{"event_type": "api_call", "ip_address": "172.27.0.1", "user_id": null, "user_agent": "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/138.0.0.0 Safari/537.36", "session_id": null, "timestamp": "2025-07-28T04:33:14.267182", "additional_data": {"method": "GET", "path": "/api/v1/documents", "status_code": 307, "request_size": 0, "referer": "http://localhost:3005/", "query_params": "sort_by=name&sort_order=asc"}}', NULL, NULL, '2025-07-28 04:33:14.269516+00', '2025-07-28 04:33:14.270098+00', '2025-07-28 04:33:14.270099+00', NULL, NULL, NULL);
INSERT INTO public.security_events VALUES (59, '5b85bbd8-ec2c-40fe-9164-d7b8546c4f65', 'api_abuse', 'HIGH', 'ACTIVE', 'API Abuse Detected', 'Rapid API calls indicating automated abuse. Risk score: 10.0', '172.27.0.1', NULL, NULL, 10, 0.9, 'rule_based', 'API Abuse', 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/138.0.0.0 Safari/537.36', NULL, '{"event_type": "api_call", "ip_address": "172.27.0.1", "user_id": null, "user_agent": "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/138.0.0.0 Safari/537.36", "session_id": null, "timestamp": "2025-07-28T04:33:14.287649", "additional_data": {"method": "GET", "path": "/api/v1/rbac/users/3/permission-summary", "status_code": 200, "request_size": 0, "referer": "http://localhost:3005/", "query_params": null}}', NULL, NULL, '2025-07-28 04:33:14.289197+00', '2025-07-28 04:33:14.289693+00', '2025-07-28 04:33:14.289695+00', NULL, NULL, NULL);
INSERT INTO public.security_events VALUES (54, 'ede0796c-d3ac-43d3-9c78-871121cd241e', 'api_abuse', 'HIGH', 'ACTIVE', 'API Abuse Detected', 'Rapid API calls indicating automated abuse. Risk score: 10.0', '172.27.0.1', NULL, NULL, 10, 0.9, 'rule_based', 'API Abuse', 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/138.0.0.0 Safari/537.36', NULL, '{"event_type": "api_call", "ip_address": "172.27.0.1", "user_id": null, "user_agent": "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/138.0.0.0 Safari/537.36", "session_id": null, "timestamp": "2025-07-28T04:33:14.236657", "additional_data": {"method": "GET", "path": "/api/v1/rbac/users/3/permissions", "status_code": 200, "request_size": 0, "referer": "http://localhost:3005/", "query_params": null}}', NULL, NULL, '2025-07-28 04:33:14.238279+00', '2025-07-28 04:33:14.238832+00', '2025-07-28 04:33:14.238833+00', NULL, NULL, NULL);
INSERT INTO public.security_events VALUES (65, '66b7f656-e103-400d-9988-4facedf7dac5', 'api_abuse', 'HIGH', 'ACTIVE', 'API Abuse Detected', 'Rapid API calls indicating automated abuse. Risk score: 10.0', '172.27.0.1', NULL, NULL, 10, 0.9, 'rule_based', 'API Abuse', 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/138.0.0.0 Safari/537.36', NULL, '{"event_type": "api_call", "ip_address": "172.27.0.1", "user_id": null, "user_agent": "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/138.0.0.0 Safari/537.36", "session_id": null, "timestamp": "2025-07-28T04:33:14.585399", "additional_data": {"method": "GET", "path": "/api/auth/me", "status_code": 200, "request_size": 0, "referer": "http://localhost:3005/", "query_params": null}}', NULL, NULL, '2025-07-28 04:33:14.586963+00', '2025-07-28 04:33:14.587364+00', '2025-07-28 04:33:14.587365+00', NULL, NULL, NULL);
INSERT INTO public.security_events VALUES (71, 'c5ee682f-aa47-4e31-a3db-81ae5051a7a3', 'api_abuse', 'HIGH', 'ACTIVE', 'API Abuse Detected', 'Rapid API calls indicating automated abuse. Risk score: 10.0', '172.27.0.1', NULL, NULL, 10, 0.9, 'rule_based', 'API Abuse', 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/138.0.0.0 Safari/537.36', NULL, '{"event_type": "api_call", "ip_address": "172.27.0.1", "user_id": null, "user_agent": "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/138.0.0.0 Safari/537.36", "session_id": null, "timestamp": "2025-07-28T04:33:14.634313", "additional_data": {"method": "GET", "path": "/api/v1/documents", "status_code": 307, "request_size": 0, "referer": "http://localhost:3005/", "query_params": "sort_by=name&sort_order=asc"}}', NULL, NULL, '2025-07-28 04:33:14.635313+00', '2025-07-28 04:33:14.63571+00', '2025-07-28 04:33:14.635711+00', NULL, NULL, NULL);
INSERT INTO public.security_events VALUES (55, '4d2a838f-48bd-4ca2-8f43-c15377fa3103', 'api_abuse', 'HIGH', 'ACTIVE', 'API Abuse Detected', 'Rapid API calls indicating automated abuse. Risk score: 10.0', '172.27.0.1', NULL, NULL, 10, 0.9, 'rule_based', 'API Abuse', 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/138.0.0.0 Safari/537.36', NULL, '{"event_type": "api_call", "ip_address": "172.27.0.1", "user_id": null, "user_agent": "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/138.0.0.0 Safari/537.36", "session_id": null, "timestamp": "2025-07-28T04:33:14.246184", "additional_data": {"method": "GET", "path": "/api/v1/documents", "status_code": 307, "request_size": 0, "referer": "http://localhost:3005/", "query_params": "sort_by=name&sort_order=asc"}}', NULL, NULL, '2025-07-28 04:33:14.247411+00', '2025-07-28 04:33:14.247794+00', '2025-07-28 04:33:14.247794+00', NULL, NULL, NULL);
INSERT INTO public.security_events VALUES (63, '3a9bc936-6083-4ce0-a792-3b0c066f9aef', 'api_abuse', 'HIGH', 'ACTIVE', 'API Abuse Detected', 'Rapid API calls indicating automated abuse. Risk score: 10.0', '172.27.0.1', NULL, NULL, 10, 0.9, 'rule_based', 'API Abuse', 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/138.0.0.0 Safari/537.36', NULL, '{"event_type": "api_call", "ip_address": "172.27.0.1", "user_id": null, "user_agent": "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/138.0.0.0 Safari/537.36", "session_id": null, "timestamp": "2025-07-28T04:33:14.559042", "additional_data": {"method": "GET", "path": "/api/auth/me", "status_code": 200, "request_size": 0, "referer": "http://localhost:3005/", "query_params": null}}', NULL, NULL, '2025-07-28 04:33:14.561787+00', '2025-07-28 04:33:14.56227+00', '2025-07-28 04:33:14.562271+00', NULL, NULL, NULL);
INSERT INTO public.security_events VALUES (69, '8ac7f998-1fc9-4afa-9941-20998662243c', 'api_abuse', 'HIGH', 'ACTIVE', 'API Abuse Detected', 'Rapid API calls indicating automated abuse. Risk score: 10.0', '172.27.0.1', NULL, NULL, 10, 0.9, 'rule_based', 'API Abuse', 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/138.0.0.0 Safari/537.36', NULL, '{"event_type": "api_call", "ip_address": "172.27.0.1", "user_id": null, "user_agent": "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/138.0.0.0 Safari/537.36", "session_id": null, "timestamp": "2025-07-28T04:33:14.616166", "additional_data": {"method": "GET", "path": "/api/v1/documents", "status_code": 307, "request_size": 0, "referer": "http://localhost:3005/", "query_params": "sort_by=name&sort_order=asc"}}', NULL, NULL, '2025-07-28 04:33:14.617057+00', '2025-07-28 04:33:14.617408+00', '2025-07-28 04:33:14.617408+00', NULL, NULL, NULL);
INSERT INTO public.security_events VALUES (72, '90b03562-7977-4941-81cf-6da7517d0aa9', 'api_abuse', 'HIGH', 'ACTIVE', 'API Abuse Detected', 'Rapid API calls indicating automated abuse. Risk score: 10.0', '172.27.0.1', NULL, NULL, 10, 0.9, 'rule_based', 'API Abuse', 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/138.0.0.0 Safari/537.36', NULL, '{"event_type": "api_call", "ip_address": "172.27.0.1", "user_id": null, "user_agent": "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/138.0.0.0 Safari/537.36", "session_id": null, "timestamp": "2025-07-28T04:33:15.557629", "additional_data": {"method": "GET", "path": "/api/v1/rbac/roles", "status_code": 200, "request_size": 0, "referer": "http://localhost:3005/", "query_params": "include_stats=true"}}', NULL, NULL, '2025-07-28 04:33:15.559794+00', '2025-07-28 04:33:15.560305+00', '2025-07-28 04:33:15.560306+00', NULL, NULL, NULL);
INSERT INTO public.security_events VALUES (77, 'ce2a7a8b-59c1-4c39-bf7b-2f67f515ebfd', 'api_abuse', 'HIGH', 'ACTIVE', 'API Abuse Detected', 'Rapid API calls indicating automated abuse. Risk score: 10.0', '172.27.0.1', NULL, NULL, 10, 0.9, 'rule_based', 'API Abuse', 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/138.0.0.0 Safari/537.36', NULL, '{"event_type": "api_call", "ip_address": "172.27.0.1", "user_id": null, "user_agent": "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/138.0.0.0 Safari/537.36", "session_id": null, "timestamp": "2025-07-28T04:33:17.008465", "additional_data": {"method": "GET", "path": "/api/v1/documents", "status_code": 307, "request_size": 0, "referer": "http://localhost:3005/", "query_params": "sort_by=name&sort_order=asc"}}', NULL, NULL, '2025-07-28 04:33:17.00978+00', '2025-07-28 04:33:17.010411+00', '2025-07-28 04:33:17.010412+00', NULL, NULL, NULL);
INSERT INTO public.security_events VALUES (79, 'd090c4a6-df10-42d0-9281-237b89ca4021', 'api_abuse', 'HIGH', 'ACTIVE', 'API Abuse Detected', 'Rapid API calls indicating automated abuse. Risk score: 10.0', '172.27.0.1', NULL, NULL, 10, 0.9, 'rule_based', 'API Abuse', 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/138.0.0.0 Safari/537.36', NULL, '{"event_type": "api_call", "ip_address": "172.27.0.1", "user_id": null, "user_agent": "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/138.0.0.0 Safari/537.36", "session_id": null, "timestamp": "2025-07-28T04:33:18.174700", "additional_data": {"method": "GET", "path": "/api/v1/documents", "status_code": 307, "request_size": 0, "referer": "http://localhost:3005/", "query_params": "parent_id=16&sort_by=name&sort_order=asc"}}', NULL, NULL, '2025-07-28 04:33:18.175703+00', '2025-07-28 04:33:18.176109+00', '2025-07-28 04:33:18.17611+00', NULL, NULL, NULL);
INSERT INTO public.security_events VALUES (56, '75afbdcd-98fe-406f-86e3-8cf3818b12b6', 'api_abuse', 'HIGH', 'ACTIVE', 'API Abuse Detected', 'Rapid API calls indicating automated abuse. Risk score: 10.0', '172.27.0.1', NULL, NULL, 10, 0.9, 'rule_based', 'API Abuse', 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/138.0.0.0 Safari/537.36', NULL, '{"event_type": "api_call", "ip_address": "172.27.0.1", "user_id": null, "user_agent": "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/138.0.0.0 Safari/537.36", "session_id": null, "timestamp": "2025-07-28T04:33:14.259127", "additional_data": {"method": "GET", "path": "/api/auth/me", "status_code": 200, "request_size": 0, "referer": "http://localhost:3005/", "query_params": null}}', NULL, NULL, '2025-07-28 04:33:14.260364+00', '2025-07-28 04:33:14.260851+00', '2025-07-28 04:33:14.260852+00', NULL, NULL, NULL);
INSERT INTO public.security_events VALUES (61, '2d002acd-5a8b-47b4-96d6-b3d7a18ccca7', 'api_abuse', 'HIGH', 'ACTIVE', 'API Abuse Detected', 'Rapid API calls indicating automated abuse. Risk score: 10.0', '172.27.0.1', NULL, NULL, 10, 0.9, 'rule_based', 'API Abuse', 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/138.0.0.0 Safari/537.36', NULL, '{"event_type": "api_call", "ip_address": "172.27.0.1", "user_id": null, "user_agent": "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/138.0.0.0 Safari/537.36", "session_id": null, "timestamp": "2025-07-28T04:33:14.332310", "additional_data": {"method": "GET", "path": "/api/v1/rbac/users/3/permission-summary", "status_code": 200, "request_size": 0, "referer": "http://localhost:3005/", "query_params": null}}', NULL, NULL, '2025-07-28 04:33:14.333231+00', '2025-07-28 04:33:14.333599+00', '2025-07-28 04:33:14.3336+00', NULL, NULL, NULL);
INSERT INTO public.security_events VALUES (67, 'd889cf5c-b082-432a-b2af-de3c67fa8dc0', 'api_abuse', 'HIGH', 'ACTIVE', 'API Abuse Detected', 'Rapid API calls indicating automated abuse. Risk score: 10.0', '172.27.0.1', NULL, NULL, 10, 0.9, 'rule_based', 'API Abuse', 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/138.0.0.0 Safari/537.36', NULL, '{"event_type": "api_call", "ip_address": "172.27.0.1", "user_id": null, "user_agent": "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/138.0.0.0 Safari/537.36", "session_id": null, "timestamp": "2025-07-28T04:33:14.597512", "additional_data": {"method": "GET", "path": "/api/v1/documents", "status_code": 307, "request_size": 0, "referer": "http://localhost:3005/", "query_params": "sort_by=name&sort_order=asc"}}', NULL, NULL, '2025-07-28 04:33:14.598536+00', '2025-07-28 04:33:14.598888+00', '2025-07-28 04:33:14.598888+00', NULL, NULL, NULL);
INSERT INTO public.security_events VALUES (70, '87d487fc-73f1-4666-b17b-e3ca12f9ecae', 'api_abuse', 'HIGH', 'ACTIVE', 'API Abuse Detected', 'Rapid API calls indicating automated abuse. Risk score: 10.0', '172.27.0.1', NULL, NULL, 10, 0.9, 'rule_based', 'API Abuse', 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/138.0.0.0 Safari/537.36', NULL, '{"event_type": "api_call", "ip_address": "172.27.0.1", "user_id": null, "user_agent": "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/138.0.0.0 Safari/537.36", "session_id": null, "timestamp": "2025-07-28T04:33:14.627617", "additional_data": {"method": "GET", "path": "/api/v1/rbac/users/3/permission-summary", "status_code": 200, "request_size": 0, "referer": "http://localhost:3005/", "query_params": null}}', NULL, NULL, '2025-07-28 04:33:14.628627+00', '2025-07-28 04:33:14.628932+00', '2025-07-28 04:33:14.628933+00', NULL, NULL, NULL);
INSERT INTO public.security_events VALUES (75, 'efa1e511-408b-487f-9973-06449b182d36', 'api_abuse', 'HIGH', 'ACTIVE', 'API Abuse Detected', 'Rapid API calls indicating automated abuse. Risk score: 10.0', '172.27.0.1', NULL, NULL, 10, 0.9, 'rule_based', 'API Abuse', 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/138.0.0.0 Safari/537.36', NULL, '{"event_type": "api_call", "ip_address": "172.27.0.1", "user_id": null, "user_agent": "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/138.0.0.0 Safari/537.36", "session_id": null, "timestamp": "2025-07-28T04:33:15.594819", "additional_data": {"method": "GET", "path": "/api/v1/documents", "status_code": 307, "request_size": 0, "referer": "http://localhost:3005/", "query_params": "size=5&sort_by=updated_at&sort_order=desc"}}', NULL, NULL, '2025-07-28 04:33:15.595774+00', '2025-07-28 04:33:15.596086+00', '2025-07-28 04:33:15.596087+00', NULL, NULL, NULL);
INSERT INTO public.security_events VALUES (81, '4f666c54-c04a-41ba-84fa-64af5896bb31', 'api_abuse', 'HIGH', 'ACTIVE', 'API Abuse Detected', 'Rapid API calls indicating automated abuse. Risk score: 7.0', '172.28.0.1', NULL, NULL, 7, 0.9, 'rule_based', 'API Abuse', 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/138.0.0.0 Safari/537.36', NULL, '{"event_type": "api_call", "ip_address": "172.28.0.1", "user_id": null, "user_agent": "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/138.0.0.0 Safari/537.36", "session_id": null, "timestamp": "2025-07-28T12:25:53.760997", "additional_data": {"method": "GET", "path": "/api/v1/rbac/users/3/permission-summary", "status_code": 200, "request_size": 0, "referer": "http://localhost:3005/", "query_params": null}}', NULL, NULL, '2025-07-28 12:25:53.764461+00', '2025-07-28 12:25:53.766633+00', '2025-07-28 12:25:53.766633+00', NULL, NULL, NULL);
INSERT INTO public.security_events VALUES (82, 'ccb21b3a-8af4-4266-a38b-cfd218c1994b', 'api_abuse', 'HIGH', 'ACTIVE', 'API Abuse Detected', 'Rapid API calls indicating automated abuse. Risk score: 7.5', '172.28.0.1', NULL, NULL, 7.5, 0.9, 'rule_based', 'API Abuse', 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/138.0.0.0 Safari/537.36', NULL, '{"event_type": "api_call", "ip_address": "172.28.0.1", "user_id": null, "user_agent": "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/138.0.0.0 Safari/537.36", "session_id": null, "timestamp": "2025-07-28T12:25:53.789679", "additional_data": {"method": "GET", "path": "/api/v1/rbac/roles", "status_code": 200, "request_size": 0, "referer": "http://localhost:3005/", "query_params": "include_stats=true"}}', NULL, NULL, '2025-07-28 12:25:53.790521+00', '2025-07-28 12:25:53.791658+00', '2025-07-28 12:25:53.791659+00', NULL, NULL, NULL);
INSERT INTO public.security_events VALUES (83, 'f845a770-5b6f-4c86-8dd0-c2edfb02d16e', 'api_abuse', 'HIGH', 'ACTIVE', 'API Abuse Detected', 'Rapid API calls indicating automated abuse. Risk score: 8.0', '172.28.0.1', NULL, NULL, 8, 0.9, 'rule_based', 'API Abuse', 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/138.0.0.0 Safari/537.36', NULL, '{"event_type": "api_call", "ip_address": "172.28.0.1", "user_id": null, "user_agent": "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/138.0.0.0 Safari/537.36", "session_id": null, "timestamp": "2025-07-28T12:25:53.868851", "additional_data": {"method": "GET", "path": "/api/v1/rbac/users/3/permission-summary", "status_code": 200, "request_size": 0, "referer": "http://localhost:3005/", "query_params": null}}', NULL, NULL, '2025-07-28 12:25:53.870818+00', '2025-07-28 12:25:53.871211+00', '2025-07-28 12:25:53.871212+00', NULL, NULL, NULL);
INSERT INTO public.security_events VALUES (84, 'b7a66446-2da6-426e-988a-b0ea4109954d', 'api_abuse', 'HIGH', 'ACTIVE', 'API Abuse Detected', 'Rapid API calls indicating automated abuse. Risk score: 8.5', '172.28.0.1', NULL, NULL, 8.5, 0.9, 'rule_based', 'API Abuse', 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/138.0.0.0 Safari/537.36', NULL, '{"event_type": "api_call", "ip_address": "172.28.0.1", "user_id": null, "user_agent": "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/138.0.0.0 Safari/537.36", "session_id": null, "timestamp": "2025-07-28T12:25:53.893383", "additional_data": {"method": "GET", "path": "/api/v1/rbac/roles", "status_code": 200, "request_size": 0, "referer": "http://localhost:3005/", "query_params": "include_stats=true"}}', NULL, NULL, '2025-07-28 12:25:53.894868+00', '2025-07-28 12:25:53.896739+00', '2025-07-28 12:25:53.89674+00', NULL, NULL, NULL);
INSERT INTO public.security_events VALUES (85, '0f3fbbc8-840d-4fe6-8186-ff772a95fff8', 'api_abuse', 'HIGH', 'ACTIVE', 'API Abuse Detected', 'Rapid API calls indicating automated abuse. Risk score: 9.0', '172.28.0.1', NULL, NULL, 9, 0.9, 'rule_based', 'API Abuse', 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/138.0.0.0 Safari/537.36', NULL, '{"event_type": "api_call", "ip_address": "172.28.0.1", "user_id": null, "user_agent": "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/138.0.0.0 Safari/537.36", "session_id": null, "timestamp": "2025-07-28T12:25:53.902696", "additional_data": {"method": "GET", "path": "/api/v1/documents", "status_code": 307, "request_size": 0, "referer": "http://localhost:3005/", "query_params": "size=5&sort_by=updated_at&sort_order=desc"}}', NULL, NULL, '2025-07-28 12:25:53.904346+00', '2025-07-28 12:25:53.906221+00', '2025-07-28 12:25:53.906221+00', NULL, NULL, NULL);
INSERT INTO public.security_events VALUES (86, '31fc36a6-9545-44d1-9aeb-5228e75ff3b5', 'api_abuse', 'HIGH', 'ACTIVE', 'API Abuse Detected', 'Rapid API calls indicating automated abuse. Risk score: 9.5', '172.28.0.1', NULL, NULL, 9.5, 0.9, 'rule_based', 'API Abuse', 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/138.0.0.0 Safari/537.36', NULL, '{"event_type": "api_call", "ip_address": "172.28.0.1", "user_id": null, "user_agent": "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/138.0.0.0 Safari/537.36", "session_id": null, "timestamp": "2025-07-28T12:25:53.924938", "additional_data": {"method": "GET", "path": "/api/v1/rbac/roles", "status_code": 200, "request_size": 0, "referer": "http://localhost:3005/", "query_params": "include_stats=true"}}', NULL, NULL, '2025-07-28 12:25:53.925949+00', '2025-07-28 12:25:53.92649+00', '2025-07-28 12:25:53.92649+00', NULL, NULL, NULL);
INSERT INTO public.security_events VALUES (92, 'c9f595e5-c5ee-4541-90c9-a38b55cdd69f', 'api_abuse', 'HIGH', 'ACTIVE', 'API Abuse Detected', 'Rapid API calls indicating automated abuse. Risk score: 10.0', '172.28.0.1', NULL, NULL, 10, 0.9, 'rule_based', 'API Abuse', 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/138.0.0.0 Safari/537.36', NULL, '{"event_type": "api_call", "ip_address": "172.28.0.1", "user_id": null, "user_agent": "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/138.0.0.0 Safari/537.36", "session_id": null, "timestamp": "2025-07-28T12:26:04.739401", "additional_data": {"method": "GET", "path": "/api/v1/documents", "status_code": 307, "request_size": 0, "referer": "http://localhost:3005/", "query_params": "sort_by=name&sort_order=asc"}}', NULL, NULL, '2025-07-28 12:26:04.740243+00', '2025-07-28 12:26:04.740605+00', '2025-07-28 12:26:04.740605+00', NULL, NULL, NULL);
INSERT INTO public.security_events VALUES (99, 'd883686c-863c-4bc5-b4cc-7761c946c747', 'api_abuse', 'HIGH', 'ACTIVE', 'API Abuse Detected', 'Rapid API calls indicating automated abuse. Risk score: 10.0', '172.28.0.1', NULL, NULL, 10, 0.9, 'rule_based', 'API Abuse', 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/138.0.0.0 Safari/537.36', NULL, '{"event_type": "api_call", "ip_address": "172.28.0.1", "user_id": null, "user_agent": "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/138.0.0.0 Safari/537.36", "session_id": null, "timestamp": "2025-07-28T12:26:49.738567", "additional_data": {"method": "GET", "path": "/api/v1/admin/users", "status_code": 200, "request_size": 0, "referer": "http://localhost:3005/", "query_params": "page=1&size=20", "suspicion_score": 3.0}}', NULL, NULL, '2025-07-28 12:26:49.740443+00', '2025-07-28 12:26:49.7415+00', '2025-07-28 12:26:49.741502+00', NULL, NULL, NULL);
INSERT INTO public.security_events VALUES (110, 'fc9a51b6-43ac-465c-aeca-1620c4aa6c6c', 'api_abuse', 'HIGH', 'ACTIVE', 'API Abuse Detected', 'Rapid API calls indicating automated abuse. Risk score: 10.0', '172.28.0.1', NULL, NULL, 10, 0.9, 'rule_based', 'API Abuse', 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/138.0.0.0 Safari/537.36', NULL, '{"event_type": "api_call", "ip_address": "172.28.0.1", "user_id": null, "user_agent": "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/138.0.0.0 Safari/537.36", "session_id": null, "timestamp": "2025-07-28T12:26:58.442669", "additional_data": {"method": "GET", "path": "/api/v1/rbac/users/3/permissions", "status_code": 200, "request_size": 0, "referer": "http://localhost:3005/", "query_params": null}}', NULL, NULL, '2025-07-28 12:26:58.443971+00', '2025-07-28 12:26:58.444439+00', '2025-07-28 12:26:58.44444+00', NULL, NULL, NULL);
INSERT INTO public.security_events VALUES (112, '04237b9c-9671-4d87-be4a-fcea99965059', 'api_abuse', 'HIGH', 'ACTIVE', 'API Abuse Detected', 'Rapid API calls indicating automated abuse. Risk score: 10.0', '172.28.0.1', NULL, NULL, 10, 0.9, 'rule_based', 'API Abuse', 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/138.0.0.0 Safari/537.36', NULL, '{"event_type": "api_call", "ip_address": "172.28.0.1", "user_id": null, "user_agent": "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/138.0.0.0 Safari/537.36", "session_id": null, "timestamp": "2025-07-28T12:26:58.459770", "additional_data": {"method": "GET", "path": "/api/auth/me", "status_code": 200, "request_size": 0, "referer": "http://localhost:3005/", "query_params": null}}', NULL, NULL, '2025-07-28 12:26:58.460902+00', '2025-07-28 12:26:58.461436+00', '2025-07-28 12:26:58.461437+00', NULL, NULL, NULL);
INSERT INTO public.security_events VALUES (113, '3f3efd86-7c05-410c-a8b0-b328a795301b', 'api_abuse', 'HIGH', 'ACTIVE', 'API Abuse Detected', 'Rapid API calls indicating automated abuse. Risk score: 10.0', '172.28.0.1', NULL, NULL, 10, 0.9, 'rule_based', 'API Abuse', 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/138.0.0.0 Safari/537.36', NULL, '{"event_type": "api_call", "ip_address": "172.28.0.1", "user_id": null, "user_agent": "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/138.0.0.0 Safari/537.36", "session_id": null, "timestamp": "2025-07-28T12:26:58.472235", "additional_data": {"method": "GET", "path": "/api/v1/admin/users", "status_code": 200, "request_size": 0, "referer": "http://localhost:3005/", "query_params": "page=1&size=20", "suspicion_score": 3.0}}', NULL, NULL, '2025-07-28 12:26:58.473026+00', '2025-07-28 12:26:58.473376+00', '2025-07-28 12:26:58.473377+00', NULL, NULL, NULL);
INSERT INTO public.security_events VALUES (115, '23e3f92e-4c9b-4c30-ade8-b2de2fa116b4', 'api_abuse', 'HIGH', 'ACTIVE', 'API Abuse Detected', 'Rapid API calls indicating automated abuse. Risk score: 10.0', '172.28.0.1', NULL, NULL, 10, 0.9, 'rule_based', 'API Abuse', 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/138.0.0.0 Safari/537.36', NULL, '{"event_type": "api_call", "ip_address": "172.28.0.1", "user_id": null, "user_agent": "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/138.0.0.0 Safari/537.36", "session_id": null, "timestamp": "2025-07-28T12:26:58.484292", "additional_data": {"method": "GET", "path": "/api/v1/rbac/users/3/permission-summary", "status_code": 200, "request_size": 0, "referer": "http://localhost:3005/", "query_params": null}}', NULL, NULL, '2025-07-28 12:26:58.485431+00', '2025-07-28 12:26:58.48591+00', '2025-07-28 12:26:58.485911+00', NULL, NULL, NULL);
INSERT INTO public.security_events VALUES (117, 'ff013d06-9d63-44d2-ba3f-0cb142bae8cc', 'api_abuse', 'HIGH', 'ACTIVE', 'API Abuse Detected', 'Rapid API calls indicating automated abuse. Risk score: 10.0', '172.28.0.1', NULL, NULL, 10, 0.9, 'rule_based', 'API Abuse', 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/138.0.0.0 Safari/537.36', NULL, '{"event_type": "api_call", "ip_address": "172.28.0.1", "user_id": null, "user_agent": "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/138.0.0.0 Safari/537.36", "session_id": null, "timestamp": "2025-07-28T12:27:04.188611", "additional_data": {"method": "DELETE", "path": "/api/v1/admin/users/10", "status_code": 204, "request_size": 0, "referer": "http://localhost:3005/", "query_params": null, "suspicion_score": 3.0}}', NULL, NULL, '2025-07-28 12:27:04.191636+00', '2025-07-28 12:27:04.192474+00', '2025-07-28 12:27:04.192475+00', NULL, NULL, NULL);
INSERT INTO public.security_events VALUES (87, 'f30b12a6-e58f-4255-b215-aaef6bcba7d4', 'api_abuse', 'HIGH', 'ACTIVE', 'API Abuse Detected', 'Rapid API calls indicating automated abuse. Risk score: 10.0', '172.28.0.1', NULL, NULL, 10, 0.9, 'rule_based', 'API Abuse', 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/138.0.0.0 Safari/537.36', NULL, '{"event_type": "api_call", "ip_address": "172.28.0.1", "user_id": null, "user_agent": "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/138.0.0.0 Safari/537.36", "session_id": null, "timestamp": "2025-07-28T12:25:53.931492", "additional_data": {"method": "GET", "path": "/api/v1/documents", "status_code": 307, "request_size": 0, "referer": "http://localhost:3005/", "query_params": "size=5&sort_by=updated_at&sort_order=desc"}}', NULL, NULL, '2025-07-28 12:25:53.93363+00', '2025-07-28 12:25:53.934047+00', '2025-07-28 12:25:53.934047+00', NULL, NULL, NULL);
INSERT INTO public.security_events VALUES (95, '4da9abba-25e5-4601-b39a-09b02640cd18', 'api_abuse', 'HIGH', 'ACTIVE', 'API Abuse Detected', 'Rapid API calls indicating automated abuse. Risk score: 10.0', '172.28.0.1', NULL, NULL, 10, 0.9, 'rule_based', 'API Abuse', 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/138.0.0.0 Safari/537.36', NULL, '{"event_type": "api_call", "ip_address": "172.28.0.1", "user_id": null, "user_agent": "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/138.0.0.0 Safari/537.36", "session_id": null, "timestamp": "2025-07-28T12:26:06.159546", "additional_data": {"method": "GET", "path": "/api/v1/rbac/roles", "status_code": 200, "request_size": 0, "referer": "http://localhost:3005/", "query_params": "include_stats=true"}}', NULL, NULL, '2025-07-28 12:26:06.160468+00', '2025-07-28 12:26:06.160783+00', '2025-07-28 12:26:06.160784+00', NULL, NULL, NULL);
INSERT INTO public.security_events VALUES (96, '75cc995e-cff1-4065-a50e-86530177877f', 'api_abuse', 'HIGH', 'ACTIVE', 'API Abuse Detected', 'Rapid API calls indicating automated abuse. Risk score: 10.0', '172.28.0.1', NULL, NULL, 10, 0.9, 'rule_based', 'API Abuse', 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/138.0.0.0 Safari/537.36', NULL, '{"event_type": "api_call", "ip_address": "172.28.0.1", "user_id": null, "user_agent": "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/138.0.0.0 Safari/537.36", "session_id": null, "timestamp": "2025-07-28T12:26:06.170365", "additional_data": {"method": "GET", "path": "/api/v1/documents", "status_code": 307, "request_size": 0, "referer": "http://localhost:3005/", "query_params": "size=5&sort_by=updated_at&sort_order=desc"}}', NULL, NULL, '2025-07-28 12:26:06.171217+00', '2025-07-28 12:26:06.171596+00', '2025-07-28 12:26:06.171597+00', NULL, NULL, NULL);
INSERT INTO public.security_events VALUES (97, 'f9f1e2e7-cc89-4fea-afb7-6524f4967d86', 'api_abuse', 'HIGH', 'ACTIVE', 'API Abuse Detected', 'Rapid API calls indicating automated abuse. Risk score: 10.0', '172.28.0.1', NULL, NULL, 10, 0.9, 'rule_based', 'API Abuse', 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/138.0.0.0 Safari/537.36', NULL, '{"event_type": "api_call", "ip_address": "172.28.0.1", "user_id": null, "user_agent": "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/138.0.0.0 Safari/537.36", "session_id": null, "timestamp": "2025-07-28T12:26:47.024865", "additional_data": {"method": "GET", "path": "/api/v1/documents", "status_code": 307, "request_size": 0, "referer": "http://localhost:3005/", "query_params": "sort_by=name&sort_order=asc"}}', NULL, NULL, '2025-07-28 12:26:47.02648+00', '2025-07-28 12:26:47.027223+00', '2025-07-28 12:26:47.027224+00', NULL, NULL, NULL);
INSERT INTO public.security_events VALUES (122, '2ee08dd2-ccab-4e8a-9d60-e8506a94368b', 'api_abuse', 'HIGH', 'ACTIVE', 'API Abuse Detected', 'Rapid API calls indicating automated abuse. Risk score: 10.0', '172.28.0.1', NULL, NULL, 10, 0.9, 'rule_based', 'API Abuse', 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/138.0.0.0 Safari/537.36', NULL, '{"event_type": "api_call", "ip_address": "172.28.0.1", "user_id": null, "user_agent": "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/138.0.0.0 Safari/537.36", "session_id": null, "timestamp": "2025-07-28T12:27:13.622305", "additional_data": {"method": "GET", "path": "/api/v1/admin/users", "status_code": 200, "request_size": 0, "referer": "http://localhost:3005/", "query_params": "page=1&size=20", "suspicion_score": 3.0}}', NULL, NULL, '2025-07-28 12:27:13.62317+00', '2025-07-28 12:27:13.623599+00', '2025-07-28 12:27:13.623599+00', NULL, NULL, NULL);
INSERT INTO public.security_events VALUES (141, '5e761e57-a095-4f9e-8127-3efaa09107b8', 'api_abuse', 'HIGH', 'ACTIVE', 'API Abuse Detected', 'Rapid API calls indicating automated abuse. Risk score: 10.0', '172.28.0.1', NULL, NULL, 10, 0.9, 'rule_based', 'API Abuse', 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/138.0.0.0 Safari/537.36', NULL, '{"event_type": "api_call", "ip_address": "172.28.0.1", "user_id": null, "user_agent": "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/138.0.0.0 Safari/537.36", "session_id": null, "timestamp": "2025-07-28T12:27:46.634394", "additional_data": {"method": "GET", "path": "/api/v1/rbac/users/1/roles", "status_code": 404, "request_size": 0, "referer": "http://localhost:3005/", "query_params": null}}', NULL, NULL, '2025-07-28 12:27:46.635393+00', '2025-07-28 12:27:46.635843+00', '2025-07-28 12:27:46.635843+00', NULL, NULL, NULL);
INSERT INTO public.security_events VALUES (88, '7346a7b3-ab84-4247-a902-64762ea733aa', 'api_abuse', 'HIGH', 'ACTIVE', 'API Abuse Detected', 'Rapid API calls indicating automated abuse. Risk score: 10.0', '172.28.0.1', NULL, NULL, 10, 0.9, 'rule_based', 'API Abuse', 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/138.0.0.0 Safari/537.36', NULL, '{"event_type": "api_call", "ip_address": "172.28.0.1", "user_id": null, "user_agent": "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/138.0.0.0 Safari/537.36", "session_id": null, "timestamp": "2025-07-28T12:25:53.949075", "additional_data": {"method": "GET", "path": "/api/v1/rbac/roles", "status_code": 200, "request_size": 0, "referer": "http://localhost:3005/", "query_params": "include_stats=true"}}', NULL, NULL, '2025-07-28 12:25:53.950289+00', '2025-07-28 12:25:53.950657+00', '2025-07-28 12:25:53.950657+00', NULL, NULL, NULL);
INSERT INTO public.security_events VALUES (89, '06b9f257-2bad-4de6-ab33-9c8916b975e6', 'api_abuse', 'HIGH', 'ACTIVE', 'API Abuse Detected', 'Rapid API calls indicating automated abuse. Risk score: 10.0', '172.28.0.1', NULL, NULL, 10, 0.9, 'rule_based', 'API Abuse', 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/138.0.0.0 Safari/537.36', NULL, '{"event_type": "api_call", "ip_address": "172.28.0.1", "user_id": null, "user_agent": "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/138.0.0.0 Safari/537.36", "session_id": null, "timestamp": "2025-07-28T12:25:53.956842", "additional_data": {"method": "GET", "path": "/api/v1/documents", "status_code": 307, "request_size": 0, "referer": "http://localhost:3005/", "query_params": "size=5&sort_by=updated_at&sort_order=desc"}}', NULL, NULL, '2025-07-28 12:25:53.957857+00', '2025-07-28 12:25:53.958286+00', '2025-07-28 12:25:53.958287+00', NULL, NULL, NULL);
INSERT INTO public.security_events VALUES (90, '57ba3ba6-c139-4571-a7f0-89f50b20209b', 'api_abuse', 'HIGH', 'ACTIVE', 'API Abuse Detected', 'Rapid API calls indicating automated abuse. Risk score: 10.0', '172.28.0.1', NULL, NULL, 10, 0.9, 'rule_based', 'API Abuse', 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/138.0.0.0 Safari/537.36', NULL, '{"event_type": "api_call", "ip_address": "172.28.0.1", "user_id": null, "user_agent": "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/138.0.0.0 Safari/537.36", "session_id": null, "timestamp": "2025-07-28T12:25:53.969163", "additional_data": {"method": "GET", "path": "/api/v1/documents", "status_code": 307, "request_size": 0, "referer": "http://localhost:3005/", "query_params": "size=5&sort_by=updated_at&sort_order=desc"}}', NULL, NULL, '2025-07-28 12:25:53.969969+00', '2025-07-28 12:25:53.970451+00', '2025-07-28 12:25:53.970451+00', NULL, NULL, NULL);
INSERT INTO public.security_events VALUES (91, '87dae546-1bf3-4b55-a56a-84e44b3c79cf', 'api_abuse', 'HIGH', 'ACTIVE', 'API Abuse Detected', 'Rapid API calls indicating automated abuse. Risk score: 10.0', '172.28.0.1', NULL, NULL, 10, 0.9, 'rule_based', 'API Abuse', 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/138.0.0.0 Safari/537.36', NULL, '{"event_type": "api_call", "ip_address": "172.28.0.1", "user_id": null, "user_agent": "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/138.0.0.0 Safari/537.36", "session_id": null, "timestamp": "2025-07-28T12:26:04.718120", "additional_data": {"method": "GET", "path": "/api/v1/documents", "status_code": 307, "request_size": 0, "referer": "http://localhost:3005/", "query_params": "sort_by=name&sort_order=asc"}}', NULL, NULL, '2025-07-28 12:26:04.720696+00', '2025-07-28 12:26:04.722012+00', '2025-07-28 12:26:04.722014+00', NULL, NULL, NULL);
INSERT INTO public.security_events VALUES (93, '77cc7dc1-363e-4e40-abed-e495158c014c', 'api_abuse', 'HIGH', 'ACTIVE', 'API Abuse Detected', 'Rapid API calls indicating automated abuse. Risk score: 10.0', '172.28.0.1', NULL, NULL, 10, 0.9, 'rule_based', 'API Abuse', 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/138.0.0.0 Safari/537.36', NULL, '{"event_type": "api_call", "ip_address": "172.28.0.1", "user_id": null, "user_agent": "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/138.0.0.0 Safari/537.36", "session_id": null, "timestamp": "2025-07-28T12:26:06.136895", "additional_data": {"method": "GET", "path": "/api/v1/rbac/roles", "status_code": 200, "request_size": 0, "referer": "http://localhost:3005/", "query_params": "include_stats=true"}}', NULL, NULL, '2025-07-28 12:26:06.138333+00', '2025-07-28 12:26:06.139932+00', '2025-07-28 12:26:06.139932+00', NULL, NULL, NULL);
INSERT INTO public.security_events VALUES (94, '2bb485ac-1230-4365-9869-f63220ccb2ac', 'api_abuse', 'HIGH', 'ACTIVE', 'API Abuse Detected', 'Rapid API calls indicating automated abuse. Risk score: 10.0', '172.28.0.1', NULL, NULL, 10, 0.9, 'rule_based', 'API Abuse', 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/138.0.0.0 Safari/537.36', NULL, '{"event_type": "api_call", "ip_address": "172.28.0.1", "user_id": null, "user_agent": "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/138.0.0.0 Safari/537.36", "session_id": null, "timestamp": "2025-07-28T12:26:06.147649", "additional_data": {"method": "GET", "path": "/api/v1/documents", "status_code": 307, "request_size": 0, "referer": "http://localhost:3005/", "query_params": "size=5&sort_by=updated_at&sort_order=desc"}}', NULL, NULL, '2025-07-28 12:26:06.148595+00', '2025-07-28 12:26:06.149021+00', '2025-07-28 12:26:06.149022+00', NULL, NULL, NULL);
INSERT INTO public.security_events VALUES (98, 'bbaabbb0-6a9c-41b7-937a-45abf03403a5', 'api_abuse', 'HIGH', 'ACTIVE', 'API Abuse Detected', 'Rapid API calls indicating automated abuse. Risk score: 10.0', '172.28.0.1', NULL, NULL, 10, 0.9, 'rule_based', 'API Abuse', 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/138.0.0.0 Safari/537.36', NULL, '{"event_type": "api_call", "ip_address": "172.28.0.1", "user_id": null, "user_agent": "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/138.0.0.0 Safari/537.36", "session_id": null, "timestamp": "2025-07-28T12:26:47.041929", "additional_data": {"method": "GET", "path": "/api/v1/documents", "status_code": 307, "request_size": 0, "referer": "http://localhost:3005/", "query_params": "sort_by=name&sort_order=asc"}}', NULL, NULL, '2025-07-28 12:26:47.04323+00', '2025-07-28 12:26:47.043758+00', '2025-07-28 12:26:47.043759+00', NULL, NULL, NULL);
INSERT INTO public.security_events VALUES (100, 'bbddaf95-81f9-4846-8faf-9718c50ff51f', 'api_abuse', 'HIGH', 'ACTIVE', 'API Abuse Detected', 'Rapid API calls indicating automated abuse. Risk score: 10.0', '172.28.0.1', NULL, NULL, 10, 0.9, 'rule_based', 'API Abuse', 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/138.0.0.0 Safari/537.36', NULL, '{"event_type": "api_call", "ip_address": "172.28.0.1", "user_id": null, "user_agent": "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/138.0.0.0 Safari/537.36", "session_id": null, "timestamp": "2025-07-28T12:26:49.754981", "additional_data": {"method": "GET", "path": "/api/v1/admin/users", "status_code": 200, "request_size": 0, "referer": "http://localhost:3005/", "query_params": "page=1&size=20", "suspicion_score": 3.0}}', NULL, NULL, '2025-07-28 12:26:49.755873+00', '2025-07-28 12:26:49.756363+00', '2025-07-28 12:26:49.756364+00', NULL, NULL, NULL);
INSERT INTO public.security_events VALUES (101, '140e4259-2023-4da1-9f28-577697cc9931', 'api_abuse', 'HIGH', 'ACTIVE', 'API Abuse Detected', 'Rapid API calls indicating automated abuse. Risk score: 10.0', '172.28.0.1', NULL, NULL, 10, 0.9, 'rule_based', 'API Abuse', 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/138.0.0.0 Safari/537.36', NULL, '{"event_type": "api_call", "ip_address": "172.28.0.1", "user_id": null, "user_agent": "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/138.0.0.0 Safari/537.36", "session_id": null, "timestamp": "2025-07-28T12:26:52.805586", "additional_data": {"method": "GET", "path": "/api/v1/admin/users", "status_code": 200, "request_size": 0, "referer": "http://localhost:3005/", "query_params": "page=1&size=20", "suspicion_score": 3.0}}', NULL, NULL, '2025-07-28 12:26:52.80763+00', '2025-07-28 12:26:52.808069+00', '2025-07-28 12:26:52.80807+00', NULL, NULL, NULL);
INSERT INTO public.security_events VALUES (102, 'f1184b3c-fced-49d1-a7e9-546fbe3b28b6', 'api_abuse', 'HIGH', 'ACTIVE', 'API Abuse Detected', 'Rapid API calls indicating automated abuse. Risk score: 10.0', '172.28.0.1', NULL, NULL, 10, 0.9, 'rule_based', 'API Abuse', 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/138.0.0.0 Safari/537.36', NULL, '{"event_type": "api_call", "ip_address": "172.28.0.1", "user_id": null, "user_agent": "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/138.0.0.0 Safari/537.36", "session_id": null, "timestamp": "2025-07-28T12:26:52.812201", "additional_data": {"method": "GET", "path": "/api/auth/me", "status_code": 200, "request_size": 0, "referer": "http://localhost:3005/", "query_params": null}}', NULL, NULL, '2025-07-28 12:26:52.814079+00', '2025-07-28 12:26:52.814483+00', '2025-07-28 12:26:52.814484+00', NULL, NULL, NULL);
INSERT INTO public.security_events VALUES (104, '1798747a-7438-4852-9e9a-0ecdaa9cf5ac', 'api_abuse', 'HIGH', 'ACTIVE', 'API Abuse Detected', 'Rapid API calls indicating automated abuse. Risk score: 10.0', '172.28.0.1', NULL, NULL, 10, 0.9, 'rule_based', 'API Abuse', 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/138.0.0.0 Safari/537.36', NULL, '{"event_type": "api_call", "ip_address": "172.28.0.1", "user_id": null, "user_agent": "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/138.0.0.0 Safari/537.36", "session_id": null, "timestamp": "2025-07-28T12:26:52.829093", "additional_data": {"method": "GET", "path": "/api/v1/admin/users", "status_code": 200, "request_size": 0, "referer": "http://localhost:3005/", "query_params": "page=1&size=20", "suspicion_score": 3.0}}', NULL, NULL, '2025-07-28 12:26:52.829876+00', '2025-07-28 12:26:52.830275+00', '2025-07-28 12:26:52.830276+00', NULL, NULL, NULL);
INSERT INTO public.security_events VALUES (129, '62969e1a-f7cc-4e65-b0e0-07a79a034da9', 'api_abuse', 'HIGH', 'ACTIVE', 'API Abuse Detected', 'Rapid API calls indicating automated abuse. Risk score: 10.0', '172.28.0.1', NULL, NULL, 10, 0.9, 'rule_based', 'API Abuse', 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/138.0.0.0 Safari/537.36', NULL, '{"event_type": "api_call", "ip_address": "172.28.0.1", "user_id": null, "user_agent": "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/138.0.0.0 Safari/537.36", "session_id": null, "timestamp": "2025-07-28T12:27:22.625683", "additional_data": {"method": "GET", "path": "/api/v1/rbac/users/3/permissions", "status_code": 200, "request_size": 0, "referer": "http://localhost:3005/", "query_params": null}}', NULL, NULL, '2025-07-28 12:27:22.627044+00', '2025-07-28 12:27:22.627509+00', '2025-07-28 12:27:22.62751+00', NULL, NULL, NULL);
INSERT INTO public.security_events VALUES (131, '3a050db3-9444-41a1-92e5-76628a1927e0', 'api_abuse', 'HIGH', 'ACTIVE', 'API Abuse Detected', 'Rapid API calls indicating automated abuse. Risk score: 10.0', '172.28.0.1', NULL, NULL, 10, 0.9, 'rule_based', 'API Abuse', 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/138.0.0.0 Safari/537.36', NULL, '{"event_type": "api_call", "ip_address": "172.28.0.1", "user_id": null, "user_agent": "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/138.0.0.0 Safari/537.36", "session_id": null, "timestamp": "2025-07-28T12:27:22.640074", "additional_data": {"method": "GET", "path": "/api/v1/rbac/users/3/permission-summary", "status_code": 200, "request_size": 0, "referer": "http://localhost:3005/", "query_params": null}}', NULL, NULL, '2025-07-28 12:27:22.641492+00', '2025-07-28 12:27:22.6419+00', '2025-07-28 12:27:22.6419+00', NULL, NULL, NULL);
INSERT INTO public.security_events VALUES (103, '6c8a7916-fb02-4ba4-b4ed-836796503615', 'api_abuse', 'HIGH', 'ACTIVE', 'API Abuse Detected', 'Rapid API calls indicating automated abuse. Risk score: 10.0', '172.28.0.1', NULL, NULL, 10, 0.9, 'rule_based', 'API Abuse', 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/138.0.0.0 Safari/537.36', NULL, '{"event_type": "api_call", "ip_address": "172.28.0.1", "user_id": null, "user_agent": "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/138.0.0.0 Safari/537.36", "session_id": null, "timestamp": "2025-07-28T12:26:52.819087", "additional_data": {"method": "GET", "path": "/api/v1/rbac/users/3/permissions", "status_code": 200, "request_size": 0, "referer": "http://localhost:3005/", "query_params": null}}', NULL, NULL, '2025-07-28 12:26:52.820311+00', '2025-07-28 12:26:52.820712+00', '2025-07-28 12:26:52.820713+00', NULL, NULL, NULL);
INSERT INTO public.security_events VALUES (108, 'fde7156b-2b75-4b82-8247-1704a0190248', 'api_abuse', 'HIGH', 'ACTIVE', 'API Abuse Detected', 'Rapid API calls indicating automated abuse. Risk score: 10.0', '172.28.0.1', NULL, NULL, 10, 0.9, 'rule_based', 'API Abuse', 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/138.0.0.0 Safari/537.36', NULL, '{"event_type": "api_call", "ip_address": "172.28.0.1", "user_id": null, "user_agent": "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/138.0.0.0 Safari/537.36", "session_id": null, "timestamp": "2025-07-28T12:26:52.863166", "additional_data": {"method": "GET", "path": "/api/v1/rbac/users/3/permission-summary", "status_code": 200, "request_size": 0, "referer": "http://localhost:3005/", "query_params": null}}', NULL, NULL, '2025-07-28 12:26:52.863963+00', '2025-07-28 12:26:52.8643+00', '2025-07-28 12:26:52.864301+00', NULL, NULL, NULL);
INSERT INTO public.security_events VALUES (119, 'ad0d3c67-45fa-44a8-b8df-4f92b1c98500', 'api_abuse', 'HIGH', 'ACTIVE', 'API Abuse Detected', 'Rapid API calls indicating automated abuse. Risk score: 10.0', '172.28.0.1', NULL, NULL, 10, 0.9, 'rule_based', 'API Abuse', 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/138.0.0.0 Safari/537.36', NULL, '{"event_type": "api_call", "ip_address": "172.28.0.1", "user_id": null, "user_agent": "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/138.0.0.0 Safari/537.36", "session_id": null, "timestamp": "2025-07-28T12:27:08.709002", "additional_data": {"method": "DELETE", "path": "/api/v1/admin/users/11", "status_code": 204, "request_size": 0, "referer": "http://localhost:3005/", "query_params": null, "suspicion_score": 3.0}}', NULL, NULL, '2025-07-28 12:27:08.711179+00', '2025-07-28 12:27:08.712036+00', '2025-07-28 12:27:08.712037+00', NULL, NULL, NULL);
INSERT INTO public.security_events VALUES (138, 'bab75bdb-9485-4176-a2b0-783f5cb43500', 'api_abuse', 'HIGH', 'ACTIVE', 'API Abuse Detected', 'Rapid API calls indicating automated abuse. Risk score: 10.0', '172.28.0.1', NULL, NULL, 10, 0.9, 'rule_based', 'API Abuse', 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/138.0.0.0 Safari/537.36', NULL, '{"event_type": "api_call", "ip_address": "172.28.0.1", "user_id": null, "user_agent": "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/138.0.0.0 Safari/537.36", "session_id": null, "timestamp": "2025-07-28T12:27:42.712865", "additional_data": {"method": "GET", "path": "/api/v1/rbac/roles", "status_code": 200, "request_size": 0, "referer": "http://localhost:3005/", "query_params": "page=1&size=10&include_stats=true&active_only=true"}}', NULL, NULL, '2025-07-28 12:27:42.713805+00', '2025-07-28 12:27:42.71436+00', '2025-07-28 12:27:42.714362+00', NULL, NULL, NULL);
INSERT INTO public.security_events VALUES (144, '0618e059-8314-48d9-8be0-8c7caab19096', 'api_abuse', 'HIGH', 'ACTIVE', 'API Abuse Detected', 'Rapid API calls indicating automated abuse. Risk score: 10.0', '172.28.0.1', NULL, NULL, 10, 0.9, 'rule_based', 'API Abuse', 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/138.0.0.0 Safari/537.36', NULL, '{"event_type": "api_call", "ip_address": "172.28.0.1", "user_id": null, "user_agent": "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/138.0.0.0 Safari/537.36", "session_id": null, "timestamp": "2025-07-28T12:28:28.030412", "additional_data": {"method": "GET", "path": "/api/v1/encryption/keys", "status_code": 200, "request_size": 0, "referer": "http://localhost:3005/", "query_params": null}}', NULL, NULL, '2025-07-28 12:28:28.031729+00', '2025-07-28 12:28:28.032597+00', '2025-07-28 12:28:28.032598+00', NULL, NULL, NULL);
INSERT INTO public.security_events VALUES (146, '726833ae-a14a-478e-adb0-47ca0bf764e9', 'api_abuse', 'HIGH', 'ACTIVE', 'API Abuse Detected', 'Rapid API calls indicating automated abuse. Risk score: 10.0', '172.28.0.1', NULL, NULL, 10, 0.9, 'rule_based', 'API Abuse', 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/138.0.0.0 Safari/537.36', NULL, '{"event_type": "api_call", "ip_address": "172.28.0.1", "user_id": null, "user_agent": "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/138.0.0.0 Safari/537.36", "session_id": null, "timestamp": "2025-07-28T12:28:28.055815", "additional_data": {"method": "GET", "path": "/api/v1/encryption/keys", "status_code": 200, "request_size": 0, "referer": "http://localhost:3005/", "query_params": null}}', NULL, NULL, '2025-07-28 12:28:28.057059+00', '2025-07-28 12:28:28.058421+00', '2025-07-28 12:28:28.058422+00', NULL, NULL, NULL);
INSERT INTO public.security_events VALUES (147, '591d2291-3f67-45fb-8382-325934c3fb2f', 'api_abuse', 'HIGH', 'ACTIVE', 'API Abuse Detected', 'Rapid API calls indicating automated abuse. Risk score: 10.0', '172.28.0.1', NULL, NULL, 10, 0.9, 'rule_based', 'API Abuse', 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/138.0.0.0 Safari/537.36', NULL, '{"event_type": "api_call", "ip_address": "172.28.0.1", "user_id": null, "user_agent": "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/138.0.0.0 Safari/537.36", "session_id": null, "timestamp": "2025-07-28T12:28:32.808561", "additional_data": {"method": "GET", "path": "/api/v1/admin/system/metrics", "status_code": 200, "request_size": 0, "referer": "http://localhost:3005/", "query_params": "hours=24", "suspicion_score": 3.0}}', NULL, NULL, '2025-07-28 12:28:32.812588+00', '2025-07-28 12:28:32.813714+00', '2025-07-28 12:28:32.813714+00', NULL, NULL, NULL);
INSERT INTO public.security_events VALUES (105, 'e295a8a2-09f2-4852-b16f-31c1f7058adf', 'api_abuse', 'HIGH', 'ACTIVE', 'API Abuse Detected', 'Rapid API calls indicating automated abuse. Risk score: 10.0', '172.28.0.1', NULL, NULL, 10, 0.9, 'rule_based', 'API Abuse', 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/138.0.0.0 Safari/537.36', NULL, '{"event_type": "api_call", "ip_address": "172.28.0.1", "user_id": null, "user_agent": "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/138.0.0.0 Safari/537.36", "session_id": null, "timestamp": "2025-07-28T12:26:52.840988", "additional_data": {"method": "GET", "path": "/api/auth/me", "status_code": 200, "request_size": 0, "referer": "http://localhost:3005/", "query_params": null}}', NULL, NULL, '2025-07-28 12:26:52.84182+00', '2025-07-28 12:26:52.842164+00', '2025-07-28 12:26:52.842165+00', NULL, NULL, NULL);
INSERT INTO public.security_events VALUES (106, '3220708d-9c67-4766-b622-53aac1f5e2df', 'api_abuse', 'HIGH', 'ACTIVE', 'API Abuse Detected', 'Rapid API calls indicating automated abuse. Risk score: 10.0', '172.28.0.1', NULL, NULL, 10, 0.9, 'rule_based', 'API Abuse', 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/138.0.0.0 Safari/537.36', NULL, '{"event_type": "api_call", "ip_address": "172.28.0.1", "user_id": null, "user_agent": "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/138.0.0.0 Safari/537.36", "session_id": null, "timestamp": "2025-07-28T12:26:52.848621", "additional_data": {"method": "GET", "path": "/api/v1/rbac/users/3/permission-summary", "status_code": 200, "request_size": 0, "referer": "http://localhost:3005/", "query_params": null}}', NULL, NULL, '2025-07-28 12:26:52.849647+00', '2025-07-28 12:26:52.850088+00', '2025-07-28 12:26:52.850089+00', NULL, NULL, NULL);
INSERT INTO public.security_events VALUES (107, 'e9ccfcb5-a57c-4c44-96d6-7fb8f9b0a7d1', 'api_abuse', 'HIGH', 'ACTIVE', 'API Abuse Detected', 'Rapid API calls indicating automated abuse. Risk score: 10.0', '172.28.0.1', NULL, NULL, 10, 0.9, 'rule_based', 'API Abuse', 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/138.0.0.0 Safari/537.36', NULL, '{"event_type": "api_call", "ip_address": "172.28.0.1", "user_id": null, "user_agent": "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/138.0.0.0 Safari/537.36", "session_id": null, "timestamp": "2025-07-28T12:26:52.848808", "additional_data": {"method": "GET", "path": "/api/v1/rbac/users/3/permissions", "status_code": 200, "request_size": 0, "referer": "http://localhost:3005/", "query_params": null}}', NULL, NULL, '2025-07-28 12:26:52.85387+00', '2025-07-28 12:26:52.854189+00', '2025-07-28 12:26:52.85419+00', NULL, NULL, NULL);
INSERT INTO public.security_events VALUES (111, 'cdf7994f-5d14-4517-b557-41783e1f01af', 'api_abuse', 'HIGH', 'ACTIVE', 'API Abuse Detected', 'Rapid API calls indicating automated abuse. Risk score: 10.0', '172.28.0.1', NULL, NULL, 10, 0.9, 'rule_based', 'API Abuse', 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/138.0.0.0 Safari/537.36', NULL, '{"event_type": "api_call", "ip_address": "172.28.0.1", "user_id": null, "user_agent": "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/138.0.0.0 Safari/537.36", "session_id": null, "timestamp": "2025-07-28T12:26:58.442892", "additional_data": {"method": "GET", "path": "/api/v1/admin/users", "status_code": 200, "request_size": 0, "referer": "http://localhost:3005/", "query_params": "page=1&size=20", "suspicion_score": 3.0}}', NULL, NULL, '2025-07-28 12:26:58.448115+00', '2025-07-28 12:26:58.448516+00', '2025-07-28 12:26:58.448517+00', NULL, NULL, NULL);
INSERT INTO public.security_events VALUES (114, 'ce8cdf18-6e36-47d1-bd66-0ceb992fc1f0', 'api_abuse', 'HIGH', 'ACTIVE', 'API Abuse Detected', 'Rapid API calls indicating automated abuse. Risk score: 10.0', '172.28.0.1', NULL, NULL, 10, 0.9, 'rule_based', 'API Abuse', 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/138.0.0.0 Safari/537.36', NULL, '{"event_type": "api_call", "ip_address": "172.28.0.1", "user_id": null, "user_agent": "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/138.0.0.0 Safari/537.36", "session_id": null, "timestamp": "2025-07-28T12:26:58.479359", "additional_data": {"method": "GET", "path": "/api/v1/rbac/users/3/permissions", "status_code": 200, "request_size": 0, "referer": "http://localhost:3005/", "query_params": null}}', NULL, NULL, '2025-07-28 12:26:58.480248+00', '2025-07-28 12:26:58.480609+00', '2025-07-28 12:26:58.48061+00', NULL, NULL, NULL);
INSERT INTO public.security_events VALUES (120, 'ee8189a5-6588-413d-bf90-389d0cceb14b', 'api_abuse', 'HIGH', 'ACTIVE', 'API Abuse Detected', 'Rapid API calls indicating automated abuse. Risk score: 10.0', '172.28.0.1', NULL, NULL, 10, 0.9, 'rule_based', 'API Abuse', 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/138.0.0.0 Safari/537.36', NULL, '{"event_type": "api_call", "ip_address": "172.28.0.1", "user_id": null, "user_agent": "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/138.0.0.0 Safari/537.36", "session_id": null, "timestamp": "2025-07-28T12:27:08.731750", "additional_data": {"method": "GET", "path": "/api/v1/admin/users", "status_code": 200, "request_size": 0, "referer": "http://localhost:3005/", "query_params": "page=1&size=20", "suspicion_score": 3.0}}', NULL, NULL, '2025-07-28 12:27:08.733706+00', '2025-07-28 12:27:08.734804+00', '2025-07-28 12:27:08.734806+00', NULL, NULL, NULL);
INSERT INTO public.security_events VALUES (123, 'ac831b4c-0476-4030-a30d-d649d5e2388a', 'api_abuse', 'HIGH', 'ACTIVE', 'API Abuse Detected', 'Rapid API calls indicating automated abuse. Risk score: 10.0', '172.28.0.1', NULL, NULL, 10, 0.9, 'rule_based', 'API Abuse', 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/138.0.0.0 Safari/537.36', NULL, '{"event_type": "api_call", "ip_address": "172.28.0.1", "user_id": null, "user_agent": "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/138.0.0.0 Safari/537.36", "session_id": null, "timestamp": "2025-07-28T12:27:13.925704", "additional_data": {"method": "GET", "path": "/api/v1/admin/users", "status_code": 200, "request_size": 0, "referer": "http://localhost:3005/", "query_params": "page=1&size=20", "suspicion_score": 3.0}}', NULL, NULL, '2025-07-28 12:27:13.926584+00', '2025-07-28 12:27:13.926984+00', '2025-07-28 12:27:13.926984+00', NULL, NULL, NULL);
INSERT INTO public.security_events VALUES (124, 'f3513544-07c3-4d0e-8ee6-b42de1e93409', 'api_abuse', 'HIGH', 'ACTIVE', 'API Abuse Detected', 'Rapid API calls indicating automated abuse. Risk score: 10.0', '172.28.0.1', NULL, NULL, 10, 0.9, 'rule_based', 'API Abuse', 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/138.0.0.0 Safari/537.36', NULL, '{"event_type": "api_call", "ip_address": "172.28.0.1", "user_id": null, "user_agent": "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/138.0.0.0 Safari/537.36", "session_id": null, "timestamp": "2025-07-28T12:27:19.926228", "additional_data": {"method": "DELETE", "path": "/api/v1/admin/users/10", "status_code": 204, "request_size": 0, "referer": "http://localhost:3005/", "query_params": null, "suspicion_score": 3.0}}', NULL, NULL, '2025-07-28 12:27:19.929207+00', '2025-07-28 12:27:19.930773+00', '2025-07-28 12:27:19.930776+00', NULL, NULL, NULL);
INSERT INTO public.security_events VALUES (126, 'b952563e-9d13-4731-bc7d-6d8a15eee483', 'api_abuse', 'HIGH', 'ACTIVE', 'API Abuse Detected', 'Rapid API calls indicating automated abuse. Risk score: 10.0', '172.28.0.1', NULL, NULL, 10, 0.9, 'rule_based', 'API Abuse', 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/138.0.0.0 Safari/537.36', NULL, '{"event_type": "api_call", "ip_address": "172.28.0.1", "user_id": null, "user_agent": "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/138.0.0.0 Safari/537.36", "session_id": null, "timestamp": "2025-07-28T12:27:22.598512", "additional_data": {"method": "GET", "path": "/api/v1/rbac/users/3/permissions", "status_code": 200, "request_size": 0, "referer": "http://localhost:3005/", "query_params": null}}', NULL, NULL, '2025-07-28 12:27:22.60027+00', '2025-07-28 12:27:22.600705+00', '2025-07-28 12:27:22.600706+00', NULL, NULL, NULL);
INSERT INTO public.security_events VALUES (109, 'eb877c20-faa8-4263-9813-d90208f73180', 'api_abuse', 'HIGH', 'ACTIVE', 'API Abuse Detected', 'Rapid API calls indicating automated abuse. Risk score: 10.0', '172.28.0.1', NULL, NULL, 10, 0.9, 'rule_based', 'API Abuse', 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/138.0.0.0 Safari/537.36', NULL, '{"event_type": "api_call", "ip_address": "172.28.0.1", "user_id": null, "user_agent": "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/138.0.0.0 Safari/537.36", "session_id": null, "timestamp": "2025-07-28T12:26:58.437256", "additional_data": {"method": "GET", "path": "/api/auth/me", "status_code": 200, "request_size": 0, "referer": "http://localhost:3005/", "query_params": null}}', NULL, NULL, '2025-07-28 12:26:58.438831+00', '2025-07-28 12:26:58.439251+00', '2025-07-28 12:26:58.439252+00', NULL, NULL, NULL);
INSERT INTO public.security_events VALUES (116, '148328a6-ca17-4ba0-8127-85984535112c', 'api_abuse', 'HIGH', 'ACTIVE', 'API Abuse Detected', 'Rapid API calls indicating automated abuse. Risk score: 10.0', '172.28.0.1', NULL, NULL, 10, 0.9, 'rule_based', 'API Abuse', 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/138.0.0.0 Safari/537.36', NULL, '{"event_type": "api_call", "ip_address": "172.28.0.1", "user_id": null, "user_agent": "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/138.0.0.0 Safari/537.36", "session_id": null, "timestamp": "2025-07-28T12:26:58.493714", "additional_data": {"method": "GET", "path": "/api/v1/rbac/users/3/permission-summary", "status_code": 200, "request_size": 0, "referer": "http://localhost:3005/", "query_params": null}}', NULL, NULL, '2025-07-28 12:26:58.494502+00', '2025-07-28 12:26:58.495024+00', '2025-07-28 12:26:58.495024+00', NULL, NULL, NULL);
INSERT INTO public.security_events VALUES (118, '2da55855-38cb-447a-8fb2-0d694c0047c0', 'api_abuse', 'HIGH', 'ACTIVE', 'API Abuse Detected', 'Rapid API calls indicating automated abuse. Risk score: 10.0', '172.28.0.1', NULL, NULL, 10, 0.9, 'rule_based', 'API Abuse', 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/138.0.0.0 Safari/537.36', NULL, '{"event_type": "api_call", "ip_address": "172.28.0.1", "user_id": null, "user_agent": "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/138.0.0.0 Safari/537.36", "session_id": null, "timestamp": "2025-07-28T12:27:04.204567", "additional_data": {"method": "GET", "path": "/api/v1/admin/users", "status_code": 200, "request_size": 0, "referer": "http://localhost:3005/", "query_params": "page=1&size=20", "suspicion_score": 3.0}}', NULL, NULL, '2025-07-28 12:27:04.205667+00', '2025-07-28 12:27:04.206036+00', '2025-07-28 12:27:04.206037+00', NULL, NULL, NULL);
INSERT INTO public.security_events VALUES (121, 'b0a2fe67-163a-4455-9230-d152b762a94f', 'api_abuse', 'HIGH', 'ACTIVE', 'API Abuse Detected', 'Rapid API calls indicating automated abuse. Risk score: 10.0', '172.28.0.1', NULL, NULL, 10, 0.9, 'rule_based', 'API Abuse', 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/138.0.0.0 Safari/537.36', NULL, '{"event_type": "api_call", "ip_address": "172.28.0.1", "user_id": null, "user_agent": "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/138.0.0.0 Safari/537.36", "session_id": null, "timestamp": "2025-07-28T12:27:13.603386", "additional_data": {"method": "DELETE", "path": "/api/v1/admin/users/10", "status_code": 204, "request_size": 0, "referer": "http://localhost:3005/", "query_params": null, "suspicion_score": 3.0}}', NULL, NULL, '2025-07-28 12:27:13.60687+00', '2025-07-28 12:27:13.609033+00', '2025-07-28 12:27:13.609036+00', NULL, NULL, NULL);
INSERT INTO public.security_events VALUES (128, '9abe6270-9c35-4bcf-b9f2-965f2c62a5ac', 'api_abuse', 'HIGH', 'ACTIVE', 'API Abuse Detected', 'Rapid API calls indicating automated abuse. Risk score: 10.0', '172.28.0.1', NULL, NULL, 10, 0.9, 'rule_based', 'API Abuse', 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/138.0.0.0 Safari/537.36', NULL, '{"event_type": "api_call", "ip_address": "172.28.0.1", "user_id": null, "user_agent": "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/138.0.0.0 Safari/537.36", "session_id": null, "timestamp": "2025-07-28T12:27:22.606661", "additional_data": {"method": "GET", "path": "/api/auth/me", "status_code": 200, "request_size": 0, "referer": "http://localhost:3005/", "query_params": null}}', NULL, NULL, '2025-07-28 12:27:22.607562+00', '2025-07-28 12:27:22.608403+00', '2025-07-28 12:27:22.608403+00', NULL, NULL, NULL);
INSERT INTO public.security_events VALUES (130, '77b875fc-6349-460f-ad34-0d6c7b4326c6', 'api_abuse', 'HIGH', 'ACTIVE', 'API Abuse Detected', 'Rapid API calls indicating automated abuse. Risk score: 10.0', '172.28.0.1', NULL, NULL, 10, 0.9, 'rule_based', 'API Abuse', 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/138.0.0.0 Safari/537.36', NULL, '{"event_type": "api_call", "ip_address": "172.28.0.1", "user_id": null, "user_agent": "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/138.0.0.0 Safari/537.36", "session_id": null, "timestamp": "2025-07-28T12:27:22.630517", "additional_data": {"method": "GET", "path": "/api/v1/admin/users", "status_code": 200, "request_size": 0, "referer": "http://localhost:3005/", "query_params": "page=1&size=20", "suspicion_score": 3.0}}', NULL, NULL, '2025-07-28 12:27:22.63553+00', '2025-07-28 12:27:22.635952+00', '2025-07-28 12:27:22.635953+00', NULL, NULL, NULL);
INSERT INTO public.security_events VALUES (133, '489939f5-938b-4318-9008-3f7aa64220f1', 'api_abuse', 'HIGH', 'ACTIVE', 'API Abuse Detected', 'Rapid API calls indicating automated abuse. Risk score: 10.0', '172.28.0.1', NULL, NULL, 10, 0.9, 'rule_based', 'API Abuse', 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/138.0.0.0 Safari/537.36', NULL, '{"event_type": "api_call", "ip_address": "172.28.0.1", "user_id": null, "user_agent": "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/138.0.0.0 Safari/537.36", "session_id": null, "timestamp": "2025-07-28T12:27:22.659597", "additional_data": {"method": "GET", "path": "/api/v1/rbac/users/3/permission-summary", "status_code": 200, "request_size": 0, "referer": "http://localhost:3005/", "query_params": null}}', NULL, NULL, '2025-07-28 12:27:22.660525+00', '2025-07-28 12:27:22.660976+00', '2025-07-28 12:27:22.660977+00', NULL, NULL, NULL);
INSERT INTO public.security_events VALUES (152, '5c7c63a1-c17c-4623-bc45-8c2d10b15e49', 'api_abuse', 'HIGH', 'ACTIVE', 'API Abuse Detected', 'Rapid API calls indicating automated abuse. Risk score: 10.0', '172.28.0.1', NULL, NULL, 10, 0.9, 'rule_based', 'API Abuse', 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/138.0.0.0 Safari/537.36', NULL, '{"event_type": "api_call", "ip_address": "172.28.0.1", "user_id": null, "user_agent": "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/138.0.0.0 Safari/537.36", "session_id": null, "timestamp": "2025-07-28T12:28:34.907754", "additional_data": {"method": "GET", "path": "/api/v1/admin/audit/logs", "status_code": 200, "request_size": 0, "referer": "http://localhost:3005/", "query_params": "page=1&size=10", "suspicion_score": 3.0}}', NULL, NULL, '2025-07-28 12:28:34.908459+00', '2025-07-28 12:28:34.908878+00', '2025-07-28 12:28:34.908879+00', NULL, NULL, NULL);
INSERT INTO public.security_events VALUES (154, '817ada5e-0940-408e-b819-74b97dc98586', 'api_abuse', 'HIGH', 'ACTIVE', 'API Abuse Detected', 'Rapid API calls indicating automated abuse. Risk score: 10.0', '172.28.0.1', NULL, NULL, 10, 0.9, 'rule_based', 'API Abuse', 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/138.0.0.0 Safari/537.36', NULL, '{"event_type": "api_call", "ip_address": "172.28.0.1", "user_id": null, "user_agent": "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/138.0.0.0 Safari/537.36", "session_id": null, "timestamp": "2025-07-28T12:28:40.198309", "additional_data": {"method": "GET", "path": "/api/v1/admin/system/metrics", "status_code": 200, "request_size": 0, "referer": "http://localhost:3005/", "query_params": "hours=24", "suspicion_score": 3.0}}', NULL, NULL, '2025-07-28 12:28:40.205694+00', '2025-07-28 12:28:40.207617+00', '2025-07-28 12:28:40.207621+00', NULL, NULL, NULL);
INSERT INTO public.security_events VALUES (125, 'f9496b33-e8dd-496e-b948-250287f55c70', 'api_abuse', 'HIGH', 'ACTIVE', 'API Abuse Detected', 'Rapid API calls indicating automated abuse. Risk score: 10.0', '172.28.0.1', NULL, NULL, 10, 0.9, 'rule_based', 'API Abuse', 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/138.0.0.0 Safari/537.36', NULL, '{"event_type": "api_call", "ip_address": "172.28.0.1", "user_id": null, "user_agent": "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/138.0.0.0 Safari/537.36", "session_id": null, "timestamp": "2025-07-28T12:27:19.944229", "additional_data": {"method": "GET", "path": "/api/v1/admin/users", "status_code": 200, "request_size": 0, "referer": "http://localhost:3005/", "query_params": "page=1&size=20", "suspicion_score": 3.0}}', NULL, NULL, '2025-07-28 12:27:19.945199+00', '2025-07-28 12:27:19.945712+00', '2025-07-28 12:27:19.945713+00', NULL, NULL, NULL);
INSERT INTO public.security_events VALUES (127, '1602f9b7-ce79-4195-abcd-9d91090ade85', 'api_abuse', 'HIGH', 'ACTIVE', 'API Abuse Detected', 'Rapid API calls indicating automated abuse. Risk score: 10.0', '172.28.0.1', NULL, NULL, 10, 0.9, 'rule_based', 'API Abuse', 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/138.0.0.0 Safari/537.36', NULL, '{"event_type": "api_call", "ip_address": "172.28.0.1", "user_id": null, "user_agent": "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/138.0.0.0 Safari/537.36", "session_id": null, "timestamp": "2025-07-28T12:27:22.598916", "additional_data": {"method": "GET", "path": "/api/v1/admin/users", "status_code": 200, "request_size": 0, "referer": "http://localhost:3005/", "query_params": "page=1&size=20", "suspicion_score": 3.0}}', NULL, NULL, '2025-07-28 12:27:22.604006+00', '2025-07-28 12:27:22.604351+00', '2025-07-28 12:27:22.604351+00', NULL, NULL, NULL);
INSERT INTO public.security_events VALUES (135, 'f32b2cce-e018-4d06-bc77-4491fbe5329e', 'api_abuse', 'HIGH', 'ACTIVE', 'API Abuse Detected', 'Rapid API calls indicating automated abuse. Risk score: 10.0', '172.28.0.1', NULL, NULL, 10, 0.9, 'rule_based', 'API Abuse', 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/138.0.0.0 Safari/537.36', NULL, '{"event_type": "api_call", "ip_address": "172.28.0.1", "user_id": null, "user_agent": "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/138.0.0.0 Safari/537.36", "session_id": null, "timestamp": "2025-07-28T12:27:32.203701", "additional_data": {"method": "GET", "path": "/api/v1/admin/users", "status_code": 200, "request_size": 0, "referer": "http://localhost:3005/", "query_params": "page=1&size=20", "suspicion_score": 3.0}}', NULL, NULL, '2025-07-28 12:27:32.204596+00', '2025-07-28 12:27:32.204908+00', '2025-07-28 12:27:32.204908+00', NULL, NULL, NULL);
INSERT INTO public.security_events VALUES (145, '8215ef78-710f-4f23-928a-e433c9e421a9', 'api_abuse', 'HIGH', 'ACTIVE', 'API Abuse Detected', 'Rapid API calls indicating automated abuse. Risk score: 10.0', '172.28.0.1', NULL, NULL, 10, 0.9, 'rule_based', 'API Abuse', 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/138.0.0.0 Safari/537.36', NULL, '{"event_type": "api_call", "ip_address": "172.28.0.1", "user_id": null, "user_agent": "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/138.0.0.0 Safari/537.36", "session_id": null, "timestamp": "2025-07-28T12:28:28.037802", "additional_data": {"method": "GET", "path": "/api/v1/encryption/keys/all", "status_code": 404, "request_size": 0, "referer": "http://localhost:3005/", "query_params": null}}', NULL, NULL, '2025-07-28 12:28:28.039381+00', '2025-07-28 12:28:28.039855+00', '2025-07-28 12:28:28.039856+00', NULL, NULL, NULL);
INSERT INTO public.security_events VALUES (149, '76f90ac9-e173-4396-b7ab-99d433a92f40', 'api_abuse', 'HIGH', 'ACTIVE', 'API Abuse Detected', 'Rapid API calls indicating automated abuse. Risk score: 10.0', '172.28.0.1', NULL, NULL, 10, 0.9, 'rule_based', 'API Abuse', 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/138.0.0.0 Safari/537.36', NULL, '{"event_type": "api_call", "ip_address": "172.28.0.1", "user_id": null, "user_agent": "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/138.0.0.0 Safari/537.36", "session_id": null, "timestamp": "2025-07-28T12:28:32.829044", "additional_data": {"method": "GET", "path": "/api/v1/admin/audit/logs", "status_code": 200, "request_size": 0, "referer": "http://localhost:3005/", "query_params": "page=1&size=10", "suspicion_score": 3.0}}', NULL, NULL, '2025-07-28 12:28:32.83238+00', '2025-07-28 12:28:32.833852+00', '2025-07-28 12:28:32.833854+00', NULL, NULL, NULL);
INSERT INTO public.security_events VALUES (157, '8ae4586c-c0b6-4e3e-94f3-7f60cc496a3e', 'api_abuse', 'HIGH', 'ACTIVE', 'API Abuse Detected', 'Rapid API calls indicating automated abuse. Risk score: 10.0', '172.28.0.1', NULL, NULL, 10, 0.9, 'rule_based', 'API Abuse', 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/138.0.0.0 Safari/537.36', NULL, '{"event_type": "api_call", "ip_address": "172.28.0.1", "user_id": null, "user_agent": "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/138.0.0.0 Safari/537.36", "session_id": null, "timestamp": "2025-07-28T12:28:41.276790", "additional_data": {"method": "GET", "path": "/api/v1/admin/system/metrics", "status_code": 200, "request_size": 0, "referer": "http://localhost:3005/", "query_params": "hours=24", "suspicion_score": 3.0}}', NULL, NULL, '2025-07-28 12:28:41.278096+00', '2025-07-28 12:28:41.278656+00', '2025-07-28 12:28:41.278656+00', NULL, NULL, NULL);
INSERT INTO public.security_events VALUES (132, 'fbb48ae9-8e5e-44d4-bc6c-0286ee6f95e2', 'api_abuse', 'HIGH', 'ACTIVE', 'API Abuse Detected', 'Rapid API calls indicating automated abuse. Risk score: 10.0', '172.28.0.1', NULL, NULL, 10, 0.9, 'rule_based', 'API Abuse', 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/138.0.0.0 Safari/537.36', NULL, '{"event_type": "api_call", "ip_address": "172.28.0.1", "user_id": null, "user_agent": "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/138.0.0.0 Safari/537.36", "session_id": null, "timestamp": "2025-07-28T12:27:22.640522", "additional_data": {"method": "GET", "path": "/api/auth/me", "status_code": 200, "request_size": 0, "referer": "http://localhost:3005/", "query_params": null}}', NULL, NULL, '2025-07-28 12:27:22.64503+00', '2025-07-28 12:27:22.64537+00', '2025-07-28 12:27:22.64537+00', NULL, NULL, NULL);
INSERT INTO public.security_events VALUES (134, 'a6f7e608-c79d-4f71-baf5-0cd2397099d4', 'api_abuse', 'HIGH', 'ACTIVE', 'API Abuse Detected', 'Rapid API calls indicating automated abuse. Risk score: 10.0', '172.28.0.1', NULL, NULL, 10, 0.9, 'rule_based', 'API Abuse', 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/138.0.0.0 Safari/537.36', NULL, '{"event_type": "api_call", "ip_address": "172.28.0.1", "user_id": null, "user_agent": "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/138.0.0.0 Safari/537.36", "session_id": null, "timestamp": "2025-07-28T12:27:32.187807", "additional_data": {"method": "DELETE", "path": "/api/v1/admin/users/9", "status_code": 204, "request_size": 0, "referer": "http://localhost:3005/", "query_params": null, "suspicion_score": 3.0}}', NULL, NULL, '2025-07-28 12:27:32.189789+00', '2025-07-28 12:27:32.190441+00', '2025-07-28 12:27:32.190442+00', NULL, NULL, NULL);
INSERT INTO public.security_events VALUES (136, '172237b0-9d7b-4bbd-901c-1e9778b7bf88', 'api_abuse', 'HIGH', 'ACTIVE', 'API Abuse Detected', 'Rapid API calls indicating automated abuse. Risk score: 10.0', '172.28.0.1', NULL, NULL, 10, 0.9, 'rule_based', 'API Abuse', 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/138.0.0.0 Safari/537.36', NULL, '{"event_type": "api_call", "ip_address": "172.28.0.1", "user_id": null, "user_agent": "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/138.0.0.0 Safari/537.36", "session_id": null, "timestamp": "2025-07-28T12:27:37.670675", "additional_data": {"method": "GET", "path": "/api/v1/admin/users", "status_code": 200, "request_size": 0, "referer": "http://localhost:3005/", "query_params": "page=1&size=20&is_active=true", "suspicion_score": 3.0}}', NULL, NULL, '2025-07-28 12:27:37.672597+00', '2025-07-28 12:27:37.673428+00', '2025-07-28 12:27:37.673429+00', NULL, NULL, NULL);
INSERT INTO public.security_events VALUES (142, 'eca12c05-a3b8-420b-a85b-5f07438c0b98', 'api_abuse', 'HIGH', 'ACTIVE', 'API Abuse Detected', 'Rapid API calls indicating automated abuse. Risk score: 10.0', '172.28.0.1', NULL, NULL, 10, 0.9, 'rule_based', 'API Abuse', 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/138.0.0.0 Safari/537.36', NULL, '{"event_type": "api_call", "ip_address": "172.28.0.1", "user_id": null, "user_agent": "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/138.0.0.0 Safari/537.36", "session_id": null, "timestamp": "2025-07-28T12:27:46.653308", "additional_data": {"method": "GET", "path": "/api/v1/rbac/users/4/roles", "status_code": 404, "request_size": 0, "referer": "http://localhost:3005/", "query_params": null}}', NULL, NULL, '2025-07-28 12:27:46.658084+00', '2025-07-28 12:27:46.658561+00', '2025-07-28 12:27:46.658562+00', NULL, NULL, NULL);
INSERT INTO public.security_events VALUES (137, 'b2361fef-bbe1-4b03-992e-4e1a03a36df4', 'api_abuse', 'HIGH', 'ACTIVE', 'API Abuse Detected', 'Rapid API calls indicating automated abuse. Risk score: 10.0', '172.28.0.1', NULL, NULL, 10, 0.9, 'rule_based', 'API Abuse', 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/138.0.0.0 Safari/537.36', NULL, '{"event_type": "api_call", "ip_address": "172.28.0.1", "user_id": null, "user_agent": "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/138.0.0.0 Safari/537.36", "session_id": null, "timestamp": "2025-07-28T12:27:42.696557", "additional_data": {"method": "GET", "path": "/api/v1/rbac/roles", "status_code": 200, "request_size": 0, "referer": "http://localhost:3005/", "query_params": "page=1&size=10&include_stats=true&active_only=true"}}', NULL, NULL, '2025-07-28 12:27:42.697594+00', '2025-07-28 12:27:42.698097+00', '2025-07-28 12:27:42.698098+00', NULL, NULL, NULL);
INSERT INTO public.security_events VALUES (151, 'd6063d65-86dc-4af2-9aeb-6cb78ca4d966', 'api_abuse', 'HIGH', 'ACTIVE', 'API Abuse Detected', 'Rapid API calls indicating automated abuse. Risk score: 10.0', '172.28.0.1', NULL, NULL, 10, 0.9, 'rule_based', 'API Abuse', 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/138.0.0.0 Safari/537.36', NULL, '{"event_type": "api_call", "ip_address": "172.28.0.1", "user_id": null, "user_agent": "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/138.0.0.0 Safari/537.36", "session_id": null, "timestamp": "2025-07-28T12:28:34.895138", "additional_data": {"method": "GET", "path": "/api/v1/admin/system/health", "status_code": 200, "request_size": 0, "referer": "http://localhost:3005/", "query_params": null, "suspicion_score": 3.0}}', NULL, NULL, '2025-07-28 12:28:34.898859+00', '2025-07-28 12:28:34.899312+00', '2025-07-28 12:28:34.899313+00', NULL, NULL, NULL);
INSERT INTO public.security_events VALUES (139, 'ba12986d-9a26-4714-ab33-a7a46cafb9fe', 'api_abuse', 'HIGH', 'ACTIVE', 'API Abuse Detected', 'Rapid API calls indicating automated abuse. Risk score: 10.0', '172.28.0.1', NULL, NULL, 10, 0.9, 'rule_based', 'API Abuse', 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/138.0.0.0 Safari/537.36', NULL, '{"event_type": "api_call", "ip_address": "172.28.0.1", "user_id": null, "user_agent": "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/138.0.0.0 Safari/537.36", "session_id": null, "timestamp": "2025-07-28T12:27:46.585045", "additional_data": {"method": "GET", "path": "/api/v1/rbac/users/4/roles", "status_code": 404, "request_size": 0, "referer": "http://localhost:3005/", "query_params": null}}', NULL, NULL, '2025-07-28 12:27:46.586531+00', '2025-07-28 12:27:46.587003+00', '2025-07-28 12:27:46.587003+00', NULL, NULL, NULL);
INSERT INTO public.security_events VALUES (140, '70351e2c-292d-42fc-b871-974fe612138f', 'api_abuse', 'HIGH', 'ACTIVE', 'API Abuse Detected', 'Rapid API calls indicating automated abuse. Risk score: 10.0', '172.28.0.1', NULL, NULL, 10, 0.9, 'rule_based', 'API Abuse', 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/138.0.0.0 Safari/537.36', NULL, '{"event_type": "api_call", "ip_address": "172.28.0.1", "user_id": null, "user_agent": "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/138.0.0.0 Safari/537.36", "session_id": null, "timestamp": "2025-07-28T12:27:46.585499", "additional_data": {"method": "GET", "path": "/api/v1/rbac/users/1/roles", "status_code": 404, "request_size": 0, "referer": "http://localhost:3005/", "query_params": null}}', NULL, NULL, '2025-07-28 12:27:46.591191+00', '2025-07-28 12:27:46.593694+00', '2025-07-28 12:27:46.593695+00', NULL, NULL, NULL);
INSERT INTO public.security_events VALUES (143, 'a05c5ac1-b9ee-4b89-8d44-76545e258dbd', 'api_abuse', 'HIGH', 'ACTIVE', 'API Abuse Detected', 'Rapid API calls indicating automated abuse. Risk score: 10.0', '172.28.0.1', NULL, NULL, 10, 0.9, 'rule_based', 'API Abuse', 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/138.0.0.0 Safari/537.36', NULL, '{"event_type": "api_call", "ip_address": "172.28.0.1", "user_id": null, "user_agent": "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/138.0.0.0 Safari/537.36", "session_id": null, "timestamp": "2025-07-28T12:28:28.007804", "additional_data": {"method": "GET", "path": "/api/v1/encryption/keys/all", "status_code": 404, "request_size": 0, "referer": "http://localhost:3005/", "query_params": null}}', NULL, NULL, '2025-07-28 12:28:28.009156+00', '2025-07-28 12:28:28.01232+00', '2025-07-28 12:28:28.012321+00', NULL, NULL, NULL);
INSERT INTO public.security_events VALUES (148, '01d479b5-6067-48ac-babd-bd393b6dee09', 'api_abuse', 'HIGH', 'ACTIVE', 'API Abuse Detected', 'Rapid API calls indicating automated abuse. Risk score: 10.0', '172.28.0.1', NULL, NULL, 10, 0.9, 'rule_based', 'API Abuse', 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/138.0.0.0 Safari/537.36', NULL, '{"event_type": "api_call", "ip_address": "172.28.0.1", "user_id": null, "user_agent": "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/138.0.0.0 Safari/537.36", "session_id": null, "timestamp": "2025-07-28T12:28:32.809640", "additional_data": {"method": "GET", "path": "/api/v1/admin/system/health", "status_code": 200, "request_size": 0, "referer": "http://localhost:3005/", "query_params": null, "suspicion_score": 3.0}}', NULL, NULL, '2025-07-28 12:28:32.82309+00', '2025-07-28 12:28:32.823834+00', '2025-07-28 12:28:32.823835+00', NULL, NULL, NULL);
INSERT INTO public.security_events VALUES (150, 'a87e6d9c-6722-469c-8b37-6bae0dabf9f6', 'api_abuse', 'HIGH', 'ACTIVE', 'API Abuse Detected', 'Rapid API calls indicating automated abuse. Risk score: 10.0', '172.28.0.1', NULL, NULL, 10, 0.9, 'rule_based', 'API Abuse', 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/138.0.0.0 Safari/537.36', NULL, '{"event_type": "api_call", "ip_address": "172.28.0.1", "user_id": null, "user_agent": "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/138.0.0.0 Safari/537.36", "session_id": null, "timestamp": "2025-07-28T12:28:34.876666", "additional_data": {"method": "GET", "path": "/api/v1/admin/system/metrics", "status_code": 200, "request_size": 0, "referer": "http://localhost:3005/", "query_params": "hours=24", "suspicion_score": 3.0}}', NULL, NULL, '2025-07-28 12:28:34.884906+00', '2025-07-28 12:28:34.886+00', '2025-07-28 12:28:34.886002+00', NULL, NULL, NULL);
INSERT INTO public.security_events VALUES (153, '84c13eaf-9ebc-4a39-9bc0-f62a0ee51022', 'api_abuse', 'HIGH', 'ACTIVE', 'API Abuse Detected', 'Rapid API calls indicating automated abuse. Risk score: 10.0', '172.28.0.1', NULL, NULL, 10, 0.9, 'rule_based', 'API Abuse', 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/138.0.0.0 Safari/537.36', NULL, '{"event_type": "api_call", "ip_address": "172.28.0.1", "user_id": null, "user_agent": "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/138.0.0.0 Safari/537.36", "session_id": null, "timestamp": "2025-07-28T12:28:38.136281", "additional_data": {"method": "GET", "path": "/api/v1/admin/system/health", "status_code": 200, "request_size": 0, "referer": "http://localhost:3005/", "query_params": null, "suspicion_score": 3.0}}', NULL, NULL, '2025-07-28 12:28:38.141242+00', '2025-07-28 12:28:38.143139+00', '2025-07-28 12:28:38.143141+00', NULL, NULL, NULL);
INSERT INTO public.security_events VALUES (156, '34dd6f61-6668-4bc7-8cd6-f442a7e4d0c7', 'api_abuse', 'HIGH', 'ACTIVE', 'API Abuse Detected', 'Rapid API calls indicating automated abuse. Risk score: 10.0', '172.28.0.1', NULL, NULL, 10, 0.9, 'rule_based', 'API Abuse', 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/138.0.0.0 Safari/537.36', NULL, '{"event_type": "api_call", "ip_address": "172.28.0.1", "user_id": null, "user_agent": "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/138.0.0.0 Safari/537.36", "session_id": null, "timestamp": "2025-07-28T12:28:41.262831", "additional_data": {"method": "GET", "path": "/api/v1/admin/audit/logs", "status_code": 200, "request_size": 0, "referer": "http://localhost:3005/", "query_params": "page=1&size=50", "suspicion_score": 3.0}}', NULL, NULL, '2025-07-28 12:28:41.267406+00', '2025-07-28 12:28:41.268486+00', '2025-07-28 12:28:41.268488+00', NULL, NULL, NULL);
INSERT INTO public.security_events VALUES (158, '1ccde6d5-52f2-43ef-8c17-803575c969cd', 'api_abuse', 'HIGH', 'ACTIVE', 'API Abuse Detected', 'Rapid API calls indicating automated abuse. Risk score: 10.0', '172.28.0.1', NULL, NULL, 10, 0.9, 'rule_based', 'API Abuse', 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/138.0.0.0 Safari/537.36', NULL, '{"event_type": "api_call", "ip_address": "172.28.0.1", "user_id": null, "user_agent": "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/138.0.0.0 Safari/537.36", "session_id": null, "timestamp": "2025-07-28T12:28:41.287170", "additional_data": {"method": "GET", "path": "/api/v1/admin/audit/logs", "status_code": 200, "request_size": 0, "referer": "http://localhost:3005/", "query_params": "page=1&size=50", "suspicion_score": 3.0}}', NULL, NULL, '2025-07-28 12:28:41.28782+00', '2025-07-28 12:28:41.288111+00', '2025-07-28 12:28:41.288111+00', NULL, NULL, NULL);
INSERT INTO public.security_events VALUES (160, 'c97c6223-255d-4aee-b80f-d4583b8b17cf', 'api_abuse', 'HIGH', 'ACTIVE', 'API Abuse Detected', 'Rapid API calls indicating automated abuse. Risk score: 10.0', '172.28.0.1', NULL, NULL, 10, 0.9, 'rule_based', 'API Abuse', 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/138.0.0.0 Safari/537.36', NULL, '{"event_type": "api_call", "ip_address": "172.28.0.1", "user_id": null, "user_agent": "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/138.0.0.0 Safari/537.36", "session_id": null, "timestamp": "2025-07-28T12:28:41.573659", "additional_data": {"method": "GET", "path": "/api/v1/mfa/status", "status_code": 200, "request_size": 0, "referer": "http://localhost:3005/", "query_params": null}}', NULL, NULL, '2025-07-28 12:28:41.574363+00', '2025-07-28 12:28:41.574737+00', '2025-07-28 12:28:41.574737+00', NULL, NULL, NULL);
INSERT INTO public.security_events VALUES (155, '11fb0b77-8a18-4091-84c1-71f9f1a6f38a', 'api_abuse', 'HIGH', 'ACTIVE', 'API Abuse Detected', 'Rapid API calls indicating automated abuse. Risk score: 10.0', '172.28.0.1', NULL, NULL, 10, 0.9, 'rule_based', 'API Abuse', 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/138.0.0.0 Safari/537.36', NULL, '{"event_type": "api_call", "ip_address": "172.28.0.1", "user_id": null, "user_agent": "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/138.0.0.0 Safari/537.36", "session_id": null, "timestamp": "2025-07-28T12:28:40.239809", "additional_data": {"method": "GET", "path": "/api/v1/admin/system/health", "status_code": 200, "request_size": 0, "referer": "http://localhost:3005/", "query_params": null, "suspicion_score": 3.0}}', NULL, NULL, '2025-07-28 12:28:40.241567+00', '2025-07-28 12:28:40.242278+00', '2025-07-28 12:28:40.242279+00', NULL, NULL, NULL);
INSERT INTO public.security_events VALUES (159, 'a48a6fb3-d9d2-4709-a73c-29202c2e0bfd', 'api_abuse', 'HIGH', 'ACTIVE', 'API Abuse Detected', 'Rapid API calls indicating automated abuse. Risk score: 10.0', '172.28.0.1', NULL, NULL, 10, 0.9, 'rule_based', 'API Abuse', 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/138.0.0.0 Safari/537.36', NULL, '{"event_type": "api_call", "ip_address": "172.28.0.1", "user_id": null, "user_agent": "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/138.0.0.0 Safari/537.36", "session_id": null, "timestamp": "2025-07-28T12:28:41.561747", "additional_data": {"method": "GET", "path": "/api/v1/mfa/status", "status_code": 200, "request_size": 0, "referer": "http://localhost:3005/", "query_params": null}}', NULL, NULL, '2025-07-28 12:28:41.563449+00', '2025-07-28 12:28:41.563983+00', '2025-07-28 12:28:41.563984+00', NULL, NULL, NULL);


--
-- TOC entry 3983 (class 0 OID 25204)
-- Dependencies: 265
-- Data for Name: security_metrics; Type: TABLE DATA; Schema: public; Owner: securevault_user
--



--
-- TOC entry 3981 (class 0 OID 25182)
-- Dependencies: 263
-- Data for Name: suspicious_patterns; Type: TABLE DATA; Schema: public; Owner: securevault_user
--



--
-- TOC entry 3985 (class 0 OID 25216)
-- Dependencies: 267
-- Data for Name: threat_responses; Type: TABLE DATA; Schema: public; Owner: securevault_user
--

INSERT INTO public.threat_responses VALUES (1, 'b29a05e4-bacb-4074-a154-02e0d3da2e19', 'efacd6eb-35d6-4e20-b3a8-5329c4f972bd', 'RATE_LIMIT', 'ip', '172.27.0.1', 60, NULL, '2025-07-28 04:30:39.055808+00', 'system', true, NULL, NULL, NULL, NULL);
INSERT INTO public.threat_responses VALUES (2, '5d8673f3-80d7-4251-8923-83170387fc85', '9c2161d4-87ef-4ce7-be8b-6f28b66c4d6b', 'RATE_LIMIT', 'ip', '172.27.0.1', 60, NULL, '2025-07-28 04:30:39.06388+00', 'system', true, NULL, NULL, NULL, NULL);
INSERT INTO public.threat_responses VALUES (3, '15a5d4ff-3c51-42b2-a29c-af59726f6703', '23c715ee-7f62-4fbc-9b19-0d7cc27fb57c', 'RATE_LIMIT', 'ip', '172.27.0.1', 60, NULL, '2025-07-28 04:30:39.071759+00', 'system', true, NULL, NULL, NULL, NULL);
INSERT INTO public.threat_responses VALUES (4, 'b5e76bbc-f295-4444-a3bd-b54eb689cd64', '22809af2-b0f7-4634-af83-9d0d78761383', 'RATE_LIMIT', 'ip', '172.27.0.1', 60, NULL, '2025-07-28 04:30:39.085525+00', 'system', true, NULL, NULL, NULL, NULL);
INSERT INTO public.threat_responses VALUES (5, 'd2605aa0-9fa6-41fc-884c-da751cfbe40a', '269741d8-38e4-4973-8078-4ddc9d4a1035', 'RATE_LIMIT', 'ip', '172.27.0.1', 60, NULL, '2025-07-28 04:30:39.09345+00', 'system', true, NULL, NULL, NULL, NULL);
INSERT INTO public.threat_responses VALUES (6, '3f84346d-2cab-4fdd-940f-5c3de26696fb', '204c0d47-9bbb-4e4b-9318-31c700d648c3', 'RATE_LIMIT', 'ip', '172.27.0.1', 60, NULL, '2025-07-28 04:30:39.100683+00', 'system', true, NULL, NULL, NULL, NULL);
INSERT INTO public.threat_responses VALUES (7, '17b608c4-4669-432d-b8c1-80e54ee8b9c0', '37209144-3b9d-47be-8955-2c1093cc972b', 'RATE_LIMIT', 'ip', '172.27.0.1', 60, NULL, '2025-07-28 04:30:39.11173+00', 'system', true, NULL, NULL, NULL, NULL);
INSERT INTO public.threat_responses VALUES (8, '945abb3e-2b62-481a-96ec-b9d48104869b', 'adb2fd2d-3097-4fef-8835-eff8134e1881', 'RATE_LIMIT', 'ip', '172.27.0.1', 60, NULL, '2025-07-28 04:30:40.983572+00', 'system', true, NULL, NULL, NULL, NULL);
INSERT INTO public.threat_responses VALUES (9, '5acc07b6-2bd7-4ce7-a719-69660a4de265', 'e4375003-65a2-4ff3-8412-53a27c7887da', 'RATE_LIMIT', 'ip', '172.27.0.1', 60, NULL, '2025-07-28 04:30:43.737019+00', 'system', true, NULL, NULL, NULL, NULL);
INSERT INTO public.threat_responses VALUES (10, '0f0339e4-e529-49bc-a475-74f83471d043', 'af9e78c6-f9d4-4024-906f-3ac4e192d314', 'RATE_LIMIT', 'ip', '172.27.0.1', 60, NULL, '2025-07-28 04:30:46.06996+00', 'system', true, NULL, NULL, NULL, NULL);
INSERT INTO public.threat_responses VALUES (11, '2ae42e46-ec1a-40c1-bba8-6a628b0d0dfd', 'f84cadb2-99d9-4c30-a98b-fab521b7e8aa', 'RATE_LIMIT', 'ip', '172.27.0.1', 60, NULL, '2025-07-28 04:31:04.175696+00', 'system', true, NULL, NULL, NULL, NULL);
INSERT INTO public.threat_responses VALUES (12, '00b8cfa4-3162-41fe-8efd-2f9469e39c7d', 'a7baf6d4-e3d7-4b4a-9274-11b0e9790231', 'RATE_LIMIT', 'ip', '172.27.0.1', 60, NULL, '2025-07-28 04:31:08.203235+00', 'system', true, NULL, NULL, NULL, NULL);
INSERT INTO public.threat_responses VALUES (13, '92416567-8559-46db-ae49-be01d1f0af30', '25801977-503e-4fde-b070-231b369885d4', 'RATE_LIMIT', 'ip', '172.27.0.1', 60, NULL, '2025-07-28 04:33:12.456204+00', 'system', true, NULL, NULL, NULL, NULL);
INSERT INTO public.threat_responses VALUES (14, 'b3275028-2503-4328-b9e4-06da38ecd808', '33b3433a-7906-43c2-aa30-22956530453d', 'RATE_LIMIT', 'ip', '172.27.0.1', 60, NULL, '2025-07-28 04:33:12.463959+00', 'system', true, NULL, NULL, NULL, NULL);
INSERT INTO public.threat_responses VALUES (15, '0eb61b0a-fb58-4240-b52b-4181d752b72f', '9326541b-c80d-46dc-af7c-d695dd915feb', 'RATE_LIMIT', 'ip', '172.27.0.1', 60, NULL, '2025-07-28 04:33:12.480026+00', 'system', true, NULL, NULL, NULL, NULL);
INSERT INTO public.threat_responses VALUES (16, 'ad04f567-a048-4fb8-8879-75ff670abead', '63c4f077-973f-49f0-ba87-21b155e284f3', 'RATE_LIMIT', 'ip', '172.27.0.1', 60, NULL, '2025-07-28 04:33:12.484928+00', 'system', true, NULL, NULL, NULL, NULL);
INSERT INTO public.threat_responses VALUES (17, 'c9fffaab-9552-4c2f-8727-824111178ad9', '510ebeba-d9bf-4083-bd12-b396b5cbe675', 'RATE_LIMIT', 'ip', '172.27.0.1', 60, NULL, '2025-07-28 04:33:12.488284+00', 'system', true, NULL, NULL, NULL, NULL);
INSERT INTO public.threat_responses VALUES (18, '280a5559-9f45-4a8b-8a1b-b44391ab3e7f', '26427a31-319c-4583-af68-9c8ecd57edce', 'RATE_LIMIT', 'ip', '172.27.0.1', 60, NULL, '2025-07-28 04:33:12.502004+00', 'system', true, NULL, NULL, NULL, NULL);
INSERT INTO public.threat_responses VALUES (19, 'af42c3c9-63fa-4577-b075-7e25a3a834e5', '50e17cb7-9089-4288-8e87-d32e40d63012', 'RATE_LIMIT', 'ip', '172.27.0.1', 60, NULL, '2025-07-28 04:33:12.506869+00', 'system', true, NULL, NULL, NULL, NULL);
INSERT INTO public.threat_responses VALUES (20, '49efc07a-3a23-45b1-a8c5-0eebeb38be86', 'a3ed1f98-f5d3-4252-84d9-26ce8e45cc81', 'RATE_LIMIT', 'ip', '172.27.0.1', 60, NULL, '2025-07-28 04:33:12.521382+00', 'system', true, NULL, NULL, NULL, NULL);
INSERT INTO public.threat_responses VALUES (21, '7de8714f-8007-4010-ad59-6c2d6f0db975', 'c818985b-aef5-49f2-a3da-2ec7f43cd37d', 'RATE_LIMIT', 'ip', '172.27.0.1', 60, NULL, '2025-07-28 04:33:12.527502+00', 'system', true, NULL, NULL, NULL, NULL);
INSERT INTO public.threat_responses VALUES (22, '0bf48a46-33ca-4c41-b00f-36b5a8b3c4e5', '7d97ff09-63d4-4174-89ec-2f75e7bf5678', 'RATE_LIMIT', 'ip', '172.27.0.1', 60, NULL, '2025-07-28 04:33:12.992171+00', 'system', true, NULL, NULL, NULL, NULL);
INSERT INTO public.threat_responses VALUES (23, 'a0cdbcc3-d143-4eb4-97e4-317b36fa0d04', 'ee78d730-4d69-4653-b98c-8e1f60912092', 'RATE_LIMIT', 'ip', '172.27.0.1', 60, NULL, '2025-07-28 04:33:13.001055+00', 'system', true, NULL, NULL, NULL, NULL);
INSERT INTO public.threat_responses VALUES (24, '0e664048-ca0d-46b9-918c-9071d59ff90b', 'a00913f2-63d1-45f2-a576-f9bf433eb246', 'RATE_LIMIT', 'ip', '172.27.0.1', 60, NULL, '2025-07-28 04:33:13.004963+00', 'system', true, NULL, NULL, NULL, NULL);
INSERT INTO public.threat_responses VALUES (25, '11543a1b-6657-428f-8553-88b604c8f18c', '98f48b1f-941a-4c5f-adbc-9cbc07f18983', 'RATE_LIMIT', 'ip', '172.27.0.1', 60, NULL, '2025-07-28 04:33:13.010862+00', 'system', true, NULL, NULL, NULL, NULL);
INSERT INTO public.threat_responses VALUES (26, '935bd283-85c7-4c71-b3d3-fb0c4326ab90', '611ceb88-911d-4417-ad1c-35acb91c8c53', 'RATE_LIMIT', 'ip', '172.27.0.1', 60, NULL, '2025-07-28 04:33:13.024723+00', 'system', true, NULL, NULL, NULL, NULL);
INSERT INTO public.threat_responses VALUES (27, '5a417ee1-73da-4406-8209-688a7ee04ebc', '3b720549-ea34-4cb4-9e7c-83587f8c401a', 'RATE_LIMIT', 'ip', '172.27.0.1', 60, NULL, '2025-07-28 04:33:13.028886+00', 'system', true, NULL, NULL, NULL, NULL);
INSERT INTO public.threat_responses VALUES (28, 'e26c17e7-c244-43b2-a57a-fb9a6553e788', '1203b00d-fe6b-4cc9-8bbd-1176a3d4a621', 'RATE_LIMIT', 'ip', '172.27.0.1', 60, NULL, '2025-07-28 04:33:13.03872+00', 'system', true, NULL, NULL, NULL, NULL);
INSERT INTO public.threat_responses VALUES (29, '9a8747e5-ffcc-4cf8-a21a-449e0e3b6f48', 'ee932cee-add9-49a5-bcc4-dedec7626fae', 'RATE_LIMIT', 'ip', '172.27.0.1', 60, NULL, '2025-07-28 04:33:13.047957+00', 'system', true, NULL, NULL, NULL, NULL);
INSERT INTO public.threat_responses VALUES (30, 'c795ac20-0dcf-4e2d-ba53-cf21afe9975a', '57b32365-47a5-469d-a253-05f5ae671be9', 'RATE_LIMIT', 'ip', '172.27.0.1', 60, NULL, '2025-07-28 04:33:13.058865+00', 'system', true, NULL, NULL, NULL, NULL);
INSERT INTO public.threat_responses VALUES (31, '5ac5b8fa-a1cb-415d-92dd-3308b859ba34', '4c742fdc-4b5b-499c-af5d-2a518decc41c', 'RATE_LIMIT', 'ip', '172.27.0.1', 60, NULL, '2025-07-28 04:33:13.0697+00', 'system', true, NULL, NULL, NULL, NULL);
INSERT INTO public.threat_responses VALUES (32, '4b1c954d-d05e-4e77-90a0-3d11e3145e29', '2ac7481c-0ac4-4ca5-b65a-96976012b391', 'RATE_LIMIT', 'ip', '172.27.0.1', 60, NULL, '2025-07-28 04:33:13.331155+00', 'system', true, NULL, NULL, NULL, NULL);
INSERT INTO public.threat_responses VALUES (33, 'a0ee1a26-de1a-4af0-afe9-bf3434f8761a', '6bcf7e73-6b6b-43ec-bab6-25ea5a37a41f', 'RATE_LIMIT', 'ip', '172.27.0.1', 60, NULL, '2025-07-28 04:33:13.340155+00', 'system', true, NULL, NULL, NULL, NULL);
INSERT INTO public.threat_responses VALUES (34, 'b96a5811-74a7-481e-a894-d7c5bb4107cc', '37c229cd-a0a1-4bc6-8c1b-05963231d9bf', 'RATE_LIMIT', 'ip', '172.27.0.1', 60, NULL, '2025-07-28 04:33:13.344409+00', 'system', true, NULL, NULL, NULL, NULL);
INSERT INTO public.threat_responses VALUES (35, '217239c7-3b8e-467e-b787-84560cc08093', '6bdbe89f-da0c-4764-aeb7-6591b63486b8', 'RATE_LIMIT', 'ip', '172.27.0.1', 60, NULL, '2025-07-28 04:33:13.355843+00', 'system', true, NULL, NULL, NULL, NULL);
INSERT INTO public.threat_responses VALUES (36, '37ef8d10-c48f-49e3-a42d-009d147451be', '7ee61985-aba6-4838-80fd-fb927f80a639', 'RATE_LIMIT', 'ip', '172.27.0.1', 60, NULL, '2025-07-28 04:33:13.37609+00', 'system', true, NULL, NULL, NULL, NULL);
INSERT INTO public.threat_responses VALUES (37, '968c121b-ab89-47cd-83bd-58e202579778', '4e163c8f-c78d-4130-aa07-d758170b73a8', 'RATE_LIMIT', 'ip', '172.27.0.1', 60, NULL, '2025-07-28 04:33:13.379795+00', 'system', true, NULL, NULL, NULL, NULL);
INSERT INTO public.threat_responses VALUES (38, '752f0152-2757-4975-a289-67427dd49f9b', '30d90d09-4abe-465b-b517-cb399b0916b8', 'RATE_LIMIT', 'ip', '172.27.0.1', 60, NULL, '2025-07-28 04:33:13.387229+00', 'system', true, NULL, NULL, NULL, NULL);
INSERT INTO public.threat_responses VALUES (39, '06aec53e-7ab1-4e01-8e57-314bccd88657', 'd278eef8-2a4d-4c8f-a194-2432e4c77a41', 'RATE_LIMIT', 'ip', '172.27.0.1', 60, NULL, '2025-07-28 04:33:13.395288+00', 'system', true, NULL, NULL, NULL, NULL);
INSERT INTO public.threat_responses VALUES (40, '30f846c4-3ceb-47fc-8b45-091ef8830573', '188e25ae-b62a-4f63-8ee3-20cc7a935471', 'RATE_LIMIT', 'ip', '172.27.0.1', 60, NULL, '2025-07-28 04:33:13.409956+00', 'system', true, NULL, NULL, NULL, NULL);
INSERT INTO public.threat_responses VALUES (41, 'dc27cb3a-b432-4b03-a357-d795b90f533b', '4c38723b-6b07-4dd6-944c-7d3b7c59bbf4', 'RATE_LIMIT', 'ip', '172.27.0.1', 60, NULL, '2025-07-28 04:33:13.415255+00', 'system', true, NULL, NULL, NULL, NULL);
INSERT INTO public.threat_responses VALUES (42, '099c6c2b-1efb-4559-ab67-bb498d80e8a9', '820bf479-8d48-49e7-b009-cafae44f4234', 'RATE_LIMIT', 'ip', '172.27.0.1', 60, NULL, '2025-07-28 04:33:13.754459+00', 'system', true, NULL, NULL, NULL, NULL);
INSERT INTO public.threat_responses VALUES (43, '22a57c07-8e68-4130-9c52-fa0681624698', '9994f5f4-fd53-4834-8c89-c3e70040fa7d', 'RATE_LIMIT', 'ip', '172.27.0.1', 60, NULL, '2025-07-28 04:33:13.76757+00', 'system', true, NULL, NULL, NULL, NULL);
INSERT INTO public.threat_responses VALUES (44, 'a95e027b-516e-444f-9e30-e1838fca4c8d', 'abe0bf5e-e373-4dba-97e9-33d12192def1', 'RATE_LIMIT', 'ip', '172.27.0.1', 60, NULL, '2025-07-28 04:33:13.771124+00', 'system', true, NULL, NULL, NULL, NULL);
INSERT INTO public.threat_responses VALUES (45, 'b167952d-1e47-4bbc-a744-4454057a7ebf', 'a2c0a5ab-813f-4591-a487-4105b14a5623', 'RATE_LIMIT', 'ip', '172.27.0.1', 60, NULL, '2025-07-28 04:33:13.776497+00', 'system', true, NULL, NULL, NULL, NULL);
INSERT INTO public.threat_responses VALUES (46, 'b15f4bd7-af62-45db-97da-33969ea71e7d', '37cd7509-7aa6-4e3a-9847-daeb7bc416e3', 'RATE_LIMIT', 'ip', '172.27.0.1', 60, NULL, '2025-07-28 04:33:13.800231+00', 'system', true, NULL, NULL, NULL, NULL);
INSERT INTO public.threat_responses VALUES (47, 'd67998ee-564a-4860-a1c6-df376e67bdd6', '92552306-e7ff-4e11-bfb7-c98c5ad3c1e2', 'RATE_LIMIT', 'ip', '172.27.0.1', 60, NULL, '2025-07-28 04:33:13.803343+00', 'system', true, NULL, NULL, NULL, NULL);
INSERT INTO public.threat_responses VALUES (48, '06c48a67-18a9-4130-b2fd-6701f93c2cef', '36bcf399-3acb-4450-8271-49e94e6a47db', 'RATE_LIMIT', 'ip', '172.27.0.1', 60, NULL, '2025-07-28 04:33:13.812629+00', 'system', true, NULL, NULL, NULL, NULL);
INSERT INTO public.threat_responses VALUES (49, 'a5e799bf-1d18-448c-89dd-1f3a915a9c21', '9d780199-8026-48bd-8c1c-760cb6850c01', 'RATE_LIMIT', 'ip', '172.27.0.1', 60, NULL, '2025-07-28 04:33:13.822534+00', 'system', true, NULL, NULL, NULL, NULL);
INSERT INTO public.threat_responses VALUES (50, 'ee90b90a-821f-4b07-9c2c-887421af4202', '3f910121-11ed-4033-8b1e-4cc37bc6f14a', 'RATE_LIMIT', 'ip', '172.27.0.1', 60, NULL, '2025-07-28 04:33:13.837452+00', 'system', true, NULL, NULL, NULL, NULL);
INSERT INTO public.threat_responses VALUES (51, 'a1705efe-2b18-4179-8666-1ad70925bcf4', '4abe2aa5-c48d-484a-92cb-93a5fc56a633', 'RATE_LIMIT', 'ip', '172.27.0.1', 60, NULL, '2025-07-28 04:33:13.843534+00', 'system', true, NULL, NULL, NULL, NULL);
INSERT INTO public.threat_responses VALUES (52, 'c85b10d1-dfdb-4f1b-b626-f16655a62d58', '6f24b3a8-afaa-454d-bcd3-33032a7a226d', 'RATE_LIMIT', 'ip', '172.27.0.1', 60, NULL, '2025-07-28 04:33:14.223369+00', 'system', true, NULL, NULL, NULL, NULL);
INSERT INTO public.threat_responses VALUES (53, '997cf192-20ba-4aa7-8926-4105bc67c0a3', 'f14f78f0-c12b-462d-9a34-bd0569fbbe80', 'RATE_LIMIT', 'ip', '172.27.0.1', 60, NULL, '2025-07-28 04:33:14.233507+00', 'system', true, NULL, NULL, NULL, NULL);
INSERT INTO public.threat_responses VALUES (80, 'ae95e3a7-32c5-42eb-a4eb-7f3074e81615', '6e5f6a97-67c9-4b1a-a590-744e1e722c5c', 'RATE_LIMIT', 'ip', '172.27.0.1', 60, NULL, '2025-07-28 04:33:32.749214+00', 'system', true, NULL, NULL, NULL, NULL);
INSERT INTO public.threat_responses VALUES (54, 'e254761d-8087-4db9-bba3-8bbce94c3ab7', 'ede0796c-d3ac-43d3-9c78-871121cd241e', 'RATE_LIMIT', 'ip', '172.27.0.1', 60, NULL, '2025-07-28 04:33:14.240573+00', 'system', true, NULL, NULL, NULL, NULL);
INSERT INTO public.threat_responses VALUES (79, '3cbc109a-07b3-41e5-981a-776d2008b4bf', 'd090c4a6-df10-42d0-9281-237b89ca4021', 'RATE_LIMIT', 'ip', '172.27.0.1', 60, NULL, '2025-07-28 04:33:18.177776+00', 'system', true, NULL, NULL, NULL, NULL);
INSERT INTO public.threat_responses VALUES (55, '53219572-aadd-45cb-ae39-b1ccee11daf7', '4d2a838f-48bd-4ca2-8f43-c15377fa3103', 'RATE_LIMIT', 'ip', '172.27.0.1', 60, NULL, '2025-07-28 04:33:14.249417+00', 'system', true, NULL, NULL, NULL, NULL);
INSERT INTO public.threat_responses VALUES (70, 'fc6882ab-db75-4a12-b7e9-19e139c7200e', '87d487fc-73f1-4666-b17b-e3ca12f9ecae', 'RATE_LIMIT', 'ip', '172.27.0.1', 60, NULL, '2025-07-28 04:33:14.630391+00', 'system', true, NULL, NULL, NULL, NULL);
INSERT INTO public.threat_responses VALUES (76, '61488dd0-528c-4dcb-851b-4ec039d2379b', '5f423232-9c9a-4d6a-89ae-d7fdb3963608', 'RATE_LIMIT', 'ip', '172.27.0.1', 60, NULL, '2025-07-28 04:33:16.998413+00', 'system', true, NULL, NULL, NULL, NULL);
INSERT INTO public.threat_responses VALUES (78, '5cb90367-bb97-4da5-b764-33e5d5425544', 'fe888f8b-2496-4fa9-b064-2deb3fa2c465', 'RATE_LIMIT', 'ip', '172.27.0.1', 60, NULL, '2025-07-28 04:33:18.165566+00', 'system', true, NULL, NULL, NULL, NULL);
INSERT INTO public.threat_responses VALUES (56, '3f9f5c47-0015-4bb0-877b-59b03021ab41', '75afbdcd-98fe-406f-86e3-8cf3818b12b6', 'RATE_LIMIT', 'ip', '172.27.0.1', 60, NULL, '2025-07-28 04:33:14.262775+00', 'system', true, NULL, NULL, NULL, NULL);
INSERT INTO public.threat_responses VALUES (61, 'be370408-c5d3-4b5a-8b2d-511cdf610c4d', '2d002acd-5a8b-47b4-96d6-b3d7a18ccca7', 'RATE_LIMIT', 'ip', '172.27.0.1', 60, NULL, '2025-07-28 04:33:14.335049+00', 'system', true, NULL, NULL, NULL, NULL);
INSERT INTO public.threat_responses VALUES (67, 'e9279ae7-407d-4160-8a3f-e6d4485a7e3e', 'd889cf5c-b082-432a-b2af-de3c67fa8dc0', 'RATE_LIMIT', 'ip', '172.27.0.1', 60, NULL, '2025-07-28 04:33:14.600426+00', 'system', true, NULL, NULL, NULL, NULL);
INSERT INTO public.threat_responses VALUES (73, '985dc032-d35f-4f8e-985f-e976671e26b7', 'c6637ec1-476f-4c4e-8cd5-7bfc69598c42', 'RATE_LIMIT', 'ip', '172.27.0.1', 60, NULL, '2025-07-28 04:33:15.582547+00', 'system', true, NULL, NULL, NULL, NULL);
INSERT INTO public.threat_responses VALUES (57, 'abd3fad4-0b76-4ecf-8889-7a5147564824', '1ebc4acc-0b75-451f-914b-3831004c124e', 'RATE_LIMIT', 'ip', '172.27.0.1', 60, NULL, '2025-07-28 04:33:14.271866+00', 'system', true, NULL, NULL, NULL, NULL);
INSERT INTO public.threat_responses VALUES (58, 'c985bb4a-5fe3-4f25-b46d-2c58aad2a0f5', 'd6abee1a-b5c2-4cc2-90ce-169bfa946978', 'RATE_LIMIT', 'ip', '172.27.0.1', 60, NULL, '2025-07-28 04:33:14.284116+00', 'system', true, NULL, NULL, NULL, NULL);
INSERT INTO public.threat_responses VALUES (60, '1694240a-d50e-4cf3-b653-0ab1abc23f9b', 'a87b2d8a-9e25-484b-8300-6b440a727164', 'RATE_LIMIT', 'ip', '172.27.0.1', 60, NULL, '2025-07-28 04:33:14.304631+00', 'system', true, NULL, NULL, NULL, NULL);
INSERT INTO public.threat_responses VALUES (63, '0873553a-eec6-49ab-8894-6b21f6fc353e', '3a9bc936-6083-4ce0-a792-3b0c066f9aef', 'RATE_LIMIT', 'ip', '172.27.0.1', 60, NULL, '2025-07-28 04:33:14.564015+00', 'system', true, NULL, NULL, NULL, NULL);
INSERT INTO public.threat_responses VALUES (69, '7a05e481-9164-412b-a5ce-d0ec4b3940cb', '8ac7f998-1fc9-4afa-9941-20998662243c', 'RATE_LIMIT', 'ip', '172.27.0.1', 60, NULL, '2025-07-28 04:33:14.618586+00', 'system', true, NULL, NULL, NULL, NULL);
INSERT INTO public.threat_responses VALUES (74, '14a09ea6-a26f-4657-9be2-e5e4959f2b5a', '7b071a1a-9027-4e4f-8dc0-1780905aa73c', 'RATE_LIMIT', 'ip', '172.27.0.1', 60, NULL, '2025-07-28 04:33:15.586549+00', 'system', true, NULL, NULL, NULL, NULL);
INSERT INTO public.threat_responses VALUES (59, '959d24bc-6255-4e3f-8bd2-b96f84f62cf4', '5b85bbd8-ec2c-40fe-9164-d7b8546c4f65', 'RATE_LIMIT', 'ip', '172.27.0.1', 60, NULL, '2025-07-28 04:33:14.29161+00', 'system', true, NULL, NULL, NULL, NULL);
INSERT INTO public.threat_responses VALUES (66, '68a58322-b3b0-4ae3-8ed5-3a9a1c3a4279', 'd57f48e3-debe-40aa-b2f8-307cfd308b69', 'RATE_LIMIT', 'ip', '172.27.0.1', 60, NULL, '2025-07-28 04:33:14.59426+00', 'system', true, NULL, NULL, NULL, NULL);
INSERT INTO public.threat_responses VALUES (71, 'a15e66e9-0489-4a93-9c52-43cc98827148', 'c5ee682f-aa47-4e31-a3db-81ae5051a7a3', 'RATE_LIMIT', 'ip', '172.27.0.1', 60, NULL, '2025-07-28 04:33:14.637442+00', 'system', true, NULL, NULL, NULL, NULL);
INSERT INTO public.threat_responses VALUES (72, 'f316f4cb-690a-41b3-8ee5-0f65144b4744', '90b03562-7977-4941-81cf-6da7517d0aa9', 'RATE_LIMIT', 'ip', '172.27.0.1', 60, NULL, '2025-07-28 04:33:15.565403+00', 'system', true, NULL, NULL, NULL, NULL);
INSERT INTO public.threat_responses VALUES (75, 'be5fccf9-13f0-4253-b113-0ba1850e3944', 'efa1e511-408b-487f-9973-06449b182d36', 'RATE_LIMIT', 'ip', '172.27.0.1', 60, NULL, '2025-07-28 04:33:15.597337+00', 'system', true, NULL, NULL, NULL, NULL);
INSERT INTO public.threat_responses VALUES (62, '916a9bd4-a2a3-4776-862b-d4254a3c018e', 'd5253dfc-f9d1-4f22-9659-6ab8abc5320f', 'RATE_LIMIT', 'ip', '172.27.0.1', 60, NULL, '2025-07-28 04:33:14.553904+00', 'system', true, NULL, NULL, NULL, NULL);
INSERT INTO public.threat_responses VALUES (68, 'b76b7d6a-ff1c-4330-948a-4a076c978d7d', '6257c186-476d-4ee8-b8a0-a62526136d65', 'RATE_LIMIT', 'ip', '172.27.0.1', 60, NULL, '2025-07-28 04:33:14.614782+00', 'system', true, NULL, NULL, NULL, NULL);
INSERT INTO public.threat_responses VALUES (77, '40e790fe-e4d7-46eb-958c-0ebb165c006b', 'ce2a7a8b-59c1-4c39-bf7b-2f67f515ebfd', 'RATE_LIMIT', 'ip', '172.27.0.1', 60, NULL, '2025-07-28 04:33:17.012514+00', 'system', true, NULL, NULL, NULL, NULL);
INSERT INTO public.threat_responses VALUES (64, '909449cd-e67a-47b9-af5d-be4416ec85b7', 'e624e329-d1de-4f7f-8478-3b085085a6ea', 'RATE_LIMIT', 'ip', '172.27.0.1', 60, NULL, '2025-07-28 04:33:14.568207+00', 'system', true, NULL, NULL, NULL, NULL);
INSERT INTO public.threat_responses VALUES (65, 'b3344f02-e943-4d45-a9cb-78dcb70ee1cd', '66b7f656-e103-400d-9988-4facedf7dac5', 'RATE_LIMIT', 'ip', '172.27.0.1', 60, NULL, '2025-07-28 04:33:14.589171+00', 'system', true, NULL, NULL, NULL, NULL);
INSERT INTO public.threat_responses VALUES (81, 'e30a6ce8-421d-4b6a-a4dd-ec63380fb7a3', '4f666c54-c04a-41ba-84fa-64af5896bb31', 'RATE_LIMIT', 'ip', '172.28.0.1', 60, NULL, '2025-07-28 12:25:53.770311+00', 'system', true, NULL, NULL, NULL, NULL);
INSERT INTO public.threat_responses VALUES (82, '89d9d049-6128-4857-a3c0-6b72fe82b7d0', 'ccb21b3a-8af4-4266-a38b-cfd218c1994b', 'RATE_LIMIT', 'ip', '172.28.0.1', 60, NULL, '2025-07-28 12:25:53.793299+00', 'system', true, NULL, NULL, NULL, NULL);
INSERT INTO public.threat_responses VALUES (83, 'd5d4fb40-a9de-4f80-9d93-2508115b7d58', 'f845a770-5b6f-4c86-8dd0-c2edfb02d16e', 'RATE_LIMIT', 'ip', '172.28.0.1', 60, NULL, '2025-07-28 12:25:53.873682+00', 'system', true, NULL, NULL, NULL, NULL);
INSERT INTO public.threat_responses VALUES (84, 'dd568d32-cbb8-4c60-bc9f-8afe4660aa93', 'b7a66446-2da6-426e-988a-b0ea4109954d', 'RATE_LIMIT', 'ip', '172.28.0.1', 60, NULL, '2025-07-28 12:25:53.899077+00', 'system', true, NULL, NULL, NULL, NULL);
INSERT INTO public.threat_responses VALUES (85, '385da1fd-8ea8-4910-b001-77939d85cf78', '0f3fbbc8-840d-4fe6-8186-ff772a95fff8', 'RATE_LIMIT', 'ip', '172.28.0.1', 60, NULL, '2025-07-28 12:25:53.908309+00', 'system', true, NULL, NULL, NULL, NULL);
INSERT INTO public.threat_responses VALUES (86, 'eebc98e7-cb16-4813-bdd4-022cafec08e4', '31fc36a6-9545-44d1-9aeb-5228e75ff3b5', 'RATE_LIMIT', 'ip', '172.28.0.1', 60, NULL, '2025-07-28 12:25:53.928152+00', 'system', true, NULL, NULL, NULL, NULL);
INSERT INTO public.threat_responses VALUES (87, '7525d8ab-be29-4fcd-9427-1471f1481ad0', 'f30b12a6-e58f-4255-b215-aaef6bcba7d4', 'RATE_LIMIT', 'ip', '172.28.0.1', 60, NULL, '2025-07-28 12:25:53.935824+00', 'system', true, NULL, NULL, NULL, NULL);
INSERT INTO public.threat_responses VALUES (88, '3413c2fc-dc1d-4bc7-9343-3918b5d176fa', '7346a7b3-ab84-4247-a902-64762ea733aa', 'RATE_LIMIT', 'ip', '172.28.0.1', 60, NULL, '2025-07-28 12:25:53.952603+00', 'system', true, NULL, NULL, NULL, NULL);
INSERT INTO public.threat_responses VALUES (89, 'a81d910d-32bb-4550-97a0-299004dd29b9', '06b9f257-2bad-4de6-ab33-9c8916b975e6', 'RATE_LIMIT', 'ip', '172.28.0.1', 60, NULL, '2025-07-28 12:25:53.959762+00', 'system', true, NULL, NULL, NULL, NULL);
INSERT INTO public.threat_responses VALUES (90, '14ba1802-9267-4859-8229-eb4f5864055a', '57ba3ba6-c139-4571-a7f0-89f50b20209b', 'RATE_LIMIT', 'ip', '172.28.0.1', 60, NULL, '2025-07-28 12:25:53.971861+00', 'system', true, NULL, NULL, NULL, NULL);
INSERT INTO public.threat_responses VALUES (91, 'c8859a24-ec33-4b3f-9382-e746ae94f9fa', '87dae546-1bf3-4b55-a56a-84e44b3c79cf', 'RATE_LIMIT', 'ip', '172.28.0.1', 60, NULL, '2025-07-28 12:26:04.729071+00', 'system', true, NULL, NULL, NULL, NULL);
INSERT INTO public.threat_responses VALUES (92, 'b2c08bf5-50ec-48c4-b2a3-ecb2b96e5908', 'c9f595e5-c5ee-4541-90c9-a38b55cdd69f', 'RATE_LIMIT', 'ip', '172.28.0.1', 60, NULL, '2025-07-28 12:26:04.742132+00', 'system', true, NULL, NULL, NULL, NULL);
INSERT INTO public.threat_responses VALUES (93, '603e435d-1652-48fb-908f-12a39e958dc4', '77cc7dc1-363e-4e40-abed-e495158c014c', 'RATE_LIMIT', 'ip', '172.28.0.1', 60, NULL, '2025-07-28 12:26:06.141712+00', 'system', true, NULL, NULL, NULL, NULL);
INSERT INTO public.threat_responses VALUES (94, 'b11f10f3-023e-459d-851e-1fe15e350187', '2bb485ac-1230-4365-9869-f63220ccb2ac', 'RATE_LIMIT', 'ip', '172.28.0.1', 60, NULL, '2025-07-28 12:26:06.150686+00', 'system', true, NULL, NULL, NULL, NULL);
INSERT INTO public.threat_responses VALUES (95, 'ded4355e-ce54-4203-b2a1-d9d006f57514', '4da9abba-25e5-4601-b39a-09b02640cd18', 'RATE_LIMIT', 'ip', '172.28.0.1', 60, NULL, '2025-07-28 12:26:06.162139+00', 'system', true, NULL, NULL, NULL, NULL);
INSERT INTO public.threat_responses VALUES (96, '3b6b8360-b3bf-4ab6-a97d-a6e5bbeac2bb', '75cc995e-cff1-4065-a50e-86530177877f', 'RATE_LIMIT', 'ip', '172.28.0.1', 60, NULL, '2025-07-28 12:26:06.173058+00', 'system', true, NULL, NULL, NULL, NULL);
INSERT INTO public.threat_responses VALUES (97, '04650a7f-3f03-4031-92c2-676b9edb9b7d', 'f9f1e2e7-cc89-4fea-afb7-6524f4967d86', 'RATE_LIMIT', 'ip', '172.28.0.1', 60, NULL, '2025-07-28 12:26:47.030146+00', 'system', true, NULL, NULL, NULL, NULL);
INSERT INTO public.threat_responses VALUES (98, '771134ef-3402-42a9-a67d-cbc3aec02153', 'bbaabbb0-6a9c-41b7-937a-45abf03403a5', 'RATE_LIMIT', 'ip', '172.28.0.1', 60, NULL, '2025-07-28 12:26:47.045332+00', 'system', true, NULL, NULL, NULL, NULL);
INSERT INTO public.threat_responses VALUES (99, '57ca578f-da8d-4564-ae00-22efbfe321f3', 'd883686c-863c-4bc5-b4cc-7761c946c747', 'RATE_LIMIT', 'ip', '172.28.0.1', 60, NULL, '2025-07-28 12:26:49.746327+00', 'system', true, NULL, NULL, NULL, NULL);
INSERT INTO public.threat_responses VALUES (100, '9a288d00-d4a2-40dc-a7a4-ad0ee32360eb', 'bbddaf95-81f9-4846-8faf-9718c50ff51f', 'RATE_LIMIT', 'ip', '172.28.0.1', 60, NULL, '2025-07-28 12:26:49.75845+00', 'system', true, NULL, NULL, NULL, NULL);
INSERT INTO public.threat_responses VALUES (101, '77a50778-9e35-414d-927b-769ac5ba1662', '140e4259-2023-4da1-9f28-577697cc9931', 'RATE_LIMIT', 'ip', '172.28.0.1', 60, NULL, '2025-07-28 12:26:52.810288+00', 'system', true, NULL, NULL, NULL, NULL);
INSERT INTO public.threat_responses VALUES (102, '84239ce4-56d2-41e6-9059-b33f724c3593', 'f1184b3c-fced-49d1-a7e9-546fbe3b28b6', 'RATE_LIMIT', 'ip', '172.28.0.1', 60, NULL, '2025-07-28 12:26:52.817173+00', 'system', true, NULL, NULL, NULL, NULL);
INSERT INTO public.threat_responses VALUES (103, '71fa8ffc-d465-4a68-8e1f-06a44e252bdc', '6c8a7916-fb02-4ba4-b4ed-836796503615', 'RATE_LIMIT', 'ip', '172.28.0.1', 60, NULL, '2025-07-28 12:26:52.822174+00', 'system', true, NULL, NULL, NULL, NULL);
INSERT INTO public.threat_responses VALUES (104, '87ac7d1d-1f1f-4c80-ae86-e8bd6ff88a70', '1798747a-7438-4852-9e9a-0ecdaa9cf5ac', 'RATE_LIMIT', 'ip', '172.28.0.1', 60, NULL, '2025-07-28 12:26:52.831641+00', 'system', true, NULL, NULL, NULL, NULL);
INSERT INTO public.threat_responses VALUES (105, 'f4bb6b19-267f-45ec-a7de-561f79267e2e', 'e295a8a2-09f2-4852-b16f-31c1f7058adf', 'RATE_LIMIT', 'ip', '172.28.0.1', 60, NULL, '2025-07-28 12:26:52.843423+00', 'system', true, NULL, NULL, NULL, NULL);
INSERT INTO public.threat_responses VALUES (106, '8d908af2-3eb2-45d7-b09e-66360d2255bb', '3220708d-9c67-4766-b622-53aac1f5e2df', 'RATE_LIMIT', 'ip', '172.28.0.1', 60, NULL, '2025-07-28 12:26:52.851914+00', 'system', true, NULL, NULL, NULL, NULL);
INSERT INTO public.threat_responses VALUES (107, '6a5cb035-6673-40ed-8698-3a70c6b45621', 'e9ccfcb5-a57c-4c44-96d6-7fb8f9b0a7d1', 'RATE_LIMIT', 'ip', '172.28.0.1', 60, NULL, '2025-07-28 12:26:52.855235+00', 'system', true, NULL, NULL, NULL, NULL);
INSERT INTO public.threat_responses VALUES (108, '745b44ed-00af-4652-b190-2c6ab8417d41', 'fde7156b-2b75-4b82-8247-1704a0190248', 'RATE_LIMIT', 'ip', '172.28.0.1', 60, NULL, '2025-07-28 12:26:52.865871+00', 'system', true, NULL, NULL, NULL, NULL);
INSERT INTO public.threat_responses VALUES (109, '28898083-b48c-4810-b2de-06bbfb369966', 'eb877c20-faa8-4263-9813-d90208f73180', 'RATE_LIMIT', 'ip', '172.28.0.1', 60, NULL, '2025-07-28 12:26:58.440951+00', 'system', true, NULL, NULL, NULL, NULL);
INSERT INTO public.threat_responses VALUES (110, 'b51b0a13-69dc-49fc-8db6-4ad0c640b3a3', 'fc9a51b6-43ac-465c-aeca-1620c4aa6c6c', 'RATE_LIMIT', 'ip', '172.28.0.1', 60, NULL, '2025-07-28 12:26:58.446146+00', 'system', true, NULL, NULL, NULL, NULL);
INSERT INTO public.threat_responses VALUES (111, '8b80dd19-4fb6-4635-bbed-b6fbcc0f8594', 'cdf7994f-5d14-4517-b557-41783e1f01af', 'RATE_LIMIT', 'ip', '172.28.0.1', 60, NULL, '2025-07-28 12:26:58.450063+00', 'system', true, NULL, NULL, NULL, NULL);
INSERT INTO public.threat_responses VALUES (112, '99f5feee-7cc8-463c-8279-8515877a860e', '04237b9c-9671-4d87-be4a-fcea99965059', 'RATE_LIMIT', 'ip', '172.28.0.1', 60, NULL, '2025-07-28 12:26:58.462918+00', 'system', true, NULL, NULL, NULL, NULL);
INSERT INTO public.threat_responses VALUES (113, 'b8f271e6-ead9-49bb-a0cf-05796324ff0d', '3f3efd86-7c05-410c-a8b0-b328a795301b', 'RATE_LIMIT', 'ip', '172.28.0.1', 60, NULL, '2025-07-28 12:26:58.474756+00', 'system', true, NULL, NULL, NULL, NULL);
INSERT INTO public.threat_responses VALUES (114, 'eb5f970b-3ecf-403c-bf9e-76166eca7d4e', 'ce8cdf18-6e36-47d1-bd66-0ceb992fc1f0', 'RATE_LIMIT', 'ip', '172.28.0.1', 60, NULL, '2025-07-28 12:26:58.482096+00', 'system', true, NULL, NULL, NULL, NULL);
INSERT INTO public.threat_responses VALUES (115, 'ee309f6f-f8ab-4b54-8ddf-f6314f76dae1', '23e3f92e-4c9b-4c30-ade8-b2de2fa116b4', 'RATE_LIMIT', 'ip', '172.28.0.1', 60, NULL, '2025-07-28 12:26:58.487389+00', 'system', true, NULL, NULL, NULL, NULL);
INSERT INTO public.threat_responses VALUES (116, '87b5adb6-2fed-4144-8783-181f9ec4933b', '148328a6-ca17-4ba0-8127-85984535112c', 'RATE_LIMIT', 'ip', '172.28.0.1', 60, NULL, '2025-07-28 12:26:58.496476+00', 'system', true, NULL, NULL, NULL, NULL);
INSERT INTO public.threat_responses VALUES (117, '59208b14-43bf-4952-bdd9-7147f14db54a', 'ff013d06-9d63-44d2-ba3f-0cb142bae8cc', 'RATE_LIMIT', 'ip', '172.28.0.1', 60, NULL, '2025-07-28 12:27:04.195516+00', 'system', true, NULL, NULL, NULL, NULL);
INSERT INTO public.threat_responses VALUES (118, '277fd47b-ca6f-410a-a072-d57febfa2ef7', '2da55855-38cb-447a-8fb2-0d694c0047c0', 'RATE_LIMIT', 'ip', '172.28.0.1', 60, NULL, '2025-07-28 12:27:04.207709+00', 'system', true, NULL, NULL, NULL, NULL);
INSERT INTO public.threat_responses VALUES (119, 'e465b189-ce80-45f8-b512-6260f1c0c1bc', 'ad0d3c67-45fa-44a8-b8df-4f92b1c98500', 'RATE_LIMIT', 'ip', '172.28.0.1', 60, NULL, '2025-07-28 12:27:08.715333+00', 'system', true, NULL, NULL, NULL, NULL);
INSERT INTO public.threat_responses VALUES (120, '1792061d-bd2c-4d44-ace1-355b8d7edbb7', 'ee8189a5-6588-413d-bf90-389d0cceb14b', 'RATE_LIMIT', 'ip', '172.28.0.1', 60, NULL, '2025-07-28 12:27:08.737875+00', 'system', true, NULL, NULL, NULL, NULL);
INSERT INTO public.threat_responses VALUES (121, '97f1d3b4-308e-4fda-83e0-80110e466dab', 'b0a2fe67-163a-4455-9230-d152b762a94f', 'RATE_LIMIT', 'ip', '172.28.0.1', 60, NULL, '2025-07-28 12:27:13.611874+00', 'system', true, NULL, NULL, NULL, NULL);
INSERT INTO public.threat_responses VALUES (122, '49a303ec-98d7-4881-a612-6bf5e545730d', '2ee08dd2-ccab-4e8a-9d60-e8506a94368b', 'RATE_LIMIT', 'ip', '172.28.0.1', 60, NULL, '2025-07-28 12:27:13.625535+00', 'system', true, NULL, NULL, NULL, NULL);
INSERT INTO public.threat_responses VALUES (123, '487375dd-8f1b-44a3-989b-8dcbb841393d', 'ac831b4c-0476-4030-a30d-d649d5e2388a', 'RATE_LIMIT', 'ip', '172.28.0.1', 60, NULL, '2025-07-28 12:27:13.928576+00', 'system', true, NULL, NULL, NULL, NULL);
INSERT INTO public.threat_responses VALUES (124, '31b2c278-6add-4b0a-928e-969225bb0926', 'f3513544-07c3-4d0e-8ee6-b42de1e93409', 'RATE_LIMIT', 'ip', '172.28.0.1', 60, NULL, '2025-07-28 12:27:19.933512+00', 'system', true, NULL, NULL, NULL, NULL);
INSERT INTO public.threat_responses VALUES (125, 'a26c766d-e9f0-451c-a30c-31674129f5ee', 'f9496b33-e8dd-496e-b948-250287f55c70', 'RATE_LIMIT', 'ip', '172.28.0.1', 60, NULL, '2025-07-28 12:27:19.947954+00', 'system', true, NULL, NULL, NULL, NULL);
INSERT INTO public.threat_responses VALUES (126, 'bde9cc70-3e76-407f-b280-eb2e54d1ba0e', 'b952563e-9d13-4731-bc7d-6d8a15eee483', 'RATE_LIMIT', 'ip', '172.28.0.1', 60, NULL, '2025-07-28 12:27:22.60222+00', 'system', true, NULL, NULL, NULL, NULL);
INSERT INTO public.threat_responses VALUES (127, '7d4944cb-d1e1-4f11-a572-c819e651ed27', '1602f9b7-ce79-4195-abcd-9d91090ade85', 'RATE_LIMIT', 'ip', '172.28.0.1', 60, NULL, '2025-07-28 12:27:22.605472+00', 'system', true, NULL, NULL, NULL, NULL);
INSERT INTO public.threat_responses VALUES (128, '127a1b5a-ae85-4da1-8ddf-baa13c4fde71', '9abe6270-9c35-4bcf-b9f2-965f2c62a5ac', 'RATE_LIMIT', 'ip', '172.28.0.1', 60, NULL, '2025-07-28 12:27:22.610018+00', 'system', true, NULL, NULL, NULL, NULL);
INSERT INTO public.threat_responses VALUES (129, '03bd036f-5025-483e-9650-3b6db31bacb3', '62969e1a-f7cc-4e65-b0e0-07a79a034da9', 'RATE_LIMIT', 'ip', '172.28.0.1', 60, NULL, '2025-07-28 12:27:22.629119+00', 'system', true, NULL, NULL, NULL, NULL);
INSERT INTO public.threat_responses VALUES (130, '30eeebf6-fac5-49e4-89b9-e848fcec726b', '77b875fc-6349-460f-ad34-0d6c7b4326c6', 'RATE_LIMIT', 'ip', '172.28.0.1', 60, NULL, '2025-07-28 12:27:22.637739+00', 'system', true, NULL, NULL, NULL, NULL);
INSERT INTO public.threat_responses VALUES (131, 'f9ce57fe-09c0-4f68-b0ad-4f6295cb4766', '3a050db3-9444-41a1-92e5-76628a1927e0', 'RATE_LIMIT', 'ip', '172.28.0.1', 60, NULL, '2025-07-28 12:27:22.643373+00', 'system', true, NULL, NULL, NULL, NULL);
INSERT INTO public.threat_responses VALUES (132, 'e9d878f1-a342-4954-b77e-006326bb3b54', 'fbb48ae9-8e5e-44d4-bc6c-0286ee6f95e2', 'RATE_LIMIT', 'ip', '172.28.0.1', 60, NULL, '2025-07-28 12:27:22.646471+00', 'system', true, NULL, NULL, NULL, NULL);
INSERT INTO public.threat_responses VALUES (134, '601b1645-7532-4966-8481-4b4865de3a53', 'a6f7e608-c79d-4f71-baf5-0cd2397099d4', 'RATE_LIMIT', 'ip', '172.28.0.1', 60, NULL, '2025-07-28 12:27:32.19268+00', 'system', true, NULL, NULL, NULL, NULL);
INSERT INTO public.threat_responses VALUES (136, 'a5c8afb0-dd79-45d9-91bd-38672d262246', '172237b0-9d7b-4bbd-901c-1e9778b7bf88', 'RATE_LIMIT', 'ip', '172.28.0.1', 60, NULL, '2025-07-28 12:27:37.677183+00', 'system', true, NULL, NULL, NULL, NULL);
INSERT INTO public.threat_responses VALUES (140, 'a9e93a23-4227-45a6-a8f1-99ead767ac96', '70351e2c-292d-42fc-b871-974fe612138f', 'RATE_LIMIT', 'ip', '172.28.0.1', 60, NULL, '2025-07-28 12:27:46.595676+00', 'system', true, NULL, NULL, NULL, NULL);
INSERT INTO public.threat_responses VALUES (151, '1077446e-8bb1-41b9-a543-f9c74272a90f', 'd6063d65-86dc-4af2-9aeb-6cb78ca4d966', 'RATE_LIMIT', 'ip', '172.28.0.1', 60, NULL, '2025-07-28 12:28:34.900949+00', 'system', true, NULL, NULL, NULL, NULL);
INSERT INTO public.threat_responses VALUES (154, 'b3664bd1-d8c0-46aa-9a1c-9e6d59f59737', '817ada5e-0940-408e-b819-74b97dc98586', 'RATE_LIMIT', 'ip', '172.28.0.1', 60, NULL, '2025-07-28 12:28:40.214143+00', 'system', true, NULL, NULL, NULL, NULL);
INSERT INTO public.threat_responses VALUES (155, '06b1d9c6-d5d6-4aeb-a2ac-02b81df48c0c', '11fb0b77-8a18-4091-84c1-71f9f1a6f38a', 'RATE_LIMIT', 'ip', '172.28.0.1', 60, NULL, '2025-07-28 12:28:40.24617+00', 'system', true, NULL, NULL, NULL, NULL);
INSERT INTO public.threat_responses VALUES (133, '83e75986-1ce7-462b-ba93-6ab13bacd629', '489939f5-938b-4318-9008-3f7aa64220f1', 'RATE_LIMIT', 'ip', '172.28.0.1', 60, NULL, '2025-07-28 12:27:22.662644+00', 'system', true, NULL, NULL, NULL, NULL);
INSERT INTO public.threat_responses VALUES (143, '548c6f22-9e74-4ba1-addd-af63f5047869', 'a05c5ac1-b9ee-4b89-8d44-76545e258dbd', 'RATE_LIMIT', 'ip', '172.28.0.1', 60, NULL, '2025-07-28 12:28:28.016584+00', 'system', true, NULL, NULL, NULL, NULL);
INSERT INTO public.threat_responses VALUES (135, '3dee60be-e358-4da7-8045-64d81e3c1d5e', 'f32b2cce-e018-4d06-bc77-4491fbe5329e', 'RATE_LIMIT', 'ip', '172.28.0.1', 60, NULL, '2025-07-28 12:27:32.206223+00', 'system', true, NULL, NULL, NULL, NULL);
INSERT INTO public.threat_responses VALUES (145, 'e5d6b24b-8726-4a4a-9d9e-28918fb728cf', '8215ef78-710f-4f23-928a-e433c9e421a9', 'RATE_LIMIT', 'ip', '172.28.0.1', 60, NULL, '2025-07-28 12:28:28.041693+00', 'system', true, NULL, NULL, NULL, NULL);
INSERT INTO public.threat_responses VALUES (137, '3c50acc6-d079-43b7-a49c-7d8e19f45732', 'b2361fef-bbe1-4b03-992e-4e1a03a36df4', 'RATE_LIMIT', 'ip', '172.28.0.1', 60, NULL, '2025-07-28 12:27:42.700077+00', 'system', true, NULL, NULL, NULL, NULL);
INSERT INTO public.threat_responses VALUES (138, '87e65ff5-7b5f-4e9f-81aa-e51a1a3781c8', 'bab75bdb-9485-4176-a2b0-783f5cb43500', 'RATE_LIMIT', 'ip', '172.28.0.1', 60, NULL, '2025-07-28 12:27:42.716076+00', 'system', true, NULL, NULL, NULL, NULL);
INSERT INTO public.threat_responses VALUES (148, '3fbc33e3-0537-448e-b73a-eec69c9076b2', '01d479b5-6067-48ac-babd-bd393b6dee09', 'RATE_LIMIT', 'ip', '172.28.0.1', 60, NULL, '2025-07-28 12:28:32.82617+00', 'system', true, NULL, NULL, NULL, NULL);
INSERT INTO public.threat_responses VALUES (139, 'ab14c35e-3a45-499f-80cd-f7a476d9d338', 'ba12986d-9a26-4714-ab33-a7a46cafb9fe', 'RATE_LIMIT', 'ip', '172.28.0.1', 60, NULL, '2025-07-28 12:27:46.589023+00', 'system', true, NULL, NULL, NULL, NULL);
INSERT INTO public.threat_responses VALUES (149, 'e527567d-792c-4130-88ba-8ab7ca8fafc7', '76f90ac9-e173-4396-b7ab-99d433a92f40', 'RATE_LIMIT', 'ip', '172.28.0.1', 60, NULL, '2025-07-28 12:28:32.837131+00', 'system', true, NULL, NULL, NULL, NULL);
INSERT INTO public.threat_responses VALUES (160, 'c62730f9-569d-4b58-910c-933d3172b56c', 'c97c6223-255d-4aee-b80f-d4583b8b17cf', 'RATE_LIMIT', 'ip', '172.28.0.1', 60, NULL, '2025-07-28 12:28:41.576332+00', 'system', true, NULL, NULL, NULL, NULL);
INSERT INTO public.threat_responses VALUES (141, '0aa3c78d-6f08-491b-a6fd-b63b735a9075', '5e761e57-a095-4f9e-8127-3efaa09107b8', 'RATE_LIMIT', 'ip', '172.28.0.1', 60, NULL, '2025-07-28 12:27:46.63752+00', 'system', true, NULL, NULL, NULL, NULL);
INSERT INTO public.threat_responses VALUES (142, 'b4aaf4b7-e15e-4418-8bfc-314589477cf0', 'eca12c05-a3b8-420b-a85b-5f07438c0b98', 'RATE_LIMIT', 'ip', '172.28.0.1', 60, NULL, '2025-07-28 12:27:46.660118+00', 'system', true, NULL, NULL, NULL, NULL);
INSERT INTO public.threat_responses VALUES (144, '3cbc9686-4947-40ec-91b8-951fd79ce9d0', '0618e059-8314-48d9-8be0-8c7caab19096', 'RATE_LIMIT', 'ip', '172.28.0.1', 60, NULL, '2025-07-28 12:28:28.034565+00', 'system', true, NULL, NULL, NULL, NULL);
INSERT INTO public.threat_responses VALUES (146, '2c16ab04-8e88-46b2-8a48-904b3cb6a33f', '726833ae-a14a-478e-adb0-47ca0bf764e9', 'RATE_LIMIT', 'ip', '172.28.0.1', 60, NULL, '2025-07-28 12:28:28.060879+00', 'system', true, NULL, NULL, NULL, NULL);
INSERT INTO public.threat_responses VALUES (147, '4d68e7ef-5fb2-40e7-b841-cc3029ccd07c', '591d2291-3f67-45fb-8382-325934c3fb2f', 'RATE_LIMIT', 'ip', '172.28.0.1', 60, NULL, '2025-07-28 12:28:32.818116+00', 'system', true, NULL, NULL, NULL, NULL);
INSERT INTO public.threat_responses VALUES (152, '0f550063-1c08-40b7-bfc3-4b5c178112f0', '5c7c63a1-c17c-4623-bc45-8c2d10b15e49', 'RATE_LIMIT', 'ip', '172.28.0.1', 60, NULL, '2025-07-28 12:28:34.910133+00', 'system', true, NULL, NULL, NULL, NULL);
INSERT INTO public.threat_responses VALUES (156, 'ea0bed96-04e6-4957-87fd-53a1b3204ee9', '34dd6f61-6668-4bc7-8cd6-f442a7e4d0c7', 'RATE_LIMIT', 'ip', '172.28.0.1', 60, NULL, '2025-07-28 12:28:41.272684+00', 'system', true, NULL, NULL, NULL, NULL);
INSERT INTO public.threat_responses VALUES (158, '0086d48a-e3ce-4438-9a86-cbd1240b53b9', '1ccde6d5-52f2-43ef-8c17-803575c969cd', 'RATE_LIMIT', 'ip', '172.28.0.1', 60, NULL, '2025-07-28 12:28:41.289306+00', 'system', true, NULL, NULL, NULL, NULL);
INSERT INTO public.threat_responses VALUES (159, '51a774a9-6a6d-4fa8-8613-b6cb4d0adf86', 'a48a6fb3-d9d2-4709-a73c-29202c2e0bfd', 'RATE_LIMIT', 'ip', '172.28.0.1', 60, NULL, '2025-07-28 12:28:41.566822+00', 'system', true, NULL, NULL, NULL, NULL);
INSERT INTO public.threat_responses VALUES (150, '90c34771-4bb9-4178-9399-28555cc55868', 'a87e6d9c-6722-469c-8b37-6bae0dabf9f6', 'RATE_LIMIT', 'ip', '172.28.0.1', 60, NULL, '2025-07-28 12:28:34.890242+00', 'system', true, NULL, NULL, NULL, NULL);
INSERT INTO public.threat_responses VALUES (153, 'b653d501-9fe0-4c10-9228-381ba91a4e1f', '84c13eaf-9ebc-4a39-9bc0-f62a0ee51022', 'RATE_LIMIT', 'ip', '172.28.0.1', 60, NULL, '2025-07-28 12:28:38.151364+00', 'system', true, NULL, NULL, NULL, NULL);
INSERT INTO public.threat_responses VALUES (157, 'd58707fa-7c55-4e29-a889-fd403c369ad1', '8ae4586c-c0b6-4e3e-94f3-7f60cc496a3e', 'RATE_LIMIT', 'ip', '172.28.0.1', 60, NULL, '2025-07-28 12:28:41.280405+00', 'system', true, NULL, NULL, NULL, NULL);


--
-- TOC entry 3955 (class 0 OID 24759)
-- Dependencies: 237
-- Data for Name: token_families; Type: TABLE DATA; Schema: public; Owner: securevault_user
--



--
-- TOC entry 3967 (class 0 OID 24949)
-- Dependencies: 249
-- Data for Name: user_encryption_keys; Type: TABLE DATA; Schema: public; Owner: securevault_user
--

INSERT INTO public.user_encryption_keys VALUES (1, 3, 'key_3_3ebcccac42e5e0e292a1f4157d15c07c', 'AES-256-GCM', 'PBKDF2-SHA256', 500000, 'Ljyi9OXKpJktDW7qeHyoCGOm3lthLhigBmRb8oCEvx8=', 'e9d39c147cad057748f03d9adcf9edaec14999ac6240080dc7c14085fed3d4a2', 'Default encryption key for document uploads', true, '2025-07-26 14:09:40.149749+00', 3, NULL, NULL, NULL);


--
-- TOC entry 3952 (class 0 OID 24711)
-- Dependencies: 234
-- Data for Name: user_roles; Type: TABLE DATA; Schema: public; Owner: securevault_user
--

INSERT INTO public.user_roles VALUES (2, 4, '2025-07-26 03:54:48.629486', NULL, NULL, true, true);
INSERT INTO public.user_roles VALUES (3, 5, '2025-07-26 03:54:48.629486', NULL, NULL, true, true);
INSERT INTO public.user_roles VALUES (5, 4, '2025-07-26 04:00:41.684308', NULL, NULL, true, true);
INSERT INTO public.user_roles VALUES (6, 4, '2025-07-26 04:01:20.381585', NULL, NULL, true, true);
INSERT INTO public.user_roles VALUES (7, 2, '2025-07-26 04:01:20.595233', NULL, NULL, true, true);
INSERT INTO public.user_roles VALUES (14, 2, '2025-07-30 23:20:54.9735', NULL, NULL, true, true);
INSERT INTO public.user_roles VALUES (15, 2, '2025-07-30 23:47:02.795737', NULL, NULL, true, true);


--
-- TOC entry 3936 (class 0 OID 16441)
-- Dependencies: 218
-- Data for Name: users; Type: TABLE DATA; Schema: public; Owner: securevault_user
--

INSERT INTO public.users VALUES (2, 'admin', 'admin@securevault.local', '$2b$12$9ztXXx2ld23Lx9MSoJzrAex41r6Y/cIFtF9VrVrIeVanN6vXE6JcO', true, true, false, 'admin', false, NULL, NULL, 0, NULL, '2025-07-25 21:10:53.110389', '2025-07-25 21:10:47.894066', '2025-07-25 21:10:47.894066', '2025-07-26 13:13:16.950863', NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, 'PBKDF2-SHA256', 500000);
INSERT INTO public.users VALUES (5, 'dbtest', 'dbtest@example.com', '$2b$12$8kWdMb.EvLTZNXycKgMeYeDeSEvYD9JuxlZ/89U0cfb2W.U83cfi2', false, false, true, 'user', false, NULL, NULL, 0, NULL, NULL, '2025-07-26 04:00:41.684308', '2025-07-26 04:00:41.684308', '2025-07-27 13:27:03.686529', NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, 'PBKDF2-SHA256', 500000);
INSERT INTO public.users VALUES (6, 'test_admin', 'test_admin@example.com', '$2b$12$WJoL5.GwCo4UbXxNHgf7TuhLEKAlhF8vxq2wcaSCDv27hkOXuxhTi', false, false, true, 'admin', false, NULL, NULL, 0, NULL, NULL, '2025-07-26 04:01:20.381585', '2025-07-26 04:01:20.381585', '2025-07-27 13:27:10.444996', NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, 'PBKDF2-SHA256', 500000);
INSERT INTO public.users VALUES (7, 'test_user', 'test_user@example.com', '$2b$12$tbgYJwScZcd3RRBMBFEP1.mkuc.JUmmH3c8dF4qjS0TQsxQkLt4dO', false, false, true, 'user', false, NULL, NULL, 0, NULL, NULL, '2025-07-26 04:01:20.595233', '2025-07-26 04:01:20.595233', '2025-07-27 13:27:15.910546', NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, 'PBKDF2-SHA256', 500000);
INSERT INTO public.users VALUES (9, 'testuser', 'test@example.com', '$2b$12$hhp3LZOJqSuals4/BwOt3eQsx2UiXEwqLyc9Z6ysW/eewIdB5O0nO', false, true, false, 'user', false, NULL, NULL, 0, NULL, NULL, '2025-07-26 13:18:01.805553', '2025-07-26 13:18:01.805553', '2025-07-28 12:27:32.179762', NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, 'PBKDF2-SHA256', 500000);
INSERT INTO public.users VALUES (12, 'zkuser1', 'zkuser1@example.com', '$2b$12$pr.LgQJfVrQlilGCexR.GesQTxlJ.1XVYCGFczLBJFEr/tQa/kLLC', true, true, false, 'user', false, NULL, NULL, 0, NULL, '2025-07-30 13:52:57.816497', '2025-07-30 13:44:01.32394', '2025-07-30 13:44:01.32394', '2025-07-30 13:52:57.590649', NULL, 'Zero Knowledge User', NULL, NULL, NULL, NULL, 'YWJjZGVmZ2hpamtsbW5vcHFyc3R1dnd4eXphYmNkZWY=', '{"ciphertext":"dGVzdGNpcGhlcnRleHQ=","iv":"dGVzdGl2dGVzdGl2","authTag":"dGVzdGF1dGh0YWc="}', 'PBKDF2-SHA256', 500000);
INSERT INTO public.users VALUES (3, 'arahuman', 'arahuman@securevault.local', '$2b$12$.iPeQKQW5ouMPSrxfWiWpu5ubcgxN8nKWXAsQ7t823np3e0zoTkxC', true, true, false, '5', false, NULL, NULL, 0, NULL, '2025-08-10 11:04:26.303351', '2025-07-26 00:23:05.428618', '2025-07-26 00:23:05.428618', '2025-08-10 11:04:26.008501', NULL, 'Admin User', NULL, NULL, NULL, NULL, NULL, NULL, 'PBKDF2-SHA256', 500000);
INSERT INTO public.users VALUES (14, 'rahumana', 'test@test.com', '$2b$12$mVNxg7xDDtGKTuPz4Y7yyu4c0cbZo8cA0rWEpTb7hvdjXtSRinFUi', true, true, false, 'user', false, NULL, NULL, 0, NULL, '2025-08-10 11:25:28.418315', '2025-07-30 17:54:59.533391', '2025-07-30 17:54:59.533391', '2025-08-10 11:25:28.124538', NULL, NULL, NULL, NULL, NULL, NULL, 'a3HQjTWfHTCa58oMKUQqzpNyFKZvuoevDpHFMhhGNnM=', '{"ciphertext":"1Dn4ScJlenCGOlZi5bEV5ill1A==","iv":"gj53mLaMahVvZfHK","authTag":"mH0G4xzbC8KERkTPkaMIUg=="}', 'PBKDF2-SHA256', 500000);
INSERT INTO public.users VALUES (13, 'testuser3', 'testuser3@example.com', '$2b$12$Q5fa3A2kwMDMkMqPlnUM6.u9QIeg1IB3jNvNMpWH10Ds63HMwjiy.', true, true, false, 'user', false, NULL, NULL, 0, NULL, '2025-07-30 14:18:44.040905', '2025-07-30 14:04:38.471919', '2025-07-30 14:04:38.471919', '2025-07-30 14:18:43.831289', NULL, 'Test User 3', NULL, NULL, NULL, NULL, 'Tzw14SHcvvEcY0i6zIZKuO5FtWAg0rm6t9X1zJarQ4g=', '{"nonce": "cYfWhnT2uqxrVPIj", "ciphertext": "2MbixzIZ7z1wUYaeLU7CSc4RFFsSqFSKoALISUz22G4h2v0pB2Nhxxsonr6Lui4uub8FhWt+GcNu604I8XlujUXNMm40", "validation_type": "simple"}', 'PBKDF2-SHA256', 500000);
INSERT INTO public.users VALUES (15, 'zktest', 'zktest@example.com', '$2b$12$n65cwhZsbed5mJgXk/ITzuqR6F/G4FkpiQeI9JrKerQbpOJQEYxvm', true, true, false, 'user', false, NULL, NULL, 0, NULL, '2025-07-30 23:46:35.857838', '2025-07-30 17:59:50.910776', '2025-07-30 17:59:50.910776', '2025-07-30 23:46:35.630829', NULL, 'ZK Test User', NULL, NULL, NULL, NULL, 'VBjdulNLSrhquFzDRpWR2FmA0Tsp/z5MLn2A66YMDrc=', '{"nonce": "Vd6K6bXooY9TL3Z/", "ciphertext": "kpVzzb6N84I+wdLhDqlW8ImwW4ldTFansmZ2nwhEawcksifcZB59C0DGn9I3+ZwtI3FN7PSglAM+7VCDmRfpA5rS", "validation_type": "simple"}', 'PBKDF2-SHA256', 500000);
INSERT INTO public.users VALUES (10, 'testuser123', 'testuser123@example.com', '$2b$12$1kJ7bJWa5IjjD8himrr0WOBVeQ3SQy9A2GuRVZ2gClTN2VDn7xvxu', false, false, true, 'user', false, NULL, NULL, 0, NULL, NULL, '2025-07-27 13:35:57.87837', '2025-07-27 13:35:57.87837', '2025-07-28 12:27:04.182388', NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, 'PBKDF2-SHA256', 500000);
INSERT INTO public.users VALUES (11, 'dna', 'sk@sk.com', '$2b$12$kc5EGt0lqzfl5kn4TSDp6.SdOVTbKpXVsvrxQoYnrU9J8T6DgV/bW', false, false, true, 'user', false, NULL, NULL, 0, NULL, NULL, '2025-07-27 13:54:02.491906', '2025-07-27 13:54:02.491906', '2025-07-28 12:27:08.702272', NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, 'PBKDF2-SHA256', 500000);


--
-- TOC entry 4024 (class 0 OID 0)
-- Dependencies: 254
-- Name: crypto_randomness_tests_id_seq; Type: SEQUENCE SET; Schema: public; Owner: securevault_user
--

SELECT pg_catalog.setval('public.crypto_randomness_tests_id_seq', 1, false);


--
-- TOC entry 4025 (class 0 OID 0)
-- Dependencies: 246
-- Name: document_access_logs_id_seq; Type: SEQUENCE SET; Schema: public; Owner: securevault_user
--

SELECT pg_catalog.setval('public.document_access_logs_id_seq', 832, true);


--
-- TOC entry 4026 (class 0 OID 0)
-- Dependencies: 240
-- Name: document_permissions_id_seq; Type: SEQUENCE SET; Schema: public; Owner: securevault_user
--

SELECT pg_catalog.setval('public.document_permissions_id_seq', 1, false);


--
-- TOC entry 4027 (class 0 OID 0)
-- Dependencies: 242
-- Name: document_shares_id_seq; Type: SEQUENCE SET; Schema: public; Owner: securevault_user
--

SELECT pg_catalog.setval('public.document_shares_id_seq', 1, false);


--
-- TOC entry 4028 (class 0 OID 0)
-- Dependencies: 244
-- Name: document_versions_id_seq; Type: SEQUENCE SET; Schema: public; Owner: securevault_user
--

SELECT pg_catalog.setval('public.document_versions_id_seq', 1, false);


--
-- TOC entry 4029 (class 0 OID 0)
-- Dependencies: 238
-- Name: documents_id_seq; Type: SEQUENCE SET; Schema: public; Owner: securevault_user
--

SELECT pg_catalog.setval('public.documents_id_seq', 483, true);


--
-- TOC entry 4030 (class 0 OID 0)
-- Dependencies: 258
-- Name: encryption_audit_logs_id_seq; Type: SEQUENCE SET; Schema: public; Owner: securevault_user
--

SELECT pg_catalog.setval('public.encryption_audit_logs_id_seq', 39, true);


--
-- TOC entry 4031 (class 0 OID 0)
-- Dependencies: 270
-- Name: ip_blocklist_id_seq; Type: SEQUENCE SET; Schema: public; Owner: securevault_user
--

SELECT pg_catalog.setval('public.ip_blocklist_id_seq', 1, false);


--
-- TOC entry 4032 (class 0 OID 0)
-- Dependencies: 256
-- Name: key_escrow_id_seq; Type: SEQUENCE SET; Schema: public; Owner: securevault_user
--

SELECT pg_catalog.setval('public.key_escrow_id_seq', 1, false);


--
-- TOC entry 4033 (class 0 OID 0)
-- Dependencies: 252
-- Name: key_rotation_logs_id_seq; Type: SEQUENCE SET; Schema: public; Owner: securevault_user
--

SELECT pg_catalog.setval('public.key_rotation_logs_id_seq', 1, false);


--
-- TOC entry 4034 (class 0 OID 0)
-- Dependencies: 250
-- Name: master_keys_id_seq; Type: SEQUENCE SET; Schema: public; Owner: securevault_user
--

SELECT pg_catalog.setval('public.master_keys_id_seq', 1, false);


--
-- TOC entry 4035 (class 0 OID 0)
-- Dependencies: 221
-- Name: mfa_audit_logs_id_seq; Type: SEQUENCE SET; Schema: public; Owner: securevault_user
--

SELECT pg_catalog.setval('public.mfa_audit_logs_id_seq', 20, true);


--
-- TOC entry 4036 (class 0 OID 0)
-- Dependencies: 223
-- Name: mfa_configuration_id_seq; Type: SEQUENCE SET; Schema: public; Owner: securevault_user
--

SELECT pg_catalog.setval('public.mfa_configuration_id_seq', 1, false);


--
-- TOC entry 4037 (class 0 OID 0)
-- Dependencies: 225
-- Name: mfa_failed_attempts_id_seq; Type: SEQUENCE SET; Schema: public; Owner: securevault_user
--

SELECT pg_catalog.setval('public.mfa_failed_attempts_id_seq', 1, false);


--
-- TOC entry 4038 (class 0 OID 0)
-- Dependencies: 219
-- Name: mfa_used_codes_id_seq; Type: SEQUENCE SET; Schema: public; Owner: securevault_user
--

SELECT pg_catalog.setval('public.mfa_used_codes_id_seq', 5, true);


--
-- TOC entry 4039 (class 0 OID 0)
-- Dependencies: 229
-- Name: permissions_id_seq; Type: SEQUENCE SET; Schema: public; Owner: securevault_user
--

SELECT pg_catalog.setval('public.permissions_id_seq', 30, true);


--
-- TOC entry 4040 (class 0 OID 0)
-- Dependencies: 231
-- Name: resource_permissions_id_seq; Type: SEQUENCE SET; Schema: public; Owner: securevault_user
--

SELECT pg_catalog.setval('public.resource_permissions_id_seq', 1, false);


--
-- TOC entry 4041 (class 0 OID 0)
-- Dependencies: 235
-- Name: role_hierarchy_id_seq; Type: SEQUENCE SET; Schema: public; Owner: securevault_user
--

SELECT pg_catalog.setval('public.role_hierarchy_id_seq', 1, false);


--
-- TOC entry 4042 (class 0 OID 0)
-- Dependencies: 227
-- Name: roles_id_seq; Type: SEQUENCE SET; Schema: public; Owner: securevault_user
--

SELECT pg_catalog.setval('public.roles_id_seq', 5, true);


--
-- TOC entry 4043 (class 0 OID 0)
-- Dependencies: 268
-- Name: security_alerts_id_seq; Type: SEQUENCE SET; Schema: public; Owner: securevault_user
--

SELECT pg_catalog.setval('public.security_alerts_id_seq', 1, false);


--
-- TOC entry 4044 (class 0 OID 0)
-- Dependencies: 260
-- Name: security_events_id_seq; Type: SEQUENCE SET; Schema: public; Owner: securevault_user
--

SELECT pg_catalog.setval('public.security_events_id_seq', 160, true);


--
-- TOC entry 4045 (class 0 OID 0)
-- Dependencies: 264
-- Name: security_metrics_id_seq; Type: SEQUENCE SET; Schema: public; Owner: securevault_user
--

SELECT pg_catalog.setval('public.security_metrics_id_seq', 1, false);


--
-- TOC entry 4046 (class 0 OID 0)
-- Dependencies: 262
-- Name: suspicious_patterns_id_seq; Type: SEQUENCE SET; Schema: public; Owner: securevault_user
--

SELECT pg_catalog.setval('public.suspicious_patterns_id_seq', 1, false);


--
-- TOC entry 4047 (class 0 OID 0)
-- Dependencies: 266
-- Name: threat_responses_id_seq; Type: SEQUENCE SET; Schema: public; Owner: securevault_user
--

SELECT pg_catalog.setval('public.threat_responses_id_seq', 160, true);


--
-- TOC entry 4048 (class 0 OID 0)
-- Dependencies: 248
-- Name: user_encryption_keys_id_seq; Type: SEQUENCE SET; Schema: public; Owner: securevault_user
--

SELECT pg_catalog.setval('public.user_encryption_keys_id_seq', 1, true);


--
-- TOC entry 4049 (class 0 OID 0)
-- Dependencies: 217
-- Name: users_id_seq; Type: SEQUENCE SET; Schema: public; Owner: securevault_user
--

SELECT pg_catalog.setval('public.users_id_seq', 15, true);


--
-- TOC entry 3651 (class 2606 OID 25025)
-- Name: crypto_randomness_tests crypto_randomness_tests_pkey; Type: CONSTRAINT; Schema: public; Owner: securevault_user
--

ALTER TABLE ONLY public.crypto_randomness_tests
    ADD CONSTRAINT crypto_randomness_tests_pkey PRIMARY KEY (id);


--
-- TOC entry 3618 (class 2606 OID 24929)
-- Name: document_access_logs document_access_logs_pkey; Type: CONSTRAINT; Schema: public; Owner: securevault_user
--

ALTER TABLE ONLY public.document_access_logs
    ADD CONSTRAINT document_access_logs_pkey PRIMARY KEY (id);


--
-- TOC entry 3597 (class 2606 OID 24834)
-- Name: document_permissions document_permissions_pkey; Type: CONSTRAINT; Schema: public; Owner: securevault_user
--

ALTER TABLE ONLY public.document_permissions
    ADD CONSTRAINT document_permissions_pkey PRIMARY KEY (id);


--
-- TOC entry 3604 (class 2606 OID 24871)
-- Name: document_shares document_shares_pkey; Type: CONSTRAINT; Schema: public; Owner: securevault_user
--

ALTER TABLE ONLY public.document_shares
    ADD CONSTRAINT document_shares_pkey PRIMARY KEY (id);


--
-- TOC entry 3612 (class 2606 OID 24904)
-- Name: document_versions document_versions_pkey; Type: CONSTRAINT; Schema: public; Owner: securevault_user
--

ALTER TABLE ONLY public.document_versions
    ADD CONSTRAINT document_versions_pkey PRIMARY KEY (id);


--
-- TOC entry 3581 (class 2606 OID 24784)
-- Name: documents documents_pkey; Type: CONSTRAINT; Schema: public; Owner: securevault_user
--

ALTER TABLE ONLY public.documents
    ADD CONSTRAINT documents_pkey PRIMARY KEY (id);


--
-- TOC entry 3670 (class 2606 OID 25085)
-- Name: encryption_audit_logs encryption_audit_logs_pkey; Type: CONSTRAINT; Schema: public; Owner: securevault_user
--

ALTER TABLE ONLY public.encryption_audit_logs
    ADD CONSTRAINT encryption_audit_logs_pkey PRIMARY KEY (id);


--
-- TOC entry 3735 (class 2606 OID 25277)
-- Name: ip_blocklist ip_blocklist_pkey; Type: CONSTRAINT; Schema: public; Owner: securevault_user
--

ALTER TABLE ONLY public.ip_blocklist
    ADD CONSTRAINT ip_blocklist_pkey PRIMARY KEY (id);


--
-- TOC entry 3666 (class 2606 OID 25041)
-- Name: key_escrow key_escrow_pkey; Type: CONSTRAINT; Schema: public; Owner: securevault_user
--

ALTER TABLE ONLY public.key_escrow
    ADD CONSTRAINT key_escrow_pkey PRIMARY KEY (id);


--
-- TOC entry 3649 (class 2606 OID 25003)
-- Name: key_rotation_logs key_rotation_logs_pkey; Type: CONSTRAINT; Schema: public; Owner: securevault_user
--

ALTER TABLE ONLY public.key_rotation_logs
    ADD CONSTRAINT key_rotation_logs_pkey PRIMARY KEY (id);


--
-- TOC entry 3640 (class 2606 OID 24983)
-- Name: master_keys master_keys_pkey; Type: CONSTRAINT; Schema: public; Owner: securevault_user
--

ALTER TABLE ONLY public.master_keys
    ADD CONSTRAINT master_keys_pkey PRIMARY KEY (id);


--
-- TOC entry 3533 (class 2606 OID 16476)
-- Name: mfa_audit_logs mfa_audit_logs_pkey; Type: CONSTRAINT; Schema: public; Owner: securevault_user
--

ALTER TABLE ONLY public.mfa_audit_logs
    ADD CONSTRAINT mfa_audit_logs_pkey PRIMARY KEY (id);


--
-- TOC entry 3536 (class 2606 OID 16501)
-- Name: mfa_configuration mfa_configuration_pkey; Type: CONSTRAINT; Schema: public; Owner: securevault_user
--

ALTER TABLE ONLY public.mfa_configuration
    ADD CONSTRAINT mfa_configuration_pkey PRIMARY KEY (id);


--
-- TOC entry 3542 (class 2606 OID 16516)
-- Name: mfa_failed_attempts mfa_failed_attempts_pkey; Type: CONSTRAINT; Schema: public; Owner: securevault_user
--

ALTER TABLE ONLY public.mfa_failed_attempts
    ADD CONSTRAINT mfa_failed_attempts_pkey PRIMARY KEY (id);


--
-- TOC entry 3525 (class 2606 OID 16458)
-- Name: mfa_used_codes mfa_used_codes_pkey; Type: CONSTRAINT; Schema: public; Owner: securevault_user
--

ALTER TABLE ONLY public.mfa_used_codes
    ADD CONSTRAINT mfa_used_codes_pkey PRIMARY KEY (id);


--
-- TOC entry 3554 (class 2606 OID 24657)
-- Name: permissions permissions_pkey; Type: CONSTRAINT; Schema: public; Owner: securevault_user
--

ALTER TABLE ONLY public.permissions
    ADD CONSTRAINT permissions_pkey PRIMARY KEY (id);


--
-- TOC entry 3561 (class 2606 OID 24671)
-- Name: resource_permissions resource_permissions_pkey; Type: CONSTRAINT; Schema: public; Owner: securevault_user
--

ALTER TABLE ONLY public.resource_permissions
    ADD CONSTRAINT resource_permissions_pkey PRIMARY KEY (id);


--
-- TOC entry 3573 (class 2606 OID 24738)
-- Name: role_hierarchy role_hierarchy_pkey; Type: CONSTRAINT; Schema: public; Owner: securevault_user
--

ALTER TABLE ONLY public.role_hierarchy
    ADD CONSTRAINT role_hierarchy_pkey PRIMARY KEY (id);


--
-- TOC entry 3565 (class 2606 OID 24695)
-- Name: role_permissions role_permissions_pkey; Type: CONSTRAINT; Schema: public; Owner: securevault_user
--

ALTER TABLE ONLY public.role_permissions
    ADD CONSTRAINT role_permissions_pkey PRIMARY KEY (role_id, permission_id);


--
-- TOC entry 3547 (class 2606 OID 24640)
-- Name: roles roles_pkey; Type: CONSTRAINT; Schema: public; Owner: securevault_user
--

ALTER TABLE ONLY public.roles
    ADD CONSTRAINT roles_pkey PRIMARY KEY (id);


--
-- TOC entry 3731 (class 2606 OID 25250)
-- Name: security_alerts security_alerts_pkey; Type: CONSTRAINT; Schema: public; Owner: securevault_user
--

ALTER TABLE ONLY public.security_alerts
    ADD CONSTRAINT security_alerts_pkey PRIMARY KEY (id);


--
-- TOC entry 3699 (class 2606 OID 25150)
-- Name: security_events security_events_pkey; Type: CONSTRAINT; Schema: public; Owner: securevault_user
--

ALTER TABLE ONLY public.security_events
    ADD CONSTRAINT security_events_pkey PRIMARY KEY (id);


--
-- TOC entry 3713 (class 2606 OID 25211)
-- Name: security_metrics security_metrics_pkey; Type: CONSTRAINT; Schema: public; Owner: securevault_user
--

ALTER TABLE ONLY public.security_metrics
    ADD CONSTRAINT security_metrics_pkey PRIMARY KEY (id);


--
-- TOC entry 3708 (class 2606 OID 25190)
-- Name: suspicious_patterns suspicious_patterns_pkey; Type: CONSTRAINT; Schema: public; Owner: securevault_user
--

ALTER TABLE ONLY public.suspicious_patterns
    ADD CONSTRAINT suspicious_patterns_pkey PRIMARY KEY (id);


--
-- TOC entry 3722 (class 2606 OID 25224)
-- Name: threat_responses threat_responses_pkey; Type: CONSTRAINT; Schema: public; Owner: securevault_user
--

ALTER TABLE ONLY public.threat_responses
    ADD CONSTRAINT threat_responses_pkey PRIMARY KEY (id);


--
-- TOC entry 3579 (class 2606 OID 24763)
-- Name: token_families token_families_pkey; Type: CONSTRAINT; Schema: public; Owner: securevault_user
--

ALTER TABLE ONLY public.token_families
    ADD CONSTRAINT token_families_pkey PRIMARY KEY (id);


--
-- TOC entry 3668 (class 2606 OID 25043)
-- Name: key_escrow uq_key_escrow_key_id; Type: CONSTRAINT; Schema: public; Owner: securevault_user
--

ALTER TABLE ONLY public.key_escrow
    ADD CONSTRAINT uq_key_escrow_key_id UNIQUE (key_id);


--
-- TOC entry 3563 (class 2606 OID 24673)
-- Name: resource_permissions uq_resource_permission; Type: CONSTRAINT; Schema: public; Owner: securevault_user
--

ALTER TABLE ONLY public.resource_permissions
    ADD CONSTRAINT uq_resource_permission UNIQUE (resource_type, resource_id, subject_type, subject_id, permission);


--
-- TOC entry 3575 (class 2606 OID 24740)
-- Name: role_hierarchy uq_role_hierarchy; Type: CONSTRAINT; Schema: public; Owner: securevault_user
--

ALTER TABLE ONLY public.role_hierarchy
    ADD CONSTRAINT uq_role_hierarchy UNIQUE (parent_role_id, child_role_id);


--
-- TOC entry 3568 (class 2606 OID 24715)
-- Name: user_roles uq_user_role; Type: CONSTRAINT; Schema: public; Owner: securevault_user
--

ALTER TABLE ONLY public.user_roles
    ADD CONSTRAINT uq_user_role PRIMARY KEY (user_id, role_id);


--
-- TOC entry 3633 (class 2606 OID 24957)
-- Name: user_encryption_keys user_encryption_keys_pkey; Type: CONSTRAINT; Schema: public; Owner: securevault_user
--

ALTER TABLE ONLY public.user_encryption_keys
    ADD CONSTRAINT user_encryption_keys_pkey PRIMARY KEY (id);


--
-- TOC entry 3519 (class 2606 OID 16448)
-- Name: users users_pkey; Type: CONSTRAINT; Schema: public; Owner: securevault_user
--

ALTER TABLE ONLY public.users
    ADD CONSTRAINT users_pkey PRIMARY KEY (id);


--
-- TOC entry 3652 (class 1259 OID 25026)
-- Name: idx_crypto_randomness_passed; Type: INDEX; Schema: public; Owner: securevault_user
--

CREATE INDEX idx_crypto_randomness_passed ON public.crypto_randomness_tests USING btree (test_passed);


--
-- TOC entry 3653 (class 1259 OID 25031)
-- Name: idx_crypto_randomness_timestamp; Type: INDEX; Schema: public; Owner: securevault_user
--

CREATE INDEX idx_crypto_randomness_timestamp ON public.crypto_randomness_tests USING btree (test_timestamp);


--
-- TOC entry 3654 (class 1259 OID 25030)
-- Name: idx_crypto_randomness_type; Type: INDEX; Schema: public; Owner: securevault_user
--

CREATE INDEX idx_crypto_randomness_type ON public.crypto_randomness_tests USING btree (test_type);


--
-- TOC entry 3619 (class 1259 OID 24944)
-- Name: idx_doc_access_logs_accessed_at; Type: INDEX; Schema: public; Owner: securevault_user
--

CREATE INDEX idx_doc_access_logs_accessed_at ON public.document_access_logs USING btree (accessed_at);


--
-- TOC entry 3620 (class 1259 OID 24941)
-- Name: idx_doc_access_logs_doc_action; Type: INDEX; Schema: public; Owner: securevault_user
--

CREATE INDEX idx_doc_access_logs_doc_action ON public.document_access_logs USING btree (document_id, action);


--
-- TOC entry 3621 (class 1259 OID 24946)
-- Name: idx_doc_access_logs_user_accessed; Type: INDEX; Schema: public; Owner: securevault_user
--

CREATE INDEX idx_doc_access_logs_user_accessed ON public.document_access_logs USING btree (user_id, accessed_at);


--
-- TOC entry 3598 (class 1259 OID 24859)
-- Name: idx_doc_permissions_doc_user; Type: INDEX; Schema: public; Owner: securevault_user
--

CREATE INDEX idx_doc_permissions_doc_user ON public.document_permissions USING btree (document_id, user_id);


--
-- TOC entry 3599 (class 1259 OID 24855)
-- Name: idx_doc_permissions_type_granted; Type: INDEX; Schema: public; Owner: securevault_user
--

CREATE INDEX idx_doc_permissions_type_granted ON public.document_permissions USING btree (permission_type, granted);


--
-- TOC entry 3605 (class 1259 OID 24889)
-- Name: idx_doc_shares_document_active; Type: INDEX; Schema: public; Owner: securevault_user
--

CREATE INDEX idx_doc_shares_document_active ON public.document_shares USING btree (document_id, is_active);


--
-- TOC entry 3606 (class 1259 OID 24892)
-- Name: idx_doc_shares_token_active; Type: INDEX; Schema: public; Owner: securevault_user
--

CREATE INDEX idx_doc_shares_token_active ON public.document_shares USING btree (share_token, is_active);


--
-- TOC entry 3613 (class 1259 OID 24918)
-- Name: idx_doc_versions_doc_current; Type: INDEX; Schema: public; Owner: securevault_user
--

CREATE INDEX idx_doc_versions_doc_current ON public.document_versions USING btree (document_id, is_current);


--
-- TOC entry 3614 (class 1259 OID 24916)
-- Name: idx_doc_versions_doc_version; Type: INDEX; Schema: public; Owner: securevault_user
--

CREATE INDEX idx_doc_versions_doc_version ON public.document_versions USING btree (document_id, version_number);


--
-- TOC entry 3582 (class 1259 OID 24819)
-- Name: idx_documents_created_at; Type: INDEX; Schema: public; Owner: securevault_user
--

CREATE INDEX idx_documents_created_at ON public.documents USING btree (created_at);


--
-- TOC entry 3583 (class 1259 OID 24813)
-- Name: idx_documents_name_type; Type: INDEX; Schema: public; Owner: securevault_user
--

CREATE INDEX idx_documents_name_type ON public.documents USING btree (name, document_type);


--
-- TOC entry 3584 (class 1259 OID 24816)
-- Name: idx_documents_owner_status; Type: INDEX; Schema: public; Owner: securevault_user
--

CREATE INDEX idx_documents_owner_status ON public.documents USING btree (owner_id, status);


--
-- TOC entry 3585 (class 1259 OID 24817)
-- Name: idx_documents_parent_type; Type: INDEX; Schema: public; Owner: securevault_user
--

CREATE INDEX idx_documents_parent_type ON public.documents USING btree (parent_id, document_type);


--
-- TOC entry 3586 (class 1259 OID 24812)
-- Name: idx_documents_path_status; Type: INDEX; Schema: public; Owner: securevault_user
--

CREATE INDEX idx_documents_path_status ON public.documents USING btree (path, status);


--
-- TOC entry 3587 (class 1259 OID 24822)
-- Name: idx_documents_updated_at; Type: INDEX; Schema: public; Owner: securevault_user
--

CREATE INDEX idx_documents_updated_at ON public.documents USING btree (updated_at);


--
-- TOC entry 3671 (class 1259 OID 25100)
-- Name: idx_encryption_audit_operation; Type: INDEX; Schema: public; Owner: securevault_user
--

CREATE INDEX idx_encryption_audit_operation ON public.encryption_audit_logs USING btree (operation_id);


--
-- TOC entry 3672 (class 1259 OID 25098)
-- Name: idx_encryption_audit_risk; Type: INDEX; Schema: public; Owner: securevault_user
--

CREATE INDEX idx_encryption_audit_risk ON public.encryption_audit_logs USING btree (risk_score);


--
-- TOC entry 3673 (class 1259 OID 25096)
-- Name: idx_encryption_audit_success; Type: INDEX; Schema: public; Owner: securevault_user
--

CREATE INDEX idx_encryption_audit_success ON public.encryption_audit_logs USING btree (success);


--
-- TOC entry 3674 (class 1259 OID 25105)
-- Name: idx_encryption_audit_timestamp; Type: INDEX; Schema: public; Owner: securevault_user
--

CREATE INDEX idx_encryption_audit_timestamp ON public.encryption_audit_logs USING btree ("timestamp");


--
-- TOC entry 3675 (class 1259 OID 25102)
-- Name: idx_encryption_audit_user_action; Type: INDEX; Schema: public; Owner: securevault_user
--

CREATE INDEX idx_encryption_audit_user_action ON public.encryption_audit_logs USING btree (user_id, action);


--
-- TOC entry 3732 (class 1259 OID 25291)
-- Name: idx_ip_blocklist_expires; Type: INDEX; Schema: public; Owner: securevault_user
--

CREATE INDEX idx_ip_blocklist_expires ON public.ip_blocklist USING btree (expires_at);


--
-- TOC entry 3733 (class 1259 OID 25289)
-- Name: idx_ip_blocklist_permanent; Type: INDEX; Schema: public; Owner: securevault_user
--

CREATE INDEX idx_ip_blocklist_permanent ON public.ip_blocklist USING btree (is_permanent);


--
-- TOC entry 3658 (class 1259 OID 25070)
-- Name: idx_key_escrow_created; Type: INDEX; Schema: public; Owner: securevault_user
--

CREATE INDEX idx_key_escrow_created ON public.key_escrow USING btree (created_at);


--
-- TOC entry 3659 (class 1259 OID 25073)
-- Name: idx_key_escrow_recovered; Type: INDEX; Schema: public; Owner: securevault_user
--

CREATE INDEX idx_key_escrow_recovered ON public.key_escrow USING btree (recovered_at);


--
-- TOC entry 3660 (class 1259 OID 25074)
-- Name: idx_key_escrow_user; Type: INDEX; Schema: public; Owner: securevault_user
--

CREATE INDEX idx_key_escrow_user ON public.key_escrow USING btree (user_id);


--
-- TOC entry 3641 (class 1259 OID 25014)
-- Name: idx_key_rotation_started; Type: INDEX; Schema: public; Owner: securevault_user
--

CREATE INDEX idx_key_rotation_started ON public.key_rotation_logs USING btree (started_at);


--
-- TOC entry 3642 (class 1259 OID 25013)
-- Name: idx_key_rotation_status; Type: INDEX; Schema: public; Owner: securevault_user
--

CREATE INDEX idx_key_rotation_status ON public.key_rotation_logs USING btree (status);


--
-- TOC entry 3643 (class 1259 OID 25010)
-- Name: idx_key_rotation_user; Type: INDEX; Schema: public; Owner: securevault_user
--

CREATE INDEX idx_key_rotation_user ON public.key_rotation_logs USING btree (user_id);


--
-- TOC entry 3634 (class 1259 OID 24990)
-- Name: idx_master_keys_purpose_active; Type: INDEX; Schema: public; Owner: securevault_user
--

CREATE INDEX idx_master_keys_purpose_active ON public.master_keys USING btree (purpose, is_active);


--
-- TOC entry 3635 (class 1259 OID 24992)
-- Name: idx_master_keys_rotation; Type: INDEX; Schema: public; Owner: securevault_user
--

CREATE INDEX idx_master_keys_rotation ON public.master_keys USING btree (next_rotation_at);


--
-- TOC entry 3526 (class 1259 OID 16491)
-- Name: idx_mfa_audit_event_time; Type: INDEX; Schema: public; Owner: securevault_user
--

CREATE INDEX idx_mfa_audit_event_time ON public.mfa_audit_logs USING btree (event_type, created_at);


--
-- TOC entry 3527 (class 1259 OID 16487)
-- Name: idx_mfa_audit_user_time; Type: INDEX; Schema: public; Owner: securevault_user
--

CREATE INDEX idx_mfa_audit_user_time ON public.mfa_audit_logs USING btree (user_id, created_at);


--
-- TOC entry 3537 (class 1259 OID 16524)
-- Name: idx_mfa_failed_user_time; Type: INDEX; Schema: public; Owner: securevault_user
--

CREATE INDEX idx_mfa_failed_user_time ON public.mfa_failed_attempts USING btree (user_id, attempted_at);


--
-- TOC entry 3520 (class 1259 OID 16465)
-- Name: idx_mfa_used_codes_expires; Type: INDEX; Schema: public; Owner: securevault_user
--

CREATE INDEX idx_mfa_used_codes_expires ON public.mfa_used_codes USING btree (expires_at);


--
-- TOC entry 3521 (class 1259 OID 16467)
-- Name: idx_mfa_used_codes_user_time; Type: INDEX; Schema: public; Owner: securevault_user
--

CREATE INDEX idx_mfa_used_codes_user_time ON public.mfa_used_codes USING btree (user_id, time_window);


--
-- TOC entry 3548 (class 1259 OID 24658)
-- Name: idx_permission_resource_action; Type: INDEX; Schema: public; Owner: securevault_user
--

CREATE INDEX idx_permission_resource_action ON public.permissions USING btree (resource_type, action);


--
-- TOC entry 3555 (class 1259 OID 24686)
-- Name: idx_resource_permission_inheritance; Type: INDEX; Schema: public; Owner: securevault_user
--

CREATE INDEX idx_resource_permission_inheritance ON public.resource_permissions USING btree (inheritable, inherited_from);


--
-- TOC entry 3556 (class 1259 OID 24684)
-- Name: idx_resource_permission_lookup; Type: INDEX; Schema: public; Owner: securevault_user
--

CREATE INDEX idx_resource_permission_lookup ON public.resource_permissions USING btree (resource_type, resource_id, subject_type, subject_id);


--
-- TOC entry 3569 (class 1259 OID 24756)
-- Name: idx_role_hierarchy_child; Type: INDEX; Schema: public; Owner: securevault_user
--

CREATE INDEX idx_role_hierarchy_child ON public.role_hierarchy USING btree (child_role_id);


--
-- TOC entry 3570 (class 1259 OID 24757)
-- Name: idx_role_hierarchy_parent; Type: INDEX; Schema: public; Owner: securevault_user
--

CREATE INDEX idx_role_hierarchy_parent ON public.role_hierarchy USING btree (parent_role_id);


--
-- TOC entry 3723 (class 1259 OID 25262)
-- Name: idx_security_alerts_sent; Type: INDEX; Schema: public; Owner: securevault_user
--

CREATE INDEX idx_security_alerts_sent ON public.security_alerts USING btree (sent_at);


--
-- TOC entry 3724 (class 1259 OID 25267)
-- Name: idx_security_alerts_status; Type: INDEX; Schema: public; Owner: securevault_user
--

CREATE INDEX idx_security_alerts_status ON public.security_alerts USING btree (delivery_status);


--
-- TOC entry 3725 (class 1259 OID 25265)
-- Name: idx_security_alerts_type; Type: INDEX; Schema: public; Owner: securevault_user
--

CREATE INDEX idx_security_alerts_type ON public.security_alerts USING btree (alert_type);


--
-- TOC entry 3683 (class 1259 OID 25170)
-- Name: idx_security_events_correlation; Type: INDEX; Schema: public; Owner: securevault_user
--

CREATE INDEX idx_security_events_correlation ON public.security_events USING btree (correlation_id);


--
-- TOC entry 3684 (class 1259 OID 25171)
-- Name: idx_security_events_detected; Type: INDEX; Schema: public; Owner: securevault_user
--

CREATE INDEX idx_security_events_detected ON public.security_events USING btree (detected_at);


--
-- TOC entry 3685 (class 1259 OID 25174)
-- Name: idx_security_events_type_level; Type: INDEX; Schema: public; Owner: securevault_user
--

CREATE INDEX idx_security_events_type_level ON public.security_events USING btree (event_type, threat_level);


--
-- TOC entry 3686 (class 1259 OID 25168)
-- Name: idx_security_events_user_ip; Type: INDEX; Schema: public; Owner: securevault_user
--

CREATE INDEX idx_security_events_user_ip ON public.security_events USING btree (user_id, source_ip);


--
-- TOC entry 3709 (class 1259 OID 25213)
-- Name: idx_security_metrics_date; Type: INDEX; Schema: public; Owner: securevault_user
--

CREATE INDEX idx_security_metrics_date ON public.security_metrics USING btree (metric_date);


--
-- TOC entry 3700 (class 1259 OID 25198)
-- Name: idx_suspicious_patterns_active; Type: INDEX; Schema: public; Owner: securevault_user
--

CREATE INDEX idx_suspicious_patterns_active ON public.suspicious_patterns USING btree (is_active);


--
-- TOC entry 3701 (class 1259 OID 25200)
-- Name: idx_suspicious_patterns_level; Type: INDEX; Schema: public; Owner: securevault_user
--

CREATE INDEX idx_suspicious_patterns_level ON public.suspicious_patterns USING btree (threat_level);


--
-- TOC entry 3702 (class 1259 OID 25196)
-- Name: idx_suspicious_patterns_type; Type: INDEX; Schema: public; Owner: securevault_user
--

CREATE INDEX idx_suspicious_patterns_type ON public.suspicious_patterns USING btree (pattern_type);


--
-- TOC entry 3714 (class 1259 OID 25241)
-- Name: idx_threat_responses_action; Type: INDEX; Schema: public; Owner: securevault_user
--

CREATE INDEX idx_threat_responses_action ON public.threat_responses USING btree (action);


--
-- TOC entry 3715 (class 1259 OID 25240)
-- Name: idx_threat_responses_executed; Type: INDEX; Schema: public; Owner: securevault_user
--

CREATE INDEX idx_threat_responses_executed ON public.threat_responses USING btree (executed_at);


--
-- TOC entry 3716 (class 1259 OID 25235)
-- Name: idx_threat_responses_target; Type: INDEX; Schema: public; Owner: securevault_user
--

CREATE INDEX idx_threat_responses_target ON public.threat_responses USING btree (target_type, target_value);


--
-- TOC entry 3626 (class 1259 OID 24973)
-- Name: idx_user_encryption_keys_created; Type: INDEX; Schema: public; Owner: securevault_user
--

CREATE INDEX idx_user_encryption_keys_created ON public.user_encryption_keys USING btree (created_at);


--
-- TOC entry 3627 (class 1259 OID 24970)
-- Name: idx_user_encryption_keys_user_active; Type: INDEX; Schema: public; Owner: securevault_user
--

CREATE INDEX idx_user_encryption_keys_user_active ON public.user_encryption_keys USING btree (user_id, is_active);


--
-- TOC entry 3566 (class 1259 OID 24731)
-- Name: idx_user_role_active; Type: INDEX; Schema: public; Owner: securevault_user
--

CREATE INDEX idx_user_role_active ON public.user_roles USING btree (user_id, is_active);


--
-- TOC entry 3655 (class 1259 OID 25029)
-- Name: ix_crypto_randomness_tests_id; Type: INDEX; Schema: public; Owner: securevault_user
--

CREATE INDEX ix_crypto_randomness_tests_id ON public.crypto_randomness_tests USING btree (id);


--
-- TOC entry 3656 (class 1259 OID 25027)
-- Name: ix_crypto_randomness_tests_test_passed; Type: INDEX; Schema: public; Owner: securevault_user
--

CREATE INDEX ix_crypto_randomness_tests_test_passed ON public.crypto_randomness_tests USING btree (test_passed);


--
-- TOC entry 3657 (class 1259 OID 25028)
-- Name: ix_crypto_randomness_tests_test_type; Type: INDEX; Schema: public; Owner: securevault_user
--

CREATE INDEX ix_crypto_randomness_tests_test_type ON public.crypto_randomness_tests USING btree (test_type);


--
-- TOC entry 3622 (class 1259 OID 24943)
-- Name: ix_document_access_logs_action; Type: INDEX; Schema: public; Owner: securevault_user
--

CREATE INDEX ix_document_access_logs_action ON public.document_access_logs USING btree (action);


--
-- TOC entry 3623 (class 1259 OID 24940)
-- Name: ix_document_access_logs_document_id; Type: INDEX; Schema: public; Owner: securevault_user
--

CREATE INDEX ix_document_access_logs_document_id ON public.document_access_logs USING btree (document_id);


--
-- TOC entry 3624 (class 1259 OID 24945)
-- Name: ix_document_access_logs_id; Type: INDEX; Schema: public; Owner: securevault_user
--

CREATE INDEX ix_document_access_logs_id ON public.document_access_logs USING btree (id);


--
-- TOC entry 3625 (class 1259 OID 24942)
-- Name: ix_document_access_logs_user_id; Type: INDEX; Schema: public; Owner: securevault_user
--

CREATE INDEX ix_document_access_logs_user_id ON public.document_access_logs USING btree (user_id);


--
-- TOC entry 3600 (class 1259 OID 24857)
-- Name: ix_document_permissions_document_id; Type: INDEX; Schema: public; Owner: securevault_user
--

CREATE INDEX ix_document_permissions_document_id ON public.document_permissions USING btree (document_id);


--
-- TOC entry 3601 (class 1259 OID 24856)
-- Name: ix_document_permissions_id; Type: INDEX; Schema: public; Owner: securevault_user
--

CREATE INDEX ix_document_permissions_id ON public.document_permissions USING btree (id);


--
-- TOC entry 3602 (class 1259 OID 24858)
-- Name: ix_document_permissions_user_id; Type: INDEX; Schema: public; Owner: securevault_user
--

CREATE INDEX ix_document_permissions_user_id ON public.document_permissions USING btree (user_id);


--
-- TOC entry 3607 (class 1259 OID 24891)
-- Name: ix_document_shares_document_id; Type: INDEX; Schema: public; Owner: securevault_user
--

CREATE INDEX ix_document_shares_document_id ON public.document_shares USING btree (document_id);


--
-- TOC entry 3608 (class 1259 OID 24887)
-- Name: ix_document_shares_id; Type: INDEX; Schema: public; Owner: securevault_user
--

CREATE INDEX ix_document_shares_id ON public.document_shares USING btree (id);


--
-- TOC entry 3609 (class 1259 OID 24888)
-- Name: ix_document_shares_share_token; Type: INDEX; Schema: public; Owner: securevault_user
--

CREATE UNIQUE INDEX ix_document_shares_share_token ON public.document_shares USING btree (share_token);


--
-- TOC entry 3610 (class 1259 OID 24890)
-- Name: ix_document_shares_uuid; Type: INDEX; Schema: public; Owner: securevault_user
--

CREATE UNIQUE INDEX ix_document_shares_uuid ON public.document_shares USING btree (uuid);


--
-- TOC entry 3615 (class 1259 OID 24915)
-- Name: ix_document_versions_document_id; Type: INDEX; Schema: public; Owner: securevault_user
--

CREATE INDEX ix_document_versions_document_id ON public.document_versions USING btree (document_id);


--
-- TOC entry 3616 (class 1259 OID 24917)
-- Name: ix_document_versions_id; Type: INDEX; Schema: public; Owner: securevault_user
--

CREATE INDEX ix_document_versions_id ON public.document_versions USING btree (id);


--
-- TOC entry 3588 (class 1259 OID 24818)
-- Name: ix_documents_depth_level; Type: INDEX; Schema: public; Owner: securevault_user
--

CREATE INDEX ix_documents_depth_level ON public.documents USING btree (depth_level);


--
-- TOC entry 3589 (class 1259 OID 24810)
-- Name: ix_documents_id; Type: INDEX; Schema: public; Owner: securevault_user
--

CREATE INDEX ix_documents_id ON public.documents USING btree (id);


--
-- TOC entry 3590 (class 1259 OID 24821)
-- Name: ix_documents_name; Type: INDEX; Schema: public; Owner: securevault_user
--

CREATE INDEX ix_documents_name ON public.documents USING btree (name);


--
-- TOC entry 3591 (class 1259 OID 24815)
-- Name: ix_documents_owner_id; Type: INDEX; Schema: public; Owner: securevault_user
--

CREATE INDEX ix_documents_owner_id ON public.documents USING btree (owner_id);


--
-- TOC entry 3592 (class 1259 OID 24820)
-- Name: ix_documents_parent_id; Type: INDEX; Schema: public; Owner: securevault_user
--

CREATE INDEX ix_documents_parent_id ON public.documents USING btree (parent_id);


--
-- TOC entry 3593 (class 1259 OID 24823)
-- Name: ix_documents_path; Type: INDEX; Schema: public; Owner: securevault_user
--

CREATE INDEX ix_documents_path ON public.documents USING btree (path);


--
-- TOC entry 3594 (class 1259 OID 24814)
-- Name: ix_documents_status; Type: INDEX; Schema: public; Owner: securevault_user
--

CREATE INDEX ix_documents_status ON public.documents USING btree (status);


--
-- TOC entry 3595 (class 1259 OID 24811)
-- Name: ix_documents_uuid; Type: INDEX; Schema: public; Owner: securevault_user
--

CREATE UNIQUE INDEX ix_documents_uuid ON public.documents USING btree (uuid);


--
-- TOC entry 3676 (class 1259 OID 25106)
-- Name: ix_encryption_audit_logs_action; Type: INDEX; Schema: public; Owner: securevault_user
--

CREATE INDEX ix_encryption_audit_logs_action ON public.encryption_audit_logs USING btree (action);


--
-- TOC entry 3677 (class 1259 OID 25103)
-- Name: ix_encryption_audit_logs_id; Type: INDEX; Schema: public; Owner: securevault_user
--

CREATE INDEX ix_encryption_audit_logs_id ON public.encryption_audit_logs USING btree (id);


--
-- TOC entry 3678 (class 1259 OID 25107)
-- Name: ix_encryption_audit_logs_key_id; Type: INDEX; Schema: public; Owner: securevault_user
--

CREATE INDEX ix_encryption_audit_logs_key_id ON public.encryption_audit_logs USING btree (key_id);


--
-- TOC entry 3679 (class 1259 OID 25101)
-- Name: ix_encryption_audit_logs_operation_id; Type: INDEX; Schema: public; Owner: securevault_user
--

CREATE INDEX ix_encryption_audit_logs_operation_id ON public.encryption_audit_logs USING btree (operation_id);


--
-- TOC entry 3680 (class 1259 OID 25099)
-- Name: ix_encryption_audit_logs_success; Type: INDEX; Schema: public; Owner: securevault_user
--

CREATE INDEX ix_encryption_audit_logs_success ON public.encryption_audit_logs USING btree (success);


--
-- TOC entry 3681 (class 1259 OID 25104)
-- Name: ix_encryption_audit_logs_timestamp; Type: INDEX; Schema: public; Owner: securevault_user
--

CREATE INDEX ix_encryption_audit_logs_timestamp ON public.encryption_audit_logs USING btree ("timestamp");


--
-- TOC entry 3682 (class 1259 OID 25097)
-- Name: ix_encryption_audit_logs_user_id; Type: INDEX; Schema: public; Owner: securevault_user
--

CREATE INDEX ix_encryption_audit_logs_user_id ON public.encryption_audit_logs USING btree (user_id);


--
-- TOC entry 3736 (class 1259 OID 25288)
-- Name: ix_ip_blocklist_expires_at; Type: INDEX; Schema: public; Owner: securevault_user
--

CREATE INDEX ix_ip_blocklist_expires_at ON public.ip_blocklist USING btree (expires_at);


--
-- TOC entry 3737 (class 1259 OID 25292)
-- Name: ix_ip_blocklist_id; Type: INDEX; Schema: public; Owner: securevault_user
--

CREATE INDEX ix_ip_blocklist_id ON public.ip_blocklist USING btree (id);


--
-- TOC entry 3738 (class 1259 OID 25290)
-- Name: ix_ip_blocklist_ip_address; Type: INDEX; Schema: public; Owner: securevault_user
--

CREATE UNIQUE INDEX ix_ip_blocklist_ip_address ON public.ip_blocklist USING btree (ip_address);


--
-- TOC entry 3661 (class 1259 OID 25075)
-- Name: ix_key_escrow_id; Type: INDEX; Schema: public; Owner: securevault_user
--

CREATE INDEX ix_key_escrow_id ON public.key_escrow USING btree (id);


--
-- TOC entry 3662 (class 1259 OID 25072)
-- Name: ix_key_escrow_key_id; Type: INDEX; Schema: public; Owner: securevault_user
--

CREATE INDEX ix_key_escrow_key_id ON public.key_escrow USING btree (key_id);


--
-- TOC entry 3663 (class 1259 OID 25071)
-- Name: ix_key_escrow_master_key_id; Type: INDEX; Schema: public; Owner: securevault_user
--

CREATE INDEX ix_key_escrow_master_key_id ON public.key_escrow USING btree (master_key_id);


--
-- TOC entry 3664 (class 1259 OID 25069)
-- Name: ix_key_escrow_user_id; Type: INDEX; Schema: public; Owner: securevault_user
--

CREATE INDEX ix_key_escrow_user_id ON public.key_escrow USING btree (user_id);


--
-- TOC entry 3644 (class 1259 OID 25015)
-- Name: ix_key_rotation_logs_id; Type: INDEX; Schema: public; Owner: securevault_user
--

CREATE INDEX ix_key_rotation_logs_id ON public.key_rotation_logs USING btree (id);


--
-- TOC entry 3645 (class 1259 OID 25009)
-- Name: ix_key_rotation_logs_new_key_id; Type: INDEX; Schema: public; Owner: securevault_user
--

CREATE INDEX ix_key_rotation_logs_new_key_id ON public.key_rotation_logs USING btree (new_key_id);


--
-- TOC entry 3646 (class 1259 OID 25011)
-- Name: ix_key_rotation_logs_old_key_id; Type: INDEX; Schema: public; Owner: securevault_user
--

CREATE INDEX ix_key_rotation_logs_old_key_id ON public.key_rotation_logs USING btree (old_key_id);


--
-- TOC entry 3647 (class 1259 OID 25012)
-- Name: ix_key_rotation_logs_user_id; Type: INDEX; Schema: public; Owner: securevault_user
--

CREATE INDEX ix_key_rotation_logs_user_id ON public.key_rotation_logs USING btree (user_id);


--
-- TOC entry 3636 (class 1259 OID 24991)
-- Name: ix_master_keys_id; Type: INDEX; Schema: public; Owner: securevault_user
--

CREATE INDEX ix_master_keys_id ON public.master_keys USING btree (id);


--
-- TOC entry 3637 (class 1259 OID 24993)
-- Name: ix_master_keys_is_active; Type: INDEX; Schema: public; Owner: securevault_user
--

CREATE INDEX ix_master_keys_is_active ON public.master_keys USING btree (is_active);


--
-- TOC entry 3638 (class 1259 OID 24989)
-- Name: ix_master_keys_key_id; Type: INDEX; Schema: public; Owner: securevault_user
--

CREATE UNIQUE INDEX ix_master_keys_key_id ON public.master_keys USING btree (key_id);


--
-- TOC entry 3528 (class 1259 OID 16490)
-- Name: ix_mfa_audit_logs_created_at; Type: INDEX; Schema: public; Owner: securevault_user
--

CREATE INDEX ix_mfa_audit_logs_created_at ON public.mfa_audit_logs USING btree (created_at);


--
-- TOC entry 3529 (class 1259 OID 16489)
-- Name: ix_mfa_audit_logs_event_type; Type: INDEX; Schema: public; Owner: securevault_user
--

CREATE INDEX ix_mfa_audit_logs_event_type ON public.mfa_audit_logs USING btree (event_type);


--
-- TOC entry 3530 (class 1259 OID 16492)
-- Name: ix_mfa_audit_logs_id; Type: INDEX; Schema: public; Owner: securevault_user
--

CREATE INDEX ix_mfa_audit_logs_id ON public.mfa_audit_logs USING btree (id);


--
-- TOC entry 3531 (class 1259 OID 16488)
-- Name: ix_mfa_audit_logs_user_id; Type: INDEX; Schema: public; Owner: securevault_user
--

CREATE INDEX ix_mfa_audit_logs_user_id ON public.mfa_audit_logs USING btree (user_id);


--
-- TOC entry 3534 (class 1259 OID 16507)
-- Name: ix_mfa_configuration_id; Type: INDEX; Schema: public; Owner: securevault_user
--

CREATE INDEX ix_mfa_configuration_id ON public.mfa_configuration USING btree (id);


--
-- TOC entry 3538 (class 1259 OID 16523)
-- Name: ix_mfa_failed_attempts_attempted_at; Type: INDEX; Schema: public; Owner: securevault_user
--

CREATE INDEX ix_mfa_failed_attempts_attempted_at ON public.mfa_failed_attempts USING btree (attempted_at);


--
-- TOC entry 3539 (class 1259 OID 16525)
-- Name: ix_mfa_failed_attempts_id; Type: INDEX; Schema: public; Owner: securevault_user
--

CREATE INDEX ix_mfa_failed_attempts_id ON public.mfa_failed_attempts USING btree (id);


--
-- TOC entry 3540 (class 1259 OID 16522)
-- Name: ix_mfa_failed_attempts_user_id; Type: INDEX; Schema: public; Owner: securevault_user
--

CREATE INDEX ix_mfa_failed_attempts_user_id ON public.mfa_failed_attempts USING btree (user_id);


--
-- TOC entry 3522 (class 1259 OID 16464)
-- Name: ix_mfa_used_codes_id; Type: INDEX; Schema: public; Owner: securevault_user
--

CREATE INDEX ix_mfa_used_codes_id ON public.mfa_used_codes USING btree (id);


--
-- TOC entry 3523 (class 1259 OID 16466)
-- Name: ix_mfa_used_codes_user_id; Type: INDEX; Schema: public; Owner: securevault_user
--

CREATE INDEX ix_mfa_used_codes_user_id ON public.mfa_used_codes USING btree (user_id);


--
-- TOC entry 3549 (class 1259 OID 24661)
-- Name: ix_permissions_action; Type: INDEX; Schema: public; Owner: securevault_user
--

CREATE INDEX ix_permissions_action ON public.permissions USING btree (action);


--
-- TOC entry 3550 (class 1259 OID 24660)
-- Name: ix_permissions_id; Type: INDEX; Schema: public; Owner: securevault_user
--

CREATE INDEX ix_permissions_id ON public.permissions USING btree (id);


--
-- TOC entry 3551 (class 1259 OID 24659)
-- Name: ix_permissions_name; Type: INDEX; Schema: public; Owner: securevault_user
--

CREATE UNIQUE INDEX ix_permissions_name ON public.permissions USING btree (name);


--
-- TOC entry 3552 (class 1259 OID 24662)
-- Name: ix_permissions_resource_type; Type: INDEX; Schema: public; Owner: securevault_user
--

CREATE INDEX ix_permissions_resource_type ON public.permissions USING btree (resource_type);


--
-- TOC entry 3557 (class 1259 OID 24687)
-- Name: ix_resource_permissions_id; Type: INDEX; Schema: public; Owner: securevault_user
--

CREATE INDEX ix_resource_permissions_id ON public.resource_permissions USING btree (id);


--
-- TOC entry 3558 (class 1259 OID 24688)
-- Name: ix_resource_permissions_resource_id; Type: INDEX; Schema: public; Owner: securevault_user
--

CREATE INDEX ix_resource_permissions_resource_id ON public.resource_permissions USING btree (resource_id);


--
-- TOC entry 3559 (class 1259 OID 24685)
-- Name: ix_resource_permissions_resource_type; Type: INDEX; Schema: public; Owner: securevault_user
--

CREATE INDEX ix_resource_permissions_resource_type ON public.resource_permissions USING btree (resource_type);


--
-- TOC entry 3571 (class 1259 OID 24758)
-- Name: ix_role_hierarchy_id; Type: INDEX; Schema: public; Owner: securevault_user
--

CREATE INDEX ix_role_hierarchy_id ON public.role_hierarchy USING btree (id);


--
-- TOC entry 3543 (class 1259 OID 24646)
-- Name: ix_roles_hierarchy_level; Type: INDEX; Schema: public; Owner: securevault_user
--

CREATE INDEX ix_roles_hierarchy_level ON public.roles USING btree (hierarchy_level);


--
-- TOC entry 3544 (class 1259 OID 24648)
-- Name: ix_roles_id; Type: INDEX; Schema: public; Owner: securevault_user
--

CREATE INDEX ix_roles_id ON public.roles USING btree (id);


--
-- TOC entry 3545 (class 1259 OID 24647)
-- Name: ix_roles_name; Type: INDEX; Schema: public; Owner: securevault_user
--

CREATE UNIQUE INDEX ix_roles_name ON public.roles USING btree (name);


--
-- TOC entry 3726 (class 1259 OID 25266)
-- Name: ix_security_alerts_alert_id; Type: INDEX; Schema: public; Owner: securevault_user
--

CREATE UNIQUE INDEX ix_security_alerts_alert_id ON public.security_alerts USING btree (alert_id);


--
-- TOC entry 3727 (class 1259 OID 25264)
-- Name: ix_security_alerts_alert_type; Type: INDEX; Schema: public; Owner: securevault_user
--

CREATE INDEX ix_security_alerts_alert_type ON public.security_alerts USING btree (alert_type);


--
-- TOC entry 3728 (class 1259 OID 25261)
-- Name: ix_security_alerts_event_id; Type: INDEX; Schema: public; Owner: securevault_user
--

CREATE INDEX ix_security_alerts_event_id ON public.security_alerts USING btree (event_id);


--
-- TOC entry 3729 (class 1259 OID 25263)
-- Name: ix_security_alerts_id; Type: INDEX; Schema: public; Owner: securevault_user
--

CREATE INDEX ix_security_alerts_id ON public.security_alerts USING btree (id);


--
-- TOC entry 3687 (class 1259 OID 25173)
-- Name: ix_security_events_correlation_id; Type: INDEX; Schema: public; Owner: securevault_user
--

CREATE INDEX ix_security_events_correlation_id ON public.security_events USING btree (correlation_id);


--
-- TOC entry 3688 (class 1259 OID 25179)
-- Name: ix_security_events_detected_at; Type: INDEX; Schema: public; Owner: securevault_user
--

CREATE INDEX ix_security_events_detected_at ON public.security_events USING btree (detected_at);


--
-- TOC entry 3689 (class 1259 OID 25167)
-- Name: ix_security_events_document_id; Type: INDEX; Schema: public; Owner: securevault_user
--

CREATE INDEX ix_security_events_document_id ON public.security_events USING btree (document_id);


--
-- TOC entry 3690 (class 1259 OID 25176)
-- Name: ix_security_events_event_id; Type: INDEX; Schema: public; Owner: securevault_user
--

CREATE UNIQUE INDEX ix_security_events_event_id ON public.security_events USING btree (event_id);


--
-- TOC entry 3691 (class 1259 OID 25172)
-- Name: ix_security_events_event_type; Type: INDEX; Schema: public; Owner: securevault_user
--

CREATE INDEX ix_security_events_event_type ON public.security_events USING btree (event_type);


--
-- TOC entry 3692 (class 1259 OID 25175)
-- Name: ix_security_events_id; Type: INDEX; Schema: public; Owner: securevault_user
--

CREATE INDEX ix_security_events_id ON public.security_events USING btree (id);


--
-- TOC entry 3693 (class 1259 OID 25180)
-- Name: ix_security_events_risk_score; Type: INDEX; Schema: public; Owner: securevault_user
--

CREATE INDEX ix_security_events_risk_score ON public.security_events USING btree (risk_score);


--
-- TOC entry 3694 (class 1259 OID 25178)
-- Name: ix_security_events_source_ip; Type: INDEX; Schema: public; Owner: securevault_user
--

CREATE INDEX ix_security_events_source_ip ON public.security_events USING btree (source_ip);


--
-- TOC entry 3695 (class 1259 OID 25169)
-- Name: ix_security_events_status; Type: INDEX; Schema: public; Owner: securevault_user
--

CREATE INDEX ix_security_events_status ON public.security_events USING btree (status);


--
-- TOC entry 3696 (class 1259 OID 25166)
-- Name: ix_security_events_threat_level; Type: INDEX; Schema: public; Owner: securevault_user
--

CREATE INDEX ix_security_events_threat_level ON public.security_events USING btree (threat_level);


--
-- TOC entry 3697 (class 1259 OID 25177)
-- Name: ix_security_events_user_id; Type: INDEX; Schema: public; Owner: securevault_user
--

CREATE INDEX ix_security_events_user_id ON public.security_events USING btree (user_id);


--
-- TOC entry 3710 (class 1259 OID 25212)
-- Name: ix_security_metrics_id; Type: INDEX; Schema: public; Owner: securevault_user
--

CREATE INDEX ix_security_metrics_id ON public.security_metrics USING btree (id);


--
-- TOC entry 3711 (class 1259 OID 25214)
-- Name: ix_security_metrics_metric_date; Type: INDEX; Schema: public; Owner: securevault_user
--

CREATE INDEX ix_security_metrics_metric_date ON public.security_metrics USING btree (metric_date);


--
-- TOC entry 3703 (class 1259 OID 25197)
-- Name: ix_suspicious_patterns_id; Type: INDEX; Schema: public; Owner: securevault_user
--

CREATE INDEX ix_suspicious_patterns_id ON public.suspicious_patterns USING btree (id);


--
-- TOC entry 3704 (class 1259 OID 25199)
-- Name: ix_suspicious_patterns_is_active; Type: INDEX; Schema: public; Owner: securevault_user
--

CREATE INDEX ix_suspicious_patterns_is_active ON public.suspicious_patterns USING btree (is_active);


--
-- TOC entry 3705 (class 1259 OID 25202)
-- Name: ix_suspicious_patterns_pattern_id; Type: INDEX; Schema: public; Owner: securevault_user
--

CREATE UNIQUE INDEX ix_suspicious_patterns_pattern_id ON public.suspicious_patterns USING btree (pattern_id);


--
-- TOC entry 3706 (class 1259 OID 25201)
-- Name: ix_suspicious_patterns_pattern_type; Type: INDEX; Schema: public; Owner: securevault_user
--

CREATE INDEX ix_suspicious_patterns_pattern_type ON public.suspicious_patterns USING btree (pattern_type);


--
-- TOC entry 3717 (class 1259 OID 25238)
-- Name: ix_threat_responses_action; Type: INDEX; Schema: public; Owner: securevault_user
--

CREATE INDEX ix_threat_responses_action ON public.threat_responses USING btree (action);


--
-- TOC entry 3718 (class 1259 OID 25237)
-- Name: ix_threat_responses_event_id; Type: INDEX; Schema: public; Owner: securevault_user
--

CREATE INDEX ix_threat_responses_event_id ON public.threat_responses USING btree (event_id);


--
-- TOC entry 3719 (class 1259 OID 25239)
-- Name: ix_threat_responses_id; Type: INDEX; Schema: public; Owner: securevault_user
--

CREATE INDEX ix_threat_responses_id ON public.threat_responses USING btree (id);


--
-- TOC entry 3720 (class 1259 OID 25236)
-- Name: ix_threat_responses_response_id; Type: INDEX; Schema: public; Owner: securevault_user
--

CREATE UNIQUE INDEX ix_threat_responses_response_id ON public.threat_responses USING btree (response_id);


--
-- TOC entry 3576 (class 1259 OID 24765)
-- Name: ix_token_families_id; Type: INDEX; Schema: public; Owner: securevault_user
--

CREATE INDEX ix_token_families_id ON public.token_families USING btree (id);


--
-- TOC entry 3577 (class 1259 OID 24764)
-- Name: ix_token_families_user_id; Type: INDEX; Schema: public; Owner: securevault_user
--

CREATE INDEX ix_token_families_user_id ON public.token_families USING btree (user_id);


--
-- TOC entry 3628 (class 1259 OID 24969)
-- Name: ix_user_encryption_keys_id; Type: INDEX; Schema: public; Owner: securevault_user
--

CREATE INDEX ix_user_encryption_keys_id ON public.user_encryption_keys USING btree (id);


--
-- TOC entry 3629 (class 1259 OID 24971)
-- Name: ix_user_encryption_keys_is_active; Type: INDEX; Schema: public; Owner: securevault_user
--

CREATE INDEX ix_user_encryption_keys_is_active ON public.user_encryption_keys USING btree (is_active);


--
-- TOC entry 3630 (class 1259 OID 24968)
-- Name: ix_user_encryption_keys_key_id; Type: INDEX; Schema: public; Owner: securevault_user
--

CREATE UNIQUE INDEX ix_user_encryption_keys_key_id ON public.user_encryption_keys USING btree (key_id);


--
-- TOC entry 3631 (class 1259 OID 24972)
-- Name: ix_user_encryption_keys_user_id; Type: INDEX; Schema: public; Owner: securevault_user
--

CREATE INDEX ix_user_encryption_keys_user_id ON public.user_encryption_keys USING btree (user_id);


--
-- TOC entry 3515 (class 1259 OID 16451)
-- Name: ix_users_email; Type: INDEX; Schema: public; Owner: securevault_user
--

CREATE UNIQUE INDEX ix_users_email ON public.users USING btree (email);


--
-- TOC entry 3516 (class 1259 OID 16449)
-- Name: ix_users_id; Type: INDEX; Schema: public; Owner: securevault_user
--

CREATE INDEX ix_users_id ON public.users USING btree (id);


--
-- TOC entry 3517 (class 1259 OID 16450)
-- Name: ix_users_username; Type: INDEX; Schema: public; Owner: securevault_user
--

CREATE UNIQUE INDEX ix_users_username ON public.users USING btree (username);


--
-- TOC entry 3770 (class 2606 OID 24930)
-- Name: document_access_logs document_access_logs_document_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: securevault_user
--

ALTER TABLE ONLY public.document_access_logs
    ADD CONSTRAINT document_access_logs_document_id_fkey FOREIGN KEY (document_id) REFERENCES public.documents(id);


--
-- TOC entry 3771 (class 2606 OID 24935)
-- Name: document_access_logs document_access_logs_user_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: securevault_user
--

ALTER TABLE ONLY public.document_access_logs
    ADD CONSTRAINT document_access_logs_user_id_fkey FOREIGN KEY (user_id) REFERENCES public.users(id);


--
-- TOC entry 3761 (class 2606 OID 24835)
-- Name: document_permissions document_permissions_document_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: securevault_user
--

ALTER TABLE ONLY public.document_permissions
    ADD CONSTRAINT document_permissions_document_id_fkey FOREIGN KEY (document_id) REFERENCES public.documents(id);


--
-- TOC entry 3762 (class 2606 OID 24845)
-- Name: document_permissions document_permissions_granted_by_fkey; Type: FK CONSTRAINT; Schema: public; Owner: securevault_user
--

ALTER TABLE ONLY public.document_permissions
    ADD CONSTRAINT document_permissions_granted_by_fkey FOREIGN KEY (granted_by) REFERENCES public.users(id);


--
-- TOC entry 3763 (class 2606 OID 24850)
-- Name: document_permissions document_permissions_revoked_by_fkey; Type: FK CONSTRAINT; Schema: public; Owner: securevault_user
--

ALTER TABLE ONLY public.document_permissions
    ADD CONSTRAINT document_permissions_revoked_by_fkey FOREIGN KEY (revoked_by) REFERENCES public.users(id);


--
-- TOC entry 3764 (class 2606 OID 24840)
-- Name: document_permissions document_permissions_user_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: securevault_user
--

ALTER TABLE ONLY public.document_permissions
    ADD CONSTRAINT document_permissions_user_id_fkey FOREIGN KEY (user_id) REFERENCES public.users(id);


--
-- TOC entry 3765 (class 2606 OID 24877)
-- Name: document_shares document_shares_created_by_fkey; Type: FK CONSTRAINT; Schema: public; Owner: securevault_user
--

ALTER TABLE ONLY public.document_shares
    ADD CONSTRAINT document_shares_created_by_fkey FOREIGN KEY (created_by) REFERENCES public.users(id);


--
-- TOC entry 3766 (class 2606 OID 24872)
-- Name: document_shares document_shares_document_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: securevault_user
--

ALTER TABLE ONLY public.document_shares
    ADD CONSTRAINT document_shares_document_id_fkey FOREIGN KEY (document_id) REFERENCES public.documents(id);


--
-- TOC entry 3767 (class 2606 OID 24882)
-- Name: document_shares document_shares_revoked_by_fkey; Type: FK CONSTRAINT; Schema: public; Owner: securevault_user
--

ALTER TABLE ONLY public.document_shares
    ADD CONSTRAINT document_shares_revoked_by_fkey FOREIGN KEY (revoked_by) REFERENCES public.users(id);


--
-- TOC entry 3768 (class 2606 OID 24910)
-- Name: document_versions document_versions_created_by_fkey; Type: FK CONSTRAINT; Schema: public; Owner: securevault_user
--

ALTER TABLE ONLY public.document_versions
    ADD CONSTRAINT document_versions_created_by_fkey FOREIGN KEY (created_by) REFERENCES public.users(id);


--
-- TOC entry 3769 (class 2606 OID 24905)
-- Name: document_versions document_versions_document_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: securevault_user
--

ALTER TABLE ONLY public.document_versions
    ADD CONSTRAINT document_versions_document_id_fkey FOREIGN KEY (document_id) REFERENCES public.documents(id);


--
-- TOC entry 3756 (class 2606 OID 24795)
-- Name: documents documents_created_by_fkey; Type: FK CONSTRAINT; Schema: public; Owner: securevault_user
--

ALTER TABLE ONLY public.documents
    ADD CONSTRAINT documents_created_by_fkey FOREIGN KEY (created_by) REFERENCES public.users(id);


--
-- TOC entry 3757 (class 2606 OID 24790)
-- Name: documents documents_owner_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: securevault_user
--

ALTER TABLE ONLY public.documents
    ADD CONSTRAINT documents_owner_id_fkey FOREIGN KEY (owner_id) REFERENCES public.users(id);


--
-- TOC entry 3758 (class 2606 OID 24785)
-- Name: documents documents_parent_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: securevault_user
--

ALTER TABLE ONLY public.documents
    ADD CONSTRAINT documents_parent_id_fkey FOREIGN KEY (parent_id) REFERENCES public.documents(id);


--
-- TOC entry 3759 (class 2606 OID 24805)
-- Name: documents documents_previous_version_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: securevault_user
--

ALTER TABLE ONLY public.documents
    ADD CONSTRAINT documents_previous_version_id_fkey FOREIGN KEY (previous_version_id) REFERENCES public.documents(id);


--
-- TOC entry 3760 (class 2606 OID 24800)
-- Name: documents documents_updated_by_fkey; Type: FK CONSTRAINT; Schema: public; Owner: securevault_user
--

ALTER TABLE ONLY public.documents
    ADD CONSTRAINT documents_updated_by_fkey FOREIGN KEY (updated_by) REFERENCES public.users(id);


--
-- TOC entry 3781 (class 2606 OID 25091)
-- Name: encryption_audit_logs encryption_audit_logs_key_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: securevault_user
--

ALTER TABLE ONLY public.encryption_audit_logs
    ADD CONSTRAINT encryption_audit_logs_key_id_fkey FOREIGN KEY (key_id) REFERENCES public.user_encryption_keys(key_id);


--
-- TOC entry 3782 (class 2606 OID 25086)
-- Name: encryption_audit_logs encryption_audit_logs_user_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: securevault_user
--

ALTER TABLE ONLY public.encryption_audit_logs
    ADD CONSTRAINT encryption_audit_logs_user_id_fkey FOREIGN KEY (user_id) REFERENCES public.users(id);


--
-- TOC entry 3791 (class 2606 OID 25278)
-- Name: ip_blocklist ip_blocklist_event_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: securevault_user
--

ALTER TABLE ONLY public.ip_blocklist
    ADD CONSTRAINT ip_blocklist_event_id_fkey FOREIGN KEY (event_id) REFERENCES public.security_events(event_id);


--
-- TOC entry 3792 (class 2606 OID 25283)
-- Name: ip_blocklist ip_blocklist_removed_by_fkey; Type: FK CONSTRAINT; Schema: public; Owner: securevault_user
--

ALTER TABLE ONLY public.ip_blocklist
    ADD CONSTRAINT ip_blocklist_removed_by_fkey FOREIGN KEY (removed_by) REFERENCES public.users(id);


--
-- TOC entry 3776 (class 2606 OID 25059)
-- Name: key_escrow key_escrow_created_by_fkey; Type: FK CONSTRAINT; Schema: public; Owner: securevault_user
--

ALTER TABLE ONLY public.key_escrow
    ADD CONSTRAINT key_escrow_created_by_fkey FOREIGN KEY (created_by) REFERENCES public.users(id);


--
-- TOC entry 3777 (class 2606 OID 25044)
-- Name: key_escrow key_escrow_key_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: securevault_user
--

ALTER TABLE ONLY public.key_escrow
    ADD CONSTRAINT key_escrow_key_id_fkey FOREIGN KEY (key_id) REFERENCES public.user_encryption_keys(key_id);


--
-- TOC entry 3778 (class 2606 OID 25054)
-- Name: key_escrow key_escrow_master_key_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: securevault_user
--

ALTER TABLE ONLY public.key_escrow
    ADD CONSTRAINT key_escrow_master_key_id_fkey FOREIGN KEY (master_key_id) REFERENCES public.master_keys(key_id);


--
-- TOC entry 3779 (class 2606 OID 25064)
-- Name: key_escrow key_escrow_recovered_by_fkey; Type: FK CONSTRAINT; Schema: public; Owner: securevault_user
--

ALTER TABLE ONLY public.key_escrow
    ADD CONSTRAINT key_escrow_recovered_by_fkey FOREIGN KEY (recovered_by) REFERENCES public.users(id);


--
-- TOC entry 3780 (class 2606 OID 25049)
-- Name: key_escrow key_escrow_user_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: securevault_user
--

ALTER TABLE ONLY public.key_escrow
    ADD CONSTRAINT key_escrow_user_id_fkey FOREIGN KEY (user_id) REFERENCES public.users(id);


--
-- TOC entry 3775 (class 2606 OID 25004)
-- Name: key_rotation_logs key_rotation_logs_user_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: securevault_user
--

ALTER TABLE ONLY public.key_rotation_logs
    ADD CONSTRAINT key_rotation_logs_user_id_fkey FOREIGN KEY (user_id) REFERENCES public.users(id);


--
-- TOC entry 3774 (class 2606 OID 24984)
-- Name: master_keys master_keys_created_by_fkey; Type: FK CONSTRAINT; Schema: public; Owner: securevault_user
--

ALTER TABLE ONLY public.master_keys
    ADD CONSTRAINT master_keys_created_by_fkey FOREIGN KEY (created_by) REFERENCES public.users(id);


--
-- TOC entry 3740 (class 2606 OID 16482)
-- Name: mfa_audit_logs mfa_audit_logs_performed_by_fkey; Type: FK CONSTRAINT; Schema: public; Owner: securevault_user
--

ALTER TABLE ONLY public.mfa_audit_logs
    ADD CONSTRAINT mfa_audit_logs_performed_by_fkey FOREIGN KEY (performed_by) REFERENCES public.users(id);


--
-- TOC entry 3741 (class 2606 OID 16477)
-- Name: mfa_audit_logs mfa_audit_logs_user_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: securevault_user
--

ALTER TABLE ONLY public.mfa_audit_logs
    ADD CONSTRAINT mfa_audit_logs_user_id_fkey FOREIGN KEY (user_id) REFERENCES public.users(id);


--
-- TOC entry 3742 (class 2606 OID 16502)
-- Name: mfa_configuration mfa_configuration_updated_by_fkey; Type: FK CONSTRAINT; Schema: public; Owner: securevault_user
--

ALTER TABLE ONLY public.mfa_configuration
    ADD CONSTRAINT mfa_configuration_updated_by_fkey FOREIGN KEY (updated_by) REFERENCES public.users(id);


--
-- TOC entry 3743 (class 2606 OID 16517)
-- Name: mfa_failed_attempts mfa_failed_attempts_user_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: securevault_user
--

ALTER TABLE ONLY public.mfa_failed_attempts
    ADD CONSTRAINT mfa_failed_attempts_user_id_fkey FOREIGN KEY (user_id) REFERENCES public.users(id);


--
-- TOC entry 3739 (class 2606 OID 16459)
-- Name: mfa_used_codes mfa_used_codes_user_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: securevault_user
--

ALTER TABLE ONLY public.mfa_used_codes
    ADD CONSTRAINT mfa_used_codes_user_id_fkey FOREIGN KEY (user_id) REFERENCES public.users(id);


--
-- TOC entry 3745 (class 2606 OID 24679)
-- Name: resource_permissions resource_permissions_granted_by_fkey; Type: FK CONSTRAINT; Schema: public; Owner: securevault_user
--

ALTER TABLE ONLY public.resource_permissions
    ADD CONSTRAINT resource_permissions_granted_by_fkey FOREIGN KEY (granted_by) REFERENCES public.users(id);


--
-- TOC entry 3746 (class 2606 OID 24674)
-- Name: resource_permissions resource_permissions_inherited_from_fkey; Type: FK CONSTRAINT; Schema: public; Owner: securevault_user
--

ALTER TABLE ONLY public.resource_permissions
    ADD CONSTRAINT resource_permissions_inherited_from_fkey FOREIGN KEY (inherited_from) REFERENCES public.resource_permissions(id);


--
-- TOC entry 3753 (class 2606 OID 24746)
-- Name: role_hierarchy role_hierarchy_child_role_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: securevault_user
--

ALTER TABLE ONLY public.role_hierarchy
    ADD CONSTRAINT role_hierarchy_child_role_id_fkey FOREIGN KEY (child_role_id) REFERENCES public.roles(id) ON DELETE CASCADE;


--
-- TOC entry 3754 (class 2606 OID 24751)
-- Name: role_hierarchy role_hierarchy_created_by_fkey; Type: FK CONSTRAINT; Schema: public; Owner: securevault_user
--

ALTER TABLE ONLY public.role_hierarchy
    ADD CONSTRAINT role_hierarchy_created_by_fkey FOREIGN KEY (created_by) REFERENCES public.users(id);


--
-- TOC entry 3755 (class 2606 OID 24741)
-- Name: role_hierarchy role_hierarchy_parent_role_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: securevault_user
--

ALTER TABLE ONLY public.role_hierarchy
    ADD CONSTRAINT role_hierarchy_parent_role_id_fkey FOREIGN KEY (parent_role_id) REFERENCES public.roles(id) ON DELETE CASCADE;


--
-- TOC entry 3747 (class 2606 OID 24706)
-- Name: role_permissions role_permissions_granted_by_fkey; Type: FK CONSTRAINT; Schema: public; Owner: securevault_user
--

ALTER TABLE ONLY public.role_permissions
    ADD CONSTRAINT role_permissions_granted_by_fkey FOREIGN KEY (granted_by) REFERENCES public.users(id);


--
-- TOC entry 3748 (class 2606 OID 24701)
-- Name: role_permissions role_permissions_permission_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: securevault_user
--

ALTER TABLE ONLY public.role_permissions
    ADD CONSTRAINT role_permissions_permission_id_fkey FOREIGN KEY (permission_id) REFERENCES public.permissions(id) ON DELETE CASCADE;


--
-- TOC entry 3749 (class 2606 OID 24696)
-- Name: role_permissions role_permissions_role_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: securevault_user
--

ALTER TABLE ONLY public.role_permissions
    ADD CONSTRAINT role_permissions_role_id_fkey FOREIGN KEY (role_id) REFERENCES public.roles(id) ON DELETE CASCADE;


--
-- TOC entry 3744 (class 2606 OID 24641)
-- Name: roles roles_created_by_fkey; Type: FK CONSTRAINT; Schema: public; Owner: securevault_user
--

ALTER TABLE ONLY public.roles
    ADD CONSTRAINT roles_created_by_fkey FOREIGN KEY (created_by) REFERENCES public.users(id);


--
-- TOC entry 3789 (class 2606 OID 25256)
-- Name: security_alerts security_alerts_acknowledged_by_fkey; Type: FK CONSTRAINT; Schema: public; Owner: securevault_user
--

ALTER TABLE ONLY public.security_alerts
    ADD CONSTRAINT security_alerts_acknowledged_by_fkey FOREIGN KEY (acknowledged_by) REFERENCES public.users(id);


--
-- TOC entry 3790 (class 2606 OID 25251)
-- Name: security_alerts security_alerts_event_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: securevault_user
--

ALTER TABLE ONLY public.security_alerts
    ADD CONSTRAINT security_alerts_event_id_fkey FOREIGN KEY (event_id) REFERENCES public.security_events(event_id);


--
-- TOC entry 3783 (class 2606 OID 25156)
-- Name: security_events security_events_document_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: securevault_user
--

ALTER TABLE ONLY public.security_events
    ADD CONSTRAINT security_events_document_id_fkey FOREIGN KEY (document_id) REFERENCES public.documents(id);


--
-- TOC entry 3784 (class 2606 OID 25161)
-- Name: security_events security_events_resolved_by_fkey; Type: FK CONSTRAINT; Schema: public; Owner: securevault_user
--

ALTER TABLE ONLY public.security_events
    ADD CONSTRAINT security_events_resolved_by_fkey FOREIGN KEY (resolved_by) REFERENCES public.users(id);


--
-- TOC entry 3785 (class 2606 OID 25151)
-- Name: security_events security_events_user_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: securevault_user
--

ALTER TABLE ONLY public.security_events
    ADD CONSTRAINT security_events_user_id_fkey FOREIGN KEY (user_id) REFERENCES public.users(id);


--
-- TOC entry 3786 (class 2606 OID 25191)
-- Name: suspicious_patterns suspicious_patterns_created_by_fkey; Type: FK CONSTRAINT; Schema: public; Owner: securevault_user
--

ALTER TABLE ONLY public.suspicious_patterns
    ADD CONSTRAINT suspicious_patterns_created_by_fkey FOREIGN KEY (created_by) REFERENCES public.users(id);


--
-- TOC entry 3787 (class 2606 OID 25225)
-- Name: threat_responses threat_responses_event_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: securevault_user
--

ALTER TABLE ONLY public.threat_responses
    ADD CONSTRAINT threat_responses_event_id_fkey FOREIGN KEY (event_id) REFERENCES public.security_events(event_id);


--
-- TOC entry 3788 (class 2606 OID 25230)
-- Name: threat_responses threat_responses_reversed_by_fkey; Type: FK CONSTRAINT; Schema: public; Owner: securevault_user
--

ALTER TABLE ONLY public.threat_responses
    ADD CONSTRAINT threat_responses_reversed_by_fkey FOREIGN KEY (reversed_by) REFERENCES public.users(id);


--
-- TOC entry 3772 (class 2606 OID 24963)
-- Name: user_encryption_keys user_encryption_keys_created_by_fkey; Type: FK CONSTRAINT; Schema: public; Owner: securevault_user
--

ALTER TABLE ONLY public.user_encryption_keys
    ADD CONSTRAINT user_encryption_keys_created_by_fkey FOREIGN KEY (created_by) REFERENCES public.users(id);


--
-- TOC entry 3773 (class 2606 OID 24958)
-- Name: user_encryption_keys user_encryption_keys_user_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: securevault_user
--

ALTER TABLE ONLY public.user_encryption_keys
    ADD CONSTRAINT user_encryption_keys_user_id_fkey FOREIGN KEY (user_id) REFERENCES public.users(id);


--
-- TOC entry 3750 (class 2606 OID 24726)
-- Name: user_roles user_roles_assigned_by_fkey; Type: FK CONSTRAINT; Schema: public; Owner: securevault_user
--

ALTER TABLE ONLY public.user_roles
    ADD CONSTRAINT user_roles_assigned_by_fkey FOREIGN KEY (assigned_by) REFERENCES public.users(id);


--
-- TOC entry 3751 (class 2606 OID 24721)
-- Name: user_roles user_roles_role_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: securevault_user
--

ALTER TABLE ONLY public.user_roles
    ADD CONSTRAINT user_roles_role_id_fkey FOREIGN KEY (role_id) REFERENCES public.roles(id) ON DELETE CASCADE;


--
-- TOC entry 3752 (class 2606 OID 24716)
-- Name: user_roles user_roles_user_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: securevault_user
--

ALTER TABLE ONLY public.user_roles
    ADD CONSTRAINT user_roles_user_id_fkey FOREIGN KEY (user_id) REFERENCES public.users(id) ON DELETE CASCADE;


--
-- TOC entry 2231 (class 826 OID 16435)
-- Name: DEFAULT PRIVILEGES FOR SEQUENCES; Type: DEFAULT ACL; Schema: securevault; Owner: securevault_user
--

ALTER DEFAULT PRIVILEGES FOR ROLE securevault_user IN SCHEMA securevault GRANT ALL ON SEQUENCES TO securevault_user;


--
-- TOC entry 2230 (class 826 OID 16434)
-- Name: DEFAULT PRIVILEGES FOR TABLES; Type: DEFAULT ACL; Schema: securevault; Owner: securevault_user
--

ALTER DEFAULT PRIVILEGES FOR ROLE securevault_user IN SCHEMA securevault GRANT ALL ON TABLES TO securevault_user;


-- Completed on 2025-08-11 16:27:24 IST

--
-- PostgreSQL database dump complete
--

