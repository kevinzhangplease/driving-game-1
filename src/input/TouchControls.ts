import './touch-controls.css';

export type TouchAction = 'throttle' | 'brake' | 'steerLeft' | 'steerRight';

// On-screen buttons mirroring the throttle/brake/steer keyboard actions, for
// mobile/touch devices. Hidden via CSS on devices with a fine pointer (mouse)
// so desktop play is unaffected. Pointer events (not touch events) are used
// so the same buttons also work with a mouse during testing.
export class TouchControls {
  private held = new Set<TouchAction>();

  constructor() {
    const root = document.createElement('div');
    root.id = 'touch-controls';

    const steerGroup = document.createElement('div');
    steerGroup.className = 'touch-group touch-steer';
    steerGroup.append(
      this.makeButton('steerLeft', '◀'),
      this.makeButton('steerRight', '▶'),
    );

    const driveGroup = document.createElement('div');
    driveGroup.className = 'touch-group touch-drive';
    driveGroup.append(
      this.makeButton('brake', '▼'),
      this.makeButton('throttle', '▲'),
    );

    root.append(steerGroup, driveGroup);
    document.body.appendChild(root);
  }

  private makeButton(action: TouchAction, label: string): HTMLButtonElement {
    const btn = document.createElement('button');
    btn.className = `touch-btn touch-btn-${action}`;
    btn.textContent = label;
    btn.setAttribute('aria-label', action);

    const press = (e: PointerEvent) => {
      e.preventDefault();
      btn.setPointerCapture(e.pointerId);
      this.held.add(action);
      btn.classList.add('active');
    };
    const release = (e: PointerEvent) => {
      e.preventDefault();
      this.held.delete(action);
      btn.classList.remove('active');
    };

    btn.addEventListener('pointerdown', press);
    btn.addEventListener('pointerup', release);
    btn.addEventListener('pointercancel', release);
    btn.addEventListener('contextmenu', (e) => e.preventDefault());

    return btn;
  }

  isHeld(action: TouchAction): boolean {
    return this.held.has(action);
  }
}
