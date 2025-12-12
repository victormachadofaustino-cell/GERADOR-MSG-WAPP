// src/modules/events.js

import { INSTANCES, COLECOES } from '../services/firebase.js';
import * as Helpers from '../services/helpers.js';
import { gerarSnippetBotao, updateGeneratorState } from './generator.js';

// ESTADO
let eventosDB = [];
let cidadesDB = [];
let tiposDB = [];
let comunsDB = [];
let realizacoesDB = [];
let participantesDB = [];
let publicosAlvoDB = [];
let titulosDB = [];

let filtroTipoAtual = 'todos';
let tipoMacroSelecionado = null;

let descDataFoiEditadaManualmente = false;
let publicoQtdFoiEditadoManualmente = false;

export function getEventosCache() { return eventosDB; }
export function getCidadesCache() { return cidadesDB; }
export function getTitulosCache() { return titulosDB; }

// ===============================
// HELPERS
// ===============================
function parseDataHora(dataHora) {
  if (!dataHora) return new Date(0);
  const d = new Date(dataHora);
  return isNaN(d.getTime()) ? new Date(0) : d;
}

function getAnoMes(ev) {
  const d = parseDataHora(ev.data_hora);
  return { ano: d.getFullYear(), mes: d.getMonth() + 1 };
}

function nomeMes(mes) {
  const nomes = ['Jan', 'Fev', 'Mar', 'Abr', 'Mai', 'Jun', 'Jul', 'Ago', 'Set', 'Out', 'Nov', 'Dez'];
  return nomes[mes - 1] || `Mês ${mes}`;
}

function isEventoCancelado(ev) {
  return ev?.is_cancelado === true || ev?.is_cancelada === true;
}

function isEventoExtra(ev) { return ev?.is_extraordinaria === true; }

function classificarTipoEvento(ev) {
  if (ev.tipo_evento_macro === 'reunioes') return 'reunioes';
  if (ev.tipo_evento_macro === 'ensaios') return 'ensaios';

  const nomeTipo = (ev.tipo_evento_nome || ev.tipo_nome || '').toLowerCase().trim();
  if (nomeTipo.includes('reuniao') || nomeTipo.includes('reunião') || nomeTipo.includes('reunioes') || nomeTipo.includes('reuniões')) return 'reunioes';
  if (nomeTipo.includes('ensaio') || nomeTipo.includes('ensaios')) return 'ensaios';
  return 'extras';
}

function getFieldBlockByInputId(inputId) {
  const el = document.getElementById(inputId);
  if (!el) return null;
  return el.closest('.form-group') || el.parentElement;
}

function moveBlocksInOrder(formEl, blocks) {
  blocks.forEach(b => {
    if (b && formEl.contains(b)) formEl.appendChild(b);
  });
}

function extractFirstNumber(text) {
  if (!text) return '';
  const m = String(text).match(/(\d+)/);
  return m ? m[1] : '';
}

function descricaoDiaDaSemana(dateObj) {
  const dias = ['domingo', 'segunda-feira', 'terça-feira', 'quarta-feira', 'quinta-feira', 'sexta-feira', 'sábado'];
  return dias[dateObj.getDay()];
}

function ordinalPt(n, generoFeminino = true) {
  return generoFeminino ? `${n}ª` : `${n}º`;
}

function ocorrenciaNoMes(dateObj) {
  const diaSemana = dateObj.getDay();
  const dia = dateObj.getDate();
  let count = 0;

  for (let d = 1; d <= dia; d++) {
    const tmp = new Date(dateObj.getFullYear(), dateObj.getMonth(), d);
    if (tmp.getDay() === diaSemana) count++;
  }
  return count;
}

function gerarDescricaoDataFromISO(isoDate) {
  if (!isoDate) return '';
  const d = new Date(`${isoDate}T00:00:00`);
  if (isNaN(d.getTime())) return '';
  const occ = ocorrenciaNoMes(d);
  const dow = descricaoDiaDaSemana(d);

  const feminino = dow !== 'domingo' && dow !== 'sábado';
  return `${ordinalPt(occ, feminino)} ${dow}`;
}

function filtrarComunsPorCidade(cidadeId) {
  if (!cidadeId) return comunsDB;
  return comunsDB.filter(c => c.cidade_ref === cidadeId || !c.cidade_ref);
}

