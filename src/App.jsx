import React, { useState, useEffect } from 'react';
import { api } from './api';
import LoginPage from './pages/LoginPage';
import HomePage from './pages/HomePage';
import FamilyTreePage from './pages/FamilyTreePage';
import InterviewListPage from './pages/InterviewListPage';
import TimelinePage from './pages/TimelinePage';
import ProfilePage from './pages/ProfilePage';
import BottomTab from './components/BottomTab';

// 覆盖层页面
import FamilyListPage from './pages/FamilyListPage';
import PersonPage from './pages/PersonPage';
import LifeBookPage from './pages/LifeBookPage';
import EventsPage from './pages/EventsPage';
import MessageBoardPage from './pages/MessageBoardPage';
import SearchPage from './pages/SearchPage';
import InterviewPage from './pages/InterviewPage';

function App() {
  const [isLoggedIn, setIsLoggedIn] = useState(false);
  const [user, setUser] = useState(null);
  const [families, setFamilies] = useState([]);
  const [currentFamilyId, setCurrentFamilyId] = useState(null);
  const [activeTab, setActiveTab] = useState('home');
  const [overlayPage, setOverlayPage] = useState(null);
  const [overlayParams, setOverlayParams] = useState({});
  const [pageKey, setPageKey] = React.useState(0);
  const [loading, setLoading] = useState(true);

  // 自动登录检查
  useEffect(() => {
    const token = localStorage.getItem('flr_token');
    if (token) {
      api.auth.autoLogin().then(res => {
        if (res.isLoggedIn) {
          setIsLoggedIn(true);
          setUser(res.user);
          setFamilies(res.families || []);
          if (res.families && res.families.length > 0) {
            setCurrentFamilyId(res.currentFamilyId || res.families[0].space_id);
          }
        }
        setLoading(false);
      }).catch(() => {
        localStorage.removeItem('flr_token');
        localStorage.removeItem('flr_user');
        setLoading(false);
      });
    } else {
      setLoading(false);
    }
  }, []);

  const handleLogin = (userData, userFamilies) => {
    setUser(userData);
    if (userFamilies && userFamilies.length > 0) {
      setFamilies(userFamilies);
      if (!currentFamilyId) {
        setCurrentFamilyId(userFamilies[0].space_id);
      }
    }
    setIsLoggedIn(true);
    setPageKey(k => k + 1);
  };

  const handleLogout = () => {
    localStorage.removeItem('flr_token');
    localStorage.removeItem('flr_user');
    setIsLoggedIn(false);
    setActiveTab('home');
    setOverlayPage(null);
    setPageKey(k => k + 1);
  };

  const navigate = (page, params = {}) => {
    if (['home', 'tree', 'interview', 'timeline', 'profile'].includes(page)) {
      setActiveTab(page);
      setOverlayPage(null);
    } else {
      setOverlayPage(page);
      setOverlayParams(params);
    }
    setPageKey(k => k + 1);
  };

  const goBack = () => {
    setOverlayPage(null);
    setOverlayParams({});
    setPageKey(k => k + 1);
  };

  const switchFamily = (familyId) => {
    setCurrentFamilyId(familyId);
  };

  const currentFamily = families.find(f => f.space_id === currentFamilyId) || families[0] || null;

  if (!isLoggedIn || loading) {
    return loading ? (
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '100vh', background: '#FBF8F2' }}>
        <div style={{ fontSize: 18, color: '#8B6F47', fontFamily: 'serif' }}>加载中...</div>
      </div>
    ) : (
      <LoginPage onLogin={handleLogin} />
    );
  }

  // 覆盖层页面
  if (overlayPage) {
    const pageMap = {
      familyList: <FamilyListPage key={pageKey} onBack={goBack} currentFamilyId={currentFamilyId} onSwitchFamily={switchFamily} />,
      person: <PersonPage key={pageKey} personId={overlayParams.personId || null} onBack={goBack} onNavigate={navigate} spaceId={currentFamilyId} />,
      lifebook: <LifeBookPage key={pageKey} personId={overlayParams.personId} onBack={goBack} spaceId={currentFamilyId} />,
      events: <EventsPage key={pageKey} onBack={goBack} spaceId={currentFamilyId} />,
      message: <MessageBoardPage key={pageKey} onBack={goBack} spaceId={currentFamilyId} />,
      search: <SearchPage key={pageKey} onBack={goBack} onNavigate={navigate} spaceId={currentFamilyId} />,
      interviewDetail: <InterviewPage key={pageKey} personId={overlayParams.personId} onBack={goBack} onNavigate={navigate} />,
    };

    if (pageMap[overlayPage]) return pageMap[overlayPage];
  }

  // Tab 主页面
  const renderTabContent = () => {
    switch (activeTab) {
      case 'home': return <HomePage key={pageKey} onNavigate={navigate} currentFamily={currentFamily} />;
      case 'tree': return <FamilyTreePage key={pageKey} onNavigate={navigate} spaceId={currentFamilyId} />;
      case 'interview': return <InterviewListPage key={pageKey} onNavigate={navigate} spaceId={currentFamilyId} />;
      case 'timeline': return <TimelinePage key={pageKey} onBack={goBack} spaceId={currentFamilyId} />;
      case 'profile': return <ProfilePage key={pageKey} onNavigate={navigate} onLogout={handleLogout} />;
      default: return <HomePage key={pageKey} onNavigate={navigate} currentFamily={currentFamily} />;
    }
  };

  return (
    <div className="app-container">
      <div className="page-content" style={{ flex: 1, paddingBottom: 80 }}>
        {renderTabContent()}
      </div>
      <BottomTab activeTab={activeTab} onTabChange={setActiveTab} />
    </div>
  );
}

export default App;
