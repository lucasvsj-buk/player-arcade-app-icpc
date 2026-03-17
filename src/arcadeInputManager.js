import { 
  DEFAULT_ARCADE_MAPPING, 
  ARCADE_TO_GAMEPAD_INDEX, 
  STORAGE_KEYS 
} from './constants/arcadeMapping.js';

/**
 * Gestor de inputs del arcade
 * Convierte inputs físicos del arcade (gamepad + teclado) en eventos de teclado
 * según el mapeo configurable
 */
export class ArcadeInputManager {
  constructor() {
    this.mapping = this.loadMapping();
    this.pressedKeys = new Set();
    this.lastGamepadStates = [null, null];
    this.pollInterval = null;
    this.keydownListeners = [];
    this.keyupListeners = [];
    
    this.setupKeyboardPassthrough();
    this.startGamepadPolling();
  }

  /**
   * Carga el mapeo desde localStorage o usa el default
   */
  loadMapping() {
    try {
      const saved = localStorage.getItem(STORAGE_KEYS.ARCADE_MAPPING);
      if (saved) {
        return { ...DEFAULT_ARCADE_MAPPING, ...JSON.parse(saved) };
      }
    } catch (e) {
      console.warn('Error loading arcade mapping:', e);
    }
    return { ...DEFAULT_ARCADE_MAPPING };
  }

  /**
   * Guarda el mapeo en localStorage
   */
  saveMapping() {
    try {
      localStorage.setItem(STORAGE_KEYS.ARCADE_MAPPING, JSON.stringify(this.mapping));
    } catch (e) {
      console.warn('Error saving arcade mapping:', e);
    }
  }

  /**
   * Actualiza el mapeo de un control arcade específico
   */
  setMapping(arcadeCode, keyValue) {
    this.mapping[arcadeCode] = keyValue;
    this.saveMapping();
  }

  /**
   * Obtiene la tecla mapeada para un código arcade
   */
  getMapping(arcadeCode) {
    return this.mapping[arcadeCode];
  }

  /**
   * Obtiene todo el mapeo actual
   */
  getAllMappings() {
    return { ...this.mapping };
  }

  /**
   * Resetea al mapeo por defecto
   */
  resetToDefault() {
    this.mapping = { ...DEFAULT_ARCADE_MAPPING };
    this.saveMapping();
  }

  /**
   * Rastrea teclas presionadas físicamente
   * El teclado físico se reenvía directamente por GameModal, no necesitamos duplicarlo
   */
  setupKeyboardPassthrough() {
    const handleKeyDown = (e) => {
      // Solo rastrear estado, NO re-despachar (GameModal ya lo hace)
      this.pressedKeys.add(e.key);
    };

    const handleKeyUp = (e) => {
      this.pressedKeys.delete(e.key);
    };

    window.addEventListener('keydown', handleKeyDown);
    window.addEventListener('keyup', handleKeyUp);

    // Cleanup
    this.keyboardCleanup = () => {
      window.removeEventListener('keydown', handleKeyDown);
      window.removeEventListener('keyup', handleKeyUp);
    };
  }

  /**
   * Inicia el polling de gamepads físicos
   */
  startGamepadPolling() {
    if (this.pollInterval) return;

    this.pollInterval = setInterval(() => {
      this.pollGamepads();
    }, 16); // ~60fps
  }

  /**
   * Detiene el polling de gamepads
   */
  stopGamepadPolling() {
    if (this.pollInterval) {
      clearInterval(this.pollInterval);
      this.pollInterval = null;
    }
  }

  /**
   * Polling de gamepads físicos
   */
  pollGamepads() {
    const gamepads = navigator.getGamepads();
    
    for (let playerIndex = 0; playerIndex < 2; playerIndex++) {
      const gamepad = gamepads[playerIndex];
      if (!gamepad) continue;

      const lastState = this.lastGamepadStates[playerIndex];
      
      // Procesar controles según mapeo
      const player = playerIndex === 0 ? '1' : '2';
      
      // Direcciones (ejes)
      this.processAxis(gamepad, lastState, `${player}U`, `${player}D`, 1); // Eje Y
      this.processAxis(gamepad, lastState, `${player}L`, `${player}R`, 0); // Eje X
      
      // Botones
      const buttonCodes = [`${player}A`, `${player}B`, `${player}C`, `${player}X`, `${player}Y`, `${player}Z`, `${player}START`, `${player}COIN`];
      buttonCodes.forEach((code, idx) => {
        const mapping = ARCADE_TO_GAMEPAD_INDEX[code];
        if (mapping && mapping.type === 'button') {
          this.processButton(gamepad, lastState, code, mapping.index);
        }
      });

      // Guardar estado actual
      this.lastGamepadStates[playerIndex] = {
        buttons: gamepad.buttons.map(b => b.pressed),
        axes: [...gamepad.axes],
      };
    }
  }

