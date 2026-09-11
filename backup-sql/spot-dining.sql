-- Run this once in the Supabase SQL editor.
CREATE TABLE IF NOT EXISTS public.spot_dining (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    tourist_spot_id UUID NOT NULL REFERENCES public.tourist_spots(id) ON DELETE CASCADE,
    name TEXT NOT NULL,
    image_url TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

ALTER TABLE public.spot_dining ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Allow authenticated users to manage spot dining"
ON public.spot_dining FOR ALL TO authenticated
USING (true) WITH CHECK (true);

CREATE POLICY "Allow anonymous users to view spot dining"
ON public.spot_dining FOR SELECT TO anon
USING (true);
