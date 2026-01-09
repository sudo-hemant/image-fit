import { Link } from 'react-router-dom';
import { Header } from '../components/Header';

const tools = [
  {
    id: 'fit',
    name: 'Fit Image',
    description: 'Fit images to WhatsApp DP or A4 print size with blur background',
    path: '/fit-image',
    icon: (
      <svg width="32" height="32" viewBox="0 0 32 32" fill="none">
        <rect x="4" y="2" width="24" height="28" rx="2" stroke="currentColor" strokeWidth="2" fill="none" />
        <rect x="8" y="8" width="16" height="12" rx="1" stroke="currentColor" strokeWidth="1.5" fill="none" />
        <path d="M8 16L12 12L16 16L20 10L24 16" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
      </svg>
    ),
  },
  {
    id: 'resize',
    name: 'Resize Image',
    description: 'Change image dimensions by width, height, or percentage',
    path: '/resize-image',
    icon: (
      <svg width="32" height="32" viewBox="0 0 32 32" fill="none">
        <rect x="4" y="4" width="24" height="24" rx="2" stroke="currentColor" strokeWidth="2" fill="none" />
        <path d="M20 12L24 8M24 8L24 12M24 8L20 8" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
        <path d="M12 20L8 24M8 24L12 24M8 24L8 20" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
      </svg>
    ),
  },
  {
    id: 'compress',
    name: 'Compress Image',
    description: 'Reduce file size while preserving visual quality',
    path: '/compress-image',
    icon: (
      <svg width="32" height="32" viewBox="0 0 32 32" fill="none">
        <rect x="4" y="4" width="24" height="24" rx="2" stroke="currentColor" strokeWidth="2" fill="none" />
        <path d="M10 16H22" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
        <path d="M16 10V12" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
        <path d="M16 20V22" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
        <path d="M12 8L16 12L20 8" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
        <path d="M12 24L16 20L20 24" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
      </svg>
    ),
  },
  {
    id: 'crop',
    name: 'Crop Image',
    description: 'Crop with freeform selection or preset aspect ratios',
    path: '/crop-image',
    icon: (
      <svg width="32" height="32" viewBox="0 0 32 32" fill="none">
        <path d="M8 4V24H28" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
        <path d="M4 8H24V28" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
        <rect x="10" y="10" width="12" height="12" stroke="currentColor" strokeWidth="1.5" strokeDasharray="3 2" fill="none" />
      </svg>
    ),
  },
];

export function Home() {
  return (
    <div className="app">
      <Header />

      <main className="main">
        <div className="container">
          <section className="tools-section">
            <h2 className="section-title">Choose a tool</h2>
            <div className="tools-grid">
              {tools.map((tool) => (
                <Link key={tool.id} to={tool.path} className="tool-card">
                  <div className="tool-icon">{tool.icon}</div>
                  <div className="tool-info">
                    <h3 className="tool-name">{tool.name}</h3>
                    <p className="tool-description">{tool.description}</p>
                  </div>
                  <div className="tool-arrow">
                    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                      <line x1="5" y1="12" x2="19" y2="12" />
                      <polyline points="12 5 19 12 12 19" />
                    </svg>
                  </div>
                </Link>
              ))}
            </div>
          </section>

          <section className="privacy-section">
            <div className="privacy-badge">
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <rect x="3" y="11" width="18" height="11" rx="2" ry="2" />
                <path d="M7 11V7a5 5 0 0 1 10 0v4" />
              </svg>
              <span>100% Private - All processing happens in your browser</span>
            </div>
          </section>
        </div>
      </main>

      <footer className="footer">
        <p>Your images are processed locally in your browser. Nothing is uploaded to any server.</p>
      </footer>
    </div>
  );
}
