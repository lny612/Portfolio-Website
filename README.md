# Nayoung Lim — portfolio

A responsive static portfolio in green and black. No runtime dependencies, paid APIs, database, or account system. Content is adapted into English from the supplied public Notion portfolio. Project artwork remains the respective creators’ property.

## Preview

Install Node.js 24, then run `npm run dev` and open http://127.0.0.1:3000. No runtime dependencies are required.

## Deploy with GitHub and Vercel

Follow [DEPLOY.md](DEPLOY.md) for the complete walkthrough. Push this local repository to GitHub and connect it to Vercel. Older ZIP exports do not include subsequent edits.

Use framework preset **Other**, install command `npm ci`, build command `npm run check`, output directory `dist`, and Node.js **24.x**. These settings are supplied by `vercel.json` and `package.json`. The build runs the checks before deployment. Subsequent pushes to the connected branch trigger deployments.

This static setup is suitable for a personal portfolio on Vercel's Hobby plan, subject to its current eligibility and usage limits. No environment variables are needed.

## Edit

- Biography, featured projects, contact, and experience: `index.html`.
- Gallery entries and PDF-based case studies: `scripts/generate-gallery.mjs` and `content/featured-projects.json`.
- Colors, layouts, and responsive behavior: `style.css`.
- English/Korean translations and the persistent language switch: `language.js`. Official product names remain unchanged. English is the default until a visitor chooses Korean. Add new visible copy to the translation dictionary when updating content.
- Game images: `assets/`.

## Local project case studies

The gallery at `projects.html` contains nine games with local case studies, including Skulls Pay the Bills and The Wand Atelier from the supplied PDF. Bone To Gather's publisher presentation is also local. Darkest Dungeon pages are excluded from publication, while original source data is retained. The Notion migration preserves block hierarchy, rich text, lists, captions, toggles, and links. Original images and cover assets are stored under `assets/`. YouTube trailers require a connection to YouTube. Store and social links intentionally lead to their original destinations.

Original content is a snapshot of the supplied public Notion projects imported on 18 October 2026. No Notion credentials or API calls are needed by the deployed site. Source blocks live in `content/<project>.json`, translations in `content/translation-source.json` and `content/translations.tsv`, and asset paths in `content/media.json`. The two generator scripts build the case studies and gallery during `npm run build`; edit source content rather than generated HTML. `npm run check` checks the build, links, media, script syntax, and language switching.

Embedded diagrams and screenshots retain the language of their original artwork. New PDF-based case study prose is available in English and Korean.

Run `node --test language.test.mjs` to check translation coverage and switching behavior.

The source for Clockwork Nabi lists inconsistent calendar dates; its detailed page preserves the original dates with a note. Bone To Gather's audience figures are attributed to the portfolio rather than represented as live Steam statistics. The education end date follows the source and should be updated when appropriate. Google Fonts is optional: local sans-serif fallbacks work if unavailable.

Interactions include scroll reveals, scroll-driven geometric rotation, a reading progress line, native expandable contribution details, anchor navigation, and external project links. Reduced-motion preferences are respected.
