const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');
const { test } = require('node:test');

function iniciarCalendario(dataInicial = new Date(2026, 0, 1)) {
  const elementos = new Map();
  function criarElemento() {
    const listeners = {};
    return {
      value: '', style: {}, textContent: '', children: [],
      appendChild(elemento) { this.children.push(elemento); },
      setAttribute() {},
      addEventListener(tipo, listener) {
        (listeners[tipo] ||= []).push(listener);
      },
      async disparar(tipo) {
        for (const listener of listeners[tipo] || []) {
          await listener({ target: this });
        }
      },
    };
  }
  const document = {
    getElementById(id) {
      if (!elementos.has(id)) elementos.set(id, criarElemento());
      return elementos.get(id);
    },
    createElement: criarElemento,
    addEventListener() {},
  };
  const renderizacoes = [];
  const contexto = vm.createContext({
    document, window: {},
    dataAtual: dataInicial,
    dadosGlobais: {
      2025: { events: [{ titulo: 'Evento de teste', inicio: '2025-05-01T10:00:00', fim: '2025-05-01T11:00:00' }] },
    },
    metaGlobais: null, raidsGlobais: null,
    carregarDadosGlobaisBusca: async () => {},
    carregarEvents() {
      renderizacoes.push(new Date(contexto.dataAtual));
    },
    alert(mensagem) { assert.fail(mensagem); },
  });
  for (const arquivo of ['controleCalendario.js', 'buscaEventos.js']) {
    vm.runInContext(fs.readFileSync(path.join(__dirname, '../Calendario', arquivo), 'utf8'), contexto);
  }
  vm.runInContext('inicializarControleCalendario(carregarEvents)', contexto);
  return { contexto, renderizacoes, elemento: id => document.getElementById(id) };
}

async function buscar(app) {
  app.elemento('buscaEvento').value = 'Evento de teste';
  await app.elemento('btnBuscar').disparar('click');
  assert.equal(app.contexto.dataAtual.getFullYear(), 2025);
  assert.equal(app.contexto.dataAtual.getMonth(), 4);
}

test('seletor de mês atualiza a data exibida após buscar', async () => {
  const app = iniciarCalendario();
  await buscar(app);
  app.elemento('selectMes').value = '7';
  await app.elemento('selectMes').disparar('change');
  assert.equal(app.renderizacoes.at(-1).getFullYear(), 2025);
  assert.equal(app.renderizacoes.at(-1).getMonth(), 6);
});

test('seletor de ano atualiza a data exibida após buscar', async () => {
  const app = iniciarCalendario();
  await buscar(app);
  app.elemento('selectAno').value = '2024';
  await app.elemento('selectAno').disparar('change');
  assert.equal(app.renderizacoes.at(-1).getFullYear(), 2024);
  assert.equal(app.renderizacoes.at(-1).getMonth(), 4);
});

test('Hoje restaura a data exibida e limpa a busca', async () => {
  const app = iniciarCalendario();
  await buscar(app);
  await app.elemento('btnHoje').disparar('click');
  const hoje = new Date();
  assert.equal(app.renderizacoes.at(-1).getFullYear(), hoje.getFullYear());
  assert.equal(app.renderizacoes.at(-1).getMonth(), hoje.getMonth());
  assert.equal(app.elemento('buscaEvento').value, '');
  assert.equal(app.elemento('listboxBusca').style.display, 'none');
  assert.equal(vm.runInContext('termoBuscaGlobal', app.contexto), '');
});

test('controles continuam sincronizados após apagar a busca', async () => {
  const app = iniciarCalendario();
  await buscar(app);
  app.elemento('buscaEvento').value = '';
  await app.elemento('buscaEvento').disparar('input');
  app.elemento('selectAno').value = '2023';
  await app.elemento('selectAno').disparar('change');
  assert.equal(app.renderizacoes.at(-1).getFullYear(), 2023);
  assert.equal(app.renderizacoes.at(-1).getMonth(), new Date().getMonth());
  assert.equal(app.renderizacoes.at(-1).getDate(), 1);
});

