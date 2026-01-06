// controleCalendario.js

// Atualiza o texto do mês/ano no cabeçalho (ex: "Agosto 2025")
function atualizarTextoMesAno(dataAtual) {
  const mesAno = document.getElementById("mesAno");
  if (mesAno) {
    mesAno.textContent = dataAtual.toLocaleDateString("pt-BR", {
      month: "long",
      year: "numeric",
    });
  }
}

// Inicializa selects e eventos do calendário (usa dataAtual global)
function inicializarControleCalendario(dataAtual, carregarEvents) {
  const selectMes = document.getElementById("selectMes");
  const selectAno = document.getElementById("selectAno");
  const btnHoje = document.getElementById("btnHoje");

  // Preenche os anos do selectAno (2016 até ano atual + 1)
  const anoHoje = new Date().getFullYear();
  for (let ano = 2016; ano <= anoHoje + 1; ano++) {
    let option = document.createElement("option");
    option.value = ano;
    option.textContent = ano;
    selectAno.appendChild(option);
  }

  // Define os selects conforme dataAtual
  selectMes.value = dataAtual.getMonth() + 1;
  selectAno.value = dataAtual.getFullYear();

  // Atualiza o texto do cabeçalho mês/ano
  atualizarTextoMesAno(dataAtual);

  // Evento para mudança de mês
  selectMes.addEventListener("change", () => {
    const novoMes = parseInt(selectMes.value, 10) - 1;
    dataAtual.setMonth(novoMes);
    atualizarTextoMesAno(dataAtual);
    carregarEvents();
  });

  // Evento para mudança de ano
  selectAno.addEventListener("change", () => {
    const novoAno = parseInt(selectAno.value, 10);
    dataAtual.setFullYear(novoAno);
    atualizarTextoMesAno(dataAtual);
    carregarEvents();
  });

  // Evento botão Hoje (volta para o mês atual)
  btnHoje.addEventListener("click", () => {

    // 🔹 1. LIMPA BUSCA GLOBAL
    termoBuscaGlobal = "";

    // 🔹 2. LIMPA INPUT
    const inputBusca = document.getElementById("buscaEvento");
    if (inputBusca) inputBusca.value = "";

    // 🔹 3. FECHA LISTBOX
    const listbox = document.getElementById("listboxBusca");
    if (listbox) listbox.style.display = "none";

    // 🔹 4. VOLTA PARA HOJE
    const hoje = new Date();

    // 🔒 Normaliza para o 1º dia do mês
    dataAtual.setFullYear(hoje.getFullYear());
    dataAtual.setMonth(hoje.getMonth());
    dataAtual.setDate(1);

    // 🔁 Sincroniza os selects
    selectMes.value = hoje.getMonth() + 1;
    selectAno.value = hoje.getFullYear();

    atualizarTextoMesAno(dataAtual);
    carregarEvents();
  });


}

// Função para mudar mês, atualiza selects, texto e recarrega eventos
function mudarMes(delta) {
  dataAtual.setMonth(dataAtual.getMonth() + delta);

  // Limites
  const anoMin = 2016;
  const mesMin = 9; // Outubro (0 = Jan, 9 = Out)
  const anoMax = new Date().getFullYear() + 1;

  // Se ano menor que 2016 → trava em outubro/2016
  if (dataAtual.getFullYear() < anoMin) {
    dataAtual.setFullYear(anoMin);
    dataAtual.setMonth(mesMin);
  }

  // Se ano = 2016 mas mês < outubro → trava em outubro
  if (dataAtual.getFullYear() === anoMin && dataAtual.getMonth() < mesMin) {
    dataAtual.setMonth(mesMin);
  }

  // Se passou do limite superior
  if (dataAtual.getFullYear() > anoMax) {
    dataAtual.setFullYear(anoMax);
    dataAtual.setMonth(11); // Dezembro
  }

  document.getElementById("selectMes").value = dataAtual.getMonth() + 1;
  document.getElementById("selectAno").value = dataAtual.getFullYear();

  atualizarTextoMesAno(dataAtual);
  carregarEvents();
}

// Função para mudar ano, atualiza selects, texto e recarrega eventos
function mudarAno(delta) {
  dataAtual.setFullYear(dataAtual.getFullYear() + delta);

  // Limites
  const anoMin = 2016;
  const mesMin = 9; // Outubro
  const anoMax = new Date().getFullYear() + 1;

  // Ano mínimo → força para outubro
  if (dataAtual.getFullYear() < anoMin) {
    dataAtual.setFullYear(anoMin);
    dataAtual.setMonth(mesMin);
  }

  if (dataAtual.getFullYear() === anoMin && dataAtual.getMonth() < mesMin) {
    dataAtual.setMonth(mesMin);
  }

  // Ano máximo → trava em dezembro
  if (dataAtual.getFullYear() > anoMax) {
    dataAtual.setFullYear(anoMax);
    dataAtual.setMonth(11);
  }

  document.getElementById("selectMes").value = dataAtual.getMonth() + 1;
  document.getElementById("selectAno").value = dataAtual.getFullYear();

  atualizarTextoMesAno(dataAtual);
  carregarEvents();
}

document.getElementById("btnToggleFiltros").addEventListener("click", () => {
  const filtros = document.getElementById("filtro-categorias");
  filtros.style.display = (filtros.style.display === "none" || filtros.style.display === "")
    ? "block"
    : "none";
});


// Expor funções globalmente para uso no HTML
window.inicializarControleCalendario = inicializarControleCalendario;
window.atualizarTextoMesAno = atualizarTextoMesAno;
window.mudarMes = mudarMes; // <--- aqui expõe mudarMes

// Exportar funções se usar módulos (opcional)
window.inicializarControleCalendario = inicializarControleCalendario;
window.atualizarTextoMesAno = atualizarTextoMesAno;
