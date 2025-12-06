// src/app.js

// Firebase Auth and Firestore já foram inicializados inline no index.html
const auth = firebase.auth();
const db = firebase.firestore();

// DOM Elements
const authContainer = document.getElementById('auth-container');
const appContainer = document.getElementById('app-container');
const userEmailSpan = document.getElementById('user-email');
const logoutButton = document.getElementById('logout-button');
const headerTitle = document.getElementById('header-title');
const navItems = document.querySelectorAll('.nav-item');
const loginForm = document.getElementById('login-form');
const loginEmailInput = document.getElementById('login-email');
const loginPasswordInput = document.getElementById('login-password');
const errorMessage = document.getElementById('error-message');
const loadingOverlay = document.getElementById('loading-overlay');
const eventsList = document.getElementById('events-list');
const filterChips = document.querySelectorAll('.filter-chip');
const addEventButton = document.getElementById('add-event-button');

// Estado em memória
let allEvents = [];
let currentFilter = 'todos';

// --- UI Utility Functions ---
function showLoading() {
    if (loadingOverlay) loadingOverlay.style.display = 'flex';
}

function hideLoading() {
    if (loadingOverlay) loadingOverlay.style.display = 'none';
}

function showApp() {
    if (authContainer) authContainer.style.display = 'none';
    if (appContainer) appContainer.style.display = 'flex';
}

function showAuth() {
    if (authContainer) authContainer.style.display = 'flex';
    if (appContainer) appContainer.style.display = 'none';
}

function updateHeaderTitle(title) {
    if (headerTitle) {
        headerTitle.textContent = title;
    }
}

function showView(viewId) {
    document.querySelectorAll('.app-view').forEach(view => {
        view.classList.remove('active');
    });
    const activeView = document.getElementById(viewId);
    if (activeView) {
        activeView.classList.add('active');
    }
}

// --- Helpers de data / agrupamento ---
function formatDate(date) {
    return date.toLocaleDateString('pt-BR', {
        day: '2-digit',
        month: '2-digit',
        year: 'numeric'
    });
}

function formatDateTime(date) {
    return date.toLocaleDateString('pt-BR', {
        day: '2-digit',
        month: '2-digit',
        year: 'numeric',
        hour: '2-digit',
        minute: '2-digit'
    });
}

function formatMonthYear(date) {
    return date.toLocaleDateString('pt-BR', {
        month: 'long',
        year: 'numeric'
    });
}

function getWeekdayName(date) {
    const weekdays = ['Domingo', 'Segunda-feira', 'Terça-feira', 'Quarta-feira', 'Quinta-feira', 'Sexta-feira', 'Sábado'];
    return weekdays[date.getDay()];
}

function getWeekOfMonth(date) {
    const firstDay = new Date(date.getFullYear(), date.getMonth(), 1);
    const dayOfMonth = date.getDate();
    const weekNumber = Math.ceil((dayOfMonth + firstDay.getDay()) / 7);
    
    const ordinals = ['', '1º', '2º', '3º', '4º', '5º'];
    return ordinals[weekNumber] || weekNumber + 'º';
}

function formatDateDescription(date) {
    const weekOfMonth = getWeekOfMonth(date);
    const weekday = getWeekdayName(date);
    return `${weekOfMonth} ${weekday}`;
}

function normalizeString(str) {
    return (str || '').toLowerCase();
}

// --- Carregar eventos do Firestore ---
async function loadEvents() {
    if (!eventsList) return;

    showLoading();
    eventsList.innerHTML = '<div class="card"><p>Carregando eventos...</p></div>';

    try {
        const snapshot = await db
            .collection('eventos')
            .orderBy('data_hora', 'desc')
            .limit(200)
            .get();

        allEvents = [];

        snapshot.forEach(doc => {
            const data = doc.data();
            let dataJs = null;

            if (data.data_hora && data.data_hora.toDate) {
                dataJs = data.data_hora.toDate();
            }

            allEvents.push({
                id: doc.id,
                data: dataJs,
                cidade_nome: data.cidade_nome || '',
                comum_nome: data.comum_nome || '',
                tipo_evento_nome: data.tipo_evento_nome || '',
                titulo_nome: data.titulo_nome || '',
                sigla: data.sigla || '',
                raw: data
            });
        });

        console.log(`✅ ${allEvents.length} eventos carregados do Firestore`);
        renderFilteredEvents();
    } catch (error) {
        console.error('❌ Erro ao carregar eventos:', error);
        eventsList.innerHTML = '<div class="card"><p>Erro ao carregar eventos.</p></div>';
    } finally {
        hideLoading();
    }
}

