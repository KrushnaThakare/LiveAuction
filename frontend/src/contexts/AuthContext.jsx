import { createContext, useContext, useState, useEffect, useCallback, useRef } from 'react';
import { authApi } from '../api/auth';
import api from '../api/axios';

const AuthContext = createContext(null);

const TOKEN_KEY = 'ca_token';
const USER_KEY  = 'ca_user';

// Allows AuthContext to trigger a tournament refresh after login
// without creating a circular dependency with TournamentContext
export const onLoginCallbacks = [];

export function AuthProvider({ children }) {
  const [user, setUser]       = useState(() => {
    try { return JSON.parse(localStorage.getItem(USER_KEY)); } catch { return null; }
  });
  const [loading, setLoading] = useState(true);

  // Inject token into every axios request
  useEffect(() => {
    const token = localStorage.getItem(TOKEN_KEY);
    if (token) api.defaults.headers.common['Authorization'] = `Bearer ${token}`;

    const interceptor = api.interceptors.response.use(
      r => r,
      err => {
        if (err.response?.status === 401 || err.response?.status === 403) {
          logout();
        }
        return Promise.reject(err);
      }
    );
    return () => api.interceptors.response.eject(interceptor);
  }, []);

  // Verify token on mount
  useEffect(() => {
    const token = localStorage.getItem(TOKEN_KEY);
    if (!token) { setLoading(false); return; }
    api.defaults.headers.common['Authorization'] = `Bearer ${token}`;
    authApi.me()
      .then(res => setUser(res.data.data))
      .catch(() => logout())
      .finally(() => setLoading(false));
  }, []);

  const login = async (username, password) => {
    const res = await authApi.login(username, password);
    const data = res.data.data;
    localStorage.setItem(TOKEN_KEY, data.token);
    localStorage.setItem(USER_KEY, JSON.stringify(data));
    api.defaults.headers.common['Authorization'] = `Bearer ${data.token}`;
    setUser(data);
    // Notify tournament context to re-fetch now that the token is set
    onLoginCallbacks.forEach(cb => cb());
    return data;
  };

  const logout = useCallback(() => {
    localStorage.removeItem(TOKEN_KEY);
    localStorage.removeItem(USER_KEY);
    delete api.defaults.headers.common['Authorization'];
    setUser(null);
  }, []);

  const isSuperAdmin = user?.role === 'SUPER_ADMIN';
  const isOperator   = user?.role === 'OPERATOR' || isSuperAdmin;
  const isViewer     = !!user; // any authenticated user can view

  return (
    <AuthContext.Provider value={{ user, loading, login, logout, isSuperAdmin, isOperator, isViewer }}>
      {children}
    </AuthContext.Provider>
  );
}

export const useAuth = () => {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used within AuthProvider');
  return ctx;
};
