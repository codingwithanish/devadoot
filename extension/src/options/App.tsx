import React, { useState, useEffect } from 'react';
import { AgentForm } from './components/AgentForm';
import { AgentTabs } from './components/AgentTabs';
import { Settings } from './components/Settings';
import type { AgentConfig } from '@/types';
import { nanoid } from 'nanoid';
import { apiClient } from '@/bg/api-client';

function App() {
  const [agents, setAgents] = useState<AgentConfig[]>([]);
  const [selectedAgentId, setSelectedAgentId] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<'agents' | 'settings'>('agents');
  const [loading, setLoading] = useState(true);

  // Load agents from database
  useEffect(() => {
    const loadAgents = async () => {
      try {
        await apiClient.init();
        const agentsFromDb = await apiClient.getAgents();
        setAgents(agentsFromDb);

        // Also sync to Chrome storage for offline access
        chrome.storage.sync.set({ agents: agentsFromDb });

        if (agentsFromDb.length > 0) {
          setSelectedAgentId(agentsFromDb[0].id);
        }
      } catch (error) {
        console.error('Failed to load agents from database:', error);

        // Fallback to Chrome storage if API fails
        chrome.storage.sync.get(['agents'], (result) => {
          if (result.agents) {
            setAgents(result.agents);
            if (result.agents.length > 0) {
              setSelectedAgentId(result.agents[0].id);
            }
          }
        });
      } finally {
        setLoading(false);
      }
    };

    loadAgents();
  }, []);

  // Save agents to storage whenever they change
  const saveAgents = (newAgents: AgentConfig[]) => {
    setAgents(newAgents);
    chrome.storage.sync.set({ agents: newAgents }, () => {
      console.log('Agents saved');
    });
  };

  // Create new agent
  const handleCreateAgent = async () => {
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

    try {
      const createdAgent = await apiClient.createAgent(newAgent);
      const newAgents = [...agents, createdAgent];
      saveAgents(newAgents);
      setSelectedAgentId(createdAgent.id);
    } catch (error) {
      console.error('Failed to create agent:', error);
      alert('Failed to create agent. Please check your server connection.');
    }
  };

  // Update agent
  const handleUpdateAgent = async (updatedAgent: AgentConfig) => {
    try {
      const savedAgent = await apiClient.updateAgent(updatedAgent);
      const newAgents = agents.map((agent) =>
        agent.id === savedAgent.id ? savedAgent : agent
      );
      saveAgents(newAgents);
    } catch (error) {
      console.error('Failed to update agent:', error);
      alert('Failed to save agent. Please check your server connection.');
      throw error; // Re-throw so AgentForm knows the save failed
    }
  };

  // Delete agent
  const handleDeleteAgent = async (id: string) => {
    if (confirm('Are you sure you want to delete this agent?')) {
      try {
        await apiClient.deleteAgent(id);
        const newAgents = agents.filter((agent) => agent.id !== id);
        saveAgents(newAgents);

        // Select another agent if available
        if (selectedAgentId === id) {
          setSelectedAgentId(newAgents[0]?.id || null);
        }
      } catch (error) {
        console.error('Failed to delete agent:', error);
        alert('Failed to delete agent. Please check your server connection.');
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
