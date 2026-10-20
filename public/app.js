const $=s=>document.querySelector(s), $$=s=>[...document.querySelectorAll(s)];
let parts=[], sourceName='', toastTimer, drawingSession=null, measureMode=false, measureStart=null;
const esc=v=>String(v??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const n=v=>{const x=Number(v);return Number.isFinite(x)&&x>0?x:0};
function notify(s){$('#toast').textContent=s;$('#toast').classList.add('show');clearTimeout(toastTimer);toastTimer=setTimeout(()=>$('#toast').classList.remove('show'),2800)}
function setStatus(msg,bad=false){$('#status').textContent=msg;$('#status').classList.remove('hidden','error');if(bad)$('#status').classList.add('error')}
function showReview(){ $('#empty').classList.add('hidden');$('#review').classList.remove('hidden');$('#export').disabled=!parts.length;render(); }
function addPart(p){const origin=p.origin||'manual';parts.push({name:p.name||'Detected part '+(parts.length+1),material:p.material||(origin==='manual'?($('#defaultMaterial').value||'Unspecified'):'Confirm material'),finish:p.finish||$('#defaultFinish').value||'Laminate',colour:p.colour||$('#defaultColour').value||'White',decorCode:p.decorCode||$('#defaultDecorCode').value||'WH-001',l:p.l||0,w:p.w||0,t:p.t||(origin==='manual'?n($('#defaultThickness').value):0),qty:p.qty||1,rotate:p.rotate??true,confirmed:!!p.confirmed,origin});}
function render(){
 $('#parts').innerHTML=parts.map((p,i)=>'<tr data-i="'+i+'"><td><input data-k="name" value="'+esc(p.name)+'" aria-label="Part label"></td><td><input data-k="material" value="'+esc(p.material)+'" aria-label="Material"></td><td><select data-k="finish" aria-label="Finish">'+['Laminate','Pre-laminated board','Acrylic','PU paint','Veneer','Custom'].map(v=>'<option'+(p.finish===v?' selected':'')+'>'+v+'</option>').join('')+'</select></td><td><input data-k="colour" value="'+esc(p.colour)+'" aria-label="Colour"></td><td><input data-k="decorCode" value="'+esc(p.decorCode)+'" aria-label="Decor code"></td><td><input type="number" min="1" data-k="l" value="'+esc(p.l||'')+'" placeholder="Required"></td><td><input type="number" min="1" data-k="w" value="'+esc(p.w||'')+'" placeholder="Required"></td><td><input type="number" min="1" data-k="t" value="'+esc(p.t||'')+'"></td><td><input type="number" min="1" step="1" data-k="qty" value="'+esc(p.qty||1)+'"></td><td><input type="checkbox" class="check" data-k="rotate" '+(p.rotate?'checked':'')+' aria-label="Rotation allowed"></td><td><input type="checkbox" class="check" data-k="confirmed" '+(p.confirmed?'checked':'')+' aria-label="Dimensions confirmed"></td><td><button class="del" data-del="'+i+'" aria-label="Remove part">×</button></td></tr>').join('');
 $('#row-count').textContent=parts.length+' component row'+(parts.length===1?'':'s');calc();
}
function nest(items,L,W,k){
 // MaxRects best-short-side-fit. The returned count is an estimate, not a machine toolpath.
 const partsList=[];
 for(const p of items){const qty=Math.max(0,Math.floor(n(p.qty)));for(let i=0;i<qty;i++)partsList.push({l:n(p.l),w:n(p.w),rot:!!p.rotate});}
 partsList.sort((a,b)=>Math.max(b.l,b.w)-Math.max(a.l,a.w)||Math.min(b.l,b.w)-Math.min(a.l,a.w));
 const usableL=L,usableW=W;if(usableL<=0||usableW<=0)return {count:0,unfit:partsList.length};
 let bins=[],unfit=0;
 function newBin(){return {free:[{x:0,y:0,w:usableL,h:usableW}]};}
 function score(f,p){const opts=[{w:p.l,h:p.w,rot:false},...(p.rot?[{w:p.w,h:p.l,rot:true}]:[])];let best=null;for(const o of opts){if(o.w>f.w||o.h>f.h)continue;const dw=f.w-o.w,dh=f.h-o.h,s1=Math.min(dw,dh),s2=Math.max(dw,dh);if(!best||s1<best.s1||(s1===best.s1&&s2<best.s2))best={...o,s1,s2};}return best;}
 function split(bin,used){const next=[];for(const f of bin.free){if(used.x>=f.x+f.w||used.x+used.w<=f.x||used.y>=f.y+f.h||used.y+used.h<=f.y){next.push(f);continue;}
   if(used.x>f.x)next.push({x:f.x,y:f.y,w:used.x-f.x,h:f.h});
   if(used.x+used.w<f.x+f.w)next.push({x:used.x+used.w,y:f.y,w:f.x+f.w-(used.x+used.w),h:f.h});
   if(used.y>f.y)next.push({x:f.x,y:f.y,w:f.w,h:used.y-f.y});
   if(used.y+used.h<f.y+f.h)next.push({x:f.x,y:used.y+used.h,w:f.w,h:f.y+f.h-(used.y+used.h)});
  }
  const clean=[];for(let i=0;i<next.length;i++){let contained=false;for(let j=0;j<next.length;j++){if(i===j)continue;const a=next[i],b=next[j];if(a.x>=b.x&&a.y>=b.y&&a.x+a.w<=b.x+b.w&&a.y+a.h<=b.y+b.h){contained=true;break;}}if(!contained&&next[i].w>0&&next[i].h>0)clean.push(next[i]);}bin.free=clean;
 }
 for(const p of partsList){if(!p.l||!p.w){unfit++;continue;}
  // Reserve kerf on the right and top of each part, so adjacent parts have a kerf gap.
  const part={l:p.l+k,w:p.w+k,rot:p.rot};let best=null;
  for(let bi=0;bi<bins.length;bi++){for(const f of bins[bi].free){const s=score(f,part);if(s&&(!best||s.s1<best.s1||(s.s1===best.s1&&s.s2<best.s2)))best={bi,f,s};}}
  if(!best){const bin=newBin();bins.push(bin);const s=score(bin.free[0],part);if(!s){unfit++;continue;}best={bi:bins.length-1,f:bin.free[0],s};}
  const used={x:best.f.x,y:best.f.y,w:best.s.w,h:best.s.h};split(bins[best.bi],used);
 }
 return {count:bins.length,unfit};
}
function calc(){
 let area=0,total=0,flags=0;const groups={};const L=n($('#sheetL').value)-2*n($('#trim').value),W=n($('#sheetW').value)-2*n($('#trim').value),kerf=n($('#kerf').value);
 for(const p of parts){const l=n(p.l),w=n(p.w),t=n(p.t),q=Math.max(0,Math.floor(n(p.qty)));if(!p.confirmed||!l||!w||!t)flags++;if(!l||!w||!t||!q)continue;area+=l*w*q;total+=q;const key=(p.material||'Unspecified')+' · '+t+' mm · '+(p.finish||'Unspecified finish')+' · '+(p.colour||'Unspecified colour')+' · '+(p.decorCode||'No decor code');if(!groups[key])groups[key]={qty:0,area:0,items:[]};groups[key].qty+=q;groups[key].area+=l*w*q;groups[key].items.push(p)}
 let sheets=0;Object.values(groups).forEach(g=>{g.nest=L>0&&W>0?nest(g.items,L,W,kerf):{count:0,unfit:g.qty};sheets+=g.nest.count});
 $('#count').textContent=parts.length;$('#area').textContent=(area/1e6).toFixed(2)+' m²';$('#sheets').textContent=sheets;$('#flags').textContent=flags;$('#summary').innerHTML=Object.entries(groups).map(([k,g])=>'<div class="summary-row"><div><b>'+esc(k)+'</b><small>'+g.qty+' pieces · '+g.nest.unfit+' cannot fit stock</small></div><div class="summary-values"><strong>'+g.nest.count+' sheets</strong><small>'+(g.area/1e6).toFixed(2)+' m² net</small></div></div>').join('')||'<p class="muted">No measurable components yet.</p>';$('#export').disabled=!parts.some(p=>n(p.l)&&n(p.w)&&n(p.t)&&n(p.qty));
}
function parseDXF(txt){
 // Parse DXF group-code pairs into records and read $INSUNITS from HEADER.
 const lines=txt.replace(/\r/g,'').split('\n'),pairs=[];
 for(let i=0;i+1<lines.length;i+=2){const code=Number(lines[i].trim()),value=lines[i+1].trim();if(Number.isFinite(code))pairs.push({code,value});}
 let units=0,section='',headerVar='';
 for(let i=0;i<pairs.length;i++){const p=pairs[i];if(p.code===0&&p.value==='SECTION'){section=pairs[i+1]?.value==='HEADER'?'HEADER':'';continue;}if(p.code===0&&p.value==='ENDSEC'){section='';headerVar='';continue;}if(section==='HEADER'){if(p.code===9)headerVar=p.value;else if(headerVar==='$INSUNITS'&&p.code===70){units=Number(p.value);headerVar='';}}}
 const factors={0:1,1:25.4,2:304.8,4:1,5:10,6:1000,7:0.0000254,8:0.0254,9:914.4,10:1e-7,11:1e-6,12:0.001,13:100,14:10000,15:100000,16:1000000};
 const factor=factors[units]||1,unitLabel=({0:'unitless',1:'inches',2:'feet',4:'millimetres',5:'centimetres',6:'metres',8:'mils',9:'yards',12:'microns',13:'decimetres',14:'decametres',15:'hectometres',16:'kilometres'})[units]||'unknown / unitless';
 const records=[];let rec=null,sec='';
 for(let i=0;i<pairs.length;i++){const p=pairs[i];if(p.code===0){if(rec)records.push(rec);rec={type:p.value,props:[],section:sec};if(p.value==='SECTION'){const name=pairs[i+1];sec=name?.code===2?name.value:'';}if(p.value==='ENDSEC')sec='';}else if(rec)rec.props.push([p.code,p.value]);}
 if(rec)records.push(rec);
 const get=(e,c)=>e.props.filter(p=>p[0]===c).map(p=>p[1]);
 const vertices=[];
 for(let i=0;i<records.length;i++){const e=records[i];if(e.section!=='ENTITIES')continue;
  let pts=[],closed=false,hasBulge=false;
  if(e.type==='LWPOLYLINE'){
   const xs=get(e,10),ys=get(e,20);if(xs.length!==ys.length)continue;
   pts=xs.map((x,j)=>[Number(x),Number(ys[j])]);closed=(Number(get(e,70)[0]||0)&1)!==0;hasBulge=get(e,42).some(v=>Math.abs(Number(v))>1e-8);
  }else if(e.type==='POLYLINE'){
   closed=(Number(get(e,70)[0]||0)&1)!==0;let j=i+1;
   while(j<records.length&&records[j].type!=='SEQEND'){if(records[j].type==='VERTEX'){const v=records[j],x=Number(get(v,10)[0]),y=Number(get(v,20)[0]);pts.push([x,y]);if(Math.abs(Number(get(v,42)[0]||0))>1e-8)hasBulge=true;}j++;}
  }else continue;
  if(!closed||hasBulge||pts.length<4)continue;
  if(pts.length>1&&Math.abs(pts[0][0]-pts[pts.length-1][0])<1e-8&&Math.abs(pts[0][1]-pts[pts.length-1][1])<1e-8)pts.pop();
  // Accept only true axis-aligned four-corner rectangles; don't turn arbitrary shapes into bounding-box parts.
  if(pts.length!==4)continue;
  let rect=true;for(let j=0;j<4;j++){const a=pts[j],b=pts[(j+1)%4];if(Math.abs(a[0]-b[0])>1e-7&&Math.abs(a[1]-b[1])>1e-7){rect=false;break;}}
  if(!rect)continue;
  const xs=pts.map(p=>p[0]),ys=pts.map(p=>p[1]),minX=Math.min(...xs),maxX=Math.max(...xs),minY=Math.min(...ys),maxY=Math.max(...ys),l=(maxX-minX)*factor,w=(maxY-minY)*factor;
  if(l<=0||w<=0)continue;
  // Deduplicate the same geometry at the same coordinates, but preserve equal-sized parts at different positions.
  const geom=[minX,maxX,minY,maxY].map(v=>Math.round(v*1e6)/1e6).join(':');
  vertices.push({l,w,geom});
 }
 const unique=[...new Map(vertices.map(v=>[v.geom,v])).values()].map(v=>({l:Math.round(v.l*1000)/1000,w:Math.round(v.w*1000)/1000}));
 return {rects:unique,units:unitLabel,scaleKnown:units!==0&&!!factors[units]};
}
function parseSVG(txt){
 const doc=new DOMParser().parseFromString(txt,'image/svg+xml');if(doc.querySelector('parsererror'))throw Error('SVG could not be parsed.');
 const root=doc.documentElement, vb=(root.getAttribute('viewBox')||'').split(/[ ,]+/).map(Number), sx=Number(root.getAttribute('width')?.match(/[\d.]+/)?.[0]), sy=Number(root.getAttribute('height')?.match(/[\d.]+/)?.[0]);
 const rects=[...doc.querySelectorAll('rect')].map(el=>({l:Number(el.getAttribute('width')),w:Number(el.getAttribute('height'))})).filter(r=>r.l>0&&r.w>0);
 if(!rects.length){const paths=[...doc.querySelectorAll('path,polygon')];for(const el of paths){try{const b=el.getBBox?.();if(b&&b.width>0&&b.height>0)rects.push({l:b.width,w:b.height})}catch(e){}}}
 const scale=(sx&&vb[2]?sx/vb[2]:1);return {rects:rects.map(r=>({l:r.l*scale,w:r.w*scale})),unit:'SVG units (confirm scale)'};
}
function extractTextDimensions(text){
 // Normalize common OCR confusions only inside numeric dimension candidates.
 const out=[],lines=String(text||'').replace(/([0-9])[oO](?=[0-9])/g,'$10').replace(/[\u2012-\u2015]/g,'-').split(/\n+/).map(x=>x.replace(/\s+/g,' ').trim()).filter(Boolean);
 const pattern=/(\d[\d.,]{1,7})\s*(?:mm|cm)?\s*(?:[xX×*]|\bby\b)\s*(\d[\d.,]{1,7})\s*(?:mm|cm)?/ig;
 for(const line of lines){
  for(const m of line.matchAll(pattern)){
   const clean=v=>Number(v.replace(/,/g,'').replace(/\.(?=.*\.)/g,''));
   let a=clean(m[1]),b=clean(m[2]);if(!Number.isFinite(a)||!Number.isFinite(b))continue;
   // Ignore likely page numbers, tiny labels, and implausibly large OCR strings.
   if(a<10||b<10||a>20000||b>20000)continue;
   const before=line.slice(Math.max(0,m.index-12),m.index),after=line.slice(m.index+m[0].length,m.index+m[0].length+12);
   const unit=(m[0].match(/\b(cm|mm)\b/i)||[])[1]?.toLowerCase();
   if(unit==='cm'){a*=10;b*=10;}
   const qtyTokens=[...line.matchAll(/\b(?:qty|quantity|nos?\.?|pcs?\.?|pieces?)\s*[:x-]?\s*(\d{1,4})\b|\b(\d{1,4})\s*(?:nos?\.?|pcs?\.?|pieces?)\b/ig)].map(q=>({at:q.index,end:q.index+q[0].length,value:Number(q[1]||q[2])}));
   const anchor=m.index+m[0].length,nearestQty=qtyTokens.sort((x,y)=>Math.abs(x.at-anchor)-Math.abs(y.at-anchor))[0];
   const qty=nearestQty?Math.max(1,Math.min(10000,nearestQty.value||1)):1;
   out.push({l:a,w:b,qty,name:line.slice(0,90),confirmed:false,origin:'text',unit:unit||'unspecified',context:before+' '+after});
  }
 }
 return out;
}
async function readFile(file){
 sourceName=file.name;const ext=file.name.split('.').pop().toLowerCase();parts=[];drawingSession=null;measureMode=false;$('#pageWorkflow').classList.add('hidden');$('#fileInput').value='';setStatus('Reading '+file.name+'…');
 try{
  if(ext==='dxf'){const parsed=parseDXF(await file.text());if(!parsed.rects.length)throw Error('No rectangular closed polylines were found in the DXF ENTITIES section. Export each cut part as a closed, axis-aligned rectangle; blocks, arcs, splines, rotated/non-rectangular profiles and nested assemblies are not automatically interpreted.');parsed.rects.forEach((r,i)=>addPart({name:'DXF rectangle '+(i+1),l:r.l,w:r.w,confirmed:false,origin:'DXF'}));setStatus('Detected '+parts.length+' rectangular outlines. Source units: '+parsed.units+'. '+(parsed.scaleKnown?'Converted to millimetres using DXF $INSUNITS.':'DXF units are undefined; dimensions remain in drawing units and must be scaled to mm before production.')+' Equal-sized parts at different positions are preserved; duplicate geometry at the same coordinates is removed. Confirm every part and quantity.');}
  else if(ext==='svg'){const parsed=parseSVG(await file.text());if(!parsed.rects.length)throw Error('No rectangular SVG shapes found. Export each part as a rectangle or use DXF.');parsed.rects.forEach((r,i)=>addPart({name:'SVG shape '+(i+1),l:r.l,w:r.w,confirmed:false,origin:'SVG'}));setStatus('Found '+parts.length+' rectangular shapes. SVG units are not automatically assumed to be millimetres; verify scale.');}
  else if(ext==='pdf'){await startPageSession(file,'pdf');return;}
  else if(['png','jpg','jpeg','webp'].includes(ext)){await startPageSession(file,'image');return;}
  else if(ext==='dwg')throw Error('DWG is not directly parsed in this browser version. In AutoCAD, use SAVEAS and export to DXF, then upload the DXF file.');
  else throw Error('Unsupported file type. Upload DXF, SVG, PDF, PNG, JPG or WEBP.');
  if(parts.length){showReview();$('#status').classList.remove('hidden');}else throw Error('No components could be extracted.');
 }catch(e){parts=[];drawingSession=null;$('#pageWorkflow').classList.add('hidden');$('#review').classList.add('hidden');$('#empty').classList.remove('hidden');setStatus(e.message||'Could not read this file.',true);$('#export').disabled=true;}
}
async function getPDFPageTexts(file){
 await loadScript('https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.11.174/pdf.min.js');
 const pdfjs=window.pdfjsLib;if(!pdfjs)throw Error('PDF reader did not load. Please try again or upload DXF.');
 pdfjs.GlobalWorkerOptions.workerSrc='https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.11.174/pdf.worker.min.js';
 const pdf=await pdfjs.getDocument({data:await file.arrayBuffer()}).promise,pages=[];
 for(let i=1;i<=pdf.numPages;i++){
  const page=await pdf.getPage(i),content=await page.getTextContent(),nativeText=content.items.map(x=>x.str).join(' ');
  const nativeCount=extractTextDimensions(nativeText).length;
  if(nativeCount>=3&&nativeText.length>=120){pages.push({page:i,text:nativeText,ocr:false});continue;}
  // Scanned pages, outlined text, and text-poor sketches get rendered and OCR'd, even if native text yielded a few dimensions.
  // Keep page rasterization bounded: large architectural sheets at 2.5x can exhaust browser memory.
  const base=page.getViewport({scale:1}),scale=Math.min(1.8,Math.sqrt(4000000/(base.width*base.height)));
  const viewport=page.getViewport({scale:Math.max(0.65,scale)}),canvas=document.createElement('canvas'),ctx=canvas.getContext('2d',{willReadFrequently:true});
  canvas.width=Math.ceil(viewport.width);canvas.height=Math.ceil(viewport.height);
  await page.render({canvasContext:ctx,viewport}).promise;
  let result={text:'',confidence:0};
  try{result=await ocrEnhanced(canvas);}catch(err){console.warn('OCR failed on PDF page '+i,err);}
  const ocrCount=extractTextDimensions(result.text||'').length;pages.push({page:i,text:ocrCount>nativeCount?result.text:nativeText,ocr:ocrCount>nativeCount,confidence:result.confidence||0});
 }
 return pages;
}
async function getDocumentText(file,ext){
 await loadScript('https://cdn.jsdelivr.net/npm/tesseract.js@5/dist/tesseract.min.js');
 if(!window.Tesseract)throw Error('OCR engine did not load. Check your connection or use DXF.');
 if(['png','jpg','jpeg','webp'].includes(ext)){
  const bitmap=await createImageBitmap(file);
  try{return await ocrEnhanced(bitmap);}finally{bitmap.close?.();}
 }
 return {text:'',confidence:0};
}
async function ocrEnhanced(source){
 await loadScript('https://cdn.jsdelivr.net/npm/tesseract.js@5/dist/tesseract.min.js');
 if(!window.Tesseract)throw Error('OCR engine did not load. Check your connection.');
 const w=source.width||source.naturalWidth,h=source.height||source.naturalHeight;
 if(!w||!h)throw Error('Image could not be decoded.');
 const variants=[];
 // Upscale and try grayscale/contrast plus two threshold levels; each can help different scans.
 for(const mode of ['gray']){
  const c=document.createElement('canvas'),scale=Math.min(2.2,Math.max(1,Math.sqrt(4200000/(w*h))),2200/Math.max(w,h));
  c.width=Math.round(w*scale);c.height=Math.round(h*scale);
  const x=c.getContext('2d',{willReadFrequently:true});x.fillStyle='#fff';x.fillRect(0,0,c.width,c.height);x.drawImage(source,0,0,c.width,c.height);
  const im=x.getImageData(0,0,c.width,c.height),threshold=mode==='threshold150'?150:190;
  for(let i=0;i<im.data.length;i+=4){
   const lum=0.299*im.data[i]+0.587*im.data[i+1]+0.114*im.data[i+2];
   const v=mode==='gray'?Math.max(0,Math.min(255,(lum-128)*1.55+128)):(lum<threshold?0:255);
   im.data[i]=im.data[i+1]=im.data[i+2]=v;
  }
  x.putImageData(im,0,0);variants.push(c);
 }
 let best={text:'',confidence:0,score:-1};
 for(const canvas of variants){
  for(const psm of [11]){const result=await window.Tesseract.recognize(canvas,'eng',{tessedit_pageseg_mode:psm,logger:m=>{if(m.status==='recognizing text')setStatus('OCR enhancement in progress… '+Math.round((m.progress||0)*100)+'%');}});
   const text=result.data?.text||'',confidence=result.data?.confidence||0,dimensions=extractTextDimensions(text).length;
   const score=dimensions*100+confidence;
   if(score>best.score)best={text,confidence,score};
  }
 }
 return best;
}
function loadScript(src){return new Promise((resolve,reject)=>{const existing=[...document.scripts].find(s=>s.src===src);if(existing){if((src.includes('pdf.js')&&window.pdfjsLib)||(src.includes('tesseract')&&window.Tesseract))return resolve();existing.addEventListener('load',resolve,{once:true});existing.addEventListener('error',reject,{once:true});return}const s=document.createElement('script');s.src=src;s.onload=resolve;s.onerror=()=>reject(Error('Could not load drawing reader from CDN. Check your connection or use DXF.'));document.head.appendChild(s);});}
async function startPageSession(file,type){
 sourceName=file.name;parts=[];drawingSession={file,type,pdf:null,pages:[],index:0,scale:null};
 $('#review').classList.add('hidden');$('#empty').classList.add('hidden');$('#pageWorkflow').classList.remove('hidden');$('#pageText').value='';$('#geometryList').innerHTML='<p class="muted">Analyze the page, then detect outlines if useful.</p>';$('#pageCandidates').innerHTML='<p class="muted">Choose Analyze this page to read dimensions and notes.</p>';$('#scaleStatus').textContent='No scale calibration set.';$('#geometryStatus').textContent='Geometry not analyzed';setStatus('Preparing page review…');
 if(type==='pdf'){
  await loadScript('https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.11.174/pdf.min.js');const pdfjs=window.pdfjsLib;if(!pdfjs)throw Error('PDF reader did not load.');
  pdfjs.GlobalWorkerOptions.workerSrc='https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.11.174/pdf.worker.min.js';drawingSession.pdf=await pdfjs.getDocument({data:await file.arrayBuffer()}).promise;
  for(let i=1;i<=drawingSession.pdf.numPages;i++){const page=await drawingSession.pdf.getPage(i),content=await page.getTextContent();drawingSession.pages.push({number:i,nativeText:content.items.map(x=>x.str).join(' '),text:'',candidates:[],geometry:[],status:'pending',confidence:0});}
 }else{
  const bitmap=await createImageBitmap(file),scale=Math.min(1,Math.sqrt(4000000/(bitmap.width*bitmap.height))),safe=document.createElement('canvas');safe.width=Math.max(1,Math.round(bitmap.width*scale));safe.height=Math.max(1,Math.round(bitmap.height*scale));const safeCtx=safe.getContext('2d');if(!safeCtx)throw Error('Browser could not allocate an image preview. Try a smaller scan.');safeCtx.drawImage(bitmap,0,0,safe.width,safe.height);bitmap.close?.();drawingSession.pages.push({number:1,nativeText:'',text:'',candidates:[],geometry:[],status:'pending',confidence:0,bitmap:safe});
 }
 await renderCurrentPage();setStatus('Loaded '+drawingSession.pages.length+' page(s). Review each page, analyze relevant pages, and skip covers, blank pages, plans or unrelated content.');updatePageProgress();
}
function currentPage(){return drawingSession?.pages[drawingSession.index];}
async function renderCurrentPage(){
 if(!drawingSession)return;const p=currentPage(),canvas=$('#pageCanvas'),ctx=canvas.getContext('2d');ctx.clearRect(0,0,canvas.width,canvas.height);
 if(drawingSession.type==='pdf'){
  const page=await drawingSession.pdf.getPage(p.number),base=page.getViewport({scale:1}),scale=Math.min(1.5,Math.sqrt(4000000/(base.width*base.height))),viewport=page.getViewport({scale:Math.max(0.65,scale)});canvas.width=Math.ceil(viewport.width);canvas.height=Math.ceil(viewport.height);await page.render({canvasContext:canvas.getContext('2d'),viewport}).promise;
 }else{canvas.width=p.bitmap.width;canvas.height=p.bitmap.height;ctx.drawImage(p.bitmap,0,0);}
 $('#pageState').textContent='Page '+p.number+' of '+drawingSession.pages.length;$('#previewTitle').textContent=drawingSession.file.name+' · Page '+p.number;$('#pagePrev').disabled=drawingSession.index===0;$('#pageNext').textContent=drawingSession.index===drawingSession.pages.length-1?'Finish review':'Next →';
 $('#pageText').value=p.text||p.nativeText||'';$('#geometryStatus').textContent=p.geometry.length?p.geometry.length+' outline candidate(s)': 'Geometry not analyzed';
 $('#candidateCount').textContent=p.candidates.length+' found';renderPageCandidates();renderGeometryCandidates();drawGeometryOverlay();updatePageProgress();
}
function updatePageProgress(){if(!drawingSession)return;const reviewed=drawingSession.pages.filter(p=>p.status==='reviewed').length,skipped=drawingSession.pages.filter(p=>p.status==='skipped').length;$('#reviewProgress').textContent=reviewed+' pages reviewed · '+skipped+' skipped · '+(drawingSession.pages.length-reviewed-skipped)+' remaining';}
function renderPageCandidates(){
 const p=currentPage();if(!p)return;$('#candidateCount').textContent=p.candidates.length+' found';
 $('#pageCandidates').innerHTML=p.candidates.length?p.candidates.map((c,i)=>'<label class="candidate-row"><input type="checkbox" data-dim-candidate="'+i+'" '+(c.selected?'checked':'')+'><span class="candidate-main"><strong>'+esc(c.label||('Dimension candidate '+(i+1)))+'</strong><span class="candidate-fields"><input data-candidate-name="'+i+'" value="'+esc(c.name||'Possible part '+(i+1))+'" aria-label="Part name"><input data-candidate-l="'+i+'" type="number" min="1" value="'+esc(c.l)+'" aria-label="Length mm"><input data-candidate-w="'+i+'" type="number" min="1" value="'+esc(c.w)+'" aria-label="Width mm"><input data-candidate-q="'+i+'" type="number" min="1" value="'+esc(c.qty||1)+'" aria-label="Quantity"></span><small>'+esc(c.origin||'Text candidate')+(c.duplicateHint?' · ⚠ Similar size already found — check for a repeated view versus a separate identical part. Not auto-removed.':' · verify dimensions, units and what the numbers describe')+'</small></span></label>').join(''):'<p class="muted">No dimension pairs found yet. You can still add geometry candidates or mark this page as not relevant.</p>';
}
function renderGeometryCandidates(){
 const p=currentPage();if(!p)return;
 $('#geometryList').innerHTML=p.geometry.length?p.geometry.map((g,i)=>'<label class="candidate-row"><input type="checkbox" data-geometry-candidate="'+i+'" '+(g.selected?'checked':'')+' '+(!drawingSession.scale?'disabled':'')+'><span class="candidate-main"><strong>Outline '+(i+1)+' · '+g.w+' × '+g.h+' px</strong><small>'+(drawingSession.scale?'Estimated '+Math.round(g.w*drawingSession.scale)+' × '+Math.round(g.h*drawingSession.scale)+' mm · confirm it is a real panel':'Set scale above before converting pixels to mm')+'</small><input data-geometry-name="'+i+'" value="'+esc(g.name||('Sketch outline '+(i+1)))+'" aria-label="Outline part name"></span></label>').join(''):'<p class="muted">No outline candidates detected yet. Detection works best on clear, high-contrast line drawings.</p>';
}
function drawGeometryOverlay(){
 const p=currentPage(),canvas=$('#pageCanvas');if(!p||!p.geometry.length)return;const ctx=canvas.getContext('2d');ctx.save();ctx.strokeStyle='#d13f2f';ctx.lineWidth=Math.max(2,canvas.width/900*2);ctx.font='bold '+Math.max(12,canvas.width/80)+'px sans-serif';
 p.geometry.forEach((g,i)=>{ctx.strokeRect(g.x,g.y,g.w,g.h);ctx.fillStyle='#d13f2f';ctx.fillText(String(i+1),g.x+3,g.y+Math.max(13,canvas.width/80));});ctx.restore();
}
async function analyzeCurrentPage(){
 const p=currentPage();if(!p)return;setStatus('Analyzing page '+p.number+'…');
 let text=p.nativeText||'';
 if(drawingSession.type==='image'||extractTextDimensions(text).length<3||text.length<120){
  try{const result=await ocrEnhanced($('#pageCanvas'));if(extractTextDimensions(result.text).length>=extractTextDimensions(text).length||!text)text=result.text;p.confidence=result.confidence||0;}catch(e){console.warn(e);}
 }
 p.text=text;$('#pageText').value=text;const found=extractTextDimensions(text);const declaredCm=/(all\s+)?dimensions?\s+(?:are\s+)?in\s+(?:centimet(?:re|er)s?|cm)\b|all\s+measurements?\s+in\s+cm\b/i.test(text);
 p.candidates=found.map((d,i)=>{const l=Math.round((d.l*(declaredCm&&d.unit==='unspecified'?10:1))*100)/100,w=Math.round((d.w*(declaredCm&&d.unit==='unspecified'?10:1))*100)/100;const similar=(a,b)=>Math.abs(a-l)<=Math.max(1,l*0.005)&&Math.abs(b-w)<=Math.max(1,w*0.005)||Math.abs(a-w)<=Math.max(1,w*0.005)&&Math.abs(b-l)<=Math.max(1,l*0.005);const priorPart=parts.some(part=>similar(n(part.l),n(part.w)));const priorCandidate=found.slice(0,i).some(other=>{const ol=other.l*(declaredCm&&other.unit==='unspecified'?10:1),ow=other.w*(declaredCm&&other.unit==='unspecified'?10:1);return similar(ol,ow)});return {label:(d.unit==='cm'?'cm converted to mm · ':'')+(declaredCm&&d.unit==='unspecified'?'page says cm · ':'')+(d.context||d.name||'Text dimension'),name:'Page '+p.number+' possible part '+(i+1),l,w,qty:d.qty||1,origin:'Page '+p.number+(p.confidence?' · OCR':''),duplicateHint:priorPart||priorCandidate,selected:false};});
 renderPageCandidates();setStatus('Page '+p.number+': '+found.length+' dimension candidates. Select only measurements you can associate with actual parts; text pairs alone do not establish a cutting component.');p.status='analyzed';updatePageProgress();
}
async function detectGeometry(){
 const p=currentPage();if(!p)return;p.geometry=[];await renderCurrentPage();setStatus('Detecting outline candidates…');
 try{
  const original=$('#pageCanvas'),work=document.createElement('canvas'),scale=Math.min(1,Math.sqrt(1500000/(original.width*original.height)));work.width=Math.max(1,Math.round(original.width*scale));work.height=Math.max(1,Math.round(original.height*scale));work.getContext('2d').drawImage(original,0,0,work.width,work.height);const cv=await loadOpenCV(),src=cv.imread(work),gray=new cv.Mat(),binary=new cv.Mat(),contours=new cv.MatVector(),hierarchy=new cv.Mat();
  cv.cvtColor(src,gray,cv.COLOR_RGBA2GRAY);cv.GaussianBlur(gray,gray,new cv.Size(3,3),0);cv.threshold(gray,binary,0,255,cv.THRESH_BINARY_INV+cv.THRESH_OTSU);const kernel=cv.getStructuringElement(cv.MORPH_RECT,new cv.Size(2,2));cv.morphologyEx(binary,binary,cv.MORPH_CLOSE,kernel);cv.findContours(binary,contours,hierarchy,cv.RETR_LIST,cv.CHAIN_APPROX_SIMPLE);
  const boxes=[],minArea=Math.max(250,src.cols*src.rows*0.00015);
  for(let i=0;i<contours.size();i++){const c=contours.get(i),area=cv.contourArea(c);if(area<minArea){c.delete();continue;}const peri=cv.arcLength(c,true),approx=new cv.Mat();cv.approxPolyDP(c,approx,0.025*peri,true);const rect=cv.boundingRect(approx),x=rect.x/scale,y=rect.y/scale,w=rect.width/scale,h=rect.height/scale;if(approx.rows===4&&rect.width>20&&rect.height>20&&rect.width<src.cols*.98&&rect.height<src.rows*.98&&rect.width/rect.height<12&&rect.height/rect.width<12){if(!boxes.some(b=>Math.abs(b.x-x)<5/scale&&Math.abs(b.y-y)<5/scale&&Math.abs(b.w-w)<8/scale&&Math.abs(b.h-h)<8/scale))boxes.push({x,y,w,h,selected:false,name:'Sketch outline '+(boxes.length+1)});}approx.delete();c.delete();}
  [src,gray,binary,contours,hierarchy,kernel].forEach(m=>m.delete());p.geometry=boxes.sort((a,b)=>(b.w*b.h)-(a.w*a.h)).slice(0,80);await renderCurrentPage();$('#geometryStatus').textContent=p.geometry.length+' outline candidate(s)';setStatus('Found '+p.geometry.length+' possible rectangular contours. This is a visual aid: nested dimension boxes, labels, borders and cabinet outlines can be detected too. Calibrate scale and select only real cut parts.');
 }catch(e){setStatus('Geometry detection could not run: '+(e.message||e)+'. Try a clearer scan or use text/manual entry.',true);}
}
async function loadOpenCV(){
 if(window.cv?.Mat)return window.cv;
 await new Promise((resolve,reject)=>{const s=document.createElement('script');s.src='https://docs.opencv.org/4.x/opencv.js';s.async=true;s.onload=()=>{if(window.cv?.Mat)return resolve();if(window.cv){window.cv.onRuntimeInitialized=resolve;setTimeout(()=>window.cv?.Mat&&resolve(),12000);}else reject(Error('OpenCV did not initialize'));};s.onerror=()=>reject(Error('OpenCV library could not load'));document.head.appendChild(s);});
 if(!window.cv?.Mat)throw Error('OpenCV is still initializing; please retry.');return window.cv;
}
function acceptCurrentPage(){
 const p=currentPage();if(!p)return;let added=0;
 $$('#pageCandidates [data-dim-candidate]:checked').forEach(el=>{const i=Number(el.dataset.dimCandidate),c=p.candidates[i];if(!c)return;const name=$('[data-candidate-name="'+i+'"]').value||c.name,l=n($('[data-candidate-l="'+i+'"]').value),w=n($('[data-candidate-w="'+i+'"]').value),qty=Math.floor(n($('[data-candidate-q="'+i+'"]').value));if(!l||!w||!qty){notify('Fix selected dimensions and quantity first.');return;}addPart({name,l,w,qty,confirmed:false,origin:'Page '+p.number+' text/OCR'});added++;});
 $$('#geometryList [data-geometry-candidate]:checked').forEach(el=>{const g=p.geometry[Number(el.dataset.geometryCandidate)];if(!g||!drawingSession.scale)return;addPart({name:$('[data-geometry-name="'+el.dataset.geometryCandidate+'"]').value||g.name,l:Math.round(g.w*drawingSession.scale),w:Math.round(g.h*drawingSession.scale),confirmed:false,origin:'Page '+p.number+' sketch geometry (scaled)'});added++;});
 p.text=$('#pageText').value;p.status='reviewed';showReview();updatePageProgress();notify(added+' candidate(s) added from page '+p.number+'.');goNextPage();
}
function skipCurrentPage(noData=false){const p=currentPage();if(!p)return;p.text=$('#pageText').value;p.status='skipped';if(noData)p.candidates=[];updatePageProgress();goNextPage();}
async function goNextPage(){if(!drawingSession)return;if(drawingSession.index<drawingSession.pages.length-1){drawingSession.index++;await renderCurrentPage();}else{setStatus('Page review reached the end. '+drawingSession.pages.filter(p=>p.status==='reviewed').length+' reviewed, '+drawingSession.pages.filter(p=>p.status==='skipped').length+' skipped. You can revisit pages or review the consolidated cutting list.');$('#pageWorkflow').classList.remove('hidden');}}
async function goPreviousPage(){if(!drawingSession||drawingSession.index===0)return;drawingSession.index--;await renderCurrentPage();}
$('#analyzePage').addEventListener('click',analyzeCurrentPage);$('#detectGeometry').addEventListener('click',detectGeometry);$('#acceptPage').addEventListener('click',acceptCurrentPage);$('#skipPage').addEventListener('click',()=>skipCurrentPage(false));$('#markNoData').addEventListener('click',()=>skipCurrentPage(true));$('#pagePrev').addEventListener('click',goPreviousPage);$('#pageNext').addEventListener('click',goNextPage);
$('#pageText').addEventListener('input',()=>{const p=currentPage();if(p)p.text=$('#pageText').value;});
$('#pageCandidates').addEventListener('change',e=>{const el=e.target;if(el.dataset.dimCandidate!==undefined){const c=currentPage()?.candidates[Number(el.dataset.dimCandidate)];if(c)c.selected=el.checked;}});
$('#geometryList').addEventListener('change',e=>{const el=e.target;if(el.dataset.geometryCandidate!==undefined){const g=currentPage()?.geometry[Number(el.dataset.geometryCandidate)];if(g)g.selected=el.checked;}});
$('#calibrateScale').addEventListener('click',()=>{const mm=n($('#knownMm').value),px=n($('#knownPx').value);if(!mm||!px){notify('Enter both a known dimension in mm and its matching length in preview pixels.');return;}drawingSession.scale=mm/px;$('#scaleStatus').textContent='Scale set to '+drawingSession.scale.toFixed(4)+' mm per preview pixel. Verify the chosen reference dimension.';renderGeometryCandidates();});
$('#measureLine').addEventListener('click',()=>{measureMode=true;measureStart=null;$('#pageCanvas').style.cursor='crosshair';$('#measureLine').textContent='Drag across known dimension…';notify('Drag from one end of a known dimension line to the other on the preview.');});
$('#pageCanvas').addEventListener('pointerdown',e=>{if(!measureMode)return;const c=e.currentTarget,r=c.getBoundingClientRect();measureStart={x:(e.clientX-r.left)*c.width/r.width,y:(e.clientY-r.top)*c.height/r.height};c.setPointerCapture?.(e.pointerId);});
$('#pageCanvas').addEventListener('pointerup',e=>{if(!measureMode||!measureStart)return;const c=e.currentTarget,r=c.getBoundingClientRect(),end={x:(e.clientX-r.left)*c.width/r.width,y:(e.clientY-r.top)*c.height/r.height},dx=end.x-measureStart.x,dy=end.y-measureStart.y,px=Math.sqrt(dx*dx+dy*dy);if(px>2){$('#knownPx').value=px.toFixed(1);const ctx=c.getContext('2d');ctx.save();ctx.strokeStyle='#2766d1';ctx.lineWidth=Math.max(3,c.width/700*2);ctx.beginPath();ctx.moveTo(measureStart.x,measureStart.y);ctx.lineTo(end.x,end.y);ctx.stroke();ctx.restore();notify('Measured '+px.toFixed(1)+' preview pixels. Enter the real dimension in mm, then Apply scale.');}measureMode=false;measureStart=null;c.style.cursor='default';$('#measureLine').textContent='Measure reference line on preview';});
$('#manualAdd').addEventListener('click',()=>{const l=n($('#manualL').value),w=n($('#manualW').value),q=Math.floor(n($('#manualQty').value)),t=n($('#manualT').value);if(!l||!w||!q||!t){notify('Please enter valid measurements.');return;}addPart({name:$('#manualName').value||'Manual part '+(parts.length+1),l:l,w:w,t:t,qty:q,confirmed:true,origin:'manual'});sourceName=sourceName||'manual-entry';showReview();setStatus('Manual measurements added. Review before production.');$('#manualName').value='';$('#manualL').value='';$('#manualW').value='';$('#manualQty').value='1';});
$('#choose').addEventListener('click',()=>$('#fileInput').click());$('#fileInput').addEventListener('change',e=>{if(e.target.files[0])readFile(e.target.files[0])});
const dz=$('#dropzone');['dragenter','dragover'].forEach(ev=>dz.addEventListener(ev,e=>{e.preventDefault();dz.classList.add('drag')}));['dragleave','drop'].forEach(ev=>dz.addEventListener(ev,e=>{e.preventDefault();dz.classList.remove('drag')}));dz.addEventListener('drop',e=>{const f=e.dataTransfer.files[0];if(f)readFile(f)});
$('#parts').addEventListener('input',e=>{const el=e.target,k=el.dataset.k;if(!k)return;const i=Number(el.closest('tr').dataset.i);parts[i][k]=el.type==='checkbox'?el.checked:['l','w','t','qty'].includes(k)?Number(el.value):el.value;calc()});
$('#parts').addEventListener('change',e=>{const el=e.target,k=el.dataset.k;if(!k)return;const i=Number(el.closest('tr').dataset.i);if(k==='finish')parts[i].finish=el.value;if(k==='confirmed'&&el.checked&&(!n(parts[i].l)||!n(parts[i].w)||!n(parts[i].t))){el.checked=false;parts[i].confirmed=false;notify('Enter valid length, width and thickness first.');}calc()});
$('#parts').addEventListener('click',e=>{const b=e.target.closest('[data-del]');if(b){parts.splice(Number(b.dataset.del),1);render()}});
$('#add').addEventListener('click',()=>{addPart({name:'Part '+(parts.length+1),l:0,w:0,confirmed:false});render();$('#parts tr:last-child input[data-k="l"]').focus()});
$('#clear').addEventListener('click',()=>{parts=[];sourceName='';drawingSession=null;measureMode=false;$('#pageWorkflow').classList.add('hidden');$('#review').classList.add('hidden');$('#empty').classList.remove('hidden');$('#status').classList.add('hidden');$('#export').disabled=true;$('#fileInput').value='';});
['sheetL','sheetW','kerf','trim','defaultMaterial','defaultThickness'].forEach(id=>$('#'+id).addEventListener('input',()=>{if(id==='defaultMaterial'||id==='defaultThickness')return;calc()}));
$('#export').addEventListener('click',()=>{const valid=parts.filter(p=>n(p.l)&&n(p.w)&&n(p.t)&&n(p.qty));if(!valid.length){notify('No complete dimensions to export.');return}const headers=['Source file','Part label','Material','Finish','Colour','Decor code','Length mm','Width mm','Thickness mm','Quantity','Rotation allowed','Dimensions confirmed','Origin'];const rows=valid.slice().sort((a,b)=>[a.material,a.t,a.finish,a.colour,a.decorCode,a.name].join('|').localeCompare([b.material,b.t,b.finish,b.colour,b.decorCode,b.name].join('|'))).map(p=>[sourceName,p.name,p.material,p.finish,p.colour,p.decorCode,p.l,p.w,p.t,p.qty,p.rotate?'Yes':'No',p.confirmed?'Yes':'No',p.origin]);const csv=[headers,...rows].map(row=>row.map(v=>'"'+String(v??'').replace(/"/g,'""')+'"').join(',')).join('\r\n');const blob=new Blob(['\ufeff'+csv],{type:'text/csv;charset=utf-8;'}),url=URL.createObjectURL(blob),a=document.createElement('a');a.href=url;a.download=(sourceName.replace(/\.[^.]+$/,'').replace(/[^a-z0-9-_]+/gi,'-')||'drawing')+'-cutting-list.csv';a.click();URL.revokeObjectURL(url);notify('Cutting list exported. Verify all dimensions before production.')});