import { createContext, useContext, useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { useMe } from '../api/hooks';

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const navigate = useNavigate();
  const [user, setUser] = useState(null);
  const [tokens, setTokens] = useState({
    access: localStorage.getItem('access_token'),
    refresh: localStorage.getItem('refresh_token'),
  });

  const { data: meData, isLoading, isError, error } = useMe();

  // Derive user and tokens directly from meData and localStorage.
  // This avoids the useEffect race condition where user isn't set
  // before ProtectedRoute checks isAuthenticated during render.
  const currentUser = meData || user;
  const currentAccess = tokens.access || localStorage.getItem('access_token');
  const currentRefresh = tokens.refresh || localStorage.getItem('refresh_token');

  // Redirect to /login only after tokens are definitively gone from localStorage
  // (the interceptor clears them when refresh truly fails)
  useEffect(() => {
    if (isError && !isLoading && !localStorage.getItem('access_token') && !localStorage.getItem('refresh_token')) {
      navigate('/login', { replace: true });
    }
  }, [isError, isLoading, navigate]);

  // After successful /auth/me, sync tokens from localStorage
  // (interceptor may have refreshed them)
  useEffect(() => {
    if (meData) {
      setUser(meData);
      const freshAccess = localStorage.getItem('access_token');
      const freshRefresh = localStorage.getItem('refresh_token');
      setTokens({ access: freshAccess, refresh: freshRefresh });
    }
  }, [meData]);

  const login = (access, refresh, userData) => {
    localStorage.setItem('access_token', access);
    localStorage.setItem('refresh_token', refresh);
    setTokens({ access, refresh });
    setUser(userData);
  };

  const logout = () => {
    localStorage.removeItem('access_token');
    localStorage.removeItem('refresh_token');
    setTokens({ access: null, refresh: null });
    setUser(null);
  };

  const isAuthenticated = !!currentAccess && !!currentUser;
  const isAdmin = currentUser?.role === 'ADMIN';
  const isOfficerOrAbove = ['ADMIN', 'OFFICER', 'SUPERVISOR'].includes(currentUser?.role);
  const isSupervisorOrAbove = ['ADMIN', 'SUPERVISOR'].includes(currentUser?.role);
  const isReadOnly = ['STAFF', 'COORDINATOR'].includes(currentUser?.role);
  const canWrite = isOfficerOrAbove;

  // Debug: log role info for troubleshooting
  if (currentUser) {
    console.log('[Auth] User role:', currentUser.role, '| canWrite:', canWrite, '| isReadOnly:', isReadOnly);
  }

  return (
    <AuthContext.Provider
      value={{
        user: currentUser,
        isAuthenticated,
        isAdmin,
        isOfficerOrAbove,
        isSupervisorOrAbove,
        isReadOnly,
        canWrite,
        isLoading,
        login,
        logout,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) throw new Error('useAuth must be used within AuthProvider');
  return context;
};
