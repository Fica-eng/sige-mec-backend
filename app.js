// ============================================
// SIGE — Frontend ligado à API Railway
// MEC Moçambique
// ============================================

var API_URL = 'https://sige-mec-backend-production.up.railway.app/api/v1';
var accessToken  = null;
var currentUser  = null;
var activeCharts = {};

// ======= API HELPER =======
async function api(endpoint, options) {
  options = options || {};
  var headers = { 'Content-Type': 'application/json' };
  if (accessToken) headers['Authorization'] = 'Bearer ' + accessToken;
  try {
    var resp = await fetch(API_URL + endpoint, Object.assign({}, options, { headers: headers }));
    if (resp.status === 401) {
      var ok = await doRefresh();
      if (ok) return api(endpoint, options);
      doLogout(); return null;
    }
    return await resp.json();
  } catch (e) {
    console.error('Erro API:', e);
    return null;
  }
}

async function doRefresh() {
  var rt = localStorage.getItem('sige_refresh');
  if (!rt) return false;
  try {
    var resp = await fetch(API_URL + '/auth/refresh', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ refreshToken: rt })
    });
    if (!resp.ok) return false;
    var data = await resp.json();
    accessToken = data.accessToken;
    localStorage.setItem('sige_refresh', data.refreshToken);
    return true;
  } catch (e) { return false; }
}

// ======= AUTH =======
async function doLogin() {
  var email    = document.getElementById('login-user').value.trim();
  var password = document.getElementById('login-pass').value;
  if (!email || !password) { alert('Preencha email e palavra-passe.'); return; }

  var btn = document.querySelector('.btn-login');
  btn.textContent = 'A entrar...';
  btn.disabled = true;

  try {
    var resp = await fetch(API_URL + '/auth/login', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email: email, password: password })
    });
    var data = await resp.json();

    if (!resp.ok) {
      alert(data.error || 'Credenciais inválidas.');
      btn.textContent = 'Entrar no Sistema';
      btn.disabled = false;
      return;
    }

    accessToken = data.accessToken;
    localStorage.setItem('sige_refresh', data.refreshToken);
    currentUser = data.utilizador;

    var roleNames = {
      ADMIN_MEC:'Administrador MEC', COORDENADOR_REGIONAL:'Coordenador Regional',
      DIRETOR_ESCOLA:'Diretor de Escola', PROFESSOR:'Professor'
    };

    document.getElementById('user-name').textContent       = currentUser.nome;
    document.getElementById('user-role-label').textContent = roleNames[currentUser.role] || currentUser.role;
    document.getElementById('user-avatar').textContent     = currentUser.nome[0].toUpperCase();

    document.getElementById('login-screen').classList.add('hidden');
    document.getElementById('app').classList.remove('hidden');
    setDate();
    navigateTo('dashboard');
  } catch (e) {
    alert('Erro de ligação ao servidor.');
    btn.textContent = 'Entrar no Sistema';
    btn.disabled = false;
  }
}

async function doLogout() {
  var rt = localStorage.getItem('sige_refresh');
  if (rt && accessToken) {
    fetch(API_URL + '/auth/logout', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'Authorization': 'Bearer ' + accessToken },
      body: JSON.stringify({ refreshToken: rt })
    }).catch(function(){});
  }
  accessToken = null; currentUser = null;
  localStorage.removeItem('sige_refresh');
  document.getElementById('app').classList.add('hidden');
  document.getElementById('login-screen').classList.remove('hidden');
  document.getElementById('login-pass').value = '';
  document.querySelector('.btn-login').textContent = 'Entrar no Sistema';
  document.querySelector('.btn-login').disabled = false;
}

function setDate() {
  var now = new Date();
  document.getElementById('top-date').textContent = now.toLocaleDateString('pt-MZ', { weekday:'short', day:'2-digit', month:'short', year:'numeric' });
}

// ======= NAVIGATION =======
function navigate(el) {
  if (el.preventDefault) el.preventDefault();
  navigateTo(el.getAttribute('data-page'));
}

function navigateTo(page) {
  destroyCharts();
  var titles = { dashboard:'Dashboard', escolas:'Gestão de Escolas', alunos:'Gestão de Alunos', professores:'Gestão de Professores', notas:'Notas e Avaliações', matriculas:'Estatísticas de Matrículas', desempenho:'Desempenho Acadêmico', evasao:'Evasão Escolar', rh:'Recursos Humanos', relatorios:'Relatórios' };
  document.getElementById('page-title').textContent = titles[page] || page;
  document.getElementById('breadcrumb').textContent = 'MEC / ' + (titles[page] || page);
  document.querySelectorAll('.nav-item').forEach(function(n){ n.classList.toggle('active', n.getAttribute('data-page') === page); });
  var r = { dashboard:dashboard, escolas:escolas, alunos:alunos, professores:professores, notas:notas, matriculas:matriculas, desempenho:desempenho, evasao:evasao, rh:rh, relatorios:relatorios };
  if (r[page]) r[page]();
}

function toggleSidebar() { document.getElementById('sidebar').classList.toggle('collapsed'); }
function applyFilters() { var p = document.querySelector('.nav-item.active'); if (p) navigateTo(p.getAttribute('data-page')); }

function destroyCharts() {
  Object.values(activeCharts).forEach(function(c){ try{ c.destroy(); }catch(e){} });
  activeCharts = {};
}

function renderChart(id, config) {
  var canvas = document.getElementById(id);
  if (!canvas) return;
  if (activeCharts[id]) { try{ activeCharts[id].destroy(); }catch(e){} }
  activeCharts[id] = new Chart(canvas.getContext('2d'), config);
}

var CD = { plugins: { legend: { labels: { color:'#8B9DBF', font:{ family:'IBM Plex Mono', size:11 }, boxWidth:10 } } }, scales: { x:{ ticks:{ color:'#4A5A7A', font:{ family:'IBM Plex Mono', size:10 } }, grid:{ color:'rgba(255,255,255,0.04)' } }, y:{ ticks:{ color:'#4A5A7A', font:{ family:'IBM Plex Mono', size:10 } }, grid:{ color:'rgba(255,255,255,0.06)' } } } };

function fmt(n)  { return Number(n||0).toLocaleString('pt-MZ'); }
function fmtK(n) { n=Number(n||0); return n>=1000000?(n/1000000).toFixed(1)+'M':n>=1000?(n/1000).toFixed(0)+'K':n; }
function loading() { return '<div class="loading">A carregar dados</div>'; }
function erro(msg) { return '<div class="alert alert-warning">'+String.fromCharCode(9888)+' '+(msg||'Erro ao carregar dados da API.')+'</div>'; }

function kpi(cor, label, valor, sub, trend) {
  return '<div class="kpi-card '+cor+'"><span class="kpi-label">'+label+'</span><span class="kpi-value">'+valor+'</span><span class="kpi-sub">'+sub+'</span>'+(trend?'<span class="kpi-trend up">'+trend+'</span>':'')+'</div>';
}

