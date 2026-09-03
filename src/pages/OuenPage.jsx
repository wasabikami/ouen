import { useState, useEffect } from "react";
import { useLocation } from "react-router-dom";
import { supabase } from "../supabase/config";
import { useAuth } from "../contexts/AuthContext";
import BottomNav from "../components/BottomNav";
import Avatar from "../components/Avatar";

const STEPS = ["メンバー選択", "メニュー・金額", "確認"];

export default function OuenPage() {
  const { user, userProfile } = useAuth();
  const location = useLocation();
  const preselectedMember = location.state?.member ?? null;
  const [step, setStep] = useState(preselectedMember ? 1 : 0);
  const [members, setMembers] = useState([]);
  const [search, setSearch] = useState("");
  const [selectedMember, setSelectedMember] = useState(preselectedMember);
  const [cartItems, setCartItems] = useState([]);
  const [message, setMessage] = useState("");
  const [customMenuName, setCustomMenuName] = useState("");
  const [customMenuPrice, setCustomMenuPrice] = useState("");
  const [loading, setLoading] = useState(false);
  const [done, setDone] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    const fetchMembers = async () => {
      const { data } = await supabase.from("profiles").select("*");
      const list = (data ?? []).filter((m) => m.id !== user.id);
      setMembers(list);
    };
    fetchMembers();
  }, [user.id]);

  const filteredMembers = members.filter(
    (m) =>
      m.name?.includes(search) ||
      m.job?.includes(search) ||
      m.area?.includes(search)
  );

  const cartTotal = cartItems.reduce((sum, i) => sum + i.price * i.quantity, 0);
  const totalPaid = cartItems.reduce((sum, i) => sum + (Number(i.paid) || 0), 0);
  const op = totalPaid > cartTotal ? totalPaid - cartTotal : 0;

  const changeQty = (name, price, delta) => {
    setCartItems((prev) => {
      const existing = prev.find((i) => i.name === name);
      if (!existing) {
        return delta > 0 ? [...prev, { name, price, quantity: 1, paid: "" }] : prev;
      }
      const newQty = existing.quantity + delta;
      if (newQty <= 0) return prev.filter((i) => i.name !== name);
      return prev.map((i) => i.name === name ? { ...i, quantity: newQty } : i);
    });
  };

  const setItemPaid = (name, value) => {
    setCartItems((prev) => prev.map((i) => i.name === name ? { ...i, paid: value } : i));
  };

  const addCustomItem = () => {
    if (!customMenuName || !customMenuPrice) return;
    changeQty(customMenuName, Number(customMenuPrice), 1);
    setCustomMenuName("");
    setCustomMenuPrice("");
  };

  const handleSubmit = async () => {
    setError("");
    if (totalPaid < cartTotal) {
      setError("支払い金額は定価以上を入力してください");
      return;
    }
    setLoading(true);
    const menuNameSummary = cartItems.length === 1
      ? `${cartItems[0].name}${cartItems[0].quantity > 1 ? ` × ${cartItems[0].quantity}` : ""}`
      : cartItems.map((i) => `${i.name}${i.quantity > 1 ? ` × ${i.quantity}` : ""}`).join("、");
    try {
      const { error: rpcError } = await supabase.rpc("create_ouen_transaction", {
        p_to_user_id: selectedMember.id,
        p_menu_name: menuNameSummary,
        p_items: cartItems,
        p_price: cartTotal,
        p_paid: totalPaid,
        p_message: message.trim() || null,
      });
      if (rpcError) throw rpcError;

      setDone(true);
    } catch (e) {
      setError("送信に失敗しました。もう一度お試しください。");
    } finally {
      setLoading(false);
    }
  };

  const reset = () => {
    setStep(0);
    setSelectedMember(null);
    setCartItems([]);
    setDone(false);
    setError("");
    setSearch("");
    setMessage("");
    setCustomMenuName("");
    setCustomMenuPrice("");
  };

  if (done) {
    return (
      <div style={styles.container}>
        <div style={styles.doneScreen}>
          <div style={styles.doneIcon}>🎉</div>
          <h2 style={styles.doneTitle}>おーえん完了！</h2>
          <p style={styles.doneDesc}>{selectedMember?.name}さんへのおーえんを送りました</p>
          <div style={styles.opResult}>
            <span style={styles.opResultLabel}>確認待ちのOP</span>
            <span style={styles.opResultValue}>+{op.toLocaleString()} OP</span>
          </div>
          <p style={styles.doneNote}>{selectedMember?.name}さんが受け取りを確認すると加算されます</p>
          <button onClick={reset} style={styles.doneBtn}>
            続けておーえんする
          </button>
        </div>
        <BottomNav />
      </div>
    );
  }

  return (
    <div style={styles.container}>
      <div style={styles.topBar}>
        <h1 style={styles.title}>おーえんする</h1>
        <div style={styles.steps}>
          {STEPS.map((s, i) => (
            <div key={i} style={{ ...styles.stepDot, ...(i <= step ? styles.stepActive : {}) }}>
              {i < step ? "✓" : i + 1}
            </div>
          ))}
        </div>
        <p style={styles.stepLabel}>{STEPS[step]}</p>
      </div>

      <div style={styles.body}>
        {step === 0 && (
          <div>
            <input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="名前・職業・住所で検索"
              style={styles.searchInput}
            />
            <div style={styles.memberList}>
              {filteredMembers.length === 0 ? (
                <div style={styles.empty}>メンバーが見つかりません</div>
              ) : (
                filteredMembers.map((m) => (
                  <button
                    key={m.id}
                    onClick={() => { setSelectedMember(m); setStep(1); }}
                    style={styles.memberCard}
                  >
                    <Avatar url={m.avatar_url} name={m.name} size={44} style={styles.memberAvatar} />
                    <div style={styles.memberInfo}>
                      <span style={styles.memberName}>{m.name}</span>
                      <span style={styles.memberSub}>{m.job}{m.area ? ` ・ ${m.area}` : ""}</span>
                    </div>
                    <span style={styles.memberOP}>{(m.op ?? 0).toLocaleString()} OP</span>
                  </button>
                ))
              )}
            </div>
          </div>
        )}

        {step === 1 && selectedMember && (
          <div>
            <div style={styles.selectedInfo}>
              <Avatar url={selectedMember.avatar_url} name={selectedMember.name} size={44} style={styles.memberAvatar} />
              <div>
                <p style={styles.memberName}>{selectedMember.name}</p>
                <p style={styles.memberSub}>{selectedMember.job}</p>
              </div>
            </div>
            <h3 style={styles.sectionTitle}>メニューと金額を入力</h3>
            {(!selectedMember.menus || selectedMember.menus.length === 0) ? (
              <div style={styles.empty}>メニューが登録されていません</div>
            ) : (
              selectedMember.menus.map((menu, i) => {
                const cartItem = cartItems.find((c) => c.name === menu.name);
                const qty = cartItem?.quantity ?? 0;
                return (
                  <div key={i} style={{ ...styles.menuCard, ...(qty > 0 ? styles.menuCardSelected : {}) }}>
                    <div style={styles.menuCardTop}>
                      <span style={styles.menuName}>{menu.name}</span>
                      <span style={styles.menuPrice}>定価 ¥{menu.price.toLocaleString()}</span>
                    </div>
                    {qty > 0 && (
                      <div style={styles.menuCardBottom}>
                        <div style={styles.qtyRow}>
                          <button onClick={() => changeQty(menu.name, menu.price, -1)} style={styles.qBtn}>−</button>
                          <span style={styles.qValue}>{qty}</span>
                          <button onClick={() => changeQty(menu.name, menu.price, 1)} style={styles.qBtn}>＋</button>
                        </div>
                        <div style={styles.rowPaidWrap}>
                          <span style={styles.yen}>¥</span>
                          <input
                            type="text"
                            inputMode="numeric"
                            pattern="[0-9]*"
                            value={cartItem?.paid ?? ""}
                            onChange={(e) => setItemPaid(menu.name, e.target.value.replace(/[^0-9]/g, ""))}
                            placeholder={menu.price * qty}
                            style={styles.rowPaidInput}
                          />
                        </div>
                      </div>
                    )}
                    {qty === 0 && (
                      <button onClick={() => changeQty(menu.name, menu.price, 1)} style={styles.addItemBtn}>＋ 追加</button>
                    )}
                  </div>
                );
              })
            )}

            <div style={styles.customMenuCard}>
              <p style={styles.customMenuLabel}>その他</p>
              <div style={styles.customMenuRow}>
                <input
                  value={customMenuName}
                  onChange={(e) => setCustomMenuName(e.target.value)}
                  placeholder="内容"
                  style={styles.customMenuNameInput}
                />
                <div style={styles.customMenuPriceWrap}>
                  <span style={styles.yen}>¥</span>
                  <input
                    type="text"
                    inputMode="numeric"
                    pattern="[0-9]*"
                    value={customMenuPrice}
                    onChange={(e) => setCustomMenuPrice(e.target.value.replace(/[^0-9]/g, ""))}
                    placeholder="0"
                    style={styles.customMenuPriceInput}
                  />
                </div>
                <button
                  onClick={addCustomItem}
                  disabled={!customMenuName || !customMenuPrice}
                  style={{ ...styles.customAddBtn, ...(!customMenuName || !customMenuPrice ? styles.btnDisabled : {}) }}
                >
                  追加
                </button>
              </div>
            </div>

            {cartItems.length > 0 && (
              <div style={styles.formSection}>
                <label style={styles.label}>メッセージ（任意）</label>
                <textarea
                  value={message}
                  onChange={(e) => setMessage(e.target.value)}
                  placeholder="ひとことメッセージを添えよう"
                  style={styles.messageInput}
                  rows={3}
                />
              </div>
            )}

            {cartTotal > 0 && (
              <div style={styles.cartSummary}>
                <div>
                  <div style={styles.cartSummaryRow}>
                    <span style={styles.cartSummaryLabel}>定価合計</span>
                    <span style={styles.cartSummaryValue}>¥{cartTotal.toLocaleString()}</span>
                  </div>
                  <div style={styles.cartSummaryRow}>
                    <span style={styles.cartSummaryLabel}>支払い合計</span>
                    <span style={{ ...styles.cartSummaryValue, color: totalPaid >= cartTotal ? "var(--green-primary)" : "#e65100" }}>
                      ¥{totalPaid.toLocaleString()}
                    </span>
                  </div>
                  {totalPaid > cartTotal && (
                    <div style={styles.cartSummaryRow}>
                      <span style={styles.cartSummaryLabel}>獲得OP</span>
                      <span style={{ ...styles.cartSummaryValue, color: "var(--green-primary)" }}>+{op.toLocaleString()} OP</span>
                    </div>
                  )}
                </div>
              </div>
            )}

            {error && <p style={styles.error}>{error}</p>}
            <button
              onClick={() => setStep(2)}
              disabled={cartItems.length === 0 || totalPaid < cartTotal || cartItems.some((i) => !i.paid)}
              style={{ ...styles.nextBtn, ...(cartItems.length === 0 || totalPaid < cartTotal || cartItems.some((i) => !i.paid) ? styles.btnDisabled : {}), marginTop: 8 }}
            >
              確認へ進む
            </button>
            <button onClick={() => setStep(0)} style={styles.backBtn}>← 戻る</button>
          </div>
        )}

        {step === 2 && (
          <div>
            <h3 style={styles.sectionTitle}>内容を確認</h3>
            <div style={styles.confirmCard}>
              <Row label="おーえん先" value={selectedMember?.name} />
              {cartItems.map((item, i) => (
                <Row
                  key={i}
                  label={item.quantity > 1 ? `${item.name} × ${item.quantity}` : item.name}
                  value={<span>定価 ¥{(item.price * item.quantity).toLocaleString()} → <strong>¥{Number(item.paid).toLocaleString()}</strong></span>}
                />
              ))}
              <Row label="定価合計" value={`¥${cartTotal.toLocaleString()}`} />
              <Row label="支払い合計" value={<strong style={{ fontSize: 20 }}>¥{totalPaid.toLocaleString()}</strong>} />
              {message.trim() && <Row label="メッセージ" value={message.trim()} />}
              <div style={styles.divider} />
              <Row
                label="獲得OP"
                value={<span style={{ color: "var(--green-primary)", fontWeight: "bold", fontSize: 20 }}>+{op.toLocaleString()} OP</span>}
              />
            </div>

            {error && <p style={styles.error}>{error}</p>}
            <button
              onClick={handleSubmit}
              disabled={loading}
              style={{ ...styles.nextBtn, ...(loading ? styles.btnDisabled : {}) }}
            >
              {loading ? "処理中..." : "おーえんする！"}
            </button>
            <button onClick={() => setStep(1)} style={styles.backBtn}>← 戻る</button>
          </div>
        )}
      </div>

      <BottomNav />
    </div>
  );
}

