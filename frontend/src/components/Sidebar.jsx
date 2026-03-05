'use client';

const navItems = [
  {
    id: 'about',
    label: 'How It Works',
    icon: (
      <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
        <path d="M9 18h6"/>
        <path d="M10 22h4"/>
        <path d="M12 2a7 7 0 0 1 4 12.7V17H8v-2.3A7 7 0 0 1 12 2z"/>
      </svg>
    ),
  },
  {
    id: 'analyze',
    label: 'Scan Services',
    icon: (
      <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
        <path d="M12 2L3 7v6c0 5.25 3.83 10.15 9 11 5.17-.85 9-5.75 9-11V7l-9-5z"/>
        <path d="M8 12h8" opacity="0.5"/>
        <path d="M8 9h8" opacity="0.3"/>
        <path d="M8 15h8" opacity="0.7"/>
        <path d="M10 12l2 2 4-4" strokeWidth="2"/>
      </svg>
    ),
  },
  {
    id: 'compare',
    label: 'Compare Policies',
    icon: (
      <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
        <path d="M3 6l3-3 3 3"/>
        <path d="M6 3v12"/>
        <path d="M21 18l-3 3-3-3"/>
        <path d="M18 21V9"/>
        <rect x="1" y="17" width="10" height="5" rx="1"/>
        <rect x="13" y="2" width="10" height="5" rx="1"/>
      </svg>
    ),
  },
  {
    id: 'custom',
    label: 'Paste & Scan',
    icon: (
      <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
        <path d="M16 4h2a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2V6a2 2 0 0 1 2-2h2"/>
        <rect x="8" y="2" width="8" height="4" rx="1"/>
        <path d="M9 14l2 2 4-4"/>
      </svg>
    ),
  },
];

export default function Sidebar({ activeTab, onTabChange }) {
  return (
    <aside className="pl-sidebar">
      <div className="pl-sidebar-brand">
        <span className="pl-sidebar-brand-name">PrivacyLens</span>
      </div>

      <nav className="pl-sidebar-nav" aria-label="Main navigation">
        {navItems.map((item) => (
          <button
            key={item.id}
            className={`pl-sidebar-item${activeTab === item.id ? ' active' : ''}`}
            onClick={() => onTabChange(item.id)}
            aria-current={activeTab === item.id ? 'page' : undefined}
          >
            <span aria-hidden="true">{item.icon}</span>
            <span className="pl-sidebar-label">{item.label}</span>
          </button>
        ))}
      </nav>

    </aside>
  );
}
