import { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react';
import api, { setUnauthorizedHandler, tokenStore } from '../api/client';

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const [sessionMessage, setSessionMessage] = useState('');
  const [settings, setSettings] = useState({});

  const loadSettings = useCallback(async () => {
    try {
      const { data } = await api.get('/settings');
      setSettings(data);
    } catch {
      /* ignore */
    }
  }, []);

  const loadMe = useCallback(async () => {
    if (!tokenStore.get()) {
      setLoading(false);
      return;
    }
    try {
      const { data } = await api.get('/auth/me');
      setUser(data);
      loadSettings();
    } catch {
      tokenStore.clear();
      setUser(null);
    } finally {
      setLoading(false);
    }
  }, [loadSettings]);

  useEffect(() => {
    setUnauthorizedHandler((msg) => {
      setUser(null);
      if (msg) setSessionMessage(msg);
    });
    loadMe();
  }, [loadMe]);

  const login = useCallback(
    async (username, password) => {
      const { data } = await api.post('/auth/login', { username, password });
      tokenStore.set(data.token);
      setSessionMessage('');
      setUser(data.user);
      loadSettings();
      return data.user;
    },
    [loadSettings],
  );

  const logout = useCallback(async () => {
    try {
      await api.post('/auth/logout');
    } catch {
      /* token อาจหมดอายุแล้ว */
    }
    tokenStore.clear();
    setUser(null);
  }, []);

  const changePassword = useCallback(async (currentPassword, newPassword) => {
    const { data } = await api.post('/auth/change-password', { currentPassword, newPassword });
    if (data.token) tokenStore.set(data.token);
    return data;
  }, []);

  const value = useMemo(
    () => ({ user, loading, login, logout, changePassword, sessionMessage, settings, reloadSettings: loadSettings, refreshUser: loadMe }),
    [user, loading, login, logout, changePassword, sessionMessage, settings, loadSettings, loadMe],
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export const useAuth = () => useContext(AuthContext);
