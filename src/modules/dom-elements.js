// src/modules/dom-elements.js

// ===============================
// CONTAINERS PRINCIPAIS
// ===============================
export const loginContainer = document.getElementById('login-container');
export const appContainer = document.getElementById('app-container');

// ===============================
// AUTENTICAÇÃO
// ===============================
export const loginForm = document.getElementById('login-form');
export const loginEmail = document.getElementById('login-email');
export const loginPassword = document.getElementById('login-senha');

// ✅ Agora o logout fica dentro do menu
export const logoutButton = document.getElementById('btn-logout');

// ✅ Perfil/menu
export const profileButton = document.getElementById('btn-profile');
export const profileMenu = document.getElementById('profile-menu');

// ===============================
// NAVEGAÇÃO
// ===============================
export const navItems = document.querySelectorAll('.footer-nav-item');
export const pages = document.querySelectorAll('.app-page');

// ===============================
// PÁGINA: EVENTOS
// ===============================
export const btnNovoEvento = document.getElementById('btn-novo-evento');
export const listaEventos = document.getElementById('lista-eventos');
export const eventFilterBtns = document.querySelectorAll('.event-filter-btn');

// ===============================
// MODAL: TIPO DE EVENTO
// ===============================
export const modalTipoEvento = document.getElementById('modal-tipo-evento');
export const tipoButtons = document.querySelectorAll('.tipo-btn');

// ===============================
// MODAL: FORM DE EVENTO
// ===============================
export const eventoFormContainer = document.getElementById('evento-form-container');
export const eventoModalTitle = document.getElementById('evento-modal-title');
export const formEvento = document.getElementById('form-evento');
export const btnCancelarEventoForm = document.getElementById('btn-cancelar-evento-form');

// Campos do formulário de evento
export const eventoCidade = document.getElementById('evento-cidade');
export const eventoComum = document.getElementById('evento-comum');
export const eventoData = document.getElementById('evento-data');
export const eventoHora = document.getElementById('evento-hora');
export const eventoDescData = document.getElementById('evento-desc-data');
export const eventoObservacoes = document.getElementById('evento-observacoes');
export const eventoTitulo = document.getElementById('evento-titulo');
export const eventoRealizacao = document.getElementById('evento-realizacao');
export const eventoPublicoQtd = document.getElementById('evento-publico-qtd');
export const eventoLink = document.getElementById('evento-link');
export const eventoPublicosCheckboxes = document.getElementById('evento-publicos-checkboxes');
export const eventoCancelado = document.getElementById('evento-cancelado');
export const eventoExtra = document.getElementById('evento-extra');

// Containers de campos específicos
export const campoTituloContainer = document.getElementById('campo-titulo-container');
export const campoRealizacaoContainer = document.getElementById('campo-realizacao-container');
export const campoPublicoQtdContainer = document.getElementById('campo-publico-qtd-container');
export const campoLinkContainer = document.getElementById('campo-link-container');
export const campoPublicoContainer = document.getElementById('campo-publico-container');
export const flagExtraContainer = document.getElementById('flag-extra-container');

// ===============================
// PÁGINA: GERADOR
// ===============================
export const mesAnoRef = document.getElementById('mes-ano-ref');
export const selectPublicoGerador = document.getElementById('select-publico-gerador');
export const btnGerarMensagem = document.getElementById('btn-gerar-mensagem');
export const mensagemGerada = document.getElementById('mensagem-gerada');
export const btnCopiarMensagem = document.getElementById('btn-copiar-mensagem');

// ✅ NOVO: limpar mensagem
export const btnLimparMensagem = document.getElementById('btn-limpar-mensagem');

// ===============================
// PÁGINA: TEMPLATES
// ===============================
export const btnNovoTemplate = document.getElementById('btn-novo-template');
export const listaTemplates = document.getElementById('lista-templates');

// Modal de template
export const templateFormContainer = document.getElementById('template-form-container');
export const templateModalTitle = document.getElementById('template-modal-title');
export const formTemplate = document.getElementById('form-template');
export const btnCancelarTemplate = document.getElementById('btn-cancelar-template');

export const templateNome = document.getElementById('template-nome');
export const templateTipo = document.getElementById('template-tipo');
export const templateConteudo = document.getElementById('template-conteudo');

// ===============================
// PÁGINA: CONFIGURAÇÕES
// ===============================
export const settingsTitle = document.getElementById('settings-title');
export const btnSettingsAdd = document.getElementById('btn-settings-add');
export const settingsList = document.getElementById('settings-list');
export const settingsNavBtns = document.querySelectorAll('.settings-nav-btn');

// ===============================
// TOAST
// ===============================
export const toast = document.getElementById('toast');