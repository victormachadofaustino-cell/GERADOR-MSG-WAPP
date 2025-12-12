// src/modules/settings.js

import { INSTANCES, COLECOES } from '../services/firebase.js';
import * as Helpers from '../services/helpers.js';

// Estado do módulo
let currentCategory = 'cidades';
let cidadesCache = [];
let titulosCache = [];
let templatesLayoutCache = []; // cache de templates tipo "layout"

// ✅ Agora: comuns vinculadas a cidades
const CATEGORIES = {
  cidades: { collection: COLECOES.cidades, title: '🏙️ Cidades', field: 'nome', orderBy: 'nome' },

  comuns: {
    collection: COLECOES.comuns,
    title: '📍 Locais Comuns',
    field: 'nome',
    orderBy: 'nome',
    hasCityLink: true // ✅ novo
  },

  participantes: {
    collection: COLECOES.participantes,
    title: '👥 Participantes',
    field: 'grupo',
    orderBy: 'grupo'
  },

  publicos_alvo: {
    collection: COLECOES.publicos_alvo,
    title: '🎯 Públicos-Alvo',
    field: 'nome',
    orderBy: 'nome',
    hasTemplate: true
  },

  realizacoes: { collection: COLECOES.realizacoes, title: '🏛️ Locais de Realização', field: 'nome', orderBy: 'nome' },

  titulos: {
    collection: COLECOES.eventos_titulos,
    title: '📋 Títulos de Eventos',
    field: 'sigla',
    orderBy: 'sigla'
  }
};

// ===============================
// INICIALIZAÇÃO
// ===============================
export function initSettingsListeners(cidades, titulos) {
  cidadesCache = cidades || [];
  titulosCache = titulos || [];

  const navBtns = document.querySelectorAll('.settings-nav-btn');
  navBtns.forEach(btn => {
    btn.addEventListener('click', () => {
      const target = btn.dataset.target;
      if (!target) return;

      navBtns.forEach(b => b.classList.remove('active'));
      btn.classList.add('active');

      loadSettings(target);
    });
  });

  const btnAdd = document.getElementById('btn-settings-add');
  if (btnAdd) btnAdd.onclick = () => openSettingsModal();

  if (navBtns.length > 0) navBtns[0].classList.add('active');
}

// ===============================
// CARREGAR CATEGORIA
// ===============================
export async function loadSettings(category) {
  currentCategory = category;
  const config = CATEGORIES[category];
  if (!config) return;

  const db = INSTANCES.db;
  if (!db) return;

  const title = document.getElementById('settings-title');
  if (title) title.textContent = config.title;

  const btnAdd = document.getElementById('btn-settings-add');
  if (btnAdd) btnAdd.style.display = 'inline-block';

  if (config.hasTemplate) {
    await carregarTemplatesLayout();
  }

  // ✅ garantir cidades cache (para “Comuns” mostrar cidade)
  if (config.hasCityLink && (!cidadesCache || cidadesCache.length === 0)) {
    try {
      const snapC = await db.collection(COLECOES.cidades).orderBy('nome').get();
      cidadesCache = snapC.docs.map(d => ({ id: d.id, ...d.data() }));
    } catch (e) {
      console.warn('⚠️ Não consegui carregar cidades para vincular comuns:', e);
    }
  }

  try {
    const orderField = config.orderBy || config.field || 'nome';
    const snapshot = await db.collection(config.collection).orderBy(orderField).get();

    const items = [];
    snapshot.forEach(doc => items.push({ id: doc.id, ...doc.data() }));

    renderSettingsList(items, config);
  } catch (err) {
    console.error('Erro ao carregar configurações:', err);
    Helpers.showToast('Erro ao carregar: ' + err.message, true);
  }
}

