// src/services/helpers.js

const configModal = document.getElementById('config-modal');
const deleteModal = document.getElementById('delete-modal');
const modalBackdrop = document.getElementById('modal-backdrop');

let modalOnSave = null;
let deleteModalOnConfirm = null;

// Constantes de data: Mês Curto Adicionado
const nomesDias = ['Dom', 'Seg', 'Ter', 'Qua', 'Qui', 'Sex', 'Sáb'];
const nomesMeses = ['Jan', 'Fev', 'Mar', 'Abr', 'Mai', 'Jun', 'Jul', 'Ago', 'Set', 'Out', 'Nov', 'Dez'];


// --- FUNÇÕES DE DATA E HORA (NOVAS EXPORTAÇÕES) ---
export function formatarDataHora(dataHoraString) {
    if (!dataHoraString) return {};
    const dt = new Date(dataHoraString);
    
    if (isNaN(dt.getTime())) {
        const parts = dataHoraString.split('T');
        if (parts.length === 2) {
            const dateUTC = new Date(parts[0] + 'T' + parts[1] + ':00Z');
            if (!isNaN(dateUTC.getTime())) {
                dt.setTime(dateUTC.getTime());
            } else {
                 return {};
            }
        } else {
             return {};
        }
    }

    const dia = dt.getDate().toString().padStart(2, '0');
    const mes = (dt.getMonth() + 1).toString().padStart(2, '0');
    const ano = dt.getFullYear();
    
    return {
        data: `${dia}/${mes}`, // Ex: 25/03
        hora: `${dt.getHours().toString().padStart(2, '0')}:${dt.getMinutes().toString().padStart(2, '0')}`, // Ex: 19:30
        diaSemana: nomesDias[dt.getDay()],
        mesCurto: nomesMeses[dt.getMonth()], // <<-- CORRIGIDO
        dataExtenso: `${nomesDias[dt.getDay()]}, ${dia} de ${nomesMeses[dt.getMonth()]} de ${ano}`
    };
}

export function calcularDescricaoData(date) {
    const dia = date.getDate();
    const diaSemana = date.getDay(); 
    const mes = date.getMonth();
    const ano = date.getFullYear();
    
    const semanaDoMes = Math.floor((dia - 1) / 7) + 1;
    let desc = `${semanaDoMes}ª Semana`;
    
    const ultimoDiaDoMes = new Date(ano, mes + 1, 0).getDate();
    if (dia > ultimoDiaDoMes - 7) {
        desc = 'Última Semana';
    }
    
    if (diaSemana === 0 && (semanaDoMes === 4 || semanaDoMes === 5)) {
        if (dia + 7 > ultimoDiaDoMes) {
             desc = 'Último Domingo';
        }
    }

    return desc;
}


// --- FUNÇÕES DE CONTROLE DE TOAST ---
export function showToast(message, isError = false) {
    const toast = document.getElementById('toast-notification');
    if (!toast) return;

    toast.textContent = message;
    toast.classList.remove('show', 'error');
    if (isError) {
        toast.classList.add('error');
    }
    
    void toast.offsetWidth; 

    toast.classList.add('show');
    
    setTimeout(() => {
        toast.classList.remove('show');
    }, 3000);
}


// --- FUNÇÕES DE CONTROLE DE MODAL ---

export function showConfigModal(title, contentRenderer, onSaveFunction) {
    if (!configModal || !modalBackdrop) return showToast("Erro: Elementos do modal não encontrados.", true);
    
    const modalBody = document.getElementById('modal-body');
    const modalTitle = document.getElementById('modal-title');
    
    modalTitle.textContent = title;
    
    modalBody.innerHTML = ''; 
    contentRenderer(modalBody);
    
    modalOnSave = onSaveFunction;
    
    modalBackdrop.style.display = 'block';
    configModal.style.display = 'block';
}

export function hideConfigModal() {
    if (!configModal || !modalBackdrop) return;
    configModal.style.display = 'none';
    modalBackdrop.style.display = 'none';
    modalOnSave = null; 
}

export function showDeleteModal(itemType, onConfirmFunction) {
    if (!deleteModal || !modalBackdrop) return;
    
    document.getElementById('delete-modal-body').innerHTML = `<p>Tem certeza que deseja excluir este ${itemType}? Esta ação não pode ser desfeita.</p>`;
    
    deleteModalOnConfirm = onConfirmFunction;
    
    modalBackdrop.style.display = 'block';
    deleteModal.style.display = 'block';
}

export function hideDeleteModal() {
    if (!deleteModal || !modalBackdrop) return;
    deleteModal.style.display = 'none';
    modalBackdrop.style.display = 'none';
    deleteModalOnConfirm = null; 
}


// --- EXPORT: Inicialização dos Listeners de Modal ---
export function initModalListeners() {
    const btnSalvar = document.getElementById('modal-btn-salvar');
    const btnCancelar = document.getElementById('modal-btn-cancelar');
    const btnDelConfirmar = document.getElementById('delete-modal-btn-confirmar');
    const btnDelCancelar = document.getElementById('delete-modal-btn-cancelar');
    
    if (btnSalvar) btnSalvar.onclick = () => { if(modalOnSave) modalOnSave(); };
    if (btnCancelar) btnCancelar.onclick = hideConfigModal;
    if (btnDelConfirmar) btnDelConfirmar.onclick = () => { if(deleteModalOnConfirm) deleteModalOnConfirm(); };
    if (btnDelCancelar) btnDelCancelar.onclick = hideDeleteModal;
}