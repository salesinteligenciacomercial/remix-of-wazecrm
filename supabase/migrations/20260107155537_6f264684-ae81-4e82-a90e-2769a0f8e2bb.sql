-- Create table for lead attachments (ficha técnica)
CREATE TABLE public.lead_attachments (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  lead_id UUID NOT NULL REFERENCES leads(id) ON DELETE CASCADE,
  company_id UUID NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
  
  -- File information
  file_name TEXT NOT NULL,
  file_url TEXT NOT NULL,
  file_type TEXT NOT NULL, -- 'image', 'video', 'document', 'audio'
  file_size INTEGER,
  mime_type TEXT,
  
  -- Metadata for clinics
  category TEXT, -- 'antes', 'depois', 'durante', 'exame', 'laudo', 'outros'
  description TEXT,
  treatment_name TEXT, -- Treatment/procedure name
  treatment_date DATE, -- Treatment date
  
  -- Control
  uploaded_by UUID,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Indexes for performance
CREATE INDEX idx_lead_attachments_lead_id ON lead_attachments(lead_id);
CREATE INDEX idx_lead_attachments_company_id ON lead_attachments(company_id);
CREATE INDEX idx_lead_attachments_category ON lead_attachments(category);

-- Enable RLS
ALTER TABLE lead_attachments ENABLE ROW LEVEL SECURITY;

-- RLS policies for multi-tenant isolation
CREATE POLICY "Company users manage lead attachments" ON lead_attachments
  FOR ALL USING (user_belongs_to_company(auth.uid(), company_id));

-- Create storage bucket for lead attachments
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'lead-attachments',
  'lead-attachments',
  true,
  52428800,
  ARRAY['image/jpeg', 'image/png', 'image/gif', 'image/webp', 'video/mp4', 'video/quicktime', 'video/webm', 'audio/mpeg', 'audio/mp4', 'application/pdf']
);

-- Storage RLS policies
CREATE POLICY "Users can upload lead attachments" ON storage.objects
  FOR INSERT WITH CHECK (
    bucket_id = 'lead-attachments' AND
    auth.uid() IS NOT NULL
  );

CREATE POLICY "Anyone can view lead attachments" ON storage.objects
  FOR SELECT USING (
    bucket_id = 'lead-attachments'
  );

CREATE POLICY "Users can delete lead attachments" ON storage.objects
  FOR DELETE USING (
    bucket_id = 'lead-attachments' AND
    auth.uid() IS NOT NULL
  );

-- Enable realtime for attachments
ALTER PUBLICATION supabase_realtime ADD TABLE public.lead_attachments;