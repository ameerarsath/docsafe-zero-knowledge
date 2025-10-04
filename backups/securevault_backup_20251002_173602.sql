--
-- PostgreSQL database dump
--

-- Dumped from database version 15.13
-- Dumped by pg_dump version 15.13

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

DROP DATABASE IF EXISTS securevault;
--
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
-- Name: docsafe; Type: SCHEMA; Schema: -; Owner: securevault_user
--

CREATE SCHEMA docsafe;


ALTER SCHEMA docsafe OWNER TO securevault_user;

--
-- Name: pgcrypto; Type: EXTENSION; Schema: -; Owner: -
--

CREATE EXTENSION IF NOT EXISTS pgcrypto WITH SCHEMA public;


--
-- Name: EXTENSION pgcrypto; Type: COMMENT; Schema: -; Owner: 
--

COMMENT ON EXTENSION pgcrypto IS 'cryptographic functions';


--
-- Name: uuid-ossp; Type: EXTENSION; Schema: -; Owner: -
--

CREATE EXTENSION IF NOT EXISTS "uuid-ossp" WITH SCHEMA public;


--
-- Name: EXTENSION "uuid-ossp"; Type: COMMENT; Schema: -; Owner: 
--

COMMENT ON EXTENSION "uuid-ossp" IS 'generate universally unique identifiers (UUIDs)';


--
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
-- Name: alembic_version; Type: TABLE; Schema: public; Owner: securevault_user
--

CREATE TABLE public.alembic_version (
    version_num character varying(32) NOT NULL
);


ALTER TABLE public.alembic_version OWNER TO securevault_user;

--
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
-- Name: crypto_randomness_tests_id_seq; Type: SEQUENCE; Schema: public; Owner: securevault_user
--

CREATE SEQUENCE public.crypto_randomness_tests_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER TABLE public.crypto_randomness_tests_id_seq OWNER TO securevault_user;

--
-- Name: crypto_randomness_tests_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: securevault_user
--

ALTER SEQUENCE public.crypto_randomness_tests_id_seq OWNED BY public.crypto_randomness_tests.id;


--
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
-- Name: document_access_logs_id_seq; Type: SEQUENCE; Schema: public; Owner: securevault_user
--

CREATE SEQUENCE public.document_access_logs_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER TABLE public.document_access_logs_id_seq OWNER TO securevault_user;

--
-- Name: document_access_logs_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: securevault_user
--

ALTER SEQUENCE public.document_access_logs_id_seq OWNED BY public.document_access_logs.id;


--
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
-- Name: document_permissions_id_seq; Type: SEQUENCE; Schema: public; Owner: securevault_user
--

CREATE SEQUENCE public.document_permissions_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER TABLE public.document_permissions_id_seq OWNER TO securevault_user;

--
-- Name: document_permissions_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: securevault_user
--

ALTER SEQUENCE public.document_permissions_id_seq OWNED BY public.document_permissions.id;


--
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
    CONSTRAINT check_share_type CHECK (((share_type)::text = ANY ((ARRAY['private'::character varying, 'internal'::character varying, 'external'::character varying, 'public'::character varying])::text[])))
);


ALTER TABLE public.document_shares OWNER TO securevault_user;

--
-- Name: document_shares_id_seq; Type: SEQUENCE; Schema: public; Owner: securevault_user
--

CREATE SEQUENCE public.document_shares_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER TABLE public.document_shares_id_seq OWNER TO securevault_user;

--
-- Name: document_shares_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: securevault_user
--

ALTER SEQUENCE public.document_shares_id_seq OWNED BY public.document_shares.id;


--
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
-- Name: document_versions_id_seq; Type: SEQUENCE; Schema: public; Owner: securevault_user
--

CREATE SEQUENCE public.document_versions_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER TABLE public.document_versions_id_seq OWNER TO securevault_user;

--
-- Name: document_versions_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: securevault_user
--

ALTER SEQUENCE public.document_versions_id_seq OWNED BY public.document_versions.id;


--
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
    CONSTRAINT check_document_type CHECK (((document_type)::text = ANY ((ARRAY['document'::character varying, 'folder'::character varying])::text[]))),
    CONSTRAINT check_file_size_positive CHECK ((file_size >= 0)),
    CONSTRAINT check_share_type CHECK (((share_type)::text = ANY ((ARRAY['private'::character varying, 'internal'::character varying, 'external'::character varying, 'public'::character varying])::text[]))),
    CONSTRAINT check_status CHECK (((status)::text = ANY ((ARRAY['active'::character varying, 'archived'::character varying, 'deleted'::character varying, 'quarantined'::character varying])::text[]))),
    CONSTRAINT check_total_size_positive CHECK ((total_size >= 0)),
    CONSTRAINT check_version_positive CHECK ((version_number > 0))
);


ALTER TABLE public.documents OWNER TO securevault_user;

--
-- Name: documents_id_seq; Type: SEQUENCE; Schema: public; Owner: securevault_user
--

CREATE SEQUENCE public.documents_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER TABLE public.documents_id_seq OWNER TO securevault_user;

--
-- Name: documents_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: securevault_user
--

ALTER SEQUENCE public.documents_id_seq OWNED BY public.documents.id;


--
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
-- Name: encryption_audit_logs_id_seq; Type: SEQUENCE; Schema: public; Owner: securevault_user
--

CREATE SEQUENCE public.encryption_audit_logs_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER TABLE public.encryption_audit_logs_id_seq OWNER TO securevault_user;

--
-- Name: encryption_audit_logs_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: securevault_user
--

ALTER SEQUENCE public.encryption_audit_logs_id_seq OWNED BY public.encryption_audit_logs.id;


--
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
-- Name: ip_blocklist_id_seq; Type: SEQUENCE; Schema: public; Owner: securevault_user
--

CREATE SEQUENCE public.ip_blocklist_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER TABLE public.ip_blocklist_id_seq OWNER TO securevault_user;

--
-- Name: ip_blocklist_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: securevault_user
--

ALTER SEQUENCE public.ip_blocklist_id_seq OWNED BY public.ip_blocklist.id;


--
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
-- Name: key_escrow_id_seq; Type: SEQUENCE; Schema: public; Owner: securevault_user
--

CREATE SEQUENCE public.key_escrow_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER TABLE public.key_escrow_id_seq OWNER TO securevault_user;

--
-- Name: key_escrow_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: securevault_user
--

ALTER SEQUENCE public.key_escrow_id_seq OWNED BY public.key_escrow.id;


--
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
-- Name: key_rotation_logs_id_seq; Type: SEQUENCE; Schema: public; Owner: securevault_user
--

CREATE SEQUENCE public.key_rotation_logs_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER TABLE public.key_rotation_logs_id_seq OWNER TO securevault_user;

--
-- Name: key_rotation_logs_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: securevault_user
--

ALTER SEQUENCE public.key_rotation_logs_id_seq OWNED BY public.key_rotation_logs.id;


--
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
-- Name: master_keys_id_seq; Type: SEQUENCE; Schema: public; Owner: securevault_user
--

CREATE SEQUENCE public.master_keys_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER TABLE public.master_keys_id_seq OWNER TO securevault_user;

--
-- Name: master_keys_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: securevault_user
--

ALTER SEQUENCE public.master_keys_id_seq OWNED BY public.master_keys.id;


--
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
-- Name: mfa_audit_logs_id_seq; Type: SEQUENCE; Schema: public; Owner: securevault_user
--

CREATE SEQUENCE public.mfa_audit_logs_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER TABLE public.mfa_audit_logs_id_seq OWNER TO securevault_user;

--
-- Name: mfa_audit_logs_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: securevault_user
--

ALTER SEQUENCE public.mfa_audit_logs_id_seq OWNED BY public.mfa_audit_logs.id;


--
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
-- Name: mfa_configuration_id_seq; Type: SEQUENCE; Schema: public; Owner: securevault_user
--

CREATE SEQUENCE public.mfa_configuration_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER TABLE public.mfa_configuration_id_seq OWNER TO securevault_user;

--
-- Name: mfa_configuration_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: securevault_user
--

ALTER SEQUENCE public.mfa_configuration_id_seq OWNED BY public.mfa_configuration.id;


--
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
-- Name: mfa_failed_attempts_id_seq; Type: SEQUENCE; Schema: public; Owner: securevault_user
--

CREATE SEQUENCE public.mfa_failed_attempts_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER TABLE public.mfa_failed_attempts_id_seq OWNER TO securevault_user;

--
-- Name: mfa_failed_attempts_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: securevault_user
--

ALTER SEQUENCE public.mfa_failed_attempts_id_seq OWNED BY public.mfa_failed_attempts.id;


--
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
-- Name: mfa_used_codes_id_seq; Type: SEQUENCE; Schema: public; Owner: securevault_user
--

CREATE SEQUENCE public.mfa_used_codes_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER TABLE public.mfa_used_codes_id_seq OWNER TO securevault_user;

--
-- Name: mfa_used_codes_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: securevault_user
--

ALTER SEQUENCE public.mfa_used_codes_id_seq OWNED BY public.mfa_used_codes.id;


--
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
-- Name: permissions_id_seq; Type: SEQUENCE; Schema: public; Owner: securevault_user
--

CREATE SEQUENCE public.permissions_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER TABLE public.permissions_id_seq OWNER TO securevault_user;

--
-- Name: permissions_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: securevault_user
--

ALTER SEQUENCE public.permissions_id_seq OWNED BY public.permissions.id;


--
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
-- Name: resource_permissions_id_seq; Type: SEQUENCE; Schema: public; Owner: securevault_user
--

CREATE SEQUENCE public.resource_permissions_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER TABLE public.resource_permissions_id_seq OWNER TO securevault_user;

--
-- Name: resource_permissions_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: securevault_user
--

ALTER SEQUENCE public.resource_permissions_id_seq OWNED BY public.resource_permissions.id;


--
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
-- Name: role_hierarchy_id_seq; Type: SEQUENCE; Schema: public; Owner: securevault_user
--

CREATE SEQUENCE public.role_hierarchy_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER TABLE public.role_hierarchy_id_seq OWNER TO securevault_user;

--
-- Name: role_hierarchy_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: securevault_user
--

ALTER SEQUENCE public.role_hierarchy_id_seq OWNED BY public.role_hierarchy.id;


--
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
-- Name: roles_id_seq; Type: SEQUENCE; Schema: public; Owner: securevault_user
--

CREATE SEQUENCE public.roles_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER TABLE public.roles_id_seq OWNER TO securevault_user;

--
-- Name: roles_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: securevault_user
--

ALTER SEQUENCE public.roles_id_seq OWNED BY public.roles.id;


--
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
-- Name: security_alerts_id_seq; Type: SEQUENCE; Schema: public; Owner: securevault_user
--

CREATE SEQUENCE public.security_alerts_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER TABLE public.security_alerts_id_seq OWNER TO securevault_user;

--
-- Name: security_alerts_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: securevault_user
--

ALTER SEQUENCE public.security_alerts_id_seq OWNED BY public.security_alerts.id;


--
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
-- Name: security_events_id_seq; Type: SEQUENCE; Schema: public; Owner: securevault_user
--

CREATE SEQUENCE public.security_events_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER TABLE public.security_events_id_seq OWNER TO securevault_user;

--
-- Name: security_events_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: securevault_user
--

ALTER SEQUENCE public.security_events_id_seq OWNED BY public.security_events.id;


--
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
-- Name: security_metrics_id_seq; Type: SEQUENCE; Schema: public; Owner: securevault_user
--

CREATE SEQUENCE public.security_metrics_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER TABLE public.security_metrics_id_seq OWNER TO securevault_user;

--
-- Name: security_metrics_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: securevault_user
--

ALTER SEQUENCE public.security_metrics_id_seq OWNED BY public.security_metrics.id;


--
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
-- Name: suspicious_patterns_id_seq; Type: SEQUENCE; Schema: public; Owner: securevault_user
--

CREATE SEQUENCE public.suspicious_patterns_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER TABLE public.suspicious_patterns_id_seq OWNER TO securevault_user;

--
-- Name: suspicious_patterns_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: securevault_user
--

ALTER SEQUENCE public.suspicious_patterns_id_seq OWNED BY public.suspicious_patterns.id;


--
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
-- Name: threat_responses_id_seq; Type: SEQUENCE; Schema: public; Owner: securevault_user
--

CREATE SEQUENCE public.threat_responses_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER TABLE public.threat_responses_id_seq OWNER TO securevault_user;

--
-- Name: threat_responses_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: securevault_user
--

ALTER SEQUENCE public.threat_responses_id_seq OWNED BY public.threat_responses.id;


--
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
-- Name: user_encryption_keys_id_seq; Type: SEQUENCE; Schema: public; Owner: securevault_user
--

CREATE SEQUENCE public.user_encryption_keys_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER TABLE public.user_encryption_keys_id_seq OWNER TO securevault_user;

--
-- Name: user_encryption_keys_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: securevault_user
--

ALTER SEQUENCE public.user_encryption_keys_id_seq OWNED BY public.user_encryption_keys.id;


--
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
-- Name: users_id_seq; Type: SEQUENCE; Schema: public; Owner: securevault_user
--

CREATE SEQUENCE public.users_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER TABLE public.users_id_seq OWNER TO securevault_user;

--
-- Name: users_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: securevault_user
--

ALTER SEQUENCE public.users_id_seq OWNED BY public.users.id;


--
-- Name: crypto_randomness_tests id; Type: DEFAULT; Schema: public; Owner: securevault_user
--

ALTER TABLE ONLY public.crypto_randomness_tests ALTER COLUMN id SET DEFAULT nextval('public.crypto_randomness_tests_id_seq'::regclass);


--
-- Name: document_access_logs id; Type: DEFAULT; Schema: public; Owner: securevault_user
--

ALTER TABLE ONLY public.document_access_logs ALTER COLUMN id SET DEFAULT nextval('public.document_access_logs_id_seq'::regclass);


--
-- Name: document_permissions id; Type: DEFAULT; Schema: public; Owner: securevault_user
--

ALTER TABLE ONLY public.document_permissions ALTER COLUMN id SET DEFAULT nextval('public.document_permissions_id_seq'::regclass);


--
-- Name: document_shares id; Type: DEFAULT; Schema: public; Owner: securevault_user
--

ALTER TABLE ONLY public.document_shares ALTER COLUMN id SET DEFAULT nextval('public.document_shares_id_seq'::regclass);


--
-- Name: document_versions id; Type: DEFAULT; Schema: public; Owner: securevault_user
--

ALTER TABLE ONLY public.document_versions ALTER COLUMN id SET DEFAULT nextval('public.document_versions_id_seq'::regclass);


--
-- Name: documents id; Type: DEFAULT; Schema: public; Owner: securevault_user
--

ALTER TABLE ONLY public.documents ALTER COLUMN id SET DEFAULT nextval('public.documents_id_seq'::regclass);


--
-- Name: encryption_audit_logs id; Type: DEFAULT; Schema: public; Owner: securevault_user
--

ALTER TABLE ONLY public.encryption_audit_logs ALTER COLUMN id SET DEFAULT nextval('public.encryption_audit_logs_id_seq'::regclass);


--
-- Name: ip_blocklist id; Type: DEFAULT; Schema: public; Owner: securevault_user
--

ALTER TABLE ONLY public.ip_blocklist ALTER COLUMN id SET DEFAULT nextval('public.ip_blocklist_id_seq'::regclass);


--
-- Name: key_escrow id; Type: DEFAULT; Schema: public; Owner: securevault_user
--

ALTER TABLE ONLY public.key_escrow ALTER COLUMN id SET DEFAULT nextval('public.key_escrow_id_seq'::regclass);


--
-- Name: key_rotation_logs id; Type: DEFAULT; Schema: public; Owner: securevault_user
--

ALTER TABLE ONLY public.key_rotation_logs ALTER COLUMN id SET DEFAULT nextval('public.key_rotation_logs_id_seq'::regclass);


--
-- Name: master_keys id; Type: DEFAULT; Schema: public; Owner: securevault_user
--

ALTER TABLE ONLY public.master_keys ALTER COLUMN id SET DEFAULT nextval('public.master_keys_id_seq'::regclass);


--
-- Name: mfa_audit_logs id; Type: DEFAULT; Schema: public; Owner: securevault_user
--

ALTER TABLE ONLY public.mfa_audit_logs ALTER COLUMN id SET DEFAULT nextval('public.mfa_audit_logs_id_seq'::regclass);


--
-- Name: mfa_configuration id; Type: DEFAULT; Schema: public; Owner: securevault_user
--

ALTER TABLE ONLY public.mfa_configuration ALTER COLUMN id SET DEFAULT nextval('public.mfa_configuration_id_seq'::regclass);


--
-- Name: mfa_failed_attempts id; Type: DEFAULT; Schema: public; Owner: securevault_user
--

