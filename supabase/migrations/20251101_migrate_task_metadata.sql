-- ✅ Migration para migrar metadados de tarefas da descrição para campos reais
-- Data: 2024-11-01
-- Descrição: Migra checklist, tags, comments e attachments da descrição (formato <!--meta:...-->) 
--            para os campos JSONB dedicados da tabela tasks

DO $$
DECLARE
  task_record RECORD;
  meta_json JSONB;
  meta_text TEXT;
  match_result TEXT;
BEGIN
  -- Iterar sobre todas as tarefas que possuem metadados na descrição
  FOR task_record IN 
    SELECT id, description, checklist, tags, comments, attachments
    FROM public.tasks
    WHERE description IS NOT NULL 
      AND description LIKE '%<!--meta:%-->%'
  LOOP
    -- Extrair JSON dos metadados da descrição
    match_result := (regexp_match(task_record.description, '<!--meta:(.*)-->'))[1];
    
    IF match_result IS NOT NULL THEN
      BEGIN
        -- Tentar fazer parse do JSON extraído
        meta_json := match_result::JSONB;
        
        -- Migrar checklist (se existir no meta e não estiver no campo real)
        IF meta_json ? 'checklist' 
           AND (task_record.checklist IS NULL OR jsonb_array_length(task_record.checklist) = 0)
        THEN
          UPDATE public.tasks
          SET checklist = meta_json->'checklist'
          WHERE id = task_record.id;
        END IF;
        
        -- Migrar tags (se existir no meta e não estiver no campo real)
        IF meta_json ? 'tags' 
           AND (task_record.tags IS NULL OR array_length(task_record.tags, 1) IS NULL)
        THEN
          UPDATE public.tasks
          SET tags = ARRAY(SELECT jsonb_array_elements_text(meta_json->'tags'))
          WHERE id = task_record.id;
        END IF;
        
        -- Migrar comments (se existir no meta e não estiver no campo real)
        IF meta_json ? 'comments' 
           AND (task_record.comments IS NULL OR jsonb_array_length(task_record.comments) = 0)
        THEN
          UPDATE public.tasks
          SET comments = meta_json->'comments'
          WHERE id = task_record.id;
        END IF;
        
        -- Migrar attachments (se existir no meta e não estiver no campo real)
        IF meta_json ? 'attachments' 
           AND (task_record.attachments IS NULL OR jsonb_array_length(task_record.attachments) = 0)
        THEN
          UPDATE public.tasks
          SET attachments = meta_json->'attachments'
          WHERE id = task_record.id;
        END IF;
        
        -- Limpar descrição removendo o comentário de metadados
        UPDATE public.tasks
        SET description = regexp_replace(description, '\s*<!--meta:.*-->\s*$', '', 'g')
        WHERE id = task_record.id
          AND description LIKE '%<!--meta:%-->%';
          
      EXCEPTION WHEN OTHERS THEN
        -- Em caso de erro ao fazer parse, logar mas continuar
        RAISE NOTICE 'Erro ao migrar metadados da tarefa %: %', task_record.id, SQLERRM;
      END;
    END IF;
  END LOOP;
  
  RAISE NOTICE 'Migração de metadados concluída';
END $$;

