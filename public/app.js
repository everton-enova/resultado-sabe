'use strict';
const $ = id => document.getElementById(id);
/* O evento é fixado na build (variável EVENTO) e fica no <html>; cada site publica um só. */
const EVENTO = document.documentElement.dataset.evento || 'ept';
const defaults = [
  {id:'ept',nome:'EPT',data:'2026-10-07',limite:250,encerramento:'2026-10-05T23:59:59-03:00'},
  {id:'eja',nome:'EJA',data:'2026-10-08',limite:250,encerramento:'2026-10-05T23:59:59-03:00'}
];
const labels = {ABERTO:'Inscrições abertas',FECHADO:'Inscrições em preparação',EM_BREVE:'Inscrições em breve',ENCERRADO:'Inscrições encerradas',ESGOTADO:'Vagas preenchidas'};
let events = defaults.filter(e=>e.id===EVENTO).map(e=>({...e,estado:'FECHADO',funcoes:[],municipiosLotados:[]}));
let cities = [], selected = null, connected = false, busy = false, loading = true, request = null;
function dateLabel(date) {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(date || '')) return 'Data a divulgar';
  return new Date(date+'T12:00:00-03:00').toLocaleDateString('pt-BR',{day:'numeric',month:'long',year:'numeric',timeZone:'America/Bahia'});
}
function deadlineAt(event) { const time = Date.parse(event?.encerramento || ''); return Number.isFinite(time) ? time : null; }
function deadlineLabel(event) {
  const time = deadlineAt(event); if (time === null) return '';
  const when = new Date(time), zone = {timeZone:'America/Bahia'};
  return when.toLocaleDateString('pt-BR',{day:'numeric',month:'long',year:'numeric',...zone}) +
    ' às ' + when.toLocaleTimeString('pt-BR',{hour:'2-digit',minute:'2-digit',...zone});
}
/* Local e Horario sao digitados na planilha, onde <br> e o jeito natural de quebrar linha.
   Continuamos gravando como texto (a planilha e editavel por varias pessoas; HTML dali nao
   entra na pagina), entao traduzimos a marca para quebra real e deixamos o CSS respeita-la. */
