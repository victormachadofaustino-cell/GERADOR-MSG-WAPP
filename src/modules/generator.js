// src/modules/generator.js

import { INSTANCES, COLECOES } from '../services/firebase.js';
import * as DOM from './dom-elements.js';
import * as Helpers from '../services/helpers.js';

let eventosDB = [];
let publicosAlvoDB = [];
let templatesDB = [];

const VARIAVEIS_LAYOUT = {
  '[mes_nome]': 'Mês',
  '[ano]': 'Ano',
  '[mes_ano]': 'Mês/Ano',
  '[lista_reunioes]': 'Lista Reuniões',
  '[lista_ensaios]': 'Lista Ensaios',
  '[lista_eventos]': 'Lista geral de eventos'
};

const VARIAVEIS_SNIPPET = {
  '\\[dia_semana\\]': 'Dia',
  '\\[data\\]': 'Data',
  '\\[hora\\]': 'Hora',
  '\\[sigla\\]': 'Sigla',
  '\\[titulo\\]': 'Título',
  '\\[desc_data\\]': 'Desc. Data',
  '\\[cidade\\]': 'Cidade',
  '\\[local\\]': 'Comum',
  '\\[local_detalhe\\]': 'Sala',
  '\\[publico\\]': 'Participantes',
  '\\[quantidade\\]': 'Qtd',
  '\\[link\\]': 'Link',
  '\\[observacoes\\]': 'Obs'
};

const meses = [
  'Janeiro','Fevereiro','Março','Abril','Maio','Junho',
  'Julho','Agosto','Setembro','Outubro','Novembro','Dezembro'
];

// ✅ separador “visível” entre itens do snippet de ensaios
const SEPARADOR_ITENS_ENSAIO = '\n\n';
// ✅ AGORA com uma linha em branco entre reuniões regionais também
const SEPARADOR_ITENS_REUNIAO = '\n\n';

export async function carregarGeradorSelects() {
  const db = INSTANCES.db;
  if (!db) return;

  try {
    const sp = await db.collection(COLECOES.publicos_alvo).orderBy('nome').get();
    publicosAlvoDB.length = 0;

    const selectPublicoGerador = document.getElementById('select-publico-gerador');
    if (selectPublicoGerador) {
      selectPublicoGerador.innerHTML = '<option value="">-- Selecione --</option>';
      sp.forEach(d => {
        const data = d.data();
        publicosAlvoDB.push({ id: d.id, ...data });
        selectPublicoGerador.add(new Option(data.nome, d.id));
      });
    }
  } catch (err) {
    console.error('Erro ao carregar públicos-alvo:', err);
    Helpers.showToast('Erro ao carregar públicos-alvo: ' + err.message, true);
  }

  try {
    const st = await db.collection(COLECOES.templates).orderBy('nome').get();
    templatesDB.length = 0;
    st.forEach(d => templatesDB.push({ id: d.id, ...d.data() }));
  } catch (err) {
    console.error('Erro ao carregar templates:', err);
    Helpers.showToast('Erro ao carregar templates: ' + err.message, true);
  }

  const dataAtual = new Date();
  const mesAtual = (dataAtual.getMonth() + 1).toString().padStart(2, '0');
  const anoAtual = dataAtual.getFullYear();
  const mesAnoRef = document.getElementById('mes-ano-ref');
  if (mesAnoRef) mesAnoRef.value = `${anoAtual}-${mesAtual}`;
}

function getParticipantesLabel(ev) {
  return (
    ev.participante_grupo ||
    ev.publico_grupo ||
    ev.participantes ||
    ev.publico ||
    ''
  );
}

function getQuantidade(ev) {
  return ev.publico_qtd || ev.quantidade || '';
}

