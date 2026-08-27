// ===== 主应用组件 =====
import React from 'react';
import LoginPage from './pages/LoginPage';
import HomePage from './pages/HomePage';
import FamilyTreePage from './pages/FamilyTreePage';
import InterviewListPage from './pages/InterviewListPage';
import TimelinePage from './pages/TimelinePage';
import ProfilePage from './pages/ProfilePage';
import FamilyListPage from './pages/FamilyListPage';
import PersonPage from './pages/PersonPage';
import PersonCreatePage from './pages/PersonCreatePage';
import PersonEditPage from './pages/PersonEditPage';
import PersonTimelinePage from './pages/PersonTimelinePage';
import LifeBookPage from './pages/LifeBookPage';
import LifeBookGeneratePage from './pages/LifeBookGeneratePage';
import LifeBookVersionPage from './pages/LifeBookVersionPage';
import BookReaderPage from './pages/BookReaderPage';
import BookPrintPage from './pages/BookPrintPage';
import BookEditPage from './pages/BookEditPage';
import BookSharePage from './pages/BookSharePage';
import CollabEditorPage from './pages/CollabEditorPage';
import EventsPage from './pages/EventsPage';
import MessageBoardPage from './pages/MessageBoardPage';
import SearchPage from './pages/SearchPage';
import OCRImportPage from './pages/OCRImportPage';
import FamilyMessagePage from './pages/FamilyMessagePage';
import InterviewPage from './pages/InterviewPage';
import InterviewOutlinePage from './pages/InterviewOutlinePage';
import InterviewRecordPage from './pages/InterviewRecordPage';
import TranscriptPage from './pages/TranscriptPage';
import FamilyCreatePage from './pages/FamilyCreatePage';
import CloudStoragePage from './pages/CloudStoragePage';
import AIPrivacyPage from './pages/AIPrivacyPage';
import StoryPublishPage from './pages/StoryPublishPage';
import StoryEditPage from './pages/StoryEditPage';
import AlbumPage from './pages/AlbumPage';
import MemberManagementPage from './pages/MemberManagementPage';
import InviteMemberPage from './pages/InviteMemberPage';
import JoinMemberPage from './pages/JoinMemberPage';
import FamilySettingsPage from './pages/FamilySettingsPage';
import MaterialCenterPage from './pages/MaterialCenterPage';
import BackupPage from './pages/BackupPage';
import RestorePage from './pages/RestorePage';
import StorageManagePage from './pages/StorageManagePage';
import RelationshipGraphPage from './pages/RelationshipGraphPage';
import RelationshipValidationPage from './pages/RelationshipValidationPage';
import OCRReviewPage from './pages/OCRReviewPage';
import OCRHistoryPage from './pages/OCRHistoryPage';
import PersonMessagePage from './pages/PersonMessagePage';
import SmartBuildPage from './pages/SmartBuildPage';
import BottomTab from './components/BottomTab';
import { useAuth } from './context/AuthContext';
import { useFamily } from './context/FamilyContext';

