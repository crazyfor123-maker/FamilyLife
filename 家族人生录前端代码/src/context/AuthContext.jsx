// ===== AuthContext：全局认证状态 =====
import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import { autoLogin, logout, getMe } from '../api/auth';

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [families, setFamilies] = useState([]);
  const [loading, setLoading] = useState(true);
  const [isLoggedIn, setIsLoggedIn] = useState(false);

  // 初始化：检查自动登录
  useEffect(() => {
    autoLogin().then(res => {
      if (res.code === 0 && res.isLoggedIn) {
        setUser(res.user);
        setFamilies(res.families || []);
        setIsLoggedIn(true);
      } else {
        setUser(null);
        setFamilies([]);
        setIsLoggedIn(false);
      }
      setLoading(false);
    }).catch(() => {
      setLoading(false);
    });
  }, []);

  // 登录
  const doLogin = useCallback((phone, code) => {
    return import('../api/auth').then(({ login }) =>
      login(phone, code).then(res => {
        if (res.code === 0 && res.data) {
          setUser(res.data.user);
          setFamilies(res.data.families || []);
          setIsLoggedIn(true);
        }
        return res;
      })
    );
  }, []);

  // 登出
  const doLogout = useCallback(() => {
    logout().catch(() => {});
    setUser(null);
    setFamilies([]);
    setIsLoggedIn(false);
  }, []);

  // 刷新用户信息
  const refreshUser = useCallback(() => {
    getMe().then(res => {
      if (res.code === 0 && res.data) {
        setUser(res.data);
        setFamilies(res.data.families || []);
        setIsLoggedIn(true);
      }
    }).catch(() => {});
  }, []);

  return (
    <AuthContext.Provider value={{
      user, families, loading, isLoggedIn,
      login: doLogin, logout: doLogout, refreshUser
    }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used within AuthProvider');
  return ctx;
}
