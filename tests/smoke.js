/* Headless smoke test (ESM). Mocks DOM + Chart.js. Run: node tests/smoke.js */
import assert from "assert";
import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";
const __dirname = path.dirname(fileURLToPath(import.meta.url));

function ctxStub(){const c={fillStyle:"",font:"",textBaseline:"",canvas:null,fillRect(){},drawImage(){},fillText(){},save(){},restore(){},setTransform(){},measureText(){return{width:10};},getImageData(){return{data:[]};},beginPath(){},arc(){},rect(){},clearRect(){}};return c;}
function mkEl(t){const el={tagName:(t||"div").toUpperCase(),style:{},width:300,height:200,clientWidth:300,clientHeight:200,children:[],appendChild(x){this.children.push(x);},removeChild(){},setAttribute(){},removeAttribute(){},addEventListener(){},removeEventListener(){},getContext(){const c=ctxStub();c.canvas=el;return c;},getBoundingClientRect(){return{left:0,top:0,right:300,bottom:200,width:300,height:200};},classList:{toggle(){},add(){},remove(){}},querySelector(){return mkEl("div");},parentNode:null};return el;}
global.window={addEventListener(){},removeEventListener(){}};
global.document={createElement:(t)=>mkEl(t),querySelector:()=>mkEl("div"),head:mkEl("head"),body:mkEl("body"),documentElement:{style:{setProperty(){}},setAttribute(){},lang:"en"}};
global.getComputedStyle=()=>({getPropertyValue:()=>""});
function Chart(c,cfg){this.canvas=c;this.config=cfg;this.width=300;this.height=200;this.ctx=c.getContext&&c.getContext("2d");}
Chart.prototype.destroy=function(){};Chart.prototype.draw=function(){};Chart.prototype.update=function(){};
Chart.register=function(){};Chart.registry={getController(){return{};}};Chart.defaults={color:"",borderColor:"",font:{family:""},animation:{}};Chart.BasicPlatform=function(){};
global.window.Chart=Chart;global.Chart=Chart;

const CM=(await import("../src/chart-maker.js")).default;
CM.registerLocale("en", JSON.parse(fs.readFileSync(path.join(__dirname,"../src/locales/en.json"),"utf8")));

const PKG_VERSION=JSON.parse(fs.readFileSync(path.join(__dirname,"../package.json"),"utf8")).version;
assert.strictEqual(CM.version,PKG_VERSION,"version matches package.json");
assert.ok(CM.locales&&CM.locales.en,"en locale registered via API");
const a=CM.create("#a",{locale:"en"}), b=CM.create("#b",{locale:"en"});
assert.strictEqual(a.getJournal().length,0,"no render errors on create");
assert.strictEqual(a.getType(),"bar");
a.setType("line"); b.setType("pie");
assert.strictEqual(a.getType(),"line"); assert.strictEqual(b.getType(),"pie","instances independent");
a.setTitle("AAA"); b.setTitle("BBB");
assert.strictEqual(a.getState().title,"AAA"); assert.strictEqual(b.getState().title,"BBB");
a.setAnimation(false); assert.strictEqual(a.getAnimation(),false); assert.strictEqual(b.getAnimation(),true);
a.log("j_undo","action"); assert.strictEqual(a.getJournal().length,1); assert.strictEqual(b.getJournal().length,0,"journals independent");
assert.strictEqual(a.journalText(a.getJournal()[0]),"Undo","journal translatable");
let ah=0,bh=0;a.on("statechange",()=>ah++);b.on("statechange",()=>bh++);a.setType("radar");
assert.ok(ah>0&&bh===0,"events isolated");
b.setType("bar");b.undo();assert.strictEqual(b.getType(),"pie","undo isolated");
a.setTheme({fg:"#111"});assert.strictEqual(a.getTheme().fg,"#111");assert.notStrictEqual(b.getTheme().fg,"#111","theme isolated");
a.setLibraries({geo:false});assert.strictEqual(a.getLibraries().geo,false);assert.strictEqual(b.getLibraries().geo,true,"libraries isolated");
assert.strictEqual(a.t("undo"),"Undo"); assert.ok(a.getTypes().length>=20,"types");
console.log("OK: version, API-registered locale, and full instance isolation verified.");
