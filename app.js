(function(){
const B=window.BASE;
let DB={cats:B.cats,ans:B.ans,ivas:B.ivas,rows:[],exc:B.exc,src:'Base_credito_material.xlsx'};
const esc=s=>String(s).replace(/[&<>"]/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;'}[c]));
const norm=s=>String(s||'').normalize('NFD').replace(/[̀-ͯ]/g,'').toUpperCase();
const ncode=s=>{const d=String(s||'').replace(/\D/g,'').replace(/^0+/,'');return d||(String(s||'').replace(/\D/g,'')?'0':'')};
let byCode=new Map();

function build(rowsArr){
  DB.rows=rowsArr; byCode=new Map();
  rowsArr.forEach((r,i)=>{r.nd=norm(r[1]);const l=byCode.get(r[0]);l?l.push(i):byCode.set(r[0],[i]);});
  renderStats(); renderExc();
}
function parseEmbedded(){return B.rows.split('\n').map(l=>{const p=l.split('\t');return [p[0],p[1],+p[2],+p[3],+p[4]];});}
function status(r){const a=norm(DB.ans[r[3]]);return a==='CREDITO'?'ok':a?'no':'na'}
function pad(c){return c.padStart(18,'0')}
function chips(s){return String(s||'').split('/').filter(Boolean).map(x=>`<span class="chip">${esc(x)}</span>`).join('')||'<span class="chip">—</span>'}

const out=document.getElementById('out'), q=document.getElementById('q');

function showCard(idxs){
  const r=DB.rows[idxs[0]], st=status(r);
  const label=st==='ok'?'TOMA CRÉDITO':st==='no'?'SEM CRÉDITO':'SEM ANÁLISE';
  const icon=st==='ok'?'<path d="M5 12.5l4.5 4.5L19 7.5"/>':'<path d="M7 7l10 10M17 7 7 17"/>';
  let dupe='';
  if(idxs.length>1){
    const others=idxs.slice(1).map(i=>DB.rows[i]);
    const same=others.every(o=>o[3]===r[3]&&o[4]===r[4]);
    dupe=`<div class="dup">Este código aparece ${idxs.length}× na base${same?' com a mesma análise':' com análises diferentes — confira'}: ${others.map(o=>esc(o[1])).join(' · ')}</div>`;
  }
  out.innerHTML=`<div class="verdict ${st==='na'?'':st}" role="status">
    <div class="vtop"><div class="vicon"><svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="3" stroke-linecap="round" stroke-linejoin="round">${icon}</svg></div>
    <div class="vbadge">${label}</div></div>
    <div class="vdesc">${esc(r[1]||'(sem descrição)')}</div>
    <dl class="kv" style="margin:0">
      <div><dt>Código</dt><dd class="mono">${pad(r[0])}</dd></div>
      <div><dt>Categoria</dt><dd>${esc(DB.cats[r[2]]||'—')}</dd></div>
      <div><dt>IVA</dt><dd class="chips">${chips(DB.ivas[r[4]])}</dd></div>
    </dl>${dupe}</div>`;
  addRecent(r);
}
function showList(idxs,total,term){
  if(!idxs.length){out.innerHTML=`<div class="empty">Nenhum material encontrado para <b class="mono">${esc(term)}</b>. Confira o código ou busque pela descrição.</div>`;return;}
  out.innerHTML=`<div class="hint" style="margin:0 0 6px">${total>idxs.length?`Mostrando ${idxs.length} de ${total} resultados — refine a busca`:`${total} resultado${total>1?'s':''}`}</div>
  <div class="list">${idxs.map(i=>{const r=DB.rows[i],st=status(r);return `<button data-i="${i}"><span class="mono" style="color:var(--muted)">${esc(r[0])}</span><span class="d">${esc(r[1])}</span><span class="pill ${st}">${st==='ok'?'CRÉDITO':st==='no'?'SEM CRÉDITO':'—'}</span></button>`}).join('')}</div>`;
}
out.addEventListener('click',e=>{const b=e.target.closest('button[data-i]');if(!b)return;const r=DB.rows[+b.dataset.i];q.value=r[0];run();});

function search(term){
  const t=term.trim(); if(!t) return null;
  if(/^[\d\s.\-]+$/.test(t)){
    const c=ncode(t), exact=byCode.get(c);
    if(exact) return {exact};
    const res=[];let total=0;
    for(let i=0;i<DB.rows.length;i++){if(DB.rows[i][0].includes(c)){total++;if(res.length<40)res.push(i);}}
    return {list:res,total};
  }
  const words=norm(t).split(/\s+/).filter(Boolean),res=[];let total=0;
  for(let i=0;i<DB.rows.length;i++){const d=DB.rows[i].nd;if(words.every(w=>d.includes(w))){total++;if(res.length<40)res.push(i);}}
  return {list:res,total};
}
function run(){
  const s=search(q.value);
  if(!s){renderIdle();return;}
  if(s.exact) showCard(s.exact); else if(s.list.length===1) showCard([s.list[0]]); else showList(s.list,s.total,q.value);
}
function renderIdle(){
  out.innerHTML=`<div class="empty">Digite um código acima para ver se o material toma crédito.<br><span style="font-size:.82rem">Exemplos: <a href="#" data-ex="100001252">100001252</a> · <a href="#" data-ex="900000319">900000319</a> · <a href="#" data-ex="oleo diesel">óleo diesel</a></span></div>`;
}
out.addEventListener('click',e=>{const a=e.target.closest('a[data-ex]');if(!a)return;e.preventDefault();q.value=a.dataset.ex;run();q.focus();});
let tmr;q.addEventListener('input',()=>{clearTimeout(tmr);tmr=setTimeout(run,120)});
q.addEventListener('keydown',e=>{if(e.key==='Enter'){clearTimeout(tmr);const s=search(q.value);if(s&&!s.exact&&s.list.length){q.value=DB.rows[s.list[0]][0];}run();}});

function renderStats(){
  let ok=0,no=0;DB.rows.forEach(r=>{const s=status(r);if(s==='ok')ok++;else if(s==='no')no++;});
  document.getElementById('stats').innerHTML=`<span>Base: <b>${esc(DB.src)}</b>${DB.custom?' · <a href="#" id="restore">voltar à base original</a>':''}</span><span><b>${DB.rows.length.toLocaleString('pt-BR')}</b> materiais</span><span><b style="color:var(--ok)">${ok.toLocaleString('pt-BR')}</b> com crédito</span><span><b style="color:var(--no)">${no.toLocaleString('pt-BR')}</b> sem crédito</span>`;
}
function renderExc(){
  const el=document.getElementById('exc');
  if(!DB.exc.length){el.innerHTML='<p class="hint">Nenhuma exceção na planilha.</p>';return;}
  el.innerHTML=`<table><thead><tr><th>Situação</th><th>Análise</th><th>IVA</th></tr></thead><tbody>${DB.exc.map(x=>{const st=norm(x[1])==='CREDITO'?'ok':'no';return `<tr><td>${esc(x[0])}</td><td><span class="pill ${st}">${esc(x[1])}</span></td><td class="chips">${chips(x[2])}</td></tr>`}).join('')}</tbody></table>
  <p class="hint">Essas regras prevalecem sobre a análise do material (ex.: compra de pessoa física não gera crédito mesmo que o material tome crédito).</p>`;
}
document.getElementById('legal').innerHTML=B.legal.map(l=>`<p>${esc(l)}</p>`).join('');

// Lote
let batchText='';
document.getElementById('runBatch').addEventListener('click',()=>{
  const lines=document.getElementById('batch').value.split(/[\n,;\t]+/).map(s=>s.trim()).filter(Boolean);
  const outEl=document.getElementById('batchOut');
  if(!lines.length){outEl.innerHTML='<p class="hint">Cole ao menos um código.</p>';return;}
  const rows=lines.map(l=>{const c=ncode(l),i=byCode.get(c);const r=i?DB.rows[i[0]]:null;return {l,c,r}});
  const nf=rows.filter(x=>!x.r).length;
  outEl.innerHTML=`<table><thead><tr><th>Código</th><th>Descrição</th><th>Análise</th><th>IVA</th></tr></thead><tbody>${rows.map(x=>x.r?`<tr class="${status(x.r)}"><td class="mono">${esc(x.r[0])}</td><td>${esc(x.r[1])}</td><td><span class="pill ${status(x.r)}">${esc(DB.ans[x.r[3]]||'—')}</span></td><td class="mono"><b>${esc(DB.ivas[x.r[4]]||'')}</b></td></tr>`:`<tr><td class="mono">${esc(x.l)}</td><td colspan="3" style="color:var(--warn)">Não encontrado na base</td></tr>`).join('')}</tbody></table>`;
  document.getElementById('batchMsg').textContent=`${rows.length} consultados${nf?` · ${nf} não encontrados`:''}`;
  batchText=['Código\tDescrição\tAnálise\tIVA',...rows.map(x=>x.r?[pad(x.r[0]),x.r[1],DB.ans[x.r[3]],DB.ivas[x.r[4]]].join('\t'):[x.l,'NÃO ENCONTRADO','',''].join('\t'))].join('\n');
  document.getElementById('copyBatch').hidden=false;
});
document.getElementById('copyBatch').addEventListener('click',()=>{
  const m=document.getElementById('batchMsg');
  navigator.clipboard.writeText(batchText).then(()=>m.textContent='Copiado — cole no Excel').catch(()=>{const t=document.getElementById('batch');t.value=batchText;t.select();m.textContent='Resultado colocado na caixa acima: use Ctrl+C';});
});

// Atualizar base a partir de nova planilha
document.getElementById('file').addEventListener('change',async e=>{
  const f=e.target.files[0]; if(!f)return;
  const msg=document.getElementById('stats');
  if(!window.XLSX){msg.innerHTML='<span style="color:var(--no)">O leitor de planilhas ainda não carregou. Tente de novo em alguns segundos.</span>';return;}
  try{
    const wb=XLSX.read(await f.arrayBuffer(),{type:'array'});
    let parsed=null;
    for(const name of wb.SheetNames){
      const a=XLSX.utils.sheet_to_json(wb.Sheets[name],{header:1,raw:false,defval:''});
      const h=a.findIndex(r=>r.some(c=>norm(c).trim()==='MATERIAL'));
      if(h<0)continue;
      const H=a[h].map(c=>norm(c).trim());
      const ci=k=>H.findIndex(x=>x===k), cs=k=>H.findIndex(x=>x.startsWith(k));
      const iD=cs('DESCRI'),iM=ci('MATERIAL'),iC=cs('CATEGORIA'),iA=cs('ANALISE'),iI=ci('IVA');
      const iO=cs('OBS'), iI2=H.findIndex((x,j)=>x==='IVA'&&j>iO&&iO>=0);
      const cats=[],ans=[],ivas=[],rows=[],exc=[];
      const ix=(l,v)=>{v=String(v||'').trim();let k=l.indexOf(v);if(k<0){l.push(v);k=l.length-1}return k};
      for(let r=h+1;r<a.length;r++){
        const R=a[r];
        if(iO>=0&&String(R[iO]).trim())exc.push([String(R[iO]).trim(),String(R[iO+1]||'').trim(),iI2>=0?String(R[iI2]||'').trim():'']);
        const code=ncode(R[iM]); if(!code)continue;
        rows.push([code,String(R[iD]||'').trim(),ix(cats,R[iC]),ix(ans,R[iA]),ix(ivas,R[iI])]);
      }
      parsed={cats,ans,ivas,rows,exc};break;
    }
    if(!parsed||!parsed.rows.length) throw new Error('Não encontrei a coluna "material" com códigos. Use o mesmo layout da planilha original.');
    Object.assign(DB,{cats:parsed.cats,ans:parsed.ans,ivas:parsed.ivas,exc:parsed.exc,src:f.name,custom:true});
    build(parsed.rows);
    try{localStorage.setItem('credbase',JSON.stringify({cats:DB.cats,ans:DB.ans,ivas:DB.ivas,exc:DB.exc,src:DB.src,rows:parsed.rows.map(r=>r.slice(0,5))}))}catch(_){}
    q.value='';renderIdle();q.focus();
  }catch(err){msg.innerHTML=`<span style="color:var(--no)">${esc(err.message||'Não foi possível ler o arquivo.')}</span>`;}
  e.target.value='';
});
document.getElementById('stats').addEventListener('click',e=>{if(e.target.id!=='restore')return;e.preventDefault();try{localStorage.removeItem('credbase')}catch(_){}Object.assign(DB,{cats:B.cats,ans:B.ans,ivas:B.ivas,exc:B.exc,src:'Base_credito_material.xlsx',custom:false});build(parseEmbedded());q.value='';renderIdle();});

// Recentes
let recent=[];try{recent=JSON.parse(localStorage.getItem('credrecent')||'[]')}catch(_){}
function addRecent(r){recent=recent.filter(c=>c!==r[0]);recent.unshift(r[0]);recent=recent.slice(0,8);try{localStorage.setItem('credrecent',JSON.stringify(recent))}catch(_){}renderRecent();}
function renderRecent(){
  const el=document.getElementById('recent');const items=recent.map(c=>byCode.get(c)).filter(Boolean).map(i=>DB.rows[i[0]]);
  if(!items.length){el.innerHTML='<p class="hint" style="margin:0">Os últimos códigos consultados aparecem aqui.</p>';return;}
  el.innerHTML=items.map(r=>{const st=status(r);return `<button data-c="${esc(r[0])}"><span class="c">${esc(r[0])}</span><span class="pill ${st}">${st==='ok'?'CRÉDITO':st==='no'?'SEM CRÉDITO':'—'}</span><span class="d">${esc(r[1])}</span></button>`}).join('');
}
document.getElementById('recent').addEventListener('click',e=>{const b=e.target.closest('button[data-c]');if(!b)return;selectTab('consulta');q.value=b.dataset.c;run();});
// Abas
function selectTab(t){document.querySelectorAll('.tabs button').forEach(b=>b.setAttribute('aria-selected',b.dataset.tab===t));document.querySelectorAll('[data-panel]').forEach(p=>p.hidden=p.dataset.panel!==t);}
document.querySelector('.tabs').addEventListener('click',e=>{const b=e.target.closest('button[data-tab]');if(b)selectTab(b.dataset.tab);});
q.addEventListener('focus',()=>selectTab('consulta'));
// Inicialização
let saved=null;try{saved=JSON.parse(localStorage.getItem('credbase')||'null')}catch(_){}
if(saved&&saved.rows&&saved.rows.length){Object.assign(DB,{cats:saved.cats,ans:saved.ans,ivas:saved.ivas,exc:saved.exc||[],src:saved.src,custom:true});build(saved.rows);}
else build(parseEmbedded());
renderIdle();renderRecent();
})();
