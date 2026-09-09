const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');
const { test } = require('node:test');
const codigo = fs.readFileSync(path.join(__dirname, '../componentes.js'), 'utf8');

function iniciar({ falhar = '', pronto = true } = {}) {
  const requisicoes = [], navegacoes = [];
  const estado = { falhar };
  const eventosDocumento = {};
  let document;
  function elemento(tag = 'div', atributos = {}) {
    const listeners = {};
    const el = {
      tag, atributos, children: [], dataset: {}, style: {},
      getAttribute: nome => atributos[nome] ?? null,
      setAttribute: (nome, valor) => { atributos[nome] = valor; },
      focus() { document.activeElement = this; },
      appendChild(filho) { this.children.push(filho); },
      replaceChildren(...filhos) { this.children = filhos.flatMap(f => f.tag === 'fragment' ? f.children : [f]); },
      addEventListener(tipo, fn) { (listeners[tipo] ||= []).push(fn); },
      async disparar(tipo, opcoes = {}) {
        const evento = { target: this, preventDefault() { this.prevenido = true; }, ...opcoes };
        for (const fn of listeners[tipo] || []) await fn(evento);
        return evento;
      },
      querySelectorAll(seletor) {
        const todos = this.children.flatMap(filho => [filho, ...filho.querySelectorAll('*')]);
        return todos.filter(filho => seletor.split(',').some(parte => {
          parte = parte.trim();
          if (parte === '*') return true;
          if (parte.startsWith('#')) return filho.id === parte.slice(1) || filho.atributos.id === parte.slice(1);
          if (parte.startsWith('.')) return filho.atributos.class === parte.slice(1);
          if (parte.startsWith('[')) return filho.getAttribute(parte.slice(1, -1)) !== null;
          return filho.tag === parte;
        }));
      },
      querySelector(seletor) { return this.querySelectorAll(seletor)[0] || null; },
    };
    return el;
  }
  function fragmento(nome) {
    const fragment = elemento('fragment');
    if (nome === 'footer.html') {
      fragment.appendChild(elemento('link', { href: 'css/footer.css' }));
      fragment.appendChild(elemento('footer', { class: 'site-footer' }));
    } else {
      fragment.appendChild(elemento('a', { href: 'index.html', class: 'logo' }));
      fragment.appendChild(elemento('img', { src: 'Assets/logo.png' }));
      fragment.appendChild(elemento('a', { href: '#', id: 'puzzleIcon' }));
      const modal = elemento('div', { id: 'gameModal' });
      modal.style.display = 'none';
      modal.appendChild(elemento('button', { class: 'close' }));
      const jogo = elemento('button', { 'data-game-href': 'puzzle/puzzle.html' });
      jogo.dataset.gameHref = 'puzzle/puzzle.html';
      modal.appendChild(jogo);
      fragment.appendChild(modal);
    }
    return fragment;
  }
  const body = elemento('body');
  const menu = elemento('div', { id: 'menu' }); body.appendChild(menu);
  document = {
    body, documentElement: elemento('html'),
    currentScript: { src: 'https://example.test/laboratorio-do-sam/componentes.js' },
    readyState: pronto ? 'complete' : 'loading',
    getElementById: id => body.querySelector(`#${id}`),
    addEventListener: (tipo, fn) => { eventosDocumento[tipo] = fn; },
    createElement(tag) {
      if (tag !== 'template') return elemento(tag);
      return { set innerHTML(nome) { this.content = fragmento(nome); } };
    },
  };
  const cliqueAnterior = () => {};
  const window = { onclick: cliqueAnterior, location: { assign: url => navegacoes.push(url) } };
  const contexto = vm.createContext({
    document, window, URL, console: { error() {} },
    async fetch(url) {
      requisicoes.push(url.href);
      const nome = url.pathname.split('/').at(-1);
      return { ok: estado.falhar !== nome, status: 503, text: async () => nome };
    },
  });
  const executar = () => vm.runInContext(codigo, contexto);
  executar();
  return {
    estado, document, window, cliqueAnterior, menu, requisicoes, navegacoes, executar,
    obter: id => document.getElementById(id),
    carregarDOM: () => eventosDocumento.DOMContentLoaded(),
    aguardar: () => new Promise(resolve => setImmediate(resolve)),
  };
}

