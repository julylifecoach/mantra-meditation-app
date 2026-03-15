import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import { GoogleOAuthProvider } from '@react-oauth/google';
import './index.css';
import App from './App.jsx';

console.log(`%c Practice App %c Built: ${__BUILD_TIME__} `, 'background:#6366f1;color:#fff;font-weight:bold;padding:2px 6px;border-radius:4px 0 0 4px', 'background:#1e1e2e;color:#a5b4fc;padding:2px 6px;border-radius:0 4px 4px 0');

// User provided Google Client ID
const GOOGLE_CLIENT_ID = "1088786585047-620c44idvagk11in42akoueij6h7n1fd.apps.googleusercontent.com";

createRoot(document.getElementById('root')).render(
  <StrictMode>
    <GoogleOAuthProvider clientId={GOOGLE_CLIENT_ID}>
      <App />
    </GoogleOAuthProvider>
  </StrictMode>,
);
