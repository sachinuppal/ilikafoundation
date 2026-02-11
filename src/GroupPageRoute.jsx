import { useState, useEffect } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { C, Check, Users, Share, Arrow, Back, Clock, Facepile, GlobalStyles, inp, lbl, backBtn } from "./shared.jsx";
import { getGroupBySlug, joinGroup } from "./dataService.js";

export default function GroupPageRoute() {
    const { slug } = useParams();
    const navigate = useNavigate();
    const [group, setGroup] = useState(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);
    const [showForm, setShowForm] = useState(false);
    const [form, setForm] = useState({ name: "", email: "", phone: "" });
    const [submitted, setSubmitted] = useState(false);

    useEffect(() => {
        loadGroup();
    }, [slug]);

    async function loadGroup() {
        try {
            setLoading(true);
            const g = await getGroupBySlug(slug);
            if (!g) {
                setError("Group not found");
            } else {
                setGroup(g);
            }
        } catch (err) {
            setError(err.message);
        } finally {
            setLoading(false);
        }
    }

    const handleJoin = async () => {
        if (!form.name || !form.email || !form.phone) return;
        try {
            const updated = await joinGroup(group.group_id, form);
            setGroup(updated);
            setSubmitted(true);
            setShowForm(false);
        } catch (err) {
            alert("Error joining group: " + err.message);
        }
    };

    if (loading) return (
        <div style={{ minHeight: "100vh", background: C.bg, display: "flex", alignItems: "center", justifyContent: "center", fontFamily: "'DM Sans', sans-serif" }}>
            <div style={{ textAlign: "center", color: C.tl }}>
                <div style={{ fontSize: 24, fontFamily: "'Playfair Display', serif", color: C.green, marginBottom: 8 }}>ilika</div>
                Loading...
            </div>
        </div>
    );

    if (error) return (
        <div style={{ minHeight: "100vh", background: C.bg, display: "flex", alignItems: "center", justifyContent: "center", fontFamily: "'DM Sans', sans-serif" }}>
            <div style={{ textAlign: "center" }}>
                <div style={{ fontSize: 24, fontFamily: "'Playfair Display', serif", color: C.green, marginBottom: 16 }}>ilika</div>
                <p style={{ color: C.td, marginBottom: 16 }}>{error}</p>
                <button onClick={() => navigate("/")} style={{ background: C.green, color: C.white, border: "none", padding: "12px 28px", borderRadius: 8, cursor: "pointer", fontFamily: "inherit", fontWeight: 600 }}>Go to Campaign</button>
            </div>
        </div>
    );

    const done = group.filled_slots >= group.total_slots;
    const left = group.total_slots - group.filled_slots;

    return (
        <div style={{ minHeight: "100vh", background: C.bg, color: C.td, fontFamily: "'DM Sans', sans-serif" }}>
            <link href="https://fonts.googleapis.com/css2?family=Playfair+Display:ital,wght@0,400;0,500;0,600;0,700;1,400;1,500;1,600&family=DM+Sans:wght@300;400;500;600;700&display=swap" rel="stylesheet" />
            <GlobalStyles />
            <div style={{ position: "fixed", top: 0, left: 0, right: 0, height: 350, background: `linear-gradient(180deg, ${C.green}0A 0%, transparent 100%)`, pointerEvents: "none" }} />
            <div style={{ maxWidth: 600, margin: "0 auto", padding: "40px 24px", position: "relative" }}>
                <button onClick={() => navigate("/")} style={{ ...backBtn, marginBottom: 40 }}><Back /> Back to Campaign</button>
                <div style={{ textAlign: "center", marginBottom: 48 }}>
                    <div style={{ display: "inline-flex", alignItems: "center", gap: 8, padding: "6px 16px", borderRadius: 24, background: C.greenS, marginBottom: 24, fontSize: 13, color: C.green, fontWeight: 500 }}><Users s={14} /> Group Campaign</div>
                    <h1 style={{ fontFamily: "'Playfair Display', serif", fontSize: 28, lineHeight: 1.3, marginBottom: 12, color: C.green }}><span style={{ color: C.gold }}>{group.initiator_name}</span> is inviting you to sponsor a girl's education this Women's Day</h1>
                    <p style={{ color: C.tl, fontSize: 15, lineHeight: 1.7 }}>Join this group of 4 to collectively support one girl's complete fellowship — mentorship, skill-building, and career support.</p>
                </div>
                {/* Progress */}
                <div style={{ background: C.white, borderRadius: 16, padding: 28, border: `1px solid ${C.brd}`, marginBottom: 24, boxShadow: "0 2px 8px rgba(0,0,0,0.04)" }}>
                    <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 16 }}>
                        <span style={{ fontSize: 13, textTransform: "uppercase", letterSpacing: 1.5, color: C.tl }}>Group Progress</span>
                        <span style={{ fontSize: 14, color: done ? C.green : C.gold, fontWeight: 600 }}>{group.filled_slots} of {group.total_slots} sponsors</span>
                    </div>
                    <div style={{ display: "flex", gap: 8, marginBottom: 16 }}>
                        {Array.from({ length: group.total_slots }).map((_, i) => <div key={i} style={{ flex: 1, height: 44, borderRadius: 10, background: i < group.filled_slots ? `linear-gradient(135deg,${C.green},${C.greenL})` : C.bg2, border: i < group.filled_slots ? "none" : `2px dashed ${C.brd}`, display: "flex", alignItems: "center", justifyContent: "center", transition: "all 0.5s ease", color: C.white }}>{i < group.filled_slots && <Check s={16} />}</div>)}
                    </div>
                    <div style={{ display: "flex", justifyContent: "space-between", fontSize: 13, color: C.tx }}><span>{"\u20B9"}{(group.filled_slots * 2000).toLocaleString()}</span><span>{"\u20B9"}{(group.total_slots * 2000).toLocaleString()} monthly goal</span></div>
                </div>
                {/* Urgency micro-copy */}
                {!done && <div style={{ display: "flex", alignItems: "center", justifyContent: "center", gap: 8, padding: "10px 16px", marginBottom: 12, borderRadius: 10, background: C.redS, color: C.red, fontSize: 13, fontWeight: 500 }}><Clock s={14} /> Only {left} spot{left !== 1 ? "s" : ""} remaining — join before it fills up!</div>}
                {/* Micro social proof */}
                {!done && <div style={{ textAlign: "center", marginBottom: 24 }}><Facepile count={5} size={28} label="5 people are viewing this group right now" /></div>}
                {done ? (
                    <div style={{ textAlign: "center" }}><div style={{ background: C.greenS, border: `1px solid ${C.green}22`, borderRadius: 16, padding: 32, marginBottom: 24 }}><div style={{ fontSize: 40, marginBottom: 12 }}>🎉</div><h3 style={{ fontFamily: "'Playfair Display', serif", fontSize: 22, marginBottom: 8, color: C.green }}>Fully Sponsored!</h3><p style={{ color: C.tm, fontSize: 14, lineHeight: 1.6 }}>This girl's education is now fully supported. Thank you!</p></div><button onClick={() => navigate("/")} style={{ background: "transparent", border: `2px solid ${C.green}`, color: C.green, padding: "14px 32px", borderRadius: 8, fontSize: 15, cursor: "pointer", fontFamily: "inherit", fontWeight: 600 }}>Start Another Group</button></div>
                ) : submitted ? (
                    <div style={{ textAlign: "center", background: C.greenS, border: `1px solid ${C.green}22`, borderRadius: 16, padding: 32 }}><div style={{ color: C.green }}><Check s={32} /></div><h3 style={{ fontFamily: "'Playfair Display', serif", fontSize: 20, margin: "12px 0 8px", color: C.green }}>You're In!</h3><p style={{ color: C.tm, fontSize: 14 }}>Redirecting to Razorpay for {"\u20B9"}2,000/month subscription...</p></div>
                ) : !showForm ? (
                    <div style={{ textAlign: "center" }}><button onClick={() => setShowForm(true)} style={{ background: `linear-gradient(135deg,${C.green},${C.greenL})`, color: C.white, border: "none", padding: "16px 48px", borderRadius: 8, fontSize: 16, fontWeight: 600, cursor: "pointer", fontFamily: "inherit", boxShadow: `0 4px 24px ${C.green}33`, display: "inline-flex", alignItems: "center", gap: 10 }}>Join This Group <Arrow /></button><p style={{ marginTop: 8, fontSize: 13, color: C.tx }}>{"\u20B9"}2,000/month {"\u00B7"} Only {left} spot{left !== 1 ? "s" : ""} left</p><p style={{ marginTop: 4, fontSize: 11, color: C.tl }}>Secure payment via Razorpay {"\u00B7"} 80G tax exempt {"\u00B7"} Cancel anytime</p></div>
                ) : (
                    <div style={{ background: C.white, borderRadius: 16, padding: 28, border: `1px solid ${C.brd}`, boxShadow: "0 2px 8px rgba(0,0,0,0.04)" }}><h3 style={{ fontFamily: "'Playfair Display', serif", fontSize: 18, marginBottom: 4, color: C.green }}>Join this group</h3><p style={{ color: C.tl, fontSize: 12, marginBottom: 20 }}>Takes less than 60 seconds</p>{["name", "email", "phone"].map(f => <div key={f} style={{ marginBottom: 16 }}><label style={lbl}>{f}</label><input type={f === "email" ? "email" : f === "phone" ? "tel" : "text"} value={form[f]} onChange={e => setForm({ ...form, [f]: e.target.value })} style={inp} placeholder={f === "name" ? "Your full name" : f === "email" ? "you@email.com" : "+91 XXXXX XXXXX"} /></div>)}<button onClick={handleJoin} style={{ width: "100%", background: `linear-gradient(135deg,${C.green},${C.greenL})`, color: C.white, border: "none", padding: "14px", borderRadius: 8, fontSize: 15, fontWeight: 600, cursor: "pointer", fontFamily: "inherit", marginTop: 8 }}>Confirm & Proceed to Payment</button><p style={{ textAlign: "center", fontSize: 11, color: C.tl, marginTop: 10 }}>Secure Razorpay {"\u00B7"} 80G tax receipt {"\u00B7"} Cancel anytime</p></div>
                )}
                {!done && !submitted && <div style={{ marginTop: 24, textAlign: "center" }}><button onClick={() => { const t = `I'm sponsoring a girl's education this Women's Day through Ilika. Join my group — only ${left} spot${left !== 1 ? "s" : ""} left!\n${window.location.href}`; if (navigator.share) navigator.share({ text: t }); else navigator.clipboard?.writeText(t); }} style={{ background: "none", border: `1px solid ${C.brd}`, color: C.tm, padding: "10px 20px", borderRadius: 8, fontSize: 13, cursor: "pointer", fontFamily: "inherit", display: "inline-flex", alignItems: "center", gap: 8 }}><Share /> Share via WhatsApp or copy link</button></div>}
            </div>
        </div>
    );
}
