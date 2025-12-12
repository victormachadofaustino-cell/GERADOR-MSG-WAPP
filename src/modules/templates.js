// src/modules/templates.js

import { INSTANCES, COLECOES } from '../services/firebase.js';
import * as Helpers from '../services/helpers.js';

const VARIAVEIS_LAYOUT = {
    '[mes_nome]': 'Nome do mês (Ex: Março)',
    '[ano]': 'Ano (Ex: 2025)',
    '[mes_ano]': 'Mês/Ano (Ex: Março de 2025)',
    '[lista_reunioes]': 'Lista de reuniões (gerada a partir do snippet)',
    '[lista_ensaios]': 'Lista de ensaios (gerada a partir do snippet)',
    '[lista_eventos]': 'Lista geral de eventos (reuniões + ensaios)'
};

const VARIAVEIS_SNIPPET = {
    '[dia_semana]': 'Dia da semana (Dom, Seg, ...)',
    '[data]': 'Data (25/03)',
    '[hora]': 'Hora (19:30)',
    '[sigla]': 'Sigla do evento (ex: SN)',
    '[titulo]': 'Título completo',
    '[desc_data]': 'Descrição da data (1ª Semana, Última Semana...)',
    '[cidade]': 'Cidade',
    '[local]': 'Comum',
    '[local_detalhe]': 'Detalhe do local (Sala, Andar...)',
    '[publico]': 'Participantes (grupo)',
    '[quantidade]': 'Quantidade estimada',
    '[link]': 'Link externo',
    '[observacoes]': 'Observações',
};

let templatesDB = [];

function gerarChipsVariaveis(tipoAtual) {
    const vars = (tipoAtual === 'layout') ? VARIAVEIS_LAYOUT : VARIAVEIS_SNIPPET;
    let html = '<div class="chips-variaveis">';
    Object.entries(vars).forEach(([token, desc]) => {
        html += `<button type="button" class="chip-var" data-token="${token}" title="${desc}">${token}</button>`;
    });
    html += '</div>';
    return html;
}

function initChipsVariaveis() {
    const textarea = document.getElementById('tpl-corpo');
    if (!textarea) return;

    document
        .querySelectorAll('#config-modal .chip-var')
        .forEach(btn => {
            btn.onclick = () => {
                const token = btn.dataset.token;
                const start = textarea.selectionStart;
                const end = textarea.selectionEnd;
                const value = textarea.value;
                textarea.value = value.slice(0, start) + token + value.slice(end);
                textarea.focus();
                textarea.selectionStart = textarea.selectionEnd = start + token.length;
            };
        });
}

export async function renderTemplates() {
    const db = INSTANCES.db;
    if (!db) return;

    const ul = document.getElementById('lista-templates');
    if (!ul) return;

    ul.innerHTML = '<li>Carregando...</li>';

    try {
        const snap = await db.collection(COLECOES.templates).orderBy('nome').get();
        ul.innerHTML = '';
        templatesDB.length = 0;

        snap.forEach(d => {
            const data = d.data();
            const id = d.id;
            templatesDB.push({ id, ...data });

            const li = document.createElement('li');
            li.className = 'accordion-item';

            li.innerHTML = `
                <div class="accordion-header" data-id="${id}" data-key="templates">
                    <div class="accordion-title">
                        <span class="sigla">${data.nome || 'Sem nome'}</span>
                        <span class="titulo">${data.tipo || 'sem tipo'}</span>
                    </div>
                    <span class="accordion-toggle-icon">▶</span>
                </div>
                <div class="accordion-content">
                    <div class="accordion-content-inner">
                        <div style="display:flex;gap:8px;">
                            <button class="btn-edit" data-id="${id}" data-key="templates">✏️</button>
                            <button class="btn-delete" data-id="${id}" data-key="templates">🗑️</button>
                        </div>
                    </div>
                </div>`;

            ul.appendChild(li);
        });

        if (templatesDB.length === 0) {
            ul.innerHTML = '<li style="padding:20px; color:#777; text-align:center;">Nenhum template cadastrado.</li>';
        }
    } catch (error) {
        console.error('Erro ao carregar templates:', error);
        Helpers.showToast('Erro ao carregar templates: ' + error.message, true);
        ul.innerHTML = '<li style="padding:20px; color:#dc3545;">Falha ao carregar templates.</li>';
    }
}

