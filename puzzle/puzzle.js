(() => {
  const modal = document.getElementById('puzzleModal');
  const btnClose = document.getElementById('btnClose');
  const btnReset = document.getElementById('btnReset');
  const board = document.getElementById('puzzleBoard');
  const modalTitle = document.getElementById('modalTitle');
  const thumbs = document.querySelectorAll('.thumb');
  const backdrop = modal.querySelector('.modal-backdrop');

  // Estado
  let imgSrc = '';
  let title = '';
  const size = 4; // fixo 4x4
  let positions = [];
  let correct = [];
  let firstTap = null;

  let boardPx = 300; // deve bater com --board-size no CSS

  // Lê valor do CSS
  function readBoardSizeVar() {
    const cs = getComputedStyle(document.documentElement);
    const val = cs.getPropertyValue('--board-size').trim().replace('px','');
    boardPx = parseInt(val || '300', 10);
  }
  readBoardSizeVar();
  window.addEventListener('resize', readBoardSizeVar);

  // Embaralhar (Fisher–Yates)
  function shuffle(arr){
    for(let i = arr.length - 1; i > 0; i--){
      const j = Math.floor(Math.random() * (i+1));
      [arr[i], arr[j]] = [arr[j], arr[i]];
    }
    return arr;
  }

  // Função global para abrir o puzzle
  window.openModal = function(src, titleText){
    imgSrc = src;
    title = titleText || 'Puzzle';
    modalTitle.textContent = title;

    // Inicializa tabuleiro
    correct = Array.from({length: size*size}, (_, i) => i);
    positions = correct.slice();
    shuffle(positions);

    firstTap = null;

    renderBoard();

    // Exibir board e controles
    board.style.display = 'grid';
    btnReset.parentElement.style.display = 'block';
    modal.querySelector('.puzzle-selection').style.display = 'none';

    modal.setAttribute('aria-hidden','false');
    btnClose.focus();
  };

  function closeModal(){
    modal.setAttribute('aria-hidden','true');
    board.innerHTML = '';
    firstTap = null;
    modal.querySelector('.puzzle-selection').style.display = 'flex';
    board.style.display = 'none';
    btnReset.parentElement.style.display = 'none';
  }

  function renderBoard(){
    const tileSize = Math.floor(boardPx / size);
    board.style.gridTemplateColumns = `repeat(${size}, 1fr)`;
    board.style.gridTemplateRows = `repeat(${size}, 1fr)`;
    board.innerHTML = '';

    positions.forEach((posIndex, i) => {
      const tile = document.createElement('div');
      tile.className = 'tile';
      tile.setAttribute('data-index', i);
      tile.setAttribute('data-correct', posIndex);
      tile.style.width = `${tileSize}px`;
      tile.style.height = `${tileSize}px`;
      const row = Math.floor(posIndex / size);
      const col = posIndex % size;
      tile.style.backgroundImage = `url(${imgSrc})`;
      tile.style.backgroundPosition = `${-col*tileSize}px ${-row*tileSize}px`;
      tile.style.backgroundSize = `${boardPx}px ${boardPx}px`;

      // Eventos touch/click
      tile.addEventListener('click', onTapSelect);

      board.appendChild(tile);
    });
  }

  function swapTiles(i, j){
    if(i===j) return;
    [positions[i], positions[j]] = [positions[j], positions[i]];
    updateTile(i);
    updateTile(j);
    checkSolved();
  }

  function updateTile(i){
    const tiles = board.querySelectorAll('.tile');
    const tile = tiles[i];
    const posIndex = positions[i];
    const tileSize = Math.floor(boardPx / size);
    const row = Math.floor(posIndex / size);
    const col = posIndex % size;
    tile.setAttribute('data-correct', posIndex);
    tile.style.backgroundPosition = `${-col*tileSize}px ${-row*tileSize}px`;
  }

  function checkSolved(){
    for(let i=0;i<positions.length;i++){
      if(positions[i]!==correct[i]) return;
    }
    // Parabéns
    alert(`Parabéns! Você montou o ${title}!`);
  }

  // Tap/Click
  let firstTapIndex = null;
  function onTapSelect(e){
    const el = e.currentTarget;
    const idx = parseInt(el.getAttribute('data-index'),10);
    if(firstTapIndex === null){
      firstTapIndex = idx;
      el.setAttribute('aria-grabbed','true');
    } else {
      const firstEl = board.querySelector(`.tile[data-index="${firstTapIndex}"]`);
      if(firstEl) firstEl.removeAttribute('aria-grabbed');
      swapTiles(firstTapIndex, idx);
      firstTapIndex = null;
    }
  }

  // Reset
  btnReset.addEventListener('click', () => {
    positions = correct.slice();
    firstTapIndex = null;
    renderBoard();
  });

  // Seleção de Pokémon
  thumbs.forEach(btn => {
    btn.addEventListener('click', () => {
      const src = btn.src;
      const titleText = btn.dataset.title || btn.alt;
      openModal(src, titleText);
    });
  });

  // Fechar modal
  btnClose.addEventListener('click', closeModal);
  backdrop.addEventListener('click', closeModal);
  document.addEventListener('keydown', (e) => {
    if(e.key==='Escape' && modal.getAttribute('aria-hidden')==='false'){
      closeModal();
    }
  });

  // Ícone do menu
  const menuPuzzle = document.getElementById('menuPuzzle');
  menuPuzzle.addEventListener('click', () => {
    modal.setAttribute('aria-hidden','false');
    modal.querySelector('.puzzle-selection').style.display = 'flex';
    board.style.display = 'none';
    btnReset.parentElement.style.display = 'none';
    modalTitle.textContent = 'Escolha um Pokémon';
  });

})();
