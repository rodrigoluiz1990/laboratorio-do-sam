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

  // Evento botão Hoje (volta para mês atual)
  btnHoje.addEventListener("click", () => {
    const hoje = new Date();
    dataAtual.setFullYear(hoje.getFullYear());
    dataAtual.setMonth(hoje.getMonth());
    dataAtual.setDate(hoje.getDate());

    selectMes.value = dataAtual.getMonth() + 1;
    selectAno.value = dataAtual.getFullYear();
    atualizarTextoMesAno(dataAtual);
    carregarEvents();
  });
}

// Função para mudar mês, atualiza selects, texto e recarrega eventos
function mudarMes(delta) {
  dataAtual.setMonth(dataAtual.getMonth() + delta);

  document.getElementById("selectMes").value = dataAtual.getMonth() + 1;
  document.getElementById("selectAno").value = dataAtual.getFullYear();

  atualizarTextoMesAno(dataAtual);
  carregarEvents();
}

// Expor funções globalmente para uso no HTML
window.inicializarControleCalendario = inicializarControleCalendario;
window.atualizarTextoMesAno = atualizarTextoMesAno;
window.mudarMes = mudarMes; // <--- aqui expõe mudarMes

// Exportar funções se usar módulos (opcional)
window.inicializarControleCalendario = inicializarControleCalendario;
window.atualizarTextoMesAno = atualizarTextoMesAno;