// ===============================
// RENDERIZAR LISTA
// ===============================
function renderSettingsList(items, config) {
  const list = document.getElementById('settings-list');
  if (!list) return;

  list.innerHTML = '';

  if (items.length === 0) {
    list.innerHTML = '<li style="padding:16px;color:#999;">Nenhum item cadastrado</li>';
    return;
  }

  items.forEach(item => {
    const li = document.createElement('li');
    li.style.cssText = `
      display:flex;justify-content:space-between;align-items:flex-start;gap:12px;
      padding:12px;border:1px solid #eee;border-radius:10px;margin-bottom:10px;
      background:#fff;
    `;

    let displayHTML = '';

    if (currentCategory === 'titulos') {
      const sigla = item.sigla || '(sem sigla)';
      const titulo = item.titulo || item.nome || '';
      displayHTML = `
        <div>
          <div style="font-weight:700;">${sigla}</div>
          <div style="color:#555;">${titulo}</div>
        </div>
      `;
    } else if (currentCategory === 'participantes') {
      const grupo = item.grupo || '(sem grupo)';
      const qtd = item.quantidade_media || '';
      displayHTML = `
        <div>
          <div style="font-weight:700;">${grupo}</div>
          <div style="color:#555;">
            <span style="opacity:.85;">Qtd. média:</span> ${qtd || '<span style="opacity:.6;">(não informado)</span>'}
          </div>
        </div>
      `;
    } else if (currentCategory === 'comuns') {
      const nome = item.nome || '(sem nome)';
      const cidadeNome =
        item.cidade_nome ||
        (item.cidade_ref ? (cidadesCache.find(c => c.id === item.cidade_ref)?.nome || '(cidade não encontrada)') : '(sem cidade)');
      displayHTML = `
        <div>
          <div style="font-weight:700;">${nome}</div>
          <div style="color:#555;">🏙️ ${cidadeNome}</div>
        </div>
      `;
    } else if (currentCategory === 'publicos_alvo' && item.template_layout_ref) {
      const tpl = templatesLayoutCache.find(t => t.id === item.template_layout_ref);
      const tplNome = tpl ? tpl.nome : '(template não encontrado)';
      displayHTML = `
        <div>
          <div style="font-weight:700;">${item.nome || '(sem nome)'}</div>
          <div style="color:#666;font-size:0.92em;">📄 Layout: ${tplNome}</div>
        </div>
      `;
    } else {
      const text = item[config.field] || item.nome || '(sem nome)';
      displayHTML = `<div style="font-weight:700;">${text}</div>`;
    }

    li.innerHTML = `
      <div style="flex:1;min-width:0;">
        ${displayHTML}
      </div>
      <div style="display:flex;gap:8px;flex-shrink:0;">
        <button class="btn-edit" data-id="${item.id}">✏️</button>
        <button class="btn-delete" data-id="${item.id}">🗑️</button>
      </div>
    `;

    list.appendChild(li);
  });

  list.querySelectorAll('.btn-edit').forEach(btn => {
    btn.onclick = () => {
      const id = btn.dataset.id;
      const item = items.find(i => i.id === id);
      if (item) openSettingsModal(item);
    };
  });

  list.querySelectorAll('.btn-delete').forEach(btn => {
    btn.onclick = async () => {
      const id = btn.dataset.id;
      if (confirm('Tem certeza que deseja excluir este item?')) {
        await deleteSettingsItem(id, config.collection);
      }
    };
  });
}

