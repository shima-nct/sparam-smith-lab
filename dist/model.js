// Fの出力電流はポート2から外向き。両ポートは同じ実数基準インピーダンス。
export const c=(re=0,im=0)=>({re,im});
export const add=(a,b)=>c(a.re+b.re,a.im+b.im);
export const sub=(a,b)=>c(a.re-b.re,a.im-b.im);
export const mul=(a,b)=>c(a.re*b.re-a.im*b.im,a.re*b.im+a.im*b.re);
export const abs=a=>Math.hypot(a.re,a.im);
export function div(a,b){const d=b.re*b.re+b.im*b.im;if(d===0)throw Error('分母が0です');return c((a.re*b.re+a.im*b.im)/d,(a.im*b.re-a.re*b.im)/d);}
export const identity=()=>[c(1),c(),c(),c(1)];
export function cascade(a,b){return [add(mul(a[0],b[0]),mul(a[1],b[2])),add(mul(a[0],b[1]),mul(a[1],b[3])),add(mul(a[2],b[0]),mul(a[3],b[2])),add(mul(a[2],b[1]),mul(a[3],b[3]))];}
function positive(x,name){if(!Number.isFinite(x)||x<=0)throw Error(`${name}は正の数にしてください`);}
export function network(p,f){
 positive(f,'周波数');positive(p.ref,'基準インピーダンス');
 if(p.mode==='line'){
  positive(p.zc,'線路の特性インピーダンス');positive(p.vp,'位相速度');
  if(!Number.isFinite(p.length)||p.length<0||!Number.isFinite(p.alpha)||p.alpha<0||p.alpha*p.length>30)throw Error('線路長・減衰定数は0以上、αlは30以下にしてください');
  const a=p.alpha*p.length,t=2*Math.PI*f*p.length/p.vp;
  const ch=c(Math.cosh(a)*Math.cos(t),Math.sinh(a)*Math.sin(t));
  const sh=c(Math.sinh(a)*Math.cos(t),Math.cosh(a)*Math.sin(t));
  return [ch,mul(c(p.zc),sh),div(sh,c(p.zc)),ch];
 }
 if(p.mode!=='lumped'||!Array.isArray(p.elements)||p.elements.length>8)throw Error('回路の指定が不正です');
 let F=identity();
 for(const e of p.elements){
  positive(e.value,'素子値');
  if(!['R','L','C'].includes(e.kind)||!['series','shunt'].includes(e.connection))throw Error('素子の指定が不正です');
  const w=2*Math.PI*f;
  const z=e.kind==='R'?c(e.value):e.kind==='L'?c(0,w*e.value*1e-9):c(0,-1/(w*e.value*1e-12));
  F=cascade(F,e.connection==='series'?[c(1),z,c(),c(1)]:[c(1),c(),div(c(1),z),c(1)]);
 }
 return F;
}
export function scattering(F,ref){
 const [A,B,C,D]=F,b=div(B,c(ref)),cc=mul(C,c(ref));
 const den=add(add(A,b),add(cc,D));
 // 全素子が相反なのでdet(F)=1を用い、高減衰線路の桁落ちを避ける。
 const s21=div(c(2),den);
 return {s11:div(sub(add(A,b),add(cc,D)),den),s21,s12:s21,s22:div(add(sub(b,A),sub(D,cc)),den)};
}
export function loadGamma(p){
 if(p.load==='open')return c(1);
 if(p.load==='short')return c(-1);
 if(!Number.isFinite(p.rl)||p.rl<0||!Number.isFinite(p.xl))throw Error('負荷抵抗は0以上、リアクタンスは有限値にしてください');
 return div(c(p.rl-p.ref,p.xl),c(p.rl+p.ref,p.xl));
}
export function response(p,f){
 const F=network(p,f),s=scattering(F,p.ref),gl=loadGamma(p);
 // 負荷を波の同次座標で扱い、開放端やZinの極でもΓを直接計算する。
 const v=mul(c(p.ref),add(c(1),gl)),i=sub(c(1),gl);
 const vin=add(mul(F[0],v),mul(F[1],i)),iin=add(mul(F[2],v),mul(F[3],i));
 const gin=div(sub(vin,mul(c(p.ref),iin)),add(vin,mul(c(p.ref),iin)));
 const zin=abs(iin)<1e-13*Math.max(1,abs(vin)/p.ref)?null:div(vin,iin);
 return {...s,gin,gl,zin,F};
}
export const db=a=>abs(a)<1e-14?-Infinity:20*Math.log10(abs(a));
export const phase=a=>abs(a)<1e-12?null:Math.atan2(a.im,a.re)*180/Math.PI;
export function fmt(a){if(a===null)return '∞';const n=x=>Math.abs(x)<1e-9?'0':Number(x.toPrecision(5)).toString();return `${n(a.re)} ${a.im < -1e-9?'−':'+'} j${n(Math.abs(a.im))}`;}
export function sweep(p){
 positive(p.start,'開始周波数');positive(p.stop,'終了周波数');
 if(p.start>=p.stop)throw Error('終了周波数は開始周波数より大きくしてください');
 return Array.from({length:401},(_,i)=>{const f=p.start+(p.stop-p.start)*i/400;return {f,...response(p,f)};});
}
