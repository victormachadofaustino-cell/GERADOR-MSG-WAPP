// src/modules/templates.js

// 1. IMPORTAÇÕES NECESSÁRIAS
import { INSTANCES, COLECOES } from '../services/firebase-api.js'; // CRÍTICO: Importa INSTANCES
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
    const db = INSTANCES.db;
    if (!db) return; // Garante que o DB está pronto
    
    const ul = document.getElementById('config-list-templates'); 
    ul.innerHTML = '<li>Carregando...</li>';
    
    try {
        const snap = await db.collection(COLECOES.templates).orderBy('nome').get();
        ul.innerHTML = ''; 
        templatesDB.length = 0;
        
        snap.forEach(d => { 
            templatesDB.push({id:d.id,...d.data()}); 
            
            const li = document.createElement('li'); 
            li.className = 'accordion-item'; // Usando estilo Accordion para Templates
            
            li.innerHTML = `
                <div class="accordion-header" data-id="${d.id}" data-key="templates">
                    <div class="accordion-title">
                        <span class="sigla">${d.data().nome}</span>
                        <span class="titulo">${d.data().tipo}</span>
                    </div>
                    <span class="accordion-toggle-icon">▶</span>
                </div>
                <div class="accordion-content">
                    <div class="accordion-content-inner">
                        <button class="btn-edit secundario" data-id="${d.id}" data-key="templates">✏️ Editar</button>
                        <button class="btn-delete perigo" data-id="${d.id}" data-key="templates">🗑️ Excluir</button>
                    </div>
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
    // ... (Mantida a lógica de editorTpl) ...
}


// 6. FUNÇÃO CORE: SALVAR TEMPLATE
async function saveTpl(id) {
    const db = INSTANCES.db;
    if (!db) return; // Garante que o DB está pronto

    // ... (Mantida a lógica de saveTpl) ...
}


// 7. INICIALIZAÇÃO DE LISTENERS DO MÓDULO TEMPLATES
export function initTemplatesListeners() { 
    
    document.getElementById('paginaTemplates').addEventListener('click', async (e) => {
        const header = e.target.closest('.accordion-header');
        const btn = e.target.closest('button'); 
        
        if (header && !btn) {
            const item = header.closest('.accordion-item');
            const content = item.querySelector('.accordion-content');
            
            // Fecha todos os outros
            document.querySelectorAll('#config-list-templates .accordion-item.ativa').forEach(otherItem => {
                if (otherItem !== item) {
                    otherItem.classList.remove('ativa');
                    otherItem.querySelector('.accordion-content').style.maxHeight = 0;
                }
            });

            // Toggle do item clicado
            const is_active = item.classList.toggle('ativa');
            if (is_active) {
                content.style.maxHeight = content.scrollHeight + 2 + "px"; 
            } else {
                content.style.maxHeight = 0;
            }
        }
        
        // Listener: Botões (Adicionar, Editar, Excluir)
        if(btn) { 
            const id = btn.dataset.id;
            
            // Listener: Adicionar Novo Template
            if(btn.id === 'btn-add-template') {
                showConfigModal('Novo Template', c => editorTpl(c), async () => { saveTpl(); });
            }
            
            // Listener: Excluir Template
            if(btn.classList.contains('btn-delete')) {
                showDeleteModal("Template", async () => {
                    await INSTANCES.db.collection(COLECOES.templates).doc(id).delete(); 
                    showToast("Apagado"); 
                    hideDeleteModal(); 
                    renderTemplates();
                });
            }
            
            // Listener: Editar Template
            if(btn.classList.contains('btn-edit')) { 
                const t = templatesDB.find(x => x.id === id); 
                if (!t) return showToast("Template não encontrado no cache.", true);
                showConfigModal('Editar Template', c => editorTpl(c, t), async () => { saveTpl(id); });
            }
        }
    });
}