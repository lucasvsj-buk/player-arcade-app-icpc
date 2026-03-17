# 🕹️ Guía del Sistema de Mapeo Arcade

## Descripción General

Este sistema implementa un mapeo de controles arcade estandarizado basado en códigos universales, permitiendo que gamepads físicos y teclado se mapeen automáticamente a controles de juego.

## Arquitectura

### 1. Códigos Arcade Estándar

El sistema usa códigos estándar para identificar cada control:

```
Formato: '[Player][Control]'
- Player: '1' o '2'
- Control: 'U', 'D', 'L', 'R' (direcciones) o 'A', 'B', 'C', 'X', 'Y', 'Z', 'START', 'COIN' (botones)

Ejemplos:
- '1U' = Player 1 Up (arriba)
- '1A' = Player 1 Button A
- '2START' = Player 2 Start
```

### 2. Componentes del Sistema

#### `arcadeMapping.js` - Constantes
Define el mapeo por defecto y configuraciones:

```javascript
DEFAULT_ARCADE_MAPPING = {
  '1U': 'w',          // Player 1 Up → tecla W
  '1A': 'u',          // Player 1 Button A → tecla U
  '2U': 'ArrowUp',    // Player 2 Up → flecha arriba
  // ...
}
```

#### `ArcadeInputManager` - Gestor Principal
Responsabilidades:
- **Polling de gamepads**: Lee estado de gamepads físicos cada 16ms
- **Conversión**: Transforma inputs de gamepad a eventos de teclado
- **Passthrough**: Permite que teclas físicas pasen directamente
- **Persistencia**: Guarda/carga mapeo en localStorage

#### `GameModal` - Forwarding a Iframe
Los juegos corren en iframes aislados. El sistema reenvía eventos:

```javascript
// Parent → Iframe via postMessage
{ type: 'arcade-keydown', code: 'KeyW', key: 'w' }

// Iframe escucha y despacha eventos sintéticos
window.addEventListener('message', (event) => {
  const keyEvent = new KeyboardEvent(eventType, { ... });
  document.dispatchEvent(keyEvent);
});
```

## Flujo de Datos

```
Gamepad Físico
    ↓
ArcadeInputManager.pollGamepads()
    ↓
Detecta cambio (botón/eje)
    ↓
Mapea código arcade ('1A') → tecla ('u')
    ↓
Despacha KeyboardEvent sintético
    ↓
GameModal reenvía a iframe via postMessage
    ↓
Juego recibe evento de teclado
```

## Mapeo por Defecto

### Player 1
- **Joystick**: WASD
- **Botones**: U, I, O, J, K, L
- **Start**: 1
- **Coin**: 8

### Player 2
- **Joystick**: Flechas
- **Botones**: R, T, Y, F, G, H
- **Start**: 2
- **Coin**: 9

## Configuración del Usuario

Los usuarios pueden remapear controles en la pantalla de configuración:

1. Ir a **Config** desde el menú principal
2. Hacer clic en **CHANGE** al lado del control deseado
3. Presionar la tecla nueva
4. El mapeo se guarda automáticamente en localStorage

## Ventajas del Sistema

✅ **Estandarización**: Códigos universales ('1U', '2A', etc.)  
✅ **Aislamiento**: Juegos en iframes con forward de eventos  
✅ **Flexibilidad**: Mapeo configurable por el usuario  
✅ **Compatibilidad**: Funciona con gamepad físico + teclado  
✅ **Persistencia**: Configuración guardada entre sesiones  

## Comparación con Sistema Anterior

| Aspecto | Anterior | Nuevo |
|---------|----------|-------|
| Nomenclatura | `up`, `button1` | `'1U'`, `'1A'` |
| Mapeo | Códigos (`KeyW`) | Keys (`w`) |
| Arquitectura | Clases separadas | `ArcadeInputManager` unificado |
| Storage | 2 keys separados | 1 key `arcade-keyboard-mapping` |
| Configuración | 3 pestañas complejas | 1 pantalla simple |

## API para Desarrolladores

### Obtener el Manager
```javascript
const manager = window.arcadeInputManager;
```

### Cambiar Mapeo Programáticamente
```javascript
manager.setMapping('1A', 'Space'); // Button A → Space
manager.saveMapping();
```

### Resetear a Defaults
```javascript
manager.resetToDefault();
```

### Escuchar Eventos
```javascript
const unsubscribe = manager.onKeyDown((event) => {
  console.log('Key pressed:', event.key);
});

// Cleanup
unsubscribe();
```

## Debugging

El `ArcadeInputManager` está expuesto globalmente:

```javascript
// En la consola del navegador
window.arcadeInputManager.getAllMappings()
// → { '1U': 'w', '1D': 's', ... }

window.arcadeInputManager.setMapping('1A', 'Enter')
// Cambia Button A a Enter
```

## Storage

Configuración guardada en:
- **Key**: `arcade-keyboard-mapping`
- **Formato**: JSON con códigos arcade como keys

```json
{
  "1U": "w",
  "1D": "s",
  "1L": "a",
  "1R": "d",
  "1A": "u",
  ...
}
```

## Soporte de Gamepads

El sistema detecta automáticamente:
- Gamepads estándar (Xbox, PlayStation, etc.)
- Controles arcade personalizados
- Hasta 2 gamepads simultáneos (Player 1 y 2)

**Mapeo de gamepad a códigos arcade**:
- **Ejes**: 0 (X horizontal), 1 (Y vertical)
- **Botones**: 0-11 (estándar de gamepad)
- Ver `ARCADE_TO_GAMEPAD_INDEX` en `arcadeMapping.js`

## Troubleshooting

**Problema**: El gamepad no responde  
**Solución**: Verifica que esté conectado y presiona cualquier botón para activarlo

**Problema**: Las teclas no funcionan en el juego  
**Solución**: Abre la consola y verifica que el iframe esté recibiendo eventos

**Problema**: Se perdió la configuración  
**Solución**: Verifica localStorage, key `arcade-keyboard-mapping`

---

Sistema inspirado en **arcade-input-display-mapping-sources-stripped-schema**
