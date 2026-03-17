export class GameRegistry {
  constructor() {
    this.games = [];
    this.categories = new Set();
  }

  registerGame(manifest) {
    if (!manifest.id || !manifest.name || !manifest.load) {
      console.error('Invalid game manifest:', manifest);
      return false;
    }

    if (this.games.find(g => g.id === manifest.id)) {
      return false;
    }

    const gameEntry = {
      id: manifest.id,
      name: manifest.name,
      description: manifest.description || 'No description available',
      author: manifest.author || 'Unknown',
      version: manifest.version || '1.0.0',
      thumbnail: manifest.thumbnail || null,
      category: manifest.category || 'arcade',
      place: manifest.place || null, // Preservar campo place para ganadores
      fullPath: manifest.fullPath || null, // Path completo del juego
      tags: manifest.tags || [],
      players: manifest.players || [1],
      controls: manifest.controls || 'keyboard+gamepad',
      load: manifest.load
    };

    this.games.push(gameEntry);
    this.categories.add(gameEntry.category);
    return true;
  }

  getGames() {
    return [...this.games];
  }

  getGameById(id) {
    return this.games.find(g => g.id === id);
  }

  getGamesByCategory(category) {
    return this.games.filter(g => g.category === category);
  }

  getCategories() {
    return Array.from(this.categories).sort();
  }

  searchGames(query) {
    const lowerQuery = query.toLowerCase();
    return this.games.filter(game => 
      game.name.toLowerCase().includes(lowerQuery) ||
      game.description.toLowerCase().includes(lowerQuery) ||
      game.author.toLowerCase().includes(lowerQuery) ||
      game.tags.some(tag => tag.toLowerCase().includes(lowerQuery))
    );
  }

  async loadGame(gameId, container, inputAdapter) {
    const game = this.getGameById(gameId);
    if (!game) {
      throw new Error(`Game "${gameId}" not found in registry`);
    }

    try {
      const gameInstance = await game.load(container, inputAdapter);
      return gameInstance;
    } catch (error) {
      console.error(`Error loading game "${gameId}":`, error);
      throw error;
    }
  }
}
