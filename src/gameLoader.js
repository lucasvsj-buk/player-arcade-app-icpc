export class GameLoader {
  constructor(arcadeInputManager, gameRegistry) {
    this.arcadeInputManager = arcadeInputManager;
    this.gameRegistry = gameRegistry;
    this.currentGame = null;
    this.currentGameInstance = null;
    this.gameContainer = null;
    this.pressedKeys = new Set();
    
    this.setupKeyListeners();
  }

  setupKeyListeners() {
    document.addEventListener('keydown', (e) => {
      this.pressedKeys.add(e.code);
    });
    
    document.addEventListener('keyup', (e) => {
      this.pressedKeys.delete(e.code);
    });
  }

  getGames() {
    return this.gameRegistry.getGames();
  }

  searchGames(query) {
    return this.gameRegistry.searchGames(query);
  }

  getGamesByCategory(category) {
    return this.gameRegistry.getGamesByCategory(category);
  }

  getCategories() {
    return this.gameRegistry.getCategories();
  }

  async loadGame(gameId, containerId) {
    const game = this.gameRegistry.getGameById(gameId);
    if (!game) {
      throw new Error(`Game ${gameId} not found`);
    }

    this.unloadCurrentGame();

    this.gameContainer = document.getElementById(containerId);
    if (!this.gameContainer) {
      throw new Error(`Container ${containerId} not found`);
    }

    this.gameContainer.innerHTML = '';

    this.currentGame = game;
    
    const gameInstance = await this.gameRegistry.loadGame(gameId, this.gameContainer, this.createInputAdapter());
    this.currentGameInstance = gameInstance;
    
    return gameInstance;
  }

  createInputAdapter() {
    const adapter = {
      isActionPressed: (player, action) => {
        const keyPressed = this.controllerMapper.isPressed(player, action, this.pressedKeys);
        const gamepadPressed = this.gamepadManager.isButtonPressed(player, action);
        
        if (keyPressed || gamepadPressed) return true;
        
        const direction = this.gamepadManager.getDirectionFromAxis(player);
        if (action === 'up' && direction.up) return true;
        if (action === 'down' && direction.down) return true;
        if (action === 'left' && direction.left) return true;
        if (action === 'right' && direction.right) return true;
        
        return false;
      },
      
      getAxisValue: (player, axis) => {
        let value = 0;
        
        const gamepadDirection = this.gamepadManager.getDirectionFromAxis(player);
        
        if (axis === 'horizontal') {
          value = gamepadDirection.horizontal;
          
          if (Math.abs(value) < 0.15) {
            if (this.controllerMapper.isPressed(player, 'right', this.pressedKeys)) {
              value += 1;
            }
            if (this.controllerMapper.isPressed(player, 'left', this.pressedKeys)) {
              value -= 1;
            }
          }
        } else if (axis === 'vertical') {
          value = gamepadDirection.vertical;
          
          if (Math.abs(value) < 0.15) {
            if (this.controllerMapper.isPressed(player, 'down', this.pressedKeys)) {
              value += 1;
            }
            if (this.controllerMapper.isPressed(player, 'up', this.pressedKeys)) {
              value -= 1;
            }
          }
        }
        
        return value;
      },
      
      onKeyDown: (callback) => {
        const listener = (e) => {
          callback(e.code, e);
        };
        document.addEventListener('keydown', listener);
        return () => document.removeEventListener('keydown', listener);
      },
      
      onKeyUp: (callback) => {
        const listener = (e) => {
          callback(e.code, e);
        };
        document.addEventListener('keyup', listener);
        return () => document.removeEventListener('keyup', listener);
      }
    };
    
    return adapter;
  }

  unloadCurrentGame() {
    console.log('🧹 Limpiando juego actual...');
    
    // Destruir instancia de Phaser si existe
    if (this.currentGameInstance) {
      try {
        if (typeof this.currentGameInstance.destroy === 'function') {
          console.log('  🎮 Destruyendo instancia Phaser...');
          this.currentGameInstance.destroy(true, false);
        }
      } catch (error) {
        console.warn('  ⚠️ Error destruyendo instancia Phaser:', error);
      }
      this.currentGameInstance = null;
    }
    
    // Limpiar contenedor y eliminar canvas residuales
    if (this.gameContainer) {
      console.log('  🗑️ Limpiando contenedor...');
      
      // Buscar y destruir todos los canvas dentro del contenedor
      const canvases = this.gameContainer.querySelectorAll('canvas');
      canvases.forEach(canvas => {
        console.log('  📦 Removiendo canvas del contenedor');
        canvas.remove();
      });
      
      // Limpiar todo el HTML
      this.gameContainer.innerHTML = '';
    }
    
    // Limpiar canvas sueltos en body (juegos no-Phaser)
    const bodyCanvases = document.body.querySelectorAll('canvas');
    bodyCanvases.forEach(canvas => {
      // Solo remover canvas que no estén dentro de #app (son del juego)
      const isInsideApp = canvas.closest('#app');
      if (!isInsideApp) {
        console.log('  🧹 Removiendo canvas suelto del body');
        canvas.remove();
      }
    });
    
    this.currentGame = null;
    console.log('✅ Limpieza completada');
  }

  getCurrentGame() {
    return this.currentGame;
  }
}
