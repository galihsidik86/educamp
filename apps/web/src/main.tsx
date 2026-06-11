import React from 'react';
import ReactDOM from 'react-dom/client';
import { BrowserRouter } from 'react-router-dom';
import { QueryClientProvider } from '@tanstack/react-query';
import { App } from './App';
import { queryClient } from './lib/queryClient';
import { AuthProvider } from './lib/auth';

// Design system — imported via vite alias `@ds` (root of repo)
import '@ds/tokens/fonts.css';
import '@ds/tokens/colors.css';
import '@ds/tokens/typography.css';
import '@ds/tokens/spacing.css';
import '@ds/tokens/elevation.css';
import '@ds/tokens/base.css';
import '@ds/components/components.css';
import './styles/app.css';

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <QueryClientProvider client={queryClient}>
      <BrowserRouter>
        <AuthProvider>
          <App />
        </AuthProvider>
      </BrowserRouter>
    </QueryClientProvider>
  </React.StrictMode>,
);
