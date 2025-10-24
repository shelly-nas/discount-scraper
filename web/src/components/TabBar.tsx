import React from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import './TabBar.css';

export type TabType = 'configurations' | 'discounts';

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
  );
};

export default TabBar;
