// src/modules/generator.js

// 1. IMPORTAÇÕES NECESSÁRIAS
import { INSTANCES, COLECOES } from '../services/firebase-api.js'; // CRÍTICO: Importa INSTANCES
import * as DOM from './dom-elements.js';
import * as Helpers from './helpers.js'; 

// Variáveis de Módulo (Devem ser atualizadas pelo main.js no modelo final)
let eventosDB = []; 
let publicosAlvoDB = [];
let templatesDB = [];

// Constantes de Variáveis (para Template Editor - TPL)
const VARIAVEIS_LAYOUT = { 
    '[mes_nome]':'Mês', '[ano]':'Ano', '[mes_ano]':'Mês/Ano', 
    '[lista_reunioes]':'Lista Reuniões', '[lista_ensaios]':'Lista Ensaios'
};
const VARIAVEIS_SNIPPET = {
    '\\[dia_semana\\]':'Dia', '\\[data\\]':'Data', '\\[hora\\]':'Hora', 
    '\\[sigla\\]':'Sigla', '\\[titulo\\]':'Título', '\\[desc_data\\]':'Desc. Data', '\\[cidade\\]':'Cidade', 
    '\\[local\\]':'Comum', '\\[local_detalhe\\]':'Sala', '\\[publico\\]':'Participantes', 
    '\\[quantidade\\]':'Qtd', '\\[link\\]':'Link', '\\[observacoes\\]':'Obs'
};
const meses = ['Janeiro', 'Fevereiro', 'Março', 'Abril', 'Maio', 'Junho', 'Julho', 'Agosto', 'Setembro', 'Outubro', 'Novembro', 'Dezembro'];


// 2. FUNÇÕES DE CARREGAMENTO DE SELECTS
export async function carregarGeradorSelects() {
    // CRÍTICO: Usar INSTANCES.db
    const db = INSTANCES.db;
    if (!db) return;

    // Busca Pública (para select_publico)
    const sp = await db.collection(COLECOES.publicos_alvo).orderBy('nome').get();
    publicosAlvoDB.length = 0;
    if (DOM.selectPublicoGerador) { 
        DOM.selectPublicoGerador.innerHTML = '<option value="">-- Selecione --</option>';
        sp.forEach(d => {
            publicosAlvoDB.push({id:d.id, ...d.data()});
            DOM.selectPublicoGerador.add(new Option(d.data().nome, d.id));
        });
    }
    
    // Busca Templates (para select_template - Apenas Layouts)
    const st = await db.collection(COLECOES.templates).orderBy('nome').get();
    templatesDB.length = 0;
    if (DOM.selectTemplateGerador) { 
        DOM.selectTemplateGerador.innerHTML = '<option value="">-- Selecione --</option>';
        st.forEach(d => {
            templatesDB.push({id:d.id, ...d.data()});
            if(d.data().tipo === 'layout') {
                DOM.selectTemplateGerador.add(new Option(d.data().nome, d.id));
            }
        });
    }
    
    // Preenche o campo Mês/Ano (Ex: 2025-11)
    const dataAtual = new Date();
    const mesAtual = (dataAtual.getMonth() + 1).toString().padStart(2, '0');
    const anoAtual = dataAtual.getFullYear();
    if (DOM.mesAnoRef) { 
        DOM.mesAnoRef.value = `${anoAtual}-${mesAtual}`;
    }
}


