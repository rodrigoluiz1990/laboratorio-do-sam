const assert = require('node:assert/strict');
const { test } = require('node:test');
const iniciar = require('./helpers/calendario.cjs');

function conferirLayout(app, esperado) {
  assert.equal(app.wrapper.dataset.layout, esperado);
  const ativos = app.botoes.filter(el => el.getAttribute('aria-pressed') === 'true');
  assert.equal(ativos.length, 1);
  assert.equal(ativos[0].dataset.layout, esperado);
}

for (const toque of [false, true]) {
  test(`inicialização integrada em ${toque ? 'celular' : 'computador'} seleciona o layout correto`, async () => {
    const app = await iniciar({ toque });
    conferirLayout(app, toque ? 'linhas' : 'colunas');
    assert.equal(app.obter('selectMes').value, 9);
    assert.equal(app.obter('selectAno').value, 2026);
    assert.equal(app.obter('calendario').children.filter(el => el.classList.contains('day-cell')).length, 30);
  });
}

test('padrão acompanha dispositivo até a primeira escolha manual', async () => {
  const app = await iniciar();
  await app.mudarDispositivo(true);
  conferirLayout(app, 'linhas');
  await app.layout('colunas');
  await app.mudarDispositivo(false);
  await app.mudarDispositivo(true);
  conferirLayout(app, 'colunas');
  const novaAbertura = await iniciar({ toque: true });
  conferirLayout(novaAbertura, 'linhas');
});

test('busca, renderização, filtros e navegação mantêm a seleção de layout', async () => {
  const app = await iniciar();
  await app.filtrar('raid', false);
  app.obter('buscaEvento').value = 'teste';
  await app.acionar('btnBuscar', 'click');
  assert.equal(app.obter('selectAno').value, 2025);
  assert.equal(app.obter('selectMes').value, 5);
  assert.equal(app.eventos().length, 2);
  const conferirFiltro = () => {
    assert.equal(app.eventos().find(el => el.getAttribute('data-categoria') === 'raid').style.display, 'none');
    assert.equal(app.eventos().find(el => el.getAttribute('data-categoria') === 'events').style.display, '');
  };
  conferirFiltro();
  await app.layout('linhas');
  await app.acionar('selectAno', 'change', '2026');
  conferirLayout(app, 'linhas');
  conferirFiltro();
  await app.acionar('selectMes', 'change', '6');
  assert.equal(app.eventos().length, 0);
  await app.acionar('selectMes', 'change', '5');
  conferirFiltro();
  await app.layout('colunas');
  conferirLayout(app, 'colunas');
  conferirFiltro();
});

test('Hoje após a busca limpa o termo sem redefinir layout nem filtros', async () => {
  const app = await iniciar();
  await app.layout('linhas');
  await app.filtrar('raid', false);
  app.obter('buscaEvento').value = 'teste';
  await app.acionar('btnBuscar', 'click');
  await app.acionar('btnHoje', 'click');
  assert.equal(app.obter('selectAno').value, 2026);
  assert.equal(app.obter('selectMes').value, 9);
  assert.equal(app.obter('buscaEvento').value, '');
  assert.equal(app.executar('termoBuscaGlobal'), '');
  assert.equal(app.obter('listboxBusca').style.display, 'none');
  conferirLayout(app, 'linhas');
  assert.equal(app.checkboxes().find(el => el.value === 'raid').checked, false);
});

test('clicar na sugestão navega e renderiza o evento, mantendo filtros e layout', async () => {
  const app = await iniciar({ toque: true });
  await app.filtrar('raid', false);
  await app.acionar('buscaEvento', 'input', 'Encontro');
  assert.ok(app.obter('listboxBusca').children.length > 0);
  const sugestao = app.obter('listboxBusca').children[0];
  await sugestao.disparar('click');
  await new Promise(resolve => setImmediate(resolve));
  assert.equal(app.obter('selectAno').value, 2025);
  assert.equal(app.obter('selectMes').value, 5);
  assert.equal(app.obter('buscaEvento').value, 'Encontro de teste');
  assert.equal(app.obter('listboxBusca').style.display, 'none');
  conferirLayout(app, 'linhas');
  assert.equal(app.eventos().find(el => el.getAttribute('data-categoria') === 'raid').style.display, 'none');
});

test('todos os filtros desligados continuam ocultando eventos após busca e troca de ano', async () => {
  const app = await iniciar();
  for (const cb of app.checkboxes()) await app.filtrar(cb.value, false);
  app.obter('buscaEvento').value = 'teste';
  await app.acionar('btnBuscar', 'click');
  await app.acionar('selectAno', 'change', '2026');
  assert.equal(app.eventos().length, 2);
  assert.ok(app.eventos().every(el => el.style.display === 'none'));
  await app.filtrar('events', true);
  assert.equal(app.eventos().filter(el => el.style.display !== 'none').length, 1);
});
