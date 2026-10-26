# Chart-Maker

[![CI](https://github.com/openlibsdev/chart-maker/actions/workflows/ci.yml/badge.svg)](https://github.com/openlibsdev/chart-maker/actions/workflows/ci.yml)
[![npm](https://img.shields.io/npm/v/@openlibsdev/chart-maker.svg)](https://www.npmjs.com/package/@openlibsdev/chart-maker)
[![license](https://img.shields.io/badge/license-MIT-blue.svg)](LICENSE)

A headless, API-driven chart & graph engine built on [Chart.js 4](https://www.chartjs.org/), plus a ready-to-use, fully localized web UI. Dependencies load on demand as ESM via Import Maps (jsDelivr / esm.sh); the library ships as a pure ES module with an optional UMD build.

- **Demo:** https://openlibs.dev/en/app/chart-maker/
- **npm:** [`@openlibsdev/chart-maker`](https://www.npmjs.com/package/@openlibsdev/chart-maker)
- **License:** MIT

## Features

- **29 chart types** — bar, line, area, horizontal bar, pie, doughnut, radar, polar area, scatter, bubble, stacked/grouped bar, multi-line, combo, bar with error bars, candlestick, OHLC, box plot, violin, treemap, matrix (heatmap), sankey, word cloud, choropleth (geo), funnel, Venn, graph/network, gauge, function plot (y=f(x) via math.js).
- **On-demand loading** — only Chart.js core is needed up front; every plugin/type is imported the first time it is used.
- **Advanced options** — subtitle, line smoothing (tension), stepped line, fill, span gaps, stacked axes, logarithmic Y axis, decimation, data labels, zoom/pan, annotations (lines & boxes), trendline, crosshair, legend position, point size, line width, dashed lines, dual Y axis.
- **Colors** — canvas background plus independent overrides for the series, grid, title, legend, axis labels, data-list text and data-list background.
- **Export** — PNG, JPEG, WEBP, AVIF, real vector SVG and PDF; the entered width×height is the exact pixel size; opaque background matching the chart. Plus **Print**.
- **29 languages** — full UI + translated country names for the choropleth map.
- **Theming** — light / dark / auto; per-instance state.
- **Project tools** — undo/redo, journal, save/load project (JSON), import/export.
- **Multi-instance** — create many independent charts on one page.

## Install

```bash
npm i @openlibsdev/chart-maker chart.js
```

Or use it straight from a CDN (no build step) — see below.

## Quick start (ESM)

```html
<div id="chart" style="width:700px;height:420px"></div>

<!-- 1) Import map: dependencies load as ESM on demand -->
<script type="importmap">
{ "imports": {
  "chart.js": "https://esm.sh/chart.js@4.4.1",
  "chart.js/auto": "https://esm.sh/chart.js@4.4.1/auto",
  "chart.js/helpers": "https://esm.sh/chart.js@4.4.1/helpers"
}}
</script>

<!-- 2) The library is an ES module (local dist/, or a CDN) -->
<script type="module">
  import ChartMaker from "https://cdn.jsdelivr.net/npm/@openlibsdev/chart-maker/dist/esm/chart-maker.esm.js";
  const cm = ChartMaker.create("#chart", { locale: "en" });
  cm.setType("bar");
</script>
```

Self-hosting: drop the `dist/` folder on your server and import `./dist/esm/chart-maker.esm.js` (locales live next to it under `dist/esm/locales/`).

Plugins used by advanced types/options (add the ones you need to the import map):

```json
{
  "chartjs-chart-matrix": "https://esm.sh/chartjs-chart-matrix@2?external=chart.js",
  "chartjs-chart-treemap": "https://esm.sh/chartjs-chart-treemap@3?external=chart.js",
  "chartjs-chart-sankey": "https://esm.sh/chartjs-chart-sankey@0.14.0?external=chart.js",
  "@sgratzl/chartjs-chart-boxplot": "https://esm.sh/@sgratzl/chartjs-chart-boxplot@4?external=chart.js",
  "chartjs-chart-wordcloud": "https://esm.sh/chartjs-chart-wordcloud@4?external=chart.js",
  "chartjs-chart-geo": "https://esm.sh/chartjs-chart-geo@4?external=chart.js",
  "chartjs-chart-error-bars": "https://esm.sh/chartjs-chart-error-bars@4?external=chart.js",
  "chartjs-chart-financial": "https://esm.sh/chartjs-chart-financial@0.2.1?external=chart.js",
  "chartjs-adapter-date-fns": "https://esm.sh/chartjs-adapter-date-fns@3?external=chart.js",
  "chartjs-chart-funnel": "https://esm.sh/chartjs-chart-funnel?external=chart.js",
  "chartjs-chart-venn": "https://esm.sh/chartjs-chart-venn@4?external=chart.js",
  "chartjs-chart-graph": "https://esm.sh/chartjs-chart-graph@4?external=chart.js",
  "chartjs-plugin-datalabels": "https://esm.sh/chartjs-plugin-datalabels@2?external=chart.js",
  "chartjs-plugin-zoom": "https://esm.sh/chartjs-plugin-zoom@2?external=chart.js",
  "chartjs-plugin-annotation": "https://esm.sh/chartjs-plugin-annotation@3?external=chart.js",
  "chartjs-plugin-trendline": "https://esm.sh/chartjs-plugin-trendline?external=chart.js",
  "chartjs-plugin-crosshair": "https://esm.sh/chartjs-plugin-crosshair?external=chart.js",
  "topojson-client": "https://esm.sh/topojson-client@3",
  "canvas2svg": "https://esm.sh/canvas2svg@1.0.16",
  "@jsquash/avif": "https://cdn.jsdelivr.net/npm/@jsquash/avif@1.3.0/+esm",
  "mathjs": "https://esm.sh/mathjs@12",
  "jspdf": "https://esm.sh/jspdf@2.5.2"
}
```

> `?external=chart.js` makes each plugin use *your* single Chart.js instance (resolved through the import map), which is required for the plugins to register correctly.

## UMD usage (plain `<script>`)

```html
<script src="https://cdn.jsdelivr.net/npm/chart.js@4.4.1/dist/chart.umd.js"></script>
<script src="https://cdn.jsdelivr.net/npm/@openlibsdev/chart-maker/dist/umd/chart-maker.umd.min.js"></script>
<script>
  const cm = ChartMaker.create("#chart", { locale: "en" });
</script>
```

The loader is peer-aware: if Chart.js (and any plugins) are already present as globals it uses them; otherwise it loads them on demand (ESM via the import map, or UMD via `ChartMaker.setUrls({ chartUrl, modules })`).

The `demo/` folder contains complete ESM and UMD example pages.

## Localization (i18n)

The library ships **29 UI languages**, but **no locale is bundled into the core** — you load the ones you need (English included). Translated country names for the choropleth map are shipped as separate "country packs".

There are three ways to load a locale:

**1. From a CDN by URL** — simplest, works with any setup:

```js
import ChartMaker from "@openlibsdev/chart-maker";
const BASE = "https://cdn.jsdelivr.net/npm/@openlibsdev/chart-maker@1.0.1/dist/esm/locales/";
await ChartMaker.loadLocaleJSON("uk", BASE + "uk.json");
const cm = ChartMaker.create("#chart", { locale: "uk" });
```

**2. Self-hosted** — copy `dist/esm/locales/` to your public folder and point to it:

```js
await ChartMaker.loadLocaleJSON("uk", "/assets/locales/uk.json");
```

**3. Bundled import** (webpack / Vite / Rollup) — baked into your build, no runtime fetch:

```js
import ChartMaker from "@openlibsdev/chart-maker";
import uk from "@openlibsdev/chart-maker/locales/uk.json";
ChartMaker.registerLocale("uk", uk);
const cm = ChartMaker.create("#chart", { locale: "uk" });
```

> In pure Node ESM, add an import attribute: `import uk from "@openlibsdev/chart-maker/locales/uk.json" with { type: "json" };`. Bundlers accept the plain form above.

On a plain UMD page you can also load a `locales/*.js` pack via `<script>` with `ChartMaker.loadLocaleJS(code, url)`.

Country names for the choropleth map load the same way (from the `countries/` subfolder):

```js
await ChartMaker.loadCountriesJSON("uk", BASE + "countries/uk.json");
// bundled: import ukCountries from "@openlibsdev/chart-maker/locales/countries/uk.json";
```

**Available locale codes:** `ar` `bo` `ca` `cs` `de` `en` `es` `eu` `fa` `fr` `he` `hi` `hr` `hu` `id` `is` `it` `ja` `ko` `pl` `pt-BR` `pt` `ro` `ru` `sq` `tr` `uk` `zh-Hans` `zh-Hant`

## Chart types & required packages

| Type | Input | Extra package |
|------|-------|---------------|
| bar, line, area, horizontal bar, pie, doughnut, radar, polar area, scatter, bubble, stacked/grouped bar, multi-line, combo | built-in | — (Chart.js core) |
| gauge | value / max | — (Chart.js core) |
| function (y=f(x)) | expression + range | mathjs |
| bar with error bars | label / value / error | chartjs-chart-error-bars |
| candlestick, OHLC | date + O/H/L/C | chartjs-chart-financial + chartjs-adapter-date-fns |
| box plot, violin | label + values | @sgratzl/chartjs-chart-boxplot |
| treemap | label + value | chartjs-chart-treemap |
| matrix (heatmap) | x / y / value | chartjs-chart-matrix |
| sankey | from / to / flow | chartjs-chart-sankey |
| word cloud | word + weight | chartjs-chart-wordcloud |
| choropleth (geo) | country + value | chartjs-chart-geo + topojson-client + world-atlas |
| funnel | label + value | chartjs-chart-funnel |
| Venn | sets + value | chartjs-chart-venn |
| graph (network) | nodes + edges | chartjs-chart-graph |

## Export & print

PNG / JPEG / WEBP / AVIF / SVG / PDF. The entered width×height is the exact pixel size of the file; the image gets an opaque background matching the chart. SVG is true vector via `canvas2svg`; AVIF uses the `@jsquash/avif` WASM encoder; PDF uses `jspdf` (loaded on demand). `cm.printChart()` opens the browser print dialog (print or Save as PDF).

## API (essentials)

```js
const cm = ChartMaker.create(container, { locale, urls });
cm.setType("line"); cm.setTitle("..."); cm.setState({...}); cm.getState();
cm.setBackground({ type:"color", color:"#0b1021" });
cm.setTheme({...}); cm.setLocale("uk"); cm.t("key");
cm.render(); cm.undo(); cm.redo();
cm.exportImage({ format:"png", width:1200, height:800, includeData:true, filename:"chart" });
cm.printChart({ filename:"chart" });
cm.saveProject(); cm.loadProject(json);
cm.on("statechange", fn); cm.destroy();
ChartMaker.loadLocaleJSON(code, url);
ChartMaker.loadCountriesJSON(code, url);
```

Per-element colors are state fields (empty = follow the theme): `chartColor`, `gridColor`, `titleColor`, `legendColor`, `tickColor`, `dataTextColor`, `dataBgColor` — set them through `cm.setState(...)`.

Named exports: `create, registerLocale, loadLocaleJS, loadLocaleJSON, registerCountries, loadCountriesJS, loadCountriesJSON, setUrls, version`.

## Project structure

```
src/        chart-maker.js (source) + locales/ (json + js, countries/)
dist/       built library — esm/ + umd/ (each with locales/), committed
demo/       ESM and UMD example pages
tests/      smoke + locale/export tests (run in Node, no deps)
build.mjs   zero-dependency builder (src/ → dist/)
```

## Build & test

```bash
node build.mjs   # generates dist/ (ESM + UMD, each minified) from src/ — zero external deps
npm test         # headless smoke + locale/export tests
```

`dist/` is committed so the library can be used directly (CDN / drop-on-server) without a build step; CI rebuilds and verifies it is up to date.

## License

MIT. Demo: https://openlibs.dev/en/app/chart-maker/
