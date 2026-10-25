# Changelog

All notable changes to this project are documented here. The project follows [Semantic Versioning](https://semver.org/).

## 1.0.0

First public release.

- Headless, API-driven chart & graph engine on Chart.js 4, shipped as ESM + UMD (both minified).
- 29 chart types: bar, line, area, horizontal bar, pie, doughnut, radar, polar area, scatter, bubble, stacked/grouped bar, multi-line, combo, function (y=f(x)), bar with error bars, candlestick, OHLC, funnel, Venn, graph/network, gauge, box plot, violin, treemap, matrix (heatmap), sankey, word cloud, choropleth (geo).
- On-demand loading of Chart.js plugins and extra type libraries (ESM import maps or `setUrls` for UMD).
- Advanced options: subtitle, tension, stepped/filled/dashed lines, span gaps, stacked and logarithmic Y axis, decimation, legend position, point size, line width, dual Y axis, data labels, zoom/pan, annotations, trendline, crosshair.
- Colors: canvas background plus independent overrides for series, grid, title, legend, axis labels, data-list text and data-list background.
- Export: PNG, JPEG, WEBP, AVIF, vector SVG and PDF; the entered width×height is the exact pixel size; opaque background matching the chart. Print support.
- 29 UI languages with translated country names for the choropleth map.
- Light / dark / auto theming; undo/redo; journal; save/load project (JSON); multiple independent instances per page.
