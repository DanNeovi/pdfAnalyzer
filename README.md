# pdf-analyzer

Browser-based PDF markup tool for redlining drawings and documents. The app UI is branded as `DraftAnnotator`, but this repository is a simple static web app — just serve the files; no build step is needed to run it. (The committed `tailwind.css` only needs rebuilding if you change utility classes — see below.)

## What It Does

- Load a PDF in the browser
- Add annotations with select, pencil, line, arrow, rectangle, circle, cloud, text, and highlight tools
- Automatically find 16, 14, and 12 gauge special stud/track cut-list rows (excluding flat straps), summarize quantities/weights, and export separated/combined CSV sections
- Undo, redo, zoom, and navigate pages
- Save the annotated result back out as a PDF
- Preserve editable annotations automatically inside the saved PDF
- Customize keyboard shortcuts and editor limits in Settings
- Persist shortcut and toolbar preferences in browser storage
- Paste Windows screenshots and other clipboard images directly onto the current PDF page

## Editable annotations in saved PDFs

Saving produces one self-contained PDF. The visible annotation appearance is added
to the pages for compatibility with ordinary PDF viewers, while DraftAnnotator also
embeds the clean source PDF and the validated Fabric object package in the same file.
When that PDF is reopened in DraftAnnotator, the clean pages and editable objects are
restored automatically, so annotations can be moved, changed, or deleted without a
separate sidecar file.

The embedded annotation package is type-checked, object/depth limited, and restricted
to embedded raster images. Inserted images are limited to 20 MB and downscaled to a
maximum 2048-pixel dimension before storage. Ordinary text is written as vector PDF
text, graphical overlays are rendered at 2x and cropped to their painted bounds, and
PDF object streams are enabled for the universally visible page appearance.

Draft review saves materialize lazy annotated pages before export and serialize
autosaves per page to prevent stale requests from overwriting newer edits. Text
outside the standard PDF WinAnsi character set is rasterized automatically so
Unicode annotations cannot abort the entire save.

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
- `embedded-annotation-utils.js`: embedded PDF attachment encode/decode helpers
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

`fabric.js` is pinned to 7.4.0 with subresource integrity. PDF.js remains on its
legacy 3.11 browser build for compatibility and is always opened with
`isEvalSupported: false`, the upstream mitigation for its historical eval issue.
The page also applies a restrictive Content Security Policy.

### Regenerating the stylesheet

After adding or removing Tailwind utility classes in `pdf-annotator.html` or `app.js`, rebuild the stylesheet (requires Node):

```powershell
npx tailwindcss@3 -c tailwind.config.js -i src/tailwind.input.css -o tailwind.css --minify
```

### Running the special-stud parser tests

```powershell
node tests\material-analyzer.test.js
node tests\editor-utils.test.js
node tests\dependency-config.test.js
```
