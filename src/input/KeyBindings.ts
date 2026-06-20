export type ActionName =
  | 'throttle'
  | 'brake'
  | 'steerLeft'
  | 'steerRight'
  | 'handbrake'
  | 'cameraToggle'
  | 'openSettings';

export type KeyBindingMap = Record<ActionName, string[]>;

const STORAGE_KEY = 'dg_keybindings_v1';

export const defaultKeyBindings: KeyBindingMap = {
  throttle: ['KeyW', 'ArrowUp'],
  brake: ['KeyS', 'ArrowDown'],
  steerLeft: ['KeyA', 'ArrowLeft'],
  steerRight: ['KeyD', 'ArrowRight'],
  handbrake: ['Space'],
  cameraToggle: ['KeyC'],
  openSettings: ['Escape'],
};

export const actionLabels: Record<ActionName, string> = {
  throttle: 'Throttle',
  brake: 'Brake / Reverse',
  steerLeft: 'Steer Left',
  steerRight: 'Steer Right',
  handbrake: 'Handbrake',
  cameraToggle: 'Toggle Camera',
  openSettings: 'Open Settings',
};

function cloneDefaults(): KeyBindingMap {
  const copy = {} as KeyBindingMap;
  for (const action of Object.keys(defaultKeyBindings) as ActionName[]) {
    copy[action] = [...defaultKeyBindings[action]];
  }
  return copy;
}

export class KeyBindings {
  private bindings: KeyBindingMap;

  constructor() {
    this.bindings = this.load();
  }

  private load(): KeyBindingMap {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return cloneDefaults();
    try {
      const parsed = JSON.parse(raw) as Partial<KeyBindingMap>;
      const merged = cloneDefaults();
      for (const action of Object.keys(merged) as ActionName[]) {
        if (Array.isArray(parsed[action])) {
          merged[action] = parsed[action] as string[];
        }
      }
      return merged;
    } catch {
      return cloneDefaults();
    }
  }

  private persist(): void {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(this.bindings));
  }

  getCodes(action: ActionName): string[] {
    return this.bindings[action];
  }

  setCodes(action: ActionName, codes: string[]): void {
    this.bindings[action] = codes;
    this.persist();
  }

  rebind(action: ActionName, code: string): void {
    this.bindings[action] = [code];
    this.persist();
  }

  resetToDefaults(): void {
    this.bindings = cloneDefaults();
    this.persist();
  }

  allActions(): ActionName[] {
    return Object.keys(this.bindings) as ActionName[];
  }
}
