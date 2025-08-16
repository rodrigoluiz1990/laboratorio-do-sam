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
    let originalImg = { width: 0, height: 0 };

    // Função para obter o tamanho real do tabuleiro
    function getActualBoardSize() {
      const style = window.getComputedStyle(board);
      return {
        width: parseInt(style.width, 10),
        height: parseInt(style.height, 10)
      };
    }

    // Embaralhar (Fisher-Yates)
    function shuffle(arr) {
      for(let i = arr.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [arr[i], arr[j]] = [arr[j], arr[i]];
      }
      return arr;
    }

    // Abrir puzzle com imagem selecionada
    function openPuzzle(src, titleText) {
      imgSrc = src;
      title = titleText || 'Puzzle';

      // Carrega a imagem para obter dimensões originais
      const img = new Image();
      img.onload = function() {
        originalImg = {
          width: img.width,
          height: img.height
        };
        initBoard();
      };
      img.src = src + '?nocache=' + Date.now(); // Evita cache
    }

    function initBoard() {
      correct = Array.from({length: size * size}, (_, i) => i);
      positions = correct.slice();
      shuffle(positions);
      firstTapIndex = null;
      renderBoard();
    }

    function renderBoard() {
      const boardSize = getActualBoardSize();
      const tileWidth = boardSize.width / size;
      const tileHeight = boardSize.height / size;
      
      board.style.gridTemplateColumns = `repeat(${size}, 1fr)`;
      board.style.gridTemplateRows = `repeat(${size}, 1fr)`;
      board.innerHTML = '';

      // Calcula a proporção de escala
      const scaleX = boardSize.width / originalImg.width;
      const scaleY = boardSize.height / originalImg.height;

      positions.forEach((posIndex, i) => {
        const tile = document.createElement('div');
        tile.className = 'tile';
        tile.setAttribute('data-index', i);
        tile.setAttribute('data-correct', posIndex);
        
        // Posição original da peça na imagem
        const originalCol = posIndex % size;
        const originalRow = Math.floor(posIndex / size);
        const originalTileWidth = originalImg.width / size;
        const originalTileHeight = originalImg.height / size;

        // Calcula a posição do background
        const bgPosX = -originalCol * originalTileWidth * scaleX;
        const bgPosY = -originalRow * originalTileHeight * scaleY;

        tile.style.backgroundImage = `url(${imgSrc})`;
        tile.style.backgroundPosition = `${bgPosX}px ${bgPosY}px`;
        tile.style.backgroundSize = `${originalImg.width * scaleX}px ${originalImg.height * scaleY}px`;
        tile.addEventListener('click', onTileClick);
        board.appendChild(tile);
      });
    }

    function swapTiles(i, j) {
      if (i === j) return;
  
      const tile1 = board.querySelector(`.tile[data-index="${i}"]`);
      const tile2 = board.querySelector(`.tile[data-index="${j}"]`);
  
      // Remove classes de seleção antes da troca
      if (tile1) tile1.classList.remove('selected');
      if (tile2) tile2.classList.remove('selected');
  
      [positions[i], positions[j]] = [positions[j], positions[i]];
      updateTile(i);
      updateTile(j);
      checkSolved();
    }

    function updateTile(i) {
      const tile = board.querySelector(`.tile[data-index="${i}"]`);
      const posIndex = positions[i];
      
      const boardSize = getActualBoardSize();
      const originalTileWidth = originalImg.width / size;
      const originalTileHeight = originalImg.height / size;
      const scaleX = boardSize.width / originalImg.width;
      const scaleY = boardSize.height / originalImg.height;
      
      const row = Math.floor(posIndex / size);
      const col = posIndex % size;
      
      const bgPosX = -col * originalTileWidth * scaleX;
      const bgPosY = -row * originalTileHeight * scaleY;
      
      tile.setAttribute('data-correct', posIndex);
      tile.style.backgroundPosition = `${bgPosX}px ${bgPosY}px`;
    }

    function checkSolved() {
      for(let i = 0; i < positions.length; i++) {
        if(positions[i] !== correct[i]) return;
      }
      setTimeout(() => {
        alert(`Parabéns! Você montou o ${title}!`);
      }, 50);
    }

    function onTileClick(e) {
      const tile = e.currentTarget;
      const idx = parseInt(tile.getAttribute('data-index'), 10);
  
      if (firstTapIndex === null) {
        // Primeira seleção
        firstTapIndex = idx;
        tile.classList.add('selected'); // Adiciona classe de seleção
      } else {
        // Segunda seleção
        const firstTile = board.querySelector(`.tile[data-index="${firstTapIndex}"]`);
        if (firstTile) {
          firstTile.classList.remove('selected'); // Remove classe de seleção
        }
    
        // Realiza a troca se não for a mesma peça
        if (firstTapIndex !== idx) {
          swapTiles(firstTapIndex, idx);
        }
    
        firstTapIndex = null;
      }
    }

    // Eventos
    thumbs.forEach(btn => {
      btn.addEventListener('click', () => {
        const src = btn.dataset.img;
        const titleText = btn.dataset.title || btn.alt;
        openPuzzle(src, titleText);
      });
    });

    btnReset.addEventListener('click', () => {
      // Remove seleção de qualquer peça
      const selectedTile = board.querySelector('.tile.selected');
      if (selectedTile) {
        selectedTile.classList.remove('selected');
      }
  
      positions = correct.slice();
      shuffle(positions);
      firstTapIndex = null;
      renderBoard();
    });

    // Redimensionamento responsivo
    window.addEventListener('resize', () => {
      if (imgSrc) renderBoard();
    });
  });
})();