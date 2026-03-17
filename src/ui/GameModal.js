export class GameModal {
  constructor(game, gameLoader, onClose) {
    this.game = game;
    this.gameLoader = gameLoader;
    this.onClose = onClose;
    this.isFullscreen = false;
    this.gameLoaded = false;
    this.modalElement = null;
    this.iframeElement = null;
    this.keyEventForwarders = null;
    
    this.create();
  }

  create() {
    document.body.style.overflow = 'hidden';
    
    this.modalElement = document.createElement('div');
    this.modalElement.className = 'game-modal-overlay';
    this.modalElement.innerHTML = `
      <div class="game-modal-container">
        <!-- Header -->
        <div class="game-modal-header">
          <div class="game-modal-title-section">
            ${this.game.thumbnail ? `
              <img 
                src="${this.game.thumbnail}" 
                alt="${this.game.name}"
                class="game-modal-cover-thumb"
                onerror="this.style.display='none'"
              />
            ` : ''}
            <div>
              <h2 class="game-modal-title">${this.game.name}</h2>
              <div class="game-modal-author">
                <span class="icon">👤</span>
                <span>${this.game.author || 'Unknown'}</span>
              </div>
            </div>
          </div>
          
          <div class="game-modal-controls">
            <button class="game-modal-btn" id="btn-fullscreen" title="Fullscreen">
              <span class="icon">⛶</span>
            </button>
            <button class="game-modal-btn" id="btn-close-modal" title="Close (ESC)">
              <span class="icon">✕</span>
            </button>
          </div>
        </div>

        <!-- Game Container -->
        <div class="game-modal-body">
          <div class="game-modal-iframe-container">
            <iframe
              id="game-iframe"
              width="800"
              height="600"
              sandbox="allow-scripts allow-same-origin"
              class="game-iframe"
            ></iframe>
            <div class="game-modal-loading" id="game-loading">
              <div class="loading-text">Loading game...</div>
            </div>
          </div>

          <div class="game-modal-sidebar" id="game-sidebar">
            <div class="sidebar-content">
              ${this.game.thumbnail ? `
                <div class="sidebar-cover">
                  <img
                    src="${this.game.thumbnail}"
                    alt="${this.game.name}"
                    onerror="this.style.display='none'"
                  />
                </div>
              ` : ''}

              <div class="sidebar-section">
                <div class="sidebar-section-title">
                  <span class="icon">ℹ️</span>
                  <span>Description</span>
                </div>
                <p class="sidebar-text">${this.game.description || 'No description available'}</p>
              </div>

              <div class="sidebar-section">
                <div class="sidebar-section-title">
                  <span class="icon">👤</span>
                  <span>Author</span>
                </div>
                <p class="sidebar-text">${this.game.author || 'Unknown'}</p>
              </div>

              ${this.game.tags && this.game.tags.length > 0 ? `
                <div class="sidebar-section">
                  <div class="sidebar-section-title">
                    <span class="icon">🏷️</span>
                    <span>Tags</span>
                  </div>
                  <div class="sidebar-tags">
                    ${this.game.tags.map(tag => `<span class="tag">${tag}</span>`).join('')}
                  </div>
                </div>
              ` : ''}
            </div>
          </div>
        </div>
      </div>
    `;

    document.body.appendChild(this.modalElement);
    
    this.iframeElement = this.modalElement.querySelector('#game-iframe');
    this.loadingElement = this.modalElement.querySelector('#game-loading');
    this.sidebarElement = this.modalElement.querySelector('#game-sidebar');
    
    this.attachEventListeners();
    this.loadGame();
  }

  attachEventListeners() {
    const overlay = this.modalElement;
    const closeBtn = this.modalElement.querySelector('#btn-close-modal');
    const fullscreenBtn = this.modalElement.querySelector('#btn-fullscreen');
    
    overlay.addEventListener('click', (e) => {
      if (e.target === overlay) {
        this.close();
      }
    });
    
    closeBtn.addEventListener('click', () => this.close());
    fullscreenBtn.addEventListener('click', () => this.toggleFullscreen());
    
    this.handleEscape = (e) => {
      if (e.key === 'Escape') {
        if (this.isFullscreen) {
          this.toggleFullscreen();
        } else {
          this.close();
        }
      }
    };
    
    window.addEventListener('keydown', this.handleEscape);
    
    // Setup keyboard event forwarding to iframe
    this.setupKeyboardForwarding();
  }

  setupKeyboardForwarding() {
    // Forward keyboard events from parent document to iframe
    this.keyEventForwarders = {
      keydown: (e) => {
        if (!this.iframeElement || !this.iframeElement.contentWindow) return;
        // Don't forward Escape - we handle it separately
        if (e.key === 'Escape') return;
        
        console.log(`📤 Forwarding keydown to iframe: ${e.key} (${e.code})`);
        
        this.iframeElement.contentWindow.postMessage({
          type: 'arcade-keydown',
          code: e.code,
          key: e.key,
          repeat: e.repeat
        }, '*');
      },
      keyup: (e) => {
        if (!this.iframeElement || !this.iframeElement.contentWindow) return;
        if (e.key === 'Escape') return;
        
        this.iframeElement.contentWindow.postMessage({
          type: 'arcade-keyup',
          code: e.code,
          key: e.key
        }, '*');
      }
    };
    
    document.addEventListener('keydown', this.keyEventForwarders.keydown);
    document.addEventListener('keyup', this.keyEventForwarders.keyup);
  }

  async loadGame() {
    try {
      console.log('🎮 Cargando juego en iframe:', this.game.name);
      
      // Usar fullPath si está disponible (winners/game-name o others/game-name)
      const gamePath = this.game.fullPath || this.game.id;
      const gameModulePath = `./src/games/${gamePath}/game.js`;
      
      console.log('📂 Path del juego:', gameModulePath);
      
      const response = await fetch(gameModulePath);
      if (!response.ok) {
        throw new Error(`Failed to load game from ${gameModulePath}: ${response.status}`);
      }
      const gameCode = await response.text();

      const iframeDoc = this.iframeElement.contentDocument || this.iframeElement.contentWindow.document;
      iframeDoc.open();
      iframeDoc.write(`
        <!DOCTYPE html>
        <html>
        <head>
          <meta charset="UTF-8">
          <style>
            body { 
              margin: 0; 
              padding: 0; 
              overflow: hidden; 
              background: #000; 
              display: flex;
              align-items: center;
              justify-content: center;
            }
            canvas { 
              display: block;
              image-rendering: pixelated;
              image-rendering: crisp-edges;
            }
          </style>
          <script src="https://cdn.jsdelivr.net/npm/phaser@3.87.0/dist/phaser.min.js"><\/script>
          <script>
            window.Phaser = Phaser;
            window.BUK_ARCADE_MODE = true;
            
            // Helper to convert key to keyCode (for Phaser compatibility)
            function getKeyCode(key) {
              if (key.length === 1) {
                return key.toUpperCase().charCodeAt(0);
              }
              const keyCodes = {
                'ArrowUp': 38, 'ArrowDown': 40, 'ArrowLeft': 37, 'ArrowRight': 39,
                'Enter': 13, 'Space': 32, 'Escape': 27, 'Shift': 16, 'Control': 17, 'Alt': 18,
                'Tab': 9, 'Backspace': 8, 'Delete': 46
              };
              return keyCodes[key] || 0;
            }
            
            // Listen for keyboard events from parent (arcade controller)
            window.addEventListener('message', function(event) {
              if (event.data && (event.data.type === 'arcade-keydown' || event.data.type === 'arcade-keyup')) {
                const eventType = event.data.type === 'arcade-keydown' ? 'keydown' : 'keyup';
                const keyCode = getKeyCode(event.data.key);
                
                console.log('📥 Iframe received:', eventType, event.data.key, 'keyCode:', keyCode);
                
                // Create event with ALL properties for Phaser compatibility
                const keyEvent = new KeyboardEvent(eventType, {
                  key: event.data.key,
                  code: event.data.code,
                  keyCode: keyCode,        // Deprecated but needed by Phaser
                  which: keyCode,          // Deprecated but needed by Phaser
                  charCode: keyCode,       // Deprecated but might be checked
                  repeat: event.data.repeat || false,
                  bubbles: true,
                  cancelable: true,
                  composed: true,
                  location: 0
                });
                
                // Manually set deprecated properties (they're readonly in constructor)
                Object.defineProperty(keyEvent, 'keyCode', { value: keyCode, writable: false });
                Object.defineProperty(keyEvent, 'which', { value: keyCode, writable: false });
                
                document.dispatchEvent(keyEvent);
                
                console.log('✅ Iframe dispatched:', eventType, event.data.key, 'with keyCode:', keyCode);
              }
            });
          <\/script>
        </head>
        <body>
          <script>
            try {
              ${gameCode}
            } catch (error) {
              console.error('Game initialization error:', error);
              document.body.innerHTML = '<div style="color: #ff6b6b; padding: 20px; font-family: monospace; text-align: center;">Error loading game:<br>' + error.message + '</div>';
            }
          <\/script>
        </body>
        </html>
      `);
      iframeDoc.close();
      
      this.gameLoaded = true;
      this.loadingElement.style.display = 'none';
      console.log('✅ Juego cargado en iframe exitosamente');
      
    } catch (error) {
      console.error('❌ Error cargando juego:', error);
      this.loadingElement.innerHTML = `
        <div class="loading-text" style="color: #ff6b6b;">
          Error loading game: ${error.message}
        </div>
      `;
    }
  }

  toggleFullscreen() {
    this.isFullscreen = !this.isFullscreen;
    const container = this.modalElement.querySelector('.game-modal-container');
    const fullscreenBtn = this.modalElement.querySelector('#btn-fullscreen');
    
    if (this.isFullscreen) {
      container.classList.add('fullscreen');
      this.sidebarElement.style.display = 'none';
      fullscreenBtn.querySelector('.icon').textContent = '⛶';
    } else {
      container.classList.remove('fullscreen');
      this.sidebarElement.style.display = 'block';
      fullscreenBtn.querySelector('.icon').textContent = '⛶';
    }
  }

  close() {
    console.log('🧹 Cerrando modal y limpiando...');
    
    if (this.iframeElement) {
      try {
        const iframeDoc = this.iframeElement.contentDocument || this.iframeElement.contentWindow.document;
        if (iframeDoc) {
          iframeDoc.open();
          iframeDoc.write('');
          iframeDoc.close();
        }
      } catch (e) {
        console.warn('No se pudo limpiar iframe:', e);
      }
    }
    
    window.removeEventListener('keydown', this.handleEscape);
    
    // Remove keyboard forwarding listeners
    if (this.keyEventForwarders) {
      document.removeEventListener('keydown', this.keyEventForwarders.keydown);
      document.removeEventListener('keyup', this.keyEventForwarders.keyup);
      this.keyEventForwarders = null;
    }
    
    if (this.modalElement && this.modalElement.parentNode) {
      this.modalElement.parentNode.removeChild(this.modalElement);
    }
    
    document.body.style.overflow = '';
    
    if (this.onClose) {
      this.onClose();
    }
    
    console.log('✅ Modal cerrado');
  }

  destroy() {
    this.close();
  }
}
