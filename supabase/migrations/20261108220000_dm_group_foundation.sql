-- Top 3 Group Direct Messaging: isolated group storage foundation.
-- DEVELOPMENT FIRST. No changes to existing one-to-one DM tables.
-- This migration intentionally grants NO client access and creates NO RPCs.
-- A subsequent reviewed migration must add invite, membership, messaging,
-- read, moderation, and sharing RPCs plus participant-only RLS policies.
-- Never apply to Production until the feature is reviewed and approved.
BEGIN;
SET LOCAL lock_timeout = '5s';
SET LOCAL statement_timeout = '30s';

DO $guard$
BEGIN
  IF to_regclass('public.profiles') IS NULL
     OR to_regclass('public.collections') IS NULL
     OR to_regclass('public.dm_conversations') IS NULL
     OR to_regclass('public.dm_messages') IS NULL
     OR to_regclass('public.dm_read_states') IS NULL THEN
    RAISE EXCEPTION 'STOP: Top 3 base or one-to-one messaging tables are missing';
  END IF;

  IF to_regclass('public.dm_group_conversations') IS NOT NULL
     OR to_regclass('public.dm_group_members') IS NOT NULL
     OR to_regclass('public.dm_group_messages') IS NOT NULL
     OR to_regclass('public.dm_group_read_states') IS NOT NULL THEN
    RAISE EXCEPTION 'STOP: Group messaging tables already exist; inspect before migrating';
  END IF;
END;
$guard$;

CREATE TABLE public.dm_group_conversations (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL CHECK (char_length(btrim(name)) BETWEEN 1 AND 80),
  created_by uuid REFERENCES public.profiles(id) ON DELETE SET NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  last_message_at timestamptz
);

CREATE TABLE public.dm_group_members (
  group_id uuid NOT NULL REFERENCES public.dm_group_conversations(id) ON DELETE CASCADE,
  user_id uuid NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  invited_by uuid REFERENCES public.profiles(id) ON DELETE SET NULL,
  status text NOT NULL CHECK (status IN ('invited', 'accepted', 'declined', 'left')),
  invited_at timestamptz NOT NULL DEFAULT now(),
  joined_at timestamptz,
  updated_at timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY (group_id, user_id),
  CONSTRAINT dm_group_accepted_has_joined_at CHECK (
    status <> 'accepted' OR joined_at IS NOT NULL
  )
);

CREATE INDEX dm_group_members_user_status_idx
  ON public.dm_group_members (user_id, status, group_id);
CREATE INDEX dm_group_members_group_status_idx
  ON public.dm_group_members (group_id, status);
CREATE INDEX dm_group_conversations_recent_idx
  ON public.dm_group_conversations (last_message_at DESC NULLS LAST);

CREATE TABLE public.dm_group_messages (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  group_id uuid NOT NULL REFERENCES public.dm_group_conversations(id) ON DELETE CASCADE,
  sender_id uuid NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  body text NOT NULL CHECK (char_length(btrim(body)) BETWEEN 1 AND 2000),
  shared_collection_id uuid REFERENCES public.collections(id) ON DELETE SET NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  removed_at timestamptz
);

CREATE INDEX dm_group_messages_recent_idx
  ON public.dm_group_messages (group_id, created_at DESC, id DESC);
CREATE INDEX dm_group_messages_sender_recent_idx
  ON public.dm_group_messages (sender_id, created_at DESC);

CREATE TABLE public.dm_group_read_states (
  group_id uuid NOT NULL,
  user_id uuid NOT NULL,
  last_read_at timestamptz NOT NULL,
  PRIMARY KEY (group_id, user_id),
  FOREIGN KEY (group_id, user_id)
    REFERENCES public.dm_group_members (group_id, user_id) ON DELETE CASCADE
);

CREATE INDEX dm_group_read_states_user_idx
  ON public.dm_group_read_states (user_id, group_id);

-- Locked down on purpose. No browser/mobile client can read or write these
-- tables until separately reviewed participant RLS and RPCs are deployed.
ALTER TABLE public.dm_group_conversations ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.dm_group_members ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.dm_group_messages ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.dm_group_read_states ENABLE ROW LEVEL SECURITY;

REVOKE ALL ON TABLE
  public.dm_group_conversations,
  public.dm_group_members,
  public.dm_group_messages,
  public.dm_group_read_states
FROM PUBLIC, anon, authenticated;

GRANT SELECT, INSERT, UPDATE, DELETE ON TABLE
  public.dm_group_conversations,
  public.dm_group_members,
  public.dm_group_messages,
  public.dm_group_read_states
TO service_role;

COMMIT;