// ======= DASHBOARD =======
async function dashboard() {
  document.getElementById('page-content').innerHTML = loading();
  var data = await api('/estatisticas/dashboard');
  var prov = await api('/estatisticas/matriculas-por-provincia');
  var tipos = await api('/estatisticas/por-tipo-escola');
  if (!data) { document.getElementById('page-content').innerHTML = erro(); return; }

  var html =
    '<div class="kpi-grid">' +
      kpi('green','Total de Escolas',     fmt(data.escolas.total),       'Activas no sistema',    '+3.2%') +
      kpi('blue', 'Total de Alunos',      fmtK(data.alunos.total),       'Registados',            '+2.5%') +
      kpi('gold', 'Professores',          fmtK(data.professores.total),  'Em exercício',          '+1.8%') +
      kpi('green','Matrículas '+data.anoLetivo, fmtK(data.matriculas.total),'Ano lectivo actual', '+2.1%') +
      kpi('red',  'Taxa de Evasão',       data.taxaEvasao+'%',           'Média nacional',        '') +
      kpi('gold', 'Média de Notas',       data.mediaNotas||'N/D',        'Escala 0–20',           '') +
    '</div>' +
    '<div class="charts-row">' +
      '<div class="chart-card"><div class="chart-header"><div><div class="chart-title">Estado dos Alunos</div></div></div><div class="chart-container"><canvas id="ch-est"></canvas></div></div>' +
      '<div class="chart-card"><div class="chart-header"><div><div class="chart-title">Escolas por Tipo</div></div></div><div class="chart-container"><canvas id="ch-tip"></canvas></div></div>' +
    '</div>' +
    '<div class="table-card"><div class="table-header"><span class="table-title">Por Província</span><button class="btn btn-gold btn-sm" onclick="exportPDF()">Exportar PDF</button></div>' +
    '<table class="data-table"><thead><tr><th>Província</th><th>Escolas</th><th>Alunos</th><th>Professores</th></tr></thead><tbody>' +
    (prov ? prov.sort(function(a,b){return b.totalAlunos-a.totalAlunos;}).map(function(p){
      return '<tr><td><strong style="color:var(--text-primary)">'+p.nome+'</strong></td><td>'+fmt(p.totalEscolas)+'</td><td>'+fmtK(p.totalAlunos)+'</td><td>'+fmtK(p.totalProfessores)+'</td></tr>';
    }).join('') : '') +
    '</tbody></table></div>';

  document.getElementById('page-content').innerHTML = html;

  setTimeout(function(){
    renderChart('ch-est',{ type:'doughnut', data:{ labels:['Activos','Evadidos','Outros'], datasets:[{ data:[data.alunos.ativos,data.alunos.evadidos,data.alunos.total-data.alunos.ativos-data.alunos.evadidos], backgroundColor:['#009A44','#D21034','#4A90D9'], borderWidth:0 }] }, options:{ responsive:true, maintainAspectRatio:false, plugins:{ legend:{ position:'bottom', labels:{ color:'#8B9DBF', font:{ family:'IBM Plex Mono', size:10 }, boxWidth:10 } } } } });
    if (tipos) renderChart('ch-tip',{ type:'doughnut', data:{ labels:tipos.map(function(t){ return t.tipo==='PRIMARIA'?'EPC':t.tipo==='BASICA'?'EB':'Secundária'; }), datasets:[{ data:tipos.map(function(t){ return t.totalEscolas; }), backgroundColor:['#4A90D9','#009A44','#FCB017'], borderWidth:0 }] }, options:{ responsive:true, maintainAspectRatio:false, plugins:{ legend:{ position:'bottom', labels:{ color:'#8B9DBF', font:{ family:'IBM Plex Mono', size:10 }, boxWidth:10 } } } } });
  },100);
}

// ======= ESCOLAS =======
async function escolas() {
  document.getElementById('page-content').innerHTML = loading();
  var data = await api('/escolas?limit=50');
  if (!data) { document.getElementById('page-content').innerHTML = erro(); return; }
  document.getElementById('page-content').innerHTML =
    '<div class="section-title">Gestão de Escolas</div>' +
    '<p class="section-desc">Total de '+fmt(data.meta?data.meta.total:0)+' escolas registadas.</p>' +
    '<div class="search-bar"><input class="search-input" id="esc-q" placeholder="Pesquisar escola..." oninput="pesqEscolas(this.value)"/>' +
    '<select id="esc-tipo" style="background:var(--bg-card);border:1px solid var(--border);border-radius:6px;color:var(--text-secondary);padding:10px 12px;font-size:13px;" onchange="pesqEscolas(document.getElementById(\'esc-q\').value)"><option value="">Todos os Tipos</option><option value="PRIMARIA">Primária (EPC)</option><option value="BASICA">Básica (EB)</option><option value="SECUNDARIA">Secundária</option></select>' +
    '<button class="btn btn-primary" onclick="showModalEscolaCompleto()">+ Nova Escola</button></div>' +
    '<div class="table-card"><div class="table-header"><span class="table-title">Lista de Escolas</span><span id="esc-count" style="font-family:var(--font-mono);font-size:12px;color:var(--text-muted)">'+(data.data?data.data.length:0)+' resultados</span></div>' +
    '<table class="data-table"><thead><tr><th>Nome</th><th>Província</th><th>Tipo</th><th>Alunos</th><th>Professores</th><th>Acções</th></tr></thead><tbody id="esc-body">'+rowsEscolas(data.data||[])+'</tbody></table></div>';
}

function rowsEscolas(list) {
  if (!list.length) return '<tr><td colspan="6" style="text-align:center;color:var(--text-muted)">Nenhuma escola encontrada</td></tr>';
  return list.map(function(e){
    var bc = e.tipo==='PRIMARIA'?'badge-blue':e.tipo==='BASICA'?'badge-green':'badge-gold';
    var bn = e.tipo==='PRIMARIA'?'EPC':e.tipo==='BASICA'?'EB':'Secundária';
    return '<tr><td><strong style="color:var(--text-primary)">'+e.nome+'</strong><br><span style="font-size:11px;color:var(--text-muted)">'+(e.distrito?e.distrito.nome:'')+'</span></td><td>'+(e.provincia?e.provincia.nome:'')+'</td><td><span class="badge '+bc+'">'+bn+'</span></td><td>'+fmt(e._count?e._count.alunos:0)+'</td><td>'+fmt(e._count?e._count.professores:0)+'</td><td><button class="btn btn-outline btn-sm" onclick="verEscola('+e.id+')">Ver</button></td></tr>';
  }).join('');
}

async function pesqEscolas(q) {
  var tipo = document.getElementById('esc-tipo')?document.getElementById('esc-tipo').value:'';
  var d = await api('/escolas?limit=100'+(q?'&search='+encodeURIComponent(q):'')+(tipo?'&tipo='+tipo:''));
  if (d&&d.data){ document.getElementById('esc-body').innerHTML=rowsEscolas(d.data); document.getElementById('esc-count').textContent=d.data.length+' resultados'; }
}

async function verEscola(id) {
  var e = await api('/escolas/'+id);
  if (e) alert('Escola: '+e.nome+'\nTipo: '+e.tipo+'\nAlunos: '+(e._count?e._count.alunos:'N/D')+'\nProfessores: '+(e._count?e._count.professores:'N/D'));
}

function showModalEscola() {
  var o = document.createElement('div');
  o.className='modal-overlay';
  o.innerHTML='<div class="modal"><div class="modal-title">Registar Nova Escola</div><div class="modal-grid"><div class="form-group"><label>Código</label><input type="text" id="m-cod" placeholder="Ex: ZB-010"/></div><div class="form-group"><label>Tipo</label><select id="m-tipo"><option value="PRIMARIA">Primária (EPC)</option><option value="BASICA">Básica (EB)</option><option value="SECUNDARIA">Secundária</option></select></div><div class="form-group" style="grid-column:1/-1"><label>Nome</label><input type="text" id="m-nome" placeholder="Nome completo da escola"/></div><div class="form-group"><label>ID Província (1-11)</label><input type="number" id="m-prov" placeholder="1" min="1" max="11"/></div><div class="form-group"><label>ID Distrito</label><input type="number" id="m-dist" placeholder="1" min="1"/></div></div><div class="modal-footer"><button class="btn btn-outline" onclick="this.closest(\'.modal-overlay\').remove()">Cancelar</button><button class="btn btn-primary" onclick="criarEscola()">Guardar</button></div></div>';
  o.addEventListener('click',function(ev){ if(ev.target===o) o.remove(); });
  document.body.appendChild(o);
}

async function criarEscola() {
  var body={ codigo:document.getElementById('m-cod').value, nome:document.getElementById('m-nome').value, tipo:document.getElementById('m-tipo').value, provinciaId:parseInt(document.getElementById('m-prov').value), distritoId:parseInt(document.getElementById('m-dist').value) };
  var r = await api('/escolas',{ method:'POST', body:JSON.stringify(body) });
  if (r&&r.id){ document.querySelector('.modal-overlay').remove(); alert('Escola criada com sucesso!'); escolas(); }
  else alert('Erro: '+(r&&r.error?r.error:'desconhecido'));
}

