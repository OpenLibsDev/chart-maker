/* Build dist/esm and dist/umd from src/chart-maker.js (source is ESM). No external deps.
   Version is single-sourced from package.json and stamped into src + dist on every build. */
import fs from "fs";
import path from "path";
const VERSION = JSON.parse(fs.readFileSync("package.json", "utf8")).version;
let srcText = fs.readFileSync("src/chart-maker.js", "utf8");
const stamped = srcText
    .replace(/(\* Chart-Maker v)\d+\.\d+\.\d+/, "$1" + VERSION)
    .replace(/(const APP = \{ name: "Chart-Maker", version: ")\d+\.\d+\.\d+(" \};)/, "$1" + VERSION + "$2");
if (stamped !== srcText) { fs.writeFileSync("src/chart-maker.js", stamped); srcText = stamped; }
const SRC = srcText;
const headerEnd = SRC.indexOf("*/") + 2;
const header = SRC.slice(0, headerEnd);
const body = SRC.slice(headerEnd);
function minify(code){const hasBt=code.includes("`");const lines=code.split("\n");const out=[];let i=0;
 if(lines[0]&&lines[0].startsWith("/*!")){while(i<lines.length){out.push(lines[i]);if(lines[i].includes("*/")){i++;break;}i++;}}
 for(;i<lines.length;i++){const t=lines[i].trim();if(t===""||t.startsWith("//"))continue;if(t.startsWith("/*")&&t.endsWith("*/"))continue;out.push(hasBt?lines[i].replace(/\s+$/,""):t);}
 return out.join("\n")+"\n";}
fs.mkdirSync("dist/esm",{recursive:true});
fs.writeFileSync("dist/esm/chart-maker.esm.js",SRC);
fs.writeFileSync("dist/esm/chart-maker.esm.min.js",minify(SRC));
const ESM_ENSURE=`function ensureChart() {
    if (window.Chart) { return Promise.resolve(); }
    if (chartReady) return chartReady;
    chartReady = import(CHART_URL).then(function (m) { window.Chart = m.default || m.Chart || m; });
    return chartReady;
}`;
const UMD_ENSURE=`function ensureChart() {
    if (window.Chart) { return Promise.resolve(); }
    if (chartReady) return chartReady;
    if (!isUrl(CHART_URL)) { return Promise.reject(new Error("Chart-Maker: Chart.js is not available. Load it with <script> before Chart-Maker, or set ChartMaker.setUrls({ chartUrl: '...' }).")); }
    chartReady = loadScript(CHART_URL);
    return chartReady;
}`;
const ESM_LOADMOD=`        const m = await import(MODULE_SRC[name]);   /* esm.sh ?external=chart.js -> uses OUR Chart */
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
        }`;
const UMD_LOADMOD=`        const src = MODULE_SRC[name];
        if (!isUrl(src)) { throw new Error("Chart-Maker: URL for '" + name + "' is not set. Provide it via ChartMaker.setUrls({ modules: { " + name + ": '...' } })."); }
        await loadScript(src); /* UMD: loaded script auto-registers on window.Chart (canvas2svg->window.C2S, topojson->window.topojson) */`;
let umdBody=body;
if(umdBody.indexOf(ESM_ENSURE)<0||umdBody.indexOf(ESM_LOADMOD)<0){console.error("build.mjs: ESM loader blocks not found; aborting UMD.");process.exit(1);}
umdBody=umdBody.replace(ESM_ENSURE,UMD_ENSURE).replace(ESM_LOADMOD,UMD_LOADMOD)
 .replace(/\nexport default ChartMaker;/,"")
 .replace(/\nexport \{ createInstance as create[^}]*\};/,"")
 .replace(/\nexport const registerLocale = ChartMaker\.registerLocale;/,"")
 .replace(/\nexport const version = ChartMaker\.version;/,"");
const umd=header+"\n(function (root, factory) {\n"+
 "  if (typeof define === \"function\" && define.amd) { define([], factory); }\n"+
 "  else if (typeof module === \"object\" && module.exports) { module.exports = factory(); }\n"+
 "  else { root.ChartMaker = factory(); }\n"+
 "})(typeof self !== \"undefined\" ? self : this, function () {\n\"use strict\";\n"+
 umdBody.trim()+"\nreturn ChartMaker;\n});\n";
fs.mkdirSync("dist/umd",{recursive:true});
fs.writeFileSync("dist/umd/chart-maker.umd.js",umd);
fs.writeFileSync("dist/umd/chart-maker.umd.min.js",minify(umd));
/* CommonJS entry for Node `require()`: a .cjs is always treated as CommonJS,
   so the UMD `module.exports` branch is taken even though the package is "type":"module". */
fs.writeFileSync("dist/umd/chart-maker.umd.cjs",umd);
function copyLocales(srcDir,destDir,ext){fs.mkdirSync(destDir,{recursive:true});fs.mkdirSync(path.join(destDir,"countries"),{recursive:true});
 for(const f of fs.readdirSync(srcDir)){if(f.endsWith("."+ext))fs.copyFileSync(path.join(srcDir,f),path.join(destDir,f));}
 const cd=path.join(srcDir,"countries");if(fs.existsSync(cd))for(const f of fs.readdirSync(cd)){if(f.endsWith("."+ext))fs.copyFileSync(path.join(cd,f),path.join(destDir,"countries",f));}}
copyLocales("src/locales","dist/esm/locales","json");
copyLocales("src/locales","dist/umd/locales","js");
const kb=f=>(fs.statSync(f).size/1024).toFixed(1)+" KB";
console.log("built esm",kb("dist/esm/chart-maker.esm.min.js"),"| umd",kb("dist/umd/chart-maker.umd.min.js"));
