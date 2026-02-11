import { useState, useEffect, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import { C, Heart, Users, Check, BookOpen, Back, GlobalStyles, backBtn } from "./shared.jsx";
import { getAllGroups, getAllContributions, getRevenueStats, cancelSubscription, exportContributionsCSV, getWebhookEvents } from "./dataService.js";
import { generateReceiptFromContribution } from "./invoiceService.js";
import ContentEditor from "./ContentEditor.jsx";

export default function AdminRoute() {
    const navigate = useNavigate();
    const [groups, setGroups] = useState([]);
    const [contributions, setContributions] = useState([]);
    const [revenue, setRevenue] = useState(null);
    const [loading, setLoading] = useState(true);
    const [authenticated, setAuthenticated] = useState(() => sessionStorage.getItem("ilika_admin") === "true");
    const [loginForm, setLoginForm] = useState({ username: "", password: "" });
    const [loginError, setLoginError] = useState("");
    const [activeTab, setActiveTab] = useState("overview");
    const [subFilter, setSubFilter] = useState("all");
    const [cancelling, setCancelling] = useState(null);
    const [webhookEvents, setWebhookEvents] = useState([]);
    const [eventFilter, setEventFilter] = useState("");
    const [expandedEvent, setExpandedEvent] = useState(null);

    useEffect(() => {
        if (authenticated) loadData();
    }, [authenticated]);

    async function loadData() {
        try {
            const [g, c, r, w] = await Promise.all([getAllGroups(), getAllContributions(), getRevenueStats(), getWebhookEvents(100)]);
            setGroups(g);
            setContributions(c);
            setRevenue(r);
            setWebhookEvents(w);
        } catch (err) {
            console.error("Error loading admin data:", err);
        } finally {
            setLoading(false);
        }
    }

    // Auto-refresh webhook events every 30 seconds when Activity tab active
    useEffect(() => {
        if (!authenticated || activeTab !== "activity") return;
        const interval = setInterval(async () => {
            try {
                const w = await getWebhookEvents(100);
                setWebhookEvents(w);
            } catch (e) { /* skip */ }
        }, 30000);
        return () => clearInterval(interval);
    }, [authenticated, activeTab]);

    const totalGirls = groups.filter(g => g.filled_slots >= g.total_slots).length + contributions.filter(c => c.type === "individual" && c.payment_status === "Success").length;

    const handleLogin = (e) => {
        e.preventDefault();
        if (loginForm.username === "admin" && loginForm.password === "ilika2025") {
            sessionStorage.setItem("ilika_admin", "true");
            setAuthenticated(true);
            setLoginError("");
        } else {
            setLoginError("Invalid credentials");
        }
    };

    const handleLogout = () => {
        sessionStorage.removeItem("ilika_admin");
        setAuthenticated(false);
        setGroups([]);
        setContributions([]);
        setRevenue(null);
    };

    const handleCancel = async (id) => {
        if (!confirm("Cancel this subscription? This cannot be undone.")) return;
        setCancelling(id);
        try {
            await cancelSubscription(id);
            await loadData();
        } catch (err) {
            alert("Error: " + err.message);
        } finally {
            setCancelling(null);
        }
    };

    const handleExport = async () => {
        try {
            await exportContributionsCSV();
        } catch (err) {
            alert("Export failed: " + err.message);
        }
    };

    const inp = { width: "100%", padding: "12px 16px", background: C.bg, border: `1px solid ${C.brd}`, borderRadius: 8, color: C.td, fontSize: 15, fontFamily: "inherit", outline: "none", boxSizing: "border-box" };
    const th = { textAlign: "left", padding: "12px 16px", color: C.tl, fontWeight: 500, fontSize: 11, textTransform: "uppercase", letterSpacing: 1 };
    const td = { padding: "12px 16px" };
    const badge = (t, bg, c) => <span style={{ padding: "4px 12px", borderRadius: 20, fontSize: 11, fontWeight: 500, background: bg, color: c }}>{t}</span>;
    const tabBtn = (id, label) => (
        <button key={id} onClick={() => setActiveTab(id)} style={{
            background: activeTab === id ? C.green : "transparent",
            color: activeTab === id ? C.white : C.tl,
            border: `1px solid ${activeTab === id ? C.green : C.brd}`,
            padding: "8px 20px", borderRadius: 8, fontSize: 13, fontWeight: 500, cursor: "pointer", fontFamily: "inherit",
            transition: "all 0.2s ease"
        }}>{label}</button>
    );

    if (!authenticated) {
        return (
            <div style={{ minHeight: "100vh", background: C.bg, display: "flex", alignItems: "center", justifyContent: "center", fontFamily: "'DM Sans', sans-serif" }}>
                <link href="https://fonts.googleapis.com/css2?family=Playfair+Display:ital,wght@0,400;0,500;0,600;0,700;1,400;1,500;1,600&family=DM+Sans:wght@300;400;500;600;700&display=swap" rel="stylesheet" />
                <GlobalStyles />
                <div style={{ width: "100%", maxWidth: 400, padding: 24 }}>
                    <div style={{ background: C.white, borderRadius: 16, padding: 36, border: `1px solid ${C.brd}`, boxShadow: "0 2px 12px rgba(0,0,0,0.04)" }}>
                        <div style={{ textAlign: "center", marginBottom: 28 }}>
                            <div style={{ fontFamily: "'Playfair Display', serif", fontSize: 28, color: C.green, fontWeight: 700, marginBottom: 8 }}>ilika</div>
                            <p style={{ color: C.tl, fontSize: 14, margin: 0 }}>Admin Dashboard Login</p>
                        </div>
                        <form onSubmit={handleLogin}>
                            <div style={{ marginBottom: 16 }}>
                                <label style={{ display: "block", fontSize: 12, textTransform: "uppercase", letterSpacing: 1, color: C.tl, marginBottom: 6, fontWeight: 500 }}>Username</label>
                                <input type="text" value={loginForm.username} onChange={e => setLoginForm({ ...loginForm, username: e.target.value })} placeholder="Enter username" style={inp} autoFocus />
                            </div>
                            <div style={{ marginBottom: 20 }}>
                                <label style={{ display: "block", fontSize: 12, textTransform: "uppercase", letterSpacing: 1, color: C.tl, marginBottom: 6, fontWeight: 500 }}>Password</label>
                                <input type="password" value={loginForm.password} onChange={e => setLoginForm({ ...loginForm, password: e.target.value })} placeholder="Enter password" style={inp} />
                            </div>
                            {loginError && <div style={{ color: "#c0392b", fontSize: 13, marginBottom: 12, textAlign: "center" }}>{loginError}</div>}
                            <button type="submit" style={{ width: "100%", background: `linear-gradient(135deg,${C.green},${C.greenL})`, color: C.white, border: "none", padding: "14px", borderRadius: 8, fontSize: 15, fontWeight: 600, cursor: "pointer", fontFamily: "inherit" }}>Sign In</button>
                        </form>
                        <p style={{ textAlign: "center", fontSize: 12, color: C.tx, marginTop: 16 }}>Access restricted to campaign administrators</p>
                    </div>
                </div>
            </div>
        );
    }

    const filteredContribs = subFilter === "all" ? contributions
        : subFilter === "active" ? contributions.filter(c => c.payment_status === "Success" && (c.subscription_status || "active") === "active")
            : subFilter === "cancelled" ? contributions.filter(c => c.subscription_status === "cancelled")
                : subFilter === "pending" ? contributions.filter(c => c.payment_status === "Pending")
                    : contributions;

    return (
        <div style={{ minHeight: "100vh", background: C.bg, color: C.td, fontFamily: "'DM Sans', sans-serif" }}>
            <link href="https://fonts.googleapis.com/css2?family=Playfair+Display:ital,wght@0,400;0,500;0,600;0,700;1,400;1,500;1,600&family=DM+Sans:wght@300;400;500;600;700&display=swap" rel="stylesheet" />
            <GlobalStyles />
            <div style={{ maxWidth: 1100, margin: "0 auto", padding: "40px 24px" }}>
                {/* Header */}
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 32 }}>
                    <button onClick={() => navigate("/")} style={backBtn}><Back /> Back to Campaign</button>
                    <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
                        <button onClick={handleExport} style={{ background: C.white, border: `1px solid ${C.brd}`, color: C.green, padding: "6px 14px", borderRadius: 6, fontSize: 12, cursor: "pointer", fontFamily: "inherit", fontWeight: 500 }}>↓ Export CSV</button>
                        <button onClick={handleLogout} style={{ background: "none", border: `1px solid ${C.brd}`, color: C.tl, padding: "6px 14px", borderRadius: 6, fontSize: 12, cursor: "pointer", fontFamily: "inherit" }}>Logout</button>
                    </div>
                </div>

                <h1 style={{ fontFamily: "'Playfair Display', serif", fontSize: 32, marginBottom: 8, color: C.green }}>Admin Dashboard</h1>
                <p style={{ color: C.tl, marginBottom: 24 }}>Campaign overview, payments & subscription management</p>

                {/* Tab Navigation */}
                <div style={{ display: "flex", gap: 8, marginBottom: 32, flexWrap: "wrap" }}>
                    {tabBtn("overview", "Overview")}
                    {tabBtn("subscriptions", "Subscriptions")}
                    {tabBtn("groups", "Groups")}
                    {tabBtn("activity", "Activity Log")}
                    {tabBtn("content", "Site Content")}
                </div>

                {loading ? (
                    <div style={{ textAlign: "center", padding: 60, color: C.tl }}>Loading data...</div>
                ) : (
                    <>
                        {/* ===== OVERVIEW TAB ===== */}
                        {activeTab === "overview" && <>
                            {/* Revenue Cards */}
                            {revenue && (
                                <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(180px, 1fr))", gap: 16, marginBottom: 32 }}>
                                    {[
                                        { l: "Total Collected", v: `\u20B9${(revenue.totalCollected || 0).toLocaleString()}`, c: C.green, icon: "💰" },
                                        { l: "Monthly Revenue", v: `\u20B9${(revenue.mrr || 0).toLocaleString()}`, c: C.gold, icon: "📊" },
                                        { l: "Annual Revenue", v: `\u20B9${(revenue.arr || 0).toLocaleString()}`, c: C.greenM, icon: "📈" },
                                        { l: "Avg Contribution", v: `\u20B9${(revenue.avgContribution || 0).toLocaleString()}`, c: "#8B7B6B", icon: "💎" },
                                    ].map((s, i) => (
                                        <div key={i} style={{ background: C.white, borderRadius: 14, padding: "24px 20px", border: `1px solid ${C.brd}`, boxShadow: "0 1px 4px rgba(0,0,0,0.04)" }}>
                                            <div style={{ fontSize: 20, marginBottom: 8 }}>{s.icon}</div>
                                            <div style={{ fontSize: 28, fontFamily: "'Playfair Display', serif", color: s.c, marginBottom: 4, fontWeight: 700 }}>{s.v}</div>
                                            <div style={{ fontSize: 11, color: C.tl, textTransform: "uppercase", letterSpacing: 1 }}>{s.l}</div>
                                        </div>
                                    ))}
                                </div>
                            )}

                            {/* Campaign Stats */}
                            <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(180px, 1fr))", gap: 16, marginBottom: 40 }}>
                                {[
                                    { l: "Girls Sponsored", v: totalGirls, c: C.green },
                                    { l: "Individual Sponsors", v: contributions.filter(c => c.type === "individual").length, c: C.gold },
                                    { l: "Group Sponsors", v: contributions.filter(c => c.type === "group").length, c: C.greenM },
                                    { l: "Active Subscriptions", v: revenue?.activeSubscriptions || 0, c: "#3B7A57" },
                                    { l: "Cancelled", v: revenue?.cancelledSubscriptions || 0, c: "#B5704F" },
                                    { l: "Incomplete Groups", v: groups.filter(g => g.filled_slots < g.total_slots).length, c: "#8B7B6B" },
                                ].map((s, i) => (
                                    <div key={i} style={{ background: C.white, borderRadius: 14, padding: "20px 20px", border: `1px solid ${C.brd}`, boxShadow: "0 1px 4px rgba(0,0,0,0.04)" }}>
                                        <div style={{ fontSize: 32, fontFamily: "'Playfair Display', serif", color: s.c, marginBottom: 4 }}>{s.v}</div>
                                        <div style={{ fontSize: 11, color: C.tl, textTransform: "uppercase", letterSpacing: 1 }}>{s.l}</div>
                                    </div>
                                ))}
                            </div>

                            {/* Recent Contributions Table */}
                            {contributions.length > 0 && <>
                                <h2 style={{ fontFamily: "'Playfair Display', serif", fontSize: 20, marginBottom: 16, color: C.green }}>Recent Contributions</h2>
                                <div style={{ overflowX: "auto", background: C.white, borderRadius: 14, border: `1px solid ${C.brd}`, marginBottom: 40 }}>
                                    <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 13 }}>
                                        <thead>
                                            <tr style={{ borderBottom: `1px solid ${C.brdL}` }}>
                                                {["Donor", "Email", "Type", "Amount", "Payment", "Razorpay ID", "Date", ""].map(h => <th key={h} style={th}>{h}</th>)}
                                            </tr>
                                        </thead>
                                        <tbody>
                                            {contributions.slice(0, 10).map((c, i) => (
                                                <tr key={i} style={{ borderBottom: `1px solid ${C.brdL}` }}>
                                                    <td style={{ ...td, fontWeight: 500 }}>{c.donor_name}</td>
                                                    <td style={{ ...td, color: C.tl, fontSize: 12 }}>{c.email}</td>
                                                    <td style={td}>{badge(c.type, c.type === "individual" ? C.goldS : C.greenS, c.type === "individual" ? C.gold : C.green)}</td>
                                                    <td style={td}>{c.amount ? `\u20B9${c.amount.toLocaleString()}` : "\u2014"}</td>
                                                    <td style={td}><span style={{ color: c.payment_status === "Success" ? C.green : C.gold, fontWeight: 500, fontSize: 12 }}>{c.payment_status}</span></td>
                                                    <td style={{ ...td, color: C.tl, fontSize: 11, fontFamily: "monospace" }}>{c.razorpay_payment_id || "\u2014"}</td>
                                                    <td style={{ ...td, color: C.tl, fontSize: 12 }}>{c.created_at ? new Date(c.created_at).toLocaleDateString("en-IN", { day: "numeric", month: "short" }) : "\u2014"}</td>
                                                    <td style={td}><button onClick={() => generateReceiptFromContribution(c)} style={{ background: "none", border: `1px solid ${C.brd}`, color: C.green, padding: "3px 8px", borderRadius: 4, fontSize: 11, cursor: "pointer", fontFamily: "inherit" }}>📄</button></td>
                                                </tr>
                                            ))}
                                        </tbody>
                                    </table>
                                </div>
                            </>}
                        </>}

                        {/* ===== SUBSCRIPTIONS TAB ===== */}
                        {activeTab === "subscriptions" && <>
                            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 20, flexWrap: "wrap", gap: 12 }}>
                                <h2 style={{ fontFamily: "'Playfair Display', serif", fontSize: 22, color: C.green, margin: 0 }}>Subscription Management</h2>
                                <div style={{ display: "flex", gap: 6 }}>
                                    {[
                                        { id: "all", l: "All" },
                                        { id: "active", l: "Active" },
                                        { id: "cancelled", l: "Cancelled" },
                                        { id: "pending", l: "Pending" },
                                    ].map(f => (
                                        <button key={f.id} onClick={() => setSubFilter(f.id)} style={{
                                            background: subFilter === f.id ? C.greenS : "transparent",
                                            color: subFilter === f.id ? C.green : C.tl,
                                            border: `1px solid ${subFilter === f.id ? C.green : C.brd}`,
                                            padding: "5px 14px", borderRadius: 6, fontSize: 12, cursor: "pointer", fontFamily: "inherit", fontWeight: 500
                                        }}>{f.l} ({
                                                f.id === "all" ? contributions.length
                                                    : f.id === "active" ? contributions.filter(c => c.payment_status === "Success" && (c.subscription_status || "active") === "active").length
                                                        : f.id === "cancelled" ? contributions.filter(c => c.subscription_status === "cancelled").length
                                                            : contributions.filter(c => c.payment_status === "Pending").length
                                            })</button>
                                    ))}
                                </div>
                            </div>

                            {filteredContribs.length > 0 ? (
                                <div style={{ overflowX: "auto", background: C.white, borderRadius: 14, border: `1px solid ${C.brd}` }}>
                                    <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 13 }}>
                                        <thead>
                                            <tr style={{ borderBottom: `1px solid ${C.brdL}` }}>
                                                {["Donor", "Email", "Type", "Amount", "Payment", "Subscription", "Razorpay ID", "Actions"].map(h => <th key={h} style={th}>{h}</th>)}
                                            </tr>
                                        </thead>
                                        <tbody>
                                            {filteredContribs.map((c, i) => {
                                                const subStatus = c.subscription_status || "active";
                                                const isActive = c.payment_status === "Success" && subStatus === "active";
                                                return (
                                                    <tr key={i} style={{ borderBottom: `1px solid ${C.brdL}` }}>
                                                        <td style={{ ...td, fontWeight: 500 }}>{c.donor_name}</td>
                                                        <td style={{ ...td, color: C.tl, fontSize: 12 }}>{c.email}</td>
                                                        <td style={td}>{badge(c.type, c.type === "individual" ? C.goldS : C.greenS, c.type === "individual" ? C.gold : C.green)}</td>
                                                        <td style={td}>{c.amount ? `\u20B9${c.amount.toLocaleString()}` : "\u2014"}</td>
                                                        <td style={td}><span style={{ color: c.payment_status === "Success" ? C.green : c.payment_status === "Pending" ? C.gold : "#c0392b", fontWeight: 500, fontSize: 12 }}>{c.payment_status}</span></td>
                                                        <td style={td}>
                                                            {badge(
                                                                subStatus,
                                                                subStatus === "active" ? C.greenS : subStatus === "cancelled" ? "#fce4ec" : C.goldS,
                                                                subStatus === "active" ? C.green : subStatus === "cancelled" ? "#c0392b" : C.gold
                                                            )}
                                                        </td>
                                                        <td style={{ ...td, color: C.tl, fontSize: 11, fontFamily: "monospace" }}>{c.razorpay_payment_id || "\u2014"}</td>
                                                        <td style={td}>
                                                            <div style={{ display: "flex", gap: 4, alignItems: "center" }}>
                                                                <button onClick={() => generateReceiptFromContribution(c)} style={{ background: "none", border: `1px solid ${C.brd}`, color: C.green, padding: "3px 8px", borderRadius: 4, fontSize: 11, cursor: "pointer", fontFamily: "inherit" }}>📄</button>
                                                                {isActive && (
                                                                    <button
                                                                        onClick={() => handleCancel(c.id)}
                                                                        disabled={cancelling === c.id}
                                                                        style={{
                                                                            background: "none", border: `1px solid #c0392b33`, color: "#c0392b",
                                                                            padding: "3px 10px", borderRadius: 4, fontSize: 11, cursor: "pointer", fontFamily: "inherit",
                                                                            opacity: cancelling === c.id ? 0.5 : 1,
                                                                        }}
                                                                    >{cancelling === c.id ? "..." : "Cancel"}</button>
                                                                )}
                                                                {subStatus === "cancelled" && (
                                                                    <span style={{ fontSize: 11, color: C.tl }}>{c.cancelled_at ? new Date(c.cancelled_at).toLocaleDateString("en-IN", { day: "numeric", month: "short" }) : "Cancelled"}</span>
                                                                )}
                                                            </div>
                                                        </td>
                                                    </tr>
                                                );
                                            })}
                                        </tbody>
                                    </table>
                                </div>
                            ) : (
                                <div style={{ textAlign: "center", padding: 60, color: C.tl, background: C.white, borderRadius: 14, border: `1px solid ${C.brd}` }}>No subscriptions found for this filter.</div>
                            )}
                        </>}

                        {/* ===== GROUPS TAB ===== */}
                        {activeTab === "groups" && <>
                            <h2 style={{ fontFamily: "'Playfair Display', serif", fontSize: 22, marginBottom: 16, color: C.green }}>Groups</h2>
                            {groups.length > 0 ? (
                                <div style={{ overflowX: "auto", background: C.white, borderRadius: 14, border: `1px solid ${C.brd}` }}>
                                    <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 13 }}>
                                        <thead>
                                            <tr style={{ borderBottom: `1px solid ${C.brdL}` }}>
                                                {["Group ID", "Initiator", "Email", "Slots", "Status", "Created", "Link"].map(h => <th key={h} style={th}>{h}</th>)}
                                            </tr>
                                        </thead>
                                        <tbody>
                                            {groups.map(g => (
                                                <tr key={g.group_id} style={{ borderBottom: `1px solid ${C.brdL}` }}>
                                                    <td style={{ ...td, color: C.tm, fontFamily: "monospace", fontSize: 12 }}>#{g.group_id}</td>
                                                    <td style={{ ...td, fontWeight: 500 }}>{g.initiator_name}</td>
                                                    <td style={{ ...td, color: C.tl, fontSize: 12 }}>{g.initiator_email}</td>
                                                    <td style={td}>
                                                        <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                                                            <div style={{ width: 60, height: 6, borderRadius: 3, background: C.brdL, overflow: "hidden" }}>
                                                                <div style={{ width: `${(g.filled_slots / g.total_slots) * 100}%`, height: "100%", background: g.filled_slots >= g.total_slots ? C.green : C.gold, borderRadius: 3 }} />
                                                            </div>
                                                            <span style={{ fontSize: 12 }}>{g.filled_slots}/{g.total_slots}</span>
                                                        </div>
                                                    </td>
                                                    <td style={td}>{badge(g.status, g.status === "Complete" ? C.greenS : C.goldS, g.status === "Complete" ? C.green : C.gold)}</td>
                                                    <td style={{ ...td, color: C.tl, fontSize: 12 }}>{g.created_at ? new Date(g.created_at).toLocaleDateString("en-IN", { day: "numeric", month: "short" }) : "\u2014"}</td>
                                                    <td style={td}>
                                                        <button onClick={() => navigate(`/group/${g.slug}`)} style={{ background: "none", border: `1px solid ${C.brd}`, color: C.green, padding: "4px 10px", borderRadius: 4, fontSize: 11, cursor: "pointer", fontFamily: "inherit" }}>View</button>
                                                    </td>
                                                </tr>
                                            ))}
                                        </tbody>
                                    </table>
                                </div>
                            ) : (
                                <div style={{ textAlign: "center", padding: 60, color: C.tl, background: C.white, borderRadius: 14, border: `1px solid ${C.brd}` }}>No groups created yet.</div>
                            )}
                        </>}

                        {groups.length === 0 && contributions.length === 0 && activeTab === "overview" && <div style={{ textAlign: "center", padding: 60, color: C.tx }}>No data yet. Contributions and groups will appear here.</div>}

                        {/* ===== ACTIVITY LOG TAB ===== */}
                        {activeTab === "activity" && <>
                            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 20 }}>
                                <h2 style={{ fontFamily: "'Playfair Display', serif", fontSize: 22, color: C.green, margin: 0 }}>Webhook Activity Log</h2>
                                <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
                                    <input
                                        placeholder="Filter events..."
                                        value={eventFilter}
                                        onChange={e => setEventFilter(e.target.value)}
                                        style={{ padding: "6px 12px", background: C.bg, border: `1px solid ${C.brd}`, borderRadius: 6, color: C.td, fontSize: 12, fontFamily: "inherit", outline: "none", width: 180 }}
                                    />
                                    <button onClick={loadData} style={{ background: C.white, border: `1px solid ${C.brd}`, color: C.green, padding: "6px 12px", borderRadius: 6, fontSize: 11, cursor: "pointer", fontFamily: "inherit" }}>↻ Refresh</button>
                                </div>
                            </div>
                            <p style={{ color: C.tl, fontSize: 12, marginBottom: 16 }}>Auto-refreshes every 30 seconds • Showing last 100 events</p>
                            {webhookEvents.length > 0 ? (
                                <div style={{ background: C.white, borderRadius: 14, border: `1px solid ${C.brd}`, overflow: "hidden" }}>
                                    {webhookEvents
                                        .filter(e => !eventFilter || e.event_type.toLowerCase().includes(eventFilter.toLowerCase()))
                                        .map((ev, i) => {
                                            const evtColor = ev.event_type.includes("failed") || ev.event_type.includes("dispute") ? "#DC2626"
                                                : ev.event_type.includes("captured") || ev.event_type.includes("success") || ev.event_type.includes("charged") || ev.event_type.includes("processed") || ev.event_type.includes("paid") ? C.green
                                                    : ev.event_type.includes("refund") ? "#3B82F6"
                                                        : ev.event_type.includes("downtime") ? "#D97706"
                                                            : ev.event_type.includes("cancel") || ev.event_type.includes("halt") ? "#D97706"
                                                                : C.tl;
                                            const statusBg = ev.status === "processed" ? C.greenS : ev.status === "failed" ? "#FEE2E2" : "#F3F4F6";
                                            const statusColor = ev.status === "processed" ? C.green : ev.status === "failed" ? "#DC2626" : C.tl;
                                            const isExpanded = expandedEvent === ev.id;
                                            return (
                                                <div key={ev.id} style={{ borderBottom: `1px solid ${C.brdL}`, cursor: "pointer" }} onClick={() => setExpandedEvent(isExpanded ? null : ev.id)}>
                                                    <div style={{ display: "flex", alignItems: "center", gap: 12, padding: "14px 16px" }}>
                                                        <div style={{ width: 8, height: 8, borderRadius: "50%", background: evtColor, flexShrink: 0 }} />
                                                        <div style={{ flex: 1, minWidth: 0 }}>
                                                            <div style={{ fontFamily: "monospace", fontSize: 13, fontWeight: 600, color: evtColor }}>{ev.event_type}</div>
                                                            {ev.contribution_id && <span style={{ fontSize: 11, color: C.tl }}>Contribution #{ev.contribution_id}</span>}
                                                        </div>
                                                        <span style={{ padding: "3px 10px", borderRadius: 12, fontSize: 10, fontWeight: 500, background: statusBg, color: statusColor }}>{ev.status}</span>
                                                        <span style={{ fontSize: 11, color: C.tl, flexShrink: 0 }}>{ev.created_at ? new Date(ev.created_at).toLocaleString("en-IN", { day: "numeric", month: "short", hour: "2-digit", minute: "2-digit" }) : "—"}</span>
                                                        <span style={{ color: C.tl, fontSize: 14 }}>{isExpanded ? "▾" : "▸"}</span>
                                                    </div>
                                                    {isExpanded && (
                                                        <div style={{ padding: "0 16px 14px 36px" }}>
                                                            {ev.error_message && <div style={{ color: "#DC2626", fontSize: 12, marginBottom: 8, padding: "6px 10px", background: "#FEF2F2", borderRadius: 6 }}>Error: {ev.error_message}</div>}
                                                            <pre style={{ background: C.bg, border: `1px solid ${C.brdL}`, borderRadius: 8, padding: 12, fontSize: 11, color: C.tm, overflow: "auto", maxHeight: 200, margin: 0, whiteSpace: "pre-wrap", wordBreak: "break-all" }}>{JSON.stringify(ev.payload, null, 2)}</pre>
                                                        </div>
                                                    )}
                                                </div>
                                            );
                                        })}
                                </div>
                            ) : (
                                <div style={{ textAlign: "center", padding: 60, color: C.tl, background: C.white, borderRadius: 14, border: `1px solid ${C.brd}` }}>No webhook events recorded yet. Events will appear here once Razorpay sends webhooks.</div>
                            )}
                        </>}

                        {/* ===== CONTENT MANAGEMENT TAB ===== */}
                        {activeTab === "content" && <ContentEditor />}
                    </>
                )}
            </div>
        </div>
    );
}
