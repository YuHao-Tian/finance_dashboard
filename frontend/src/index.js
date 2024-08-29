import React from 'react';
import { createRoot } from 'react-dom/client';
import Appp from './App.js';  // This assumes App.js is in the same directory as index.js
import { AuthProvider } from './context/AuthContext.js';

// Find the root element in the DOM
const container = document.getElementById('root');

// Create a root using React 18's createRoot method
const root = createRoot(container);

// Render the app with the AuthProvider context
root.render(
  <AuthProvider>
    <Appp />

  </AuthProvider>
);
