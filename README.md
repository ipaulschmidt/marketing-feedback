# First Impressions - get feedback before you launch

Build a web app called "Audience Gut Check" (working name, feel free to suggest better) for testing marketing and creative designs against a synthetic but data-grounded audience persona before real user testing.

PROBLEM IT SOLVES

Marketers and designers want quick, honest directional feedback on a design (an email, a trade show booth graphic, an ad, a landing page, anything visual) before investing in real human user testing. This app lets them import real audience intelligence data from SparkToro, optionally add real customer voice data (reviews, testimonials, call notes), upload a design, and get critical, specific, non-sycophantic feedback simulating how that real audience segment would actually react.

CORE PRINCIPLE (apply this everywhere, especially in AI prompting)

The AI feedback must be honest and critical by default, not encouraging. Real user testing surfaces indifference, confusion, and rejection, not polite praise. Every part of the product, especially the AI system prompt, should actively resist the model's natural tendency to be agreeable. Never let the AI default to "this is good, just tweak X." If a design is generic, confusing, or forgettable, the report must say so plainly.

USERS

Single user or small internal team (marketers, designers) testing their own creative work. Simple auth is fine (email/password via Supabase).

NO LIVE WEB SEARCH IN V1

Do not build any live web search, scraping, or URL-fetching into this app. All grounding data comes from what the user explicitly imports or uploads. This is a deliberate scope decision, not an oversight, keep the build simple and avoid the compliance/reliability issues of scraping third-party sites.

=====================

CORE FLOW (v1 scope)

=====================

This version supports ONE persona and ONE design per test (no multi-persona or side-by-side comparison in v1, though the data model should not block adding that later).

STEP 1: Build a persona from SparkToro data, with optional real customer voice data

1a. SparkToro import (required)

- User uploads a SparkToro audience report export as an .xlsx file. These exports contain MULTIPLE TABS/SHEETS (e.g. social accounts followed, websites visited, podcasts, YouTube channels, subreddits, hashtags used, demographics/overview, other affinities). The parser must read and use EVERY sheet in the workbook, not just the first tab. Missing tabs means missing most of the actual audience signal, since SparkToro spreads different data types across separate sheets by design.

- Also support a plain text-paste fallback (in case someone wants to paste a summary instead of uploading a file).

- Backend processing:

  1. On upload, parse the .xlsx server-side (e.g. via a library like SheetJS/xlsx) and extract every sheet into structured rows (sheet name + its row/column data).

  2. Combine all sheets into one consolidated text/JSON payload, clearly labeled by sheet name (so the AI parsing call knows "this data is from the Podcasts tab," "this data is from the Websites tab," etc.).

1b. Customer voice data import (optional, but encouraged in the UI)

- Add a clearly separate section in the persona builder: "Add real customer voice data (optional)." This is for grounding vocabulary and objections in what actual customers say, not what the audience follows online.

