export class ControllerMapper {
  constructor() {
    this.defaultMapping = {
      player1: {
        up: ['KeyW', 'ArrowUp'],
        down: ['KeyS', 'ArrowDown'],
        left: ['KeyA', 'ArrowLeft'],
        right: ['KeyD', 'ArrowRight'],
        button1: ['KeyU', 'Digit1'],
        button2: ['KeyI', 'Digit2'],
        button3: ['KeyO', 'Digit3'],
        button4: ['KeyJ', 'Digit4'],
        button5: ['KeyK', 'Digit5'],
        button6: ['KeyL', 'Digit6']
      },
      player2: {
        up: ['Numpad8'],
        down: ['Numpad5'],
        left: ['Numpad4'],
        right: ['Numpad6'],
        button1: ['Numpad7'],
        button2: ['Numpad9'],
        button3: ['Numpad1'],
        button4: ['Numpad3'],
        button5: ['NumpadSubtract'],
        button6: ['NumpadAdd']
      },
      system: {
        start: ['Enter', 'Space'],
        select: ['ShiftLeft', 'ShiftRight'],
        menu: ['Escape', 'Backquote']
      }
    };
    
    this.loadMapping();
    this.isListening = false;
    this.currentAction = null;
    this.currentPlayer = null;
  }

  loadMapping() {
    const saved = localStorage.getItem('arcadeControllerMapping');
    if (saved) {
      try {
        this.mapping = JSON.parse(saved);
      } catch (e) {
        this.mapping = JSON.parse(JSON.stringify(this.defaultMapping));
      }
    } else {
      this.mapping = JSON.parse(JSON.stringify(this.defaultMapping));
    }
  }

  saveMapping() {
    localStorage.setItem('arcadeControllerMapping', JSON.stringify(this.mapping));
  }

  resetToDefault() {
    this.mapping = JSON.parse(JSON.stringify(this.defaultMapping));
    this.saveMapping();
  }

  startListening(player, action, callback) {
    this.isListening = true;
    this.currentPlayer = player;
    this.currentAction = action;
    
    const listener = (event) => {
      event.preventDefault();
      
      if (this.isListening) {
        const code = event.code;
        
        if (!this.mapping[player][action]) {
          this.mapping[player][action] = [];
        }
        
        if (!this.mapping[player][action].includes(code)) {
          this.mapping[player][action].push(code);
        }
        
        this.saveMapping();
        this.stopListening();
        
        if (callback) {
          callback(code);
        }
      }
      
      document.removeEventListener('keydown', listener);
    };
    
    document.addEventListener('keydown', listener);
  }

  stopListening() {
    this.isListening = false;
    this.currentPlayer = null;
    this.currentAction = null;
  }

  clearAction(player, action) {
    if (this.mapping[player] && this.mapping[player][action]) {
      this.mapping[player][action] = [];
      this.saveMapping();
    }
  }

  isPressed(player, action, pressedKeys) {
    if (!this.mapping[player] || !this.mapping[player][action]) {
      return false;
    }
    
    return this.mapping[player][action].some(code => pressedKeys.has(code));
  }

  getActionKeys(player, action) {
    if (!this.mapping[player] || !this.mapping[player][action]) {
      return [];
    }
    return [...this.mapping[player][action]];
  }

  getAllMappings() {
    return JSON.parse(JSON.stringify(this.mapping));
  }
}