// ===============================
// CARREGAMENTO INICIAL
// ===============================
export async function carregarEventosIniciais() {
  const db = INSTANCES.db;
  if (!db) return;

  try {
    cidadesDB = (await db.collection(COLECOES.cidades).orderBy('nome').get()).docs.map(d => ({ id: d.id, ...d.data() }));
    tiposDB = (await db.collection(COLECOES.eventos_tipos).orderBy('nome').get()).docs.map(d => ({ id: d.id, ...d.data() }));
    comunsDB = (await db.collection(COLECOES.comuns).orderBy('nome').get()).docs.map(d => ({ id: d.id, ...d.data() }));
    realizacoesDB = (await db.collection(COLECOES.realizacoes).orderBy('nome').get()).docs.map(d => ({ id: d.id, ...d.data() }));
    participantesDB = (await db.collection(COLECOES.participantes).orderBy('grupo').get()).docs.map(d => ({ id: d.id, ...d.data() }));
    publicosAlvoDB = (await db.collection(COLECOES.publicos_alvo).orderBy('nome').get()).docs.map(d => ({ id: d.id, ...d.data() }));
    titulosDB = (await db.collection(COLECOES.eventos_titulos).orderBy('sigla').get()).docs.map(d => ({ id: d.id, ...d.data() }));

    eventosDB = (await db.collection(COLECOES.eventos).get()).docs.map(d => ({ id: d.id, ...d.data() }));
    eventosDB.sort((a, b) => parseDataHora(a.data_hora) - parseDataHora(b.data_hora));

    renderizarLista();
    updateGeneratorState(eventosDB, []);
    console.log('✅ Eventos e cadastros carregados.');
  } catch (err) {
    console.error('Erro ao carregar:', err);
    Helpers.showToast('Erro ao carregar dados: ' + err.message, true);
  }
}

// ===============================
// RENDERIZAÇÃO
// ===============================
function filtrarEventosPorTipo(ev) {
  const cancelado = isEventoCancelado(ev);
  const extra = isEventoExtra(ev);
  const macroTipo = classificarTipoEvento(ev);

  if (filtroTipoAtual === 'cancelados') return cancelado;
  if (cancelado) return false;

  if (filtroTipoAtual === 'todos') return true;
  if (filtroTipoAtual === 'reunioes') return macroTipo === 'reunioes';
  if (filtroTipoAtual === 'ensaios') return macroTipo === 'ensaios';
  if (filtroTipoAtual === 'extras') return extra === true;

  return true;
}

