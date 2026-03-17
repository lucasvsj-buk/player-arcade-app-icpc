# Cómo Agregar Nuevos Juegos a Buk Arcade

Esta guía te muestra cómo agregar tus propios juegos a la aplicación Buk Arcade Player usando el **sistema de manifiestos dinámico**.

## 🎮 Sistema de Carga Dinámica

Buk Arcade usa un sistema de **auto-descubrimiento de juegos**. Solo necesitas crear un archivo `manifest.js` en la carpeta de tu juego y la app lo cargará automáticamente.

**No más imports hardcodeados en `main.js`** ✨

## Estructura de un Juego

Cada juego debe tener esta estructura de carpetas:

```
src/games/
└── tu-juego/
    ├── game.js      ← Código del juego
    └── cover.png    ← Imagen de portada (opcional)
```

El sistema carga automáticamente:
- **`game.js`**: Código principal del juego
- **`cover.png`**: Imagen que aparece en la tarjeta del menú

### Dos Formatos Soportados

#### Formato 1: Con Manifiesto Explícito (Recomendado)

```javascript
// game.js
// NOTA: No necesitas importar Phaser, está disponible globalmente como window.Phaser

async function createTuJuego(container, inputAdapter) {
  // Tu código del juego...
  const config = {
    type: Phaser.AUTO,
    parent: container,
    width: 800,
    height: 600,
    // ... resto de tu configuración
  };
  return new Phaser.Game(config);
}

// Variables y funciones del juego...

// EXPORTAR MANIFIESTO
export default {
  id: 'tu-juego',
  name: 'TU JUEGO',
  description: 'Descripción del juego',
  author: 'Tu Nombre',
  version: '1.0.0',
  category: 'arcade',
  tags: ['tag1', 'tag2'],
  players: [1, 2],
  controls: 'keyboard+gamepad',
  load: createTuJuego
};
```

#### Formato 2: Solo Función (Auto-generado)

Si solo exportas una función `createGame`, el sistema genera automáticamente los metadatos:

```javascript
// game.js
// NOTA: Phaser está disponible globalmente, no necesitas importarlo

export async function createGame(container, inputAdapter) {
  const config = {
    type: Phaser.AUTO,
    parent: container,
    // ... tu configuración
  };
  return new Phaser.Game(config);
}

// Los metadatos se generan automáticamente:
// - id: nombre de la carpeta
// - name: nombre capitalizado de la carpeta
// - category: 'arcade'
// - thumbnail: cover.png si existe
```

### Plantilla Completa de `manifest.js`

```javascript
import Phaser from 'phaser';

// 1. Función de creación del juego
async function createTuJuego(container, inputAdapter) {
  // Reinicializar variables globales
  scene = null;
  score = 0;
  gameState = 'playing';
  
  const config = {
    type: Phaser.AUTO,
    width: 800,
    height: 600,
    parent: container,
    backgroundColor: '#1A2441', // Color de fondo Buk
    scene: {
      create: function() { init.call(this, inputAdapter); },
      update: gameLoop,
      destroy: cleanup // ← Importante para limpiar recursos
    }
  };

  return new Phaser.Game(config);
}

// 2. Variables globales del juego
let scene, inputAdapter, gfx;
let score = 0;
let gameState = 'playing';

// 3. Funciones del juego
function init(adapter) {
  scene = this;
  inputAdapter = adapter;
  gfx = this.add.graphics();
  // Tu código de inicialización
}

function gameLoop(time, delta) {
  gfx.clear();
  // Tu lógica de juego
  
  // Usar inputAdapter para controles
  if (inputAdapter.isActionPressed('player1', 'up')) {
    // Mover arriba
  }
}

function cleanup() {
  // Limpiar timers, intervals, etc.
  gameState = null;
}

// 4. EXPORTAR EL MANIFIESTO (OBLIGATORIO)
export default {
  id: 'tu-juego',                    // ID único (sin espacios)
  name: 'TU JUEGO',                   // Nombre visible
  description: 'Descripción corta',   // Aparece en la tarjeta
  author: 'Tu Nombre',                // Tu nombre o equipo
  version: '1.0.0',                   // Versión del juego
  category: 'arcade',                 // Categoría (arcade, puzzle, action, etc.)
  tags: ['tag1', 'tag2'],            // Tags para búsqueda
  players: [1],                       // Cantidad de jugadores soportados [1] o [1, 2]
  controls: 'keyboard+gamepad',       // Descripción de controles
  load: createTuJuego                 // ← Función de carga
};
```

## Usando el Input Adapter

El `inputAdapter` proporciona acceso unificado a teclado, gamepad y controles arcade:

### Detectar Botones Presionados

```javascript
if (inputAdapter.isActionPressed('player1', 'button1')) {
  // Disparar
}

if (inputAdapter.isActionPressed('player1', 'up')) {
  // Mover arriba
}
```

### Acciones Disponibles

**Direcciones:**
- `'up'`, `'down'`, `'left'`, `'right'`

