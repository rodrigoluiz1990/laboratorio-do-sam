(() => {
  // Os caminhos dos fragmentos partem da raiz do projeto, onde fica este script.
  const raiz = new URL('.', document.currentScript.src);

  function prepararFragmento(html) {
    const template = document.createElement('template');
    template.innerHTML = html;
    template.content.querySelectorAll('[href], [src]').forEach(elemento => {
      for (const atributo of ['href', 'src']) {
        const valor = elemento.getAttribute(atributo);
        if (valor && !valor.startsWith('#')) elemento.setAttribute(atributo, new URL(valor, raiz).href);
      }
      if (elemento.getAttribute('target') === '_blank') elemento.setAttribute('rel', 'noopener noreferrer');
    });
    return template.content;
  }

  function inicializarModal(menu) {
    const modal = menu.querySelector('#gameModal');
    const abrir = menu.querySelector('#puzzleIcon');
    const fechar = modal?.querySelector('.close');
    if (!modal || !abrir || !fechar) throw new Error('O menu não contém os controles do modal de jogos.');

    function fecharModal() {
      modal.style.display = 'none';
      abrir.setAttribute('aria-expanded', 'false');
      abrir.focus();
    }

    abrir.addEventListener('click', evento => {
      evento.preventDefault();
      modal.style.display = 'block';
      abrir.setAttribute('aria-expanded', 'true');
      fechar.focus();
    });
    fechar.addEventListener('click', fecharModal);
    modal.addEventListener('click', evento => {
      if (evento.target === modal) fecharModal();
    });
    modal.addEventListener('keydown', evento => {
      if (evento.key === 'Escape') {
        evento.preventDefault();
        fecharModal();
      } else if (evento.key === 'Tab') {
        const botoes = modal.querySelectorAll('button');
        const primeiro = botoes[0];
        const ultimo = botoes[botoes.length - 1];
        if (evento.shiftKey && document.activeElement === primeiro) {
          evento.preventDefault();
          ultimo.focus();
        } else if (!evento.shiftKey && document.activeElement === ultimo) {
          evento.preventDefault();
          primeiro.focus();
        }
      }
    });
    modal.querySelectorAll('[data-game-href]').forEach(botao => {
      botao.addEventListener('click', () => {
        window.location.assign(new URL(botao.dataset.gameHref, raiz).href);
      });
    });
  }

  async function carregarComponente(container, arquivo, nome, inicializar) {
    if (container.dataset.carregando === 'true' || container.dataset.carregado === 'true') return;
    container.dataset.carregando = 'true';
    try {
      const resposta = await fetch(new URL(arquivo, raiz));
      if (!resposta.ok) throw new Error(`HTTP ${resposta.status} ao carregar ${arquivo}`);
      container.replaceChildren(prepararFragmento(await resposta.text()));
      if (inicializar) inicializar(container);
      container.dataset.carregado = 'true';
    } catch (erro) {
      console.error(`Erro ao carregar ${nome}:`, erro);
      const mensagem = document.createElement('p');
      mensagem.textContent = `Não foi possível carregar o ${nome}.`;
      mensagem.setAttribute('role', 'status');
      const tentar = document.createElement('button');
      tentar.type = 'button';
      tentar.textContent = 'Tentar novamente';
      tentar.addEventListener('click', () => carregarComponente(container, arquivo, nome, inicializar));
      container.replaceChildren(mensagem, tentar);
    } finally {
      container.dataset.carregando = 'false';
    }
  }

  function inicializarComponentes() {
    if (document.documentElement.dataset.componentesInicializados === 'true') return;
    document.documentElement.dataset.componentesInicializados = 'true';
    const menu = document.getElementById('menu');
    if (menu) carregarComponente(menu, 'menu.html', 'menu', inicializarModal);
    let rodape = document.getElementById('rodape');
    if (!rodape) {
      rodape = document.createElement('div');
      rodape.id = 'rodape';
      document.body.appendChild(rodape);
    }
    carregarComponente(rodape, 'footer.html', 'rodapé');
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', inicializarComponentes, { once: true });
  } else {
    inicializarComponentes();
  }
})();