- Support two input methods, both available:

  - A text box for pasting content directly (reviews, testimonials, sales call notes, survey verbatims, anything in the customer's own words).

  - A file upload for review/data export files. Support common formats: .xlsx/.csv (e.g. an exported review dump with multiple rows, possibly multiple sheets, parse ALL sheets same as the SparkToro rule above), .pdf, and .txt/.docx (for pasted-in testimonial documents or call note exports).

- Backend processing: extract all text content from whatever is uploaded (all sheets if spreadsheet, all pages if PDF), and combine with any pasted text into one consolidated "customer voice" payload for the persona synthesis step.

- Make clear in the UI that this step is optional and skippable, since not every persona will have this data available.

1c. AI persona synthesis

- Send the consolidated SparkToro payload plus the consolidated customer voice payload (if provided) to an AI call that structures it into a persona object with these fields:

  - personaName (a plausible fictional name/handle for readability)

  - roleAndDemographics (job titles, seniority, industry, location signals found in the SparkToro data)

  - mediaDiet (specific websites, podcasts, YouTube channels, social accounts, newsletters this audience follows, pulled from across ALL relevant SparkToro sheets, not just one category)

  - interestsAndAffinities (topics, brands, hashtags, keywords associated with this audience, drawing from all relevant SparkToro sheets)

  - customerVoiceHighlights (real quotes or paraphrased phrases pulled directly from the customer voice data, if provided; leave empty/absent if no customer voice data was given, do not fabricate quotes)

  - likelyVocabularyAndTone (language style, informed by BOTH the SparkToro media diet and, when available, the actual customer voice data, which should be weighted more heavily since it is real language from real people in this audience rather than inferred from what they follow)

  - whatGoodAlreadyLooksLike (a short inferred note on what high-quality content in this category already looks like to this audience, since they see a lot of it)

  - skepticismProfile (how skeptical/time-poor this persona likely is, informed by media consumption habits AND any real objections or hesitations found in the customer voice data)

  - dataProvenance: for every field above, tag each claim with its source: "SparkToro export" (and ideally which sheet), "customer voice import," or "inference." The user needs to know what's grounded in real data vs. what the AI extrapolated.

- Show the generated persona to the user in an editable review screen before saving. Let them tweak any field. Also show which sources were successfully parsed (e.g. "SparkToro: Overview, Websites, Podcasts, Social Accounts, Hashtags parsed. Not found: Subreddits." and "Customer voice: 1 pasted text block + reviews.xlsx (2 sheets, 340 rows) parsed.") so they can tell if something didn't import correctly.

- Save the persona to a persona library (a simple list/table view: name, summary, date created, whether customer voice data is attached, "run a test" button, edit, delete).

STEP 2: Run a design test against a saved persona

- User selects a saved persona.

- User uploads a design (image: PNG/JPG, or PDF for multi-page/booth designs).

- User fills a short context form (all optional but encouraged):

  - designType (email, trade show/booth graphic, social ad, landing page, direct mail, other/freeform text)

  - goal (free text: what should this design make the viewer do? e.g. "reply to book a demo," "stop and scan the QR code," "remember our brand name")

  - channelContext (free text: where/how will they encounter this? e.g. "mobile inbox," "walking past a booth in a loud conference hall," "scrolling LinkedIn")

- Optional reference example section: "Compare against a real example (optional)." Lets the user upload a screenshot/image of an actual comparable design already in the market (a competitor's email, ad, or booth graphic) and/or add a short free-text note about it (e.g. where it's from). The app does NOT fetch URLs; if the user pastes a URL it is stored only as a text note for context, not retrieved. This is meant to give the AI something concrete to compare against instead of only inferring from category norms.

- User clicks "Get feedback." Show a loading state (this may take 10-20 seconds since it's a vision model call, longer if a reference image is included).

STEP 3: AI generates structured feedback

Send the design image (and reference example image, if provided) plus persona data plus context to a vision-capable LLM (use a multimodal model, e.g. Claude with vision or GPT-4o via whatever AI provider integration is available). The model must return structured JSON, not free text, so it can be rendered as a scorecard. Use this system prompt as the base (adapt as needed for the provider, but preserve the intent and instructions exactly):

---

SYSTEM PROMPT FOR FEEDBACK GENERATION:

You are simulating a real, specific member of an audience segment, built from actual audience intelligence data and, where available, real customer voice data (not a generic reviewer, not a helpful assistant). Persona: {{persona_json}}. You are looking at a {{designType}} whose stated goal is: {{goal}}. You will encounter it in this context: {{channelContext}}.

{{#if reference_example_provided}}

A reference example has also been provided: an actual comparable design already in the market{{#if reference_note}}, described as: {{reference_note}}{{/if}}. Use it as a concrete point of comparison, not just background. Name specific similarities and differences between the design being tested and this reference when forming your genericVsDistinct judgment, rather than relying only on inferred category norms.

{{/if}}

Your job is to react exactly as this real person would in that moment, not as a design critic and not as an assistant trying to be encouraging or helpful. This person is busy, mildly skeptical, and has already seen many similar {{designType}}s in their feed, inbox, or industry. Give an honest, unfiltered reaction, including if it is negative, boring, confusing, or something they would ignore entirely.

Rules:

- Do not soften criticism to be polite. Do not default to constructive positivity if the design does not earn it.

- Ground every reaction in the specific persona data provided: their actual media diet, real customer voice language (if available), and what "good" already looks like to them in this category.

- If a reference example was provided, explicitly compare against it. If not, judge genericness against the category norms implied by the persona's media diet, and say which is being used.

- If the design looks like everything else this persona already sees, say so directly and name what makes it indistinct.

- Never rate something as effective just because it is competently made. Competent is not the bar; cutting through this person's specific skepticism and attention scarcity is the bar.

- If you are genuinely uncertain how this persona would react to a specific element, say so rather than guessing confidently.

Return ONLY valid JSON matching this schema:

{

  "gutReaction": "the very first, instinctive reaction in 1-2 sentences, as this persona, before any analysis",

  "messageClarity": { "rating": 1-5, "reasoning": "..." },

  "visualHierarchy": { "rating": 1-5, "reasoning": "what draws the eye first, second, and what gets ignored" },

  "credibilityAndTrust": { "rating": 1-5, "reasoning": "does this look legitimate/trustworthy to this specific persona, why or why not" },

  "emotionalResonance": { "rating": 1-5, "reasoning": "..." },

  "genericVsDistinct": "does this look like everything else this persona already sees in this category, and specifically why or why not; explicitly reference the comparison example if one was provided",

  "predictedAction": "a concrete, specific behavior, not a sentiment: e.g. 'deletes without reading past the subject line', 'stops walking and asks a question', 'keeps scrolling', 'screenshots it to make fun of it with a colleague'",

  "biggestFriction": ["1-2 concrete, specific things that would stop this person from taking the desired action"],

  "biggestOpportunity": "the single highest-leverage change, stated specifically, not generic advice like 'make it pop'",

  "personaQuote": "1-2 sentences, first person, in this persona's likely voice and vocabulary, as if they said it out loud",

  "confidenceNote": "a brief, honest note on which parts of this feedback are strongly grounded in the persona/customer voice data vs. the model's inference"

}

---

STEP 4: Report view

- Render the JSON as a clean scorecard: rating fields as simple 1-5 indicators (not decorative, just clear), the reasoning text under each, gut reaction and persona quote pulled out visually as the most prominent elements since they're the most human-readable part.

- If a reference example was used, show it alongside the tested design in the report so the comparison is visible, not just described in text.

- Always show a persistent, clearly visible disclaimer on every report: "This is a directional AI-simulated reaction, not real user research. Use it to catch obvious problems early and prioritize what to test with real people, not as a substitute for real feedback."

- Let the user save/export the report (PDF export or copy-as-text) and see it later in a history view per persona (persona detail page shows: persona info + list of past tests with thumbnails and dates).

- Allow re-running a test with a new version of the same design and viewing prior results for comparison (manually, by scrolling history; full side-by-side diffing is a later version).

=====================

DATA MODEL (Supabase)

=====================

- personas: id, user_id, name, sparktoro_source_file_url, sparktoro_parsed_sheets (jsonb), customer_voice_raw_text, customer_voice_source_file_urls (array), customer_voice_parsed_content (jsonb), structured_data (jsonb: the persona fields above with dataProvenance), created_at

- design_tests: id, user_id, persona_id (fk), design_image_url, design_type, goal, channel_context, reference_example_image_url (nullable), reference_example_note (nullable, text), feedback_result (jsonb), created_at

- Use Supabase Storage for uploaded SparkToro files, customer voice files, design images/PDFs, and reference example images.

- Keep the schema simple enough to later add: multiple personas per test (a join table), and multiple design variants per test (an array of image URLs plus per-variant feedback), without a rebuild. Don't build those now, just don't paint the schema into a corner.

=====================

KEY SCREENS

=====================

1. Persona library (list + "new persona" button, shows whether customer voice data is attached)

2. New/edit persona flow: SparkToro upload/paste (show which sheets parsed) -> optional customer voice section (text box + file upload, show what parsed) -> AI-generated draft -> editable review -> save

3. New test flow: pick persona -> upload design -> context form -> optional reference example upload/note -> generate

4. Report view (scorecard + narrative + reference comparison if used + disclaimer + export/save)

5. Persona detail / test history view

=====================

TECH NOTES

=====================

- Use Supabase for auth, database, and file storage.

- Spreadsheet parsing (.xlsx/.csv, for both SparkToro exports and customer voice review files) must happen server-side (edge function) using a library capable of reading all sheets in a workbook (e.g. SheetJS/xlsx), not just the active/first sheet. Iterate every sheet name before combining into the AI parsing payload.

- PDF/text/docx parsing for customer voice data should extract all text content server-side before passing to the AI parsing call.

- The feedback generation must go through a server-side function (edge function), not a client-side API call, since it needs to send image(s) plus a longer prompt to a vision-capable LLM and should not expose API keys client-side.

- Enforce JSON-structured output from the model (via function calling / structured output mode if the provider supports it) rather than parsing free text, so the report always renders reliably.

- No live web search, scraping, or URL fetching anywhere in this build. A pasted URL is stored as plain text context only.

- Keep the UI clean and fast. This is a working tool for quick decisions, not a polished client-facing product. Prioritize clarity of the feedback report over visual flourish.

NOT IN SCOPE FOR V1 (do not build, but do not block architecturally)

- Multiple personas per test

- Side-by-side design variant comparison

- Team sharing/collaboration features

- Live SparkToro API integration (v1 is manual .xlsx upload / text paste only)

- Any live web search, scraping, or fact-checking against external sources

This project was built with [Lovable](https://lovable.dev).

**Live app**: https://marketing-feedback.lovable.app

## Build with Lovable

Continue developing this project in the [Lovable editor](https://lovable.dev/projects/8272f208-62d1-4a94-ba7f-a1c3656a7c65).

- **Ship faster**: describe what you want to build and Lovable handles the code.
- **Stay in sync**: every change made in Lovable is committed straight to this repository.
- **Full ownership**: this code is yours. Push to `main` on GitHub and your changes sync back into Lovable, ready for your next prompt.

## Development

Prefer working locally? You need Node.js and npm — [install with nvm](https://github.com/nvm-sh/nvm#installing-and-updating).

```sh
git clone <this-repository-url>
cd <repository-name>
npm i
npm run dev
```
