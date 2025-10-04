--
-- PostgreSQL database dump
--

-- Dumped from database version 15.10 (Debian 15.10-1.pgdg120+1)
-- Dumped by pg_dump version 15.10 (Debian 15.10-1.pgdg120+1)

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
-- Name: documentstatus; Type: TYPE; Schema: public; Owner: docsafe_user
--

CREATE TYPE public.documentstatus AS ENUM (
    'ACTIVE',
    'DELETED',
    'ARCHIVED'
);


ALTER TYPE public.documentstatus OWNER TO docsafe_user;

--
-- Name: sharepermission; Type: TYPE; Schema: public; Owner: docsafe_user
--

CREATE TYPE public.sharepermission AS ENUM (
    'READ',
    'WRITE',
    'OWNER'
);


ALTER TYPE public.sharepermission OWNER TO docsafe_user;

SET default_tablespace = '';

SET default_table_access_method = heap;

--
-- Name: alembic_version; Type: TABLE; Schema: public; Owner: docsafe_user
--

CREATE TABLE public.alembic_version (
    version_num character varying(32) NOT NULL
);


ALTER TABLE public.alembic_version OWNER TO docsafe_user;

--
-- Name: document_shares; Type: TABLE; Schema: public; Owner: docsafe_user
--

CREATE TABLE public.document_shares (
    id uuid NOT NULL,
    document_id uuid NOT NULL,
    user_id uuid NOT NULL,
    shared_by_id uuid NOT NULL,
    permission public.sharepermission,
    share_message text,
    encrypted_sharing_key text,
    expires_at timestamp with time zone,
    is_active boolean,
    access_count integer,
    max_access_count integer,
    created_at timestamp with time zone DEFAULT now(),
    last_accessed timestamp with time zone
);


ALTER TABLE public.document_shares OWNER TO docsafe_user;

--
-- Name: documents; Type: TABLE; Schema: public; Owner: docsafe_user
--

CREATE TABLE public.documents (
    id uuid NOT NULL,
    owner_id uuid NOT NULL,
    original_filename character varying(255) NOT NULL,
    original_extension character varying(10) NOT NULL,
    file_size integer NOT NULL,
    encrypted_size integer,
    mime_type character varying(100),
    encrypted_filename character varying(255) NOT NULL,
    storage_path character varying(500) NOT NULL,
    encryption_algorithm character varying(50),
    key_derivation_method character varying(50),
    key_derivation_iterations integer,
    salt_b64 character varying(100) NOT NULL,
    original_hash character varying(64) NOT NULL,
    encrypted_hash character varying(64) NOT NULL,
    status public.documentstatus,
    title character varying(255),
    description text,
    tags text,
    is_shared boolean,
    share_link_id character varying(64),
    share_expires_at timestamp with time zone,
    download_count integer,
    version integer,
    parent_document_id uuid,
    created_at timestamp with time zone DEFAULT now(),
    updated_at timestamp with time zone,
    last_accessed timestamp with time zone
);


ALTER TABLE public.documents OWNER TO docsafe_user;

--
-- Name: users; Type: TABLE; Schema: public; Owner: docsafe_user
--

CREATE TABLE public.users (
    id uuid NOT NULL,
    username character varying(100) NOT NULL,
    email character varying(255) NOT NULL,
    password_hash character varying(255) NOT NULL,
    full_name character varying(255),
    is_active boolean,
    is_verified boolean,
    reset_token character varying(255),
    reset_token_expires timestamp with time zone,
    two_factor_enabled boolean,
    two_factor_secret character varying(32),
    created_at timestamp with time zone DEFAULT now(),
    updated_at timestamp with time zone,
    last_login timestamp with time zone,
    profile_settings text
);


ALTER TABLE public.users OWNER TO docsafe_user;

--
-- Data for Name: alembic_version; Type: TABLE DATA; Schema: public; Owner: docsafe_user
--

COPY public.alembic_version (version_num) FROM stdin;
\.


--
-- Data for Name: document_shares; Type: TABLE DATA; Schema: public; Owner: docsafe_user
--

COPY public.document_shares (id, document_id, user_id, shared_by_id, permission, share_message, encrypted_sharing_key, expires_at, is_active, access_count, max_access_count, created_at, last_accessed) FROM stdin;
\.


--
-- Data for Name: documents; Type: TABLE DATA; Schema: public; Owner: docsafe_user
--

COPY public.documents (id, owner_id, original_filename, original_extension, file_size, encrypted_size, mime_type, encrypted_filename, storage_path, encryption_algorithm, key_derivation_method, key_derivation_iterations, salt_b64, original_hash, encrypted_hash, status, title, description, tags, is_shared, share_link_id, share_expires_at, download_count, version, parent_document_id, created_at, updated_at, last_accessed) FROM stdin;
\.


--
-- Data for Name: users; Type: TABLE DATA; Schema: public; Owner: docsafe_user
--