function renderizarLista() {
  const ulAnos = document.getElementById('lista-eventos');
  if (!ulAnos) return;

  ulAnos.innerHTML = '';
  const eventosFiltrados = eventosDB.filter(filtrarEventosPorTipo);

  if (eventosFiltrados.length === 0) {
    ulAnos.innerHTML = '<li style="padding:15px;text-align:center;color:#777;">Nenhum evento encontrado.</li>';
    return;
  }

  const mapa = {};
  eventosFiltrados.forEach(ev => {
    const { ano, mes } = getAnoMes(ev);
    if (!ano || !mes) return;
    if (!mapa[ano]) mapa[ano] = {};
    if (!mapa[ano][mes]) mapa[ano][mes] = [];
    mapa[ano][mes].push(ev);
  });

  const anos = Object.keys(mapa).map(n => parseInt(n, 10)).sort((a, b) => b - a);
  const anoAtual = new Date().getFullYear();

  anos.forEach(ano => {
    const liAno = document.createElement('li');
    liAno.className = 'ano-item' + (ano === anoAtual ? ' aberto' : '');

    const headerAno = document.createElement('div');
    headerAno.className = 'ano-header';
    headerAno.dataset.ano = String(ano);
    headerAno.innerHTML = `
      <div class="ano-header-inner">
        <span class="ano-titulo">${ano}</span>
        <span class="ano-toggle-icon">${ano === anoAtual ? '▼' : '▶'}</span>
      </div>
    `;
    liAno.appendChild(headerAno);

    const ulMeses = document.createElement('ul');
    ulMeses.className = 'lista-meses';
    ulMeses.style.display = ano === anoAtual ? '' : 'none';

    Object.keys(mapa[ano]).map(n => parseInt(n, 10)).sort((a, b) => b - a).forEach(mes => {
      const eventosMes = mapa[ano][mes];

      const liMes = document.createElement('li');
      liMes.className = 'mes-item';

      const headerMes = document.createElement('div');
      headerMes.className = 'mes-header';
      headerMes.innerHTML = `
        <div class="mes-header-inner">
          <span class="mes-titulo">${nomeMes(mes)}</span>
          <span class="mes-contagem">${eventosMes.length} evt(s)</span>
          <span class="mes-toggle-icon">▶</span>
        </div>
      `;
      liMes.appendChild(headerMes);

      const ulEventos = document.createElement('ul');
      ulEventos.className = 'lista-eventos-mes';
      ulEventos.style.display = 'none';

      eventosMes.forEach(ev => {
        const cidadeNome = cidadesDB.find(c => c.id === ev.cidade_ref)?.nome || ev.cidade_nome || 'N/D';
        const comumNome = comunsDB.find(c => c.id === ev.comum_ref)?.nome || ev.comum_nome || 'N/D';
        const dataObj = parseDataHora(ev.data_hora);

        const dataStr = dataObj.toLocaleString('pt-BR', {
          day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit'
        });

        const cancelado = isEventoCancelado(ev);
        const extra = isEventoExtra(ev);
        const macroTipo = classificarTipoEvento(ev);

        const tituloSigla =
          macroTipo === 'ensaios'
            ? 'ER'
            : (titulosDB.find(t => t.id === ev.titulo_ref)?.sigla || ev.titulo_sigla || '');

        const tituloTexto =
          macroTipo === 'ensaios'
            ? (ev.titulo_nome || ev.titulo_sigla || 'Ensaio Regional')
            : (ev.titulo_nome || ev.titulo_sigla || '-');

        const tipoNome = macroTipo === 'ensaios' ? 'Ensaios Regionais' : (ev.tipo_evento_nome || '-');

        const liEv = document.createElement('li');
        liEv.className = `accordion-item evento-item ${cancelado ? 'evento-cancelado' : ''}`;
        liEv.dataset.id = ev.id;

        liEv.innerHTML = `
          <div class="accordion-header">
            <div class="accordion-title">
              <span class="sigla">${tituloSigla}</span>
              <span class="titulo">${tituloTexto}</span>
            </div>
            <div class="accordion-subtitle">
              <span>${cidadeNome} - ${comumNome}</span>
              <span>${dataStr}</span>
            </div>
            <div class="accordion-tags">
              <span class="tag-tipo">${macroTipo === 'reunioes' ? 'Reunião' : (macroTipo === 'ensaios' ? 'Ensaio' : 'Outro')}</span>
              ${extra ? '<span class="tag-extra">Extra</span>' : ''}
              ${cancelado ? '<span class="tag-cancelado">Cancelado</span>' : ''}
            </div>
            <span class="accordion-toggle-icon">▶</span>
          </div>
          <div class="accordion-content">
            <div class="accordion-content-inner">
              <p><strong>Tipo:</strong> ${tipoNome}</p>
              ${ev.realizacao_nome ? `<p><strong>Realização:</strong> ${ev.realizacao_nome}</p>` : ''}
              ${ev.publico_qtd ? `<p><strong>Participantes (Qtd):</strong> ${ev.publico_qtd}</p>` : ''}
              ${ev.desc_data ? `<p><strong>Descrição:</strong> ${ev.desc_data}</p>` : ''}
              <p><strong>Observações:</strong> ${ev.observacoes_extra || '-'}</p>
              <div class="btn-group">
                <button class="btn secundario btn-snippet" data-id="${ev.id}" data-tipo="botao_convite">Convite</button>
                <button class="btn secundario btn-snippet" data-id="${ev.id}" data-tipo="botao_lembrete">Lembrete</button>
                <button class="btn-edit" data-id="${ev.id}">✏️</button>
                <button class="btn-delete" data-id="${ev.id}">🗑️</button>
              </div>
            </div>
          </div>
        `;
        ulEventos.appendChild(liEv);
      });

      liMes.appendChild(ulEventos);
      ulMeses.appendChild(liMes);
    });

    liAno.appendChild(ulMeses);
    ulAnos.appendChild(liAno);
  });
}

// ===============================
// MODAL TIPO EVENTO
// ===============================
function mostrarModalTipo() {
  const modal = document.getElementById('modal-tipo-evento');
  if (!modal) return;
  modal.classList.remove('hidden');
}

function esconderModalTipo() {
  const modal = document.getElementById('modal-tipo-evento');
  if (!modal) return;
  modal.classList.add('hidden');
}

