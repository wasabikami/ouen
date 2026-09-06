import { supabase } from "../supabase/config";

export default function PendingApprovalPage() {
  return (
    <div style={styles.container}>
      <div style={styles.card}>
        <h2 style={styles.title}>承認待ちです</h2>
        <p style={styles.text}>
          管理者の承認が完了すると、アプリをご利用いただけるようになります。
          <br />
          今しばらくお待ちください。
        </p>
        <button style={styles.btn} onClick={() => supabase.auth.signOut()}>
          ログアウト
        </button>
      </div>
    </div>
  );
}

const styles = {
  container: {
    minHeight: "100vh",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    background: "var(--bg)",
    padding: 20,
  },
  card: {
    background: "#fff",
    borderRadius: 16,
    padding: 32,
    maxWidth: 360,
    textAlign: "center",
    boxShadow: "var(--shadow)",
  },
  title: {
    fontSize: 18,
    fontWeight: "bold",
    color: "var(--green-primary)",
    marginBottom: 12,
  },
  text: {
    fontSize: 14,
    color: "var(--text-sub)",
    lineHeight: 1.7,
    marginBottom: 20,
  },
  btn: {
    padding: "10px 24px",
    background: "var(--green-primary)",
    color: "#fff",
    borderRadius: 10,
    fontSize: 14,
    fontWeight: "bold",
  },
};