function App() {
  const { user, families, loading, isLoggedIn, login, logout } = useAuth();
  const { currentSpaceId, switchSpace } = useFamily();

  const [activeTab, setActiveTab] = React.useState('home');
  const [overlayPage, setOverlayPage] = React.useState(null);
  const [overlayParams, setOverlayParams] = React.useState({});
  const [pageKey, setPageKey] = React.useState(0);

  // 等待认证初始化
  if (loading) {
    return (
      <div className="app-container" style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '100vh', background: 'var(--paper-warm)' }}>
        <div style={{ fontSize: 24, color: 'var(--ink-primary)' }}>加载中...</div>
      </div>
    );
  }

  // 未登录显示登录页
  if (!isLoggedIn) {
    return <LoginPage onLogin={login} />;
  }

  // 当前家族（从后端数据获取）
  const currentFamily = (families || []).find(f => f.space_id === currentSpaceId);

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

  const handleLogout = () => {
    logout();
    setActiveTab('home');
    setOverlayPage(null);
  };

  const handleSwitchFamily = (familyId) => {
    switchSpace(familyId);
    setPageKey(k => k + 1);
  };

  // 覆盖层页面
  if (overlayPage) {
    const pageMap = {
      familyList: <FamilyListPage onBack={goBack} currentFamilyId={currentSpaceId} onSwitchFamily={handleSwitchFamily} />,
      person: <PersonPage key={pageKey} personId={overlayParams.personId || 3} onBack={goBack} onNavigate={navigate} />,
      personTimeline: <PersonTimelinePage key={pageKey} personId={overlayParams.personId} onBack={goBack} />,
      personCreate: <PersonCreatePage key={pageKey} onBack={goBack} />,
      personEdit: <PersonEditPage key={pageKey} personId={overlayParams.personId} onBack={goBack} />,
      lifebook: <LifeBookPage key={pageKey} personId={overlayParams.personId} onBack={goBack} />,
      lifebookGenerate: <LifeBookGeneratePage key={pageKey} personId={overlayParams.personId} onBack={goBack} />,
      lifebookVersions: <LifeBookVersionPage key={pageKey} bookId={overlayParams.bookId} onBack={goBack} />,
      bookReader: <BookReaderPage key={pageKey} bookId={overlayParams.bookId} onBack={goBack} />,
      bookPrint: <BookPrintPage key={pageKey} bookId={overlayParams.bookId} onBack={goBack} />,
      bookEdit: <BookEditPage key={pageKey} bookId={overlayParams.bookId} onBack={goBack} />,
      bookShare: <BookSharePage key={pageKey} bookId={overlayParams.bookId} bookTitle={overlayParams.bookTitle} onBack={goBack} />,
      collabEditor: <CollabEditorPage key={pageKey} bookId={overlayParams.bookId} onBack={goBack} />,
      events: <EventsPage key={pageKey} onBack={goBack} />,
      message: <MessageBoardPage key={pageKey} onBack={goBack} />,
      search: <SearchPage key={pageKey} onBack={goBack} onNavigate={navigate} />,
      interviewDetail: (
        <InterviewPage
          key={pageKey}
          personId={overlayParams.personId}
          onBack={goBack}
          onNavigate={navigate}
        />
      ),
      interviewOutline: <InterviewOutlinePage key={pageKey} personId={overlayParams.personId} onBack={goBack} />,
      interviewRecord: <InterviewRecordPage key={pageKey} personId={overlayParams.personId} onBack={goBack} />,
      transcript: <TranscriptPage key={pageKey} personId={overlayParams.personId} onBack={goBack} />,
      ocrImport: <OCRImportPage key={pageKey} onBack={goBack} />,
      familyMessages: <FamilyMessagePage key={pageKey} onBack={goBack} />,
      familyCreate: <FamilyCreatePage key={pageKey} onBack={goBack} />,
      cloudStorage: <CloudStoragePage key={pageKey} onBack={goBack} />,
      aiPrivacy: <AIPrivacyPage key={pageKey} onBack={goBack} />,
      storyPublish: <StoryPublishPage key={pageKey} onBack={goBack} />,
      storyEdit: <StoryEditPage key={pageKey} story={overlayParams.story} onBack={goBack} />,
      album: <AlbumPage key={pageKey} personId={overlayParams.personId} onBack={goBack} />,
      memberManage: <MemberManagementPage key={pageKey} onBack={goBack} />,
      inviteMember: <InviteMemberPage key={pageKey} onBack={goBack} />,
      joinMember: <JoinMemberPage key={pageKey} onBack={goBack} />,
      familySettings: <FamilySettingsPage key={pageKey} onBack={goBack} />,
      materialCenter: <MaterialCenterPage key={pageKey} onBack={goBack} />,
      backup: <BackupPage key={pageKey} onBack={goBack} />,
      restore: <RestorePage key={pageKey} onBack={goBack} />,
      storageManage: <StorageManagePage key={pageKey} onBack={goBack} />,
      relationshipGraph: <RelationshipGraphPage key={pageKey} personId={overlayParams.personId} onBack={goBack} />,
      relationshipValidation: <RelationshipValidationPage key={pageKey} personId={overlayParams.personId} onBack={goBack} />,
      ocrReview: <OCRReviewPage key={pageKey} onBack={goBack} />,
      ocrHistory: <OCRHistoryPage key={pageKey} onBack={goBack} />,
      ocrHistoryAlt: <OCRHistoryPage key={pageKey} onBack={goBack} />,
      personMessage: <PersonMessagePage key={pageKey} personId={overlayParams.personId} onBack={goBack} />,
      smartBuild: <SmartBuildPage key={pageKey} onBack={goBack} onImportSuccess={() => navigate('tree')} />,
    };

    if (pageMap[overlayPage]) {
      return pageMap[overlayPage];
    }
  }

  // Tab 主页面
  const renderTabContent = () => {
    switch (activeTab) {
      case 'home':
        return <HomePage key={pageKey} onNavigate={navigate} currentFamily={currentFamily} />;
      case 'tree':
        return <FamilyTreePage key={pageKey} onNavigate={navigate} />;
      case 'interview':
        return <InterviewListPage key={pageKey} onNavigate={navigate} />;
      case 'timeline':
        return <TimelinePage key={pageKey} onNavigate={navigate} />;
      case 'profile':
        return <ProfilePage key={pageKey} onNavigate={navigate} onLogout={handleLogout} />;
      default:
        return <HomePage key={pageKey} onNavigate={navigate} currentFamily={currentFamily} />;
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
