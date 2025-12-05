// --- CONFIGURAÇÃO FIREBASE ---
const firebaseConfig = {
  apiKey: "AIzaSyCADgdZJ45YtaRsPzPFGpQCFz5fOoTF5kI",
  authDomain: "gerador-msg-wapp.firebaseapp.com",
  projectId: "gerador-msg-wapp",
  storageBucket: "gerador-msg-wapp.firebasestorage.app",
  messagingSenderId: "879738577541",
  appId: "1:879738577541:web:bf90d416f52e12b1d97fec"
};

// --- INICIALIZAÇÃO ---
firebase.initializeApp(firebaseConfig);
const db = firebase.firestore();
const auth = firebase.auth();

// --- CONSTANTES ---
const COLECOES = {
    eventos: "eventos", eventos_tipos: "eventos_tipos", eventos_titulos: "eventos_titulos",
    cidades: "cidades", comuns: "comum_congregacao", participantes: "participantes", 
    publicos_alvo: "publico_alvo", realizacoes: "realizacao", templates: "templates", usuarios: "usuarios" 
};

// --- ESTADO GLOBAL ---
let eventosDB=[], cidadesDB=[], comunsDB=[], templatesDB=[], participantesDB=[], publicosAlvoDB=[], titulosDB=[]; 
let filtroAtual='todos', currentUser=null, currentSettingsTab=null;

// --- HELPERS ---
const diasSemana = ['Domingo', 'Segunda-Feira', 'Terça-Feira', 'Quarta-Feira', 'Quinta-Feira', 'Sexta-Feira', 'Sábado'];
const meses = ['Janeiro', 'Fevereiro', 'Março', 'Abril', 'Maio', 'Junho', 'Julho', 'Agosto', 'Setembro', 'Outubro', 'Novembro', 'Dezembro'];

const calcularDescricaoData = (dataObj) => {
    if (!dataObj) return '';
    const dia = dataObj.getDate();
    const diaSemanaIndex = dataObj.getDay();
    const ocorrencia = Math.ceil(dia / 7);
    const dataTeste = new Date(dataObj); dataTeste.setDate(dia + 7);
    const isUltimo = dataTeste.getMonth() !== dataObj.getMonth();
    const ordinaisM = ['Primeiro', 'Segundo', 'Terceiro', 'Quarto', 'Quinto'];
    const ordinaisF = ['Primeira', 'Segunda', 'Terceira', 'Quarta', 'Quinta'];
    const isMasc = (diaSemanaIndex === 0 || diaSemanaIndex === 6);
    let prefixo = (isMasc ? ordinaisM : ordinaisF)[ocorrencia - 1] || '';
    if (isUltimo && ocorrencia >= 4) prefixo = isMasc ? 'Último' : 'Última';
    return `${prefixo} ${diasSemana[diaSemanaIndex]}`;
};

const formatarDataHora = (dataHoraStr) => {
    if (!dataHoraStr) return { data: '[Data]', hora: '[Hora]', diaSemana: '[Dia]', diaNum: '[DiaNum]' };
    const data = new Date(dataHoraStr);
    return {
        data: data.toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit', year: 'numeric' }),
        hora: data.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' }),
        diaSemana: diasSemana[data.getDay()],
        diaNum: data.getDate().toString().padStart(2, '0'),
        mesNome: meses[data.getMonth()],
        ano: data.getFullYear(),
        dataExtenso: `${diasSemana[data.getDay()]}, dia ${data.getDate()} de ${meses[data.getMonth()]} de ${data.getFullYear()}`
    };
};

// --- VARIÁVEIS ---
const VARIAVEIS_LAYOUT = { 
    '[mes_nome]':'Mês', '[ano]':'Ano', '[mes_ano]':'Mês/Ano', 
    '[lista_reunioes]':'Lista Reuniões', '[lista_ensaios]':'Lista Ensaios'
};
const VARIAVEIS_SNIPPET = {
    '[dia_semana]':'Dia', '[data]':'Data', '[hora]':'Hora', 
    '[sigla]':'Sigla', '[titulo]':'Título', '[desc_data]':'Desc. Data', '[cidade]':'Cidade', 
    '[local]':'Comum', '[local_detalhe]':'Sala', '[publico]':'Participantes', 
    '[quantidade]':'Qtd', '[link]':'Link', '[observacoes]':'Obs'
};

