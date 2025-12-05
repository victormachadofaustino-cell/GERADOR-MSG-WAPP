// src/modules/settings.js

// 1. IMPORTAÇÕES NECESSÁRIAS
import { db, COLECOES } from '../services/firebase-api.js';
import * as DOM from './dom-elements.js';
import { 
    showToast, 
    showConfigModal, 
    hideConfigModal, 
    showDeleteModal, 
    hideDeleteModal 
} from '../services/helpers.js';

// 2. VARIÁVEIS DE ESTADO DO MÓDULO
const CONFIG = {
    'cidades': { col: COLECOES.cidades, t:'Cidades', f:['nome'] },
    'comuns': { col: COLECOES.comuns, t:'Comuns', f:['nome'] },
    'participantes': { col: COLECOES.participantes, t:'Participantes', f:['grupo'] },
    'publicos_alvo': { col: COLECOES.publicos_alvo, t:'Públicos', f:['nome'] },
    'realizacoes': { col: COLECOES.realizacoes, t:'Locais', f:['nome'] },
    'titulos': { col: COLECOES.eventos_titulos, t:'Títulos', f:['sigla'] }
};

let currentSettingsTab = null;
let cidadesDB = []; 
let titulosDB = []; 


// 3. FUNÇÃO CORE: CARREGAR LISTAS DE CONFIGURAÇÃO (loadSettings)
export async function loadSettings(key) {
    if (!key) return;
    
    const cfg = CONFIG[key]; 
    currentSettingsTab = key;

    document.getElementById('settings-title').textContent = cfg.t;
    document.getElementById('btn-settings-add').textContent = `+ Novo ${cfg.t.slice(0, -1)}`; 
    
    document.querySelectorAll('.settings-sidebar .nav-btn').forEach(b=>b.classList.remove('ativa'));
    document.querySelector(`.settings-sidebar button[data-target="${key}"]`)?.classList.add('ativa');
    
    DOM.settingsList.innerHTML = '<li>Carregando...</li>';
    
    try {
        const snap = await db.collection(cfg.col).get(); 
        DOM.settingsList.innerHTML = '';
        
        if(snap.empty) { document.getElementById('btn-settings-add').style.display = 'inline-block'; DOM.settingsList.innerHTML='<li style="padding:15px">Vazio.</li>'; return; }
        
        let arr = []; snap.forEach(d=>arr.push({id:d.id,...d.data()}));
        arr.sort((a,b) => (a[cfg.f[0]] > b[cfg.f[0]]) ? 1 : -1);
        
        // Atualiza cache interno se este for o módulo de origem
        if(key === 'cidades') cidadesDB = arr;
        if(key === 'titulos') titulosDB = arr;

        document.getElementById('btn-settings-add').style.display = 'inline-block';

        arr.forEach(d => {
            let p = d.nome || d.grupo || d.sigla; 
            let s = '';
            
            // LÓGICA DE REFERÊNCIA CRUZADA
            if(key === 'comuns') { 
                const c = cidadesDB.find(x => x.id === d.cidade_ref); 
                s = c ? c.nome : 'Cidade não encontrada'; 
            }
            if(key === 'participantes') s = d.quantidade_media;
            if(key === 'titulos') s = d.titulo;
            
            const li = document.createElement('li'); li.className='config-list-item';
            // Novo atributo para permitir seleção de texto
            li.setAttribute('draggable', 'true'); 
            
            li.innerHTML = `
                <div class="config-item-text">
                    <span class="sigla">${p}</span>
                    ${s?`<span class="titulo">${s}</span>`:''}
                </div>
                <div class="config-item-actions">
                    <button class="btn-edit btn-icon secundario" data-id="${d.id}" data-key="${key}">✏️</button>
                    <button class="btn-delete btn-icon perigo" data-id="${d.id}" data-key="${key}">🗑️</button>
                </div>`;
            DOM.settingsList.appendChild(li);
        });

    } catch (error) {
        showToast("Erro ao carregar configurações: " + error.message, true);
    }
}