function textoPlanilha(valor) {
  // O <br> costuma vir seguido de quebra real na celula: sem colapsar, sobra linha em branco.
  return String(valor || '').replace(/<br\s*\/?>/gi, '\n').replace(/\s*\n\s*/g, '\n').trim();
}
function show(section) { for(const id of ['registration','success']) $(id).hidden = id !== section; }
function option(select, value, name, disabled=false) { const o = new Option(name,value); o.disabled=disabled; select.add(o); }
function resetSelect(id, placeholder) { $(id).replaceChildren(); option($(id),'',placeholder); }
function usable(role) { return selected.estado !== 'ABERTO' || role.disponiveis > 0; }
let ticker = null;
function pad(value) { return String(value).padStart(2,'0'); }
function drawCountdown(sufixo, prazo, rotulo) {
  const bloco = $('countdown'+sufixo);
  if (prazo === null) { bloco.hidden = true; return 0; }
  const left = prazo - Date.now();
  bloco.hidden = false;
  bloco.classList.toggle('is-over', left <= 0);
  bloco.classList.toggle('is-soon', left > 0 && left <= 864e5);
  $('countdown-clock'+sufixo).hidden = left <= 0;
  if (left <= 0) { $('countdown-label'+sufixo).textContent = 'Prazo encerrado em ' + rotulo + '.'; return left; }
  $('countdown-label'+sufixo).textContent = 'Inscrições até ' + rotulo;
  const total = Math.floor(left/1000);
  $('cd-dias'+sufixo).textContent = pad(Math.floor(total/86400));
  $('cd-horas'+sufixo).textContent = pad(Math.floor(total%86400/3600));
  $('cd-minutos'+sufixo).textContent = pad(Math.floor(total%3600/60));
  $('cd-segundos'+sufixo).textContent = pad(total%60);
  return left;
}
function renderCountdown() {
  if (!selected) { $('countdown').hidden = true; return; }
  const left = drawCountdown('', deadlineAt(selected), deadlineLabel(selected));
  // O relógio do visitante é apenas indicativo; quem recusa o envio é o servidor.
  if (left <= 0 && selected.estado === 'ABERTO') { selected.estado = 'ENCERRADO'; updateState(); }
}
function startCountdown() { renderCountdown(); if(!ticker) ticker=setInterval(renderCountdown,1000); }
function updateState() {
  const open = connected && selected?.estado === 'ABERTO';
  $('submit').disabled = !open || busy;
  $('submit').textContent = busy ? 'Confirmando inscrição…' : open ? 'Confirmar inscrição' : (labels[selected?.estado] || labels.FECHADO);
  $('submit').setAttribute('aria-busy',String(busy));
  if (!selected) return;
  $('form-status').textContent = open ? 'Inscrições abertas • '+selected.disponiveis+' vagas disponíveis no evento.' : (labels[selected.estado] || labels.FECHADO)+'. Você pode conhecer os campos do formulário; o envio está indisponível.';
}
function clearErrors() {
  document.querySelectorAll('[aria-invalid]').forEach(e=>e.removeAttribute('aria-invalid'));
  document.querySelectorAll('.field-error').forEach(e=>e.textContent='');
  $('feedback').hidden=true;
}
function aplicarEvento() {
  selected=events[0]; if(!selected) return;
  clearErrors();
  $('event-date').textContent=dateLabel(selected.data);
  $('event-time').textContent=textoPlanilha(selected.horario) || 'A divulgar'; $('event-place').textContent=textoPlanilha(selected.local) || 'A divulgar';
  $('selected-label').textContent=selected.nome+' • '+dateLabel(selected.data);
  resetSelect('funcao','Selecione sua função');
  if(selected.funcoes.some(f=>f.tipo==='NTE' && usable(f))) option($('funcao'),'NTE','NTE');
  if(selected.funcoes.some(f=>f.tipo==='MUNICIPAL' && usable(f))) option($('funcao'),'MUNICIPAL','Secretaria Municipal');
  const institucionais=selected.funcoes.filter(f=>f.tipo==='INSTITUCIONAL'), setoresVistos=new Set();
  for(const f of institucionais) {
    if(!f.setor) { option($('funcao'),f.id,f.nome+(usable(f)?'':' — vagas preenchidas'),!usable(f)); continue; }
    if(setoresVistos.has(f.setor)) continue;
    setoresVistos.add(f.setor);
    // O setor vira uma opção só; as unidades aparecem no campo seguinte.
    const livre=institucionais.some(u=>u.setor===f.setor && usable(u));
    option($('funcao'),'SETOR:'+f.setor,f.setor+(livre?'':' — vagas preenchidas'),!livre);
  }
  $('event-deadline').textContent=deadlineLabel(selected); $('deadline-item').hidden=!deadlineLabel(selected);
  changeRole(); startCountdown(); updateState();
}
function changeRole() {
  for(const id of ['setor','municipal','municipio','nte','nte-funcao']) { $(id+'-field').hidden=true; $(id).required=false; resetSelect(id,'Selecione uma opção'); }
  if($('funcao').value.startsWith('SETOR:')) {
    const setor=$('funcao').value.slice(6);
    $('setor-field').hidden=false; $('setor').required=true;
    resetSelect('setor','Selecione a diretoria');
    // A planilha pode guardar "SGINF/DIE"; dentro do campo do setor basta a sigla.
    const curto=f=>f.nome.startsWith(f.setor+'/')?f.nome.slice(f.setor.length+1):f.nome;
    selected.funcoes.filter(f=>f.tipo==='INSTITUCIONAL' && f.setor===setor).forEach(f=>option($('setor'),f.id,curto(f)+(usable(f)?'':' — vagas preenchidas'),!usable(f)));
  }
  if($('funcao').value==='MUNICIPAL') {
    $('municipal-field').hidden=false; $('municipal').required=true;
    selected.funcoes.filter(f=>f.tipo==='MUNICIPAL').forEach(f=>option($('municipal'),f.id,f.nome+(usable(f)?'':' — vagas preenchidas'),!usable(f)));
  }
  if($('funcao').value==='NTE') {
    $('nte-field').hidden=false; $('nte').required=true;
    [...new Set(selected.funcoes.filter(f=>f.tipo==='NTE' && usable(f)).map(f=>f.nte))].sort().forEach(n=>option($('nte'),n,n));
  }
}
$('funcao').addEventListener('change',changeRole);
$('municipal').addEventListener('change',()=>{
  $('municipio-field').hidden=!$('municipal').value; $('municipio').required=!!$('municipal').value;
  resetSelect('municipio','Selecione seu município');
  cities.forEach(city=>{const full=(selected.municipiosLotados || []).includes(city); option($('municipio'),city,city+(full?' — limite atingido':''),full);});
});
$('nte').addEventListener('change',()=>{
  $('nte-funcao-field').hidden=!$('nte').value; $('nte-funcao').required=!!$('nte').value;
  resetSelect('nte-funcao','Selecione sua função no NTE');
  selected.funcoes.filter(f=>f.tipo==='NTE' && f.nte===$('nte').value).forEach(f=>option($('nte-funcao'),f.id,f.nome+(usable(f)?'':' — vagas preenchidas'),!usable(f)));
});
function novaInscricao() {
  if(busy) return;
  request=null; $('form').reset(); clearErrors();
  show('registration'); aplicarEvento(); $('form-title').focus();
}
$('another').addEventListener('click',()=>{novaInscricao();load();});
function validCPF(value) {
  const cpf=value.replace(/\D/g,''); if(!/^\d{11}$/.test(cpf)||/^(\d)\1+$/.test(cpf))return false;
  for(let size=9;size<=10;size++){let sum=0;for(let i=0;i<size;i++)sum+=Number(cpf[i])*(size+1-i);let d=11-sum%11;if(Number(cpf[size])!==(d>=10?0:d))return false;}return true;
}
$('cpf').addEventListener('input',e=>{e.target.value=e.target.value.replace(/\D/g,'').slice(0,11).replace(/(\d{3})(\d)/,'$1.$2').replace(/(\d{3})(\d)/,'$1.$2').replace(/(\d{3})(\d{1,2})$/,'$1-$2');});
$('telefone').addEventListener('input',e=>{const n=e.target.value.replace(/\D/g,'').slice(0,11);e.target.value=n.length>2?'('+n.slice(0,2)+') '+n.slice(2).replace(n.length>10?/(\d{5})(\d)/:/(\d{4})(\d)/,'$1-$2'):n;});
function invalid(id,message) { $(id).setAttribute('aria-invalid','true'); $(id).setAttribute('aria-describedby',id+'-error'); $(id+'-error').textContent=message; }
function feedback(message) { $('feedback').textContent=message; $('feedback').hidden=false; $('feedback').focus(); }
$('form').addEventListener('submit',async e=>{
  e.preventDefault(); if(busy || !connected || selected?.estado!=='ABERTO')return;
  clearErrors();
  const data={eventoId:selected.id,nome:$('nome').value.trim(),cpf:$('cpf').value.replace(/\D/g,''),telefone:$('telefone').value.replace(/\D/g,''),email:$('email').value.trim(),funcaoId:$('funcao').value,municipio:''};
  if(!data.nome)invalid('nome','Informe seu nome completo.');
  if(!validCPF(data.cpf))invalid('cpf','Informe um CPF válido.');
  if(!/^\d{10,11}$/.test(data.telefone))invalid('telefone','Informe um telefone com DDD.');
  if(!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(data.email))invalid('email','Informe um e-mail válido.');
  if(!data.funcaoId)invalid('funcao','Selecione sua função.');
  if(data.funcaoId.startsWith('SETOR:')){data.funcaoId=$('setor').value;if(!data.funcaoId)invalid('setor','Selecione a diretoria.');}
  if(data.funcaoId==='MUNICIPAL'){data.funcaoId=$('municipal').value;data.municipio=$('municipio').value;if(!data.funcaoId)invalid('municipal','Selecione sua função municipal.');if(!data.municipio)invalid('municipio','Selecione seu município.');}
  if(data.funcaoId==='NTE'){data.funcaoId=$('nte-funcao').value;if(!$('nte').value)invalid('nte','Selecione o NTE.');if(!data.funcaoId)invalid('nte-funcao','Selecione sua função no NTE.');}
  const first=document.querySelector('[aria-invalid=true]');if(first){first.focus();return;}
  const fingerprint=JSON.stringify(data);
  if(!request || request.fingerprint!==fingerprint)request={fingerprint,id:crypto.randomUUID()};
  data.requestId=request.id;
  busy=true; updateState();
  document.querySelectorAll('#form input,#form select').forEach(el=>el.disabled=true);
  try {
    const response=await fetch('/api/inscricoes',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify(data),signal:AbortSignal.timeout(30000)});
    const result=await response.json();
    if(!response.ok || !result.success){feedback(result.message || 'Não foi possível confirmar a inscrição.');return;}
    $('success-event').textContent='Sua participação no evento '+result.evento+' está confirmada.';
    $('protocol').textContent=result.protocolo;
    $('protocol').classList.toggle('is-placa',/^[A-Z]{3}-\d{4}$/.test(result.protocolo)); $('form').reset(); request=null; show('success'); $('success-title').focus();
  } catch(_){feedback('Não foi possível confirmar a resposta. Tente novamente sem alterar os dados para recuperar seu envio.');}
  finally{busy=false;document.querySelectorAll('#form input,#form select').forEach(el=>el.disabled=false);updateState();}
});
/* Enquanto as vagas nao chegam, o esqueleto ocupa o lugar do formulario: campos vazios
   convidam a preencher antes de haver o que escolher no campo de funcao. O piso de 400ms
   evita o lampejo quando a resposta ja esta em cache. */
