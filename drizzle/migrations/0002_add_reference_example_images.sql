ALTER TABLE public.design_tests
ADD COLUMN reference_example_images jsonb;

UPDATE public.design_tests
SET reference_example_images = jsonb_build_array(
  jsonb_build_object(
    'url', reference_example_image_url,
    'note', COALESCE(reference_example_note, '')
  )
)
WHERE reference_example_image_url IS NOT NULL
  AND reference_example_images IS NULL;