// --- Aplicar filtro atual e renderizar ---
function renderFilteredEvents() {
    if (!eventsList) return;

    let eventsToRender = [...allEvents];

    if (currentFilter === 'reuniao') {
        eventsToRender = eventsToRender.filter(ev =>
            normalizeString(ev.tipo_evento_nome).includes('reuni')
        );
    } else if (currentFilter === 'ensaio') {
        eventsToRender = eventsToRender.filter(ev =>
            normalizeString(ev.tipo_evento_nome).includes('ensaio')
        );
    } else if (currentFilter === 'extra') {
        eventsToRender = eventsToRender.filter(ev =>
            normalizeString(ev.tipo_evento_nome).includes('extra')
        );
    }

    console.log(`🔍 Filtro "${currentFilter}": ${eventsToRender.length} eventos`);
    renderEvents(eventsToRender);
}

// --- Renderização dos eventos agrupados por mês ---
function renderEvents(events) {
    eventsList.innerHTML = '';

    if (!events.length) {
        eventsList.innerHTML = '<div class="card"><p>Nenhum evento encontrado.</p></div>';
        return;
    }

    // Agrupar por mês/ano
    const groups = {};

    events.forEach(ev => {
        const date = ev.data || new Date(2000, 0, 1);
        const key = formatMonthYear(date);

        if (!groups[key]) {
            groups[key] = [];
        }

        groups[key].push(ev);
    });

    // Ordenar grupos por data (mais recente primeiro)
    const sortedGroupKeys = Object.keys(groups).sort((a, b) => {
        const dateA = groups[a][0].data || new Date(2000, 0, 1);
        const dateB = groups[b][0].data || new Date(2000, 0, 1);
        return dateB - dateA;
    });

    // Renderizar cada grupo
    sortedGroupKeys.forEach(groupLabel => {
        const monthGroup = document.createElement('div');
        monthGroup.className = 'month-group';

        const header = document.createElement('div');
        header.className = 'month-header';
        header.textContent = groupLabel;
        monthGroup.appendChild(header);

        // Ordenar eventos dentro do grupo (mais recente primeiro)
        const sortedEvents = groups[groupLabel].sort((a, b) => {
            const dateA = a.data || new Date(2000, 0, 1);
            const dateB = b.data || new Date(2000, 0, 1);
            return dateB - dateA;
        });

        sortedEvents.forEach(ev => {
            const card = createEventCard(ev);
            monthGroup.appendChild(card);
        });

        eventsList.appendChild(monthGroup);
    });
}

// --- Criar card de evento (accordion) ---
function createEventCard(ev) {
    const card = document.createElement('div');
    card.className = 'card event-card';
    card.dataset.eventId = ev.id;

    const isEnsaio = normalizeString(ev.tipo_evento_nome).includes('ensaio');
    const isReuniao = normalizeString(ev.tipo_evento_nome).includes('reuni');

    let titleLine = '';
    let subtitleLine = '';

    if (isEnsaio) {
        // Ensaio Regional - Cidade
        titleLine = `${ev.titulo_nome || ev.tipo_evento_nome} - ${ev.cidade_nome || '—'}`;
        // Data - Descrição da data (3º Domingo)
        if (ev.data) {
            subtitleLine = `${formatDate(ev.data)} - ${formatDateDescription(ev.data)}`;
        } else {
            subtitleLine = 'Data não definida';
        }
    } else if (isReuniao) {
        // Sigla - Reunião
        titleLine = `${ev.sigla || '—'} - ${ev.tipo_evento_nome}`;
        // Data - Descrição da data (Quarta quarta-feira)
        if (ev.data) {
            subtitleLine = `${formatDate(ev.data)} - ${formatDateDescription(ev.data)}`;
        } else {
            subtitleLine = 'Data não definida';
        }
    } else {
        // Outros eventos
        titleLine = ev.titulo_nome || ev.tipo_evento_nome || 'Evento';
        if (ev.data) {
            subtitleLine = `${formatDate(ev.data)} - ${formatDateDescription(ev.data)}`;
        } else {
            subtitleLine = 'Data não definida';
        }
    }

    card.innerHTML = `
        <div class="event-card-header">
            <div class="event-main-info">
                <div class="event-title">${titleLine}</div>
                <div class="event-date">${subtitleLine}</div>
            </div>
            <div class="event-type-badge">
                ${ev.tipo_evento_nome || '—'}
            </div>
            <div class="event-toggle-icon">+</div>
        </div>
        <div class="event-details">
            <p><strong>Cidade:</strong> ${ev.cidade_nome || '—'}</p>
            <p><strong>Comum:</strong> ${ev.comum_nome || '—'}</p>
            ${ev.titulo_nome ? `<p><strong>Título:</strong> ${ev.titulo_nome}</p>` : ''}
            ${ev.sigla ? `<p><strong>Sigla:</strong> ${ev.sigla}</p>` : ''}
            ${ev.data ? `<p><strong>Data/Hora:</strong> ${formatDateTime(ev.data)}</p>` : ''}
            <div class="card-actions" style="margin-top: 12px;">
                <button class="icon-button" onclick="editEvent('${ev.id}'); event.stopPropagation();">
                    <span class="material-icons">edit</span>
                </button>
                <button class="icon-button" onclick="deleteEvent('${ev.id}'); event.stopPropagation();">
                    <span class="material-icons">delete</span>
                </button>
            </div>
        </div>
    `;

    // Accordion: expand/collapse
    card.addEventListener('click', (e) => {
        // Não expandir se clicar nos botões de ação
        if (e.target.closest('.card-actions')) return;
        
        const expanded = card.classList.toggle('expanded');
        const toggleIcon = card.querySelector('.event-toggle-icon');
        if (toggleIcon) {
            toggleIcon.textContent = expanded ? '+' : '+';
        }
    });

    return card;
}

