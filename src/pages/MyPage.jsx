import { useState, useEffect, useRef } from "react";
import { supabase } from "../supabase/config";
import { useAuth } from "../contexts/AuthContext";
import { useNavigate } from "react-router-dom";
import BottomNav from "../components/BottomNav";
import Avatar from "../components/Avatar";

const MAX_AVATAR_BYTES = 5 * 1024 * 1024;

export default function MyPage() {
  const { user, userProfile, setUserProfile } = useAuth();
  const navigate = useNavigate();
  const [tab, setTab] = useState("history"); // "history" | "edit"
  const [history, setHistory] = useState([]);
  const [loadingHistory, setLoadingHistory] = useState(true);
  const [filterDir, setFilterDir] = useState("all");
  const [filterPeriod, setFilterPeriod] = useState("all");

  const [name, setName] = useState(userProfile?.name ?? "");
  const [job, setJob] = useState(userProfile?.job ?? "");
  const [area, setArea] = useState(userProfile?.area ?? "");
  const [message, setMessage] = useState(userProfile?.message ?? "");
  const [menus, setMenus] = useState(userProfile?.menus ?? []);
  const [saving, setSaving] = useState(false);
  const [saveMsg, setSaveMsg] = useState("");
  const [uploadingAvatar, setUploadingAvatar] = useState(false);
  const avatarInputRef = useRef(null);
  const [confirmingId, setConfirmingId] = useState(null);

  useEffect(() => {
    const fetchHistory = async () => {
      try {
        const { data, error } = await supabase
          .from("transactions")
          .select("*, from_user:profiles!transactions_from_user_id_fkey(name), to_user:profiles!transactions_to_user_id_fkey(name)")
          .or(`from_user_id.eq.${user.id},to_user_id.eq.${user.id}`)
          .order("created_at", { ascending: false });
        if (error) throw error;
        const withDirection = (data ?? []).map((tx) => ({
          ...tx,
          direction: tx.from_user_id === user.id ? "sent" : "recv",
        }));
        setHistory(withDirection);
      } catch (e) {
        console.error(e);
      } finally {
        setLoadingHistory(false);
      }
    };
    fetchHistory();
  }, [user.id]);

  const isInPeriod = (tx, period) => {
    if (period === "all") return true;
    const d = tx.created_at ? new Date(tx.created_at) : null;
    if (!d) return false;
    const now = new Date();
    const diff = (now.getFullYear() - d.getFullYear()) * 12 + (now.getMonth() - d.getMonth());
    if (period === "this") return diff === 0;
    if (period === "last") return diff === 1;
    if (period === "2ago") return diff === 2;
    if (period === "before") return diff > 2;
    return true;
  };

  const filteredHistory = history.filter((tx) => {
    if (filterDir !== "all" && tx.direction !== filterDir) return false;
    if (!isInPeriod(tx, filterPeriod)) return false;
    return true;
  });

  const formatDate = (ts) => {
    if (!ts) return "";
    const d = new Date(ts);
    return `${d.getFullYear()}/${d.getMonth() + 1}/${d.getDate()}`;
  };

  const handleConfirmReceipt = async (tx) => {
    setConfirmingId(tx.id);
    try {
      const { error } = await supabase.rpc("confirm_ouen_transaction", { p_transaction_id: tx.id });
      if (error) throw error;
      setHistory((prev) => prev.map((t) => t.id === tx.id ? { ...t, status: "received" } : t));
      setUserProfile({ ...userProfile, op: (userProfile?.op ?? 0) + (tx.op ?? 0) });
    } catch (e) {
      console.error(e);
    } finally {
      setConfirmingId(null);
    }
  };

  const handleSave = async () => {
    setSaving(true);
    setSaveMsg("");
    try {
      const updated = {
        name,
        job,
        area,
        message,
        menus: menus.filter((m) => m.name && m.price > 0),
      };
      const { error: updateError } = await supabase.from("profiles").update(updated).eq("id", user.id);
      if (updateError) throw updateError;
      setUserProfile({ ...userProfile, ...updated });
      setSaveMsg("保存しました！");
    } catch (e) {
      setSaveMsg("保存に失敗しました");
    } finally {
      setSaving(false);
    }
  };

  const handleAvatarChange = async (e) => {
    const file = e.target.files?.[0];
    e.target.value = "";
    if (!file) return;
    if (!file.type.startsWith("image/")) {
      setSaveMsg("画像ファイルを選択してください");
      return;
    }
    if (file.size > MAX_AVATAR_BYTES) {
      setSaveMsg("画像は5MB以下にしてください");
      return;
    }
    setUploadingAvatar(true);
    setSaveMsg("");
    try {
      const path = `${user.id}/avatar`;
      const { error: uploadError } = await supabase.storage
        .from("avatars")
        .upload(path, file, { upsert: true, contentType: file.type, cacheControl: "3600" });
      if (uploadError) throw uploadError;

      const { data: { publicUrl } } = supabase.storage.from("avatars").getPublicUrl(path);
      const avatarUrl = `${publicUrl}?t=${Date.now()}`;

      const { error: updateError } = await supabase.from("profiles").update({ avatar_url: avatarUrl }).eq("id", user.id);
      if (updateError) throw updateError;

      setUserProfile({ ...userProfile, avatar_url: avatarUrl });
      setSaveMsg("写真を更新しました！");
    } catch (e) {
      setSaveMsg("写真のアップロードに失敗しました");
    } finally {
      setUploadingAvatar(false);
    }
  };

  const addMenu = () => setMenus([...menus, { name: "", price: 0 }]);
  const updateMenu = (i, f, v) => {
    const u = [...menus];
    u[i] = { ...u[i], [f]: f === "price" ? Number(v) : v };
    setMenus(u);
  };
  const removeMenu = (i) => setMenus(menus.filter((_, idx) => idx !== i));

  return (
    <div style={styles.container}>
      <div style={styles.header}>
        <Avatar url={userProfile?.avatar_url} name={userProfile?.name} size={56} style={styles.avatar} />
        <div style={styles.headerInfo}>
          <p style={styles.headerName}>{userProfile?.name}</p>
          <p style={styles.headerSub}>{userProfile?.job}{userProfile?.area ? ` ・ ${userProfile?.area}` : ""}</p>
        </div>
        <div style={styles.opBadge}>
          <p style={styles.opBadgeNum}>{(userProfile?.op ?? 0).toLocaleString()}</p>
          <p style={styles.opBadgeLabel}>OP</p>
        </div>
      </div>

      <div style={styles.tabs}>
        <button
          onClick={() => setTab("history")}
          style={{ ...styles.tabBtn, ...(tab === "history" ? styles.tabActive : {}) }}
        >
          取引履歴
        </button>
        <button
          onClick={() => setTab("edit")}
          style={{ ...styles.tabBtn, ...(tab === "edit" ? styles.tabActive : {}) }}
        >
          プロフィール編集
        </button>
      </div>

      <div style={styles.body}>
        {tab === "history" && (
          <div>
            <div style={styles.filterRow}>
              <select value={filterDir} onChange={(e) => setFilterDir(e.target.value)} style={styles.filterSelect}>
                <option value="all">支払い・受取</option>
                <option value="sent">支払い</option>
                <option value="recv">受取</option>
              </select>
              <select value={filterPeriod} onChange={(e) => setFilterPeriod(e.target.value)} style={styles.filterSelect}>
                <option value="all">全て</option>
                <option value="this">今月</option>
                <option value="last">先月</option>
                <option value="2ago">先々月</option>
                <option value="before">その前</option>
              </select>
            </div>
            {loadingHistory ? (
              <div style={styles.loading}>読み込み中...</div>
            ) : filteredHistory.length === 0 ? (
              <div style={styles.empty}>
                <div style={styles.emptyIcon}>📋</div>
                <p>取引履歴がありません</p>
              </div>
            ) : (
              <div style={styles.historyList}>
                {filteredHistory.map((tx) => {
                  const counterpartName = (tx.direction === "sent" ? tx.to_user?.name : tx.from_user?.name) ?? "不明";
                  return (
                    <div key={tx.id} style={styles.historyCard}>
                      <div style={styles.historyTop}>
                        <span style={styles.historyMenu}>{tx.menu_name}</span>
                        <span style={styles.historyDate}>{formatDate(tx.created_at)}</span>
                      </div>
                      <div style={styles.historyCounterpart}>
                        <span style={styles.historyCounterpartName}>
                          {counterpartName}{tx.direction === "sent" ? "へ" : "から"}
                        </span>
                      </div>
                      {tx.message && (
                        <p style={styles.historyMessage}>「{tx.message}」</p>
                      )}
                      <div style={styles.historyBottom}>
                        <span style={{ ...styles.historyLabel, color: tx.direction === "sent" ? "#e65100" : "#2E7D32" }}>
                          {tx.direction === "sent" ? "支払い" : "受取"}
                        </span>
                        <span style={styles.historyPaid}>¥{tx.paid?.toLocaleString()}</span>
                        {tx.status === "pending" ? (
                          <span style={styles.historyPending}>確認待ち</span>
                        ) : (
                          <span style={styles.historyOP}>+{tx.op?.toLocaleString()} OP</span>
                        )}
                      </div>
                      {tx.direction === "recv" && tx.status === "pending" && (
                        <button
                          onClick={() => handleConfirmReceipt(tx)}
                          disabled={confirmingId === tx.id}
                          style={{ ...styles.confirmBtn, ...(confirmingId === tx.id ? styles.btnDisabled : {}) }}
                        >
                          {confirmingId === tx.id ? "処理中..." : "受け取りました"}
                        </button>
                      )}
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        )}

        {tab === "edit" && (
          <div style={styles.editSection}>
            <div style={styles.avatarEditRow}>
              <Avatar url={userProfile?.avatar_url} name={name} size={72} />
              <div>
                <button
                  onClick={() => avatarInputRef.current?.click()}
                  disabled={uploadingAvatar}
                  style={{ ...styles.avatarChangeBtn, ...(uploadingAvatar ? styles.btnDisabled : {}) }}
                >
                  {uploadingAvatar ? "アップロード中..." : "写真を変更"}
                </button>
                <input
                  ref={avatarInputRef}
                  type="file"
                  accept="image/*"
                  onChange={handleAvatarChange}
                  style={{ display: "none" }}
                />
              </div>
            </div>

            <label style={styles.label}>お名前</label>
            <input value={name} onChange={(e) => setName(e.target.value)} style={styles.input} />

            <label style={styles.label}>職業・活動</label>
            <input value={job} onChange={(e) => setJob(e.target.value)} style={styles.input} />

            <label style={styles.label}>住所</label>
            <input value={area} onChange={(e) => setArea(e.target.value)} style={styles.input} />

            <label style={styles.label}>ひとこと</label>
            <textarea
              value={message}
              onChange={(e) => setMessage(e.target.value)}
              style={{ ...styles.input, height: 72, resize: "none" }}
            />

            <label style={styles.label}>定価メニュー</label>
            {menus.map((m, i) => (
              <div key={i} style={styles.menuRow}>
                <input
                  value={m.name}
                  onChange={(e) => updateMenu(i, "name", e.target.value)}
                  placeholder="名前"
                  style={{ ...styles.input, flex: 2, marginBottom: 0 }}
                />
                <input
                  type="text"
                  inputMode="numeric"
                  pattern="[0-9]*"
                  value={m.price || ""}
                  onChange={(e) => updateMenu(i, "price", e.target.value.replace(/[^0-9]/g, ""))}
                  placeholder="価格"
                  style={{ ...styles.input, flex: 1, marginBottom: 0, textAlign: "right" }}
                />
                <button onClick={() => removeMenu(i)} style={styles.removeBtn}>✕</button>
              </div>
            ))}
            <button onClick={addMenu} style={styles.addMenuBtn}>＋ メニュー追加</button>

            {saveMsg && (
              <p style={{ ...styles.saveMsg, color: saveMsg.includes("失敗") ? "#c62828" : "var(--green-primary)" }}>
                {saveMsg}
              </p>
            )}
            <button
              onClick={handleSave}
              disabled={saving}
              style={{ ...styles.saveBtn, ...(saving ? styles.btnDisabled : {}) }}
            >
              {saving ? "保存中..." : "保存する"}
            </button>

            {userProfile?.is_admin && (
              <button
                onClick={() => navigate("/admin")}
                style={styles.adminBtn}
              >
                管理画面へ
              </button>
            )}

            <button
              onClick={() => supabase.auth.signOut()}
              style={styles.logoutBtn}
            >
              ログアウト
            </button>
          </div>
        )}
      </div>

      <BottomNav />
    </div>
  );
}

const styles = {
  container: {
    minHeight: "100vh",
    background: "var(--bg)",
    paddingBottom: 80,
  },
  header: {
    background: "var(--green-primary)",
    padding: "20px 20px 24px",
    display: "flex",
    alignItems: "center",
    gap: 14,
  },
  avatar: {
    width: 56,
    height: 56,
    borderRadius: "50%",
    background: "rgba(255,255,255,0.25)",
    color: "#fff",
    fontSize: 24,
    fontWeight: "bold",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    flexShrink: 0,
    border: "2px solid rgba(255,255,255,0.5)",
  },
  headerInfo: {
    flex: 1,
  },
  headerName: {
    color: "#fff",
    fontSize: 18,
    fontWeight: "bold",
    marginBottom: 2,
  },
  headerSub: {
    color: "rgba(255,255,255,0.8)",
    fontSize: 13,
  },
  opBadge: {
    background: "rgba(255,255,255,0.15)",
    borderRadius: 12,
    padding: "8px 14px",
    textAlign: "center",
    border: "1px solid rgba(255,255,255,0.3)",
  },
  opBadgeNum: {
    color: "#fff",
    fontSize: 22,
    fontWeight: "bold",
    lineHeight: 1,
  },
  opBadgeLabel: {
    color: "rgba(255,255,255,0.8)",
    fontSize: 11,
    marginTop: 2,
  },
  tabs: {
    display: "flex",
    borderBottom: "2px solid #e0e0e0",
    background: "#fff",
  },
  tabBtn: {
    flex: 1,
    padding: "14px",
    fontSize: 14,
    fontWeight: "bold",
    color: "var(--text-sub)",
    background: "transparent",
    borderBottom: "3px solid transparent",
  },
  tabActive: {
    color: "var(--green-primary)",
    borderBottomColor: "var(--green-primary)",
  },
  body: {
    padding: "16px",
  },
  loading: {
    textAlign: "center",
    color: "var(--text-sub)",
    padding: 40,
  },
  empty: {
    textAlign: "center",
    padding: 48,
    color: "var(--text-sub)",
  },
  emptyIcon: {
    fontSize: 40,
    marginBottom: 12,
  },
  filterRow: {
    display: "flex",
    gap: 8,
    marginBottom: 12,
  },
  filterSelect: {
    flex: 1,
    padding: "10px 12px",
    border: "2px solid #e0e0e0",
    borderRadius: 10,
    fontSize: 14,
    background: "#fff",
    color: "var(--text-main)",
    appearance: "auto",
  },
  historyList: {
    display: "flex",
    flexDirection: "column",
    gap: 8,
  },
  historyCard: {
    background: "#fff",
    borderRadius: 12,
    padding: "14px 16px",
    boxShadow: "var(--shadow)",
  },
  historyTop: {
    display: "flex",
    justifyContent: "space-between",
    marginBottom: 6,
  },
  historyMenu: {
    fontSize: 15,
    fontWeight: "bold",
  },
  historyDate: {
    fontSize: 12,
    color: "var(--text-sub)",
  },
  historyCounterpart: {
    display: "flex",
    gap: 6,
    alignItems: "center",
    marginBottom: 6,
  },
  historyCounterpartLabel: {
    fontSize: 11,
    color: "var(--text-sub)",
    background: "#f5f5f5",
    borderRadius: 4,
    padding: "2px 6px",
  },
  historyCounterpartName: {
    fontSize: 13,
    color: "var(--text-main)",
    fontWeight: "bold",
  },
  historyMessage: {
    fontSize: 13,
    color: "var(--text-sub)",
    fontStyle: "italic",
    marginBottom: 6,
  },
  historyBottom: {
    display: "flex",
    justifyContent: "space-between",
  },
  historyPaid: {
    fontSize: 14,
    color: "var(--text-sub)",
  },
  historyOP: {
    fontSize: 14,
    fontWeight: "bold",
    color: "var(--green-light)",
  },
  historyPending: {
    fontSize: 11,
    fontWeight: "bold",
    color: "#E65100",
    background: "#FFF3E0",
    borderRadius: 6,
    padding: "2px 8px",
  },
  confirmBtn: {
    width: "100%",
    marginTop: 10,
    padding: "10px",
    background: "var(--green-primary)",
    color: "#fff",
    fontSize: 13,
    fontWeight: "bold",
    borderRadius: 10,
  },
  editSection: {
    background: "#fff",
    borderRadius: 16,
    padding: "20px 16px",
    boxShadow: "var(--shadow)",
  },
  avatarEditRow: {
    display: "flex",
    alignItems: "center",
    gap: 16,
    marginBottom: 8,
  },
  avatarChangeBtn: {
    padding: "10px 16px",
    background: "var(--green-pale)",
    color: "var(--green-primary)",
    fontSize: 13,
    fontWeight: "bold",
    borderRadius: 10,
  },
  label: {
    display: "block",
    fontSize: 13,
    fontWeight: "bold",
    color: "#424242",
    marginBottom: 6,
    marginTop: 14,
  },
  input: {
    width: "100%",
    padding: "12px 14px",
    border: "2px solid #e0e0e0",
    borderRadius: 10,
    fontSize: 15,
    marginBottom: 4,
    background: "#fafafa",
  },
  menuRow: {
    display: "flex",
    gap: 8,
    alignItems: "center",
    marginBottom: 8,
  },
  removeBtn: {
    width: 32,
    height: 32,
    borderRadius: "50%",
    background: "#ffebee",
    color: "#c62828",
    fontSize: 14,
    flexShrink: 0,
  },
  addMenuBtn: {
    width: "100%",
    padding: "11px",
    border: "2px dashed #a5d6a7",
    borderRadius: 10,
    background: "transparent",
    color: "var(--green-primary)",
    fontSize: 14,
    fontWeight: "bold",
    marginTop: 4,
    marginBottom: 16,
  },
  saveMsg: {
    textAlign: "center",
    fontSize: 14,
    marginBottom: 8,
    fontWeight: "bold",
  },
  saveBtn: {
    width: "100%",
    padding: "15px",
    background: "var(--green-primary)",
    color: "#fff",
    fontSize: 16,
    fontWeight: "bold",
    borderRadius: 12,
    marginBottom: 12,
  },
  btnDisabled: {
    background: "#a5d6a7",
    cursor: "not-allowed",
  },
  adminBtn: {
    width: "100%",
    padding: "14px",
    background: "#E8F5E9",
    color: "#2E7D32",
    fontSize: 15,
    fontWeight: "bold",
    borderRadius: 12,
    marginBottom: 12,
  },
  logoutBtn: {
    width: "100%",
    padding: "14px",
    background: "#ffebee",
    color: "#c62828",
    fontSize: 15,
    fontWeight: "bold",
    borderRadius: 12,
  },
  historyLabel: {
    fontSize: 12,
    fontWeight: "bold",
  },
};
