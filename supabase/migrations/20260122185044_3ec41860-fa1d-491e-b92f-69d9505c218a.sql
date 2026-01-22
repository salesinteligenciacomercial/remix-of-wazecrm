-- First, drop the RLS policies that depend on from_user and to_user columns
DROP POLICY IF EXISTS "Users view their signals" ON public.meeting_signals;
DROP POLICY IF EXISTS "Users create signals" ON public.meeting_signals;
DROP POLICY IF EXISTS "Users delete signals" ON public.meeting_signals;

-- Alter meeting_signals to use TEXT instead of UUID for from_user and to_user
-- This allows public meetings to use identifiers like 'host' and 'guest-xxx'
ALTER TABLE public.meeting_signals 
  ALTER COLUMN from_user TYPE text USING from_user::text,
  ALTER COLUMN to_user TYPE text USING to_user::text;

-- Recreate policies with text comparison
-- Users can view signals where they are sender or receiver
CREATE POLICY "Users view their signals" ON public.meeting_signals
  FOR SELECT USING (
    auth.uid()::text = to_user OR 
    auth.uid()::text = from_user
  );

-- Users can create signals as themselves
CREATE POLICY "Users create signals" ON public.meeting_signals
  FOR INSERT WITH CHECK (
    auth.uid()::text = from_user OR
    -- Allow guests (non-authenticated) to create signals for external meetings via public policies
    from_user LIKE 'guest-%'
  );

-- Users can delete signals they sent or received
CREATE POLICY "Users delete signals" ON public.meeting_signals
  FOR DELETE USING (
    auth.uid()::text = from_user OR 
    auth.uid()::text = to_user
  );