# First Glance

Honest, data-grounded feedback on marketing designs before you spend money on real user testing. First Glance builds an audience persona from your SparkToro export and real customer language, then shows how that person would actually react to your email, ad, booth graphic or landing page. It's blunt about it, too.

**Live app:** https://marketing-feedback.lovable.app

> First Glance gives a directional, AI-simulated reaction. It is not real user research. Use it to catch obvious problems early and decide what to test with real people.

---

## How It Works

1. **Build a persona.** Upload a SparkToro audience export (`.xlsx`) or paste a summary. Every sheet in the workbook gets parsed: websites, podcasts, social accounts, subreddits, hashtags, demographics and more.
2. **Add real customer voice (optional).** Paste reviews, testimonials, call notes or survey verbatims, or upload `.xlsx`, `.csv`, `.pdf`, `.txt` or `.docx` files. Real customer language counts for more than inferred signals.
3. **Review and edit.** The AI drafts a structured persona: role, media diet, interests, vocabulary, what "good" already looks like to this audience, and how skeptical they are. Every claim is tagged with where it came from (SparkToro sheet, customer voice, or inference). A parse report shows exactly which sheets and files were imported.
4. **Run a design test.** Pick a persona and upload one or more design images or PDFs (several angles of a booth, or several pages of an email). You can also add context: design type, goal and channel.
5. **Compare against the market (optional).** Attach one or more competitor examples, each with its own short note.
6. **Read the report.** You get a structured scorecard that skims well on a phone and has detail underneath.

## Key Capabilities

- **Critical by default.** The prompt pushes back against the model's tendency to agree. Competent work isn't the bar. Breaking through this person's skepticism is.
- **Executive summary strip.** An honest overall verdict plus a one-line takeaway at the top of every report.
- **Grounding badges.** These are calculated from the actual inputs, not written by the AI. They show whether SparkToro data, customer voice data and reference examples fed this result.
- **1–5 scorecard.** Blink test (the 3–5 second window), message clarity, visual hierarchy, credibility and emotional resonance, each with its reasoning.
- **Annotated image callouts.** Numbered pins on the design mark first attention, friction points and CTAs. Hover or tap a pin to read its note.
- **Buyer's journey reactions.** An interactive four-stage view (Awareness, Consideration, Decision, Potential Partner) with a distinct first-person reaction for each stage.
- **Galleries.** Design photos and reference examples are grouped side by side.
- **Export and history.** Copy a report as text or save it as a PDF. Each persona page lists its past tests with thumbnails, and you can re-run a test with a new version of the same design.
- **No scraping.** All grounding data comes from what you import. If you paste a URL, it's stored as a text note and never fetched.
- **Private access.** Public sign-up is turned off, and each user's data and uploads are isolated by row-level security.

## Tech Stack & Architecture

| Layer | Technology |
| --- | --- |
| Framework | [TanStack Start](https://tanstack.com/start) (React 19, file-based routing, server functions) on Vite |
| Styling | Tailwind CSS v4 with semantic design tokens, shadcn/ui (Radix) components |
| Backend | Lovable Cloud (Postgres, Auth, Storage) with row-level security on every table and storage folder |
| AI | Lovable AI Gateway (multimodal model, strict JSON-schema structured output) |
| Parsing | SheetJS (`xlsx`) for every sheet in a workbook, `fflate` for `.docx`, PDFs passed natively to the model |

```text
src/
  routes/              Pages: library, persona builder/detail, new test, report, auth
  components/          App shell, persona editor, report interactions, UI kit
  lib/
    *.functions.ts     Authenticated server functions (persona synthesis, design tests)
    ai.server.ts       AI Gateway client (server-only)
    extract.server.ts  Multi-sheet spreadsheet / document extraction (server-only)
    persona-schema.ts  Shared persona + feedback types
supabase/migrations/   Database schema and storage policies
```

All AI calls and file parsing happen on the server. No API keys ever reach the browser.

## Local Development

**Prerequisites:** [Bun](https://bun.sh) (or Node.js 20+ with npm) and a Supabase-compatible backend.

```sh
git clone <this-repository-url>
cd <repository-name>
bun install
cp .env.example .env   # fill in the values below
bun run dev            # http://localhost:8080
```

**Environment variables** (see `.env.example`):

| Variable | Where it's used |
| --- | --- |
| `VITE_SUPABASE_URL`, `VITE_SUPABASE_PUBLISHABLE_KEY`, `VITE_SUPABASE_PROJECT_ID` | Browser client (public values) |
| `SUPABASE_URL`, `SUPABASE_PUBLISHABLE_KEY`, `SUPABASE_PROJECT_ID` | Server runtime |
| `SUPABASE_SERVICE_ROLE_KEY` | Server runtime only, never commit |
| `LOVABLE_API_KEY` | Server runtime only, for AI Gateway access |

Apply the SQL files in `supabase/migrations/` to set up the tables and storage policies.

Other scripts: `bun run build`, `bun run lint`, `bun run format`.

## Roadmap

- **Multi-persona tests.** Run one design against several personas and compare their reactions.
- **Side-by-side variant comparison.** Test design A against design B with per-variant scores and a diff view.
- **Team workspaces.** Shared persona libraries, shareable read-only report links and comments.
- **SparkToro API integration.** Pull audience data directly instead of uploading exports by hand.
