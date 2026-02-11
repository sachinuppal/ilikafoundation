// Shared constants, icons, and components used across pages
import { useState, useEffect } from "react";

// ===== COLOR PALETTE =====
export const C = {
    bg: "#FDF6EE", bg2: "#FAF0E4", white: "#FFFFFF",
    green: "#2D5016", greenL: "#3A6B1E", greenS: "#E8F0E2", greenM: "#5A7247",
    gold: "#C8962E", goldL: "#D4A43A", goldS: "#FFF3DC",
    red: "#E53935", redS: "#FFEBEE",
    td: "#2C2C2C", tm: "#5C5549", tl: "#8A8175", tx: "#A89F93",
    brd: "#E8DFD3", brdL: "#F0E8DC",
};

// ===== UTILITY FUNCTIONS =====
export const generateGroupId = () => Math.floor(1000 + Math.random() * 9000);
export const generateSlug = (n) => `${n.toLowerCase().replace(/[^a-z0-9]/g, "-").replace(/-+/g, "-").replace(/^-|-$/g, "")}-fundraiser-${generateGroupId()}`;

// ===== SVG ICONS =====
export const Heart = ({ s = 20 }) => <svg width={s} height={s} viewBox="0 0 24 24" fill="currentColor"><path d="M12 21.35l-1.45-1.32C5.4 15.36 2 12.28 2 8.5 2 5.42 4.42 3 7.5 3c1.74 0 3.41.81 4.5 2.09C13.09 3.81 14.76 3 16.5 3 19.58 3 22 5.42 22 8.5c0 3.78-3.4 6.86-8.55 11.54L12 21.35z" /></svg>;
export const Users = ({ s = 20 }) => <svg width={s} height={s} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M17 21v-2a4 4 0 00-4-4H5a4 4 0 00-4 4v2" /><circle cx="9" cy="7" r="4" /><path d="M23 21v-2a4 4 0 00-3-3.87" /><path d="M16 3.13a4 4 0 010 7.75" /></svg>;
export const User = ({ s = 20 }) => <svg width={s} height={s} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M20 21v-2a4 4 0 00-4-4H8a4 4 0 00-4 4v2" /><circle cx="12" cy="7" r="4" /></svg>;
export const Check = ({ s = 20 }) => <svg width={s} height={s} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><polyline points="20 6 9 17 4 12" /></svg>;
export const Share = ({ s = 18 }) => <svg width={s} height={s} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="18" cy="5" r="3" /><circle cx="6" cy="12" r="3" /><circle cx="18" cy="19" r="3" /><line x1="8.59" y1="13.51" x2="15.42" y2="17.49" /><line x1="15.41" y1="6.51" x2="8.59" y2="10.49" /></svg>;
export const Arrow = ({ s = 18 }) => <svg width={s} height={s} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><line x1="5" y1="12" x2="19" y2="12" /><polyline points="12 5 19 12 12 19" /></svg>;
export const Back = () => <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><line x1="19" y1="12" x2="5" y2="12" /><polyline points="12 19 5 12 12 5" /></svg>;
export const Leaf = ({ s = 16 }) => <svg width={s} height={s} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M11 20A7 7 0 019.8 6.9C15.5 4.9 17 3.5 19 2c1 2 2 4.5 2 8 0 5.5-3.8 10-10 10z" /><path d="M2 21c0-3 1.85-5.36 5.08-6C9.5 14.52 12 13 13 12" /></svg>;
export const Quote = ({ s = 24 }) => <svg width={s} height={s} viewBox="0 0 24 24" fill="currentColor" opacity="0.15"><path d="M6 17h3l2-4V7H5v6h3zm8 0h3l2-4V7h-6v6h3z" /></svg>;
export const Star = ({ s = 14 }) => <svg width={s} height={s} viewBox="0 0 24 24" fill="currentColor"><path d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z" /></svg>;
export const Shield = ({ s = 20 }) => <svg width={s} height={s} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" /></svg>;
export const BookOpen = ({ s = 20 }) => <svg width={s} height={s} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M2 3h6a4 4 0 014 4v14a3 3 0 00-3-3H2z" /><path d="M22 3h-6a4 4 0 00-4 4v14a3 3 0 013-3h7z" /></svg>;
export const Handshake = ({ s = 20 }) => <svg width={s} height={s} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M20.42 4.58a5.4 5.4 0 00-7.65 0l-.77.78-.77-.78a5.4 5.4 0 00-7.65 0C1.46 6.7 1.33 10.28 4 13l8 8 8-8c2.67-2.72 2.54-6.3.42-8.42z" /></svg>;
export const TrendUp = ({ s = 20 }) => <svg width={s} height={s} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polyline points="23 6 13.5 15.5 8.5 10.5 1 18" /><polyline points="17 6 23 6 23 12" /></svg>;
export const Clock = ({ s = 16 }) => <svg width={s} height={s} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="10" /><polyline points="12 6 12 12 16 14" /></svg>;

