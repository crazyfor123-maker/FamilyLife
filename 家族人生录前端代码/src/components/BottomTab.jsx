// ===== 底部Tab导航 =====
function BottomTab({ activeTab, onTabChange }) {
  const tabs = [
    { id: 'home', label: '首页', icon: Icon.Home },
    { id: 'tree', label: '族谱', icon: Icon.Tree },
    { id: 'interview', label: '采访', icon: Icon.Mic },
    { id: 'timeline', label: '时间墙', icon: Icon.Clock },
    { id: 'profile', label: '我的', icon: Icon.User },
  ];

  return (
    <div className="bottom-tab">
      {tabs.map(tab => {
        const IconComp = tab.icon;
        return (
          <div
            key={tab.id}
            className={`tab-item ${activeTab === tab.id ? 'active' : ''}`}
            onClick={() => onTabChange(tab.id)}
          >
            <IconComp size={22} />
            <span className="tab-label">{tab.label}</span>
          </div>
        );
      })}
    </div>
  );
}

Object.assign(window, { BottomTab });
