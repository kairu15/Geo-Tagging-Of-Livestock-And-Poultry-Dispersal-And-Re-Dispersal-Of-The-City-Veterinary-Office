import { useState, useRef, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Bell, Check, CheckCheck, X, AlertTriangle, Shield, Handshake, Heart, ArrowLeftRight } from 'lucide-react';
import { useNotifications, useUnreadNotificationCount, useMarkNotificationRead, useMarkAllNotificationsRead } from '../api/hooks';

function timeAgo(dateStr) {
  const now = new Date();
  const date = new Date(dateStr);
  const seconds = Math.floor((now - date) / 1000);
  if (seconds < 60) return 'just now';
  const minutes = Math.floor(seconds / 60);
  if (minutes < 60) return `${minutes}m ago`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours}h ago`;
  const days = Math.floor(hours / 24);
  return `${days}d ago`;
}

const typeIcons = {
  QUARANTINE: Shield,
  DISEASE_REPORT: AlertTriangle,
  DISPERSAL_REQUEST: Handshake,
  DISPERSAL_APPROVED: Check,
  DISPERSAL_REJECTED: X,
  REDISPERSAL_REQUEST: ArrowLeftRight,
  REDISPERSAL_APPROVED: Check,
  REDISPERSAL_REJECTED: X,
  PASS_ON_DUE: Heart,
  PASS_ON_OVERDUE: AlertTriangle,
  SYSTEM: Bell,
};

const typeColors = {
  QUARANTINE: 'bg-amber-100 text-amber-700',
  DISEASE_REPORT: 'bg-red-100 text-red-700',
  DISPERSAL_REQUEST: 'bg-blue-100 text-blue-700',
  DISPERSAL_APPROVED: 'bg-green-100 text-green-700',
  DISPERSAL_REJECTED: 'bg-slate-100 text-slate-700',
  REDISPERSAL_REQUEST: 'bg-blue-100 text-blue-700',
  REDISPERSAL_APPROVED: 'bg-green-100 text-green-700',
  REDISPERSAL_REJECTED: 'bg-slate-100 text-slate-700',
  PASS_ON_DUE: 'bg-orange-100 text-orange-700',
  PASS_ON_OVERDUE: 'bg-red-100 text-red-700',
  SYSTEM: 'bg-slate-100 text-slate-700',
};

export default function NotificationPanel() {
  const [open, setOpen] = useState(false);
  const panelRef = useRef(null);
  const navigate = useNavigate();

  const { data: unreadData } = useUnreadNotificationCount();
  const { data: notifData, isLoading } = useNotifications({ page_size: 20 });
  const markRead = useMarkNotificationRead();
  const markAllRead = useMarkAllNotificationsRead();

  const unreadCount = unreadData?.unread_count || 0;
  const notifications = notifData?.results || [];

  // Close on outside click
  useEffect(() => {
    function handleClick(e) {
      if (panelRef.current && !panelRef.current.contains(e.target)) {
        setOpen(false);
      }
    }
    if (open) document.addEventListener('mousedown', handleClick);
    return () => document.removeEventListener('mousedown', handleClick);
  }, [open]);

  // Close on Escape
  useEffect(() => {
    function handleEsc(e) {
      if (e.key === 'Escape') setOpen(false);
    }
    if (open) document.addEventListener('keydown', handleEsc);
    return () => document.removeEventListener('keydown', handleEsc);
  }, [open]);

  const handleNotifClick = (notif) => {
    if (!notif.is_read) {
      markRead.mutate(notif.id);
    }
    if (notif.target_url) {
      navigate(notif.target_url);
    }
    setOpen(false);
  };

  return (
    <div className="relative" ref={panelRef}>
      {/* Bell button */}
      <button
        onClick={() => setOpen(!open)}
        className="relative p-2 text-slate-400 hover:text-slate-700 hover:bg-slate-100 rounded-lg transition-colors"
        aria-label={`Notifications${unreadCount > 0 ? ` (${unreadCount} unread)` : ''}`}
        aria-expanded={open}
        aria-haspopup="true"
      >
        <Bell className="h-5 w-5" />
        {unreadCount > 0 && (
          <span className="absolute -top-0.5 -right-0.5 flex items-center justify-center min-w-[18px] h-[18px] px-1 text-[10px] font-bold text-white bg-red-500 rounded-full ring-2 ring-white">
            {unreadCount > 99 ? '99+' : unreadCount}
          </span>
        )}
      </button>

      {/* Dropdown panel */}
      {open && (
        <div
          className="absolute right-0 top-full mt-2 w-[380px] max-h-[500px] bg-white rounded-xl shadow-xl border border-slate-200 overflow-hidden z-50 flex flex-col"
          role="dialog"
          aria-label="Notifications"
        >
          {/* Header */}
          <div className="flex items-center justify-between px-4 py-3 border-b border-slate-100">
            <h3 className="text-sm font-semibold text-slate-800">Notifications</h3>
            {unreadCount > 0 && (
              <button
                onClick={() => markAllRead.mutate()}
                disabled={markAllRead.isPending}
                className="flex items-center gap-1.5 text-xs text-green-600 hover:text-green-700 font-medium transition-colors"
              >
                <CheckCheck className="h-3.5 w-3.5" />
                Mark all read
              </button>
            )}
          </div>

          {/* Notification list */}
          <div className="flex-1 overflow-y-auto">
            {isLoading ? (
              <div className="p-8 text-center text-slate-400 text-sm">Loading...</div>
            ) : notifications.length === 0 ? (
              <div className="p-8 text-center text-slate-400 text-sm">
                <Bell className="h-8 w-8 mx-auto mb-2 text-slate-300" />
                No notifications yet
              </div>
            ) : (
              <ul role="list">
                {notifications.map((notif) => {
                  const Icon = typeIcons[notif.notification_type] || Bell;
                  const colorClass = typeColors[notif.notification_type] || 'bg-slate-100 text-slate-700';
                  return (
                    <li key={notif.id}>
                      <button
                        onClick={() => handleNotifClick(notif)}
                        className={`w-full text-left px-4 py-3 flex gap-3 hover:bg-slate-50 transition-colors border-b border-slate-50 ${
                          !notif.is_read ? 'bg-green-50/30' : ''
                        }`}
                      >
                        <div className={`flex-shrink-0 w-8 h-8 rounded-lg flex items-center justify-center ${colorClass}`}>
                          <Icon className="h-4 w-4" />
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className="flex items-start justify-between gap-2">
                            <p className={`text-sm leading-snug ${!notif.is_read ? 'font-semibold text-slate-900' : 'text-slate-700'}`}>
                              {notif.title}
                            </p>
                            {!notif.is_read && (
                              <span className="flex-shrink-0 w-2 h-2 mt-1.5 rounded-full bg-green-500" />
                            )}
                          </div>
                          <p className="text-xs text-slate-500 mt-0.5 line-clamp-2">{notif.message}</p>
                          <p className="text-[11px] text-slate-400 mt-1">{timeAgo(notif.created_at)}</p>
                        </div>
                      </button>
                    </li>
                  );
                })}
              </ul>
            )}
          </div>

          {/* Footer */}
          {notifications.length > 0 && (
            <div className="px-4 py-2.5 border-t border-slate-100 text-center">
              <button
                onClick={() => { navigate('/reports'); setOpen(false); }}
                className="text-xs text-green-600 hover:text-green-700 font-medium"
              >
                View all notifications
              </button>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
