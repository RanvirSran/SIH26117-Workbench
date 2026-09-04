import { useState } from 'react';
import { IconSend } from './Icons';

interface ToolToggle {
  id: string;
  label: string;
  on: boolean;
}

interface ComposerProps {
  onSend: (message: string) => void;
  disabled?: boolean;
}

export default function Composer({ onSend, disabled }: ComposerProps) {
  const [value, setValue] = useState('');
  const [tools, setTools] = useState<ToolToggle[]>([
    { id: 'rag', label: 'RAG', on: true },
    { id: 'attach', label: 'Attach file', on: false },
    { id: 'code', label: 'Code execution', on: false },
  ]);

  const toggleTool = (id: string) => {
    setTools((prev) => prev.map((t) => (t.id === id ? { ...t, on: !t.on } : t)));
  };

  const handleSend = () => {
    if (!value.trim() || disabled) return;
    onSend(value.trim());
    setValue('');
  };

  return (
    <div className="composer-wrap">
      <div className="composer">
        <div className="composer-tools">
          {tools.map((t) => (
            <span
              key={t.id}
              className={`tool-chip${t.on ? ' on' : ''}`}
              onClick={() => toggleTool(t.id)}
            >
              {t.label}
            </span>
          ))}
        </div>

        <div className="composer-box">
          <textarea
            className="composer-input"
            placeholder="Ask about your local knowledge base…"
            rows={1}
            value={value}
            disabled={disabled}
            onChange={(e) => setValue(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Enter' && !e.shiftKey) {
                e.preventDefault();
                handleSend();
              }
            }}
          />
          <button className="composer-send" onClick={handleSend} aria-label="Send message" disabled={disabled}>
            <IconSend />
          </button>
        </div>

        <div className="composer-hint">Responses are generated locally. No data leaves this network.</div>
      </div>
    </div>
  );
}
