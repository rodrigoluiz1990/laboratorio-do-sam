const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');

function criarElemento() {
  const classes = new Set();
  const atributos = {};
  const listeners = {};
  return {
    children: [], style: {}, dataset: {}, value: '', checked: false,
    set innerHTML(valor) { this.children = []; },
    get className() { return [...classes].join(' '); },
    set className(valor) { classes.clear(); valor.split(/\s+/).filter(Boolean).forEach(nome => classes.add(nome)); },
    classList: {
      add: nome => classes.add(nome),
      contains: nome => classes.has(nome),
      toggle(nome, ativo) { if (ativo) classes.add(nome); else classes.delete(nome); },
    },
    appendChild(filho) { this.children.push(filho); },
    setAttribute: (nome, valor) => { atributos[nome] = String(valor); },
    getAttribute: nome => atributos[nome] ?? null,
    removeAttribute: nome => { delete atributos[nome]; },
    addEventListener(tipo, fn) { (listeners[tipo] ||= []).push(fn); },
    async disparar(tipo) { for (const fn of listeners[tipo] || []) await fn({ target: this }); },
  };
}

module.exports = async function iniciarCalendario({ toque = false } = {}) {
  const raiz = path.resolve(__dirname, '../..');
  const html = fs.readFileSync(path.join(raiz, 'Calendario/calendario.html'), 'utf8');
  const elementos = new Map([...html.matchAll(/\bid="([^"]+)"/g)].map(m => [m[1], criarElemento()]));
  const obter = id => {
    assert.ok(elementos.has(id), `Elemento ${id} ausente no HTML`);
    return elementos.get(id);
  };
  const wrapper = criarElemento();
  const botoes = [...html.matchAll(/<button\b[^>]*class="layout-button"[^>]*>/g)].map(([tag]) => {
    const botao = criarElemento();
    botao.dataset.layout = /data-layout="([^"]+)"/.exec(tag)[1];
    return botao;
  });
  assert.equal(botoes.length, 2);
  const media = criarElemento();
  media.matches = toque;
  const descendentes = el => el.children.flatMap(filho => [filho, ...descendentes(filho)]);
  const checkboxes = () => descendentes(obter('filtro-categorias')).filter(el => el.type === 'checkbox');
  const eventos = () => descendentes(obter('calendario')).filter(el => el.classList.contains('event'));
  const erros = [];
  const avisos = [];
  const respostas = {
    'anos.json': { anos: [2025, 2026] },
    'meta.json': { meta: { categorias: { events: { icon: 'evento.png' }, raid: { icon: 'raid.png' } } } },
    'raids.json': { raid: [{ raid_teste: { titulo: 'Raid de teste' } }] },
  };
  for (const ano of [2025, 2026]) {
    const inicio = `${ano}-05-15T10:00:00`, fim = `${ano}-05-15T18:00:00`;
    respostas[`${ano}.json`] = { [ano]: {
      events: [{ titulo: 'Encontro de teste', inicio, fim }],
      raid: [{ ref: 'raid_teste', inicio, fim }],
    } };
  }
  class Relogio extends Date {
    constructor(...args) { super(...(args.length ? args : [2026, 8, 8, 12])); }
    static now() { return new Relogio().getTime(); }
  }
  const contexto = vm.createContext({
    Date: Relogio, dataAtual: new Relogio(),
    window: { matchMedia: () => media },
    document: {
      getElementById: obter,
      createElement: criarElemento,
      addEventListener() {},
      querySelector: seletor => { assert.equal(seletor, '.calendar-wrapper'); return wrapper; },
      querySelectorAll(seletor) {
        if (seletor === '.layout-button') return botoes;
        if (seletor === '.event') return eventos();
        if (seletor === '#filtro-categorias input[type="checkbox"]:checked') return checkboxes().filter(el => el.checked);
        throw new Error(`Seletor inesperado: ${seletor}`);
      },
    },
    console: { log() {}, info() {}, warn() {}, error: (...args) => erros.push(args.join(' ')) },
    alert: mensagem => avisos.push(mensagem),
    async fetch(url) {
      const dados = respostas[path.basename(url)];
      return { ok: !!dados, json: async () => dados };
    },
  });
  const executar = codigo => vm.runInContext(codigo, contexto);
  const carregar = arquivo => executar(fs.readFileSync(path.join(raiz, 'Calendario', arquivo), 'utf8'));
  carregar('layoutCalendario.js');
  carregar('dados.js');
  executar([...html.matchAll(/<script\b[^>]*>([\s\S]*?)<\/script>/g)]
    .find(m => m[1].includes('function renderizarCalendario()'))[1]);
  carregar('controleCalendario.js');
  executar('inicializarControleCalendario(carregarEvents)');
  carregar('buscaEventos.js');
  async function aguardar() {
    await new Promise(resolve => setImmediate(resolve));
    assert.deepEqual(erros, [], 'Erro inesperado no calendário');
  }
  await aguardar();
  return {
    contexto, executar, obter, wrapper, botoes, eventos, checkboxes, avisos,
    async acionar(id, tipo, valor) { if (valor !== undefined) obter(id).value = valor; await obter(id).disparar(tipo); await aguardar(); },
    async filtrar(categoria, ativo) { const cb = checkboxes().find(el => el.value === categoria); cb.checked = ativo; await cb.disparar('change'); await aguardar(); },
    async layout(nome) { await botoes.find(el => el.dataset.layout === nome).disparar('click'); await aguardar(); },
    async mudarDispositivo(toque) { media.matches = toque; await media.disparar('change'); },
  };
};