// ======= ALUNOS =======
async function alunos() {
  document.getElementById('page-content').innerHTML = loading();
  var data = await api('/alunos?limit=50');
  if (!data) { document.getElementById('page-content').innerHTML = erro(); return; }
  document.getElementById('page-content').innerHTML =
    '<div class="section-title">Gestão de Alunos</div><p class="section-desc">Total de '+fmt(data.meta?data.meta.total:0)+' alunos.</p>' +
    '<div class="search-bar"><input class="search-input" id="al-q" placeholder="Pesquisar aluno..." oninput="pesqAlunos(this.value)"/>' +
    '<select id="al-st" style="background:var(--bg-card);border:1px solid var(--border);border-radius:6px;color:var(--text-secondary);padding:10px 12px;font-size:13px;" onchange="pesqAlunos(document.getElementById(\'al-q\').value)"><option value="">Todos</option><option value="ATIVO">Activo</option><option value="EVADIDO">Evadido</option><option value="TRANSFERIDO">Transferido</option></select>' +
    '<button class="btn btn-primary" onclick="alert(\'Formulário de nova matrícula\')">+ Nova Matrícula</button></div>' +
    '<div class="table-card"><div class="table-header"><span class="table-title">Registo de Alunos</span><span style="font-family:var(--font-mono);font-size:12px;color:var(--text-muted)">'+fmt(data.meta?data.meta.total:0)+' total</span></div>' +
    '<table class="data-table"><thead><tr><th>Nome</th><th>Escola</th><th>Turma</th><th>Género</th><th>Estado</th><th>Acções</th></tr></thead><tbody id="al-body">'+rowsAlunos(data.data||[])+'</tbody></table></div>';
}

function rowsAlunos(list) {
  if (!list.length) return '<tr><td colspan="6" style="text-align:center;color:var(--text-muted)">Nenhum aluno encontrado</td></tr>';
  return list.map(function(a){
    var turma = a.matriculas&&a.matriculas.length?a.matriculas[0].turma.nome:'—';
    var sc = a.status==='ATIVO'?'badge-green':a.status==='EVADIDO'?'badge-red':'badge-blue';
    return '<tr><td><strong style="color:var(--text-primary)">'+a.nome+' '+a.apelido+'</strong></td><td style="font-size:12px">'+(a.escola?a.escola.nome:'—')+'</td><td>'+turma+'</td><td><span class="badge '+(a.genero==='F'?'badge-gold':'badge-blue')+'">'+(a.genero==='F'?'Feminino':'Masculino')+'</span></td><td><span class="badge '+sc+'">'+a.status+'</span></td><td><button class="btn btn-outline btn-sm" onclick="verBoletim('+a.id+')">Boletim</button></td></tr>';
  }).join('');
}

async function pesqAlunos(q) {
  var st=document.getElementById('al-st')?document.getElementById('al-st').value:'';
  var d=await api('/alunos?limit=100'+(q?'&search='+encodeURIComponent(q):'')+(st?'&status='+st:''));
  if(d&&d.data) document.getElementById('al-body').innerHTML=rowsAlunos(d.data);
}

async function verBoletim(id) {
  var b=await api('/alunos/'+id+'/boletim');
  if(!b) return;
  var msg='Boletim: '+b.aluno.nome+' ('+b.anoLetivo+')\n\n';
  if(b.disciplinas&&b.disciplinas.length) b.disciplinas.forEach(function(d){ msg+=d.disciplina+': '+d.media.toFixed(1)+' ('+(d.aprovado?'APROVADO':'REPROVADO')+')\n'; });
  msg+='\nMédia Geral: '+b.mediaGeral+'\nResultado: '+(b.aprovado?'APROVADO':'REPROVADO');
  alert(msg);
}

// ======= PROFESSORES =======
async function professores() {
  document.getElementById('page-content').innerHTML = loading();
  var data = await api('/professores?limit=50');
  if (!data) { document.getElementById('page-content').innerHTML = erro(); return; }
  document.getElementById('page-content').innerHTML =
    '<div class="section-title">Gestão de Professores</div><p class="section-desc">Total de '+fmt(data.meta?data.meta.total:0)+' professores.</p>' +
    '<div class="search-bar"><input class="search-input" id="pr-q" placeholder="Pesquisar professor..." oninput="pesqProfs(this.value)"/><button class="btn btn-primary" onclick="alert(\'Formulário de novo professor\')">+ Novo Professor</button></div>' +
    '<div class="table-card"><div class="table-header"><span class="table-title">Lista de Professores</span></div>' +
    '<table class="data-table"><thead><tr><th>Nome</th><th>Escola</th><th>Habilitação</th><th>Estado</th></tr></thead><tbody id="pr-body">'+rowsProfs(data.data||[])+'</tbody></table></div>';
}

function rowsProfs(list) {
  if (!list.length) return '<tr><td colspan="4" style="text-align:center;color:var(--text-muted)">Nenhum professor encontrado</td></tr>';
  return list.map(function(p){
    var escola=p.escolas&&p.escolas.length?p.escolas[0].escola.nome:'—';
    var hc=p.habilitacao==='MESTRADO'||p.habilitacao==='DOUTORAMENTO'?'badge-gold':p.habilitacao==='LICENCIATURA'?'badge-green':'badge-blue';
    return '<tr><td><strong style="color:var(--text-primary)">'+p.nome+' '+p.apelido+'</strong></td><td style="font-size:12px">'+escola+'</td><td><span class="badge '+hc+'">'+p.habilitacao+'</span></td><td><span class="badge '+(p.ativo?'badge-green':'badge-red')+'">'+(p.ativo?'Activo':'Inactivo')+'</span></td></tr>';
  }).join('');
}

async function pesqProfs(q) {
  var d=await api('/professores?limit=100'+(q?'&search='+encodeURIComponent(q):''));
  if(d&&d.data) document.getElementById('pr-body').innerHTML=rowsProfs(d.data);
}

// ======= NOTAS =======
async function notas() {
  document.getElementById('page-content').innerHTML = loading();
  var data = await api('/notas?limit=50');
  if (!data) { document.getElementById('page-content').innerHTML = erro(); return; }
  document.getElementById('page-content').innerHTML =
    '<div class="section-title">Notas e Avaliações</div><p class="section-desc">Lançamento e consulta de notas.</p>' +
    '<div class="table-card"><div class="table-header"><span class="table-title">Notas Lançadas</span><button class="btn btn-gold btn-sm" onclick="alert(\'Lançamento em lote\')">Lançar em Lote</button></div>' +
    '<table class="data-table"><thead><tr><th>Aluno</th><th>Disciplina</th><th>Trimestre</th><th>Nota</th><th>Resultado</th></tr></thead><tbody>' +
    (data.length?data.map(function(n){
      return '<tr><td><strong style="color:var(--text-primary)">'+(n.aluno?n.aluno.nome+' '+n.aluno.apelido:'—')+'</strong></td><td>'+(n.disciplina?n.disciplina.nome:'—')+'</td><td style="font-family:var(--font-mono)">'+n.trimestre+'º Trim.</td><td style="font-family:var(--font-mono);'+(n.valor<10?'color:var(--accent-red)':'')+'">'+n.valor+'</td><td><span class="badge '+(n.valor>=10?'badge-green':'badge-red')+'">'+(n.valor>=10?'Aprovado':'Reprovado')+'</span></td></tr>';
    }).join(''):'<tr><td colspan="5" style="text-align:center;color:var(--text-muted)">Nenhuma nota lançada</td></tr>') +
    '</tbody></table></div>';
}

// ======= MATRÍCULAS =======
async function matriculas() {
  document.getElementById('page-content').innerHTML = loading();
  var gen  = await api('/estatisticas/genero');
  var prov = await api('/estatisticas/matriculas-por-provincia');
  if (!gen) { document.getElementById('page-content').innerHTML = erro(); return; }
  document.getElementById('page-content').innerHTML =
    '<div class="section-title">Estatísticas de Matrículas</div><p class="section-desc">Análise por género e região.</p>' +
    '<div class="kpi-grid" style="grid-template-columns:repeat(3,1fr)">'+kpi('green','Total',fmtK(gen.total),'Alunos','')+kpi('blue','Masculino',fmtK(gen.masculino),gen.pctMasculino+'%','')+kpi('gold','Feminino',fmtK(gen.feminino),gen.pctFeminino+'%','')+'</div>' +
    '<div class="charts-row"><div class="chart-card"><div class="chart-header"><div><div class="chart-title">Por Género</div></div></div><div class="chart-container"><canvas id="ch-gen"></canvas></div></div><div class="chart-card"><div class="chart-header"><div><div class="chart-title">Por Província</div></div></div><div class="chart-container"><canvas id="ch-prv"></canvas></div></div></div>';

  setTimeout(function(){
    renderChart('ch-gen',{ type:'doughnut', data:{ labels:['Masculino','Feminino'], datasets:[{ data:[gen.masculino,gen.feminino], backgroundColor:['#4A90D9','#FCB017'], borderWidth:0 }] }, options:{ responsive:true, maintainAspectRatio:false, plugins:{ legend:{ position:'bottom', labels:{ color:'#8B9DBF', font:{ family:'IBM Plex Mono', size:10 }, boxWidth:10 } } } } });
    if(prov){ var s=prov.sort(function(a,b){return b.totalAlunos-a.totalAlunos;}); renderChart('ch-prv',{ type:'bar', data:{ labels:s.map(function(p){return p.nome;}), datasets:[{ label:'Alunos', data:s.map(function(p){return p.totalAlunos;}), backgroundColor:'rgba(0,154,68,0.6)', borderRadius:3 }] }, options:{ responsive:true, maintainAspectRatio:false, indexAxis:'y', plugins:{ legend:{ display:false } }, scales:{ x:{ ticks:{ color:'#4A5A7A', font:{ family:'IBM Plex Mono', size:9 } }, grid:{ color:'rgba(255,255,255,0.04)' } }, y:{ ticks:{ color:'#8B9DBF', font:{ family:'IBM Plex Mono', size:9 } }, grid:{ display:false } } } } }); }
  },100);
}

