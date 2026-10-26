/*!
 * Chart-Maker v1.0.1 - chart & graph engine library (API-driven, headless, ES module).
 * Renders 21 chart types into a <canvas> in a container you provide.
 * No UI, no CSS beyond the canvas - build controls yourself and call the API.
 * Dependency: Chart.js (load first). Optional chart libs load on demand.
 * Locales are separate files (json + js); switch with instance.setLocale(code).
 * Theme via API: instance.setTheme({ fg, surface, grid, font, palette }).
 * License: MIT
 * Demo: https://openlibs.dev/en/app/chart-maker/
 */
const locales = {};

/* ===== APP CONFIG ===== */
const APP = { name: "Chart-Maker", version: "1.0.1" };

let WORLD_URL = "";

/* ===== TYPES ===== */
/* input modes: lv, xy, xyr, multi, box, tree, matrix, sankey, geo */
const TYPES = {
    bar:           { ctype: "bar",        input: "lv" },
    line:          { ctype: "line",       input: "lv" },
    area:          { ctype: "line",       input: "lv", fill: true },
    horizontalBar: { ctype: "bar",        input: "lv", horizontal: true },
    pie:           { ctype: "pie",        input: "lv" },
    doughnut:      { ctype: "doughnut",   input: "lv" },
    radar:         { ctype: "radar",      input: "lv" },
    polarArea:     { ctype: "polarArea",  input: "lv" },
    scatter:       { ctype: "scatter",    input: "xy" },
    bubble:        { ctype: "bubble",     input: "xyr" },
    stackedBar:    { ctype: "bar",        input: "multi", stacked: true },
    groupedBar:    { ctype: "bar",        input: "multi" },
    multiLine:     { ctype: "line",       input: "multi" },
    combo:         { ctype: "bar",        input: "multi", combo: true },
    errorBar:      { ctype: "barWithErrorBars", input: "err", lib: true, module: "errorbar" },
    candlestick:   { ctype: "candlestick", input: "ohlc", lib: true, module: "financial" },
    ohlc:          { ctype: "ohlc",        input: "ohlc", lib: true, module: "financial" },
    funnel:        { ctype: "funnel",      input: "lv",   lib: true, module: "funnel" },
    venn:          { ctype: "venn",        input: "venn", lib: true, module: "venn" },
    graph:         { ctype: "forceDirectedGraph", input: "graph", lib: true, module: "graph" },
    gauge:         { ctype: "doughnut", input: "gauge" },
    boxplot:       { ctype: "boxplot",    input: "box",   lib: true, module: "boxplot" },
    violin:        { ctype: "violin",     input: "box",   lib: true, module: "boxplot" },
    treemap:       { ctype: "treemap",    input: "tree",  lib: true, module: "treemap" },
    matrix:        { ctype: "matrix",     input: "matrix",lib: true, module: "matrix" },
    sankey:        { ctype: "sankey",     input: "sankey",lib: true, module: "sankey" },
    wordcloud:     { ctype: "wordCloud",  input: "lv",    lib: true, module: "wordcloud" },
    geo:           { ctype: "choropleth", input: "geo",   lib: true, module: "geo" },
    func:          { ctype: "line",       input: "func",  lib: true, module: "mathjs" }
};
const TYPE_ORDER = ["bar","line","area","horizontalBar","pie","doughnut","radar","polarArea",
    "scatter","bubble","func","stackedBar","groupedBar","multiLine","combo","errorBar","candlestick","ohlc","funnel","venn","graph","gauge",
    "boxplot","violin","treemap","matrix","sankey","wordcloud","geo"];

/* ===== ON-DEMAND MODULE LOADER ===== */
function isUrl(s) { return typeof s === "string" && /^(https?:|\/|\.\/|\.\.\/|blob:|data:)/.test(s); }
let MODULE_SRC = {
    topojson:  "topojson-client",
    matrix:    "chartjs-chart-matrix",
    treemap:   "chartjs-chart-treemap",
    sankey:    "chartjs-chart-sankey",
    boxplot:   "@sgratzl/chartjs-chart-boxplot",
    wordcloud: "chartjs-chart-wordcloud",
    geo:       "chartjs-chart-geo",
    errorbar:  "chartjs-chart-error-bars",
    financial: "chartjs-chart-financial",
    funnel:    "chartjs-chart-funnel",
    venn:      "chartjs-chart-venn",
    graph:     "chartjs-chart-graph",
    dateadapter:"chartjs-adapter-date-fns",
    datalabels:"chartjs-plugin-datalabels",
    zoom:      "chartjs-plugin-zoom",
    annotation:"chartjs-plugin-annotation",
    trendline: "chartjs-plugin-trendline",
    crosshair: "chartjs-plugin-crosshair",
    svg:       "canvas2svg",
    mathjs:    "mathjs",
    pdf:       "jspdf"
};
const MODULE_DEPS = { geo: ["topojson"], financial: ["dateadapter"] };
const _moduleCache = {};
const _pluginTried = {};
function loadScript(url) {
    return new Promise(function (resolve, reject) {
        const s = document.createElement("script");
        s.src = url;
        s.onload = function () { resolve(); };
        s.onerror = function () { reject(new Error(url)); };
        document.head.appendChild(s);
    });
}
function moduleAvailable(name) {
    if (name === "datalabels" || name === "zoom" || name === "annotation") return pluginReady(name);
    if (name === "svg") return typeof window.C2S !== "undefined";
    if (name === "mathjs") return !!(window.math && typeof window.math.evaluate === "function");
    if (name === "topojson") return !!(window.topojson && window.topojson.feature);
    if (name === "pdf") return !!(window.jspdf && window.jspdf.jsPDF);
    const ids = { matrix: "matrix", treemap: "treemap", sankey: "sankey", boxplot: "boxplot", wordcloud: "wordCloud", geo: "choropleth", errorbar: "barWithErrorBars", financial: "candlestick", funnel: "funnel", venn: "venn", graph: "forceDirectedGraph" };
    const id = ids[name]; if (!id) return false;
    try { return !!(window.Chart && window.Chart.registry && window.Chart.registry.getController(id)); } catch (e) { return false; }
}
function loadModule(name) {
    if (_moduleCache[name]) return _moduleCache[name];
    const p = (async function () {
        await ensureChart();            /* Chart.js (ESM) -> window.Chart */
        if (moduleAvailable(name)) return;
        const deps = MODULE_DEPS[name] || [];
        for (let i = 0; i < deps.length; i++) await loadModule(deps[i]);
        const m = await import(MODULE_SRC[name]);   /* esm.sh ?external=chart.js -> uses OUR Chart */
        if (name === "svg") { window.C2S = m.default || m.C2S || m; return; }
        if (name === "mathjs") { window.math = (m && m.evaluate) ? m : (m.default || m); return; }
        if (name === "topojson") { window.topojson = (m && m.feature) ? m : (m.default || m); return; }
        if (name === "pdf") { const J = (m && m.jsPDF) ? m.jsPDF : (m && m.default && m.default.jsPDF ? m.default.jsPDF : (m.default || m)); window.jspdf = window.jspdf || {}; window.jspdf.jsPDF = J; return; }
        const C = window.Chart;
        if (C && C.register) {
            const pool = [];
            const collect = function (obj) { if (!obj || typeof obj !== "object") return; Object.keys(obj).forEach(function (k) { const v = obj[k]; if (v && v.id !== undefined) pool.push(v); }); };
            collect(m); collect(m.default);
            if (pool.length) { try { C.register.apply(C, pool); } catch (e) {} }
        }
    })();
    _moduleCache[name] = p;
    return p;
}
function drawCover(ctx, img, W, H) {
    const ir = img.width / img.height, cr = W / H;
    let dw, dh, dx, dy;
    if (ir > cr) { dh = H; dw = H * ir; dx = (W - dw) / 2; dy = 0; }
    else { dw = W; dh = W / ir; dx = 0; dy = (H - dh) / 2; }
    ctx.drawImage(img, dx, dy, dw, dh);
}
let CHART_URL = "chart.js/auto";
let AVIF_URL = "@jsquash/avif";
let chartReady = null;
function ensureChart() {
    if (window.Chart) { return Promise.resolve(); }
    if (chartReady) return chartReady;
    chartReady = import(CHART_URL).then(function (m) { window.Chart = m.default || m.Chart || m; });
    return chartReady;
}
const FORMATS = [
    { v: "png", label: "PNG" }, { v: "jpeg", label: "JPEG" }, { v: "webp", label: "WEBP" },
    { v: "avif", label: "AVIF", m: "avif" }, { v: "svg", label: "SVG", m: "svg" }, { v: "pdf", label: "PDF", m: "pdf" }
];
function layoutFlow(mctx, lines, availW, gap) {
    const rows = []; let cur = []; let x = 0;
    lines.forEach(function (ln) {
        const w = mctx.measureText(ln).width;
        if (cur.length && x + w > availW) { rows.push(cur); cur = []; x = 0; }
        cur.push({ text: ln, x: x });
        x += w + gap;
    });
    if (cur.length) rows.push(cur);
    return rows;
}