ALTER TABLE ONLY public.mfa_failed_attempts ALTER COLUMN id SET DEFAULT nextval('public.mfa_failed_attempts_id_seq'::regclass);


--
-- Name: mfa_used_codes id; Type: DEFAULT; Schema: public; Owner: securevault_user
--

ALTER TABLE ONLY public.mfa_used_codes ALTER COLUMN id SET DEFAULT nextval('public.mfa_used_codes_id_seq'::regclass);


--
-- Name: permissions id; Type: DEFAULT; Schema: public; Owner: securevault_user
--

ALTER TABLE ONLY public.permissions ALTER COLUMN id SET DEFAULT nextval('public.permissions_id_seq'::regclass);


--
-- Name: resource_permissions id; Type: DEFAULT; Schema: public; Owner: securevault_user
--

ALTER TABLE ONLY public.resource_permissions ALTER COLUMN id SET DEFAULT nextval('public.resource_permissions_id_seq'::regclass);


--
-- Name: role_hierarchy id; Type: DEFAULT; Schema: public; Owner: securevault_user
--

ALTER TABLE ONLY public.role_hierarchy ALTER COLUMN id SET DEFAULT nextval('public.role_hierarchy_id_seq'::regclass);


--
-- Name: roles id; Type: DEFAULT; Schema: public; Owner: securevault_user
--

ALTER TABLE ONLY public.roles ALTER COLUMN id SET DEFAULT nextval('public.roles_id_seq'::regclass);


--
-- Name: security_alerts id; Type: DEFAULT; Schema: public; Owner: securevault_user
--

ALTER TABLE ONLY public.security_alerts ALTER COLUMN id SET DEFAULT nextval('public.security_alerts_id_seq'::regclass);


--
-- Name: security_events id; Type: DEFAULT; Schema: public; Owner: securevault_user
--

ALTER TABLE ONLY public.security_events ALTER COLUMN id SET DEFAULT nextval('public.security_events_id_seq'::regclass);


--
-- Name: security_metrics id; Type: DEFAULT; Schema: public; Owner: securevault_user
--

ALTER TABLE ONLY public.security_metrics ALTER COLUMN id SET DEFAULT nextval('public.security_metrics_id_seq'::regclass);


--
-- Name: suspicious_patterns id; Type: DEFAULT; Schema: public; Owner: securevault_user
--

ALTER TABLE ONLY public.suspicious_patterns ALTER COLUMN id SET DEFAULT nextval('public.suspicious_patterns_id_seq'::regclass);


--
-- Name: threat_responses id; Type: DEFAULT; Schema: public; Owner: securevault_user
--

ALTER TABLE ONLY public.threat_responses ALTER COLUMN id SET DEFAULT nextval('public.threat_responses_id_seq'::regclass);


--
-- Name: user_encryption_keys id; Type: DEFAULT; Schema: public; Owner: securevault_user
--

ALTER TABLE ONLY public.user_encryption_keys ALTER COLUMN id SET DEFAULT nextval('public.user_encryption_keys_id_seq'::regclass);


--
-- Name: users id; Type: DEFAULT; Schema: public; Owner: securevault_user
--

ALTER TABLE ONLY public.users ALTER COLUMN id SET DEFAULT nextval('public.users_id_seq'::regclass);


--
-- Data for Name: alembic_version; Type: TABLE DATA; Schema: public; Owner: securevault_user
--

INSERT INTO public.alembic_version (version_num) VALUES ('4fc4dab4fda6');


--
-- Data for Name: crypto_randomness_tests; Type: TABLE DATA; Schema: public; Owner: securevault_user
--



--
-- Data for Name: document_access_logs; Type: TABLE DATA; Schema: public; Owner: securevault_user
--

INSERT INTO public.document_access_logs (id, document_id, user_id, action, access_method, success, ip_address, user_agent, referer, accessed_at, duration_ms, details, error_message) VALUES (1, 1, 3, 'write', 'api', true, NULL, NULL, NULL, '2025-10-02 11:35:06.876226+00', NULL, '{"file_size": 432137, "mime_type": "application/pdf", "operation": "upload"}', NULL);
INSERT INTO public.document_access_logs (id, document_id, user_id, action, access_method, success, ip_address, user_agent, referer, accessed_at, duration_ms, details, error_message) VALUES (2, 1, 3, 'download', 'api', true, NULL, NULL, NULL, '2025-10-02 11:35:17.895358+00', NULL, '{}', NULL);
INSERT INTO public.document_access_logs (id, document_id, user_id, action, access_method, success, ip_address, user_agent, referer, accessed_at, duration_ms, details, error_message) VALUES (3, 1, 3, 'download', 'api', true, NULL, NULL, NULL, '2025-10-02 11:35:43.927373+00', NULL, '{}', NULL);
INSERT INTO public.document_access_logs (id, document_id, user_id, action, access_method, success, ip_address, user_agent, referer, accessed_at, duration_ms, details, error_message) VALUES (4, 1, 3, 'download', 'api', true, NULL, NULL, NULL, '2025-10-02 11:36:01.677041+00', NULL, '{}', NULL);
INSERT INTO public.document_access_logs (id, document_id, user_id, action, access_method, success, ip_address, user_agent, referer, accessed_at, duration_ms, details, error_message) VALUES (5, 1, 3, 'download', 'api', true, NULL, NULL, NULL, '2025-10-02 11:39:18.523715+00', NULL, '{}', NULL);
INSERT INTO public.document_access_logs (id, document_id, user_id, action, access_method, success, ip_address, user_agent, referer, accessed_at, duration_ms, details, error_message) VALUES (6, 1, 3, 'download', 'api', true, NULL, NULL, NULL, '2025-10-02 11:39:36.100469+00', NULL, '{}', NULL);
INSERT INTO public.document_access_logs (id, document_id, user_id, action, access_method, success, ip_address, user_agent, referer, accessed_at, duration_ms, details, error_message) VALUES (7, 1, 3, 'download', 'api', true, NULL, NULL, NULL, '2025-10-02 11:40:23.013278+00', NULL, '{}', NULL);
INSERT INTO public.document_access_logs (id, document_id, user_id, action, access_method, success, ip_address, user_agent, referer, accessed_at, duration_ms, details, error_message) VALUES (8, 1, 3, 'download', 'api', true, NULL, NULL, NULL, '2025-10-02 11:40:33.430013+00', NULL, '{}', NULL);
INSERT INTO public.document_access_logs (id, document_id, user_id, action, access_method, success, ip_address, user_agent, referer, accessed_at, duration_ms, details, error_message) VALUES (9, 1, 3, 'download', 'api', true, NULL, NULL, NULL, '2025-10-02 11:44:01.54387+00', NULL, '{}', NULL);
INSERT INTO public.document_access_logs (id, document_id, user_id, action, access_method, success, ip_address, user_agent, referer, accessed_at, duration_ms, details, error_message) VALUES (10, 1, 3, 'download', 'api', true, NULL, NULL, NULL, '2025-10-02 11:48:33.896778+00', NULL, '{}', NULL);
INSERT INTO public.document_access_logs (id, document_id, user_id, action, access_method, success, ip_address, user_agent, referer, accessed_at, duration_ms, details, error_message) VALUES (11, 1, 3, 'download', 'api', true, NULL, NULL, NULL, '2025-10-02 11:59:37.58669+00', NULL, '{}', NULL);
INSERT INTO public.document_access_logs (id, document_id, user_id, action, access_method, success, ip_address, user_agent, referer, accessed_at, duration_ms, details, error_message) VALUES (12, 2, 3, 'write', 'api', true, NULL, NULL, NULL, '2025-10-02 12:00:19.805145+00', NULL, '{"file_size": 761175, "mime_type": "image/png", "operation": "upload"}', NULL);
INSERT INTO public.document_access_logs (id, document_id, user_id, action, access_method, success, ip_address, user_agent, referer, accessed_at, duration_ms, details, error_message) VALUES (13, 2, 3, 'download', 'api', true, NULL, NULL, NULL, '2025-10-02 12:00:22.250192+00', NULL, '{}', NULL);
INSERT INTO public.document_access_logs (id, document_id, user_id, action, access_method, success, ip_address, user_agent, referer, accessed_at, duration_ms, details, error_message) VALUES (14, 2, 3, 'download', 'api', true, NULL, NULL, NULL, '2025-10-02 12:00:47.313365+00', NULL, '{}', NULL);
INSERT INTO public.document_access_logs (id, document_id, user_id, action, access_method, success, ip_address, user_agent, referer, accessed_at, duration_ms, details, error_message) VALUES (15, 3, 3, 'write', 'api', true, NULL, NULL, NULL, '2025-10-02 12:01:12.160711+00', NULL, '{"file_size": 111, "mime_type": "text/csv", "operation": "upload"}', NULL);
INSERT INTO public.document_access_logs (id, document_id, user_id, action, access_method, success, ip_address, user_agent, referer, accessed_at, duration_ms, details, error_message) VALUES (16, 3, 3, 'download', 'api', true, NULL, NULL, NULL, '2025-10-02 12:01:17.493627+00', NULL, '{}', NULL);
INSERT INTO public.document_access_logs (id, document_id, user_id, action, access_method, success, ip_address, user_agent, referer, accessed_at, duration_ms, details, error_message) VALUES (17, 3, 3, 'download', 'api', true, NULL, NULL, NULL, '2025-10-02 12:01:42.402826+00', NULL, '{}', NULL);


--
-- Data for Name: document_permissions; Type: TABLE DATA; Schema: public; Owner: securevault_user
--



--
-- Data for Name: document_shares; Type: TABLE DATA; Schema: public; Owner: securevault_user
--



--
-- Data for Name: document_versions; Type: TABLE DATA; Schema: public; Owner: securevault_user
--



--
-- Data for Name: documents; Type: TABLE DATA; Schema: public; Owner: securevault_user
--

INSERT INTO public.documents (id, uuid, name, description, document_type, mime_type, original_filename, file_extension, file_size, file_hash_sha256, storage_path, storage_backend, encryption_algorithm, encryption_key_id, encrypted_dek, encryption_iv, encryption_auth_tag, encryption_key, encryption_salt, is_encrypted, parent_id, path, depth_level, owner_id, created_by, updated_by, status, share_type, created_at, updated_at, accessed_at, archived_at, deleted_at, is_shared, share_expires_at, allow_download, allow_preview, version_number, is_latest_version, previous_version_id, doc_metadata, tags, is_sensitive, retention_policy_id, compliance_flags, child_count, total_size) VALUES (1, 'e91a5d10-79c7-446a-9d09-d5b3a551cb67', 'TN-5202405249980_certificate.pdf', '', 'document', 'application/pdf', NULL, '.pdf', 432153, 'd7ebdb02bb33fec0aba2e99bc2fccc5b555c5c3664651357c95abae55d2320c4', './data/encrypted-files\3\a1\a1f71aa3b1a1752ca1572e0fcda6a6f0d37d39329e9a510d4bf6ca6cc0e4f5c4.enc', 'local', 'AES-256-GCM', NULL, 'eyJjaXBoZXJ0ZXh0IjoicFJQWGU0dm1OVWdmR0o2NzB4QXgzL3ZodU5RK0l5NDB0WWE3c28zV0xuRT0iLCJpdiI6ImJGOTJRQm9LRyt5Vzhsa2MiLCJhdXRoVGFnIjoiUkZ2TU1CUWxZbnZ2VjFyVVNGaElrQT09IiwiYWxnb3JpdGhtIjoiQUVTLTI1Ni1HQ00ifQ==', 'NfyOodYJF0IoAyr7', NULL, NULL, '\xdf158b4f9921abf3e591f3d59dabfbbc6274ca8f2e7ff42ac4be63ff873c8738', true, NULL, NULL, 0, 3, 3, NULL, 'active', 'private', '2025-10-02 11:35:06.790475+00', '2025-10-02 11:59:37.712527+00', '2025-10-02 17:29:38.419081+00', NULL, NULL, false, NULL, true, true, 1, true, NULL, '{}', '[]', false, NULL, '{}', 0, 0);
INSERT INTO public.documents (id, uuid, name, description, document_type, mime_type, original_filename, file_extension, file_size, file_hash_sha256, storage_path, storage_backend, encryption_algorithm, encryption_key_id, encrypted_dek, encryption_iv, encryption_auth_tag, encryption_key, encryption_salt, is_encrypted, parent_id, path, depth_level, owner_id, created_by, updated_by, status, share_type, created_at, updated_at, accessed_at, archived_at, deleted_at, is_shared, share_expires_at, allow_download, allow_preview, version_number, is_latest_version, previous_version_id, doc_metadata, tags, is_sensitive, retention_policy_id, compliance_flags, child_count, total_size) VALUES (2, 'ad5a733e-8b60-4d28-af6b-ad99b03f9a53', 'Gemini_Generated_Image_uzpslguzpslguzps.png', '', 'document', 'image/png', NULL, '.png', 761191, '9ea7d4d2e065e62ab2bdb712fb0faabded80e7c70ab199392e76aba8aed75dca', './data/encrypted-files\3\da\da1751bc311701ed15cb1a6ee0e5d016eb720095412494a3445a055e3bbf62b7.enc', 'local', 'AES-256-GCM', NULL, 'eyJjaXBoZXJ0ZXh0IjoiVXM0MDBVQmF4dGo2cW81dXJJRW52QlRkcE4rSFJpVC9veGJEVHhyVW1pdz0iLCJpdiI6Ik1vKzJoTzFhdy9ZVmpPRGoiLCJhdXRoVGFnIjoiUGxBTW1qdFBOSk9vbFoxZFZaSFhoQT09IiwiYWxnb3JpdGhtIjoiQUVTLTI1Ni1HQ00ifQ==', 'oHMD9bYz/ydaPf2H', NULL, NULL, '\xdf158b4f9921abf3e591f3d59dabfbbc6274ca8f2e7ff42ac4be63ff873c8738', true, NULL, NULL, 0, 3, 3, NULL, 'active', 'private', '2025-10-02 12:00:19.69164+00', '2025-10-02 12:00:47.374043+00', '2025-10-02 17:30:46.823047+00', NULL, NULL, false, NULL, true, true, 1, true, NULL, '{}', '[]', false, NULL, '{}', 0, 0);
INSERT INTO public.documents (id, uuid, name, description, document_type, mime_type, original_filename, file_extension, file_size, file_hash_sha256, storage_path, storage_backend, encryption_algorithm, encryption_key_id, encrypted_dek, encryption_iv, encryption_auth_tag, encryption_key, encryption_salt, is_encrypted, parent_id, path, depth_level, owner_id, created_by, updated_by, status, share_type, created_at, updated_at, accessed_at, archived_at, deleted_at, is_shared, share_expires_at, allow_download, allow_preview, version_number, is_latest_version, previous_version_id, doc_metadata, tags, is_sensitive, retention_policy_id, compliance_flags, child_count, total_size) VALUES (3, '22f2a765-077d-438d-8823-c0bcbe94a846', 'users_credentials.csv', '', 'document', 'text/csv', NULL, '.csv', 127, '7e391a1ddc0f5ed1ed3a2b7a52dc422ad1238294b3662f9938219677faefcc19', './data/encrypted-files\3\65\65d47b5de6d1914e53781e10f98a5a7496b802d764992099b9c9d8f62834fe6d.enc', 'local', 'AES-256-GCM', NULL, 'eyJjaXBoZXJ0ZXh0IjoianlHYUxRTjhheFpoVElpZmJUUFcvZXJNNlB2V3lXTVQ1RXQzNnVabkszST0iLCJpdiI6IlQ0dThJdE53SCthTGVVU3oiLCJhdXRoVGFnIjoicE0wdnJXcHB4dDNDVDdTcHR2NElkQT09IiwiYWxnb3JpdGhtIjoiQUVTLTI1Ni1HQ00ifQ==', '+ylypokDIUl54B20', NULL, NULL, '\xdf158b4f9921abf3e591f3d59dabfbbc6274ca8f2e7ff42ac4be63ff873c8738', true, NULL, NULL, 0, 3, 3, NULL, 'active', 'private', '2025-10-02 12:01:12.106213+00', '2025-10-02 12:01:42.475886+00', '2025-10-02 17:31:42.024624+00', NULL, NULL, false, NULL, true, true, 1, true, NULL, '{}', '[]', false, NULL, '{}', 0, 0);


--
-- Data for Name: encryption_audit_logs; Type: TABLE DATA; Schema: public; Owner: securevault_user
--

INSERT INTO public.encryption_audit_logs (id, user_id, key_id, action, operation_id, ip_address, user_agent, session_id, success, error_code, error_message, details, risk_score, "timestamp", duration_ms) VALUES (1, 3, 'key_3_77465b09a42608277d25dc593bfac3af', 'create_key', '50192416-ac70-4266-987f-0bc7743d99d3', NULL, NULL, NULL, true, NULL, NULL, '{"algorithm": "AES-256-GCM", "derivation_method": "PBKDF2-SHA256", "iterations": 500000, "replaced_existing": false}', NULL, '2025-10-02 06:57:55.365515+00', NULL);


