// dados.js
//let dataAtual = new Date(); // Data atual que o calendário mostra
let events = {}; // Objeto para armazenar eventos por data
let dadosGlobais = {}; // Guarda o JSON inteiro para busca

// Função para carregar eventos do arquivo JSON
async function carregarEvents() {
  try {
    let dados;

    if (
      typeof Android !== "undefined" &&
      typeof Android.getJson === "function"
    ) {
      // No app Android, usa a interface Java para obter JSON
      try {
        const json = Android.getJson();
        dados = JSON.parse(json);
      } catch (e) {
        console.error("Erro ao obter JSON via Android.getJson():", e);
      }
    }

    if (!dados) {
      // No navegador (ou se deu erro no Android), tenta carregar via fetch
      try {
        const resposta = await fetch("calendario_eventos_pokemongo.json");
        if (!resposta.ok) throw new Error("Erro ao carregar JSON via fetch");
        dados = await resposta.json();
      } catch (e) {
        console.error("Erro ao carregar JSON via fetch:", e);
        // Aqui pode tratar erro, exibir mensagem, etc.
        return;
      }
    }

    dadosGlobais = dados; // armazena para busca global

    events = {};

    const anoStr = String(dataAtual.getFullYear());
    const mesStr = String(dataAtual.getMonth() + 1).padStart(2, "0");

    const primeiroDiaMes = new Date(
      dataAtual.getFullYear(),
      dataAtual.getMonth(),
      1
    );
    const ultimoDiaMes = new Date(
      dataAtual.getFullYear(),
      dataAtual.getMonth() + 1,
      0
    );

    // Exibir destaque da season
    const divSeason = document.getElementById("eventoSeason");
    divSeason.classList.add("evento-destaque");
    divSeason.style.display = "none";

    if (dados[anoStr] && dados[anoStr].season) {
      const seasonAtiva = dados[anoStr].season.find((ev) => {
        const inicio = new Date(ev.inicio);
        const fim = new Date(ev.fim);
        return fim >= primeiroDiaMes && inicio <= ultimoDiaMes;
      });
      if (seasonAtiva) {
        divSeason.style.display = "inline-block";
        if (seasonAtiva.link) {
          divSeason.innerHTML = `
                <a href="${
                  seasonAtiva.link
                }" target="_blank" style="color: inherit; text-decoration: none;">
                  <img src="${seasonAtiva.img}" alt="">
                  <strong>${seasonAtiva.titulo}</strong><br>
                  <span class="horario">(${formatarData(
                    seasonAtiva.inicio
                  )} – ${formatarData(seasonAtiva.fim)})</span>
                </a>
            `;
        } else {
          divSeason.innerHTML = `
                <img src="${seasonAtiva.img}" alt="">
                <strong>${seasonAtiva.titulo}</strong><br>
                <span class="horario">(${formatarData(
                  seasonAtiva.inicio
                )} – ${formatarData(seasonAtiva.fim)})</span>
            `;
        }
      }
    }

    // Exibir destaque do passe do mês
    const divTicket = document.getElementById("go_pass");
    divTicket.classList.add("evento-destaque");
    divTicket.style.display = "none";

    if (
      dados[anoStr] &&
      dados[anoStr].meses &&
      dados[anoStr].meses[mesStr] &&
      dados[anoStr].meses[mesStr].go_pass
    ) {
      const ticket = dados[anoStr].meses[mesStr].go_pass;
      const inicioMes = new Date(
        dataAtual.getFullYear(),
        dataAtual.getMonth(),
        1
      );
      const fimMes = new Date(
        dataAtual.getFullYear(),
        dataAtual.getMonth() + 1,
        0
      );

      if (ticket.inicio && ticket.fim) {
        const inicio = new Date(ticket.inicio);
        const fim = new Date(ticket.fim);

        if (fim >= inicioMes && inicio <= fimMes) {
          divTicket.style.display = "inline-block";

          if (ticket.link) {
            divTicket.innerHTML = `
                <a href="${
                    ticket.link
                }" target="_blank" style="color: inherit; text-decoration: none;">
                    <img src="${ticket.img}" alt="">
                    <strong>${ticket.titulo}</strong><br>
                    <span class="horario">(${formatarData(
                        ticket.inicio
                    )} – ${formatarData(ticket.fim)})</span>
                </a>
            `;
        } else {
            divTicket.innerHTML = `
                <img src="${ticket.img}" alt="">
                <strong>${ticket.titulo}</strong><br>
                <span class="horario">(${formatarData(
                    ticket.inicio
                )} – ${formatarData(ticket.fim)})</span>
            `;
          }
        }
      }
    }

    if (dados[anoStr] && dados[anoStr].meses) {
      categorias.forEach((categoria) => {
        for (const mesArmazenado in dados[anoStr].meses) {
          const lista = dados[anoStr].meses[mesArmazenado][categoria];
          if (!Array.isArray(lista)) continue;

          lista.forEach((ev) => {
            function parseDataLocal(isoDate) {
              const [ano, mes, dia] = isoDate.split("T")[0].split("-");
              return new Date(Number(ano), Number(mes) - 1, Number(dia));
            }

            let dataAtualEvento = parseDataLocal(ev.data_inicio);
            const dataFimEvento = parseDataLocal(ev.data_fim);

            // Verifica se o evento cruza o mês atual
            const inicioMesAtual = new Date(
              dataAtual.getFullYear(),
              dataAtual.getMonth(),
              1
            );
            const fimMesAtual = new Date(
              dataAtual.getFullYear(),
              dataAtual.getMonth() + 1,
              0
            );

            if (
              dataFimEvento < inicioMesAtual ||
              dataAtualEvento > fimMesAtual
            ) {
              // Evento não aparece neste mês
              return;
            }

            // Percorre todos os dias do evento
            while (dataAtualEvento <= dataFimEvento) {
              const ano = dataAtualEvento.getFullYear();
              const mes = String(dataAtualEvento.getMonth() + 1).padStart(
                2,
                "0"
              );
              const dia = String(dataAtualEvento.getDate()).padStart(2, "0");
              const dataStr = `${ano}-${mes}-${dia}`;

              // Só adiciona o evento se o dia estiver dentro do mês visível
              if (
                dataAtualEvento >= inicioMesAtual &&
                dataAtualEvento <= fimMesAtual
              ) {
                const mostrarHorario = (() => {
                  if (ev.data_inicio === ev.data_fim) {
                    return `(${ev.hora_inicio} – ${ev.hora_fim})`;
                  } else if (dataStr === ev.data_inicio) {
                    return `(Inicio:${ev.hora_inicio})`;
                  } else if (dataStr === ev.data_fim) {
                    return `(Termina:${ev.hora_fim})`;
                  } else {
                    return "";
                  }
                })();

                if (!events[dataStr]) events[dataStr] = [];

                events[dataStr].push({
                  texto: {
                    titulo: ev.titulo,
                    horario: mostrarHorario,
                  },
                  img: ev.img || "../Assets/icon-event2.png",
                  link: ev.link || null,
                  categoria: categoria,
                });
              }

              dataAtualEvento.setDate(dataAtualEvento.getDate() + 1);
            }
          });
        }
      });
    }

    function formatarCategoria(categoria) {
      return categoria
        .replace(/_/g, " ")
        .replace(/\b\w/g, (l) => l.toUpperCase());
    }
    console.log('Eventos carregados:', events);
    renderizarCalendario();

    // Chama o agendamento de notificação
    if (notificacoesEstaoAtivas() && Notification.permission === "granted") {
        agendarNotificacaoProximoEvento(dadosGlobais);
    }

  } catch (erro) {
    console.error("Erro ao carregar eventos:", erro);
  }
}