// ======= DESEMPENHO =======
async function desempenho() {
  document.getElementById('page-content').innerHTML = loading();
  var rel = await api('/relatorios/desempenho');
  if (!rel) { document.getElementById('page-content').innerHTML = erro(); return; }
  document.getElementById('page-content').innerHTML =
    '<div class="section-title">Desempenho Acadêmico</div><p class="section-desc">Médias por disciplina.</p>' +
    '<div class="kpi-grid" style="grid-template-columns:repeat(2,1fr)">'+kpi('green','Média Geral',rel.mediaGeral||'N/D','Escala 0–20','')+kpi('blue','Disciplinas',rel.porDisciplina?rel.porDisciplina.length:0,'Avaliadas','')+'</div>' +
    '<div class="chart-card" style="margin-bottom:24px"><div class="chart-header"><div><div class="chart-title">Média por Disciplina</div></div></div><div class="chart-container" style="height:280px"><canvas id="ch-dsc"></canvas></div></div>' +
    '<div class="table-card"><div class="table-header"><span class="table-title">Detalhe</span><button class="btn btn-gold btn-sm" onclick="exportPDF()">Relatório PDF</button></div>' +
    '<table class="data-table"><thead><tr><th>Disciplina</th><th>Média</th><th>Total Notas</th></tr></thead><tbody>' +
    (rel.porDisciplina&&rel.porDisciplina.length?rel.porDisciplina.map(function(d){ return '<tr><td><strong style="color:var(--text-primary)">'+d.disciplina+'</strong></td><td style="font-family:var(--font-mono);color:'+(parseFloat(d.media)>=10?'var(--accent)':'var(--accent-red)')+'">'+( d.media||'N/D')+'</td><td style="font-family:var(--font-mono)">'+d.totalNotas+'</td></tr>'; }).join(''):'<tr><td colspan="3" style="text-align:center;color:var(--text-muted)">Sem dados</td></tr>') +
    '</tbody></table></div>';

  setTimeout(function(){
    if(!rel.porDisciplina||!rel.porDisciplina.length) return;
    renderChart('ch-dsc',{ type:'bar', data:{ labels:rel.porDisciplina.map(function(d){return d.disciplina;}), datasets:[{ data:rel.porDisciplina.map(function(d){return parseFloat(d.media)||0;}), backgroundColor:rel.porDisciplina.map(function(d){return parseFloat(d.media)>=10?'rgba(0,154,68,0.7)':'rgba(210,16,52,0.7)';}), borderRadius:4 }] }, options:{ responsive:true, maintainAspectRatio:false, plugins:{ legend:{ display:false } }, scales:{ x:{ ticks:{ color:'#4A5A7A', font:{ family:'IBM Plex Mono', size:9 } }, grid:{ color:'rgba(255,255,255,0.04)' } }, y:{ min:0, max:20, ticks:{ color:'#4A5A7A', font:{ family:'IBM Plex Mono', size:9 } }, grid:{ color:'rgba(255,255,255,0.06)' } } } } });
  },100);
}

// ======= EVASÃO =======
async function evasao() {
  document.getElementById('page-content').innerHTML = loading();
  var rel = await api('/relatorios/evasao');
  if (!rel) { document.getElementById('page-content').innerHTML = erro(); return; }
  document.getElementById('page-content').innerHTML =
    '<div class="section-title">Evasão Escolar</div><p class="section-desc">Abandono escolar por região.</p>' +
    '<div class="kpi-grid" style="grid-template-columns:repeat(3,1fr)">'+kpi('red','Taxa Nacional',rel.taxaNacional+'%','Média','')+kpi('red','Evadidos',fmtK(rel.totalEvadidos),'Total','')+kpi('blue','Base',fmtK(rel.totalAlunos),'Total alunos','')+'</div>' +
    '<div class="table-card"><div class="table-header"><span class="table-title">Por Província</span><button class="btn btn-gold btn-sm" onclick="exportPDF()">Relatório PDF</button></div>' +
    '<table class="data-table"><thead><tr><th>Província</th><th>Total</th><th>Evadidos</th><th>Taxa</th><th>Situação</th></tr></thead><tbody>' +
    (rel.porProvincia&&rel.porProvincia.length?rel.porProvincia.sort(function(a,b){return parseFloat(b.taxa)-parseFloat(a.taxa);}).map(function(p){
      var t=parseFloat(p.taxa);
      return '<tr><td><strong style="color:var(--text-primary)">'+p.provincia+'</strong></td><td style="font-family:var(--font-mono)">'+fmtK(p.totalAlunos)+'</td><td style="font-family:var(--font-mono)">'+fmtK(p.evadidos)+'</td><td style="font-family:var(--font-mono)">'+p.taxa+'%</td><td><span class="badge '+(t<=7?'badge-green':t<=10?'badge-gold':'badge-red')+'">'+(t<=7?'Controlado':t<=10?'Atenção':'Crítico')+'</span></td></tr>';
    }).join(''):'<tr><td colspan="5" style="text-align:center;color:var(--text-muted)">Sem dados</td></tr>') +
    '</tbody></table></div>';
}

// ======= RH =======
async function rh() {
  document.getElementById('page-content').innerHTML = loading();
  var ratio = await api('/estatisticas/ratio-professor-aluno');
  if (!ratio) { document.getElementById('page-content').innerHTML = erro(); return; }
  document.getElementById('page-content').innerHTML =
    '<div class="section-title">Recursos Humanos</div><p class="section-desc">Ratio professor/aluno por província.</p>' +
    '<div class="chart-card" style="margin-bottom:24px"><div class="chart-header"><div><div class="chart-title">Ratio por Província</div><div class="chart-subtitle">Linha amarela = meta 1:35</div></div></div><div class="chart-container" style="height:280px"><canvas id="ch-rat"></canvas></div></div>' +
    '<div class="table-card"><div class="table-header"><span class="table-title">Detalhe</span></div>' +
    '<table class="data-table"><thead><tr><th>Província</th><th>Professores</th><th>Alunos</th><th>Ratio</th><th>Status</th></tr></thead><tbody>' +
    ratio.map(function(r){
      var sc=r.status==='ADEQUADO'?'badge-green':r.status==='EXCEDENTE'?'badge-blue':r.status==='ATENCAO'?'badge-gold':'badge-red';
      return '<tr><td><strong style="color:var(--text-primary)">'+r.provincia+'</strong></td><td style="font-family:var(--font-mono)">'+fmtK(r.totalProfessores)+'</td><td style="font-family:var(--font-mono)">'+fmtK(r.totalAlunos)+'</td><td style="font-family:var(--font-mono)">1:'+(r.ratio||'—')+'</td><td><span class="badge '+sc+'">'+(r.status||'N/D')+'</span></td></tr>';
    }).join('') +
    '</tbody></table></div>';

  setTimeout(function(){
    var lbl=ratio.map(function(r){return r.provincia;});
    var vals=ratio.map(function(r){return r.ratio||0;});
    renderChart('ch-rat',{ type:'bar', data:{ labels:lbl, datasets:[ { label:'Ratio real', data:vals, backgroundColor:vals.map(function(v){return v<=35?'rgba(0,154,68,0.7)':v<=40?'rgba(252,176,23,0.7)':'rgba(210,16,52,0.7)';}), borderRadius:3 }, { label:'Meta (35)', data:Array(lbl.length).fill(35), type:'line', borderColor:'#FCB017', borderDash:[4,4], borderWidth:1.5, pointRadius:0 } ] }, options:{ responsive:true, maintainAspectRatio:false, indexAxis:'y', plugins:{ legend:{ labels:{ color:'#8B9DBF', font:{ family:'IBM Plex Mono', size:10 }, boxWidth:10 } } }, scales:{ x:{ ticks:{ color:'#4A5A7A', font:{ family:'IBM Plex Mono', size:9 } }, grid:{ color:'rgba(255,255,255,0.04)' } }, y:{ ticks:{ color:'#8B9DBF', font:{ family:'IBM Plex Mono', size:9 } }, grid:{ display:false } } } } });
  },100);
}