**Botones:**
- `'button1'`, `'button2'`, `'button3'`, `'button4'`, `'button5'`, `'button6'`

**Sistema:**
- `'start'`, `'select'`, `'menu'`

### Obtener Valores de Ejes (Analógicos)

```javascript
const horizontal = inputAdapter.getAxisValue('player1', 'horizontal'); // -1 a 1
const vertical = inputAdapter.getAxisValue('player1', 'vertical'); // -1 a 1

player.x += horizontal * speed;
player.y += vertical * speed;
```

## Paleta de Colores Buk Arcade

Usa estos colores para mantener la identidad visual:

```javascript
const BUK_COLORS = {
  blue: 0x2F4DAA,      // Azul Buk principal
  navy: 0x2B3C6A,      // Navy Buk
  dark: 0x1A2441,      // Fondo oscuro
  yellow: 0xFBBF3D,    // Amarillo Buk
  lightblue: 0xD9E3FC  // Azul claro
};

// Ejemplo de uso
gfx.fillStyle(BUK_COLORS.blue);
gfx.fillRect(x, y, width, height);
```

## 🚀 Paso a Paso: Agregar un Nuevo Juego

### 1. Crear la Carpeta del Juego

```bash
mkdir -p src/games/mi-juego
touch src/games/mi-juego/manifest.js
```

### 2. Copiar la Plantilla de Manifiesto

Copia la plantilla anterior en `src/games/mi-juego/manifest.js` y personaliza:

```javascript
import Phaser from 'phaser';

async function createMiJuego(container, inputAdapter) {
  // Tu implementación aquí
  const config = {
    type: Phaser.AUTO,
    width: 800,
    height: 600,
    parent: container,
    backgroundColor: '#1A2441',
    scene: {
      create: function() { init.call(this, inputAdapter); },
      update: gameLoop,
      destroy: cleanup
    }
  };
  return new Phaser.Game(config);
}

// Tu código del juego...

// MANIFIESTO
export default {
  id: 'mi-juego',
  name: 'MI JUEGO INCREÍBLE',
  description: 'Un juego súper divertido',
  author: 'Mi Nombre',
  version: '1.0.0',
  category: 'action',
  tags: ['fast-paced', 'fun'],
  players: [1],
  controls: 'keyboard+gamepad',
  load: createMiJuego
};
```

### 3. ¡Eso es Todo!

```bash
npm run dev
```

**Tu juego aparecerá automáticamente** en el menú. No necesitas:
- ❌ Editar `main.js`
- ❌ Importar manualmente
- ❌ Registrar en ningún lado

El sistema usa `import.meta.glob()` para encontrar todos los archivos `manifest.js` automáticamente.

### 4. Verificar en la Consola

Al iniciar la app verás:

```
✓ Loaded game: MI JUEGO INCREÍBLE (with cover)
🎮 Buk Arcade initialized with 1 games
```

## 🖼️ Imagen de Portada (cover.png)

Coloca una imagen PNG de **cualquier tamaño** en la carpeta del juego:

```
src/games/mi-juego/
├── game.js
└── cover.png  ← Se mostrará automáticamente
```

**Recomendaciones:**
- Tamaño: 400x300px o ratio 4:3
- Formato: PNG con fondo transparente o JPG
- Peso: < 200KB
- Contenido: Logo del juego, screenshot, o arte representativo

Si no incluyes `cover.png`, se usará un gradiente de colores Buk con emoji 🎮.

## 🔄 Integrar Juegos Existentes

Si tienes un juego de Phaser que ya funciona, solo necesitas:

### Opción A: Juego Standalone (Más Simple)

Si tu juego crea `new Phaser.Game()` directamente:

```javascript
// Tu código original...
// NOTA: NO necesitas importar Phaser, está disponible globalmente

const config = {
  type: Phaser.AUTO,
  width: 800,
  height: 600,
  scene: [MyScene]
};
const game = new Phaser.Game(config); // ← Solo funciona standalone
```

**Modificar a:**

```javascript
// Tu código original...
const config = {
  type: Phaser.AUTO,
  width: 800,
  height: 600,
  scene: [MyScene]
};

// Modo standalone (opcional)
if (!window.BUK_ARCADE_MODE) {
  new Phaser.Game(config);
}

// Exportar para Buk Arcade
export default function createGame(container, inputAdapter) {
  return new Phaser.Game({
    ...config,
    parent: container // ← Agregar el container
  });
}
```

### Opción B: Con Manifiesto Completo

```javascript
// Todo tu código del juego...
// NOTA: Phaser está disponible globalmente, no necesitas importarlo

export default {
  id: 'mi-juego',
  name: 'MI JUEGO',
  description: 'Descripción',
  author: 'Mi Nombre',
  category: 'arcade',
  tags: ['fun'],
  players: [1],
  load: (container, inputAdapter) => {
    return new Phaser.Game({
      ...config,
      parent: container
    });
  }
};
```

## 📦 Librerías Disponibles

Buk Arcade proporciona las siguientes librerías globalmente:

