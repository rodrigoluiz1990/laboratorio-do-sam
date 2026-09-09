(() => {
  const TOTAL_POKEMON = 898;
  const TEMPO_LIMITE = 15000;
  const cachePokemon = new Map();
  let current = null;
  let carregando = false;

  const pokeImg = document.getElementById('pokeImg');
  const nextBtn = document.getElementById('nextBtn');
  const submitBtn = document.getElementById('submitBtn');
  const answerInput = document.getElementById('answerInput');
  const feedback = document.getElementById('feedback');

  // Busca somente a espécie sorteada e reutiliza os dados durante esta sessão.
  async function loadPokemon(id) {
    if (cachePokemon.has(id)) return cachePokemon.get(id);
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), TEMPO_LIMITE);
    try {
      const resposta = await fetch(`https://pokeapi.co/api/v2/pokemon-species/${id}/`, {
        signal: controller.signal,
      });
      if (!resposta.ok) throw new Error(`Erro HTTP ${resposta.status}`);
      const dados = await resposta.json();
      if (dados.id !== id || typeof dados.name !== 'string' || !dados.name.trim()) {
        throw new Error('Dados de Pokémon inválidos');
      }
      const traduzido = Array.isArray(dados.names)
        ? dados.names.find(n => n?.language?.name === 'pt')?.name
        : null;
      const pokemon = {
        id,
        name: typeof traduzido === 'string' && traduzido.trim() ? traduzido : dados.name,
        file: `https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/pokemon/other/official-artwork/${id}.png`,
      };
      cachePokemon.set(id, pokemon);
      return pokemon;
    } finally {
      clearTimeout(timeout);
    }
  }

  function carregarImagem(url) {
    return new Promise((resolve, reject) => {
      const timeout = setTimeout(() => finalizar(new Error('Tempo de carregamento da imagem excedido')), TEMPO_LIMITE);
      function finalizar(erro) {
        clearTimeout(timeout);
        pokeImg.onload = null;
        pokeImg.onerror = null;
        if (erro) {
          pokeImg.removeAttribute('src');
          reject(erro);
        } else {
          resolve();
        }
      }
      pokeImg.onload = () => finalizar();
      pokeImg.onerror = () => finalizar(new Error('Falha ao carregar imagem'));
      pokeImg.src = url;
    });
  }

  async function newRound() {
    if (carregando) return;
    carregando = true;
    current = null;
    nextBtn.disabled = true;
    submitBtn.disabled = true;
    answerInput.disabled = true;
    answerInput.value = '';
    nextBtn.textContent = 'Próximo';
    feedback.className = 'feedback';
    feedback.textContent = 'Carregando Pokémon...';
    pokeImg.style.visibility = 'hidden';
    pokeImg.classList.remove('revealed');
    pokeImg.classList.add('hidden');
    pokeImg.alt = 'Pokémon misterioso';

    try {
      const id = Math.floor(Math.random() * TOTAL_POKEMON) + 1;
      const pokemon = await loadPokemon(id);
      await carregarImagem(pokemon.file);
      current = pokemon;
      pokeImg.style.visibility = 'visible';
      submitBtn.disabled = false;
      answerInput.disabled = false;
      feedback.textContent = '';
    } catch (erro) {
      console.error('Erro ao carregar rodada:', erro);
      feedback.textContent = 'Não foi possível carregar o Pokémon. Verifique sua conexão e tente novamente.';
      feedback.className = 'feedback wrong';
      nextBtn.textContent = 'Tentar novamente';
    } finally {
      carregando = false;
      nextBtn.disabled = false;
    }
  }

  function checkAnswer() {
    if (carregando || !current) return;
    const guess = answerInput.value.trim().toLowerCase();
    if (!guess) return;
    if (guess === current.name.toLowerCase()) {
      feedback.textContent = '✅ É o ' + current.name;
      feedback.className = 'feedback correct';
      pokeImg.classList.remove('hidden');
      pokeImg.classList.add('revealed');
      pokeImg.alt = current.name;
    } else {
      feedback.textContent = '❌ Tente novamente';
      feedback.className = 'feedback wrong';
    }
  }

  submitBtn.addEventListener('click', checkAnswer);
  answerInput.addEventListener('keydown', e => { if (e.key === 'Enter') checkAnswer(); });
  nextBtn.addEventListener('click', newRound);
  return newRound();
})();
