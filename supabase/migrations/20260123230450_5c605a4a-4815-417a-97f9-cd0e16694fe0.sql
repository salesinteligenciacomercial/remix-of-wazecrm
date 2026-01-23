-- Add subcategoria column to produtos_servicos table
ALTER TABLE public.produtos_servicos 
ADD COLUMN subcategoria text;