import { useState } from 'react';
import type { ChecklistItem } from '../types';

interface ArtifactPanelProps {
  title: string;
  items: ChecklistItem[];
  sourcesLine: string;
}

export default function ArtifactPanel({ title, items: initialItems, sourcesLine }: ArtifactPanelProps) {
  const [items, setItems] = useState(initialItems);

  const toggle = (id: string) => {
    setItems((prev) => prev.map((i) => (i.id === id ? { ...i, done: !i.done } : i)));
  };

  return (
    <div className="artifact-panel">
      <div className="artifact-panel-head">
        <div className="artifact-panel-title">{title}</div>
        <div className="artifact-panel-tag">Generated artifact</div>
      </div>

      <div className="checklist">
        {items.map((item) => (
          <div
            key={item.id}
            className={`check-item${item.done ? ' done' : ''}`}
            onClick={() => toggle(item.id)}
          >
            <span className="box" />
            {item.label}
          </div>
        ))}
      </div>

      <div className="checklist-sources">
        <b>Sources:</b> {sourcesLine}
      </div>

      <div className="artifact-actions">
        <button className="action-btn primary">Print</button>
        <button className="action-btn">Export PDF</button>
        <button className="action-btn">Save to shift log</button>
      </div>
    </div>
  );
}
