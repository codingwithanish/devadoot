import React, { useState, useEffect, useRef } from 'react';
import type { ChatMessage } from '@/types';

interface PopupData {
  caseId: string;
  welcomeMessage: string;
  agentName: string;
  chatMeta: {
    type: string;
    endpoint: string;
  };
}

function App() {
  const [data, setData] = useState<PopupData | null>(null);
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [inputValue, setInputValue] = useState('');
  const [minimized, setMinimized] = useState(false);
  const [connecting, setConnecting] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const wsRef = useRef<WebSocket | null>(null);

  // Scroll to bottom when new messages arrive
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  // Listen for init message from parent
  useEffect(() => {
    const handleMessage = (event: MessageEvent) => {
      const { type, data: eventData } = event.data;

      if (type === 'init' && eventData) {
        console.log('Popup initialized with data:', eventData);
        setData(eventData);

        // Add welcome message
        const welcomeMsg: ChatMessage = {
          id: 'welcome',
          sender: 'agent',
          content: eventData.welcomeMessage || 'Welcome! How can I help you?',
          timestamp: Date.now(),
        };
        setMessages([welcomeMsg]);

        // Connect to agent chat endpoint
        connectToAgent(eventData.chatMeta);
      } else if (type === 'minimize') {
        setMinimized(true);
      } else if (type === 'restore') {
        setMinimized(false);
      }
    };

    window.addEventListener('message', handleMessage);

    return () => {
      window.removeEventListener('message', handleMessage);
      // Disconnect WebSocket on unmount
      if (wsRef.current) {
        wsRef.current.close();
      }
    };
  }, []);

  // Connect to agent chat endpoint
  const connectToAgent = (chatMeta: { type: string; endpoint: string }) => {
    if (chatMeta.type === 'chat' && chatMeta.endpoint) {
      setConnecting(true);

      try {
        const ws = new WebSocket(chatMeta.endpoint);

        ws.onopen = () => {
          console.log('Connected to agent chat');
          setConnecting(false);
        };

        ws.onmessage = (event) => {
          try {
            const agentMessage = JSON.parse(event.data);

            const newMessage: ChatMessage = {
              id: `agent-${Date.now()}`,
              sender: 'agent',
              content: agentMessage.content || agentMessage.message || event.data,
              timestamp: Date.now(),
            };

            setMessages((prev) => [...prev, newMessage]);
          } catch {
            // Plain text message
            const newMessage: ChatMessage = {
              id: `agent-${Date.now()}`,
              sender: 'agent',
              content: event.data,
              timestamp: Date.now(),
            };

            setMessages((prev) => [...prev, newMessage]);
          }
        };

        ws.onerror = (error) => {
          console.error('WebSocket error:', error);
          setConnecting(false);
        };

        ws.onclose = () => {
          console.log('Disconnected from agent chat');
          setConnecting(false);
        };

        wsRef.current = ws;
      } catch (error) {
        console.error('Failed to connect to agent:', error);
        setConnecting(false);
      }
    }
  };

  // Handle minimize
  const handleMinimize = () => {
    window.parent.postMessage({ type: 'minimize' }, '*');
    setMinimized(true);
  };

  // Handle close
  const handleClose = () => {
    window.parent.postMessage(
      { type: 'close', caseId: data?.caseId },
      '*'
    );
  };

  // Handle end support
  const handleEndSupport = () => {
    if (confirm('Are you sure you want to end support? This will close the case.')) {
      window.parent.postMessage(
        { type: 'end-support', caseId: data?.caseId },
        '*'
      );
    }
  };

  // Handle send message
  const handleSendMessage = () => {
    if (!inputValue.trim() || !data) return;

    // Add user message to UI
    const userMessage: ChatMessage = {
      id: `user-${Date.now()}`,
      sender: 'user',
      content: inputValue,
      timestamp: Date.now(),
    };

    setMessages((prev) => [...prev, userMessage]);

    // Send to agent via WebSocket
    if (wsRef.current && wsRef.current.readyState === WebSocket.OPEN) {
      wsRef.current.send(JSON.stringify({
        type: 'message',
        content: inputValue,
        caseId: data.caseId,
      }));
    }

    // Clear input
    setInputValue('');
  };

  // Handle Enter key
  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSendMessage();
    }
  };

  if (minimized) {
    return (
      <div className="minimized">
        <div className="minimized-icon">💬</div>
      </div>
    );
  }

  if (!data) {
    return (
      <div className="loading">
        <div className="spinner"></div>
        <p>Initializing...</p>
      </div>
    );
  }

  return (
    <div className="popup-container">
      {/* Header */}
      <div className="popup-header">
        <div className="header-info">
          <h3>{data.agentName}</h3>
          <span className="case-id">Case: {data.caseId.substring(0, 8)}</span>
        </div>
        <div className="header-controls">
          <button
            onClick={handleMinimize}
            className="control-btn"
            title="Minimize"
          >
            <span>—</span>
          </button>
          <button
            onClick={handleClose}
            className="control-btn"
            title="Close Popup"
          >
            <span>✕</span>
          </button>
          <button
            onClick={handleEndSupport}
            className="control-btn end-support"
            title="End Support"
          >
            <span>⏻</span>
          </button>
        </div>
      </div>

      {/* Messages */}
      <div className="messages-container">
        {messages.map((msg) => (
          <div
            key={msg.id}
            className={`message ${msg.sender}`}
          >
            <div className="message-content">{msg.content}</div>
            <div className="message-time">
              {new Date(msg.timestamp).toLocaleTimeString()}
            </div>
          </div>
        ))}
        {connecting && (
          <div className="message agent">
            <div className="message-content">
              <div className="typing-indicator">
                <span></span>
                <span></span>
                <span></span>
              </div>
            </div>
          </div>
        )}
        <div ref={messagesEndRef} />
      </div>

      {/* Input */}
      <div className="input-container">
        <textarea
          value={inputValue}
          onChange={(e) => setInputValue(e.target.value)}
          onKeyPress={handleKeyPress}
          placeholder="Type your message..."
          rows={2}
        />
        <button onClick={handleSendMessage} disabled={!inputValue.trim()}>
          Send
        </button>
      </div>
    </div>
  );
}

export default App;
