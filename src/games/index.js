/**
 * Game Registry - Carga dinámica de todos los juegos disponibles
 * Cada juego debe tener: game.js, metadata.json y cover.png
 * 
 * NOTA: Los juegos se auto-instancian al importarse (ejecutan new Phaser.Game)
 * Por lo tanto, la función load importa dinámicamente y retorna la instancia global
 */

// Usar import.meta.glob para que Vite conozca todas las rutas en build time
// Ahora soporta subcarpetas: winners/ y others/
const gameModules = import.meta.glob('./**/**/game.js');
const metadataModules = import.meta.glob('./**/**/metadata.json', { eager: true });
const coverModules = import.meta.glob('./**/**/cover.png', { query: '?url', import: 'default', eager: true });

// Detectar automáticamente todas las carpetas de juegos
// Estructura: ./winners/game-name/ y ./others/game-name/
function detectGameFolders() {
  const folders = [];
  
  // Extraer rutas únicas de metadata
  for (const path of Object.keys(metadataModules)) {
    // path ejemplo: "./winners/efragr-game/metadata.json" o "./others/andrew-rd-game/metadata.json"
    const match = path.match(/^\.\/([^/]+)\/([^/]+)\/metadata\.json$/);
    if (match) {
      const [, category, gameName] = match;
      folders.push({ category, gameName, path: `${category}/${gameName}` });
    }
  }
  
  console.log('🎮 Juegos detectados:', folders.map(f => f.path));
  return folders;
}

const GAME_FOLDERS = detectGameFolders();

/**
 * Factory function para crear un loader específico de cada juego
 * Evita problemas de closure en el loop
 * @param {string} gameFolderPath - Ruta relativa como "winners/efragr-game" o "others/andrew-rd-game"
 */
function createGameLoader(gameFolderPath) {
  // Obtener el loader del módulo usando la ruta conocida
  const gameModulePath = `./${gameFolderPath}/game.js`;
  const gameLoader = gameModules[gameModulePath];
  
  if (!gameLoader) {
    console.error(`No se encontró módulo para: ${gameModulePath}`);
    return null;
  }

  return async (container, inputAdapter) => {
    console.log(`🎮 Cargando juego: ${gameFolderPath}`);
    
    // Limpiar COMPLETAMENTE el contenedor antes de cargar
    if (container) {
      console.log('  🧹 Limpiando contenedor...');
      
      // Eliminar todos los canvas existentes en el contenedor
      const oldCanvases = container.querySelectorAll('canvas');
      oldCanvases.forEach(canvas => {
        console.log('  📦 Removiendo canvas viejo del contenedor');
        canvas.remove();
      });
      
      container.innerHTML = '';
    }
    
    // Limpiar canvas sueltos del body antes de cargar
    const bodyCanvases = document.body.querySelectorAll('canvas');
    bodyCanvases.forEach(canvas => {
      const isInsideApp = canvas.closest('#app');
      if (!isInsideApp) {
        console.log('  🧹 Removiendo canvas suelto del body antes de cargar');
        canvas.remove();
      }
    });

    // Capturar la instancia de Phaser que se creará
    let gameInstance = null;
    
    // Hook temporal para capturar la instancia de Phaser.Game
    const originalGame = window.Phaser.Game;
    window.Phaser.Game = function(config) {
      // Inyectar parent si no está especificado y tenemos un container
      if (container && config && !config.parent) {
        config.parent = container;
      }
      gameInstance = new originalGame(config);
      return gameInstance;
    };

    try {
      // Ejecutar el loader que retorna una promesa
      // El timestamp fuerza re-importación del módulo
      console.log('  ⏳ Importando módulo del juego...');
      await gameLoader();
      
      // Pequeña espera para que juegos no-Phaser monten su canvas
      await new Promise(resolve => setTimeout(resolve, 150));
    } finally {
      // Restaurar el constructor original
      window.Phaser.Game = originalGame;
    }

    // Si el juego creó un canvas Phaser y no está en el contenedor, moverlo
    if (gameInstance && container && gameInstance.canvas) {
      const canvas = gameInstance.canvas;
      if (canvas.parentElement !== container) {
        console.log('  📦 Moviendo canvas Phaser al contenedor');
        container.appendChild(canvas);
      }
    }
    
    // Para juegos no-Phaser: buscar canvas sueltos en body y moverlos al contenedor
    if (container && !gameInstance) {
      const bodyCanvases = document.body.querySelectorAll('canvas');
      bodyCanvases.forEach(canvas => {
        // Solo mover canvas que no estén ya dentro de un contenedor específico
        if (canvas.parentElement === document.body) {
          console.log(`  📦 Moviendo canvas no-Phaser al contenedor del modal`);
          container.appendChild(canvas);
          // Ajustar estilos si es necesario
          canvas.style.display = 'block';
          canvas.style.margin = '0 auto';
        }
      });
    }

    console.log('✅ Juego cargado correctamente');
    return gameInstance;
  };
}

/**
 * Carga todos los juegos y los registra en el GameRegistry
 * @param {GameRegistry} gameRegistry - Instancia del registro de juegos
 * @returns {Promise<number>} - Cantidad de juegos cargados exitosamente
 */
export async function loadAllGames(gameRegistry) {
  console.log('🎮 [index.js v4] Iniciando carga de juegos desde winners/ y others/...');
  let loadedCount = 0;

  for (const { category, gameName, path } of GAME_FOLDERS) {
    try {
      console.log(`📦 Procesando: ${path} (${category})...`);
      
      // Obtener metadata desde los módulos pre-cargados
      const metadataPath = `./${path}/metadata.json`;
      const metadataModule = metadataModules[metadataPath];
      
      if (!metadataModule) {
        console.warn(`  ⚠️  No se encontró metadata.json para ${path}`);
        continue;
      }

      const metadata = metadataModule.default || metadataModule;
      
      // Obtener cover desde los módulos pre-cargados
      const coverPath = `./${path}/cover.png`;
      const coverUrl = coverModules[coverPath] || '';

      console.log(`  ℹ️  Metadata cargada: ${metadata.game_name || gameName} (${metadata.place || 'regular'})`);

      // Crear la función load usando la factory (evita closure problems)
      const loadFunction = createGameLoader(path);

      if (!loadFunction) {
        console.warn(`  ⚠️  No se pudo crear loader para ${path}`);
        continue;
      }

      // Registrar el juego con el método esperado por GameRegistry
      const gameManifest = {
        id: gameName,
        name: metadata.game_name || gameName,
        description: metadata.description || 'Sin descripción',
        author: metadata.author || 'Unknown',
        thumbnail: coverUrl,
        category: category === 'winners' ? 'winner' : 'arcade',
        place: metadata.place || null, // Preservar campo place para ganadores
        fullPath: path, // Path completo: "winners/efragr-game" o "others/andrew-rd-game"
        load: loadFunction
      };

      console.log(`  🔄 Intentando registrar en GameRegistry...`);
      const registered = gameRegistry.registerGame(gameManifest);

      if (registered) {
        loadedCount++;
        console.log(`  ✅ ${metadata.game_name || gameName} registrado exitosamente`);
      } else {
        console.warn(`  ⚠️  ${path} no se pudo registrar (posible duplicado)`);
      }

    } catch (error) {
      console.error(`  ❌ Error en ${path}:`, error.message);
      console.error(error);
    }
  }

  console.log(`\n🎮 Registro completo: ${loadedCount}/${GAME_FOLDERS.length} juegos registrados`);
  return loadedCount;
}
