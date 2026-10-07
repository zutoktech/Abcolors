# AB Colors website

Static website for [abcolors.in](https://abcolors.in), deployed to Cloudflare Workers (static assets, see `wrangler.jsonc`).
Pages are plain HTML files in the repository root; Cloudflare serves them without the `.html` extension
(for example `aboutus.html` is served at `https://abcolors.in/aboutus`).

## Folder overview

| Path | What it is |
| --- | --- |
| `*.html` | Site pages. `sign.html` and `working.html` are old drafts (not linked, `noindex`). |
| `css/main.css` | Original template styles. |
| `css/modern-navbar.css` | Header and mobile menu. |
| `css/site.css` | Shared styles: hero slider, FAQ, breadcrumbs, lightbox, responsive fixes. |
| `css/service-detail.css` | Styles for the six `service-*.html` pages and the thank-you page. |
| `css/tailwind.css` | **Generated** Tailwind CSS (see below). Do not edit by hand. |
| `js/site.js` | Mobile menu, back-to-top, hero slider, testimonials, counters, tabs. No jQuery. |
| `js/portfolio.js` | Category filters and photo lightbox on the portfolio pages. |
| `js/form-handler.js` | Sends enquiry forms to Google Sheets (Apps Script). |
| `img/opt/` | **Generated** resized WebP copies of the photos (the originals stay where they were). |
| `robots.txt`, `sitemap.xml`, `llms.txt` | Search engine and AI assistant files. |
| `_headers` | Cloudflare cache and security headers. |
| `tools/` | Build helpers (not deployed). |

## Tailwind CSS

The pages use Tailwind utility classes. They used to be compiled in the visitor's browser by the Tailwind CDN
script, which made the site slow; now they are compiled once into `css/tailwind.css`.

**If you add or change Tailwind classes in any HTML file, rebuild the CSS:**

```bash
cd tools/tailwind
npm install
npm run build
```

`npm run watch` rebuilds automatically while you edit.

## Images

Large JPG/PNG photos are converted to small WebP files in `img/opt/` (an 800px version for thumbnails and a
1600px version for the lightbox / large screens). To add a new photo:

```bash
pip install pillow
python tools/optimize-images.py "img/Signages/New Folder/new photo.jpg"
```

The script prints the generated files and a ready-to-paste `<img>` tag (always fill in a descriptive `alt` text).
`tools/image-manifest.json` keeps the file names stable.

## Checklist for a new page

1. Copy the `<head>` of a similar page and update `<title>` (about 50-60 characters), `meta description`
   (about 150 characters), `link rel="canonical"`, the `og:` tags and the JSON-LD block.
2. Keep exactly one `<h1>`, then `<h2>`/`<h3>` in order. Give every image an `alt` text and every icon-only
   link or button an `aria-label`.
3. Add the page URL (without `.html`) to `sitemap.xml` and, if it is important, to `llms.txt`.
4. Rebuild Tailwind if you used new classes.

## Enquiry forms (Google Sheets)

`js/form-handler.js` posts every enquiry to the Google Apps Script Web App URL in `GOOGLE_SCRIPT_WEB_APP_URL`
(top of the file). Follow `GOOGLE_SHEET_SETUP_GUIDE.md` to deploy `google-apps-script.js` and paste the real
`/exec` URL there.

- The visitor is sent to `thank-you.html` (which records the Google Ads conversion) only after the Apps Script
  answers `{"result":"success"}`.
- If the URL is empty or saving fails, the form shows "Send on WhatsApp" / "Call" buttons with the enquiry
  already filled in, so the lead still reaches you.
