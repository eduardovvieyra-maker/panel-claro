// Carga un extracto del Banco Patagonia (texto del PDF) en la Conciliación de index.html.
// Uso: node tools/conciliar.js <extracto.txt>     (el texto lo saca read_file_content de Drive)
// Solo escribe lo que el extracto dice. Transferencia de alguien que no está en pagadores.json
// NO se carga: se lista como "sin asignar". Sin extracto del mes => el panel no muestra nada.
const fs=require('fs'),path=require('path');
const raiz=path.join(__dirname,'..'), idx=path.join(raiz,'index.html');
const cfg=JSON.parse(fs.readFileSync(path.join(__dirname,'pagadores.json'),'utf8'));
const txt=fs.readFileSync(process.argv[2],'utf8').replace(/\\_/g,'_').replace(/\s+/g,' ');
const MES=['Enero','Febrero','Marzo','Abril','Mayo','Junio','Julio','Agosto','Septiembre','Octubre','Noviembre','Diciembre'];
const KEY=['ene','feb','mar','abr','may','jun','jul','ago','sep','oct','nov','dic'];
const num=s=>parseFloat(s.replace(/\./g,'').replace(',','.'));
const fail=m=>{console.error('✗ '+m);process.exit(1)};
const per=txt.match(/ESTADO DE CUENTAS UNIFICADO CLIENTE N°: 373006047 AL (\d{1,2})\/(\d{2})\/(\d{2})/);
if(!per) fail('no es un extracto de la cuenta 373006047 (no encuentro "ESTADO DE CUENTAS UNIFICADO … AL dd/mm/aa")');
const m=+per[2]-1, anio=2000+ +per[3], label=MES[m]+' '+anio, key=KEY[m]+(anio===2026?'':String(anio).slice(2));
// Pago a Claro
const pc=txt.match(/(\d{1,2}\/\d{2})\/(\d{2}) PAGO DE SERVICIOS CLARO ([\d.]+,\d{2})/);
const pagoClaro=pc?{fecha:pc[1].replace(/^(\d)\//,'0$1/')+'/'+anio,monto:num(pc[3])}:null;
// Transferencias recibidas
const i0=txt.indexOf('TRANSFERENCIAS RECIBIDAS'); if(i0<0) fail('el extracto no tiene sección TRANSFERENCIAS RECIBIDAS');
let sec=txt.slice(i0+24); const i1=sec.search(/TRANSFERENCIAS ENVIADAS|TARJETAS DE CREDITO|DETALLE - COMISION/); if(i1>=0) sec=sec.slice(0,i1);
const usd=[]; const re=/(\d{1,2}\/\d{2})\/\d{2} (.+?) VARIOS .*?(\d+,\d{2}) CA (\$|USD) 373/g; let r; const recibidas=[];
while((r=re.exec(sec))) { if(r[4]==='USD') usd.push(r[2].trim()); else recibidas.push({f:r[1].replace(/^(\d)\//,'0$1/'),nombre:r[2].trim(),m:num(r[3])}); }
const nCred=(sec.match(/ CA \$ 373/g)||[]).length; // las en dólares (USD) no son cobros de Claro: se ignoran
if(recibidas.length!==nCred) fail('leí '+recibidas.length+' transferencias pero el extracto marca '+nCred+'. No cargo nada.');
const norm=s=>s.toUpperCase().replace(/\s+/g,' ');
const grupos=cfg.grupos.map(g=>({id:g.base+'_'+key,n:g.n,rec:g.rec,metodo:g.metodo,cobros:[]}));
const sinAsignar=[],confirmar=new Set();
recibidas.forEach(t=>{
  if((cfg.ignorar||[]).some(i=>norm(t.nombre).startsWith(norm(i.banco)))) return;
  const p=cfg.pagadores.find(p=>norm(t.nombre).startsWith(norm(p.banco)));
  if(!p){sinAsignar.push(t);return}
  if(p.confirmar) confirmar.add(p.banco+' → '+p.grupo);
  grupos.find(g=>g.n===p.grupo).cobros.push({f:t.f,q:p.q,m:t.m});
});
grupos.forEach(g=>g.cobros.sort((a,b)=>a.f.slice(3)+a.f.slice(0,2)<b.f.slice(3)+b.f.slice(0,2)?-1:1));
const linea=g=>`      {id:'${g.id}', n:'${g.n}', rec:${g.rec}, metodo:'${g.metodo}', cobros:[${g.cobros.map(c=>`{f:'${c.f}',q:'${c.q}',m:${c.m}}`).join(',')}]},`;
const bloque=`  ${key}:{\n    label:'${label}', pagoClaro:${pagoClaro?`{fecha:'${pagoClaro.fecha}', monto:${pagoClaro.monto}}`:'null'},\n    grupos:[\n${grupos.map(linea).join('\n')}\n    ]\n  }`;
// meter/reemplazar en index.html
let html=fs.readFileSync(idx,'utf8');
const a=html.indexOf('/*CONC:INICIO*/'), b=html.indexOf('/*CONC:FIN*/'); if(a<0||b<0) fail('faltan las marcas /*CONC:INICIO*/ y /*CONC:FIN*/ en index.html');
const cur=html.slice(a+15,b).replace(/^\s*const CONC_MESES = \{/,'').replace(/\};\s*$/,'');
const ctx={};require('vm').runInNewContext('x={'+cur+'}',ctx);
const orden=['ene','feb','mar','abr','may','jun','jul','ago','sep','oct','nov','dic'];
const meses=ctx.x; meses[key]=null; delete meses[key];
const ks=Object.keys(meses).concat(key).sort((p,q)=>orden.indexOf(q.slice(0,3))-orden.indexOf(p.slice(0,3)));
const bloquesExist={}; // reconstruir bloques existentes
ks.forEach(k=>{ if(k===key) return; const d=meses[k];
  bloquesExist[k]=`  ${k}:{\n    label:'${d.label}', pagoClaro:${d.pagoClaro?`{fecha:'${d.pagoClaro.fecha}', monto:${d.pagoClaro.monto}}`:'null'},\n    grupos:[\n${d.grupos.map(linea).join('\n')}\n    ]\n  }`;});
bloquesExist[key]=bloque;
const nuevo='\nconst CONC_MESES = {\n'+ks.map(k=>bloquesExist[k]).join(',\n')+'\n};\n';
html=html.slice(0,a+15)+nuevo+html.slice(b);
fs.writeFileSync(idx,html);
const R=n=>Math.round(n).toLocaleString('es-AR');
const tot=grupos.reduce((s,g)=>s+g.cobros.reduce((x,c)=>x+c.m,0),0);
console.log(`OK ${label} (clave ${key}): ${recibidas.length} transferencias recibidas, $ ${R(tot)} asignadas a grupos`);
console.log(pagoClaro?`Pago a Claro: $ ${R(pagoClaro.monto)} el ${pagoClaro.fecha}`:'Pago a Claro: no figura en este extracto');
grupos.filter(g=>g.rec).forEach(g=>console.log('  '+(g.cobros.length?'✓ ':'· ')+g.n+(g.cobros.length?': '+g.cobros.map(c=>c.f+' '+c.q+' $ '+R(c.m)).join(' + '):': sin transferencia')));
if(sinAsignar.length){console.log('SIN ASIGNAR (no cargadas, hay que decidir de quién son):');sinAsignar.forEach(t=>console.log('  '+t.f+' '+t.nombre+' $ '+R(t.m)));}
if(confirmar.size) console.log('Asignaciones sin confirmar por Eduardo: '+[...confirmar].join(' | '));
