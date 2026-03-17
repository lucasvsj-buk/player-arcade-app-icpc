export class GamepadManager {
  constructor() {
    this.gamepads = {};
    this.listeners = [];
    this.lastStates = {};
    this.keySimulationEnabled = true;
    
    // Mapeo de índices de botones/ejes del gamepad físico
    this.defaultMapping = {
      player1: {
        axisX: 0,
        axisY: 1,
        button1: 0,
        button2: 1,
        button3: 2,
        button4: 3,
        button5: 4,
        button6: 5
      },
      player2: {
        axisX: 2,
        axisY: 3,
        button1: 6,
        button2: 7,
        button3: 8,
        button4: 9,
        button5: 10,
        button6: 11
      }
    };
    
    // Mapeo de inputs del arcade a teclas del teclado
    this.defaultKeyMapping = {
      player1: {
        up: 'KeyW',
        down: 'KeyS',
        left: 'KeyA',
        right: 'KeyD',
        button1: 'KeyU',
        button2: 'KeyI',
        button3: 'KeyO',
        button4: 'KeyJ',
        button5: 'KeyK',
        button6: 'KeyL'
      },
      player2: {
        up: 'Numpad8',
        down: 'Numpad5',
        left: 'Numpad4',
        right: 'Numpad6',
        button1: 'Numpad7',
        button2: 'Numpad9',
        button3: 'Numpad1',
        button4: 'Numpad3',
        button5: 'NumpadSubtract',
        button6: 'NumpadAdd'
      }
    };
    
    this.loadMapping();
    this.setupGamepadEvents();
    this.startPolling();
  }

  startPolling() {
    if (!this.pollInterval) {
      this.pollInterval = setInterval(() => {
        this.pollGamepads();
      }, 16);
    }
  }

  stopPolling() {
    if (this.pollInterval) {
      clearInterval(this.pollInterval);
      this.pollInterval = null;
    }
  }

  loadMapping() {
    // Cargar mapeo de botones/ejes del gamepad
    const savedGamepad = localStorage.getItem('arcadeGamepadMapping');
    if (savedGamepad) {
      try {
        this.mapping = JSON.parse(savedGamepad);
      } catch (e) {
        this.mapping = JSON.parse(JSON.stringify(this.defaultMapping));
      }
    } else {
      this.mapping = JSON.parse(JSON.stringify(this.defaultMapping));
    }
    
    // Cargar mapeo de arcade a teclas de teclado
    const savedKeys = localStorage.getItem('arcadeKeyMapping');
    if (savedKeys) {
      try {
        this.keyMapping = JSON.parse(savedKeys);
      } catch (e) {
        this.keyMapping = JSON.parse(JSON.stringify(this.defaultKeyMapping));
      }
    } else {
      this.keyMapping = JSON.parse(JSON.stringify(this.defaultKeyMapping));
    }
  }

  saveMapping() {
    localStorage.setItem('arcadeGamepadMapping', JSON.stringify(this.mapping));
    localStorage.setItem('arcadeKeyMapping', JSON.stringify(this.keyMapping));
  }

  setupGamepadEvents() {
    window.addEventListener('gamepadconnected', (e) => {
      console.log('Gamepad connected:', e.gamepad.id);
      this.gamepads[e.gamepad.index] = e.gamepad;
      this.lastAxisStates[e.gamepad.index] = {};
      this.lastButtonStates[e.gamepad.index] = {};
      this.notifyListeners('connected', e.gamepad);
    });

    window.addEventListener('gamepaddisconnected', (e) => {
      console.log('Gamepad disconnected:', e.gamepad.id);
      delete this.gamepads[e.gamepad.index];
      delete this.lastAxisStates[e.gamepad.index];
      delete this.lastButtonStates[e.gamepad.index];
      this.notifyListeners('disconnected', e.gamepad);
    });
  }

  addListener(callback) {
    this.listeners.push(callback);
  }

  removeListener(callback) {
    const index = this.listeners.indexOf(callback);
    if (index > -1) {
      this.listeners.splice(index, 1);
    }
  }

  notifyListeners(event, gamepad) {
    this.listeners.forEach(listener => {
      try {
        listener(event, gamepad);
      } catch (e) {
        console.error('Error in gamepad listener:', e);
      }
    });
  }

  pollGamepads() {
    const gamepads = navigator.getGamepads ? navigator.getGamepads() : [];
    
    for (let i = 0; i < gamepads.length; i++) {
      if (gamepads[i]) {
        this.gamepads[i] = gamepads[i];
        
        if (this.keySimulationEnabled) {
          this.simulateKeyboardEvents(gamepads[i], i);
        }
      }
    }
  }

  simulateKeyboardEvents(gamepad, gamepadIndex) {
    if (!this.lastStates[gamepadIndex]) {
      this.lastStates[gamepadIndex] = { buttons: {}, axes: {} };
    }
    
    const lastState = this.lastStates[gamepadIndex];
    const player = gamepadIndex === 0 ? 'player1' : 'player2';
    const mapping = this.mapping[player];
    
    for (let i = 0; i < gamepad.buttons.length; i++) {
      const pressed = gamepad.buttons[i].pressed;
      const wasPressed = lastState.buttons[i] || false;
      
      if (pressed && !wasPressed) {
        this.dispatchKeyEvent('keydown', this.getKeyForButton(player, i));
      } else if (!pressed && wasPressed) {
        this.dispatchKeyEvent('keyup', this.getKeyForButton(player, i));
      }
      
      lastState.buttons[i] = pressed;
    }
    
    const axisX = gamepad.axes[mapping.axisX] || 0;
    const axisY = gamepad.axes[mapping.axisY] || 0;
    
    const left = axisX < -0.5;
    const right = axisX > 0.5;
    const up = axisY < -0.5;
    const down = axisY > 0.5;
    
    const wasLeft = lastState.axes.left || false;
    const wasRight = lastState.axes.right || false;
    const wasUp = lastState.axes.up || false;
    const wasDown = lastState.axes.down || false;
    
    const keyMap = this.keyMapping[player];
    
    if (left && !wasLeft) this.dispatchKeyEvent('keydown', keyMap.left);
    if (!left && wasLeft) this.dispatchKeyEvent('keyup', keyMap.left);
    
    if (right && !wasRight) this.dispatchKeyEvent('keydown', keyMap.right);
    if (!right && wasRight) this.dispatchKeyEvent('keyup', keyMap.right);
    
    if (up && !wasUp) this.dispatchKeyEvent('keydown', keyMap.up);
    if (!up && wasUp) this.dispatchKeyEvent('keyup', keyMap.up);
    
    if (down && !wasDown) this.dispatchKeyEvent('keydown', keyMap.down);
    if (!down && wasDown) this.dispatchKeyEvent('keyup', keyMap.down);
    
    lastState.axes = { left, right, up, down };
  }

  getKeyForButton(player, buttonIndex) {
    const mapping = this.mapping[player];
    const keyMap = this.keyMapping[player];
    
    if (buttonIndex === mapping.button1) return keyMap.button1;
    if (buttonIndex === mapping.button2) return keyMap.button2;
    if (buttonIndex === mapping.button3) return keyMap.button3;
    if (buttonIndex === mapping.button4) return keyMap.button4;
    if (buttonIndex === mapping.button5) return keyMap.button5;
    if (buttonIndex === mapping.button6) return keyMap.button6;
    
    return null;
  }

  dispatchKeyEvent(type, code) {
    if (!code) return;
    
    const event = new KeyboardEvent(type, {
      code: code,
      key: this.codeToKey(code),
      bubbles: true,
      cancelable: true
    });
    
    document.dispatchEvent(event);
  }

  codeToKey(code) {
    const keyMap = {
      'KeyW': 'w', 'KeyA': 'a', 'KeyS': 's', 'KeyD': 'd',
      'KeyU': 'u', 'KeyI': 'i', 'KeyO': 'o',
      'KeyJ': 'j', 'KeyK': 'k', 'KeyL': 'l',
      'Numpad4': '4', 'Numpad5': '5', 'Numpad6': '6', 'Numpad8': '8',
      'Numpad1': '1', 'Numpad3': '3', 'Numpad7': '7', 'Numpad9': '9',
      'NumpadSubtract': '-', 'NumpadAdd': '+'
    };
    return keyMap[code] || code;
  }

  getGamepads() {
    return Object.values(this.gamepads);
  }

  isButtonPressed(player, buttonName) {
    this.pollGamepads();
    
    const buttonIndex = this.mapping[player]?.[buttonName];
    if (buttonIndex === undefined) return false;

    for (const gamepad of Object.values(this.gamepads)) {
      if (!gamepad) continue;
      
      const button = gamepad.buttons[buttonIndex];
      if (button && (button.pressed || button.value > 0.5)) {
        return true;
      }
    }
    
    return false;
  }

  getAxisValue(player, axisName) {
    this.pollGamepads();
    
    const axisIndex = this.mapping[player]?.[axisName];
    if (axisIndex === undefined) return 0;

    for (const gamepad of Object.values(this.gamepads)) {
      if (!gamepad) continue;
      
      const axisValue = gamepad.axes[axisIndex];
      if (axisValue !== undefined && Math.abs(axisValue) > 0.15) {
        return axisValue;
      }
    }
    
    return 0;
  }

  getDirectionFromAxis(player) {
    const axisX = this.getAxisValue(player, 'axisX');
    const axisY = this.getAxisValue(player, 'axisY');
    
    return {
      up: axisY < -0.5,
      down: axisY > 0.5,
      left: axisX < -0.5,
      right: axisX > 0.5,
      horizontal: axisX,
      vertical: axisY
    };
  }

  setMapping(player, action, value) {
    if (!this.mapping[player]) {
      this.mapping[player] = {};
    }
    this.mapping[player][action] = value;
    this.saveMapping();
  }

  resetToDefault() {
    this.mapping = JSON.parse(JSON.stringify(this.defaultMapping));
    this.keyMapping = JSON.parse(JSON.stringify(this.defaultKeyMapping));
    this.saveMapping();
  }

  getAllMappings() {
    return JSON.parse(JSON.stringify(this.mapping));
  }
  
  getKeyMapping(player, action) {
    return this.keyMapping[player]?.[action] || null;
  }
  
  setKeyMapping(player, action, keyCode) {
    if (!this.keyMapping[player]) {
      this.keyMapping[player] = {};
    }
    this.keyMapping[player][action] = keyCode;
    this.saveMapping();
  }
  
  getAllKeyMappings() {
    return JSON.parse(JSON.stringify(this.keyMapping));
  }
}
