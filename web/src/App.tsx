import React, { useState } from 'react';
import Dashboard from './pages/Dashboard';
import DiscountsView from './pages/DiscountsView';
import TabBar, { TabType } from './components/TabBar';

const App: React.FC = () => {
  const [activeTab, setActiveTab] = useState<TabType>('discounts');

  return (
    <div className="app">
      <div className="app-container">
        <TabBar activeTab={activeTab} onTabChange={setActiveTab} />
        {activeTab === 'dashboard' && <Dashboard />}
        {activeTab === 'discounts' && <DiscountsView />}
      </div>
    </div>
  );
};

export default App;
