// src/modules/dom-elements.js

// --- ELEMENTOS GERAIS DE ESTRUTURA E AUTENTICAÇÃO ---
export const toast = document.getElementById('toast-notification');
export const loginContainer = document.getElementById('login-container');
export const appContainer = document.getElementById('app-container');
export const loginForm = document.getElementById('login-form');
export const userDisplay = document.getElementById('user-display');
export const lastLoginDisplay = document.getElementById('last-login-display');
export const navButtons = document.querySelectorAll('nav button');
export const paginas = document.querySelectorAll('.pagina');
export const settingsList = document.getElementById('settings-list');


// --- ELEMENTOS DO FORMULÁRIO DE EVENTOS (Gestão) ---
export const formEvento = document.getElementById('formEvento');
export const inpData = document.getElementById('data'); 
export const inpHora = document.getElementById('hora'); 
export const inpDescData = document.getElementById('desc_data');
export const selTipo = document.getElementById('select_tipo_evento');
export const selSigla = document.getElementById('select_titulo');
export const inpTitulo = document.getElementById('titulo');
export const selParticipantes = document.getElementById('select_participantes');
export const inpQtd = document.getElementById('observacoes');
export const selCidade = document.getElementById('select_cidade');
export const selComum = document.getElementById('select_comum');

// Elementos para controle de visibilidade (groups)
export const allGroups = [
    document.getElementById('form-group-sigla'), document.getElementById('form-group-titulo'),
    document.getElementById('form-group-publico'), document.getElementById('form-group-quantidade'),
    document.getElementById('form-group-is_extra'), document.getElementById('form-group-link'),
    document.getElementById('form-group-realizacao'), document.getElementById('form-group-observacoes_extra')
];


// --- ELEMENTOS DO GERADOR DE MENSAGENS ---
export const resultado = document.getElementById('resultado');


// --- ELEMENTOS DO MODAL (BOTOES QUE ACIONAM FUNÇÕES) ---
// Estes elementos podem ser necessários em diversos módulos
export const btnModalSalvar = document.getElementById('modal-btn-salvar');
export const btnModalCancelar = document.getElementById('modal-btn-cancelar');
export const btnDeleteModalConfirmar = document.getElementById('delete-modal-btn-confirmar');
export const btnDeleteModalCancelar = document.getElementById('delete-modal-btn-cancelar');