// 3. FUNÇÃO CORE: GERAR MENSAGEM EM MASSA
function gerarMensagemMassa(e) {
    e.preventDefault(); 
    
    const mes = DOM.mesAnoRef.value; 
    const pub = DOM.selectPublicoGerador.value;
    const tplId = DOM.selectTemplateGerador.value;
    
    if(!mes || !pub || !tplId) return Helpers.showToast("Preencha todos os campos do gerador", true);
    
    const lay = templatesDB.find(t=>t.id===tplId);
    const snipMeet = templatesDB.find(t=>t.id===lay?.snippet_meeting_ref); 
    const snipReh = templatesDB.find(t=>t.id===lay?.snippet_rehearsal_ref); 
    
    if(!snipMeet && !snipReh) return Helpers.showToast("Layout sem snippets de Reunião e Ensaio configurados.", true);

    const [ano, m] = mes.split('-');
    
    // Filtra eventos pelo mês/ano e pelo Público-Alvo
    const allEvts = eventosDB.filter(ev => {
        const d = new Date(ev.data_hora); 
        const mm = (d.getMonth()+1).toString().padStart(2,'0'); 
        const a = d.getFullYear().toString();
        const hasPublico = (ev.publicos_alvo_refs || []).includes(pub); 
        return mm===m && a===ano && hasPublico;
    });
    
    if(allEvts.length===0) { 
        DOM.resultado.value="Nenhum evento encontrado para o público selecionado neste mês."; 
        return; 
    }

    const meetEvts = allEvts.filter(e => !e.tipo_evento_nome.toLowerCase().includes('ensaio')).sort((a,b)=>new Date(a.data_hora)-new Date(b.data_hora));
    const rehEvts = allEvts.filter(e => e.tipo_evento_nome.toLowerCase().includes('ensaio')).sort((a,b)=>new Date(a.data_hora)-new Date(b.data_hora));

    
    // Função para loop de geração de Snippets (Reunião ou Ensaio)
    const genLoop = (evList, snippet) => {
        if(!snippet || evList.length===0) return '';
        let txt = '';
        evList.forEach(ev => {
            let row = snippet.corpo;
            const d = Helpers.formatarDataHora(ev.data_hora); 
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
    
    // Substituição final no Layout
    let final = lay.corpo;
    const mn = meses[parseInt(m)-1];
    final = final.replace(/\[mes_nome\]/gi, mn).replace(/\[ano\]/gi, ano).replace(/\[mes_ano\]/gi, `${mn} de ${ano}`);
    final = final.replace(/\[lista_reunioes\]/gi, txtMeetings);
    final = final.replace(/\[lista_ensaios\]/gi, txtRehearsals);
    if(final.includes('[lista_eventos]')) final = final.replace(/\[lista_eventos\]/gi, (txtMeetings + '\n\n' + txtRehearsals).trim());
    
    DOM.resultado.value = final;
    Helpers.showToast("Mensagem Gerada!");
}


// 4. INICIALIZAÇÃO DE LISTENERS DO MÓDULO
export function initGeneratorListeners(eventosDB_ref, templatesDB_ref) {
    // 4.1 Atualiza as referências (estado global)
    eventosDB = eventosDB_ref; 
    templatesDB = templatesDB_ref;
    
    // 4.2 Botão Gerar Mensagem
    if(DOM.btnGerar) {
        DOM.btnGerar.onclick = gerarMensagemMassa; 
    }
    
    // 4.3 Botão Copiar
    const btnCopiar = document.getElementById('btnCopiar');
    if (btnCopiar) {
        btnCopiar.onclick = () => { 
            const t=DOM.resultado; 
            if (t) {
                navigator.clipboard.writeText(t.value)
                    .then(() => {
                        Helpers.showToast("Copiado para a área de transferência");
                    })
                    .catch(err => {
                        Helpers.showToast("Erro ao copiar: " + err, true);
                    }); 
            }
        };
    }
}

// 5. FUNÇÕES DE SUPORTE PARA OUTROS MÓDULOS (ex: Botões da Lista de Eventos)
export function gerarSnippetBotao(id, tipo, templatesDB_ref, eventosDB_ref) {
    templatesDB = templatesDB_ref;
    eventosDB = eventosDB_ref;
    
    const t = templatesDB.find(x=>x.tipo===tipo); 
    if(!t) return Helpers.showToast("Template de botão não encontrado.", true);
    
    const ev = eventosDB.find(x=>x.id===id); 
    if(!ev) return Helpers.showToast("Evento não encontrado.", true);
    
    const d = Helpers.formatarDataHora(ev.data_hora); 
    let txt = t.corpo;
    
    const map = { 
        '\\[sigla\\]':ev.titulo_sigla, '\\[titulo\\]':ev.titulo_nome, '\\[data\\]':d.data, '\\[hora\\]':d.hora, 
        '\\[dia_semana\\]':d.diaSemana, '\\[cidade\\]':ev.cidade_nome, '\\[local\\]':ev.comum_nome, 
        '\\[local_detalhe\\]':ev.realizacao_nome, 
        '\\[desc_data\\]':ev.desc_data, 
        '\\[link\\]':ev.link_externo, 
        '\\[observacoes\\]':ev.observacoes_extra 
    };
    
    for(const [k,v] of Object.entries(map)) txt = txt.replace(new RegExp(k,'gi'), v||'');
    
    if (DOM.resultado) DOM.resultado.value = txt; 
    
    const btnNavGerador = document.getElementById('btnNavGerador');
    if (btnNavGerador) {
        btnNavGerador.click(); // Navega para o módulo Gerador
    }
    Helpers.showToast("Snippet gerado, navegue para o módulo Gerador.");
}

// 6. FUNÇÃO DE ATUALIZAÇÃO DE ESTADO (Chamada pelo main.js)
export function updateGeneratorState(events, templates) {
    eventosDB = events;
    templatesDB = templates;
}