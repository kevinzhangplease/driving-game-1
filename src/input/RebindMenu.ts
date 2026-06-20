import { KeyBindings, actionLabels, type ActionName } from './KeyBindings';
import type { InputManager } from './InputManager';

const CODE_LABELS: Record<string, string> = {
  Space: 'Space',
  Escape: 'Esc',
  ArrowUp: '↑',
  ArrowDown: '↓',
  ArrowLeft: '←',
  ArrowRight: '→',
};

function codeLabel(code: string): string {
  if (CODE_LABELS[code]) return CODE_LABELS[code];
  if (code.startsWith('Key')) return code.slice(3);
  if (code.startsWith('Digit')) return code.slice(5);
  return code;
}

export class RebindMenu {
  private root: HTMLDivElement;
  private bindings: KeyBindings;
  private input: InputManager;
  private listening: ActionName | null = null;
  private keydownHandler: (e: KeyboardEvent) => void;

  constructor(bindings: KeyBindings, input: InputManager) {
    this.bindings = bindings;
    this.input = input;

    this.root = document.createElement('div');
    this.root.id = 'rebind-menu';
    this.root.style.cssText = [
      'position:fixed', 'top:12px', 'right:12px', 'z-index:1000',
      'background:rgba(20,20,24,0.85)', 'color:#eee',
      'font-family:system-ui,sans-serif', 'font-size:13px',
      'padding:10px 12px', 'border-radius:8px', 'min-width:200px',
      'display:none',
    ].join(';');
    document.body.appendChild(this.root);

    this.keydownHandler = (e) => {
      if (!this.listening) return;
      e.preventDefault();
      this.bindings.rebind(this.listening, e.code);
      this.listening = null;
      this.input.setSuspended(false);
      this.render();
    };
    window.addEventListener('keydown', this.keydownHandler);

    this.render();
  }

  toggle(): void {
    const visible = this.root.style.display !== 'none';
    this.root.style.display = visible ? 'none' : 'block';
    if (visible) {
      this.listening = null;
      this.input.setSuspended(false);
    }
  }

  private render(): void {
    this.root.innerHTML = '';

    const title = document.createElement('div');
    title.textContent = 'Controls (click to rebind)';
    title.style.cssText = 'font-weight:600;margin-bottom:8px;';
    this.root.appendChild(title);

    for (const action of this.bindings.allActions()) {
      const row = document.createElement('div');
      row.style.cssText = 'display:flex;justify-content:space-between;align-items:center;margin:4px 0;gap:8px;';

      const label = document.createElement('span');
      label.textContent = actionLabels[action];
      row.appendChild(label);

      const btn = document.createElement('button');
      const codes = this.bindings.getCodes(action);
      btn.textContent =
        this.listening === action ? 'Press a key...' : codes.map(codeLabel).join(' / ') || '—';
      btn.style.cssText = [
        'background:#333', 'color:#fff', 'border:1px solid #555',
        'border-radius:4px', 'padding:3px 8px', 'cursor:pointer', 'min-width:90px',
      ].join(';');
      btn.addEventListener('click', () => {
        this.listening = action;
        this.input.setSuspended(true);
        this.render();
      });
      row.appendChild(btn);

      this.root.appendChild(row);
    }

    const resetBtn = document.createElement('button');
    resetBtn.textContent = 'Reset to defaults';
    resetBtn.style.cssText = [
      'margin-top:8px', 'width:100%', 'background:#502020', 'color:#fff',
      'border:1px solid #703030', 'border-radius:4px', 'padding:4px', 'cursor:pointer',
    ].join(';');
    resetBtn.addEventListener('click', () => {
      this.bindings.resetToDefaults();
      this.render();
    });
    this.root.appendChild(resetBtn);
  }
}
