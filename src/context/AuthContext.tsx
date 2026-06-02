import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';

interface StoredUser {
  id: string;
  email: string;
  name: string;
  passwordHash: string;
  createdAt: string;
}

interface AuthUser {
  id: string;
  email: string;
  name: string;
}

interface AuthContextType {
  user: AuthUser | null;
  loading: boolean;
  signup: (name: string, email: string, password: string) => Promise<{ error?: string }>;
  login: (email: string, password: string) => Promise<{ error?: string }>;
  logout: () => void;
  updateName: (name: string) => { error?: string };
  changePassword: (current: string, next: string) => Promise<{ error?: string }>;
  deleteAccount: (password: string) => Promise<{ error?: string }>;
  getCreatedAt: () => string | null;
}

const AuthContext = createContext<AuthContextType | null>(null);

const USERS_KEY = 'stride-auth-users';
const SESSION_KEY = 'stride-auth-session';

// Lightweight, non-cryptographic hash — frontend-only obfuscation.
// (For real security, use a backend.)
async function hashPassword(password: string): Promise<string> {
  const data = new TextEncoder().encode(password + '::stride-salt');
  const buf = await crypto.subtle.digest('SHA-256', data);
  return Array.from(new Uint8Array(buf)).map(b => b.toString(16).padStart(2, '0')).join('');
}

function loadUsers(): StoredUser[] {
  try { return JSON.parse(localStorage.getItem(USERS_KEY) || '[]'); } catch { return []; }
}

function saveUsers(users: StoredUser[]) {
  localStorage.setItem(USERS_KEY, JSON.stringify(users));
}

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<AuthUser | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    try {
      const session = localStorage.getItem(SESSION_KEY);
      if (session) setUser(JSON.parse(session));
    } catch {}
    setLoading(false);
  }, []);

  const signup = useCallback(async (
  name: string,
  email: string,
  password: string
) => {
  try {
    const response = await fetch(
      "https://velora-backend-1ty1.onrender.com/api/auth/register",
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          name,
          email,
          password,
        }),
      }
    );

    const data = await response.json();

    if (!response.ok) {
      return {
        error: data.message,
      };
    }

    // Save JWT token
    localStorage.setItem(
      "token",
      data.token
    );

    // Save logged-in user in React state
    setUser(data.user);

    return {};
  } catch (err) {
    return {
      error: "Server connection failed",
    };
  }
}, []);

  const login = useCallback(async (email: string, password: string) => {
  try {
    const response = await fetch(
      "https://velora-backend-1ty1.onrender.com/api/auth/login",
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          email,
          password,
        }),
      }
    );

    const data = await response.json();

    if (!response.ok) {
      return { error: data.message };
    }

    // Save JWT token
    localStorage.setItem(
      "token",
      data.token
    );

    // Save logged-in user
    setUser(data.user);

    return {};
  } catch (err) {
    return {
      error: "Server connection failed",
    };
  }
}, []);

  const logout = useCallback(() => {
  localStorage.removeItem("token");
  setUser(null);
}, []);

  const updateName = useCallback((name: string) => {
    if (!user) return { error: 'Not signed in.' };
    const clean = name.trim();
    if (!clean) return { error: 'Name cannot be empty.' };
    const users = loadUsers();
    const idx = users.findIndex(u => u.id === user.id);
    if (idx === -1) return { error: 'Account not found.' };
    users[idx] = { ...users[idx], name: clean };
    saveUsers(users);
    const session = { ...user, name: clean };
    localStorage.setItem(SESSION_KEY, JSON.stringify(session));
    setUser(session);
    return {};
  }, [user]);

  const changePassword = useCallback(async (current: string, next: string) => {
    if (!user) return { error: 'Not signed in.' };
    if (next.length < 6) return { error: 'New password must be at least 6 characters.' };
    const users = loadUsers();
    const idx = users.findIndex(u => u.id === user.id);
    if (idx === -1) return { error: 'Account not found.' };
    const currentHash = await hashPassword(current);
    if (users[idx].passwordHash !== currentHash) return { error: 'Current password is incorrect.' };
    users[idx] = { ...users[idx], passwordHash: await hashPassword(next) };
    saveUsers(users);
    return {};
  }, [user]);

  const getCreatedAt = useCallback(() => {
    if (!user) return null;
    const found = loadUsers().find(u => u.id === user.id);
    return found?.createdAt ?? null;
  }, [user]);

  const deleteAccount = useCallback(async (password: string) => {
    if (!user) return { error: 'Not signed in.' };
    const users = loadUsers();
    const found = users.find(u => u.id === user.id);
    if (!found) return { error: 'Account not found.' };
    const hash = await hashPassword(password);
    if (found.passwordHash !== hash) return { error: 'Password is incorrect.' };
    // Remove account and all user-scoped data from localStorage.
    saveUsers(users.filter(u => u.id !== user.id));
    const prefix = `::${user.id}`;
    for (let i = localStorage.length - 1; i >= 0; i--) {
      const k = localStorage.key(i);
      if (k && k.endsWith(prefix)) localStorage.removeItem(k);
    }
    localStorage.removeItem(SESSION_KEY);
    setUser(null);
    return {};
  }, [user]);

  return (
    <AuthContext.Provider value={{ user, loading, signup, login, logout, updateName, changePassword, deleteAccount, getCreatedAt }}>

      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used within AuthProvider');
  return ctx;
}
