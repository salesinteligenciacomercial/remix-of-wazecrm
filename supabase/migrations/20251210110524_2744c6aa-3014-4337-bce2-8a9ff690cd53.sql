-- Add policy to allow public access to external meetings with public_link
CREATE POLICY "Public can view external meetings"
ON public.meetings
FOR SELECT
USING (meeting_type = 'external' AND public_link IS NOT NULL);

-- Also allow public users to update meeting status (for joining)
CREATE POLICY "Public can update external meetings"
ON public.meetings
FOR UPDATE
USING (meeting_type = 'external' AND public_link IS NOT NULL);

-- Allow public users to insert meeting signals for external meetings
CREATE POLICY "Public can insert signals for external meetings"
ON public.meeting_signals
FOR INSERT
WITH CHECK (
  EXISTS (
    SELECT 1 FROM public.meetings 
    WHERE meetings.id = meeting_signals.meeting_id 
    AND meetings.meeting_type = 'external' 
    AND meetings.public_link IS NOT NULL
  )
);

-- Allow public users to view signals for external meetings
CREATE POLICY "Public can view signals for external meetings"
ON public.meeting_signals
FOR SELECT
USING (
  EXISTS (
    SELECT 1 FROM public.meetings 
    WHERE meetings.id = meeting_signals.meeting_id 
    AND meetings.meeting_type = 'external' 
    AND meetings.public_link IS NOT NULL
  )
);