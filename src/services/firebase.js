// src/firebase.js

// Configuração do Firebase do seu app
const firebaseConfig = {
  apiKey: "AIzaSyCADgdZJ45YtaRsPzPFGpQCFz5fOoTF5kI",
  authDomain: "gerador-msg-wapp.firebaseapp.com",
  projectId: "gerador-msg-wapp",
  storageBucket: "gerador-msg-wapp.firebasestorage.app",
  messagingSenderId: "879738577541",
  appId: "1:879738577541:web:bf90d416f52e12b1d97fec"
};

// Inicializa o Firebase (compat)
firebase.initializeApp(firebaseConfig);

// Expor instâncias para reutilizar em outros arquivos
const auth = firebase.auth();
const db = firebase.firestore();