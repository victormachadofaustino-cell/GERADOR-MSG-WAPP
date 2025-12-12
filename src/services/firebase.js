// src/services/firebase.js

// Configuração do Firebase
const firebaseConfig = {
  apiKey: "AIzaSyCADgdZJ45YtaRsPzPFGpQCFz5fOoTF5kI",
  authDomain: "gerador-msg-wapp.firebaseapp.com",
  projectId: "gerador-msg-wapp",
  storageBucket: "gerador-msg-wapp.firebasestorage.app",
  messagingSenderId: "879738577541",
  appId: "1:879738577541:web:bf90d416f52e12b1d97fec"
};

// Inicializa apenas uma vez
if (!firebase.apps || !firebase.apps.length) {
  firebase.initializeApp(firebaseConfig);
  console.log("✅ Firebase inicializado (módulo)");
} else {
  console.log("ℹ️ Firebase já estava inicializado");
}

const auth = firebase.auth();
const db = firebase.firestore();

// Instâncias principais
export const INSTANCES = {
  auth,
  db
};

/**
 * IMPORTANTE:
 * Aqui COLECOES guarda APENAS os NOMES das coleções (strings),
 * exatamente como o seu events.js espera usar com db.collection(COLECOES.alguma_colecao)
 */
export const COLECOES = {
  eventos: 'eventos',
  eventos_titulos: 'eventos_titulos',
  eventos_tipos: 'eventos_tipos',
  participantes: 'participantes',
  cidades: 'cidades',

  // estes nomes PRECISAM bater com o Firestore:
  comuns: 'comum_congregacao',  // coleção real
  publicos_alvo: 'publico_alvo',// coleção real
  realizacoes: 'realizacao',    // coleção real

  templates: 'templates',
  configuracoes: 'configuracoes' // (se você usar depois)
};

// Também deixa globais para compatibilidade com código antigo (opcional, mas ajuda na transição)
window.auth = auth;
window.db = db;