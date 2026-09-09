const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');
const { test } = require('node:test');

test('Passe GO de dezembro/2026 termina depois de começar', () => {
  const dados = JSON.parse(fs.readFileSync(path.join(__dirname, '../Calendario/2026.json'), 'utf8'));
  const passe = dados['2026'].go_pass.find(ev => ev.titulo === 'Passe Go: Dezembro');
  assert.ok(passe);
  assert.ok(new Date(passe.fim) > new Date(passe.inicio));
});

test('horas lendárias de Mega Latias e Mega Latios aparecem no calendário', async () => {
  const elementos = new Map();
  const contexto = vm.createContext({
    dataAtual: new Date(2025, 8, 1), termoBuscaGlobal: '',
    console: { log() {}, info() {}, warn() {}, error(erro) { assert.fail(String(erro)); } },
    document: { getElementById(id) {
      if (!elementos.has(id)) elementos.set(id, { classList: { add() {} }, style: {} });
      return elementos.get(id);
    } },
    async fetch(url) {
      const dados = JSON.parse(fs.readFileSync(path.join(__dirname, '..', url.replace('../', '')), 'utf8'));
      return { ok: true, json: async () => dados };
    },
    formatarData: valor => valor,
    renderizarCalendario() {},
    notificacoesEstaoAtivas: () => false,
  });
  vm.runInContext(fs.readFileSync(path.join(__dirname, '../Calendario/dados.js'), 'utf8'), contexto);
  await vm.runInContext('carregarEvents()', contexto);
  const eventos = vm.runInContext('events["2025-09-17"]', contexto);
  for (const nome of ['Latias', 'Latios']) {
    const evento = eventos.find(ev => ev.texto.titulo === `Hora Lendária: Mega ${nome}`);
    assert.ok(evento, `Evento de ${nome} ausente`);
    assert.equal(evento.categoria, 'raid_hour');
    assert.equal(evento.link, `https://pokebattler.com/raids/${nome.toUpperCase()}_MEGA`);
    assert.match(evento.texto.horario, /18:00.*19:00/);
  }
});