--
-- Data for Name: ip_blocklist; Type: TABLE DATA; Schema: public; Owner: securevault_user
--



--
-- Data for Name: key_escrow; Type: TABLE DATA; Schema: public; Owner: securevault_user
--



--
-- Data for Name: key_rotation_logs; Type: TABLE DATA; Schema: public; Owner: securevault_user
--



--
-- Data for Name: master_keys; Type: TABLE DATA; Schema: public; Owner: securevault_user
--



--
-- Data for Name: mfa_audit_logs; Type: TABLE DATA; Schema: public; Owner: securevault_user
--



--
-- Data for Name: mfa_configuration; Type: TABLE DATA; Schema: public; Owner: securevault_user
--



--
-- Data for Name: mfa_failed_attempts; Type: TABLE DATA; Schema: public; Owner: securevault_user
--



--
-- Data for Name: mfa_used_codes; Type: TABLE DATA; Schema: public; Owner: securevault_user
--



--
-- Data for Name: permissions; Type: TABLE DATA; Schema: public; Owner: securevault_user
--

INSERT INTO public.permissions (id, name, display_name, description, resource_type, action, is_system, requires_resource_ownership, created_at, updated_at) VALUES (1, 'documents:read', 'Read documents', 'Read documents permission for documents', 'documents', 'read', true, false, '2025-10-02 04:19:35.694271', '2025-10-02 04:19:35.694271');
INSERT INTO public.permissions (id, name, display_name, description, resource_type, action, is_system, requires_resource_ownership, created_at, updated_at) VALUES (2, 'documents:create', 'Create documents', 'Create documents permission for documents', 'documents', 'create', true, false, '2025-10-02 04:19:35.694271', '2025-10-02 04:19:35.694271');
INSERT INTO public.permissions (id, name, display_name, description, resource_type, action, is_system, requires_resource_ownership, created_at, updated_at) VALUES (3, 'documents:update', 'Update documents', 'Update documents permission for documents', 'documents', 'update', true, false, '2025-10-02 04:19:35.694271', '2025-10-02 04:19:35.694271');
INSERT INTO public.permissions (id, name, display_name, description, resource_type, action, is_system, requires_resource_ownership, created_at, updated_at) VALUES (4, 'documents:delete', 'Delete documents', 'Delete documents permission for documents', 'documents', 'delete', true, false, '2025-10-02 04:19:35.694271', '2025-10-02 04:19:35.694271');
INSERT INTO public.permissions (id, name, display_name, description, resource_type, action, is_system, requires_resource_ownership, created_at, updated_at) VALUES (5, 'documents:admin', 'Administer documents', 'Administer documents permission for documents', 'documents', 'admin', true, false, '2025-10-02 04:19:35.694271', '2025-10-02 04:19:35.694271');
INSERT INTO public.permissions (id, name, display_name, description, resource_type, action, is_system, requires_resource_ownership, created_at, updated_at) VALUES (6, 'users:read', 'Read users', 'Read users permission for users', 'users', 'read', true, false, '2025-10-02 04:19:35.694271', '2025-10-02 04:19:35.694271');
INSERT INTO public.permissions (id, name, display_name, description, resource_type, action, is_system, requires_resource_ownership, created_at, updated_at) VALUES (7, 'users:create', 'Create users', 'Create users permission for users', 'users', 'create', true, false, '2025-10-02 04:19:35.694271', '2025-10-02 04:19:35.694271');
INSERT INTO public.permissions (id, name, display_name, description, resource_type, action, is_system, requires_resource_ownership, created_at, updated_at) VALUES (8, 'users:update', 'Update users', 'Update users permission for users', 'users', 'update', true, false, '2025-10-02 04:19:35.694271', '2025-10-02 04:19:35.694271');
INSERT INTO public.permissions (id, name, display_name, description, resource_type, action, is_system, requires_resource_ownership, created_at, updated_at) VALUES (9, 'users:delete', 'Delete users', 'Delete users permission for users', 'users', 'delete', true, false, '2025-10-02 04:19:35.694271', '2025-10-02 04:19:35.694271');
INSERT INTO public.permissions (id, name, display_name, description, resource_type, action, is_system, requires_resource_ownership, created_at, updated_at) VALUES (10, 'users:admin', 'Administer users', 'Administer users permission for users', 'users', 'admin', true, false, '2025-10-02 04:19:35.694271', '2025-10-02 04:19:35.694271');
INSERT INTO public.permissions (id, name, display_name, description, resource_type, action, is_system, requires_resource_ownership, created_at, updated_at) VALUES (11, 'roles:read', 'Read roles', 'Read roles permission for roles', 'roles', 'read', true, false, '2025-10-02 04:19:35.694271', '2025-10-02 04:19:35.694271');
INSERT INTO public.permissions (id, name, display_name, description, resource_type, action, is_system, requires_resource_ownership, created_at, updated_at) VALUES (12, 'roles:create', 'Create roles', 'Create roles permission for roles', 'roles', 'create', true, false, '2025-10-02 04:19:35.694271', '2025-10-02 04:19:35.694271');
INSERT INTO public.permissions (id, name, display_name, description, resource_type, action, is_system, requires_resource_ownership, created_at, updated_at) VALUES (13, 'roles:update', 'Update roles', 'Update roles permission for roles', 'roles', 'update', true, false, '2025-10-02 04:19:35.694271', '2025-10-02 04:19:35.694271');
INSERT INTO public.permissions (id, name, display_name, description, resource_type, action, is_system, requires_resource_ownership, created_at, updated_at) VALUES (14, 'roles:delete', 'Delete roles', 'Delete roles permission for roles', 'roles', 'delete', true, false, '2025-10-02 04:19:35.694271', '2025-10-02 04:19:35.694271');
INSERT INTO public.permissions (id, name, display_name, description, resource_type, action, is_system, requires_resource_ownership, created_at, updated_at) VALUES (15, 'roles:admin', 'Administer roles', 'Administer roles permission for roles', 'roles', 'admin', true, false, '2025-10-02 04:19:35.694271', '2025-10-02 04:19:35.694271');
INSERT INTO public.permissions (id, name, display_name, description, resource_type, action, is_system, requires_resource_ownership, created_at, updated_at) VALUES (16, 'folders:read', 'Read folders', 'Read folders permission for folders', 'folders', 'read', false, false, '2025-10-02 04:19:35.694271', '2025-10-02 04:19:35.694271');
INSERT INTO public.permissions (id, name, display_name, description, resource_type, action, is_system, requires_resource_ownership, created_at, updated_at) VALUES (17, 'folders:create', 'Create folders', 'Create folders permission for folders', 'folders', 'create', false, false, '2025-10-02 04:19:35.694271', '2025-10-02 04:19:35.694271');
INSERT INTO public.permissions (id, name, display_name, description, resource_type, action, is_system, requires_resource_ownership, created_at, updated_at) VALUES (18, 'folders:update', 'Update folders', 'Update folders permission for folders', 'folders', 'update', false, false, '2025-10-02 04:19:35.694271', '2025-10-02 04:19:35.694271');
INSERT INTO public.permissions (id, name, display_name, description, resource_type, action, is_system, requires_resource_ownership, created_at, updated_at) VALUES (19, 'folders:delete', 'Delete folders', 'Delete folders permission for folders', 'folders', 'delete', false, false, '2025-10-02 04:19:35.694271', '2025-10-02 04:19:35.694271');
INSERT INTO public.permissions (id, name, display_name, description, resource_type, action, is_system, requires_resource_ownership, created_at, updated_at) VALUES (20, 'folders:admin', 'Administer folders', 'Administer folders permission for folders', 'folders', 'admin', false, false, '2025-10-02 04:19:35.694271', '2025-10-02 04:19:35.694271');
INSERT INTO public.permissions (id, name, display_name, description, resource_type, action, is_system, requires_resource_ownership, created_at, updated_at) VALUES (21, 'system:read', 'Read system information', 'Read system information permission for system', 'system', 'read', true, false, '2025-10-02 04:19:35.694271', '2025-10-02 04:19:35.694271');
INSERT INTO public.permissions (id, name, display_name, description, resource_type, action, is_system, requires_resource_ownership, created_at, updated_at) VALUES (22, 'system:admin', 'System administration', 'System administration permission for system', 'system', 'admin', true, false, '2025-10-02 04:19:35.694271', '2025-10-02 04:19:35.694271');
INSERT INTO public.permissions (id, name, display_name, description, resource_type, action, is_system, requires_resource_ownership, created_at, updated_at) VALUES (23, 'system:audit', 'System audit access', 'System audit access permission for system', 'system', 'audit', true, false, '2025-10-02 04:19:35.694271', '2025-10-02 04:19:35.694271');
INSERT INTO public.permissions (id, name, display_name, description, resource_type, action, is_system, requires_resource_ownership, created_at, updated_at) VALUES (24, 'system:backup', 'System backup access', 'System backup access permission for system', 'system', 'backup', true, false, '2025-10-02 04:19:35.694271', '2025-10-02 04:19:35.694271');
INSERT INTO public.permissions (id, name, display_name, description, resource_type, action, is_system, requires_resource_ownership, created_at, updated_at) VALUES (25, 'system:config', 'System configuration', 'System configuration permission for system', 'system', 'config', true, false, '2025-10-02 04:19:35.694271', '2025-10-02 04:19:35.694271');
INSERT INTO public.permissions (id, name, display_name, description, resource_type, action, is_system, requires_resource_ownership, created_at, updated_at) VALUES (26, 'audit:read', 'Read audit logs', 'Read audit logs permission for audit', 'audit', 'read', true, false, '2025-10-02 04:19:35.694271', '2025-10-02 04:19:35.694271');
INSERT INTO public.permissions (id, name, display_name, description, resource_type, action, is_system, requires_resource_ownership, created_at, updated_at) VALUES (27, 'audit:create', 'Create audit entries', 'Create audit entries permission for audit', 'audit', 'create', true, false, '2025-10-02 04:19:35.694271', '2025-10-02 04:19:35.694271');
INSERT INTO public.permissions (id, name, display_name, description, resource_type, action, is_system, requires_resource_ownership, created_at, updated_at) VALUES (28, 'audit:admin', 'Administer audit system', 'Administer audit system permission for audit', 'audit', 'admin', true, false, '2025-10-02 04:19:35.694271', '2025-10-02 04:19:35.694271');
INSERT INTO public.permissions (id, name, display_name, description, resource_type, action, is_system, requires_resource_ownership, created_at, updated_at) VALUES (29, 'security:read', 'Read security information', 'Read security information permission for security', 'security', 'read', true, false, '2025-10-02 04:19:35.694271', '2025-10-02 04:19:35.694271');
INSERT INTO public.permissions (id, name, display_name, description, resource_type, action, is_system, requires_resource_ownership, created_at, updated_at) VALUES (30, 'security:create', 'Create security events', 'Create security events permission for security', 'security', 'create', true, false, '2025-10-02 04:19:35.694271', '2025-10-02 04:19:35.694271');
INSERT INTO public.permissions (id, name, display_name, description, resource_type, action, is_system, requires_resource_ownership, created_at, updated_at) VALUES (31, 'security:update', 'Update security information', 'Update security information permission for security', 'security', 'update', true, false, '2025-10-02 04:19:35.694271', '2025-10-02 04:19:35.694271');
INSERT INTO public.permissions (id, name, display_name, description, resource_type, action, is_system, requires_resource_ownership, created_at, updated_at) VALUES (32, 'security:delete', 'Delete security information', 'Delete security information permission for security', 'security', 'delete', true, false, '2025-10-02 04:19:35.694271', '2025-10-02 04:19:35.694271');
INSERT INTO public.permissions (id, name, display_name, description, resource_type, action, is_system, requires_resource_ownership, created_at, updated_at) VALUES (33, 'security:admin', 'Administer security system', 'Administer security system permission for security', 'security', 'admin', true, false, '2025-10-02 04:19:35.694271', '2025-10-02 04:19:35.694271');


--
-- Data for Name: resource_permissions; Type: TABLE DATA; Schema: public; Owner: securevault_user
--



--
-- Data for Name: role_hierarchy; Type: TABLE DATA; Schema: public; Owner: securevault_user
--



--
-- Data for Name: role_permissions; Type: TABLE DATA; Schema: public; Owner: securevault_user
--

