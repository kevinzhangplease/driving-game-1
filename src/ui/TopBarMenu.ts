import './topbar.css';

// Always-visible top-right buttons so the world settings panel, key
// bindings menu, and camera view can all be changed by clicking/tapping,
// not just via keyboard shortcuts (P / Escape / C).
export class TopBarMenu {
  private cameraBtn: HTMLButtonElement;

  constructor(onOpenSettings: () => void, onOpenControls: () => void, onCycleCamera: () => void) {
    const root = document.createElement('div');
    root.id = 'topbar-menu';

    this.cameraBtn = document.createElement('button');
    this.cameraBtn.className = 'topbar-btn';
    this.cameraBtn.textContent = '📷';
    this.cameraBtn.setAttribute('aria-label', 'Cycle camera view');
    this.cameraBtn.title = 'Camera View';
    this.cameraBtn.addEventListener('click', onCycleCamera);

    const controlsBtn = document.createElement('button');
    controlsBtn.className = 'topbar-btn';
    controlsBtn.textContent = '⌨';
    controlsBtn.setAttribute('aria-label', 'Open key bindings');
    controlsBtn.title = 'Key Bindings';
    controlsBtn.addEventListener('click', onOpenControls);

    const settingsBtn = document.createElement('button');
    settingsBtn.className = 'topbar-btn';
    settingsBtn.textContent = '⚙';
    settingsBtn.setAttribute('aria-label', 'Open world settings');
    settingsBtn.title = 'World Settings';
    settingsBtn.addEventListener('click', onOpenSettings);

    root.append(this.cameraBtn, controlsBtn, settingsBtn);
    document.body.appendChild(root);
  }

  setCameraLabel(label: string): void {
    this.cameraBtn.title = `Camera: ${label}`;
  }
}
