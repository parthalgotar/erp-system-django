import React, { createContext, useContext, useState, useCallback } from "react";
import { api } from "../api/client.js";

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const [token, setToken] = useState(() => localStorage.getItem("erp_token") || "");
  const [email, setEmail] = useState(() => localStorage.getItem("erp_email") || "");

  const login = useCallback(async (credentials) => {
    const data = await api.login(credentials);
    setToken(data.access_token);
    setEmail(credentials.email);
    localStorage.setItem("erp_token", data.access_token);
    localStorage.setItem("erp_email", credentials.email);
    return data;
  }, []);

  const register = useCallback(async (payload) => {
    return api.register(payload);
  }, []);

  const logout = useCallback(() => {
    setToken("");
    setEmail("");
    localStorage.removeItem("erp_token");
    localStorage.removeItem("erp_email");
  }, []);

  const value = { token, email, isAuthenticated: Boolean(token), login, register, logout };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth must be used within AuthProvider");
  return ctx;
}