// --- Modal para adicionar/editar evento ---
function showEventModal(eventId = null) {
    const isEdit = !!eventId;
    const modalTitle = isEdit ? 'Editar Evento' : 'Novo Evento';
    
    // Criar modal
    const modal = document.createElement('div');
    modal.className = 'modal-overlay';
    modal.innerHTML = `
        <div class="modal-content">
            <div class="modal-header">
                <h2>${modalTitle}</h2>
                <button class="icon-button modal-close">
                    <span class="material-icons">close</span>
                </button>
            </div>
            <form id="event-form" class="modal-form">
                <div class="form-group">
                    <label for="event-tipo">Tipo de Evento *</label>
                    <input type="text" id="event-tipo" required placeholder="Ex: Reunião Regional Ministerial">
                </div>
                
                <div class="form-group">
                    <label for="event-titulo">Título</label>
                    <input type="text" id="event-titulo" placeholder="Ex: Ensaio Regional">
                </div>
                
                <div class="form-group">
                    <label for="event-sigla">Sigla</label>
                    <input type="text" id="event-sigla" placeholder="Ex: RRM">
                </div>
                
                <div class="form-group">
                    <label for="event-cidade">Cidade *</label>
                    <input type="text" id="event-cidade" required placeholder="Ex: São Paulo">
                </div>
                
                <div class="form-group">
                    <label for="event-comum">Comum</label>
                    <input type="text" id="event-comum" placeholder="Ex: Comum Central">
                </div>
                
                <div class="form-group">
                    <label for="event-data">Data e Hora *</label>
                    <input type="datetime-local" id="event-data" required>
                </div>
                
                <div class="modal-actions">
                    <button type="button" class="button secondary-button modal-cancel">Cancelar</button>
                    <button type="submit" class="button primary-button">${isEdit ? 'Salvar' : 'Criar'}</button>
                </div>
            </form>
        </div>
    `;
    
    document.body.appendChild(modal);
    
    // Event listeners
    const closeBtn = modal.querySelector('.modal-close');
    const cancelBtn = modal.querySelector('.modal-cancel');
    const form = modal.querySelector('#event-form');
    
    const closeModal = () => {
        modal.remove();
    };
    
    closeBtn.addEventListener('click', closeModal);
    cancelBtn.addEventListener('click', closeModal);
    modal.addEventListener('click', (e) => {
        if (e.target === modal) closeModal();
    });
    
    // Se for edição, carregar dados
    if (isEdit) {
        loadEventData(eventId, form);
    }
    
    // Submit do formulário
    form.addEventListener('submit', async (e) => {
        e.preventDefault();
        await saveEvent(eventId, form);
        closeModal();
    });
}

async function loadEventData(eventId, form) {
    showLoading();
    try {
        const doc = await db.collection('eventos').doc(eventId).get();
        if (doc.exists) {
            const data = doc.data();
            
            form.querySelector('#event-tipo').value = data.tipo_evento_nome || '';
            form.querySelector('#event-titulo').value = data.titulo_nome || '';
            form.querySelector('#event-sigla').value = data.sigla || '';
            form.querySelector('#event-cidade').value = data.cidade_nome || '';
            form.querySelector('#event-comum').value = data.comum_nome || '';
            
            if (data.data_hora && data.data_hora.toDate) {
                const date = data.data_hora.toDate();
                const dateString = date.toISOString().slice(0, 16);
                form.querySelector('#event-data').value = dateString;
            }
        }
    } catch (error) {
        console.error('❌ Erro ao carregar evento:', error);
        alert('Erro ao carregar dados do evento.');
    } finally {
        hideLoading();
    }
}

