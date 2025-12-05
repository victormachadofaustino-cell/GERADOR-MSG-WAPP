// src/modules/events.js

// 1. IMPORTAÇÕES NECESSÁRIAS
import { db, COLECOES } from '../services/firebase-api.js';
import * as DOM from './dom-elements.js';
// CORREÇÃO: Importa TODAS as funções auxiliares como "Helpers"
import * as Helpers from '../services/helpers.js'; 
// NOVO: Importa a função de gerar snippet do Módulo Gerador
import { gerarSnippetBotao } from './generator.js'; 


// 2. VARIÁVEIS DE ESTADO DO MÓDULO (Devem ser importadas do main, mas aqui estão como placeholders)
let eventosDB = []; 
let cidadesDB = [];
let participantesDB = [];
let titulosDB = [];
let publicosAlvoDB = [];
let filtroAtual = 'todos';
// NOVA VARIAVEL PARA GUARDAR A REFERENCIA DOS TEMPLATES
let templatesRef = []; 


// 3. FUNÇÕES DE CARREGAMENTO E POPULAÇÃO DO FORMULÁRIO
export async function carregarDadosIniciais() {
    // FUNÇÃO QUE CARREGA CACHE E POPULA SELECTS
    const loadCache = async (col, arr) => { 
        const s=await db.collection(col).get(); arr.length=0; 
        s.forEach(d=>arr.push({id:d.id,...d.data()})); 
    };

    // Atualiza o estado interno (necessário para Edição/Exclusão)
    await Promise.all([
        loadCache(COLECOES.eventos_titulos, titulosDB), 
        loadCache(COLECOES.participantes, participantesDB),
        loadCache(COLECOES.cidades, cidadesDB),
    ]);

    const popSel = (id, arr, f) => {
        const el=document.getElementById(id); el.innerHTML='<option value="">-- Selecione --</option>';
        arr.sort((a,b)=>(a[f]>b[f])?1:-1); arr.forEach(i=>el.add(new Option(i[f], i.id)));
    };

    popSel('select_titulo', titulosDB, 'sigla'); 
    popSel('select_participantes', participantesDB, 'grupo');
    popSel('select_cidade', cidadesDB, 'nome');
    
    // Funções de Load Simples (Tipos de Evento, Realização)
    const loadSimples = async (col, id, f) => {
        const el=document.getElementById(id); const s=await db.collection(col).orderBy(f).get();
        el.innerHTML='<option value="">-- Selecione --</option>';
        s.forEach(d => { el.add(new Option(d.data()[f], d.id)); });
    };

    await Promise.all([
        loadSimples(COLECOES.eventos_tipos, 'select_tipo_evento', 'nome'), 
        loadSimples(COLECOES.realizacoes, 'select_realizacao', 'nome'),
    ]);
    
    // Implementação de Checklists de Público-Alvo (Ausente no index.html fornecido, mas mantido)
    // Se você deseja que os públicos-alvo sejam checklists, o HTML deve ser ajustado
    // como visto no index.html, ele não tem checklist, mas sim um select para o Gerador.
    // O código abaixo está aqui para o caso de você ter esquecido de enviar o HTML completo 
    // ou se isso for uma refatoração futura.
    // const chk = document.getElementById('checklist-publicos_alvo'); chk.innerHTML='';
    // const sp = await db.collection(COLECOES.publicos_alvo).orderBy('nome').get();
    // publicosAlvoDB.length = 0; 
    // sp.forEach(d => {
    //     publicosAlvoDB.push({id:d.id, ...d.data()});
    //     const l=document.createElement('label'); l.innerHTML=`<input type="checkbox" class="chk-publico-alvo" value="${d.id}"> ${d.data().nome}`;
    //     chk.appendChild(l);
    // });
}


