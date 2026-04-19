/**
 * context/AuthContext.jsx — Auth state shared across all pages
 */
import { createContext, useContext, useState, useEffect, useCallback } from 'react';
import api from '../lib/axios';

const AuthContext = createContext(null);

export const AuthProvider = ({ children }) => {
  const [user, setUser]       = useState(null);
  const [loading, setLoading] = useState(true);

  // Gmail OAuth access token (stored in sessionStorage, not DB)
  const [gmailToken, setGmailToken] = useState(
    () => sessionStorage.getItem('gmail_access_token') || null
  );

  const fetchMe = useCallback(async () => {
    try {
      const { data } = await api.get('/api/auth/me');
      setUser(data);
    } catch {
      setUser(null);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { fetchMe(); }, [fetchMe]);

  const logout = async () => {
    try { await api.post('/api/auth/logout'); } catch { /* ignore */ }
    sessionStorage.removeItem('gmail_access_token');
    setUser(null);
    setGmailToken(null);
  };

  const saveGmailToken = (token) => {
    sessionStorage.setItem('gmail_access_token', token);
    setGmailToken(token);
  };

  return (
    <AuthContext.Provider value={{ user, setUser, loading, logout, gmailToken, saveGmailToken, refetchUser: fetchMe }}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used inside <AuthProvider>');
  return ctx;
};
