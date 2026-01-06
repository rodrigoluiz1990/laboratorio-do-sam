// buscaEventos.js

function resolverIconeEvento({ ev, categoria, metaCategorias, raidsData }) {
  // 1️⃣ imagem direto no evento (ano.json)
  if (ev.img) return ev.img;

  // 2️⃣ raids / raid_hour usam a base raid
  if (ev.ref && (categoria === "raid" || categoria === "raid_hour")) {
    const info = raidsData?.raid?.find(r => r[ev.ref]);
    if (info?.[ev.ref]?.img) return info[ev.ref].img;
  }

  // 3️⃣ outras categorias com ref
  if (ev.ref && raidsData?.[categoria]) {
    const info = raidsData[categoria].find(r => r[ev.ref]);
    if (info?.[ev.ref]?.img) return info[ev.ref].img;
  }

  // 4️⃣ fallback: ícone padrão da categoria
  return metaCategorias?.[categoria]?.icon || "../Assets/icon-default.png";
}

// Busca global simples: encontra o mês e ano do primeiro evento que contém o termo buscado
function buscarEventosGlobal(termoBusca) {
  termoBusca = termoBusca.toLowerCase();
  const resultados = [];

  for (const ano in dadosGlobais) {
    const anoData = dadosGlobais[ano];
    if (!anoData) continue;

    for (const categoria in anoData) {
      if (!Array.isArray(anoData[categoria])) continue;

      for (const ev of anoData[categoria]) {
        const texto =
          ev.titulo_alt ||
          ev.titulo ||
          ev.ref ||
          "";

        if (!texto.toLowerCase().includes(termoBusca)) continue;

        const data = ev.inicio || ev.data_inicio;
        if (!data) continue;

        const d = new Date(data);

        resultados.push({
          ano: d.getFullYear(),
          mes: d.getMonth(),
          dia: d.getDate(),
        });
      }
    }
  }

  return resultados;
}

// Variável global para armazenar termo de busca atual
let termoBuscaGlobal = "";

// Evento click do botão Buscar
document.getElementById("btnBuscar").addEventListener("click", async () => {
  const termoBusca = document.getElementById("buscaEvento").value.trim();
  if (!termoBusca) return;

  termoBuscaGlobal = termoBusca;

  await carregarDadosGlobaisBusca();

  eventosBusca = coletarEventosParaBusca();

  const termo = termoBusca.toLowerCase();

  const resultados = eventosBusca.filter(ev =>
    ev.titulo.toLowerCase().includes(termo)
  );

  if (resultados.length === 0) {
    alert("Evento não encontrado");
    return;
  }

  // 👉 vai para o mês da PRIMEIRA ocorrência
  const ev = resultados[0];

  dataAtual = new Date(ev.ano, ev.mes, 1);
  atualizarTextoMesAno(dataAtual);
  carregarEvents();
});


// Adiciona este listener para detectar quando o campo de busca for limpo
document.getElementById("buscaEvento").addEventListener("input", (e) => {
  if (e.target.value.trim() === "") {
    termoBuscaGlobal = "";
    dataAtual = new Date(); // volta para mês atual
    carregarEvents();
  }
});

function coletarEventosParaBusca() {
  const lista = [];

  const metaCategorias = metaGlobais?.meta?.categorias || {};
  const raidsData = raidsGlobais;

  for (const ano in dadosGlobais) {
    const anoData = dadosGlobais[ano];
    if (!anoData) continue;

    for (const categoria in anoData) {
      if (!Array.isArray(anoData[categoria])) continue;

      anoData[categoria].forEach(ev => {
        let tituloFinal = null;

        // 🔹 Raid normal → título vem do raids.json
        if (ev.ref && categoria === "raid") {
          const infoRaid = raidsData?.raid?.find(r => r[ev.ref]);
          if (infoRaid?.[ev.ref]?.titulo) {
            tituloFinal = infoRaid[ev.ref].titulo;
          }
        }

        // 🔹 Raid Hour → título vem do próprio evento
        if (!tituloFinal && categoria === "raid_hour") {
          tituloFinal = ev.titulo_alt || ev.titulo;
        }

        // 🔹 Outros eventos
        if (!tituloFinal) {
          tituloFinal = ev.titulo_alt || ev.titulo;
        }

        if (!tituloFinal) return;

        const inicio = ev.inicio || ev.data_inicio;
        const fim = ev.fim || ev.data_fim;

        if (!inicio || !fim) return;

        let dataAtual = new Date(inicio);
        const dataFim = new Date(fim);

        while (dataAtual <= dataFim) {
          const d = new Date(dataAtual);

          const img = resolverIconeEvento({
            ev,
            categoria,
            metaCategorias,
            raidsData
          });

          lista.push({
            titulo: tituloFinal,
            categoria,
            img,
            data: d,
            ano: d.getFullYear(),
            mes: d.getMonth()
          });

          dataAtual.setDate(dataAtual.getDate() + 1);
        }
      });
    }
  }

  return lista;
}

const inputBusca = document.getElementById("buscaEvento");
const listbox = document.getElementById("listboxBusca");

let eventosBusca = [];

inputBusca.addEventListener("input", async () => {

  // 🔥 garante que os dados existam
  if (eventosBusca.length === 0) {
    await carregarDadosGlobaisBusca();
    eventosBusca = coletarEventosParaBusca();
  }

  const termo = inputBusca.value.trim().toLowerCase();

  listbox.innerHTML = "";

  if (termo.length < 2) {
    listbox.style.display = "none";
    return;
  }

  const resultados = eventosBusca.filter(ev =>
    ev.titulo.toLowerCase().includes(termo)
  );

  if (resultados.length === 0) {
    listbox.style.display = "none";
    return;
  }

  resultados.slice(0, 10).forEach(ev => {
    const item = document.createElement("div");
    item.className = "listbox-item";
    item.setAttribute("role", "option");

    item.innerHTML = `
      <div class="listbox-icon">
      <img src="${ev.img}" class="listbox-icon" alt="">
    </div>

    <div class="listbox-conteudo">
      <div class="listbox-categoria">${ev.titulo}</div>
    </div>

    <div class="listbox-data">
      ${ev.data.toLocaleDateString("pt-BR")}
    </div>
  `;

    item.addEventListener("click", () => {
      dataAtual.setFullYear(ev.ano);
      dataAtual.setMonth(ev.mes);
      dataAtual.setDate(1);

      atualizarTextoMesAno(dataAtual);
      carregarEvents();

      inputBusca.value = ev.titulo;
      listbox.style.display = "none";
    });

    listbox.appendChild(item);
  });

  listbox.style.display = "block";
});

document.addEventListener("click", (e) => {
  if (!e.target.closest(".search-container")) {
    listbox.style.display = "none";
  }
});