test('inicialização usa o primeiro dia do mês', () => {
  const app = iniciarCalendario(new Date(2026, 0, 31));
  assert.equal(app.contexto.dataAtual.getMonth(), 0);
  assert.equal(app.contexto.dataAtual.getDate(), 1);
});

for (const dia of [29, 30, 31]) {
  test(`avançar de janeiro no dia ${dia} chega a fevereiro`, () => {
    const app = iniciarCalendario();
    app.contexto.dataAtual = new Date(2026, 0, dia);
    vm.runInContext('mudarMes(1)', app.contexto);
    assert.equal(app.renderizacoes.at(-1).getMonth(), 1);
    assert.equal(app.renderizacoes.at(-1).getDate(), 1);
  });
}

test('voltar de 31 de março chega a fevereiro', () => {
  const app = iniciarCalendario();
  app.contexto.dataAtual = new Date(2026, 2, 31);
  vm.runInContext('mudarMes(-1)', app.contexto);
  assert.equal(app.renderizacoes.at(-1).getMonth(), 1);
  assert.equal(app.renderizacoes.at(-1).getDate(), 1);
});

test('selecionar fevereiro a partir de 31 de janeiro preserva o mês escolhido', async () => {
  const app = iniciarCalendario();
  app.contexto.dataAtual = new Date(2026, 0, 31);
  app.elemento('selectMes').value = '2';
  await app.elemento('selectMes').disparar('change');
  assert.equal(app.renderizacoes.at(-1).getMonth(), 1);
  assert.equal(app.renderizacoes.at(-1).getDate(), 1);
});

for (const controle of ['seta', 'seletor']) {
  test(`troca de ano por ${controle} em 29/02 preserva fevereiro`, async () => {
    const app = iniciarCalendario();
    app.contexto.dataAtual = new Date(2024, 1, 29);
    if (controle === 'seta') {
      vm.runInContext('mudarAno(1)', app.contexto);
    } else {
      app.elemento('selectAno').value = '2025';
      await app.elemento('selectAno').disparar('change');
    }
    assert.equal(app.renderizacoes.at(-1).getFullYear(), 2025);
    assert.equal(app.renderizacoes.at(-1).getMonth(), 1);
    assert.equal(app.renderizacoes.at(-1).getDate(), 1);
  });
}

test('sugestão da busca abre fevereiro mesmo partindo de dia 31', async () => {
  const app = iniciarCalendario();
  app.contexto.dadosGlobais = { 2025: { events: [
    { titulo: 'Evento fevereiro', inicio: '2025-02-15T10:00:00', fim: '2025-02-15T11:00:00' },
  ] } };
  app.contexto.dataAtual = new Date(2026, 0, 31);
  app.elemento('buscaEvento').value = 'Evento fevereiro';
  await app.elemento('buscaEvento').disparar('input');
  await app.elemento('listboxBusca').children[0].disparar('click');
  assert.equal(app.renderizacoes.at(-1).getFullYear(), 2025);
  assert.equal(app.renderizacoes.at(-1).getMonth(), 1);
  assert.equal(app.renderizacoes.at(-1).getDate(), 1);
});

test('navegação mensal atravessa a virada do ano nos dois sentidos', () => {
  const app = iniciarCalendario();
  app.contexto.dataAtual = new Date(2025, 11, 31);
  vm.runInContext('mudarMes(1)', app.contexto);
  assert.equal(app.contexto.dataAtual.getFullYear(), 2026);
  assert.equal(app.contexto.dataAtual.getMonth(), 0);
  vm.runInContext('mudarMes(-1)', app.contexto);
  assert.equal(app.contexto.dataAtual.getFullYear(), 2025);
  assert.equal(app.contexto.dataAtual.getMonth(), 11);
  assert.equal(app.contexto.dataAtual.getDate(), 1);
});
