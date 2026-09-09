const rssUrl = 'https://pokemongohub.net/feed';
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

// inicia animação imediatamente
requestAnimationFrame(animate);

// busca notícias
fetch(apiUrl)
  .then(res => {
    if (!res.ok) throw new Error(`Erro HTTP ${res.status} ao carregar notícias`);
    return res.json();
  })
  .then(data => {
    const links = (Array.isArray(data?.items) ? data.items : [])
      .map(criarLinkNoticia)
      .filter(Boolean);
    if (links.length === 0) {
      loadingMsg.textContent = 'Nenhuma notícia encontrada.';
      return;
    }

    // limpa placeholder
    track.replaceChildren();

    // cria elementos
    const elements = [];
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

    // reduz velocidade após alguns segundos
    setTimeout(() => {
      speed = 1; // velocidade lenta para leitura
    }, 100);

  })
  .catch(err => {
    console.error('Erro ao carregar notícias:', err);
    loadingMsg.textContent = 'Erro ao carregar notícias.';
  });