// ===============================
// MODAL DE CRIAÇÃO/EDIÇÃO
// ===============================
function openSettingsModal(item = null) {
  const config = CATEGORIES[currentCategory];
  if (!config) return;

  const isEdit = !!item;
  const title = isEdit ? `Editar ${config.title}` : `Novo ${config.title}`;

  let formHTML = '';

  if (currentCategory === 'titulos') {
    formHTML = `
      <div class="form-group">
        <label for="settings-sigla">Sigla *</label>
        <input type="text" id="settings-sigla" class="input" value="${item?.sigla || ''}" required />
      </div>
      <div class="form-group">
        <label for="settings-titulo">Título *</label>
        <input type="text" id="settings-titulo" class="input" value="${item?.titulo || item?.nome || ''}" required />
      </div>
    `;
  } else if (currentCategory === 'participantes') {
    formHTML = `
      <div class="form-group">
        <label for="settings-grupo">Grupo *</label>
        <input type="text" id="settings-grupo" class="input" value="${item?.grupo || ''}" required />
      </div>
      <div class="form-group">
        <label for="settings-qtd">Quantidade média</label>
        <input type="text" id="settings-qtd" class="input" value="${item?.quantidade_media || ''}" placeholder="Ex: 11 participantes" />
      </div>
    `;
  } else if (currentCategory === 'comuns') {
    // ✅ Comuns vinculadas a cidades
    let optionsCidades = '<option value="">Selecione a cidade</option>';
    cidadesCache.forEach(c => {
      const sel = item?.cidade_ref === c.id ? 'selected' : '';
      optionsCidades += `<option value="${c.id}" ${sel}>${c.nome}</option>`;
    });

    formHTML = `
      <div class="form-group">
        <label for="settings-nome">Nome da Comum *</label>
        <input type="text" id="settings-nome" class="input" value="${item?.nome || ''}" required />
      </div>
      <div class="form-group">
        <label for="settings-cidade">Cidade *</label>
        <select id="settings-cidade" class="input" required>
          ${optionsCidades}
        </select>
      </div>
    `;
  } else if (currentCategory === 'publicos_alvo') {
    let optionsHTML = '<option value="">-- Nenhum --</option>';
    templatesLayoutCache.forEach(tpl => {
      const selected = item?.template_layout_ref === tpl.id ? 'selected' : '';
      optionsHTML += `<option value="${tpl.id}" ${selected}>${tpl.nome}</option>`;
    });

    formHTML = `
      <div class="form-group">
        <label for="settings-nome">Nome do Público *</label>
        <input type="text" id="settings-nome" class="input" value="${item?.nome || ''}" required />
      </div>
      <div class="form-group">
        <label for="settings-template">Template de Layout</label>
        <select id="settings-template" class="input">
          ${optionsHTML}
        </select>
        <small style="display:block;margin-top:4px;color:#666;font-size:0.85em;">Somente templates de tipo "layout".</small>
      </div>
    `;
  } else {
    formHTML = `
      <div class="form-group">
        <label for="settings-nome">Nome *</label>
        <input type="text" id="settings-nome" class="input" value="${item?.nome || ''}" required />
      </div>
    `;
  }

  const modalHTML = `
    <div class="modal-overlay" id="settings-modal-overlay" style="position:fixed;top:0;left:0;width:100%;height:100%;background:rgba(0,0,0,0.5);z-index:999;"></div>
    <div class="modal" id="settings-modal" style="position:fixed;top:50%;left:50%;transform:translate(-50%,-50%);background:#fff;border-radius:8px;box-shadow:0 4px 12px rgba(0,0,0,0.15);z-index:1000;max-width:520px;width:92%;">
      <div class="modal-content">
        <div class="modal-header" style="padding:16px;border-bottom:1px solid #eee;">
          <h3 style="margin:0;">${title}</h3>
        </div>
        <div class="modal-body" style="padding:16px;">
          <form id="settings-form">
            ${formHTML}
          </form>
        </div>
        <div class="modal-footer" style="padding:16px;border-top:1px solid #eee;display:flex;justify-content:flex-end;gap:8px;">
          <button type="button" id="btn-cancel-settings" class="btn secundario">Cancelar</button>
          <button type="submit" form="settings-form" class="btn primario">Salvar</button>
        </div>
      </div>
    </div>
  `;

  document.getElementById('settings-modal')?.remove();
  document.getElementById('settings-modal-overlay')?.remove();

  document.body.insertAdjacentHTML('beforeend', modalHTML);

  const modal = document.getElementById('settings-modal');
  const overlay = document.getElementById('settings-modal-overlay');
  const form = document.getElementById('settings-form');
  const btnCancel = document.getElementById('btn-cancel-settings');

  const closeModal = () => {
    modal?.remove();
    overlay?.remove();
  };

  btnCancel.onclick = closeModal;
  overlay.onclick = closeModal;

  form.onsubmit = async (e) => {
    e.preventDefault();

    let data = {};

    if (currentCategory === 'titulos') {
      const sigla = document.getElementById('settings-sigla')?.value.trim();
      const titulo = document.getElementById('settings-titulo')?.value.trim();
      if (!sigla) return Helpers.showToast('Preencha a sigla', true);
      if (!titulo) return Helpers.showToast('Preencha o título', true);
      data = { sigla, titulo };
    } else if (currentCategory === 'participantes') {
      const grupo = document.getElementById('settings-grupo')?.value.trim();
      const quantidade_media = document.getElementById('settings-qtd')?.value.trim();
      if (!grupo) return Helpers.showToast('Preencha o grupo', true);
      data = { grupo, quantidade_media };
    } else if (currentCategory === 'comuns') {
      const nome = document.getElementById('settings-nome')?.value.trim();
      const cidade_ref = document.getElementById('settings-cidade')?.value || '';
      if (!nome) return Helpers.showToast('Preencha o nome da comum', true);
      if (!cidade_ref) return Helpers.showToast('Selecione a cidade', true);
      const cidadeObj = cidadesCache.find(c => c.id === cidade_ref);
      data = {
        nome,
        cidade_ref,
        cidade_nome: cidadeObj?.nome || ''
      };
    } else if (currentCategory === 'publicos_alvo') {
      const nome = document.getElementById('settings-nome')?.value.trim();
      const templateRef = document.getElementById('settings-template')?.value || null;
      if (!nome) return Helpers.showToast('Preencha o nome', true);
      data = { nome, template_layout_ref: templateRef };
    } else {
      const nome = document.getElementById('settings-nome')?.value.trim();
      if (!nome) return Helpers.showToast('Preencha o nome', true);
      data = { nome };
    }

    await saveSettingsItem(item?.id, data, config.collection);
    closeModal();
  };
}