document.addEventListener('DOMContentLoaded', () => {
    const toast = document.getElementById('toast-notification');
    const loginContainer = document.getElementById('login-container');
    const appContainer = document.getElementById('app-container');
    const loginForm = document.getElementById('login-form');
    const userDisplay = document.getElementById('user-display');
    const lastLoginDisplay = document.getElementById('last-login-display');
    const navButtons = document.querySelectorAll('nav button');
    const paginas = document.querySelectorAll('.pagina');
    
    const formEvento = document.getElementById('formEvento');
    const inpData = document.getElementById('data_hora');
    const inpDescData = document.getElementById('desc_data');
    const selTipo = document.getElementById('select_tipo_evento');
    const selSigla = document.getElementById('select_titulo');
    const inpTitulo = document.getElementById('titulo');
    const selParticipantes = document.getElementById('select_participantes');
    const inpQtd = document.getElementById('observacoes');
    const selCidade = document.getElementById('select_cidade');
    const selComum = document.getElementById('select_comum');
    
    const allGroups = [
        document.getElementById('form-group-sigla'), document.getElementById('form-group-titulo'),
        document.getElementById('form-group-publico'), document.getElementById('form-group-quantidade'),
        document.getElementById('form-group-is_extra'), document.getElementById('form-group-link'),
        document.getElementById('form-group-realizacao'), document.getElementById('form-group-observacoes_extra')
    ];

    const modalBackdrop = document.getElementById('modal-backdrop');
    const configModal = document.getElementById('config-modal');
    const modalBody = document.getElementById('modal-body');
    const deleteModal = document.getElementById('delete-modal');
    const deleteModalBody = document.getElementById('delete-modal-body');
    const settingsList = document.getElementById('settings-list');
    let modalOnSave = null, deleteModalOnConfirm = null; 

    function showToast(msg, isError=false) { toast.textContent=msg; toast.className=isError?'show error':'show'; setTimeout(()=>toast.classList.remove('show'),5000); }
    function showModal(el) { modalBackdrop.style.display='block'; el.style.display='block'; }
    function hideModal(el) { modalBackdrop.style.display='none'; el.style.display='none'; }
    function showConfigModal(t, render, onSave) { document.getElementById('modal-title').textContent=t; modalBody.innerHTML=''; render(modalBody); modalOnSave=onSave; showModal(configModal); }
    function hideConfigModal() { hideModal(configModal); modalOnSave=null; }
    function showDeleteModal(n, onC) { deleteModalBody.innerHTML=`<p>Excluir "<strong>${n}</strong>"?</p>`; deleteModalOnConfirm=onC; showModal(deleteModal); }
    function hideDeleteModal() { hideModal(deleteModal); deleteModalOnConfirm=null; }

    document.getElementById('modal-btn-salvar').onclick = () => { if(modalOnSave) modalOnSave(); };
    document.getElementById('modal-btn-cancelar').onclick = hideConfigModal;
    document.getElementById('delete-modal-btn-confirmar').onclick = () => { if(deleteModalOnConfirm) deleteModalOnConfirm(); };
    document.getElementById('delete-modal-btn-cancelar').onclick = hideDeleteModal;
    
    const relModal = document.getElementById('releases-modal');
    document.getElementById('btn-releases').onclick=()=>showModal(relModal);
    document.getElementById('releases-modal-btn-fechar').onclick=()=>hideModal(relModal);

    // --- FORM LOGIC ---
    inpData.addEventListener('change', (e) => { if(e.target.value) inpDescData.value = calcularDescricaoData(new Date(e.target.value)); });

    selTipo.addEventListener('change', (e) => {
        const txt = e.target.options[e.target.selectedIndex]?.text || '';
        const isEnsaio = txt.toLowerCase().includes('ensaio');
        allGroups.forEach(g => g.style.display = isEnsaio ? 'none' : 'block');
        if (isEnsaio) {
            selSigla.value=''; inpTitulo.value='Ensaio Regional'; selParticipantes.value=''; inpQtd.value='';
            document.getElementById('is_extraordinaria').checked=false;
            document.getElementById('link_externo').value=''; document.getElementById('observacoes_extra').value='';
            document.getElementById('select_realizacao').value='';
            document.getElementById('checkLinkExterno').checked=false;
            document.getElementById('linkExternoWrapper').style.display='none';
        } else {
            if(inpTitulo.value === 'Ensaio Regional') inpTitulo.value = '';
        }
    });

    selSigla.addEventListener('change', (e) => { const i=titulosDB.find(t=>t.id===e.target.value); if(i) inpTitulo.value=i.titulo; });
    selParticipantes.addEventListener('change', (e) => { const p=participantesDB.find(x=>x.id===e.target.value); inpQtd.value = p ? (p.quantidade_media||'') : ''; });

    selCidade.addEventListener('change', async (e) => {
        const cidId = e.target.value;
        selComum.innerHTML = '<option>Carregando...</option>'; selComum.disabled = true;
        if (!cidId) { selComum.innerHTML = '<option value="">-- Selecione Cidade --</option>'; return; }
        try {
            const snap = await db.collection(COLECOES.comuns).where('cidade_ref', '==', cidId).get();
            selComum.innerHTML = '<option value="">-- Selecione --</option>';
            let arr = []; snap.forEach(d => arr.push({id:d.id, ...d.data()}));
            arr.sort((a,b)=>a.nome.localeCompare(b.nome));
            arr.forEach(c => selComum.add(new Option(c.nome, c.id)));
        } catch(err) { console.error(err); showToast("Erro ao buscar comuns", true); } 
        finally { selComum.disabled = false; }
    });

    // --- LOAD DATA ---
    async function carregarDadosIniciais() {
        const loadCache = async (col, arr) => { const s=await db.collection(col).get(); arr.length=0; s.forEach(d=>arr.push({id:d.id,...d.data()})); };
        await Promise.all([
            loadCache(COLECOES.eventos_titulos, titulosDB), loadCache(COLECOES.participantes, participantesDB),
            loadCache(COLECOES.templates, templatesDB), loadCache(COLECOES.cidades, cidadesDB)
        ]);
        const popSel = (id, arr, f) => {
            const el=document.getElementById(id); el.innerHTML='<option value="">-- Selecione --</option>';
            arr.sort((a,b)=>(a[f]>b[f])?1:-1); arr.forEach(i=>el.add(new Option(i[f], i.id)));
        };
        popSel('select_titulo', titulosDB, 'sigla'); popSel('select_participantes', participantesDB, 'grupo');
        popSel('select_cidade', cidadesDB, 'nome');
        const loadSimples = async (col, id, f) => {
            const el=document.getElementById(id); const s=await db.collection(col).orderBy(f).get();
            el.innerHTML='<option value="">-- Selecione --</option>';
            s.forEach(d => { if(id==='select_template_gerador'&&d.data().tipo!=='layout')return; el.add(new Option(d.data()[f], d.id)); });
        };
        await Promise.all([
            loadSimples(COLECOES.eventos_tipos, 'select_tipo_evento', 'nome'), loadSimples(COLECOES.realizacoes, 'select_realizacao', 'nome'),
            loadSimples(COLECOES.publicos_alvo, 'select_publico_gerador', 'nome'), loadSimples(COLECOES.templates, 'select_template_gerador', 'nome')
        ]);
        const chk = document.getElementById('checklist-publicos_alvo'); chk.innerHTML='';
        const sp = await db.collection(COLECOES.publicos_alvo).orderBy('nome').get();
        publicosAlvoDB=[];
        sp.forEach(d => {
            publicosAlvoDB.push({id:d.id, ...d.data()});
            const l=document.createElement('label'); l.innerHTML=`<input type="checkbox" class="chk-publico-alvo" value="${d.id}"> ${d.data().nome}`;
            chk.appendChild(l);
        });
    }

    // --- SAVE ---
    formEvento.addEventListener('submit', async (e) => {
        e.preventDefault();
        const btn=document.getElementById('btnAdicionarEvento'); btn.disabled=true; btn.innerText="Salvando...";
        try {
            const getTxt = (id) => { const el=document.getElementById(id); return el.options[el.selectedIndex]?.text||''; };
            const tipoNome = getTxt('select_tipo_evento');
            const isEnsaio = tipoNome.toLowerCase().includes('ensaio');
            const data = {
                data_hora: inpData.value, desc_data: inpDescData.value,
                link_externo: isEnsaio?'':document.getElementById('link_externo').value,
                observacoes_extra: isEnsaio?'':document.getElementById('observacoes_extra').value,
                is_extraordinaria: isEnsaio?false:document.getElementById('is_extraordinaria').checked,
                tipo_evento_ref: selTipo.value, tipo_evento_nome: tipoNome,
                cidade_ref: selCidade.value, cidade_nome: getTxt('select_cidade'),
                comum_ref: selComum.value, comum_nome: getTxt('select_comum'),
                realizacao_ref: isEnsaio?'':document.getElementById('select_realizacao').value,
                realizacao_nome: isEnsaio?'':getTxt('select_realizacao'),
                publicos_alvo_refs: Array.from(document.querySelectorAll('.chk-publico-alvo:checked')).map(c=>c.value)
            };
            if (isEnsaio) {
                data.titulo_ref=''; data.titulo_sigla=''; data.titulo_nome='Ensaio Regional';
                data.publico_ref=''; data.publico_grupo=''; data.publico_qtd='';
            } else {
                data.titulo_ref=selSigla.value; data.titulo_sigla=getTxt('select_titulo'); data.titulo_nome=inpTitulo.value;
                data.publico_ref=selParticipantes.value; data.publico_grupo=getTxt('select_participantes'); data.publico_qtd=inpQtd.value;
            }
            const id = document.getElementById('eventoId').value;
            if(id) await db.collection(COLECOES.eventos).doc(id).update(data);
            else await db.collection(COLECOES.eventos).add(data);
            showToast("Salvo!"); document.getElementById('btnCancelarEdicao').click();
        } catch (err) { showToast("Erro: "+err.message, true); }
        finally { btn.disabled=false; btn.innerText="Adicionar Novo Evento"; }
    });

    // --- LIST ---
    function renderizarLista(eventos) {
        const cont=document.getElementById('listaEventos'); const load=document.getElementById('statusLoading');
        cont.innerHTML='';
        let arr = eventos.sort((a,b)=>new Date(a.data_hora)-new Date(b.data_hora));
        if(filtroAtual==='ensaios') arr=arr.filter(e=>e.tipo_evento_nome.toLowerCase().includes('ensaio'));
        else if(filtroAtual==='reunioes') arr=arr.filter(e=>!e.tipo_evento_nome.toLowerCase().includes('ensaio') && !e.is_extraordinaria);
        else if(filtroAtual==='extras') arr=arr.filter(e=>e.is_extraordinaria);
        if(arr.length===0) { load.style.display='block'; load.textContent='Vazio.'; return; }
        load.style.display='none';
        arr.forEach(ev => {
            const d = formatarDataHora(ev.data_hora);
            const isEnsaio = ev.tipo_evento_nome.toLowerCase().includes('ensaio');
            const tit = isEnsaio ? `🎵 ${d.data} - Ensaio - ${ev.cidade_nome}` : `👔 ${d.data} - ${ev.titulo_sigla}`;
            const div = document.createElement('div'); div.className='evento-card';
            div.innerHTML = `<div class="evento-header"><h3>${tit} ${ev.is_extraordinaria?'<span class="tag-extra">[EXTRA]</span>':''}</h3><span class="expand-icon">+</span></div>
            <div class="evento-detalhes" style="display:none"><p><strong>Data:</strong> ${d.dataExtenso}</p><p><strong>Local:</strong> ${ev.comum_nome}</p><div class="evento-botoes-detalhe"><button class="btn-lembrete" data-id="${ev.id}">Lembrete</button><button class="btn-convite" data-id="${ev.id}">Convite</button><button class="btn-edit btn-icon" data-id="${ev.id}">✏️</button><button class="btn-delete btn-icon" data-id="${ev.id}">🗑️</button></div></div>`;
            div.querySelector('.evento-header').onclick=()=>{const b=div.querySelector('.evento-detalhes'); b.style.display=b.style.display==='block'?'none':'block'};
            cont.appendChild(div);
        });
    }

    document.getElementById('listaEventos').addEventListener('click', async (e) => {
        const btn = e.target.closest('button'); if(!btn) return;
        const id = btn.dataset.id;
        if(btn.classList.contains('btn-delete')) showDeleteModal("Evento", async()=>{ await db.collection(COLECOES.eventos).doc(id).delete(); showToast("Apagado"); hideDeleteModal(); });
        if(btn.classList.contains('btn-edit')) {
            const ev = eventosDB.find(x=>x.id===id);
            document.getElementById('eventoId').value = ev.id;
            inpData.value = ev.data_hora; inpDescData.value = ev.desc_data;
            document.getElementById('is_extraordinaria').checked = ev.is_extraordinaria;
            document.getElementById('link_externo').value = ev.link_externo||'';
            document.getElementById('observacoes_extra').value = ev.observacoes_extra||'';
            if(ev.link_externo) { document.getElementById('checkLinkExterno').checked=true; document.getElementById('linkExternoWrapper').style.display='block'; }
            const tr = (eid,val) => { const el=document.getElementById(eid); el.value=val; el.dispatchEvent(new Event('change')); };
            tr('select_tipo_evento', ev.tipo_evento_ref); tr('select_cidade', ev.cidade_ref);
            setTimeout(()=>document.getElementById('select_comum').value=ev.comum_ref, 600);
            if(!ev.tipo_evento_nome.toLowerCase().includes('ensaio')) { 
                tr('select_titulo', ev.titulo_ref); tr('select_participantes', ev.publico_ref);
                tr('select_realizacao', ev.realizacao_ref);
                if(ev.publico_qtd) inpQtd.value = ev.publico_qtd;
            }
            const refs = ev.publicos_alvo_refs||[]; document.querySelectorAll('.chk-publico-alvo').forEach(c=>c.checked=refs.includes(c.value));
            document.getElementById('btnAdicionarEvento').innerText="Atualizar";
            document.getElementById('btnCancelarEdicao').style.display="inline-block";
            document.getElementById('btnNavGestao').click(); window.scrollTo(0,0);
        }
        
        // --- CORREÇÃO AQUI ---
        if(btn.classList.contains('btn-lembrete') || btn.classList.contains('btn-convite')) {
             const tipo = btn.classList.contains('btn-lembrete') ? 'botao_lembrete' : 'botao_convite';
             const t = templatesDB.find(x=>x.tipo===tipo); if(!t) return showToast("Template off", true);
             const ev = eventosDB.find(x=>x.id===id); const d = formatarDataHora(ev.data_hora);
             let txt = t.corpo;
             const map = { 
                 '\\[sigla\\]':ev.titulo_sigla, '\\[titulo\\]':ev.titulo_nome, '\\[data\\]':d.data, '\\[hora\\]':d.hora, 
                 '\\[dia_semana\\]':d.diaSemana, '\\[cidade\\]':ev.cidade_nome, '\\[local\\]':ev.comum_nome, 
                 '\\[local_detalhe\\]':ev.realizacao_nome, // ADICIONADO
                 '\\[desc_data\\]':ev.desc_data, // ADICIONADO
                 '\\[link\\]':ev.link_externo, // ADICIONADO
                 '\\[observacoes\\]':ev.observacoes_extra 
             };
             for(const [k,v] of Object.entries(map)) txt = txt.replace(new RegExp(k,'gi'), v||'');
             document.getElementById('btnNavGerador').click(); document.getElementById('resultado').value = txt;
        }
    });

    document.getElementById('btnCancelarEdicao').onclick = () => {
        formEvento.reset(); document.getElementById('eventoId').value=''; 
        document.getElementById('btnAdicionarEvento').innerText="Adicionar Novo Evento";
        document.getElementById('btnCancelarEdicao').style.display="none";
        allGroups.forEach(g => g.style.display='block');
        document.getElementById('linkExternoWrapper').style.display='none';
    };

    document.getElementById('filter-container').querySelectorAll('button').forEach(b => b.onclick = () => {
        document.querySelector('.filter-buttons .ativa').classList.remove('ativa'); b.classList.add('ativa');
        filtroAtual = b.dataset.filtro; renderizarLista(eventosDB);
    });

    // --- SETTINGS ---
    const CONFIG = {
        'cidades': { col: COLECOES.cidades, t:'Cidades', f:['nome'] },
        'comuns': { col: COLECOES.comuns, t:'Comuns', f:['nome'] },
        'participantes': { col: COLECOES.participantes, t:'Participantes', f:['grupo'] },
        'publicos_alvo': { col: COLECOES.publicos_alvo, t:'Públicos', f:['nome'] },
        'realizacoes': { col: COLECOES.realizacoes, t:'Locais', f:['nome'] },
        'titulos': { col: COLECOES.eventos_titulos, t:'Títulos', f:['sigla'] }
    };

    async function loadSettings(key) {
        const cfg = CONFIG[key]; currentSettingsTab = key;
        document.getElementById('settings-title').textContent = cfg.t;
        document.getElementById('btn-settings-add').textContent = '+ Novo';
        document.querySelectorAll('.settings-sidebar .nav-btn').forEach(b=>b.classList.remove('ativa'));
        document.querySelector(`.settings-sidebar button[data-target="${key}"]`)?.classList.add('ativa');
        settingsList.innerHTML = '<li>Carregando...</li>';
        const snap = await db.collection(cfg.col).get(); 
        settingsList.innerHTML = '';
        if(snap.empty) { settingsList.innerHTML='<li style="padding:15px">Vazio.</li>'; return; }
        let arr = []; snap.forEach(d=>arr.push({id:d.id,...d.data()}));
        arr.sort((a,b) => (a[cfg.f[0]] > b[cfg.f[0]]) ? 1 : -1);
        if(key==='cidades') cidadesDB = arr;
        if(key==='titulos') titulosDB = arr;
        arr.forEach(d => {
            let p = d.nome || d.grupo || d.sigla; let s = '';
            if(key==='comuns') { const c = cidadesDB.find(x=>x.id===d.cidade_ref); s = c?c.nome:'?'; }
            if(key==='participantes') s = d.quantidade_media;
            if(key==='titulos') s = d.titulo;
            const li = document.createElement('li'); li.className='config-list-item';
            li.innerHTML = `<div class="config-item-text"><span class="sigla">${p}</span>${s?`<span class="titulo">${s}</span>`:''}</div><div class="config-item-actions"><button class="btn-edit btn-icon" data-id="${d.id}" data-key="${key}">✏️</button><button class="btn-delete btn-icon" data-id="${d.id}" data-key="${key}">🗑️</button></div>`;
            settingsList.appendChild(li);
        });
    }

    document.querySelector('.settings-sidebar').addEventListener('click', e => { const b=e.target.closest('.nav-btn'); if(b) loadSettings(b.dataset.target); });
    document.getElementById('btn-settings-add').onclick = () => {
        const k = currentSettingsTab; if(!k) return;
        if(k==='comuns') {
            let opts=''; cidadesDB.forEach(c=>opts+=`<option value="${c.id}">${c.nome}</option>`);
            showConfigModal('Nova Comum', c=>c.innerHTML=`<div class="form-group"><label>Nome</label><input id="f0"></div><div class="form-group"><label>Cidade</label><select id="f1">${opts}</select></div>`, async()=>{
                await db.collection(COLECOES.comuns).add({nome:document.getElementById('f0').value, cidade_ref:document.getElementById('f1').value});
                showToast("Salvo"); hideConfigModal(); loadSettings(k);
            });
        } else if(k==='titulos') {
             showConfigModal('Novo Título', c=>c.innerHTML=`<div class="form-group"><label>Sigla</label><input id="f0"></div><div class="form-group"><label>Título</label><input id="f1"></div>`, async()=>{
                await db.collection(COLECOES.eventos_titulos).add({sigla:document.getElementById('f0').value, titulo:document.getElementById('f1').value});
                showToast("Salvo"); hideConfigModal(); loadSettings(k);
            });
        } else if(k==='participantes') {
            showConfigModal('Novo Grupo', c=>c.innerHTML=`<div class="form-group"><label>Grupo</label><input id="f0"></div><div class="form-group"><label>Qtd</label><input id="f1"></div>`, async()=>{
                await db.collection(COLECOES.participantes).add({grupo:document.getElementById('f0').value, quantidade_media:document.getElementById('f1').value});
                showToast("Salvo"); hideConfigModal(); loadSettings(k);
            });
        } else {
             showConfigModal('Novo Item', c=>c.innerHTML=`<div class="form-group"><label>Nome</label><input id="f0"></div>`, async()=>{
                await db.collection(CONFIG[k].col).add({nome:document.getElementById('f0').value});
                showToast("Salvo"); hideConfigModal(); loadSettings(k);
            });
        }
    };

    settingsList.addEventListener('click', async (e) => {
        const b=e.target.closest('button'); if(!b) return;
        const k=b.dataset.key; const id=b.dataset.id;
        if(b.classList.contains('btn-delete')) showDeleteModal("Item", async()=>{ await db.collection(CONFIG[k].col).doc(id).delete(); showToast("Excluído"); hideDeleteModal(); loadSettings(k); });
        if(b.classList.contains('btn-edit')) {
            const d = (await db.collection(CONFIG[k].col).doc(id).get()).data();
            let h = `<div class="form-group"><label>Nome</label><input id="ed0" value="${d.nome||d.grupo||d.sigla}"></div>`;
            if(k==='titulos') h+=`<div class="form-group"><label>Titulo</label><input id="ed1" value="${d.titulo}"></div>`;
            if(k==='participantes') h+=`<div class="form-group"><label>Qtd</label><input id="ed1" value="${d.quantidade_media}"></div>`;
            showConfigModal('Editar', c=>c.innerHTML=h, async()=>{
                let pl = { [d.nome?'nome':(d.grupo?'grupo':'sigla')]: document.getElementById('ed0').value };
                if(k==='titulos') pl.titulo=document.getElementById('ed1').value;
                if(k==='participantes') pl.quantidade_media=document.getElementById('ed1').value;
                await db.collection(CONFIG[k].col).doc(id).update(pl);
                showToast("Atualizado"); hideConfigModal(); loadSettings(k);
            });
        }
    });

    // --- TEMPLATES ---
    async function renderTemplates() {
        const ul=document.getElementById('config-list-templates'); ul.innerHTML='<li>Carregando...</li>';
        const snap=await db.collection(COLECOES.templates).orderBy('nome').get();
        ul.innerHTML=''; templatesDB=[];
        snap.forEach(d=>{ templatesDB.push({id:d.id,...d.data()}); const li=document.createElement('li'); li.className='config-list-item';
            li.innerHTML=`<div class="config-item-text"><span class="sigla">${d.data().nome}</span><span class="titulo">${d.data().tipo}</span></div><div class="config-item-actions"><button class="btn-edit btn-icon" data-id="${d.id}">✏️</button><button class="btn-delete btn-icon" data-id="${d.id}">🗑️</button></div>`;
            ul.appendChild(li); });
    }
    document.getElementById('paginaTemplates').addEventListener('click', async(e)=>{
        const b=e.target.closest('button'); if(!b) return; const id=b.dataset.id;
        if(b.id==='btn-add-template') showConfigModal('Novo', c=>editorTpl(c), async()=>{saveTpl()});
        if(b.classList.contains('btn-delete')) showDeleteModal("Template", async()=>{await db.collection(COLECOES.templates).doc(id).delete(); showToast("Apagado"); hideDeleteModal(); renderTemplates();});
        if(b.classList.contains('btn-edit')) { const t=templatesDB.find(x=>x.id===id); showConfigModal('Editar', c=>editorTpl(c,t), async()=>{saveTpl(id)}); }
    });
    function editorTpl(c, d={}) {
        c.innerHTML=`
            <div class="form-group"><label>Nome</label><input id="tm-n" value="${d.nome||''}"></div>
            <div class="form-group"><label>Tipo</label><select id="tm-t"><option value="layout">Layout</option><option value="componente">Snippet</option><option value="botao_lembrete">Botão Lembrete</option><option value="botao_convite">Botão Convite</option></select></div>
            <div class="form-group" id="grp-snip-meet" style="display:none"><label>Snippet de Reuniões 👔</label><select id="tm-s1"></select></div>
            <div class="form-group" id="grp-snip-reh" style="display:none"><label>Snippet de Ensaios 🎵</label><select id="tm-s2"></select></div>
            <div class="form-group"><label>Corpo</label><div class="format-toolbar"><button data-f="*">B</button><button data-f="_">I</button></div><textarea id="tm-c" rows="8">${d.corpo||''}</textarea></div>
            <div id="tm-v" style="font-size:0.8em; color:blue; cursor:pointer"></div>
        `;
        const sT=c.querySelector('#tm-t'), s1=c.querySelector('#tm-s1'), s2=c.querySelector('#tm-s2');
        if(d.tipo) sT.value = d.tipo;
        const snips = templatesDB.filter(x=>x.tipo==='componente');
        s1.add(new Option('-- Selecione --', '')); s2.add(new Option('-- Selecione --', ''));
        snips.forEach(x=>{ s1.add(new Option(x.nome, x.id)); s2.add(new Option(x.nome, x.id)); });
        if(d.snippet_meeting_ref) s1.value = d.snippet_meeting_ref;
        if(d.snippet_rehearsal_ref) s2.value = d.snippet_rehearsal_ref;
        if(d.snippet_ref && !d.snippet_meeting_ref) s1.value = d.snippet_ref; 

        const upd = () => {
             const isLay = sT.value==='layout';
             c.querySelector('#grp-snip-meet').style.display = isLay?'block':'none';
             c.querySelector('#grp-snip-reh').style.display = isLay?'block':'none';
             const dict = isLay ? VARIAVEIS_LAYOUT : VARIAVEIS_SNIPPET;
             const dv = c.querySelector('#tm-v');
             dv.innerHTML = Object.keys(dict).map(k=>`<span style="margin-right:5px; border:1px solid #ccc; padding:2px">${k}</span>`).join('');
             dv.querySelectorAll('span').forEach(s=>s.onclick=()=>{ const ta=c.querySelector('#tm-c'); ta.setRangeText(s.textContent, ta.selectionStart, ta.selectionEnd, 'end'); ta.focus(); });
        };
        sT.onchange=upd; upd();
        c.querySelectorAll('button[data-f]').forEach(b=>b.onclick=(e)=>{e.preventDefault(); const f=b.dataset.f, t=c.querySelector('#tm-c'), p=t.selectionStart; t.setRangeText(`${f}${t.value.substring(p,t.selectionEnd)}${f}`,p,t.selectionEnd,'select');});
    }
    async function saveTpl(id) {
        const pl = { nome:document.getElementById('tm-n').value, tipo:document.getElementById('tm-t').value, corpo:document.getElementById('tm-c').value, snippet_meeting_ref:document.getElementById('tm-s1').value, snippet_rehearsal_ref:document.getElementById('tm-s2').value };
        if(id) await db.collection(COLECOES.templates).doc(id).update(pl); else await db.collection(COLECOES.templates).add(pl);
        showToast("Salvo"); hideConfigModal(); renderTemplates();
    }

    // --- GENERATOR ---
    document.getElementById('btnGerarMensagemMassa').onclick = () => {
        const mes = document.getElementById('select_mes_gerador').value; 
        const pub = document.getElementById('select_publico_gerador').value;
        const tplId = document.getElementById('select_template_gerador').value;
        if(!mes || !pub || !tplId) return showToast("Preencha tudo", true);
        const lay = templatesDB.find(t=>t.id===tplId);
        const snipMeet = templatesDB.find(t=>t.id===lay.snippet_meeting_ref);
        const snipReh = templatesDB.find(t=>t.id===lay.snippet_rehearsal_ref);
        if(!snipMeet && !snipReh) return showToast("Layout sem snippets", true);

        const [ano, m] = mes.split('-');
        const allEvts = eventosDB.filter(ev => {
            const d = new Date(ev.data_hora); const mm = (d.getMonth()+1).toString().padStart(2,'0'); const a = d.getFullYear().toString();
            return mm===m && a===ano && (ev.publicos_alvo_refs||[]).includes(pub);
        });
        if(allEvts.length===0) { document.getElementById('resultado').value="Nenhum evento."; return; }

        const meetEvts = allEvts.filter(e => !e.tipo_evento_nome.toLowerCase().includes('ensaio')).sort((a,b)=>new Date(a.data_hora)-new Date(b.data_hora));
        const rehEvts = allEvts.filter(e => e.tipo_evento_nome.toLowerCase().includes('ensaio')).sort((a,b)=>new Date(a.data_hora)-new Date(b.data_hora));

        const genLoop = (evList, snippet) => {
            if(!snippet || evList.length===0) return '';
            let txt = '';
            evList.forEach(ev => {
                let row = snippet.corpo;
                const d = formatarDataHora(ev.data_hora);
                const map = {
                    '\\[sigla\\]': ev.titulo_sigla, '\\[titulo\\]': ev.titulo_nome, '\\[data\\]': d.data, '\\[hora\\]': d.hora,
                    '\\[dia_semana\\]': d.diaSemana, '\\[cidade\\]': ev.cidade_nome, '\\[local\\]': ev.comum_nome, 
                    '\\[local_detalhe\\]': ev.realizacao_nome, '\\[publico\\]': ev.publico_grupo, '\\[quantidade\\]': ev.publico_qtd,
                    '\\[observacoes\\]': ev.observacoes_extra, '\\[link\\]': ev.link_externo, '\\[desc_data\\]': ev.desc_data
                };
                for(const [k,v] of Object.entries(map)) row = row.replace(new RegExp(k,'gi'), v||'');
                txt += row + '\n\n';
            });
            return txt.trim();
        };

        const txtMeetings = genLoop(meetEvts, snipMeet);
        const txtRehearsals = genLoop(rehEvts, snipReh);
        let final = lay.corpo;
        const mn = meses[parseInt(m)-1];
        final = final.replace(/\[mes_nome\]/gi, mn).replace(/\[ano\]/gi, ano).replace(/\[mes_ano\]/gi, `${mn} de ${ano}`);
        final = final.replace(/\[lista_reunioes\]/gi, txtMeetings);
        final = final.replace(/\[lista_ensaios\]/gi, txtRehearsals);
        if(final.includes('[lista_eventos]')) final = final.replace(/\[lista_eventos\]/gi, (txtMeetings + '\n\n' + txtRehearsals).trim());
        document.getElementById('resultado').value = final;
        showToast("Gerado!");
    };
    
    document.getElementById('btnCopiar').onclick = () => { const t=document.getElementById('resultado'); t.select(); navigator.clipboard.writeText(t.value); showToast("Copiado"); };
    document.getElementById('btnLimparGerador').onclick = () => document.getElementById('resultado').value='';

    auth.onAuthStateChanged(u => {
        if(u) { currentUser=u; loginContainer.style.display='none'; appContainer.style.display='block'; userDisplay.textContent=u.email; if(lastLoginDisplay) lastLoginDisplay.textContent=new Date(u.metadata.lastSignInTime).toLocaleDateString(); carregarDadosIniciais(); db.collection(COLECOES.eventos).onSnapshot(s => { eventosDB=[]; s.forEach(d=>eventosDB.push({id:d.id,...d.data()})); renderizarLista(eventosDB); }); } else { loginContainer.style.display='flex'; appContainer.style.display='none'; }
    });
    loginForm.onsubmit=async(e)=>{e.preventDefault(); try{await auth.signInWithEmailAndPassword(document.getElementById('login-email').value, document.getElementById('login-password').value);}catch(e){showToast(e.message,true);}};
    document.getElementById('btn-logout').onclick=()=>auth.signOut();
    document.getElementById('toggle-password').onclick=()=>{const i=document.getElementById('login-password'); i.type=i.type==='password'?'text':'password';};
    document.getElementById('forgot-password').onclick=async()=>{const m=document.getElementById('login-email').value; if(!m)return; await auth.sendPasswordResetEmail(m); showToast("Enviado");};
    navButtons.forEach(b => b.onclick = () => { navButtons.forEach(x=>x.classList.remove('ativa')); paginas.forEach(x=>x.classList.remove('ativa')); b.classList.add('ativa'); document.getElementById(b.id.replace('btnNav','pagina').replace('Config','Configuracoes')).classList.add('ativa'); if(b.id==='btnNavConfig') loadSettings('cidades'); if(b.id==='btnNavTemplates') renderTemplates(); });
    const av=document.getElementById('profile-avatar-btn'), dr=document.getElementById('profile-dropdown');
    av.onclick=()=>dr.classList.toggle('show'); window.onclick=(e)=>{if(!av.contains(e.target)&&!dr.contains(e.target))dr.classList.remove('show')};
    document.getElementById('checkLinkExterno').addEventListener('change', (e) => document.getElementById('linkExternoWrapper').style.display = e.target.checked ? 'block' : 'none');

// --- REGISTRO PWA (NOVO) ---
    if ('serviceWorker' in navigator) {
        window.addEventListener('load', () => {
            navigator.serviceWorker.register('/service-worker.js')
                .then(registration => {
                    console.log('SW registrado com sucesso:', registration.scope);
                })
                .catch(err => {
                    console.log('Falha no registro do SW:', err);
                });
        });
    }
}); // ESTE CHAVE DEVE SER A ÚLTIMA LINHA DO ARQUIVO