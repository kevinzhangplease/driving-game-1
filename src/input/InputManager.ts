import type { ActionName, KeyBindings } from './KeyBindings';

export class InputManager {
  private held = new Set<string>();
  private suspended = false;

  constructor() {
    window.addEventListener('keydown', (e) => {
      if (this.suspended) return;
      this.held.add(e.code);
    });
    window.addEventListener('keyup', (e) => this.held.delete(e.code));
  }

  isCodeHeld(code: string): boolean {
    return this.held.has(code);
  }

  isAnyHeld(codes: string[]): boolean {
    return codes.some((c) => this.held.has(c));
  }

  isActionHeld(bindings: KeyBindings, action: ActionName): boolean {
    return this.isAnyHeld(bindings.getCodes(action));
  }

  // While a rebind UI is capturing a keypress, ignore normal game input so
  // the key used for rebinding doesn't also register as a held control.
  setSuspended(suspended: boolean): void {
    this.suspended = suspended;
    if (suspended) this.held.clear();
  }
}
