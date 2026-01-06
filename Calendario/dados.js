// dados.js

// =====================
// VARIÁVEIS GLOBAIS
// =====================
let events = {};          // Eventos organizados por data (YYYY-MM-DD)
let dadosGlobais = {};    // JSON completo para busca global
let metaGlobais = null;
let raidsGlobais = null;

// =====================
// FUNÇÕES UTILITÁRIAS
// =====================
function parseDataLocal(isoDate) {
  const [ano, mes, dia] = isoDate.split("T")[0].split("-");
  return new Date(Number(ano), Number(mes) - 1, Number(dia));
}

async function carregarMeta() {
  if (metaGlobais) return metaGlobais;

  try {
    const resp = await fetch("../Calendario/meta.json");
    if (!resp.ok) throw new Error("Erro ao carregar meta.json");
    metaGlobais = await resp.json();
    return metaGlobais;
  } catch (e) {
    console.error("Erro ao carregar meta.json:", e);
    return null;
  }
}

async function carregarRaids() {
  if (raidsGlobais) return raidsGlobais;

  try {
    const resp = await fetch("../Calendario/raids.json");
    if (!resp.ok) throw new Error("Erro ao carregar raids.json");
    raidsGlobais = await resp.json();
    return raidsGlobais;
  } catch (e) {
    console.error("Erro ao carregar raids.json:", e);
    return null;
  }
}

async function carregarDadosGlobaisBusca() {
  if (Object.keys(dadosGlobais).length > 0) return dadosGlobais;

  try {
    const resp = await fetch("../Calendario/anos.json");
    const { anos } = await resp.json();

    for (const ano of anos) {
      try {
        const r = await fetch(`../Calendario/${ano}.json`);
        if (!r.ok) continue;

        const jsonAno = await r.json();
        dadosGlobais[ano] = jsonAno[ano] || jsonAno;
      } catch (e) {
        console.warn(`Erro ao carregar ${ano}.json`, e);
      }
    }

    return dadosGlobais;
  } catch (e) {
    console.error("Erro ao carregar anos.json", e);
    return {};
  }
}

function resolverRefEvento(ev, categoria, raidsData) {
  if (!ev.ref) return ev;

  if (categoria === "raid") {
    const raidInfo = raidsData?.raid?.[ev.ref];
    if (!raidInfo) return ev;

    return {
      ...raidInfo,
      data_inicio: ev.inicio,
      data_fim: ev.fim,
    };
  }

  return ev;
}

function resolverImagemEvento(evOriginal, evResolvido, categoria, metaCategorias) {

  // 1️⃣ Hora Lendária SEMPRE usa ícone da categoria
  if (categoria === "raid_hour") {
    return metaCategorias?.raid_hour?.icon || null;
  }

  // 2️⃣ imagem definida diretamente no ano.json
  if (evOriginal?.img) return evOriginal.img;

  // 3️⃣ imagem vinda da referência (raids.json, etc)
  if (evResolvido?.img) return evResolvido.img;

  // 4️⃣ ícone padrão da categoria
  if (metaCategorias?.[categoria]?.icon) {
    return metaCategorias[categoria].icon;
  }

  return null;
}


function buscarPorRef(lista, ref) {
  if (!Array.isArray(lista)) return null;

  for (const item of lista) {
    if (item && item[ref]) {
      return item[ref];
    }
  }
  return null;
}