// 4. LÓGICA DE RENDERIZAÇÃO DA LISTA DE EVENTOS
export function renderizarLista(eventos) {
    eventosDB = eventos; 
    const cont=document.getElementById('listaEventos'); 
    // const load=document.getElementById('statusLoading'); // Elemento 'statusLoading' não existe no HTML.
    cont.innerHTML='';
    let arr = eventos.sort((a,b)=>new Date(a.data_hora)-new Date(b.data_hora));
    
    // Filtro
    if(filtroAtual==='ensaios') arr=arr.filter(e=>e.tipo_evento_nome.toLowerCase().includes('ensaio'));
    else if(filtroAtual==='reunioes') arr=arr.filter(e=>!e.tipo_evento_nome.toLowerCase().includes('ensaio') && !e.is_extraordinaria);
    else if(filtroAtual==='extras') arr=arr.filter(e=>e.is_extraordinaria);
    
    if(arr.length===0) { 
        cont.innerHTML='<li>Nenhum evento encontrado.</li>'; 
        return; 
    }
    
    arr.forEach(ev => {
        const d = Helpers.formatarDataHora(ev.data_hora); // CORREÇÃO
        const isEnsaio = ev.tipo_evento_nome.toLowerCase().includes('ensaio');
        
        // CORRIGIDO: Usando a estrutura de lista padrão (event-list-item) do seu CSS
        const li = document.createElement('li'); li.className='event-list-item';
        
        li.innerHTML = `
            <div class="event-item-date">
                <span class="dia">${d.dia}</span>
                <span class="mes">${d.mesCurto}</span>
            </div>
            <div class="event-item-text">
                <span class="sigla">${ev.titulo_sigla || (isEnsaio?'Ensaio':'Reunião')} ${ev.is_extraordinaria?'[EXTRA]':''}</span>
                <span class="titulo">${ev.comum_nome} - ${d.hora}</span>
            </div>
            <div class="event-item-actions">
                <button class="btn-lembrete secundario" data-id="${ev.id}">Lembrete</button>
                <button class="btn-convite secundario" data-id="${ev.id}">Convite</button>
                <button class="btn-edit btn-icon secundario" data-id="${ev.id}">✏️</button>
                <button class="btn-delete btn-icon perigo" data-id="${ev.id}">🗑️</button>
            </div>`;
            
        cont.appendChild(li);
    });
}