function escolherTipoEvento(tipo) {
  tipoMacroSelecionado = tipo;
  esconderModalTipo();
  abrirFormEvento();
}

// ===============================
// FORM – ORDEM / INTELIGÊNCIA
// ===============================
function aplicarOrdemCamposNoForm() {
  const form = document.getElementById('form-evento');
  if (!form) return;

  const blocks = [
    getFieldBlockByInputId('evento-titulo'),
    getFieldBlockByInputId('evento-cidade'),
    getFieldBlockByInputId('evento-comum'),
    getFieldBlockByInputId('evento-data'),
    getFieldBlockByInputId('evento-hora'),
    getFieldBlockByInputId('evento-desc-data'),

    getFieldBlockByInputId('evento-realizacao'),
    getFieldBlockByInputId('evento-participantes'),
    getFieldBlockByInputId('evento-publico-qtd'),
    getFieldBlockByInputId('evento-link'),
    getFieldBlockByInputId('evento-observacoes'),

    document.getElementById('campo-publico-container'),
    getFieldBlockByInputId('evento-cancelado'),
    document.getElementById('flag-extra-container')
  ].filter(Boolean);

  moveBlocksInOrder(form, blocks);
}

function preencherDescricaoDataAuto() {
  const inpData = document.getElementById('evento-data');
  const inpDesc = document.getElementById('evento-desc-data');
  if (!inpData || !inpDesc) return;

  if (descDataFoiEditadaManualmente) return;

  const desc = gerarDescricaoDataFromISO(inpData.value);
  if (desc) inpDesc.value = desc;
}

function preencherComunsParaCidade(cidadeId, comumSelecionada = '') {
  const comumSel = document.getElementById('evento-comum');
  if (!comumSel) return;

  const comunsFiltradas = filtrarComunsPorCidade(cidadeId);
  comumSel.innerHTML =
    '<option value="">Selecione</option>' +
    comunsFiltradas.map(c => `<option value="${c.id}">${c.nome}</option>`).join('');

  if (comumSelecionada) comumSel.value = comumSelecionada;
}

function ensureParticipantsDropdown() {
  const form = document.getElementById('form-evento');
  if (!form) return;

  let select = document.getElementById('evento-participantes');
  if (select) return;

  const block = document.createElement('div');
  block.className = 'form-group';
  block.id = 'campo-participantes-dropdown-container';
  block.innerHTML = `
    <label for="evento-participantes">Participantes</label>
    <select id="evento-participantes" class="input">
      <option value="">Selecione</option>
    </select>
    <small style="display:block;margin-top:4px;color:#666;font-size:0.85em;">
      Ao selecionar, tentaremos preencher automaticamente a quantidade média.
    </small>
  `;
  form.appendChild(block);
}

function preencherDropdownParticipantes(selectedId = '') {
  const select = document.getElementById('evento-participantes');
  if (!select) return;

  select.innerHTML =
    '<option value="">Selecione</option>' +
    participantesDB.map(p => {
      const label = p.grupo || p.nome || p.id;
      return `<option value="${p.id}">${label}</option>`;
    }).join('');

  if (selectedId) select.value = selectedId;
}

