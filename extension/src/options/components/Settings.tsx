import React, { useState, useEffect } from 'react';

export function Settings() {
  const [serverUrl, setServerUrl] = useState('http://localhost:8080');
  const [authToken, setAuthToken] = useState('');
  const [saved, setSaved] = useState(false);

  useEffect(() => {
    chrome.storage.sync.get(['serverUrl', 'authToken'], (result) => {
      if (result.serverUrl) setServerUrl(result.serverUrl);
      if (result.authToken) setAuthToken(result.authToken);
    });
  }, []);

  const handleSave = () => {
    chrome.storage.sync.set({ serverUrl, authToken }, () => {
      setSaved(true);
      setTimeout(() => setSaved(false), 3000);
    });
  };

  return (
    <div className="settings-container">
      <h2>Extension Settings</h2>

      <div className="form-section">
        <label>Backend Server URL</label>
        <input
          type="url"
          value={serverUrl}
          onChange={(e) => setServerUrl(e.target.value)}
          placeholder="http://localhost:8080"
        />
        <small>URL of your DevaDoot backend server</small>
      </div>

      <div className="form-section">
        <label>Authentication Token</label>
        <input
          type="password"
          value={authToken}
          onChange={(e) => setAuthToken(e.target.value)}
          placeholder="Bearer token"
        />
        <small>Optional: Bearer token for API authentication</small>
      </div>

      <button className="save-btn" onClick={handleSave}>
        Save Settings
      </button>

      {saved && <div className="success-message">Settings saved!</div>}

      <div className="info-section">
        <h3>About DevaDoot</h3>
        <p>Version: 1.0.0</p>
        <p>
          DevaDoot continuously monitors websites and invokes agents based on
          natural language rules. Configure your agents above to get started.
        </p>
      </div>
    </div>
  );
}