function Row({ label, value }) {
  return (
    <div style={{ display: "flex", justifyContent: "space-between", padding: "10px 0", borderBottom: "1px solid #f0f0f0" }}>
      <span style={{ color: "#757575", fontSize: 14 }}>{label}</span>
      <span style={{ fontSize: 15 }}>{value}</span>
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
    fontSize: 20,
    fontWeight: "bold",
    marginBottom: 12,
  },
  steps: {
    display: "flex",
    justifyContent: "center",
    gap: 8,
    marginBottom: 8,
  },
  stepDot: {
    width: 28,
    height: 28,
    borderRadius: "50%",
    background: "rgba(255,255,255,0.3)",
    color: "rgba(255,255,255,0.7)",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    fontSize: 12,
    fontWeight: "bold",
  },
  stepActive: {
    background: "#fff",
    color: "var(--green-primary)",
  },
  stepLabel: {
    color: "rgba(255,255,255,0.9)",
    fontSize: 14,
  },
  body: {
    padding: "16px",
  },
  searchInput: {
    width: "100%",
    padding: "13px 16px",
    border: "2px solid #e0e0e0",
    borderRadius: 12,
    fontSize: 15,
    background: "#fff",
    marginBottom: 12,
  },
  memberList: {
    display: "flex",
    flexDirection: "column",
    gap: 8,
  },
  memberCard: {
    display: "flex",
    alignItems: "center",
    gap: 12,
    background: "#fff",
    borderRadius: 12,
    padding: "14px 16px",
    boxShadow: "var(--shadow)",
    width: "100%",
    textAlign: "left",
  },
  memberAvatar: {
    width: 44,
    height: 44,
    borderRadius: "50%",
    background: "var(--green-pale)",
    color: "var(--green-primary)",
    fontSize: 20,
    fontWeight: "bold",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    flexShrink: 0,
  },
  memberInfo: {
    flex: 1,
    display: "flex",
    flexDirection: "column",
    gap: 2,
  },
  memberName: {
    fontSize: 15,
    fontWeight: "bold",
    color: "var(--text-main)",
  },
  memberSub: {
    fontSize: 12,
    color: "var(--text-sub)",
  },
  memberOP: {
    fontSize: 12,
    color: "var(--green-light)",
    fontWeight: "bold",
  },
  selectedInfo: {
    display: "flex",
    alignItems: "center",
    gap: 12,
    background: "#fff",
    borderRadius: 12,
    padding: "14px 16px",
    marginBottom: 16,
    boxShadow: "var(--shadow)",
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: "bold",
    color: "var(--text-main)",
    marginBottom: 12,
  },
  menuCard: {
    background: "#fff",
    borderRadius: 12,
    padding: "14px 16px",
    boxShadow: "var(--shadow)",
    width: "100%",
    marginBottom: 8,
    border: "2px solid transparent",
  },
  menuCardSelected: {
    border: "2px solid var(--green-primary)",
    background: "#f1f8e9",
  },
  menuCardTop: {
    display: "flex",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 4,
  },
  menuCardBottom: {
    display: "flex",
    alignItems: "center",
    justifyContent: "space-between",
    gap: 10,
    marginTop: 8,
  },
  menuCardLeft: {
    display: "flex",
    flexDirection: "column",
    gap: 2,
    flex: 1,
  },
  menuName: {
    fontSize: 15,
    fontWeight: "bold",
    textAlign: "left",
  },
  menuPrice: {
    fontSize: 13,
    color: "var(--text-sub)",
    textAlign: "right",
  },
  addItemBtn: {
    marginTop: 6,
    padding: "6px 14px",
    background: "var(--green-pale)",
    color: "var(--green-primary)",
    borderRadius: 8,
    fontSize: 13,
    fontWeight: "bold",
  },
  rowPaidWrap: {
    display: "flex",
    alignItems: "center",
    border: "2px solid #a5d6a7",
    borderRadius: 8,
    overflow: "hidden",
    flex: 1,
  },
  rowPaidInput: {
    flex: 1,
    padding: "8px 10px",
    fontSize: 16,
    fontWeight: "bold",
    border: "none",
    background: "transparent",
    textAlign: "right",
    minWidth: 0,
    color: "var(--green-primary)",
  },
  qtyRow: {
    display: "flex",
    alignItems: "center",
    gap: 10,
    flexShrink: 0,
  },
  cartSummary: {
    background: "var(--green-pale)",
    borderRadius: 10,
    padding: "12px 16px",
    marginTop: 8,
    marginBottom: 8,
  },
  cartSummaryRow: {
    display: "flex",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 4,
  },
  cartSummaryLabel: {
    fontSize: 14,
    fontWeight: "bold",
    color: "var(--text-main)",
  },
  cartSummaryValue: {
    fontSize: 16,
    fontWeight: "bold",
    color: "var(--green-primary)",
  },
  menuSummary: {
    background: "#fff",
    borderRadius: 12,
    padding: "16px",
    marginBottom: 16,
    boxShadow: "var(--shadow)",
  },
  menuSummaryLabel: {
    fontSize: 12,
    color: "var(--text-sub)",
    marginBottom: 8,
  },
  cartItemRow: {
    display: "flex",
    justifyContent: "space-between",
    paddingBottom: 6,
    marginBottom: 6,
    borderBottom: "1px solid #f0f0f0",
  },
  cartItemName: {
    fontSize: 14,
    color: "var(--text-main)",
  },
  cartItemPrice: {
    fontSize: 14,
    fontWeight: "bold",
    color: "var(--text-main)",
  },
  cartItemTotal: {
    display: "flex",
    justifyContent: "space-between",
    fontSize: 14,
    color: "var(--text-sub)",
    paddingTop: 4,
  },
  formSection: {
    background: "#fff",
    borderRadius: 12,
    padding: "16px",
    marginBottom: 16,
    boxShadow: "var(--shadow)",
  },
  label: {
    display: "block",
    fontSize: 13,
    fontWeight: "bold",
    color: "#424242",
    marginBottom: 8,
    marginTop: 12,
  },
  quantityRow: {
    display: "flex",
    alignItems: "center",
    gap: 16,
    marginBottom: 4,
  },
  qBtn: {
    width: 36,
    height: 36,
    borderRadius: "50%",
    background: "var(--green-pale)",
    color: "var(--green-primary)",
    fontSize: 20,
    fontWeight: "bold",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
  },
  qValue: {
    fontSize: 24,
    fontWeight: "bold",
    minWidth: 32,
    textAlign: "center",
  },
  totalLabel: {
    fontSize: 14,
    color: "var(--text-sub)",
    marginBottom: 4,
  },
  paidRow: {
    display: "flex",
    alignItems: "center",
    border: "2px solid #e0e0e0",
    borderRadius: 10,
    overflow: "hidden",
  },
  yen: {
    padding: "12px 14px",
    background: "#f5f5f5",
    color: "#424242",
    fontSize: 16,
    fontWeight: "bold",
    borderRight: "1px solid #e0e0e0",
  },
  paidInput: {
    flex: 1,
    padding: "14px 12px",
    fontSize: 20,
    border: "none",
    background: "transparent",
    textAlign: "right",
  },
  customMenuCard: {
    background: "#fff",
    borderRadius: 12,
    padding: "14px 16px",
    boxShadow: "var(--shadow)",
    marginBottom: 8,
    border: "2px dashed #a5d6a7",
  },
  customMenuLabel: {
    fontSize: 12,
    color: "var(--text-sub)",
    fontWeight: "bold",
    marginBottom: 10,
  },
  customMenuRow: {
    display: "flex",
    gap: 8,
    marginBottom: 10,
  },
  customMenuNameInput: {
    flex: 1,
    minWidth: 0,
    padding: "10px 12px",
    border: "2px solid #e0e0e0",
    borderRadius: 10,
    fontSize: 14,
    background: "#fafafa",
  },
  customMenuPriceWrap: {
    flex: 1,
    minWidth: 0,
    display: "flex",
    alignItems: "center",
    border: "2px solid #e0e0e0",
    borderRadius: 10,
    overflow: "hidden",
  },
  customMenuPriceInput: {
    flex: 1,
    minWidth: 0,
    width: 0,
    padding: "10px 8px",
    fontSize: 14,
    border: "none",
    background: "transparent",
    textAlign: "right",
  },
  customAddBtn: {
    padding: "10px 14px",
    background: "var(--green-primary)",
    color: "#fff",
    fontSize: 14,
    fontWeight: "bold",
    borderRadius: 10,
    flexShrink: 0,
  },
  messageInput: {
    width: "100%",
    padding: "12px 14px",
    border: "2px solid #e0e0e0",
    borderRadius: 10,
    fontSize: 14,
    background: "#fafafa",
    resize: "none",
    fontFamily: "inherit",
  },
  opPreview: {
    display: "flex",
    justifyContent: "space-between",
    alignItems: "center",
    borderRadius: 10,
    padding: "12px 16px",
    marginTop: 12,
  },
  opPositive: {
    background: "var(--green-pale)",
  },
  opZero: {
    background: "#fff3e0",
  },
  opPreviewLabel: {
    fontSize: 14,
    fontWeight: "bold",
    color: "#424242",
  },
  opPreviewValue: {
    fontSize: 20,
    fontWeight: "bold",
    color: "var(--green-primary)",
  },
  confirmCard: {
    background: "#fff",
    borderRadius: 12,
    padding: "8px 16px",
    boxShadow: "var(--shadow)",
    marginBottom: 20,
  },
  divider: {
    height: 1,
    background: "#e0e0e0",
    margin: "4px 0",
  },
  nextBtn: {
    width: "100%",
    padding: "16px",
    background: "var(--green-primary)",
    color: "#fff",
    fontSize: 16,
    fontWeight: "bold",
    borderRadius: 14,
    marginBottom: 10,
  },
  btnDisabled: {
    background: "#a5d6a7",
    cursor: "not-allowed",
  },
  backBtn: {
    width: "100%",
    padding: "12px",
    background: "transparent",
    color: "var(--text-sub)",
    fontSize: 14,
  },
  error: {
    color: "#c62828",
    fontSize: 13,
    marginBottom: 8,
    textAlign: "center",
  },
  empty: {
    textAlign: "center",
    color: "var(--text-sub)",
    padding: 32,
  },
  doneScreen: {
    display: "flex",
    flexDirection: "column",
    alignItems: "center",
    justifyContent: "center",
    minHeight: "80vh",
    padding: 32,
    textAlign: "center",
  },
  doneIcon: {
    fontSize: 72,
    marginBottom: 16,
  },
  doneTitle: {
    fontSize: 28,
    fontWeight: "bold",
    color: "var(--green-primary)",
    marginBottom: 8,
  },
  doneDesc: {
    fontSize: 15,
    color: "var(--text-sub)",
    marginBottom: 24,
  },
  opResult: {
    background: "var(--green-pale)",
    borderRadius: 16,
    padding: "20px 40px",
    marginBottom: 12,
    display: "flex",
    flexDirection: "column",
    alignItems: "center",
    gap: 4,
  },
  doneNote: {
    fontSize: 13,
    color: "var(--text-sub)",
    marginBottom: 24,
  },
  opResultLabel: {
    fontSize: 13,
    color: "var(--text-sub)",
  },
  opResultValue: {
    fontSize: 36,
    fontWeight: "bold",
    color: "var(--green-primary)",
  },
  doneBtn: {
    padding: "16px 40px",
    background: "var(--green-primary)",
    color: "#fff",
    fontSize: 16,
    fontWeight: "bold",
    borderRadius: 14,
  },
};
