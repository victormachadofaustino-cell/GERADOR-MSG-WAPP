// src/main.js - ORQUESTRADOR CENTRAL (COMPLETO E CORRIGIDO PARA CRASH)

// 1. IMPORTAÇÕES DE SERVIÇOS E ELEMENTOS
import * as FirebaseAPI from './services/firebase-api.js'; // Importa como API
import { showToast, initModalListeners } from './services/helpers.js';
import * as DOM from './modules/dom-elements.js'; 
// Módulos Funcionais
import { carregarDadosIniciais as initEventsData, initEventsListeners, renderizarLista } from './modules/events.js';
import { carregarGeradorSelects, initGeneratorListeners, updateGeneratorState } from './modules/generator.js'; 
import { loadSettings, initSettingsListeners } from './modules/settings.js'; 
import { renderTemplates, initTemplatesListeners } from './modules/templates.js'; 


// 2. VARIÁVEIS DE ESTADO GLOBAL (Centralizadas)
let eventosDB = []; 
let cidadesDB = []; 
let comunsDB = [];
let templatesDB = [];
let participantesDB = [];
let publicosAlvoDB = [];
let titulosDB = []; 
let filtroAtual = 'todos'; 
let currentUser = null;
let currentSettingsTab = null;


// 3. FUNÇÕES DE SUPORTE: Carregamento Inicial de Dados
async function carregarDadosIniciais() {
    
    // loadCache agora usa o objeto importado FirebaseAPI.INSTANCES.db
    const loadCache = async (col, arr) => { 
        // Garante que o db está preenchido antes de usar
        if (!FirebaseAPI.INSTANCES.db) return;
        
        const s=await FirebaseAPI.INSTANCES.db.collection(col).get(); arr.length=0; 
        s.forEach(d=>arr.push({id:d.id,...d.data()})); 
    };
    
    // Carrega dados essenciais para Eventos e Configurações
    await initEventsData(); 
    
    // Carrega Templates, Públicos (para Gerador) e Cidades/Títulos (para Configurações) no estado global
    await Promise.all([
        loadCache(FirebaseAPI.COLECOES.templates, templatesDB),
        loadCache(FirebaseAPI.COLECOES.publicos_alvo, publicosAlvoDB),
        loadCache(FirebaseAPI.COLECOES.cidades, cidadesDB), 
        loadCache(FirebaseAPI.COLECOES.eventos_titulos, titulosDB), 
    ]);

    carregarGeradorSelects();
}

// 4. FUNÇÃO DE TROCA DE PÁGINA (Com lógica do Hambúrguer)
function switchPage(pageId) {
    let pageFound = false;
    document.querySelectorAll('.pagina').forEach(page => {
        if (page.id === pageId) {
            page.classList.add('ativa');
            pageFound = true;
        } else {
            page.classList.remove('ativa');
        }
    });

    const btnHamburguer = document.getElementById('btn-hamburguer');
    
    if (pageId === 'paginaConfig') {
        // Se for mobile, mostra o botão hambúrguer
        if (window.innerWidth <= 768) {
            if(btnHamburguer) btnHamburguer.style.display = 'inline-block';
            // Garante que o primeiro item seja carregado se nenhum estiver ativo
            if (!document.querySelector('#settings-sidebar-nav .nav-btn.ativa')) {
                 loadSettings('cidades');
            }
        } else {
            // Desktop: sidebar visível, hambúrguer oculto
            if(btnHamburguer) btnHamburguer.style.display = 'none';
             loadSettings('cidades'); // Carrega padrão para desktop
        }
    } else {
        // Oculta o hambúrguer ao sair da página Configurações
        if(btnHamburguer) btnHamburguer.style.display = 'none';
    }
    
    // Ação específica para carregar dados dos Módulos
    if(pageId === 'paginaTemplates') {
        renderTemplates(); 
    }
}


