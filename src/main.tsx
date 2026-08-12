import {StrictMode} from 'react';
import {createRoot} from 'react-dom/client';
import App from './App.tsx';
import { CandidateProvider } from './context/CandidateContext.tsx';
import { CreditProvider } from './context/CreditContext.tsx';
import { TelemetryProvider } from './context/TelemetryContext.tsx';
import { FeatureFlagProvider } from './context/FeatureFlagContext.tsx';
import { AuthProvider } from './context/AuthContext.tsx';
import './index.css';

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <TelemetryProvider>
      <AuthProvider>
        <FeatureFlagProvider>
          <CreditProvider>
            <CandidateProvider>
              <App />
            </CandidateProvider>
          </CreditProvider>
        </FeatureFlagProvider>
      </AuthProvider>
    </TelemetryProvider>
  </StrictMode>,
);