// 4. LÓGICA DO MODAL: ADICIONAR ITEM (btn-settings-add)
async function handleAdd(k) {
    if(k === 'comuns') {
        let opts = ''; 
        if (cidadesDB.length === 0) return showToast("Carregue as cidades primeiro (navegue para Cidades).", true);
        
        cidadesDB.forEach(c => opts += `<option value="${c.id}">${c.nome}</option>`);

        showConfigModal('Nova Comum', c => c.innerHTML = `
            <div class="form-group"><label>Nome</label><input id="f0"></div>
            <div class="form-group"><label>Cidade</label><select id="f1">${opts}</select></div>`, 
        async () => {
            try {
                await db.collection(COLECOES.comuns).add({
                    nome: document.getElementById('f0').value, 
                    cidade_ref: document.getElementById('f1').value
                });
                showToast("Comum Salva!"); hideConfigModal(); loadSettings(k);
            } catch (e) { showToast("Erro ao adicionar: " + e.message, true); }
        });
    } else if(k === 'titulos') {
         showConfigModal('Novo Título', c => c.innerHTML = `
            <div class="form-group"><label>Sigla</label><input id="f0"></div>
            <div class="form-group"><label>Título</label><textarea id="f1" rows="3"></textarea></div>`, // Ajustado para textarea
        async () => {
            try {
                await db.collection(COLECOES.eventos_titulos).add({
                    sigla: document.getElementById('f0').value, 
                    titulo: document.getElementById('f1').value
                });
                showToast("Título Salvo!"); hideConfigModal(); loadSettings(k);
            } catch (e) { showToast("Erro ao adicionar: " + e.message, true); }
        });
    } else if(k === 'participantes') {
        showConfigModal('Novo Grupo', c => c.innerHTML = `
            <div class="form-group"><label>Grupo</label><input id="f0"></div>
            <div class="form-group"><label>Qtd Média</label><input id="f1" type="number"></div>`, 
        async () => {
            try {
                await db.collection(COLECOES.participantes).add({
                    grupo: document.getElementById('f0').value, 
                    quantidade_media: document.getElementById('f1').value
                });
                showToast("Grupo Salvo!"); hideConfigModal(); loadSettings(k);
            } catch (e) { showToast("Erro ao adicionar: " + e.message, true); }
        });
    } else {
         showConfigModal('Novo Item', c => c.innerHTML = `<div class="form-group"><label>Nome</label><input id="f0"></div>`, 
        async () => {
            try {
                await db.collection(CONFIG[k].col).add({
                    nome: document.getElementById('f0').value
                });
                showToast("Item Salvo!"); hideConfigModal(); loadSettings(k);
            } catch (e) { showToast("Erro ao adicionar: " + e.message, true); }
        });
    }
}


// 5. LÓGICA DO MODAL: EDITAR E EXCLUIR ITEM
async function handleEditDelete(b, k, id) {
    if(b.classList.contains('btn-delete')) {
        showDeleteModal("Item", async () => { 
            try {
                await db.collection(CONFIG[k].col).doc(id).delete(); 
                showToast("Excluído com sucesso!"); 
                hideDeleteModal(); 
                loadSettings(k); 
            } catch (e) { showToast("Erro ao excluir: " + e.message, true); }
        });
    }
    
    if(b.classList.contains('btn-edit')) {
        const doc = await db.collection(CONFIG[k].col).doc(id).get();
        if (!doc.exists) return showToast("Documento não encontrado.", true);
        const d = doc.data();
        
        let h = `<div class="form-group"><label>Nome / Sigla / Grupo</label><input id="ed0" value="${d.nome||d.grupo||d.sigla}"></div>`;
        
        if(k === 'titulos') {
            // AQUI: Usando textarea para maior conforto e rows=5 para aumentar o espaço
            h += `<div class="form-group"><label>Titulo Extenso</label><textarea id="ed1" rows="5">${d.titulo}</textarea></div>`;
        }
        if(k === 'participantes') {
            h += `<div class="form-group"><label>Qtd Média</label><input id="ed1" type="number" value="${d.quantidade_media}"></div>`;
        }
        
        showConfigModal(`Editar ${k}`, c => c.innerHTML = h, async () => {
            try {
                let pl = { [d.nome?'nome':(d.grupo?'grupo':'sigla')]: document.getElementById('ed0').value };
                
                if(k === 'titulos') pl.titulo = document.getElementById('ed1').value;
                if(k === 'participantes') pl.quantidade_media = document.getElementById('ed1').value;
                
                if(k === 'comuns' && d.cidade_ref) pl.cidade_ref = d.cidade_ref;

                await db.collection(CONFIG[k].col).doc(id).update(pl);
                showToast("Atualizado com sucesso!"); 
                hideConfigModal(); 
                loadSettings(k);
            } catch (e) { showToast("Erro ao atualizar: " + e.message, true); }
        });
    }
}


// 6. INICIALIZAÇÃO DE LISTENERS DO MÓDULO
export function initSettingsListeners(cidadesData, titulosData) {
    cidadesDB = cidadesData; 
    titulosDB = titulosData;

    // Listener: Sidebar Clicks (Mudar de categoria)
    document.querySelector('.settings-sidebar').addEventListener('click', e => { 
        const b = e.target.closest('.nav-btn'); 
        if(b) loadSettings(b.dataset.target); 
    });
    
    // Listener: Botão Adicionar Item
    document.getElementById('btn-settings-add').onclick = () => {
        const k = currentSettingsTab; 
        if(!k) return showToast("Selecione uma categoria primeiro.", true);
        handleAdd(k);
    };

    // Listener: Botões Editar/Excluir na Lista
    DOM.settingsList.addEventListener('click', async (e) => {
        const b = e.target.closest('button'); 
        if(!b) return; // Garante que só processa cliques em botões
        
        const k = b.dataset.key; 
        const id = b.dataset.id;
        
        handleEditDelete(b, k, id);
    });
}