# Arcade Player App

Aplicación arcade diseñada para jugar juegos Phaser con controles físicos de arcade (2 joysticks + 12 botones).

## Características

- **Sistema de Mapeo de Controles**: Configura tus joysticks y botones arcade
- **Soporte Multi-Jugador**: Controles para 2 jugadores simultáneos
- **Cargador Genérico de Juegos**: Interfaz extensible para múltiples juegos
- **Persistencia de Configuración**: Guarda tu mapeo de controles en localStorage
- **UI Moderna**: Interfaz tipo arcade con efectos visuales

## Controles por Defecto

### Jugador 1
- **Joystick**: W/A/S/D o Flechas direccionales
- **Botones 1-6**: U/I/O/J/K/L o Dígitos 1-6

### Jugador 2
- **Joystick**: Teclado numérico (8/4/5/6)
- **Botones 1-6**: Numpad 7/9/1/3/-/+

### Sistema
- **Start**: Enter o Espacio
- **Select**: Shift
- **Menu**: Escape o ~

## Instalación

```bash
npm install
# o
pnpm install
```

## Desarrollo

```bash
npm run dev
# o
pnpm dev
```

La aplicación se ejecutará en `http://localhost:3001`

## Build para Producción

```bash
npm run build
# o
pnpm build
```

## Estructura del Proyecto

```
player-arcade-app/
├── src/
│   ├── main.js                 # Punto de entrada
│   ├── styles.css              # Estilos globales
│   ├── controllerMapper.js    # Sistema de mapeo de controles
│   ├── gameLoader.js           # Cargador de juegos
│   ├── ui/
│   │   └── menuUI.js           # Interfaz de menú y configuración
│   └── games/
│       ├── pong/
│       │   └── pongGame.js     # Juego Pong
│       └── spaceshooter/
│           └── spaceShooterGame.js  # Juego Space Shooter
├── index.html
├── package.json
└── vite.config.js
```

## Añadir Nuevos Juegos

Para añadir un nuevo juego, crea un archivo en `src/games/[nombre-juego]/` con la siguiente estructura:

```javascript
import Phaser from 'phaser';

export async function createTuJuego(container, inputAdapter) {
  const config = {
    type: Phaser.AUTO,
    width: 800,
    height: 600,
    parent: container,
    scene: {
      create: function() { 
        // Tu código de inicialización
      },
      update: function() {
        // Tu loop de juego
        
        // Usar inputAdapter para controles:
        if (inputAdapter.isActionPressed('player1', 'button1')) {
          // Acción del botón 1
        }
        
        const horizontal = inputAdapter.getAxisValue('player1', 'horizontal');
        const vertical = inputAdapter.getAxisValue('player1', 'vertical');
      }
    }
  };

  return new Phaser.Game(config);
}
```

Luego registra el juego en `src/main.js`:

```javascript
this.gameLoader.registerGame({
  id: 'tu-juego',
  name: 'TU JUEGO',
  description: 'Descripción del juego',
  thumbnail: null,
  loadFunction: createTuJuego,
  controlScheme: 'arcade'
});
```

## InputAdapter API

El `inputAdapter` proporciona las siguientes funciones:

### `isActionPressed(player, action)`
Verifica si una acción específica está presionada.

- **player**: `'player1'`, `'player2'`, o `'system'`
- **action**: 
  - Direcciones: `'up'`, `'down'`, `'left'`, `'right'`
  - Botones: `'button1'`, `'button2'`, `'button3'`, `'button4'`, `'button5'`, `'button6'`
  - Sistema: `'start'`, `'select'`, `'menu'`

**Ejemplo:**
```javascript
if (inputAdapter.isActionPressed('player1', 'button1')) {
  // Disparar
}
```

### `getAxisValue(player, axis)`
Obtiene el valor del eje (-1, 0, o 1).

- **player**: `'player1'` o `'player2'`
- **axis**: `'horizontal'` o `'vertical'`

**Ejemplo:**
```javascript
const horizontal = inputAdapter.getAxisValue('player1', 'horizontal');
player.x += horizontal * speed;
```

### `onKeyDown(callback)` / `onKeyUp(callback)`
Registra listeners para eventos de teclado.

**Ejemplo:**
```javascript
const removeListener = inputAdapter.onKeyDown((code, event) => {
  console.log('Tecla presionada:', code);
});

// Limpiar cuando sea necesario
removeListener();
```

## Juegos Incluidos

### 1. Pong Arcade
- Clásico juego de pong con soporte para 1 o 2 jugadores
- Música procedural generada con Web Audio API
- Efectos de partículas en colisiones

### 2. Space Shooter
- Shooter vertical estilo arcade
- Sistema de oleadas progresivas
- Múltiples tipos de enemigos

## Configurar Controles Arcade

1. En el menú principal, haz clic en "CONFIGURE CONTROLS"
2. Selecciona un control para mapear
3. Presiona el botón o joystick que quieres asignar
4. El sistema guardará automáticamente tu configuración

## Tecnologías

- **Phaser 3.87.0**: Motor de juegos
- **Vite**: Build tool y dev server
- **Vanilla JavaScript**: Sin frameworks adicionales

## Compatibilidad

- Soporta cualquier dispositivo HID que emule teclado
- Compatible con la mayoría de controladoras arcade USB
- Funciona con teclado estándar para desarrollo

## Licencia

MIT
