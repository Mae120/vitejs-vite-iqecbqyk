import { useState, useMemo, useEffect, useRef } from "react";

const GOAL = 9000;
const MAX_LOSS = 3000;
const MAX_MINIS = 6;
const MAX_MICROS = 60;

interface Trade {
  id: number;
  date: string;
  instrument: string;
  direction: string;
  contracts: number | string;
  entry: string;
  exit: string;
  strategy: string;
  notes: string;
  emotion: string;
}

const INSTRUMENTS = [
  { value: "MES", label: "MES (Micro E-mini S&P)", type: "micro", tvSymbol: "CME:MES1!", pointValue: 5 },
  { value: "MNQ", label: "MNQ (Micro Nasdaq)",     type: "micro", tvSymbol: "CME:MNQ1!", pointValue: 2 },
  { value: "MYM", label: "MYM (Micro Dow)",         type: "micro", tvSymbol: "CME:MYM1!", pointValue: 0.5 },
  { value: "M2K", label: "M2K (Micro Russell)",     type: "micro", tvSymbol: "CME:M2K1!", pointValue: 5 },
  { value: "ES",  label: "ES (E-mini S&P)",         type: "mini",  tvSymbol: "CME_MINI:ES1!", pointValue: 50 },
  { value: "NQ",  label: "NQ (E-mini Nasdaq)",      type: "mini",  tvSymbol: "CME_MINI:NQ1!", pointValue: 20 },
  { value: "YM",  label: "YM (E-mini Dow)",         type: "mini",  tvSymbol: "CBOT_MINI:YM1!", pointValue: 5 },
  { value: "RTY", label: "RTY (E-mini Russell)",    type: "mini",  tvSymbol: "CME_MINI:RTY1!", pointValue: 10 },
];

const STRATEGIES = ["Trend Following", "Mean Reversion", "Breakout", "Scalp", "VWAP Fade", "Opening Range", "News Play", "Other"];

const emptyForm = {
  date: new Date().toISOString().split("T")[0],
  instrument: "MES",
  direction: "Long",
  contracts: 1,
  entry: "",
  exit: "",
  strategy: "Trend Following",
  notes: "",
  emotion: "Neutral",
};

function pnl(trade: Trade) {
  const inst = INSTRUMENTS.find(i => i.value === trade.instrument);
  if (!inst || !trade.entry || !trade.exit) return 0;
  const diff = trade.direction === "Long"
    ? parseFloat(trade.exit) - parseFloat(trade.entry)
    : parseFloat(trade.entry) - parseFloat(trade.exit);
  return diff * Number(trade.contracts) * inst.pointValue;
}

// ── TradingView Widget ────────────────────────────────────────────
function TradingViewChart({ symbol, interval = "5" }: { symbol: string; interval?: string }) {
  const containerRef = useRef<HTMLDivElement>(null);
  const widgetRef = useRef<any>(null);

  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;

    // Remove old widget
    if (widgetRef.current) {
      container.innerHTML = "";
      widgetRef.current = null;
    }

    const divId = `tv_chart_${Date.now()}`;
    const wrapper = document.createElement("div");
    wrapper.id = divId;
    wrapper.style.width = "100%";
    wrapper.style.height = "100%";
    container.appendChild(wrapper);

    const script = document.createElement("script");
    script.src = "https://s3.tradingview.com/tv.js";
    script.async = true;
    script.onload = () => {
      if ((window as any).TradingView) {
        widgetRef.current = new (window as any).TradingView.widget({
          container_id: divId,
          symbol: symbol,
          interval: interval,
          timezone: "exchange",
          theme: "dark",
          style: "1",
          locale: "en",
          toolbar_bg: "#0a1120",
          enable_publishing: false,
          hide_top_toolbar: false,
          hide_legend: false,
          save_image: false,
          backgroundColor: "rgba(2, 8, 23, 1)",
          gridColor: "rgba(15, 23, 42, 1)",
          width: "100%",
          height: "100%",
          studies: ["Volume@tv-basicstudies", "VWAP@tv-basicstudies"],
          show_popup_button: true,
          popup_width: "1000",
          popup_height: "650",
          withdateranges: true,
          allow_symbol_change: true,
          details: false,
          hotlist: false,
          calendar: false,
        });
      }
    };

    // Check if already loaded
    if ((window as any).TradingView) {
      script.onload();
    } else {
      document.head.appendChild(script);
    }

    return () => {
      if (container) {
        container.innerHTML = "";
      }
      widgetRef.current = null;
    };
  }, [symbol, interval]);

  return (
    <div ref={containerRef} style={{ width: "100%", height: "100%" }} />
  );
}

