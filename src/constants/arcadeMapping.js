/**
 * Sistema de mapeo arcade estándar
 * 
 * Nomenclatura:
 * - Códigos arcade: '1U' (Player 1 Up), '1A' (Player 1 Button A), '2START', etc.
 * - Teclas: key values como 'w', 'ArrowUp', 'Enter', etc. (no códigos como 'KeyW')
 * 
 * Inspirado en arcade-input-display-mapping-sources-stripped-schema
 */

/**
 * Mapeo por defecto del arcade cabinet
 * Mapea códigos de control arcade a teclas del teclado
 */
export const DEFAULT_ARCADE_MAPPING = {
  // Player 1 - Joystick
  '1U': 'w',          // Up
  '1D': 's',          // Down
  '1L': 'a',          // Left
  '1R': 'd',          // Right
  
  // Player 1 - Botones
  '1A': 'u',          // Button A
  '1B': 'i',          // Button B
  '1C': 'o',          // Button C
  '1X': 'j',          // Button X
  '1Y': 'k',          // Button Y
  '1Z': 'l',          // Button Z
  '1START': '1',      // Start
  '1COIN': '8',       // Coin/Select
  
  // Player 2 - Joystick
  '2U': 'ArrowUp',
  '2D': 'ArrowDown',
  '2L': 'ArrowLeft',
  '2R': 'ArrowRight',
  
  // Player 2 - Botones
  '2A': 'r',
  '2B': 't',
  '2C': 'y',
  '2X': 'f',
  '2Y': 'g',
  '2Z': 'h',
  '2START': '2',
  '2COIN': '9',
};

/**
 * Mapeo de códigos arcade a nombres legibles
 */
export const ARCADE_CONTROL_LABELS = {
  // Player 1
  '1U': 'P1 ↑ Up',
  '1D': 'P1 ↓ Down',
  '1L': 'P1 ← Left',
  '1R': 'P1 → Right',
  '1A': 'P1 🅰 Button A',
  '1B': 'P1 🅱 Button B',
  '1C': 'P1 Ⓒ Button C',
  '1X': 'P1 ❌ Button X',
  '1Y': 'P1 Ⓨ Button Y',
  '1Z': 'P1 Ⓩ Button Z',
  '1START': 'P1 ▶ Start',
  '1COIN': 'P1 🪙 Coin',
  
  // Player 2
  '2U': 'P2 ↑ Up',
  '2D': 'P2 ↓ Down',
  '2L': 'P2 ← Left',
  '2R': 'P2 → Right',
  '2A': 'P2 🅰 Button A',
  '2B': 'P2 🅱 Button B',
  '2C': 'P2 Ⓒ Button C',
  '2X': 'P2 ❌ Button X',
  '2Y': 'P2 Ⓨ Button Y',
  '2Z': 'P2 Ⓩ Button Z',
  '2START': 'P2 ▶ Start',
  '2COIN': 'P2 🪙 Coin',
};

/**
 * Mapeo de códigos arcade a índices de gamepad estándar
 * Útil para mapear controles físicos del arcade
 */
export const ARCADE_TO_GAMEPAD_INDEX = {
  // Player 1 - Axes (joystick)
  '1U': { type: 'axis', player: 0, index: 1, value: -1 },
  '1D': { type: 'axis', player: 0, index: 1, value: 1 },
  '1L': { type: 'axis', player: 0, index: 0, value: -1 },
  '1R': { type: 'axis', player: 0, index: 0, value: 1 },
  
  // Player 1 - Buttons
  '1A': { type: 'button', player: 0, index: 0 },  // A
  '1B': { type: 'button', player: 0, index: 1 },  // B
  '1C': { type: 'button', player: 0, index: 2 },  // X (como C)
  '1X': { type: 'button', player: 0, index: 3 },  // Y (como X)
  '1Y': { type: 'button', player: 0, index: 4 },  // LB (como Y)
  '1Z': { type: 'button', player: 0, index: 5 },  // RB (como Z)
  '1START': { type: 'button', player: 0, index: 9 },  // Start
  '1COIN': { type: 'button', player: 0, index: 8 },   // Select
  
  // Player 2 - Axes
  '2U': { type: 'axis', player: 1, index: 1, value: -1 },
  '2D': { type: 'axis', player: 1, index: 1, value: 1 },
  '2L': { type: 'axis', player: 1, index: 0, value: -1 },
  '2R': { type: 'axis', player: 1, index: 0, value: 1 },
  
  // Player 2 - Buttons
  '2A': { type: 'button', player: 1, index: 0 },
  '2B': { type: 'button', player: 1, index: 1 },
  '2C': { type: 'button', player: 1, index: 2 },
  '2X': { type: 'button', player: 1, index: 3 },
  '2Y': { type: 'button', player: 1, index: 4 },
  '2Z': { type: 'button', player: 1, index: 5 },
  '2START': { type: 'button', player: 1, index: 9 },
  '2COIN': { type: 'button', player: 1, index: 8 },
};

/**
 * Orden de controles para UI de configuración
 */
export const ARCADE_CONTROLS_ORDER = {
  player1: ['1U', '1D', '1L', '1R', '1A', '1B', '1C', '1X', '1Y', '1Z', '1START', '1COIN'],
  player2: ['2U', '2D', '2L', '2R', '2A', '2B', '2C', '2X', '2Y', '2Z', '2START', '2COIN'],
};

/**
 * Storage keys
 */
export const STORAGE_KEYS = {
  ARCADE_MAPPING: 'arcade-keyboard-mapping',
  GAMEPAD_CONFIG: 'arcade-gamepad-config',
};

/**
 * Convierte una tecla a formato legible
 */
export function formatKeyName(key) {
  const specialKeys = {
    'ArrowUp': '↑',
    'ArrowDown': '↓',
    'ArrowLeft': '←',
    'ArrowRight': '→',
    'Enter': '⏎',
    'Space': '␣',
    ' ': '␣',
    'Escape': 'ESC',
    'Backspace': '⌫',
    'Tab': '↹',
    'Shift': '⇧',
    'Control': 'CTRL',
    'Alt': 'ALT',
    'Meta': '⌘',
  };
  
  return specialKeys[key] || key.toUpperCase();
}
