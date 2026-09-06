import { useState } from "react";
import { supabase } from "../supabase/config";

export default function LoginPage() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");

  const translateError = (e) => {
    const msg = e.message ?? "";
    if (msg.includes("Invalid login credentials")) return "メールアドレスまたはパスワードが正しくありません";
    if (msg.includes("User already registered")) return "このメールアドレスは既に登録されています";
    if (msg.includes("Password should be at least")) return "パスワードは6文字以上で入力してください";
    if (msg.includes("Unable to validate email address") || msg.includes("Invalid email") || msg.includes("is invalid")) return "正しいメールアドレスを入力してください";
    if (msg.includes("Email not confirmed")) return "メールアドレスの確認が完了していません。届いた確認メール内のリンクをクリックしてください";
    return `処理に失敗しました（${msg || "不明なエラー"}）`;
  };

  const handleLogin = async () => {
    setError("");
    setNotice("");
    setLoading(true);
    try {
      const { error: signInError } = await supabase.auth.signInWithPassword({ email, password });
      if (signInError) throw signInError;
    } catch (e) {
      setError(translateError(e));
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = () => {
    if (!email || !password) {
      setError("メールアドレスとパスワードを入力してください");
      return;
    }
    handleLogin();
  };

  return (
    <div style={styles.container}>
      <div style={styles.header}>
        <div style={styles.logoWrapper}>
          <span style={styles.logoKanji}>shinEDO-ouen</span>
        </div>
        <p style={styles.tagline}>日本の伝統文化を、みんなで守る</p>
      </div>

      <div style={styles.card}>
        <div style={styles.tabs}>
          <button
            style={{ ...styles.tabBtn, ...styles.tabActive }}
          >
            ログイン
          </button>
        </div>

        <h2 style={styles.title}>メールアドレスでログイン</h2>
        <p style={styles.desc}>登録済みのメールアドレスとパスワードを入力してください</p>

        <div style={styles.inputGroup}>
          <label style={styles.label}>メールアドレス</label>
          <input
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder="you@example.com"
            style={styles.input}
            autoComplete="email"
          />
        </div>

        <div style={styles.inputGroup}>
          <label style={styles.label}>パスワード</label>
          <input
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            placeholder="6文字以上"
            style={styles.input}
            autoComplete="current-password"
          />
        </div>

        {notice && <p style={styles.notice}>{notice}</p>}
        {error && <p style={styles.error}>{error}</p>}

        <button
          onClick={handleSubmit}
          disabled={loading || !email || !password}
          style={{ ...styles.btn, ...(loading || !email || !password ? styles.btnDisabled : {}) }}
        >
          {loading ? "処理中..." : "ログイン"}
        </button>

        <p style={styles.signupHint}>
          初めての方は<a href="https://wasabikami.github.io/shinEDO/#apply" style={styles.link2}>shinEDOのHP</a>から登録してください
        </p>
      </div>

      <div style={styles.footer}>
        <p style={styles.footerText}>
          ログインすることで<br />
          <span style={styles.link}>利用規約</span>および<span style={styles.link}>プライバシーポリシー</span>に同意したものとみなします
        </p>
      </div>
    </div>
  );
}

const styles = {
  container: {
    minHeight: "100vh",
    background: "linear-gradient(160deg, #1B5E20 0%, #2E7D32 40%, #388E3C 100%)",
    display: "flex",
    flexDirection: "column",
    alignItems: "center",
    padding: "40px 20px 32px",
  },
  header: {
    textAlign: "center",
    marginBottom: 40,
  },
  logoWrapper: {
    display: "flex",
    flexDirection: "column",
    alignItems: "center",
    gap: 4,
  },
  logoKanji: {
    fontSize: 32,
    fontWeight: "bold",
    color: "#fff",
    lineHeight: 1,
    letterSpacing: 1,
    textShadow: "0 2px 8px rgba(0,0,0,0.2)",
  },
  tagline: {
    marginTop: 12,
    color: "rgba(255,255,255,0.85)",
    fontSize: 14,
  },
  card: {
    background: "#fff",
    borderRadius: 20,
    padding: "32px 24px",
    width: "100%",
    maxWidth: 400,
    boxShadow: "0 8px 32px rgba(0,0,0,0.15)",
  },
  tabs: {
    display: "flex",
    borderRadius: 12,
    background: "#f5f5f5",
    padding: 4,
    marginBottom: 24,
  },
  tabBtn: {
    flex: 1,
    padding: "10px",
    fontSize: 14,
    fontWeight: "bold",
    color: "#757575",
    background: "transparent",
    borderRadius: 9,
  },
  tabActive: {
    background: "#fff",
    color: "#2E7D32",
    boxShadow: "0 1px 4px rgba(0,0,0,0.12)",
  },
  title: {
    fontSize: 22,
    fontWeight: "bold",
    color: "#212121",
    marginBottom: 8,
  },
  desc: {
    fontSize: 14,
    color: "#757575",
    marginBottom: 24,
  },
  inputGroup: {
    marginBottom: 20,
  },
  label: {
    display: "block",
    fontSize: 13,
    fontWeight: "bold",
    color: "#424242",
    marginBottom: 8,
  },
  input: {
    width: "100%",
    padding: "14px 12px",
    fontSize: 16,
    border: "2px solid #e0e0e0",
    borderRadius: 10,
    background: "transparent",
  },
  btn: {
    width: "100%",
    padding: "15px",
    background: "#2E7D32",
    color: "#fff",
    fontSize: 16,
    fontWeight: "bold",
    borderRadius: 12,
    marginTop: 8,
  },
  btnDisabled: {
    background: "#a5d6a7",
    cursor: "not-allowed",
  },
  error: {
    color: "#c62828",
    fontSize: 13,
    marginBottom: 8,
  },
  signupHint: {
    marginTop: 16,
    textAlign: "center",
    fontSize: 13,
    color: "#757575",
  },
  link2: {
    color: "#2E7D32",
    fontWeight: "bold",
  },
  notice: {
    color: "#2E7D32",
    fontSize: 13,
    marginBottom: 8,
  },
  footer: {
    marginTop: 32,
    textAlign: "center",
  },
  footerText: {
    color: "rgba(255,255,255,0.7)",
    fontSize: 12,
    lineHeight: 1.6,
  },
  link: {
    color: "rgba(255,255,255,0.95)",
    borderBottom: "1px solid rgba(255,255,255,0.5)",
  },
};
