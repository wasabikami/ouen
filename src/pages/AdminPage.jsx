import { useEffect, useState } from "react";
import { supabase } from "../supabase/config";
import { useAuth } from "../contexts/AuthContext";
import { useNavigate } from "react-router-dom";

export default function AdminPage() {
  const { userProfile } = useAuth();
  const navigate = useNavigate();
  const [tab, setTab] = useState("stats");
  const [users, setUsers] = useState([]);
  const [transactions, setTransactions] = useState([]);
  const [loading, setLoading] = useState(true);
  const [editingOpId, setEditingOpId] = useState(null);
  const [editingOpValue, setEditingOpValue] = useState("");
  const [usersError, setUsersError] = useState("");
  const [txError, setTxError] = useState("");

  useEffect(() => {
    if (!userProfile?.is_admin) {
      navigate("/");
      return;
    }
    fetchAll();
  }, [userProfile]);

  const fetchAll = async () => {
    setLoading(true);
    setUsersError("");
    setTxError("");

    const usersRes = await supabase.rpc("admin_list_users");
    if (usersRes.error) {
      console.error(usersRes.error);
      setUsersError(usersRes.error.message);
      setUsers([]);
    } else {
      setUsers(usersRes.data ?? []);
    }

    const txRes = await supabase
      .from("transactions")
      .select("*, from_user:profiles!transactions_from_user_id_fkey(name), to_user:profiles!transactions_to_user_id_fkey(name)")
      .order("created_at", { ascending: false });
    if (txRes.error) {
      console.error(txRes.error);
      setTxError(txRes.error.message);
      setTransactions([]);
    } else {
      const txData = (txRes.data ?? []).map((tx) => ({
        ...tx,
        fromName: tx.from_user?.name ?? "不明",
        toName: tx.to_user?.name ?? "不明",
      }));
      setTransactions(txData);
    }

    setLoading(false);
  };

  const startEditOp = (u) => {
    setEditingOpId(u.id);
    setEditingOpValue(String(u.op || 0));
  };

  const saveOp = async (userId) => {
    const newOp = Number(editingOpValue);
    if (isNaN(newOp)) return;
    await supabase.from("profiles").update({ op: newOp }).eq("id", userId);
    setUsers((prev) => prev.map((u) => u.id === userId ? { ...u, op: newOp } : u));
    setEditingOpId(null);
  };

  const toggleAdmin = async (u) => {
    const makeAdmin = !u.is_admin;
    const selfWarning = u.id === userProfile?.id
      ? "自分自身の管理者権限を外そうとしています。この操作を行うと自分は管理画面にアクセスできなくなります。\n\n"
      : "";
    const message = makeAdmin
      ? `${u.name}さんを管理者にします。よろしいですか？`
      : `${selfWarning}${u.name}さんの管理者権限を外します。よろしいですか？`;
    if (!window.confirm(message)) return;

    const { error } = await supabase.from("profiles").update({ is_admin: makeAdmin }).eq("id", u.id);
    if (error) {
      console.error(error);
      window.alert("更新に失敗しました");
      return;
    }
    setUsers((prev) => prev.map((x) => x.id === u.id ? { ...x, is_admin: makeAdmin } : x));
  };

  const deleteUser = async (u) => {
    const selfWarning = u.id === userProfile?.id
      ? "自分自身のアカウントを削除しようとしています。この操作を行うと自分は管理画面にアクセスできなくなります。\n\n"
      : "";
    if (!window.confirm(`${selfWarning}${u.name}さんを削除します。この操作は取り消せません。よろしいですか？`)) return;

    const { error } = await supabase.from("profiles").delete().eq("id", u.id);
    if (error) {
      console.error(error);
      window.alert(
        error.code === "23503"
          ? "取引履歴が残っているため削除できません。先に取引履歴タブから該当の取引を削除してください。"
          : "削除に失敗しました"
      );
      return;
    }
    setUsers((prev) => prev.filter((x) => x.id !== u.id));
  };

  const togglePaid = async (u) => {
    const makePaid = !u.is_paid;
    const message = makePaid
      ? `${u.name}さんの月会費(500円)を支払い済みにします。よろしいですか？`
      : `${u.name}さんの月会費を未払いに戻します。よろしいですか？`;
    if (!window.confirm(message)) return;

    const { error } = await supabase.from("profiles").update({ is_paid: makePaid }).eq("id", u.id);
    if (error) {
      console.error(error);
      window.alert("更新に失敗しました");
      return;
    }
    setUsers((prev) => prev.map((x) => x.id === u.id ? { ...x, is_paid: makePaid } : x));
  };

  const formatDate = (ts) => {
    if (!ts) return "-";
    const d = new Date(ts);
    return `${d.getFullYear()}/${d.getMonth() + 1}/${d.getDate()}`;
  };

  const downloadUsersCsv = () => {
    const escapeCell = (v) => `"${String(v ?? "").replace(/"/g, '""')}"`;
    const header = ["名前", "メールアドレス", "職業", "住所", "OP", "登録日", "会費支払済み"];
    const rows = users.map((u) => [
      u.name, u.email, u.job, u.area, u.op ?? 0, formatDate(u.created_at), u.is_paid ? "はい" : "いいえ",
    ]);
    const csv = [header, ...rows].map((row) => row.map(escapeCell).join(",")).join("\r\n");
    const blob = new Blob(["﻿" + csv], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `users_${new Date().toISOString().slice(0, 10)}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const totalPaid = transactions.reduce((s, t) => s + (t.paid || 0), 0);
  const totalOP = transactions.reduce((s, t) => s + (t.op || 0), 0);

  if (!userProfile?.is_admin) return null;

  return (
    <div style={styles.container}>
      <div style={styles.header}>
        <button onClick={() => navigate("/mypage")} style={styles.backBtn}>← 戻る</button>
        <h1 style={styles.title}>管理画面</h1>
      </div>

      <div style={styles.tabs}>
        {["stats", "users", "transactions"].map((t) => (
          <button
            key={t}
            onClick={() => setTab(t)}
            style={{ ...styles.tab, ...(tab === t ? styles.tabActive : {}) }}
          >
            {t === "stats" ? "統計" : t === "users" ? "ユーザー" : "取引履歴"}
          </button>
        ))}
      </div>

      {loading ? (
        <div style={styles.loading}>読み込み中...</div>
      ) : (
        <div style={styles.content}>
          {tab === "stats" && (
            <div style={styles.statsGrid}>
              <div style={styles.statCard}>
                <p style={styles.statLabel}>総ユーザー数</p>
                <p style={styles.statValue}>{users.length}<span style={styles.statUnit}>人</span></p>
              </div>
              <div style={styles.statCard}>
                <p style={styles.statLabel}>総取引件数</p>
                <p style={styles.statValue}>{transactions.length}<span style={styles.statUnit}>件</span></p>
              </div>
              <div style={styles.statCard}>
                <p style={styles.statLabel}>総売上</p>
                <p style={styles.statValue}>¥{totalPaid.toLocaleString()}</p>
              </div>
              <div style={styles.statCard}>
                <p style={styles.statLabel}>総発行OP</p>
                <p style={styles.statValue}>{totalOP.toLocaleString()}<span style={styles.statUnit}> OP</span></p>
              </div>
            </div>
          )}

          {tab === "users" && (
            <div>
              {usersError && <p style={styles.errorMsg}>ユーザー取得に失敗しました: {usersError}</p>}
              <div style={styles.tableActions}>
                <button onClick={downloadUsersCsv} style={styles.csvBtn}>CSVダウンロード</button>
              </div>
              <div style={styles.tableWrap}>
              <table style={styles.table}>
                <thead>
                  <tr>
                    <th style={styles.th}>名前</th>
                    <th style={styles.th}>メールアドレス</th>
                    <th style={styles.th}>職業</th>
                    <th style={styles.th}>住所</th>
                    <th style={styles.th}>OP</th>
                    <th style={styles.th}>登録日</th>
                    <th style={styles.th}>会費</th>
                    <th style={styles.th}>管理者</th>
                    <th style={styles.th}></th>
                  </tr>
                </thead>
                <tbody>
                  {users.map((u) => (
                    <tr key={u.id} style={styles.tr}>
                      <td style={styles.td}>{u.name}</td>
                      <td style={styles.td}>{u.email || "-"}</td>
                      <td style={styles.td}>{u.job || "-"}</td>
                      <td style={styles.td}>{u.area || "-"}</td>
                      <td style={{ ...styles.td, textAlign: "right" }}>
                        {editingOpId === u.id ? (
                          <div style={styles.opEditRow}>
                            <input
                              type="text"
                              inputMode="numeric"
                              pattern="[0-9]*"
                              value={editingOpValue}
                              onChange={(e) => setEditingOpValue(e.target.value.replace(/[^0-9]/g, ""))}
                              style={styles.opInput}
                              autoFocus
                            />
                            <button onClick={() => saveOp(u.id)} style={styles.opSaveBtn}>✓</button>
                            <button onClick={() => setEditingOpId(null)} style={styles.opCancelBtn}>✕</button>
                          </div>
                        ) : (
                          <span onClick={() => startEditOp(u)} style={styles.opClickable}>
                            {(u.op || 0).toLocaleString()} ✏️
                          </span>
                        )}
                      </td>
                      <td style={styles.td}>{formatDate(u.created_at)}</td>
                      <td style={styles.td}>
                        <button
                          onClick={() => togglePaid(u)}
                          style={{ ...styles.adminToggleBtn, ...(u.is_paid ? styles.paidToggleOn : {}) }}
                        >
                          {u.is_paid ? "✓ 支払済" : "未払い"}
                        </button>
                      </td>
                      <td style={styles.td}>
                        <button
                          onClick={() => toggleAdmin(u)}
                          style={{ ...styles.adminToggleBtn, ...(u.is_admin ? styles.adminToggleOn : {}) }}
                        >
                          {u.is_admin ? "✓ 管理者" : "管理者にする"}
                        </button>
                      </td>
                      <td style={styles.td}>
                        <button onClick={() => deleteUser(u)} style={styles.deleteBtn}>削除</button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
              </div>
            </div>
          )}

          {tab === "transactions" && (
            <div>
              {txError && <p style={styles.errorMsg}>取引履歴の取得に失敗しました: {txError}</p>}
              <div style={styles.tableWrap}>
              <table style={styles.table}>
                <thead>
                  <tr>
                    <th style={styles.th}>送り手</th>
                    <th style={styles.th}>受け手</th>
                    <th style={styles.th}>メニュー</th>
                    <th style={styles.th}>金額</th>
                    <th style={styles.th}>OP</th>
                    <th style={styles.th}>状態</th>
                    <th style={styles.th}>日時</th>
                    <th style={styles.th}></th>
                  </tr>
                </thead>
                <tbody>
                  {transactions.map((tx) => (
                    <tr key={tx.id} style={styles.tr}>
                      <td style={styles.td}>{tx.fromName}</td>
                      <td style={styles.td}>{tx.toName}</td>
                      <td style={styles.td}>{tx.menu_name}</td>
                      <td style={{ ...styles.td, textAlign: "right" }}>¥{(tx.paid || 0).toLocaleString()}</td>
                      <td style={{ ...styles.td, textAlign: "right" }}>{(tx.op || 0).toLocaleString()}</td>
                      <td style={styles.td}>{tx.status === "pending" ? "確認待ち" : "受取済"}</td>
                      <td style={styles.td}>{formatDate(tx.created_at)}</td>
                      <td style={styles.td}>
                        <button
                          onClick={async () => {
                            if (!window.confirm("この取引を削除しますか？")) return;
                            await supabase.from("transactions").delete().eq("id", tx.id);
                            setTransactions((prev) => prev.filter((t) => t.id !== tx.id));
                          }}
                          style={styles.deleteBtn}
                        >
                          削除
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

const styles = {
  container: {
    minHeight: "100vh",
    background: "#f5f5f5",
  },
  header: {
    background: "#1B5E20",
    padding: "16px 20px",
    display: "flex",
    alignItems: "center",
    gap: 16,
  },
  backBtn: {
    background: "transparent",
    color: "#fff",
    fontSize: 15,
    fontWeight: "bold",
    padding: "4px 4px 4px 0",
    lineHeight: 1,
  },
  title: {
    fontSize: 20,
    fontWeight: "bold",
    color: "#fff",
  },
  tabs: {
    display: "flex",
    background: "#fff",
    borderBottom: "1px solid #e0e0e0",
  },
  tab: {
    flex: 1,
    padding: "14px",
    fontSize: 14,
    color: "#757575",
    background: "transparent",
    borderBottom: "2px solid transparent",
  },
  tabActive: {
    color: "#2E7D32",
    fontWeight: "bold",
    borderBottom: "2px solid #2E7D32",
  },
  loading: {
    textAlign: "center",
    padding: 60,
    color: "#757575",
  },
  errorMsg: {
    background: "#ffebee",
    color: "#c62828",
    padding: "10px 14px",
    borderRadius: 8,
    fontSize: 13,
    marginBottom: 12,
  },
  content: {
    padding: 16,
  },
  statsGrid: {
    display: "grid",
    gridTemplateColumns: "1fr 1fr",
    gap: 12,
  },
  statCard: {
    background: "#fff",
    borderRadius: 12,
    padding: "20px 16px",
    boxShadow: "0 2px 8px rgba(0,0,0,0.08)",
    textAlign: "center",
  },
  statLabel: {
    fontSize: 12,
    color: "#757575",
    marginBottom: 8,
  },
  statValue: {
    fontSize: 28,
    fontWeight: "bold",
    color: "#212121",
  },
  statUnit: {
    fontSize: 14,
    fontWeight: "normal",
    color: "#757575",
  },
  tableActions: {
    display: "flex",
    justifyContent: "flex-end",
    marginBottom: 10,
  },
  csvBtn: {
    padding: "8px 14px",
    background: "#2E7D32",
    color: "#fff",
    fontSize: 13,
    fontWeight: "bold",
    borderRadius: 8,
  },
  tableWrap: {
    background: "#fff",
    borderRadius: 12,
    overflow: "auto",
    boxShadow: "0 2px 8px rgba(0,0,0,0.08)",
  },
  table: {
    width: "100%",
    borderCollapse: "collapse",
    fontSize: 13,
    minWidth: 500,
  },
  th: {
    padding: "12px 14px",
    textAlign: "left",
    background: "#f5f5f5",
    color: "#424242",
    fontWeight: "bold",
    borderBottom: "1px solid #e0e0e0",
    whiteSpace: "nowrap",
  },
  tr: {
    borderBottom: "1px solid #f0f0f0",
  },
  td: {
    padding: "12px 14px",
    color: "#424242",
    whiteSpace: "nowrap",
  },
  opClickable: {
    cursor: "pointer",
    padding: "4px 8px",
    borderRadius: 6,
    display: "inline-block",
  },
  opEditRow: {
    display: "flex",
    alignItems: "center",
    gap: 4,
    justifyContent: "flex-end",
  },
  opInput: {
    width: 90,
    padding: "4px 8px",
    border: "2px solid #2E7D32",
    borderRadius: 6,
    fontSize: 13,
    textAlign: "right",
  },
  opSaveBtn: {
    padding: "4px 8px",
    background: "#2E7D32",
    color: "#fff",
    borderRadius: 6,
    fontSize: 13,
    fontWeight: "bold",
  },
  opCancelBtn: {
    padding: "4px 8px",
    background: "#e0e0e0",
    color: "#424242",
    borderRadius: 6,
    fontSize: 13,
  },
  deleteBtn: {
    padding: "4px 10px",
    background: "#ffebee",
    color: "#c62828",
    borderRadius: 6,
    fontSize: 12,
    fontWeight: "bold",
  },
  adminToggleBtn: {
    padding: "4px 10px",
    background: "#f5f5f5",
    color: "#757575",
    borderRadius: 6,
    fontSize: 12,
    fontWeight: "bold",
    whiteSpace: "nowrap",
  },
  adminToggleOn: {
    background: "#E8F5E9",
    color: "#2E7D32",
  },
  paidToggleOn: {
    background: "#FFF3E0",
    color: "#E65100",
  },
};
