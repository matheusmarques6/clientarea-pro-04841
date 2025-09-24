-- Add missing updated_at column to klaviyo_summaries table
ALTER TABLE public.klaviyo_summaries 
ADD COLUMN IF NOT EXISTS updated_at TIMESTAMP WITH TIME ZONE DEFAULT now();

-- Add trigger to automatically update the updated_at column
CREATE OR REPLACE TRIGGER update_klaviyo_summaries_updated_at
BEFORE UPDATE ON public.klaviyo_summaries
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();