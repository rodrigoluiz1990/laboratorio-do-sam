const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');
const { test } = require('node:test');

function elemento() {
  const classes = new Set();
  const atributos = {};
  return {
    children: [], style: {},
    set innerHTML(valor) { this.children = []; },
    classList: {
      add: nome => classes.add(nome),
      contains: nome => classes.has(nome),
      toggle(nome, ativo) { if (ativo) classes.add(nome); else classes.delete(nome); },
    },
    appendChild(filho) { this.children.push(filho); },
    setAttribute: (nome, valor) => { atributos[nome] = valor; },
    getAttribute: nome => atributos[nome],
    addEventListener(tipo, fn) { this[tipo] = fn; },
  };
}

function iniciar() {
  const elementos = {};
  const obter = id => elementos[id] ||= elemento();
  const descendentes = el => el.children.flatMap(filho => [filho, ...descendentes(filho)]);
  const checkboxes = () => descendentes(obter('filtro-categorias')).filter(el => el.type === 'checkbox');
  const eventos = () => descendentes(obter('calendario')).filter(el => el.classList.contains('event'));
  let filtrosNaInicializacao = 0;
  const ctx = vm.createContext({
    document: {
      getElementById: obter,
      createElement: elemento,
      querySelectorAll(seletor) {
        if (seletor === '.event') return eventos();
        if (seletor === '#filtro-categorias input[type="checkbox"]:checked') return checkboxes().filter(cb => cb.checked);
        throw new Error(`Seletor inesperado: ${seletor}`);
      },
    },
    dataAtual: new Date(2026, 0, 1), events: {}, termoBuscaGlobal: '',
    carregarEvents() { filtrosNaInicializacao = checkboxes().length; },
  });
  const html = fs.readFileSync(path.join(__dirname, '../Calendario/calendario.html'), 'utf8');
  const script = [...html.matchAll(/<script\b[^>]*>([\s\S]*?)<\/script>/g)]
    .find(match => match[1].includes('function renderizarCalendario()'))[1];
  vm.runInContext(script, ctx);
  function renderizar(ano = 2026, mes = 1) {
    ctx.dataAtual = new Date(ano, mes - 1, 1);
    ctx.events = { [`${ano}-${String(mes).padStart(2, '0')}-15`]: ['raid', 'events'].map(categoria => ({
      categoria, texto: { titulo: 'Evento de teste', horario: '18:00' }, img: 'teste.png',
    })) };
    vm.runInContext('renderizarCalendario()', ctx);
  }
  function marcar(categoria, checked) {
    const checkbox = checkboxes().find(cb => cb.value === categoria);
    checkbox.checked = checked;
    checkbox.change();
  }
  return { ctx, eventos, checkboxes, renderizar, marcar, filtrosNaInicializacao };
}

test('filtros estão prontos antes de carregar eventos e todas as categorias começam visíveis', () => {
  const app = iniciar();
  assert.ok(app.filtrosNaInicializacao > 0);
  app.renderizar();
  assert.equal(app.eventos().length, 2);
  assert.ok(app.eventos().every(ev => ev.style.display === ''));
});

test('categoria desmarcada continua oculta após renderizar outro mês e ano', () => {
  const app = iniciar();
  app.renderizar();
  app.marcar('raid', false);
  for (const [ano, mes] of [[2026, 2], [2025, 9]]) {
    app.renderizar(ano, mes);
    assert.equal(app.eventos().find(ev => ev.getAttribute('data-categoria') === 'raid').style.display, 'none');
    assert.equal(app.eventos().find(ev => ev.getAttribute('data-categoria') === 'events').style.display, '');
    assert.equal(app.checkboxes().find(cb => cb.value === 'raid').checked, false);
  }
});

test('nenhuma categoria selecionada mantém todos os eventos ocultos após navegar', () => {
  const app = iniciar();
  for (const cb of app.checkboxes()) app.marcar(cb.value, false);
  app.renderizar(2025, 9);
  assert.ok(app.eventos().every(ev => ev.style.display === 'none'));
  app.marcar('raid', true);
  assert.equal(app.eventos().find(ev => ev.getAttribute('data-categoria') === 'raid').style.display, '');
});

test('renderização com busca ativa respeita os filtros existentes', () => {
  const app = iniciar();
  app.marcar('raid', false);
  app.ctx.termoBuscaGlobal = 'teste';
  app.renderizar(2025, 9);
  assert.equal(app.eventos().find(ev => ev.getAttribute('data-categoria') === 'raid').style.display, 'none');
  assert.equal(app.eventos().find(ev => ev.getAttribute('data-categoria') === 'events').style.display, '');
});
