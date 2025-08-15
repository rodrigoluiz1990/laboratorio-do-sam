(() => {
  document.addEventListener('DOMContentLoaded', () => {
    // Elementos
    const board = document.getElementById('puzzleBoard');
    const btnReset = document.getElementById('btnReset');
    const thumbs = document.querySelectorAll('.thumb');

    // Estado
    const size = 4; // 4x4 fixo
    let positions = [];
    let correct = [];
    let firstTapIndex = null;
    let imgSrc = '';
    let title = '';
    let boardPx = 300; // valor padrão

    // Lê valor do CSS
    function readBoardSizeVar() {
      const cs = getComputedStyle(document.documentElement);
      const val = cs.getPropertyValue('--board-size').trim().replace('px','');
      boardPx = parseInt(val || '300', 10);
    }
    readBoardSizeVar();
    window.addEventListener('resize', readBoardSizeVar);

    // Embaralhar (Fisher-Yates)
    function shuffle(arr){
      for(let i = arr.length - 1; i > 0; i--){
        const j = Math.floor(Math.random()*(i+1));
        [arr[i], arr[j]] = [arr[j], arr[i]];
      }
      return arr;
    }

    // Abrir puzzle com imagem selecionada
    function openPuzzle(src, titleText){
      imgSrc = src;
      title = titleText || 'Puzzle';

      correct = Array.from({length:size*size}, (_,i)=>i);
      positions = correct.slice();
      shuffle(positions);

      firstTapIndex = null;

      renderBoard();
    }

    function renderBoard(){
      const tileSize = Math.floor(boardPx / size);
      board.style.gridTemplateColumns = `repeat(${size}, 1fr)`;
      board.style.gridTemplateRows = `repeat(${size}, 1fr)`;
      board.innerHTML = '';

      positions.forEach((posIndex, i)=>{
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
        tile.addEventListener('click', onTileClick);
        board.appendChild(tile);
      });
    }

    function swapTiles(i,j){
      if(i===j) return;
      [positions[i], positions[j]] = [positions[j], positions[i]];
      updateTile(i);
      updateTile(j);
      checkSolved();
    }

    function updateTile(i){
      const tile = board.querySelector(`.tile[data-index="${i}"]`);
      const posIndex = positions[i];
      const tileSize = Math.floor(boardPx / size);
      const row = Math.floor(posIndex/size);
      const col = posIndex % size;
      tile.setAttribute('data-correct', posIndex);
      tile.style.backgroundPosition = `${-col*tileSize}px ${-row*tileSize}px`;
    }

    function checkSolved(){
      for(let i=0;i<positions.length;i++){
        if(positions[i]!==correct[i]) return;
      }
      setTimeout(() => {
        alert(`Parabéns! Você montou o ${title}!`);
      }, 50);
    }

    function onTileClick(e){
      const idx = parseInt(e.currentTarget.getAttribute('data-index'),10);
      if(firstTapIndex === null){
        firstTapIndex = idx;
        e.currentTarget.setAttribute('aria-grabbed','true');
      } else {
        const firstEl = board.querySelector(`.tile[data-index="${firstTapIndex}"]`);
        if(firstEl) firstEl.removeAttribute('aria-grabbed');
        swapTiles(firstTapIndex, idx);
        firstTapIndex = null;
      }
    }

    // Eventos
    thumbs.forEach(btn=>{
      btn.addEventListener('click', ()=>{
        const src = btn.dataset.img;
        const titleText = btn.dataset.title || btn.alt;
        openPuzzle(src, titleText);
      });
    });

    btnReset.addEventListener('click', ()=>{
      positions = correct.slice();
      shuffle(positions);
      firstTapIndex = null;
      renderBoard();
    });
  });
})();