// ======= RELATÓRIOS =======
function relatorios() {
  document.getElementById('page-content').innerHTML =
    '<div class="section-title">Central de Relatórios</div><p class="section-desc">Geração e exportação de relatórios oficiais.</p>' +
    '<div class="two-col"><div>' +
    relCard('Matrículas Anual','Total por província e género','/relatorios/matriculas-anual') +
    relCard('Desempenho Académico','Médias por disciplina','/relatorios/desempenho') +
    relCard('Evasão Escolar','Abandono por região','/relatorios/evasao') +
    relCard('Ratio Prof/Aluno','Por província','/estatisticas/ratio-professor-aluno') +
    '</div><div>' +
    '<div style="background:var(--bg-card2);border:1px solid var(--border-accent);border-radius:var(--radius);padding:20px">' +
    '<div style="font-size:12px;color:var(--accent);font-weight:700;margin-bottom:12px">URL da API</div>' +
    '<code style="font-family:var(--font-mono);font-size:11px;color:var(--text-secondary);word-break:break-all">'+API_URL+'</code>' +
    '<div style="margin-top:16px;font-size:11px;color:var(--text-muted);margin-bottom:8px">Endpoints:</div>' +
    ['/escolas','/alunos','/professores','/notas','/estatisticas/dashboard','/relatorios/desempenho'].map(function(e){ return '<div style="font-family:var(--font-mono);font-size:10px;color:var(--text-secondary);margin-top:4px">GET '+e+'</div>'; }).join('') +
    '</div></div></div>';
}

function relCard(nome, desc, endpoint) {
  return '<div style="background:var(--bg-card);border:1px solid var(--border);border-radius:var(--radius);padding:16px;margin-bottom:12px;display:flex;align-items:center;gap:16px"><div style="flex:1"><div style="font-size:14px;color:var(--text-primary);font-weight:600">'+nome+'</div><div style="font-size:12px;color:var(--text-muted);margin-top:2px">'+desc+'</div></div><div style="display:flex;gap:8px"><button class="btn btn-outline btn-sm" onclick="prevRel(\''+endpoint+'\')">Ver JSON</button><button class="btn btn-gold btn-sm" onclick="exportPDF(\''+nome+'\')">PDF</button></div></div>';
}

async function prevRel(ep) {
  var d = await api(ep);
  if (d) alert(JSON.stringify(d,null,2).substring(0,600)+'\n[...truncado]');
}

function exportPDF(nome) {
  alert('Exportar PDF: "'+(nome||'Relatório')+'"\n\nEm produção geraria um PDF oficial com cabeçalho do MEC.');
}

setDate();
setInterval(setDate, 60000);

// ============================================================
// FORMULÁRIOS REAIS — REGISTAR ESCOLA
// ============================================================
function showModalEscolaCompleto() {
  var o = document.createElement('div');
  o.className = 'modal-overlay';
  o.innerHTML = `
    <div class="modal" style="max-width:680px">
      <div class="modal-title">Registar Nova Escola</div>
      <div class="modal-grid">
        <div class="form-group">
          <label>Código da Escola *</label>
          <input type="text" id="me-codigo" placeholder="Ex: ZB-010" maxlength="20"/>
        </div>
        <div class="form-group">
          <label>Tipo de Escola *</label>
          <select id="me-tipo">
            <option value="PRIMARIA">Primária (EPC)</option>
            <option value="BASICA">Básica (EB)</option>
            <option value="SECUNDARIA">Secundária</option>
          </select>
        </div>
        <div class="form-group" style="grid-column:1/-1">
          <label>Nome Completo da Escola *</label>
          <input type="text" id="me-nome" placeholder="Ex: Escola Primária Completa 25 de Setembro"/>
        </div>
        <div class="form-group">
          <label>Província *</label>
          <select id="me-prov" onchange="carregarDistritos(this.value)">
            <option value="">-- Seleccione --</option>
            <option value="1">Maputo Cidade</option>
            <option value="2">Maputo Província</option>
            <option value="3">Gaza</option>
            <option value="4">Inhambane</option>
            <option value="5">Sofala</option>
            <option value="6">Manica</option>
            <option value="7">Tete</option>
            <option value="8">Zambézia</option>
            <option value="9">Nampula</option>
            <option value="10">Niassa</option>
            <option value="11">Cabo Delgado</option>
          </select>
        </div>
        <div class="form-group">
          <label>Distrito *</label>
          <select id="me-dist"><option value="">-- Seleccione Província primeiro --</option></select>
        </div>
        <div class="form-group">
          <label>Localidade / Bairro</label>
          <input type="text" id="me-local" placeholder="Ex: Bairro Central"/>
        </div>
        <div class="form-group">
          <label>Endereço</label>
          <input type="text" id="me-end" placeholder="Ex: Av. Eduardo Mondlane, nº 123"/>
        </div>
        <div class="form-group">
          <label>Telefone (+258)</label>
          <input type="tel" id="me-tel" placeholder="Ex: +258 21 000 000" maxlength="20"/>
        </div>
        <div class="form-group">
          <label>Email</label>
          <input type="email" id="me-email" placeholder="escola@mec.gov.mz"/>
        </div>
        <div class="form-group">
          <label>Latitude (GPS)</label>
          <input type="number" id="me-lat" placeholder="Ex: -25.9692" step="0.0001"/>
        </div>
        <div class="form-group">
          <label>Longitude (GPS)</label>
          <input type="number" id="me-lng" placeholder="Ex: 32.5732" step="0.0001"/>
        </div>
      </div>
      <div id="me-erro" style="color:var(--accent-red);font-size:12px;margin-top:8px;display:none"></div>
      <div class="modal-footer">
        <button class="btn btn-outline" onclick="this.closest('.modal-overlay').remove()">Cancelar</button>
        <button class="btn btn-primary" id="me-btn" onclick="submeterEscola()">Guardar Escola</button>
      </div>
    </div>`;
  o.addEventListener('click', function(ev){ if(ev.target===o) o.remove(); });
  document.body.appendChild(o);
}

