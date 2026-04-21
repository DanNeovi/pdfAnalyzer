# pdf-analyzer

Browser-based PDF markup tool for redlining drawings and documents. The app UI is branded as `DraftAnnotator`, but this repository is a simple static web app with no build step.

## What It Does

- Load a PDF in the browser
- Add annotations with select, pencil, line, arrow, rectangle, circle, cloud, text, and highlight tools
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
- `manifest.json`: app metadata
- `sw.js`: cleanup worker used to unregister older service-worker installs

## Dependencies

The app loads these libraries from CDNs at runtime:

- `pdf.js`
- `fabric.js`
- `pdf-lib`
- `Tailwind CSS`

Because of that, the first load requires network access.
