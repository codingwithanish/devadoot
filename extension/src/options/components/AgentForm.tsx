import React, { useState, useEffect } from 'react';
import type { AgentConfig, MarketplaceAgent } from '@/types';
import { validateAgentConfig, validateUrlPattern } from '@/lib/rules';
import { parseRuleNLtoJSON, aiAvailable } from '@/lib/ai';
import { apiClient } from '@/bg/api-client';

interface AgentFormProps {
  agent: AgentConfig;
  onUpdate: (agent: AgentConfig) => Promise<void>;
}

export function AgentForm({ agent, onUpdate }: AgentFormProps) {
  const [formData, setFormData] = useState<AgentConfig>(agent);
  const [marketplaceAgents, setMarketplaceAgents] = useState<MarketplaceAgent[]>([]);
  const [siteInput, setSiteInput] = useState('');
  const [patternInput, setPatternInput] = useState('');
  const [errors, setErrors] = useState<string[]>([]);
  const [hasAI, setHasAI] = useState(false);
  const [saving, setSaving] = useState(false);

  // Check for AI availability
  useEffect(() => {
    aiAvailable().then(setHasAI);
  }, []);

  // Update form when agent changes
  useEffect(() => {
    setFormData(agent);
  }, [agent]);

  // Load marketplace agents
  useEffect(() => {
    const loadMarketplaceAgents = async () => {
      try {
        await apiClient.init();
        const agents = await apiClient.getMarketplaceAgents();
        setMarketplaceAgents(agents);
      } catch (error) {
        console.error('Failed to load marketplace agents:', error);
        // Fallback to empty array if API fails
        setMarketplaceAgents([]);
      }
    };

    loadMarketplaceAgents();
  }, []);

  const handleChange = (field: keyof AgentConfig, value: any) => {
    const updated = { ...formData, [field]: value };
    setFormData(updated);
  };

  const handleCollectorChange = (collector: string, value: boolean) => {
    const updated = {
      ...formData,
      collectors: {
        ...formData.collectors,
        [collector]: value,
      },
    };
    setFormData(updated);
  };

  const handleAddSite = () => {
    if (siteInput.trim()) {
      const sites = [...formData.sites, siteInput.trim()];
      handleChange('sites', sites);
      setSiteInput('');
    }
  };

  const handleRemoveSite = (index: number) => {
    const sites = formData.sites.filter((_, i) => i !== index);
    handleChange('sites', sites);
  };

  const handleAddPattern = () => {
    if (patternInput.trim()) {
      const validation = validateUrlPattern(patternInput.trim());
      if (!validation.valid) {
        alert(`Invalid regex pattern: ${validation.error}`);
        return;
      }

      const patterns = [...formData.urlPatterns, patternInput.trim()];
      handleChange('urlPatterns', patterns);
      setPatternInput('');
    }
  };

  const handleRemovePattern = (index: number) => {
    const patterns = formData.urlPatterns.filter((_, i) => i !== index);
    handleChange('urlPatterns', patterns);
  };

  const handleParseRule = async () => {
    if (formData.ruleNL && hasAI) {
      const structured = await parseRuleNLtoJSON(formData.ruleNL);
      if (structured) {
        handleChange('ruleStructured', structured);
        alert('Rule parsed successfully!');
      } else {
        alert('Could not parse rule. Please check the format.');
      }
    }
  };

  const handleSave = async () => {
    const validation = validateAgentConfig(formData);

    if (!validation.valid) {
      setErrors(validation.errors);
      return;
    }

    setErrors([]);
    setSaving(true);

    try {
      await onUpdate(formData);
      alert('Agent saved successfully!');
    } catch (error) {
      // Error already handled by parent component
      console.error('Save failed:', error);
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="agent-form">
      <div className="form-header">
        <h2>Agent Configuration</h2>
        <button className="save-btn" onClick={handleSave} disabled={saving}>
          {saving ? 'Saving...' : 'Save Agent'}
        </button>
      </div>

      {errors.length > 0 && (
        <div className="error-box">
          <h4>Please fix the following errors:</h4>
          <ul>
            {errors.map((error, i) => (
              <li key={i}>{error}</li>
            ))}
          </ul>
        </div>
      )}

      <div className="form-section">
        <label>Agent Name *</label>
        <input
          type="text"
          value={formData.name}
          onChange={(e) => handleChange('name', e.target.value)}
          placeholder="My Support Agent"
        />
      </div>

      <div className="form-section">
        <label>Sites to Monitor *</label>
        <div className="list-input">
          <input
            type="text"
            value={siteInput}
            onChange={(e) => setSiteInput(e.target.value)}
            onKeyPress={(e) => e.key === 'Enter' && handleAddSite()}
            placeholder="example.com"
          />
          <button onClick={handleAddSite}>Add</button>
        </div>
        <div className="list-items">
          {formData.sites.map((site, i) => (
            <div key={i} className="list-item">
              <span>{site}</span>
              <button onClick={() => handleRemoveSite(i)}>✕</button>
            </div>
          ))}
        </div>
      </div>

      <div className="form-section">
        <label>URL Patterns (Regex)</label>
        <div className="list-input">
          <input
            type="text"
            value={patternInput}
            onChange={(e) => setPatternInput(e.target.value)}
            onKeyPress={(e) => e.key === 'Enter' && handleAddPattern()}
            placeholder="^https://example\\.com/.*"
          />
          <button onClick={handleAddPattern}>Add</button>
        </div>
        <div className="list-items">
          {formData.urlPatterns.map((pattern, i) => (
            <div key={i} className="list-item">
              <code>{pattern}</code>
              <button onClick={() => handleRemovePattern(i)}>✕</button>
            </div>
          ))}
        </div>
      </div>

      <div className="form-section">
        <label>Agent Source *</label>
        <div className="radio-group">
          <label>
            <input
              type="radio"
              checked={formData.source === 'marketplace'}
              onChange={() => handleChange('source', 'marketplace')}
            />
            Marketplace
          </label>
          <label>
            <input
              type="radio"
              checked={formData.source === 'custom'}
              onChange={() => handleChange('source', 'custom')}
            />
            Custom URL
          </label>
        </div>
      </div>

      {formData.source === 'marketplace' ? (
        <div className="form-section">
          <label>Select Marketplace Agent *</label>
          <select
            value={formData.marketplaceId || ''}
            onChange={(e) => handleChange('marketplaceId', e.target.value)}
          >
            <option value="">-- Select an agent --</option>
            {marketplaceAgents.map((agent) => (
              <option key={agent.id} value={agent.id}>
                {agent.name} - {agent.description}
              </option>
            ))}
          </select>
        </div>
      ) : (
        <div className="form-section">
          <label>Custom Agent URL *</label>
          <input
            type="url"
            value={formData.customEndpoint || ''}
            onChange={(e) => handleChange('customEndpoint', e.target.value)}
            placeholder="wss://my-agent.example.com/chat"
          />
        </div>
      )}

      <div className="form-section">
        <label>Monitoring Type *</label>
        <select
          value={formData.monitoring}
          onChange={(e) => handleChange('monitoring', e.target.value)}
        >
          <option value="UI">UI Changes Only</option>
          <option value="API">API Activity Only</option>
          <option value="Both">Both UI & API</option>
        </select>
      </div>

      <div className="form-section">
        <label>Agent Invocation Rule *</label>
        <textarea
          value={formData.ruleNL}
          onChange={(e) => handleChange('ruleNL', e.target.value)}
          placeholder="If any message is forwarded to abcd.com, invoke the agent"
          rows={4}
        />
        {hasAI && (
          <button className="parse-btn" onClick={handleParseRule}>
            Parse with AI
          </button>
        )}
        {formData.ruleStructured && (
          <div className="info-box">
            <strong>Structured Rule:</strong>
            <pre>{JSON.stringify(formData.ruleStructured, null, 2)}</pre>
          </div>
        )}
      </div>

      <div className="form-section">
        <label>Welcome Message</label>
        <textarea
          value={formData.welcomeMessage}
          onChange={(e) => handleChange('welcomeMessage', e.target.value)}
          placeholder="Welcome! How can I help you today?"
          rows={3}
        />
      </div>

      <div className="form-section">
        <label>Collectors</label>
        <div className="checkbox-group">
          {Object.entries(formData.collectors).map(([key, value]) => (
            <label key={key}>
              <input
                type="checkbox"
                checked={value}
                onChange={(e) => handleCollectorChange(key, e.target.checked)}
              />
              {key.charAt(0).toUpperCase() + key.slice(1)}
            </label>
          ))}
        </div>
      </div>

      <div className="form-section">
        <label>Priority</label>
        <input
          type="number"
          value={formData.priority || 0}
          onChange={(e) => handleChange('priority', parseInt(e.target.value))}
          min="0"
        />
        <small>Lower numbers = higher priority</small>
      </div>
    </div>
  );
}
