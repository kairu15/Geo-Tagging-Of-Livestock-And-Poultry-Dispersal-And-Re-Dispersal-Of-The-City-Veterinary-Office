import { Outlet, Link, useLocation, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import {
  LayoutDashboard, Beef, Users, Handshake, ArrowLeftRight,
  FileBarChart, LogOut, Menu, X, MapPin, Satellite, Tag,
  ArrowRightLeft, ClipboardCheck, QrCode, Bird, ChevronRight
} from 'lucide-react';
import { useState, useEffect } from 'react';

const navSections = [
  {
    label: 'Overview',
    items: [
      { path: '/', label: 'Dashboard', icon: LayoutDashboard },
    ],
  },
  {
    label: 'Management',
    items: [
      { path: '/animals', label: 'Animals', icon: Beef },
      { path: '/beneficiaries', label: 'Beneficiaries', icon: Users },
      { path: '/species', label: 'Species & Breeds', icon: Bird, roles: ['ADMIN', 'OFFICER', 'SUPERVISOR'] },
    ],
  },
  {
    label: 'Dispersal',
    items: [
      { path: '/dispersal', label: 'Disperse Animal', icon: Handshake, roles: ['ADMIN', 'OFFICER', 'SUPERVISOR'] },
      { path: '/redispersal', label: 'Re-Disperse', icon: ArrowLeftRight, roles: ['ADMIN', 'OFFICER', 'SUPERVISOR'] },
    ],
  },
  {
    label: 'Geo-Tracking',
    items: [
      { path: '/geo-tracking/map', label: 'Tracking Map', icon: Satellite, roles: ['ADMIN', 'OFFICER', 'SUPERVISOR'] },
      { path: '/geo-tracking/lookup', label: 'Tag Lookup', icon: QrCode },
      { path: '/geo-tracking/tag', label: 'Tag Animal', icon: Tag, roles: ['ADMIN', 'OFFICER', 'SUPERVISOR'] },
      { path: '/geo-tracking/handoff', label: 'Handoff', icon: ArrowRightLeft, roles: ['ADMIN', 'OFFICER', 'SUPERVISOR'] },
      { path: '/geo-tracking/checkin', label: 'Check-in', icon: ClipboardCheck, roles: ['ADMIN', 'OFFICER', 'SUPERVISOR'] },
    ],
  },
  {
    label: 'Analytics',
    items: [
      { path: '/reports', label: 'Reports', icon: FileBarChart },
    ],
  },
];

// Flatten for header title lookup
const allNavItems = navSections.flatMap((s) => s.items);

export default function Layout() {
  const { user, logout } = useAuth();
  const location = useLocation();
  const navigate = useNavigate();
  const [sidebarOpen, setSidebarOpen] = useState(false);

  // Close sidebar on route change
  useEffect(() => {
    setSidebarOpen(false);
  }, [location.pathname]);

  // Close sidebar on Escape
  useEffect(() => {
    const handleEsc = (e) => {
      if (e.key === 'Escape' && sidebarOpen) setSidebarOpen(false);
    };
    document.addEventListener('keydown', handleEsc);
    return () => document.removeEventListener('keydown', handleEsc);
  }, [sidebarOpen]);

  const handleLogout = () => {
    logout();
    navigate('/login');
  };

  const filteredNavSections = navSections.map((section) => ({
    ...section,
    items: section.items.filter(
      (item) => !item.roles || item.roles.includes(user?.role)
    ),
  })).filter((section) => section.items.length > 0);

  // STAFF and COORDINATOR users only see read-only pages
  const readOnlyPaths = new Set(['/', '/animals', '/beneficiaries', '/reports', '/geo-tracking/map', '/geo-tracking/lookup']);
  const isStaffUser = user?.role === 'STAFF' || user?.role === 'COORDINATOR';

  const currentLabel = allNavItems.find((n) => n.path === location.pathname)?.label || 'CVO System';

  return (
    <div className="flex h-screen bg-slate-50 overflow-hidden">
      {/* Skip to content (accessibility) */}
      <a href="#main-content" className="skip-to-content">
        Skip to main content
      </a>

      {/* Mobile overlay */}
      {sidebarOpen && (
        <div
          className="fixed inset-0 bg-black/40 backdrop-blur-sm z-30 lg:hidden transition-opacity"
          onClick={() => setSidebarOpen(false)}
          aria-hidden="true"
        />
      )}

      {/* Sidebar */}
      <aside
        className={`fixed lg:static inset-y-0 left-0 z-40 w-[260px] bg-white border-r border-slate-200 flex flex-col transform transition-transform duration-250 ease-out ${
          sidebarOpen ? 'translate-x-0' : '-translate-x-full lg:translate-x-0'
        }`}
        role="navigation"
        aria-label="Main navigation"
      >
        {/* Logo */}
        <div className="flex items-center gap-3 px-5 py-5 border-b border-slate-100">
          <div className="flex items-center justify-center w-10 h-10 rounded-xl bg-gradient-to-br from-green-500 to-emerald-600 shadow-md shadow-green-500/20">
            <MapPin className="h-5 w-5 text-white" />
          </div>
          <div className="flex-1 min-w-0">
            <h1 className="text-base font-bold text-slate-900 leading-tight tracking-tight">CVO System</h1>
            <p className="text-[11px] text-slate-400 leading-tight mt-0.5">Livestock Dispersal</p>
          </div>
          <button
            className="lg:hidden p-1.5 text-slate-400 hover:text-slate-600 hover:bg-slate-100 rounded-lg transition-colors"
            onClick={() => setSidebarOpen(false)}
            aria-label="Close sidebar"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* Navigation */}
        <nav className="flex-1 px-3 py-4 space-y-5 overflow-y-auto" aria-label="Main menu">
          {filteredNavSections.map((section) => (
            <div key={section.label}>
              <p className="px-3 mb-1.5 text-[10px] font-semibold text-slate-400 uppercase tracking-widest">
                {section.label}
              </p>
              <div className="space-y-0.5">
                {section.items.map((item) => {
                  // STAFF users can only see read-only pages
                  if (isStaffUser && !readOnlyPaths.has(item.path)) return null;
                  const Icon = item.icon;
                  const isActive = location.pathname === item.path;
                  return (
                    <Link
                      key={item.path}
                      to={item.path}
                      onClick={() => setSidebarOpen(false)}
                      className={`group flex items-center gap-3 px-3 py-2 rounded-lg text-[13px] font-medium transition-all duration-150 ${
                        isActive
                          ? 'bg-green-50 text-green-700 shadow-sm ring-1 ring-green-200/60'
                          : 'text-slate-500 hover:bg-slate-50 hover:text-slate-800'
                      }`}
                      aria-current={isActive ? 'page' : undefined}
                    >
                      <Icon className={`h-[18px] w-[18px] flex-shrink-0 transition-colors ${
                        isActive ? 'text-green-600' : 'text-slate-400 group-hover:text-slate-600'
                      }`} />
                      {item.label}
                      {isActive && (
                        <ChevronRight className="h-3.5 w-3.5 ml-auto text-green-400" />
                      )}
                    </Link>
                  );
                })}
              </div>
            </div>
          ))}
        </nav>

        {/* User info + logout */}
        <div className="border-t border-slate-100 px-4 py-3">
          <div className="flex items-center gap-3">
            <div className="relative">
              <div className="w-9 h-9 rounded-full bg-gradient-to-br from-green-400 to-emerald-500 flex items-center justify-center text-white font-semibold text-sm shadow-sm">
                {user?.first_name?.[0] || user?.username?.[0]?.toUpperCase()}
              </div>
              <div className="absolute -bottom-0.5 -right-0.5 w-3 h-3 bg-emerald-400 rounded-full border-2 border-white" />
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-sm font-medium text-slate-800 truncate">
                {user?.full_name || user?.username}
              </p>
              <p className="text-[11px] text-slate-400 truncate font-medium flex items-center gap-1.5">
                {user?.role === 'STAFF' && (
                  <span className="inline-flex items-center px-1.5 py-0.5 bg-amber-50 text-amber-600 rounded text-[9px] font-semibold uppercase tracking-wider">
                    Read-Only
                  </span>
                )}
                {user?.role}
              </p>
            </div>
            <button
              onClick={handleLogout}
              className="p-2 text-slate-400 hover:text-red-500 hover:bg-red-50 rounded-lg transition-all duration-150"
              title="Sign out"
              aria-label="Sign out"
            >
              <LogOut className="h-4 w-4" />
            </button>
          </div>
        </div>
      </aside>

      {/* Main content */}
      <div className="flex-1 flex flex-col min-w-0">
        {/* Top bar */}
        <header className="bg-white/80 backdrop-blur-md border-b border-slate-200/80 px-4 lg:px-6 h-14 flex items-center gap-4 sticky top-0 z-20">
          <button
            className="lg:hidden p-2 text-slate-500 hover:text-slate-800 rounded-lg hover:bg-slate-100 transition-colors"
            onClick={() => setSidebarOpen(true)}
            aria-label="Open menu"
          >
            <Menu className="h-5 w-5" />
          </button>
          <div className="flex items-center gap-2 min-w-0">
            <h2 className="text-[15px] font-semibold text-slate-800 truncate">
              {currentLabel}
            </h2>
          </div>
        </header>

        {/* Page content */}
        <main id="main-content" className="flex-1 overflow-y-auto p-4 lg:p-6 scroll-smooth">
          <div className="animate-fade-in">
            <Outlet />
          </div>
        </main>
      </div>
    </div>
  );
}
