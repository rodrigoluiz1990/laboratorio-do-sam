const toggleNotificacoes = document.getElementById('toggleNotificacoes');
const labelNotificacao = document.getElementById('labelNotificacao');

function atualizarLabelToggle() {
  if (toggleNotificacoes.checked) {
    labelNotificacao.textContent = '🔔';
    labelNotificacao.title = 'Ative as notificações para ser avisado quando o próximo evento começar, pode ser necessário liberar permissão no navegador.';
  } else {
    labelNotificacao.textContent = '🔕';
    labelNotificacao.title = 'Ative as notificações para ser avisado quando o próximo evento começar, pode ser necessário liberar permissão no navegador.';
  }
}

function carregarEstadoToggle() {
  const estado = localStorage.getItem('notificacoesAtivas');
  toggleNotificacoes.checked = (estado === '1');
  atualizarLabelToggle();
}

function salvarEstadoToggle() {
  localStorage.setItem('notificacoesAtivas', toggleNotificacoes.checked ? '1' : '0');
}

function notificacoesEstaoAtivas() {
  return toggleNotificacoes.checked;
}

function toggleNotificacoesListener() {
  toggleNotificacoes.addEventListener('change', () => {
    if (toggleNotificacoes.checked) {
      if (Notification.permission !== 'granted') {
        Notification.requestPermission().then(permission => {
          if (permission !== 'granted') {
            toggleNotificacoes.checked = false;
            alert('Para receber notificações, habilite a permissão nas configurações do navegador.');
          } else {
            salvarEstadoToggle();
            atualizarLabelToggle();
            if (typeof dadosGlobais !== 'undefined') {
              agendarNotificacaoProximoEvento(dadosGlobais);
            }
            alert('As notificações foram ativadas! Você receberá alertas dos próximos eventos.');
          }
        });
      } else {
        salvarEstadoToggle();
        atualizarLabelToggle();
        if (typeof dadosGlobais !== 'undefined') {
          agendarNotificacaoProximoEvento(dadosGlobais);
        }
        alert('As notificações foram ativadas! Você receberá alertas dos próximos eventos.');
      }
    } else {
      salvarEstadoToggle();
      atualizarLabelToggle();
      // Aqui você pode cancelar notificações se implementar algo
      alert('As notificações foram desativadas.');
    }
  });
}

function parseDataHora(dataStr, horaStr) {
  const [ano, mes, dia] = dataStr.split('-').map(Number);
  const [hora, minuto] = horaStr.split(':').map(Number);
  return new Date(ano, mes - 1, dia, hora, minuto);
}

function agendarNotificacaoProximoEvento(dados) {
  if (!notificacoesEstaoAtivas()) return;

  if (Notification.permission !== "granted") {
    Notification.requestPermission();
    return; // Espera ativação pelo usuário
  }

  const agora = new Date();
  let proximoEvento = null;

  for (const ano in dados) {
    if (!dados[ano].meses) continue;
    for (const mes in dados[ano].meses) {
      for (const categoria of Object.keys(dados[ano].meses[mes] || {})) {
        const lista = dados[ano].meses[mes][categoria];
        if (!Array.isArray(lista)) continue;

        lista.forEach(ev => {
          const inicio = parseDataHora(ev.data_inicio, ev.hora_inicio);
          if (inicio > agora && (!proximoEvento || inicio < parseDataHora(proximoEvento.data_inicio, proximoEvento.hora_inicio))) {
            proximoEvento = { ...ev, categoria };
          }
        });
      }
    }
  }

  if (!proximoEvento) return;

  const inicio = parseDataHora(proximoEvento.data_inicio, proximoEvento.hora_inicio);
  const diffMs = inicio - agora;

  if (diffMs > 0) {
    console.log(`Notificação agendada para ${proximoEvento.titulo} em ${Math.round(diffMs / 1000)} segundos`);
    setTimeout(() => {
      if (notificacoesEstaoAtivas() && Notification.permission === "granted") {
        new Notification(`Evento começando!`, {
          body: `${proximoEvento.titulo} começando às ${proximoEvento.hora_inicio}!`,
          icon: proximoEvento.img || "../Assets/icon-event2.png"
        });
      }
    }, diffMs);
  }
}

document.addEventListener('DOMContentLoaded', () => {
  carregarEstadoToggle();
  toggleNotificacoesListener();
});
