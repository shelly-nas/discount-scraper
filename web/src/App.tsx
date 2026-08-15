import React from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { ThemeProvider } from './context/ThemeContext';
import Configurations from './pages/Configurations';
import DiscountsView from './pages/DiscountsView';
import TabBar from './components/TabBar';

const App: React.FC = () => {
  return (
    <ThemeProvider>
      <Router>
        <div className="app">
          <div className="app-container">
            <TabBar />
            <Routes>
              <Route path="/" element={<Navigate to="/discounts" replace />} />
              <Route path="/configurations" element={<Configurations />} />
              <Route path="/discounts" element={<DiscountsView />} />
            </Routes>
          </div>
        </div>
      </Router>
    </ThemeProvider>
  );
};

export default App;