function gerarMensagemMassa(e) {
  e.preventDefault();

  const mesAnoRef = document.getElementById('mes-ano-ref');
  const selectPublicoGerador = document.getElementById('select-publico-gerador');
  const resultado = document.getElementById('mensagem-gerada');

  const mes = mesAnoRef?.value;
  const pubId = selectPublicoGerador?.value;

  if (!mes || !pubId) {
    return Helpers.showToast('Preencha Mês/Ano e Público-alvo.', true);
  }

  const publico = publicosAlvoDB.find(p => p.id === pubId);
  if (!publico) return Helpers.showToast('Público-alvo não encontrado.', true);

  const layoutId = publico.template_layout_ref || publico.layout_template_ref || null;
  if (!layoutId) {
    return Helpers.showToast(
      'Público selecionado não tem template de layout vinculado (campo "template_layout_ref").',
      true
    );
  }

  const lay = templatesDB.find(t => t.id === layoutId && t.tipo === 'layout');
  if (!lay) return Helpers.showToast('Template de layout vinculado ao público não foi encontrado.', true);

  const snipMeet = templatesDB.find(t => t.id === lay.snippet_meeting_ref);
  const snipReh = templatesDB.find(t => t.id === lay.snippet_rehearsal_ref);

  if (!snipMeet && !snipReh) {
    return Helpers.showToast(
      'Layout sem snippets de Reunião e Ensaio configurados (snippet_meeting_ref / snippet_rehearsal_ref).',
      true
    );
  }

  const [ano, m] = mes.split('-');

  const allEvts = eventosDB.filter(ev => {
    if (!ev.data_hora) return false;
    const d = new Date(ev.data_hora);
    if (isNaN(d.getTime())) return false;

    const mm = (d.getMonth() + 1).toString().padStart(2, '0');
    const a = d.getFullYear().toString();

    const refs = Array.isArray(ev.publicos_alvo_refs) ? ev.publicos_alvo_refs : [];
    const hasPublico = refs.includes(pubId);

    return mm === m && a === ano && hasPublico;
  });

  if (allEvts.length === 0) {
    if (resultado) resultado.value = 'Nenhum evento encontrado para o público selecionado neste mês.';
    return;
  }

  const meetEvts = allEvts
    .filter(e => !(e.tipo_evento_nome || '').toLowerCase().includes('ensaio'))
    .sort((a, b) => new Date(a.data_hora) - new Date(b.data_hora));

  const rehEvts = allEvts
    .filter(e => (e.tipo_evento_nome || '').toLowerCase().includes('ensaio'))
    .sort((a, b) => new Date(a.data_hora) - new Date(b.data_hora));

  const genLoop = (evList, snippet, separadorItens) => {
    if (!snippet || evList.length === 0) return '';
    let txt = '';

    evList.forEach((ev, idx) => {
      let row = snippet.corpo;
      const d = Helpers.formatarDataHora(ev.data_hora);

      const map = {
        '\\[sigla\\]': ev.titulo_sigla || '',
        '\\[titulo\\]': ev.titulo_nome || '',
        '\\[data\\]': d.data || '',
        '\\[hora\\]': d.hora || '',
        '\\[dia_semana\\]': d.diaSemana || '',
        '\\[cidade\\]': ev.cidade_nome || '',
        '\\[local\\]': ev.comum_nome || '',
        '\\[local_detalhe\\]': ev.realizacao_nome || '',
        '\\[publico\\]': getParticipantesLabel(ev),
        '\\[quantidade\\]': getQuantidade(ev),
        '\\[observacoes\\]': ev.observacoes_extra || '',
        '\\[link\\]': ev.link_externo || '',
        '\\[desc_data\\]': ev.desc_data || ''
      };

      for (const [k, v] of Object.entries(map)) {
        row = row.replace(new RegExp(k, 'gi'), v || '');
      }

      txt += row.trimEnd();
      if (idx < evList.length - 1) txt += separadorItens;
    });

    return txt.trim();
  };

  const txtMeetings = genLoop(meetEvts, snipMeet, SEPARADOR_ITENS_REUNIAO);
  const txtRehearsals = genLoop(rehEvts, snipReh, SEPARADOR_ITENS_ENSAIO);

  let final = lay.corpo;
  const mn = meses[parseInt(m, 10) - 1];

  final = final
    .replace(/\[mes_nome\]/gi, mn)
    .replace(/\[ano\]/gi, ano)
    .replace(/\[mes_ano\]/gi, `${mn} de ${ano}`);

  final = final.replace(/\[lista_reunioes\]/gi, txtMeetings);
  final = final.replace(/\[lista_ensaios\]/gi, txtRehearsals);

  if (final.includes('[lista_eventos]')) {
    const mix = [txtMeetings, txtRehearsals].filter(Boolean).join('\n');
    final = final.replace(/\[lista_eventos\]/gi, mix.trim());
  }

  if (resultado) resultado.value = final.trim();
  Helpers.showToast('Mensagem Gerada!');
}

