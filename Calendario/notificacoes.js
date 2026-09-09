const toggleNotificacoes = document.getElementById('toggleNotificacoes');
const labelNotificacao = document.getElementById('labelNotificacao');
let timerNotificacao = null;
let versaoNotificacoes = 0;
const LIMITE_TIMEOUT = 2147483647;

function suportaNotificacoes() {
  return typeof Notification !== 'undefined';
}

function atualizarLabelToggle(mensagem) {
  labelNotificacao.textContent = toggleNotificacoes.checked ? '🔔' : '🔕';
  labelNotificacao.title = mensagem || (toggleNotificacoes.checked
    ? 'Notificações ativadas. Mantenha esta aba aberta para receber os alertas.'
    : 'Ative as notificações para receber alertas enquanto esta aba estiver aberta.');
  toggleNotificacoes.setAttribute('aria-label', labelNotificacao.title);
}

function salvarEstadoToggle() {
  localStorage.setItem('notificacoesAtivas', toggleNotificacoes.checked ? '1' : '0');
}

function notificacoesEstaoAtivas() {
  return toggleNotificacoes.checked;
}

function cancelarNotificacoes() {
  versaoNotificacoes++;
  clearTimeout(timerNotificacao);
  timerNotificacao = null;
}

function desativarNotificacoes(mensagem) {
  cancelarNotificacoes();
  toggleNotificacoes.checked = false;
  salvarEstadoToggle();
  atualizarLabelToggle(mensagem);
}

// Não depende do cache da busca, que pode ainda estar vazio ou em carregamento.
async function carregarDadosNotificacoes() {
  if (typeof Android !== 'undefined' && typeof Android.getJson === 'function') {
    try {
      return JSON.parse(Android.getJson());
    } catch (erro) {
      console.warn('Erro ao carregar notificações via Android:', erro);
    }
  }
  async function lerJson(url) {
    const resposta = await fetch(url);
    if (!resposta.ok) throw new Error(`Não foi possível carregar ${url}`);
    return resposta.json();
  }
  const { anos } = await lerJson('../Calendario/anos.json');
  const anoAtual = new Date().getFullYear();
  const blocos = await Promise.all(anos.filter(ano => ano >= anoAtual).map(async ano => {
    const dados = await lerJson(`../Calendario/${ano}.json`);
    return [ano, dados[ano] || dados];
  }));
  return Object.fromEntries(blocos);
}

function coletarEventosNotificacoes(dados, raidsData, meta) {
  const eventos = [];
  const vistos = new Set();
  const agora = Date.now();
  for (const bloco of Object.values(dados || {})) {
    for (const [categoria, lista] of Object.entries(bloco || {})) {
      if (!Array.isArray(lista)) continue;
      for (const original of lista) {
        const base = categoria === 'raid_hour' ? 'raid' : categoria;
        const info = original.ref ? buscarPorRef(raidsData?.[base], original.ref) : original;
        if (!info) continue;
        const titulo = (original.titulo_alt || original.titulo || info.titulo || '').trim();
        const inicio = Date.parse(original.inicio);
        const fim = Date.parse(original.fim);
        // Modelos incompletos permanecem nos arquivos, mas não geram alertas.
        if (!titulo || !Number.isFinite(inicio) || !Number.isFinite(fim) || fim < inicio || inicio <= agora) continue;
        const chave = JSON.stringify([categoria, titulo, inicio]);
        if (vistos.has(chave)) continue;
        vistos.add(chave);
        eventos.push({
          titulo, inicio, chave,
          img: resolverImagemEvento(original, info, categoria, meta?.meta?.categorias) || '../Assets/icon-event2.png',
        });
      }
    }
  }
  return eventos.sort((a, b) => a.inicio - b.inicio);
}