// 5. INICIALIZAÇÃO PRINCIPAL (DOMContentLoaded)
document.addEventListener('DOMContentLoaded', () => {
    
    // CRÍTICO: Inicializa o Firebase antes de qualquer código tentar usá-lo
    firebase.initializeApp(FirebaseAPI.firebaseConfig);
    
    // Atribui as instâncias GLOBALLY MUTÁVEIS através do objeto INSTANCES
    FirebaseAPI.INSTANCES.db = firebase.firestore();
    FirebaseAPI.INSTANCES.auth = firebase.auth(); // <--- CORRIGIDO O TYPERROR AQUI
    
    // LIGAÇÃO CRÍTICA DOS LISTENERS DE MODAL
    initModalListeners(); 
    
    // 5.1 LISTENERS DE AUTENTICAÇÃO
    FirebaseAPI.INSTANCES.auth.onAuthStateChanged(u => {
        if (u) {
            currentUser = u;
            DOM.loginContainer.style.display = 'none';
            DOM.appContainer.style.display = 'flex';
            document.getElementById('user-display').textContent = u.email;
            
            const lastLoginDisplay = document.getElementById('last-login-display');
            if (lastLoginDisplay && u.metadata.lastSignInTime) {
                lastLoginDisplay.textContent = new Date(u.metadata.lastSignInTime).toLocaleDateString();
            }
            
            // CARREGA DADOS GERAIS
            carregarDadosIniciais(); 

            // LIGA LISTENERS DOS MÓDULOS E INJETA O ESTADO GLOBAL
            initEventsListeners(templatesDB);
            initGeneratorListeners(eventosDB, templatesDB); 
            initSettingsListeners(cidadesDB, titulosDB); 
            initTemplatesListeners(); 

            // Inicia o listener de eventos do Firestore (Consulta Principal)
            FirebaseAPI.INSTANCES.db.collection(FirebaseAPI.COLECOES.eventos).onSnapshot(s => { 
                eventosDB = []; 
                s.forEach(d => eventosDB.push({ id: d.id, ...d.data() })); 
                renderizarLista(eventosDB); 
                
                // CRÍTICO: Atualiza o estado do Gerador após os dados serem carregados.
                updateGeneratorState(eventosDB, templatesDB); 
            });
        } else {
            DOM.loginContainer.style.display = 'flex';
            DOM.appContainer.style.display = 'none';
        }
    });

    // 5.2 LÓGICA DE NAVEGAÇÃO
    const navButtons = document.querySelectorAll('#app-nav-bar button');

    navButtons.forEach(b => b.onclick = () => { 
        navButtons.forEach(x => x.classList.remove('ativa')); 
        b.classList.add('ativa'); 
        
        let targetId = b.dataset.page;
        switchPage(targetId);
        window.scrollTo(0,0);
    });
    
    // 5.3 LISTENERS DE UI BÁSICA (Profile, Login, etc.)
    DOM.loginForm.onsubmit = async (e) => {
        e.preventDefault(); 
        try {
            await FirebaseAPI.INSTANCES.auth.signInWithEmailAndPassword(document.getElementById('login-email').value, document.getElementById('login-password').value);
        } catch (e) {
            showToast(e.message, true);
        }
    };
    
    const btnLogout = document.getElementById('btn-logout');
    if (btnLogout) btnLogout.onclick = () => FirebaseAPI.INSTANCES.auth.signOut();

    document.getElementById('toggle-password').onclick = () => {
        const i = document.getElementById('login-password'); 
        i.type = i.type === 'password' ? 'text' : 'password';
    };
    
    document.getElementById('forgot-password').onclick = async () => {
        const m = document.getElementById('login-email').value; 
        if (!m) return; 
        await FirebaseAPI.INSTANCES.auth.sendPasswordResetEmail(m); 
        showToast("Enviado");
    };

    // CORREÇÃO CRÍTICA: Proteção contra falha de elementos DOM
    const av = DOM.appContainer.querySelector('.profile-avatar'), 
          dr = DOM.appContainer.querySelector('.profile-dropdown');
          
    if(av && dr) { // Garante que ambos existem antes de atribuir listeners
        av.onclick = () => dr.classList.toggle('show'); 
        window.onclick = (e) => { 
            const isAvatarOrDropdown = av.contains(e.target) || dr.contains(e.target);
            if (!isAvatarOrDropdown) {
                 dr.classList.remove('show'); 
            }
        };
    }
    
    const checkLink = document.getElementById('checkLinkExterno');
    const wrapperLink = document.getElementById('linkExternoWrapper');
    if (checkLink && wrapperLink) {
         checkLink.addEventListener('change', (e) => 
            wrapperLink.style.display = e.target.checked ? 'block' : 'none'
        );
    }
    
    // NOVO: Lógica do Menu Hambúrguer (Configurações)
    const btnHamburguer = document.getElementById('btn-hamburguer');
    const settingsOverlay = document.getElementById('settings-menu-overlay');
    const btnCloseMenu = document.getElementById('btn-close-settings-menu');

    if(btnHamburguer && settingsOverlay && btnCloseMenu) {
        // 1. Lógica de Toggle (Abrir/Fechar)
        btnHamburguer.onclick = () => settingsOverlay.classList.add('ativo');
        btnCloseMenu.onclick = () => settingsOverlay.classList.remove('ativo');
        
        // 2. Fechar ao clicar no backdrop (fora do menu)
        settingsOverlay.onclick = (e) => {
            if (e.target.id === 'settings-menu-overlay') {
                settingsOverlay.classList.remove('ativo');
            }
        }
    }

    // 5.4 REGISTRO PWA
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
});