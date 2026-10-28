// Independent assembly geometry; uses cuboid bounds in the local renderer.

const $ = s => document.querySelector(s);
const fmt = n => Number(n).toLocaleString("en-IN",{maximumFractionDigits:2});
const esc = s => String(s ?? "").replace(/[&<>"']/g,c=>({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;"}[c]));
const STORAGE_KEY="dcode-assembly-studio-v1";
const typeLabels={board:"Board panel",mirror:"Mirror",glass:"Glass",hardware:"Hardware / fitting",decorative:"Decorative object"};
const typeColors={board:"#dce3d6",mirror:"#9dc4c9",glass:"#c2dde4",hardware:"#555d62",decorative:"#c5a57b"};
let objects=[],editingId=null,yaw=35,pitch=25,initialized=false,generatedStamp="",importedDesignSource=null;

function id(){return "as-"+Date.now().toString(36)+"-"+Math.random().toString(36).slice(2,7);}
function number(id, fallback=0){const el=$("#"+id);return el&&el.value.trim()!==""?Number(el.value):fallback;}
function set(id,value){const el=$("#"+id);if(el)el.value=String(value);}
function clone(v){return JSON.parse(JSON.stringify(v));}
function positive(n){return Number.isFinite(n)&&n>0;}
function constraintInputs(){
 return {preset:$("#asPreset")?.value||"wardrobe",width:number("asCabWidth"),height:number("asCabHeight"),depth:number("asCabDepth"),boardThickness:number("asBoardT"),backThickness:number("asBackT"),shelves:Math.floor(number("asShelfCount",2)),partitions:Math.floor(number("asPartitionCount",1)),frontGap:number("asFrontGap",3),minOpening:number("asMinOpening",100),jointSystem:$("#asJointSystem")?.value||"butt-confirmat",backMount:$("#asBackMount")?.value||"overlay"};
}
function constraintInputStamp(value=constraintInputs()){return JSON.stringify(value);}
function applyConstraintInputs(value){
 if(!value||typeof value!=="object")return;
 const map={preset:"asPreset",width:"asCabWidth",height:"asCabHeight",depth:"asCabDepth",boardThickness:"asBoardT",backThickness:"asBackT",shelves:"asShelfCount",partitions:"asPartitionCount",frontGap:"asFrontGap",minOpening:"asMinOpening",jointSystem:"asJointSystem",backMount:"asBackMount"};
 Object.entries(map).forEach(([key,elementId])=>{if(value[key]!=null&&$("#"+elementId))$("#"+elementId).value=String(value[key]);});
}
function importDesignStudioState(detail={}){
 const numericKeys=['width','height','depth','boardThickness','backThickness','shelves','partitions','frontGap'];
 if(numericKeys.some(key=>!Number.isFinite(Number(detail[key])))||![detail.width,detail.height,detail.depth,detail.boardThickness,detail.backThickness].every(v=>Number(v)>0)){
  const status=$("#asDesignSyncStatus");if(status)status.textContent="Import failed: Design Studio did not provide valid positive dimensions. Correct the design inputs and try again.";return;
 }
 const next={...constraintInputs(),preset:detail.preset==='tv-console'?'tv-console':'wardrobe',width:Number(detail.width),height:Number(detail.height),depth:Number(detail.depth),boardThickness:Number(detail.boardThickness),backThickness:Number(detail.backThickness),shelves:Math.floor(Number(detail.shelves)),partitions:Math.floor(Number(detail.partitions)),frontGap:Number(detail.frontGap)||3,backMount:detail.backMount==='inset'?'inset':'overlay'};
 importedDesignSource={name:String(detail.designName||'Furniture design'),revision:String(detail.sourceRevision||''),template:String(detail.template||''),importedAt:new Date().toISOString()};
 applyConstraintInputs(next);renderConstraintReport();persist();
 const status=$("#asDesignSyncStatus");if(status)status.textContent="Imported from Design Studio: "+String(detail.designName||"Furniture design")+" · "+next.width+" × "+next.height+" × "+next.depth+" mm. Existing objects were not rebuilt. Review constraints, then choose Build assembly preset to regenerate; unsaved manual objects may be replaced by that action.";
}
function readForm(){
 const type=$("#asType").value, length=number("asLength"), width=number("asWidth"), thickness=number("asThickness"), quantity=number("asQty",1);
 return {
  id:editingId||id(),type,name:$("#asName").value.trim()||typeLabels[type],length,width,thickness,quantity,
  orientation:$("#asOrientation").value,position:{x:number("asX"),y:number("asY"),z:number("asZ")},
  material:$("#asMaterial")?.value||"",colourName:$("#asColourName")?.value.trim()||"",decorCode:$("#asDecorCode")?.value.trim()||"",finishColor:$("#asFinishColor")?.value||typeColors[type]||typeColors.board,grain:$("#asGrain")?.value||"verify",edgeBand:$("#asEdgeBand")?.value||"verify",
  source:"Assembly Studio",status:"Needs review"
 };
}
function sizeOf(o){
 if(o.orientation==="side")return {x:o.thickness,y:o.width,z:o.length};
 if(o.orientation==="horizontal")return {x:o.length,y:o.width,z:o.thickness};
 return {x:o.length,y:o.thickness,z:o.width};
}
function validObject(o){return positive(o.length)&&positive(o.width)&&positive(o.thickness)&&Number.isInteger(o.quantity)&&o.quantity>0&&[o.position.x,o.position.y,o.position.z].every(Number.isFinite);}
function persist(){
 const parameters=constraintInputs();
 const snapshot={version:3,objects:clone(objects),yaw,pitch,parameters,constraintStamp:generatedStamp,sourceDesign:importedDesignSource?clone(importedDesignSource):null,updatedAt:new Date().toISOString()};
 try{localStorage.setItem(STORAGE_KEY,JSON.stringify(snapshot));$("#asSaveStatus").textContent="Saved in this browser · "+new Date().toLocaleTimeString([],{hour:"2-digit",minute:"2-digit"});}
 catch(e){$("#asSaveStatus").textContent="Local storage unavailable · export schedules as backup";}
 document.dispatchEvent(new CustomEvent("dcode:assembly-changed",{detail:{assembly:clone(snapshot)}}));
}
function addBoard(name,l,w,t,orientation,x,y,z,extra={}){
 const params=constraintInputs();
 const item={id:id(),type:"board",name,length:l,width:w,thickness:t,quantity:1,orientation,position:{x,y,z},source:"Constrained Assembly Model",status:"Needs review",constraintGenerated:true,cutDimensionSource:"Parametric assembly rule",jointSystem:params.jointSystem,backMounting:params.backMount,...extra};
 objects.push(item);return item;
}
function addObjectPreset(type,name,l,w,t,orientation,x,y,z,extra={}){
 const item={id:id(),type,name,length:l,width:w,thickness:t,quantity:1,orientation,position:{x,y,z},source:"Constrained Assembly Model",status:"Needs review",constraintGenerated:true,...extra};
 objects.push(item);return item;
}
function loadPreset(){
 const preset=$("#asPreset").value;
 const W=number("asCabWidth"),H=number("asCabHeight"),D=number("asCabDepth"),T=number("asBoardT"),BT=number("asBackT"),shelves=Math.floor(number("asShelfCount",2));
 const partitions=Math.floor(number("asPartitionCount",1)),gap=number("asFrontGap",3),minOpening=number("asMinOpening",100);
 const jointSystem=$("#asJointSystem")?.value||"butt-confirmat",backMount=$("#asBackMount")?.value||"overlay",insetBack=backMount==="inset";
 if(![W,H,D,T,BT,gap,minOpening].every(positive)||T*2>=W||T*2>=H||BT>=D||shelves<0||shelves>20||partitions<0||partitions>8||gap<1||gap>10||minOpening<50||minOpening>500||!["butt-confirmat","dowel-cam"].includes(jointSystem)||!["overlay","inset"].includes(backMount)){
  alert("Enter valid dimensions, 0–8 partitions, 0–20 shelves, a 1–10 mm reveal and valid joinery/back mounting selections.");return;
 }
 const innerW=W-2*T,innerH=H-2*T,innerD=D-BT,sideDepth=insetBack?D:innerD,bayW=(innerW-partitions*T)/(partitions+1);
 if(preset!=="empty"&&(bayW<minOpening||innerH-shelves*T<minOpening*(shelves+1))){
  alert("These dimensions leave an opening smaller than the selected minimum. Reduce the partition/shelf count or enlarge the cabinet.");return;
 }
 if(objects.length&&!confirm("Rebuild this assembly from the current constraints? Existing manual objects will be replaced."))return;
 objects=[];editingId=null;resetEditForm();
 if(preset==="empty"){generatedStamp=constraintInputStamp();renderAll();persist();return;}
 // Coordinate frame: X = left-to-right, Y = front-to-rear, Z = bottom-to-top.
 // The overall depth includes the back. Inset backs run between the sides/top/bottom; dividers stop at the back's front face.
 addBoard("Left side",H,sideDepth,T,"side",0,0,0,{role:"side-left",cutRule:insetBack?"H × D × T":"H × (D − backT) × T",dimensionRule:insetBack?"H × D × T":"H × (D − backT) × T"});
 addBoard("Right side",H,sideDepth,T,"side",W-T,0,0,{role:"side-right",cutRule:"H × sideDepth × T",dimensionRule:insetBack?"H × D × T":"H × (D − backT) × T"});
 addBoard("Top",innerW,sideDepth,T,"horizontal",T,0,H-T,{role:"top",cutRule:insetBack?"(W − 2T) × D × T":"(W − 2T) × (D − backT) × T",dimensionRule:insetBack?"(W − 2T) × D × T":"(W − 2T) × (D − backT) × T"});
 addBoard("Bottom",innerW,sideDepth,T,"horizontal",T,0,0,{role:"bottom",cutRule:"(W − 2T) × sideDepth × T",dimensionRule:insetBack?"(W − 2T) × D × T":"(W − 2T) × (D − backT) × T"});
 for(let i=0;i<partitions;i++){
  const x=T+(i+1)*bayW+i*T;
  addBoard("Partition "+(i+1),innerH,innerD,T,"side",x,0,T,{role:"partition",bayIndex:i+1,cutRule:"(H − 2T) × (D − backT) × T",dimensionRule:"(H − 2T) × (D − backT) × T"});
 }
 const clearHeight=innerH-shelves*T,gapHeight=clearHeight/(shelves+1);
 for(let level=0;level<shelves;level++){
  const z=T+gapHeight*(level+1)+T*level;
  for(let bay=0;bay<=partitions;bay++){
   const x=T+bay*(bayW+T);
   addBoard("Shelf "+(level+1)+" · Bay "+(bay+1),bayW,innerD,T,"horizontal",x,0,z,{role:"shelf",shelfLevel:level+1,bayIndex:bay+1,clearOpeningBelow:gapHeight,cutRule:"((W − 2T − P×T)/(P+1)) × (D − backT) × T",dimensionRule:"clear bay width × (D − backT) × T"});
  }
 }
 // A back style changes the structural panel depths and the cut dimensions, not only its drawing label.
 if(!insetBack){
  addBoard("Back panel",W,H,BT,"front",0,innerD,0,{role:"back-overlay",cutRule:"W × H × backT",dimensionRule:"W × H × backT",specNote:"Full overlay rear back. Confirm fixing method, screw spacing, edge distance and board orientation."});
 }else{
  addBoard("Inset back panel",innerW,innerH,BT,"front",T,innerD,T,{role:"back-inset",cutRule:"(W − 2T) × (H − 2T) × backT",dimensionRule:"(W − 2T) × (H − 2T) × backT",specNote:"Inset back between sides/top/bottom. This is a butt-fit panel model; any groove/rebate depth, machining allowance and fixing method must be specified separately."});
 }
 if(preset==="mirror-wardrobe"){
  const reveal=gap,doorH=H-2*reveal,leafW=(W-3*reveal)/2;
  const doorX=[reveal,reveal+leafW+reveal];
  const leaves=doorX.map((x,i)=>addBoard((i===0?"Left":"Right")+" shutter",leafW,doorH,T,"front",x,-T,reveal,{role:"shutter",doorLeaf:i+1,doorFit:"provisional-hinged-overlay",cutRule:"(W − 3×reveal)/2 × (H − 2×reveal) × T",specNote:"Provisional shutter size from the entered design reveal. Exact hinge model, overlay, max size, cup drilling and manufacturer deductions are still required."}));
  leaves.forEach((leaf,i)=>{
   const x=doorX[i]+35,z=reveal+35,mirrorW=Math.max(1,leafW-70),mirrorH=Math.max(1,doorH-70);
   addObjectPreset("mirror",(i===0?"Left":"Right")+" mirror · safety / edge spec required",mirrorW,mirrorH,4,"front",x,-T-4,z,{role:"mirror-face",mountedTo:leaf.id,generatedFrom:leaf.id,specNote:"Glazing follows the provisional shutter face with a nominal 35 mm inset. Verify safety backing, edge polish, adhesive/fixing and supplier tolerances."});
   const handleX=i===0?doorX[i]+leafW-26:doorX[i]+8;
   addObjectPreset("hardware",(i===0?"Left":"Right")+" handle · position placeholder",18,150,12,"front",handleX,-T-16,H/2-75,{role:"handle",mountedTo:leaf.id,specNote:"Visual position placeholder only. Confirm handle product, fixing length, edge distance and whether a mirrored face permits this fixing."});
  });
 }
 if(preset==="tv-console"&&H>200)addObjectPreset("hardware","Handle / fitting placeholder",18,120,12,"front",W/2-9,-12,H*.55,{role:"hardware-placeholder",specNote:"Visual fitting only; no hole pattern or mounting is inferred."});
 generatedStamp=constraintInputStamp();renderAll();persist();
}
function resetEditForm(){
 editingId=null;$("#asName").value="Custom panel";$("#asType").value="board";$("#asLength").value="600";$("#asWidth").value="450";$("#asThickness").value="18";$("#asQty").value="1";$("#asOrientation").value="front";$("#asX").value="0";$("#asY").value="0";$("#asZ").value="0";
 if($("#asMaterial"))$("#asMaterial").value="";if($("#asColourName"))$("#asColourName").value="";if($("#asDecorCode"))$("#asDecorCode").value="";if($("#asFinishColor"))$("#asFinishColor").value=typeColors.board;if($("#asGrain"))$("#asGrain").value="verify";if($("#asEdgeBand"))$("#asEdgeBand").value="verify";
 $("#asAddObject").textContent="Add object";$("#asCancelEdit").hidden=true;updateTypeHelp();
}
function updateTypeHelp(){
 const t=$("#asType").value;
 const notes={
  board:"Board panels are sent to the Designer Cutlist. Confirm board material, grain, edge treatments and finished/cut-size convention there.",
  mirror:"Mirrors are shown in the assembly and listed separately. Verify glass supplier dimensions, safety backing, edge polish, holes and mounting hardware.",
  glass:"Glass is shown in the assembly and listed separately. Confirm glass type, thickness, safety requirements, edge processing and cut-outs with the supplier.",
  hardware:"Visual fitting placeholder only. It appears in the accessory schedule and is not treated as a board panel.",
  decorative:"A visual coordination object; not an automatic manufacturing component. Add a detailed part separately if it must be fabricated."
 };
 $("#asTypeNote").textContent=notes[t]||"";
 if(t==="mirror"||t==="glass"){$("#asOrientation").value="front";if($("#asThickness").value==="18")$("#asThickness").value=t==="mirror"?"4":"6";}
 if(t==="hardware"){$("#asOrientation").value="front";if($("#asLength").value==="600")$("#asLength").value="150";}
}
function addOrSaveObject(){
 const o=readForm();
 if(!validObject(o)){alert("Enter positive length, width, thickness and a whole-number quantity; placement coordinates must be finite.");return;}
 if(editingId){const i=objects.findIndex(x=>x.id===editingId);if(i>=0){if(objects[i].type==="board"&&objects[i].constraintGenerated)generatedStamp="manually-modified:"+generatedStamp;objects[i]=o;}}else objects.push(o);
 resetEditForm();renderAll();persist();
}
function editObject(objectId){
 const o=objects.find(x=>x.id===objectId);if(!o)return;editingId=o.id;
 $("#asType").value=o.type;$("#asName").value=o.name;$("#asLength").value=o.length;$("#asWidth").value=o.width;$("#asThickness").value=o.thickness;$("#asQty").value=o.quantity;$("#asOrientation").value=o.orientation;
 $("#asX").value=o.position.x;$("#asY").value=o.position.y;$("#asZ").value=o.position.z;$("#asMaterial").value=o.material||"";$("#asColourName").value=o.colourName||"";$("#asDecorCode").value=o.decorCode||"";$("#asFinishColor").value=/^#[0-9a-f]{6}$/i.test(o.finishColor||"")?o.finishColor:(typeColors[o.type]||typeColors.board);$("#asGrain").value=o.grain||"verify";$("#asEdgeBand").value=o.edgeBand||"verify";$("#asAddObject").textContent="Save object";$("#asCancelEdit").hidden=false;updateTypeHelp();$("#asName").focus();
}
function removeObject(objectId){
 const o=objects.find(x=>x.id===objectId);if(!o)return;
 if(!confirm("Remove “"+o.name+"” from the assembly?"))return;
 if(o.type==="board"&&o.constraintGenerated)generatedStamp="manually-modified:"+generatedStamp;
 objects=objects.filter(x=>x.id!==objectId);if(editingId===objectId)resetEditForm();renderAll();persist();
}
function objectRows(items,html){
 return items.length?items.map(o=>html(o)).join(""):'';
}
function renderObjectList(){
 const root=$("#asObjectList");
 root.innerHTML=objects.length?objects.map(o=>'<article class="as-object-row"><div class="as-type-dot as-type-'+esc(o.type)+'"></div><div class="as-object-main"><strong>'+esc(o.name)+'</strong><small>'+esc(typeLabels[o.type])+' · '+fmt(o.length)+' × '+fmt(o.width)+' × '+fmt(o.thickness)+' mm</small><small>'+esc(o.material||'Material not specified — verify')+' · '+esc(o.colourName||'Colour not specified')+(o.decorCode?' · '+esc(o.decorCode):'')+'</small><small>Position · '+fmt(o.position.x)+' / '+fmt(o.position.y)+' / '+fmt(o.position.z)+' mm</small></div><div class="as-object-actions"><button type="button" data-as-edit="'+esc(o.id)+'" aria-label="Edit '+esc(o.name)+'">Edit</button><button type="button" data-as-remove="'+esc(o.id)+'" aria-label="Remove '+esc(o.name)+'">×</button></div></article>').join(""):'<p class="as-empty">Build a preset or add the first object.</p>';
 $("#asComponentCount").textContent=objects.length+" object"+(objects.length===1?"":"s");
}
function renderSchedules(){
 const boards=objects.filter(o=>o.type==="board"),glazing=objects.filter(o=>o.type==="mirror"||o.type==="glass"),other=objects.filter(o=>!["board","mirror","glass"].includes(o.type));
 $("#asBoardRows").innerHTML=boards.length?boards.map(o=>'<tr><td>'+esc(o.name)+'</td><td>'+fmt(o.length)+' × '+fmt(o.width)+' × '+fmt(o.thickness)+'</td><td>'+esc(o.material||'Not specified — verify')+'<br>'+esc(o.colourName||'Colour not specified')+(o.decorCode?'<br>'+esc(o.decorCode):'')+'<br>Grain: '+esc(o.grain||'verify')+' · Edge: '+esc(o.edgeBand||'verify')+'</td><td>'+fmt(o.position.x)+' / '+fmt(o.position.y)+' / '+fmt(o.position.z)+'</td><td>'+o.quantity+'</td><td><span class="as-status">'+esc(o.status||"Needs review")+'</span></td></tr>').join(""):'<tr><td colspan="6">No board panels yet.</td></tr>';
 $("#asGlazingRows").innerHTML=glazing.length?glazing.map(o=>'<tr><td>'+esc(o.name)+'</td><td>'+esc(typeLabels[o.type])+'</td><td>'+fmt(o.length)+' × '+fmt(o.width)+'</td><td>'+fmt(o.thickness)+' mm</td><td>'+fmt(o.position.x)+' / '+fmt(o.position.y)+' / '+fmt(o.position.z)+'</td><td>'+o.quantity+'</td></tr>').join(""):'<tr><td colspan="6">Add a mirror or glass object.</td></tr>';
 $("#asOtherRows").innerHTML=other.length?other.map(o=>'<tr><td>'+esc(o.name)+'</td><td>'+esc(typeLabels[o.type])+'</td><td>'+fmt(o.length)+' × '+fmt(o.width)+' × '+fmt(o.thickness)+'</td><td>'+fmt(o.position.x)+' / '+fmt(o.position.y)+' / '+fmt(o.position.z)+'</td><td>'+o.quantity+'</td></tr>').join(""):'<tr><td colspan="5">Add a hardware or decorative object.</td></tr>';
 $("#asMetricObjects").textContent=objects.length;
 $("#asMetricBoards").textContent=boards.length;
 $("#asMetricGlazing").textContent=glazing.length;
 $("#asMetricOther").textContent=other.length;
}
function objectFill(o){return /^#[0-9a-f]{6}$/i.test(o.finishColor||"")?o.finishColor:(typeColors[o.type]||typeColors.board);}
function planeValues(o,plane){
 const s=sizeOf(o),p=o.position;
 if(plane==="front")return {u:p.x,v:p.z,w:s.x,h:s.z,fill:objectFill(o)};
 if(plane==="plan")return {u:p.x,v:p.y,w:s.x,h:s.y,fill:objectFill(o)};
 return {u:p.y,v:p.z,w:s.y,h:s.z,fill:objectFill(o)};
}
function orthoSvg(plane,title){
 const W=560,H=360,marginL=58,marginR=24,marginT=42,marginB=62;
 const vals=objects.map(o=>planeValues(o,plane));
 let minU=0,minV=0,maxU=number("asCabWidth",1000),maxV=number("asCabHeight",1000);
 if(plane==="plan")maxV=number("asCabDepth",1000);
 if(plane==="side"){maxU=number("asCabDepth",1000);maxV=number("asCabHeight",1000);}
 // Include protruding front objects in the drawing bounds, but dimension the nominal carcass envelope below.
 if(vals.length){minU=Math.min(minU,...vals.map(v=>v.u));minV=Math.min(minV,...vals.map(v=>v.v));maxU=Math.max(maxU,...vals.map(v=>v.u+v.w));maxV=Math.max(maxV,...vals.map(v=>v.v+v.h));}
 const spanU=Math.max(1,maxU-minU),spanV=Math.max(1,maxV-minV);
 const scale=Math.min((W-marginL-marginR)/spanU,(H-marginT-marginB)/spanV);
 const viewW=spanU*scale,viewH=spanV*scale,ox=marginL+((W-marginL-marginR)-viewW)/2-minU*scale;
 const top=(H-marginT-marginB-viewH)/2+marginT,baseY=top+maxV*scale;
 const X=u=>ox+u*scale,Y=v=>baseY-v*scale;
 const cw=number("asCabWidth",0),ch=number("asCabHeight",0),cd=number("asCabDepth",0);
 const dims=plane==="front"?cw+" × "+ch+" mm":plane==="plan"?cw+" × "+cd+" mm":cd+" × "+ch+" mm";
 const ordered=[...objects].sort((a,b)=>{
  if(plane==="front")return (b.position.y||0)-(a.position.y||0); // rear parts first, then doors, mirrors, handles
  if(plane==="plan")return (a.position.z||0)-(b.position.z||0); // bottom-up stacking
  return (b.position.x||0)-(a.position.x||0);
 });
 let art='<defs><marker id="asDimArrow" markerWidth="6" markerHeight="6" refX="3" refY="3" orient="auto-start-reverse"><path d="M0,0 L6,3 L0,6 z" fill="#66715e"/></marker></defs><rect width="'+W+'" height="'+H+'" rx="8" fill="#fbfcf9"/><text x="16" y="22" font-size="10" font-weight="800" fill="#414c39">'+esc(title)+'</text><text x="'+(W-14)+'" y="22" text-anchor="end" font-size="9" font-weight="700" fill="#64705b">'+esc(dims)+'</text>';
 for(const o of ordered){
  const v=planeValues(o,plane),x=X(v.u),y=Y(v.v+v.h),w=v.w*scale,h=v.h*scale;
  const isGlass=["mirror","glass"].includes(o.type),opacity=o.type==="mirror"?.96:o.type==="glass"?.72:o.type==="decorative"?.86:.94;
  art+='<rect x="'+x.toFixed(2)+'" y="'+y.toFixed(2)+'" width="'+Math.max(.8,w).toFixed(2)+'" height="'+Math.max(.8,h).toFixed(2)+'" fill="'+v.fill+'" fill-opacity="'+opacity+'" stroke="'+(o.type==="hardware"?"#373e42":o.type==="mirror"?"#477e86":"#53614b")+'" stroke-width="'+(isGlass?"1.3":"1.05")+'"/>';
  // Do not overlay component names on orthographic geometry: opposite side panels share the same projection in plan/side views.
 }
 // Dimension lines are tied to the nominal cabinet envelope, not a loose handle/mirror projection.
 const line=(x1,y1,x2,y2)=>'<line x1="'+x1+'" y1="'+y1+'" x2="'+x2+'" y2="'+y2+'" stroke="#6f7a65" stroke-width="1" marker-start="url(#asDimArrow)" marker-end="url(#asDimArrow)"/>';
 const tick=(x1,y1,x2,y2)=>'<line x1="'+x1+'" y1="'+y1+'" x2="'+x2+'" y2="'+y2+'" stroke="#87917d" stroke-width=".8"/>';
 if(plane==="front"){
  const x1=X(0),x2=X(cw),yTop=Y(ch),yBottom=Y(0),dy=Math.min(H-29,yBottom+22);
  art+=tick(x1,yBottom,x1,dy+4)+tick(x2,yBottom,x2,dy+4)+line(x1,dy,x2,dy);
  art+='<text x="'+((x1+x2)/2)+'" y="'+(dy+13)+'" text-anchor="middle" font-size="9" fill="#64705b">'+fmt(cw)+' mm</text>';
  const dx=Math.max(20,x1-22);art+=tick(x1,yTop,dx-4,yTop)+tick(x1,yBottom,dx-4,yBottom)+line(dx,yTop,dx,yBottom);
  art+='<text x="'+(dx-9)+'" y="'+((yTop+yBottom)/2)+'" transform="rotate(-90 '+(dx-9)+' '+((yTop+yBottom)/2)+')" text-anchor="middle" font-size="9" fill="#64705b">'+fmt(ch)+' mm</text>';
 }else if(plane==="plan"){
  const x1=X(0),x2=X(cw),y1=Y(cd),y0=Y(0),dy=Math.max(31,y1-19);
  art+=tick(x1,y1,x1,dy-4)+tick(x2,y1,x2,dy-4)+line(x1,dy,x2,dy);
  art+='<text x="'+((x1+x2)/2)+'" y="'+(dy-5)+'" text-anchor="middle" font-size="9" fill="#64705b">'+fmt(cw)+' mm</text>';
  const dx=Math.min(W-20,x2+17);art+=tick(x2,y1,dx+4,y1)+tick(x2,y0,dx+4,y0)+line(dx,y1,dx,y0);
  art+='<text x="'+(dx-7)+'" y="'+((y1+y0)/2)+'" transform="rotate(-90 '+(dx-7)+' '+((y1+y0)/2)+')" text-anchor="middle" font-size="9" fill="#64705b">'+fmt(cd)+' mm</text>';
 }else{
  const x1=X(0),x2=X(cd),yTop=Y(ch),yBottom=Y(0),dy=Math.min(H-29,yBottom+22);
  art+=tick(x1,yBottom,x1,dy+4)+tick(x2,yBottom,x2,dy+4)+line(x1,dy,x2,dy);
  art+='<text x="'+((x1+x2)/2)+'" y="'+(dy+13)+'" text-anchor="middle" font-size="9" fill="#64705b">'+fmt(cd)+' mm</text>';
  const dx=Math.max(20,Math.min(x1,x2)-22);art+=tick(x2,yTop,dx-4,yTop)+tick(x2,yBottom,dx-4,yBottom)+line(dx,yTop,dx,yBottom);
  art+='<text x="'+(dx-9)+'" y="'+((yTop+yBottom)/2)+'" transform="rotate(-90 '+(dx-9)+' '+((yTop+yBottom)/2)+')" text-anchor="middle" font-size="9" fill="#64705b">'+fmt(ch)+' mm</text>';
 }
 art+='<text x="'+(W/2)+'" y="'+(H-7)+'" text-anchor="middle" font-size="8" fill="#7b8376">Dimensions in mm · derived from assembly parameters</text>';
 return '<svg viewBox="0 0 '+W+' '+H+'" role="img" aria-label="'+esc(title+' · '+dims)+'">'+art+'</svg>';
}
function renderOrthographic(){
 $("#asFront").innerHTML=orthoSvg("front","FRONT ELEVATION · X / Z");
 $("#asPlan").innerHTML=orthoSvg("plan","PLAN · X / Y");
 $("#asSide").innerHTML=orthoSvg("side","SIDE ELEVATION · Y / Z");
}
function boxVertices(o){
 const s=sizeOf(o),p=o.position;
 const x=p.x,y=p.y,z=p.z,X=x+s.x,Y=y+s.y,Z=z+s.z;
 return [
  {x,y,z},{x:X,y,z},{x:X,y:Y,z},{x,y:Y,z},
  {x,y,z:Z},{x:X,y,z:Z},{x:X,y:Y,z:Z},{x,y:Y,z:Z}
 ];
}
function renderScene(){
 const root=$("#asSceneSvg"),W=900,H=560;
 if(!objects.length){root.innerHTML='<rect width="900" height="560" rx="12" fill="#fafbf8"/><text x="450" y="265" text-anchor="middle" font-size="20" fill="#57634f">Your assembly will appear here</text><text x="450" y="292" text-anchor="middle" font-size="12" fill="#858d7d">Build a wardrobe preset or add a panel, mirror, glass or fitting.</text>';return;}
 const yaw=Number(yawVal()),pitchRad=pitch*Math.PI/180,yawRad=yaw*Math.PI/180;
 const verts=objects.map(o=>({o,v:boxVertices(o)}));
 const all=verts.flatMap(x=>x.v),center={x:(Math.min(...all.map(p=>p.x))+Math.max(...all.map(p=>p.x)))/2,y:(Math.min(...all.map(p=>p.y))+Math.max(...all.map(p=>p.y)))/2,z:(Math.min(...all.map(p=>p.z))+Math.max(...all.map(p=>p.z)))/2};
 const projected=p=>{const x=p.x-center.x,y=p.y-center.y,z=p.z-center.z;const cx=Math.cos(yawRad)*x-Math.sin(yawRad)*y,cy=Math.sin(yawRad)*x+Math.cos(yawRad)*y;return {x:cx,y:cy*Math.cos(pitchRad)-z*Math.sin(pitchRad),depth:cy*Math.sin(pitchRad)+z*Math.cos(pitchRad)};};
 const boxes=verts.map(({o,v})=>({o,p:v.map(projected)})),allP=boxes.flatMap(b=>b.p);
 const xs=allP.map(p=>p.x),ys=allP.map(p=>p.y),rx=Math.max(...xs)-Math.min(...xs)||1,ry=Math.max(...ys)-Math.min(...ys)||1;
 const scale=Math.min(760/rx,390/ry),ox=450-(Math.min(...xs)+Math.max(...xs))*scale/2,oy=286-(Math.min(...ys)+Math.max(...ys))*scale/2;
 const faceDefs=[[0,1,2,3],[4,5,6,7],[0,1,5,4],[1,2,6,5],[2,3,7,6],[3,0,4,7]];
 const faces=[];
 for(const b of boxes){
  faceDefs.forEach((ix,fi)=>{
   const pp=ix.map(i=>b.p[i]);
   faces.push({o:b.o,fi,p:pp,depth:pp.reduce((s,p)=>s+p.depth,0)/4});
  });
 }
 faces.sort((a,b)=>a.depth-b.depth);
 let art='<rect width="900" height="560" rx="10" fill="#fafbf8"/><text x="25" y="30" font-size="13" font-weight="700" fill="#384333">ASSEMBLY PREVIEW · ISOMETRIC</text><text x="25" y="50" font-size="10" fill="#707a6a">'+objects.length+' objects · '+objects.filter(o=>o.type==="board").length+' board panels · mirrors/glass separate</text><g stroke-linejoin="round">';
 for(const f of faces){
  const pts=f.p.map(p=>(p.x*scale+ox).toFixed(2)+","+(p.y*scale+oy).toFixed(2)).join(" ");
  const base=objectFill(f.o),side=["mirror","glass"].includes(f.o.type)?"#82aeb5":f.o.type==="hardware"?"#41484c":f.fi===0?base:"#aeb9a5";
  const opacity=["mirror","glass"].includes(f.o.type)?(f.fi===0?.82:.42):f.o.type==="decorative"?.84:1;
  art+='<polygon points="'+pts+'" fill="'+side+'" fill-opacity="'+opacity+'" stroke="'+(f.o.type==="hardware"?"#343a3d":"#56634f")+'" stroke-width="'+(f.fi===0?"1.6":"1")+'"/>';
 }
 art+='</g><g font-size="10" fill="#66715c">';
 art+='<text x="25" y="535">X = width · Y = depth · Z = height · boxes are coordination geometry, not joinery/CNC paths</text></g>';
 root.innerHTML=art;
}
function yawVal(){return $("#asYaw")?.value??yaw;}
function objectBounds(o){
 const s=sizeOf(o),p=o.position;
 return {min:{x:p.x,y:p.y,z:p.z},max:{x:p.x+s.x,y:p.y+s.y,z:p.z+s.z}};
}
function boundsOverlap(a,b,tol=.5){
 const x=Math.min(a.max.x,b.max.x)-Math.max(a.min.x,b.min.x);
 const y=Math.min(a.max.y,b.max.y)-Math.max(a.min.y,b.min.y);
 const z=Math.min(a.max.z,b.max.z)-Math.max(a.min.z,b.min.z);
 return x>tol&&y>tol&&z>tol?{x,y,z,volume:x*y*z}:null;
}
function faceContact(a,b,tol=.5){
 const axes=["x","y","z"];
 for(const axis of axes){
  const gap=Math.min(Math.abs(a.max[axis]-b.min[axis]),Math.abs(b.max[axis]-a.min[axis]));
  if(gap>tol)continue;
  const other=axes.filter(v=>v!==axis);
  const one=Math.min(a.max[other[0]],b.max[other[0]])-Math.max(a.min[other[0]],b.min[other[0]]);
  const two=Math.min(a.max[other[1]],b.max[other[1]])-Math.max(a.min[other[1]],b.min[other[1]]);
  if(one>tol&&two>tol)return {axis,area:one*two};
 }
 return null;
}
function assemblyJointGraph(){
 const boards=objects.filter(o=>o.type==="board"&&o.constraintGenerated);
 const edges=[],checks=[];
 const inputs=constraintInputs();
 if(!boards.length)return {edges:[],checks:[],verified:0,required:0,missing:[]};
 for(let i=0;i<boards.length;i++)for(let j=i+1;j<boards.length;j++){
  const contact=faceContact(objectBounds(boards[i]),objectBounds(boards[j]));
  if(contact)edges.push({from:boards[i].id,to:boards[j].id,fromName:boards[i].name,toName:boards[j].name,fromRole:boards[i].role||"panel",toRole:boards[j].role||"panel",axis:contact.axis,area:contact.area,jointSystem:inputs.jointSystem});
 }
 const role=r=>boards.filter(o=>o.role===r);
 const one=r=>role(r)[0];
 const check=(a,b,axis,label)=>{
  const contact=a&&b?faceContact(objectBounds(a),objectBounds(b)):null;
  checks.push({label,axis,ok:!!contact&&contact.axis===axis,from:a?.name||"missing component",to:b?.name||"missing component",contactAxis:contact?.axis||null});
 };
 const left=one("side-left"),right=one("side-right"),top=one("top"),bottom=one("bottom");
 check(left,top,"x","Left side to top");
 check(right,top,"x","Right side to top");
 check(left,bottom,"x","Left side to bottom");
 check(right,bottom,"x","Right side to bottom");
 for(const partition of role("partition")){
  check(partition,top,"z",partition.name+" to top");
  check(partition,bottom,"z",partition.name+" to bottom");
 }
 const supports=[left,...role("partition"),right].filter(Boolean);
 for(const shelf of role("shelf")){
  const sb=objectBounds(shelf);
  const l=supports.filter(s=>Math.abs(objectBounds(s).max.x-sb.min.x)<=.5).sort((a,b)=>Math.abs(objectBounds(a).max.x-sb.min.x)-Math.abs(objectBounds(b).max.x-sb.min.x))[0];
  const r=supports.filter(s=>Math.abs(objectBounds(s).min.x-sb.max.x)<=.5).sort((a,b)=>Math.abs(objectBounds(a).min.x-sb.max.x)-Math.abs(objectBounds(b).min.x-sb.max.x))[0];
  check(l,shelf,"x",shelf.name+" left support");
  check(shelf,r,"x",shelf.name+" right support");
 }
 const back=one(inputs.backMount==="inset"?"back-inset":"back-overlay");
 if(inputs.backMount==="inset"){
  check(back,left,"x","Inset back to left side");
  check(back,right,"x","Inset back to right side");
  check(back,top,"z","Inset back to top");
  check(back,bottom,"z","Inset back to bottom");
  for(const partition of role("partition"))check(partition,back,"y",partition.name+" to inset back");
  for(const shelf of role("shelf"))check(shelf,back,"y",shelf.name+" to inset back");
 }else{
  check(back,left,"y","Overlay back to left side");
  check(back,right,"y","Overlay back to right side");
  check(back,top,"y","Overlay back to top");
  check(back,bottom,"y","Overlay back to bottom");
 }
 return {edges,checks,verified:checks.filter(c=>c.ok).length,required:checks.length,missing:checks.filter(c=>!c.ok)};
}
function validateAssembly(){
 const errors=[],warnings=[],contacts=[];
 const boards=objects.filter(o=>o.type==="board"),generated=boards.filter(o=>o.constraintGenerated);
 if(generated.length&&generatedStamp&&generatedStamp!==constraintInputStamp())errors.push("Constraint inputs changed after the model was built. Rebuild the assembly preset before viewing manufacturing outputs or sending parts to the cut list.");
 const W=number("asCabWidth"),H=number("asCabHeight"),D=number("asCabDepth"),T=number("asBoardT"),BT=number("asBackT");
 const P=Math.floor(number("asPartitionCount",1)),S=Math.floor(number("asShelfCount",2)),minOpening=number("asMinOpening",100),gap=number("asFrontGap",3),inputs=constraintInputs(),graph=assemblyJointGraph();
 if(objects.some(o=>!validObject(o)))errors.push("One or more objects has a non-positive dimension, invalid quantity or invalid placement.");
 if( W>0&&H>0&&D>0&&T>0&&BT>0 ){
  if(W<=2*T)errors.push("Cabinet width must exceed twice the board thickness.");
  if(H<=2*T)errors.push("Cabinet height must exceed twice the board thickness.");
  if(D<=BT)errors.push("Cabinet depth must exceed the back thickness.");
  const innerW=W-2*T,innerH=H-2*T,bayW=(innerW-P*T)/(P+1),clearH=(innerH-S*T)/(S+1);
  if(bayW<minOpening)errors.push("Partition layout leaves a "+fmt(bayW)+" mm clear bay, below the "+fmt(minOpening)+" mm minimum.");
  if(clearH<minOpening)errors.push("Shelf layout leaves a "+fmt(clearH)+" mm clear vertical opening, below the "+fmt(minOpening)+" mm minimum.");
  if(gap<1||gap>10)errors.push("Front reveal must be between 1 and 10 mm.");
  if(!errors.length)contacts.push("Carcass envelope is dimensionally feasible for the entered width, height, depth and board thickness.");
  if(generated.some(o=>o.role==="shutter")){
   warnings.push("Hinged shutter dimensions are derived from the "+fmt(gap)+" mm design reveal only. Exact hinge model, overlay, permissible door size/weight and drilling are not yet confirmed.");
  }
  if(generated.some(o=>o.role==="shelf"))contacts.push("Shelves are split into "+(P+1)+" bay segment(s) at each level so they meet partition faces instead of passing through them.");
  if(generated.some(o=>o.role==="back-overlay"))contacts.push("Full rear-overlay back is positioned at Y = D − back thickness and face-aligned to the carcass rear.");
  if(generated.some(o=>o.role==="back-inset"))contacts.push("Inset back is derived as (W − 2T) × (H − 2T) and fitted between perimeter panels.");
  const expected=["side-left","side-right","top","bottom",inputs.backMount==="inset"?"back-inset":"back-overlay"];
  if(generated.length&&expected.some(role=>!generated.some(o=>o.role===role)))errors.push("Constrained carcass is missing one or more required sides, top, bottom or selected back panel.");
 }
 const boxes=objects.map(o=>({o,b:objectBounds(o)}));
 let hitCount=0;
 for(let i=0;i<boxes.length;i++)for(let j=i+1;j<boxes.length;j++){
  const overlap=boundsOverlap(boxes[i].b,boxes[j].b);
  if(overlap){
   hitCount++;
   errors.push('Solid intersection: "'+boxes[i].o.name+'" × "'+boxes[j].o.name+'" overlap by '+fmt(overlap.x)+' × '+fmt(overlap.y)+' × '+fmt(overlap.z)+' mm.');
  }else{
   const touch=faceContact(boxes[i].b,boxes[j].b);
   if(touch)contacts.push('"'+boxes[i].o.name+'" meets "'+boxes[j].o.name+'" at a '+touch.axis.toUpperCase()+' face.');
  }
 }
 for(const c of graph.missing)errors.push("Missing required panel contact: "+c.label+" must meet at the "+c.axis.toUpperCase()+" face.");
 if(graph.required)contacts.push("Joinery graph · "+graph.verified+"/"+graph.required+" required panel contacts verified; "+graph.edges.length+" face connections detected.");
 if(generated.length&&inputs.jointSystem==="butt-confirmat")warnings.push("Butt/confirmat joint intent selected. Screw positions, pilot holes, edge distances and fastener lengths are not generated.");
 if(generated.length&&inputs.jointSystem==="dowel-cam")warnings.push("Dowel + cam joint intent selected. Bore centres, cam pockets, dowel depth and connector edge distances are not generated.");
 if(inputs.backMount==="inset"&&generated.some(o=>o.role==="back-inset"))warnings.push("Inset back is a butt-fit geometry model; groove/rebate machining, groove depth and fixing details are not generated.");
 const coreRoles=new Set(["side-left","side-right","top","bottom","partition","shelf","back-overlay","back-inset"]);
 for(const o of generated.filter(o=>coreRoles.has(o.role))){const b=objectBounds(o);if(b.min.x<-.5||b.min.y<-.5||b.min.z<-.5||b.max.x>W+.5||b.max.y>D+.5||b.max.z>H+.5)errors.push("Panel outside cabinet envelope: "+o.name+".");}
 const uniqueContacts=[...new Set(contacts)];
 if(objects.some(o=>!o.constraintGenerated)&&objects.length)warnings.push("This assembly includes manually positioned or non-board objects. Solid intersections are checked, but manual placements are not solved by the carcass constraints.");
 if(!objects.length)warnings.push("No assembly objects yet. Build a constrained preset to generate manufacturing dimensions.");
 return {errors:[...new Set(errors)],warnings:[...new Set(warnings)],contacts:uniqueContacts,intersections:hitCount,boardCount:boards.length,generatedCount:generated.length,jointGraph:graph};
}
function renderConstraintReport(){
 const root=$("#asConstraintReport"),list=$("#asConstraintList");if(!root||!list)return;
 const r=validateAssembly();
 root.classList.toggle("as-has-errors",r.errors.length>0);
 root.classList.toggle("as-has-warnings",!r.errors.length&&r.warnings.length>0);
 const state=r.errors.length?"Blocked · "+r.errors.length+" geometric issue(s)":r.warnings.length?"Geometry checked · review needed":"Geometry checked · no solid intersections";
 root.querySelector("strong").textContent=state;
 const intro=root.querySelector("p");if(intro)intro.textContent=!objects.length?"No model yet. Build an assembly to derive panel sizes and check boundaries, openings, clearances and intersections.":r.errors.length?"Manufacturing handoff is blocked until the geometry issues below are corrected.":r.warnings.length?r.boardCount+" board components · "+r.intersections+" solid intersections detected. Resolve hardware and material review notes before release.":r.boardCount+" board components · "+r.intersections+" solid intersections detected. Derived dimensions are ready for human manufacturing review.";
 const lines=[...r.errors.map(x=>({kind:"error",text:x})),...r.warnings.map(x=>({kind:"warning",text:x})),...(r.contacts.filter(x=>x.startsWith("Joinery graph")).slice(0,1).map(x=>({kind:"contact",text:x}))),...r.contacts.filter(x=>!x.startsWith("Joinery graph")).slice(0,4).map(x=>({kind:"contact",text:x}))];
 if(!r.errors.length&&!r.warnings.length)lines.unshift({kind:"pass",text:r.intersections+" solid intersections detected; derived board dimensions are ready for human review."});
 list.innerHTML=lines.map(x=>'<li class="as-check-'+x.kind+'">'+esc(x.text)+'</li>').join("");
 return r;
}
function renderAll(){renderObjectList();renderSchedules();renderOrthographic();renderScene();renderConstraintReport();}
function addToCutlist(){
 const boards=objects.filter(o=>o.type==="board");
 if(!boards.length){alert("There are no board panels to send to the Designer Cutlist. Mirrors, glass and hardware stay in their own schedules.");return;}
 const invalid=boards.find(o=>!validObject(o));
 if(invalid){alert("Fix invalid dimensions or quantity for "+invalid.name+" before transferring board parts.");return;}
 const report=validateAssembly();
 if(report.errors.length){alert("Cut-list handoff is blocked until geometry issues are fixed:\n\n"+report.errors.slice(0,6).join("\n"));return;}
 const parts=boards.map(o=>({...clone(o),bounds:objectBounds(o),geometryVersion:o.constraintGenerated?"dcode.assembly-constrained.v3":"dcode.assembly-manual.v1",sourceDesignRevision:importedDesignSource?.revision||null,sourceDesignName:importedDesignSource?.name||null,jointSystem:o.jointSystem||constraintInputs().jointSystem,backMounting:o.backMounting||constraintInputs().backMount,cutDimensionSource:o.cutDimensionSource||(o.constraintGenerated?"Constrained Assembly Model":"Manual object dimensions"),jointGraphSummary:{verified:report.jointGraph?.verified||0,required:report.jointGraph?.required||0,edgeCount:report.jointGraph?.edges?.length||0},manufacturingStatus:"Needs review",project:$("#d-project").value||"Current project"}));
 document.dispatchEvent(new CustomEvent("dcode:assembly-add-board-parts-to-cutlist",{detail:{assemblyName:$("#asPreset").selectedOptions[0]?.textContent||"Custom assembly",parts}}));
 $("#asSaveStatus").textContent="Sent "+boards.length+" board part(s) for cut-list review · "+report.intersections+" solid intersection(s). Hardware, mirrors and glass remain separate.";
}
function csvDownload(filename,rows){
 const csv=rows.map(r=>r.map(v=>'"'+String(v??"").replace(/"/g,'""')+'"').join(",")).join("\r\n");
 const a=document.createElement("a");a.href=URL.createObjectURL(new Blob(["\ufeff"+csv],{type:"text/csv;charset=utf-8"}));a.download=filename;a.click();setTimeout(()=>URL.revokeObjectURL(a.href),1000);
}
function exportGlazing(){
 const items=objects.filter(o=>["mirror","glass"].includes(o.type));
 csvDownload("DCODE-mirror-glass-schedule.csv",[
  ["Object ID","Object","Type","Length mm","Width mm","Thickness mm","Material","Colour","Decor code","Visual colour","Grain","Edge band","Quantity","X mm","Y mm","Z mm","Status","Note"],
  ...items.map(o=>[o.id,o.name,o.type,o.length,o.width,o.thickness,o.material||"Not specified — verify",o.colourName||"Not specified",o.decorCode||"",o.finishColor||"",o.grain||"verify",o.edgeBand||"verify",o.quantity,o.position.x,o.position.y,o.position.z,o.status,o.specNote||"Verify supplier processing, safety and installation"])
 ]);
}
function exportOther(){
 const items=objects.filter(o=>["hardware","decorative"].includes(o.type));
 csvDownload("DCODE-assembly-accessories.csv",[
  ["Object ID","Object","Type","Length mm","Width mm","Thickness mm","Material","Colour","Decor code","Visual colour","Grain","Edge band","Quantity","X mm","Y mm","Z mm","Status","Note"],
  ...items.map(o=>[o.id,o.name,o.type,o.length,o.width,o.thickness,o.material||"Not specified — verify",o.colourName||"Not specified",o.decorCode||"",o.finishColor||"",o.grain||"verify",o.edgeBand||"verify",o.quantity,o.position.x,o.position.y,o.position.z,o.status,o.specNote||"Visual / coordination placeholder; verify exact product"])
 ]);
}
function exportViews(){
 const svgs=[$("#asFront svg"),$("#asPlan svg"),$("#asSide svg")].filter(Boolean);
 const content=svgs.map((s,i)=>'<g transform="translate('+(i*560)+',0)">'+s.innerHTML+'</g>').join("");
 const svg='<svg xmlns="http://www.w3.org/2000/svg" width="1680" height="360" viewBox="0 0 1680 360">'+content+'</svg>';
 const a=document.createElement("a");a.href=URL.createObjectURL(new Blob([svg],{type:"image/svg+xml;charset=utf-8"}));a.download="DCODE-assembly-orthographic.svg";a.click();setTimeout(()=>URL.revokeObjectURL(a.href),1000);
}
function switchViews(two){
 $("#asView2D").classList.toggle("active",two);$("#asView3D").classList.toggle("active",!two);
 $("#as2DViews").classList.toggle("design-hidden",!two);$("#as3DView").classList.toggle("design-hidden",two);
 if(two){renderOrthographic();requestAnimationFrame(()=>renderOrthographic());}else renderScene();
}
function restoreSnapshot(snapshot){
 if(!snapshot||!Array.isArray(snapshot.objects)){
  objects=[];generatedStamp="";yaw=35;pitch=25;importedDesignSource=null;
  applyConstraintInputs({preset:"wardrobe",width:1800,height:2400,depth:600,boardThickness:18,backThickness:6,shelves:2,partitions:1,frontGap:3,minOpening:100,jointSystem:"butt-confirmat",backMount:"overlay"});
  $("#asYaw").value="35";$("#asPitch").value="25";$("#asYawValue").textContent="35°";$("#asPitchValue").textContent="25°";
  renderAll();persist();return;
 }
 if(snapshot.parameters)applyConstraintInputs(snapshot.parameters);
 objects=snapshot.objects.filter(validObject);yaw=Number(snapshot.yaw)||35;pitch=Number(snapshot.pitch)||25;generatedStamp=String(snapshot.constraintStamp||"");importedDesignSource=snapshot.sourceDesign&&typeof snapshot.sourceDesign==='object'?snapshot.sourceDesign:null;
 $("#asYaw").value=String(yaw);$("#asPitch").value=String(pitch);
 $("#asYawValue").textContent=yaw+"°";$("#asPitchValue").textContent=pitch+"°";
 renderAll();persist();
}
export function initAssemblyStudio(){
 if(initialized||!$("#assemblyStudio"))return;initialized=true;
 try{const saved=JSON.parse(localStorage.getItem(STORAGE_KEY)||"null");if((saved?.version===1||saved?.version===2||saved?.version===3)&&Array.isArray(saved.objects)){if(saved.parameters)applyConstraintInputs(saved.parameters);objects=saved.objects.filter(validObject);yaw=Number(saved.yaw)||35;pitch=Number(saved.pitch)||25;generatedStamp=String(saved.constraintStamp||"");importedDesignSource=saved.sourceDesign&&typeof saved.sourceDesign==='object'?saved.sourceDesign:null;}}catch(e){}
 $("#asYaw").value=String(yaw);$("#asPitch").value=String(pitch);$("#asYawValue").textContent=yaw+"°";$("#asPitchValue").textContent=pitch+"°";
 $("#asType").addEventListener("change",updateTypeHelp);
 $("#asImportDesign").addEventListener("click",()=>{const status=$("#asDesignSyncStatus");if(status)status.textContent="Requesting current Design Studio dimensions…";document.dispatchEvent(new CustomEvent("dcode:assembly-request-design-state"));});
 document.addEventListener("dcode:assembly-import-design-state",e=>importDesignStudioState(e.detail||{}));
 ["asPreset","asCabWidth","asCabHeight","asCabDepth","asBoardT","asBackT","asShelfCount","asPartitionCount","asFrontGap","asMinOpening","asJointSystem","asBackMount"].forEach(id=>$("#"+id).addEventListener("change",()=>{renderConstraintReport();persist();}));
 $("#asAddObject").addEventListener("click",addOrSaveObject);
 $("#asCancelEdit").addEventListener("click",()=>{resetEditForm();});
 $("#asLoadPreset").addEventListener("click",loadPreset);
 $("#asObjectList").addEventListener("click",e=>{const edit=e.target.closest("[data-as-edit]"),remove=e.target.closest("[data-as-remove]");if(edit)editObject(edit.dataset.asEdit);if(remove)removeObject(remove.dataset.asRemove);});
 $("#asSendBoards").addEventListener("click",addToCutlist);
 $("#asExportGlazing").addEventListener("click",exportGlazing);
 $("#asExportOther").addEventListener("click",exportOther);
 $("#asExportViews").addEventListener("click",exportViews);
 $("#asView2D").addEventListener("click",()=>switchViews(true));
 $("#asView3D").addEventListener("click",()=>switchViews(false));
 $("#asYaw").addEventListener("input",e=>{yaw=Number(e.target.value);$("#asYawValue").textContent=yaw+"°";renderScene();persist();});
 $("#asPitch").addEventListener("input",e=>{pitch=Number(e.target.value);$("#asPitchValue").textContent=pitch+"°";renderScene();persist();});
 document.addEventListener("dcode:assembly-restore",e=>restoreSnapshot(e.detail?.assembly));
 updateTypeHelp();renderAll();persist();switchViews(true);
}
export function getAssemblySnapshot(){
 return {version:3,objects:clone(objects),yaw,pitch,parameters:constraintInputs(),constraintStamp:generatedStamp,sourceDesign:importedDesignSource?clone(importedDesignSource):null};
}