const STORE_KEY = 'dcode-room-planner-v1';
const $ = s => document.querySelector(s);
const copy = v => JSON.parse(JSON.stringify(v));
const esc = v => String(v ?? '').replace(/[&<>"']/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));

const catalog = {
 Wardrobe: {
  layouts:[
   {id:'wardrobe-wall',label:'Straight wardrobe wall',desc:'One measured wall of wardrobes; loft can be included separately.',groups:['main-wardrobe','loft'] },
   {id:'wardrobe-corner',label:'L-shaped / corner wardrobe',desc:'Two connected runs; check the corner return and door access.',groups:['main-wardrobe','loft','shoe-storage'] },
   {id:'walk-in',label:'Walk-in / U-shaped wardrobe',desc:'Storage on multiple walls with a central clear aisle.',groups:['main-wardrobe','loft','drawer-dresser','shoe-storage'] },
   {id:'parallel',label:'Parallel wardrobe runs',desc:'Two facing runs; check passage width and door travel.',groups:['main-wardrobe','loft'] },
   {id:'bedroom-suite',label:'Bedroom furniture suite',desc:'Wardrobe plus optional dresser, bedside and study / TV units.',groups:['main-wardrobe','loft','drawer-dresser','bedside','shoe-storage','study-desk','tv-storage'] }
  ],
  groups:[
   ['main-wardrobe','Main wardrobe'],['loft','Loft / overhead storage'],['drawer-dresser','Dresser / drawer unit'],['bedside','Bedside units'],['shoe-storage','Shoe storage'],['study-desk','Study / dressing desk'],['tv-storage','Bedroom TV / media unit']
  ],
  templates:[
   ['wardrobe','Mixed wardrobe',1800,2400,600,3,0,4,1,'main-wardrobe',[]],
   ['wardrobe-hanging','Full hanging wardrobe',1800,2400,600,3,0,1,1,'main-wardrobe',[]],
   ['wardrobe-double-hang','Double-hang wardrobe',1800,2400,600,3,0,1,1,'main-wardrobe',[]],
   ['wardrobe-shelves','Shelf-led wardrobe',1200,2100,500,2,0,6,1,'main-wardrobe',[]],
   ['wardrobe-drawers','Wardrobe with drawers',1500,2400,600,3,4,3,1,'drawer-dresser',['jewellery-tray']],
   ['wardrobe-shoes','Shoe cabinet',900,1800,350,2,0,8,1,'shoe-storage',['shoe-rack']],
   ['wardrobe-loft','Loft cabinet',1800,450,600,3,0,1,0,'loft',[]]
  ],
  accessories:[['shoe-rack','Shoe rack'],['trouser-pullout','Trouser pull-out'],['tie-belt','Tie / belt organiser'],['ironing-board','Pull-out ironing board'],['laundry-hamper','Laundry hamper'],['jewellery-tray','Jewellery tray'],['wardrobe-lift','Wardrobe lift']]
 },
 Kitchen: {
  layouts:[
   {id:'straight-doors',label:'Straight / single wall',desc:'Single run; base, wall and loft groups can be toggled independently.',kitchenTemplate:'straight-doors'},
   {id:'l-drawer-run',label:'L-shaped kitchen',desc:'Main run plus return leg; position corners, sink, hob and appliance spaces.',kitchenTemplate:'l-drawer-run'},
   {id:'u-three-run',label:'U-shaped kitchen',desc:'Three runs with return clearances.',kitchenTemplate:'u-three-run'},
   {id:'c-three-run',label:'C-shaped kitchen',desc:'Three-sided arrangement; verify opening and access.',kitchenTemplate:'c-three-run'},
   {id:'galley-two-run',label:'Parallel / galley kitchen',desc:'Two facing runs; aisle must be checked with doors open.',kitchenTemplate:'galley-two-run'},
   {id:'peninsula-prep',label:'Kitchen with peninsula',desc:'Connected prep extension; verify walk-through and aisle.',kitchenTemplate:'peninsula-prep',groups:['base-units','wall-units','loft','tall-appliances','island-peninsula'] },
   {id:'island-prep',label:'Kitchen with island',desc:'Main run plus freestanding island; circulation and services need separate review.',kitchenTemplate:'island-prep',groups:['base-units','wall-units','loft','tall-appliances','island-peninsula'] },
   {id:'base-only',label:'Base units only',desc:'No wall cabinets or loft; maintain reserved spaces for appliances.',kitchenTemplate:'straight-doors',groups:['base-units'] },
   {id:'base-wall',label:'Base + wall units (no loft)',desc:'Upper cabinets without an overhead loft.',kitchenTemplate:'straight-doors',groups:['base-units','wall-units'] },
   {id:'base-wall-loft',label:'Base + wall units + loft',desc:'Three independently controllable vertical groups.',kitchenTemplate:'l-drawer-run',groups:['base-units','wall-units','loft','tall-appliances'] },
   {id:'wall-only',label:'Wall / top units only',desc:'Upper cabinets without lower cabinets, worktop or loft.',kitchenTemplate:'straight-doors',groups:['wall-units'] },
   {id:'island-only',label:'Island only',desc:'Only a freestanding island; no perimeter base, wall or loft units.',kitchenTemplate:'island-prep',groups:['island-peninsula'] }
  ],
  groups:[
   ['base-units','Base units'],['wall-units','Wall / top units'],['loft','Loft above wall units'],['tall-appliances','Tall pantry / fridge / oven bank'],['island-peninsula','Island / peninsula']
  ],
  templates:[
   ['kitchen-base','Base cabinet · shelves + shutters',600,720,560,1,0,1,0,'base-units',[]],
   ['kitchen-drawers','Drawer base · 3 drawer fronts',600,720,560,0,3,0,0,'base-units',['cutlery-tray']],
   ['kitchen-sink','Sink base',900,720,560,2,0,0,0,'base-units',['sink-organiser']],
   ['kitchen-hob-drawers','Hob base · deep drawers',900,720,560,0,3,0,0,'base-units',[]],
   ['kitchen-wall','Wall / top cabinet',900,720,350,2,0,1,0,'wall-units',[]],
   ['kitchen-liftup','Lift-up wall unit',900,600,350,1,0,1,0,'wall-units',[]],
   ['kitchen-bridge','Bridge cabinet over appliance',900,450,350,2,0,1,0,'wall-units',[]],
   ['kitchen-tall','Tall pantry',600,2100,600,2,0,4,0,'tall-appliances',['pantry-pullout']],
   ['kitchen-fridge','Refrigerator housing',750,2200,700,0,0,0,0,'tall-appliances',['fridge-ventilation']],
   ['kitchen-oven','Oven / microwave tower',600,2100,600,2,1,3,0,'tall-appliances',['microwave-shelf']],
   ['kitchen-island','Island / peninsula storage',1800,900,900,4,2,2,2,'island-peninsula',[]],
   ['kitchen-corner','Corner base unit',900,720,560,2,0,1,1,'base-units',['corner-carousel']],
   ['kitchen-bin','Waste-bin pull-out',600,720,560,1,0,0,0,'base-units',['waste-bin']],
   ['kitchen-spice','Spice pull-out',200,720,560,0,0,0,0,'base-units',['spice-pullout']],
   ['kitchen-bottle','Bottle pull-out',300,720,560,0,0,0,0,'base-units',['bottle-pullout']],
   ['kitchen-pantry-pullout','Tall pantry pull-out',300,2100,560,0,0,0,0,'tall-appliances',['pantry-pullout']]
  ],
  accessories:[['spice-pullout','Spice pull-out'],['bottle-pullout','Bottle / oil pull-out'],['pantry-pullout','Pantry pull-out'],['corner-carousel','Corner carousel / magic corner'],['waste-bin','Waste-bin pull-out'],['sink-organiser','Under-sink organiser'],['microwave-shelf','Appliance shelf'],['cutlery-tray','Cutlery tray'],['fridge-ventilation','Fridge ventilation kit'],['led-profile','LED profile / driver'],['plate-rack','Plate / dish organiser']]
 },
 Bathroom: {
  layouts:[
   {id:'vanity-wall',label:'Single vanity wall',desc:'Vanity base with measured basin, plumbing and mirror position.',groups:['vanity-base'] },
   {id:'vanity-mirror',label:'Vanity + mirror storage',desc:'Coordinate base, mirror cabinet and light / electrical positions.',groups:['vanity-base','mirror-storage'] },
   {id:'vanity-tall',label:'Vanity + tall storage',desc:'Add vertical toiletries or linen storage without obstructing the door.',groups:['vanity-base','tall-storage'] },
   {id:'double-vanity',label:'Double vanity',desc:'Two basin zones; validate plumbing, basin cut-outs and drawer clearances.',groups:['vanity-base','mirror-storage'] },
   {id:'bathroom-suite',label:'Bathroom storage suite',desc:'Vanity, mirror cabinet, tall unit and optional laundry storage.',groups:['vanity-base','mirror-storage','tall-storage','floating-storage','laundry-niche'] }
  ],
  groups:[['vanity-base','Vanity / basin base'],['mirror-storage','Mirror / medicine cabinet'],['tall-storage','Tall toiletries / linen cabinet'],['floating-storage','Floating / wall-hung storage'],['laundry-niche','Laundry / hamper niche']],
  templates:[
   ['vanity','Vanity base',900,600,500,2,1,1,0,'vanity-base',['sink-organiser']],
   ['bathroom-mirror','Mirror cabinet',800,700,150,2,0,2,1,'mirror-storage',[]],
   ['bathroom-tall','Tall toiletries cabinet',450,1800,350,1,0,5,0,'tall-storage',[]],
   ['bathroom-floating','Floating vanity',900,500,500,2,2,0,1,'floating-storage',['sink-organiser']]
  ],
  accessories:[['sink-organiser','Under-basin organiser'],['laundry-hamper','Laundry hamper'],['led-profile','Mirror / cabinet LED']]
 },
 Living: {
  layouts:[
   {id:'tv-wall',label:'TV wall + base console',desc:'Low console, display / media zones, cable path and reserved TV area.',groups:['base-console','feature-panel'] },
   {id:'entertainment-wall',label:'Full entertainment wall',desc:'Base + tall / wall storage + feature panel; keep AV ventilation and access.',groups:['base-console','feature-panel','wall-storage','bookcase-display'] },
   {id:'bookcase-wall',label:'Bookcase / display wall',desc:'Open and closed bays with shelf-span and anchoring checks.',groups:['bookcase-display','wall-storage'] },
   {id:'corner-media',label:'Corner TV / media unit',desc:'Two-run layout; corner geometry and screen viewing angle need checking.',groups:['base-console'] },
   {id:'floating-console',label:'Floating console + feature panel',desc:'Wall-hung unit; fixing substrate and load path must be verified.',groups:['base-console','feature-panel','floating-shelves'] },
   {id:'living-suite',label:'Living-room furniture suite',desc:'Combine media, bookcase, display, sideboard and floating shelves.',groups:['base-console','feature-panel','wall-storage','bookcase-display','floating-shelves'] }
  ],
  groups:[['base-console','Base TV / media console'],['feature-panel','Feature panel / slats / louvers'],['wall-storage','Wall cabinets / overhead storage'],['bookcase-display','Bookcase / display storage'],['floating-shelves','Floating shelves / side units']],
  templates:[
   ['tv-console','TV console',1800,450,400,2,2,1,2,'base-console',['led-profile']],
   ['tv-low-console','Low console with open AV niche',2100,480,420,2,0,1,2,'base-console',[]],
   ['tv-floating-console','Floating console',1800,360,400,0,2,0,2,'base-console',['led-profile']],
   ['tv-six-drawer','Six-drawer console',2100,520,420,0,6,0,2,'base-console',[]],
   ['tv-console-panel','Console + feature panel',2400,1800,400,2,2,2,2,'feature-panel',['led-profile']],
   ['tv-entertainment-wall','Full entertainment wall',3000,2250,420,4,3,3,3,'wall-storage',['led-profile']],
   ['tv-bookcase-wall','Bookcase wall',2700,2250,350,2,0,6,4,'bookcase-display',[]],
   ['tv-full-height-niche','Full-height TV niche',2400,2250,420,2,3,2,2,'feature-panel',['led-profile']],
   ['tv-corner','Corner TV unit',1800,600,500,2,2,2,2,'base-console',[]],
   ['bookshelf','Bookcase / open shelving',1200,2100,300,0,0,6,2,'bookcase-display',[]],
   ['living-display','Display cabinet',1200,2100,400,2,0,5,1,'bookcase-display',['led-profile']],
   ['living-floating','Floating side / console unit',1800,350,400,2,2,1,2,'floating-shelves',[]]
  ],
  accessories:[['led-profile','LED profile / driver'],['microwave-shelf','AV / equipment shelf']]
 },
 Utility: {
  layouts:[
   {id:'laundry-wall',label:'Laundry / service wall',desc:'Worktop, appliance bays, sink and storage zones along one wall.',groups:['base-worktop','laundry-sort','appliance-housing','service-sink'] },
   {id:'base-overhead',label:'Base + overhead storage',desc:'Base cabinets with independently controlled upper storage.',groups:['base-worktop','overhead'] },
   {id:'tall-cleaning',label:'Tall cleaning / broom storage',desc:'Tall bays sized to actual tools, mop, vacuum and supplies.',groups:['tall-cleaning'] },
   {id:'appliance-wall',label:'Appliance / laundry bank',desc:'Reserve appliance dimensions, ventilation, hose and service access.',groups:['appliance-housing','base-worktop','overhead'] },
   {id:'utility-suite',label:'Complete utility suite',desc:'Combine worktop, overhead, tall storage, laundry sorting and appliance bays.',groups:['base-worktop','overhead','tall-cleaning','laundry-sort','appliance-housing','service-sink'] }
  ],
  groups:[['base-worktop','Base / worktop units'],['overhead','Overhead cabinets'],['tall-cleaning','Tall cleaning / broom cabinet'],['laundry-sort','Laundry sorter / hamper'],['appliance-housing','Washing machine / appliance bay'],['service-sink','Service sink / plumbing unit']],
  templates:[
   ['linen','General storage / linen cabinet',900,2100,500,2,0,7,0,'base-worktop',[]],
   ['utility-laundry','Laundry sorter cabinet',900,2100,600,2,2,3,1,'laundry-sort',['laundry-hamper']],
   ['utility-broom','Tall broom / cleaning cabinet',600,2100,500,1,0,2,0,'tall-cleaning',[]],
   ['utility-overhead','Overhead storage',1200,600,350,2,0,1,1,'overhead',[]]
  ],
  accessories:[['laundry-hamper','Laundry hamper'],['sink-organiser','Under-sink organiser'],['microwave-shelf','Appliance shelf']]
 }
};

const defaultLayouts = {Wardrobe:'wardrobe-wall',Kitchen:'l-drawer-run',Bathroom:'vanity-mirror',Living:'tv-wall',Utility:'laundry-wall'};
let bySpace = {};
let currentSpace = 'Wardrobe';
let booted = false;

function fresh(space) {
 const spec=catalog[space]||catalog.Wardrobe;
 const layout=defaultLayouts[space]||spec.layouts[0].id;
 let groups=spec.groups.map(g=>g[0]);
 if(space==='Wardrobe')groups=['main-wardrobe'];
 if(space==='Kitchen')groups=['base-units','wall-units','loft','tall-appliances'];
 if(space==='Bathroom')groups=['vanity-base','mirror-storage'];
 if(space==='Living')groups=['base-console','feature-panel'];
 if(space==='Utility')groups=['base-worktop','overhead'];
 const layoutSpec=spec.layouts.find(x=>x.id===layout);if(layoutSpec?.groups)groups=[...layoutSpec.groups];
 return {space,layout,groups,units:[],notes:'',constraints:{doorWidth:0,doorOffset:0,windowWidth:0,windowOffset:0,clearanceTarget:900,fixedItems:''}};
}
function normalizePlan(plan,space){const p=plan&&typeof plan==='object'?plan:fresh(space);if(!Array.isArray(p.groups))p.groups=fresh(space).groups;if(!Array.isArray(p.units))p.units=[];if(!p.constraints||typeof p.constraints!=='object')p.constraints={doorWidth:0,doorOffset:0,windowWidth:0,windowOffset:0,clearanceTarget:900,fixedItems:''};p.constraints={doorWidth:0,doorOffset:0,windowWidth:0,windowOffset:0,clearanceTarget:900,fixedItems:'',...p.constraints};if(typeof p.notes!=='string')p.notes='';return p;}
function getPlan(space=currentSpace){if(!bySpace[space])bySpace[space]=fresh(space);bySpace[space]=normalizePlan(bySpace[space],space);return bySpace[space];}
function save(){try{localStorage.setItem(STORE_KEY,JSON.stringify({version:1,bySpace}));}catch(e){const s=$('#roomPlannerStatus');if(s)s.textContent='Browser storage is full or unavailable; export the project backup.';}document.dispatchEvent(new CustomEvent('dcode:room-plan-updated'));}
function selectedOptions(items,value){return items.map(x=>'<option value="'+esc(x.id)+'"'+(x.id===value?' selected':'')+'>'+esc(x.label)+'</option>').join('');}
function templateRow(t){return {id:t[0],label:t[1],width:t[2],height:t[3],depth:t[4],doors:t[5],drawers:t[6],shelves:t[7],partitions:t[8],group:t[9],accessories:t[10]||[]};}
function groupLabel(space,id){return (catalog[space]?.groups||[]).find(g=>g[0]===id)?.[1]||id;}
function getZones(space=currentSpace,layout=''){
 const common={
  Wardrobe:[['wall-a','Wall A / main run'],['wall-b','Wall B / return'],['wall-c','Wall C / third wall'],['corner','Corner zone'],['centre','Centre / freestanding'],['walkway','Walk-in side / passage']],
  Kitchen:[['runA','Main run / Run A'],['runB','Return or opposing run / Run B'],['runC','Third run / Run C'],['tall-bank','Tall-unit bank'],['island','Island'],['peninsula','Peninsula'],['unassigned','Not assigned']],
  Bathroom:[['vanity-wall','Vanity / basin wall'],['mirror-zone','Mirror / medicine storage zone'],['wall-b','Adjacent wall / tall storage'],['corner','Corner zone'],['unassigned','Not assigned']],
  Living:[['tv-wall','TV / main feature wall'],['wall-b','Return wall / Wall B'],['display-wall','Display / bookcase wall'],['corner','Corner zone'],['centre','Centre / freestanding'],['unassigned','Not assigned']],
  Utility:[['service-wall','Main service wall'],['appliance-bay','Appliance bay'],['overhead-zone','Overhead zone'],['tall-bank','Tall storage zone'],['wall-b','Adjacent wall'],['unassigned','Not assigned']]
 };
 let items=common[space]||[['wall-a','Wall A / main run'],['unassigned','Not assigned']];
 if(space==='Kitchen'){const hasB=['l-drawer-run','l-doors','l-drawers','l-alternating','l-open-short','l-wall-one-leg','l-pantry','l-pantry-fridge','l-appliance','l-open-pantry','u-three-run','c-three-run','galley-two-run'].includes(layout),hasC=['u-three-run','c-three-run'].includes(layout),hasIsland=['island-only','island-prep','island-sink','island-hob'].includes(layout),hasPeninsula=layout==='peninsula-prep';items=items.filter(([id])=>id==='runA'||id==='tall-bank'||id==='unassigned'||(id==='runB'&&hasB)||(id==='runC'&&hasC)||(id==='island'&&hasIsland)||(id==='peninsula'&&hasPeninsula));}
 return items;
}
function zoneLabel(space,id){const common={runA:'Main run / Run A',runB:'Return or opposing run / Run B',runC:'Third run / Run C',island:'Island',peninsula:'Peninsula',unassigned:'Not assigned','wall-a':'Wall A / main run','wall-b':'Wall B / return','wall-c':'Wall C / third wall',corner:'Corner zone',centre:'Centre / freestanding',walkway:'Walk-in side / passage','vanity-wall':'Vanity / basin wall','mirror-zone':'Mirror / medicine storage zone','tv-wall':'TV / main feature wall','display-wall':'Display / bookcase wall','service-wall':'Main service wall','appliance-bay':'Appliance bay','overhead-zone':'Overhead zone','tall-bank':'Tall storage zone'};return common[id]||getZones(space,bySpace[space]?.layout||defaultLayouts[space]).find(x=>x[0]===id)?.[1]||'Not assigned';}
function surveyReviewHtml(plan){const c=plan.constraints||{},roomW=Number($('#d-roomW')?.value)||0,issues=[];if(!roomW)issues.push('Enter the measured room width in Step 4 before checking opening bounds.');if(Number(c.doorWidth)>0&&roomW>0&&Number(c.doorOffset)+Number(c.doorWidth)>roomW)issues.push('Door opening offset + width exceeds the entered room width.');if(Number(c.windowWidth)>0&&roomW>0&&Number(c.windowOffset)+Number(c.windowWidth)>roomW)issues.push('Window / opening offset + width exceeds the entered room width.');const title=issues.length?'Review room constraints':'No opening-width overflow detected';return '<strong>'+title+'</strong><ul>'+((issues.length?issues:['No out-of-bounds opening detected from these values. Unit-to-door/window collisions and clearance certification are not calculated here.']).map(x=>'<li>'+esc(x)+'</li>').join(''))+'</ul>'+(c.fixedItems?'<span>Fixed items / services noted: '+esc(c.fixedItems)+'</span>':'');}
function getTemplates(space=currentSpace){return (catalog[space]?.templates||[]).map(templateRow);}
function render() {
 const root=$('#roomPlannerApp'); if(!root)return;
 const plan=getPlan(),spec=catalog[currentSpace]||catalog.Wardrobe,layouts=spec.layouts;
 const templates=getTemplates(),chosenLayout=layouts.find(x=>x.id===plan.layout)||layouts[0],zones=getZones(currentSpace,plan.layout),constraints=plan.constraints||{};
 const groups=spec.groups;
 const activeTemplateId=$('#rpUnitTemplate')?.value,selectedTemplateId=templates.some(t=>t.id===activeTemplateId)?activeTemplateId:(templates[0]?.id||''),activeGroupId=$('#rpUnitGroup')?.value,selectedGroupId=groups.some(g=>g[0]===activeGroupId)?activeGroupId:(templates.find(t=>t.id===selectedTemplateId)?.group||groups[0]?.[0]),activeZoneId=$('#rpZone')?.value,selectedZoneId=zones.some(z=>z[0]===activeZoneId)?activeZoneId:(zones[0]?.[0]||'unassigned');
 const includedUnits=plan.units.filter(u=>plan.groups.includes(u.group)).length;
 const excludedUnits=plan.units.length-includedUnits;
 root.innerHTML=`
 <div class="rp-kicker">ROOM-FIRST PLANNING · ${esc(currentSpace.toUpperCase())}</div>
 <div class="rp-intro"><strong>Plan the room, then its furniture units</strong><p>Room shape and included groups define the scope. Every added unit keeps its own template, dimensions, shutter/drawer counts and accessory checklist. Step 4 remains the place to enter surveyed room dimensions and check fit.</p></div>
 <div class="rp-layout-grid">
  <label>Room layout template<select id="rpLayout">${selectedOptions(layouts,plan.layout)}</select><small>${esc(chosenLayout.desc)}</small></label>
  <label>Planning notes<textarea id="rpNotes" rows="2" placeholder="e.g. window centred on sink wall; door swing; keep fridge clearance">${esc(plan.notes||'')}</textarea></label>
 </div>
 <div class="rp-section-heading"><strong>Room constraints &amp; fixed items</strong><span>Room width / depth / height are entered in Step 4. Opening bounds are preliminary coordination checks.</span></div>
 <div class="rp-survey-grid">
  <label>Door opening width · mm<input data-rp-constraint="doorWidth" type="number" min="0" value="${Number(constraints.doorWidth)||0}"></label>
  <label>Door offset from reference wall · mm<input data-rp-constraint="doorOffset" type="number" min="0" value="${Number(constraints.doorOffset)||0}"></label>
  <label>Window / opening width · mm<input data-rp-constraint="windowWidth" type="number" min="0" value="${Number(constraints.windowWidth)||0}"></label>
  <label>Window offset from reference wall · mm<input data-rp-constraint="windowOffset" type="number" min="0" value="${Number(constraints.windowOffset)||0}"></label>
  <label>Clear-path target · mm<input data-rp-constraint="clearanceTarget" type="number" min="0" value="${Number(constraints.clearanceTarget)||900}"></label>
  <label>Columns, plumbing, sockets, radiators &amp; fixed items<textarea data-rp-constraint="fixedItems" rows="2" placeholder="Record fixed obstacles and service positions">${esc(constraints.fixedItems||'')}</textarea></label>
 </div>
 <div class="rp-survey-review" id="rpSurveyReview" role="status">${surveyReviewHtml(plan)}</div>
 <div class="rp-section-heading"><strong>Furniture groups to include</strong><span>Toggle groups independently; existing units are retained but excluded units cannot be generated.</span></div>
 <div class="rp-groups">${groups.map(([id,label])=>'<label class="rp-group"><input type="checkbox" data-rp-group="'+esc(id)+'" '+(plan.groups.includes(id)?'checked':'')+'><span><b>'+esc(label)+'</b><small>'+esc(groupDescription(currentSpace,id))+'</small></span></label>').join('')}</div>
 <div class="rp-section-heading"><strong>Add a furniture unit</strong><span>One row represents a configurable unit / cabinet type.</span></div>
 <div class="rp-unit-builder">
  <div class="rp-builder-grid">
   <label>Furniture group<select id="rpUnitGroup">${groups.map(([id,label])=>'<option value="'+esc(id)+'"'+(id===selectedGroupId?' selected':'')+'>'+esc(label)+'</option>').join('')}</select></label>
   <label>Unit template<select id="rpUnitTemplate">${templates.map(t=>'<option value="'+esc(t.id)+'"'+(t.id===selectedTemplateId?' selected':'')+'>'+esc(t.label)+'</option>').join('')}</select></label>
   <label>Unit / module name<input id="rpUnitName" maxlength="100" placeholder="e.g. Sink Base 01"></label>
   <label>Wall / zone<select id="rpZone">${zones.map(([id,label])=>'<option value="'+esc(id)+'"'+(id===selectedZoneId?' selected':'')+'>'+esc(label)+'</option>').join('')}</select></label>
   <label>Width · mm<input id="rpWidth" type="number" min="1" value="600"></label>
   <label>Height · mm<input id="rpHeight" type="number" min="1" value="720"></label>
   <label>Depth · mm<input id="rpDepth" type="number" min="1" value="560"></label>
   <label>Quantity of identical units<input id="rpQty" type="number" min="1" step="1" value="1"></label>
   <label>Shutters / doors<input id="rpDoors" type="number" min="0" step="1" value="2"></label>
   <label>Drawer fronts<input id="rpDrawers" type="number" min="0" step="1" value="0"></label>
   <label>Shelf count<input id="rpShelves" type="number" min="0" step="1" value="1"></label>
   <label>Vertical partitions<input id="rpPartitions" type="number" min="0" step="1" value="0"></label>
  </div>
  <div class="rp-accessories"><strong>Accessories for this unit</strong><div id="rpAccessoryOptions" class="rp-accessory-grid">${renderAccessoryOptions(spec.accessories,[])}</div></div>
  <div class="rp-builder-actions"><button id="rpAddUnit" type="button" class="dark-btn">+ Add unit to room plan</button><span id="rpBuilderHint">Template dimensions are starter values. Confirm measured dimensions before manufacture.</span></div>
 </div>
 <div class="rp-section-heading"><strong>Room furniture schedule</strong><span>${plan.units.length} planned unit(s) · ${includedUnits} included · ${excludedUnits} excluded</span></div>
 <div class="rp-unit-list">${plan.units.length?plan.units.map((u,i)=>renderUnit(u,i,plan.groups)).join(''):'<div class="rp-empty">No units added yet. Choose a template above and add the first furniture unit.</div>'}</div>
 <div class="rp-footer"><span id="roomPlannerStatus" role="status">Room plan saves automatically in this browser and with the project snapshot.</span><button type="button" class="light-btn" id="rpExportPlan">Export room plan JSON</button></div>
 <p class="rp-disclaimer">This is the room-level scope and unit schedule. Loading or generating one unit uses the current parametric designer. Automatic room-wide placement, service routing, clearances and final manufacturing parts must still be reviewed; this planner does not certify installation or joinery.</p>`;
 const templateSelect=$('#rpUnitTemplate');
 templateSelect?.addEventListener('change',()=>{const t=templates.find(x=>x.id===templateSelect.value);if(t){$('#rpWidth').value=t.width;$('#rpHeight').value=t.height;$('#rpDepth').value=t.depth;$('#rpDoors').value=t.doors;$('#rpDrawers').value=t.drawers;$('#rpShelves').value=t.shelves;$('#rpPartitions').value=t.partitions;$('#rpUnitGroup').value=t.group;$('#rpUnitName').value=t.label+' '+String(plan.units.length+1).padStart(2,'0');if(!plan.groups.includes(t.group)){plan.groups=[...plan.groups,t.group];const groupBox=root.querySelector('[data-rp-group="'+t.group+'"]');if(groupBox)groupBox.checked=true;save();}renderAccessoryOptionsInto(t.accessories);}});
 $('#rpUnitGroup')?.addEventListener('change',()=>{const g=$('#rpUnitGroup').value;if(!plan.groups.includes(g)){$('#roomPlannerStatus').textContent='This group is currently excluded. Enable it above if you want to generate this unit.';}});
 $('#rpLayout')?.addEventListener('change',e=>{plan.layout=e.target.value;const l=layouts.find(x=>x.id===plan.layout);if(l?.groups)plan.groups=[...l.groups];save();if(currentSpace==='Kitchen'&&l?.kitchenTemplate)document.dispatchEvent(new CustomEvent('dcode:room-layout-select',{detail:{space:currentSpace,layout:plan.layout,kitchenTemplate:l.kitchenTemplate,groups:[...plan.groups]}}));render();});
 $('#rpNotes')?.addEventListener('change',e=>{plan.notes=e.target.value;save();});
 root.querySelectorAll('[data-rp-constraint]').forEach(el=>{const updateConstraint=()=>{const key=el.dataset.rpConstraint;plan.constraints=plan.constraints||{};plan.constraints[key]=el.type==='number'?(Number(el.value)||0):el.value;save();const review=root.querySelector('#rpSurveyReview');if(review)review.innerHTML=surveyReviewHtml(plan);};el.addEventListener('change',updateConstraint);});
 root.querySelectorAll('[data-rp-group]').forEach(el=>el.addEventListener('change',()=>{const id=el.dataset.rpGroup;plan.groups=el.checked?[...new Set([...plan.groups,id])]:plan.groups.filter(x=>x!==id);save();document.dispatchEvent(new CustomEvent('dcode:room-groups-change',{detail:{space:currentSpace,groups:[...plan.groups]}}));render();}));
 const initialTemplate=templates.find(t=>t.id===$('#rpUnitTemplate')?.value)||templates[0];if(initialTemplate){$('#rpWidth').value=initialTemplate.width;$('#rpHeight').value=initialTemplate.height;$('#rpDepth').value=initialTemplate.depth;$('#rpDoors').value=initialTemplate.doors;$('#rpDrawers').value=initialTemplate.drawers;$('#rpShelves').value=initialTemplate.shelves;$('#rpPartitions').value=initialTemplate.partitions;$('#rpUnitGroup').value=initialTemplate.group;$('#rpUnitName').value=initialTemplate.label+' '+String(plan.units.length+1).padStart(2,'0');renderAccessoryOptionsInto(initialTemplate.accessories);}
 $('#rpAddUnit')?.addEventListener('click',()=>addUnit());
 $('#rpExportPlan')?.addEventListener('click',()=>{const blob=new Blob([JSON.stringify({format:'dcode-room-plan',version:1,space:currentSpace,roomDimensions:{widthMm:Number($('#d-roomW')?.value)||0,depthMm:Number($('#d-roomD')?.value)||0,heightMm:Number($('#d-roomH')?.value)||0},plan},null,2)],{type:'application/json'});const url=URL.createObjectURL(blob),a=document.createElement('a');a.href=url;a.download='DCODE-'+currentSpace.toLowerCase()+'-room-plan.json';a.click();setTimeout(()=>URL.revokeObjectURL(url),1000);});
 root.querySelectorAll('[data-rp-action]').forEach(btn=>btn.addEventListener('click',()=>{const u=plan.units.find(x=>x.id===btn.dataset.rpId);if(!u)return;const action=btn.dataset.rpAction;
  if(action==='remove'){plan.units=plan.units.filter(x=>x.id!==u.id);save();render();return;}
  if(!plan.groups.includes(u.group)){const s=$('#roomPlannerStatus');if(s)s.textContent='This unit belongs to an excluded group. Enable the group before using it.';return;}
  document.dispatchEvent(new CustomEvent(action==='generate'?'dcode:room-generate-unit':'dcode:room-load-unit',{detail:{unit:copy(u),space:currentSpace}}));
  const s=$('#roomPlannerStatus');if(s)s.textContent=action==='generate'?'Generating unit and adding its panel proposal to the Designer Cutlist…':'Loaded '+u.name+' into the parametric unit designer. Review the preview and dimensions.';
 }));
}
function groupDescription(space,id){
 const labels={
  'main-wardrobe':'Main storage bays and front system','loft':'Separate overhead zone; check ceiling / access',
  'drawer-dresser':'Drawer or dressing storage','bedside':'Left / right bedside furniture','shoe-storage':'Shoe shelves or pull-out racks','study-desk':'Desk, shelf or dressing surface','tv-storage':'Bedroom media / storage unit',
  'base-units':'Lower cabinets, sink, hob and drawer bases','wall-units':'Top cabinets, open shelves or lift-up fronts','tall-appliances':'Tall pantry, fridge and oven housing','island-peninsula':'Standalone or connected secondary run',
  'vanity-base':'Basin cabinet with plumbing clearance','mirror-storage':'Mirror / medicine cabinet and lighting','tall-storage':'Tall toiletries / linen unit','floating-storage':'Wall-hung unit; fixing capacity needed','laundry-niche':'Hamper or washing-machine storage',
  'base-console':'Base media storage and AV openings','feature-panel':'Decorative panel, fluting or louvers','wall-storage':'Upper storage / closed cabinets','bookcase-display':'Open shelves, display and books','floating-shelves':'Wall-mounted secondary pieces',
  'base-worktop':'Lower cabinets or work surface','overhead':'Upper cabinets above service zone','tall-cleaning':'Tall tool / broom / cleaning storage','laundry-sort':'Sorting baskets and laundry storage','appliance-housing':'Machine / appliance envelope','service-sink':'Sink / plumbing-related storage'
 };
 return labels[id]||'Furniture zone / unit group';
}
function renderAccessoryOptions(items,checked){return items.map(([id,label])=>'<label><input type="checkbox" data-rp-accessory="'+esc(id)+'" '+(checked.includes(id)?'checked':'')+'><span>'+esc(label)+'</span></label>').join('');}
function renderAccessoryOptionsInto(checked){const host=$('#rpAccessoryOptions');if(host)host.innerHTML=renderAccessoryOptions((catalog[currentSpace]?.accessories||[]),checked);}
function renderUnit(u,i,included){
 const active=included.includes(u.group);
 return '<article class="rp-unit-card '+(active?'':'rp-excluded')+'"><div class="rp-unit-card-head"><div><span class="rp-unit-index">'+String(i+1).padStart(2,'0')+'</span><div><strong>'+esc(u.name)+'</strong><small>'+esc(groupLabel(currentSpace,u.group))+' · '+esc(u.templateLabel||u.template)+'</small></div></div><span class="rp-state">'+(active?'Included':'Group excluded')+'</span></div><div class="rp-unit-specs"><span>'+u.width+' × '+u.height+' × '+u.depth+' mm</span><span>Zone: '+esc(zoneLabel(currentSpace,u.zone||''))+'</span><span>Qty '+u.qty+'</span><span>'+u.doors+' shutters</span><span>'+u.drawers+' drawers</span><span>'+u.shelves+' shelves</span></div><p class="rp-unit-accessories">'+(u.accessories?.length?'Accessories: '+u.accessories.map(a=>esc((catalog[currentSpace]?.accessories||[]).find(x=>x[0]===a)?.[1]||a)).join(', '):'No accessories selected')+'</p><div class="rp-unit-actions"><button type="button" class="light-btn" data-rp-action="load" data-rp-id="'+esc(u.id)+'" '+(!active?'disabled':'')+'>Load into designer</button><button type="button" class="dark-btn" data-rp-action="generate" data-rp-id="'+esc(u.id)+'" '+(!active?'disabled':'')+'>Generate + add to Cutlist</button><button type="button" class="light-btn" data-rp-action="remove" data-rp-id="'+esc(u.id)+'">Remove</button></div></article>';
}
function addUnit(){
 const plan=getPlan(),templates=getTemplates(),template=templates.find(t=>t.id===$('#rpUnitTemplate')?.value)||templates[0],group=$('#rpUnitGroup')?.value||template?.group;
 const name=String($('#rpUnitName')?.value||'').trim()||template?.label||'Furniture unit';
 const unit={id:'unit-'+Date.now().toString(36)+'-'+Math.random().toString(36).slice(2,7),space:currentSpace,group,zone:$('#rpZone')?.value||'unassigned',template:template?.id||'custom',templateLabel:template?.label||'Custom unit',name,width:Number($('#rpWidth')?.value),height:Number($('#rpHeight')?.value),depth:Number($('#rpDepth')?.value),qty:Math.floor(Number($('#rpQty')?.value)||1),doors:Math.floor(Number($('#rpDoors')?.value)||0),drawers:Math.floor(Number($('#rpDrawers')?.value)||0),shelves:Math.floor(Number($('#rpShelves')?.value)||0),partitions:Math.floor(Number($('#rpPartitions')?.value)||0),accessories:[...document.querySelectorAll('[data-rp-accessory]:checked')].map(el=>el.dataset.rpAccessory)};
 if(!(unit.width>0&&unit.height>0&&unit.depth>0&&unit.qty>0)){const s=$('#roomPlannerStatus');if(s)s.textContent='Width, height, depth and unit quantity must all be positive values.';return;}
 if([unit.qty,unit.doors,unit.drawers,unit.shelves,unit.partitions].some(n=>!Number.isInteger(n)||n<0)){const s=$('#roomPlannerStatus');if(s)s.textContent='Counts must be whole numbers. Shutters, drawers, shelves and partitions may be zero.';return;}
 if(!plan.groups.includes(group)){const s=$('#roomPlannerStatus');if(s)s.textContent='Enable the selected furniture group before adding its unit.';return;}
 plan.units.push(unit);save();render();const s=$('#roomPlannerStatus');if(s)s.textContent='Added '+name+' to the room plan. You can add another unit or generate this one for cut-list review.';
}
function readStored(){try{const x=JSON.parse(localStorage.getItem(STORE_KEY)||'{}');return x?.version===1&&x.bySpace&&typeof x.bySpace==='object'?x.bySpace:{};}catch(e){return {};}}
export function getRoomPlannerSnapshot(){return {version:1,bySpace:copy(bySpace),currentSpace};}
export function createRoomPlannerSnapshot(space=currentSpace){const next=copy(bySpace);next[space]=fresh(space);return {version:1,bySpace:next,currentSpace:space};}
export function restoreRoomPlannerSnapshot(snapshot){if(snapshot?.version===1&&snapshot.bySpace&&typeof snapshot.bySpace==='object'){bySpace=copy(snapshot.bySpace);Object.keys(catalog).forEach(s=>{if(!bySpace[s])bySpace[s]=fresh(s);bySpace[s]=normalizePlan(bySpace[s],s);});}else{Object.keys(catalog).forEach(s=>{if(!bySpace[s])bySpace[s]=fresh(s);bySpace[s]=normalizePlan(bySpace[s],s);});}currentSpace=$('#d-space')?.value||snapshot?.currentSpace||currentSpace;getPlan();save();render();}
export function initRoomPlanner(){
 if(booted)return;const root=$('#designRoomPlanner');if(!root||!$('#roomPlannerApp'))return;booted=true;
 bySpace=readStored();Object.keys(catalog).forEach(s=>{if(!bySpace[s])bySpace[s]=fresh(s);});
 currentSpace=$('#d-space')?.value||currentSpace;getPlan();render();
 $('#d-space')?.addEventListener('change',e=>{currentSpace=e.target.value;getPlan();render();save();});
 document.addEventListener('dcode:room-plan-refresh',()=>{currentSpace=$('#d-space')?.value||currentSpace;getPlan();render();});
 document.addEventListener('dcode:template-selected',()=>{currentSpace=$('#d-space')?.value||currentSpace;getPlan();render();});
 document.addEventListener('dcode:room-unit-loaded',()=>{const s=$('#roomPlannerStatus');if(s)s.textContent='Unit loaded. Configure any missing hardware values and verify the preview before adding parts.';});
 document.addEventListener('change',e=>{if(e.target.closest('#roomPlannerApp')&&e.target.matches('[data-rp-accessory]')){const chosen=[...document.querySelectorAll('[data-rp-accessory]:checked')].map(el=>el.dataset.rpAccessory);const t=getTemplates().find(x=>x.id===$('#rpUnitTemplate')?.value);if(t&&$('#rpUnitName')&&!$('#rpUnitName').value)$('#rpUnitName').value=t.label+' '+String(getPlan().units.length+1).padStart(2,'0');}});
 renderAccessoryOptionsInto(getTemplates()[0]?.accessories||[]);
}