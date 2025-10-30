import React, { useState, useEffect } from 'react';
import { AgentForm } from './components/AgentForm';
import { AgentTabs } from './components/AgentTabs';
import { Settings } from './components/Settings';
import type { AgentConfig } from '@/types';
import { nanoid } from 'nanoid';

function App() {
  const [agents, setAgents] = useState<AgentConfig[]>([]);
  const [selectedAgentId, setSelectedAgentId] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<'agents' | 'settings'>('agents');
  const [loading, setLoading] = useState(true);

  // Load agents from storage
  useEffect(() => {
    chrome.storage.sync.get(['agents'], (result) => {
      if (result.agents) {
        setAgents(result.agents);
        if (result.agents.length > 0) {
          setSelectedAgentId(result.agents[0].id);
        }
      }
      setLoading(false);
    });
  }, []);

  // Save agents to storage whenever they change
  const saveAgents = (newAgents: AgentConfig[]) => {
    setAgents(newAgents);
    chrome.storage.sync.set({ agents: newAgents }, () => {
      console.log('Agents saved');
    });
  };

  // Create new agent
  const handleCreateAgent = () => {
    const newAgent: AgentConfig = {
      id: nanoid(),
      name: 'New Agent',
      sites: [],
      urlPatterns: [],
      source: 'marketplace',
      monitoring: 'Both',
      ruleNL: '',
      welcomeMessage: 'Welcome! How can I help you today?',
      collectors: {
        har: true,
        console: true,
        cookies: false,
        dom: true,
        memory: false,
        performance: true,
        screenshot: true,
        screenRecording: false,
      },
      priority: agents.length,
    };

    const newAgents = [...agents, newAgent];
    saveAgents(newAgents);
    setSelectedAgentId(newAgent.id);
  };

  // Update agent
  const handleUpdateAgent = (updatedAgent: AgentConfig) => {
    const newAgents = agents.map((agent) =>
      agent.id === updatedAgent.id ? updatedAgent : agent
    );
    saveAgents(newAgents);
  };

  // Delete agent
  const handleDeleteAgent = (id: string) => {
    if (confirm('Are you sure you want to delete this agent?')) {
      const newAgents = agents.filter((agent) => agent.id !== id);
      saveAgents(newAgents);

      // Select another agent if available
      if (selectedAgentId === id) {
        setSelectedAgentId(newAgents[0]?.id || null);
      }
    }
  };

  const selectedAgent = agents.find((a) => a.id === selectedAgentId);

  if (loading) {
    return (
      <div className="loading-container">
        <div className="spinner"></div>
        <p>Loading configuration...</p>
      </div>
    );
  }

  return (
    <div className="options-container">
      <header className="options-header">
        <div className="header-content">
          <h1>DevaDoot Configuration</h1>
          <p className="subtitle">Configure agents to monitor your websites</p>
        </div>
        <div className="tab-selector">
          <button
            className={activeTab === 'agents' ? 'active' : ''}
            onClick={() => setActiveTab('agents')}
          >
            Agents
          </button>
          <button
            className={activeTab === 'settings' ? 'active' : ''}
            onClick={() => setActiveTab('settings')}
          >
            Settings
          </button>
        </div>
      </header>

      <div className="options-content">
        {activeTab === 'agents' ? (
          <>
            <aside className="sidebar">
              <button className="create-btn" onClick={handleCreateAgent}>
                + Create New Agent
              </button>
              <AgentTabs
                agents={agents}
                selectedId={selectedAgentId}
                onSelect={setSelectedAgentId}
                onDelete={handleDeleteAgent}
              />
            </aside>

            <main className="main-content">
              {selectedAgent ? (
                <AgentForm
                  agent={selectedAgent}
                  onUpdate={handleUpdateAgent}
                />
              ) : (
                <div className="empty-state">
                  <p>No agents configured yet.</p>
                  <button onClick={handleCreateAgent}>Create your first agent</button>
                </div>
              )}
            </main>
          </>
        ) : (
          <Settings />
        )}
      </div>
    </div>
  );
}

export default App;
