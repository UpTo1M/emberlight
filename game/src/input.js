// Emberlight — keyboard and mouse input. The ember answers WASD or the
// arrow keys, and holding the mouse button drifts it toward the cursor.
// Keys are tracked as a set so diagonal movement feels right.
export function createInput(canvas) {
  const keys = new Set();
  let mouseDown = false;
  let mouseX = 0;
  let mouseY = 0;
  let mouseInside = false;

  function keyName(event) {
    const k = event.key;
    if (k === 'ArrowUp' || k === 'ArrowDown' || k === 'ArrowLeft' || k === 'ArrowRight') return k;
    return k.length === 1 ? k.toLowerCase() : k;
  }

  function onKeyDown(event) {
    const k = keyName(event);
    if (['ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight', ' '].includes(event.key)) {
      event.preventDefault();
    }
    if (!event.repeat) keys.add(k);
  }

  function onKeyUp(event) {
    keys.delete(keyName(event));
  }

  function onBlur() {
    keys.clear();
    mouseDown = false;
  }

  function updateMouse(event) {
    const rect = canvas.getBoundingClientRect();
    mouseX = ((event.clientX - rect.left) / rect.width) * canvas.width;
    mouseY = ((event.clientY - rect.top) / rect.height) * canvas.height;
  }

  function onMouseMove(event) {
    updateMouse(event);
    mouseInside = true;
  }

  function onMouseDown(event) {
    updateMouse(event);
    mouseDown = true;
    mouseInside = true;
  }

  function onMouseUp() {
    mouseDown = false;
  }

  function onMouseLeave() {
    mouseInside = false;
    mouseDown = false;
  }

  window.addEventListener('keydown', onKeyDown);
  window.addEventListener('keyup', onKeyUp);
  window.addEventListener('blur', onBlur);
  canvas.addEventListener('mousemove', onMouseMove);
  canvas.addEventListener('mousedown', onMouseDown);
  window.addEventListener('mouseup', onMouseUp);
  canvas.addEventListener('mouseleave', onMouseLeave);

  return {
    // A unit movement vector from the keys, or null when no key is held.
    keyVector() {
      let x = 0;
      let y = 0;
      if (keys.has('a') || keys.has('ArrowLeft')) x -= 1;
      if (keys.has('d') || keys.has('ArrowRight')) x += 1;
      if (keys.has('w') || keys.has('ArrowUp')) y -= 1;
      if (keys.has('s') || keys.has('ArrowDown')) y += 1;
      if (x === 0 && y === 0) return null;
      const len = Math.hypot(x, y);
      return { x: x / len, y: y / len };
    },
    get mouseActive() {
      return mouseDown && mouseInside;
    },
    get mouse() {
      return { x: mouseX, y: mouseY };
    },
    // True only on the frame the key went down (for menus and toggles).
    pressed(key) {
      return keys.has(key);
    },
    // Consume a key so a menu press does not repeat.
    consume(key) {
      keys.delete(key);
    },
    destroy() {
      window.removeEventListener('keydown', onKeyDown);
      window.removeEventListener('keyup', onKeyUp);
      window.removeEventListener('blur', onBlur);
      canvas.removeEventListener('mousemove', onMouseMove);
      canvas.removeEventListener('mousedown', onMouseDown);
      window.removeEventListener('mouseup', onMouseUp);
      canvas.removeEventListener('mouseleave', onMouseLeave);
    },
  };
}
