import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import { App } from '@app/App';
import { I18nProvider } from '@app/i18n/i18n';
// Side-effect: load + apply stored appearance prefs (accent/motion/spoilers).
import '@app/tweaks/useTweaks';
import '@app/styles/app.css';
import '@app/styles/extra.css';

const rootElement = document.getElementById('root');
if (rootElement) {
  createRoot(rootElement).render(
    <StrictMode>
      <I18nProvider>
        <App />
      </I18nProvider>
    </StrictMode>,
  );
}