// =====================
// FUNÇÃO PRINCIPAL
// =====================
async function carregarEvents() {
  try {
    events = {};
    let dados;
    const meta = await carregarMeta();
    const metaCategorias = meta?.meta?.categorias || {};


    // =====================
    // CARREGAMENTO DO JSON
    // =====================
    if (
      typeof Android !== "undefined" &&
      typeof Android.getJson === "function"
    ) {
      try {
        const json = Android.getJson();
        dados = JSON.parse(json);
      } catch (e) {
        console.error("Erro ao obter JSON via Android.getJson():", e);
      }
    }

    if (!dados) {
      try {
        const anoStr = String(dataAtual.getFullYear());
        const resposta = await fetch(`../Calendario/${anoStr}.json`);

        if (!resposta.ok) {
          throw new Error(`JSON do ano ${anoStr} não encontrado`);
        }

        dados = await resposta.json();
      } catch (e) {
        console.warn("JSON do ano não existe, calendário ficará vazio:", e);
        dados = {}; // força fluxo continuar
      }
    }

    events = {};

    // =====================
    // CONTEXTO DE DATA
    // =====================
    const anoStr = String(dataAtual.getFullYear());

    // ❗ NÃO EXISTE JSON DO ANO
    if (!dados[anoStr]) {
      console.warn(`Ano ${anoStr} não existe no JSON`);
      // não tem eventos, mas o mês precisa ser renderizado
    }

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

    // =====================
    // SEASON (DESTAQUE)
    // =====================
    const divSeason = document.getElementById("eventoSeason");
    divSeason.classList.add("evento-destaque");
    divSeason.style.display = "none";

    if (dados[anoStr] && Array.isArray(dados[anoStr].season)) {
      const seasonAtiva = dados[anoStr].season.find((ev) => {
        const inicio = new Date(ev.inicio);
        const fim = new Date(ev.fim);
        return fim >= primeiroDiaMes && inicio <= ultimoDiaMes;
      });

      if (seasonAtiva) {
        divSeason.style.display = "inline-block";

        const conteudo = `
          <img src="${seasonAtiva.img}" alt="">
          <strong>${seasonAtiva.titulo}</strong><br>
          <span class="horario">
            (${formatarData(seasonAtiva.inicio)} – ${formatarData(seasonAtiva.fim)})
          </span>
        `;

        divSeason.innerHTML = seasonAtiva.link
          ? `<a href="${seasonAtiva.link}" target="_blank" style="color: inherit; text-decoration: none;">${conteudo}</a>`
          : conteudo;
      }
    }

    // =====================
    // GO PASS (DESTAQUE)
    // =====================
    const divTicket = document.getElementById("go_pass");
    divTicket.classList.add("evento-destaque");
    divTicket.style.display = "none";

    if (dados[anoStr] && Array.isArray(dados[anoStr].go_pass)) {
      const ticket = dados[anoStr].go_pass.find((ev) => {
        if (!ev.inicio || !ev.fim) return false;
        const inicio = new Date(ev.inicio);
        const fim = new Date(ev.fim);
        return fim >= primeiroDiaMes && inicio <= ultimoDiaMes;
      });

      if (ticket) {
        divTicket.style.display = "inline-block";

        const conteudo = `
          <img src="${ticket.img}" alt="">
          <strong>${ticket.titulo}</strong><br>
          <span class="horario">
            (${formatarData(ticket.inicio)} – ${formatarData(ticket.fim)})
          </span>
        `;

        divTicket.innerHTML = ticket.link
          ? `<a href="${ticket.link}" target="_blank" style="color: inherit; text-decoration: none;">${conteudo}</a>`
          : conteudo;
      }
    }

    // =====================
    // EVENTOS DO CALENDÁRIO
    // =====================
    const raidsData = await carregarRaids();

    const categoriasIgnoradasNoCalendario = new Set([
      "season",
      "go_pass"
    ]);

    Object.keys(dados).forEach((anoProcessado) => {
      const blocoAno = dados[anoProcessado];
      if (!blocoAno || typeof blocoAno !== "object") return;

      Object.keys(blocoAno).forEach((categoria) => {
        if (categoriasIgnoradasNoCalendario.has(categoria)) return;
        if (!Array.isArray(blocoAno[categoria])) return;

        const lista = blocoAno[categoria];

        lista.forEach((evOriginal) => {

          let ev = evOriginal;

          if (evOriginal.ref) {
            let info = null;

            // raid e raid_hour usam a base raid
            if (categoria === "raid" || categoria === "raid_hour") {
              info = buscarPorRef(raidsData?.raid, evOriginal.ref);
            } else {
              info = buscarPorRef(raidsData?.[categoria], evOriginal.ref);
            }

            if (!info) {
              console.warn(`Ref não encontrada: ${evOriginal.ref} (${categoria})`);
              return;
            }

            ev = {
              ...info,
              inicio: evOriginal.inicio,
              fim: evOriginal.fim,
            };
          }

          if (!ev.inicio || !ev.fim) return;

          const inicioDate = new Date(ev.inicio);
          const fimDate = new Date(ev.fim);

          let dataAtualEvento = new Date(
            inicioDate.getFullYear(),
            inicioDate.getMonth(),
            inicioDate.getDate()
          );

          const dataFimEvento = new Date(
            fimDate.getFullYear(),
            fimDate.getMonth(),
            fimDate.getDate()
          );

          if (dataFimEvento < primeiroDiaMes || dataAtualEvento > ultimoDiaMes) {
            return;
          }

          const inicioDataStr = ev.inicio.split("T")[0];
          const fimDataStr = ev.fim.split("T")[0];
          const horaInicio = ev.inicio.split("T")[1]?.slice(0, 5);
          const horaFim = ev.fim.split("T")[1]?.slice(0, 5);

          while (dataAtualEvento <= dataFimEvento) {
            const ano = dataAtualEvento.getFullYear();
            const mes = String(dataAtualEvento.getMonth() + 1).padStart(2, "0");
            const dia = String(dataAtualEvento.getDate()).padStart(2, "0");
            const dataStr = `${ano}-${mes}-${dia}`;

            if (
              dataAtualEvento >= primeiroDiaMes &&
              dataAtualEvento <= ultimoDiaMes
            ) {
              let mostrarHorario = "";

              if (inicioDataStr === fimDataStr) {
                if (horaInicio && horaFim) {
                  mostrarHorario = `(${horaInicio} – ${horaFim})`;
                }
              } else if (dataStr === inicioDataStr) {
                if (horaInicio) mostrarHorario = `(Início: ${horaInicio})`;
              } else if (dataStr === fimDataStr) {
                if (horaFim) mostrarHorario = `(Termina: ${horaFim})`;
              }

              if (!events[dataStr]) events[dataStr] = [];

              const textoCompletoBusca = (
                (evOriginal.titulo_alt || "") +
                " " +
                (ev.titulo || "") +
                " " +
                categoria
              ).toLowerCase();

              if (
                termoBuscaGlobal &&
                !textoCompletoBusca.includes(termoBuscaGlobal.toLowerCase())
              ) {
                return;
              }

              events[dataStr].push({
                texto: {
                  titulo: evOriginal.titulo_alt || ev.titulo,
                  horario: mostrarHorario,
                },
                img: resolverImagemEvento(evOriginal, ev, categoria, metaCategorias),
                link: ev.link || null,
                categoria,
              });
            }

            dataAtualEvento.setDate(dataAtualEvento.getDate() + 1);
          }
        });
      });
    });


    // =====================
    // FINALIZAÇÃO
    // =====================
    console.log("Eventos carregados:", events);
    renderizarCalendario();

    if (notificacoesEstaoAtivas() && Notification.permission === "granted") {
      agendarNotificacaoProximoEvento(dadosGlobais);
    }

  } catch (erro) {
    console.error("Erro ao carregar eventos:", erro);
  }

  const temEventos = Object.keys(events).length > 0;

  if (!temEventos) {
    console.info("Nenhum evento neste mês");
  }

}
