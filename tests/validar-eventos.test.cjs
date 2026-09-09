const assert = require('node:assert/strict');
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');
const { spawnSync } = require('node:child_process');
const { test } = require('node:test');
const modulo = import('../Calendario/scripts/validar-eventos.mjs');
const script = path.resolve(__dirname, '../Calendario/scripts/validar-eventos.mjs');

function preparar(t) {
  const diretorio = fs.mkdtempSync(path.join(os.tmpdir(), 'sam-validacao-'));
  // Apenas a pasta temporária criada por este teste é removida.
  t.after(() => fs.rmSync(diretorio, { recursive: true, force: true }));
  const evento = { titulo: 'Evento de teste', inicio: '2026-09-08T10:00:00', fim: '2026-09-08T18:00:00' };
  const dados = { 2026: { events: [evento] } };
  const gravar = (arquivo, valor) => fs.writeFileSync(path.join(diretorio, arquivo), JSON.stringify(valor));
  gravar('anos.json', { anos: [2026] });
  gravar('meta.json', { meta: { categorias: { events: {}, raid: {}, raid_hour: {} } } });
  gravar('raids.json', { raid: [{ raid_teste: { titulo: 'Raid de teste' } }] });
  gravar('2026.json', dados);
  return { diretorio, evento, dados, gravar, salvar: () => gravar('2026.json', dados) };
}

test('valida dias reais, anos bissextos e horários sem normalizar datas inválidas', async () => {
  const { dataHoraValida } = await modulo;
  for (const data of ['2024-02-29T10:00:00', '2026-09-08T23:59:59', '2026-09-08T24:00:00']) assert.equal(dataHoraValida(data), true, data);
  for (const data of ['', null, '2026-02-29T10:00:00', '2026-02-31T10:00:00', '2026-00-01T10:00:00', '2026-09-00T10:00:00', '2026-09-08T24:01:00', '2026-09-08T25:00:00', '2026-09-08T10:60:00', '2026-09-08T10:00:60', '2026-09-08']) assert.equal(dataHoraValida(data), false, String(data));
});

test('dados completos passam sem erros ou avisos', async t => {
  const f = preparar(t);
  const r = (await modulo).validarCalendario(f.diretorio);
  assert.equal(r.registros, 1);
  assert.deepEqual(r.erros, []);
  assert.deepEqual(r.avisos, []);
});

test('detecta término invertido e identifica arquivo e campo', async t => {
  const f = preparar(t);
  f.evento.fim = '2026-09-07T18:00:00'; f.salvar();
  const r = (await modulo).validarCalendario(f.diretorio);
  assert.ok(r.erros.some(e => e.arquivo === '2026.json' && e.campo.endsWith('.fim') && e.mensagem.includes('anterior')));
});

test('aceita virada do ano e equivalência de 24h com 0h do dia seguinte', async t => {
  const f = preparar(t);
  f.evento.inicio = '2025-12-31T24:00:00'; f.evento.fim = '2026-01-01T00:00:00'; f.salvar();
  assert.deepEqual((await modulo).validarCalendario(f.diretorio).erros, []);
});

test('evento de outro ano é erro quando não está marcado como modelo', async t => {
  const f = preparar(t);
  f.evento.inicio = '2025-09-08T10:00:00'; f.evento.fim = '2025-09-08T18:00:00'; f.salvar();
  assert.ok((await modulo).validarCalendario(f.diretorio).erros.some(e => e.mensagem.includes('não alcança')));
});

test('referências de horas lendárias usam o catálogo de raids', async t => {
  const f = preparar(t);
  delete f.evento.titulo; f.evento.ref = 'raid_teste';
  f.dados[2026] = { raid_hour: [f.evento] }; f.salvar();
  assert.deepEqual((await modulo).validarCalendario(f.diretorio).erros, []);
  f.evento.ref = 'raid_inexistente'; f.salvar();
  assert.ok((await modulo).validarCalendario(f.diretorio).erros.some(e => e.campo.endsWith('.ref')));
});

test('modelos geram avisos e voltam à validação normal ao remover a marcação', async t => {
  const f = preparar(t);
  Object.assign(f.evento, { modelo: true, titulo: '', inicio: '', fim: '' }); f.salvar();
  let r = (await modulo).validarCalendario(f.diretorio);
  assert.equal(r.modelos, 1); assert.equal(r.erros.length, 0); assert.equal(r.avisos.length, 1);
  delete f.evento.modelo; f.salvar();
  r = (await modulo).validarCalendario(f.diretorio);
  assert.ok(r.erros.length > 0);
});

test('estrutura inválida e marcador não booleano não são silenciados', async t => {
  const f = preparar(t);
  f.evento.modelo = 'true'; f.dados[2026].inexistente = {}; f.salvar();
  const r = (await modulo).validarCalendario(f.diretorio);
  assert.ok(r.erros.some(e => e.campo.endsWith('.modelo')));
  assert.ok(r.erros.some(e => e.campo.endsWith('.inexistente')));
});

test('JSON malformado ou arquivo ausente produz diagnóstico', async t => {
  const f = preparar(t);
  fs.writeFileSync(path.join(f.diretorio, '2026.json'), '{');
  f.gravar('anos.json', { anos: [2026, 2027] });
  const r = (await modulo).validarCalendario(f.diretorio);
  assert.ok(r.erros.some(e => e.arquivo === '2026.json'));
  assert.ok(r.erros.some(e => e.arquivo === '2027.json'));
});

test('referências duplicadas e links executáveis são erros', async t => {
  const f = preparar(t);
  f.gravar('raids.json', { raid: [{ raid_teste: { titulo: 'A' } }, { raid_teste: { titulo: 'B' } }] });
  f.evento.link = 'javascript:alert(1)'; f.salvar();
  const r = (await modulo).validarCalendario(f.diretorio);
  assert.ok(r.erros.some(e => e.mensagem.includes('duplicada')));
  assert.ok(r.erros.some(e => e.campo.endsWith('.link')));
});

test('CLI retorna 0 para dados válidos/modelos e 1 para erros, sem alterar arquivos', t => {
  const f = preparar(t);
  const executar = () => spawnSync(process.execPath, [script, f.diretorio], { cwd: os.tmpdir(), encoding: 'utf8' });
  const original = fs.readFileSync(path.join(f.diretorio, '2026.json'), 'utf8');
  assert.equal(executar().status, 0);
  assert.equal(fs.readFileSync(path.join(f.diretorio, '2026.json'), 'utf8'), original);
  f.evento.inicio = ''; f.salvar();
  const falha = executar(); assert.equal(falha.status, 1); assert.match(falha.stdout, /ERRO.*inicio/);
  f.evento.modelo = true; f.salvar();
  assert.equal(executar().status, 0);
});