function editorTpl(container, doc = {}) {
    const tipoAtual = doc.tipo || 'layout';

    const componentes = templatesDB.filter(t => t.tipo === 'componente');
    let optionsComponentes = '<option value="">-- Nenhum --</option>';
    componentes.forEach(t => {
        optionsComponentes += `<option value="${t.id}">${t.nome}</option>`;
    });

    container.innerHTML = `
        <div class="form-group">
            <label for="tpl-nome">Nome</label>
            <input id="tpl-nome" type="text" value="${doc.nome || ''}" placeholder="Ex: [SN] - Reuniões Regionais">
        </div>

        <div class="form-group">
            <label for="tpl-tipo">Tipo</label>
            <select id="tpl-tipo">
                <option value="layout" ${tipoAtual === 'layout' ? 'selected' : ''}>Layout (agenda completa)</option>
                <option value="componente" ${tipoAtual === 'componente' ? 'selected' : ''}>Componente / Snippet</option>
                <option value="botao_convite" ${tipoAtual === 'botao_convite' ? 'selected' : ''}>Botão Convite</option>
                <option value="botao_lembrete" ${tipoAtual === 'botao_lembrete' ? 'selected' : ''}>Botão Lembrete</option>
            </select>
        </div>

        <div id="tpl-area-snippets" style="${tipoAtual === 'layout' ? '' : 'display:none;'}">
            <div class="form-group">
                <label for="tpl-snippet-meeting">Snippet para Reuniões</label>
                <select id="tpl-snippet-meeting">
                    ${optionsComponentes}
                </select>
            </div>

            <div class="form-group">
                <label for="tpl-snippet-rehearsal">Snippet para Ensaios</label>
                <select id="tpl-snippet-rehearsal">
                    ${optionsComponentes}
                </select>
            </div>
        </div>

        <div class="form-group">
            <label for="tpl-corpo">Corpo do template</label>
            <textarea id="tpl-corpo" rows="6" placeholder="Escreva o texto usando as variáveis entre colchetes.">${doc.corpo || ''}</textarea>
        </div>

        <div class="form-group">
            <label>Variáveis disponíveis</label>
            <small id="tpl-variaveis-descricao" style="display:block; margin-bottom:6px; color:#666;">
                ${tipoAtual === 'layout'
                    ? 'Use estas variáveis para montar o layout geral da agenda.'
                    : 'Use estas variáveis para montar cada linha (snippet) da agenda.'}
            </small>
            <div id="tpl-variaveis-container">
                ${gerarChipsVariaveis(tipoAtual)}
            </div>
        </div>
    `;

    if (tipoAtual === 'layout') {
        const selMeeting = document.getElementById('tpl-snippet-meeting');
        const selRehearsal = document.getElementById('tpl-snippet-rehearsal');
        if (selMeeting && doc.snippet_meeting_ref) selMeeting.value = doc.snippet_meeting_ref;
        if (selRehearsal && doc.snippet_rehearsal_ref) selRehearsal.value = doc.snippet_rehearsal_ref;
    }

    const selectTipo = document.getElementById('tpl-tipo');
    const areaSnippets = document.getElementById('tpl-area-snippets');
    const varDesc = document.getElementById('tpl-variaveis-descricao');
    const varContainer = document.getElementById('tpl-variaveis-container');

    if (selectTipo) {
        selectTipo.onchange = () => {
            const novoTipo = selectTipo.value;

            if (novoTipo === 'layout') {
                areaSnippets.style.display = '';
                varDesc.textContent = 'Use estas variáveis para montar o layout geral da agenda (cabeçalho + listas).';
            } else {
                areaSnippets.style.display = 'none';
                varDesc.textContent = 'Use estas variáveis para montar cada linha (snippet) da agenda ou mensagem de botão.';
            }

            varContainer.innerHTML = gerarChipsVariaveis(novoTipo);
            initChipsVariaveis();
        };
    }

    initChipsVariaveis();
}

