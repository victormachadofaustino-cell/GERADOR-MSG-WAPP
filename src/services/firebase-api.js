// src/services/firebase-api.js

// --- CONFIGURAÇÃO FIREBASE ---
export const firebaseConfig = {
  apiKey: "AIzaSyCADgdZJ45YtaRsPzPFGpQCFz5fOoTF5kI",
  authDomain: "gerador-msg-wapp.firebaseapp.com",
  projectId: "gerador-msg-wapp",
  storageBucket: "gerador-msg-wapp.firebasestorage.app",
  messagingSenderId: "879738577541",
  appId: "1:879738577541:web:bf90d416f52e12b1d97fec"
};

// CRÍTICO: Objeto Mutável para armazenar as instâncias
export const INSTANCES = {
    db: null,
    auth: null,
    // Garante que outros módulos (como events.js) podem acessar o DB
    get db() { return INSTANCES._db; },
    set db(val) { INSTANCES._db = val; },
    get auth() { return INSTANCES._auth; },
    set auth(val) { INSTANCES._auth = val; }
};

// --- CONSTANTES ---
// Exporta as constantes de Coleções
export const COLECOES = {
    eventos: "eventos", eventos_tipos: "eventos_tipos", eventos_titulos: "eventos_titulos",
    cidades: "cidades", comuns: "comum_congregacao", participantes: "participantes", 
    publicos_alvo: "publico_alvo", realizacoes: "realizacao", templates: "templates", usuarios: "usuarios" 
};