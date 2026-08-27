import {StrictMode} from 'react';
import {createRoot} from 'react-dom/client';
import App from './App.tsx';
import './index.css';

// Register Service Worker for PWA offline capabilities and installation
if ('serviceWorker' in navigator && process.env.NODE_ENV === 'production') {
  window.addEventListener('load', () => {
    navigator.serviceWorker
      .register('/sw.js')
      .then((registration) => {
        console.log('Permis Mali ServiceWorker enregistré avec succès :', registration.scope);
      })
      .catch((error) => {
        console.warn('Échec de l\'enregistrement du ServiceWorker :', error);
      });
  });
} else if ('serviceWorker' in navigator) {
  // Register in dev for testing installability criteria
  window.addEventListener('load', () => {
    navigator.serviceWorker
      .register('/sw.js')
      .catch(() => {
        // Silent fallback in dev sandbox
      });
  });
}

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <App />
  </StrictMode>,
);

