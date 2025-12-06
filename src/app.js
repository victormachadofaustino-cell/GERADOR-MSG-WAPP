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

    const dateLabel = ev.data ? formatDateTime(ev.data) : 'Data não definida';
    const titleLabel = ev.titulo_nome || ev.tipo_evento_nome || 'Evento';

    card.innerHTML = `
        <div class="event-card-header">
            <div class="event-main-info">
                <div class="event-title">${titleLabel}</div>
                <div class="event-date">${dateLabel}</div>
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

// --- Placeholder functions for edit/delete (CRUD virá depois) ---
function editEvent(eventId) {
    console.log('✏️ Editar evento:', eventId);
    alert('Função de edição será implementada em breve.');
}

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

// Initial load state
showLoading();