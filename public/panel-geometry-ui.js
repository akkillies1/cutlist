import { buildPanelGeometry, pointsFromDimensions } from './panel-geometry.js';

const $ = s => document.querySelector(s);
const fmt = n => Number(n).toLocaleString("en-IN",{maximumFractionDigits:3});
const esc = s => String(s ?? "").replace(/[&<>"]/g,c=>({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;"}[c]));
const state = {mode:"dimensions",plane:"XZ",yaw:32,pitch:24,extrusionDirection:1,model:null,sequence:1};

function field(id,label,value,step="1",min="-1000000") {
  return '<label class="pg-coordinate-field"><span>'+label+'</span><input id="'+id+'" type="number" step="'+step+'" min="'+min+'" value="'+value+'"></label>';
}
function readNum(id) { const el=$("#"+id); return el ? Number(el.value) : 0; }
function readPoint(prefix) { return {x:readNum(prefix+"X"),y:readNum(prefix+"Y"),z:readNum(prefix+"Z")}; }
function setPoint(prefix,p) { $("#"+prefix+"X").value=String(p.x);$("#"+prefix+"Y").value=String(p.y);$("#"+prefix+"Z").value=String(p.z); }
function pointsForMode() {
  if(state.mode==="three-point") return {p1:readPoint("pgP1"),p2:readPoint("pgP2"),p3:readPoint("pgP3")};
  return pointsFromDimensions({length:readNum("pgLength"),width:readNum("pgWidth"),plane:$("#pgPlane").value});
}
function modelForCurrent() {
  const points=pointsForMode();
  return buildPanelGeometry({
    ...points,
    thickness:readNum("pgThickness"),
    offsetLength:readNum("pgOffsetLength"),
    offsetWidth:readNum("pgOffsetWidth"),
    extrusionDirection:state.extrusionDirection
  });
}
function dimensionSvg(title,main,small,viewWidth=360,viewHeight=250) {
  const margin=47,availableW=viewWidth-margin*2,availableH=viewHeight-margin*2-12;
  const scale=Math.min(availableW/Math.max(main.w,1),availableH/Math.max(main.h,1));
  const w=main.w*scale,h=main.h*scale,x=(viewWidth-w)/2,y=(viewHeight-h)/2+4;
  const dimTop=y-20, dimBottom=y+h+25, dimLeft=x-22, dimRight=x+w+22;
  const line=(x1,y1,x2,y2)=>'<line x1="'+x1+'" y1="'+y1+'" x2="'+x2+'" y2="'+y2+'" stroke="#74806d" stroke-width="1" />';
  const text=(x,y,t,anchor="middle")=>'<text x="'+x+'" y="'+y+'" text-anchor="'+anchor+'" font-size="11" fill="#364133" font-family="Arial,sans-serif">'+esc(t)+'</text>';
  let art='<rect x="0" y="0" width="'+viewWidth+'" height="'+viewHeight+'" rx="8" fill="#fbfcf9"/>';
  art+=text(viewWidth/2,20,title);
  art+='<rect x="'+x+'" y="'+y+'" width="'+w+'" height="'+h+'" fill="#dfe5d9" stroke="#455540" stroke-width="1.8"/>';
  art+=line(x,dimTop,x+w,dimTop)+line(x,dimTop-5,x,dimTop+5)+line(x+w,dimTop-5,x+w,dimTop+5);
  art+=text(viewWidth/2,dimTop-6,fmt(main.w)+" mm");
  art+=line(dimLeft,y,dimLeft,y+h)+line(dimLeft-5,y,dimLeft+5,y)+line(dimLeft-5,y+h,dimLeft+5,y+h);
  art+=text(dimLeft-5,y+h/2,fmt(main.h)+" mm","end");
  art+=text(viewWidth/2,viewHeight-8,small);
  return '<svg viewBox="0 0 '+viewWidth+' '+viewHeight+'" role="img" aria-label="'+esc(title)+' dimension view">'+art+'</svg>';
}
function renderOrthographic(m) {
  const d=m.dimensions;
  $("#pgFrontSvg").innerHTML=dimensionSvg("FRONT / PANEL FACE",{w:d.length,h:d.width},"FACE · "+fmt(d.length)+" × "+fmt(d.width)+" mm");
  $("#pgPlanSvg").innerHTML=dimensionSvg("PLAN / THICKNESS",{w:d.length,h:d.thickness},"LENGTH × THICKNESS");
  $("#pgSideSvg").innerHTML=dimensionSvg("SIDE / THICKNESS",{w:d.width,h:d.thickness},"WIDTH × THICKNESS");
}
function renderIso(m) {
  const svg=$("#pgIsoSvg");
  const yaw=state.yaw*Math.PI/180, pitch=state.pitch*Math.PI/180;
  const pts=m.vertices, center={
    x:pts.reduce((a,p)=>a+p.x,0)/pts.length,
    y:pts.reduce((a,p)=>a+p.y,0)/pts.length,
    z:pts.reduce((a,p)=>a+p.z,0)/pts.length
  };
  const projected=pts.map(p=>{
    const x=p.x-center.x,y=p.y-center.y,z=p.z-center.z;
    const cx=Math.cos(yaw)*x-Math.sin(yaw)*y;
    const cy=Math.sin(yaw)*x+Math.cos(yaw)*y;
    const sy=cy*Math.cos(pitch)-z*Math.sin(pitch);
    const depth=cy*Math.sin(pitch)+z*Math.cos(pitch);
    return {x:cx,y:sy,depth};
  });
  const xs=projected.map(p=>p.x),ys=projected.map(p=>p.y);
  const rangeX=Math.max(...xs)-Math.min(...xs)||1,rangeY=Math.max(...ys)-Math.min(...ys)||1;
  const scale=Math.min(690/rangeX,365/rangeY);
  const ox=450-(Math.min(...xs)+Math.max(...xs))*scale/2;
  const oy=280-(Math.min(...ys)+Math.max(...ys))*scale/2;
  const faces=m.faces.map(f=>{
    const indices=f.id==="front"?[0,1,2,3]:f.id==="back"?[4,5,6,7]:f.id==="edge-a"?[0,1,5,4]:f.id==="edge-b"?[1,2,6,5]:f.id==="edge-c"?[2,3,7,6]:[3,0,4,7];
    const p=indices.map(i=>projected[i]);
    return {...f,p,depth:p.reduce((a,v)=>a+v.depth,0)/p.length};
  }).sort((a,b)=>a.depth-b.depth);
  let art='<rect x="0" y="0" width="900" height="560" rx="10" fill="#fafbf8"/>';
  art+='<g stroke-linejoin="round">';
  for(const f of faces) {
    const points=f.p.map(p=>(p.x*scale+ox).toFixed(2)+","+(p.y*scale+oy).toFixed(2)).join(" ");
    art+='<polygon points="'+points+'" fill="'+f.fill+'" fill-opacity="'+(f.id==="back"?.6:1)+'" stroke="'+f.stroke+'" stroke-width="2"/>';
  }
  art+='</g>';
  const dim=m.dimensions;
  art+='<text x="28" y="35" font-size="13" font-weight="700" fill="#333d30">PARAMETRIC PANEL · ISOMETRIC VIEW</text>';
  art+='<text x="28" y="56" font-size="11" fill="#596452">L '+fmt(dim.length)+' mm  ·  W '+fmt(dim.width)+' mm  ·  T '+fmt(dim.thickness)+' mm</text>';
  art+='<text x="28" y="535" font-size="10" fill="#697263">Drag rotation with the controls above. Geometry is projected from the calculated 3D vertices.</text>';
  svg.innerHTML=art;
}
function updateStatus(message,bad=false) {
  const el=$("#pgValidation");el.textContent=message;el.classList.toggle("is-error",bad);el.classList.toggle("is-success",!bad);
}
function persist() {
  const ids=["pgName","pgLength","pgWidth","pgPlane","pgThickness","pgOffsetLength","pgOffsetWidth",
    "pgP1X","pgP1Y","pgP1Z","pgP2X","pgP2Y","pgP2Z","pgP3X","pgP3Y","pgP3Z"];
  const values={mode:state.mode,yaw:state.yaw,pitch:state.pitch,extrusionDirection:state.extrusionDirection};
  ids.forEach(id=>{const el=$("#"+id);if(el)values[id]=el.value;});
  try{localStorage.setItem("dcode-panel-geometry-v1",JSON.stringify(values));}catch(e){}
}
function restore() {
  try {
    const v=JSON.parse(localStorage.getItem("dcode-panel-geometry-v1")||"null");
    if(!v||typeof v!=="object")return;
    state.mode=v.mode==="three-point"?"three-point":"dimensions";
    state.yaw=Number.isFinite(Number(v.yaw))?Number(v.yaw):state.yaw;
    state.pitch=Number.isFinite(Number(v.pitch))?Number(v.pitch):state.pitch;
    state.extrusionDirection=Number(v.extrusionDirection)===-1?-1:1;
    for(const [k,val] of Object.entries(v)) if(k.startsWith("pg")&&$("#"+k)) $("#"+k).value=val;
  }catch(e){}
}
function updateModeUI() {
  $("#pgDimensionMode").classList.toggle("active",state.mode==="dimensions");
  $("#pgThreePointMode").classList.toggle("active",state.mode==="three-point");
  $("#pgDimensionMode").setAttribute("aria-pressed",String(state.mode==="dimensions"));
  $("#pgThreePointMode").setAttribute("aria-pressed",String(state.mode==="three-point"));
  $("#pgDimFields").classList.toggle("design-hidden",state.mode!=="dimensions");
  $("#pgPointsFields").classList.toggle("design-hidden",state.mode!=="three-point");
  $("#pgModeHint").textContent=state.mode==="dimensions"
    ?"Enter the finished face dimensions and choose its working plane. Coordinates are generated from these measurements."
    :"Enter three measured 3D points. P1→P2 establishes length; the perpendicular component of P2→P3 establishes panel width.";
}
function updateAll() {
  try {
    const m=modelForCurrent();state.model=m;
    renderOrthographic(m);renderIso(m);
    const d=m.dimensions;
    $("#pgMetricFace").textContent=fmt(d.length)+" × "+fmt(d.width);
    $("#pgMetricThickness").textContent=fmt(d.thickness)+" mm";
    $("#pgMetricArea").textContent=(d.length*d.width/1000000).toFixed(3)+" m²";
    $("#pgMetricBounds").textContent=fmt(m.raw.length)+" × "+fmt(m.raw.width)+" mm raw";
    $("#pg3dYawValue").textContent=state.yaw+"°";
    $("#pg3dPitchValue").textContent=state.pitch+"°";
    const notes=[];
    if(m.offsets.length||m.offsets.width)notes.push("Offsets reduce the panel face symmetrically before the cut-list dimensions are reported.");
    notes.push("Panel proposal only · verify the specified finished/cut-size convention, material, grain and edge treatments before production.");
    updateStatus("Geometry valid · "+fmt(d.length)+" × "+fmt(d.width)+" × "+fmt(d.thickness)+" mm · "+(state.extrusionDirection<0?"reverse":"normal")+" extrusion.",false);
    $("#pgSummaryNote").textContent=notes.join(" ");
    $("#pgAddPanel").disabled=false;$("#pgAddNext").disabled=false;
    persist();
  } catch(e) {
    state.model=null;
    $("#pgFrontSvg").innerHTML='<div class="pg-empty">Valid geometry will appear here.</div>';
    $("#pgPlanSvg").innerHTML='<div class="pg-empty">Plan view unavailable.</div>';
    $("#pgSideSvg").innerHTML='<div class="pg-empty">Side view unavailable.</div>';
    $("#pgIsoSvg").innerHTML='<text x="450" y="260" text-anchor="middle" fill="#855f47" font-size="18">Geometry needs correction</text><text x="450" y="290" text-anchor="middle" fill="#855f47" font-size="12">'+esc(e.message)+"</text>";
    updateStatus(e.message,true);
    $("#pgAddPanel").disabled=true;$("#pgAddNext").disabled=true;
    $("#pgMetricFace").textContent="—";$("#pgMetricThickness").textContent="—";$("#pgMetricArea").textContent="—";$("#pgMetricBounds").textContent="—";
  }
}
function seedPointFields() {
  const pts=pointsFromDimensions({length:readNum("pgLength"),width:readNum("pgWidth"),plane:$("#pgPlane").value});
  setPoint("pgP1",pts.p1);setPoint("pgP2",pts.p2);setPoint("pgP3",pts.p3);
}
function switchView(view) {
  const two=view==="2d";
  $("#pg2dTab").classList.toggle("active",two);$("#pg3dTab").classList.toggle("active",!two);
  $("#pg2dTab").setAttribute("aria-pressed",String(two));$("#pg3dTab").setAttribute("aria-pressed",String(!two));
  $("#pg2dViews").classList.toggle("design-hidden",!two);$("#pg3dView").classList.toggle("design-hidden",two);
}
function addToCutlist(next=false) {
  if(!state.model){updateStatus("Fix the geometry before adding this part to the cut list.",true);return;}
  const part={
    id:"pg-"+Date.now().toString(36)+"-"+Math.random().toString(36).slice(2,7),
    name:String($("#pgName").value||"Custom panel").trim()||"Custom panel",
    length:state.model.dimensions.length,width:state.model.dimensions.width,
    thickness:state.model.dimensions.thickness,quantity:1,units:"mm",
    source:"Parametric Panel Geometry",
    geometryVersion:state.model.version,
    offsets:{...state.model.offsets},
    points:state.model.points
  };
  document.dispatchEvent(new CustomEvent("dcode:panel-geometry-add-to-cutlist",{detail:{part,next}}));
  updateStatus("Panel sent to the Designer Cutlist as an unapproved proposal. Check material, grain, edge treatment and cut-size convention.",false);
  if(next) {
    state.sequence++;
    $("#pgName").value="Custom panel "+String(state.sequence).padStart(2,"0");
    persist();
  }
}
export function initPanelGeometry() {
  if(!$("#panelGeometryStudio")||$("#panelGeometryStudio").dataset.initialized==="true")return;
  $("#panelGeometryStudio").dataset.initialized="true";
  restore();
  // If no saved points exist, keep the dimension controls as the canonical inputs.
  if(state.mode==="three-point")updateModeUI();
  $("#pgDimensionMode").addEventListener("click",()=>{
    state.mode="dimensions";updateModeUI();seedPointFields();updateAll();
  });
  $("#pgThreePointMode").addEventListener("click",()=>{
    if(state.mode!=="three-point")seedPointFields();
    state.mode="three-point";updateModeUI();updateAll();
  });
  $("#pgPlane").addEventListener("change",()=>{if(state.mode==="dimensions")seedPointFields();updateAll();});
  ["pgLength","pgWidth"].forEach(id=>$("#"+id).addEventListener("input",()=>{if(state.mode==="dimensions")seedPointFields();updateAll();}));
  ["pgThickness","pgOffsetLength","pgOffsetWidth","pgP1X","pgP1Y","pgP1Z","pgP2X","pgP2Y","pgP2Z","pgP3X","pgP3Y","pgP3Z","pgName"].forEach(id=>{
    $("#"+id).addEventListener("input",()=>{if(state.mode==="dimensions"&&id.startsWith("pgP"))return;updateAll();});
  });
  $("#pgExtrusion").addEventListener("click",()=>{state.extrusionDirection*=-1;$("#pgExtrusion").textContent=state.extrusionDirection<0?"Extrusion: reverse":"Extrusion: normal";updateAll();});
  $("#pg3dYaw").addEventListener("input",e=>{state.yaw=Number(e.target.value);updateAll();});
  $("#pg3dPitch").addEventListener("input",e=>{state.pitch=Number(e.target.value);updateAll();});
  $("#pg2dTab").addEventListener("click",()=>switchView("2d"));
  $("#pg3dTab").addEventListener("click",()=>switchView("3d"));
  $("#pgAddPanel").addEventListener("click",()=>addToCutlist(false));
  $("#pgAddNext").addEventListener("click",()=>addToCutlist(true));
  $("#pgExportSvg").addEventListener("click",()=>{
    if(!state.model)return;
    const svgs=[$("#pgFrontSvg").querySelector("svg"),$("#pgPlanSvg").querySelector("svg"),$("#pgSideSvg").querySelector("svg")].filter(Boolean);
    const doc='<svg xmlns="http://www.w3.org/2000/svg" width="1080" height="250" viewBox="0 0 1080 250"><g>'+svgs.map((s,i)=>'<g transform="translate('+(i*360)+',0)">'+s.innerHTML+'</g>').join("")+'</g></svg>';
    const a=document.createElement("a");a.href=URL.createObjectURL(new Blob([doc],{type:"image/svg+xml;charset=utf-8"}));a.download=(String($("#pgName").value||"DCODE-panel").replace(/[^a-z0-9_-]+/gi,"-"))+"-orthographic.svg";a.click();URL.revokeObjectURL(a.href);
  });
  updateModeUI();
  if($("#pgModeHint").textContent==="")$("#pgModeHint").textContent="Dimensioned panel mode";
  if(state.mode==="dimensions")seedPointFields();
  $("#pgExtrusion").textContent=state.extrusionDirection<0?"Extrusion: reverse":"Extrusion: normal";
  $("#pg3dYaw").value=String(state.yaw);$("#pg3dPitch").value=String(state.pitch);
  updateAll();
  switchView("2d");
}