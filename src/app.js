// src/app.js

// IMPORTAÇÕES PRINCIPAIS
import { INSTANCES } from './services/firebase.js';
import * as DOM from './modules/dom-elements.js';
import * as Helpers from './services/helpers.js';

// MÓDULOS
import {
  initEventsListeners,
  carregarEventosIniciais,
  getEventosCache,
  getCidadesCache,
  getTitulosCache
} from './modules/events.js';

import {
  initGeneratorListeners,
  carregarGeradorSelects,
  updateGeneratorState
} from './modules/generator.js';

import {
  initTemplatesListeners,
  renderTemplates
} from './modules/templates.js';

import {
  initSettingsListeners,
  loadSettings
} from './modules/settings.js';

// ===============================
// ESTADO GLOBAL DE APP
// ===============================
let usuarioAtual = null;
let settingsCategoriaAtual = 'cidades'; // ✅ rastrear categoria ativa em Config

// Helper pra depuração
function debugLog(...args) {
  console.log('[APP]', ...args);
}

// ===============================
// MENU PERFIL (NOVO)
// ===============================
function initProfileMenu() {
  const btnProfile = document.getElementById('btn-profile');
  const menu = document.getElementById('profile-menu');
  const btnLogout = document.getElementById('btn-logout');

  if (!btnProfile || !menu) {
    console.warn('⚠️ Menu de perfil não encontrado (#btn-profile / #profile-menu).');
    return;
  }

  const abrir = () => {
    menu.classList.remove('hidden');
    btnProfile.setAttribute('aria-expanded', 'true');
  };

  const fechar = () => {
    menu.classList.add('hidden');
    btnProfile.setAttribute('aria-expanded', 'false');
  };

  const toggle = () => {
    const aberto = !menu.classList.contains('hidden');
    if (aberto) fechar();
    else abrir();
  };

  // Clique no avatar abre/fecha
  btnProfile.addEventListener('click', (e) => {
    e.preventDefault();
    e.stopPropagation();
    toggle();
  });

  // Clique fora fecha
  document.addEventListener('click', (e) => {
    if (menu.classList.contains('hidden')) return;
    const cliqueDentro = menu.contains(e.target) || btnProfile.contains(e.target);
    if (!cliqueDentro) fechar();
  });

  // ESC fecha
  document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape') fechar();
  });

  // Clique no sair (fecha menu + logout)
  if (btnLogout) {
    btnLogout.addEventListener('click', async (e) => {
      e.preventDefault();
      e.stopPropagation();
      fechar();

      const auth = INSTANCES.auth;
      if (!auth) {
        Helpers.showToast('Auth não disponível.', true);
        return;
      }

      try {
        await auth.signOut();
        Helpers.showToast('Logout realizado.');
      } catch (err) {
        console.error('Erro ao sair:', err);
        Helpers.showToast('Erro ao sair: ' + err.message, true);
      }
    });
  } else {
    console.warn('⚠️ Botão #btn-logout não encontrado no DOM.');
  }

  // Expor helpers caso precise em debug
  window.__profileMenu = { abrir, fechar, toggle };
}

// ===============================
// ✅ REFRESH GLOBAL
// ===============================
async function refreshGlobal() {
  debugLog('🔄 Refresh global iniciado...');
  Helpers.showToast('Atualizando dados...');

  try {
    // 1) Recarregar eventos + caches (cidades, títulos, comuns, participantes, etc.)
    await carregarEventosIniciais();
    debugLog('✅ Eventos e cadastros recarregados.');

    // 2) Atualizar gerador (públicos + templates)
    updateGeneratorState(getEventosCache(), []);
    await carregarGeradorSelects();
    debugLog('✅ Gerador atualizado.');

    // 3) Se estiver na aba Config, recarregar a lista atual
    const configVisivel = !document.getElementById('pagina-configuracoes')?.classList.contains('hidden');
    if (configVisivel) {
      await loadSettings(settingsCategoriaAtual);
      debugLog('✅ Config recarregado:', settingsCategoriaAtual);
    }

    // 4) Se estiver na aba Templates, recarregar
    const templatesVisivel = !document.getElementById('pagina-templates')?.classList.contains('hidden');
    if (templatesVisivel) {
      await renderTemplates();
      debugLog('✅ Templates recarregados.');
    }

    Helpers.showToast('Dados atualizados!');
  } catch (err) {
    console.error('Erro no refresh global:', err);
    Helpers.showToast('Erro ao atualizar: ' + err.message, true);
  }
}

// ===============================
// RASTREAMENTO DE CATEGORIA CONFIG
// ===============================
function setupSettingsTracking() {
  document.querySelectorAll('.settings-nav-btn').forEach(btn => {
    btn.addEventListener('click', () => {
      const target = btn.dataset.target;
      if (target) settingsCategoriaAtual = target;
    });
  });
}

