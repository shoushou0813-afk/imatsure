import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "../auth";
import Layout from "../components/Layout";

export default function Login() {
  const { login, register } = useAuth();
  const nav = useNavigate();
  const [mode, setMode] = useState("login");
  const [f, setF] = useState({ handle: "", displayName: "", password: "" });
  const [error, setError] = useState(null);

  const submit = async (e) => {
    e.preventDefault();
    try {
      if (mode === "login") await login(f.handle, f.password);
      else await register(f.handle, f.displayName, f.password);
      nav("/");
    } catch (err) { setError(err.message); }
  };

  return (
    <Layout>
      <form className="form" onSubmit={submit}>
        <h1 style={{ fontFamily: "var(--f-disp)", fontSize: 20, margin: 0 }}>
          {mode === "login" ? "ログイン" : "アカウントを作る"}
        </h1>
        {error && <div className="error">{error}</div>}

        <div className="field"><label htmlFor="handle">ID</label>
          <input id="handle" value={f.handle} onChange={(e) => setF({ ...f, handle: e.target.value })}
            autoComplete="username" required /></div>

        {mode === "register" && (
          <div className="field"><label htmlFor="dn">表示名</label>
            <input id="dn" value={f.displayName} onChange={(e) => setF({ ...f, displayName: e.target.value })} /></div>
        )}

        <div className="field"><label htmlFor="pw">パスワード（8文字以上）</label>
          <input id="pw" type="password" value={f.password} onChange={(e) => setF({ ...f, password: e.target.value })}
            autoComplete={mode === "login" ? "current-password" : "new-password"} required /></div>

        <button className="btn" type="submit">{mode === "login" ? "ログイン" : "登録する"}</button>
        <button className="btn ghost" type="button" onClick={() => { setMode(mode === "login" ? "register" : "login"); setError(null); }}>
          {mode === "login" ? "アカウントを作る" : "ログインに戻る"}
        </button>

        {mode === "login" && (
          <p style={{ fontSize: 12.5, color: "var(--ink-3)" }}>
            開発用のテストアカウント： ID <code>kaz</code> ／ パスワード <code>password123</code>
          </p>
        )}
      </form>
    </Layout>
  );
}
