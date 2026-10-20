# Nayoung Lim — portfolio

A responsive static portfolio in green and black. No runtime dependencies, paid APIs, database, or account system. Content is adapted into English from the supplied public Notion portfolio. Project artwork remains the respective creators’ property.

## Preview

Install Node.js 24, then run `npm run dev` and open http://127.0.0.1:3000. No runtime dependencies are required.

## Deploy with GitHub and Vercel

Follow [DEPLOY.md](DEPLOY.md) for the complete walkthrough. A clean source ZIP is provided locally at `exports/portfolio-github.zip`: extract it and upload its contents to GitHub.

Use framework preset **Other**, install command `npm ci`, build command `npm run check`, output directory `dist`, and Node.js **24.x**. These settings are supplied by `vercel.json` and `package.json`. The build runs all five checks before deployment. Subsequent pushes to the connected branch trigger deployments.

This static setup is suitable for a personal portfolio on Vercel's Hobby plan, subject to its current eligibility and usage limits. No environment variables are needed.

## Edit

- Biography, featured projects, contact, and experience: `index.html`.
- Additional project links: `app.js`.
- Colors, layouts, and responsive behavior: `style.css`.
- English/Korean translations and the persistent language switch: `language.js`. Official product names remain unchanged. English is the default until a visitor chooses Korean. Add new visible copy to the translation dictionary when updating content.
- Game images: `assets/`.

## Local project case studies

All eight project entries have local pages under `projects/`. Bone To Gather's publisher presentation and the full Darkest Dungeon analysis are also local pages. The migration preserves the project block hierarchy, rich text, lists, captions, toggles, and links. Thirty images and cover assets are stored under `assets/projects/`. YouTube trailers are embedded; playing a trailer still requires a connection to YouTube. Store links, social links, and research references intentionally lead to their original external destinations.

Content is a snapshot of the supplied public Notion projects imported on 18 October 2026. No Notion connection, credentials, or API calls are needed by the deployed site. Source blocks live in `content/<project>.json`, translations in `content/translation-source.json` and `content/translations.tsv`, and asset paths in `content/media.json`. `scripts/generate-projects.mjs` builds the ten HTML pages during `npm run build`; edit source content rather than generated HTML. `node --test project.test.mjs language.test.mjs` checks migration coverage, links, media, and language switching.

The Korean analysis is preserved as written. Inconsistencies in the source (including Clockwork Nabi's date range and a reference to excluding autosaving) are retained and noted rather than silently rewritten. Embedded diagrams and screenshots retain the language of their original artwork.

Run `node --test language.test.mjs` to check translation coverage and switching behavior.

The source for Clockwork Nabi lists inconsistent calendar dates; its homepage summary uses the documented nine-month duration, and its detailed page preserves the original dates with a note. Bone To Gather's audience figures are attributed to the portfolio rather than represented as live Steam statistics. The education end date follows the source and should be updated when appropriate. Google Fonts is optional: local sans-serif fallbacks work if unavailable.

Interactions include scroll reveals, scroll-driven geometric rotation, a reading progress line, native expandable contribution details, anchor navigation, and external project links. Reduced-motion preferences are respected.