INSERT INTO public.role_permissions (role_id, permission_id, granted_at, granted_by, conditions, expires_at) VALUES (1, 1, '2025-10-02 04:19:35.694271', NULL, NULL, NULL);
INSERT INTO public.role_permissions (role_id, permission_id, granted_at, granted_by, conditions, expires_at) VALUES (1, 16, '2025-10-02 04:19:35.694271', NULL, NULL, NULL);
INSERT INTO public.role_permissions (role_id, permission_id, granted_at, granted_by, conditions, expires_at) VALUES (2, 1, '2025-10-02 04:19:35.694271', NULL, NULL, NULL);
INSERT INTO public.role_permissions (role_id, permission_id, granted_at, granted_by, conditions, expires_at) VALUES (2, 2, '2025-10-02 04:19:35.694271', NULL, NULL, NULL);
INSERT INTO public.role_permissions (role_id, permission_id, granted_at, granted_by, conditions, expires_at) VALUES (2, 16, '2025-10-02 04:19:35.694271', NULL, NULL, NULL);
INSERT INTO public.role_permissions (role_id, permission_id, granted_at, granted_by, conditions, expires_at) VALUES (2, 17, '2025-10-02 04:19:35.694271', NULL, NULL, NULL);
INSERT INTO public.role_permissions (role_id, permission_id, granted_at, granted_by, conditions, expires_at) VALUES (3, 1, '2025-10-02 04:19:35.694271', NULL, NULL, NULL);
INSERT INTO public.role_permissions (role_id, permission_id, granted_at, granted_by, conditions, expires_at) VALUES (3, 2, '2025-10-02 04:19:35.694271', NULL, NULL, NULL);
INSERT INTO public.role_permissions (role_id, permission_id, granted_at, granted_by, conditions, expires_at) VALUES (3, 3, '2025-10-02 04:19:35.694271', NULL, NULL, NULL);
INSERT INTO public.role_permissions (role_id, permission_id, granted_at, granted_by, conditions, expires_at) VALUES (3, 4, '2025-10-02 04:19:35.694271', NULL, NULL, NULL);
INSERT INTO public.role_permissions (role_id, permission_id, granted_at, granted_by, conditions, expires_at) VALUES (3, 16, '2025-10-02 04:19:35.694271', NULL, NULL, NULL);
INSERT INTO public.role_permissions (role_id, permission_id, granted_at, granted_by, conditions, expires_at) VALUES (3, 17, '2025-10-02 04:19:35.694271', NULL, NULL, NULL);
INSERT INTO public.role_permissions (role_id, permission_id, granted_at, granted_by, conditions, expires_at) VALUES (3, 18, '2025-10-02 04:19:35.694271', NULL, NULL, NULL);
INSERT INTO public.role_permissions (role_id, permission_id, granted_at, granted_by, conditions, expires_at) VALUES (3, 19, '2025-10-02 04:19:35.694271', NULL, NULL, NULL);
INSERT INTO public.role_permissions (role_id, permission_id, granted_at, granted_by, conditions, expires_at) VALUES (3, 6, '2025-10-02 04:19:35.694271', NULL, NULL, NULL);
INSERT INTO public.role_permissions (role_id, permission_id, granted_at, granted_by, conditions, expires_at) VALUES (4, 1, '2025-10-02 04:19:35.694271', NULL, NULL, NULL);
INSERT INTO public.role_permissions (role_id, permission_id, granted_at, granted_by, conditions, expires_at) VALUES (4, 2, '2025-10-02 04:19:35.694271', NULL, NULL, NULL);
INSERT INTO public.role_permissions (role_id, permission_id, granted_at, granted_by, conditions, expires_at) VALUES (4, 3, '2025-10-02 04:19:35.694271', NULL, NULL, NULL);
INSERT INTO public.role_permissions (role_id, permission_id, granted_at, granted_by, conditions, expires_at) VALUES (4, 4, '2025-10-02 04:19:35.694271', NULL, NULL, NULL);
INSERT INTO public.role_permissions (role_id, permission_id, granted_at, granted_by, conditions, expires_at) VALUES (4, 5, '2025-10-02 04:19:35.694271', NULL, NULL, NULL);
INSERT INTO public.role_permissions (role_id, permission_id, granted_at, granted_by, conditions, expires_at) VALUES (4, 16, '2025-10-02 04:19:35.694271', NULL, NULL, NULL);
INSERT INTO public.role_permissions (role_id, permission_id, granted_at, granted_by, conditions, expires_at) VALUES (4, 17, '2025-10-02 04:19:35.694271', NULL, NULL, NULL);
INSERT INTO public.role_permissions (role_id, permission_id, granted_at, granted_by, conditions, expires_at) VALUES (4, 18, '2025-10-02 04:19:35.694271', NULL, NULL, NULL);
INSERT INTO public.role_permissions (role_id, permission_id, granted_at, granted_by, conditions, expires_at) VALUES (4, 19, '2025-10-02 04:19:35.694271', NULL, NULL, NULL);
INSERT INTO public.role_permissions (role_id, permission_id, granted_at, granted_by, conditions, expires_at) VALUES (4, 20, '2025-10-02 04:19:35.694271', NULL, NULL, NULL);
INSERT INTO public.role_permissions (role_id, permission_id, granted_at, granted_by, conditions, expires_at) VALUES (4, 6, '2025-10-02 04:19:35.694271', NULL, NULL, NULL);
INSERT INTO public.role_permissions (role_id, permission_id, granted_at, granted_by, conditions, expires_at) VALUES (4, 7, '2025-10-02 04:19:35.694271', NULL, NULL, NULL);
INSERT INTO public.role_permissions (role_id, permission_id, granted_at, granted_by, conditions, expires_at) VALUES (4, 8, '2025-10-02 04:19:35.694271', NULL, NULL, NULL);
INSERT INTO public.role_permissions (role_id, permission_id, granted_at, granted_by, conditions, expires_at) VALUES (4, 10, '2025-10-02 04:19:35.694271', NULL, NULL, NULL);
INSERT INTO public.role_permissions (role_id, permission_id, granted_at, granted_by, conditions, expires_at) VALUES (4, 11, '2025-10-02 04:19:35.694271', NULL, NULL, NULL);
INSERT INTO public.role_permissions (role_id, permission_id, granted_at, granted_by, conditions, expires_at) VALUES (4, 21, '2025-10-02 04:19:35.694271', NULL, NULL, NULL);
INSERT INTO public.role_permissions (role_id, permission_id, granted_at, granted_by, conditions, expires_at) VALUES (4, 23, '2025-10-02 04:19:35.694271', NULL, NULL, NULL);
INSERT INTO public.role_permissions (role_id, permission_id, granted_at, granted_by, conditions, expires_at) VALUES (4, 24, '2025-10-02 04:19:35.694271', NULL, NULL, NULL);
INSERT INTO public.role_permissions (role_id, permission_id, granted_at, granted_by, conditions, expires_at) VALUES (4, 26, '2025-10-02 04:19:35.694271', NULL, NULL, NULL);
INSERT INTO public.role_permissions (role_id, permission_id, granted_at, granted_by, conditions, expires_at) VALUES (4, 29, '2025-10-02 04:19:35.694271', NULL, NULL, NULL);
INSERT INTO public.role_permissions (role_id, permission_id, granted_at, granted_by, conditions, expires_at) VALUES (4, 30, '2025-10-02 04:19:35.694271', NULL, NULL, NULL);
INSERT INTO public.role_permissions (role_id, permission_id, granted_at, granted_by, conditions, expires_at) VALUES (4, 31, '2025-10-02 04:19:35.694271', NULL, NULL, NULL);
INSERT INTO public.role_permissions (role_id, permission_id, granted_at, granted_by, conditions, expires_at) VALUES (5, 1, '2025-10-02 04:19:35.694271', NULL, NULL, NULL);
INSERT INTO public.role_permissions (role_id, permission_id, granted_at, granted_by, conditions, expires_at) VALUES (5, 2, '2025-10-02 04:19:35.694271', NULL, NULL, NULL);
INSERT INTO public.role_permissions (role_id, permission_id, granted_at, granted_by, conditions, expires_at) VALUES (5, 3, '2025-10-02 04:19:35.694271', NULL, NULL, NULL);
INSERT INTO public.role_permissions (role_id, permission_id, granted_at, granted_by, conditions, expires_at) VALUES (5, 4, '2025-10-02 04:19:35.694271', NULL, NULL, NULL);
INSERT INTO public.role_permissions (role_id, permission_id, granted_at, granted_by, conditions, expires_at) VALUES (5, 5, '2025-10-02 04:19:35.694271', NULL, NULL, NULL);
INSERT INTO public.role_permissions (role_id, permission_id, granted_at, granted_by, conditions, expires_at) VALUES (5, 16, '2025-10-02 04:19:35.694271', NULL, NULL, NULL);
INSERT INTO public.role_permissions (role_id, permission_id, granted_at, granted_by, conditions, expires_at) VALUES (5, 17, '2025-10-02 04:19:35.694271', NULL, NULL, NULL);
INSERT INTO public.role_permissions (role_id, permission_id, granted_at, granted_by, conditions, expires_at) VALUES (5, 18, '2025-10-02 04:19:35.694271', NULL, NULL, NULL);
INSERT INTO public.role_permissions (role_id, permission_id, granted_at, granted_by, conditions, expires_at) VALUES (5, 19, '2025-10-02 04:19:35.694271', NULL, NULL, NULL);
INSERT INTO public.role_permissions (role_id, permission_id, granted_at, granted_by, conditions, expires_at) VALUES (5, 20, '2025-10-02 04:19:35.694271', NULL, NULL, NULL);
INSERT INTO public.role_permissions (role_id, permission_id, granted_at, granted_by, conditions, expires_at) VALUES (5, 6, '2025-10-02 04:19:35.694271', NULL, NULL, NULL);
INSERT INTO public.role_permissions (role_id, permission_id, granted_at, granted_by, conditions, expires_at) VALUES (5, 7, '2025-10-02 04:19:35.694271', NULL, NULL, NULL);
INSERT INTO public.role_permissions (role_id, permission_id, granted_at, granted_by, conditions, expires_at) VALUES (5, 8, '2025-10-02 04:19:35.694271', NULL, NULL, NULL);
INSERT INTO public.role_permissions (role_id, permission_id, granted_at, granted_by, conditions, expires_at) VALUES (5, 9, '2025-10-02 04:19:35.694271', NULL, NULL, NULL);
INSERT INTO public.role_permissions (role_id, permission_id, granted_at, granted_by, conditions, expires_at) VALUES (5, 10, '2025-10-02 04:19:35.694271', NULL, NULL, NULL);
INSERT INTO public.role_permissions (role_id, permission_id, granted_at, granted_by, conditions, expires_at) VALUES (5, 11, '2025-10-02 04:19:35.694271', NULL, NULL, NULL);
INSERT INTO public.role_permissions (role_id, permission_id, granted_at, granted_by, conditions, expires_at) VALUES (5, 12, '2025-10-02 04:19:35.694271', NULL, NULL, NULL);
INSERT INTO public.role_permissions (role_id, permission_id, granted_at, granted_by, conditions, expires_at) VALUES (5, 13, '2025-10-02 04:19:35.694271', NULL, NULL, NULL);
INSERT INTO public.role_permissions (role_id, permission_id, granted_at, granted_by, conditions, expires_at) VALUES (5, 14, '2025-10-02 04:19:35.694271', NULL, NULL, NULL);
INSERT INTO public.role_permissions (role_id, permission_id, granted_at, granted_by, conditions, expires_at) VALUES (5, 15, '2025-10-02 04:19:35.694271', NULL, NULL, NULL);
INSERT INTO public.role_permissions (role_id, permission_id, granted_at, granted_by, conditions, expires_at) VALUES (5, 21, '2025-10-02 04:19:35.694271', NULL, NULL, NULL);
INSERT INTO public.role_permissions (role_id, permission_id, granted_at, granted_by, conditions, expires_at) VALUES (5, 22, '2025-10-02 04:19:35.694271', NULL, NULL, NULL);
INSERT INTO public.role_permissions (role_id, permission_id, granted_at, granted_by, conditions, expires_at) VALUES (5, 23, '2025-10-02 04:19:35.694271', NULL, NULL, NULL);
INSERT INTO public.role_permissions (role_id, permission_id, granted_at, granted_by, conditions, expires_at) VALUES (5, 24, '2025-10-02 04:19:35.694271', NULL, NULL, NULL);
INSERT INTO public.role_permissions (role_id, permission_id, granted_at, granted_by, conditions, expires_at) VALUES (5, 25, '2025-10-02 04:19:35.694271', NULL, NULL, NULL);
INSERT INTO public.role_permissions (role_id, permission_id, granted_at, granted_by, conditions, expires_at) VALUES (5, 26, '2025-10-02 04:19:35.694271', NULL, NULL, NULL);
INSERT INTO public.role_permissions (role_id, permission_id, granted_at, granted_by, conditions, expires_at) VALUES (5, 27, '2025-10-02 04:19:35.694271', NULL, NULL, NULL);
INSERT INTO public.role_permissions (role_id, permission_id, granted_at, granted_by, conditions, expires_at) VALUES (5, 28, '2025-10-02 04:19:35.694271', NULL, NULL, NULL);
INSERT INTO public.role_permissions (role_id, permission_id, granted_at, granted_by, conditions, expires_at) VALUES (5, 29, '2025-10-02 04:19:35.694271', NULL, NULL, NULL);
INSERT INTO public.role_permissions (role_id, permission_id, granted_at, granted_by, conditions, expires_at) VALUES (5, 30, '2025-10-02 04:19:35.694271', NULL, NULL, NULL);
INSERT INTO public.role_permissions (role_id, permission_id, granted_at, granted_by, conditions, expires_at) VALUES (5, 31, '2025-10-02 04:19:35.694271', NULL, NULL, NULL);
INSERT INTO public.role_permissions (role_id, permission_id, granted_at, granted_by, conditions, expires_at) VALUES (5, 32, '2025-10-02 04:19:35.694271', NULL, NULL, NULL);
INSERT INTO public.role_permissions (role_id, permission_id, granted_at, granted_by, conditions, expires_at) VALUES (5, 33, '2025-10-02 04:19:35.694271', NULL, NULL, NULL);


--
-- Data for Name: roles; Type: TABLE DATA; Schema: public; Owner: securevault_user
--

INSERT INTO public.roles (id, name, display_name, description, hierarchy_level, is_system, is_active, created_at, updated_at, created_by) VALUES (1, 'viewer', 'Viewer', 'Can view documents and basic information', 1, true, true, '2025-10-02 04:19:35.694271', '2025-10-02 04:19:35.694271', NULL);
INSERT INTO public.roles (id, name, display_name, description, hierarchy_level, is_system, is_active, created_at, updated_at, created_by) VALUES (2, 'user', 'User', 'Standard user with document creation privileges', 2, true, true, '2025-10-02 04:19:35.694271', '2025-10-02 04:19:35.694271', NULL);
INSERT INTO public.roles (id, name, display_name, description, hierarchy_level, is_system, is_active, created_at, updated_at, created_by) VALUES (3, 'manager', 'Manager', 'Can manage team documents and users', 3, true, true, '2025-10-02 04:19:35.694271', '2025-10-02 04:19:35.694271', NULL);
INSERT INTO public.roles (id, name, display_name, description, hierarchy_level, is_system, is_active, created_at, updated_at, created_by) VALUES (4, 'admin', 'Administrator', 'Can manage system users and configurations', 4, true, true, '2025-10-02 04:19:35.694271', '2025-10-02 04:19:35.694271', NULL);
INSERT INTO public.roles (id, name, display_name, description, hierarchy_level, is_system, is_active, created_at, updated_at, created_by) VALUES (5, 'super_admin', 'Super Administrator', 'Full system access', 5, true, true, '2025-10-02 04:19:35.694271', '2025-10-02 04:19:35.694271', NULL);


--
-- Data for Name: security_alerts; Type: TABLE DATA; Schema: public; Owner: securevault_user
--



--
-- Data for Name: security_events; Type: TABLE DATA; Schema: public; Owner: securevault_user
--



--
-- Data for Name: security_metrics; Type: TABLE DATA; Schema: public; Owner: securevault_user
--



--
-- Data for Name: suspicious_patterns; Type: TABLE DATA; Schema: public; Owner: securevault_user
--



--
-- Data for Name: threat_responses; Type: TABLE DATA; Schema: public; Owner: securevault_user
--



--
-- Data for Name: token_families; Type: TABLE DATA; Schema: public; Owner: securevault_user
--



--
-- Data for Name: user_encryption_keys; Type: TABLE DATA; Schema: public; Owner: securevault_user
--

INSERT INTO public.user_encryption_keys (id, user_id, key_id, algorithm, key_derivation_method, iterations, salt, validation_hash, hint, is_active, created_at, created_by, expires_at, deactivated_at, deactivated_reason) VALUES (1, 3, 'key_3_77465b09a42608277d25dc593bfac3af', 'AES-256-GCM', 'PBKDF2-SHA256', 500000, '3xWLT5khq/PlkfPVnav7vGJ0yo8uf/QqxL5j/4c8hzg=', '4c8810d026cefeefe35fb2e6514097d8ef7f67fe23bb1d1aee2079974cefdab1', 'Default encryption key for document uploads', true, '2025-10-02 06:57:54.187278+00', 3, NULL, NULL, NULL);


--
-- Data for Name: user_roles; Type: TABLE DATA; Schema: public; Owner: securevault_user
--

INSERT INTO public.user_roles (user_id, role_id, assigned_at, assigned_by, expires_at, is_primary, is_active) VALUES (1, 4, '2025-10-02 04:53:48.027921', NULL, NULL, true, true);
INSERT INTO public.user_roles (user_id, role_id, assigned_at, assigned_by, expires_at, is_primary, is_active) VALUES (2, 2, '2025-10-02 05:02:21.318657', NULL, NULL, true, true);
INSERT INTO public.user_roles (user_id, role_id, assigned_at, assigned_by, expires_at, is_primary, is_active) VALUES (3, 5, '2025-10-02 05:06:02.169946', NULL, NULL, true, true);
INSERT INTO public.user_roles (user_id, role_id, assigned_at, assigned_by, expires_at, is_primary, is_active) VALUES (4, 2, '2025-10-02 06:57:07.627335', 3, NULL, true, true);


--
-- Data for Name: users; Type: TABLE DATA; Schema: public; Owner: securevault_user
--

INSERT INTO public.users (id, username, email, password_hash, encryption_salt, key_verification_payload, encryption_method, key_derivation_iterations, is_active, is_verified, must_change_password, role, mfa_enabled, mfa_secret, mfa_setup_date, mfa_last_used, backup_codes, backup_codes_generated_at, failed_login_attempts, locked_until, last_login, last_password_change, created_at, updated_at, created_by, full_name, department) VALUES (1, 'admin', 'admin@example.com', '$2b$12$25zHmY4iASJHAcI/bnRhYez2sgZo7UMO1IT6It9uwB4ULY.6XSMam', NULL, NULL, 'PBKDF2-SHA256', 500000, true, true, false, 'admin', false, NULL, NULL, NULL, NULL, NULL, 0, NULL, NULL, '2025-10-02 04:42:14.700727', '2025-10-02 04:42:14.700727', '2025-10-02 04:42:14.700727', NULL, NULL, NULL);
INSERT INTO public.users (id, username, email, password_hash, encryption_salt, key_verification_payload, encryption_method, key_derivation_iterations, is_active, is_verified, must_change_password, role, mfa_enabled, mfa_secret, mfa_setup_date, mfa_last_used, backup_codes, backup_codes_generated_at, failed_login_attempts, locked_until, last_login, last_password_change, created_at, updated_at, created_by, full_name, department) VALUES (3, 'rahumana', 'rahumana@test.com', '$2b$12$bWINlzucx/7Pq7EO8pPiJufDZQsHSxDlbtvTVP7H.oKnaRC4mZNE6', 'A4eSOJpzoRq/yynj+IaQTXHVmqKUklJqAb/9Yc/Qa90=', '{"ciphertext": "P3bZ1OsawduG/2pIZRV6IsaPzg==", "iv": "C6/FBeluM5hhWbWz", "authTag": "pYiTEYjij8vG3qlU5FQEJQ=="}', 'PBKDF2-SHA256', 500000, true, true, false, 'super_admin', false, NULL, NULL, NULL, NULL, NULL, 0, NULL, '2025-10-02 12:01:28.947758', '2025-10-02 05:04:02.529396', '2025-10-02 10:34:03.177688', '2025-10-02 12:01:27.404203', NULL, 'Test User', NULL);
INSERT INTO public.users (id, username, email, password_hash, encryption_salt, key_verification_payload, encryption_method, key_derivation_iterations, is_active, is_verified, must_change_password, role, mfa_enabled, mfa_secret, mfa_setup_date, mfa_last_used, backup_codes, backup_codes_generated_at, failed_login_attempts, locked_until, last_login, last_password_change, created_at, updated_at, created_by, full_name, department) VALUES (2, 'ameer_arsath', 'ameerarsath2@gmail.com', '$2b$12$jDL6i2jLdDuUkOnb0KcdfORcDfrHQzo9hLV6H9PgvuNycB.U3FKim', 'V6Vi46InLBidRtjm4Mx/C8+NUA4IR8k/rRFCrGlkaas=', '{"ciphertext": "TweslEngSlvbeQuxZ1A6HwunhwTutUo=", "iv": "x1q3+g+jRT74CQm+", "authTag": "wSV4hqDxtjIaQWyb/6Xk3g=="}', 'PBKDF2-SHA256', 500000, true, true, false, 'user', false, NULL, NULL, NULL, NULL, NULL, 0, NULL, NULL, '2025-10-02 05:02:07.824521', '2025-10-02 05:02:09.100245', '2025-10-02 05:06:27.80659', NULL, 'ameer_arsath', NULL);
INSERT INTO public.users (id, username, email, password_hash, encryption_salt, key_verification_payload, encryption_method, key_derivation_iterations, is_active, is_verified, must_change_password, role, mfa_enabled, mfa_secret, mfa_setup_date, mfa_last_used, backup_codes, backup_codes_generated_at, failed_login_attempts, locked_until, last_login, last_password_change, created_at, updated_at, created_by, full_name, department) VALUES (4, 'test23', 'tes12d@gmail.com', '$2b$12$FTiixMur82R9O.ucP9HdGewYEo4tC8IdPtgS/ba.u1SGZYfJLJZm2', 'ulooaA+jS5mNcI/ivLTvcZGh9s6w4Je9kYdWPPOX1rY=', '{"ciphertext": "QQ05Mv8hZ+qzeGu0qbaZonU=", "iv": "WRFrmxUJB5DH0VhR", "authTag": "oQvdrM6h1UVYM4V02r0BJQ=="}', 'PBKDF2-SHA256', 500000, true, true, true, 'user', false, NULL, NULL, NULL, NULL, NULL, 0, NULL, NULL, '2025-10-02 06:57:05.606317', '2025-10-02 06:57:05.606317', '2025-10-02 06:57:05.606317', NULL, NULL, NULL);


