import { useState, useEffect } from 'react';

export function Settings() {
  const [serverUrl, setServerUrl] = useState('http://localhost:8080');
  const [authToken, setAuthToken] = useState('');
  const [mode, setMode] = useState<'api' | 'dummy'>('dummy');
  const [saved, setSaved] = useState(false);

  useEffect(() => {
    chrome.storage.sync.get(['serverUrl', 'authToken', 'mode'], (result) => {
      if (result.serverUrl) setServerUrl(result.serverUrl);
      if (result.authToken) setAuthToken(result.authToken);
      if (result.mode) setMode(result.mode);
      else setMode('dummy'); // Default to dummy mode
    });
  }, []);

  const handleSave = () => {
    chrome.storage.sync.set({ serverUrl, authToken, mode }, () => {
      setSaved(true);
      setTimeout(() => setSaved(false), 3000);
    });
  };

  return (
    <div className="settings-container">
      <h2>Extension Settings</h2>

      <div className="form-section">
        <label>Extension Mode</label>
        <div className="radio-group">
          <label>
            <input
              type="radio"
              checked={mode === 'api'}
              onChange={() => setMode('api')}
            />
            API Mode
            <small style={{ display: 'block', marginLeft: '24px', marginTop: '4px' }}>
              Connect to backend server for real data
            </small>
          </label>
          <label>
            <input
              type="radio"
              checked={mode === 'dummy'}
              onChange={() => setMode('dummy')}
            />
            Dummy Mode
            <small style={{ display: 'block', marginLeft: '24px', marginTop: '4px' }}>
              Use demo data without server connection (for demo purposes)
            </small>
          </label>
        </div>
      </div>

      <div className="form-section">
        <label>Backend Server URL</label>
        <input
          type="url"
          value={serverUrl}
          onChange={(e) => setServerUrl(e.target.value)}
          placeholder="http://localhost:8080"
          disabled={mode === 'dummy'}
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
          disabled={mode === 'dummy'}
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
