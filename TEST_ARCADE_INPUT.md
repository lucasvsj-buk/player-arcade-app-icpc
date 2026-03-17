# 🧪 Guía de Prueba - Sistema de Input Arcade

## Cambios Realizados

### 1. **ArcadeInputManager**
- ✅ Ya NO re-despacha eventos de teclado físico (evita duplicados)
- ✅ Solo despacha eventos sintéticos del gamepad
- ✅ Logging: `🎮 Gamepad → keydown: w (KeyW)`

### 2. **GameModal**
- ✅ Captura TODOS los eventos (teclado físico + sintéticos del gamepad)
- ✅ Reenvía al iframe vía postMessage
- ✅ Logging: `📤 Forwarding keydown to iframe: w (KeyW)`

### 3. **Iframe**
- ✅ Recibe eventos y los despacha en su documento
- ✅ Logging: `📥 Iframe received: keydown w` → `✅ Iframe dispatched: keydown w`

## Flujo de Eventos

```
TECLADO FÍSICO:
Usuario presiona 'W'
    ↓
Navegador genera KeyboardEvent
    ↓
GameModal captura evento
    ↓
GameModal.setupKeyboardForwarding() → postMessage al iframe
    ↓
Iframe recibe mensaje y despacha KeyboardEvent sintético
    ↓
Juego en iframe recibe evento 'w'

GAMEPAD FÍSICO:
Usuario mueve joystick arriba
    ↓
ArcadeInputManager.pollGamepads() detecta eje Y = -1
    ↓
Mapea código '1U' → tecla 'w' (según mapeo)
    ↓
ArcadeInputManager.dispatchKeyEvent() despacha KeyboardEvent sintético
    ↓
GameModal captura evento sintético
    ↓
GameModal.setupKeyboardForwarding() → postMessage al iframe
    ↓
Iframe recibe mensaje y despacha KeyboardEvent sintético
    ↓
Juego en iframe recibe evento 'w'
```

## Pasos de Prueba

### 🧪 Test 1: Verificar Carga del Sistema

1. Abre http://localhost:3002
2. Abre la **Consola del Navegador** (F12)
3. Escribe: `window.arcadeInputManager`
4. **Resultado esperado**: Debe mostrar el objeto ArcadeInputManager

### 🎹 Test 2: Teclado Físico

1. Haz clic en cualquier juego para abrirlo
2. **Observa la consola** - deberías ver logs
3. Presiona tecla **W**
4. **En consola debes ver**:
   ```
   📤 Forwarding keydown to iframe: w (KeyW)
   📥 Iframe received: keydown w
   ✅ Iframe dispatched: keydown w
   ```
5. **En el juego**: El personaje/control debe moverse

### 🎮 Test 3: Gamepad Físico

1. **Conecta un gamepad** (Xbox, PlayStation, arcade stick)
2. Abre un juego
3. **Mueve el joystick o presiona botones**
4. **En consola debes ver**:
   ```
   🎮 Gamepad → keydown: w (KeyW)
   📤 Forwarding keydown to iframe: w (KeyW)
   📥 Iframe received: keydown w
   ✅ Iframe dispatched: keydown w
   ```
5. **En el juego**: Debe responder a los controles del gamepad

### ⚙️ Test 4: Configuración de Mapeo

1. Ve a **CONFIGURE CONTROLS**
2. Haz clic en **CHANGE** al lado de "P1 ↑ Up"
3. Presiona una tecla diferente (ej: 'E')
4. **En consola debes ver**:
   ```
   🕹️ Mapeando 1U → e
   ```
5. Abre un juego y presiona 'E' (o mueve joystick arriba con gamepad)
6. **Debe funcionar como la tecla UP ahora**

## Debugging

### Si NO ves eventos en la consola:

**Problema**: ArcadeInputManager no está inicializado
```javascript
// En consola:
window.arcadeInputManager
// Si es undefined, recarga la página
```

**Problema**: GameModal no captura eventos
```javascript
// Verifica que el modal esté abierto
document.querySelector('.game-modal-overlay')
// Debe devolver el elemento del modal
```

### Si ves eventos en parent pero NO en iframe:

**Problema**: postMessage no llega
```javascript
// En consola del iframe (cambiar contexto en DevTools):
window.addEventListener('message', e => console.log('Message:', e.data))
```

### Si el gamepad NO detecta:

**Problema**: Gamepad no está activo
```javascript
// En consola:
navigator.getGamepads()
// Debe mostrar array con tu gamepad (presiona un botón para activarlo)
```

## Mapeo por Defecto

| Control | Player 1 | Player 2 |
|---------|----------|----------|
| Up | W | ↑ |
| Down | S | ↓ |
| Left | A | ← |
| Right | D | → |
| Button A | U | R |
| Button B | I | T |
| Button C | O | Y |
| Button X | J | F |
| Button Y | K | G |
| Button Z | L | H |
| Start | 1 | 2 |
| Coin | 8 | 9 |

## Logs de Depuración

Con los cambios actuales, deberías ver:

```
// Cuando presionas teclado:
📤 Forwarding keydown to iframe: w (KeyW)
📥 Iframe received: keydown w
✅ Iframe dispatched: keydown w

// Cuando usas gamepad:
🎮 Gamepad → keydown: w (KeyW)
📤 Forwarding keydown to iframe: w (KeyW)
📥 Iframe received: keydown w
✅ Iframe dispatched: keydown w

// Cuando configuras:
🕹️ Mapeando 1U → e
```

## ¿Qué Hacer Si Falla?

1. **Comparte los logs de consola** - tanto del parent como del iframe
2. **Indica qué input usaste** - teclado o gamepad
3. **Menciona en qué paso falló** - ¿forwarding? ¿recepción en iframe?

---

**Estado actual**: Sistema implementado con logging completo para diagnóstico.
