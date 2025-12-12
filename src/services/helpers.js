// src/services/helpers.js

// ========== TOAST ==========
export function showToast(message, isError = false) {
  const toast = document.getElementById('toast');
  if (!toast) return;

  toast.textContent = message;
  toast.className = `toast ${isError ? 'error' : ''}`;
  toast.classList.remove('hidden');

  setTimeout(() => {
    toast.classList.add('hidden');
  }, 3000);
}

// ========== MODAL CONFIG (PADRÃO PARA + NOVO / EDITAR) ==========
export function showConfigModal(title, renderContent, onConfirm) {
  const modalId = 'modal-config-temp';
  let existingModal = document.getElementById(modalId);
  
  if (existingModal) {
    document.body.removeChild(existingModal);
  }

  const modal = document.createElement('div');
  modal.id = modalId;
  modal.className = 'modal';
  modal.innerHTML = `
    <div class="modal-content">
      <div class="modal-header">
        <h3 id="modal-config-title">${title}</h3>
      </div>
      <div class="modal-body">
        <div id="modal-config-body"></div>
      </div>
      <div class="modal-footer">
        <button type="button" class="btn secundario" id="btn-cancelar-config">Cancelar</button>
        <button type="button" class="btn primario" id="btn-confirmar-config">Salvar</button>
      </div>
    </div>
  `;

  document.body.appendChild(modal);
  document.body.classList.add('modal-open');

  const body = document.getElementById('modal-config-body');
  if (renderContent && typeof renderContent === 'function') {
    renderContent(body);
  }

  document.getElementById('btn-cancelar-config').onclick = () => {
    hideConfigModal();
  };

  document.getElementById('btn-confirmar-config').onclick = () => {
    if (onConfirm && typeof onConfirm === 'function') {
      onConfirm();
    }
  };

  modal.addEventListener('click', e => {
    if (e.target === modal) {
      hideConfigModal();
    }
  });

  window.__configModalCallbacks = { onConfirm };
}

export function hideConfigModal() {
  const modal = document.getElementById('modal-config-temp');
  if (modal) {
    document.body.removeChild(modal);
    document.body.classList.remove('modal-open');
  }
  if (window.__configModalCallbacks) {
    delete window.__configModalCallbacks;
  }
}

// ========== MODAL DELETE (PADRÃO PARA EXCLUIR) ==========
export function showDeleteModal(itemName, onConfirm) {
  const modalId = 'modal-delete-temp';
  let existingModal = document.getElementById(modalId);
  
  if (existingModal) {
    document.body.removeChild(existingModal);
  }

  const modal = document.createElement('div');
  modal.id = modalId;
  modal.className = 'modal';
  modal.innerHTML = `
    <div class="modal-content" style="max-width: 360px; text-align: center;">
      <div class="modal-header">
        <h3>Confirmar exclusão</h3>
      </div>
      <div class="modal-body">
        <p style="margin: 16px 0;">Tem certeza que deseja excluir este <strong>${itemName}</strong>?</p>
      </div>
      <div class="modal-footer" style="justify-content: center;">
        <button class="btn secundario" id="btn-cancelar-delete">Cancelar</button>
        <button class="btn perigo" id="btn-confirmar-delete">Excluir</button>
      </div>
    </div>
  `;

  document.body.appendChild(modal);
  document.body.classList.add('modal-open');

  document.getElementById('btn-cancelar-delete').onclick = () => {
    hideDeleteModal();
  };

  document.getElementById('btn-confirmar-delete').onclick = () => {
    if (onConfirm && typeof onConfirm === 'function') {
      onConfirm();
    }
  };

  modal.addEventListener('click', e => {
    if (e.target === modal) {
      hideDeleteModal();
    }
  });

  window.__deleteModalCallback = onConfirm;
}

export function hideDeleteModal() {
  const modal = document.getElementById('modal-delete-temp');
  if (modal) {
    document.body.removeChild(modal);
    document.body.classList.remove('modal-open');
  }
  if (window.__deleteModalCallback) {
    delete window.__deleteModalCallback;
  }
}

// ========== GERENCIAMENTO DE DOM (para compatibilidade futura) ==========
export function getElement(id) {
  return document.getElementById(id);
}

export function addClass(el, className) {
  if (el) el.classList.add(className);
}

export function removeClass(el, className) {
  if (el) el.classList.remove(className);
}

// ========== FORMATAR DATA (usado em outros módulos) ==========
export function formatDate(dateStr) {
  if (!dateStr) return '';
  const date = new Date(dateStr + 'T00:00:00');
  return date.toLocaleDateString('pt-BR', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric'
  });
}

// ========== FORMATAR DATA E HORA (usado em generator.js e events.js) ==========
/**
 * Formata data e hora no padrão brasileiro
 * Aceita tanto formato ISO completo ("2025-12-05T19:30:00") quanto separado (data, hora)
 * @param {string} dataHoraISO - Data/hora no formato ISO ou data no formato YYYY-MM-DD
 * @param {string} [timeStr] - Hora no formato HH:MM (opcional, se não vier no primeiro parâmetro)
 * @returns {object} - { data: "05/12/2025", hora: "19:30", diaSemana: "Quinta-feira" }
 */
export function formatarDataHora(dataHoraISO, timeStr = null) {
  if (!dataHoraISO) return { data: '', hora: '', diaSemana: '' };

  let dateObj;
  let horaFinal = '';

  // Se vier no formato ISO completo (ex: "2025-12-05T19:30:00")
  if (dataHoraISO.includes('T')) {
    dateObj = new Date(dataHoraISO);
    horaFinal = dateObj.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' });
  } 
  // Se vier separado (data + hora)
  else {
    dateObj = new Date(dataHoraISO + 'T00:00:00');
    horaFinal = timeStr ? timeStr.substring(0, 5) : '';
  }

  const dataFormatada = dateObj.toLocaleDateString('pt-BR', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric'
  });

  const diasSemana = ['Domingo', 'Segunda-feira', 'Terça-feira', 'Quarta-feira', 'Quinta-feira', 'Sexta-feira', 'Sábado'];
  const diaSemana = diasSemana[dateObj.getDay()];

  return {
    data: dataFormatada,
    hora: horaFinal,
    diaSemana: diaSemana
  };
}

// ========== FORMATAR HORA (usado em generator.js) ==========
/**
 * Formata hora no padrão HH:MM
 * @param {string} timeStr - Hora no formato HH:MM ou HH:MM:SS
 * @returns {string} - Ex: "19:30"
 */
export function formatarHora(timeStr) {
  if (!timeStr) return '';
  return timeStr.substring(0, 5);
}

// ========== FORMATAR MÊS/ANO (usado em generator.js) ==========
/**
 * Formata mês/ano no padrão brasileiro
 * @param {string} mesAno - Mês/ano no formato YYYY-MM
 * @returns {string} - Ex: "Dezembro de 2025"
 */
export function formatarMesAno(mesAno) {
  if (!mesAno) return '';
  
  const [ano, mes] = mesAno.split('-');
  const meses = [
    'Janeiro', 'Fevereiro', 'Março', 'Abril', 'Maio', 'Junho',
    'Julho', 'Agosto', 'Setembro', 'Outubro', 'Novembro', 'Dezembro'
  ];
  
  const mesNome = meses[parseInt(mes, 10) - 1];
  return `${mesNome} de ${ano}`;
}