- **`Phaser`** - Framework de juegos (window.Phaser)
- No necesitas importar nada, simplemente usa `Phaser` directamente en tu código

## Buenas Prácticas

### ✅ SÍ hacer:

1. **Reinicializar variables** al inicio de la función de creación
2. **Implementar función `cleanup()`** para liberar recursos
3. **Usar la paleta de colores Buk**
4. **Probar con teclado Y gamepad**
5. **Manejar el estado del juego** (playing, gameover, etc.)

### ❌ NO hacer:

1. **No dejar timers o intervals corriendo** sin limpiar
2. **No usar variables globales sin reinicializar**
3. **No ignorar el `destroy` lifecycle hook**
4. **No hardcodear controles** - usar siempre `inputAdapter`
5. **No usar colores aleatorios** - mantener identidad Buk

## Ejemplo Completo: Juego Simple

```javascript
import Phaser from 'phaser';

export async function createJuegoSimple(container, inputAdapter) {
  // Reinicializar
  player = null;
  score = 0;
  gameState = 'playing';
  
  const config = {
    type: Phaser.AUTO,
    width: 800,
    height: 600,
    parent: container,
    backgroundColor: '#1A2441',
    scene: {
      create: function() { init.call(this, inputAdapter); },
      update: update,
      destroy: cleanup
    }
  };

  return new Phaser.Game(config);
}

let scene, inputAdapter, gfx;
let player, score, gameState;

function init(adapter) {
  scene = this;
  inputAdapter = adapter;
  gfx = this.add.graphics();
  
  player = { x: 400, y: 300, radius: 20 };
  score = 0;
  gameState = 'playing';
}

function update(time, delta) {
  gfx.clear();
  
  if (gameState === 'playing') {
    // Input
    const horizontal = inputAdapter.getAxisValue('player1', 'horizontal');
    const vertical = inputAdapter.getAxisValue('player1', 'vertical');
    
    player.x += horizontal * 5;
    player.y += vertical * 5;
    
    // Dibujar
    gfx.fillStyle(0x2F4DAA);
    gfx.fillCircle(player.x, player.y, player.radius);
    
    // HUD
    gfx.fillStyle(0xFFFFFF);
    scene.add.text(10, 10, `Score: ${score}`, { 
      fontSize: '24px', 
      color: '#FBBF3D' 
    });
  }
}

function cleanup() {
  // Limpiar recursos si los hay
  gameState = null;
  player = null;
}
```

## 📦 Características del Sistema de Manifiestos

### Metadatos Disponibles

```javascript
export default {
  // OBLIGATORIOS
  id: 'unique-id',              // Identificador único
  name: 'Game Name',            // Nombre del juego
  load: functionName,           // Función de carga
  
  // OPCIONALES
  description: 'Text',          // Descripción (default: "No description")
  author: 'Your Name',          // Autor (default: "Unknown")
  version: '1.0.0',             // Versión (default: "1.0.0")
  category: 'arcade',           // Categoría para filtrar (default: "arcade")
  tags: ['tag1', 'tag2'],      // Tags para búsqueda (default: [])
  players: [1, 2],              // Jugadores soportados (default: [1])
  controls: 'gamepad+keyboard', // Descripción controles
  thumbnail: '/path/img.png'    // Imagen (default: null)
};
```

### Categorías Sugeridas

- `arcade` - Juegos arcade clásicos
- `puzzle` - Juegos de lógica
- `action` - Juegos de acción
- `strategy` - Juegos de estrategia
- `casual` - Juegos casuales
- `multiplayer` - Enfocados en multijugador

Las categorías aparecen automáticamente como filtros en la UI.

### Tags para Búsqueda

Los tags mejoran la búsqueda. Ejemplos:

```javascript
tags: ['2-player', 'classic', 'competitive', 'retro', 'fast-paced']
```

Los usuarios pueden buscar por:
- Nombre del juego
- Descripción
- Autor
- Tags

## 🔄 Migrar Juegos de arcade-app

Si quieres portar un juego desde `arcade-app`:

1. **Crea carpeta** `src/games/nombre-juego/`
2. **Crea `manifest.js`**
3. **Copia el código** del juego dentro del manifest
4. **Adapta inputs**: `cursors.up.isDown` → `inputAdapter.isActionPressed('player1', 'up')`
5. **Agrega reinicialización** de variables al inicio
6. **Implementa `cleanup()`** para liberar recursos
7. **Usa colores Buk**
8. **Exporta el manifiesto** al final

## Recursos

- **Phaser 3 Docs**: https://photonstorm.github.io/phaser3-docs/
- **Input Adapter API**: Ver `src/gameLoader.js` línea 61-118
- **Juegos de ejemplo**: `src/games/pong/`, `src/games/snake/`, etc.

## Soporte

Si tienes problemas, revisa:
1. Consola del navegador para errores
2. Que el juego se destruya correctamente al cerrar el modal
3. Que el joystick funcione (probar con WASD si no tienes uno)

¡Diviértete creando juegos para Buk Arcade! 🎮
