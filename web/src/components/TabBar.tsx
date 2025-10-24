import React from 'react';
import './TabBar.css';

export type TabType = 'dashboard' | 'discounts';

interface TabBarProps {
  activeTab: TabType;
  onTabChange: (tab: TabType) => void;
}

const TabBar: React.FC<TabBarProps> = ({ activeTab, onTabChange }) => {
  return (
    <div className="tab-bar">
      <button
        className={`tab-button ${activeTab === 'dashboard' ? 'active' : ''}`}
        onClick={() => onTabChange('dashboard')}
      >
        Dashboard
      </button>
      <button
        className={`tab-button ${activeTab === 'discounts' ? 'active' : ''}`}
        onClick={() => onTabChange('discounts')}
      >
        Discounts
      </button>
    </div>
  );
};

export default TabBar;