// ===============================
// CRUD
// ===============================
async function salvarEvento(e) {
  e.preventDefault();
  const db = INSTANCES.db;
  if (!db) return;

  const form = document.getElementById('form-evento');
  const id = form?.dataset?.id || null;

  const cidade = document.getElementById('evento-cidade')?.value || '';
  const comum = document.getElementById('evento-comum')?.value || '';
  const data = document.getElementById('evento-data')?.value || '';
  const hora = document.getElementById('evento-hora')?.value || '';
  const descData = document.getElementById('evento-desc-data')?.value || '';
  const obs = document.getElementById('evento-observacoes')?.value || '';

  const cancelado = document.getElementById('evento-cancelado')?.checked || false;
  const extra = document.getElementById('evento-extra')?.checked || false;

  if (!cidade || !comum || !data || !hora) {
    Helpers.showToast('Preencha cidade, comum, data e hora.', true);
    return;
  }

  const publicosSelecionados = Array.from(document.querySelectorAll('#evento-publicos-checkboxes input[type="checkbox"]'))
    .filter(cb => cb.checked)
    .map(cb => cb.value);

  if (publicosSelecionados.length === 0) {
    Helpers.showToast('Selecione pelo menos 1 público-alvo.', true);
    return;
  }

  if (!tipoMacroSelecionado && id) {
    const evAntigo = eventosDB.find(ei => ei.id === id);
    if (evAntigo) tipoMacroSelecionado = classificarTipoEvento(evAntigo);
  }
  const macro = tipoMacroSelecionado || 'ensaios';

  const comumObj = comunsDB.find(c => c.id === comum);
  const cidadeObj = cidadesDB.find(c => c.id === cidade);

  const payloadBase = {
    comum_ref: comum,
    comum_nome: comumObj?.nome || '',
    cidade_ref: cidade,
    cidade_nome: cidadeObj?.nome || '',
    data_hora: `${data}T${hora}:00`,
    desc_data: descData,
    observacoes_extra: obs,

    is_cancelado: cancelado,
    is_cancelada: cancelado,

    is_extraordinaria: extra,
    tipo_evento_ref: '',
    tipo_evento_nome: macro === 'reunioes' ? 'Reuniões Regionais' : 'Ensaios Regionais',
    tipo_evento_macro: macro,
    publicos_alvo_refs: publicosSelecionados
  };

  if (macro === 'reunioes') {
    const titulo = document.getElementById('evento-titulo')?.value || '';
    const realizacao = document.getElementById('evento-realizacao')?.value || '';
    const publicoQtd = document.getElementById('evento-publico-qtd')?.value || '';
    const link = document.getElementById('evento-link')?.value || '';

    const tituloObj = titulosDB.find(t => t.id === titulo);
    const realizacaoObj = realizacoesDB.find(r => r.id === realizacao);

    const participanteRef = document.getElementById('evento-participantes')?.value || '';
    const participanteObj = participantesDB.find(p => p.id === participanteRef);

    Object.assign(payloadBase, {
      titulo_ref: titulo,
      titulo_nome: tituloObj?.titulo || '',
      titulo_sigla: tituloObj?.sigla || '',
      realizacao_ref: realizacao,
      realizacao_nome: realizacaoObj?.nome || '',
      publico_qtd: publicoQtd,
      link_externo: link,

      participante_ref: participanteRef,
      participante_grupo: participanteObj?.grupo || '',
      participantes_refs: participanteRef ? [participanteRef] : []
    });
  }

  if (macro === 'ensaios') {
    Object.assign(payloadBase, {
      titulo_sigla: 'ER',
      titulo_nome: 'Ensaio Regional'
    });
  }

  try {
    if (id) {
      await db.collection(COLECOES.eventos).doc(id).update(payloadBase);
      const idx = eventosDB.findIndex(ei => ei.id === id);
      if (idx >= 0) eventosDB[idx] = { id, ...eventosDB[idx], ...payloadBase };
      Helpers.showToast('Evento atualizado!');
    } else {
      const docRef = await db.collection(COLECOES.eventos).add(payloadBase);
      eventosDB.push({ id: docRef.id, ...payloadBase });
      Helpers.showToast('Evento criado!');
    }

    eventosDB.sort((a, b) => parseDataHora(a.data_hora) - parseDataHora(b.data_hora));
    renderizarLista();
    updateGeneratorState(eventosDB, []);
    fecharFormEvento();
  } catch (err) {
    console.error(err);
    Helpers.showToast('Erro: ' + err.message, true);
  }
}

async function excluirEvento(id) {
  const db = INSTANCES.db;
  Helpers.showDeleteModal('Evento', async () => {
    try {
      await db.collection(COLECOES.eventos).doc(id).delete();
      eventosDB = eventosDB.filter(e => e.id !== id);
      renderizarLista();
      updateGeneratorState(eventosDB, []);
      Helpers.showToast('Evento excluído.');
    } catch (err) {
      Helpers.showToast('Erro: ' + err.message, true);
    }
  });
}

