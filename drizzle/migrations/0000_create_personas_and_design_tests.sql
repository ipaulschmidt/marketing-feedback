CREATE TABLE public.personas (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL DEFAULT auth.uid(),
  name TEXT NOT NULL,
  summary TEXT,
  sparktoro_source_file_url TEXT,
  sparktoro_parsed_sheets JSONB,
  customer_voice_raw_text TEXT,
  customer_voice_source_file_urls TEXT[] DEFAULT '{}',
  customer_voice_parsed_content JSONB,
  structured_data JSONB NOT NULL DEFAULT '{}'::jsonb,
  parse_report JSONB,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.personas TO authenticated;
GRANT ALL ON public.personas TO service_role;
ALTER TABLE public.personas ENABLE ROW LEVEL SECURITY;

CREATE POLICY "own personas select" ON public.personas FOR SELECT TO authenticated USING (auth.uid() = user_id);
CREATE POLICY "own personas insert" ON public.personas FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id);
CREATE POLICY "own personas update" ON public.personas FOR UPDATE TO authenticated USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
CREATE POLICY "own personas delete" ON public.personas FOR DELETE TO authenticated USING (auth.uid() = user_id);

CREATE TABLE public.design_tests (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL DEFAULT auth.uid(),
  persona_id UUID NOT NULL REFERENCES public.personas(id) ON DELETE CASCADE,
  design_image_url TEXT,
  design_image_urls TEXT[] DEFAULT '{}',
  design_label TEXT,
  design_type TEXT,
  goal TEXT,
  channel_context TEXT,
  reference_example_image_url TEXT,
  reference_example_note TEXT,
  feedback_result JSONB,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.design_tests TO authenticated;
GRANT ALL ON public.design_tests TO service_role;
ALTER TABLE public.design_tests ENABLE ROW LEVEL SECURITY;

CREATE POLICY "own tests select" ON public.design_tests FOR SELECT TO authenticated USING (auth.uid() = user_id);
CREATE POLICY "own tests insert" ON public.design_tests FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id);
CREATE POLICY "own tests update" ON public.design_tests FOR UPDATE TO authenticated USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
CREATE POLICY "own tests delete" ON public.design_tests FOR DELETE TO authenticated USING (auth.uid() = user_id);

CREATE INDEX idx_design_tests_persona ON public.design_tests(persona_id, created_at DESC);
CREATE INDEX idx_personas_user ON public.personas(user_id, created_at DESC);