// ===============================
// AUTENTICAÇÃO
// ===============================
function initAuth() {
  const auth = INSTANCES.auth;
  if (!auth) {
    console.error('Auth não inicializado em INSTANCES.');
    return;
  }

  auth.onAuthStateChanged(async (user) => {
    usuarioAtual = user;

    if (user) {
      debugLog('Usuário logado:', user.email);
      if (DOM.loginContainer) DOM.loginContainer.classList.add('hidden');
      if (DOM.appContainer) DOM.appContainer.classList.remove('hidden');

      // Mostra e-mail no header, se tiver elemento
      const emailSpan = document.getElementById('user-email-display');
      if (emailSpan) emailSpan.textContent = user.email || '';

      await carregarDadosIniciais();
    } else {
      debugLog('Usuário não autenticado');
      if (DOM.loginContainer) DOM.loginContainer.classList.remove('hidden');
      if (DOM.appContainer) DOM.appContainer.classList.add('hidden');
    }
  });

  // Submit do formulário de login
  if (DOM.loginForm) {
    DOM.loginForm.addEventListener('submit', async (e) => {
      e.preventDefault();
      debugLog('Submit do login disparado');

      if (!DOM.loginEmail || !DOM.loginPassword) {
        console.error('Elementos de e-mail/senha não encontrados no DOM.');
        return;
      }

      const email = DOM.loginEmail.value.trim();
      const senha = DOM.loginPassword.value.trim();

      if (!email || !senha) {
        Helpers.showToast('Preencha e-mail e senha', true);
        return;
      }

      try {
        debugLog('Tentando login com:', email);
        await auth.signInWithEmailAndPassword(email, senha);
        Helpers.showToast('Login realizado com sucesso!');
        DOM.loginForm.reset();
      } catch (err) {
        console.error('Erro no login:', err);
        let msg = 'Erro ao fazer login.';
        if (err.code === 'auth/wrong-password') msg = 'Senha incorreta.';
        if (err.code === 'auth/user-not-found') msg = 'Usuário não encontrado.';
        Helpers.showToast(msg, true);
      }
    });
  } else {
    console.warn('DOM.loginForm não encontrado. Verifique o id="login-form" no HTML.');
  }

  // ⚠️ Logout pelo DOM.logoutButton ainda pode existir, mas agora o logout principal está no menu perfil.
  // Mantemos como fallback:
  if (DOM.logoutButton) {
    DOM.logoutButton.addEventListener('click', async () => {
      try {
        await auth.signOut();
        Helpers.showToast('Logout realizado.');
      } catch (err) {
        console.error('Erro ao sair:', err);
        Helpers.showToast('Erro ao sair: ' + err.message, true);
      }
    });
  }
}

// ===============================
// NAVEGAÇÃO ENTRE PÁGINAS
// ===============================
function initNavigation() {
  if (!DOM.navItems || DOM.navItems.length === 0) {
    console.warn('Nenhum item de navegação encontrado (footer-nav-item).');
    return;
  }

  DOM.navItems.forEach((item) => {
    item.addEventListener('click', async () => {
      const targetPage = item.dataset.page;
      if (!targetPage) return;

      DOM.navItems.forEach((i) => i.classList.remove('active'));
      item.classList.add('active');

      DOM.pages.forEach((section) => {
        if (section.id === `pagina-${targetPage}`) section.classList.remove('hidden');
        else section.classList.add('hidden');
      });

      // Ao entrar no Gerador, garantir selects atualizados
      if (targetPage === 'gerador') {
        await carregarGeradorSelects();
      }
    });
  });
}

// ===============================
// DADOS INICIAIS
// ===============================
async function carregarDadosIniciais() {
  debugLog('🔄 Carregando dados iniciais...');

  try {
    // 1) Eventos + caches
    await carregarEventosIniciais();
    debugLog('✅ Eventos e cadastros carregados.');

    // 2) Configurações
    initSettingsListeners(getCidadesCache(), getTitulosCache());
    setupSettingsTracking();
    await loadSettings(settingsCategoriaAtual);

    // 3) Templates
    await renderTemplates();
    initTemplatesListeners();

    // 4) Gerador
    updateGeneratorState(getEventosCache(), []);
    await carregarGeradorSelects();
    initGeneratorListeners(getEventosCache(), []);

    Helpers.showToast('Dados iniciais carregados!');
    debugLog('✅ Dados iniciais carregados.');
  } catch (err) {
    console.error('Erro ao carregar dados iniciais:', err);
    Helpers.showToast('Erro ao carregar dados iniciais: ' + err.message, true);
  }
}

// ===============================
// BOOTSTRAP DO APP
// ===============================
function initApp() {
  debugLog('Inicializando app...');

  initAuth();
  initNavigation();
  initEventsListeners();

  // ✅ menu perfil
  initProfileMenu();

  // Botão refresh global
  const btnRefresh = document.getElementById('btn-refresh-app');
  if (btnRefresh) {
    btnRefresh.addEventListener('click', refreshGlobal);
    debugLog('✅ Botão refresh global conectado.');
  } else {
    console.warn('⚠️ Botão #btn-refresh-app não encontrado no DOM.');
  }
}

// ===============================
// INICIALIZAÇÃO GLOBAL
// ===============================
document.addEventListener('DOMContentLoaded', () => {
  initApp();
});