// src/services/helpers.js

// --- CONSTANTES DE DATA (Para Helpers) ---
const diasSemana = ['Domingo', 'Segunda-Feira', 'Terça-Feira', 'Quarta-Feira', 'Quinta-Feira', 'Sexta-Feira', 'Sábado'];
const meses = ['Janeiro', 'Fevereiro', 'Março', 'Abril', 'Maio', 'Junho', 'Julho', 'Agosto', 'Setembro', 'Outubro', 'Novembro', 'Dezembro'];

// --- EXPORT: Cálculo de Descrição da Data (Primeira/Última) ---
export const calcularDescricaoData = (dataObj) => {
    if (!dataObj) return '';
    const dia = dataObj.getDate();
    const diaSemanaIndex = dataObj.getDay();
    const ocorrencia = Math.ceil(dia / 7);
    const dataTeste = new Date(dataObj); dataTeste.setDate(dia + 7);
    const isUltimo = dataTeste.getMonth() !== dataObj.getMonth();
    const ordinaisM = ['Primeiro', 'Segundo', 'Terceiro', 'Quarto', 'Quinto'];
    const ordinaisF = ['Primeira', 'Segunda', 'Terceira', 'Quarta', 'Quinta'];
    const isMasc = (diaSemanaIndex === 0 || diaSemanaIndex === 6);
    let prefixo = (isMasc ? ordinaisM : ordinaisF)[ocorrencia - 1] || '';
    if (isUltimo && ocorrencia >= 4) prefixo = isMasc ? 'Último' : 'Última';
    return `${prefixo} ${diasSemana[diaSemanaIndex]}`;
};

// --- EXPORT: Formatação Completa de Data/Hora ---
export const formatarDataHora = (dataHoraStr) => {
    if (!dataHoraStr) return { data: '[Data]', hora: '[Hora]', diaSemana: '[Dia]', diaNum: '[DiaNum]' };
    const data = new Date(dataHoraStr);
    return {
        data: data.toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit', year: 'numeric' }),
        hora: data.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' }),
        diaSemana: diasSemana[data.getDay()],
        diaNum: data.getDate().toString().padStart(2, '0'),
        mesNome: meses[data.getMonth()],
        ano: data.getFullYear(),
        dataExtenso: `${diasSemana[data.getDay()]}, dia ${data.getDate()} de ${meses[data.getMonth()]} de ${data.getFullYear()}`
    };
};

// --- EXPORT: Toast Notification ---
const toast = document.getElementById('toast-notification');
export function showToast(msg, isError = false) { 
    toast.textContent = msg; 
    toast.className = isError ? 'show error' : 'show'; 
    setTimeout(() => toast.classList.remove('show'), 5000); 
}

// --- EXPORT: Funções de Modal ---
const modalBackdrop = document.getElementById('modal-backdrop');
const configModal = document.getElementById('config-modal');
const modalBody = document.getElementById('modal-body');
const deleteModal = document.getElementById('delete-modal');
const deleteModalBody = document.getElementById('delete-modal-body');
let modalOnSave = null, deleteModalOnConfirm = null; 

export function showModal(el) { modalBackdrop.style.display = 'block'; el.style.display = 'block'; }
export function hideModal(el) { modalBackdrop.style.display = 'none'; el.style.display = 'none'; }
export function showConfigModal(t, render, onSave) { 
    document.getElementById('modal-title').textContent = t; 
    modalBody.innerHTML = ''; 
    render(modalBody); 
    modalOnSave = onSave; 
    showModal(configModal); 
}
export function hideConfigModal() { hideModal(configModal); modalOnSave = null; }
export function showDeleteModal(n, onC) { 
    deleteModalBody.innerHTML = `<p>Excluir "<strong>${n}</strong>"?</p>`; 
    deleteModalOnConfirm = onC; 
    showModal(deleteModal); 
}
export function hideDeleteModal() { hideModal(deleteModal); deleteModalOnConfirm = null; }

// --- Listeners de Modal (que ainda precisam estar aqui) ---
document.addEventListener('DOMContentLoaded', () => {
    // Estas ações globais usam as variáveis de estado do helper.
    document.getElementById('modal-btn-salvar').onclick = () => { if(modalOnSave) modalOnSave(); };
    document.getElementById('modal-btn-cancelar').onclick = hideConfigModal;
    document.getElementById('delete-modal-btn-confirmar').onclick = () => { if(deleteModalOnConfirm) deleteModalOnConfirm(); };
    document.getElementById('delete-modal-btn-cancelar').onclick = hideDeleteModal;
    
    // Listeners do Modal Releases
    const relModal = document.getElementById('releases-modal');
    document.getElementById('btn-releases').onclick = () => showModal(relModal);
    document.getElementById('releases-modal-btn-fechar').onclick = () => hideModal(relModal);
});