function agendarNotificacaoProximoEvento(dados, raidsData = raidsGlobais, meta = metaGlobais) {
  cancelarNotificacoes();
  if (!notificacoesEstaoAtivas() || !suportaNotificacoes() || Notification.permission !== 'granted') return;
  const versao = versaoNotificacoes;
  const fila = coletarEventosNotificacoes(dados, raidsData, meta);

  function agendar() {
    if (versao !== versaoNotificacoes || !notificacoesEstaoAtivas()) return;
    if (Notification.permission !== 'granted') {
      desativarNotificacoes('A permissão de notificações foi removida no navegador.');
      return;
    }
    if (!fila.length) {
      atualizarLabelToggle('Notificações ativadas. Nenhum próximo evento válido nos dados carregados.');
      return;
    }
    // Esperas maiores que o limite do navegador são divididas sem antecipar o alerta.
    const espera = Math.min(Math.max(0, fila[0].inicio - Date.now()), LIMITE_TIMEOUT);
    timerNotificacao = setTimeout(() => {
      timerNotificacao = null;
      if (versao !== versaoNotificacoes || !notificacoesEstaoAtivas()) return;
      if (Notification.permission !== 'granted') {
        desativarNotificacoes('A permissão de notificações foi removida no navegador.');
        return;
      }
      try {
        while (fila.length && fila[0].inicio <= Date.now()) {
          const evento = fila.shift();
          const horario = new Date(evento.inicio).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' });
          new Notification('Evento começando!', {
            body: `${evento.titulo} — início às ${horario}.`,
            icon: evento.img,
            tag: evento.chave,
          });
        }
      } catch (erro) {
        console.error('Erro ao exibir notificação:', erro);
        desativarNotificacoes('Este navegador não conseguiu exibir o alerta. Tente um navegador no computador.');
        alert(labelNotificacao.title);
        return;
      }
      agendar();
    }, espera);
  }
  agendar();
}

async function ativarNotificacoes(pedirPermissao) {
  cancelarNotificacoes();
  const versao = versaoNotificacoes;
  try {
    if (!suportaNotificacoes()) throw new Error('Este navegador não oferece suporte a notificações.');
    let permissao = Notification.permission;
    if (permissao === 'default' && pedirPermissao) {
      permissao = await Notification.requestPermission();
    }
    if (versao !== versaoNotificacoes || !notificacoesEstaoAtivas()) return;
    if (permissao !== 'granted') {
      throw new Error('Para receber alertas, permita as notificações nas configurações do navegador.');
    }
    atualizarLabelToggle('Carregando os próximos eventos para notificação...');
    const [dados, raids, meta] = await Promise.all([
      carregarDadosNotificacoes(), carregarRaids(), carregarMeta(),
    ]);
    if (versao !== versaoNotificacoes || !notificacoesEstaoAtivas()) return;
    if (!raids) throw new Error('Não foi possível carregar o catálogo de raids. Tente ativar novamente.');
    salvarEstadoToggle();
    atualizarLabelToggle();
    agendarNotificacaoProximoEvento(dados, raids, meta);
  } catch (erro) {
    if (versao !== versaoNotificacoes) return;
    console.error('Erro ao ativar notificações:', erro);
    desativarNotificacoes(erro.message);
    if (pedirPermissao) alert(erro.message);
  }
}

document.addEventListener('DOMContentLoaded', async () => {
  toggleNotificacoes.disabled = !suportaNotificacoes();
  toggleNotificacoes.checked = suportaNotificacoes()
    && Notification.permission === 'granted'
    && localStorage.getItem('notificacoesAtivas') === '1';
  salvarEstadoToggle();
  atualizarLabelToggle(suportaNotificacoes() ? undefined : 'Este navegador não oferece suporte a notificações.');
  toggleNotificacoes.addEventListener('change', () => {
    if (toggleNotificacoes.checked) return ativarNotificacoes(true);
    desativarNotificacoes();
  });
  if (toggleNotificacoes.checked) await ativarNotificacoes(false);
});
