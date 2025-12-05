// src/services/firebase-api.js

// --- CONFIGURAÇÃO FIREBASE ---
const firebaseConfig = {
  apiKey: "AIzaSyCADgdZJ45YtaRsPzPFGpQCFz5fOoTF5kI",
  authDomain: "gerador-msg-wapp.firebaseapp.com",
  projectId: "gerador-msg-wapp",
  storageBucket: "gerador-msg-wapp.firebasestorage.app",
  messagingSenderId: "879738577541",
  appId: "1:879738577541:web:bf90d416f52e12b1d97fec"
};

// --- INICIALIZAÇÃO ---
// A inicialização deve ocorrer aqui
firebase.initializeApp(firebaseConfig);

// Exporta as instâncias de Auth e Firestore para uso em outros módulos
export const db = firebase.firestore();
export const auth = firebase.auth();

// --- CONSTANTES ---
// Exporta as constantes de Coleções
export const COLECOES = {
    eventos: "eventos", eventos_tipos: "eventos_tipos", eventos_titulos: "eventos_titulos",
    cidades: "cidades", comuns: "comum_congregacao", participantes: "participantes", 
    publicos_alvo: "publico_alvo", realizacoes: "realizacao", templates: "templates", usuarios: "usuarios" 
};