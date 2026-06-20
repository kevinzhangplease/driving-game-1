import { SettingsStore } from '../SettingsStore';
import { allParams } from '../ParameterDefs';
import { categoryLabels, type ParamCategory, type ParamDef } from '../ParameterRegistry';
import './settings.css';

const CATEGORIES = Object.keys(categoryLabels) as ParamCategory[];

// Vanilla-DOM, category-tabbed, searchable overlay for the full parameter
// roster. Built once; only the active category's widgets are rendered, so
// adding more stub params later doesn't cost anything until that tab opens.
export class SettingsPanel {
  private store: SettingsStore;
  private root: HTMLDivElement;
  private tabsEl: HTMLDivElement;
  private searchEl: HTMLInputElement;
  private listEl: HTMLDivElement;
  private activeCategory: ParamCategory = CATEGORIES[0]!;
  private searchQuery = '';
  private visible = false;

  constructor(store: SettingsStore) {
    this.store = store;
    this.root = document.createElement('div');
    this.root.id = 'settings-panel';
    this.root.classList.add('hidden');

    const header = document.createElement('div');
    header.className = 'settings-header';
    const title = document.createElement('h2');
    title.textContent = 'World Settings';
    this.searchEl = document.createElement('input');
    this.searchEl.type = 'text';
    this.searchEl.placeholder = 'Search parameters...';
    this.searchEl.addEventListener('input', () => {
      this.searchQuery = this.searchEl.value.toLowerCase();
      this.renderList();
    });
    header.append(title, this.searchEl);

    this.tabsEl = document.createElement('div');
    this.tabsEl.className = 'settings-tabs';

    this.listEl = document.createElement('div');
    this.listEl.className = 'settings-list';

    this.root.append(header, this.tabsEl, this.listEl);
    document.body.appendChild(this.root);

    this.renderTabs();
    this.renderList();
  }

  private renderTabs(): void {
    this.tabsEl.innerHTML = '';
    for (const category of CATEGORIES) {
      const btn = document.createElement('button');
      btn.textContent = categoryLabels[category];
      btn.className = category === this.activeCategory ? 'active' : '';
      btn.addEventListener('click', () => {
        this.activeCategory = category;
        this.renderTabs();
        this.renderList();
      });
      this.tabsEl.appendChild(btn);
    }
  }

  private renderList(): void {
    this.listEl.innerHTML = '';
    const defs = allParams.filter((def) => {
      if (this.searchQuery) return def.label.toLowerCase().includes(this.searchQuery);
      return def.category === this.activeCategory;
    });

    for (const def of defs) {
      this.listEl.appendChild(this.renderWidget(def));
    }
  }

  private renderWidget(def: ParamDef): HTMLDivElement {
    const row = document.createElement('div');
    row.className = 'settings-row';
    if (!def.wired) row.classList.add('unwired');

    const labelEl = document.createElement('label');
    labelEl.textContent = def.label;
    labelEl.title = def.tooltip;
    row.appendChild(labelEl);

    const value = this.store.get(def.id);

    if (def.widget === 'toggle') {
      const input = document.createElement('input');
      input.type = 'checkbox';
      input.checked = Boolean(value);
      input.addEventListener('change', () => this.store.set(def.id, input.checked));
      row.appendChild(input);
    } else if (def.widget === 'select') {
      const select = document.createElement('select');
      for (const opt of def.options ?? []) {
        const optionEl = document.createElement('option');
        optionEl.value = opt.value;
        optionEl.textContent = opt.label;
        optionEl.selected = opt.value === value;
        select.appendChild(optionEl);
      }
      select.addEventListener('change', () => this.store.set(def.id, select.value));
      row.appendChild(select);
    } else {
      const slider = document.createElement('input');
      slider.type = 'range';
      slider.min = String(def.min ?? 0);
      slider.max = String(def.max ?? 1);
      slider.step = String(def.step ?? 0.01);
      slider.value = String(value);
      const valueLabel = document.createElement('span');
      valueLabel.className = 'settings-value';
      valueLabel.textContent = String(value);
      slider.addEventListener('input', () => {
        valueLabel.textContent = slider.value;
        this.store.set(def.id, Number(slider.value));
      });
      row.append(slider, valueLabel);
    }

    return row;
  }

  toggle(): void {
    this.visible = !this.visible;
    this.root.classList.toggle('hidden', !this.visible);
  }

  isVisible(): boolean {
    return this.visible;
  }
}
