import ThemeToggle from './ThemeToggle';

interface TopBarProps {
  workspace: string;
  model: string;
  userInitials: string;
  theme: 'dark' | 'light';
  toggleTheme: () => void;
}

export default function TopBar({ workspace, model, userInitials, theme, toggleTheme }: TopBarProps) {
  return (
    <div className="topbar">
      <div className="topbar-left">
        <div className="wordmark">
          <span className="mark" />
          SOVEREIGN AI
        </div>
        <div className="divider-v" />
        <div className="crumb">
          Workspace <b>{workspace}</b>
        </div>
        <button className="model-select">
          {model} <span className="chev">▾</span>
        </button>
      </div>

      <div className="topbar-right">
        <div className="status-group">
          <div className="status-item">
            <span className="led" />
            Local execution
          </div>
          <div className="status-sep" />
          <div className="status-item">
            <span className="led off" />
            Internet disabled
          </div>
        </div>
        <ThemeToggle theme={theme} onToggle={toggleTheme} />
        <div className="avatar">{userInitials}</div>
      </div>
    </div>
  );
}
