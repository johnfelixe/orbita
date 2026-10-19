import {createRoot} from 'react-dom/client';
import App from './App.tsx';
import './index.css';

if (window.matchMedia('(display-mode: standalone)').matches) {
  document.documentElement.classList.add('standalone');
}

if (import.meta.env.PROD && 'serviceWorker' in navigator) {
  window.addEventListener('load', () => {
    navigator.serviceWorker.register('/sw.js').catch((error) => {
      console.warn('No se pudo registrar el service worker:', error);
    });
  });
}

createRoot(document.getElementById('root')!).render(<App />);