// ===============================
// FORM EVENTO
// ===============================
function abrirFormEvento(ev = null) {
  const container = document.getElementById('evento-form-container');
  const form = document.getElementById('form-evento');
  const title = document.getElementById('evento-modal-title');

  if (!container || !form || !title) {
    console.error('❌ Elementos do form de evento não encontrados no DOM');
    return;
  }

  descDataFoiEditadaManualmente = false;
  publicoQtdFoiEditadoManualmente = false;

  container.classList.remove('hidden');
  form.reset();
  form.dataset.id = ev?.id || '';
  title.textContent = ev ? 'Editar Evento' : 'Novo Evento';

  const cidadeSel = document.getElementById('evento-cidade');
  const comumSel = document.getElementById('evento-comum');

  cidadeSel.innerHTML =
    '<option value="">Selecione</option>' +
    cidadesDB.map(c => `<option value="${c.id}">${c.nome}</option>`).join('');

  comumSel.innerHTML = '<option value="">Selecione</option>';

  ensureParticipantsDropdown();

  const macroTipo = ev ? classificarTipoEvento(ev) : (tipoMacroSelecionado || 'ensaios');
  tipoMacroSelecionado = macroTipo;
  configurarFormPorTipo(macroTipo);

  if (macroTipo === 'reunioes') {
    const participanteId = ev?.participante_ref || (Array.isArray(ev?.participantes_refs) ? ev.participantes_refs[0] : '');
    preencherDropdownParticipantes(participanteId);
  }

  const cidadeRef = ev?.cidade_ref || '';
  document.getElementById('evento-cidade').value = cidadeRef;
  preencherComunsParaCidade(cidadeRef, ev?.comum_ref || '');

  if (ev?.data_hora) {
    const d = parseDataHora(ev.data_hora);
    document.getElementById('evento-data').value = d.toISOString().slice(0, 10);
    document.getElementById('evento-hora').value = d.toTimeString().slice(0, 5);
  }

  const descInput = document.getElementById('evento-desc-data');
  if (descInput) {
    descInput.value = ev?.desc_data || '';
    if (descInput.value) descDataFoiEditadaManualmente = true;
    if (!descDataFoiEditadaManualmente) preencherDescricaoDataAuto();
  }

  document.getElementById('evento-observacoes').value = ev?.observacoes_extra || '';
  document.getElementById('evento-cancelado').checked = isEventoCancelado(ev || {});
  const extraCheckbox = document.getElementById('evento-extra');
  if (extraCheckbox) extraCheckbox.checked = isEventoExtra(ev || {});

  setTimeout(() => {
    const containerCheckboxes = document.getElementById('evento-publicos-checkboxes');
    if (containerCheckboxes) {
      containerCheckboxes.querySelectorAll('input[type="checkbox"]').forEach(cb => (cb.checked = false));
      (ev?.publicos_alvo_refs || []).forEach(idCheck => {
        const cb = containerCheckboxes.querySelector(`input[value="${idCheck}"]`);
        if (cb) cb.checked = true;
      });
    }
  }, 0);

  aplicarOrdemCamposNoForm();
}

function configurarFormPorTipo(tipo) {
  const camposReuniao = [
    'campo-titulo-container',
    'campo-realizacao-container',
    'campo-publico-qtd-container',
    'campo-link-container',
    'flag-extra-container'
  ];

  camposReuniao.forEach(id => document.getElementById(id)?.classList.add('hidden'));
  document.getElementById('campo-participantes-dropdown-container')?.classList.add('hidden');

  const publicoContainer = document.getElementById('campo-publico-container');
  if (publicoContainer) publicoContainer.classList.remove('hidden');

  const containerCheckboxes = document.getElementById('evento-publicos-checkboxes');
  if (containerCheckboxes) {
    containerCheckboxes.innerHTML = publicosAlvoDB
      .map(p => `<label><input type="checkbox" value="${p.id}" /> ${p.nome}</label>`)
      .join('');
  }

  if (tipo === 'reunioes') {
    camposReuniao.forEach(id => document.getElementById(id)?.classList.remove('hidden'));
    document.getElementById('campo-participantes-dropdown-container')?.classList.remove('hidden');

    document.getElementById('evento-titulo').innerHTML =
      '<option value="">Selecione</option>' +
      titulosDB.map(t => `<option value="${t.id}">${t.sigla} - ${t.titulo}</option>`).join('');

    document.getElementById('evento-realizacao').innerHTML =
      '<option value="">Selecione</option>' +
      realizacoesDB.map(r => `<option value="${r.id}">${r.nome}</option>`).join('');
  }
}

function fecharFormEvento() {
  document.getElementById('evento-form-container')?.classList.add('hidden');
}

