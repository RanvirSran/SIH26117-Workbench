import { useRef, useState } from 'react';
import { IconSend, IconPlus, IconX } from './Icons';
import FileTypeBadge from './FileTypeBadge';
import { uploadFile } from '../api/client';
import type { Attachment } from '../types';

interface ComposerProps {
  onSend: (message: string, attachments: Attachment[]) => void;
  disabled?: boolean;
}

const ACCEPT = '.txt,.md,.xlsx,.doc,.docx,.pdf';

export default function Composer({ onSend, disabled }: ComposerProps) {
  const [value, setValue] = useState('');
  const [pendingAttachments, setPendingAttachments] = useState<Attachment[]>([]);
  const [isUploading, setIsUploading] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleAttachClick = () => {
    fileInputRef.current?.click();
  };

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files || files.length === 0) return;

    setIsUploading(true);
    try {
      const uploaded = await Promise.all(Array.from(files).map((f) => uploadFile(f)));
      setPendingAttachments((prev) => [...prev, ...uploaded]);
    } catch (err) {
      console.error('File upload failed:', err);
    } finally {
      setIsUploading(false);
      e.target.value = '';
    }
  };

  const removeAttachment = (name: string) => {
    setPendingAttachments((prev) => prev.filter((a) => a.name !== name));
  };

  const handleSend = () => {
    if (disabled) return;
    if (!value.trim() && pendingAttachments.length === 0) return;
    onSend(value.trim(), pendingAttachments);
    setValue('');
    setPendingAttachments([]);
  };

  return (
    <div className="composer-wrap">
      <div className="composer">
        {pendingAttachments.length > 0 && (
          <div className="composer-attachments">
            {pendingAttachments.map((att) => (
              <div className="attachment-chip attachment-chip--pending" key={att.name}>
                <FileTypeBadge filename={att.name} />
                <span>{att.name}</span>
                <button
                  className="attachment-chip__remove"
                  onClick={() => removeAttachment(att.name)}
                  aria-label={`Remove ${att.name}`}
                  type="button"
                >
                  <IconX />
                </button>
              </div>
            ))}
          </div>
        )}

        <div className="composer-box">
          <input
            ref={fileInputRef}
            type="file"
            accept={ACCEPT}
            multiple
            hidden
            onChange={handleFileChange}
          />
          <button
            className="composer-attach"
            onClick={handleAttachClick}
            aria-label="Attach a file"
            disabled={disabled || isUploading}
            type="button"
          >
            <IconPlus />
          </button>

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
          <button
            className="composer-send"
            onClick={handleSend}
            aria-label="Send message"
            disabled={disabled || isUploading}
          >
            <IconSend />
          </button>
        </div>

        <div className="composer-hint">Responses are generated locally. No data leaves this network.</div>
      </div>
    </div>
  );
}
