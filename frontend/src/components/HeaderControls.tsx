import ThemeToggle from './ThemeToggle';

interface HeaderControlsProps {
  userInitials: string;
  theme: 'dark' | 'light';
  toggleTheme: () => void;
}

/** Floating theme + account controls. Replaces the old full-width topbar —
 *  no background strip, just the two controls pinned to the corner. */
export default function HeaderControls({ userInitials, theme, toggleTheme }: HeaderControlsProps) {
  return (
    <div className="header-controls">
      <ThemeToggle theme={theme} onToggle={toggleTheme} />
      <div className="avatar">{userInitials}</div>
    </div>
  );
}
