import { GameModal } from './GameModal.js';
import { 
  ARCADE_CONTROL_LABELS, 
  ARCADE_CONTROLS_ORDER,
  formatKeyName 
} from '../constants/arcadeMapping.js';

// Flag para mostrar/ocultar sección de todos los juegos
const SHOW_ALL_GAMES = true; // Cambiar a true para mostrar sección de todos los juegos

export class MenuUI {
  constructor(gameLoader, arcadeInputManager) {
    this.gameLoader = gameLoader;
    this.arcadeInputManager = arcadeInputManager;
    this.currentScreen = 'menu';
    this.isModalOpen = false;
    this.currentModal = null;
    
    // Estado para navegación con joystick
    this.selectedGameIndex = 0;
    this.navigableGames = [];
    this.navigationActive = false;
  }

  showMenu(searchQuery = '', selectedCategory = 'all') {
    this.currentScreen = 'menu';
    const container = document.getElementById('app');
    
    let allGames = this.gameLoader.getGames();
    const categories = ['all', ...this.gameLoader.getCategories()];
    
    // Debug: verificar estructura de juegos
    console.log('🎮 Total de juegos cargados:', allGames.length);
    console.log('🎮 Juegos con place:', allGames.filter(g => g.place).map(g => ({ name: g.name, place: g.place })));
    
    // Separar ganadores del resto
    const winners = allGames.filter(g => g.place && g.place.includes('Place'));
    const firstPlace = winners.find(g => g.place === 'First Place');
    const secondPlace = winners.find(g => g.place === 'Second Place');
    
    console.log('🥇 First Place:', firstPlace?.name);
    console.log('🥈 Second Place:', secondPlace?.name);
    
    let regularGames = allGames.filter(g => !g.place || !g.place.includes('Place'));
    
    // Aplicar filtros solo a juegos regulares
    if (searchQuery) {
      regularGames = regularGames.filter(g => 
        g.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        g.description.toLowerCase().includes(searchQuery.toLowerCase())
      );
    } else if (selectedCategory !== 'all') {
      regularGames = regularGames.filter(g => g.category === selectedCategory);
    }
    
    container.innerHTML = `
      <div class="menu-container">
        <div class="arcade-header">
          <h1 class="arcade-title">BUK ARCADE</h1>
          <p class="arcade-subtitle">${allGames.length} game${allGames.length !== 1 ? 's' : ''} available</p>
        </div>
        
        <!-- SECCIÓN DE GANADORES -->
        ${(firstPlace || secondPlace) ? `
          <div class="winners-section">
            <div class="winners-header">
              <h2 class="winners-title">🏆 CHALLENGE WINNERS</h2>
              <p class="winners-subtitle">The best games of the competition</p>
            </div>
            
            <div class="winners-grid">
              ${firstPlace ? this.renderWinnerCard(firstPlace, '🥇', 'first') : ''}
              ${secondPlace ? this.renderWinnerCard(secondPlace, '🥈', 'second') : ''}
            </div>
          </div>
        ` : ''}

        
        <!-- SECCIÓN DE JUEGOS REGULARES (controlada por flag) -->
        ${SHOW_ALL_GAMES ? (regularGames.length === 0 ? `
          <div class="no-games">
            <p>😕 No games found</p>
            <p class="no-games-subtitle">Try a different search or category</p>
          </div>
        ` : `
          <div class="regular-games-section">
            <div class="section-header">
              <h2 class="section-title">🎮 ALL GAMES</h2>
            </div>
            <div class="game-grid">
              ${regularGames.map(game => this.renderGameCard(game)).join('')}
            </div>
          </div>
        `) : ''}
        
        <div class="menu-footer">
          <button class="btn-secondary" id="btn-configure">⚙️ CONFIGURE CONTROLS</button>
        </div>

        <footer class="arcade-footer">
          <img src="./videojuego_logoBuk-blanco.webp" alt="Buk Logo" />
          <p>Buk Arcade — ICPC Challenge</p>
          <p class="footer-sub">Made with ❤️ by the Buk team</p>
        </footer>
      </div>
    `;

    document.querySelectorAll('.category-btn').forEach(btn => {
      btn.addEventListener('click', (e) => {
        const category = e.target.dataset.category;
        this.showMenu('', category);
      });
    });

    document.querySelectorAll('.btn-play').forEach(btn => {
      btn.addEventListener('click', (e) => {
        const gameId = e.target.dataset.gameId;
        this.startGame(gameId);
      });
    });

    // Event listeners para botones de ganadores
    document.querySelectorAll('.btn-play-winner').forEach(btn => {
      btn.addEventListener('click', (e) => {
        const gameId = e.currentTarget.dataset.gameId;
        this.startGame(gameId);
      });
    });

    // Click en winner cards abre el juego directamente
    document.querySelectorAll('.winner-card').forEach(card => {
      card.addEventListener('click', (e) => {
        // No abrir si se clickeó el botón play (ya tiene su propio listener)
        if (e.target.closest('.btn-play-winner')) return;
        const gameId = card.dataset.gameId;
        this.startGame(gameId);
      });
    });

    // Click en game cards abre el juego directamente
    document.querySelectorAll('.game-card').forEach(card => {
      card.addEventListener('click', (e) => {
        // No abrir si se clickeó el botón play (ya tiene su propio listener)
        if (e.target.closest('.btn-play')) return;
        const gameId = card.dataset.gameId;
        this.startGame(gameId);
      });
    });

    document.getElementById('btn-configure').addEventListener('click', () => {
      this.showConfigScreen();
    });

    // Configurar navegación con joystick/teclado para TODOS los juegos
    const allNavigableGames = [
      ...[firstPlace, secondPlace].filter(g => g),
      ...regularGames
    ];
    this.setupNavigation(allNavigableGames);
  }

