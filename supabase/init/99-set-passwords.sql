-- Set passwords for Supabase internal roles
-- This is required because the supabase/postgres image creates roles without passwords
-- Mirrors the official Supabase docker setup's roles.sql
--
-- Note: POSTGRES_PASSWORD env var is automatically available in psql via
-- the docker-entrypoint-initdb.d mechanism

\set pgpass `echo "$POSTGRES_PASSWORD"`

ALTER USER authenticator WITH PASSWORD :'pgpass';
ALTER USER supabase_auth_admin WITH PASSWORD :'pgpass';
ALTER USER supabase_storage_admin WITH PASSWORD :'pgpass';
ALTER USER supabase_admin WITH PASSWORD :'pgpass';