COPY public.users (id, username, email, password_hash, full_name, is_active, is_verified, reset_token, reset_token_expires, two_factor_enabled, two_factor_secret, created_at, updated_at, last_login, profile_settings) FROM stdin;
06161277-1685-4357-af10-9f06c86e89c3	testuser	test@example.com	$2b$12$/A4iAQddxlnElI/ZmytwSOsM2cWurV3bdoSjPISiSUWrF0ThHtsdi	Test User	t	f	\N	\N	f	\N	2025-08-18 17:30:01.73993+00	2025-08-18 17:43:33.694308+00	2025-08-18 17:43:34.147855+00	\N
63e7e4ce-b6a3-42d4-875b-bebb2191af37	ameer_arsath	ameerarsath2@gmail.com	$2b$12$nRtdR6AE1aJNMWkdmMocoe0qsSJg9Z8FfilOjhPAJNoXyHYxFHgp2	Ameer	t	f	\N	\N	f	\N	2025-08-18 17:29:44.137006+00	2025-08-18 17:46:10.091791+00	2025-08-18 17:46:11.215747+00	\N
\.


--
-- Name: alembic_version alembic_version_pkc; Type: CONSTRAINT; Schema: public; Owner: docsafe_user
--

ALTER TABLE ONLY public.alembic_version
    ADD CONSTRAINT alembic_version_pkc PRIMARY KEY (version_num);


--
-- Name: document_shares document_shares_pkey; Type: CONSTRAINT; Schema: public; Owner: docsafe_user
--

ALTER TABLE ONLY public.document_shares
    ADD CONSTRAINT document_shares_pkey PRIMARY KEY (id);


--
-- Name: documents documents_pkey; Type: CONSTRAINT; Schema: public; Owner: docsafe_user
--

ALTER TABLE ONLY public.documents
    ADD CONSTRAINT documents_pkey PRIMARY KEY (id);


--
-- Name: documents documents_share_link_id_key; Type: CONSTRAINT; Schema: public; Owner: docsafe_user
--

ALTER TABLE ONLY public.documents
    ADD CONSTRAINT documents_share_link_id_key UNIQUE (share_link_id);


--
-- Name: users users_pkey; Type: CONSTRAINT; Schema: public; Owner: docsafe_user
--

ALTER TABLE ONLY public.users
    ADD CONSTRAINT users_pkey PRIMARY KEY (id);


--
-- Name: ix_document_shares_document_id; Type: INDEX; Schema: public; Owner: docsafe_user
--

CREATE INDEX ix_document_shares_document_id ON public.document_shares USING btree (document_id);


--
-- Name: ix_document_shares_user_id; Type: INDEX; Schema: public; Owner: docsafe_user
--

CREATE INDEX ix_document_shares_user_id ON public.document_shares USING btree (user_id);


--
-- Name: ix_documents_encrypted_filename; Type: INDEX; Schema: public; Owner: docsafe_user
--

CREATE UNIQUE INDEX ix_documents_encrypted_filename ON public.documents USING btree (encrypted_filename);


--
-- Name: ix_documents_id; Type: INDEX; Schema: public; Owner: docsafe_user
--

CREATE INDEX ix_documents_id ON public.documents USING btree (id);


--
-- Name: ix_documents_owner_id; Type: INDEX; Schema: public; Owner: docsafe_user
--

CREATE INDEX ix_documents_owner_id ON public.documents USING btree (owner_id);


--
-- Name: ix_users_email; Type: INDEX; Schema: public; Owner: docsafe_user
--

CREATE UNIQUE INDEX ix_users_email ON public.users USING btree (email);


--
-- Name: ix_users_id; Type: INDEX; Schema: public; Owner: docsafe_user
--

CREATE INDEX ix_users_id ON public.users USING btree (id);


--
-- Name: ix_users_username; Type: INDEX; Schema: public; Owner: docsafe_user
--

CREATE UNIQUE INDEX ix_users_username ON public.users USING btree (username);


--
-- Name: document_shares document_shares_document_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: docsafe_user
--

ALTER TABLE ONLY public.document_shares
    ADD CONSTRAINT document_shares_document_id_fkey FOREIGN KEY (document_id) REFERENCES public.documents(id);


--
-- Name: document_shares document_shares_shared_by_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: docsafe_user
--

ALTER TABLE ONLY public.document_shares
    ADD CONSTRAINT document_shares_shared_by_id_fkey FOREIGN KEY (shared_by_id) REFERENCES public.users(id);


--
-- Name: document_shares document_shares_user_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: docsafe_user
--

ALTER TABLE ONLY public.document_shares
    ADD CONSTRAINT document_shares_user_id_fkey FOREIGN KEY (user_id) REFERENCES public.users(id);


--
-- Name: documents documents_owner_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: docsafe_user
--

ALTER TABLE ONLY public.documents
    ADD CONSTRAINT documents_owner_id_fkey FOREIGN KEY (owner_id) REFERENCES public.users(id);


--
-- Name: documents documents_parent_document_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: docsafe_user
--

ALTER TABLE ONLY public.documents
    ADD CONSTRAINT documents_parent_document_id_fkey FOREIGN KEY (parent_document_id) REFERENCES public.documents(id);


--
-- Name: SCHEMA public; Type: ACL; Schema: -; Owner: pg_database_owner
--

GRANT ALL ON SCHEMA public TO docsafe_user;


--
-- PostgreSQL database dump complete
--

