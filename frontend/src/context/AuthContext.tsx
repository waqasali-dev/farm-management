import React, { createContext, useContext, useState, useEffect } from 'react';
import { User } from '../types/index.js';
import { api, getAuthToken, setAuthToken, clearAuthToken } from '../lib/api-client.js';

interface AuthContextType {
  user: User | null;
  token: string | null;
  isAuthenticated: boolean;
  isAdmin: boolean;
  isLoading: boolean;
  login: (credentials: { email: string; password: string }) => Promise<User>;
  register: (data: { email: string; password: string; name?: string }) => Promise<User>;
  logout: () => void;
  refreshUser: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [token, setTokenState] = useState<string | null>(() => getAuthToken());
  const [user, setUser] = useState<User | null>(() => {
    try {
      const saved = localStorage.getItem('farm_auth_user');
      return saved ? JSON.parse(saved) : null;
    } catch {
      return null;
    }
  });
  const [isLoading, setIsLoading] = useState<boolean>(true);

  // Validate session on mount
  useEffect(() => {
    async function verifySession() {
      const activeToken = getAuthToken();
      if (!activeToken) {
        setUser(null);
        setIsLoading(false);
        return;
      }

      try {
        const freshUser = await api.getMe();
        setUser(freshUser);
        localStorage.setItem('farm_auth_user', JSON.stringify(freshUser));
      } catch (err) {
        // Token invalid or expired
        clearAuthToken();
        setUser(null);
        setTokenState(null);
      } finally {
        setIsLoading(false);
      }
    }

    verifySession();
  }, []);

  const login = async (credentials: { email: string; password: string }): Promise<User> => {
    const res = await api.login(credentials);
    setAuthToken(res.token);
    setTokenState(res.token);
    setUser(res.user);
    localStorage.setItem('farm_auth_user', JSON.stringify(res.user));
    return res.user;
  };

  const register = async (data: { email: string; password: string; name?: string }): Promise<User> => {
    const res = await api.register(data);
    setAuthToken(res.token);
    setTokenState(res.token);
    setUser(res.user);
    localStorage.setItem('farm_auth_user', JSON.stringify(res.user));
    return res.user;
  };

  const logout = () => {
    clearAuthToken();
    setTokenState(null);
    setUser(null);
    try {
      localStorage.removeItem('farm_v2_active_flock_session');
    } catch {
      // Ignore
    }
    window.location.href = '/login';
  };

  const refreshUser = async () => {
    try {
      const fresh = await api.getMe();
      setUser(fresh);
      localStorage.setItem('farm_auth_user', JSON.stringify(fresh));
    } catch {
      // Ignore
    }
  };

  const isAdmin = user?.role === 'admin';
  const isAuthenticated = !!token && !!user;

  return (
    <AuthContext.Provider
      value={{
        user,
        token,
        isAuthenticated,
        isAdmin,
        isLoading,
        login,
        register,
        logout,
        refreshUser,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = (): AuthContextType => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};
