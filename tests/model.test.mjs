import assert from 'node:assert/strict';
import {c,abs,sub,mul,add,div,response,sweep,phase,scattering,identity} from '../dist/model.js';
const near=(a,b,t=1e-9)=>assert.ok(abs(sub(a,b))<t,`${JSON.stringify(a)} != ${JSON.stringify(b)}`);
const base={mode:'line',ref:50,zc:50,length:.05,vp:2e8,alpha:0,load:'finite',rl:50,xl:0,start:1e8,stop:3e9};
let r=response(base,1e9);near(r.s11,c());near(r.s21,c(0,-1));near(r.zin,c(50));near(r.gin,c());assert.equal(phase(r.s11),null);
r=response({...base,length:0,zc:75},1e9);near(r.s21,c(1));near(r.s11,c());
r=response({...base,zc:Math.sqrt(5000),rl:100},1e9);near(r.zin,c(50));near(r.gin,c());assert.ok(abs(r.s11)>.3); // S11と指定負荷の入力反射は異なる。
for(const load of ['open','short']){r=response({...base,load},1e9);near(r.gin,c(load==='open'?-1:1));if(load==='open')near(r.zin,c());else assert.equal(r.zin,null);}
r=response({...base,length:.1,load:'open'},1e9);near(r.gin,c(1));assert.equal(r.zin,null);
r=response({...base,alpha:2},1e9);near(r.s21,c(0,-Math.exp(-.1)));assert.ok(abs(r.s11)**2+abs(r.s21)**2<1);
const resistor={...base,mode:'lumped',elements:[{connection:'series',kind:'R',value:50}]};
r=response(resistor,1e9);near(r.s11,c(1/3));near(r.s21,c(2/3));near(r.zin,c(100));
r=response({...resistor,elements:[{connection:'shunt',kind:'R',value:50}]},1e9);near(r.s11,c(-1/3));near(r.s21,c(2/3));
const lc={...base,mode:'lumped',elements:[{connection:'series',kind:'L',value:10},{connection:'shunt',kind:'C',value:2}]};
for(const p of [{...base,zc:75},lc,{...lc,elements:[...lc.elements].reverse()}])for(const row of sweep(p)){
 assert.ok(Math.abs(abs(row.s11)**2+abs(row.s21)**2-1)<1e-10);
 near(row.s12,row.s21);assert.ok(abs(row.gin)<=1+1e-10);
 const gl=row.gl;near(row.gin,add(row.s11,div(mul(mul(row.s12,row.s21),gl),sub(c(1),mul(row.s22,gl)))));
}
const a=response(lc,1e9),b=response({...lc,elements:[...lc.elements].reverse()},1e9);near(a.s11,b.s22);assert.ok(abs(sub(a.s11,a.s22))>.1);
for(const load of ['open','short'])for(const row of sweep({...lc,load}))assert.ok(Math.abs(abs(row.gin)-1)<1e-10);
for(const [k,v]of [['ref',0],['vp',0],['length',-1],['alpha',-1]])assert.throws(()=>response({...base,[k]:v},1e9));
assert.throws(()=>response({...lc,elements:[{connection:'series',kind:'C',value:0}]},1e9));
assert.throws(()=>sweep({...base,start:3e9,stop:1e8}));assert.throws(()=>response({...base,rl:-1},1e9));
near(scattering(identity(),50).s21,c(1));
console.log('PASS: matched/mismatched lines, quarter-wave transformer, open/short poles, attenuation, series/shunt RLC, reciprocity, power conservation, load transformation, validation.');

