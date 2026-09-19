# Report clarity update

## What will change
- Put the AI-simulation disclaimer before the report heading and every other report element.
- Change the blink test output to include a critical 1–5 effectiveness rating and reasoning.
- Move the blink test into the score section with message clarity, visual hierarchy, credibility, and emotional resonance.
- Keep older saved reports readable by deriving a display score from their existing blink-test verdict.
- Make image pins easier to distinguish and keep their notes readable within the image area, including near edges and on smaller screens.

## Technical details
- Extend the structured feedback type and generation schema with `blinkTest.rating` from 1–5, and explicitly define what each end of the scale means.
- Update text export to include the blink-test score.
- Adjust the report layout and annotation positioning without changing saved image data.
- Verify the report at desktop and mobile sizes and confirm the app builds cleanly.
