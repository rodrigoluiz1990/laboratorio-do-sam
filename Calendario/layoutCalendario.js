(() => {
  const botoes = document.querySelectorAll('.layout-button');
  const calendario = document.querySelector('.calendar-wrapper');
  const dispositivoToque = window.matchMedia('(hover: none) and (pointer: coarse)');
  let escolhaManual = false;

  function aplicarLayout(layout) {
    calendario.dataset.layout = layout;
    botoes.forEach(botao => {
      botao.setAttribute('aria-pressed', String(botao.dataset.layout === layout));
    });
    calendario.scrollLeft = 0;
    if (layout === 'linhas') {
      calendario.removeAttribute('aria-describedby');
    } else {
      calendario.setAttribute('aria-describedby', 'calendarScrollHint');
    }
  }

  function aplicarPadrao() {
    aplicarLayout(dispositivoToque.matches ? 'linhas' : 'colunas');
  }

  botoes.forEach(botao => {
    botao.addEventListener('click', () => {
      escolhaManual = true;
      aplicarLayout(botao.dataset.layout);
    });
  });

  dispositivoToque.addEventListener('change', () => {
    if (!escolhaManual) aplicarPadrao();
  });

  aplicarPadrao();
})();
