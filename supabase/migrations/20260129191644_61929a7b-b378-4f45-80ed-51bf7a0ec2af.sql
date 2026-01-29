-- Módulos de treinamento (categorias)
CREATE TABLE public.training_modules (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id UUID REFERENCES public.companies(id) ON DELETE CASCADE NOT NULL,
  title TEXT NOT NULL,
  description TEXT,
  icon TEXT DEFAULT 'book',
  order_index INTEGER DEFAULT 0,
  is_active BOOLEAN DEFAULT true,
  created_by UUID REFERENCES auth.users(id),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Aulas/vídeos de cada módulo
CREATE TABLE public.training_lessons (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  module_id UUID REFERENCES public.training_modules(id) ON DELETE CASCADE NOT NULL,
  title TEXT NOT NULL,
  description TEXT,
  youtube_url TEXT NOT NULL,
  youtube_video_id TEXT,
  duration_minutes INTEGER,
  order_index INTEGER DEFAULT 0,
  is_active BOOLEAN DEFAULT true,
  created_by UUID REFERENCES auth.users(id),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Progresso do usuário
CREATE TABLE public.training_progress (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  lesson_id UUID REFERENCES public.training_lessons(id) ON DELETE CASCADE NOT NULL,
  company_id UUID REFERENCES public.companies(id) ON DELETE CASCADE NOT NULL,
  watched_at TIMESTAMPTZ DEFAULT NOW(),
  completed BOOLEAN DEFAULT false,
  UNIQUE(user_id, lesson_id)
);

-- Enable RLS
ALTER TABLE public.training_modules ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.training_lessons ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.training_progress ENABLE ROW LEVEL SECURITY;

-- RLS Policies for training_modules
CREATE POLICY "Users can view training modules of their company" 
ON public.training_modules FOR SELECT 
USING (company_id IN (SELECT ur.company_id FROM public.user_roles ur WHERE ur.user_id = auth.uid()));

CREATE POLICY "Admin can insert training modules" 
ON public.training_modules FOR INSERT 
WITH CHECK (
  company_id IN (
    SELECT ur.company_id FROM public.user_roles ur 
    WHERE ur.user_id = auth.uid() 
    AND ur.role IN ('super_admin', 'company_admin', 'gestor')
  )
);

CREATE POLICY "Admin can update training modules" 
ON public.training_modules FOR UPDATE 
USING (
  company_id IN (
    SELECT ur.company_id FROM public.user_roles ur 
    WHERE ur.user_id = auth.uid() 
    AND ur.role IN ('super_admin', 'company_admin', 'gestor')
  )
);

CREATE POLICY "Admin can delete training modules" 
ON public.training_modules FOR DELETE 
USING (
  company_id IN (
    SELECT ur.company_id FROM public.user_roles ur 
    WHERE ur.user_id = auth.uid() 
    AND ur.role IN ('super_admin', 'company_admin', 'gestor')
  )
);

-- RLS Policies for training_lessons
CREATE POLICY "Users can view training lessons" 
ON public.training_lessons FOR SELECT 
USING (
  module_id IN (
    SELECT tm.id FROM public.training_modules tm 
    WHERE tm.company_id IN (SELECT ur.company_id FROM public.user_roles ur WHERE ur.user_id = auth.uid())
  )
);

CREATE POLICY "Admin can insert training lessons" 
ON public.training_lessons FOR INSERT 
WITH CHECK (
  module_id IN (
    SELECT tm.id FROM public.training_modules tm 
    WHERE tm.company_id IN (
      SELECT ur.company_id FROM public.user_roles ur 
      WHERE ur.user_id = auth.uid() 
      AND ur.role IN ('super_admin', 'company_admin', 'gestor')
    )
  )
);

CREATE POLICY "Admin can update training lessons" 
ON public.training_lessons FOR UPDATE 
USING (
  module_id IN (
    SELECT tm.id FROM public.training_modules tm 
    WHERE tm.company_id IN (
      SELECT ur.company_id FROM public.user_roles ur 
      WHERE ur.user_id = auth.uid() 
      AND ur.role IN ('super_admin', 'company_admin', 'gestor')
    )
  )
);

CREATE POLICY "Admin can delete training lessons" 
ON public.training_lessons FOR DELETE 
USING (
  module_id IN (
    SELECT tm.id FROM public.training_modules tm 
    WHERE tm.company_id IN (
      SELECT ur.company_id FROM public.user_roles ur 
      WHERE ur.user_id = auth.uid() 
      AND ur.role IN ('super_admin', 'company_admin', 'gestor')
    )
  )
);

-- RLS Policies for training_progress
CREATE POLICY "Users can view their own progress" 
ON public.training_progress FOR SELECT 
USING (user_id = auth.uid());

CREATE POLICY "Users can insert their own progress" 
ON public.training_progress FOR INSERT 
WITH CHECK (user_id = auth.uid());

CREATE POLICY "Users can update their own progress" 
ON public.training_progress FOR UPDATE 
USING (user_id = auth.uid());

-- Triggers for updated_at
CREATE TRIGGER update_training_modules_updated_at
  BEFORE UPDATE ON public.training_modules
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_training_lessons_updated_at
  BEFORE UPDATE ON public.training_lessons
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();