/* ===== HELPERS ===== */
function parseNums(str) {
    return String(str).split(",").map(function (s) { return Number(s.trim()); }).filter(function (n) { return !isNaN(n); });
}
function parseList(str) {
    return String(str).split(",").map(function (s) { return s.trim(); }).filter(function (s) { return s.length; });
}
function hexToRgba(hex, a) {
    const n = parseInt(hex.slice(1), 16);
    return "rgba(" + ((n >> 16) & 255) + "," + ((n >> 8) & 255) + "," + (n & 255) + "," + a + ")";
}
let geoData = null;
const M49_A2 = {
"004":"AF","008":"AL","012":"DZ","024":"AO","032":"AR","051":"AM","036":"AU","040":"AT","031":"AZ",
"044":"BS","050":"BD","112":"BY","056":"BE","084":"BZ","204":"BJ","064":"BT","068":"BO","070":"BA",
"072":"BW","076":"BR","096":"BN","100":"BG","854":"BF","108":"BI","116":"KH","120":"CM","124":"CA",
"140":"CF","148":"TD","152":"CL","156":"CN","170":"CO","178":"CG","180":"CD","188":"CR","384":"CI",
"191":"HR","192":"CU","196":"CY","203":"CZ","208":"DK","262":"DJ","214":"DO","218":"EC","818":"EG",
"222":"SV","226":"GQ","232":"ER","233":"EE","231":"ET","238":"FK","246":"FI","250":"FR","266":"GA",
"270":"GM","268":"GE","276":"DE","288":"GH","300":"GR","304":"GL","320":"GT","324":"GN","624":"GW",
"328":"GY","332":"HT","340":"HN","348":"HU","352":"IS","356":"IN","360":"ID","364":"IR","368":"IQ",
"372":"IE","376":"IL","380":"IT","388":"JM","392":"JP","400":"JO","398":"KZ","404":"KE","408":"KP",
"410":"KR","414":"KW","417":"KG","418":"LA","428":"LV","422":"LB","426":"LS","430":"LR","434":"LY",
"440":"LT","442":"LU","450":"MG","454":"MW","458":"MY","466":"ML","478":"MR","484":"MX","498":"MD",
"496":"MN","499":"ME","504":"MA","508":"MZ","104":"MM","516":"NA","524":"NP","528":"NL","540":"NC",
"554":"NZ","558":"NI","562":"NE","566":"NG","578":"NO","512":"OM","586":"PK","591":"PA","598":"PG",
"600":"PY","604":"PE","608":"PH","616":"PL","620":"PT","630":"PR","634":"QA","642":"RO","643":"RU",
"646":"RW","682":"SA","686":"SN","688":"RS","694":"SL","702":"SG","703":"SK","705":"SI","090":"SB",
"706":"SO","710":"ZA","728":"SS","724":"ES","144":"LK","729":"SD","740":"SR","748":"SZ","752":"SE",
"756":"CH","760":"SY","158":"TW","762":"TJ","834":"TZ","764":"TH","626":"TL","768":"TG","780":"TT",
"788":"TN","792":"TR","795":"TM","800":"UG","804":"UA","784":"AE","826":"GB","840":"US","858":"UY",
"860":"UZ","548":"VU","862":"VE","704":"VN","887":"YE","894":"ZM","716":"ZW","250":"FR","-99":null
};
function ensureGeoData() {
    if (geoData) return Promise.resolve(geoData);
    if (!isUrl(WORLD_URL)) { setMsg(t("type_unavailable")); if (typeof console !== "undefined") console.warn("Chart-Maker: world map URL is not set. Provide it via ChartMaker.setUrls({ worldUrl: '...' })."); return Promise.reject(new Error("worldUrl not set")); }
    return loadModule("geo").then(function () {
        return fetch(WORLD_URL).then(function (r) { return r.json(); }).then(function (topo) {
            geoData = window.topojson.feature(topo, topo.objects.countries).features;
            return geoData;
        });
    });
}

function libReady(ctype) {
    try { return !!Chart.registry.getController(ctype); }
    catch (e) { return false; }
}
function pluginReady(id) {
    try { return !!(window.Chart && window.Chart.registry && window.Chart.registry.getPlugin(id)); }
    catch (e) { return false; }
}

/* ===== EXPORT ===== */
function download(name, url) {
    const a = document.createElement("a");
    a.href = url; a.download = name;
    document.body.appendChild(a); a.click(); document.body.removeChild(a);
}
function downloadBlob(blob, name, ext) {
    const url = URL.createObjectURL(blob);
    download(name + "." + ext, url);
    setTimeout(function () { URL.revokeObjectURL(url); }, 1500);
}
const _normCtx = (function () { try { return document.createElement("canvas").getContext("2d"); } catch (e) { return null; } })();
function normColor(v) {
    if (typeof v !== "string" || !_normCtx) return v;
    try { _normCtx.fillStyle = "#000000"; _normCtx.fillStyle = v; return _normCtx.fillStyle; } catch (e) { return v; }
}
function scaledCanvas(src, maxSide) {
    const scale = Math.min(1, maxSide / Math.max(src.width, src.height));
    if (scale >= 1) return src;
    const c = document.createElement("canvas");
    c.width = Math.round(src.width * scale);
    c.height = Math.round(src.height * scale);
    const cx = c.getContext("2d");
    cx.imageSmoothingEnabled = true; cx.imageSmoothingQuality = "high";
    cx.drawImage(src, 0, 0, c.width, c.height);
    return c;
}



/* ===== CONFIG / LOCALE LOADING (API) ===== */
function setUrls(o) {
    if (!o) return;
    if (o.chartUrl) CHART_URL = o.chartUrl;
    if (o.worldUrl) WORLD_URL = o.worldUrl;
    if (o.avifUrl) AVIF_URL = o.avifUrl;
    if (o.modules) for (let k in o.modules) MODULE_SRC[k] = o.modules[k];
}
function loadLocaleJS(code, url) { if (locales[code]) return Promise.resolve(); if (typeof window !== "undefined" && !window.ChartMaker) window.ChartMaker = ChartMaker; return loadScript(url); }
function loadLocaleJSON(code, url) {
    if (locales[code]) return Promise.resolve();
    return fetch(url).then(function (r) { if (!r.ok) throw new Error(url); return r.json(); }).then(function (j) { locales[code] = Object.assign(locales[code] || {}, j); });
}

const countryPacks = {};
function registerCountries(code, data) {
    const p = countryPacks[code] || (countryPacks[code] = { byId: {}, byName: {} });
    if (data && data.byId) Object.assign(p.byId, data.byId);
    if (data && data.byName) Object.assign(p.byName, data.byName);
    return ChartMaker;
}
function loadCountriesJS(code, url) { if (countryPacks[code]) return Promise.resolve(); if (typeof window !== "undefined" && !window.ChartMaker) window.ChartMaker = ChartMaker; return loadScript(url); }
function loadCountriesJSON(code, url) {
    if (countryPacks[code]) return Promise.resolve();
    return fetch(url).then(function (r) { if (!r.ok) throw new Error(url); return r.json(); }).then(function (j) { registerCountries(code, j); });
}

