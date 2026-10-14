const rssUrl = 'https://pokemongohub.net/feed/';
const apiUrl = `https://api.rss2json.com/v1/api.json?rss_url=${encodeURIComponent(rssUrl)}`;

const track = document.getElementById('news-track');
const loadingMsg = document.getElementById('loading-msg');

function criarLinkNoticia(item) {
  if (!item || typeof item.title !== 'string' || !item.title.trim() || typeof item.link !== 'string') {
    return null;
  }

  let url;
  try {
    url = new URL(item.link);
  } catch {
    return null;
  }
  if (url.protocol !== 'http:' && url.protocol !== 'https:') return null;

  const link = document.createElement('a');
  link.textContent = item.title;
  link.href = url.href;
  link.target = '_blank';
  link.rel = 'noopener noreferrer';
  link.style.color = '#ffcc00';
  link.style.textDecoration = 'none';
  return link;
}

// placeholder inicial
track.style.transform = 'translateX(0px)';

// velocidade inicial (rápida)
let speed = 5; // pixels por frame

// função de animação contínua
function animate() {
  const currentX = parseFloat(track.dataset.offset || 0);
  let newX = currentX - speed;

  if (newX <= -track.scrollWidth / 2) { // loop contínuo
    newX = 0;
  }

  track.style.transform = `translateX(${newX}px)`;
  track.dataset.offset = newX;

  requestAnimationFrame(animate);
}

const cacheNoticias = 'sam-noticias-v1';
let mostrandoNoticias = false;

function mostrarNoticias(data, salvoEm) {
    const links = (Array.isArray(data?.items) ? data.items : [])
      .map(criarLinkNoticia)
      .filter(Boolean);
    if (links.length === 0) {
      if (!mostrandoNoticias) loadingMsg.textContent = 'Nenhuma notícia encontrada.';
      return false;
    }

    // limpa placeholder
    const iniciarAnimacao = !mostrandoNoticias;
    track.replaceChildren();
    track.dataset.offset = '0';
    track.style.transform = 'translateX(0px)';
    mostrandoNoticias = true;

    // cria elementos
    const elements = [];
    if (salvoEm) {
      const aviso = document.createElement('span');
      aviso.textContent = `Notícias salvas em ${new Date(salvoEm).toLocaleString('pt-BR')} — `;
      elements.push(aviso);
    }
    links.forEach((link, index) => {
      const span = document.createElement('span');
      span.appendChild(link);
      elements.push(span);

      if (index < links.length - 1) {
        const icon = document.createElement('img');
        icon.src = '../Assets/logo-gs2.png';
        icon.alt = 'Pokébola';
        icon.className = 'pokeball-icon';
        elements.push(icon);
      }
    });

    // duplica elementos até preencher pelo menos o dobro da tela
    const screenWidth = window.innerWidth;
    let totalWidth = 0;
    while (totalWidth < screenWidth * 2) {
      elements.forEach(el => {
        const clone = el.cloneNode(true);
        track.appendChild(clone);
        totalWidth += el.offsetWidth || 50;
      });
    }

    // Mensagens ficam paradas; a animação só começa ao exibir notícias.
    if (iniciarAnimacao) requestAnimationFrame(animate);

    // reduz velocidade após alguns segundos
    setTimeout(() => {
      speed = 1; // velocidade lenta para leitura
    }, 100);

    return true;
}

// O cache é local ao navegador e nunca é apresentado como atualização ao vivo.
try {
  const salvo = JSON.parse(localStorage.getItem(cacheNoticias));
  const idade = Date.now() - salvo?.salvoEm;
  if (Number.isFinite(idade) && idade >= 0 && idade < 7 * 86400000) {
    mostrarNoticias(salvo, salvo.salvoEm);
  }
} catch { /* Armazenamento indisponível ou cache inválido: consulta normal. */ }

async function carregarNoticias(tentativa = 0) {
  try {
    const res = await fetch(apiUrl, { signal: AbortSignal.timeout(12000) });
    if (!res.ok) throw new Error(`Erro HTTP ${res.status} ao carregar notícias`);
    const data = await res.json();
    if (data?.status === 'error') throw new Error(data.message || 'Feed indisponível');
    if (!mostrarNoticias(data)) return;
    try {
      const items = data.items.filter(item => criarLinkNoticia(item))
        .slice(0,30).map(({title,link}) => ({title,link}));
      localStorage.setItem(cacheNoticias, JSON.stringify({salvoEm:Date.now(),items}));
    } catch { /* A falha ao salvar não impede a exibição das notícias. */ }
  } catch (err) {
    console.error('Erro ao carregar notícias:', err);
    if (!mostrandoNoticias) {
      loadingMsg.textContent = tentativa < 2
        ? 'Notícias temporariamente indisponíveis. Tentando novamente… '
        : 'Notícias temporariamente indisponíveis. ';
      const acesso = criarLinkNoticia({title:'Ler no GO Hub',link:'https://pokemongohub.net/'});
      track.replaceChildren(loadingMsg, acesso);
    }
    if (tentativa < 2) setTimeout(() => carregarNoticias(tentativa + 1), tentativa === 0 ? 3000 : 10000);
  }
}

carregarNoticias();