// ===== REUSABLE COMPONENTS =====
export function Facepile({ count = 5, size = 32, label, names }) {
    const colors = ["#7B9E6B", "#C4956A", "#8B7B6B", "#6B8B9E", "#9E7B8B", "#8B9E6B", "#6B7B9E", "#9E8B6B"];
    const initials = names || ["A", "S", "R", "P", "M", "K", "N", "D", "V", "T", "J", "L"];
    return (
        <div style={{ display: "flex", alignItems: "center", gap: 10, flexWrap: "wrap", justifyContent: "center" }}>
            <div style={{ display: "flex" }}>
                {Array.from({ length: count }).map((_, i) => (
                    <div key={i} style={{ width: size, height: size, borderRadius: "50%", background: colors[i % colors.length], border: `2px solid ${C.bg}`, marginLeft: i > 0 ? -8 : 0, display: "flex", alignItems: "center", justifyContent: "center", color: "#fff", fontSize: size * 0.38, fontWeight: 600, fontFamily: "'DM Sans', sans-serif", zIndex: count - i }}>{initials[i % initials.length]}</div>
                ))}
            </div>
            {label && <span style={{ fontSize: 13, color: C.tl, lineHeight: 1.3 }}>{label}</span>}
        </div>
    );
}

export function LiveTicker() {
    const [idx, setIdx] = useState(0);
    const [show, setShow] = useState(true);
    const activities = [
        { name: "Priya S.", action: "sponsored a girl's education", time: "2 min ago", city: "Mumbai", amount: "\u20B98,000" },
        { name: "Rahul & 3 friends", action: "completed a group sponsorship", time: "8 min ago", city: "Delhi", amount: "\u20B98,000" },
        { name: "Sneha M.", action: "started a new group", time: "14 min ago", city: "Bangalore", amount: "\u20B92,000" },
        { name: "Arjun K.", action: "chose annual sponsorship", time: "19 min ago", city: "Pune", amount: "\u20B996,000" },
        { name: "Meera & friends", action: "completed a group sponsorship", time: "25 min ago", city: "Chennai", amount: "\u20B98,000" },
        { name: "A corporate team", action: "sponsored 3 girls", time: "31 min ago", city: "Hyderabad", amount: "\u20B924,000" },
    ];
    useEffect(() => { const t = setInterval(() => { setShow(false); setTimeout(() => { setIdx(p => (p + 1) % activities.length); setShow(true); }, 300); }, 4500); return () => clearInterval(t); }, []);
    const a = activities[idx];
    return (
        <div style={{ display: "inline-flex", alignItems: "center", gap: 10, padding: "8px 18px", borderRadius: 24, background: C.white, border: `1px solid ${C.brdL}`, fontSize: 13, color: C.tm, boxShadow: "0 2px 12px rgba(0,0,0,0.06)", transition: "all 0.3s", opacity: show ? 1 : 0, transform: show ? "translateY(0)" : "translateY(-8px)", maxWidth: "100%" }}>
            <span style={{ width: 8, height: 8, borderRadius: "50%", background: "#4CAF50", flexShrink: 0, animation: "pulse 2s infinite" }} />
            <span><strong style={{ color: C.td }}>{a.name}</strong> from {a.city} {a.action} <span style={{ color: C.tx }}>\u00B7 {a.time}</span></span>
        </div>
    );
}

// ===== SHARED STYLES =====
export const inp = { width: "100%", padding: "12px 16px", background: C.bg, border: `1px solid ${C.brd}`, borderRadius: 8, color: C.td, fontSize: 15, fontFamily: "inherit", outline: "none", boxSizing: "border-box" };
export const lbl = { display: "block", fontSize: 12, textTransform: "uppercase", letterSpacing: 1, color: C.tl, marginBottom: 6, fontWeight: 500 };
export const backBtn = { background: "none", border: "none", color: C.green, cursor: "pointer", fontFamily: "inherit", fontSize: 14, marginBottom: 32, display: "flex", alignItems: "center", gap: 6, fontWeight: 500 };

// ===== NEW KETTO-INSPIRED COMPONENTS =====