--
-- Name: crypto_randomness_tests_id_seq; Type: SEQUENCE SET; Schema: public; Owner: securevault_user
--

SELECT pg_catalog.setval('public.crypto_randomness_tests_id_seq', 1, false);


--
-- Name: document_access_logs_id_seq; Type: SEQUENCE SET; Schema: public; Owner: securevault_user
--

SELECT pg_catalog.setval('public.document_access_logs_id_seq', 17, true);


--
-- Name: document_permissions_id_seq; Type: SEQUENCE SET; Schema: public; Owner: securevault_user
--

SELECT pg_catalog.setval('public.document_permissions_id_seq', 1, false);


--
-- Name: document_shares_id_seq; Type: SEQUENCE SET; Schema: public; Owner: securevault_user
--

SELECT pg_catalog.setval('public.document_shares_id_seq', 1, false);


--
-- Name: document_versions_id_seq; Type: SEQUENCE SET; Schema: public; Owner: securevault_user
--

SELECT pg_catalog.setval('public.document_versions_id_seq', 1, false);


--
-- Name: documents_id_seq; Type: SEQUENCE SET; Schema: public; Owner: securevault_user
--

SELECT pg_catalog.setval('public.documents_id_seq', 3, true);


--
-- Name: encryption_audit_logs_id_seq; Type: SEQUENCE SET; Schema: public; Owner: securevault_user
--

SELECT pg_catalog.setval('public.encryption_audit_logs_id_seq', 1, true);


--
-- Name: ip_blocklist_id_seq; Type: SEQUENCE SET; Schema: public; Owner: securevault_user
--

SELECT pg_catalog.setval('public.ip_blocklist_id_seq', 1, false);


--
-- Name: key_escrow_id_seq; Type: SEQUENCE SET; Schema: public; Owner: securevault_user
--

SELECT pg_catalog.setval('public.key_escrow_id_seq', 1, false);


--
-- Name: key_rotation_logs_id_seq; Type: SEQUENCE SET; Schema: public; Owner: securevault_user
--

SELECT pg_catalog.setval('public.key_rotation_logs_id_seq', 1, false);


--
-- Name: master_keys_id_seq; Type: SEQUENCE SET; Schema: public; Owner: securevault_user
--

SELECT pg_catalog.setval('public.master_keys_id_seq', 1, false);


--
-- Name: mfa_audit_logs_id_seq; Type: SEQUENCE SET; Schema: public; Owner: securevault_user
--

SELECT pg_catalog.setval('public.mfa_audit_logs_id_seq', 1, false);


--
-- Name: mfa_configuration_id_seq; Type: SEQUENCE SET; Schema: public; Owner: securevault_user
--

SELECT pg_catalog.setval('public.mfa_configuration_id_seq', 1, false);


--
-- Name: mfa_failed_attempts_id_seq; Type: SEQUENCE SET; Schema: public; Owner: securevault_user
--

SELECT pg_catalog.setval('public.mfa_failed_attempts_id_seq', 1, false);


--
-- Name: mfa_used_codes_id_seq; Type: SEQUENCE SET; Schema: public; Owner: securevault_user
--

SELECT pg_catalog.setval('public.mfa_used_codes_id_seq', 1, false);


--
-- Name: permissions_id_seq; Type: SEQUENCE SET; Schema: public; Owner: securevault_user
--

SELECT pg_catalog.setval('public.permissions_id_seq', 33, true);


--
-- Name: resource_permissions_id_seq; Type: SEQUENCE SET; Schema: public; Owner: securevault_user
--

SELECT pg_catalog.setval('public.resource_permissions_id_seq', 1, false);


--
-- Name: role_hierarchy_id_seq; Type: SEQUENCE SET; Schema: public; Owner: securevault_user
--

SELECT pg_catalog.setval('public.role_hierarchy_id_seq', 1, false);


--
-- Name: roles_id_seq; Type: SEQUENCE SET; Schema: public; Owner: securevault_user
--

SELECT pg_catalog.setval('public.roles_id_seq', 5, true);


--
-- Name: security_alerts_id_seq; Type: SEQUENCE SET; Schema: public; Owner: securevault_user
--

SELECT pg_catalog.setval('public.security_alerts_id_seq', 1, false);


--
-- Name: security_events_id_seq; Type: SEQUENCE SET; Schema: public; Owner: securevault_user
--

SELECT pg_catalog.setval('public.security_events_id_seq', 1, false);


--
-- Name: security_metrics_id_seq; Type: SEQUENCE SET; Schema: public; Owner: securevault_user
--

SELECT pg_catalog.setval('public.security_metrics_id_seq', 1, false);


--
-- Name: suspicious_patterns_id_seq; Type: SEQUENCE SET; Schema: public; Owner: securevault_user
--

SELECT pg_catalog.setval('public.suspicious_patterns_id_seq', 1, false);


--
-- Name: threat_responses_id_seq; Type: SEQUENCE SET; Schema: public; Owner: securevault_user
--

SELECT pg_catalog.setval('public.threat_responses_id_seq', 1, false);


--
-- Name: user_encryption_keys_id_seq; Type: SEQUENCE SET; Schema: public; Owner: securevault_user
--

SELECT pg_catalog.setval('public.user_encryption_keys_id_seq', 1, true);


--
-- Name: users_id_seq; Type: SEQUENCE SET; Schema: public; Owner: securevault_user
--

SELECT pg_catalog.setval('public.users_id_seq', 4, true);


--
-- Name: alembic_version alembic_version_pkc; Type: CONSTRAINT; Schema: public; Owner: securevault_user
--

ALTER TABLE ONLY public.alembic_version
    ADD CONSTRAINT alembic_version_pkc PRIMARY KEY (version_num);


--
-- Name: crypto_randomness_tests crypto_randomness_tests_pkey; Type: CONSTRAINT; Schema: public; Owner: securevault_user
--

ALTER TABLE ONLY public.crypto_randomness_tests
    ADD CONSTRAINT crypto_randomness_tests_pkey PRIMARY KEY (id);


--
-- Name: document_access_logs document_access_logs_pkey; Type: CONSTRAINT; Schema: public; Owner: securevault_user
--

ALTER TABLE ONLY public.document_access_logs
    ADD CONSTRAINT document_access_logs_pkey PRIMARY KEY (id);


--
-- Name: document_permissions document_permissions_pkey; Type: CONSTRAINT; Schema: public; Owner: securevault_user
--

ALTER TABLE ONLY public.document_permissions
    ADD CONSTRAINT document_permissions_pkey PRIMARY KEY (id);


--
-- Name: document_shares document_shares_pkey; Type: CONSTRAINT; Schema: public; Owner: securevault_user
--

ALTER TABLE ONLY public.document_shares
    ADD CONSTRAINT document_shares_pkey PRIMARY KEY (id);


--
-- Name: document_versions document_versions_pkey; Type: CONSTRAINT; Schema: public; Owner: securevault_user
--

ALTER TABLE ONLY public.document_versions
    ADD CONSTRAINT document_versions_pkey PRIMARY KEY (id);


--
-- Name: documents documents_pkey; Type: CONSTRAINT; Schema: public; Owner: securevault_user
--

ALTER TABLE ONLY public.documents
    ADD CONSTRAINT documents_pkey PRIMARY KEY (id);


--
-- Name: encryption_audit_logs encryption_audit_logs_pkey; Type: CONSTRAINT; Schema: public; Owner: securevault_user
--

ALTER TABLE ONLY public.encryption_audit_logs
    ADD CONSTRAINT encryption_audit_logs_pkey PRIMARY KEY (id);


--
-- Name: ip_blocklist ip_blocklist_pkey; Type: CONSTRAINT; Schema: public; Owner: securevault_user
--

ALTER TABLE ONLY public.ip_blocklist
    ADD CONSTRAINT ip_blocklist_pkey PRIMARY KEY (id);


--
-- Name: key_escrow key_escrow_pkey; Type: CONSTRAINT; Schema: public; Owner: securevault_user
--

ALTER TABLE ONLY public.key_escrow
    ADD CONSTRAINT key_escrow_pkey PRIMARY KEY (id);


--
-- Name: key_rotation_logs key_rotation_logs_pkey; Type: CONSTRAINT; Schema: public; Owner: securevault_user
--

ALTER TABLE ONLY public.key_rotation_logs
    ADD CONSTRAINT key_rotation_logs_pkey PRIMARY KEY (id);


--
-- Name: master_keys master_keys_pkey; Type: CONSTRAINT; Schema: public; Owner: securevault_user
--

ALTER TABLE ONLY public.master_keys
    ADD CONSTRAINT master_keys_pkey PRIMARY KEY (id);


--
-- Name: mfa_audit_logs mfa_audit_logs_pkey; Type: CONSTRAINT; Schema: public; Owner: securevault_user
--

ALTER TABLE ONLY public.mfa_audit_logs
    ADD CONSTRAINT mfa_audit_logs_pkey PRIMARY KEY (id);


--
-- Name: mfa_configuration mfa_configuration_pkey; Type: CONSTRAINT; Schema: public; Owner: securevault_user
--

ALTER TABLE ONLY public.mfa_configuration
    ADD CONSTRAINT mfa_configuration_pkey PRIMARY KEY (id);


--
-- Name: mfa_failed_attempts mfa_failed_attempts_pkey; Type: CONSTRAINT; Schema: public; Owner: securevault_user
--

ALTER TABLE ONLY public.mfa_failed_attempts
    ADD CONSTRAINT mfa_failed_attempts_pkey PRIMARY KEY (id);


--
-- Name: mfa_used_codes mfa_used_codes_pkey; Type: CONSTRAINT; Schema: public; Owner: securevault_user
--

ALTER TABLE ONLY public.mfa_used_codes
    ADD CONSTRAINT mfa_used_codes_pkey PRIMARY KEY (id);


--
-- Name: permissions permissions_pkey; Type: CONSTRAINT; Schema: public; Owner: securevault_user
--

ALTER TABLE ONLY public.permissions
    ADD CONSTRAINT permissions_pkey PRIMARY KEY (id);


--
-- Name: resource_permissions resource_permissions_pkey; Type: CONSTRAINT; Schema: public; Owner: securevault_user
--

ALTER TABLE ONLY public.resource_permissions
    ADD CONSTRAINT resource_permissions_pkey PRIMARY KEY (id);


--
-- Name: role_hierarchy role_hierarchy_pkey; Type: CONSTRAINT; Schema: public; Owner: securevault_user
--

ALTER TABLE ONLY public.role_hierarchy
    ADD CONSTRAINT role_hierarchy_pkey PRIMARY KEY (id);


--
-- Name: role_permissions role_permissions_pkey; Type: CONSTRAINT; Schema: public; Owner: securevault_user
--

ALTER TABLE ONLY public.role_permissions
    ADD CONSTRAINT role_permissions_pkey PRIMARY KEY (role_id, permission_id);


--
-- Name: roles roles_pkey; Type: CONSTRAINT; Schema: public; Owner: securevault_user
--

ALTER TABLE ONLY public.roles
    ADD CONSTRAINT roles_pkey PRIMARY KEY (id);


--
-- Name: security_alerts security_alerts_pkey; Type: CONSTRAINT; Schema: public; Owner: securevault_user
--

ALTER TABLE ONLY public.security_alerts
    ADD CONSTRAINT security_alerts_pkey PRIMARY KEY (id);


--
-- Name: security_events security_events_pkey; Type: CONSTRAINT; Schema: public; Owner: securevault_user
--

ALTER TABLE ONLY public.security_events
    ADD CONSTRAINT security_events_pkey PRIMARY KEY (id);


--
-- Name: security_metrics security_metrics_pkey; Type: CONSTRAINT; Schema: public; Owner: securevault_user
--

ALTER TABLE ONLY public.security_metrics
    ADD CONSTRAINT security_metrics_pkey PRIMARY KEY (id);


--
-- Name: suspicious_patterns suspicious_patterns_pkey; Type: CONSTRAINT; Schema: public; Owner: securevault_user
--

ALTER TABLE ONLY public.suspicious_patterns
    ADD CONSTRAINT suspicious_patterns_pkey PRIMARY KEY (id);


--
-- Name: threat_responses threat_responses_pkey; Type: CONSTRAINT; Schema: public; Owner: securevault_user
--

ALTER TABLE ONLY public.threat_responses
    ADD CONSTRAINT threat_responses_pkey PRIMARY KEY (id);


--
-- Name: token_families token_families_pkey; Type: CONSTRAINT; Schema: public; Owner: securevault_user
--

ALTER TABLE ONLY public.token_families
    ADD CONSTRAINT token_families_pkey PRIMARY KEY (id);


--
-- Name: key_escrow uq_key_escrow_key_id; Type: CONSTRAINT; Schema: public; Owner: securevault_user
--

ALTER TABLE ONLY public.key_escrow
    ADD CONSTRAINT uq_key_escrow_key_id UNIQUE (key_id);


--
-- Name: resource_permissions uq_resource_permission; Type: CONSTRAINT; Schema: public; Owner: securevault_user
--

ALTER TABLE ONLY public.resource_permissions
    ADD CONSTRAINT uq_resource_permission UNIQUE (resource_type, resource_id, subject_type, subject_id, permission);


--
-- Name: role_hierarchy uq_role_hierarchy; Type: CONSTRAINT; Schema: public; Owner: securevault_user
--

ALTER TABLE ONLY public.role_hierarchy
    ADD CONSTRAINT uq_role_hierarchy UNIQUE (parent_role_id, child_role_id);


--
-- Name: user_roles uq_user_role; Type: CONSTRAINT; Schema: public; Owner: securevault_user
--

ALTER TABLE ONLY public.user_roles
    ADD CONSTRAINT uq_user_role PRIMARY KEY (user_id, role_id);


--
-- Name: user_encryption_keys user_encryption_keys_pkey; Type: CONSTRAINT; Schema: public; Owner: securevault_user
--

ALTER TABLE ONLY public.user_encryption_keys
    ADD CONSTRAINT user_encryption_keys_pkey PRIMARY KEY (id);


--
-- Name: users users_pkey; Type: CONSTRAINT; Schema: public; Owner: securevault_user
--

ALTER TABLE ONLY public.users
    ADD CONSTRAINT users_pkey PRIMARY KEY (id);


--
-- Name: idx_crypto_randomness_passed; Type: INDEX; Schema: public; Owner: securevault_user
--

CREATE INDEX idx_crypto_randomness_passed ON public.crypto_randomness_tests USING btree (test_passed);


--
-- Name: idx_crypto_randomness_timestamp; Type: INDEX; Schema: public; Owner: securevault_user
--

CREATE INDEX idx_crypto_randomness_timestamp ON public.crypto_randomness_tests USING btree (test_timestamp);


--
-- Name: idx_crypto_randomness_type; Type: INDEX; Schema: public; Owner: securevault_user
--

CREATE INDEX idx_crypto_randomness_type ON public.crypto_randomness_tests USING btree (test_type);


