import React from 'react'
import ReactDOM from 'react-dom/client'
import App from './App.jsx'
import { ToastProvider } from './components/Common/Toast.jsx'
import './global.css'
import './index.css'

const reportClientError = async (err) => {
  try {
    await fetch('/api/client-error', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(err || {}),
    });
  } catch (e) {
    // ignore
    console.error('Failed to report client error', e);
  }
  console.error('Client Error:', err);
};

const renderFallback = (err) => {
  const root = document.getElementById('root');
  if (!root) return;
  root.innerHTML = `
    <div style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial; padding:24px; color:#111">
      <h2>Application Error</h2>
      <pre style="white-space:pre-wrap; background:#fff; padding:12px; border-radius:8px; border:1px solid #eee;">${String(err?.message || err)}</pre>
      <p>Please check the DevTools console or send the error log to the backend.</p>
    </div>
  `;
};

window.onerror = function (message, source, lineno, colno, error) {
  const info = { message, source, lineno, colno, stack: error?.stack };
  reportClientError(info);
  renderFallback(info);
};

window.onunhandledrejection = function (event) {
  const reason = event?.reason;
  const info = { message: reason?.message || String(reason), stack: reason?.stack };
  reportClientError(info);
  renderFallback(info);
};

try {
  ReactDOM.createRoot(document.getElementById('root')).render(
    <React.StrictMode>
      <ToastProvider>
        <App />
      </ToastProvider>
    </React.StrictMode>,
  );
} catch (err) {
  reportClientError({ message: err.message, stack: err.stack });
  renderFallback(err);
}
