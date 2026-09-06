import { useState } from "react";
import { supabase } from "../supabase/config";
import { useAuth } from "../contexts/AuthContext";

const DEFAULT_MENUS = [
  { name: "メニュー1", price: 3000 },
];

export default function ProfileSetupPage() {
  const { user, setUserProfile } = useAuth();
  const [name, setName] = useState("");
  const [job, setJob] = useState("");
  const [area, setArea] = useState("");
  const [message, setMessage] = useState("");
  const [menus, setMenus] = useState(DEFAULT_MENUS);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const addMenu = () => {
    setMenus([...menus, { name: "", price: 0 }]);
  };

  const updateMenu = (index, field, value) => {
    const updated = [...menus];
    updated[index] = { ...updated[index], [field]: field === "price" ? Number(value) : value };
    setMenus(updated);
  };

  const removeMenu = (index) => {
    setMenus(menus.filter((_, i) => i !== index));
  };

  const handleSubmit = async () => {
    setError("");
    if (!name.trim()) {
      setError("名前を入力してください");
      return;
    }
    const validMenus = menus.filter((m) => m.name && m.price > 0);
    setLoading(true);
    try {
      const profile = {
        id: user.id,
        name: name.trim(),
        job: job.trim(),
        area: area.trim(),
        message: message.trim(),
        email: user.email,
        op: 0,
        menus: validMenus,
        status: "pending",
      };
      const { data, error: insertError } = await supabase
        .from("profiles")
        .insert(profile)
        .select("id, name, job, area, message, op, menus, is_admin, is_paid, avatar_url, lat, lng, status, created_at")
        .single();
      if (insertError) throw insertError;
      setUserProfile(data);
    } catch (e) {
      setError("登録に失敗しました。もう一度お試しください。");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div style={styles.container}>
      <div style={styles.topBar}>
        <div style={styles.logoSmall}>shinEDO-ouen</div>
        <span style={styles.step}>プロフィール設定</span>
      </div>

      <div style={styles.body}>
        <div style={styles.section}>
          <h2 style={styles.sectionTitle}>基本情報</h2>

          <label style={styles.label}>お名前 <span style={styles.required}>*</span></label>
          <input
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="山田 花子"
            style={styles.input}
          />

          <label style={styles.label}>職業・活動</label>
          <input
            value={job}
            onChange={(e) => setJob(e.target.value)}
            placeholder="日本舞踊家・着物作家 など"
            style={styles.input}
          />

          <label style={styles.label}>住所</label>
          <input
            value={area}
            onChange={(e) => setArea(e.target.value)}
            placeholder="東京都渋谷区〇〇1-2-3"
            style={styles.input}
          />

          <label style={styles.label}>ひとこと</label>
          <textarea
            value={message}
            onChange={(e) => setMessage(e.target.value)}
            placeholder="伝統文化への想いを一言で"
            style={{ ...styles.input, height: 80, resize: "none" }}
          />
        </div>

        <div style={styles.section}>
          <h2 style={styles.sectionTitle}>定価メニュー</h2>
          <p style={styles.desc}>おーえんされる際の定価を設定します</p>

          {menus.map((menu, i) => (
            <div key={i} style={styles.menuRow}>
              <input
                value={menu.name}
                onChange={(e) => updateMenu(i, "name", e.target.value)}
                placeholder="商品・サービス名"
                style={{ ...styles.input, flex: 2, marginBottom: 0 }}
              />
              <div style={styles.priceWrapper}>
                <input
                  type="text"
                  inputMode="numeric"
                  pattern="[0-9]*"
                  value={menu.price || ""}
                  onChange={(e) => updateMenu(i, "price", e.target.value.replace(/[^0-9]/g, ""))}
                  placeholder="0"
                  style={{ ...styles.input, marginBottom: 0, textAlign: "right" }}
                />
                <span style={styles.yen}>円</span>
              </div>
              <button onClick={() => removeMenu(i)} style={styles.removeBtn}>✕</button>
            </div>
          ))}

          <button onClick={addMenu} style={styles.addMenuBtn}>
            ＋ メニューを追加
          </button>
        </div>

        {error && <p style={styles.error}>{error}</p>}

        <button
          onClick={handleSubmit}
          disabled={loading || !name.trim()}
          style={{ ...styles.submitBtn, ...(loading || !name.trim() ? styles.btnDisabled : {}) }}
        >
          {loading ? "登録中..." : "プロフィールを登録する"}
        </button>
      </div>
    </div>
  );
}

const styles = {
  container: {
    minHeight: "100vh",
    background: "var(--bg)",
  },
  topBar: {
    background: "var(--green-primary)",
    padding: "16px 20px",
    display: "flex",
    alignItems: "center",
    gap: 12,
  },
  logoSmall: {
    color: "#fff",
    fontSize: 16,
    fontWeight: "bold",
  },
  step: {
    color: "rgba(255,255,255,0.9)",
    fontSize: 16,
  },
  body: {
    padding: "20px 20px 40px",
  },
  section: {
    background: "#fff",
    borderRadius: 16,
    padding: 20,
    marginBottom: 16,
    boxShadow: "var(--shadow)",
  },
  sectionTitle: {
    fontSize: 17,
    fontWeight: "bold",
    color: "var(--green-primary)",
    marginBottom: 16,
    paddingBottom: 8,
    borderBottom: "2px solid var(--green-pale)",
  },
  label: {
    display: "block",
    fontSize: 13,
    fontWeight: "bold",
    color: "#424242",
    marginBottom: 6,
    marginTop: 12,
  },
  required: {
    color: "#c62828",
  },
  input: {
    width: "100%",
    padding: "12px 14px",
    border: "2px solid #e0e0e0",
    borderRadius: 10,
    fontSize: 15,
    marginBottom: 4,
    background: "#fafafa",
    transition: "border-color 0.2s",
  },
  desc: {
    fontSize: 13,
    color: "var(--text-sub)",
    marginBottom: 12,
  },
  menuRow: {
    display: "flex",
    gap: 8,
    alignItems: "center",
    marginBottom: 10,
  },
  priceWrapper: {
    display: "flex",
    alignItems: "center",
    flex: 1,
    minWidth: 120,
    border: "2px solid #e0e0e0",
    borderRadius: 10,
    overflow: "hidden",
    background: "#fafafa",
  },
  yen: {
    padding: "0 10px",
    color: "#757575",
    fontSize: 14,
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
    padding: "12px",
    border: "2px dashed #a5d6a7",
    borderRadius: 10,
    background: "transparent",
    color: "var(--green-primary)",
    fontSize: 14,
    fontWeight: "bold",
    marginTop: 8,
  },
  error: {
    color: "#c62828",
    fontSize: 13,
    marginBottom: 8,
    textAlign: "center",
  },
  submitBtn: {
    width: "100%",
    padding: "16px",
    background: "var(--green-primary)",
    color: "#fff",
    fontSize: 16,
    fontWeight: "bold",
    borderRadius: 14,
    marginTop: 8,
  },
  btnDisabled: {
    background: "#a5d6a7",
    cursor: "not-allowed",
  },
};
