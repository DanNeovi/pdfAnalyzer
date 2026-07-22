# pdf-analyzer

Browser-based PDF markup tool for redlining drawings and documents. The app UI is branded as `DraftAnnotator`, but this repository is a simple static web app — just serve the files; no build step is needed to run it. (The committed `tailwind.css` only needs rebuilding if you change utility classes — see below.)

## What It Does

- Load a PDF in the browser
- Add annotations with select, pencil, line, arrow, rectangle, circle, cloud, text, and highlight tools
- Automatically find 16, 14, and 12 gauge special stud/track cut-list rows (excluding flat straps), summarize quantities/weights, and export separated/combined CSV sections
- Undo, redo, zoom, and navigate pages
- Save the annotated result back out as a PDF
- Customize keyboard shortcuts and editor limits in Settings
- Persist shortcut and toolbar preferences in browser storage

## Quick Start

Serve the folder with any static file server, then open `pdf-annotator.html`.

```powershell
python -m http.server 8000
```

Then open:

```text
http://localhost:8000/pdf-annotator.html
```

Opening the HTML file directly may work in some browsers, but a local server is the safer option.

## Project Files

- `pdf-annotator.html`: main UI and static markup
- `app.js`: application logic for PDF rendering, annotation tools, shortcuts, settings, and export
- `material-analyzer.js`: PDF text-row parsing and summaries for special studs
- `tailwind.css`: pre-built, committed Tailwind stylesheet served locally (no runtime CDN)
- `tailwind.config.js` + `src/tailwind.input.css`: source for regenerating `tailwind.css`
- `sw.js`: cleanup worker used to unregister older service-worker installs
- `hooks/pre-commit`: stamps the build date/time into `app.js` on each commit (enable with `git config core.hooksPath hooks`)

## Dependencies

`Tailwind CSS` is pre-built into `tailwind.css` and served from this repo, so styling needs no network access. These libraries still load from CDNs (with subresource-integrity hashes) at runtime, so the first load requires network access:

- `pdf.js`
- `fabric.js`
- `pdf-lib`

### Regenerating the stylesheet

After adding or removing Tailwind utility classes in `pdf-annotator.html` or `app.js`, rebuild the stylesheet (requires Node):

```powershell
npx tailwindcss@3 -c tailwind.config.js -i src/tailwind.input.css -o tailwind.css --minify
```

### Running the special-stud parser tests

```powershell
node tests\material-analyzer.test.js
```