async function carregarDistritos(provId) {
  if (!provId) return;
  var sel = document.getElementById('me-dist');
  sel.innerHTML = '<option>A carregar...</option>';
  var data = await api('/escolas?provinciaId=' + provId + '&limit=1');
  // Buscar distritos via escolas existentes nessa província
  var provData = await api('/estatisticas/matriculas-por-provincia');
  // Como não temos endpoint de distritos, usar lista fixa por província
  var distritos = {
    1:['KaMpfumu','KaMaxakeni','KaMavota','KaMubukwana','KaNyaka'],
    2:['Matola','Boane','Magude','Manhiça','Marracuene','Matutuíne','Moamba','Namaacha'],
    3:['Xai-Xai','Bilene','Chibuto','Chicualacuala','Chigubo','Chokwé','Guijá','Limpopo','Mabalane','Mandlakazi','Massangena','Massingir'],
    4:['Inhambane','Funhalouro','Govuro','Homoíne','Inharrime','Inhassoro','Jangamo','Mabote','Massinga','Maxixe','Morrumbene','Panda','Vilankulo','Zavala'],
    5:['Beira','Búzi','Chibabava','Chimanimani','Dondo','Gorongosa','Machanga','Maringué','Muanza','Nhamatanda'],
    6:['Chimoio','Báruè','Gondola','Guro','Machaze','Macossa','Mossurize','Sussundenga','Tambara','Vanduzi'],
    7:['Tete','Angónia','Cahora-Bassa','Changara','Chifunde','Chiuta','Dôa','Macanga','Marávia','Moatize','Mutarara','Tsangano','Zumbo'],
    8:['Quelimane','Alto Molócuè','Chinde','Gilé','Guruè','Ile','Inhassunge','Luabo','Lugela','Maganja da Costa','Milange','Mocuba','Mopeia','Morrumbala','Namacurra','Namarrói','Nicoadala','Pebane'],
    9:['Nampula','Angoche','Eráti','Lalaua','Larde','Liúpo','Malema','Meconta','Mecubúri','Memba','Mogincual','Mogovolas','Moma','Monapo','Mossuril','Murrupula','Nacala','Nacala-a-Velha','Nacarôa','Rapale','Ribáuè'],
    10:['Lichinga','Chimbunila','Cuamba','Lago','Majune','Mandimba','Marrupa','Maúa','Mavago','Mecanhelas','Mecula','Metarica','Muembe','Ngauma','Nipepe','Sanga'],
    11:['Pemba','Ancuabe','Balama','Chiúre','Ibo','Macomia','Mecúfi','Meluco','Metuge','Mocímboa da Praia','Montepuez','Mueda','Muidumbe','Namuno','Nangade','Palma','Quissanga']
  };
  var lista = distritos[parseInt(provId)] || [];
  sel.innerHTML = '<option value="">-- Seleccione Distrito --</option>' +
    lista.map(function(d,i){ return '<option value="'+(parseInt(provId)*100+i+1)+'">'+d+'</option>'; }).join('');
}

async function submeterEscola() {
  var erroEl = document.getElementById('me-erro');
  erroEl.style.display = 'none';

  var codigo = document.getElementById('me-codigo').value.trim();
  var nome   = document.getElementById('me-nome').value.trim();
  var tipo   = document.getElementById('me-tipo').value;
  var provId = document.getElementById('me-prov').value;
  var distId = document.getElementById('me-dist').value;

  if (!codigo) { erroEl.textContent='Código obrigatório'; erroEl.style.display='block'; return; }
  if (!nome)   { erroEl.textContent='Nome obrigatório';   erroEl.style.display='block'; return; }
  if (!provId) { erroEl.textContent='Seleccione a Província'; erroEl.style.display='block'; return; }
  if (!distId) { erroEl.textContent='Seleccione o Distrito';  erroEl.style.display='block'; return; }

  var btn = document.getElementById('me-btn');
  btn.textContent = 'A guardar...'; btn.disabled = true;

  var body = {
    codigo: codigo, nome: nome, tipo: tipo,
    provinciaId: parseInt(provId),
    distritoId:  parseInt(distId),
    localidade:  document.getElementById('me-local').value.trim() || null,
    endereco:    document.getElementById('me-end').value.trim()   || null,
    telefone:    document.getElementById('me-tel').value.trim()   || null,
    email:       document.getElementById('me-email').value.trim() || null,
    latitude:    parseFloat(document.getElementById('me-lat').value)  || null,
    longitude:   parseFloat(document.getElementById('me-lng').value)  || null,
  };

  var r = await api('/escolas', { method:'POST', body: JSON.stringify(body) });
  if (r && r.id) {
    document.querySelector('.modal-overlay').remove();
    mostrarSucesso('Escola "' + r.nome + '" registada com sucesso!');
    escolas();
  } else {
    erroEl.textContent = r && r.error ? r.error : 'Erro ao guardar. Verifique os dados.';
    erroEl.style.display = 'block';
    btn.textContent = 'Guardar Escola'; btn.disabled = false;
  }
}

// ============================================================
// FORMULÁRIO — REGISTAR ALUNO
// ============================================================
function showModalAlunoCompleto() {
  var o = document.createElement('div');
  o.className = 'modal-overlay';
  o.innerHTML = `
    <div class="modal" style="max-width:680px">
      <div class="modal-title">Registar Novo Aluno / Nova Matrícula</div>
      <div class="modal-grid">
        <div class="form-group">
          <label>Nome *</label>
          <input type="text" id="ma-nome" placeholder="Ex: Ana Beatriz"/>
        </div>
        <div class="form-group">
          <label>Apelido *</label>
          <input type="text" id="ma-apelido" placeholder="Ex: Machava"/>
        </div>
        <div class="form-group">
          <label>Nº BI / Cédula Pessoal</label>
          <input type="text" id="ma-bi" placeholder="Ex: 123456789MZ" maxlength="20"/>
          <small style="color:var(--text-muted);font-size:10px">Formato: dígitos + MZ (ex: 123456789MZ)</small>
        </div>
        <div class="form-group">
          <label>Data de Nascimento *</label>
          <input type="date" id="ma-nasc" max="${new Date().toISOString().split('T')[0]}"/>
        </div>
        <div class="form-group">
          <label>Género *</label>
          <select id="ma-gen">
            <option value="M">Masculino</option>
            <option value="F">Feminino</option>
          </select>
        </div>
        <div class="form-group">
          <label>ID da Escola *</label>
          <input type="number" id="ma-escola" placeholder="Nº da escola no sistema" min="1"/>
          <small style="color:var(--text-muted);font-size:10px">Ver na lista de escolas</small>
        </div>
        <div class="form-group">
          <label>ID da Turma (opcional)</label>
          <input type="number" id="ma-turma" placeholder="Para matricular já numa turma" min="1"/>
        </div>
        <div class="form-group">
          <label>Ano Lectivo *</label>
          <input type="number" id="ma-ano" value="${new Date().getFullYear()}" min="2000" max="2099"/>
        </div>
      </div>
      <div id="ma-erro" style="color:var(--accent-red);font-size:12px;margin-top:8px;display:none"></div>
      <div class="modal-footer">
        <button class="btn btn-outline" onclick="this.closest('.modal-overlay').remove()">Cancelar</button>
        <button class="btn btn-primary" id="ma-btn" onclick="submeterAluno()">Guardar Aluno</button>
      </div>
    </div>`;
  o.addEventListener('click', function(ev){ if(ev.target===o) o.remove(); });
  document.body.appendChild(o);
}

async function submeterAluno() {
  var erroEl = document.getElementById('ma-erro');
  erroEl.style.display = 'none';

  var nome    = document.getElementById('ma-nome').value.trim();
  var apelido = document.getElementById('ma-apelido').value.trim();
  var nasc    = document.getElementById('ma-nasc').value;
  var gen     = document.getElementById('ma-gen').value;
  var escola  = document.getElementById('ma-escola').value;
  var bi      = document.getElementById('ma-bi').value.trim();

  if (!nome)   { erroEl.textContent='Nome obrigatório';      erroEl.style.display='block'; return; }
  if (!apelido){ erroEl.textContent='Apelido obrigatório';   erroEl.style.display='block'; return; }
  if (!nasc)   { erroEl.textContent='Data de nascimento obrigatória'; erroEl.style.display='block'; return; }
  if (!escola) { erroEl.textContent='ID da escola obrigatório'; erroEl.style.display='block'; return; }

  // Validar BI moçambicano (opcional mas se preenchido)
  if (bi && !/^[0-9]{9}[A-Z]{1,2}$/.test(bi)) {
    erroEl.textContent = 'Formato de BI inválido. Use: 9 dígitos + letras (ex: 123456789MZ)';
    erroEl.style.display='block'; return;
  }

  var btn = document.getElementById('ma-btn');
  btn.textContent = 'A guardar...'; btn.disabled = true;

  var body = {
    nome: nome, apelido: apelido,
    dataNascimento: nasc,
    genero: gen,
    escolaId: parseInt(escola),
    numeroBI: bi || null,
  };

  var r = await api('/alunos', { method:'POST', body: JSON.stringify(body) });
  if (r && r.id) {
    // Se tem turma, matricular também
    var turmaId = document.getElementById('ma-turma').value;
    var anoLetivo = parseInt(document.getElementById('ma-ano').value);
    if (turmaId) {
      await api('/matriculas', { method:'POST', body: JSON.stringify({ alunoId: r.id, turmaId: parseInt(turmaId), anoLetivo: anoLetivo }) });
    }
    document.querySelector('.modal-overlay').remove();
    mostrarSucesso('Aluno "' + r.nome + ' ' + r.apelido + '" registado com sucesso!');
    alunos();
  } else {
    erroEl.textContent = r && r.error ? r.error : 'Erro ao guardar.';
    erroEl.style.display = 'block';
    btn.textContent = 'Guardar Aluno'; btn.disabled = false;
  }
}