export function CampaignProgress({ raised = 1016000, goal = 2400000, supporters = 127, daysLeft = 18 }) {
    const pct = Math.min((raised / goal) * 100, 100);
    const [animated, setAnimated] = useState(0);
    useEffect(() => { const t = setTimeout(() => setAnimated(pct), 500); return () => clearTimeout(t); }, [pct]);
    return (
        <div style={{ background: C.white, borderRadius: 16, padding: "24px 28px", border: `1px solid ${C.brd}`, boxShadow: "0 2px 8px rgba(0,0,0,0.04)" }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-end", marginBottom: 12 }}>
                <div>
                    <div style={{ fontSize: 11, textTransform: "uppercase", letterSpacing: 1.5, color: C.tl, marginBottom: 4 }}>Raised so far</div>
                    <div style={{ fontFamily: "'Playfair Display',serif", fontSize: 32, color: C.green, fontWeight: 600 }}>{"\u20B9"}{raised.toLocaleString("en-IN")}</div>
                </div>
                <div style={{ textAlign: "right" }}>
                    <div style={{ fontSize: 12, color: C.tl }}>Goal: {"\u20B9"}{goal.toLocaleString("en-IN")}</div>
                </div>
            </div>
            <div style={{ height: 10, borderRadius: 5, background: C.bg2, overflow: "hidden", marginBottom: 14 }}>
                <div style={{ height: "100%", borderRadius: 5, background: `linear-gradient(90deg, ${C.green}, ${C.gold})`, width: `${animated}%`, transition: "width 1.5s cubic-bezier(0.16,1,0.3,1)" }} />
            </div>
            <div style={{ display: "flex", justifyContent: "space-between", fontSize: 13 }}>
                <span style={{ color: C.green, fontWeight: 600 }}>{Math.round(pct)}% funded</span>
                <div style={{ display: "flex", gap: 16 }}>
                    <span style={{ color: C.tm, display: "flex", alignItems: "center", gap: 4 }}><User s={13} /> <strong>{supporters}</strong> sponsors</span>
                    <span style={{ color: C.red, display: "flex", alignItems: "center", gap: 4, fontWeight: 500 }}><Clock s={13} /> {daysLeft} days left</span>
                </div>
            </div>
        </div>
    );
}

export function RecentSupporters() {
    const donors = [
        { name: "Anjali Mehta", amount: 8000, time: "12 min ago", type: "individual", city: "Mumbai" },
        { name: "Vikram + 3", amount: 2000, time: "28 min ago", type: "group", city: "Delhi" },
        { name: "Deepika R.", amount: 96000, time: "1 hour ago", type: "individual", city: "Bangalore", annual: true },
        { name: "Karthik S.", amount: 2000, time: "2 hours ago", type: "group", city: "Chennai" },
        { name: "Anonymous", amount: 8000, time: "3 hours ago", type: "individual", city: "Pune" },
        { name: "Riya + 3", amount: 2000, time: "4 hours ago", type: "group", city: "Hyderabad" },
        { name: "Sameer J.", amount: 8000, time: "5 hours ago", type: "individual", city: "Kolkata" },
    ];
    return (
        <div>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 16 }}>
                <h3 style={{ fontSize: 15, fontWeight: 600, color: C.td, display: "flex", alignItems: "center", gap: 8 }}>
                    <span style={{ width: 8, height: 8, borderRadius: "50%", background: "#4CAF50", display: "inline-block" }} />Recent Sponsors
                </h3>
                <span style={{ fontSize: 12, color: C.tl }}>Live updates</span>
            </div>
            <div style={{ display: "flex", flexDirection: "column", gap: 0 }}>
                {donors.map((d, i) => (
                    <div key={i} style={{ display: "flex", alignItems: "center", gap: 12, padding: "12px 0", borderBottom: i < donors.length - 1 ? `1px solid ${C.brdL}` : "none", animation: `fadeUp 0.4s ease ${i * 0.05}s both` }}>
                        <div style={{ width: 36, height: 36, borderRadius: "50%", background: d.type === "individual" ? C.goldS : C.greenS, display: "flex", alignItems: "center", justifyContent: "center", color: d.type === "individual" ? C.gold : C.green, fontSize: 14, fontWeight: 600, flexShrink: 0 }}>{d.name[0]}</div>
                        <div style={{ flex: 1, minWidth: 0 }}>
                            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                                <span style={{ fontWeight: 500, fontSize: 14, color: C.td }}>{d.name}</span>
                                <span style={{ fontWeight: 600, fontSize: 14, color: C.green }}>{"\u20B9"}{d.amount.toLocaleString()}{d.annual ? "/yr" : "/mo"}</span>
                            </div>
                            <div style={{ fontSize: 12, color: C.tl, display: "flex", gap: 8, marginTop: 2 }}>
                                <span>{d.city}</span><span>\u00B7</span><span>{d.time}</span>
                                {d.type === "group" && <span style={{ color: C.green, fontWeight: 500 }}>Group</span>}
                            </div>
                        </div>
                    </div>
                ))}
            </div>
        </div>
    );
}

