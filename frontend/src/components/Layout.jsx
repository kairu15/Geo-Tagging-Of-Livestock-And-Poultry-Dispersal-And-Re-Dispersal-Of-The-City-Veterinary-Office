import { Outlet, Link, useLocation, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import {
  LayoutDashboard, Beef, Users, Handshake, ArrowLeftRight,
  FileBarChart, LogOut, Menu, X, MapPin, Satellite, Tag,
  ArrowRightLeft, ClipboardCheck, QrCode
} from 'lucide-react';
import { useState } from 'react';

const navItems = [
  { path: '/', label: 'Dashboard', icon: LayoutDashboard },
  { path: '/animals', label: 'Animals', icon: Beef },
  { path: '/beneficiaries', label: 'Beneficiaries', icon: Users },
  { path: '/dispersal', label: 'Disperse', icon: Handshake, roles: ['ADMIN', 'OFFICER', 'SUPERVISOR'] },
  { path: '/redispersal', label: 'Re-Disperse', icon: ArrowLeftRight, roles: ['ADMIN', 'OFFICER', 'SUPERVISOR'] },
  { path: '/reports', label: 'Reports', icon: FileBarChart },
  // Geo-Tagging section
  { path: '/geo-tracking/map', label: 'Tracking Map', icon: Satellite, roles: ['ADMIN', 'OFFICER', 'SUPERVISOR'] },
  { path: '/geo-tracking/lookup', label: 'Tag Lookup', icon: QrCode },
  { path: '/geo-tracking/tag', label: 'Tag Animal', icon: Tag, roles: ['ADMIN', 'OFFICER', 'SUPERVISOR'] },
  { path: '/geo-tracking/handoff', label: 'Handoff', icon: ArrowRightLeft, roles: ['ADMIN', 'OFFICER', 'SUPERVISOR'] },
  { path: '/geo-tracking/checkin', label: 'Check-in', icon: ClipboardCheck, roles: ['ADMIN', 'OFFICER', 'SUPERVISOR'] },
];

export default function Layout() {
  const { user, logout } = useAuth();
  const location = useLocation();
  const navigate = useNavigate();
  const [sidebarOpen, setSidebarOpen] = useState(false);

  const handleLogout = () => {
    logout();
    navigate('/login');
  };

  const filteredNav = navItems.filter(
    (item) => !item.roles || item.roles.includes(user?.role)
  );

  return (
    <div className="flex h-screen bg-gray-100">
      {/* Mobile overlay */}
      {sidebarOpen && (
        <div
          className="fixed inset-0 bg-black/50 z-30 lg:hidden"
          onClick={() => setSidebarOpen(false)}
        />
      )}

      {/* Sidebar */}
      <aside
        className={`fixed lg:static inset-y-0 left-0 z-40 w-64 bg-white border-r border-gray-200 flex flex-col transform transition-transform duration-200 ${
          sidebarOpen ? 'translate-x-0' : '-translate-x-full lg:translate-x-0'
        }`}
      >
        {/* Logo */}
        <div className="flex items-center gap-2 px-6 py-5 border-b border-gray-200">
          <MapPin className="h-8 w-8 text-green-600" />
          <div>
            <h1 className="text-lg font-bold text-gray-900 leading-tight">CVO</h1>
            <p className="text-xs text-gray-500 leading-tight">Livestock Dispersal</p>
          </div>
          <button className="ml-auto lg:hidden" onClick={() => setSidebarOpen(false)}>
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* Navigation */}
        <nav className="flex-1 px-3 py-4 space-y-1 overflow-y-auto">
          {filteredNav.map((item) => {
            const Icon = item.icon;
            const isActive = location.pathname === item.path;
            return (
              <Link
                key={item.path}
                to={item.path}
                onClick={() => setSidebarOpen(false)}
                className={`flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-colors ${
                  isActive
                    ? 'bg-green-50 text-green-700 border border-green-200'
                    : 'text-gray-600 hover:bg-gray-50 hover:text-gray-900'
                }`}
              >
                <Icon className="h-5 w-5 flex-shrink-0" />
                {item.label}
              </Link>
            );
          })}
        </nav>

        {/* User info + logout */}
        <div className="border-t border-gray-200 px-4 py-4">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-full bg-green-100 flex items-center justify-center text-green-700 font-bold text-sm">
              {user?.first_name?.[0] || user?.username?.[0]?.toUpperCase()}
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-sm font-medium text-gray-900 truncate">
                {user?.full_name || user?.username}
              </p>
              <p className="text-xs text-gray-500 truncate">{user?.role}</p>
            </div>
            <button
              onClick={handleLogout}
              className="p-1.5 text-gray-400 hover:text-red-600 rounded-lg hover:bg-red-50 transition-colors"
              title="Logout"
            >
              <LogOut className="h-4 w-4" />
            </button>
          </div>
        </div>
      </aside>

      {/* Main content */}
      <div className="flex-1 flex flex-col min-w-0">
        {/* Top bar */}
        <header className="bg-white border-b border-gray-200 px-4 py-3 flex items-center gap-4 lg:px-6">
          <button
            className="lg:hidden p-2 text-gray-600 hover:text-gray-900 rounded-lg hover:bg-gray-100"
            onClick={() => setSidebarOpen(true)}
          >
            <Menu className="h-5 w-5" />
          </button>
          <h2 className="text-lg font-semibold text-gray-800">
            {navItems.find((n) => n.path === location.pathname)?.label || 'CVO System'}
          </h2>
        </header>

        {/* Page content */}
        <main className="flex-1 overflow-y-auto p-4 lg:p-6">
          <Outlet />
        </main>
      </div>
    </div>
  );
}