const MIN_CARREGANDO = 400;
function setLoading(on) {
  loading = on;
  document.documentElement.toggleAttribute('data-loading', on);
}
async function load() {
  setLoading(true);
  const inicio = Date.now();
  try {
    // Uma falha isolada da integração não deve empurrar o visitante para o modo offline.
    let data=null;
    for(let tentativa=0;tentativa<2 && !data;tentativa++) {
      try {
        const response=await fetch('/api/inscricoes',{cache:'no-store',signal:AbortSignal.timeout(30000)});
        const corpo=await response.json();
        if(response.ok && corpo.success && Array.isArray(corpo.eventos))data=corpo;
      } catch(_){/* tenta de novo antes de desistir */}
    }
    if(!data)throw new Error();
    const atual=data.eventos.find(e=>e.id===EVENTO);
    if(!atual)throw new Error();
    events=[atual];cities=data.municipios;connected=true;
    $('connection-notice').hidden=true;
  } catch(_) {
    connected=false; $('connection-notice').hidden=false;
    $('connection-notice').textContent='As inscrições estão em preparação ou temporariamente indisponíveis. Você pode conhecer o formulário e voltar mais tarde para se inscrever.';
    try {const response=await fetch('/catalogo.json');const catalog=await response.json();cities=catalog.municipios;events=defaults.filter(e=>e.id===EVENTO).map(e=>({...e,estado:'FECHADO',funcoes:catalog.funcoes,municipiosLotados:[]}));}catch(_){/* Nenhum envio é liberado sem API. */}
  } finally {
    const resta = MIN_CARREGANDO - (Date.now() - inicio);
    if (resta > 0) await new Promise(pronto => setTimeout(pronto, resta));
    setLoading(false); aplicarEvento();
  }
}
aplicarEvento();load();
