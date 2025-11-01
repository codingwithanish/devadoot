import type { AgentConfig } from '@/types';

interface AgentTabsProps {
  agents: AgentConfig[];
  selectedId: string | null;
  onSelect: (id: string) => void;
  onDelete: (id: string) => void;
}

export function AgentTabs({ agents, selectedId, onSelect, onDelete }: AgentTabsProps) {
  return (
    <div className="agent-tabs">
      {agents.map((agent) => (
        <div
          key={agent.id}
          className={`agent-tab ${selectedId === agent.id ? 'active' : ''}`}
        >
          <div
            className="agent-tab-content"
            onClick={() => onSelect(agent.id)}
          >
            <span className="agent-name">{agent.name}</span>
            <span className="agent-type">{agent.source}</span>
          </div>
          <button
            className="delete-btn"
            onClick={(e) => {
              e.stopPropagation();
              onDelete(agent.id);
            }}
            title="Delete agent"
          >
            ✕
          </button>
        </div>
      ))}
    </div>
  );
}
