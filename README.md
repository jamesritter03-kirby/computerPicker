# Hardware Platform Configurator

A static, dependency-free web app that walks you through choosing an industrial
computer, cellular connectivity (internal mPCIe modem or external modem/router),
an external antenna, and storage — then generates a purchasing list (bill of
materials) you can print, copy, or export as CSV.

## Features

- Step-by-step wizard: Computer → Connectivity → Modem → Antenna → Storage → Review.
- Smart rules: some computers force a modem type, require an SD card, or require
  an external antenna, and the wizard adapts the steps automatically.
- Inline **3D viewer** for STEP/STL models (Online3DViewer).
- Inline **PDF datasheet viewer** (PDF.js).
- Image galleries, distributor stock links, and buy/info links per item.
- Bill of materials with quantity, print/save-PDF, copy-as-text, and CSV export.
- Add your own options via **Manage / Add Options** (saved in the browser via
  `localStorage`).

## Project structure

```
index.html      Markup + modals (3D, gallery, datasheet)
styles.css      Styling
app.js          Wizard logic, BOM, viewers (vanilla JS, IIFE)
data.js         window.DEFAULT_CATALOG seed data (computers, modems, antennas, storage…)
models/         Local 3D models (.step/.stp)
datasheets/     Local datasheet PDFs
images/         Local product images
```

## Running locally

The app loads local model/PDF/image files with `fetch`, which browsers block on
`file://`. Serve it over HTTP instead:

```bash
python3 -m http.server 8000
# then open http://localhost:8000/index.html
```

## Publishing with GitHub Pages

This is a fully static site, so it runs on GitHub Pages with no build step:

1. Push the repo to GitHub.
2. **Settings → Pages → Source: Deploy from a branch**, choose `main` / `/ (root)`.
3. The site publishes at `https://<user>.github.io/<repo>/`.

All asset paths are relative and external libraries load over HTTPS, so it works
correctly under a project subpath.

> Note: the bundled vendor datasheets and 3D/CAD files are the property of their
> respective manufacturers. Make sure you are permitted to redistribute them
> before publishing this repository publicly.
