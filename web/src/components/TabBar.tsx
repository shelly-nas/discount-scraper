import React from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { useTheme, ThemeMode } from '../context/ThemeContext';
import './TabBar.css';

export type TabType = 'configurations' | 'discounts';

const SunIcon = () => (
  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <circle cx="12" cy="12" r="5" />
    <line x1="12" y1="1" x2="12" y2="3" />
    <line x1="12" y1="21" x2="12" y2="23" />
    <line x1="4.22" y1="4.22" x2="5.64" y2="5.64" />
    <line x1="18.36" y1="18.36" x2="19.78" y2="19.78" />
    <line x1="1" y1="12" x2="3" y2="12" />
    <line x1="21" y1="12" x2="23" y2="12" />
    <line x1="4.22" y1="19.78" x2="5.64" y2="18.36" />
    <line x1="18.36" y1="5.64" x2="19.78" y2="4.22" />
  </svg>
);

const MoonIcon = () => (
  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79z" />
  </svg>
);

const SystemIcon = () => (
  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <rect x="2" y="3" width="20" height="14" rx="2" ry="2" />
    <line x1="8" y1="21" x2="16" y2="21" />
    <line x1="12" y1="17" x2="12" y2="21" />
  </svg>
);

const THEME_CYCLE: ThemeMode[] = ['system', 'light', 'dark'];

const ThemeToggle: React.FC = () => {
  const { mode, setMode } = useTheme();

  const cycleTheme = () => {
    const idx = THEME_CYCLE.indexOf(mode);
    setMode(THEME_CYCLE[(idx + 1) % THEME_CYCLE.length]);
  };

  const label = mode === 'system' ? 'System theme' : mode === 'light' ? 'Light theme' : 'Dark theme';

  return (
    <button
      className="theme-toggle"
      onClick={cycleTheme}
      title={label}
      aria-label={label}
    >
      {mode === 'light' && <SunIcon />}
      {mode === 'dark' && <MoonIcon />}
      {mode === 'system' && <SystemIcon />}
    </button>
  );
};

const TabBar: React.FC = () => {
  const location = useLocation();
  const navigate = useNavigate();

  const getActiveTab = (): TabType => {
    if (location.pathname.startsWith('/configurations')) {
      return 'configurations';
    }
    return 'discounts';
  };

  const activeTab = getActiveTab();

  const handleTabChange = (tab: TabType) => {
    navigate(`/${tab}`);
  };

  return (
    <div className="tab-bar">
      <div className="tab-bar-tabs">
        <button
          className={`tab-button ${activeTab === 'discounts' ? 'active' : ''}`}
          onClick={() => handleTabChange('discounts')}
        >
          Discounts
        </button>
        <button
          className={`tab-button ${activeTab === 'configurations' ? 'active' : ''}`}
          onClick={() => handleTabChange('configurations')}
        >
          Configuraties
        </button>
      </div>
      <ThemeToggle />
    </div>
  );
};

export default TabBar;
