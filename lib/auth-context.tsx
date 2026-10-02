"use client";

import React, { createContext, useContext, useEffect, useState } from "react";
import { StaffUser } from "@/types";
import { apiFetch } from "@/lib/api-client";

interface AuthContextType {
  user: StaffUser | null;
  loading: boolean;
  login: (token: string, user: StaffUser) => void;
  logout: () => void;
  hasRole: (roles: string[]) => boolean;
}

const AuthContext = createContext<AuthContextType | null>(null);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<StaffUser | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const token = localStorage.getItem("gg_staff_token");
    const savedUser = localStorage.getItem("gg_staff_user");

    if (token && savedUser) {
      try {
        setUser(JSON.parse(savedUser));
        // Verify with backend
        apiFetch<StaffUser>("/auth/staff/me")
          .then((verifiedUser) => {
            setUser(verifiedUser);
            localStorage.setItem("gg_staff_user", JSON.stringify(verifiedUser));
          })
          .catch(() => {
            // Handled by 401 redirect in api-client
          })
          .finally(() => {
            setLoading(false);
          });
      } catch {
        setLoading(false);
      }
    } else {
      setLoading(false);
    }
  }, []);

  const login = (token: string, newUser: StaffUser) => {
    localStorage.setItem("gg_staff_token", token);
    localStorage.setItem("gg_staff_user", JSON.stringify(newUser));
    setUser(newUser);
  };

  const logout = () => {
    localStorage.removeItem("gg_staff_token");
    localStorage.removeItem("gg_staff_user");
    setUser(null);
    window.location.href = "/login";
  };

  const hasRole = (allowedRoles: string[]) => {
    if (!user) return false;
    return allowedRoles.includes(user.role);
  };

  return (
    <AuthContext.Provider value={{ user, loading, login, logout, hasRole }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error("useAuth must be used within an AuthProvider");
  }
  return context;
}
