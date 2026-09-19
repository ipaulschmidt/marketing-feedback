# Audience Gut Check enhancement pass

## Scope
Enhance the existing persona test flow and report without adding web lookup, scraping, team features, or multi-persona testing.

## Build

1. **Store multi-image tests safely**
   - Add a nullable `reference_example_images` JSON column and backfill existing single-reference records into `{ url, note }` arrays.
   - Keep the existing legacy columns for compatibility, but switch all new writes and reads to `design_image_urls` and `reference_example_images` with legacy fallbacks for old reports.
   - Preserve the current ownership rules and storage protections.

2. **Upgrade the test form**
   - Let users select multiple design images/PDFs in one selection and show the selected file list.
   - Let users select multiple reference images/PDFs, with an optional note beside each selected file and removal controls.
   - Send every design and reference file together in one test request.

3. **Expand the grounded AI analysis**
   - Label every visual explicitly in the request: `Design Photo 1`, `Design Photo 2`, `Reference Example A`, and so on, including each reference note.
   - Extend the strict feedback schema and prompt with `blinkTest`, `buyerJourneyReactions`, `executiveSummary`, and 3–5 `visualCallouts`.
   - Because callouts are per image, add a design image number to each callout and ask the model to return image-specific positions while keeping coordinates bounded from 0–100.
   - Retain the existing deliberately critical stance, structured output, and no-fabrication rules.

4. **Rebuild the report’s fastest-reading layer**
   - Place the executive summary first, followed by grounding indicators and the gut reaction/blink test pairing.
   - Compute grounding indicators from stored inputs: SparkToro present, customer voice present/absent, and references present/absent.
   - Keep the detailed ratings, friction, opportunity, confidence note, disclaimer, copy, and print actions.

5. **Add interactive report visuals**
   - Render separate design and reference galleries, with notes attached to their reference images.
   - Overlay numbered pins on the matching design image; hovering, focusing, or tapping reveals each callout note. Mark positions as approximate.
   - Add a four-stage buyer journey control. Hover/focus reveals reactions on desktop; tap selects a stage on touch devices.
   - Give both interactions a restrained initial pulse, a clear active state, and visible “hover or tap” guidance, respecting reduced-motion settings.

6. **Add customer voice sourcing guidance**
   - Place the supplied sourcing and no-scraping note beside the optional customer voice import.

7. **Compatibility and verification**
   - Update history thumbnails to use the first stored design image and retain fallback support for old tests.
   - Include all new fields in copy-as-text output.
   - Verify the updated schema, multi-file submission, generated report, galleries, callouts, journey interactions, phone layout, desktop layout, print view, and current preview diagnostics.

## Technical details
- Apply the database change through a managed additive migration; no destructive column removal.
- Continue using the existing private upload storage and authenticated server function.
- Keep the existing `openai/gpt-6-astra` Responses API integration and one structured multimodal request per test.
- Build reusable focused controls for selected files, journey reactions, grounding indicators, and annotated images.
