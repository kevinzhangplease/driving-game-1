export class InputManager {
  private held = new Set<string>();

  constructor() {
    window.addEventListener('keydown', (e) => this.held.add(e.code));
    window.addEventListener('keyup', (e) => this.held.delete(e.code));
  }

  isCodeHeld(code: string): boolean {
    return this.held.has(code);
  }

  isAnyHeld(codes: string[]): boolean {
    return codes.some((c) => this.held.has(c));
  }
}