// ===============================
// LISTENERS
// ===============================
export function initEventsListeners() {
  document.getElementById('btn-novo-evento')?.addEventListener('click', mostrarModalTipo);

  document.getElementById('modal-tipo-evento')?.addEventListener('click', (e) => {
    const btnTipo = e.target.closest('.tipo-btn');
    if (btnTipo && btnTipo.dataset.tipo) {
      escolherTipoEvento(btnTipo.dataset.tipo);
      return;
    }
    if (e.target.id === 'modal-tipo-evento') esconderModalTipo();
  });

  document.getElementById('form-evento')?.addEventListener('submit', salvarEvento);
  document.getElementById('btn-cancelar-evento-form')?.addEventListener('click', fecharFormEvento);
  document.getElementById('btn-cancelar-evento')?.addEventListener('click', fecharFormEvento);

  document.getElementById('evento-cidade')?.addEventListener('change', (e) => {
    const cidadeId = e.target.value;
    preencherComunsParaCidade(cidadeId, '');
  });

  document.getElementById('evento-desc-data')?.addEventListener('input', () => {
    descDataFoiEditadaManualmente = true;
  });
  document.getElementById('evento-data')?.addEventListener('change', () => {
    preencherDescricaoDataAuto();
  });

  document.getElementById('evento-publico-qtd')?.addEventListener('input', () => {
    publicoQtdFoiEditadoManualmente = true;
  });

  document.addEventListener('change', (e) => {
    if (e.target && e.target.id === 'evento-participantes') {
      const id = e.target.value;
      const p = participantesDB.find(x => x.id === id);
      if (!p) return;

      const qtdMedia = p.quantidade_media || '';
      const numero = extractFirstNumber(qtdMedia);

      const qtdEl = document.getElementById('evento-publico-qtd');
      if (qtdEl && !publicoQtdFoiEditadoManualmente) {
        if (numero) qtdEl.value = numero;
      }
    }
  });

  document.getElementById('lista-eventos')?.addEventListener('click', (e) => {
    const headerAno = e.target.closest('.ano-header');
    const headerMes = e.target.closest('.mes-header');
    const headerEvento = e.target.closest('.accordion-header');
    const btnSnippet = e.target.closest('.btn-snippet');
    const btnEdit = e.target.closest('.btn-edit');
    const btnDelete = e.target.closest('.btn-delete');

    if (headerAno) {
      const liAno = headerAno.closest('.ano-item');
      const ulMeses = liAno.querySelector('.lista-meses');
      const icon = headerAno.querySelector('.ano-toggle-icon');
      const aberto = liAno.classList.toggle('aberto');
      if (ulMeses) ulMeses.style.display = aberto ? '' : 'none';
      if (icon) icon.textContent = aberto ? '▼' : '▶';
      return;
    }

    if (headerMes) {
      const liMes = headerMes.closest('.mes-item');
      const ulEventos = liMes.querySelector('.lista-eventos-mes');
      const icon = headerMes.querySelector('.mes-toggle-icon');
      const aberto = liMes.classList.toggle('aberto');
      if (ulEventos) ulEventos.style.display = aberto ? '' : 'none';
      if (icon) icon.textContent = aberto ? '▼' : '▶';
      return;
    }

    if (headerEvento && !btnSnippet && !btnEdit && !btnDelete) {
      const item = headerEvento.closest('.accordion-item');
      const content = item.querySelector('.accordion-content');

      document.querySelectorAll('#lista-eventos .accordion-item.ativa').forEach(other => {
        if (other !== item) {
          other.classList.remove('ativa');
          const otherContent = other.querySelector('.accordion-content');
          if (otherContent) otherContent.style.maxHeight = '0';
        }
      });

      const ativa = item.classList.toggle('ativa');
      if (content) content.style.maxHeight = ativa ? content.scrollHeight + 2 + 'px' : '0';
      return;
    }

    if (btnSnippet) {
      gerarSnippetBotao(btnSnippet.dataset.id, btnSnippet.dataset.tipo, [], eventosDB);
      return;
    }

    if (btnEdit) {
      const ev = eventosDB.find(ei => ei.id === btnEdit.dataset.id);
      if (ev) abrirFormEvento(ev);
      return;
    }

    if (btnDelete) {
      excluirEvento(btnDelete.dataset.id);
    }
  });

  document.querySelector('.event-filters')?.addEventListener('click', (e) => {
    const btn = e.target.closest('.event-filter-btn');
    if (btn) {
      filtroTipoAtual = btn.dataset.filter;
      document.querySelectorAll('.event-filter-btn').forEach(b => b.classList.toggle('active', b === btn));
      renderizarLista();
    }
  });
}