--
-- Name: idx_doc_access_logs_accessed_at; Type: INDEX; Schema: public; Owner: securevault_user
--

CREATE INDEX idx_doc_access_logs_accessed_at ON public.document_access_logs USING btree (accessed_at);


--
-- Name: idx_doc_access_logs_doc_action; Type: INDEX; Schema: public; Owner: securevault_user
--

CREATE INDEX idx_doc_access_logs_doc_action ON public.document_access_logs USING btree (document_id, action);


--
-- Name: idx_doc_access_logs_user_accessed; Type: INDEX; Schema: public; Owner: securevault_user
--

CREATE INDEX idx_doc_access_logs_user_accessed ON public.document_access_logs USING btree (user_id, accessed_at);


--
-- Name: idx_doc_permissions_doc_user; Type: INDEX; Schema: public; Owner: securevault_user
--

CREATE INDEX idx_doc_permissions_doc_user ON public.document_permissions USING btree (document_id, user_id);


--
-- Name: idx_doc_permissions_type_granted; Type: INDEX; Schema: public; Owner: securevault_user
--

CREATE INDEX idx_doc_permissions_type_granted ON public.document_permissions USING btree (permission_type, granted);


--
-- Name: idx_doc_shares_document_active; Type: INDEX; Schema: public; Owner: securevault_user
--

CREATE INDEX idx_doc_shares_document_active ON public.document_shares USING btree (document_id, is_active);


--
-- Name: idx_doc_shares_token_active; Type: INDEX; Schema: public; Owner: securevault_user
--

CREATE INDEX idx_doc_shares_token_active ON public.document_shares USING btree (share_token, is_active);


--
-- Name: idx_doc_versions_doc_current; Type: INDEX; Schema: public; Owner: securevault_user
--

CREATE INDEX idx_doc_versions_doc_current ON public.document_versions USING btree (document_id, is_current);


--
-- Name: idx_doc_versions_doc_version; Type: INDEX; Schema: public; Owner: securevault_user
--

CREATE INDEX idx_doc_versions_doc_version ON public.document_versions USING btree (document_id, version_number);


--
-- Name: idx_documents_created_at; Type: INDEX; Schema: public; Owner: securevault_user
--

CREATE INDEX idx_documents_created_at ON public.documents USING btree (created_at);


--
-- Name: idx_documents_name_type; Type: INDEX; Schema: public; Owner: securevault_user
--

CREATE INDEX idx_documents_name_type ON public.documents USING btree (name, document_type);


--
-- Name: idx_documents_owner_status; Type: INDEX; Schema: public; Owner: securevault_user
--

CREATE INDEX idx_documents_owner_status ON public.documents USING btree (owner_id, status);


--
-- Name: idx_documents_parent_type; Type: INDEX; Schema: public; Owner: securevault_user
--

CREATE INDEX idx_documents_parent_type ON public.documents USING btree (parent_id, document_type);


--
-- Name: idx_documents_path_status; Type: INDEX; Schema: public; Owner: securevault_user
--

CREATE INDEX idx_documents_path_status ON public.documents USING btree (path, status);


--
-- Name: idx_documents_updated_at; Type: INDEX; Schema: public; Owner: securevault_user
--

CREATE INDEX idx_documents_updated_at ON public.documents USING btree (updated_at);


--
-- Name: idx_encryption_audit_operation; Type: INDEX; Schema: public; Owner: securevault_user
--

CREATE INDEX idx_encryption_audit_operation ON public.encryption_audit_logs USING btree (operation_id);


--
-- Name: idx_encryption_audit_risk; Type: INDEX; Schema: public; Owner: securevault_user
--

CREATE INDEX idx_encryption_audit_risk ON public.encryption_audit_logs USING btree (risk_score);


--
-- Name: idx_encryption_audit_success; Type: INDEX; Schema: public; Owner: securevault_user
--

CREATE INDEX idx_encryption_audit_success ON public.encryption_audit_logs USING btree (success);


--
-- Name: idx_encryption_audit_timestamp; Type: INDEX; Schema: public; Owner: securevault_user
--

CREATE INDEX idx_encryption_audit_timestamp ON public.encryption_audit_logs USING btree ("timestamp");


--
-- Name: idx_encryption_audit_user_action; Type: INDEX; Schema: public; Owner: securevault_user
--

CREATE INDEX idx_encryption_audit_user_action ON public.encryption_audit_logs USING btree (user_id, action);


--
-- Name: idx_ip_blocklist_expires; Type: INDEX; Schema: public; Owner: securevault_user
--

CREATE INDEX idx_ip_blocklist_expires ON public.ip_blocklist USING btree (expires_at);


--
-- Name: idx_ip_blocklist_permanent; Type: INDEX; Schema: public; Owner: securevault_user
--

CREATE INDEX idx_ip_blocklist_permanent ON public.ip_blocklist USING btree (is_permanent);


--
-- Name: idx_key_escrow_created; Type: INDEX; Schema: public; Owner: securevault_user
--

CREATE INDEX idx_key_escrow_created ON public.key_escrow USING btree (created_at);


--
-- Name: idx_key_escrow_recovered; Type: INDEX; Schema: public; Owner: securevault_user
--

CREATE INDEX idx_key_escrow_recovered ON public.key_escrow USING btree (recovered_at);


--
-- Name: idx_key_escrow_user; Type: INDEX; Schema: public; Owner: securevault_user
--

CREATE INDEX idx_key_escrow_user ON public.key_escrow USING btree (user_id);


--
-- Name: idx_key_rotation_started; Type: INDEX; Schema: public; Owner: securevault_user
--

CREATE INDEX idx_key_rotation_started ON public.key_rotation_logs USING btree (started_at);


--
-- Name: idx_key_rotation_status; Type: INDEX; Schema: public; Owner: securevault_user
--

CREATE INDEX idx_key_rotation_status ON public.key_rotation_logs USING btree (status);


--
-- Name: idx_key_rotation_user; Type: INDEX; Schema: public; Owner: securevault_user
--

CREATE INDEX idx_key_rotation_user ON public.key_rotation_logs USING btree (user_id);


--
-- Name: idx_master_keys_purpose_active; Type: INDEX; Schema: public; Owner: securevault_user
--

CREATE INDEX idx_master_keys_purpose_active ON public.master_keys USING btree (purpose, is_active);


--
-- Name: idx_master_keys_rotation; Type: INDEX; Schema: public; Owner: securevault_user
--

CREATE INDEX idx_master_keys_rotation ON public.master_keys USING btree (next_rotation_at);


--
-- Name: idx_mfa_audit_event_time; Type: INDEX; Schema: public; Owner: securevault_user
--

CREATE INDEX idx_mfa_audit_event_time ON public.mfa_audit_logs USING btree (event_type, created_at);


--
-- Name: idx_mfa_audit_user_time; Type: INDEX; Schema: public; Owner: securevault_user
--

CREATE INDEX idx_mfa_audit_user_time ON public.mfa_audit_logs USING btree (user_id, created_at);


--
-- Name: idx_mfa_failed_user_time; Type: INDEX; Schema: public; Owner: securevault_user
--

CREATE INDEX idx_mfa_failed_user_time ON public.mfa_failed_attempts USING btree (user_id, attempted_at);


--
-- Name: idx_mfa_used_codes_expires; Type: INDEX; Schema: public; Owner: securevault_user
--

CREATE INDEX idx_mfa_used_codes_expires ON public.mfa_used_codes USING btree (expires_at);


--
-- Name: idx_mfa_used_codes_user_time; Type: INDEX; Schema: public; Owner: securevault_user
--

CREATE INDEX idx_mfa_used_codes_user_time ON public.mfa_used_codes USING btree (user_id, time_window);


--
-- Name: idx_permission_resource_action; Type: INDEX; Schema: public; Owner: securevault_user
--

CREATE INDEX idx_permission_resource_action ON public.permissions USING btree (resource_type, action);


--
-- Name: idx_resource_permission_inheritance; Type: INDEX; Schema: public; Owner: securevault_user
--

CREATE INDEX idx_resource_permission_inheritance ON public.resource_permissions USING btree (inheritable, inherited_from);


--
-- Name: idx_resource_permission_lookup; Type: INDEX; Schema: public; Owner: securevault_user
--

CREATE INDEX idx_resource_permission_lookup ON public.resource_permissions USING btree (resource_type, resource_id, subject_type, subject_id);


--
-- Name: idx_role_hierarchy_child; Type: INDEX; Schema: public; Owner: securevault_user
--

CREATE INDEX idx_role_hierarchy_child ON public.role_hierarchy USING btree (child_role_id);


--
-- Name: idx_role_hierarchy_parent; Type: INDEX; Schema: public; Owner: securevault_user
--

CREATE INDEX idx_role_hierarchy_parent ON public.role_hierarchy USING btree (parent_role_id);


--
-- Name: idx_security_alerts_sent; Type: INDEX; Schema: public; Owner: securevault_user
--

CREATE INDEX idx_security_alerts_sent ON public.security_alerts USING btree (sent_at);


--
-- Name: idx_security_alerts_status; Type: INDEX; Schema: public; Owner: securevault_user
--

CREATE INDEX idx_security_alerts_status ON public.security_alerts USING btree (delivery_status);


--
-- Name: idx_security_alerts_type; Type: INDEX; Schema: public; Owner: securevault_user
--

CREATE INDEX idx_security_alerts_type ON public.security_alerts USING btree (alert_type);


--
-- Name: idx_security_events_correlation; Type: INDEX; Schema: public; Owner: securevault_user
--

CREATE INDEX idx_security_events_correlation ON public.security_events USING btree (correlation_id);


--
-- Name: idx_security_events_detected; Type: INDEX; Schema: public; Owner: securevault_user
--

CREATE INDEX idx_security_events_detected ON public.security_events USING btree (detected_at);


--
-- Name: idx_security_events_type_level; Type: INDEX; Schema: public; Owner: securevault_user
--

CREATE INDEX idx_security_events_type_level ON public.security_events USING btree (event_type, threat_level);


--
-- Name: idx_security_events_user_ip; Type: INDEX; Schema: public; Owner: securevault_user
--

CREATE INDEX idx_security_events_user_ip ON public.security_events USING btree (user_id, source_ip);


--
-- Name: idx_security_metrics_date; Type: INDEX; Schema: public; Owner: securevault_user
--

CREATE INDEX idx_security_metrics_date ON public.security_metrics USING btree (metric_date);


--
-- Name: idx_suspicious_patterns_active; Type: INDEX; Schema: public; Owner: securevault_user
--

CREATE INDEX idx_suspicious_patterns_active ON public.suspicious_patterns USING btree (is_active);


--
-- Name: idx_suspicious_patterns_level; Type: INDEX; Schema: public; Owner: securevault_user
--

CREATE INDEX idx_suspicious_patterns_level ON public.suspicious_patterns USING btree (threat_level);


--
-- Name: idx_suspicious_patterns_type; Type: INDEX; Schema: public; Owner: securevault_user
--

CREATE INDEX idx_suspicious_patterns_type ON public.suspicious_patterns USING btree (pattern_type);


--
-- Name: idx_threat_responses_action; Type: INDEX; Schema: public; Owner: securevault_user
--

CREATE INDEX idx_threat_responses_action ON public.threat_responses USING btree (action);


--
-- Name: idx_threat_responses_executed; Type: INDEX; Schema: public; Owner: securevault_user
--

CREATE INDEX idx_threat_responses_executed ON public.threat_responses USING btree (executed_at);


--
-- Name: idx_threat_responses_target; Type: INDEX; Schema: public; Owner: securevault_user
--

CREATE INDEX idx_threat_responses_target ON public.threat_responses USING btree (target_type, target_value);


--
-- Name: idx_user_encryption_keys_created; Type: INDEX; Schema: public; Owner: securevault_user
--

CREATE INDEX idx_user_encryption_keys_created ON public.user_encryption_keys USING btree (created_at);


--
-- Name: idx_user_encryption_keys_user_active; Type: INDEX; Schema: public; Owner: securevault_user
--

CREATE INDEX idx_user_encryption_keys_user_active ON public.user_encryption_keys USING btree (user_id, is_active);


--
-- Name: idx_user_role_active; Type: INDEX; Schema: public; Owner: securevault_user
--

CREATE INDEX idx_user_role_active ON public.user_roles USING btree (user_id, is_active);


--
-- Name: ix_crypto_randomness_tests_id; Type: INDEX; Schema: public; Owner: securevault_user
--

CREATE INDEX ix_crypto_randomness_tests_id ON public.crypto_randomness_tests USING btree (id);


--
-- Name: ix_crypto_randomness_tests_test_passed; Type: INDEX; Schema: public; Owner: securevault_user
--

CREATE INDEX ix_crypto_randomness_tests_test_passed ON public.crypto_randomness_tests USING btree (test_passed);


--
-- Name: ix_crypto_randomness_tests_test_type; Type: INDEX; Schema: public; Owner: securevault_user
--

CREATE INDEX ix_crypto_randomness_tests_test_type ON public.crypto_randomness_tests USING btree (test_type);


--
-- Name: ix_document_access_logs_action; Type: INDEX; Schema: public; Owner: securevault_user
--

CREATE INDEX ix_document_access_logs_action ON public.document_access_logs USING btree (action);


--
-- Name: ix_document_access_logs_document_id; Type: INDEX; Schema: public; Owner: securevault_user
--

CREATE INDEX ix_document_access_logs_document_id ON public.document_access_logs USING btree (document_id);


--
-- Name: ix_document_access_logs_id; Type: INDEX; Schema: public; Owner: securevault_user
--

CREATE INDEX ix_document_access_logs_id ON public.document_access_logs USING btree (id);


--
-- Name: ix_document_access_logs_user_id; Type: INDEX; Schema: public; Owner: securevault_user
--

CREATE INDEX ix_document_access_logs_user_id ON public.document_access_logs USING btree (user_id);


--
-- Name: ix_document_permissions_document_id; Type: INDEX; Schema: public; Owner: securevault_user
--

CREATE INDEX ix_document_permissions_document_id ON public.document_permissions USING btree (document_id);


--
-- Name: ix_document_permissions_id; Type: INDEX; Schema: public; Owner: securevault_user
--

CREATE INDEX ix_document_permissions_id ON public.document_permissions USING btree (id);


--
-- Name: ix_document_permissions_user_id; Type: INDEX; Schema: public; Owner: securevault_user
--

CREATE INDEX ix_document_permissions_user_id ON public.document_permissions USING btree (user_id);


--
-- Name: ix_document_shares_document_id; Type: INDEX; Schema: public; Owner: securevault_user
--

CREATE INDEX ix_document_shares_document_id ON public.document_shares USING btree (document_id);


--
-- Name: ix_document_shares_id; Type: INDEX; Schema: public; Owner: securevault_user
--

CREATE INDEX ix_document_shares_id ON public.document_shares USING btree (id);


--
-- Name: ix_document_shares_share_token; Type: INDEX; Schema: public; Owner: securevault_user
--

CREATE UNIQUE INDEX ix_document_shares_share_token ON public.document_shares USING btree (share_token);


--
-- Name: ix_document_shares_uuid; Type: INDEX; Schema: public; Owner: securevault_user
--

CREATE UNIQUE INDEX ix_document_shares_uuid ON public.document_shares USING btree (uuid);


--
-- Name: ix_document_versions_document_id; Type: INDEX; Schema: public; Owner: securevault_user
--

CREATE INDEX ix_document_versions_document_id ON public.document_versions USING btree (document_id);


--
-- Name: ix_document_versions_id; Type: INDEX; Schema: public; Owner: securevault_user
--

CREATE INDEX ix_document_versions_id ON public.document_versions USING btree (id);


--
-- Name: ix_documents_depth_level; Type: INDEX; Schema: public; Owner: securevault_user
--

CREATE INDEX ix_documents_depth_level ON public.documents USING btree (depth_level);


--
-- Name: ix_documents_id; Type: INDEX; Schema: public; Owner: securevault_user
--

CREATE INDEX ix_documents_id ON public.documents USING btree (id);


--
-- Name: ix_documents_name; Type: INDEX; Schema: public; Owner: securevault_user
--

CREATE INDEX ix_documents_name ON public.documents USING btree (name);


--
-- Name: ix_documents_owner_id; Type: INDEX; Schema: public; Owner: securevault_user
--

CREATE INDEX ix_documents_owner_id ON public.documents USING btree (owner_id);


--
-- Name: ix_documents_parent_id; Type: INDEX; Schema: public; Owner: securevault_user
--

CREATE INDEX ix_documents_parent_id ON public.documents USING btree (parent_id);


--
-- Name: ix_documents_path; Type: INDEX; Schema: public; Owner: securevault_user
--

CREATE INDEX ix_documents_path ON public.documents USING btree (path);


--
-- Name: ix_documents_status; Type: INDEX; Schema: public; Owner: securevault_user
--

CREATE INDEX ix_documents_status ON public.documents USING btree (status);