// 5. LÓGICA PRINCIPAL DO MÓDULO (Listeners de Eventos, Formulário, CRUD)
export function initEventsListeners(templatesDB_ref) {
    // Armazena a referência dos templates
    templatesRef = templatesDB_ref;
    
    // Listener: Mapeamento de Data/Hora (Novo UX)
    DOM.inpData.addEventListener('change', (e) => { 
        // CORREÇÃO
        if(e.target.value) DOM.inpDescData.value = Helpers.calcularDescricaoData(new Date(e.target.value)); 
    });

    // Listener: Tipo de Evento (Oculta/Exibe campos para Ensaio)
    DOM.selTipo.addEventListener('change', (e) => {
        const txt = e.target.options[e.target.selectedIndex]?.text || '';
        const isEnsaio = txt.toLowerCase().includes('ensaio');
        // CORRIGIDO: allGroups agora é uma lista de elementos, e é percorrida
        DOM.allGroups.forEach(g => {
            if (g) g.style.display = isEnsaio ? 'none' : 'block';
        });
        
        if (isEnsaio) {
            // Limpa campos que não se aplicam a ensaios
            DOM.selSigla.value=''; DOM.inpTitulo.value='Ensaio Regional'; DOM.selParticipantes.value=''; DOM.inpQtd.value='';
            // CORREÇÃO: Checkbox e Textarea devem ser acessados diretamente.
            document.getElementById('is_extraordinaria').checked=false;
            document.getElementById('link_externo').value=''; 
            document.getElementById('observacoes_extra').value='';
            document.getElementById('select_realizacao').value='';
            document.getElementById('checkLinkExterno').checked=false;
            document.getElementById('linkExternoWrapper').style.display='none';
        } else {
            if(DOM.inpTitulo.value === 'Ensaio Regional') DOM.inpTitulo.value = '';
        }
    });

    // Listener: Seleção de Sigla (Preenche Título Automático)
    DOM.selSigla.addEventListener('change', (e) => { 
        const i=titulosDB.find(t=>t.id===e.target.value); 
        if(i) DOM.inpTitulo.value=i.titulo; 
    });

    // Listener: Seleção de Participantes (Preenche Quantidade Automática)
    DOM.selParticipantes.addEventListener('change', (e) => { 
        const p=participantesDB.find(x=>x.id===e.target.value); 
        DOM.inpQtd.value = p ? (p.quantidade_media||'') : ''; 
    });

    // Listener: Seleção de Cidade (Carrega Comuns)
    DOM.selCidade.addEventListener('change', async (e) => {
        const cidId = e.target.value;
        DOM.selComum.innerHTML = '<option>Carregando...</option>'; DOM.selComum.disabled = true;
        if (!cidId) { DOM.selComum.innerHTML = '<option value="">-- Selecione Cidade --</option>'; return; }
        try {
            const snap = await db.collection(COLECOES.comuns).where('cidade_ref', '==', cidId).get();
            DOM.selComum.innerHTML = '<option value="">-- Selecione --</option>';
            let arr = []; snap.forEach(d => arr.push({id:d.id, ...d.data()}));
            arr.sort((a,b)=>a.nome.localeCompare(b.nome));
            arr.forEach(c => DOM.selComum.add(new Option(c.nome, c.id)));
        } catch(err) { Helpers.showToast("Erro ao buscar comuns", true); } 
        finally { DOM.selComum.disabled = false; }
    });
    
    // Listener: Salvar/Atualizar Evento (CRUD)
    DOM.formEvento.addEventListener('submit', async (e) => {
        e.preventDefault();
        const btn=document.getElementById('btnAdicionarEvento'); btn.disabled=true; btn.innerText="Salvando...";
        try {
            const getTxt = (id) => { const el=document.getElementById(id); return el.options[el.selectedIndex]?.text||''; };
            const tipoNome = getTxt('select_tipo_evento');
            const isEnsaio = tipoNome.toLowerCase().includes('ensaio');

            if (!DOM.inpData.value || !DOM.inpHora.value) throw new Error("Data e Hora são obrigatórios.");
            const data_hora_final = `${DOM.inpData.value}T${DOM.inpHora.value}`; 

            const data = {
                data_hora: data_hora_final, 
                desc_data: DOM.inpDescData.value,
                link_externo: isEnsaio?'':document.getElementById('link_externo').value,
                observacoes_extra: isEnsaio?'':document.getElementById('observacoes_extra').value,
                is_extraordinaria: isEnsaio?false:document.getElementById('is_extraordinaria').checked,
                tipo_evento_ref: DOM.selTipo.value, tipo_evento_nome: tipoNome,
                cidade_ref: DOM.selCidade.value, cidade_nome: getTxt('select_cidade'),
                comum_ref: DOM.selComum.value, comum_nome: getTxt('select_comum'),
                realizacao_ref: isEnsaio?'':document.getElementById('select_realizacao').value,
                realizacao_nome: isEnsaio?'':getTxt('select_realizacao'),
                // CORREÇÃO: Público Alvo não é mais um checklist no HTML fornecido, 
                // mas usaremos o select_publico do gerador como público-alvo principal 
                // para evitar quebrar a lógica de filtro de massa do generator.js.
                // Se você deseja que os eventos tenham múltiplos públicos-alvo, o formulário HTML (events.html) 
                // precisa ter múltiplos checkboxes/tags.
                publicos_alvo_refs: [document.getElementById('select_publico').value].filter(Boolean)
            };
            
            if (!isEnsaio) {
                data.titulo_ref=DOM.selSigla.value; data.titulo_sigla=getTxt('select_titulo'); data.titulo_nome=DOM.inpTitulo.value;
                data.publico_ref=DOM.selParticipantes.value; data.publico_grupo=getTxt('select_participantes'); data.publico_qtd=DOM.inpQtd.value;
            } else {
                data.titulo_ref=''; data.titulo_sigla=''; data.titulo_nome='Ensaio Regional';
                data.publico_ref=''; data.publico_grupo=''; data.publico_qtd='';
            }

            const id = document.getElementById('eventoId').value;
            if(id) await db.collection(COLECOES.eventos).doc(id).update(data);
            else await db.collection(COLECOES.eventos).add(data);
            
            Helpers.showToast("Salvo!"); 
            document.getElementById('btnCancelarEdicao').click();
        } catch (err) { Helpers.showToast("Erro: "+err.message, true); }
        finally { btn.disabled=false; btn.innerText="Adicionar Novo Evento"; }
    });
    
    // Listener: Botões de Ação na Lista (Editar/Excluir/Template)
    document.getElementById('listaEventos').addEventListener('click', async (e) => {
        const btn = e.target.closest('button'); if(!btn) return;
        const id = btn.dataset.id;
        const ev = eventosDB.find(x=>x.id===id);
        
        if(btn.classList.contains('btn-delete')) {
            Helpers.showDeleteModal("Evento", async()=>{ 
                try {
                    await db.collection(COLECOES.eventos).doc(id).delete(); 
                    Helpers.showToast("Apagado"); 
                    Helpers.hideDeleteModal(); 
                } catch (err) { Helpers.showToast("Erro ao apagar: " + err.message, true); }
            });
        }
        
        if(btn.classList.contains('btn-edit')) {
            document.getElementById('eventoId').value = ev.id;
            
            if(ev.data_hora) {
                const [d, t] = ev.data_hora.split('T');
                DOM.inpData.value = d;
                DOM.inpHora.value = t;
            }
            DOM.inpDescData.value = ev.desc_data;
            document.getElementById('is_extraordinaria').checked = ev.is_extraordinaria;
            document.getElementById('link_externo').value = ev.link_externo||'';
            document.getElementById('observacoes_extra').value = ev.observacoes_extra||'';
            if(ev.link_externo) { 
                document.getElementById('checkLinkExterno').checked=true; 
                document.getElementById('linkExternoWrapper').style.display='block'; 
            } else {
                 document.getElementById('checkLinkExterno').checked=false; 
                 document.getElementById('linkExternoWrapper').style.display='none';
            }
            
            const tr = (eid,val) => { const el=document.getElementById(eid); el.value=val; el.dispatchEvent(new Event('change')); };
            tr('select_tipo_evento', ev.tipo_evento_ref); tr('select_cidade', ev.cidade_ref);
            setTimeout(()=>document.getElementById('select_comum').value=ev.comum_ref, 600);
            
            if(!ev.tipo_evento_nome.toLowerCase().includes('ensaio')) { 
                tr('select_titulo', ev.titulo_ref); tr('select_participantes', ev.publico_ref);
                tr('select_realizacao', ev.realizacao_ref);
                if(ev.publico_qtd) DOM.inpQtd.value = ev.publico_qtd;
            }
            
            // Lógica de pré-seleção do público alvo (Se fosse checklist)
            // const refs = ev.publicos_alvo_refs||[]; 
            // document.querySelectorAll('.chk-publico-alvo').forEach(c=>c.checked=refs.includes(c.value));
            document.getElementById('btnAdicionarEvento').innerText="Atualizar";
            document.getElementById('btnCancelarEdicao').style.display="inline-block";
            document.getElementById('btnNavGestao').click(); window.scrollTo(0,0); 
        }
        
        // NOVO: Lógica de Geração de Template (Convite/Lembrete)
        if(btn.classList.contains('btn-lembrete')) {
            gerarSnippetBotao(id, 'botao_lembrete', templatesRef, eventosDB);
        }
        if(btn.classList.contains('btn-convite')) {
            gerarSnippetBotao(id, 'botao_convite', templatesRef, eventosDB);
        }
    });

    // Listener: Cancelar Edição (Limpa o Formulário)
    document.getElementById('btnCancelarEdicao').onclick = () => {
        DOM.formEvento.reset(); 
        document.getElementById('eventoId').value=''; 
        document.getElementById('btnAdicionarEvento').innerText="Adicionar Novo Evento";
        document.getElementById('btnCancelarEdicao').style.display="none";
        // CORRIGIDO: allGroups agora é percorrida
        DOM.allGroups.forEach(g => {
            if(g) g.style.display='block';
        });
        document.getElementById('linkExternoWrapper').style.display='none';
        document.getElementById('checkLinkExterno').checked=false; // Limpa o checkbox
    };

    // Listener: Filtros da Lista
    document.getElementById('filter-container').querySelectorAll('button').forEach(b => {
        // CORRIGIDO: Adicionando o 'data-filtro' no elemento HTML
        if(b.id === 'filter-todos') b.dataset.filtro = 'todos';
        else if(b.id === 'filter-reunioes') b.dataset.filtro = 'reunioes';
        else if(b.id === 'filter-ensaios') b.dataset.filtro = 'ensaios';
        else if(b.id === 'filter-extra') b.dataset.filtro = 'extras';

        b.onclick = () => {
            document.querySelector('.filter-buttons .ativa').classList.remove('ativa'); 
            b.classList.add('ativa');
            filtroAtual = b.dataset.filtro; 
            renderizarLista(eventosDB);
        };
    });
}