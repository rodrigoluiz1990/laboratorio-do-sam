const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');
const { test } = require('node:test');

function iniciar(opcoes = {}) {
  const estado = { api: 'ok', imagem: 'ok', sorteio: 0, ...opcoes };
  const elementos = {};
  const requisicoes = [];
  const timers = new Map();
  let timerId = 0;
  function elemento() {
    const classes = new Set();
    return {
      value: '', style: {}, disabled: true,
      classList: { add: nome => classes.add(nome), remove: nome => classes.delete(nome), contains: nome => classes.has(nome) },
      addEventListener(tipo, fn) { this[tipo] = fn; },
      removeAttribute(nome) { if (nome === 'src') this.endereco = undefined; },
      set src(url) {
        this.endereco = url;
        if (estado.imagem === 'pendente') return;
        queueMicrotask(() => estado.imagem === 'erro' ? this.onerror?.() : this.onload?.());
      },
    };
  }
  const contexto = vm.createContext({
    AbortController,
    Math: { floor: Math.floor, random: () => estado.sorteio },
    document: { getElementById: id => elementos[id] ||= elemento() },
    console: { error() {} },
    setTimeout(fn) { timers.set(++timerId, fn); return timerId; },
    clearTimeout: id => timers.delete(id),
    async fetch(url, { signal }) {
      requisicoes.push(url);
      if (estado.api === 'conexao') throw new Error('Sem conexão');
      if (estado.api === 'pendente') {
        return new Promise((resolve, reject) => signal.addEventListener('abort', () => reject(new Error('Abortado'))));
      }
      const id = Number(url.split('/').at(-2));
      return {
        ok: estado.api !== 'http', status: 503,
        json: async () => estado.api === 'invalida' ? {} : { id, name: 'bulbasaur', names: [] },
      };
    },
  });
  const pronto = vm.runInContext(fs.readFileSync(path.join(__dirname, '../quem_e_esse_pokemon/quem_e_esse_pokemon.js'), 'utf8'), contexto);
  return {
    pronto, estado, elementos, requisicoes, timers,
    proximo: () => elementos.nextBtn.click(),
    esperar: () => new Promise(resolve => setImmediate(resolve)),
    expirar() { const [id, fn] = timers.entries().next().value; timers.delete(id); fn(); },
  };
}

test('inicia com uma requisição de espécie e libera a resposta após a imagem', async () => {
  const app = iniciar({ imagem: 'pendente' });
  await app.esperar();
  assert.equal(app.requisicoes.length, 1);
  assert.match(app.requisicoes[0], /pokemon-species\/1\/$/);
  assert.equal(app.elementos.submitBtn.disabled, true);
  assert.equal(app.elementos.pokeImg.style.visibility, 'hidden');
  app.elementos.pokeImg.onload();
  await app.pronto;
  assert.equal(app.elementos.submitBtn.disabled, false);
  assert.equal(app.elementos.pokeImg.style.visibility, 'visible');
  assert.equal(app.elementos.pokeImg.alt, 'Pokémon misterioso');
  assert.equal(app.timers.size, 0);
});

test('cache evita repetir a consulta de uma espécie e mantém os 898 IDs disponíveis', async () => {
  const app = iniciar();
  await app.pronto;
  await app.proximo();
  assert.equal(app.requisicoes.length, 1);
  app.estado.sorteio = 0.999999;
  await app.proximo();
  assert.equal(app.requisicoes.length, 2);
  assert.match(app.requisicoes[1], /pokemon-species\/898\/$/);
});

test('cliques durante carregamento não iniciam rodadas concorrentes', async () => {
  const app = iniciar({ imagem: 'pendente' });
  await app.esperar();
  await app.proximo();
  await app.proximo();
  assert.equal(app.requisicoes.length, 1);
  app.elementos.pokeImg.onload();
  await app.pronto;
});

for (const api of ['http', 'conexao', 'invalida']) {
  test(`falha ${api} permite tentar novamente sem recarregar a página`, async () => {
    const app = iniciar({ api });
    await app.pronto;
    assert.equal(app.elementos.nextBtn.textContent, 'Tentar novamente');
    assert.equal(app.elementos.nextBtn.disabled, false);
    assert.equal(app.elementos.submitBtn.disabled, true);
    app.estado.api = 'ok';
    await app.proximo();
    assert.equal(app.elementos.submitBtn.disabled, false);
    assert.equal(app.elementos.feedback.textContent, '');
    assert.equal(app.requisicoes.length, 2);
  });
}

test('erro de imagem permite nova tentativa reutilizando os dados da espécie', async () => {
  const app = iniciar({ imagem: 'erro' });
  await app.pronto;
  assert.equal(app.elementos.nextBtn.textContent, 'Tentar novamente');
  assert.equal(app.elementos.pokeImg.style.visibility, 'hidden');
  app.estado.imagem = 'ok';
  await app.proximo();
  assert.equal(app.requisicoes.length, 1);
  assert.equal(app.elementos.submitBtn.disabled, false);
});

for (const tipo of ['api', 'imagem']) {
  test(`tempo limite de ${tipo} libera nova tentativa`, async () => {
    const app = iniciar({ [tipo]: 'pendente' });
    await app.esperar();
    app.expirar();
    await app.pronto;
    assert.equal(app.elementos.nextBtn.textContent, 'Tentar novamente');
    assert.equal(app.elementos.nextBtn.disabled, false);
    assert.equal(app.elementos.submitBtn.disabled, true);
    assert.equal(app.timers.size, 0);
  });
}

test('respostas e tecla Enter continuam funcionando e nova rodada oculta a imagem', async () => {
  const app = iniciar();
  await app.pronto;
  app.elementos.answerInput.value = 'errado';
  app.elementos.submitBtn.click();
  assert.equal(app.elementos.feedback.className, 'feedback wrong');
  app.elementos.answerInput.value = ' BULBASAUR ';
  app.elementos.answerInput.keydown({ key: 'Enter' });
  assert.equal(app.elementos.feedback.className, 'feedback correct');
  assert.equal(app.elementos.pokeImg.classList.contains('revealed'), true);
  await app.proximo();
  assert.equal(app.elementos.pokeImg.classList.contains('revealed'), false);
  assert.equal(app.elementos.pokeImg.classList.contains('hidden'), true);
  assert.equal(app.elementos.answerInput.value, '');
});