--
-- Name: ix_documents_uuid; Type: INDEX; Schema: public; Owner: securevault_user
--

CREATE UNIQUE INDEX ix_documents_uuid ON public.documents USING btree (uuid);


--
-- Name: ix_encryption_audit_logs_action; Type: INDEX; Schema: public; Owner: securevault_user
--

CREATE INDEX ix_encryption_audit_logs_action ON public.encryption_audit_logs USING btree (action);


--
-- Name: ix_encryption_audit_logs_id; Type: INDEX; Schema: public; Owner: securevault_user
--

CREATE INDEX ix_encryption_audit_logs_id ON public.encryption_audit_logs USING btree (id);


--
-- Name: ix_encryption_audit_logs_key_id; Type: INDEX; Schema: public; Owner: securevault_user
--

CREATE INDEX ix_encryption_audit_logs_key_id ON public.encryption_audit_logs USING btree (key_id);


--
-- Name: ix_encryption_audit_logs_operation_id; Type: INDEX; Schema: public; Owner: securevault_user
--

CREATE INDEX ix_encryption_audit_logs_operation_id ON public.encryption_audit_logs USING btree (operation_id);


--
-- Name: ix_encryption_audit_logs_success; Type: INDEX; Schema: public; Owner: securevault_user
--

CREATE INDEX ix_encryption_audit_logs_success ON public.encryption_audit_logs USING btree (success);


--
-- Name: ix_encryption_audit_logs_timestamp; Type: INDEX; Schema: public; Owner: securevault_user
--

CREATE INDEX ix_encryption_audit_logs_timestamp ON public.encryption_audit_logs USING btree ("timestamp");


--
-- Name: ix_encryption_audit_logs_user_id; Type: INDEX; Schema: public; Owner: securevault_user
--

CREATE INDEX ix_encryption_audit_logs_user_id ON public.encryption_audit_logs USING btree (user_id);


--
-- Name: ix_ip_blocklist_expires_at; Type: INDEX; Schema: public; Owner: securevault_user
--

CREATE INDEX ix_ip_blocklist_expires_at ON public.ip_blocklist USING btree (expires_at);


--
-- Name: ix_ip_blocklist_id; Type: INDEX; Schema: public; Owner: securevault_user
--

CREATE INDEX ix_ip_blocklist_id ON public.ip_blocklist USING btree (id);


--
-- Name: ix_ip_blocklist_ip_address; Type: INDEX; Schema: public; Owner: securevault_user
--

CREATE UNIQUE INDEX ix_ip_blocklist_ip_address ON public.ip_blocklist USING btree (ip_address);


--
-- Name: ix_key_escrow_id; Type: INDEX; Schema: public; Owner: securevault_user
--

CREATE INDEX ix_key_escrow_id ON public.key_escrow USING btree (id);


--
-- Name: ix_key_escrow_key_id; Type: INDEX; Schema: public; Owner: securevault_user
--

CREATE INDEX ix_key_escrow_key_id ON public.key_escrow USING btree (key_id);


--
-- Name: ix_key_escrow_master_key_id; Type: INDEX; Schema: public; Owner: securevault_user
--

CREATE INDEX ix_key_escrow_master_key_id ON public.key_escrow USING btree (master_key_id);


--
-- Name: ix_key_escrow_user_id; Type: INDEX; Schema: public; Owner: securevault_user
--

CREATE INDEX ix_key_escrow_user_id ON public.key_escrow USING btree (user_id);


--
-- Name: ix_key_rotation_logs_id; Type: INDEX; Schema: public; Owner: securevault_user
--

CREATE INDEX ix_key_rotation_logs_id ON public.key_rotation_logs USING btree (id);


--
-- Name: ix_key_rotation_logs_new_key_id; Type: INDEX; Schema: public; Owner: securevault_user
--

CREATE INDEX ix_key_rotation_logs_new_key_id ON public.key_rotation_logs USING btree (new_key_id);


--
-- Name: ix_key_rotation_logs_old_key_id; Type: INDEX; Schema: public; Owner: securevault_user
--

CREATE INDEX ix_key_rotation_logs_old_key_id ON public.key_rotation_logs USING btree (old_key_id);


--
-- Name: ix_key_rotation_logs_user_id; Type: INDEX; Schema: public; Owner: securevault_user
--

CREATE INDEX ix_key_rotation_logs_user_id ON public.key_rotation_logs USING btree (user_id);


--
-- Name: ix_master_keys_id; Type: INDEX; Schema: public; Owner: securevault_user
--

CREATE INDEX ix_master_keys_id ON public.master_keys USING btree (id);


--
-- Name: ix_master_keys_is_active; Type: INDEX; Schema: public; Owner: securevault_user
--

CREATE INDEX ix_master_keys_is_active ON public.master_keys USING btree (is_active);


--
-- Name: ix_master_keys_key_id; Type: INDEX; Schema: public; Owner: securevault_user
--

CREATE UNIQUE INDEX ix_master_keys_key_id ON public.master_keys USING btree (key_id);


--
-- Name: ix_mfa_audit_logs_created_at; Type: INDEX; Schema: public; Owner: securevault_user
--

CREATE INDEX ix_mfa_audit_logs_created_at ON public.mfa_audit_logs USING btree (created_at);


--
-- Name: ix_mfa_audit_logs_event_type; Type: INDEX; Schema: public; Owner: securevault_user
--

CREATE INDEX ix_mfa_audit_logs_event_type ON public.mfa_audit_logs USING btree (event_type);


--
-- Name: ix_mfa_audit_logs_id; Type: INDEX; Schema: public; Owner: securevault_user
--

CREATE INDEX ix_mfa_audit_logs_id ON public.mfa_audit_logs USING btree (id);


--
-- Name: ix_mfa_audit_logs_user_id; Type: INDEX; Schema: public; Owner: securevault_user
--

CREATE INDEX ix_mfa_audit_logs_user_id ON public.mfa_audit_logs USING btree (user_id);


--
-- Name: ix_mfa_configuration_id; Type: INDEX; Schema: public; Owner: securevault_user
--

CREATE INDEX ix_mfa_configuration_id ON public.mfa_configuration USING btree (id);


--
-- Name: ix_mfa_failed_attempts_attempted_at; Type: INDEX; Schema: public; Owner: securevault_user
--

CREATE INDEX ix_mfa_failed_attempts_attempted_at ON public.mfa_failed_attempts USING btree (attempted_at);


--
-- Name: ix_mfa_failed_attempts_id; Type: INDEX; Schema: public; Owner: securevault_user
--

CREATE INDEX ix_mfa_failed_attempts_id ON public.mfa_failed_attempts USING btree (id);


--
-- Name: ix_mfa_failed_attempts_user_id; Type: INDEX; Schema: public; Owner: securevault_user
--

CREATE INDEX ix_mfa_failed_attempts_user_id ON public.mfa_failed_attempts USING btree (user_id);


--
-- Name: ix_mfa_used_codes_id; Type: INDEX; Schema: public; Owner: securevault_user
--

CREATE INDEX ix_mfa_used_codes_id ON public.mfa_used_codes USING btree (id);


--
-- Name: ix_mfa_used_codes_user_id; Type: INDEX; Schema: public; Owner: securevault_user
--

CREATE INDEX ix_mfa_used_codes_user_id ON public.mfa_used_codes USING btree (user_id);


--
-- Name: ix_permissions_action; Type: INDEX; Schema: public; Owner: securevault_user
--

CREATE INDEX ix_permissions_action ON public.permissions USING btree (action);


--
-- Name: ix_permissions_id; Type: INDEX; Schema: public; Owner: securevault_user
--

CREATE INDEX ix_permissions_id ON public.permissions USING btree (id);


--
-- Name: ix_permissions_name; Type: INDEX; Schema: public; Owner: securevault_user
--

CREATE UNIQUE INDEX ix_permissions_name ON public.permissions USING btree (name);


--
-- Name: ix_permissions_resource_type; Type: INDEX; Schema: public; Owner: securevault_user
--

CREATE INDEX ix_permissions_resource_type ON public.permissions USING btree (resource_type);


--
-- Name: ix_resource_permissions_id; Type: INDEX; Schema: public; Owner: securevault_user
--

CREATE INDEX ix_resource_permissions_id ON public.resource_permissions USING btree (id);


--
-- Name: ix_resource_permissions_resource_id; Type: INDEX; Schema: public; Owner: securevault_user
--

CREATE INDEX ix_resource_permissions_resource_id ON public.resource_permissions USING btree (resource_id);


--
-- Name: ix_resource_permissions_resource_type; Type: INDEX; Schema: public; Owner: securevault_user
--

CREATE INDEX ix_resource_permissions_resource_type ON public.resource_permissions USING btree (resource_type);


--
-- Name: ix_role_hierarchy_id; Type: INDEX; Schema: public; Owner: securevault_user
--

CREATE INDEX ix_role_hierarchy_id ON public.role_hierarchy USING btree (id);


--
-- Name: ix_roles_hierarchy_level; Type: INDEX; Schema: public; Owner: securevault_user
--

CREATE INDEX ix_roles_hierarchy_level ON public.roles USING btree (hierarchy_level);


--
-- Name: ix_roles_id; Type: INDEX; Schema: public; Owner: securevault_user
--

CREATE INDEX ix_roles_id ON public.roles USING btree (id);


--
-- Name: ix_roles_name; Type: INDEX; Schema: public; Owner: securevault_user
--

CREATE UNIQUE INDEX ix_roles_name ON public.roles USING btree (name);


--
-- Name: ix_security_alerts_alert_id; Type: INDEX; Schema: public; Owner: securevault_user
--

CREATE UNIQUE INDEX ix_security_alerts_alert_id ON public.security_alerts USING btree (alert_id);


--
-- Name: ix_security_alerts_alert_type; Type: INDEX; Schema: public; Owner: securevault_user
--

CREATE INDEX ix_security_alerts_alert_type ON public.security_alerts USING btree (alert_type);


--
-- Name: ix_security_alerts_event_id; Type: INDEX; Schema: public; Owner: securevault_user
--

CREATE INDEX ix_security_alerts_event_id ON public.security_alerts USING btree (event_id);


--
-- Name: ix_security_alerts_id; Type: INDEX; Schema: public; Owner: securevault_user
--

CREATE INDEX ix_security_alerts_id ON public.security_alerts USING btree (id);


--
-- Name: ix_security_events_correlation_id; Type: INDEX; Schema: public; Owner: securevault_user
--

CREATE INDEX ix_security_events_correlation_id ON public.security_events USING btree (correlation_id);


--
-- Name: ix_security_events_detected_at; Type: INDEX; Schema: public; Owner: securevault_user
--

CREATE INDEX ix_security_events_detected_at ON public.security_events USING btree (detected_at);


--
-- Name: ix_security_events_document_id; Type: INDEX; Schema: public; Owner: securevault_user
--

CREATE INDEX ix_security_events_document_id ON public.security_events USING btree (document_id);


--
-- Name: ix_security_events_event_id; Type: INDEX; Schema: public; Owner: securevault_user
--

CREATE UNIQUE INDEX ix_security_events_event_id ON public.security_events USING btree (event_id);


--
-- Name: ix_security_events_event_type; Type: INDEX; Schema: public; Owner: securevault_user
--

CREATE INDEX ix_security_events_event_type ON public.security_events USING btree (event_type);


--
-- Name: ix_security_events_id; Type: INDEX; Schema: public; Owner: securevault_user
--

CREATE INDEX ix_security_events_id ON public.security_events USING btree (id);


--
-- Name: ix_security_events_risk_score; Type: INDEX; Schema: public; Owner: securevault_user
--

CREATE INDEX ix_security_events_risk_score ON public.security_events USING btree (risk_score);


--
-- Name: ix_security_events_source_ip; Type: INDEX; Schema: public; Owner: securevault_user
--

CREATE INDEX ix_security_events_source_ip ON public.security_events USING btree (source_ip);


--
-- Name: ix_security_events_status; Type: INDEX; Schema: public; Owner: securevault_user
--

CREATE INDEX ix_security_events_status ON public.security_events USING btree (status);


--
-- Name: ix_security_events_threat_level; Type: INDEX; Schema: public; Owner: securevault_user
--

CREATE INDEX ix_security_events_threat_level ON public.security_events USING btree (threat_level);


--
-- Name: ix_security_events_user_id; Type: INDEX; Schema: public; Owner: securevault_user
--

CREATE INDEX ix_security_events_user_id ON public.security_events USING btree (user_id);


--
-- Name: ix_security_metrics_id; Type: INDEX; Schema: public; Owner: securevault_user
--

CREATE INDEX ix_security_metrics_id ON public.security_metrics USING btree (id);


--
-- Name: ix_security_metrics_metric_date; Type: INDEX; Schema: public; Owner: securevault_user
--

CREATE INDEX ix_security_metrics_metric_date ON public.security_metrics USING btree (metric_date);


--
-- Name: ix_suspicious_patterns_id; Type: INDEX; Schema: public; Owner: securevault_user
--

CREATE INDEX ix_suspicious_patterns_id ON public.suspicious_patterns USING btree (id);


--
-- Name: ix_suspicious_patterns_is_active; Type: INDEX; Schema: public; Owner: securevault_user
--

CREATE INDEX ix_suspicious_patterns_is_active ON public.suspicious_patterns USING btree (is_active);


--
-- Name: ix_suspicious_patterns_pattern_id; Type: INDEX; Schema: public; Owner: securevault_user
--

CREATE UNIQUE INDEX ix_suspicious_patterns_pattern_id ON public.suspicious_patterns USING btree (pattern_id);


--
-- Name: ix_suspicious_patterns_pattern_type; Type: INDEX; Schema: public; Owner: securevault_user
--

CREATE INDEX ix_suspicious_patterns_pattern_type ON public.suspicious_patterns USING btree (pattern_type);


--
-- Name: ix_threat_responses_action; Type: INDEX; Schema: public; Owner: securevault_user
--

CREATE INDEX ix_threat_responses_action ON public.threat_responses USING btree (action);


--
-- Name: ix_threat_responses_event_id; Type: INDEX; Schema: public; Owner: securevault_user
--

CREATE INDEX ix_threat_responses_event_id ON public.threat_responses USING btree (event_id);


--
-- Name: ix_threat_responses_id; Type: INDEX; Schema: public; Owner: securevault_user
--

CREATE INDEX ix_threat_responses_id ON public.threat_responses USING btree (id);


--
-- Name: ix_threat_responses_response_id; Type: INDEX; Schema: public; Owner: securevault_user
--

CREATE UNIQUE INDEX ix_threat_responses_response_id ON public.threat_responses USING btree (response_id);


--
-- Name: ix_token_families_id; Type: INDEX; Schema: public; Owner: securevault_user
--

CREATE INDEX ix_token_families_id ON public.token_families USING btree (id);


--
-- Name: ix_token_families_user_id; Type: INDEX; Schema: public; Owner: securevault_user
--

CREATE INDEX ix_token_families_user_id ON public.token_families USING btree (user_id);


--
-- Name: ix_user_encryption_keys_id; Type: INDEX; Schema: public; Owner: securevault_user
--

CREATE INDEX ix_user_encryption_keys_id ON public.user_encryption_keys USING btree (id);


--
-- Name: ix_user_encryption_keys_is_active; Type: INDEX; Schema: public; Owner: securevault_user
--

CREATE INDEX ix_user_encryption_keys_is_active ON public.user_encryption_keys USING btree (is_active);


--
-- Name: ix_user_encryption_keys_key_id; Type: INDEX; Schema: public; Owner: securevault_user
--

CREATE UNIQUE INDEX ix_user_encryption_keys_key_id ON public.user_encryption_keys USING btree (key_id);


--
-- Name: ix_user_encryption_keys_user_id; Type: INDEX; Schema: public; Owner: securevault_user
--

CREATE INDEX ix_user_encryption_keys_user_id ON public.user_encryption_keys USING btree (user_id);


--
-- Name: ix_users_email; Type: INDEX; Schema: public; Owner: securevault_user
--

CREATE UNIQUE INDEX ix_users_email ON public.users USING btree (email);


--
-- Name: ix_users_id; Type: INDEX; Schema: public; Owner: securevault_user
--

CREATE INDEX ix_users_id ON public.users USING btree (id);


--
-- Name: ix_users_username; Type: INDEX; Schema: public; Owner: securevault_user
--

CREATE UNIQUE INDEX ix_users_username ON public.users USING btree (username);


--
-- Name: document_access_logs document_access_logs_document_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: securevault_user
--

ALTER TABLE ONLY public.document_access_logs
    ADD CONSTRAINT document_access_logs_document_id_fkey FOREIGN KEY (document_id) REFERENCES public.documents(id);


--
-- Name: document_access_logs document_access_logs_user_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: securevault_user
--

ALTER TABLE ONLY public.document_access_logs
    ADD CONSTRAINT document_access_logs_user_id_fkey FOREIGN KEY (user_id) REFERENCES public.users(id);


