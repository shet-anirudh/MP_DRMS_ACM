import React from 'react';
import ReactDOM from 'react-dom/client';
import App from './App.jsx';
import './index.css';

// jeep-sqlite web fallback — required for @capacitor-community/sqlite in the browser.
// On native Android this import is a no-op.
import { defineCustomElements as jeepSqlite } from 'jeep-sqlite/loader';
jeepSqlite(window);

ReactDOM.createRoot(document.getElementById('root')).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>,
);
