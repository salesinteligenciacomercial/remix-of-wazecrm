-- Tabela de Playbooks Comerciais
CREATE TABLE public.processes_playbooks (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  company_id UUID NOT NULL REFERENCES public.companies(id) ON DELETE CASCADE,
  owner_id UUID NOT NULL,
  title TEXT NOT NULL,
  content TEXT,
  type TEXT NOT NULL DEFAULT 'atendimento',
  category TEXT,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- Tabela de Rotinas/Cadências Comerciais
CREATE TABLE public.processes_routines (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  company_id UUID NOT NULL REFERENCES public.companies(id) ON DELETE CASCADE,
  owner_id UUID NOT NULL,
  name TEXT NOT NULL,
  type TEXT NOT NULL DEFAULT 'prospeccao',
  channels JSONB DEFAULT '[]'::jsonb,
  steps JSONB DEFAULT '[]'::jsonb,
  kpis_expected JSONB DEFAULT '{}'::jsonb,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- Tabela de Etapas de Processos
CREATE TABLE public.processes_stages (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  company_id UUID NOT NULL REFERENCES public.companies(id) ON DELETE CASCADE,
  owner_id UUID NOT NULL,
  stage_name TEXT NOT NULL,
  stage_order INTEGER DEFAULT 0,
  checklist JSONB DEFAULT '[]'::jsonb,
  scripts JSONB DEFAULT '[]'::jsonb,
  objectives TEXT,
  dos_and_donts JSONB DEFAULT '{}'::jsonb,
  max_time_hours INTEGER,
  kpis_expected JSONB DEFAULT '{}'::jsonb,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- Tabela de Relatórios de Processos
CREATE TABLE public.processes_reports (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  company_id UUID NOT NULL REFERENCES public.companies(id) ON DELETE CASCADE,
  owner_id UUID NOT NULL,
  title TEXT NOT NULL,
  report_type TEXT DEFAULT 'geral',
  insights JSONB DEFAULT '[]'::jsonb,
  kpis JSONB DEFAULT '{}'::jsonb,
  improvement_suggestions JSONB DEFAULT '[]'::jsonb,
  period_start TIMESTAMP WITH TIME ZONE,
  period_end TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- Tabela de Sugestões da IA de Processos
CREATE TABLE public.ai_process_suggestions (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  company_id UUID NOT NULL REFERENCES public.companies(id) ON DELETE CASCADE,
  suggestion_type TEXT NOT NULL,
  title TEXT NOT NULL,
  details JSONB DEFAULT '{}'::jsonb,
  status TEXT DEFAULT 'pending',
  approved BOOLEAN DEFAULT false,
  approved_by UUID,
  approved_at TIMESTAMP WITH TIME ZONE,
  rejected_reason TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- Tabela de Feedback dos Usuários sobre Processos
CREATE TABLE public.processes_feedback (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  company_id UUID NOT NULL REFERENCES public.companies(id) ON DELETE CASCADE,
  user_id UUID NOT NULL,
  feedback_type TEXT NOT NULL,
  target_type TEXT NOT NULL,
  target_id UUID,
  description TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.processes_playbooks ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.processes_routines ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.processes_stages ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.processes_reports ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.ai_process_suggestions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.processes_feedback ENABLE ROW LEVEL SECURITY;

-- RLS Policies for processes_playbooks
CREATE POLICY "Company users manage playbooks" ON public.processes_playbooks FOR ALL USING (user_belongs_to_company(auth.uid(), company_id));

-- RLS Policies for processes_routines
CREATE POLICY "Company users manage routines" ON public.processes_routines FOR ALL USING (user_belongs_to_company(auth.uid(), company_id));

-- RLS Policies for processes_stages
CREATE POLICY "Company users manage stages" ON public.processes_stages FOR ALL USING (user_belongs_to_company(auth.uid(), company_id));

-- RLS Policies for processes_reports
CREATE POLICY "Company users manage reports" ON public.processes_reports FOR ALL USING (user_belongs_to_company(auth.uid(), company_id));

-- RLS Policies for ai_process_suggestions
CREATE POLICY "Company users manage suggestions" ON public.ai_process_suggestions FOR ALL USING (user_belongs_to_company(auth.uid(), company_id));

-- RLS Policies for processes_feedback
CREATE POLICY "Company users manage feedback" ON public.processes_feedback FOR ALL USING (user_belongs_to_company(auth.uid(), company_id));

-- Triggers for updated_at
CREATE TRIGGER update_processes_playbooks_updated_at BEFORE UPDATE ON public.processes_playbooks FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE TRIGGER update_processes_routines_updated_at BEFORE UPDATE ON public.processes_routines FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE TRIGGER update_processes_stages_updated_at BEFORE UPDATE ON public.processes_stages FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE TRIGGER update_ai_process_suggestions_updated_at BEFORE UPDATE ON public.ai_process_suggestions FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();