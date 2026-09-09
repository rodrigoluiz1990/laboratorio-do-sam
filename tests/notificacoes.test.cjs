const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');
const { test } = require('node:test');

const INICIO = Date.parse('2026-09-08T12:00:00Z');
function evento(titulo, atraso = 10000) {
  return { titulo, inicio: new Date(INICIO + atraso).toISOString(), fim: new Date(INICIO + atraso + 3600000).toISOString() };
}

function iniciar({ permissao = 'granted', salva = '0', suporte = true } = {}) {
  let agora = INICIO;
  let id = 0;
  let pedidosPermissao = 0;
  const timers = new Map();
  const avisos = [];
  const alertas = [];
  const requisicoes = [];
  const elementos = {};
  const listeners = {};
  const armazenamento = new Map([['notificacoesAtivas', salva]]);
  const respostas = {
    'anos.json': { anos: [2025, 2026, 2027] },
    '2026.json': { 2026: { events: [evento('Evento atual')] } },
    '2027.json': { 2027: { events: [] } },
    'raids.json': { raid: [{ raid_teste: { titulo: 'Raid de teste' } }] },
    'meta.json': { meta: { categorias: { raid_hour: { icon: 'hora.png' } } } },
  };
  class Relogio extends Date {
    constructor(...args) { super(...(args.length ? args : [agora])); }
    static now() { return agora; }
  }
  class Notificacao {
    static permission = permissao;
    static async requestPermission() { pedidosPermissao++; return this.permission; }
    constructor(titulo, opcoes) { avisos.push({ titulo, ...opcoes }); }
  }
  const ctx = vm.createContext({
    Date: Relogio,
    ...(suporte ? { Notification: Notificacao } : {}),
    console: { log() {}, warn() {}, info() {}, error() {} },
    alert: texto => alertas.push(texto),
    localStorage: { getItem: chave => armazenamento.get(chave), setItem: (chave, valor) => armazenamento.set(chave, valor) },
    document: {
      getElementById(id) {
        return elementos[id] ||= { checked: false, setAttribute() {}, addEventListener(tipo, fn) { this[tipo] = fn; } };
      },
      addEventListener: (tipo, fn) => { listeners[tipo] = fn; },
    },
    setTimeout(fn, atraso) { const chave = ++id; timers.set(chave, { fn, atraso }); return chave; },
    clearTimeout: chave => timers.delete(chave),
    async fetch(url) {
      requisicoes.push(url);
      const dados = respostas[path.basename(url)];
      return { ok: !!dados, json: async () => dados };
    },
  });
  for (const arquivo of ['dados.js', 'notificacoes.js']) {
    vm.runInContext(fs.readFileSync(path.join(__dirname, '../Calendario', arquivo), 'utf8'), ctx);
  }
  return {
    ctx, timers, avisos, alertas, elementos, armazenamento, requisicoes, respostas, Notificacao,
    pedidos: () => pedidosPermissao,
    carregar: () => listeners.DOMContentLoaded(),
    async ligar() { elementos.toggleNotificacoes.checked = true; await elementos.toggleNotificacoes.change(); },
    async desligar() { elementos.toggleNotificacoes.checked = false; await elementos.toggleNotificacoes.change(); },
    dispararTimer() {
      const [chave, timer] = timers.entries().next().value;
      timers.delete(chave);
      agora += timer.atraso;
      timer.fn();
    },
    agendar(dados) {
      ctx.dadosTeste = dados;
      elementos.toggleNotificacoes.checked = true;
      vm.runInContext('agendarNotificacaoProximoEvento(dadosTeste)', ctx);
    },
  };
}

test('ativação carrega os dados sem depender de busca e avisa no horário', async () => {
  const app = iniciar();
  await app.carregar();
  await app.ligar();
  assert.equal(vm.runInContext('Object.keys(dadosGlobais).length', app.ctx), 0);
  assert.ok(app.requisicoes.includes('../Calendario/2026.json'));
  assert.ok(app.requisicoes.includes('../Calendario/2027.json'));
  assert.ok(!app.requisicoes.includes('../Calendario/2025.json'));
  assert.equal(app.timers.size, 1);
  assert.equal(app.avisos.length, 0);
  app.dispararTimer();
  assert.match(app.avisos[0].body, /Evento atual/);
});

