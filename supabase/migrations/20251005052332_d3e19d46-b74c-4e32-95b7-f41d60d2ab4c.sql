-- Add parts column to tests table for new format support
ALTER TABLE public.tests 
ADD COLUMN parts jsonb;