--
-- Name: document_permissions document_permissions_document_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: securevault_user
--

ALTER TABLE ONLY public.document_permissions
    ADD CONSTRAINT document_permissions_document_id_fkey FOREIGN KEY (document_id) REFERENCES public.documents(id);


--
-- Name: document_permissions document_permissions_granted_by_fkey; Type: FK CONSTRAINT; Schema: public; Owner: securevault_user
--

ALTER TABLE ONLY public.document_permissions
    ADD CONSTRAINT document_permissions_granted_by_fkey FOREIGN KEY (granted_by) REFERENCES public.users(id);


--
-- Name: document_permissions document_permissions_revoked_by_fkey; Type: FK CONSTRAINT; Schema: public; Owner: securevault_user
--

ALTER TABLE ONLY public.document_permissions
    ADD CONSTRAINT document_permissions_revoked_by_fkey FOREIGN KEY (revoked_by) REFERENCES public.users(id);


--
-- Name: document_permissions document_permissions_user_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: securevault_user
--

ALTER TABLE ONLY public.document_permissions
    ADD CONSTRAINT document_permissions_user_id_fkey FOREIGN KEY (user_id) REFERENCES public.users(id);


--
-- Name: document_shares document_shares_created_by_fkey; Type: FK CONSTRAINT; Schema: public; Owner: securevault_user
--

ALTER TABLE ONLY public.document_shares
    ADD CONSTRAINT document_shares_created_by_fkey FOREIGN KEY (created_by) REFERENCES public.users(id);


--
-- Name: document_shares document_shares_document_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: securevault_user
--

ALTER TABLE ONLY public.document_shares
    ADD CONSTRAINT document_shares_document_id_fkey FOREIGN KEY (document_id) REFERENCES public.documents(id);


--
-- Name: document_shares document_shares_revoked_by_fkey; Type: FK CONSTRAINT; Schema: public; Owner: securevault_user
--

ALTER TABLE ONLY public.document_shares
    ADD CONSTRAINT document_shares_revoked_by_fkey FOREIGN KEY (revoked_by) REFERENCES public.users(id);


--
-- Name: document_versions document_versions_created_by_fkey; Type: FK CONSTRAINT; Schema: public; Owner: securevault_user
--

ALTER TABLE ONLY public.document_versions
    ADD CONSTRAINT document_versions_created_by_fkey FOREIGN KEY (created_by) REFERENCES public.users(id);


--
-- Name: document_versions document_versions_document_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: securevault_user
--

ALTER TABLE ONLY public.document_versions
    ADD CONSTRAINT document_versions_document_id_fkey FOREIGN KEY (document_id) REFERENCES public.documents(id);


--
-- Name: documents documents_created_by_fkey; Type: FK CONSTRAINT; Schema: public; Owner: securevault_user
--

ALTER TABLE ONLY public.documents
    ADD CONSTRAINT documents_created_by_fkey FOREIGN KEY (created_by) REFERENCES public.users(id);


--
-- Name: documents documents_owner_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: securevault_user
--

ALTER TABLE ONLY public.documents
    ADD CONSTRAINT documents_owner_id_fkey FOREIGN KEY (owner_id) REFERENCES public.users(id);


--
-- Name: documents documents_parent_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: securevault_user
--

ALTER TABLE ONLY public.documents
    ADD CONSTRAINT documents_parent_id_fkey FOREIGN KEY (parent_id) REFERENCES public.documents(id);


--
-- Name: documents documents_previous_version_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: securevault_user
--

ALTER TABLE ONLY public.documents
    ADD CONSTRAINT documents_previous_version_id_fkey FOREIGN KEY (previous_version_id) REFERENCES public.documents(id);


--
-- Name: documents documents_updated_by_fkey; Type: FK CONSTRAINT; Schema: public; Owner: securevault_user
--

ALTER TABLE ONLY public.documents
    ADD CONSTRAINT documents_updated_by_fkey FOREIGN KEY (updated_by) REFERENCES public.users(id);


--
-- Name: encryption_audit_logs encryption_audit_logs_key_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: securevault_user
--

ALTER TABLE ONLY public.encryption_audit_logs
    ADD CONSTRAINT encryption_audit_logs_key_id_fkey FOREIGN KEY (key_id) REFERENCES public.user_encryption_keys(key_id);


--
-- Name: encryption_audit_logs encryption_audit_logs_user_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: securevault_user
--

ALTER TABLE ONLY public.encryption_audit_logs
    ADD CONSTRAINT encryption_audit_logs_user_id_fkey FOREIGN KEY (user_id) REFERENCES public.users(id);


--
-- Name: ip_blocklist ip_blocklist_event_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: securevault_user
--

ALTER TABLE ONLY public.ip_blocklist
    ADD CONSTRAINT ip_blocklist_event_id_fkey FOREIGN KEY (event_id) REFERENCES public.security_events(event_id);


--
-- Name: ip_blocklist ip_blocklist_removed_by_fkey; Type: FK CONSTRAINT; Schema: public; Owner: securevault_user
--

ALTER TABLE ONLY public.ip_blocklist
    ADD CONSTRAINT ip_blocklist_removed_by_fkey FOREIGN KEY (removed_by) REFERENCES public.users(id);


--
-- Name: key_escrow key_escrow_created_by_fkey; Type: FK CONSTRAINT; Schema: public; Owner: securevault_user
--

ALTER TABLE ONLY public.key_escrow
    ADD CONSTRAINT key_escrow_created_by_fkey FOREIGN KEY (created_by) REFERENCES public.users(id);


--
-- Name: key_escrow key_escrow_key_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: securevault_user
--

ALTER TABLE ONLY public.key_escrow
    ADD CONSTRAINT key_escrow_key_id_fkey FOREIGN KEY (key_id) REFERENCES public.user_encryption_keys(key_id);


--
-- Name: key_escrow key_escrow_master_key_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: securevault_user
--

ALTER TABLE ONLY public.key_escrow
    ADD CONSTRAINT key_escrow_master_key_id_fkey FOREIGN KEY (master_key_id) REFERENCES public.master_keys(key_id);


--
-- Name: key_escrow key_escrow_recovered_by_fkey; Type: FK CONSTRAINT; Schema: public; Owner: securevault_user
--

ALTER TABLE ONLY public.key_escrow
    ADD CONSTRAINT key_escrow_recovered_by_fkey FOREIGN KEY (recovered_by) REFERENCES public.users(id);


--
-- Name: key_escrow key_escrow_user_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: securevault_user
--

ALTER TABLE ONLY public.key_escrow
    ADD CONSTRAINT key_escrow_user_id_fkey FOREIGN KEY (user_id) REFERENCES public.users(id);


--
-- Name: key_rotation_logs key_rotation_logs_user_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: securevault_user
--

ALTER TABLE ONLY public.key_rotation_logs
    ADD CONSTRAINT key_rotation_logs_user_id_fkey FOREIGN KEY (user_id) REFERENCES public.users(id);


--
-- Name: master_keys master_keys_created_by_fkey; Type: FK CONSTRAINT; Schema: public; Owner: securevault_user
--

ALTER TABLE ONLY public.master_keys
    ADD CONSTRAINT master_keys_created_by_fkey FOREIGN KEY (created_by) REFERENCES public.users(id);


--
-- Name: mfa_audit_logs mfa_audit_logs_performed_by_fkey; Type: FK CONSTRAINT; Schema: public; Owner: securevault_user
--

ALTER TABLE ONLY public.mfa_audit_logs
    ADD CONSTRAINT mfa_audit_logs_performed_by_fkey FOREIGN KEY (performed_by) REFERENCES public.users(id);


--
-- Name: mfa_audit_logs mfa_audit_logs_user_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: securevault_user
--

ALTER TABLE ONLY public.mfa_audit_logs
    ADD CONSTRAINT mfa_audit_logs_user_id_fkey FOREIGN KEY (user_id) REFERENCES public.users(id);


--
-- Name: mfa_configuration mfa_configuration_updated_by_fkey; Type: FK CONSTRAINT; Schema: public; Owner: securevault_user
--

ALTER TABLE ONLY public.mfa_configuration
    ADD CONSTRAINT mfa_configuration_updated_by_fkey FOREIGN KEY (updated_by) REFERENCES public.users(id);


--
-- Name: mfa_failed_attempts mfa_failed_attempts_user_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: securevault_user
--

ALTER TABLE ONLY public.mfa_failed_attempts
    ADD CONSTRAINT mfa_failed_attempts_user_id_fkey FOREIGN KEY (user_id) REFERENCES public.users(id);


--
-- Name: mfa_used_codes mfa_used_codes_user_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: securevault_user
--

ALTER TABLE ONLY public.mfa_used_codes
    ADD CONSTRAINT mfa_used_codes_user_id_fkey FOREIGN KEY (user_id) REFERENCES public.users(id);


--
-- Name: resource_permissions resource_permissions_granted_by_fkey; Type: FK CONSTRAINT; Schema: public; Owner: securevault_user
--

ALTER TABLE ONLY public.resource_permissions
    ADD CONSTRAINT resource_permissions_granted_by_fkey FOREIGN KEY (granted_by) REFERENCES public.users(id);


--
-- Name: resource_permissions resource_permissions_inherited_from_fkey; Type: FK CONSTRAINT; Schema: public; Owner: securevault_user
--

ALTER TABLE ONLY public.resource_permissions
    ADD CONSTRAINT resource_permissions_inherited_from_fkey FOREIGN KEY (inherited_from) REFERENCES public.resource_permissions(id);


--
-- Name: role_hierarchy role_hierarchy_child_role_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: securevault_user
--

ALTER TABLE ONLY public.role_hierarchy
    ADD CONSTRAINT role_hierarchy_child_role_id_fkey FOREIGN KEY (child_role_id) REFERENCES public.roles(id) ON DELETE CASCADE;


--
-- Name: role_hierarchy role_hierarchy_created_by_fkey; Type: FK CONSTRAINT; Schema: public; Owner: securevault_user
--

ALTER TABLE ONLY public.role_hierarchy
    ADD CONSTRAINT role_hierarchy_created_by_fkey FOREIGN KEY (created_by) REFERENCES public.users(id);


--
-- Name: role_hierarchy role_hierarchy_parent_role_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: securevault_user
--

ALTER TABLE ONLY public.role_hierarchy
    ADD CONSTRAINT role_hierarchy_parent_role_id_fkey FOREIGN KEY (parent_role_id) REFERENCES public.roles(id) ON DELETE CASCADE;


--
-- Name: role_permissions role_permissions_granted_by_fkey; Type: FK CONSTRAINT; Schema: public; Owner: securevault_user
--

ALTER TABLE ONLY public.role_permissions
    ADD CONSTRAINT role_permissions_granted_by_fkey FOREIGN KEY (granted_by) REFERENCES public.users(id);


--
-- Name: role_permissions role_permissions_permission_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: securevault_user
--

ALTER TABLE ONLY public.role_permissions
    ADD CONSTRAINT role_permissions_permission_id_fkey FOREIGN KEY (permission_id) REFERENCES public.permissions(id) ON DELETE CASCADE;


--
-- Name: role_permissions role_permissions_role_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: securevault_user
--

ALTER TABLE ONLY public.role_permissions
    ADD CONSTRAINT role_permissions_role_id_fkey FOREIGN KEY (role_id) REFERENCES public.roles(id) ON DELETE CASCADE;


--
-- Name: roles roles_created_by_fkey; Type: FK CONSTRAINT; Schema: public; Owner: securevault_user
--

ALTER TABLE ONLY public.roles
    ADD CONSTRAINT roles_created_by_fkey FOREIGN KEY (created_by) REFERENCES public.users(id);


--
-- Name: security_alerts security_alerts_acknowledged_by_fkey; Type: FK CONSTRAINT; Schema: public; Owner: securevault_user
--

ALTER TABLE ONLY public.security_alerts
    ADD CONSTRAINT security_alerts_acknowledged_by_fkey FOREIGN KEY (acknowledged_by) REFERENCES public.users(id);


--
-- Name: security_alerts security_alerts_event_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: securevault_user
--

ALTER TABLE ONLY public.security_alerts
    ADD CONSTRAINT security_alerts_event_id_fkey FOREIGN KEY (event_id) REFERENCES public.security_events(event_id);


--
-- Name: security_events security_events_document_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: securevault_user
--

ALTER TABLE ONLY public.security_events
    ADD CONSTRAINT security_events_document_id_fkey FOREIGN KEY (document_id) REFERENCES public.documents(id);


--
-- Name: security_events security_events_resolved_by_fkey; Type: FK CONSTRAINT; Schema: public; Owner: securevault_user
--

ALTER TABLE ONLY public.security_events
    ADD CONSTRAINT security_events_resolved_by_fkey FOREIGN KEY (resolved_by) REFERENCES public.users(id);


--
-- Name: security_events security_events_user_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: securevault_user
--

ALTER TABLE ONLY public.security_events
    ADD CONSTRAINT security_events_user_id_fkey FOREIGN KEY (user_id) REFERENCES public.users(id);


--
-- Name: suspicious_patterns suspicious_patterns_created_by_fkey; Type: FK CONSTRAINT; Schema: public; Owner: securevault_user
--

ALTER TABLE ONLY public.suspicious_patterns
    ADD CONSTRAINT suspicious_patterns_created_by_fkey FOREIGN KEY (created_by) REFERENCES public.users(id);


--
-- Name: threat_responses threat_responses_event_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: securevault_user
--

ALTER TABLE ONLY public.threat_responses
    ADD CONSTRAINT threat_responses_event_id_fkey FOREIGN KEY (event_id) REFERENCES public.security_events(event_id);


--
-- Name: threat_responses threat_responses_reversed_by_fkey; Type: FK CONSTRAINT; Schema: public; Owner: securevault_user
--

ALTER TABLE ONLY public.threat_responses
    ADD CONSTRAINT threat_responses_reversed_by_fkey FOREIGN KEY (reversed_by) REFERENCES public.users(id);


--
-- Name: user_encryption_keys user_encryption_keys_created_by_fkey; Type: FK CONSTRAINT; Schema: public; Owner: securevault_user
--

ALTER TABLE ONLY public.user_encryption_keys
    ADD CONSTRAINT user_encryption_keys_created_by_fkey FOREIGN KEY (created_by) REFERENCES public.users(id);


--
-- Name: user_encryption_keys user_encryption_keys_user_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: securevault_user
--

ALTER TABLE ONLY public.user_encryption_keys
    ADD CONSTRAINT user_encryption_keys_user_id_fkey FOREIGN KEY (user_id) REFERENCES public.users(id);


--
-- Name: user_roles user_roles_assigned_by_fkey; Type: FK CONSTRAINT; Schema: public; Owner: securevault_user
--

ALTER TABLE ONLY public.user_roles
    ADD CONSTRAINT user_roles_assigned_by_fkey FOREIGN KEY (assigned_by) REFERENCES public.users(id);


--
-- Name: user_roles user_roles_role_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: securevault_user
--

ALTER TABLE ONLY public.user_roles
    ADD CONSTRAINT user_roles_role_id_fkey FOREIGN KEY (role_id) REFERENCES public.roles(id) ON DELETE CASCADE;


--
-- Name: user_roles user_roles_user_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: securevault_user
--

ALTER TABLE ONLY public.user_roles
    ADD CONSTRAINT user_roles_user_id_fkey FOREIGN KEY (user_id) REFERENCES public.users(id) ON DELETE CASCADE;


--
-- Name: DATABASE securevault; Type: ACL; Schema: -; Owner: securevault_user
--

GRANT CONNECT ON DATABASE securevault TO docsafe_app;


--
-- Name: SCHEMA docsafe; Type: ACL; Schema: -; Owner: securevault_user
--

GRANT ALL ON SCHEMA docsafe TO docsafe_app;


--
-- Name: DEFAULT PRIVILEGES FOR SEQUENCES; Type: DEFAULT ACL; Schema: docsafe; Owner: securevault_user
--

ALTER DEFAULT PRIVILEGES FOR ROLE securevault_user IN SCHEMA docsafe GRANT ALL ON SEQUENCES  TO securevault_user;
ALTER DEFAULT PRIVILEGES FOR ROLE securevault_user IN SCHEMA docsafe GRANT ALL ON SEQUENCES  TO docsafe_app;


--
-- Name: DEFAULT PRIVILEGES FOR TABLES; Type: DEFAULT ACL; Schema: docsafe; Owner: securevault_user
--

ALTER DEFAULT PRIVILEGES FOR ROLE securevault_user IN SCHEMA docsafe GRANT ALL ON TABLES  TO securevault_user;
ALTER DEFAULT PRIVILEGES FOR ROLE securevault_user IN SCHEMA docsafe GRANT ALL ON TABLES  TO docsafe_app;


--
-- PostgreSQL database dump complete
--

