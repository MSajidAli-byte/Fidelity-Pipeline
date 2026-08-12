import React, { createContext, useContext, useEffect, useState } from 'react';
import { initializePaddle, Paddle } from '@paddle/paddle-js';

interface PaddleContextType {
  paddle: Paddle | undefined;
  loading: boolean;
}

const PaddleContext = createContext<PaddleContextType | undefined>(undefined);

export const PaddleProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [paddle, setPaddle] = useState<Paddle | undefined>();
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const paddleClientSideToken = process.env.REACT_APP_PADDLE_CLIENT_TOKEN;

    if (paddleClientSideToken) {
      initializePaddle({
        token: paddleClientSideToken,
        environment: paddleClientSideToken.startsWith('test_') ? 'sandbox' : 'production',
      }).then((paddleInstance: Paddle | undefined) => {
        setPaddle(paddleInstance);
        setLoading(false);
      });
    } else {
      console.warn("Paddle client-side token is not configured. Paddle.js will not be initialized.");
      setLoading(false);
    }
  }, []);

  return (
    <PaddleContext.Provider value={{ paddle, loading }}>
      {children}
    </PaddleContext.Provider>
  );
};

export const usePaddle = (): PaddleContextType => {
  const context = useContext(PaddleContext);
  if (!context) {
    throw new Error('usePaddle must be used within a PaddleProvider');
  }
  return context;
};