export function initGeneratorListeners(eventosDB_ref, templatesDB_ref) {
  eventosDB = eventosDB_ref || eventosDB;

  if (templatesDB_ref && templatesDB_ref.length) {
    templatesDB = templatesDB_ref;
  }

  const btnGerar = document.getElementById('btn-gerar-mensagem');
  if (btnGerar) btnGerar.onclick = gerarMensagemMassa;

  const btnCopiar = document.getElementById('btn-copiar-mensagem');
  if (btnCopiar) {
    btnCopiar.onclick = () => {
      const t = document.getElementById('mensagem-gerada');
      if (t) {
        navigator.clipboard
          .writeText(t.value)
          .then(() => Helpers.showToast('Copiado para a área de transferência'))
          .catch(err => Helpers.showToast('Erro ao copiar: ' + err, true));
      }
    };
  }

  const btnLimpar = document.getElementById('btn-limpar-mensagem');
  if (btnLimpar) {
    btnLimpar.onclick = () => {
      const t = document.getElementById('mensagem-gerada');
      if (t) t.value = '';
      Helpers.showToast('Mensagem limpa.');
    };
  }
}

export async function gerarSnippetBotao(id, tipo, templatesDB_ref, eventosDB_ref) {
  const db = INSTANCES.db;
  if (!db) return Helpers.showToast('Banco de dados não disponível.', true);

  if (Array.isArray(templatesDB_ref) && templatesDB_ref.length) templatesDB = templatesDB_ref;
  if (Array.isArray(eventosDB_ref) && eventosDB_ref.length) eventosDB = eventosDB_ref;

  let t = templatesDB.find(x => x.tipo === tipo);

  if (!t) {
    try {
      const snapTpl = await db.collection(COLECOES.templates).where('tipo', '==', tipo).limit(1).get();
      if (!snapTpl.empty) {
        const doc = snapTpl.docs[0];
        t = { id: doc.id, ...doc.data() };
        templatesDB.push(t);
      }
    } catch (err) {
      console.error('Erro ao buscar template de botão:', err);
      return Helpers.showToast('Erro ao buscar template de botão: ' + err.message, true);
    }
  }

  if (!t) return Helpers.showToast('Template de botão não encontrado.', true);

  let ev = eventosDB.find(x => x.id === id);

  if (!ev) {
    try {
      const docEv = await db.collection(COLECOES.eventos).doc(id).get();
      if (docEv.exists) {
        ev = { id: docEv.id, ...docEv.data() };
        eventosDB.push(ev);
      }
    } catch (err) {
      console.error('Erro ao buscar evento para botão:', err);
      return Helpers.showToast('Erro ao buscar evento: ' + err.message, true);
    }
  }

  if (!ev) return Helpers.showToast('Evento não encontrado.', true);

  const d = Helpers.formatarDataHora(ev.data_hora);
  let txt = t.corpo;

  const map = {
    '\\[sigla\\]': ev.titulo_sigla || '',
    '\\[titulo\\]': ev.titulo_nome || '',
    '\\[data\\]': d.data || '',
    '\\[hora\\]': d.hora || '',
    '\\[dia_semana\\]': d.diaSemana || '',
    '\\[cidade\\]': ev.cidade_nome || '',
    '\\[local\\]': ev.comum_nome || '',
    '\\[local_detalhe\\]': ev.realizacao_nome || '',
    '\\[desc_data\\]': ev.desc_data || '',
    '\\[link\\]': ev.link_externo || '',
    '\\[observacoes\\]': ev.observacoes_extra || ''
  };

  for (const [k, v] of Object.entries(map)) {
    txt = txt.replace(new RegExp(k, 'gi'), v || '');
  }

  const resultado = document.getElementById('mensagem-gerada');
  if (resultado) resultado.value = txt.trim();

  Helpers.showToast('Snippet gerado, navegue para o módulo Gerador.');
}

export function updateGeneratorState(events, templates) {
  if (Array.isArray(events)) eventosDB = events;
  if (Array.isArray(templates) && templates.length) templatesDB = templates;
}

export async function refreshGeneratorSelects() {
  await carregarGeradorSelects();
}