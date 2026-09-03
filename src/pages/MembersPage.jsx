import { useState, useEffect } from "react";
import { supabase } from "../supabase/config";
import { useAuth } from "../contexts/AuthContext";
import { useNavigate } from "react-router-dom";
import BottomNav from "../components/BottomNav";
import Avatar from "../components/Avatar";

export default function MembersPage() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [members, setMembers] = useState([]);
  const [search, setSearch] = useState("");
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchMembers = async () => {
      try {
        const { data, error } = await supabase
          .from("profiles")
          .select("*")
          .order("op", { ascending: false });
        if (error) throw error;
        setMembers(data ?? []);
      } catch (e) {
        console.error(e);
      } finally {
        setLoading(false);
      }
    };
    fetchMembers();
  }, []);

  const filtered = members.filter(
    (m) =>
      m.name?.includes(search) ||
      m.job?.includes(search) ||
      m.area?.includes(search) ||
      m.message?.includes(search)
  );

  return (
    <div style={styles.container}>
      <div style={styles.topBar}>
        <h1 style={styles.title}>メンバー一覧</h1>
        <p style={styles.subtitle}>{members.length}人が参加中</p>
      </div>

      <div style={styles.searchWrapper}>
        <input
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="名前・職業・住所で検索"
          style={styles.searchInput}
        />
      </div>

      <div style={styles.body}>
        {loading ? (
          <div style={styles.loading}>読み込み中...</div>
        ) : filtered.length === 0 ? (
          <div style={styles.empty}>
            <p>メンバーが見つかりません</p>
          </div>
        ) : (
          <div style={styles.list}>
            {filtered.map((m) => (
              <div key={m.id} style={styles.card}>
                <div style={styles.cardLeft}>
                  <Avatar url={m.avatar_url} name={m.name} size={40} style={styles.avatar} />
                  <div style={styles.info}>
                    <div style={styles.nameRow}>
                      <span style={styles.name}>{m.name}</span>
                      {m.id === user.id && <span style={styles.meBadge}>あなた</span>}
                    </div>
                    <span style={styles.sub}>{m.job}{m.area ? ` ・ ${m.area}` : ""}</span>
                    {m.message && <span style={styles.msg}>「{m.message}」</span>}
                  </div>
                </div>
                <div style={styles.cardRight}>
                  <p style={styles.op}>{(m.op ?? 0).toLocaleString()}</p>
                  <p style={styles.opLabel}>OP</p>
                  {m.id !== user.id && (
                    <button
                      onClick={() => navigate("/ouen", { state: { member: m } })}
                      style={styles.ouenBtn}
                    >
                      おーえん
                    </button>
                  )}
                </div>
              </div>
            ))}
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
  topBar: {
    background: "var(--green-primary)",
    padding: "20px 20px 16px",
    textAlign: "center",
  },
  title: {
    color: "#fff",
    fontSize: 22,
    fontWeight: "bold",
    marginBottom: 4,
  },
  subtitle: {
    color: "rgba(255,255,255,0.8)",
    fontSize: 13,
  },
  searchWrapper: {
    padding: "14px 16px",
    background: "#fff",
    borderBottom: "1px solid #e0e0e0",
  },
  searchInput: {
    width: "100%",
    padding: "12px 16px",
    border: "2px solid #e0e0e0",
    borderRadius: 12,
    fontSize: 15,
    background: "#fafafa",
  },
  body: {
    padding: "12px 14px",
  },
  loading: {
    textAlign: "center",
    color: "var(--text-sub)",
    padding: 40,
  },
  empty: {
    textAlign: "center",
    color: "var(--text-sub)",
    padding: 48,
  },
  list: {
    display: "flex",
    flexDirection: "column",
    gap: 8,
  },
  card: {
    background: "#fff",
    borderRadius: 12,
    padding: "14px 16px",
    display: "flex",
    justifyContent: "space-between",
    alignItems: "center",
    boxShadow: "var(--shadow)",
  },
  cardLeft: {
    display: "flex",
    alignItems: "center",
    gap: 10,
    flex: 1,
    minWidth: 0,
  },
  avatar: {
    width: 40,
    height: 40,
    borderRadius: "50%",
    background: "var(--green-pale)",
    color: "var(--green-primary)",
    fontWeight: "bold",
    fontSize: 18,
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    flexShrink: 0,
  },
  info: {
    display: "flex",
    flexDirection: "column",
    gap: 2,
    minWidth: 0,
  },
  nameRow: {
    display: "flex",
    alignItems: "center",
    gap: 6,
  },
  name: {
    fontSize: 15,
    fontWeight: "bold",
    overflow: "hidden",
    textOverflow: "ellipsis",
    whiteSpace: "nowrap",
  },
  meBadge: {
    fontSize: 10,
    background: "var(--green-pale)",
    color: "var(--green-primary)",
    padding: "2px 6px",
    borderRadius: 6,
    fontWeight: "bold",
    flexShrink: 0,
  },
  sub: {
    fontSize: 12,
    color: "var(--text-sub)",
    overflow: "hidden",
    textOverflow: "ellipsis",
    whiteSpace: "nowrap",
  },
  msg: {
    fontSize: 11,
    color: "#9e9e9e",
    overflow: "hidden",
    textOverflow: "ellipsis",
    whiteSpace: "nowrap",
  },
  cardRight: {
    textAlign: "center",
    flexShrink: 0,
    marginLeft: 8,
  },
  op: {
    fontSize: 18,
    fontWeight: "bold",
    color: "var(--green-primary)",
    lineHeight: 1,
  },
  opLabel: {
    fontSize: 10,
    color: "var(--text-sub)",
    marginBottom: 6,
  },
  ouenBtn: {
    padding: "6px 10px",
    background: "var(--green-primary)",
    color: "#fff",
    fontSize: 11,
    fontWeight: "bold",
    borderRadius: 8,
  },
};
