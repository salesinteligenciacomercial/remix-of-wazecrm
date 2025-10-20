-- Create tasks table
CREATE TABLE public.tasks (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  title TEXT NOT NULL,
  description TEXT,
  status TEXT NOT NULL DEFAULT 'pendente',
  priority TEXT NOT NULL DEFAULT 'media',
  assignee_id UUID REFERENCES public.profiles(id),
  due_date TIMESTAMP WITH TIME ZONE,
  lead_id UUID REFERENCES public.leads(id),
  owner_id UUID NOT NULL REFERENCES public.profiles(id),
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.tasks ENABLE ROW LEVEL SECURITY;

-- Create policies
CREATE POLICY "Users can view their company tasks"
  ON public.tasks
  FOR SELECT
  USING (owner_id IN (
    SELECT profiles.id FROM profiles WHERE profiles.id = auth.uid()
  ));

CREATE POLICY "Users can create tasks"
  ON public.tasks
  FOR INSERT
  WITH CHECK (owner_id = auth.uid());

CREATE POLICY "Users can update their company tasks"
  ON public.tasks
  FOR UPDATE
  USING (owner_id IN (
    SELECT profiles.id FROM profiles WHERE profiles.id = auth.uid()
  ));

CREATE POLICY "Users can delete their company tasks"
  ON public.tasks
  FOR DELETE
  USING (owner_id IN (
    SELECT profiles.id FROM profiles WHERE profiles.id = auth.uid()
  ));

-- Add trigger for updated_at
CREATE TRIGGER update_tasks_updated_at
  BEFORE UPDATE ON public.tasks
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at();