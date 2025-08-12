// buscaEventos.js

// Busca global simples: encontra o mês e ano do primeiro evento que contém o termo buscado
function buscarEventoGlobalSimples(termoBusca) {
  termoBusca = termoBusca.toLowerCase();

  for (const ano in dadosGlobais) {
    if (!dadosGlobais.hasOwnProperty(ano)) continue;
    const meses = dadosGlobais[ano].meses;
    if (!meses) continue;

    for (const mes in meses) {
      if (!meses.hasOwnProperty(mes)) continue;

      // Categorias possíveis
      const categorias = [
        "go_pass",
        "events",
        "research",
        "community_day",
        "raid",
        "raid_hour",
        "raid_mega",
        "raid_shadow",
        "dynamax",
        "gigantamax",
        "max_monday",
        "spotlights",
      ];

      for (const cat of categorias) {
        const lista = meses[mes][cat];
        if (!lista) continue;

        if (Array.isArray(lista)) {
          for (const ev of lista) {
            if (!ev.titulo) continue;
            if (ev.titulo.toLowerCase().includes(termoBusca)) {
              // Retorna o ano e mês do evento encontrado
              return { ano: Number(ano), mes: Number(mes) - 1 }; // mês zero-based para Date
            }
          }
        }
      }
    }
  }
  return null; // Não achou
}

// Variável global para armazenar termo de busca atual
let termoBuscaGlobal = "";

// Evento click do botão Buscar
document.getElementById("btnBuscar").addEventListener("click", () => {
  const termoBusca = document.getElementById("buscaEvento").value.trim();
  if (termoBusca.length === 0) return; // Nenhum termo, não faz nada

  termoBuscaGlobal = termoBusca; // salva para uso na renderização do calendário
  const resultado = buscarEventoGlobalSimples(termoBusca);
  if (resultado) {
    dataAtual = new Date(resultado.ano, resultado.mes, 1);
    carregarEvents();
  }
});

// Adiciona este listener para detectar quando o campo de busca for limpo
document.getElementById("buscaEvento").addEventListener("input", (e) => {
  if (e.target.value.trim() === "") {
    termoBuscaGlobal = "";
    dataAtual = new Date(); // volta para mês atual
    carregarEvents();
  }
});
