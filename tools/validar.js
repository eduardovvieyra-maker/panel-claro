// Valida los datos de index.html SIN navegador. Uso: node tools/validar.js
// Sale con código 1 si algo no cierra. Imprime una línea por factura.
const fs=require('fs'),vm=require('vm'),path=require('path');
const html=fs.readFileSync(path.join(__dirname,'..','index.html'),'utf8');
const a=html.indexOf('const FACTURAS'), b=html.indexOf('\n',html.indexOf('const PLAN_GB'));
const ctx={};vm.createContext(ctx);
vm.runInContext(html.slice(a,b)+';this.FACTURAS=FACTURAS;this.GRUPOS=GRUPOS;',ctx);
const {FACTURAS,GRUPOS}=ctx;const R=n=>Math.round(n*100)/100;let bad=0;
const err=m=>{console.log('   ✗ '+m);bad++};
const nros=new Set(),en=new Set(GRUPOS.flatMap(g=>g.ls));
const lsR=new Set(GRUPOS.filter(g=>g.rec).flatMap(g=>g.ls));
let prevISO='';
FACTURAS.forEach(f=>{
  console.log((f.mesLabel+'            ').slice(0,18)+(f.nroFact||'(sin N°)')+'  total '+f.total);
  if(f.nroFact){ if(nros.has(f.nroFact)) err('N° de factura repetido'); nros.add(f.nroFact); }
  if(f.fechaISO<prevISO) err('fechas fuera de orden'); prevISO=f.fechaISO;
  if(f.soloHistorial||!f.lineas.length) return;
  const net=f.lineas.reduce((s,l)=>s+l.base+(l.extra||0),0);
  const imp=Object.values(f.imp).reduce((s,v)=>s+v,0);
  if(Math.abs(f.total-net-imp)>0.05) err('líneas('+R(net)+')+imp('+R(imp)+') != total, dif '+R(f.total-net-imp));
  const ls=f.lineas.map(l=>l.linea);
  if(new Set(ls).size!==ls.length) err('líneas repetidas');
  ls.filter(l=>!en.has(l)).forEach(l=>err('línea sin grupo: '+l));
  GRUPOS.forEach(g=>g.ls.forEach(l=>{if(!ls.includes(l))err('falta la línea '+l+' (grupo '+g.n+')')}));
  const sx=(f.extras||[]).reduce((s,e)=>s+e.v,0);
  if(Math.abs(sx-f.totalExtras)>0.05) err('extras suman '+R(sx)+' pero totalExtras='+f.totalExtras);
  const sc=f.lineas.filter(l=>lsR.has(l.linea)).reduce((s,l)=>s+l.base+(l.extra||0),0);
  const F2=f.total/sc-1; if(!(F2>0&&F2<3)) err('F2 raro: '+F2);
});
console.log(bad?('\nFALLÓ: '+bad+' problema(s)'):'\nOK: todas las facturas cierran');
process.exit(bad?1:0);
