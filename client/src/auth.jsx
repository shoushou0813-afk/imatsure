import { createContext, useContext, useEffect, useState } from "react";
import { api } from "./api";

/**
 * ログイン状態をアプリ全体で共有する。
 * Context は「バケツリレーを避けて値を配る」React の仕組み。
 */
const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [ready, setReady] = useState(false);

  useEffect(() => {
    api.get("/auth/me").then((r) => setUser(r.data)).catch(() => setUser(null)).finally(() => setReady(true));
  }, []);

  const login = async (handle, password) => {
    const r = await api.post("/auth/login", { handle, password });
    setUser(r.data);
    return r.data;
  };
  const register = async (handle, displayName, password) => {
    const r = await api.post("/auth/register", { handle, displayName, password });
    setUser(r.data);
    return r.data;
  };
  const logout = async () => { await api.post("/auth/logout"); setUser(null); };

  return <AuthContext.Provider value={{ user, ready, login, register, logout }}>{children}</AuthContext.Provider>;
}

export const useAuth = () => useContext(AuthContext);