test('resolve raids, entrega eventos simultâneos e continua com os seguintes', async () => {
  const app = iniciar();
  const raid = { ...evento(undefined), ref: 'raid_teste' };
  app.respostas['2026.json'] = { 2026: {
    events: [evento('Simultaneo'), evento('Depois', 20000)],
    raid_hour: [{ ...raid, titulo_alt: 'Hora de teste' }], raid: [raid],
  } };
  await app.carregar();
  await app.ligar();
  app.dispararTimer();
  assert.equal(app.avisos.length, 3);
  assert.ok(app.avisos.some(n => n.body.includes('Raid de teste')));
  assert.equal(app.avisos.find(n => n.body.includes('Hora de teste')).icon, 'hora.png');
  assert.equal(app.timers.size, 1);
  app.dispararTimer();
  assert.equal(app.avisos.length, 4);
  assert.match(app.avisos[3].body, /Depois/);
  assert.equal(app.timers.size, 0);
});

test('ignora modelos incompletos, intervalos invertidos, eventos passados e duplicatas', async () => {
  const app = iniciar();
  await app.carregar();
  app.agendar({ 2026: { events: [
    evento('Valido'), evento('Valido'), evento('Passado', -10000), evento(''),
    { titulo: 'Modelo', inicio: '2026-00-00T10:00:00', fim: '' },
    { ...evento('Invertido'), fim: new Date(INICIO).toISOString() },
    { ...evento('Ref ausente'), ref: 'NOME_POKEMON' },
  ] } });
  app.dispararTimer();
  assert.equal(app.avisos.length, 1);
  assert.match(app.avisos[0].body, /Valido/);
});

test('desativar cancela o timer e reativar não duplica alertas', async () => {
  const app = iniciar();
  await app.carregar();
  await app.ligar();
  await app.desligar();
  assert.equal(app.timers.size, 0);
  assert.equal(app.armazenamento.get('notificacoesAtivas'), '0');
  await app.ligar();
  await app.ligar();
  assert.equal(app.timers.size, 1);
  app.dispararTimer();
  assert.equal(app.avisos.length, 1);
});

test('permissão é pedida apenas ao ativar e recusa desliga e salva o estado', async () => {
  const app = iniciar({ permissao: 'default' });
  await app.carregar();
  assert.equal(app.pedidos(), 0);
  await app.ligar();
  assert.equal(app.pedidos(), 1);
  assert.equal(app.elementos.toggleNotificacoes.checked, false);
  assert.equal(app.armazenamento.get('notificacoesAtivas'), '0');
  assert.equal(app.timers.size, 0);
});

test('preferência salva restaura o agendamento sem pedir permissão novamente', async () => {
  const app = iniciar({ salva: '1' });
  await app.carregar();
  assert.equal(app.pedidos(), 0);
  assert.equal(app.timers.size, 1);
});

test('navegador sem API de notificações não quebra a inicialização', async () => {
  const app = iniciar({ suporte: false, salva: '1' });
  await app.carregar();
  assert.equal(app.elementos.toggleNotificacoes.disabled, true);
  assert.equal(app.timers.size, 0);
});

test('espera acima do limite do timer não dispara antecipadamente', async () => {
  const app = iniciar();
  await app.carregar();
  app.agendar({ 2026: { events: [evento('Distante', 2147483647 + 10000)] } });
  app.dispararTimer();
  assert.equal(app.avisos.length, 0);
  assert.equal(app.timers.size, 1);
  app.dispararTimer();
  assert.equal(app.avisos.length, 1);
});

test('desligar durante carregamento impede agendamento tardio', async () => {
  const app = iniciar();
  await app.carregar();
  const pendente = app.ligar();
  await app.desligar();
  await pendente;
  assert.equal(app.timers.size, 0);
  assert.equal(app.armazenamento.get('notificacoesAtivas'), '0');
});

test('falha ao carregar um ano é informada e permite tentar novamente', async () => {
  const app = iniciar();
  app.respostas['2027.json'] = null;
  await app.carregar();
  await app.ligar();
  assert.equal(app.elementos.toggleNotificacoes.checked, false);
  assert.equal(app.timers.size, 0);
  assert.match(app.alertas[0], /2027.json/);
  app.respostas['2027.json'] = { 2027: {} };
  await app.ligar();
  assert.equal(app.timers.size, 1);
});

test('permissão revogada antes do horário cancela o aviso', async () => {
  const app = iniciar();
  await app.carregar();
  await app.ligar();
  app.Notificacao.permission = 'denied';
  app.dispararTimer();
  assert.equal(app.avisos.length, 0);
  assert.equal(app.elementos.toggleNotificacoes.checked, false);
});
