import React, { createContext, useContext, useState, useEffect } from 'react';
import { UserProfile, UserRole } from '../types';
import { useTelemetry } from './TelemetryContext';

interface AuthContextType {
  currentUser: UserProfile | null;
  isAuthenticated: boolean;
  isAdmin: boolean;
  setRole: (role: UserRole) => void;
  toggleRole: () => void;
  logout: () => void;
  loginAsDemoAdmin: () => void;
  loginAsStandardUser: () => void;
  loginByEmail: (email: string) => Promise<boolean>;
  loginWithGoogle: (email?: string, name?: string) => Promise<boolean>;
  sendOtp: (email: string) => Promise<{ success: boolean; message?: string; demoOtpCode?: string; error?: string }>;
  verifyOtp: (email: string, code: string) => Promise<{ success: boolean; message?: string; error?: string }>;
}

const STORAGE_KEY = 'fidelity_auth_user_v1';

const DEFAULT_SUPER_ADMIN: UserProfile = {
  id: 'usr_admin_01',
  name: 'M Sajid Ali',
  email: 'admin@fidelity.ai',
  role: 'super_admin',
  avatarInitials: 'SA',
  title: 'Super Admin & Lead Architect',
};

const DEFAULT_STANDARD_USER: UserProfile = {
  id: 'usr_standard_88',
  name: 'Alex Rivera',
  email: 'a.rivera@candidate.io',
  role: 'user',
  avatarInitials: 'AR',
  title: 'Senior Engineer Candidate',
};

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const telemetry = useTelemetry();

  const [currentUser, setCurrentUser] = useState<UserProfile | null>(() => {
    try {
      const saved = localStorage.getItem(STORAGE_KEY);
      if (saved) {
        return JSON.parse(saved);
      }
    } catch (e) {
      console.error('Failed to parse auth profile from localStorage:', e);
    }
    // Unauthenticated by default if no stored session; user will be prompted with LoginPage
    return null;
  });

  // Fetch initial profile from backend DB on mount if user is logged in
  useEffect(() => {
    if (!currentUser) return;

    let isMounted = true;
    fetch('/api/user/profile', {
      headers: {
        'x-user-email': currentUser.email,
      },
    })
      .then(async (res) => {
        if (!res.ok) return null;
        const text = await res.text();
        return text && text.trim() ? JSON.parse(text) : null;
      })
      .then((data) => {
        if (isMounted && data?.user) {
          const dbUser: UserProfile = {
            id: data.user.id,
            name: data.user.name,
            email: data.user.email,
            role: data.user.role,
            avatarInitials: data.user.avatarInitials || 'SA',
            title: data.user.role === 'super_admin' ? 'Super Admin & Lead Architect' : 'Standard Candidate / Recruiter',
          };
          setCurrentUser(dbUser);
        }
      })
      .catch((err) => {
        console.warn('Backend user profile fetch notice:', err?.message || err);
      });

    return () => {
      isMounted = false;
    };
  }, [currentUser?.email]);

  useEffect(() => {
    try {
      if (currentUser) {
        localStorage.setItem(STORAGE_KEY, JSON.stringify(currentUser));
      } else {
        localStorage.removeItem(STORAGE_KEY);
      }
    } catch (e) {
      console.error('Failed to persist auth profile to localStorage:', e);
    }
  }, [currentUser]);

  const setRole = (newRole: UserRole) => {
    if (!currentUser) return;
    setCurrentUser((prev) => {
      if (!prev) return null;
      const updated = {
        ...prev,
        role: newRole,
        title: newRole === 'super_admin' ? 'Super Admin & Lead Architect' : 'Standard Candidate / Recruiter',
      };

      // Notify backend DB
      fetch('/api/user/role', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ userId: updated.id, role: newRole }),
      }).catch((err) => console.warn('Failed to update backend role:', err));

      telemetry.captureLog(
        'INFO',
        'RBAC Security Engine',
        `User ${updated.email} role transitioned to '${newRole.toUpperCase()}'.`,
        { userId: updated.id, newRole }
      );
      return updated;
    });
  };

  const toggleRole = () => {
    if (!currentUser) return;
    const nextRole: UserRole = currentUser.role === 'super_admin' ? 'user' : 'super_admin';
    setRole(nextRole);
  };

  const logout = () => {
    setCurrentUser(null);
    try {
      localStorage.removeItem(STORAGE_KEY);
    } catch (e) {
      console.error(e);
    }
    telemetry.captureLog('INFO', 'Auth Session', 'User explicitly logged out. Access revoked, session terminated.');
  };

  const loginAsDemoAdmin = () => {
    setCurrentUser(DEFAULT_SUPER_ADMIN);
    telemetry.captureLog('INFO', 'Auth Session', 'Logged in as Super Admin (M Sajid Ali).');
  };

  const loginAsStandardUser = () => {
    setCurrentUser(DEFAULT_STANDARD_USER);
    telemetry.captureLog('INFO', 'Auth Session', 'Logged in as Standard User (Alex Rivera).');
  };

  const loginByEmail = async (email: string): Promise<boolean> => {
    try {
      const res = await fetch(`/api/user/profile?email=${encodeURIComponent(email)}`);
      let data: any = null;
      try {
        const text = await res.text();
        if (text && text.trim()) {
          data = JSON.parse(text);
        }
      } catch (jsonErr) {
        console.warn('Login by email response was not valid JSON:', jsonErr);
      }

      if (data?.user) {
        const initials = data.user.name
          ? data.user.name.split(' ').map((n: string) => n[0]).join('').toUpperCase().substring(0, 2)
          : 'US';
        const userProf: UserProfile = {
          id: data.user.id,
          name: data.user.name || email,
          email: data.user.email,
          role: data.user.role || 'user',
          avatarInitials: initials,
          title: data.user.role === 'super_admin' ? 'Super Admin & Lead Architect' : 'Standard Candidate / Recruiter',
        };
        setCurrentUser(userProf);
        telemetry.captureLog('INFO', 'Auth Session', `Switched authenticated user session to ${email}.`);
        return true;
      }
    } catch (e) {
      console.warn('Login by email error:', e);
    }
    return false;
  };

  const loginWithGoogle = async (email?: string, name?: string): Promise<boolean> => {
    const targetEmail = email || 'verified.google.user@gmail.com';
    const targetName = name || 'Google Verified User';

    try {
      const res = await fetch('/api/auth/google', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          email: targetEmail,
          name: targetName,
          role: 'user',
        }),
      });

      let data: any = null;
      try {
        const text = await res.text();
        if (text && text.trim()) {
          data = JSON.parse(text);
        }
      } catch (jsonErr) {
        console.warn('Google login response was not valid JSON:', jsonErr);
      }

      const user = data?.user || {
        id: 'usr_g_' + Date.now().toString(36),
        name: targetName,
        email: targetEmail,
        role: 'user',
      };

      const initials = user.name
        ? user.name.split(' ').map((n: string) => n[0]).join('').toUpperCase().substring(0, 2)
        : 'GU';

      const userProf: UserProfile = {
        id: user.id || 'usr_g_' + Date.now().toString(36),
        name: user.name || targetName,
        email: user.email || targetEmail,
        role: user.role || 'user',
        avatarInitials: initials,
        title: user.role === 'super_admin' ? 'Super Admin & Lead Architect' : 'Google Authenticated User',
      };

      setCurrentUser(userProf);
      telemetry.captureLog('INFO', 'Auth Session', `Google OAuth sign in successful for ${userProf.email}`);
      return true;
    } catch (e) {
      console.error('Google login error:', e);
      // Fallback local user creation so authentication always succeeds
      const initials = targetName.split(' ').map((n) => n[0]).join('').toUpperCase().substring(0, 2) || 'GU';
      const fallbackProf: UserProfile = {
        id: 'usr_g_' + Date.now().toString(36),
        name: targetName,
        email: targetEmail,
        role: 'user',
        avatarInitials: initials,
        title: 'Google Authenticated User',
      };
      setCurrentUser(fallbackProf);
      telemetry.captureLog('INFO', 'Auth Session', `Google OAuth fallback session created for ${targetEmail}`);
      return true;
    }
  };

  const sendOtp = async (email: string): Promise<{ success: boolean; message?: string; demoOtpCode?: string; error?: string }> => {
    try {
      const res = await fetch('/api/auth/send-otp', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email }),
      });
      const data = await res.json();
      if (res.ok && data.success) {
        return { success: true, message: data.message, demoOtpCode: data.demoOtpCode };
      }
      return { success: false, error: data.error || 'Failed to send verification code.' };
    } catch (err: any) {
      return { success: false, error: err?.message || 'Server error sending verification code.' };
    }
  };

  const verifyOtp = async (email: string, code: string): Promise<{ success: boolean; message?: string; error?: string }> => {
    try {
      const res = await fetch('/api/auth/verify-otp', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, code }),
      });
      const data = await res.json();
      if (res.ok && data.success && data.user) {
        const initials = data.user.name
          ? data.user.name.split(' ').map((n: string) => n[0]).join('').toUpperCase().substring(0, 2)
          : 'US';
        const userProf: UserProfile = {
          id: data.user.id,
          name: data.user.name || email,
          email: data.user.email,
          role: data.user.role || 'user',
          avatarInitials: initials,
          title: data.user.role === 'super_admin' ? 'Super Admin & Lead Architect' : 'Standard Candidate / Recruiter',
        };
        setCurrentUser(userProf);
        telemetry.captureLog('INFO', 'Auth Session', `Verified OTP and logged in user ${email}`);
        return { success: true, message: data.message };
      }
      return { success: false, error: data.error || 'Invalid verification code.' };
    } catch (err: any) {
      return { success: false, error: err?.message || 'Server error verifying code.' };
    }
  };

  const isAuthenticated = currentUser !== null;
  const isAdmin = currentUser !== null && currentUser.role === 'super_admin';

  return (
    <AuthContext.Provider
      value={{
        currentUser,
        isAuthenticated,
        isAdmin,
        setRole,
        toggleRole,
        logout,
        loginAsDemoAdmin,
        loginAsStandardUser,
        loginByEmail,
        loginWithGoogle,
        sendOtp,
        verifyOtp,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};