// ── Gauge ─────────────────────────────────────────────────────────
function PnLGauge({ value }: { value: number }) {
  const total = GOAL + MAX_LOSS;
  const zero = MAX_LOSS / total;
  const clampedVal = Math.max(-MAX_LOSS, Math.min(GOAL, value));
  const fillPct = (clampedVal + MAX_LOSS) / total;
  const isWipeout = value <= -MAX_LOSS;
  const isGoal = value >= GOAL;
  const gaugeColor = isWipeout ? "#ef4444" : isGoal ? "#22c55e" : value >= 0 ? "#06b6d4" : "#f97316";

  return (
    <div style={{ width: "100%", paddingBottom: 8 }}>
      <div style={{ display: "flex", justifyContent: "space-between", fontSize: 11, color: "#64748b", marginBottom: 6, fontFamily: "monospace" }}>
        <span style={{ color: "#ef4444" }}>-$3,000</span>
        <span style={{ color: "#94a3b8" }}>$0</span>
        <span style={{ color: "#22c55e" }}>+$9,000</span>
      </div>
      <div style={{ position: "relative", height: 28, background: "#0f172a", borderRadius: 4, overflow: "hidden", border: "1px solid #1e293b" }}>
        <div style={{ position: "absolute", left: `${zero * 100}%`, top: 0, bottom: 0, width: 2, background: "#334155", zIndex: 2 }} />
        <div style={{
          position: "absolute",
          left: value >= 0 ? `${zero * 100}%` : `${fillPct * 100}%`,
          width: `${Math.abs(fillPct - zero) * 100}%`,
          top: 4, bottom: 4, background: gaugeColor,
          borderRadius: 2, transition: "all 0.4s ease", opacity: 0.9,
        }} />
        <div style={{
          position: "absolute", left: `${fillPct * 100}%`, top: 0, bottom: 0,
          width: 3, background: "#fff", transform: "translateX(-50%)",
          transition: "left 0.4s ease", boxShadow: `0 0 8px ${gaugeColor}`,
        }} />
      </div>
      <div style={{ textAlign: "center", marginTop: 8, fontFamily: "monospace", fontSize: 22, fontWeight: 700, color: gaugeColor, letterSpacing: 1 }}>
        {value >= 0 ? "+" : ""}${value.toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
        {isGoal && <span style={{ marginLeft: 8, fontSize: 14 }}>🎯 GOAL!</span>}
        {isWipeout && <span style={{ marginLeft: 8, fontSize: 14 }}>⛔ LIMIT HIT</span>}
      </div>
    </div>
  );
}

function StatBox({ label, value, color, sub }: { label: string; value: string | number; color?: string; sub?: string }) {
  return (
    <div style={{ background: "#0f172a", border: "1px solid #1e293b", borderRadius: 6, padding: "12px 16px", flex: 1, minWidth: 90 }}>
      <div style={{ fontSize: 10, color: "#64748b", fontFamily: "monospace", textTransform: "uppercase", letterSpacing: 1 }}>{label}</div>
      <div style={{ fontSize: 17, fontWeight: 700, color: color || "#e2e8f0", fontFamily: "monospace", marginTop: 4 }}>{value}</div>
      {sub && <div style={{ fontSize: 10, color: "#475569", marginTop: 2 }}>{sub}</div>}
    </div>
  );
}

// ── Main App ──────────────────────────────────────────────────────
export default function TradingJournal() {
  const [trades, setTrades] = useState<Trade[]>([]);
  const [form, setForm] = useState<Trade>(emptyForm as any);
  const [activeTab, setActiveTab] = useState("dashboard");
  const [editId, setEditId] = useState<number | null>(null);
  const [deleteConfirm, setDeleteConfirm] = useState<number | null>(null);
  const [chartInterval, setChartInterval] = useState("5");
  // chartSymbol follows the selected instrument in Log tab, or last logged trade on Dashboard
  const [chartSymbol, setChartSymbol] = useState("CME:MES1!");

  const totalPnL = useMemo(() => trades.reduce((s, t) => s + pnl(t), 0), [trades]);
  const winners = useMemo(() => trades.filter(t => pnl(t) > 0), [trades]);
  const losers  = useMemo(() => trades.filter(t => pnl(t) < 0), [trades]);
  const winRate = trades.length ? ((winners.length / trades.length) * 100).toFixed(1) : "0.0";
  const avgWin  = winners.length ? (winners.reduce((s, t) => s + pnl(t), 0) / winners.length).toFixed(2) : "0.00";
  const avgLoss = losers.length  ? (losers.reduce((s,  t) => s + pnl(t), 0) / losers.length).toFixed(2)  : "0.00";
  const riskLeft = MAX_LOSS + totalPnL;
  const goalLeft = GOAL - totalPnL;
  const isLimitReached = totalPnL <= -MAX_LOSS;

  const today = new Date().toISOString().split("T")[0];
  const todayTrades = trades.filter(t => t.date === today);
  const miniUsed  = todayTrades.reduce((s, t) => INSTRUMENTS.find(i => i.value === t.instrument)?.type === "mini"  ? s + Number(t.contracts) : s, 0);
  const microUsed = todayTrades.reduce((s, t) => INSTRUMENTS.find(i => i.value === t.instrument)?.type === "micro" ? s + Number(t.contracts) : s, 0);

  // Sync chart symbol when instrument changes in form
  useEffect(() => {
    const inst = INSTRUMENTS.find(i => i.value === form.instrument);
    if (inst) setChartSymbol(inst.tvSymbol);
  }, [form.instrument]);

  function handleSubmit() {
    if (!form.entry || !form.exit) return;
    const inst = INSTRUMENTS.find(i => i.value === form.instrument);
    if (inst?.type === "mini"  && miniUsed  + Number(form.contracts) > MAX_MINIS)  { alert(`Mini limit: max ${MAX_MINIS}/day`);  return; }
    if (inst?.type === "micro" && microUsed + Number(form.contracts) > MAX_MICROS) { alert(`Micro limit: max ${MAX_MICROS}/day`); return; }
    if (editId !== null) {
      setTrades(prev => prev.map(t => t.id === editId ? { ...form, id: editId } : t));
      setEditId(null);
    } else {
      setTrades(prev => [...prev, { ...form, id: Date.now() }]);
    }
    setForm(prev => ({ ...emptyForm, date: prev.date, instrument: prev.instrument } as any));
  }

  function handleEdit(trade: Trade) {
    setForm({ ...trade });
    setEditId(trade.id);
    setActiveTab("log");
  }

  const set = (k: keyof Trade, v: any) => setForm(prev => ({ ...prev, [k]: v }));

  const inputStyle: React.CSSProperties = { background: "#0f172a", border: "1px solid #1e293b", color: "#e2e8f0", borderRadius: 4, padding: "7px 10px", fontFamily: "monospace", fontSize: 13, width: "100%", boxSizing: "border-box", outline: "none" };
  const inp = (key: keyof Trade, type = "text", extra = {}) => <input type={type} value={(form as any)[key]} onChange={e => set(key, e.target.value)} style={{ ...inputStyle, ...extra }} />;
  const sel = (key: keyof Trade, opts: any[]) => (
    <select value={(form as any)[key]} onChange={e => set(key, e.target.value)} style={inputStyle}>
      {opts.map(o => <option key={o.value ?? o} value={o.value ?? o}>{o.label ?? o}</option>)}
    </select>
  );
  const lbl = (text: string) => <div style={{ fontSize: 11, color: "#475569", fontFamily: "monospace", textTransform: "uppercase", letterSpacing: 1, marginBottom: 4 }}>{text}</div>;
  const tabBtn = (id: string, text: string) => (
    <button onClick={() => setActiveTab(id)} style={{ background: activeTab === id ? "#06b6d4" : "transparent", color: activeTab === id ? "#0f172a" : "#64748b", border: "none", padding: "8px 18px", borderRadius: 4, fontFamily: "monospace", fontSize: 13, fontWeight: 600, cursor: "pointer" }}>
      {text}
    </button>
  );

  const INTERVALS = [
    { v: "1", l: "1m" }, { v: "3", l: "3m" }, { v: "5", l: "5m" },
    { v: "15", l: "15m" }, { v: "60", l: "1H" }, { v: "D", l: "1D" },
  ];

  const currentInst = INSTRUMENTS.find(i => i.tvSymbol === chartSymbol) || INSTRUMENTS[0];

  return (
    <div style={{ minHeight: "100vh", background: "#020817", color: "#e2e8f0", fontFamily: "'Inter', system-ui, sans-serif" }}>
      {/* Header */}
      <div style={{ borderBottom: "1px solid #0f172a", padding: "14px 20px", display: "flex", alignItems: "center", justifyContent: "space-between" }}>
        <div>
          <div style={{ fontFamily: "monospace", fontSize: 16, fontWeight: 700, color: "#06b6d4", letterSpacing: 2 }}>⬡ PAPER TRADING JOURNAL</div>
          <div style={{ fontSize: 10, color: "#334155", fontFamily: "monospace", marginTop: 1 }}>SIMULATION MODE · NO REAL MONEY</div>
        </div>
        <div style={{ textAlign: "right" }}>
          <div style={{ fontSize: 10, color: "#334155", fontFamily: "monospace" }}>MONTHLY TARGET</div>
          <div style={{ fontFamily: "monospace", fontSize: 12, color: "#22c55e" }}>$9,000 profit · Max loss $3,000</div>
        </div>
      </div>

      {/* Chart Bar — always visible */}
      <div style={{ borderBottom: "1px solid #0f172a", background: "#060f1e" }}>
        {/* Symbol + interval selector */}
        <div style={{ display: "flex", alignItems: "center", gap: 12, padding: "8px 20px", flexWrap: "wrap" }}>
          <div style={{ fontFamily: "monospace", fontSize: 12, color: "#06b6d4", fontWeight: 700 }}>{currentInst.value}</div>
          <div style={{ fontFamily: "monospace", fontSize: 11, color: "#334155" }}>{chartSymbol}</div>
          <div style={{ marginLeft: "auto", display: "flex", gap: 4 }}>
            {INTERVALS.map(iv => (
              <button key={iv.v} onClick={() => setChartInterval(iv.v)} style={{ background: chartInterval === iv.v ? "#06b6d4" : "#0f172a", color: chartInterval === iv.v ? "#0f172a" : "#64748b", border: "1px solid #1e293b", borderRadius: 3, padding: "3px 9px", fontFamily: "monospace", fontSize: 11, cursor: "pointer", fontWeight: 600 }}>
                {iv.l}
              </button>
            ))}
          </div>
          {/* Quick symbol switcher */}
          <div style={{ display: "flex", gap: 4, flexWrap: "wrap" }}>
            {INSTRUMENTS.map(inst => (
              <button key={inst.value} onClick={() => setChartSymbol(inst.tvSymbol)} style={{ background: chartSymbol === inst.tvSymbol ? "#1e3a4a" : "transparent", color: chartSymbol === inst.tvSymbol ? "#06b6d4" : "#334155", border: `1px solid ${chartSymbol === inst.tvSymbol ? "#06b6d4" : "#1e293b"}`, borderRadius: 3, padding: "3px 8px", fontFamily: "monospace", fontSize: 10, cursor: "pointer" }}>
                {inst.value}
              </button>
            ))}
          </div>
        </div>
        {/* Chart */}
        <div style={{ height: 420, width: "100%", position: "relative" }}>
          <TradingViewChart symbol={chartSymbol} interval={chartInterval} />
        </div>
      </div>

      {/* Main content */}
      <div style={{ padding: "16px 20px", maxWidth: 960, margin: "0 auto" }}>
        {/* Tabs */}
        <div style={{ display: "flex", gap: 4, marginBottom: 16, background: "#0a1120", padding: 4, borderRadius: 6, width: "fit-content" }}>
          {tabBtn("dashboard", "Dashboard")}
          {tabBtn("log", editId ? "✏ Edit Trade" : "Log Trade")}
          {tabBtn("history", `History (${trades.length})`)}
        </div>

        {/* ── DASHBOARD ── */}
        {activeTab === "dashboard" && (
          <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
            <div style={{ background: "#0a1120", border: "1px solid #0f172a", borderRadius: 8, padding: 18 }}>
              <div style={{ fontSize: 10, color: "#475569", fontFamily: "monospace", textTransform: "uppercase", letterSpacing: 1, marginBottom: 10 }}>Monthly P&L Progress</div>
              <PnLGauge value={totalPnL} />
              <div style={{ display: "flex", justifyContent: "space-between", marginTop: 10, fontSize: 11, fontFamily: "monospace" }}>
                <span style={{ color: "#ef4444" }}>Risk left: <b style={{ color: riskLeft > 500 ? "#f97316" : "#ef4444" }}>${Math.max(0, riskLeft).toLocaleString()}</b></span>
                <span style={{ color: "#22c55e" }}>Goal remaining: <b>${Math.max(0, goalLeft).toLocaleString()}</b></span>
              </div>
            </div>

            <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
              <StatBox label="Trades" value={trades.length} sub={`${winners.length}W / ${losers.length}L`} />
              <StatBox label="Win Rate" value={`${winRate}%`} color={parseFloat(winRate) >= 50 ? "#22c55e" : "#f97316"} />
              <StatBox label="Avg Win" value={`$${parseFloat(avgWin).toLocaleString()}`} color="#22c55e" />
              <StatBox label="Avg Loss" value={`$${parseFloat(avgLoss).toLocaleString()}`} color="#ef4444" />
            </div>

            {/* Contract bars */}
            <div style={{ background: "#0a1120", border: "1px solid #0f172a", borderRadius: 8, padding: 18 }}>
              <div style={{ fontSize: 10, color: "#475569", fontFamily: "monospace", textTransform: "uppercase", letterSpacing: 1, marginBottom: 12 }}>Today's Contract Usage</div>
              <div style={{ display: "flex", gap: 16, flexWrap: "wrap" }}>
                {[{ label: "Minis", used: miniUsed, max: MAX_MINIS, color: "#06b6d4" }, { label: "Micros", used: microUsed, max: MAX_MICROS, color: "#a78bfa" }].map(({ label, used, max, color }) => (
                  <div key={label} style={{ flex: 1, minWidth: 140 }}>
                    <div style={{ display: "flex", justifyContent: "space-between", fontSize: 11, fontFamily: "monospace", marginBottom: 5 }}>
                      <span style={{ color: "#94a3b8" }}>{label}</span>
                      <span style={{ color: used >= max ? "#ef4444" : "#e2e8f0" }}>{used} / {max}</span>
                    </div>
                    <div style={{ height: 7, background: "#0f172a", borderRadius: 4, overflow: "hidden" }}>
                      <div style={{ height: "100%", width: `${Math.min(100, (used / max) * 100)}%`, background: used >= max ? "#ef4444" : color, borderRadius: 4, transition: "width 0.3s" }} />
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {isLimitReached && (
              <div style={{ background: "#1a0a0a", border: "1px solid #ef4444", borderRadius: 8, padding: 14, color: "#ef4444", fontFamily: "monospace", fontSize: 13, textAlign: "center" }}>
                ⛔ MAX LOSS LIMIT REACHED · Stop trading and review your strategy.
              </div>
            )}

            {trades.length > 0 && (
              <div style={{ background: "#0a1120", border: "1px solid #0f172a", borderRadius: 8, padding: 18 }}>
                <div style={{ fontSize: 10, color: "#475569", fontFamily: "monospace", textTransform: "uppercase", letterSpacing: 1, marginBottom: 10 }}>Recent Trades</div>
                {[...trades].reverse().slice(0, 5).map(t => {
                  const p = pnl(t);
                  const inst = INSTRUMENTS.find(i => i.value === t.instrument);
                  return (
                    <div key={t.id}
                      onClick={() => setChartSymbol(inst?.tvSymbol || chartSymbol)}
                      style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "8px 0", borderBottom: "1px solid #0f172a", cursor: "pointer" }}
                      title="Click to view chart"
                    >
                      <div style={{ fontFamily: "monospace", fontSize: 12 }}>
                        <span style={{ color: "#64748b", marginRight: 8 }}>{t.date}</span>
                        <span style={{ color: "#e2e8f0" }}>{t.instrument}</span>
                        <span style={{ color: t.direction === "Long" ? "#22c55e" : "#f97316", marginLeft: 8, fontSize: 11 }}>{t.direction.toUpperCase()}</span>
                        <span style={{ color: "#475569", marginLeft: 8 }}>×{t.contracts}</span>
                        <span style={{ color: "#334155", marginLeft: 8, fontSize: 10 }}>↑ chart</span>
                      </div>
                      <span style={{ fontFamily: "monospace", fontWeight: 700, color: p >= 0 ? "#22c55e" : "#ef4444" }}>
                        {p >= 0 ? "+" : ""}${p.toFixed(2)}
                      </span>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        )}

        {/* ── LOG TRADE ── */}
        {activeTab === "log" && (
          <div style={{ background: "#0a1120", border: "1px solid #0f172a", borderRadius: 8, padding: 22, maxWidth: 540 }}>
            <div style={{ fontSize: 12, color: "#06b6d4", fontFamily: "monospace", marginBottom: 18, fontWeight: 600 }}>
              {editId ? "✏ EDIT TRADE" : "NEW TRADE"}
            </div>
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
              <div>{lbl("Date")}{inp("date", "date")}</div>
              <div>{lbl("Instrument")}{sel("instrument", INSTRUMENTS)}</div>
              <div>{lbl("Direction")}{sel("direction", ["Long", "Short"])}</div>
              <div>{lbl("Contracts")}{inp("contracts", "number", { min: 1 })}</div>
              <div>{lbl("Entry Price")}{inp("entry", "number", { step: "0.25" })}</div>
              <div>{lbl("Exit Price")}{inp("exit", "number", { step: "0.25" })}</div>
              <div>{lbl("Strategy")}{sel("strategy", STRATEGIES)}</div>
              <div>{lbl("Emotion")}{sel("emotion", ["Calm", "Neutral", "Anxious", "Confident", "FOMO", "Revenge"])}</div>
              <div style={{ gridColumn: "1/-1" }}>
                {lbl("Notes")}
                <textarea value={form.notes} onChange={e => set("notes", e.target.value)} rows={3}
                  style={{ ...inputStyle, resize: "vertical" }}
                  placeholder="Setup, execution, lessons learned..." />
              </div>
            </div>

            {form.entry && form.exit && (
              <div style={{ marginTop: 12, padding: "9px 12px", background: "#0f172a", borderRadius: 4, fontFamily: "monospace", fontSize: 13 }}>
                Est. P&L: <span style={{ color: pnl(form) >= 0 ? "#22c55e" : "#ef4444", fontWeight: 700 }}>
                  {pnl(form) >= 0 ? "+" : ""}${pnl(form).toFixed(2)}
                </span>
              </div>
            )}

            <div style={{ display: "flex", gap: 10, marginTop: 16 }}>
              <button onClick={handleSubmit} disabled={isLimitReached && !editId}
                style={{ background: "#06b6d4", color: "#0f172a", border: "none", padding: "9px 22px", borderRadius: 4, fontFamily: "monospace", fontSize: 13, fontWeight: 700, cursor: isLimitReached && !editId ? "not-allowed" : "pointer", opacity: isLimitReached && !editId ? 0.4 : 1 }}>
                {editId ? "SAVE CHANGES" : "LOG TRADE"}
              </button>
              {editId && (
                <button onClick={() => { setEditId(null); setForm(emptyForm as any); }}
                  style={{ background: "transparent", color: "#64748b", border: "1px solid #1e293b", padding: "9px 14px", borderRadius: 4, fontFamily: "monospace", fontSize: 13, cursor: "pointer" }}>
                  CANCEL
                </button>
              )}
            </div>
          </div>
        )}

        {/* ── HISTORY ── */}
        {activeTab === "history" && (
          <div>
            {trades.length === 0 ? (
              <div style={{ color: "#334155", fontFamily: "monospace", textAlign: "center", padding: 40 }}>No trades logged yet.</div>
            ) : (
              <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
                {[...trades].reverse().map(t => {
                  const p = pnl(t);
                  const inst = INSTRUMENTS.find(i => i.value === t.instrument);
                  return (
                    <div key={t.id} style={{ background: "#0a1120", border: `1px solid ${p >= 0 ? "#0f2a1a" : "#2a0f0f"}`, borderRadius: 6, padding: "12px 16px" }}>
                      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", flexWrap: "wrap", gap: 8 }}>
                        <div style={{ fontFamily: "monospace" }}>
                          <span style={{ color: "#64748b", fontSize: 11, marginRight: 10 }}>{t.date}</span>
                          <span style={{ color: "#e2e8f0", fontWeight: 600 }}>{t.instrument}</span>
                          <span style={{ fontSize: 10, color: "#475569", marginLeft: 6 }}>({inst?.type})</span>
                          <span style={{ color: t.direction === "Long" ? "#22c55e" : "#f97316", marginLeft: 10, fontSize: 11, fontWeight: 700 }}>{t.direction}</span>
                          <span style={{ color: "#475569", marginLeft: 8, fontSize: 12 }}>×{t.contracts}</span>
                          <span style={{ color: "#334155", marginLeft: 10, fontSize: 11 }}>{t.strategy}</span>
                          <button onClick={() => { setChartSymbol(inst?.tvSymbol || chartSymbol); setActiveTab("dashboard"); }}
                            style={{ marginLeft: 10, background: "transparent", border: "1px solid #1e293b", color: "#06b6d4", padding: "2px 8px", borderRadius: 3, fontFamily: "monospace", fontSize: 10, cursor: "pointer" }}>
                            📈 chart
                          </button>
                        </div>
                        <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                          <span style={{ fontFamily: "monospace", fontWeight: 700, fontSize: 15, color: p >= 0 ? "#22c55e" : "#ef4444" }}>
                            {p >= 0 ? "+" : ""}${p.toFixed(2)}
                          </span>
                          <button onClick={() => handleEdit(t)} style={{ background: "transparent", border: "1px solid #1e293b", color: "#64748b", padding: "3px 10px", borderRadius: 3, fontFamily: "monospace", fontSize: 11, cursor: "pointer" }}>EDIT</button>
                          {deleteConfirm === t.id ? (
                            <>
                              <button onClick={() => { setTrades(prev => prev.filter(x => x.id !== t.id)); setDeleteConfirm(null); }} style={{ background: "#ef4444", border: "none", color: "#fff", padding: "3px 10px", borderRadius: 3, fontFamily: "monospace", fontSize: 11, cursor: "pointer" }}>CONFIRM</button>
                              <button onClick={() => setDeleteConfirm(null)} style={{ background: "transparent", border: "1px solid #1e293b", color: "#64748b", padding: "3px 8px", borderRadius: 3, fontFamily: "monospace", fontSize: 11, cursor: "pointer" }}>✕</button>
                            </>
                          ) : (
                            <button onClick={() => setDeleteConfirm(t.id)} style={{ background: "transparent", border: "1px solid #1e293b", color: "#ef4444", padding: "3px 10px", borderRadius: 3, fontFamily: "monospace", fontSize: 11, cursor: "pointer" }}>DEL</button>
                          )}
                        </div>
                      </div>
                      <div style={{ marginTop: 6, fontSize: 11, fontFamily: "monospace", color: "#475569" }}>
                        <span>Entry: <b style={{ color: "#94a3b8" }}>{t.entry}</b></span>
                        <span style={{ marginLeft: 12 }}>Exit: <b style={{ color: "#94a3b8" }}>{t.exit}</b></span>
                        <span style={{ marginLeft: 12 }}>Emotion: <b style={{ color: "#7c6fcd" }}>{t.emotion}</b></span>
                      </div>
                      {t.notes && <div style={{ marginTop: 5, fontSize: 11, color: "#475569", fontStyle: "italic" }}>{t.notes}</div>}
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}