  getRandomColor() {
    const colors = ['#ff006e', '#8338ec', '#3a86ff', '#fb5607', '#ffbe0b'];
    return colors[Math.floor(Math.random() * colors.length)];
  }

  setupNavigation(games) {
    if (games.length === 0) return;

    this.navigableGames = games;
    this.selectedGameIndex = 0;
    this.navigationActive = true;

    // Aplicar clase selected al primer juego
    this.updateSelectedCard();

    // Limpiar listeners anteriores si existen
    if (this.navigationHandler) {
      document.removeEventListener('keydown', this.navigationHandler);
    }

    // Handler para navegación con teclado y arcade
    this.navigationHandler = (e) => {
      if (!this.navigationActive || this.isModalOpen) return;

      const key = e.key;

      // Navegación: ArrowLeft/ArrowRight o A/D
      if (key === 'ArrowLeft' || key.toLowerCase() === 'a') {
        e.preventDefault();
        this.selectedGameIndex = Math.max(0, this.selectedGameIndex - 1);
        this.updateSelectedCard();
      } else if (key === 'ArrowRight' || key.toLowerCase() === 'd') {
        e.preventDefault();
        this.selectedGameIndex = Math.min(this.navigableGames.length - 1, this.selectedGameIndex + 1);
        this.updateSelectedCard();
      }
      // Selección: Enter o Space
      else if (key === 'Enter' || key === ' ') {
        e.preventDefault();
        const selectedGame = this.navigableGames[this.selectedGameIndex];
        if (selectedGame) {
          console.log('🎮 Abriendo juego seleccionado:', selectedGame.name);
          this.startGame(selectedGame.id);
        }
      }
    };

    document.addEventListener('keydown', this.navigationHandler);

    console.log('🕹️ Navegación activada para', games.length, 'juegos. Usa ←/→ o A/D para navegar, Enter/Space para seleccionar');
  }

  updateSelectedCard() {
    // Remover clase selected de todos los cards
    document.querySelectorAll('.winner-card, .game-card').forEach(card => {
      card.classList.remove('selected');
    });

    // Agregar clase selected al card actual
    const selectedGame = this.navigableGames[this.selectedGameIndex];
    if (selectedGame) {
      // Buscar en winner cards y game cards
      const selectedCard = document.querySelector(`.winner-card[data-game-id="${selectedGame.id}"]`)
        || document.querySelector(`.game-card[data-game-id="${selectedGame.id}"]`);
      if (selectedCard) {
        selectedCard.classList.add('selected');
        // Scroll suave hacia el card seleccionado
        selectedCard.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
      }
    }
  }

  renderWinnerCard(game, medal, place) {
    const placeClass = `winner-${place}`;
    return `
      <div class="winner-card ${placeClass}" data-game-id="${game.id}">
        <div class="winner-medal">${medal}</div>
        <div class="winner-place-badge">${game.place}</div>
        <div class="winner-thumbnail" style="background: ${game.thumbnail ? `url(${game.thumbnail}) center/cover` : `linear-gradient(135deg, ${this.getRandomColor()}, ${this.getRandomColor()})`};">
          ${!game.thumbnail ? '<span class="game-icon">🎮</span>' : ''}
        </div>
        <div class="winner-info">
          <h3 class="winner-name">${game.name}</h3>
          <p class="winner-author">by ${game.author}</p>
        </div>
      </div>
    `;
  }

  renderGameCard(game) {
    return `
      <div class="game-card" data-game-id="${game.id}">
        <div class="game-thumbnail" style="background: ${game.thumbnail ? `url(${game.thumbnail}) center/cover` : `linear-gradient(135deg, ${this.getRandomColor()}, ${this.getRandomColor()})`};">
          ${!game.thumbnail ? '<span class="game-icon">🎮</span>' : ''}
        </div>
        <div class="game-info">
          <h3 class="game-name">${game.name}</h3>
          <p class="game-meta">${game.author}</p>
          <p class="game-description">${game.description}</p>
        </div>
        <button class="btn-play" data-game-id="${game.id}">PLAY</button>
      </div>
    `;
  }