// ===============================
// SALVAR ITEM
// ===============================
async function saveSettingsItem(id, data, collection) {
  const db = INSTANCES.db;
  if (!db) return;

  try {
    if (id) {
      await db.collection(collection).doc(id).update(data);
      Helpers.showToast('Item atualizado!');
    } else {
      await db.collection(collection).add(data);
      Helpers.showToast('Item criado!');
    }

    loadSettings(currentCategory);
  } catch (err) {
    console.error('Erro ao salvar:', err);
    Helpers.showToast('Erro ao salvar: ' + err.message, true);
  }
}

// ===============================
// EXCLUIR ITEM
// ===============================
async function deleteSettingsItem(id, collection) {
  const db = INSTANCES.db;
  if (!db) return;

  try {
    await db.collection(collection).doc(id).delete();
    Helpers.showToast('Item excluído!');
    loadSettings(currentCategory);
  } catch (err) {
    console.error('Erro ao excluir:', err);
    Helpers.showToast('Erro ao excluir: ' + err.message, true);
  }
}

// ===============================
// CARREGAR TEMPLATES DE LAYOUT
// ===============================
async function carregarTemplatesLayout() {
  const db = INSTANCES.db;
  if (!db) return;

  try {
    const snapshot = await db.collection(COLECOES.templates).orderBy('nome').get();

    templatesLayoutCache = [];
    snapshot.forEach(doc => {
      const data = doc.data();
      if (data.tipo === 'layout') templatesLayoutCache.push({ id: doc.id, ...data });
    });

    console.log('✅ Templates de layout carregados:', templatesLayoutCache.length);
  } catch (err) {
    console.error('❌ Erro ao carregar templates de layout:', err);
  }
}