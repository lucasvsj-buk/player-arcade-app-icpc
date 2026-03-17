import Phaser from 'phaser';
import { ArcadeInputManager } from './arcadeInputManager.js';
import { GameRegistry } from './gameRegistry.js';
import { GameLoader } from './gameLoader.js';
import { MenuUI } from './ui/menuUI.js';
import { loadAllGames } from './games/index.js';

// Exponer Phaser globalmente para que los juegos no tengan que importarlo
window.Phaser = Phaser;

class ArcadeApp {
  constructor() {
    window.BUK_ARCADE_MODE = true; // Flag para que juegos detecten modo arcade
    
    // Sistema mejorado de mapeo arcade
    this.arcadeInputManager = new ArcadeInputManager();
    
    this.gameRegistry = new GameRegistry();
    this.gameLoader = new GameLoader(this.arcadeInputManager, this.gameRegistry);
    this.menuUI = new MenuUI(this.gameLoader, this.arcadeInputManager);
    
    // Exponer para debugging
    window.arcadeInputManager = this.arcadeInputManager;
    
    this.init();
  }

  async init() {
    await this.loadGames();
    this.menuUI.showMenu();
    this.setupSystemControls();
  }

  async loadGames() {
    try {
      const count = await loadAllGames(this.gameRegistry);
      console.log(`🎮 Buk Arcade initialized with ${count} games`);
    } catch (error) {
      console.error('Error loading games:', error);
    }
  }

  setupSystemControls() {
    // El control de Escape ahora lo maneja el modal directamente
    // Este listener es para otras funciones del sistema si es necesario
  }
}

window.addEventListener('DOMContentLoaded', () => {
  new ArcadeApp();
});
