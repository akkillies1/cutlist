/* DCODE parametric panel geometry. Millimetres only; independent of the UI and renderer. */
const finite = (v, label) => {
  const n = Number(v);
  if (!Number.isFinite(n)) throw new Error(label + " must be a finite number.");
  return n;
};
const vec = (x=0,y=0,z=0) => ({x:Number(x),y:Number(y),z:Number(z)});
const add = (a,b) => vec(a.x+b.x,a.y+b.y,a.z+b.z);
const sub = (a,b) => vec(a.x-b.x,a.y-b.y,a.z-b.z);
const mul = (a,s) => vec(a.x*s,a.y*s,a.z*s);
const dot = (a,b) => a.x*b.x+a.y*b.y+a.z*b.z;
const cross = (a,b) => vec(a.y*b.z-a.z*b.y,a.z*b.x-a.x*b.z,a.x*b.y-a.y*b.x);
const length = a => Math.hypot(a.x,a.y,a.z);
const unit = (a,label) => {
  const n=length(a);
  if(n<1e-6) throw new Error(label+" is too short or degenerate.");
  return mul(a,1/n);
};
const round3 = n => Math.round(n*1000)/1000;
const point = (p,label) => vec(finite(p?.x,label+" X"),finite(p?.y,label+" Y"),finite(p?.z,label+" Z"));

/**
 * Builds an orthogonal panel from three points.
 * P1 and P2 describe the length direction. P3 defines the second direction;
 * its component parallel to P1-P2 is removed, matching the Board Studio idea.
 * Offsets reduce the finished face equally on opposing edges.
 */
export function buildPanelGeometry(input={}) {
  const p1=point(input.p1,"P1"), p2=point(input.p2,"P2"), p3=point(input.p3,"P3");
  const v1=sub(p2,p1), len=length(v1), u=unit(v1,"P1 to P2");
  const p3FromP2=sub(p3,p2);
  const perpendicular=sub(p3FromP2,mul(u,dot(p3FromP2,u)));
  const width=length(perpendicular), v=unit(perpendicular,"Panel width / height direction");
  const offL=finite(input.offsetLength ?? 0,"Length offset");
  const offW=finite(input.offsetWidth ?? 0,"Width offset");
  const thickness=finite(input.thickness ?? 18,"Panel thickness");
  if(len<=0 || width<=0) throw new Error("Panel length and width must be greater than zero.");
  if(thickness<=0) throw new Error("Panel thickness must be greater than zero.");
  if(offL<0 || offW<0) throw new Error("Offsets cannot be negative.");
  if(offL*2>=len) throw new Error("Length offset removes the panel. Use less than half its length.");
  if(offW*2>=width) throw new Error("Width offset removes the panel. Use less than half its width.");

  const innerL=len-2*offL, innerW=width-2*offW;
  const start=add(add(p1,mul(u,offL)),mul(v,offW));
  const end=add(add(p2,mul(u,-offL)),mul(v,offW));
  const farEnd=add(end,mul(v,innerW));
  const farStart=add(start,mul(v,innerW));
  const front=[start,end,farEnd,farStart];
  let normal=unit(cross(u,v),"Panel normal");
  const direction=input.extrusionDirection===-1 ? -1 : 1;
  normal=mul(normal,direction);
  const push=mul(normal,thickness);
  const back=front.map(p=>add(p,push));
  const vertices=[...front,...back];
  const faces=[
    {id:"front",points:front,fill:"#dce3d6",stroke:"#465543"},
    {id:"back",points:back,fill:"#aab6a2",stroke:"#465543"},
    {id:"edge-a",points:[front[0],front[1],back[1],back[0]],fill:"#9eac95",stroke:"#465543"},
    {id:"edge-b",points:[front[1],front[2],back[2],back[1]],fill:"#c1cbb9",stroke:"#465543"},
    {id:"edge-c",points:[front[2],front[3],back[3],back[2]],fill:"#899a80",stroke:"#465543"},
    {id:"edge-d",points:[front[3],front[0],back[0],back[3]],fill:"#b4c0ab",stroke:"#465543"}
  ];
  return {
    version:"dcode.panel-geometry.v1",
    units:"mm",
    points:{p1,p2,p3},
    axes:{length:u,width:v,normal},
    raw:{length:round3(len),width:round3(width)},
    offsets:{length:offL,width:offW},
    dimensions:{length:round3(innerL),width:round3(innerW),thickness:round3(thickness)},
    front,back,vertices,faces,
    bounds:{
      min:{x:Math.min(...vertices.map(p=>p.x)),y:Math.min(...vertices.map(p=>p.y)),z:Math.min(...vertices.map(p=>p.z))},
      max:{x:Math.max(...vertices.map(p=>p.x)),y:Math.max(...vertices.map(p=>p.y)),z:Math.max(...vertices.map(p=>p.z))}
    }
  };
}

export function pointsFromDimensions({length,width,plane="XZ"}) {
  const l=finite(length,"Panel length"), w=finite(width,"Panel width");
  if(l<=0 || w<=0) throw new Error("Panel length and width must be greater than zero.");
  if(plane==="XY") return {p1:vec(0,0,0),p2:vec(l,0,0),p3:vec(l,w,0)};
  if(plane==="YZ") return {p1:vec(0,0,0),p2:vec(0,l,0),p3:vec(0,l,w)};
  return {p1:vec(0,0,0),p2:vec(l,0,0),p3:vec(l,0,w)};
}