import { useState, useMemo } from 'react';
import type { MarketplaceAgent } from '@/types';

interface MarketplacePanelProps {
  agents: MarketplaceAgent[];
  onSelect: (agentId: string) => void;
  onClose: () => void;
}

export function MarketplacePanel({ agents, onSelect, onClose }: MarketplacePanelProps) {
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<string | null>(null);

  // Group agents by category
  const agentsByCategory = useMemo(() => {
    const grouped: Record<string, MarketplaceAgent[]> = {};

    agents.forEach(agent => {
      if (!grouped[agent.category]) {
        grouped[agent.category] = [];
      }
      grouped[agent.category].push(agent);
    });

    return grouped;
  }, [agents]);

  // Get unique categories
  const categories = useMemo(() => {
    return Object.keys(agentsByCategory).sort();
  }, [agentsByCategory]);

  // Filter agents based on search query and selected category
  const filteredAgents = useMemo(() => {
    let filtered = agents;

    // Filter by category
    if (selectedCategory) {
      filtered = agentsByCategory[selectedCategory] || [];
    }

    // Filter by search query
    if (searchQuery.trim()) {
      const query = searchQuery.toLowerCase();
      filtered = filtered.filter(agent =>
        agent.name.toLowerCase().includes(query) ||
        agent.description?.toLowerCase().includes(query) ||
        agent.category.toLowerCase().includes(query)
      );
    }

    return filtered;
  }, [agents, agentsByCategory, selectedCategory, searchQuery]);

  const handleAddAgent = (agentId: string) => {
    onSelect(agentId);
    onClose();
  };

  return (
    <div className="marketplace-panel">
      <div className="marketplace-overlay" onClick={onClose} />

      <div className="marketplace-content">
        <div className="marketplace-header">
          <h3>Marketplace Agents</h3>
          <button className="close-btn" onClick={onClose}>✕</button>
        </div>

        <div className="marketplace-search">
          <input
            type="text"
            placeholder="Search agents..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="search-input"
          />
        </div>

        <div className="marketplace-body">
          <div className="marketplace-sidebar">
            <div className="category-list">
              <button
                className={`category-item ${selectedCategory === null ? 'active' : ''}`}
                onClick={() => setSelectedCategory(null)}
              >
                All Categories
              </button>
              {categories.map(category => (
                <button
                  key={category}
                  className={`category-item ${selectedCategory === category ? 'active' : ''}`}
                  onClick={() => setSelectedCategory(category)}
                >
                  {category}
                  <span className="category-count">
                    {agentsByCategory[category].length}
                  </span>
                </button>
              ))}
            </div>
          </div>

          <div className="marketplace-agents">
            {filteredAgents.length === 0 ? (
              <div className="empty-state">
                <p>No agents found matching your criteria.</p>
              </div>
            ) : (
              <div className="agent-grid">
                {filteredAgents.map(agent => (
                  <div key={agent.id} className="agent-tile">
                    <div className="agent-tile-header">
                      <h4>{agent.name}</h4>
                      <span className="agent-category-badge">{agent.category}</span>
                    </div>
                    <p className="agent-description">
                      {agent.description || 'No description available'}
                    </p>
                    <button
                      className="add-agent-btn"
                      onClick={() => handleAddAgent(agent.id)}
                    >
                      Add
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