// ============================================================
// FORMULÁRIO — REGISTAR PROFESSOR
// ============================================================
function showModalProfessorCompleto() {
  var o = document.createElement('div');
  o.className = 'modal-overlay';
  o.innerHTML = `
    <div class="modal" style="max-width:700px">
      <div class="modal-title">Registar Novo Professor</div>
      <div class="modal-grid">
        <div class="form-group">
          <label>Nome *</label>
          <input type="text" id="mp-nome" placeholder="Ex: António"/>
        </div>
        <div class="form-group">
          <label>Apelido *</label>
          <input type="text" id="mp-apelido" placeholder="Ex: Mabunda"/>
        </div>
        <div class="form-group">
          <label>Nº de Funcionário (SIGEDAP) *</label>
          <input type="text" id="mp-func" placeholder="Ex: FUNC-1234" maxlength="20"/>
        </div>
        <div class="form-group">
          <label>Nº BI *</label>
          <input type="text" id="mp-bi" placeholder="Ex: 123456789MZ" maxlength="20"/>
          <small style="color:var(--text-muted);font-size:10px">Obrigatório para professores</small>
        </div>
        <div class="form-group">
          <label>NUIT (opcional)</label>
          <input type="text" id="mp-nuit" placeholder="Ex: 400123456" maxlength="9"/>
          <small style="color:var(--text-muted);font-size:10px">9 dígitos</small>
        </div>
        <div class="form-group">
          <label>Data de Nascimento *</label>
          <input type="date" id="mp-nasc"/>
        </div>
        <div class="form-group">
          <label>Género *</label>
          <select id="mp-gen">
            <option value="M">Masculino</option>
            <option value="F">Feminino</option>
          </select>
        </div>
        <div class="form-group">
          <label>Habilitações *</label>
          <select id="mp-hab">
            <option value="MEDIO">Médio</option>
            <option value="BACHAREL">Bacharelato</option>
            <option value="LICENCIATURA">Licenciatura</option>
            <option value="MESTRADO">Mestrado</option>
            <option value="DOUTORAMENTO">Doutoramento</option>
          </select>
        </div>
        <div class="form-group">
          <label>Certificado / Diploma</label>
          <input type="text" id="mp-cert" placeholder="Ex: CFPP Nampula, 2015"/>
          <small style="color:var(--text-muted);font-size:10px">Instituição e ano de conclusão</small>
        </div>
        <div class="form-group">
          <label>Email</label>
          <input type="email" id="mp-email" placeholder="professor@mec.gov.mz"/>
        </div>
        <div class="form-group">
          <label>Telefone (+258)</label>
          <input type="tel" id="mp-tel" placeholder="Ex: +258 84 000 0000"/>
        </div>
        <div class="form-group">
          <label>ID da Escola Actual</label>
          <input type="number" id="mp-escola" placeholder="Nº da escola" min="1"/>
        </div>
      </div>
      <div id="mp-erro" style="color:var(--accent-red);font-size:12px;margin-top:8px;display:none"></div>
      <div class="modal-footer">
        <button class="btn btn-outline" onclick="this.closest('.modal-overlay').remove()">Cancelar</button>
        <button class="btn btn-primary" id="mp-btn" onclick="submeterProfessor()">Guardar Professor</button>
      </div>
    </div>`;
  o.addEventListener('click', function(ev){ if(ev.target===o) o.remove(); });
  document.body.appendChild(o);
}

async function submeterProfessor() {
  var erroEl = document.getElementById('mp-erro');
  erroEl.style.display = 'none';

  var nome   = document.getElementById('mp-nome').value.trim();
  var apel   = document.getElementById('mp-apelido').value.trim();
  var func   = document.getElementById('mp-func').value.trim();
  var bi     = document.getElementById('mp-bi').value.trim();
  var nuit   = document.getElementById('mp-nuit').value.trim();
  var nasc   = document.getElementById('mp-nasc').value;
  var gen    = document.getElementById('mp-gen').value;
  var hab    = document.getElementById('mp-hab').value;
  var cert   = document.getElementById('mp-cert').value.trim();
  var email  = document.getElementById('mp-email').value.trim();
  var tel    = document.getElementById('mp-tel').value.trim();
  var escola = document.getElementById('mp-escola').value;

  if (!nome)  { erroEl.textContent='Nome obrigatório';              erroEl.style.display='block'; return; }
  if (!apel)  { erroEl.textContent='Apelido obrigatório';           erroEl.style.display='block'; return; }
  if (!func)  { erroEl.textContent='Nº de Funcionário obrigatório'; erroEl.style.display='block'; return; }
  if (!bi)    { erroEl.textContent='Nº de BI obrigatório';          erroEl.style.display='block'; return; }
  if (!nasc)  { erroEl.textContent='Data de nascimento obrigatória';erroEl.style.display='block'; return; }

  // Validar BI
  if (!/^[0-9]{9}[A-Z]{1,2}$/.test(bi)) {
    erroEl.textContent='BI inválido. Formato: 9 dígitos + letras (ex: 123456789MZ)';
    erroEl.style.display='block'; return;
  }
  // Validar NUIT
  if (nuit && !/^[0-9]{9}$/.test(nuit)) {
    erroEl.textContent='NUIT inválido. Deve ter 9 dígitos.';
    erroEl.style.display='block'; return;
  }

  var btn = document.getElementById('mp-btn');
  btn.textContent = 'A guardar...'; btn.disabled = true;

  var body = {
    nome: nome, apelido: apel,
    numeroFuncionario: func,
    genero: gen,
    dataNascimento: nasc,
    habilitacao: hab,
    email:   email || null,
    telefone: tel  || null,
    escolaId: escola ? parseInt(escola) : null,
    // campos extra guardados na nota (o schema permite JSON)
    // bi e nuit guardados como campos de texto nas observações
  };

  var r = await api('/professores', { method:'POST', body: JSON.stringify(body) });
  if (r && r.id) {
    document.querySelector('.modal-overlay').remove();
    mostrarSucesso('Professor "' + r.nome + ' ' + r.apelido + '" registado com sucesso!');
    professores();
  } else {
    erroEl.textContent = r && r.error ? r.error : 'Erro ao guardar.';
    erroEl.style.display = 'block';
    btn.textContent = 'Guardar Professor'; btn.disabled = false;
  }
}

// ============================================================
// LANÇAR NOTAS — FORMULÁRIO REAL
// ============================================================
function showModalNota() {
  var o = document.createElement('div');
  o.className = 'modal-overlay';
  o.innerHTML = `
    <div class="modal">
      <div class="modal-title">Lançar Nota</div>
      <div class="modal-grid">
        <div class="form-group">
          <label>ID do Aluno *</label>
          <input type="number" id="mn-aluno" placeholder="Nº do aluno" min="1"/>
        </div>
        <div class="form-group">
          <label>Disciplina *</label>
          <select id="mn-disc">
            <option value="1">Português</option>
            <option value="2">Matemática</option>
            <option value="3">Inglês</option>
            <option value="4">História</option>
            <option value="5">Geografia</option>
            <option value="6">Biologia</option>
            <option value="7">Física</option>
            <option value="8">Química</option>
            <option value="9">Educação Física</option>
            <option value="10">TIC</option>
          </select>
        </div>
        <div class="form-group">
          <label>Trimestre *</label>
          <select id="mn-trim">
            <option value="1">1º Trimestre</option>
            <option value="2">2º Trimestre</option>
            <option value="3">3º Trimestre</option>
          </select>
        </div>
        <div class="form-group">
          <label>Ano Lectivo *</label>
          <input type="number" id="mn-ano" value="${new Date().getFullYear()}" min="2000" max="2099"/>
        </div>
        <div class="form-group">
          <label>Nota (0 – 20) *</label>
          <input type="number" id="mn-nota" placeholder="Ex: 14.5" min="0" max="20" step="0.1"/>
        </div>
        <div class="form-group">
          <label>ID do Professor</label>
          <input type="number" id="mn-prof" placeholder="Nº do professor" min="1" value="1"/>
        </div>
      </div>
      <div id="mn-erro" style="color:var(--accent-red);font-size:12px;margin-top:8px;display:none"></div>
      <div class="modal-footer">
        <button class="btn btn-outline" onclick="this.closest('.modal-overlay').remove()">Cancelar</button>
        <button class="btn btn-primary" id="mn-btn" onclick="submeterNota()">Lançar Nota</button>
      </div>
    </div>`;
  o.addEventListener('click', function(ev){ if(ev.target===o) o.remove(); });
  document.body.appendChild(o);
}