/* ===== PER-INSTANCE FACTORY ===== */
function createInstance(container, options) {
    let API;

    const bgPlugin = { id: "cmBg", beforeDraw: function (c) {
        const b = state.bg; if (!b || b.type === "transparent") return;
        const cx = c.ctx, W = c.width, H = c.height; cx.save();
        if (b.type === "color") { cx.fillStyle = b.color || "#ffffff"; cx.fillRect(0, 0, W, H); }
        else if (b.type === "image" && bgImg && bgImgReady) { drawCover(cx, bgImg, W, H); }
        cx.restore();
    } };
    const CARTESIAN = ["bar", "line", "scatter", "bubble", "barWithErrorBars", "lineWithErrorBars", "boxplot", "violin", "candlestick", "ohlc"];
    function newChart(cvs, cfg) {
        cfg.plugins = (cfg.plugins || []).concat([bgPlugin]);
        /* draw a crisp closing vertical line on the right of cartesian plots so the on-screen preview matches the exported image (the edge grid line is otherwise clipped on the live canvas) */
        if (CARTESIAN.indexOf(cfg.type) >= 0 && cfg.plugins.indexOf(gridRightPlugin) < 0) cfg.plugins = cfg.plugins.concat([gridRightPlugin]);
        return new Chart(cvs, cfg);
    }
    /* draws the closing vertical grid line on the right edge of the plot (time-scale charts don't always place a tick there) */
    const gridRightPlugin = { id: "cmGridRight", afterDraw: function (c) {
        const a = c.chartArea; if (!a) return; const ctx = c.ctx;
        ctx.save(); ctx.beginPath(); ctx.lineWidth = 1; ctx.strokeStyle = gridColor();
        /* draw at the plot's right edge, half a pixel inside, so the closing line is crisp and never clipped (the cartesian right padding guarantees room) */
        const x = Math.round(a.right) - 0.5;
        ctx.moveTo(x, a.top); ctx.lineTo(x, a.bottom); ctx.stroke(); ctx.restore();
    } };

let canvasEl = null;
const listeners = {};
function on(ev, cb) { (listeners[ev] = listeners[ev] || []).push(cb); return API; }
function off(ev, cb) { if (listeners[ev]) listeners[ev] = listeners[ev].filter(function (f) { return f !== cb; }); return API; }
function emit(ev, data) { (listeners[ev] || []).forEach(function (f) { try { f(data); } catch (e) {} }); }

/* ===== I18N (locale packs via ChartMaker.registerLocale / locale .js files) ===== */
let currentLocale = "";
function t(key) { const L = locales[currentLocale] || {}; return L[key] || key; }

/* ===== STATE ===== */
let state = {
    chartType: "bar",
    title: "Chart",
    datasetLabel: "Dataset 1",
    lv: [ {label:"A",value:12}, {label:"B",value:19}, {label:"C",value:7}, {label:"D",value:15} ],
    xy: [ {x:1,y:3}, {x:2,y:7}, {x:3,y:2}, {x:5,y:9}, {x:8,y:4} ],
    err: [ {label:"A",value:12,error:2}, {label:"B",value:19,error:3}, {label:"C",value:7,error:1.5}, {label:"D",value:15,error:2.5} ],
    ohlc: [ {t:"2024-01-01",o:10,h:14,l:9,c:12}, {t:"2024-01-02",o:12,h:15,l:11,c:11}, {t:"2024-01-03",o:11,h:13,l:8,c:13}, {t:"2024-01-04",o:13,h:16,l:12,c:15} ],
    venn: [ {sets:"A",value:12}, {sets:"B",value:9}, {sets:"A,B",value:4} ],
    graph: { nodes: ["A","B","C","D"], edges: [ {from:"A",to:"B"}, {from:"A",to:"C"}, {from:"B",to:"D"}, {from:"C",to:"D"} ] },
    gauge: { value: 65, max: 100, label: "" },
    animDuration: 1000, animEasing: "easeOutQuart",
    dataTitle: "",
    func: { expr: "sin(x)", xmin: -10, xmax: 10, samples: 200 },
    xyr: [ {x:1,y:3,r:8}, {x:2,y:7,r:16}, {x:3,y:2,r:10}, {x:5,y:9,r:22} ],
    multi: {
        labels: ["Q1","Q2","Q3","Q4"],
        datasets: [
            { label:"Set A", type:"bar",  data:[12,19,7,15] },
            { label:"Set B", type:"line", data:[8,11,14,9] }
        ]
    },
    box: [ {label:"Group A", values:"5,7,8,8,9,10,12,14"}, {label:"Group B", values:"3,4,6,6,7,9,9,15"} ],
    tree: [ {label:"Alpha",value:20,group:"G1"}, {label:"Beta",value:14,group:"G1"}, {label:"Gamma",value:9,group:"G2"}, {label:"Delta",value:6,group:"G2"} ],
    matrix: [ {x:"Mon",y:"AM",v:3}, {x:"Mon",y:"PM",v:6}, {x:"Tue",y:"AM",v:5}, {x:"Tue",y:"PM",v:2}, {x:"Wed",y:"AM",v:8}, {x:"Wed",y:"PM",v:4} ],
    sankey: [ {from:"A",to:"X",flow:5}, {from:"A",to:"Y",flow:3}, {from:"B",to:"X",flow:2}, {from:"X",to:"Z",flow:7} ],
    geo: [ {region:"Ukraine",value:42}, {region:"Poland",value:30}, {region:"Germany",value:55}, {region:"France",value:48}, {region:"Spain",value:22} ],
    bg: { type: "transparent", color: "#ffffff", image: null },
    gridColor: "",       /* grid / axis line color (hex); empty = follow the theme */
    chartColor: "",      /* primary series color (hex); empty = follow the theme palette */
    titleColor: "",      /* chart title text color */
    legendColor: "",     /* legend / dataset label text color */
    tickColor: "",       /* axis tick labels (numbers & letters on the grid) color */
    dataTextColor: "",   /* data list text color */
    dataBgColor: ""      /* data list background color; empty = follow the chart background */
};

/* ===== CANVAS BACKGROUND ===== */
let bgImg = null, bgImgReady = false;
function loadBgImage(dataUrl) {
    if (!dataUrl) { bgImg = null; bgImgReady = false; return; }
    bgImg = new Image(); bgImgReady = false;
    bgImg.onload = function () { bgImgReady = true; renderChart(); };
    bgImg.src = dataUrl;
}


/* ===== HISTORY ===== */
let undoStack = [];
let redoStack = [];
function snap() { return JSON.stringify(state); }
function beginChange() {
    undoStack.push(snap());
    if (undoStack.length > 100) undoStack.shift();
    redoStack.length = 0;
    emitHistory();
}
function emitHistory() {
    emit("change", { canUndo: undoStack.length > 0, canRedo: redoStack.length > 0 });
}
function undo() {
    if (!undoStack.length) return;
    redoStack.push(snap());
    state = JSON.parse(undoStack.pop());
    renderChart(); emitHistory();
    emit("statechange");
    log("j_undo", "action");
}
function redo() {
    if (!redoStack.length) return;
    undoStack.push(snap());
    state = JSON.parse(redoStack.pop());
    renderChart(); emitHistory(); emit("statechange");
    log("j_redo", "action");
}

/* ===== LOG (optional consumer callback) ===== */
let onLogCb = null;
let journalArr = [];
function log(key, type, arg) {
    const e = { time: new Date().toLocaleString(), key: key, arg: arg || "", type: type || "info" };
    journalArr.push(e);
    if (onLogCb) { try { onLogCb(key, e.type); } catch (_) {} }
    emit("log", e); emit("journal", journalArr.slice());
}
function journalText(e) { return e.key ? (t(e.key) + (e.arg ? ": " + e.arg : "")) : (e.msg || ""); }

/* ===== APPEARANCE (via API: setTheme) ===== */
let animationOn = true;
const theme = {
    fg: "#212529", surface: "#ffffff", grid: "rgba(0,0,0,0.18)",
    font: "system-ui, -apple-system, 'Segoe UI', Roboto, sans-serif",
    palette: ["#4e79a7","#f28e2b","#e15759","#76b7b2","#59a14f","#edc948","#b07aa1","#ff9da7","#9c755f","#bab0ac"]
};
function surfaceColor() { return theme.surface; }
/* the chart's effective background: a chosen solid color, otherwise the theme surface (so exports and the on-page data block match the chart) */
function chartBg() { return (state.bg && state.bg.type === "color" && state.bg.color) ? state.bg.color : theme.surface; }
function fgColor() { return theme.fg; }
function gridColor() { return (state && state.gridColor) ? state.gridColor : theme.grid; }
/* per-element color overrides (state.*Color); empty = follow the theme foreground/background */
function titleCol() { return (state && state.titleColor) ? state.titleColor : theme.fg; }
function legendCol() { return (state && state.legendColor) ? state.legendColor : theme.fg; }
function tickCol() { return (state && state.tickColor) ? state.tickColor : theme.fg; }
function dataTextCol() { return (state && state.dataTextColor) ? state.dataTextColor : theme.fg; }
function dataBgCol() { return (state && state.dataBgColor) ? state.dataBgColor : chartBg(); }
/* primary (index 0) series color can be overridden via state.chartColor; the rest follow the theme palette */
function palColor(i) {
    const p = theme.palette;
    if (i === 0 && state && state.chartColor) return state.chartColor;
    const n = p.length;
    return p[((i % n) + n) % n];
}
function applyChartColors() {
    if (window.Chart) { Chart.defaults.color = tickCol(); Chart.defaults.borderColor = gridColor(); if (Chart.defaults.font) Chart.defaults.font.family = theme.font; }
}
function setTheme(o) { if (o) for (let k in o) theme[k] = o[k]; applyChartColors(); renderChart(); }
function setAnimation(b) { animationOn = !!b; renderChart(); }



/* ===== MODULES / LIBRARIES ===== */
const modulesEnabled = { matrix: true, treemap: true, sankey: true, boxplot: true, wordcloud: true, geo: true, errorbar: true, financial: true, funnel: true, venn: true, graph: true, svg: true, avif: true, mathjs: true };
function dataLines() {
    const m = inputMode(); const out = [];
    if (m === "lv") state.lv.forEach(function (r) { out.push(r.label + ": " + r.value); });
    else if (m === "xy") state.xy.forEach(function (r) { out.push("(" + r.x + ", " + r.y + ")"); });
    else if (m === "xyr") state.xyr.forEach(function (r) { out.push("(" + r.x + ", " + r.y + ", " + r.r + ")"); });
    else if (m === "box") state.box.forEach(function (r) { out.push(r.label + ": " + r.values); });
    else if (m === "tree") state.tree.forEach(function (r) { out.push(r.label + ": " + r.value + (r.group ? " [" + r.group + "]" : "")); });
    else if (m === "matrix") state.matrix.forEach(function (r) { out.push(r.x + " / " + r.y + ": " + r.v); });
    else if (m === "sankey") state.sankey.forEach(function (r) { out.push(r.from + " \u2192 " + r.to + ": " + r.flow); });
    else if (m === "geo") state.geo.forEach(function (r) { out.push(localRegion(r.region) + ": " + r.value); });
    else if (m === "multi") { out.push(state.multi.labels.join(", ")); state.multi.datasets.forEach(function (d) { out.push(d.label + ": " + d.data.join(", ")); }); }
    else if (m === "err") (state.err || []).forEach(function (r) { out.push(r.label + ": " + r.value + " \u00b1 " + r.error); });
    else if (m === "ohlc") (state.ohlc || []).forEach(function (r) { out.push(r.t + ": O" + r.o + " H" + r.h + " L" + r.l + " C" + r.c); });
    else if (m === "venn") (state.venn || []).forEach(function (r) { out.push(r.sets + ": " + r.value); });
    else if (m === "graph") { out.push((state.graph && state.graph.nodes || []).join(", ")); (state.graph && state.graph.edges || []).forEach(function (e) { out.push(e.from + " \u2192 " + e.to); }); }
    else if (m === "gauge") { const g = state.gauge || {}; out.push((g.label ? g.label + ": " : "") + g.value + " / " + g.max); }
    else if (m === "func") { const f = state.func || {}; out.push("y = " + (f.expr || "") + ",  x ∈ [" + f.xmin + ", " + f.xmax + "]"); }
    return out;
}
/* data-list font size: scaled to the output's pixel density so it matches the chart's own labels (≈14 logical px) and never looks tiny on high-DPI exports */
function dataFontSize(width) {
    const w = Number(width) || 600;
    const cssW = (chart && chart.canvas && (chart.canvas.clientWidth || 0)) || w;
    const density = Math.max(1, w / cssW);
    return Math.max(14, Math.min(64, Math.round(14 * density)));
}
function composeCanvas(chartCanvas, includeData, transparent) {
    const fg = dataTextCol();
    const lines = includeData ? dataLines() : [];
    const cw = chartCanvas.width, ch = chartCanvas.height;
    const fs = dataFontSize(cw);
    const pad = Math.round(fs * 1.1), lh = Math.round(fs * 1.45), gap = Math.round(fs * 1.7), headH = Math.round(fs * 1.5);
    const dataFont = fs + "px sans-serif";
    let rows = [], tableH = 0;
    if (lines.length) {
        const m = document.createElement("canvas").getContext("2d");
        m.font = dataFont;
        rows = layoutFlow(m, lines, cw - pad * 2, gap);
        tableH = pad * 2 + headH + rows.length * lh;
    }
    const rpad = Math.max(2, Math.round(fs * 0.4));
    const out = document.createElement("canvas");
    out.width = cw + rpad; out.height = ch + tableH;
    const g = out.getContext("2d");
    if (!transparent) { g.fillStyle = chartBg(); g.fillRect(0, 0, out.width, out.height); }
    if (tableH) { g.fillStyle = dataBgCol(); g.fillRect(0, ch, out.width, tableH); }
    g.drawImage(chartCanvas, 0, 0);
    if (lines.length) {
        g.fillStyle = fg;
        g.textBaseline = "alphabetic";
        g.font = "bold " + Math.round(fs * 1.05) + "px sans-serif";
        g.fillText(state.dataTitle || t("f_data"), pad, ch + pad + Math.round(fs * 0.85));
        g.font = dataFont;
        rows.forEach(function (row, ri) {
            const y = ch + pad + headH + ri * lh + Math.round(fs * 0.85);
            row.forEach(function (it) { g.fillText(it.text, pad + it.x, y); });
        });
    }
    return out;
}
/* Render chart + data list into an image of EXACTLY W x H px (so the exported file matches the requested size). The data list is laid out within W, the chart is given the remaining height (and width minus the small right padding), and everything is composed into a W x H canvas. */
function renderSizedComposite(W, H, includeData, transparent) {
    W = Math.max(1, Math.round(W)); H = Math.max(1, Math.round(H));
    const fg = dataTextCol();
    const lines = includeData ? dataLines() : [];
    const fs = dataFontSize(W);
    const pad = Math.round(fs * 1.1), lh = Math.round(fs * 1.45), gap = Math.round(fs * 1.7), headH = Math.round(fs * 1.5);
    const dataFont = fs + "px sans-serif";
    const rpad = Math.max(2, Math.round(fs * 0.4));
    let rows = [], tableH = 0;
    if (lines.length) {
        const m = document.createElement("canvas").getContext("2d");
        m.font = dataFont;
        rows = layoutFlow(m, lines, W - pad * 2, gap);
        tableH = pad * 2 + headH + rows.length * lh;
    }
    const chartW = Math.max(1, W - rpad);
    const chartH = Math.max(1, H - tableH);
    const chartCanvas = sizedCanvas(chartW, chartH);
    const out = document.createElement("canvas");
    out.width = W; out.height = H;
    const g = out.getContext("2d");
    if (!transparent) { g.fillStyle = chartBg(); g.fillRect(0, 0, W, H); }
    if (tableH) { g.fillStyle = dataBgCol(); g.fillRect(0, chartH, W, tableH); }
    g.drawImage(chartCanvas, 0, 0);
    if (lines.length) {
        g.fillStyle = fg;
        g.textBaseline = "alphabetic";
        g.font = "bold " + Math.round(fs * 1.05) + "px sans-serif";
        g.fillText(state.dataTitle || t("f_data"), pad, chartH + pad + Math.round(fs * 0.85));
        g.font = dataFont;
        rows.forEach(function (row, ri) {
            const y = chartH + pad + headH + ri * lh + Math.round(fs * 0.85);
            row.forEach(function (it) { g.fillText(it.text, pad + it.x, y); });
        });
    }
    return out;
}
function colorsFor(count) {
    const arr = [];
    for (let i = 0; i < count; i++) arr.push(palColor(i));
    return arr;
}
function inputMode() { return TYPES[state.chartType].input; }


/* generic row-array table */




/* ===== CHART ===== */
let chart = null;
let _regionNamesLang = null, _regionNames = null;
function regionNames() {
    if (_regionNamesLang !== currentLocale) {
        try { _regionNames = new Intl.DisplayNames([currentLocale], { type: "region" }); } catch (e) { _regionNames = null; }
        _regionNamesLang = currentLocale;
    }
    return _regionNames;
}
function countryLabel(f) {
    const id = String(f.id);
    const nm = f.properties.name;
    const P = countryPacks[currentLocale] || {};
    if (P.byId && P.byId[id]) return P.byId[id];
    if (P.byName && P.byName[nm]) return P.byName[nm];
    const rn = regionNames();
    if (rn) {
        const a2 = M49_A2[id];
        if (a2) { try { const n = rn.of(a2); if (n && n !== a2) return n; } catch (e) {} }
        if (f.id) { try { const n2 = rn.of(id); if (n2 && n2 !== id) return n2; } catch (e) {} }
    }
    return f.properties.name;
}
function localRegion(name) {
    if (geoData) { for (let i = 0; i < geoData.length; i++) if (geoData[i].properties.name === name) return countryLabel(geoData[i]); }
    return name;
}
function setMsg(text) { emit("message", text || ""); }

function buildAnnotations() {
    const out = {};
    (state.annotations || []).forEach(function (a, i) {
        const col = a.color || "#e15759";
        const o = { borderColor: col, borderWidth: 2 };
        if (a.label) o.label = { display: true, content: a.label, color: "#fff", backgroundColor: col };
        if ((a.type || "line") === "box") {
            o.type = "box"; o.backgroundColor = hexToRgba(col, 0.15);
            if (a.axis === "x") { o.xMin = Number(a.value); o.xMax = Number(a.value2); }
            else { o.yMin = Number(a.value); o.yMax = Number(a.value2); }
        } else {
            o.type = "line";
            if (a.axis === "x") { o.xMin = Number(a.value); o.xMax = Number(a.value); }
            else { o.yMin = Number(a.value); o.yMax = Number(a.value); }
        }
        out["a" + i] = o;
    });
    return out;
}
function baseOptions(extra) {
    const o = {
        responsive: true,
        maintainAspectRatio: false,
        interaction: { mode: "nearest", intersect: false },
        plugins: {
            title: { display: !!state.title, text: state.title },
            legend: { display: true }
        }
    };
    if (!animationOn) o.animation = false;
    else o.animation = { duration: (state.animDuration != null ? Number(state.animDuration) : 1000), easing: state.animEasing || "easeOutQuart" };
    if (extra) Object.assign(o, extra);
    /* ===== built-in Chart.js options from state (v2.2) ===== */
    o.plugins = Object.assign({ title: { display: !!state.title, text: state.title }, legend: { display: true } }, o.plugins);
    o.plugins.subtitle = { display: !!state.subtitle, text: state.subtitle || "" };
    const lineish = ["line", "area", "multiLine", "scatter"].indexOf(state.chartType) >= 0;
    o.plugins.decimation = { enabled: !!state.decimation && lineish, algorithm: "lttb" };
    o.elements = Object.assign({}, o.elements);
    o.elements.line = Object.assign({}, o.elements.line, { tension: (state.tension != null ? Number(state.tension) : 0), stepped: !!state.stepped, fill: !!state.fill });
    o.spanGaps = !!state.spanGaps;
    if (state.logY) { o.scales = o.scales || {}; o.scales.y = Object.assign({}, o.scales.y, { type: "logarithmic" }); }
    if (state.stacked) { o.scales = o.scales || {}; o.scales.x = Object.assign({ stacked: true }, o.scales.x); o.scales.y = Object.assign({ stacked: true }, o.scales.y); }
    o.plugins.datalabels = { display: !!state.datalabels, color: fgColor() };
    if (state.zoom) { o.plugins.zoom = { zoom: { wheel: { enabled: true }, pinch: { enabled: true }, mode: "xy" }, pan: { enabled: true, mode: "xy" } }; }
    if (state.annotations && state.annotations.length) { o.plugins.annotation = { annotations: buildAnnotations() }; }
    o.plugins.crosshair = state.crosshair ? { line: { color: fgColor(), width: 1 }, sync: { enabled: false }, zoom: { enabled: false } } : false;
    var legOff = (o.plugins.legend && o.plugins.legend.display === false);
    o.plugins.legend = { display: legOff ? false : (state.legend !== "off"), position: state.legendPos || "top", labels: { color: legendCol() } };
    /* per-element text colors (independent of the global default used for axis ticks) */
    o.plugins.title = Object.assign({}, o.plugins.title, { color: titleCol() });
    o.plugins.subtitle = Object.assign({}, o.plugins.subtitle, { color: titleCol() });
    o.elements.point = Object.assign({}, o.elements.point, { radius: (state.pointRadius != null ? Number(state.pointRadius) : 3) });
    o.elements.line = Object.assign({}, o.elements.line, { borderWidth: (state.lineWidth != null ? Number(state.lineWidth) : 3), borderDash: state.dashed ? [6, 4] : [] });
    /* give cartesian plots a little room on the right so the closing (rightmost) vertical grid line is never clipped against the canvas edge */
    var CART_PAD = ["bar", "line", "area", "horizontalBar", "scatter", "bubble", "stackedBar", "groupedBar", "multiLine", "combo", "errorBar", "candlestick", "ohlc", "func"];
    if (CART_PAD.indexOf(state.chartType) >= 0) {
        var pad = o.layout && o.layout.padding;
        if (pad == null) pad = {};
        else if (typeof pad === "number") pad = { left: pad, right: pad, top: pad, bottom: pad };
        if (!(pad.right >= 4)) pad.right = 4;
        o.layout = Object.assign({}, o.layout, { padding: pad });
    }
    return o;
}

function renderChart() {
    const canvas = canvasEl;
    if (!canvas) return;
    if (!window.Chart) { ensureChart().then(function () { applyChartColors(); renderChart(); }); return; }
    if (chart) { chart.destroy(); chart = null; }
    applyChartColors();
    setMsg("");

    const def = TYPES[state.chartType];
    if (def.module && !libReady(def.ctype)) {
        setMsg(t("module_loading"));
        loadModule(def.module).then(function () {
            if (libReady(def.ctype)) { setMsg(""); renderChart(); }
            else {
                setMsg(t("type_unavailable")); log("j_lib_err", "error", def.module);
                if (typeof console !== "undefined") console.warn("Chart-Maker: '" + def.module + "' loaded but controller '" + def.ctype + "' is not registered.");
            }
        }).catch(function (e) {
            setMsg(t("type_unavailable")); log("j_lib_err", "error", def.module);
            if (typeof console !== "undefined") console.warn("Chart-Maker: failed to load '" + def.module + "' —", (e && e.message) || e);
        });
        return;
    }

    const needPlugins = [];
    if (state.datalabels) needPlugins.push("datalabels");
    if (state.zoom) needPlugins.push("zoom");
    if (state.annotations && state.annotations.length) needPlugins.push("annotation");
    if (state.trendline) needPlugins.push("trendline");
    if (state.crosshair) needPlugins.push("crosshair");
    const notReady = needPlugins.filter(function (n) { return !pluginReady(n) && !_pluginTried[n]; });
    if (notReady.length) {
        setMsg(t("module_loading"));
        Promise.all(notReady.map(function (n) { return loadModule(n).catch(function (e) { if (typeof console !== "undefined") console.warn("Chart-Maker: plugin '" + n + "' failed \u2014 ", (e && e.message) || e); }); }))
            .then(function () { notReady.forEach(function (n) { _pluginTried[n] = true; }); setMsg(""); renderChart(); });
        return;
    }
    const mode = def.input;
    try {
        if (mode === "lv") renderLV(canvas, def);
        else if (mode === "xy") renderXY(canvas);
        else if (mode === "xyr") renderXYR(canvas);
        else if (mode === "multi") renderMulti(canvas, def);
        else if (mode === "err") renderErr(canvas);
        else if (mode === "ohlc") renderOhlc(canvas, def);
        else if (mode === "venn") renderVenn(canvas);
        else if (mode === "graph") renderGraph(canvas);
        else if (mode === "gauge") renderGauge(canvas);
        else if (mode === "func") renderFunc(canvas);
        else if (mode === "box") renderBox(canvas, def);
        else if (mode === "tree") renderTree(canvas);
        else if (mode === "matrix") renderMatrix(canvas);
        else if (mode === "sankey") renderSankey(canvas);
        else if (mode === "geo") renderGeo(canvas);
    } catch (e) {
        setMsg(String(e && e.message || e));
        log("j_error", "error", (e && e.message || e));
    }
    /* safeguard: if the chart was created before its container had a size (renders tiny/top-left), resize once layout settles */
    if (chart && typeof requestAnimationFrame === "function") {
        requestAnimationFrame(function () {
            try {
                const host = canvasEl && canvasEl.parentNode;
                if (chart && host && host.clientWidth && Math.abs((chart.width || 0) - host.clientWidth) > 2) chart.resize();
            } catch (e) {}
        });
    }
}

function renderLV(canvas, def) {
    const labels = state.lv.map(function (r) { return r.label; });
    const data = state.lv.map(function (r) { return Number(r.value) || 0; });
    const ctype = def.ctype;
    const perPoint = ["pie", "doughnut", "polarArea", "funnel"].includes(ctype);
    const base = palColor(0);
    const pts = colorsFor(data.length);
    const isWord = state.chartType === "wordcloud";

    if (isWord) {
        chart = newChart(canvas, {
            type: "wordCloud",
            data: { labels: labels, datasets: [{ label: state.datasetLabel, data: data }] },
            options: baseOptions({ plugins: { title: { display: !!state.title, text: state.title }, legend: { display: false } } })
        });
        return;
    }

    const ds = {
        label: state.datasetLabel,
        data: data,
        backgroundColor: perPoint ? pts.map(function (c) { return hexToRgba(c, 0.75); })
            : ctype === "radar" ? hexToRgba(base, 0.3)
            : (def.fill ? hexToRgba(base, 0.25) : hexToRgba(base, 0.7)),
        borderColor: perPoint ? pts : base,
        fill: def.fill || ctype === "radar",
        pointHoverRadius: 8, pointHitRadius: 25
    };
    if (state.trendline && ctype === "line") ds.trendlineLinear = { colorMin: base, colorMax: base, lineStyle: "dotted", width: 2 };
    const opts = baseOptions();
    if (def.horizontal) opts.indexAxis = "y";
    chart = newChart(canvas, { type: ctype, data: { labels: labels, datasets: [ds] }, options: opts });
}

function renderXY(canvas) {
    const ds = { label: state.datasetLabel, data: state.xy.map(function (p) { return { x: Number(p.x), y: Number(p.y) }; }), backgroundColor: palColor(0), pointHoverRadius: 9, pointHitRadius: 25 };
    if (state.trendline) ds.trendlineLinear = { colorMin: palColor(0), colorMax: palColor(0), lineStyle: "dotted", width: 2 };
    chart = newChart(canvas, {
        type: "scatter",
        data: { datasets: [ds] },
        options: baseOptions({ scales: { x: { type: "linear", position: "bottom" }, y: { type: "linear" } } })
    });
}
function renderXYR(canvas) {
    chart = newChart(canvas, {
        type: "bubble",
        data: { datasets: [{ label: state.datasetLabel, data: state.xyr.map(function (p) { return { x: Number(p.x), y: Number(p.y), r: Number(p.r) }; }), backgroundColor: hexToRgba(palColor(0), 0.6), borderColor: palColor(0) }] },
        options: baseOptions({ scales: { x: { type: "linear", position: "bottom" }, y: { type: "linear" } } })
    });
}

function renderMulti(canvas, def) {
    const m = state.multi;
    const datasets = m.datasets.map(function (ds, i) {
        const col = palColor(i);
        const isLine = def.combo ? (ds.type === "line") : (def.ctype === "line");
        const out = {
            label: ds.label,
            type: def.combo ? (ds.type || "bar") : undefined,
            data: ds.data.slice(),
            backgroundColor: isLine ? hexToRgba(col, 0.25) : hexToRgba(col, 0.7),
            borderColor: col,
            fill: false,
            pointHoverRadius: 8, pointHitRadius: 25,
            yAxisID: ds.axis === "right" ? "y1" : "y"
        };
        if (state.trendline && isLine) out.trendlineLinear = { colorMin: col, colorMax: col, lineStyle: "dotted", width: 2 };
        return out;
    });
    const opts = baseOptions();
    if (def.stacked) opts.scales = { x: { stacked: true }, y: { stacked: true } };
    if (m.datasets.some(function (ds) { return ds.axis === "right"; })) {
        opts.scales = opts.scales || {};
        opts.scales.y = Object.assign({ position: "left" }, opts.scales.y);
        opts.scales.y1 = Object.assign({ position: "right", grid: { drawOnChartArea: false } }, opts.scales.y1);
    }
    chart = newChart(canvas, { type: def.ctype, data: { labels: m.labels.slice(), datasets: datasets }, options: opts });
}

function renderErr(canvas) {
    const labels = (state.err || []).map(function (r) { return r.label; });
    const col = palColor(0);
    const data = (state.err || []).map(function (r) { const v = Number(r.value) || 0, e = Math.abs(Number(r.error) || 0); return { y: v, yMin: v - e, yMax: v + e }; });
    chart = newChart(canvas, {
        type: "barWithErrorBars",
        data: { labels: labels, datasets: [{ label: state.datasetLabel, data: data, backgroundColor: hexToRgba(col, 0.7), borderColor: col, borderWidth: 2 }] },
        options: baseOptions()
    });
}
function splitList(x) { return String(x).split(",").map(function (s) { return s.trim(); }).filter(function (s) { return s.length; }); }
function renderGauge(canvas) {
    const g = state.gauge || { value: 0, max: 100 };
    const v = Math.max(0, Number(g.value) || 0);
    const max = Math.max(v, Number(g.max) || 100);
    const col = palColor(0);
    chart = newChart(canvas, {
        type: "doughnut",
        data: { labels: [g.label || state.datasetLabel || "", ""], datasets: [{ data: [v, Math.max(0, max - v)], backgroundColor: [col, hexToRgba(fgColor(), 0.12)], borderWidth: 0 }] },
        options: baseOptions({ rotation: -90, circumference: 180, cutout: "70%", plugins: { legend: { display: false }, tooltip: { enabled: false } } })
    });
}
function renderVenn(canvas) {
    const rows = state.venn || [];
    const data = rows.map(function (r) { return { sets: splitList(r.sets), value: Number(r.value) || 0 }; });
    chart = newChart(canvas, {
        type: "venn",
        data: { labels: rows.map(function (r) { return r.sets; }), datasets: [{ label: state.datasetLabel, data: data, backgroundColor: hexToRgba(palColor(0), 0.25), borderColor: palColor(0) }] },
        options: baseOptions({ plugins: { legend: { display: false } } })
    });
}
function renderGraph(canvas) {
    const g = state.graph || { nodes: [], edges: [] };
    const nodes = g.nodes || [];
    const idx = {}; nodes.forEach(function (n, i) { idx[n] = i; });
    const edges = (g.edges || []).map(function (e) { return { source: idx[e.from], target: idx[e.to] }; })
        .filter(function (e) { return e.source != null && e.target != null; });
    chart = newChart(canvas, {
        type: "forceDirectedGraph",
        data: { labels: nodes.slice(), datasets: [{ label: state.datasetLabel, data: nodes.map(function () { return {}; }), edges: edges, pointBackgroundColor: palColor(0), pointRadius: 6 }] },
        options: baseOptions({ plugins: { legend: { display: false } } })
    });
}
function renderFunc(canvas) {
    const f = state.func || {};
    if (!moduleAvailable("mathjs")) {
        setMsg(t("module_loading"));
        loadModule("mathjs").then(function () { if (moduleAvailable("mathjs")) { setMsg(""); if (state.chartType === "func") renderChart(); } else { setMsg(t("type_unavailable")); log("j_lib_err", "error", "mathjs"); } })
            .catch(function (e) { setMsg(t("type_unavailable")); log("j_lib_err", "error", "mathjs"); if (typeof console !== "undefined") console.warn("Chart-Maker: failed to load 'mathjs' —", (e && e.message) || e); });
        return;
    }
    let xmin = Number(f.xmin), xmax = Number(f.xmax);
    if (!isFinite(xmin)) xmin = -10;
    if (!isFinite(xmax)) xmax = 10;
    if (xmax <= xmin) xmax = xmin + 1;
    let n = parseInt(f.samples, 10); if (!(n >= 2)) n = 200; if (n > 2000) n = 2000;
    let code;
    try { code = window.math.compile(String(f.expr || "x")); }
    catch (e) { setMsg(t("func_error") + ": " + (e && e.message || e)); log("func_error", "error", (e && e.message || e)); return; }
    const pts = [];
    const step = (xmax - xmin) / (n - 1);
    for (let i = 0; i < n; i++) {
        const x = xmin + i * step;
        let y;
        try { y = code.evaluate({ x: x }); } catch (e) { y = NaN; }
        if (y && typeof y === "object" && y.re !== undefined) y = y.re;
        pts.push({ x: x, y: (typeof y === "number" && isFinite(y)) ? y : NaN });
    }
    const col = palColor(0);
    chart = newChart(canvas, {
        type: "line",
        data: { datasets: [{ label: state.datasetLabel || String(f.expr || "f(x)"), data: pts, borderColor: col, backgroundColor: hexToRgba(col, 0.15), pointRadius: 0, borderWidth: (state.lineWidth != null ? Number(state.lineWidth) : 2), tension: (state.tension != null ? Number(state.tension) : 0), fill: !!state.fill, spanGaps: false }] },
        options: baseOptions({ scales: { x: { type: "linear" } } })
    });
}
function renderOhlc(canvas, def) {
    const up = "#59a14f", down = "#e15759";
    const data = (state.ohlc || []).map(function (r) {
        return { x: (new Date(r.t)).valueOf(), o: Number(r.o), h: Number(r.h), l: Number(r.l), c: Number(r.c) };
    });
    chart = newChart(canvas, {
        type: def.ctype,
        data: { datasets: [{ label: state.datasetLabel, data: data, color: { up: up, down: down, unchanged: palColor(0) } }] },
        plugins: [gridRightPlugin],
        options: baseOptions({ scales: { x: { type: "time", time: { unit: "day" } } }, layout: { padding: { left: 2, right: 6 } } })
    });
}
function renderBox(canvas, def) {
    const labels = state.box.map(function (r) { return r.label; });
    const data = state.box.map(function (r) { return parseNums(r.values); });
    const col = palColor(0);
    chart = newChart(canvas, {
        type: def.ctype,
        data: { labels: labels, datasets: [{ label: state.datasetLabel, data: data, backgroundColor: hexToRgba(col, 0.4), borderColor: col, borderWidth: 2 }] },
        options: baseOptions()
    });
}

function renderTree(canvas) {
    const groups = state.tree.some(function (r) { return r.group; }) ? ["group"] : undefined;
    chart = newChart(canvas, {
        type: "treemap",
        data: {
            datasets: [{
                label: state.datasetLabel,
                tree: state.tree.map(function (r) { return { label: r.label, value: Number(r.value) || 0, group: r.group || "" }; }),
                key: "value",
                groups: groups,
                borderWidth: 1,
                borderColor: "rgba(0,0,0,0.2)",
                backgroundColor: function (ctx) {
                    if (ctx.type !== "data") return "rgba(0,0,0,0)";
                    return hexToRgba(palColor(ctx.dataIndex), 0.75);
                },
                labels: { display: true, color: "#fff", font: { size: 12 } }
            }]
        },
        options: baseOptions({ plugins: { title: { display: !!state.title, text: state.title }, legend: { display: false } } })
    });
}

function renderMatrix(canvas) {
    const xs = []; const ys = [];
    state.matrix.forEach(function (r) { if (xs.indexOf(r.x) < 0) xs.push(r.x); if (ys.indexOf(r.y) < 0) ys.push(r.y); });
    const vals = state.matrix.map(function (r) { return Number(r.v) || 0; });
    const min = Math.min.apply(null, vals.length ? vals : [0]);
    const max = Math.max.apply(null, vals.length ? vals : [1]);
    chart = newChart(canvas, {
        type: "matrix",
        data: {
            datasets: [{
                label: state.datasetLabel,
                data: state.matrix.map(function (r) { return { x: r.x, y: r.y, v: Number(r.v) || 0 }; }),
                backgroundColor: function (c) {
                    const v = c.raw.v; const a = (max - min) ? (v - min) / (max - min) : 0.5;
                    return hexToRgba(palColor(0), 0.15 + 0.85 * a);
                },
                borderWidth: 1,
                borderColor: "rgba(0,0,0,0.1)",
                width: function (c) { const a = c.chart.chartArea || {}; return xs.length ? (a.right - a.left) / xs.length - 2 : 20; },
                height: function (c) { const a = c.chart.chartArea || {}; return ys.length ? (a.bottom - a.top) / ys.length - 2 : 20; }
            }]
        },
        options: baseOptions({
            plugins: {
                title: { display: !!state.title, text: state.title },
                legend: { display: false },
                tooltip: { callbacks: { title: function () { return ""; }, label: function (c) { return c.raw.x + " / " + c.raw.y + ": " + c.raw.v; } } }
            },
            scales: {
                x: { type: "category", labels: xs, offset: true, grid: { display: false } },
                y: { type: "category", labels: ys, offset: true, grid: { display: false } }
            }
        })
    });
}

function renderSankey(canvas) {
    chart = newChart(canvas, {
        type: "sankey",
        data: {
            datasets: [{
                label: state.datasetLabel,
                data: state.sankey.map(function (r) { return { from: r.from, to: r.to, flow: Number(r.flow) || 0 }; }),
                colorFrom: function (c) { return palColor(c.dataIndex); },
                colorTo: function (c) { return palColor(c.dataIndex + 3); },
                colorMode: "gradient"
            }]
        },
        options: baseOptions({ plugins: { title: { display: !!state.title, text: state.title }, legend: { display: false } } })
    });
}

function renderGeo(canvas) {
    if (!libReady("choropleth")) { setMsg(t("type_unavailable")); return; }
    function draw() {
        const values = {};
        state.geo.forEach(function (r) { values[String(r.region || "").toLowerCase()] = Number(r.value) || 0; });
        const data = geoData.map(function (f) {
            return { feature: f, value: values[String(f.properties.name || "").toLowerCase()] || 0 };
        });
        chart = newChart(canvas, {
            type: "choropleth",
            data: { labels: geoData.map(function (f) { return countryLabel(f); }), datasets: [{ label: state.datasetLabel, data: data }] },
            options: baseOptions({
                plugins: {
                    title: { display: !!state.title, text: state.title },
                    legend: { display: false },
                    tooltip: { callbacks: { title: function (items) { return items.length && items[0].raw && items[0].raw.feature ? countryLabel(items[0].raw.feature) : ""; } } }
                },
                scales: {
                    projection: { axis: "x", projection: "equalEarth" },
                    color: { axis: "x", quantize: 5, legend: { position: "bottom-right", align: "bottom" } }
                }
            })
        });
    }
    if (geoData) { draw(); return; }
    setMsg(t("geo_loading"));
    /* geoData loads asynchronously; until it is ready the data list cannot map region names to localized labels, so notify once it arrives to re-render the (now localized) list */
    ensureGeoData().then(function () { setMsg(""); if (state.chartType === "geo") { draw(); emit("statechange"); } })
        .catch(function (e) { setMsg(t("j_geo_err")); log(t("j_geo_err") + ": " + (e && e.message || e), "error"); });
}
/* device-pixel ratio of the live chart canvas */
function liveDpr() {
    const cv = chart && chart.canvas;
    if (!cv) return 1;
    const css = cv.clientWidth || cv.width || 1;
    return Math.max(1, Math.min(4, Math.round((cv.width / css) || 1)));
}
/* Render the chart FRESH to a width x height pixel image: no interactions (never a tooltip), never touches the live chart.
   Rendered at logical size width/dpr with devicePixelRatio=dpr so Chart.js retina-scales the buffer back to width x height
   and draws text at the same (live-like) size — sharp, correctly sized, tooltip-free. */
function offscreenCanvas(width, height) {
    const dpr = liveDpr();
    const c = document.createElement("canvas");
    c.width = Math.max(1, Math.round(width / dpr));
    c.height = Math.max(1, Math.round(height / dpr));
    const cfg = chart.config;
    const opts = Object.assign({}, cfg.options, { responsive: false, animation: false, events: [], devicePixelRatio: dpr });
    opts.plugins = Object.assign({}, opts.plugins, { tooltip: { enabled: false } });
    const tmp = newChart(c, {
        type: cfg.type,
        data: cfg.data,
        plugins: (cfg.plugins || []).filter(function (p) { return p && p.id !== "cmBg"; }),
        options: opts,
        platform: (window.Chart && Chart.BasicPlatform) ? Chart.BasicPlatform : undefined
    });
    tmp.draw();
    const snap = document.createElement("canvas");
    snap.width = c.width; snap.height = c.height;
    snap.getContext("2d").drawImage(c, 0, 0);
    tmp.destroy();
    return snap;
}
/* Render the chart to EXACTLY w x h pixels as a high-resolution "screenshot" of the on-screen chart.
   - The chart is laid out at its on-screen (logical) size, so all of its text (axes, legend, title) scales up with the image by the same factor the data list does, instead of staying a fixed tiny size on large exports.
   - It is rendered into a buffer SUPERSAMPLED to ~3x the output (capped), then downscaled to exactly w x h with high-quality smoothing. This keeps the text crisp at every size - small exports in particular are no longer rendered below 1:1 (which was the source of the blur). */
function sizedCanvas(w, h) {
    w = Math.max(1, Math.round(w)); h = Math.max(1, Math.round(h));
    const cv = chart.canvas;
    const cssW = cv.clientWidth || Math.round(cv.width / liveDpr()) || w;
    const textScale = Math.max(0.05, w / cssW);           /* final chart-text size = 12px * textScale (matches the data list) */
    const MAXDIM = 8000;
    let ss = Math.min(3, MAXDIM / w, MAXDIM / h);          /* supersample factor, capped so the buffer stays within canvas limits */
    ss = Math.max(1, ss);
    const renderDpr = textScale * ss;                     /* buffer = cssW*renderDpr x (h/textScale)*renderDpr = w*ss x h*ss */
    const c = document.createElement("canvas");
    c.width = Math.max(1, Math.round(cssW));
    c.height = Math.max(1, Math.round(h / textScale));
    const cfg = chart.config;
    const opts = Object.assign({}, cfg.options, { responsive: false, animation: false, events: [], devicePixelRatio: renderDpr });
    opts.plugins = Object.assign({}, opts.plugins, { tooltip: { enabled: false } });
    const tmp = newChart(c, {
        type: cfg.type,
        data: cfg.data,
        plugins: (cfg.plugins || []).filter(function (p) { return p && p.id !== "cmBg"; }),
        options: opts,
        platform: (window.Chart && Chart.BasicPlatform) ? Chart.BasicPlatform : undefined
    });
    tmp.draw();
    const snap = document.createElement("canvas");
    snap.width = w; snap.height = h;
    const sctx = snap.getContext("2d");
    sctx.imageSmoothingEnabled = true; sctx.imageSmoothingQuality = "high";
    sctx.drawImage(c, 0, 0, w, h);
    tmp.destroy();
    return snap;
}
async function encodeAvif(name, size, includeData, transparent) {
    setMsg(t("avif_encoding"));
    /* let the UI paint the status before the heavy encoding starts */
    await new Promise(function (r) { setTimeout(r, 60); });
    try {
        const cnv = size ? renderSizedComposite(size.w, size.h, includeData, transparent) : composeCanvas(scaledCanvas(offscreenCanvas(chart.canvas.width, chart.canvas.height), 1600), includeData, transparent);
        /* 1) native canvas AVIF (fast where the browser can encode it) */
        const native = await new Promise(function (res) { try { cnv.toBlob(function (b) { res(b); }, "image/avif", 0.9); } catch (e) { res(null); } });
        if (native && native.type === "image/avif") {
            downloadBlob(native, name, "avif");
            setMsg("");
            log("j_export_img", "action", "AVIF");
            return;
        }
        /* 2) real WASM encoder — some browsers can view AVIF but not encode it */
        const g = cnv.getContext("2d");
        const imgData = g.getImageData(0, 0, cnv.width, cnv.height);
        let mod;
        try { mod = await import(/* @vite-ignore */ AVIF_URL); }
        catch (e) { throw new Error("encoder failed to load (" + (e && e.message || e) + ")"); }
        const enc = mod.encode || (mod.default && mod.default.encode) || mod.default;
        if (typeof enc !== "function") throw new Error("encoder not available in module");
        const buf = await Promise.race([
            enc(imgData, { quality: 60 }),
            new Promise(function (_, rej) { setTimeout(function () { rej(new Error("encoder timed out")); }, 30000); })
        ]);
        downloadBlob(new Blob([buf], { type: "image/avif" }), name, "avif");
        setMsg("");
        log("j_export_img", "action", "AVIF");
    } catch (e) {
        setMsg(t("avif_error") + ": " + (e && e.message || e));
        log("avif_error", "error", (e && e.message || e));
    }
}

function exportImage(o) {
    if (!chart) return;
    o = o || {};
    const fmt = o.format || "png";
    const name = (o.filename || "chart").trim();
    const size = (o.width > 0 && o.height > 0) ? { w: o.width, h: o.height } : null;
    const includeData = o.includeData !== false;
    const scale = Math.max(1, Math.min(3, Number(o.scale) || 1));
    /* exports always get an opaque background matching the chart (surface or chosen color); the canvas "transparent" setting only affects the chart plot backdrop, not the exported file */
    const transparent = !!o.transparent;
    if (fmt === "svg") { exportSVG(name, size, includeData, transparent); return; }
    if (fmt === "avif") { encodeAvif(name, size, includeData, transparent); return; }
    if (fmt === "pdf") { encodePdf(name, size, includeData); return; }
    const ext = fmt === "jpeg" ? "jpg" : fmt;
    try {
        let source = size ? renderSizedComposite(size.w, size.h, includeData, transparent) : composeCanvas(offscreenCanvas(Math.round(chart.canvas.width * scale), Math.round(chart.canvas.height * scale)), includeData, transparent);
        if (fmt === "jpeg") {
            const c = document.createElement("canvas");
            c.width = source.width; c.height = source.height;
            const cx = c.getContext("2d");
            cx.fillStyle = "#ffffff"; cx.fillRect(0, 0, c.width, c.height);
            cx.drawImage(source, 0, 0);
            source = c;
        }
        source.toBlob(function (blob) {
            if (!blob) { setMsg(t("avif_error")); return; }
            downloadBlob(blob, name, ext);
            log("j_export_img", "action", ext.toUpperCase());
        }, "image/" + fmt, 0.95);
    } catch (e) {
        setMsg(t("svg_error") + ": " + (e && e.message || e));
        log("j_error", "error", (e && e.message || e));
    }
}
/* PDF export: compose the chart + data into one opaque image and place it on a page of exactly its pixel size via jsPDF (loaded on demand). */
async function encodePdf(name, size, includeData) {
    setMsg(t("pdf_rendering"));
    await new Promise(function (r) { setTimeout(r, 30); });
    try {
        const cnv = size ? renderSizedComposite(size.w, size.h, includeData, false)
            : composeCanvas(offscreenCanvas(chart.canvas.width, chart.canvas.height), includeData, false);
        await loadModule("pdf");
        if (!(window.jspdf && window.jspdf.jsPDF)) throw new Error("jsPDF not available");
        const JsPDF = window.jspdf.jsPDF;
        const W = cnv.width, H = cnv.height;
        const pdf = new JsPDF({ orientation: W >= H ? "landscape" : "portrait", unit: "px", format: [W, H], compress: true });
        pdf.addImage(cnv.toDataURL("image/png"), "PNG", 0, 0, W, H);
        pdf.save(name + ".pdf");
        setMsg("");
        log("j_export_img", "action", "PDF");
    } catch (e) {
        setMsg(t("pdf_error") + ": " + (e && e.message || e));
        log("j_error", "error", (e && e.message || e));
    }
}
/* Print: open the composed chart image in a hidden iframe and trigger the browser print dialog (the user can also "Save as PDF" from there). */
function printChart(o) {
    o = o || {};
    if (!chart) return;
    try {
        const includeData = o.includeData !== false;
        const cnv = composeCanvas(offscreenCanvas(chart.canvas.width, chart.canvas.height), includeData, false);
        const url = cnv.toDataURL("image/png");
        const ifr = document.createElement("iframe");
        ifr.setAttribute("aria-hidden", "true");
        ifr.style.cssText = "position:fixed;right:0;bottom:0;width:0;height:0;border:0";
        document.body.appendChild(ifr);
        const d = ifr.contentWindow.document;
        d.open();
        d.write('<!doctype html><html><head><meta charset="utf-8"><title>' + (o.filename || "chart") + '</title><style>@page{margin:10mm}html,body{margin:0}img{max-width:100%;height:auto;display:block;margin:0 auto}</style></head><body><img src="' + url + '"></body></html>');
        d.close();
        const go = function () { try { ifr.contentWindow.focus(); ifr.contentWindow.print(); } catch (e) {} setTimeout(function () { try { document.body.removeChild(ifr); } catch (e) {} }, 1500); };
        const img = d.images && d.images[0];
        if (img && !img.complete) { img.onload = go; img.onerror = go; } else { setTimeout(go, 60); }
        log("j_print", "action");
    } catch (e) { log("j_error", "error", (e && e.message || e)); }
}

function exportSVG(name, size, includeData, transparent) {
    if (!chart) return;
    if (typeof C2S === "undefined") {
        setMsg(t("module_loading"));
        loadModule("svg").then(function () { setMsg(""); exportSVG(name, size, includeData, transparent); })
            .catch(function (e) { setMsg(t("svg_unavailable")); log(t("svg_unavailable") + ": " + (e && e.message || e), "error"); });
        return;
    }
    try {
        const src = chart.canvas;
        const dpr = liveDpr();
        /* Always draw in the chart's on-screen LOGICAL size. Chart.js labels are a fixed pixel size, so they only look right relative to the on-screen width; drawing into the requested device-pixel size (e.g. 1200) would leave the 12px text tiny. SVG is vector, so the requested size only sets the display size (width/height) below. */
        const w = src.clientWidth || Math.round(src.width / dpr) || 600;
        const chartH = src.clientHeight || Math.round(src.height / dpr) || 400;
        const lines = includeData ? dataLines() : [];
        const fs = dataFontSize(w);                                             /* data font in proportion with the chart's labels (density ~1 at the on-screen width) */
        const pad = Math.round(fs * 1.1), lh = Math.round(fs * 1.45), gap = Math.round(fs * 1.7), headH = Math.round(fs * 1.5);
        const dataFont = fs + "px sans-serif";
        let rows = [], tableH = 0;
        if (lines.length) {
            const mctx = document.createElement("canvas").getContext("2d");
            mctx.font = dataFont;
            rows = layoutFlow(mctx, lines, w - pad * 2, gap);
            tableH = pad * 2 + headH + rows.length * lh;
        }
        const h = chartH + tableH;
        const rpad = Math.round(fs * 0.4);
        const ctx = new C2S(w + rpad, h);
        if (!ctx.resetTransform) ctx.resetTransform = function () { this.setTransform(1, 0, 0, 1, 0, 0); };
        if (!ctx.getLineDash) ctx.getLineDash = function () { return this.__dash || []; };
        if (!ctx.setLineDash) ctx.setLineDash = function (d) { this.__dash = d || []; };
        if (!ctx.roundRect) ctx.roundRect = function (x, y, rw, rh) { this.rect(x, y, rw, rh); };
        if (!ctx.ellipse) ctx.ellipse = function (x, y, rx, ry, rot, st, en, ccw) { this.arc(x, y, Math.max(rx, ry), st, en, ccw); };
        ctx.clip = function () {};
        ctx.clearRect = function () {};
        ["fillStyle", "strokeStyle", "shadowColor"].forEach(function (prop) {
            let val = ctx[prop];
            try { Object.defineProperty(ctx, prop, { configurable: true, get: function () { return val; }, set: function (v) { val = normColor(v); } }); } catch (e) {}
        });
        try {
            let fontVal = ctx.font;
            Object.defineProperty(ctx, "font", { configurable: true, get: function () { return fontVal; }, set: function (v) { fontVal = (typeof v === "string") ? v.replace(/'/g, '"') : v; } });
        } catch (e) {}
        if (!transparent) { ctx.fillStyle = chartBg(); ctx.fillRect(0, 0, w + rpad, h); }
        const cfg = chart.config;
        if (cfg.type === "choropleth") {
            /* The geo projection does not fit correctly through the vector (canvas2svg) context, so render the map through the proven raster path at device resolution and embed it; the data list below stays vector text. */
            const mapCanvas = offscreenCanvas(Math.round(w * dpr), Math.round(chartH * dpr));
            ctx.drawImage(mapCanvas, 0, 0, w, chartH);
        } else {
            const realCanvas = document.createElement("canvas");
            realCanvas.width = w; realCanvas.height = chartH;
            realCanvas.getContext = function () { return ctx; };
            ctx.canvas = realCanvas;
            const tmp = newChart(realCanvas, {
                type: cfg.type,
                data: cfg.data,
                plugins: (cfg.plugins || []).filter(function (p) { return p && p.id !== "cmBg"; }),
                options: Object.assign({}, cfg.options, { responsive: false, animation: false, events: [], devicePixelRatio: 1 }),
                platform: (window.Chart && Chart.BasicPlatform) ? Chart.BasicPlatform : undefined
            });
            tmp.draw();
            tmp.destroy();
        }
        if (ctx.resetTransform) ctx.resetTransform();
        if (lines.length) {
            ctx.fillStyle = dataBgCol();
            ctx.fillRect(0, chartH, w, tableH);
            ctx.fillStyle = dataTextCol();
            ctx.font = "bold " + Math.round(fs * 1.05) + "px sans-serif";
            ctx.fillText(state.dataTitle || t("f_data"), pad, chartH + pad + Math.round(fs * 0.85));
            ctx.font = dataFont;
            rows.forEach(function (row, ri) {
                const y = chartH + pad + headH + ri * lh + Math.round(fs * 0.85);
                row.forEach(function (it) { ctx.fillText(it.text, pad + it.x, y); });
            });
        }
        let svg = ctx.getSerializedSvg(true);
        if (svg.indexOf("xmlns=") < 0) svg = svg.replace("<svg", '<svg xmlns="http://www.w3.org/2000/svg" xmlns:xlink="http://www.w3.org/1999/xlink"');
        /* The content is drawn in logical coordinates (vbW x vbH). The viewBox plus width/height="100%" and preserveAspectRatio make the file fill whatever viewport it is opened in and scale its content to fit (centered), so on a phone the whole chart fits the screen like the raster formats instead of overflowing or showing tiny in a corner. It stays crisp vector at any zoom. */
        const vbW = w + rpad, vbH = h;
        svg = svg.replace(/<svg([^>]*)>/, function (m, attrs) {
            attrs = attrs.replace(/\s(?:width|height|viewBox|style|preserveAspectRatio)="[^"]*"/g, "");
            return "<svg" + attrs + ' viewBox="0 0 ' + vbW + " " + vbH + '" preserveAspectRatio="xMidYMid meet" width="100%" height="100%">';
        });
        if (svg.indexOf("<?xml") !== 0) svg = '<?xml version="1.0" encoding="UTF-8" standalone="no"?>\n' + svg;
        const url = URL.createObjectURL(new Blob([svg], { type: "image/svg+xml;charset=utf-8" }));
        download(name + ".svg", url);
        setTimeout(function () { URL.revokeObjectURL(url); }, 1500);
        log("j_export_img", "action", "SVG");
    } catch (e) {
        setMsg(t("svg_error") + ": " + (e && e.message || e));
        log("svg_error", "error", (e && e.message || e));
    }
}
function collectAppData() { return { app: JSON.parse(JSON.stringify(state)) }; }
function saveProject(o) {
    o = o || {};
    const name = (o.filename || "chart").trim();
    const payload = { name: APP.name, version: APP.version, data: collectAppData() };
    if (o.includeHistory) {
        payload.history = { undo: undoStack, redo: redoStack };
    }
    const url = URL.createObjectURL(new Blob([JSON.stringify(payload, null, 2)], { type: "application/json" }));
    download(name + ".json", url);
    URL.revokeObjectURL(url);
    log("j_save_project", "action");
}

/* ===== IMPORT ===== */
function applyAppData(d) {
    if (d && d.app) state = d.app;
    if (!state.bg) state.bg = { type: "transparent", color: "#ffffff", image: null };
    loadBgImage(state.bg.image);
    renderChart(); emitHistory(); emit("statechange");
}

/* ===== PUBLIC API ===== */
function setLocale(code) { currentLocale = code; renderChart(); emit("locale", code); emit("statechange"); }
function getTypes() {
    return TYPE_ORDER.filter(function (k) { const m = TYPES[k].module; return !m || modulesEnabled[m]; })
        .map(function (k) { return { key: k, label: t("type_" + k), input: TYPES[k].input, ctype: TYPES[k].ctype, combo: !!TYPES[k].combo }; });
}
function setLibraries(map) {
    for (let m in map) if (m in modulesEnabled) modulesEnabled[m] = !!map[m];
    const cur = TYPES[state.chartType];
    if (cur.module && !modulesEnabled[cur.module]) state.chartType = "bar";
    renderChart(); emit("statechange");
}
function getCountries() {
    return ensureGeoData().then(function () {
        return geoData.map(function (f) { return { value: f.properties.name, label: countryLabel(f) }; })
            .sort(function (a, b) { return a.label.localeCompare(b.label, currentLocale); });
    });
}
    options = options || {};
    const host = typeof container === "string" ? document.querySelector(container) : container;
    if (!host) throw new Error("ChartMaker: container not found");
    canvasEl = document.createElement("canvas");
    canvasEl.style.display = "block"; canvasEl.style.width = "100%"; canvasEl.style.height = "100%";
    host.appendChild(canvasEl);
    onLogCb = options.onLog || null;
    if (options.urls) setUrls(options.urls);
    if (options.locale) currentLocale = options.locale;
    if (options.libraries) for (let m in options.libraries) if (m in modulesEnabled) modulesEnabled[m] = !!options.libraries[m];
    if (options.animation === false) animationOn = false;
    if (options.state) state = options.state;
    if (!state.bg) state.bg = { type: "transparent", color: "#ffffff", image: null };
    if (options.theme) setTheme(options.theme); else applyChartColors();
    loadBgImage(state.bg.image);
    renderChart(); emitHistory();
    API = {
        setType: function (v) { beginChange(); state.chartType = v; renderChart(); emit("statechange"); return API; },
        getType: function () { return state.chartType; },
        setTitle: function (s) { beginChange(); state.title = s; renderChart(); return API; },
        setDatasetLabel: function (s) { beginChange(); state.datasetLabel = s; renderChart(); return API; },
        setState: function (s) { beginChange(); applyAppData({ app: s }); return API; },
        getState: function () { return JSON.parse(JSON.stringify(state)); },
        setBackground: function (bg) { beginChange(); state.bg = Object.assign({ type: "transparent", color: "#ffffff", image: null }, state.bg, bg); loadBgImage(state.bg.image); renderChart(); return API; },
        setTheme: function (th) { setTheme(th); return API; },
        setAnimation: function (b) { setAnimation(b); return API; },
        getAnimation: function () { return animationOn; },
        getTheme: function () { return JSON.parse(JSON.stringify(theme)); },
        setLocale: function (c) { setLocale(c); return API; },
        getLocale: function () { return currentLocale; },
        setLibraries: function (m) { setLibraries(m); return API; },
        getLibraries: function () { return Object.assign({}, modulesEnabled); },
        getTypes: getTypes, getCountries: getCountries,
        getDataLines: function () { return dataLines(); },
        loadMath: function () { return loadModule("mathjs"); },
        mathReady: function () { return moduleAvailable("mathjs"); },
        evalNumber: function (v) {
            if (typeof v === "number") return v;
            const s = String(v == null ? "" : v).trim();
            if (s === "") return 0;
            const n = Number(s);
            if (!isNaN(n)) return n;
            if (window.math && window.math.evaluate) {
                try { let r = window.math.evaluate(s); if (r && typeof r === "object" && r.re !== undefined) r = r.re; const num = Number(r); return isFinite(num) ? num : NaN; }
                catch (e) { return NaN; }
            }
            return NaN;
        },
        t: t,
        render: function () { renderChart(); return API; },
        undo: function () { undo(); return API; }, redo: function () { redo(); return API; },
        canUndo: function () { return undoStack.length > 0; }, canRedo: function () { return redoStack.length > 0; },
        exportImage: function (o) { exportImage(o); return API; },
        printChart: function (o) { printChart(o); return API; },
        saveProject: function (o) { saveProject(o); return API; },
        loadProject: function (obj) { applyAppData(obj && obj.data ? obj.data : { app: obj }); return API; },
        log: function (k, ty, arg) { log(k, ty, arg); return API; },
        journalText: function (e) { return journalText(e); },
        getJournal: function () { return journalArr.slice(); },
        clearJournal: function () { journalArr = []; emit("journal", []); return API; },
        on: on, off: off,
        destroy: function () { if (chart) { chart.destroy(); chart = null; } if (canvasEl && canvasEl.parentNode) canvasEl.parentNode.removeChild(canvasEl); }
    };
    return API;
}

const ChartMaker = {
    version: APP.version,
    locales: locales,
    registerLocale: function (code, strings) { locales[code] = Object.assign(locales[code] || {}, strings); return this; },
    setUrls: setUrls,
    loadLocaleJS: loadLocaleJS,
    loadLocaleJSON: loadLocaleJSON,
    registerCountries: registerCountries,
    loadCountriesJS: loadCountriesJS,
    loadCountriesJSON: loadCountriesJSON,
    __countries: countryPacks,
    create: createInstance
};

export default ChartMaker;
export { createInstance as create, loadLocaleJS, loadLocaleJSON, setUrls, registerCountries, loadCountriesJS, loadCountriesJSON };
export const registerLocale = ChartMaker.registerLocale;
export const version = ChartMaker.version;