  async startGame(gameId) {
    // Prevenir abrir múltiples modales
    if (this.isModalOpen) {
      console.log('⚠️ Modal ya está abierto, ignorando solicitud');
      return;
    }
    
    const game = this.gameLoader.getGames().find(g => g.id === gameId);
    if (!game) {
      console.error('Juego no encontrado:', gameId);
      return;
    }
    
    this.isModalOpen = true;

    // Crear nuevo modal con sistema de iframe
    this.currentModal = new GameModal(game, this.gameLoader, () => {
      this.isModalOpen = false;
      this.currentModal = null;
    });
  }

  showConfigScreen() {
    this.currentScreen = 'config';
    const container = document.getElementById('app');
    
    const arcadeMapping = this.arcadeInputManager.getAllMappings();
    const gamepads = navigator.getGamepads();
    
    container.innerHTML = `
      <div class="config-container">
        <div class="config-header">
          <h1 class="arcade-title">BUK ARCADE</h1>
          <p class="arcade-subtitle">Controller Configuration</p>
        </div>
        
        ${this.renderGamepadStatus(gamepads)}
        
        <div class="config-content">
          <p class="config-description">🕹️ Configura el mapeo de controles del arcade a teclas del teclado. El gamepad físico y teclado se mapean automáticamente.</p>
          
          <div class="player-config">
            <h2 class="player-title">🎮 PLAYER 1</h2>
            ${this.renderArcadeMappingConfig(ARCADE_CONTROLS_ORDER.player1, arcadeMapping)}
          </div>
          
          <div class="player-config">
            <h2 class="player-title">🎮 PLAYER 2</h2>
            ${this.renderArcadeMappingConfig(ARCADE_CONTROLS_ORDER.player2, arcadeMapping)}
          </div>
        </div>
        
        <div class="config-footer">
          <button class="btn-danger" id="btn-reset-defaults">RESET TO DEFAULTS</button>
          <button class="btn-primary" id="btn-back-menu">BACK TO MENU</button>
        </div>
      </div>
    `;

    this.attachConfigListeners();
  }

  renderArcadeMappingConfig(arcadeCodes, mapping) {
    return `
      <div class="control-list">
        ${arcadeCodes.map(code => {
          const key = mapping[code] || '?';
          return `
            <div class="control-item">
              <span class="control-label">${ARCADE_CONTROL_LABELS[code] || code}</span>
              <div class="control-keys">
                <span class="key-badge">${formatKeyName(key)}</span>
              </div>
              <div class="control-actions">
                <button class="btn-small btn-map-arcade" data-code="${code}">CHANGE</button>
              </div>
            </div>
          `;
        }).join('')}
      </div>
    `;
  }

  attachConfigListeners() {
    // Listeners para mapeo arcade→teclado
    document.querySelectorAll('.btn-map-arcade').forEach(btn => {
      btn.addEventListener('click', (e) => {
        const code = e.target.dataset.code;
        this.mapArcadeControl(code, btn);
      });
    });

    // Legacy keyboard mapping - not used with new arcade input system

    // Legacy clear button - not used with new arcade input system

    document.getElementById('btn-reset-defaults').addEventListener('click', () => {
      if (confirm('Reset all controls to default settings?')) {
        this.arcadeInputManager.resetToDefault();
        this.showConfigScreen();
      }
    });

    document.getElementById('btn-back-menu').addEventListener('click', () => {
      this.showMenu();
    });
  }

  mapArcadeControl(arcadeCode, buttonElement) {
    const originalText = buttonElement.textContent;
    buttonElement.textContent = 'PRESS KEY...';
    buttonElement.classList.add('listening');
    buttonElement.disabled = true;

    const handleKeyPress = (e) => {
      e.preventDefault();
      e.stopPropagation();
      
      const key = e.key;
      console.log(`🕹️ Mapeando ${arcadeCode} → ${key}`);
      
      this.arcadeInputManager.setMapping(arcadeCode, key);
      
      buttonElement.textContent = originalText;
      buttonElement.classList.remove('listening');
      buttonElement.disabled = false;
      
      window.removeEventListener('keydown', handleKeyPress);
      
      this.showConfigScreen();
    };

    window.addEventListener('keydown', handleKeyPress);
  }

  renderGamepadStatus(gamepads) {
    // Filtrar nulls del array de gamepads
    const activeGamepads = Array.from(gamepads).filter(gp => gp !== null);
    
    if (activeGamepads.length === 0) {
      return `
        <div class="gamepad-status warning">
          <span class="status-icon">⚠️</span>
          <div class="status-text">
            <strong>No Gamepad Detected</strong>
            <p>Connect your arcade controller and press any button</p>
          </div>
        </div>
      `;
    }

    return `
      <div class="gamepad-status connected">
        ${activeGamepads.map((gamepad) => `
          <div class="gamepad-info">
            <span class="status-icon">✅</span>
            <div class="status-text">
              <strong>${gamepad.id}</strong>
              <p>Index: ${gamepad.index} | Buttons: ${gamepad.buttons.length} | Axes: ${gamepad.axes.length}</p>
            </div>
          </div>
        `).join('')}
      </div>
    `;
  }

}