export function UrgencyBanner() {
    const [t, setT] = useState({ d: 18, h: 14, m: 32, s: 0 });
    useEffect(() => { const i = setInterval(() => setT(p => { let s = p.s - 1; let m = p.m; let h = p.h; let d = p.d; if (s < 0) { s = 59; m--; } if (m < 0) { m = 59; h--; } if (h < 0) { h = 23; d--; } return { d, h, m, s }; }), 1000); return () => clearInterval(i); }, []);
    const box = { background: C.white, borderRadius: 6, padding: "6px 10px", minWidth: 40, textAlign: "center" };
    return (
        <div style={{ background: `linear-gradient(135deg, ${C.red}11, ${C.gold}11)`, border: `1px solid ${C.red}22`, borderRadius: 12, padding: "16px 24px", display: "flex", flexWrap: "wrap", alignItems: "center", justifyContent: "space-between", gap: 12 }}>
            <div>
                <div style={{ fontSize: 14, fontWeight: 600, color: C.red, marginBottom: 2 }}>Campaign ends on Women's Day</div>
                <div style={{ fontSize: 12, color: C.tm }}>March 8th, 2025 — sponsor before it's too late</div>
            </div>
            <div style={{ display: "flex", gap: 6, alignItems: "center" }}>
                {[{ v: t.d, l: "days" }, { v: t.h, l: "hrs" }, { v: t.m, l: "min" }, { v: t.s, l: "sec" }].map((x, i) => (
                    <div key={i} style={box}>
                        <div style={{ fontFamily: "'Playfair Display',serif", fontSize: 18, fontWeight: 600, color: C.td }}>{String(x.v).padStart(2, "0")}</div>
                        <div style={{ fontSize: 9, textTransform: "uppercase", color: C.tl, letterSpacing: 0.5 }}>{x.l}</div>
                    </div>
                ))}
            </div>
        </div>
    );
}

export function ImpactCalculator() {
    const items = [
        { amount: "8,000", period: "/month", impacts: ["1 girl's tuition fees", "A dedicated buddy mentor", "Learning tools & resources", "Life skills workshops"] },
        { amount: "96,000", period: "/year", impacts: ["1 girl's full-year fellowship", "End-to-end career support", "Internship placements", "Access to professional network"] },
    ];
    const [sel, setSel] = useState(0);
    return (
        <div style={{ background: C.white, borderRadius: 16, padding: "28px", border: `1px solid ${C.brd}` }}>
            <h3 style={{ fontSize: 15, fontWeight: 600, color: C.td, marginBottom: 16 }}>See the impact of your contribution</h3>
            <div style={{ display: "flex", gap: 8, marginBottom: 20 }}>
                {items.map((it, i) => (
                    <button key={i} onClick={() => setSel(i)} style={{ flex: 1, padding: "12px", borderRadius: 8, cursor: "pointer", fontFamily: "inherit", textAlign: "center", background: sel === i ? C.greenS : C.bg, border: sel === i ? `2px solid ${C.green}` : `1px solid ${C.brd}`, color: sel === i ? C.green : C.tm, transition: "all 0.2s" }}>
                        <div style={{ fontFamily: "'Playfair Display',serif", fontSize: 20, fontWeight: 600 }}>{"\u20B9"}{it.amount}</div>
                        <div style={{ fontSize: 11, opacity: 0.7 }}>{it.period}</div>
                    </button>
                ))}
            </div>
            <div style={{ display: "flex", flexDirection: "column", gap: 0 }}>
                {items[sel].impacts.map((imp, i) => (
                    <div key={i} style={{ display: "flex", alignItems: "center", gap: 12, padding: "10px 0", borderBottom: i < items[sel].impacts.length - 1 ? `1px solid ${C.brdL}` : "none" }}>
                        <div style={{ width: 28, height: 28, borderRadius: "50%", background: C.greenS, display: "flex", alignItems: "center", justifyContent: "center", color: C.green, flexShrink: 0 }}><Check s={14} /></div>
                        <span style={{ fontSize: 14, color: C.tm }}>{imp}</span>
                    </div>
                ))}
            </div>
        </div>
    );
}

// ===== GLOBAL STYLES (inject once) =====
export const GlobalStyles = () => (
    <style>{`
    @keyframes fadeUp { from { opacity: 0; transform: translateY(16px); } to { opacity: 1; transform: translateY(0); } }
    @keyframes pulse { 0%, 100% { opacity: 1; } 50% { opacity: 0.4; } }
    input::placeholder { color: ${C.tx}; }
    input:focus { border-color: ${C.green} !important; }
    button:hover { opacity: 0.92; }
    * { margin: 0; padding: 0; }
    details summary::-webkit-details-marker { display: none; }
    details[open] summary span { transform: rotate(45deg); }
    ::-webkit-scrollbar { width: 6px; }
    ::-webkit-scrollbar-track { background: ${C.bg}; }
    ::-webkit-scrollbar-thumb { background: ${C.brd}; border-radius: 3px; }
  `}</style>
);
