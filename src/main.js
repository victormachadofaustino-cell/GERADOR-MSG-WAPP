// src/main.js - ORQUESTRADOR CENTRAL

// 1. IMPORTAÇÕES DE SERVIÇOS E ELEMENTOS
import { auth, db, COLECOES } from './services/firebase-api.js'; 
import { showToast } from './services/helpers.js';
import * as DOM from './modules/dom-elements.js'; 
// Módulos Funcionais
import { carregarDadosIniciais as initEventsData, initEventsListeners, renderizarLista } from './modules/events.js';
import { carregarGeradorSelects, initGeneratorListeners } from './modules/generator.js';
import { loadSettings, initSettingsListeners } from './modules/settings.js'; 
import { renderTemplates, initTemplatesListeners } from './modules/templates.js'; // NOVO: Importa Módulo Templates


// 2. VARIÁVEIS DE ESTADO GLOBAL
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


// 3. FUNÇÕES DE SUPORTE
async function carregarDadosIniciais() {
    
    const loadCache = async (col, arr) => { 
        const s=await db.collection(col).get(); arr.length=0; 
        s.forEach(d=>arr.push({id:d.id,...d.data()})); 
    };
    
    // Carrega dados essenciais para Eventos e Configurações
    await initEventsData(); 
    
    // Carrega Templates e Públicos para o Módulo Gerador e Templates
    await Promise.all([
        loadCache(COLECOES.templates, templatesDB),
        loadCache(COLECOES.publicos_alvo, publicosAlvoDB),
    ]);

    carregarGeradorSelects();
}


// 4. INICIALIZAÇÃO PRINCIPAL (DOMContentLoaded)
document.addEventListener('DOMContentLoaded', () => {
    
    // 4.1 LISTENERS DE AUTENTICAÇÃO
    auth.onAuthStateChanged(u => {
        if (u) {
            currentUser = u;
            DOM.loginContainer.style.display = 'none';
            DOM.appContainer.style.display = 'block';
            DOM.userDisplay.textContent = u.email;
            if (DOM.lastLoginDisplay) DOM.lastLoginDisplay.textContent = new Date(u.metadata.lastSignInTime).toLocaleDateString();
            
            // CARREGA DADOS GERAIS
            carregarDadosIniciais(); 

            // LIGA LISTENERS DOS MÓDULOS
            initEventsListeners(templatesDB);
            initGeneratorListeners(eventosDB, templatesDB); 
            initSettingsListeners(); 
            initTemplatesListeners(); // NOVO: Inicializa listeners do Módulo Templates

            // Inicia o listener de eventos do Firestore (Consulta Principal)
            db.collection(COLECOES.eventos).onSnapshot(s => { 
                eventosDB = []; 
                s.forEach(d => eventosDB.push({ id: d.id, ...d.data() })); 
                renderizarLista(eventosDB); 
            });
        } else {
            DOM.loginContainer.style.display = 'flex';
            DOM.appContainer.style.display = 'none';
        }
    });

    // 4.2 LÓGICA DE NAVEGAÇÃO
    DOM.navButtons.forEach(b => b.onclick = () => { 
        DOM.navButtons.forEach(x => x.classList.remove('ativa')); 
        DOM.paginas.forEach(x => x.classList.remove('ativa')); 
        b.classList.add('ativa'); 
        
        const targetId = b.id.replace('btnNav','pagina');
        const paginaTarget = targetId.includes('Config') ? 'paginaConfiguracoes' : targetId;
        
        document.getElementById(paginaTarget).classList.add('ativa'); 
        
        // Ação específica para o Módulo Configurações
        if(b.id === 'btnNavConfig') {
            loadSettings('cidades'); 
        } 
        
        // Ação específica para o Módulo Templates
        if(b.id === 'btnNavTemplates') {
            renderTemplates(); // Carrega a lista de templates ao entrar na página
        }
    });
    
    // 4.3 LISTENERS DE UI BÁSICA (Profile, Login, etc.)
    DOM.loginForm.onsubmit = async (e) => {
        e.preventDefault(); 
        try {
            await auth.signInWithEmailAndPassword(document.getElementById('login-email').value, document.getElementById('login-password').value);
        } catch (e) {
            showToast(e.message, true);
        }
    };
    document.getElementById('btn-logout').onclick = () => auth.signOut();
    document.getElementById('toggle-password').onclick = () => {
        const i = document.getElementById('login-password'); 
        i.type = i.type === 'password' ? 'text' : 'password';
    };
    document.getElementById('forgot-password').onclick = async () => {
        const m = document.getElementById('login-email').value; 
        if (!m) return; 
        await auth.sendPasswordResetEmail(m); 
        showToast("Enviado");
    };

    const av = DOM.appContainer.querySelector('.profile-avatar'), 
          dr = DOM.appContainer.querySelector('.profile-dropdown');
          
    av.onclick = () => dr.classList.toggle('show'); 
    window.onclick = (e) => { 
        if (!av.contains(e.target) && !dr.contains(e.target)) dr.classList.remove('show'); 
    };
    
    document.getElementById('checkLinkExterno').addEventListener('change', (e) => 
        document.getElementById('linkExternoWrapper').style.display = e.target.checked ? 'block' : 'none'
    );
    
    // 4.4 REGISTRO PWA
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