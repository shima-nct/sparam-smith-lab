import {c,abs,div,sub,add,response,sweep,fmt,db,phase} from './model.js';
const $=id=>document.getElementById(id),num=id=>Number($(id).value);
let mode='line',elements=[{connection:'series',kind:'L',value:10},{connection:'shunt',kind:'C',value:2}],data=[],params,current,cacheKey='';
const colors={s11:'#167cba',s21:'#007f83',s12:'#9872ad',s22:'#bb8044'},dashes={s11:'',s21:'',s12:'8 4',s22:'3 4'};
const names={s11:'S₁₁',s21:'S₂₁',s12:'S₁₂',s22:'S₂₂',gin:'Γin'};
const n=(x,d=3)=>Number(x.toFixed(d)).toString();
const dbText=a=>Number.isFinite(db(a))?`${n(db(a),2)} dB`:'−∞ dB';
const phaseText=a=>phase(a)===null?'未定義':`${n(phase(a),1)}°`;
function read(){
 for(const el of document.querySelectorAll('input[type=number]:not(:disabled)'))if(el.offsetParent!==null&&(!el.validity.valid||el.value===''))throw Error('入力値と範囲を確認してください');
 const p={mode,ref:num('ref'),zc:num('zc'),length:num('length')/1000,vp:num('vp')*1e8,alpha:num('alpha'),load:$('load').value,rl:num('rl'),xl:num('xl'),start:num('start')*1e9,stop:num('stop')*1e9,elements};
 if(p.start>=p.stop)throw Error('終了周波数は開始周波数より大きくしてください');
 const f=num('freq')*1e9;
 if(f<p.start||f>p.stop)throw Error('観測周波数を掃引範囲内にしてください');
 return p;
}
function renderElements(){
 $('elements').innerHTML=elements.map((e,i)=>`<div class="element"><select aria-label="素子${i+1}の接続" data-i="${i}" data-field="connection"><option value="series" ${e.connection==='series'?'selected':''}>直列</option><option value="shunt" ${e.connection==='shunt'?'selected':''}>並列</option></select><select aria-label="素子${i+1}の種類" data-i="${i}" data-field="kind">${['R','L','C'].map(k=>`<option ${e.kind===k?'selected':''}>${k}</option>`).join('')}</select><input aria-label="素子${i+1}の値（${e.kind==='R'?'Ω':e.kind==='L'?'nH':'pF'}）" data-i="${i}" data-field="value" type="number" min="0.000001" max="1000000" step="any" value="${e.value}"><button aria-label="素子${i+1}を削除" data-remove="${i}">×</button></div>`).join('');
 $('add').disabled=elements.length>=8;
}
function setMode(m){mode=m;document.querySelectorAll('[data-mode]').forEach(b=>{const active=b.dataset.mode===m;b.classList.toggle('active',active);b.setAttribute('aria-pressed',active);});$('line-controls').hidden=m!=='line';$('lumped-controls').hidden=m!=='lumped';}
function preset(name){
 const values={ref:50,zc:75,length:50,vp:2,alpha:0,load:'finite',rl:50,xl:0,start:.1,stop:3,freq:1};
 if(name==='matched')values.zc=50;
 if(name==='quarter'){values.zc=Math.sqrt(50*100);values.rl=100;$('trace').value='gin';}
 else $('trace').value='s11';
 if(['lowpass','highpass','resistor'].includes(name)){
  setMode('lumped');elements=name==='lowpass'?[{connection:'series',kind:'L',value:10},{connection:'shunt',kind:'C',value:2}]:name==='highpass'?[{connection:'series',kind:'C',value:2},{connection:'shunt',kind:'L',value:10}]:[{connection:'series',kind:'R',value:50}];renderElements();
 }else setMode('line');
 for(const [k,v]of Object.entries(values))$(k).value=v;
 $('preset').value=name;update();
}
function linePath(points){return points.map((p,i)=>`${i?'L':'M'}${p[0].toFixed(2)},${p[1].toFixed(2)}`).join(' ');}
function smith(){
 const key=$('trace').value,xy=g=>[250+204*g.re,250-204*g.im];
 const gamma=(r,x)=>div(c(r-1,x),c(r+1,x));
 let grid='<defs><clipPath id="disk"><circle cx="250" cy="250" r="204"/></clipPath><marker id="arrow" viewBox="0 0 10 10" refX="8" refY="5" markerWidth="5" markerHeight="5" orient="auto-start-reverse"><path d="M 0 0 L 10 5 L 0 10 z" fill="#167cba"/></marker></defs><circle cx="250" cy="250" r="204" fill="#fbfdfb" stroke="#91aaa0" stroke-width="1.3"/><g clip-path="url(#disk)" fill="none" stroke="#dce5dd" stroke-width=".85">';
 for(const r of [.2,.5,1,2,5])grid+=`<circle cx="${250+204*r/(1+r)}" cy="250" r="${204/(1+r)}"/>`;
 for(const x of [.2,.5,1,2,5])for(const sign of [-1,1])grid+=`<circle cx="454" cy="${250-204/(sign*x)}" r="${204/x}"/>`;
 grid+='<path d="M46 250H454" stroke="#bbcfc3"/></g>';
 for(const r of [.2,.5,1,2,5]){const [x]=xy(gamma(r,0));grid+=`<text x="${x+3}" y="264">${r}</text>`;}
 for(const x of [.5,1,2])for(const sign of [-1,1]){const [a,b]=xy(gamma(0,x*sign));grid+=`<text x="${250+(a-250)*1.08}" y="${250+(b-250)*1.08+4}" text-anchor="middle">${sign>0?'+':'−'}j${x}</text>`;}
 grid+='<text x="35" y="253" text-anchor="end">0</text><text x="466" y="253">∞</text><text x="250" y="20" text-anchor="middle">誘導性 +jx</text><text x="250" y="487" text-anchor="middle">容量性 −jx</text>';
 const val=current[key],p=xy(val),first=xy(data[0][key]);
 grid+=`<g clip-path="url(#disk)"><circle cx="250" cy="250" r="${204*Math.min(1,abs(val))}" fill="none" stroke="#c3d2ca" stroke-dasharray="3 5"/><path d="${linePath(data.map(d=>xy(d[key])))}" fill="none" stroke="#167cba" stroke-width="2.6"/>`;
 // 疎な方向矢印。周回する軌跡でも掃引方向を確認できる。
 for(const i of [100,220,340]){const a=xy(data[i-3][key]),b=xy(data[i][key]);if(Math.hypot(a[0]-b[0],a[1]-b[1])>1)grid+=`<path d="${linePath([a,b])}" stroke="#167cba" stroke-width="2" marker-end="url(#arrow)"/>`;}
 const amber=key==='gin'?xy(current.gl):first;
 grid+=`<circle cx="${amber[0]}" cy="${amber[1]}" r="4" fill="#cc8c36"/><path d="M250 250L${p[0]} ${p[1]}" stroke="#167cba" stroke-width="1" stroke-dasharray="3 4"/><circle cx="${p[0]}" cy="${p[1]}" r="6.5" fill="#fff" stroke="#167cba" stroke-width="3"/></g>`;
 $('smith').innerHTML=grid;$('amber-label').textContent=key==='gin'?'負荷端 ΓL':'掃引開始点';
 const z=abs(sub(c(1),val))<1e-12?null:div(add(c(1),val),sub(c(1),val));
 $('smith-readout').innerHTML=`<span>${names[key]} = ${fmt(val)}</span><span>z = ${fmt(z)}</span>`;
}
function plot(){
 const phaseMode=$('plotmode').value==='phase',min=phaseMode?-180:-80,max=phaseMode?180:0;
 const x=f=>52+448*(f-params.start)/(params.stop-params.start),y=v=>270-230*(v-min)/(max-min);
 let svg='<defs><clipPath id="plotclip"><rect x="52" y="40" width="448" height="230"/></clipPath></defs>';
 for(let i=0;i<=4;i++){const v=min+(max-min)*i/4;svg+=`<path d="M52 ${y(v)}H500" stroke="#e4ebe5"/><text x="40" y="${y(v)+4}" text-anchor="end">${v}</text>`;}
 for(let i=0;i<=4;i++){const f=params.start+(params.stop-params.start)*i/4;svg+=`<path d="M${x(f)} 40V270" stroke="#edf2ed"/><text x="${x(f)}" y="293" text-anchor="middle">${n(f/1e9,2)}</text>`;}
 svg+=`<text x="52" y="24">${phaseMode?'位相 / °':'20 log₁₀ |Sᵢⱼ| / dB'}</text><text x="500" y="319" text-anchor="end">周波数 f / GHz</text><g clip-path="url(#plotclip)">`;
 for(const checkbox of document.querySelectorAll('.plot-toggles input:checked')){
  const key=checkbox.value;let d='',prev=null;
  for(const row of data){let v=phaseMode?phase(row[key]):db(row[key]);if(phaseMode&&v===null){prev=null;continue;}if(!phaseMode)v=Math.max(min,v);const jump=prev===null||(phaseMode&&Math.abs(v-prev)>180);d+=`${jump?'M':'L'}${x(row.f).toFixed(2)},${y(v).toFixed(2)} `;prev=v;}
  svg+=`<path d="${d}" fill="none" stroke="${colors[key]}" stroke-width="2.3" stroke-dasharray="${dashes[key]}"/>`;
 }
 const f=num('freq')*1e9;svg+=`<path d="M${x(f)} 40V270" stroke="#637b70" stroke-dasharray="4 5"/>`;
 for(const cb of document.querySelectorAll('.plot-toggles input:checked')){const val=phaseMode?phase(current[cb.value]):db(current[cb.value]);if(val!==null&&val>=min&&val<=max)svg+=`<circle cx="${x(f)}" cy="${y(val)}" r="4" fill="white" stroke="${colors[cb.value]}" stroke-width="2"/>`;}
 $('response').innerHTML=svg+'</g>';
 $('plot-note').textContent=phaseMode?'位相は−180°〜180°。折り返し部分と振幅0の点は線を接続しません。':'振幅の表示下限は−80 dB。0や表示下限未満の値は下端に表示します。';
}
function circuit(){
 const start=`<div class="port"><b>PORT 1</b>a₁ → / ← b₁</div><span class="wire"></span>`;
 const line=`<div class="circuit-block">伝送線路<small>Z₀ = ${n(params.zc)} Ω · l = ${n(params.length*1000)} mm</small></div>`;
 const blocks=elements.map(e=>`<div class="circuit-block ${e.connection}">${e.kind} ${e.value} ${e.kind==='R'?'Ω':e.kind==='L'?'nH':'pF'}<small>${e.connection==='series'?'直列':'並列 / 接地'}</small></div>`).join('<span class="wire"></span>');
 $('circuit').innerHTML=start+(mode==='line'?line:blocks||'<div class="circuit-block">直結</div>')+`<span class="wire"></span><div class="port"><b>PORT 2</b>b₂ → / ← a₂</div><div class="circuit-load">→ Z<sub>L</sub><br>${params.load==='open'?'開放':params.load==='short'?'短絡':fmt(c(params.rl,params.xl))+' Ω'}</div>`;
 $('electrical').textContent=mode==='line'?`βl = ${n(360*num('freq')*1e9*params.length/params.vp,1)}°`:`${elements.length} ELEMENTS`;
 $('wave-conditions').hidden=mode!=='line';
 if(mode==='line'){
  const wavelength=params.vp/(num('freq')*1e9);
  const quarter=params.length>0?`この線路長が四分の一波長となる周波数は <i>f</i><sub>0</sub> = <i>v</i><sub>p</sub>/(4<i>l</i>) = <strong>${Number((params.vp/(4*params.length)/1e9).toPrecision(5))} GHz</strong> です。`:'線路長が0のため、四分の一波長となる周波数はありません。';
  $('wave-conditions').innerHTML=`<h3>線路内の波長と四分の一波長の条件</h3><p><i>λ</i><sub>g</sub> は、この線路（変成器内）を伝わる波の波長です。<i>λ</i><sub>g</sub> = <i>v</i><sub>p</sub>/<i>f</i> = 2π/<i>β</i>。位相速度は左の「位相速度 <i>v</i><sub>p</sub>」を使います。</p><p>現在：<i>f</i> = ${num('freq')} GHz、<i>v</i><sub>p</sub> = ${num('vp')} × 10⁸ m/s → <strong><i>λ</i><sub>g</sub> = ${n(wavelength*1000)} mm</strong>、<i>l</i> = ${n(params.length/wavelength,4)} <i>λ</i><sub>g</sub>。${quarter}</p><p>抵抗負荷を整合する変成器の設計条件：<i>l</i> = <i>v</i><sub>p</sub>/(4<i>f</i><sub>0</sub>)、<i>α</i> = 0、<i>Z</i><sub>L</sub> = <i>R</i><sub>L</sub> &gt; 0、<i>Z</i><sub>0</sub> = <i>Z</i><sub>t</sub> = √(<i>Z</i><sub>ref</sub><i>R</i><sub>L</sub>)。<i>Z</i><sub>t</sub> は変成器の特性インピーダンスです。整合は「<i>Γ</i><sub>in</sub>：指定負荷での入力反射」で確認します。</p>`;
 }
}
function numbers(){
 $('matrix').innerHTML=['s11','s12','s21','s22'].map(k=>`<div class="matrix-cell"><b>${names[k]}</b><strong>${n(abs(current[k]),5)} ∠ ${phaseText(current[k])}</strong><small>${dbText(current[k])} · ${fmt(current[k])}</small></div>`).join('');
 const r=abs(current.gin),vswr=r>=1-1e-12?'∞':n((1+r)/(1-r),4);
 $('loaded').innerHTML=[['Zin',`${fmt(current.zin)} Ω`],['Γin',fmt(current.gin)],['|Γin| ∠ 位相',`${n(r,5)} ∠ ${phaseText(current.gin)}`],['VSWR',vswr],['リターンロス',r<1e-14?'∞ dB':`${n(-db(current.gin),2)} dB`]].map(([a,b])=>`<div><dt>${a}</dt><dd>${b}</dd></div>`).join('');
 const reflected=abs(current.s11)**2,transmitted=abs(current.s21)**2,dissipated=Math.max(0,1-reflected-transmitted);
 for(const [id,v]of Object.entries({reflected,transmitted,dissipated}))$(id).style.width=`${100*v}%`;
 $('power-values').innerHTML=`<span>反射 ${n(reflected*100,1)}%</span><span>透過 ${n(transmitted*100,1)}%</span><span>回路内損失 ${n(dissipated*100,1)}%</span>`;
}
function update(recompute=true){
 try{
  $('load-values').hidden=$('load').value!=='finite';$('rl').disabled=$('xl').disabled=$('load').value!=='finite';
  params=read();const nextKey=JSON.stringify(params);if(recompute||nextKey!==cacheKey){data=sweep(params);cacheKey=nextKey;}current=response(params,num('freq')*1e9);
  $('slider').min=num('start');$('slider').max=num('stop');$('slider').value=num('freq');$('range-start').textContent=`${num('start')} GHz`;$('range-stop').textContent=`${num('stop')} GHz`;
  $('error').hidden=true;document.querySelector('.results').classList.remove('stale');$('csv').disabled=false;
  circuit();smith();plot();numbers();
 }catch(e){$('error').textContent=e.message;$('error').hidden=false;document.querySelector('.results').classList.add('stale');$('csv').disabled=true;}
}
document.querySelectorAll('[data-mode]').forEach(b=>b.addEventListener('click',()=>{setMode(b.dataset.mode);update();}));
$('preset').addEventListener('change',()=>preset($('preset').value));$('reset').addEventListener('click',()=>{$('plotmode').value='db';document.querySelectorAll('.plot-toggles input').forEach(el=>el.checked=['s11','s21'].includes(el.value));preset('mismatch');});
$('elements').addEventListener('input',e=>{const {i,field}=e.target.dataset;if(field){elements[Number(i)][field]=field==='value'?Number(e.target.value):e.target.value;if(field==='kind')renderElements();update();}});
$('elements').addEventListener('click',e=>{if(e.target.dataset.remove!==undefined){elements.splice(Number(e.target.dataset.remove),1);renderElements();update();}});
$('add').addEventListener('click',()=>{if(elements.length<8){elements.push({connection:'series',kind:'L',value:10});renderElements();update();}});
for(const el of document.querySelectorAll('.controls input,.controls select,.sweep-limits input'))if(el.id!=='preset')el.addEventListener('input',()=>update());
$('freq').addEventListener('input',()=>update(false));$('slider').addEventListener('input',()=>{$('freq').value=$('slider').value;update(false);});
for(const id of ['trace','plotmode'])$(id).addEventListener('change',()=>update(false));document.querySelectorAll('.plot-toggles input').forEach(el=>el.addEventListener('change',()=>update(false)));
$('response').addEventListener('click',e=>{if(!params||!$('error').hidden)return;const box=$('response').getBoundingClientRect(),t=Math.max(0,Math.min(1,((e.clientX-box.left)/box.width*520-52)/448));$('freq').value=n((params.start+t*(params.stop-params.start))/1e9,4);update(false);});
$('response').addEventListener('keydown',e=>{if(!['ArrowLeft','ArrowRight'].includes(e.key)||!params)return;e.preventDefault();const step=(params.stop-params.start)/1e9/100;$('freq').value=n(Math.max(params.start/1e9,Math.min(params.stop/1e9,num('freq')+(e.key==='ArrowLeft'?-step:step))),6);update(false);});
$('csv').addEventListener('click',()=>{
 if(!$('error').hidden)return;
 const meta=`# mode=${params.mode}; Zref_ohm=${params.ref}; load=${params.load}; RL_ohm=${params.rl}; XL_ohm=${params.xl}; ${params.mode==='line'?`Z0_ohm=${params.zc}; length_m=${params.length}; vp_m_s=${params.vp}; alpha_Np_m=${params.alpha}`:`elements=${JSON.stringify(elements)}`}\n`;
 const keys=['s11','s21','s12','s22','gin'];const header=['frequency_Hz',...keys.flatMap(k=>[k+'_real',k+'_imag']), 'Zin_real_ohm','Zin_imag_ohm'];
 const rows=data.map(r=>[r.f,...keys.flatMap(k=>[r[k].re,r[k].im]),r.zin?.re??'Infinity',r.zin?.im??'Infinity'].join(','));
 const url=URL.createObjectURL(new Blob([meta+header.join(',')+'\n'+rows.join('\n')],{type:'text/csv;charset=utf-8'}));const a=document.createElement('a');a.href=url;a.download='microwave-sweep.csv';a.click();setTimeout(()=>URL.revokeObjectURL(url),1000);
});
renderElements();update();

