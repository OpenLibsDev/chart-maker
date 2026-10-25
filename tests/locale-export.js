/* Locale + export unit tests (ESM). Mocks DOM + Chart.js + fetch + URL. Run: node tests/locale-export.js */
import assert from "assert";
import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";
const __dirname = path.dirname(fileURLToPath(import.meta.url));
let lastDownload=null;
function ctxStub(){return{fillStyle:"",font:"",textBaseline:"",canvas:null,fillRect(){},drawImage(){},fillText(){},save(){},restore(){},setTransform(){},measureText(){return{width:10};},getImageData(){return{data:[]};},beginPath(){},arc(){},rect(){},clearRect(){}};}
function mkEl(t){const el={tagName:(t||"div").toUpperCase(),style:{},width:300,height:200,clientWidth:300,clientHeight:200,children:[],appendChild(x){this.children.push(x);},removeChild(){},setAttribute(){},removeAttribute(){},addEventListener(){},removeEventListener(){},getContext(){const c=ctxStub();c.canvas=el;return c;},getBoundingClientRect(){return{left:0,top:0,right:300,bottom:200,width:300,height:200};},classList:{toggle(){},add(){},remove(){}},querySelector(){return mkEl("div");},parentNode:null,toBlob(cb,mime){cb(new global.Blob([],{type:mime||"image/png"}));},click(){if(this.tagName==="A")lastDownload=this.download;}};return el;}
global.window={addEventListener(){},removeEventListener(){}};
global.document={createElement:(t)=>mkEl(t),querySelector:()=>mkEl("div"),head:mkEl("head"),body:mkEl("body"),documentElement:{style:{setProperty(){}},setAttribute(){},lang:"en"}};
global.getComputedStyle=()=>({getPropertyValue:()=>""});
global.Blob=function(parts,opts){this.type=opts&&opts.type;};
global.URL={createObjectURL:()=>"blob:x",revokeObjectURL(){}};
function Chart(c,cfg){this.canvas=c;this.config=cfg;this.width=300;this.height=200;this.ctx=c.getContext&&c.getContext("2d");}
Chart.prototype.destroy=function(){};Chart.prototype.draw=function(){};Chart.prototype.update=function(){};
Chart.register=function(){};Chart.registry={getController(){return{};}};Chart.defaults={color:"",borderColor:"",font:{family:""},animation:{}};Chart.BasicPlatform=function(){};
global.window.Chart=Chart;global.Chart=Chart;

const CM=(await import("../src/chart-maker.js")).default;
CM.registerLocale("en", JSON.parse(fs.readFileSync(path.join(__dirname,"../src/locales/en.json"),"utf8")));

CM.registerLocale("zz",{undo:"ZZ_UNDO",f_type:"ZZ_TYPE"});
const a=CM.create("#x",{locale:"zz"});
assert.strictEqual(a.t("undo"),"ZZ_UNDO","registerLocale via create locale");
assert.strictEqual(a.t("no_such_key"),"no_such_key","missing key returns key");
a.setLocale("en"); assert.strictEqual(a.t("undo"),"Undo","setLocale switches");
global.fetch=()=>Promise.resolve({ok:true,json:()=>Promise.resolve({extra_key:"EX"})});
await CM.loadLocaleJSON("en2","u");
assert.strictEqual(CM.locales.en2.extra_key,"EX","loadLocaleJSON stores");
CM.registerLocale("mm",{undo:"MM"}); CM.registerLocale("mm",{redo:"MM_REDO"});
assert.strictEqual(CM.locales.mm.undo,"MM","registerLocale keeps existing");
assert.strictEqual(CM.locales.mm.redo,"MM_REDO","registerLocale adds new");
CM.registerCountries("en",{byId:{"999":"Testland"},byName:{"Foo":"Foobar"}});
assert.ok(CM.__countries.en.byId["999"]==="Testland","registerCountries byId");
const b=CM.create("#y",{});
b.exportImage({format:"png",filename:"myfile"});
assert.strictEqual(lastDownload,"myfile.png","exportImage downloads <name>.png");
b.exportImage({format:"webp",filename:"chart2"});
assert.strictEqual(lastDownload,"chart2.webp","exportImage webp");
console.log("OK: locale (register/merge/fallback), countries pack, and export-download verified.");