async function saveEvent(eventId, form) {
    showLoading();
    
    const eventData = {
        tipo_evento_nome: form.querySelector('#event-tipo').value.trim(),
        titulo_nome: form.querySelector('#event-titulo').value.trim(),
        sigla: form.querySelector('#event-sigla').value.trim(),
        cidade_nome: form.querySelector('#event-cidade').value.trim(),
        comum_nome: form.querySelector('#event-comum').value.trim(),
        data_hora: firebase.firestore.Timestamp.fromDate(new Date(form.querySelector('#event-data').value))
    };
    
    try {
        if (eventId) {
            // Atualizar evento existente
            await db.collection('eventos').doc(eventId).update(eventData);
            console.log('✅ Evento atualizado:', eventId);
        } else {
            // Criar novo evento
            const docRef = await db.collection('eventos').add(eventData);
            console.log('✅ Novo evento criado:', docRef.id);
        }
        
        // Recarregar lista
        await loadEvents();
    } catch (error) {
        console.error('❌ Erro ao salvar evento:', error);
        alert('Erro ao salvar evento: ' + error.message);
    } finally {
        hideLoading();
    }
}

// --- Editar evento ---
function editEvent(eventId) {
    console.log('✏️ Editar evento:', eventId);
    showEventModal(eventId);
}

// --- Deletar evento ---
function deleteEvent(eventId) {
    if (confirm('Tem certeza que deseja excluir este evento?')) {
        showLoading();
        db.collection('eventos').doc(eventId).delete()
            .then(() => {
                console.log('🗑️ Evento excluído:', eventId);
                loadEvents();
            })
            .catch(error => {
                console.error('❌ Erro ao excluir evento:', error);
                alert('Erro ao excluir evento.');
            })
            .finally(() => {
                hideLoading();
            });
    }
}

// --- Auth State Listener ---
auth.onAuthStateChanged(user => {
    if (user) {
        console.log('✅ Usuário logado:', user.email);
        if (userEmailSpan) userEmailSpan.textContent = user.email;
        showApp();

        // Ativa a view padrão (Eventos)
        const defaultNavItem = document.querySelector('.nav-item.active');
        if (defaultNavItem) {
            const defaultViewId = defaultNavItem.dataset.view;
            const defaultTitle = defaultNavItem.dataset.title;
            showView(defaultViewId);
            updateHeaderTitle(defaultTitle);
        }

        // Carrega os eventos
        loadEvents();
    } else {
        console.log('❌ Usuário não logado');
        showAuth();
    }
    hideLoading();
});

// --- Login ---
if (loginForm) {
    loginForm.addEventListener('submit', async (e) => {
        e.preventDefault();
        showLoading();
        const email = loginEmailInput.value;
        const password = loginPasswordInput.value;

        try {
            await auth.signInWithEmailAndPassword(email, password);
            if (errorMessage) errorMessage.textContent = '';
        } catch (error) {
            console.error("❌ Erro no login:", error);
            if (errorMessage) errorMessage.textContent = 'Erro ao fazer login: ' + error.message;
        } finally {
            hideLoading();
        }
    });
}

// --- Logout ---
if (logoutButton) {
    logoutButton.addEventListener('click', async () => {
        showLoading();
        try {
            await auth.signOut();
            console.log('👋 Logout realizado');
        } catch (error) {
            console.error("❌ Erro no logout:", error);
            alert("Erro ao fazer logout: " + error.message);
        } finally {
            hideLoading();
        }
    });
}

// --- Bottom Navigation ---
navItems.forEach(item => {
    item.addEventListener('click', () => {
        navItems.forEach(nav => nav.classList.remove('active'));
        item.classList.add('active');
        const viewId = item.dataset.view;
        const title = item.dataset.title;
        showView(viewId);
        updateHeaderTitle(title);
    });
});

// --- Filtros de eventos ---
filterChips.forEach(chip => {
    chip.addEventListener('click', () => {
        filterChips.forEach(c => c.classList.remove('active'));
        chip.classList.add('active');
        currentFilter = chip.dataset.filter || 'todos';
        console.log(`🔄 Filtro alterado para: ${currentFilter}`);
        renderFilteredEvents();
    });
});

// --- Botão adicionar evento ---
if (addEventButton) {
    addEventButton.addEventListener('click', () => {
        showEventModal();
    });
}

// Initial load state
showLoading();