const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');
const { test } = require('node:test');

class Elemento {
  constructor(tag) {
    this.tagName = tag;
    this.children = [];
    this.style = {};
    this.dataset = {};
    this.textContent = '';
    this.offsetWidth = 50;
  }
  set innerHTML(valor) { assert.fail(`HTML não deve ser interpretado: ${valor}`); }
  appendChild(filho) { this.children.push(filho); }
  replaceChildren(...filhos) { this.children = filhos; }
  cloneNode() {
    const clone = Object.assign(new Elemento(this.tagName), this);
    clone.children = this.children.map(filho => filho.cloneNode(true));
    return clone;
  }
}

async function carregar(data, { ok = true, falha = false, cache = null, sequencia = null } = {}) {
  const track = new Elemento('div');
  const loading = new Elemento('span');
  track.appendChild(loading);
  const timers = [];
  let chamadas = 0, gravado;
  const contexto = vm.createContext({
    URL,
    AbortSignal,
    localStorage: { getItem:()=>cache, setItem:(chave,valor)=>{gravado=valor;} },
    document: {
      getElementById: id => id === 'news-track' ? track : loading,
      createElement: tag => new Elemento(tag),
    },
    window: { innerWidth: 100 },
    requestAnimationFrame() {}, setTimeout(fn,ms) { timers.push({fn,ms}); },
    console: { error() {} },
    async fetch() {
      chamadas++;
      if (sequencia) return sequencia(chamadas);
      if (falha) throw new Error('Sem conexão');
      return { ok, status: 503, json: async () => data };
    },
  });
  vm.runInContext(fs.readFileSync(path.join(__dirname, '../Calendario/news.js'), 'utf8'), contexto);
  await new Promise(resolve => setImmediate(resolve));
  return { track, loading, timers, chamadas:()=>chamadas, gravado:()=>gravado };
}

function links(track) {
  return track.children.flatMap(el => el.children).filter(el => el.tagName === 'a');
}

test('notícias válidas preservam texto, destino, aparência e abertura em nova aba', async () => {
  const { track } = await carregar({ items: [
    { title: 'Pokémon GO: novidades & bônus', link: 'https://pokemongohub.net/post/teste/' },
    { title: 'Outra notícia', link: 'http://example.com/noticia' },
  ] });
  const noticias = links(track);
  assert.ok(noticias.length >= 2);
  assert.equal(noticias[0].textContent, 'Pokémon GO: novidades & bônus');
  assert.equal(noticias[0].href, 'https://pokemongohub.net/post/teste/');
  assert.equal(noticias[0].target, '_blank');
  assert.equal(noticias[0].rel, 'noopener noreferrer');
  assert.equal(noticias[0].style.color, '#ffcc00');
  assert.ok(track.children.some(el => el.tagName === 'img'));
});

test('HTML recebido no título permanece texto sem criar elementos', async () => {
  const titulo = '<img src=x onerror=alert(1)><script>alert(2)</script>';
  const { track } = await carregar({ items: [{ title: titulo, link: 'https://example.com/' }] });
  for (const link of links(track)) {
    assert.equal(link.textContent, titulo);
    assert.equal(link.children.length, 0);
  }
  assert.ok(links(track).length);
});

test('links com aspas não criam atributos ou elementos adicionais', async () => {
  const endereco = 'https://example.com/" onclick="alert(1)';
  const { track } = await carregar({ items: [{ title: 'Teste', link: endereco }] });
  const link = links(track)[0];
  assert.equal(link.href, new URL(endereco).href);
  assert.equal(link.onclick, undefined);
  assert.equal(link.children.length, 0);
});

test('links executáveis, relativos, inválidos e itens incompletos são descartados', async () => {
  const ruins = ['javascript:alert(1)', '\tJaVaScRiPt:alert(1)', 'data:text/html,<script>alert(1)</script>',
    'vbscript:msgbox(1)', 'file:///tmp/teste', '/relativo', '//example.com/', 'não é URL'];
  const { track } = await carregar({ items: [
    ...ruins.map(link => ({ title: 'Inválido', link })), null, {},
    { title: 42, link: 'https://example.com/' },
    { title: '   ', link: 'https://example.com/' },
    { title: 'Válido', link: 'https://example.com/' },
  ] });
  assert.ok(links(track).length);
  assert.ok(links(track).every(link => link.textContent === 'Válido'));
});

test('feed vazio, malformado ou sem links permitidos mostra mensagem', async () => {
  for (const data of [null, {}, { items: {} }, { items: [] }, { items: [{ title: 'Teste', link: 'javascript:alert(1)' }] }]) {
    const { track, loading } = await carregar(data);
    assert.equal(loading.textContent, 'Nenhuma notícia encontrada.');
    assert.equal(track.children[0], loading);
    assert.equal(links(track).length, 0);
  }
});

test('erro HTTP ou de conexão mostra mensagem de falha', async () => {
  for (const opcoes of [{ ok: false }, { falha: true }]) {
    const { track, loading } = await carregar({}, opcoes);
    assert.equal(loading.textContent, 'Notícias temporariamente indisponíveis. Tentando novamente… ');
    assert.equal(track.children[0], loading);
  }
});

test('falha mantém cache recente identificado e descarta cache expirado', async()=>{
  const items=[{title:'Notícia anterior',link:'https://example.com/noticia'}];
  const salvoEm=Date.now()-60000;
  const r=await carregar({}, {falha:true,cache:JSON.stringify({salvoEm,items})});
  assert.ok(links(r.track).some(l=>l.textContent==='Notícia anterior'));
  assert.ok(r.track.children.some(e=>e.textContent.startsWith('Notícias salvas em')));
  const expirado=await carregar({}, {falha:true,cache:JSON.stringify({salvoEm:Date.now()-8*86400000,items})});
  assert.equal(links(expirado.track).length,0);
});

test('erro do serviço tenta até três vezes e oferece link direto', async()=>{
  const r=await carregar({status:'error',message:'This feed is being processed, please wait'});
  while(r.timers.length){const t=r.timers.shift();await t.fn();}
  assert.equal(r.chamadas(),3);
  assert.equal(r.loading.textContent,'Notícias temporariamente indisponíveis. ');
  assert.ok(r.track.children.some(e=>e.href==='https://pokemongohub.net/'));
});

test('nova tentativa bem-sucedida substitui aviso e salva notícias', async()=>{
  const items=[{title:'Atualizada',link:'https://example.com/atual'}];
  const r=await carregar(null,{sequencia:n=>({ok:n>1,status:500,json:async()=>({items})})});
  await r.timers.shift().fn();
  assert.equal(r.chamadas(),2);
  assert.ok(links(r.track).every(l=>l.textContent==='Atualizada'));
  assert.deepEqual(JSON.parse(r.gravado()).items,items);
  assert.equal(r.track.children.includes(r.loading),false);
});
