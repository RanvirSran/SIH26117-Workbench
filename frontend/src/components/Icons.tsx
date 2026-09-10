// Small inline SVG icon set, no icon library dependency.

export function IconSearch() {
  return (
    <svg className="ic" viewBox="0 0 24 24">
      <circle cx="11" cy="11" r="7" />
      <line x1="21" y1="21" x2="16.65" y2="16.65" />
    </svg>
  );
}

export function IconFile() {
  return (
    <svg className="ic" viewBox="0 0 24 24">
      <path d="M14 3v4a1 1 0 0 0 1 1h4" />
      <path d="M17 21H7a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h7l5 5v11a2 2 0 0 1-2 2z" />
    </svg>
  );
}

export function IconCalculator() {
  return (
    <svg className="ic" viewBox="0 0 24 24">
      <rect x="4" y="4" width="16" height="16" rx="1" />
      <line x1="8" y1="9" x2="16" y2="9" />
      <line x1="8" y1="13" x2="13" y2="13" />
    </svg>
  );
}

export function IconCode() {
  return (
    <svg className="ic" viewBox="0 0 24 24">
      <polyline points="16 18 22 12 16 6" />
      <polyline points="8 6 2 12 8 18" />
    </svg>
  );
}

export function IconArtifact() {
  return (
    <svg className="ic" viewBox="0 0 24 24">
      <rect x="3" y="3" width="7" height="7" />
      <rect x="14" y="3" width="7" height="7" />
      <rect x="14" y="14" width="7" height="7" />
      <rect x="3" y="14" width="7" height="7" />
    </svg>
  );
}

export function IconSend() {
  return (
    <svg className="ic" viewBox="0 0 24 24" style={{ width: 16, height: 16 }}>
      <line x1="12" y1="19" x2="12" y2="5" />
      <polyline points="5 12 12 5 19 12" />
    </svg>
  );
}

export function IconPlus() {
  return (
    <svg className="ic" viewBox="0 0 24 24">
      <line x1="12" y1="5" x2="12" y2="19" />
      <line x1="5" y1="12" x2="19" y2="12" />
    </svg>
  );
}

export function IconX() {
  return (
    <svg className="ic" viewBox="0 0 24 24">
      <line x1="18" y1="6" x2="6" y2="18" />
      <line x1="6" y1="6" x2="18" y2="18" />
    </svg>
  );
}

export function IconPaperclip() {
  return (
    <svg className="ic" viewBox="0 0 24 24">
      <path d="M21.44 11.05l-9.19 9.19a6 6 0 0 1-8.49-8.49l9.19-9.19a4 4 0 0 1 5.66 5.66l-9.2 9.19a2 2 0 0 1-2.83-2.83l8.49-8.48" />
    </svg>
  );
}

export function IconDownload() {
  return (
    <svg className="ic" viewBox="0 0 24 24">
      <path d="M12 3v12" />
      <path d="M7 11l5 5 5-5" />
      <path d="M5 20h14" />
    </svg>
  );
}

export const toolIconMap = {
  search: IconSearch,
  file: IconFile,
  calc: IconCalculator,
  code: IconCode,
  artifact: IconArtifact,
};