  /**
   * Procesa un eje del gamepad (joystick)
   */
  processAxis(gamepad, lastState, negativeCode, positiveCode, axisIndex, deadzone = 0.3) {
    const value = gamepad.axes[axisIndex] || 0;
    const lastValue = lastState?.axes[axisIndex] || 0;

    // Dirección negativa (arriba/izquierda)
    const wasNegative = lastValue < -deadzone;
    const isNegative = value < -deadzone;
    if (isNegative && !wasNegative) {
      this.simulateArcadeKey(negativeCode, 'keydown');
    } else if (!isNegative && wasNegative) {
      this.simulateArcadeKey(negativeCode, 'keyup');
    }

    // Dirección positiva (abajo/derecha)
    const wasPositive = lastValue > deadzone;
    const isPositive = value > deadzone;
    if (isPositive && !wasPositive) {
      this.simulateArcadeKey(positiveCode, 'keydown');
    } else if (!isPositive && wasPositive) {
      this.simulateArcadeKey(positiveCode, 'keyup');
    }
  }

  /**
   * Procesa un botón del gamepad
   */
  processButton(gamepad, lastState, arcadeCode, buttonIndex) {
    const pressed = gamepad.buttons[buttonIndex]?.pressed || false;
    const wasPressed = lastState?.buttons[buttonIndex] || false;

    if (pressed && !wasPressed) {
      this.simulateArcadeKey(arcadeCode, 'keydown');
    } else if (!pressed && wasPressed) {
      this.simulateArcadeKey(arcadeCode, 'keyup');
    }
  }

  /**
   * Simula un evento de teclado basado en el código arcade
   */
  simulateArcadeKey(arcadeCode, eventType) {
    const key = this.mapping[arcadeCode];
    if (!key) return;

    // Evitar duplicados si ya está presionada por teclado físico
    if (eventType === 'keydown' && this.pressedKeys.has(key)) return;

    const code = this.keyToCode(key);
    this.dispatchKeyEvent(eventType, key, code);
  }

  /**
   * Convierte key value a code (aproximación)
   */
  keyToCode(key) {
    if (key.startsWith('Arrow')) return key;
    if (key.length === 1) return `Key${key.toUpperCase()}`;
    if (key === ' ') return 'Space';
    if (key === 'Enter') return 'Enter';
    return key;
  }

  /**
   * Despacha un evento de teclado sintético
   */
  dispatchKeyEvent(type, key, code) {
    const event = new KeyboardEvent(type, {
      key,
      code,
      bubbles: true,
      cancelable: true,
    });

    // Log para debug (solo eventos sintéticos del gamepad)
    if (type === 'keydown' && !this.pressedKeys.has(key)) {
      console.log(`🎮 Gamepad → ${type}: ${key} (${code})`);
    }

    document.dispatchEvent(event);
    
    // Notificar a listeners registrados
    const listeners = type === 'keydown' ? this.keydownListeners : this.keyupListeners;
    listeners.forEach(callback => callback(event));
  }

  /**
   * Registra un listener para eventos de teclado
   */
  onKeyDown(callback) {
    this.keydownListeners.push(callback);
    return () => {
      this.keydownListeners = this.keydownListeners.filter(cb => cb !== callback);
    };
  }

  onKeyUp(callback) {
    this.keyupListeners.push(callback);
    return () => {
      this.keyupListeners = this.keyupListeners.filter(cb => cb !== callback);
    };
  }

  /**
   * Limpieza al destruir
   */
  destroy() {
    this.stopGamepadPolling();
    if (this.keyboardCleanup) {
      this.keyboardCleanup();
    }
    this.keydownListeners = [];
    this.keyupListeners = [];
  }
}
