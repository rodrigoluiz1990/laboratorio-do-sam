// IDs reais disponíveis
const AVAILABLE_IDS = [
    1, 3, 4, 6, 7, 8, 9, 
    12, 15, 17, 19, 
    20, 21, 24, 25, 26, 29,
    31, 34, 35, 36, 
    40, 42, 43, 44, 45, 49,
    51, 52, 53, 59,
    63, 65, 68, 
    70, 71, 76, 78,
    82, 83, 85, 87, 89,
    91, 94, 95, 96,
    102, 103, 105, 106, 107, 108, 
    110, 111, 113, 114, 119, 
    121, 129, 
    130, 131, 132, 133, 134, 135, 136, 137, 139,
    141, 142, 143, 144, 145, 146, 149, 150
  ];
  
  // Caminho das imagens
  const IMAGE_PATH = "img/";
  
  function getImageFile(id) {
    return `${IMAGE_PATH}pk-${String(id).padStart(3, '0')}.png`;
  }
  
  let boardEl = document.getElementById("board");
  let movesEl = document.getElementById("moves");
  let foundEl = document.getElementById("found");
  let timerEl = document.getElementById("timer");
  
  let first = null, second = null, lock = false;
  let moves = 0, matches = 0, pairCount = 0;
  let timer, seconds = 0;
  
  document.getElementById("startBtn").addEventListener("click", startGame);
  
  function startGame() {
    pairCount = parseInt(document.getElementById("pairCount").value, 10);
    resetGame();
    const cards = generateCards(pairCount);
    renderBoard(cards);
    startTimer();
  }
  
  function resetGame() {
    boardEl.innerHTML = "";
    moves = 0; matches = 0; seconds = 0;
    movesEl.textContent = "0";
    foundEl.textContent = `0`;
    timerEl.textContent = "00:00";
    clearInterval(timer);
    first = null; second = null; lock = false;
  }
  
  function generateCards(pairCount) {
    // embaralhar a lista de IDs disponíveis
    const shuffled = [...AVAILABLE_IDS].sort(() => Math.random() - 0.5);
    const chosen = shuffled.slice(0, pairCount);
    const pool = [...chosen, ...chosen].sort(() => Math.random() - 0.5);
  
    return pool.map(id => ({
      id,
      img: getImageFile(id)
    }));
  }
  
  function renderBoard(cards) {
    // limitar a grade a no máximo 15 colunas
    let cols = Math.min(15, Math.ceil(Math.sqrt(cards.length)));
    boardEl.style.gridTemplateColumns = `repeat(${cols}, 1fr)`;
  
    cards.forEach(card => {
      const cardEl = document.createElement("div");
      cardEl.classList.add("card");
      cardEl.innerHTML = `
        <div class="card-inner">
          <div class="card-front"><img src="${card.img}" width="80" height="110"></div>
          <div class="card-back">
        </div>
      `;
      cardEl.addEventListener("click", () => onCardClick(cardEl, card));
      boardEl.appendChild(cardEl);
    });
  }
  
  function onCardClick(cardEl, cardObj) {
    if (lock) return;
    if (cardEl.classList.contains("flipped") || cardEl.classList.contains("matched")) return;
  
    cardEl.classList.add("flipped");
  
    if (!first) {
      first = { el: cardEl, obj: cardObj };
      return;
    }
  
    second = { el: cardEl, obj: cardObj };
    lock = true;
    moves++;
    movesEl.textContent = moves;
  
    if (first.obj.id === second.obj.id) {
      first.el.classList.add("matched");
      second.el.classList.add("matched");
      matches++;
      foundEl.textContent = matches;
  
      first = null; second = null; lock = false;
  
      if (matches === pairCount) {
        clearInterval(timer);
        setTimeout(() => alert(`Parabéns! Você venceu em ${formatTime(seconds)} com ${moves} movimentos.`), 200);
      }
    } else {
      const f = first, s = second;
      setTimeout(() => {
        if (!f.el.classList.contains("matched")) f.el.classList.remove("flipped");
        if (!s.el.classList.contains("matched")) s.el.classList.remove("flipped");
        first = null; second = null; lock = false;
      }, 800);
    }
  }
  
  function startTimer() {
    timer = setInterval(() => {
      seconds++;
      timerEl.textContent = formatTime(seconds);
    }, 1000);
  }
  
  function formatTime(sec) {
    const m = Math.floor(sec / 60).toString().padStart(2, "0");
    const s = (sec % 60).toString().padStart(2, "0");
    return `${m}:${s}`;
  }
  