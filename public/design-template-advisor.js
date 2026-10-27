/* DCODE context-aware template adviser. Deterministic local rules, not an LLM. */
const $ = s => document.querySelector(s);
const spaces = {
 Wardrobe: {
  needs:[
   ["balanced","Balanced storage · hanging + shelves"],
   ["hanging","Long clothes · dresses / coats"],
   ["double-hang","Short clothes · two hanging levels"],
   ["drawers","Folded clothes · drawers + shelves"],
   ["shelves","Mostly folded clothes / linen"],
   ["shoes","Shoes / shallow storage"],
   ["loft","Overhead loft storage"],
   ["sliding","Sliding shutters · limited front clearance"],
   ["compact","Compact / narrow wardrobe"]
  ],
  candidates:[
   {id:"wardrobe",name:"Mixed storage",needs:["balanced"],related:["hanging","shelves"],reason:"Balances a hanging bay with shelves; a flexible first layout when the storage split is not yet decided.",base:{width:1800,height:2400,depth:600}},
   {id:"wardrobe-hanging",name:"Full hanging",needs:["hanging"],reason:"Prioritises a continuous hanging bay with a top shelf; useful when clothes need full-height clear space.",base:{width:1200,height:2400,depth:600}},
   {id:"wardrobe-double-hang",name:"Double hanging",needs:["double-hang"],reason:"Uses upper and lower hanging levels for shirts and shorter garments; not suitable for long garments without a separate bay.",base:{width:1200,height:2400,depth:600}},
   {id:"wardrobe-shelves",name:"Shelf-led wardrobe",needs:["shelves"],related:["balanced","compact","hanging"],reason:"Uses adjustable shelf positions for folded clothes and linen instead of dedicating space to a hanging rail; it is also a sensible alternative if hanging depth is too shallow.",base:{width:900,height:2100,depth:550}},
   {id:"wardrobe-drawers",name:"Drawer wardrobe",needs:["drawers"],related:["shelves","balanced"],reason:"Combines drawers for small/folded items with upper shelves; runner and drawer-box rules still need the exact system.",base:{width:900,height:2100,depth:550},caution:"Select the runner model before calculating drawer-box cut sizes."},
   {id:"wardrobe-shoes",name:"Shoe storage",needs:["shoes"],related:["compact","shelves"],reason:"Prioritises shelf pitch and visibility for footwear; check actual shoe depth and shelf angle.",base:{width:900,height:2100,depth:350}},
   {id:"wardrobe-loft",name:"Overhead loft",needs:["loft"],related:["compact"],reason:"A short-height cabinet suited to seasonal items above the main wardrobe; measure ceiling height and installation gap.",base:{width:1800,height:600,depth:600}},
   {id:"sliding",name:"Sliding wardrobe",needs:["sliding"],related:["compact"],reason:"Useful where hinged shutters would interfere with circulation; exact track and overlap deductions are mandatory.",base:{width:1800,height:2400,depth:650},caution:"Track model and manufacturer clearances are not selected, so shutter sizing remains on hold."},
   {id:"open-shelf",name:"Open shelf unit",needs:[],reason:"This preset is not recommended here because it belongs to the Living space in the template catalogue.",base:{width:900,height:1800,depth:300}},
   {id:"custom",name:"Custom configuration",needs:["compact","balanced","hanging","double-hang","drawers","shelves","shoes","loft","sliding"],reason:"Use manual component configuration when the layout does not match a standard starter.",base:{width:900,height:1800,depth:500}}
  ]
 },
 Kitchen:{
  needs:[["base-storage","Base storage · doors + shelves"],["drawers","Drawers · utensils / cookware"],["sink","Sink / plumbing bay"],["wall-storage","Wall storage"],["lift-up","Lift-up shutters"],["tall-pantry","Tall pantry"],["pull-out","Pull-out storage · general"],["spice","Spice pull-out"],["bottle","Bottle / oil pull-out"],["waste","Waste / recycling pull-out"],["pantry-pullout","Tall pantry pull-out"],["corner","Corner access"],["appliance","Appliance / oven housing"],["island","Island / peninsula"]],
  candidates:[
   {id:"kitchen-base",name:"Base cabinet",needs:["base-storage"],reason:"A conventional base carcass is the safest starting point for general storage when sink/hob details are unknown.",base:{width:900,height:720,depth:560}},
   {id:"kitchen-drawers",name:"Drawer base",needs:["drawers"],reason:"Prioritises drawer-front layout. Box cut sizes stay provisional until runner deductions and box construction are supplied.",base:{width:600,height:720,depth:560},caution:"Select exact runner model before calculating drawer-box sizes."},
   {id:"kitchen-sink",name:"Sink base",needs:["sink"],reason:"Reserves the sink zone and access envelope; actual bowl cut-out, trap and plumbing notches must come from measured fixtures.",base:{width:900,height:720,depth:560},caution:"Sink cut-out and plumbing access are not inferred."},
   {id:"kitchen-wall",name:"Wall cabinet",needs:["wall-storage"],reason:"Adds upper storage; check wall fixings, door swing, ceiling and backsplash clearance.",base:{width:900,height:720,depth:350}},
   {id:"kitchen-liftup",name:"Lift-up wall unit",needs:["lift-up"],related:["wall-storage"],reason:"Use where a single upward-opening front makes more sense than side-swing doors; mechanism and door-weight rating must be confirmed.",base:{width:900,height:600,depth:350},caution:"Exact lift mechanism required before door weight and drilling checks."},
   {id:"kitchen-tall",name:"Tall pantry",needs:["tall-pantry"],related:["appliance"],reason:"Uses height for dry goods and small appliances; split internal shelves only after the intended stored items are known.",base:{width:600,height:2100,depth:600}},
   {id:"kitchen-spice",name:"Spice pull-out",needs:["spice"],related:["pull-out"],reason:"Fits a narrow dedicated bay; choose the exact frame width and account for the carcass opening.",base:{width:200,height:720,depth:560},caution:"Frame model, clear opening and load rating are required."},
   {id:"kitchen-bottle",name:"Bottle pull-out",needs:["bottle"],related:["pull-out"],reason:"Useful for oils and bottles in a narrow bay; confirm bottle height and exact frame dimensions.",base:{width:300,height:720,depth:560},caution:"Frame model, clear opening and load rating are required."},
   {id:"kitchen-pantry-pullout",name:"Tall pantry pull-out",needs:["pantry-pullout"],related:["pull-out","tall-pantry"],reason:"A slim full-height pull-out is an option when a measured narrow opening is available; select the exact frame and load rating.",base:{width:300,height:2100,depth:560},caution:"Frame model, clear opening, travel and load rating are required."},
   {id:"kitchen-bin",name:"Waste-bin pull-out",needs:["waste"],related:["pull-out"],reason:"Useful for waste/recycling near preparation or the sink; check actual bin dimensions, door opening and plumbing conflicts.",base:{width:600,height:720,depth:560}},
   {id:"kitchen-corner",name:"Corner base",needs:["corner"],reason:"Use when the measured run actually contains a corner; a generic box does not prove carousel or magic-corner compatibility.",base:{width:900,height:720,depth:560},caution:"Corner geometry and selected hardware need separate validation."},
   {id:"kitchen-oven",name:"Oven / appliance tower",needs:["appliance","tall-pantry"],reason:"Organises appliance niches vertically; dimensions, ventilation and fixing must follow the exact appliance installation manual.",base:{width:600,height:2100,depth:600},caution:"Exact appliance model and ventilation dimensions required."},
   {id:"kitchen-fridge",name:"Refrigerator housing",needs:["appliance"],reason:"A dedicated appliance envelope; verify actual niche, ventilation, door swing and service clearances from the exact manual.",base:{width:750,height:2200,depth:700},caution:"Exact appliance model and ventilation dimensions required."},
   {id:"kitchen-garage",name:"Appliance garage",needs:["appliance"],reason:"A compact countertop appliance bay; confirm appliance sizes, heat, socket position, door travel and ventilation.",base:{width:900,height:450,depth:400},caution:"Exact appliance models and ventilation requirements required."},
   {id:"kitchen-island",name:"Island / peninsula",needs:["island"],reason:"Use only when the room layout and circulation support an island or peninsula; check aisle widths and services.",base:{width:1800,height:900,depth:900},caution:"Room circulation, anchoring and service routes need site review."},
   {id:"custom",name:"Custom kitchen unit",needs:["base-storage","drawers","sink","wall-storage","lift-up","tall-pantry","pull-out","corner","appliance","island"],reason:"For a unit that does not match a standard starter.",base:{width:600,height:720,depth:560}}
  ]
 },
 Bathroom:{
  needs:[["vanity","Vanity storage"],["mirror-storage","Mirror cabinet / medicine storage"],["tall-storage","Tall toiletries / linen storage"],["floating","Floating / wall-hung furniture"],["compact","Compact basin unit"]],
  candidates:[
   {id:"vanity",name:"Bathroom vanity",needs:["vanity","compact"],reason:"Starts with a base unit for basin-adjacent storage; coordinate the actual basin, trap and pipe routes.",base:{width:900,height:600,depth:500},caution:"Basin cut-outs, plumbing and moisture-resistant construction must be verified."},
   {id:"bathroom-mirror",name:"Mirror cabinet",needs:["mirror-storage"],reason:"Combines a mirror face with shallow storage; mirror, hinge swing, wall fixing and safe glazing are separate checks.",base:{width:800,height:700,depth:150},caution:"Mirror type, edge processing and wall anchors must be selected."},
   {id:"bathroom-tall",name:"Tall storage tower",needs:["tall-storage"],reason:"Uses vertical space for toiletries and towels; confirm door swing and clearances beside sanitaryware.",base:{width:450,height:1800,depth:350}},
   {id:"bathroom-floating",name:"Floating vanity",needs:["floating"],related:["vanity"],reason:"A wall-hung arrangement frees the floor visually, but wall substrate, anchors and loading must be verified.",base:{width:900,height:500,depth:500},caution:"Wall construction and load-rated fixing system required."},
   {id:"custom",name:"Custom bathroom storage",needs:["vanity","mirror-storage","tall-storage","floating","compact"],reason:"Use when basin, plumbing or wall constraints require a non-standard layout.",base:{width:600,height:750,depth:450}}
  ]
 },
 Living:{
  needs:[["media","TV / AV storage"],["floating","Floating console"],["feature-panel","Feature panel / slats"],["entertainment","Full entertainment wall"],["bookcase","Books / open display"],["display","Display cabinet"],["corner","Corner unit"],["compact","Low compact console"]],
  candidates:[
   {id:"tv-console",name:"Standard TV console",needs:["media","compact"],reason:"A lower console for everyday AV storage; confirm equipment ventilation, cable routes and service access.",base:{width:1800,height:450,depth:400}},
   {id:"tv-low-console",name:"Low TV console",needs:["media","compact"],reason:"Keeps the media niche low with storage either side; confirm equipment ventilation and cable paths.",base:{width:2100,height:480,depth:420}},
   {id:"tv-console-panel",name:"Console + feature panel",needs:["feature-panel"],related:["media"],reason:"Coordinates the console with a decorative backing plane; TV mount and cable routes remain separate objects.",base:{width:2400,height:1800,depth:400}},
   {id:"tv-floating-console",name:"Floating console",needs:["floating"],reason:"For a wall-hung look and easy floor cleaning; fixing substrate and load path are essential.",base:{width:1800,height:360,depth:400},caution:"Wall fixing and load rating required."},
   {id:"tv-entertainment-wall",name:"Entertainment wall",needs:["entertainment"],related:["media","feature-panel"],reason:"Combines a console with upper or side storage; verify screen viewing height, service gaps and AV ventilation.",base:{width:3000,height:2250,depth:420}},
   {id:"tv-bookcase-wall",name:"Bookcase wall",needs:["bookcase","entertainment"],related:["display"],reason:"Adds open storage around the media zone; check shelf spans, expected loads and anchoring.",base:{width:2700,height:2250,depth:350}},
   {id:"living-display",name:"Display cabinet",needs:["display","bookcase"],reason:"Combines open and closed display storage; glass shelves/doors need a separate glazing and hardware specification.",base:{width:1200,height:2100,depth:400}},
   {id:"tv-corner",name:"Corner TV unit",needs:["corner"],reason:"Use only after the wall lengths and actual corner geometry are measured.",base:{width:1800,height:600,depth:500},caution:"Two-run corner layout and diagonal clearances need measured validation."},
   {id:"custom",name:"Custom living-room unit",needs:["media","floating","feature-panel","entertainment","bookcase","display","corner","compact"],reason:"A flexible starting point for a wall-specific layout.",base:{width:1200,height:600,depth:450}}
  ]
 },
 Utility:{
  needs:[["linen","Linen / general storage"],["laundry","Laundry sorting"],["broom","Broom / cleaning tools"],["overhead","Overhead storage"],["pull-out","Pull-out basket"],["compact","Compact utility cabinet"]],
  candidates:[
   {id:"linen",name:"Linen cabinet",needs:["linen","compact"],reason:"General shelving for linens and supplies; shelf pitch should match actual folded items.",base:{width:900,height:2100,depth:500}},
   {id:"utility-laundry",name:"Laundry sorter",needs:["laundry"],reason:"Reserves space for hamper or sorting baskets; select basket envelope and account for door access.",base:{width:900,height:2100,depth:600}},
   {id:"utility-broom",name:"Broom cabinet",needs:["broom"],reason:"Tall uninterrupted space suits cleaning tools; confirm the longest item and internal clear width.",base:{width:600,height:2100,depth:500}},
   {id:"utility-overhead",name:"Overhead storage",needs:["overhead","compact"],related:["linen"],reason:"Short-height cabinets above a work or service zone; verify mounting and access.",base:{width:1200,height:600,depth:350}},
   {id:"custom",name:"Custom utility cabinet",needs:["linen","laundry","broom","overhead","pull-out","compact"],reason:"For a utility layout driven by equipment and service access.",base:{width:900,height:1800,depth:500}}
  ]
 }
};
function intentLabel(space,key){return (spaces[space]?.needs||[]).find(x=>x[0]===key)?.[1]||"Balanced / general use";}
function setOptions(select,items,selected){select.innerHTML=items.map(([v,label])=>'<option value="'+v+'">'+label+'</option>').join("");if(items.some(x=>x[0]===selected))select.value=selected;}
function currentSpace(){return $("#d-space")?.value||"Wardrobe";}
function currentNumbers(){return {width:Number($("#d-width")?.value)||0,height:Number($("#d-height")?.value)||0,depth:Number($("#d-depth")?.value)||0,roomW:Number($("#d-roomW")?.value)||0,roomH:Number($("#d-roomH")?.value)||0,roomD:Number($("#d-roomD")?.value)||0};}
function dimensionChecks(space,d,need){
 const notes=[],width=d.width,height=d.height,depth=d.depth;
 if(width>0&&d.roomW>0&&width>d.roomW)notes.push("Unit width exceeds the entered room width; recheck the measurements or split the unit into separate bays.");
 if(height>0&&d.roomH>0&&height>d.roomH)notes.push("Unit height exceeds the entered room height; allow for site variation and installation clearance.");
 if(depth>0&&d.roomD>0&&depth>d.roomD)notes.push("Cabinet depth exceeds the entered room depth; check the unit orientation and room measurements.");
 if(space==="Wardrobe"&&["hanging","double-hang"].includes(need)&&depth>0&&depth<520)notes.push("The entered depth is shallow for a conventional front-facing hanger. Confirm the hanger/rail system; a shelf-led layout may fit better.");
 if(space==="Wardrobe"&&width>2400)notes.push("This is a wide wardrobe span. Plan multiple bays and verify shutter widths rather than using one oversized shutter.");
 if(space==="Wardrobe"&&height>2400&&need==="loft")notes.push("Check ceiling, loft access and installation clearance before fixing the loft height.");
 if(space==="Kitchen"&&depth>0&&depth<500&&["base-storage","drawers","sink","appliance"].includes(need))notes.push("Depth is compact for a conventional kitchen base; verify actual appliance, plumbing or runner envelopes.");
 if(space==="Bathroom"&&need==="floating")notes.push("Floating vanity selected: wall material and anchor capacity are required before release.");
 return notes;
}
function getSorted(space,need,d,doorStyle){
 const candidates=(spaces[space]?.candidates||[]);
 return candidates.map((c,i)=>{
  let score=c.id==="custom"?15:(c.needs.includes(need)?100:(c.related?.includes(need)?55:-100));
  if(space==="Wardrobe"&&doorStyle==="sliding"&&c.id==="sliding")score=105;
  if(space==="Wardrobe"&&doorStyle==="hinged"&&c.id==="sliding")score=-100;
  if(space==="Wardrobe"&&need==="hanging"&&d.depth>0&&d.depth<520&&c.id==="wardrobe-shelves")score+=30;
  if(space==="Wardrobe"&&d.width>2400&&["wardrobe","wardrobe-drawers"].includes(c.id))score+=6;
  if(space==="Kitchen"&&d.width>0&&d.width<350&&["kitchen-spice","kitchen-bottle","kitchen-pantry-pullout"].includes(c.id))score+=10;
  if(d.width>0&&c.base?.width>0)score-=Math.min(18,Math.abs(d.width-c.base.width)/150);
  if(d.height>0&&c.base?.height>0)score-=Math.min(12,Math.abs(d.height-c.base.height)/200);
  if(d.depth>0&&c.base?.depth>0)score-=Math.min(10,Math.abs(d.depth-c.base.depth)/150);
  return {...c,score,rankIndex:i};
 }).filter(c=>c.score>0).sort((a,b)=>b.score-a.score||a.rankIndex-b.rankIndex);
}
function render(){
 const root=$("#designTemplateAdvisor");if(!root)return;
 const space=currentSpace(),d=currentNumbers(),doorStyle=$("#d-doorStyle")?.value||"hinged";
 const allowed=spaces[space]?.needs||[],oldNeed=$("#designAdvisorNeed")?.value||"";
 let need=allowed.some(x=>x[0]===oldNeed)?oldNeed:"";
 if(!need){try{const saved=localStorage.getItem("dcode-template-advisor-need:"+space)||"";if(allowed.some(x=>x[0]===saved))need=saved;}catch{}}
 if(!need){const selected=$("#d-template")?.value||"";const current=(spaces[space]?.candidates||[]).find(c=>c.id===selected);need=current?.needs.find(v=>allowed.some(x=>x[0]===v))||allowed[0]?.[0]||"balanced";}
 const sorted=getSorted(space,need,d,doorStyle).slice(0,3),notes=dimensionChecks(space,d,need);
 const selected=$("#d-template")?.value||"";
 const best=sorted[0];
 const result=sorted.map((c,i)=>{
  const selectedText=c.id===selected?'<span class="dta-current">Current template</span>':'';
  const caution=c.caution?'<p class="dta-caution"><strong>Needs verification:</strong> '+c.caution+'</p>':'';
  const rationale=c.reason+(c.base?(" Starter dimensions: "+c.base.width+" × "+c.base.height+" × "+c.base.depth+" mm. Choosing this template loads its starter dimensions; check room fit in the next step."):"");
  return '<article class="dta-card '+(i===0?"dta-best":"")+'"><div class="dta-card-top"><div><span class="dta-rank">'+(i===0?"BEST MATCH":i===1?"ALTERNATIVE 1":"ALTERNATIVE 2")+'</span><h5>'+c.name+'</h5></div>'+selectedText+'</div><p>'+rationale+'</p>'+caution+'<button type="button" class="dta-use" data-dta-use="'+c.id+'">'+(c.id===selected?"Reapply layout":"Use this layout")+' →</button></article>';
 }).join("");
 const notesHtml=notes.length?'<div class="dta-warnings"><strong>Dimension checks</strong><ul>'+notes.map(n=>"<li>"+n+"</li>").join("")+'</ul></div>':'<p class="dta-fit-ok">No obvious fit conflict from the dimensions entered so far. Measure the site and confirm installation tolerances.</p>';
 root.innerHTML='<div class="dta-intro"><div><span class="dta-eyebrow">CONTEXT-AWARE STARTING POINTS</span><h5>What should this unit do?</h5><p>Pick the main job for this unit. DCODE ranks layouts by space, priority and door style, checks the current starter dimensions against known room/cabinet values, and explains trade-offs. Final measurements come in the next step.</p></div><span class="dta-local">Rules-based · local</span></div><label class="dta-need-label">Primary storage need<select id="designAdvisorNeed">'+(spaces[space]?.needs||[]).map(([v,label])=>'<option value="'+v+'" '+(v===need?"selected":"")+'>'+label+'</option>').join("")+'</select></label><div class="dta-results">'+result+'</div>'+notesHtml+'<p class="dta-footnote">These are ranked starting layouts, not AI certification or finished construction details. Hardware, cut-outs and joinery remain subject to verification.</p>';
 root.querySelector("#designAdvisorNeed").addEventListener("change",e=>{try{localStorage.setItem("dcode-template-advisor-need:"+space,e.target.value);}catch{}render();});
 root.querySelectorAll("[data-dta-use]").forEach(b=>b.addEventListener("click",()=>document.dispatchEvent(new CustomEvent("dcode:template-select",{detail:{kind:b.dataset.dtaUse,space,need,reason:"Matched to "+intentLabel(space,need)}}))));
}
function updateBrowse(){
 const space=currentSpace();
 const select=$("#d-template");
 if(select)Array.from(select.options).forEach(o=>{const v=o.value;const group=v.startsWith("kitchen-")?"Kitchen":(v==="vanity"||v.startsWith("bathroom-"))?"Bathroom":(["tv-console","bookshelf","open-shelf"].includes(v)||v.startsWith("living-")||v.startsWith("tv-"))?"Living":(v==="linen"||v.startsWith("utility-"))?"Utility":"Wardrobe";o.hidden=!(group===space||v==="custom");});
 document.querySelectorAll("[data-template-pick]").forEach(b=>{const allowed=(b.dataset.space||"").split(" ");b.classList.toggle("design-hidden",!allowed.includes(space));});
}
export function initDesignTemplateAdvisor(){
 if($("#designTemplateAdvisor"))return;
 const select=$("#d-template");if(!select)return;
 const heading=Array.from(document.querySelectorAll(".design-wizard-panel h4")).find(h=>h.textContent.trim()==="Cabinet template");
 const panel=heading?.closest(".design-wizard-panel");
 if(!panel)return;
 const advisor=document.createElement("section");advisor.id="designTemplateAdvisor";advisor.className="design-template-advisor";
 const details=document.createElement("details");details.id="designBrowseAllTemplates";details.className="design-template-browse";
 const summary=document.createElement("summary");summary.textContent="Browse all templates and my saved templates";details.appendChild(summary);
 const selectLabel=select.closest("label");
 if(selectLabel)details.appendChild(selectLabel);
 const context=$("#designTemplateContext");if(context){context.classList.add("design-template-context-note");details.appendChild(context);}
 const gallery=$("#designBuiltinTemplates");if(gallery)details.appendChild(gallery);
 const saved=$("#designSavedTemplates")?.closest(".design-saved-templates");if(saved)details.appendChild(saved);
 const status=$("#designTemplateStatus");if(status&&!saved)details.appendChild(status);
 heading.insertAdjacentElement("afterend",advisor);
 advisor.insertAdjacentElement("afterend",details);
 const applySpace=()=>{updateBrowse();render();};
 document.addEventListener("change",e=>{if(["d-space","d-doorStyle","d-width","d-height","d-depth","d-roomW","d-roomH","d-roomD"].includes(e.target?.id)){applySpace();}});
 document.addEventListener("input",e=>{if(["d-width","d-height","d-depth","d-roomW","d-roomH","d-roomD"].includes(e.target?.id))render();});
 document.addEventListener("dcode:template-selected",()=>{updateBrowse();render();});
 // Move large exhaustive gallery behind an explicit disclosure. The advisor remains the default path.
 applySpace();
}