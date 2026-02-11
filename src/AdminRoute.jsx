import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { C, Heart, Users, Check, BookOpen, Back, GlobalStyles, backBtn } from "./shared.jsx";
import { getAllGroups, getAllContributions } from "./dataService.js";

export default function AdminRoute() {
    const navigate = useNavigate();
    const [groups, setGroups] = useState([]);
    const [contributions, setContributions] = useState([]);
    const [loading, setLoading] = useState(true);
    const [authenticated, setAuthenticated] = useState(() => sessionStorage.getItem("ilika_admin") === "true");
    const [loginForm, setLoginForm] = useState({ username: "", password: "" });
    const [loginError, setLoginError] = useState("");

    useEffect(() => {
        if (authenticated) loadData();
    }, [authenticated]);

    async function loadData() {
        try {
            const [g, c] = await Promise.all([getAllGroups(), getAllContributions()]);
            setGroups(g);
            setContributions(c);
        } catch (err) {
            console.error("Error loading admin data:", err);
        } finally {
            setLoading(false);
        }
    }

    const totalGirls = groups.filter(g => g.filled_slots >= g.total_slots).length + contributions.filter(c => c.type === "individual" && c.payment_status === "Success").length;
    const stats = [
        { l: "Girls Sponsored", v: totalGirls, c: C.green },
        { l: "Individual Sponsors", v: contributions.filter(c => c.type === "individual").length, c: C.gold },
        { l: "Group Sponsors", v: contributions.filter(c => c.type === "group").length, c: C.greenM },
        { l: "Incomplete Groups", v: groups.filter(g => g.filled_slots < g.total_slots).length, c: "#B5704F" },
    ];
    const th = { textAlign: "left", padding: "12px 16px", color: C.tl, fontWeight: 500, fontSize: 12, textTransform: "uppercase", letterSpacing: 1 };
    const td = { padding: "12px 16px" };
    const badge = (t, bg, c) => <span style={{ padding: "4px 12px", borderRadius: 20, fontSize: 12, fontWeight: 500, background: bg, color: c }}>{t}</span>;

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
    };

    const inp = { width: "100%", padding: "12px 16px", background: C.bg, border: `1px solid ${C.brd}`, borderRadius: 8, color: C.td, fontSize: 15, fontFamily: "inherit", outline: "none", boxSizing: "border-box" };

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

    return (
        <div style={{ minHeight: "100vh", background: C.bg, color: C.td, fontFamily: "'DM Sans', sans-serif" }}>
            <link href="https://fonts.googleapis.com/css2?family=Playfair+Display:ital,wght@0,400;0,500;0,600;0,700;1,400;1,500;1,600&family=DM+Sans:wght@300;400;500;600;700&display=swap" rel="stylesheet" />
            <GlobalStyles />
            <div style={{ maxWidth: 960, margin: "0 auto", padding: "40px 24px" }}>
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 32 }}>
                    <button onClick={() => navigate("/")} style={backBtn}><Back /> Back to Campaign</button>
                    <button onClick={handleLogout} style={{ background: "none", border: `1px solid ${C.brd}`, color: C.tl, padding: "6px 14px", borderRadius: 6, fontSize: 12, cursor: "pointer", fontFamily: "inherit" }}>Logout</button>
                </div>
                <h1 style={{ fontFamily: "'Playfair Display', serif", fontSize: 32, marginBottom: 8, color: C.green }}>Admin Dashboard</h1>
                <p style={{ color: C.tl, marginBottom: 40 }}>Campaign overview & tracking</p>

                {loading ? (
                    <div style={{ textAlign: "center", padding: 60, color: C.tl }}>Loading data...</div>
                ) : (
                    <>
                        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(200px, 1fr))", gap: 16, marginBottom: 48 }}>
                            {stats.map((s, i) => <div key={i} style={{ background: C.white, borderRadius: 12, padding: 24, border: `1px solid ${C.brd}`, boxShadow: "0 1px 4px rgba(0,0,0,0.04)" }}><div style={{ fontSize: 36, fontFamily: "'Playfair Display', serif", color: s.c, marginBottom: 4 }}>{s.v}</div><div style={{ fontSize: 12, color: C.tl, textTransform: "uppercase", letterSpacing: 1 }}>{s.l}</div></div>)}
                        </div>

                        {groups.length > 0 && <>
                            <h2 style={{ fontFamily: "'Playfair Display', serif", fontSize: 22, marginBottom: 16, color: C.green }}>Groups</h2>
                            <div style={{ overflowX: "auto", marginBottom: 40, background: C.white, borderRadius: 12, border: `1px solid ${C.brd}` }}>
                                <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 14 }}>
                                    <thead>
                                        <tr style={{ borderBottom: `1px solid ${C.brdL}` }}>
                                            {["Group ID", "Initiator", "Email", "Slots", "Status", "Link"].map(h => <th key={h} style={th}>{h}</th>)}
                                        </tr>
                                    </thead>
                                    <tbody>
                                        {groups.map(g => (
                                            <tr key={g.group_id} style={{ borderBottom: `1px solid ${C.brdL}` }}>
                                                <td style={{ ...td, color: C.tm }}>#{g.group_id}</td>
                                                <td style={{ ...td, fontWeight: 500 }}>{g.initiator_name}</td>
                                                <td style={{ ...td, color: C.tl }}>{g.initiator_email}</td>
                                                <td style={td}>{g.filled_slots}/{g.total_slots}</td>
                                                <td style={td}>{badge(g.status, g.status === "Complete" ? C.greenS : C.goldS, g.status === "Complete" ? C.green : C.gold)}</td>
                                                <td style={td}>
                                                    <button onClick={() => navigate(`/group/${g.slug}`)} style={{ background: "none", border: `1px solid ${C.brd}`, color: C.green, padding: "4px 10px", borderRadius: 4, fontSize: 11, cursor: "pointer", fontFamily: "inherit" }}>View</button>
                                                </td>
                                            </tr>
                                        ))}
                                    </tbody>
                                </table>
                            </div>
                        </>}

                        {contributions.length > 0 && <>
                            <h2 style={{ fontFamily: "'Playfair Display', serif", fontSize: 22, marginBottom: 16, color: C.green }}>Contributions</h2>
                            <div style={{ overflowX: "auto", background: C.white, borderRadius: 12, border: `1px solid ${C.brd}` }}>
                                <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 14 }}>
                                    <thead>
                                        <tr style={{ borderBottom: `1px solid ${C.brdL}` }}>
                                            {["Donor", "Email", "Type", "Amount", "Payment", "Group"].map(h => <th key={h} style={th}>{h}</th>)}
                                        </tr>
                                    </thead>
                                    <tbody>
                                        {contributions.map((c, i) => (
                                            <tr key={i} style={{ borderBottom: `1px solid ${C.brdL}` }}>
                                                <td style={{ ...td, fontWeight: 500 }}>{c.donor_name}</td>
                                                <td style={{ ...td, color: C.tl }}>{c.email}</td>
                                                <td style={td}>{badge(c.type, c.type === "individual" ? C.goldS : C.greenS, c.type === "individual" ? C.gold : C.green)}</td>
                                                <td style={td}>{c.amount ? `₹${c.amount.toLocaleString()}` : "—"}</td>
                                                <td style={td}><span style={{ color: c.payment_status === "Success" ? C.green : C.gold, fontWeight: 500 }}>{c.payment_status}</span></td>
                                                <td style={{ ...td, color: C.tl }}>{c.group_id ? `#${c.group_id}` : "\u2014"}</td>
                                            </tr>
                                        ))}
                                    </tbody>
                                </table>
                            </div>
                        </>}

                        {groups.length === 0 && contributions.length === 0 && <div style={{ textAlign: "center", padding: 60, color: C.tx }}>No data yet.</div>}
                    </>
                )}
            </div>
        </div>
    );
}
