import './lib/pwa-install';
import React, { Suspense } from 'react'
import { createRoot } from 'react-dom/client'
import { HelmetProvider } from 'react-helmet-async'
import { ThemeProvider } from 'next-themes'
import App from './App.tsx'
import './lib/i18n'
import './lib/metaPixel'
import './index.css'

const rootElement = document.getElementById("root");
if (!rootElement) throw new Error("Failed to find root element");

createRoot(rootElement).render(
  <React.StrictMode>
    <HelmetProvider>
      <ThemeProvider attribute="class" defaultTheme="dark" enableSystem storageKey="criandomusicas-theme">
        <Suspense fallback={<div role="status" aria-label="Criando Músicas" className="flex min-h-screen items-center justify-center bg-background"><img src="/icons/icon-192x192.png" width="64" height="64" alt="Criando Músicas" className="animate-pulse rounded-2xl" /></div>}>
          <App />
        </Suspense>
      </ThemeProvider>
    </HelmetProvider>
  </React.StrictMode>
);
