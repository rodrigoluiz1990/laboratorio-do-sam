// Função para inicializar o modal
function initGameModal() {
    const modal = document.getElementById("gameModal");
    if (!modal) return;
  
    const btn = document.getElementById("puzzleIcon");
    const span = modal.querySelector(".close");
  
    if (!btn) return;
  
    btn.onclick = () => modal.style.display = "block";
    if (span) span.onclick = () => modal.style.display = "none";
  
    window.onclick = (event) => {
      if (event.target == modal) modal.style.display = "none";
    };
  }
  
  // Observa mudanças no DOM para detectar quando o menu é carregado
  const observer = new MutationObserver((mutations, obs) => {
    const btn = document.getElementById("puzzleIcon");
    if (btn) {
      initGameModal();
      obs.disconnect(); // para de observar depois que encontrou
    }
  });
  
  // Começa a observar o body inteiro
  observer.observe(document.body, { childList: true, subtree: true });
  