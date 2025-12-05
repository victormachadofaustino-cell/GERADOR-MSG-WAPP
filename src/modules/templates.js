// src/modules/templates.js

// 1. IMPORTAÇÕES NECESSÁRIAS
import { db, COLECOES } from '../services/firebase-api.js';
import { 
    showToast, 
    showConfigModal, 
    hideConfigModal, 
    showDeleteModal, 
    hideDeleteModal 
} from '../services/helpers.js';

// 2. CONSTANTES DE VARIÁVEIS (Para mostrar no editor)
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

// 3. VARIÁVEL DE ESTADO
let templatesDB = [];


// 4. FUNÇÃO CORE: RENDERIZAR A LISTA DE TEMPLATES
export async function renderTemplates() {
    const ul = document.getElementById('config-list-templates'); 
    ul.innerHTML = '<li>Carregando...</li>';
    
    try {
        const snap = await db.collection(COLECOES.templates).orderBy('nome').get();
        ul.innerHTML = ''; 
        templatesDB.length = 0;
        
        snap.forEach(d => { 
            templatesDB.push({id:d.id,...d.data()}); 
            
            const li = document.createElement('li'); 
            li.className = 'config-list-item';
            
            li.innerHTML = `
                <div class="config-item-text">
                    <span class="sigla">${d.data().nome}</span>
                    <span class="titulo">${d.data().tipo}</span>
                </div>
                <div class="config-item-actions">
                    <button class="btn-edit btn-icon" data-id="${d.id}">✏️</button>
                    <button class="btn-delete btn-icon" data-id="${d.id}">🗑️</button>
                </div>`;
            ul.appendChild(li); 
        });
        
    } catch (error) {
        showToast("Erro ao carregar templates: " + error.message, true);
        ul.innerHTML = '<li style="padding:20px; color:#dc3545;">Falha ao carregar templates.</li>';
    }
}


// 5. FUNÇÃO CORE: EDITOR DE TEMPLATE (Modal)
function editorTpl(c, d = {}) {
    const isLayout = d.tipo === 'layout';
    
    // HTML base do modal
    c.innerHTML = `
        <div class="form-group"><label>Nome</label><input id="tm-n" value="${d.nome||''}"></div>
        <div class="form-group"><label>Tipo</label><select id="tm-t">
            <option value="layout">Layout</option>
            <option value="componente">Snippet</option>
            <option value="botao_lembrete">Botão Lembrete</option>
            <option value="botao_convite">Botão Convite</option>
        </select></div>
        
        <div class="form-group" id="grp-snip-meet" style="display:${isLayout?'block':'none'}"><label>Snippet de Reuniões 👔</label><select id="tm-s1"></select></div>
        <div class="form-group" id="grp-snip-reh" style="display:${isLayout?'block':'none'}"><label>Snippet de Ensaios 🎵</label><select id="tm-s2"></select></div>
        
        <div class="form-group"><label>Corpo</label>
            <div class="format-toolbar">
                <button data-f="*">B</button>
                <button data-f="_">I</button>
            </div>
            <textarea id="tm-c" rows="8">${d.corpo||''}</textarea>
        </div>
        <div id="tm-v" style="font-size:0.8em; color:blue; cursor:pointer; padding-top: 10px;"></div>
    `;

    const sT = c.querySelector('#tm-t');
    const s1 = c.querySelector('#tm-s1'); 
    const s2 = c.querySelector('#tm-s2');
    
    if(d.tipo) sT.value = d.tipo;
    
    // Popula selects de Snippets disponíveis (apenas templates tipo 'componente')
    const snips = templatesDB.filter(x => x.tipo === 'componente');
    s1.add(new Option('-- Selecione --', '')); 
    s2.add(new Option('-- Selecione --', ''));
    snips.forEach(x => { 
        s1.add(new Option(x.nome, x.id)); 
        s2.add(new Option(x.nome, x.id)); 
    });
    
    if(d.snippet_meeting_ref) s1.value = d.snippet_meeting_ref;
    if(d.snippet_rehearsal_ref) s2.value = d.snippet_rehearsal_ref;
    
    // Função para atualizar as variáveis de ajuda e visibilidade dos selects
    const upd = () => {
         const isLay = sT.value === 'layout';
         c.querySelector('#grp-snip-meet').style.display = isLay ? 'block' : 'none';
         c.querySelector('#grp-snip-reh').style.display = isLay ? 'block' : 'none';
         
         const dict = isLay ? VARIAVEIS_LAYOUT : VARIAVEIS_SNIPPET;
         const dv = c.querySelector('#tm-v');
         
         dv.innerHTML = Object.keys(dict).map(k => 
             `<span style="margin-right:5px; border:1px solid #ccc; padding:2px">${k}</span>`
         ).join('');
         
         // Adiciona funcionalidade de clique nas variáveis para inserção no textarea
         dv.querySelectorAll('span').forEach(s => s.onclick = () => { 
             const ta = c.querySelector('#tm-c'); 
             ta.setRangeText(s.textContent, ta.selectionStart, ta.selectionEnd, 'end'); 
             ta.focus(); 
         });
    };
    
    sT.onchange = upd; 
    upd(); // Executa na abertura para configurar corretamente

    // Listeners para botões de formatação (* negrito, _ itálico)
    c.querySelectorAll('button[data-f]').forEach(b => b.onclick = (e) => {
        e.preventDefault(); 
        const f = b.dataset.f, t = c.querySelector('#tm-c'), p = t.selectionStart; 
        t.setRangeText(`${f}${t.value.substring(p,t.selectionEnd)}${f}`, p, t.selectionEnd, 'select');
    });
}


// 6. FUNÇÃO CORE: SALVAR TEMPLATE
async function saveTpl(id) {
    const pl = { 
        nome: document.getElementById('tm-n').value, 
        tipo: document.getElementById('tm-t').value, 
        corpo: document.getElementById('tm-c').value, 
        snippet_meeting_ref: document.getElementById('tm-s1').value || null, 
        snippet_rehearsal_ref: document.getElementById('tm-s2').value || null 
    };
    
    try {
        if(id) {
            await db.collection(COLECOES.templates).doc(id).update(pl); 
            showToast("Template Atualizado!");
        } else {
            await db.collection(COLECOES.templates).add(pl);
            showToast("Novo Template Salvo!");
        }
        
        hideConfigModal(); 
        renderTemplates(); // Recarrega a lista
        
    } catch (error) {
        showToast("Erro ao salvar template: " + error.message, true);
    }
}


// 7. INICIALIZAÇÃO DE LISTENERS DO MÓDULO TEMPLATES
export function initTemplatesListeners() { // CORRIGIDO
    
    document.getElementById('paginaTemplates').addEventListener('click', async (e) => {
        const b = e.target.closest('button'); 
        if(!b) return; 
        const id = b.dataset.id;
        
        // Listener: Adicionar Novo Template
        if(b.id === 'btn-add-template') {
            showConfigModal('Novo Template', c => editorTpl(c), async () => { saveTpl(); });
        }
        
        // Listener: Excluir Template
        if(b.classList.contains('btn-delete')) {
            showDeleteModal("Template", async () => {
                await db.collection(COLECOES.templates).doc(id).delete(); 
                showToast("Apagado"); 
                hideDeleteModal(); 
                renderTemplates();
            });
        }
        
        // Listener: Editar Template
        if(b.classList.contains('btn-edit')) { 
            const t = templatesDB.find(x => x.id === id); 
            if (!t) return showToast("Template não encontrado no cache.", true);
            showConfigModal('Editar Template', c => editorTpl(c, t), async () => { saveTpl(id); });
        }
    });
}