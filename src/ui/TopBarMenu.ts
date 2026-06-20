import './topbar.css';

// Always-visible top-right buttons so the world settings panel and key
// binding menu can be opened by clicking/tapping, not just via keyboard
// shortcuts (P / Escape).
export class TopBarMenu {
  constructor(onOpenSettings: () => void, onOpenControls: () => void) {
    const root = document.createElement('div');
    root.id = 'topbar-menu';

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

    root.append(controlsBtn, settingsBtn);
    document.body.appendChild(root);
  }
}
