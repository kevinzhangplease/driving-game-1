import type { ParamDef, ParamValue } from './ParameterRegistry';

const STORAGE_KEY = 'dg_settings_v1';

type Listener = (id: string, value: ParamValue) => void;

// Holds live values for every declared parameter, persisted to localStorage
// and broadcast to subscribers (debounced by the caller, e.g. while dragging
// a slider) so generation systems can react to changes.
export class SettingsStore {
  private values = new Map<string, ParamValue>();
  private listeners = new Set<Listener>();
  private byId = new Map<string, ParamDef>();

  constructor(registry: ParamDef[]) {
    for (const def of registry) {
      this.byId.set(def.id, def);
      this.values.set(def.id, def.defaultValue);
    }
    this.load();
  }

  private load(): void {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return;
    try {
      const parsed = JSON.parse(raw) as Record<string, ParamValue>;
      for (const [id, value] of Object.entries(parsed)) {
        if (this.byId.has(id)) this.values.set(id, value);
      }
    } catch {
      // Ignore corrupt persisted settings; defaults remain in place.
    }
  }

  private persist(): void {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(Object.fromEntries(this.values)));
  }

  get(id: string): ParamValue {
    const value = this.values.get(id);
    if (value === undefined) throw new Error(`Unknown setting: ${id}`);
    return value;
  }

  getNumber(id: string): number {
    return this.get(id) as number;
  }

  getBoolean(id: string): boolean {
    return this.get(id) as boolean;
  }

  getString(id: string): string {
    return this.get(id) as string;
  }

  set(id: string, value: ParamValue): void {
    this.values.set(id, value);
    this.persist();
    for (const listener of this.listeners) listener(id, value);
  }

  resetToDefault(id: string): void {
    const def = this.byId.get(id);
    if (def) this.set(id, def.defaultValue);
  }

  onChange(listener: Listener): () => void {
    this.listeners.add(listener);
    return () => this.listeners.delete(listener);
  }

  def(id: string): ParamDef | undefined {
    return this.byId.get(id);
  }
}
