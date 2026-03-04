'use client';

import { useState, useRef, useEffect } from 'react';

const SUGGESTED_QUESTIONS = [
  'Can they sell my data?',
  'How do I delete my account?',
  'Do they track me across sites?',
];

export default function PolicyChat({ serviceId }) {
  const [messages, setMessages] = useState([]);
  const [input, setInput] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState(null);
  const messagesEndRef = useRef(null);
  const inputRef = useRef(null);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  const sendMessage = async (text) => {
    const trimmed = text.trim();
    if (!trimmed || isLoading) {return;}

    const userMessage = { role: 'user', content: trimmed };
    const updatedMessages = [...messages, userMessage];
    setMessages(updatedMessages);
    setInput('');
    setError(null);
    setIsLoading(true);

    try {
      const res = await fetch('/api/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          service_id: serviceId,
          messages: updatedMessages,
        }),
      });

      if (!res.ok) {
        const errData = await res.json();
        throw new Error(errData.detail || 'Failed to get response');
      }

      const data = await res.json();
      setMessages((prev) => [...prev, { role: 'assistant', content: data.answer }]);
    } catch (e) {
      setError(e.message);
    } finally {
      setIsLoading(false);
    }
  };

  const handleKeyDown = (e) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      sendMessage(input);
    }
  };

  const handleRetry = async () => {
    if (messages.length === 0) {return;}
    const lastUserIndex = messages.findLastIndex((m) => m.role === 'user');
    if (lastUserIndex === -1) {return;}
    const lastUserMessage = messages[lastUserIndex].content;
    // Remove the failed turn (user message + any assistant response after it)
    const trimmedMessages = messages.slice(0, lastUserIndex);
    setMessages(trimmedMessages);
    setError(null);

    // Re-send using trimmedMessages directly to avoid stale state
    const userMessage = { role: 'user', content: lastUserMessage };
    const updatedMessages = [...trimmedMessages, userMessage];
    setMessages(updatedMessages);
    setIsLoading(true);

    try {
      const res = await fetch('/api/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          service_id: serviceId,
          messages: updatedMessages,
        }),
      });

      if (!res.ok) {
        const errData = await res.json();
        throw new Error(errData.detail || 'Failed to get response');
      }

      const data = await res.json();
      setMessages((prev) => [...prev, { role: 'assistant', content: data.answer }]);
    } catch (e) {
      setError(e.message);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="policy-chat">
      <div className="policy-chat-messages">
        {messages.length === 0 && !isLoading && (
          <div className="policy-chat-suggestions">
            <p
              className="text-xs mb-2"
              style={{ color: 'var(--pl-text-dim)', fontFamily: 'var(--font-mono)' }}
            >
              Ask a question about this policy:
            </p>
            <div className="flex flex-wrap gap-2">
              {SUGGESTED_QUESTIONS.map((q) => (
                <button
                  key={q}
                  onClick={() => sendMessage(q)}
                  className="policy-chat-suggestion"
                >
                  {q}
                </button>
              ))}
            </div>
          </div>
        )}

        {messages.map((msg, i) => (
          <div
            key={i}
            className={`policy-chat-bubble ${msg.role === 'user' ? 'policy-chat-bubble-user' : 'policy-chat-bubble-assistant'}`}
          >
            <span className="text-sm whitespace-pre-wrap">{msg.content}</span>
          </div>
        ))}

        {isLoading && (
          <div className="policy-chat-bubble policy-chat-bubble-assistant">
            <span className="policy-chat-typing">
              <span />
              <span />
              <span />
            </span>
          </div>
        )}

        {error && (
          <div className="policy-chat-error">
            <span className="text-xs">{error}</span>
            <button
              onClick={handleRetry}
              className="text-xs underline ml-2"
              style={{ color: 'var(--pl-accent)' }}
            >
              Retry
            </button>
          </div>
        )}

        <div ref={messagesEndRef} />
      </div>

      <div className="policy-chat-input-area">
        <input
          ref={inputRef}
          type="text"
          value={input}
          onChange={(e) => setInput(e.target.value)}
          onKeyDown={handleKeyDown}
          placeholder="Ask about this policy..."
          disabled={isLoading}
          className="policy-chat-input"
        />
        <button
          onClick={() => sendMessage(input)}
          disabled={isLoading || !input.trim()}
          className="policy-chat-send"
          aria-label="Send message"
        >
          <svg
            width="16"
            height="16"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
          >
            <line x1="22" y1="2" x2="11" y2="13" />
            <polygon points="22 2 15 22 11 13 2 9 22 2" />
          </svg>
        </button>
      </div>
    </div>
  );
}