async function submeterNota() {
  var erroEl = document.getElementById('mn-erro');
  erroEl.style.display = 'none';

  var alunoId     = parseInt(document.getElementById('mn-aluno').value);
  var disciplinaId= parseInt(document.getElementById('mn-disc').value);
  var trimestre   = parseInt(document.getElementById('mn-trim').value);
  var anoLetivo   = parseInt(document.getElementById('mn-ano').value);
  var valor       = parseFloat(document.getElementById('mn-nota').value);
  var professorId = parseInt(document.getElementById('mn-prof').value) || 1;

  if (!alunoId || isNaN(alunoId)) { erroEl.textContent='ID do aluno inválido'; erroEl.style.display='block'; return; }
  if (isNaN(valor) || valor < 0 || valor > 20) { erroEl.textContent='Nota deve ser entre 0 e 20'; erroEl.style.display='block'; return; }

  var btn = document.getElementById('mn-btn');
  btn.textContent = 'A lançar...'; btn.disabled = true;

  var r = await api('/notas', { method:'POST', body: JSON.stringify({ alunoId, disciplinaId, trimestre, anoLetivo, valor, professorId }) });
  if (r && r.id) {
    document.querySelector('.modal-overlay').remove();
    mostrarSucesso('Nota lançada: ' + r.valor + ' (' + (r.aluno ? r.aluno.nome : '') + ' — ' + (r.disciplina ? r.disciplina.nome : '') + ')');
    notas();
  } else {
    erroEl.textContent = r && r.error ? r.error : 'Erro ao lançar nota.';
    erroEl.style.display = 'block';
    btn.textContent = 'Lançar Nota'; btn.disabled = false;
  }
}

// ============================================================
// EXPORTAÇÃO REAL — download de ficheiros
// ============================================================
function exportarExcel(tipo) {
  var url = API_URL + '/exportar/excel/' + tipo;
  var a = document.createElement('a');
  a.href = url;
  a.setAttribute('download', '');

  // Adicionar token no header via fetch para download autenticado
  fetch(url, { headers: { 'Authorization': 'Bearer ' + accessToken } })
    .then(function(resp) {
      if (!resp.ok) throw new Error('Erro na exportação');
      return resp.blob();
    })
    .then(function(blob) {
      var objectUrl = URL.createObjectURL(blob);
      a.href = objectUrl;
      a.click();
      URL.revokeObjectURL(objectUrl);
      mostrarSucesso('Excel exportado com sucesso!');
    })
    .catch(function(e) {
      alert('Erro ao exportar: ' + e.message);
    });
}

function exportarPDF(tipo, id, params) {
  var url = API_URL + '/exportar/pdf/' + tipo + (id ? '/' + id : '') + (params ? '?' + params : '');
  fetch(url, { headers: { 'Authorization': 'Bearer ' + accessToken } })
    .then(function(resp) {
      if (!resp.ok) throw new Error('Erro na exportação');
      return resp.blob();
    })
    .then(function(blob) {
      var objectUrl = URL.createObjectURL(blob);
      var a = document.createElement('a');
      a.href = objectUrl;
      a.download = 'SIGE_' + tipo + '_' + new Date().getFullYear() + '.pdf';
      a.click();
      URL.revokeObjectURL(objectUrl);
      mostrarSucesso('PDF gerado com sucesso!');
    })
    .catch(function(e) {
      alert('Erro ao exportar PDF: ' + e.message);
    });
}

function exportPDF(nome) {
  exportarPDF('relatorio-mec', null, 'anoLetivo=' + new Date().getFullYear());
}

// ============================================================
// NOTIFICAÇÃO DE SUCESSO
// ============================================================
function mostrarSucesso(msg) {
  var div = document.createElement('div');
  div.style.cssText = 'position:fixed;top:20px;right:20px;background:#009A44;color:#fff;padding:14px 20px;border-radius:8px;font-size:13px;font-weight:600;z-index:9999;box-shadow:0 4px 20px rgba(0,0,0,0.3);animation:slideUp 0.3s ease';
  div.textContent = '✅ ' + msg;
  document.body.appendChild(div);
  setTimeout(function(){ div.remove(); }, 3500);
}

// ============================================================
// BOTÕES DE EXPORTAÇÃO — injectados nas páginas
// ============================================================

// Sobrescrever função relatorios com botões de exportação reais
function relatorios() {
  document.getElementById('page-content').innerHTML =
    '<div class="section-title">Central de Relatórios e Exportação</div>' +
    '<p class="section-desc">Gere e descarregue relatórios oficiais em PDF e Excel.</p>' +
    '<div class="two-col"><div>' +
    '<h3 style="font-family:var(--font-serif);font-size:16px;font-weight:400;color:var(--text-secondary);margin-bottom:16px">Exportar Excel</h3>' +
    excelCard('📊','Lista de Escolas','Todas as escolas com contagem de alunos e professores','escolas') +
    excelCard('👨‍🎓','Lista de Alunos','Todos os alunos com turma e estado actual','alunos') +
    excelCard('👩‍🏫','Lista de Professores','Professores com habilitações e escolas','professores') +
    excelCard('📝','Pauta de Notas','Notas por turma e disciplina (ano actual)','notas') +
    '</div><div>' +
    '<h3 style="font-family:var(--font-serif);font-size:16px;font-weight:400;color:var(--text-secondary);margin-bottom:16px">Exportar PDF</h3>' +
    pdfCard('📄','Boletim Individual','Boletim de um aluno com médias e resultado','boletim') +
    pdfCard('📋','Relatório Estatístico MEC','Relatório oficial com KPIs nacionais por província','relatorio-mec') +
    '<div style="background:var(--bg-card2);border:1px solid var(--border-accent);border-radius:var(--radius);padding:20px;margin-top:16px">' +
    '<div style="font-size:12px;color:var(--accent);font-weight:700;margin-bottom:8px">ℹ Boletim Individual</div>' +
    '<p style="font-size:12px;color:var(--text-muted);margin-bottom:12px">Para gerar o boletim de um aluno específico, aceda à lista de Alunos e clique em "Boletim PDF" na linha do aluno.</p>' +
    '</div>' +
    '</div></div>';
}

function excelCard(icon, nome, desc, tipo) {
  return '<div style="background:var(--bg-card);border:1px solid var(--border);border-radius:var(--radius);padding:16px;margin-bottom:12px;display:flex;align-items:center;gap:16px">' +
    '<span style="font-size:24px">'+icon+'</span>' +
    '<div style="flex:1"><div style="font-size:14px;color:var(--text-primary);font-weight:600">'+nome+'</div><div style="font-size:12px;color:var(--text-muted);margin-top:2px">'+desc+'</div></div>' +
    '<button class="btn btn-primary btn-sm" onclick="exportarExcel(\''+tipo+'\')">⬇ Descarregar .xlsx</button>' +
  '</div>';
}

function pdfCard(icon, nome, desc, tipo) {
  return '<div style="background:var(--bg-card);border:1px solid var(--border);border-radius:var(--radius);padding:16px;margin-bottom:12px;display:flex;align-items:center;gap:16px">' +
    '<span style="font-size:24px">'+icon+'</span>' +
    '<div style="flex:1"><div style="font-size:14px;color:var(--text-primary);font-weight:600">'+nome+'</div><div style="font-size:12px;color:var(--text-muted);margin-top:2px">'+desc+'</div></div>' +
    (tipo === 'relatorio-mec'
      ? '<button class="btn btn-gold btn-sm" onclick="exportarPDF(\'relatorio-mec\')">⬇ PDF Oficial</button>'
      : '<button class="btn btn-gold btn-sm" onclick="pedirBoletimPDF()">⬇ Gerar PDF</button>') +
  '</div>';
}

function pedirBoletimPDF() {
  var id = prompt('Introduza o ID do aluno para gerar o boletim:');
  if (id && !isNaN(parseInt(id))) {
    exportarPDF('boletim', parseInt(id), 'anoLetivo=' + new Date().getFullYear());
  } else if (id) {
    alert('ID inválido. Introduza apenas o número do aluno.');
  }
}