test('menu, imagens, rodapé e destino do jogo usam a raiz do script', async () => {
  const app = iniciar(); await app.aguardar();
  const base = 'https://example.test/laboratorio-do-sam/';
  assert.equal(app.menu.querySelector('.logo').getAttribute('href'), base + 'index.html');
  assert.equal(app.menu.querySelector('img').getAttribute('src'), base + 'Assets/logo.png');
  assert.equal(app.obter('rodape').querySelector('link').getAttribute('href'), base + 'css/footer.css');
  assert.equal(app.obter('puzzleIcon').getAttribute('href'), '#');
  await app.obter('gameModal').querySelector('[data-game-href]').disparar('click');
  assert.equal(app.navegacoes[0], base + 'puzzle/puzzle.html');
});

test('inicialização antecipada espera o DOM e execução repetida não duplica componentes', async () => {
  const app = iniciar({ pronto: false });
  assert.equal(app.requisicoes.length, 0);
  app.carregarDOM(); await app.aguardar();
  app.executar(); app.carregarDOM(); await app.aguardar();
  assert.equal(app.requisicoes.length, 2);
  assert.equal(app.document.body.querySelectorAll('.site-footer').length, 1);
});

test('falha do menu não impede rodapé e nova tentativa recupera o menu', async () => {
  const app = iniciar({ falhar: 'menu.html' }); await app.aguardar();
  assert.ok(app.obter('rodape').querySelector('.site-footer'));
  assert.equal(app.menu.querySelector('p').getAttribute('role'), 'status');
  app.estado.falhar = '';
  await app.menu.querySelector('button').disparar('click'); await app.aguardar();
  assert.ok(app.obter('puzzleIcon'));
  assert.equal(app.requisicoes.filter(url => url.endsWith('footer.html')).length, 1);
});

test('falha do rodapé mantém o menu funcional', async () => {
  const app = iniciar({ falhar: 'footer.html' }); await app.aguardar();
  await app.obter('puzzleIcon').disparar('click');
  assert.equal(app.obter('gameModal').style.display, 'block');
  assert.ok(app.obter('rodape').querySelector('button'));
});

test('modal abre e fecha sem substituir cliques existentes na página', async () => {
  const app = iniciar(); await app.aguardar();
  const abrir = app.obter('puzzleIcon'), modal = app.obter('gameModal');
  const evento = await abrir.disparar('click');
  assert.equal(evento.prevenido, true);
  assert.equal(modal.style.display, 'block');
  assert.equal(abrir.getAttribute('aria-expanded'), 'true');
  await modal.disparar('click', { target: modal.querySelector('.close') });
  assert.equal(modal.style.display, 'block');
  await modal.disparar('click');
  assert.equal(modal.style.display, 'none');
  assert.equal(app.document.activeElement, abrir);
  await abrir.disparar('click');
  await modal.querySelector('.close').disparar('click');
  assert.equal(modal.style.display, 'none');
  assert.equal(app.window.onclick, app.cliqueAnterior);
});

test('Escape fecha o modal e Tab mantém o foco nos controles', async () => {
  const app = iniciar(); await app.aguardar();
  const modal = app.obter('gameModal'), abrir = app.obter('puzzleIcon');
  await abrir.disparar('click');
  const botoes = modal.querySelectorAll('button');
  await modal.disparar('keydown', { key: 'Tab', shiftKey: true });
  assert.equal(app.document.activeElement, botoes.at(-1));
  await modal.disparar('keydown', { key: 'Tab', shiftKey: false });
  assert.equal(app.document.activeElement, botoes[0]);
  await modal.disparar('keydown', { key: 'Escape' });
  assert.equal(modal.style.display, 'none');
  assert.equal(abrir.getAttribute('aria-expanded'), 'false');
});
