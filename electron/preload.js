window.addEventListener('DOMContentLoaded', () => {
  const splash = document.createElement('div');
  splash.id = 'watchtv-splash';
  splash.innerHTML = `
    <style>
      #watchtv-splash {
        position: fixed;
        inset: 0;
        z-index: 999999;
        display: flex;
        flex-direction: column;
        align-items: center;
        justify-content: center;
        background: #0e0e16;
        gap: 16px;
        transition: opacity 0.5s ease;
      }
      #watchtv-splash.fade-out {
        opacity: 0;
        pointer-events: none;
      }
      #watchtv-splash h1 {
        font-family: 'Outfit', system-ui, sans-serif;
        font-size: 2.5rem;
        font-weight: 800;
        background: linear-gradient(135deg, #a855f7, #7c3aed, #6d28d9);
        -webkit-background-clip: text;
        -webkit-text-fill-color: transparent;
        margin: 0;
      }
      #watchtv-splash p {
        color: rgba(255,255,255,0.4);
        font-family: 'Outfit', system-ui, sans-serif;
        font-size: 0.9rem;
        margin: 0;
      }
      @keyframes spin-loader {
        to { transform: rotate(360deg); }
      }
      #watchtv-splash .loader {
        width: 28px;
        height: 28px;
        border: 3px solid rgba(168, 85, 247, 0.2);
        border-top-color: #a855f7;
        border-radius: 50%;
        animation: spin-loader 0.8s linear infinite;
      }
    </style>
    <h1>WatchTV</h1>
    <div class="loader"></div>
    <p>Loading your streams...</p>
  `;
  document.body.prepend(splash);

  window.addEventListener('load', () => {
    setTimeout(() => {
      splash.classList.add('fade-out');
      setTimeout(() => splash.remove(), 600);
    }, 800);
  });
});

const { contextBridge, ipcRenderer } = require('electron');

contextBridge.exposeInMainWorld('electronAPI', {
  onBlockedAd: (callback) => ipcRenderer.on('blocked-ad', (_event, count) => callback(count)),
  updatePresence: (details) => ipcRenderer.send('update-presence', details),
});

