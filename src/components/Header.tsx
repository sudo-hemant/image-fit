import { Link, useLocation } from 'react-router-dom';

interface NavItem {
  path: string;
  label: string;
  icon: JSX.Element;
}

const NAV_ITEMS: NavItem[] = [
  {
    path: '/fit-image',
    label: 'Fit to Size',
    icon: (
      <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <rect x="3" y="3" width="18" height="18" rx="2" />
        <circle cx="8.5" cy="8.5" r="1.5" />
        <path d="M21 15l-5-5L5 21" />
      </svg>
    ),
  },
  {
    path: '/resize-image',
    label: 'Resize',
    icon: (
      <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <path d="M15 3h6v6M14 10l6.1-6.1M9 21H3v-6M10 14l-6.1 6.1" />
      </svg>
    ),
  },
  {
    path: '/crop-image',
    label: 'Crop',
    icon: (
      <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <path d="M6 2v14a2 2 0 0 0 2 2h14" />
        <path d="M18 22V8a2 2 0 0 0-2-2H2" />
      </svg>
    ),
  },
  {
    path: '/compress-image',
    label: 'Compress',
    icon: (
      <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <path d="M12 3v12" />
        <path d="m8 11 4 4 4-4" />
        <path d="M8 5H4a2 2 0 0 0-2 2v10a2 2 0 0 0 2 2h16a2 2 0 0 0 2-2V7a2 2 0 0 0-2-2h-4" />
      </svg>
    ),
  },
];

export function Header() {
  const location = useLocation();

  return (
    <header className="app-header">
      <div className="header-inner">
        <Link to="/" className="header-logo">
          <div className="logo-icon">
            <svg width="36" height="36" viewBox="0 0 40 40" fill="none">
              <defs>
                <linearGradient id="headerLogoGradient" x1="0%" y1="0%" x2="100%" y2="100%">
                  <stop offset="0%" stopColor="#667eea" />
                  <stop offset="100%" stopColor="#764ba2" />
                </linearGradient>
              </defs>
              <rect x="4" y="2" width="32" height="36" rx="4" fill="url(#headerLogoGradient)" />
              <rect x="8" y="6" width="24" height="28" rx="2" fill="white" fillOpacity="0.9" />
              <path d="M14 18L20 24L26 18" stroke="url(#headerLogoGradient)" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" />
              <line x1="20" y1="12" x2="20" y2="24" stroke="url(#headerLogoGradient)" strokeWidth="2.5" strokeLinecap="round" />
            </svg>
          </div>
          <span className="logo-text">ImageFit</span>
        </Link>

        <nav className="header-nav">
          {NAV_ITEMS.map((item) => (
            <Link
              key={item.path}
              to={item.path}
              className={`nav-link ${location.pathname === item.path ? 'active' : ''}`}
            >
              {item.icon}
              <span>{item.label}</span>
            </Link>
          ))}
        </nav>
      </div>
    </header>
  );
}
