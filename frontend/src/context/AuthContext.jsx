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

  const { data: meData, isLoading, isError } = useMe();

  // Redirect to /login when auth check fails (401 with no refresh possible)
  useEffect(() => {
    if (isError && !isLoading && !localStorage.getItem('access_token')) {
      navigate('/login', { replace: true });
    }
  }, [isError, isLoading, navigate]);

  useEffect(() => {
    if (meData) {
      setUser(meData);
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

  const isAuthenticated = !!tokens.access && !!user;
  const isAdmin = user?.role === 'ADMIN';
  const isOfficerOrAbove = ['ADMIN', 'OFFICER', 'SUPERVISOR'].includes(user?.role);
  const isSupervisorOrAbove = ['ADMIN', 'SUPERVISOR'].includes(user?.role);

  return (
    <AuthContext.Provider
      value={{
        user,
        isAuthenticated,
        isAdmin,
        isOfficerOrAbove,
        isSupervisorOrAbove,
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