async function saveTpl(id) {
    const db = INSTANCES.db;
    if (!db) return;

    const nomeInput = document.getElementById('tpl-nome');
    const tipoSelect = document.getElementById('tpl-tipo');
    const corpoTextarea = document.getElementById('tpl-corpo');
    const selMeeting = document.getElementById('tpl-snippet-meeting');
    const selRehearsal = document.getElementById('tpl-snippet-rehearsal');

    if (!nomeInput || !tipoSelect || !corpoTextarea) {
        Helpers.showToast('Erro interno: campos do modal não encontrados.', true);
        return;
    }

    const nome = nomeInput.value.trim();
    const tipo = tipoSelect.value;
    const corpo = corpoTextarea.value.trim();

    if (!nome || !corpo) {
        Helpers.showToast('Preencha pelo menos Nome e Corpo do template.', true);
        return;
    }

    const data = {
        nome,
        tipo,
        corpo,
        snippet_ref: '',
        snippet_meeting_ref: '',
        snippet_rehearsal_ref: ''
    };

    if (tipo === 'layout' && selMeeting && selRehearsal) {
        data.snippet_meeting_ref = selMeeting.value || '';
        data.snippet_rehearsal_ref = selRehearsal.value || '';
    }

    try {
        if (id) {
            await db.collection(COLECOES.templates).doc(id).update(data);
            Helpers.showToast('Template atualizado com sucesso!');
        } else {
            await db.collection(COLECOES.templates).add(data);
            Helpers.showToast('Template criado com sucesso!');
        }

        Helpers.hideConfigModal();
        await renderTemplates();
    } catch (error) {
        console.error('Erro ao salvar template:', error);
        Helpers.showToast('Erro ao salvar template: ' + error.message, true);
    }
}

export function initTemplatesListeners() {
    const paginaTemplates = document.getElementById('pagina-templates');
    if (!paginaTemplates) return;

    paginaTemplates.addEventListener('click', async (e) => {
        const header = e.target.closest('.accordion-header');
        const btn = e.target.closest('button');

        if (header && !btn) {
            const item = header.closest('.accordion-item');
            const content = item.querySelector('.accordion-content');

            document
                .querySelectorAll('#lista-templates .accordion-item.ativa')
                .forEach(otherItem => {
                    if (otherItem !== item) {
                        otherItem.classList.remove('ativa');
                        const otherContent = otherItem.querySelector('.accordion-content');
                        if (otherContent) otherContent.style.maxHeight = 0;
                    }
                });

            const isActive = item.classList.toggle('ativa');
            if (isActive) {
                content.style.maxHeight = content.scrollHeight + 2 + 'px';
            } else {
                content.style.maxHeight = 0;
            }
        }

        if (!btn) return;

        const id = btn.dataset.id;

        if (btn.id === 'btn-novo-template') {
            Helpers.showConfigModal(
                'Novo Template',
                (c) => editorTpl(c, {}),
                async () => {
                    await saveTpl();
                }
            );
            return;
        }

        if (btn.classList.contains('btn-delete')) {
            Helpers.showDeleteModal('Template', async () => {
                try {
                    await INSTANCES.db.collection(COLECOES.templates).doc(id).delete();
                    Helpers.showToast('Template apagado.');
                    Helpers.hideDeleteModal();
                    await renderTemplates();
                } catch (err) {
                    console.error(err);
                    Helpers.showToast('Erro ao excluir template: ' + err.message, true);
                }
            });
            return;
        }

        if (btn.classList.contains('btn-edit')) {
            const t = templatesDB.find(x => x.id === id);
            if (!t) {
                Helpers.showToast('Template não encontrado no cache.', true);
                return;
            }

            Helpers.showConfigModal(
                'Editar Template',
                (c) => editorTpl(c, t),
                async () => {
                    await saveTpl(id);
                }
            );
        }
    });
}