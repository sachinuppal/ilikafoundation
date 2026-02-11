// CMS-style inline content editor for admin panel
// Sections with appropriate form fields, dynamic list editors, and save functionality

import { useState, useEffect } from "react";
import { C } from "./shared.jsx";
import { getAllContent, saveContent, resetContent, getDefaults, invalidateCache } from "./siteContent.js";

// ===== HELPER COMPONENTS =====

const inputStyle = {
    width: "100%", padding: "10px 14px", background: C.bg, border: `1px solid ${C.brd}`,
    borderRadius: 8, color: C.td, fontSize: 14, fontFamily: "inherit", outline: "none", boxSizing: "border-box",
};
const textareaStyle = { ...inputStyle, minHeight: 80, resize: "vertical", lineHeight: 1.6 };
const labelStyle = { display: "block", fontSize: 11, textTransform: "uppercase", letterSpacing: 1, color: C.tl, marginBottom: 6, fontWeight: 600 };
const smallLabel = { fontSize: 11, color: C.tx, marginTop: 4 };
const cardStyle = { background: C.white, borderRadius: 14, border: `1px solid ${C.brd}`, marginBottom: 12, overflow: "hidden" };
const sectionHeadStyle = {
    padding: "16px 20px", cursor: "pointer", display: "flex", justifyContent: "space-between", alignItems: "center",
    userSelect: "none", background: C.white, borderBottom: "none",
};

function Field({ label, hint, children }) {
    return (
        <div style={{ marginBottom: 18 }}>
            <label style={labelStyle}>{label}</label>
            {children}
            {hint && <div style={smallLabel}>{hint}</div>}
        </div>
    );
}

function TextInput({ value, onChange, placeholder, type = "text" }) {
    return <input type={type} value={value ?? ""} onChange={e => onChange(e.target.value)} placeholder={placeholder} style={inputStyle} />;
}

function NumberInput({ value, onChange, placeholder }) {
    return <input type="number" value={value ?? ""} onChange={e => onChange(e.target.value === "" ? "" : Number(e.target.value))} placeholder={placeholder} style={{ ...inputStyle, maxWidth: 200 }} />;
}

function TextArea({ value, onChange, placeholder, rows = 3 }) {
    return <textarea value={value ?? ""} onChange={e => onChange(e.target.value)} placeholder={placeholder} rows={rows} style={textareaStyle} />;
}

function UrlInput({ value, onChange, placeholder }) {
    return (
        <div>
            <input type="url" value={value ?? ""} onChange={e => onChange(e.target.value)} placeholder={placeholder} style={inputStyle} />
            {value && <img src={value} alt="preview" style={{ marginTop: 8, maxHeight: 80, borderRadius: 8, border: `1px solid ${C.brdL}` }} onError={e => e.target.style.display = "none"} />}
        </div>
    );
}

// Dynamic list item editor for JSON arrays
function ListEditor({ items, onChange, fields, itemLabel = "Item" }) {
    const update = (idx, key, val) => {
        const next = [...items];
        next[idx] = { ...next[idx], [key]: val };
        onChange(next);
    };
    const remove = (idx) => onChange(items.filter((_, i) => i !== idx));
    const add = () => {
        const blank = {};
        fields.forEach(f => { blank[f.key] = f.type === "list" ? [] : ""; });
        onChange([...items, blank]);
    };

    return (
        <div>
            {items.map((item, idx) => (
                <div key={idx} style={{ background: C.bg, borderRadius: 10, padding: "14px 16px", marginBottom: 8, border: `1px solid ${C.brdL}`, position: "relative" }}>
                    <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 10 }}>
                        <span style={{ fontSize: 12, fontWeight: 600, color: C.tm }}>{itemLabel} {idx + 1}</span>
                        <button onClick={() => remove(idx)} style={{ background: "none", border: "none", color: C.red, cursor: "pointer", fontSize: 16, fontWeight: 700, padding: "0 4px", lineHeight: 1 }} title="Remove">&times;</button>
                    </div>
                    <div style={{ display: "grid", gridTemplateColumns: fields.length <= 2 ? "1fr" : "1fr 1fr", gap: 10 }}>
                        {fields.map(f => (
                            <div key={f.key} style={f.type === "textarea" || f.type === "list" ? { gridColumn: "1 / -1" } : {}}>
                                <label style={{ ...labelStyle, fontSize: 10 }}>{f.label || f.key}</label>
                                {f.type === "textarea" ? (
                                    <TextArea value={item[f.key]} onChange={v => update(idx, f.key, v)} placeholder={f.placeholder} rows={2} />
                                ) : f.type === "number" ? (
                                    <NumberInput value={item[f.key]} onChange={v => update(idx, f.key, v)} placeholder={f.placeholder} />
                                ) : f.type === "url" ? (
                                    <UrlInput value={item[f.key]} onChange={v => update(idx, f.key, v)} placeholder={f.placeholder} />
                                ) : f.type === "list" ? (
                                    <SubListEditor items={item[f.key] || []} onChange={v => update(idx, f.key, v)} placeholder={f.placeholder} />
                                ) : (
                                    <TextInput value={item[f.key]} onChange={v => update(idx, f.key, v)} placeholder={f.placeholder} />
                                )}
                            </div>
                        ))}
                    </div>
                </div>
            ))}
            <button onClick={add} style={{ background: C.greenS, border: `1px dashed ${C.green}`, color: C.green, padding: "8px 16px", borderRadius: 8, fontSize: 12, fontWeight: 600, cursor: "pointer", fontFamily: "inherit", width: "100%" }}>+ Add {itemLabel}</button>
        </div>
    );
}

// Sub-list editor for nested arrays (e.g., impact items → impacts[])
function SubListEditor({ items, onChange, placeholder }) {
    const update = (idx, val) => { const next = [...items]; next[idx] = val; onChange(next); };
    const remove = (idx) => onChange(items.filter((_, i) => i !== idx));
    const add = () => onChange([...items, ""]);
    return (
        <div>
            {items.map((item, idx) => (
                <div key={idx} style={{ display: "flex", gap: 6, marginBottom: 4 }}>
                    <input value={item} onChange={e => update(idx, e.target.value)} placeholder={placeholder} style={{ ...inputStyle, padding: "6px 10px", fontSize: 12 }} />
                    <button onClick={() => remove(idx)} style={{ background: "none", border: "none", color: C.red, cursor: "pointer", fontSize: 14, fontWeight: 700, padding: "0 6px" }}>&times;</button>
                </div>
            ))}
            <button onClick={add} style={{ background: "none", border: `1px dashed ${C.brd}`, color: C.tl, padding: "4px 12px", borderRadius: 6, fontSize: 11, cursor: "pointer", fontFamily: "inherit" }}>+ Add item</button>
        </div>
    );
}

// Collapsible Section
function Section({ title, icon, color, open, onToggle, children }) {
    return (
        <div style={cardStyle}>
            <div style={sectionHeadStyle} onClick={onToggle}>
                <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                    <div style={{ width: 28, height: 28, borderRadius: 7, background: `${color}15`, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 14 }}>{icon}</div>
                    <span style={{ fontWeight: 600, fontSize: 15, color: C.td }}>{title}</span>
                </div>
                <span style={{ color: C.tl, fontSize: 16, transition: "transform 0.2s", transform: open ? "rotate(180deg)" : "rotate(0)" }}>▾</span>
            </div>
            {open && <div style={{ padding: "4px 20px 20px", borderTop: `1px solid ${C.brdL}` }}>{children}</div>}
        </div>
    );
}


// ===== MAIN EDITOR COMPONENT =====

export default function ContentEditor() {
    const [data, setData] = useState({});
    const [openSections, setOpenSections] = useState({});
    const [saving, setSaving] = useState(false);
    const [msg, setMsg] = useState("");
    const [dirty, setDirty] = useState(false);

    useEffect(() => {
        setData(getAllContent());
    }, []);

    const set = (key, val) => {
        setData(prev => ({ ...prev, [key]: val }));
        setDirty(true);
        setMsg("");
    };

    // For JSON fields stored as strings
    const getJSON = (key) => {
        const val = data[key];
        if (!val) return [];
        if (typeof val === "string") {
            try { return JSON.parse(val); } catch { return []; }
        }
        return val;
    };
    const setJSON = (key, arr) => {
        set(key, JSON.stringify(arr));
    };

    const toggle = (section) => {
        setOpenSections(prev => ({ ...prev, [section]: !prev[section] }));
    };

    const handleSave = async () => {
        setSaving(true);
        try {
            // Convert numbers back
            const toSave = { ...data };
            const defaults = getDefaults();
            for (const k of Object.keys(toSave)) {
                if (typeof defaults[k] === "number" && typeof toSave[k] === "string") {
                    const n = Number(toSave[k]);
                    if (!isNaN(n)) toSave[k] = n;
                }
            }
            await saveContent(toSave);
            setMsg("✓ Saved! Changes will appear on the campaign page on next reload.");
            setDirty(false);
        } catch (err) {
            setMsg(`✗ Save failed: ${err.message}`);
        } finally {
            setSaving(false);
        }
    };

    const handleReset = async () => {
        if (!confirm("Reset all content to defaults? This cannot be undone.")) return;
        try {
            await resetContent();
            invalidateCache();
            setData(getDefaults());
            setMsg("✓ Content reset to defaults. Reload the campaign page to see changes.");
            setDirty(false);
        } catch (err) {
            setMsg(`✗ Reset failed: ${err.message}`);
        }
    };

    return (
        <div>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 8 }}>
                <h2 style={{ fontFamily: "'Playfair Display', serif", fontSize: 22, color: C.green, margin: 0 }}>Site Content</h2>
                <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
                    {dirty && <span style={{ fontSize: 11, color: C.gold, fontWeight: 600 }}>● Unsaved changes</span>}
                    <button onClick={handleSave} disabled={saving || !dirty} style={{ background: dirty ? `linear-gradient(135deg,${C.green},${C.greenL})` : C.bg, color: dirty ? C.white : C.tl, border: dirty ? "none" : `1px solid ${C.brd}`, padding: "8px 20px", borderRadius: 8, fontSize: 13, fontWeight: 600, cursor: dirty ? "pointer" : "default", fontFamily: "inherit", opacity: saving ? 0.7 : 1 }}>{saving ? "Saving..." : "Save All"}</button>
                </div>
            </div>
            <p style={{ color: C.tl, fontSize: 13, marginBottom: 20, lineHeight: 1.6 }}>Edit any section below. Click <strong>Save All</strong> when done. Reload the campaign page to see changes.</p>

            {msg && (
                <div style={{ padding: "10px 16px", borderRadius: 8, marginBottom: 14, fontSize: 13, background: msg.startsWith("✗") ? "#FEF2F2" : C.greenS, color: msg.startsWith("✗") ? "#DC2626" : C.green, border: `1px solid ${msg.startsWith("✗") ? "#FECACA" : C.brd}` }}>{msg}</div>
            )}

            {/* ===== CAMPAIGN SETTINGS ===== */}
            <Section title="Campaign Settings" icon="📊" color={C.green} open={openSections.campaign} onToggle={() => toggle("campaign")}>
                <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 16 }}>
                    <Field label="Amount Raised (₹)" hint="Total amount shown as raised">
                        <NumberInput value={data.campaign_raised} onChange={v => set("campaign_raised", v)} />
                    </Field>
                    <Field label="Campaign Goal (₹)" hint="Target fundraising goal">
                        <NumberInput value={data.campaign_goal} onChange={v => set("campaign_goal", v)} />
                    </Field>
                    <Field label="Supporters Count" hint="Number shown in progress bar">
                        <NumberInput value={data.campaign_supporters} onChange={v => set("campaign_supporters", v)} />
                    </Field>
                    <Field label="Days Left" hint="Countdown days remaining">
                        <NumberInput value={data.campaign_days_left} onChange={v => set("campaign_days_left", v)} />
                    </Field>
                    <Field label="End Date" hint="Campaign end date shown on urgency banner">
                        <TextInput value={data.campaign_end_date} onChange={v => set("campaign_end_date", v)} placeholder="2025-03-08" />
                    </Field>
                    <Field label="End Date Label" hint="Text shown above countdown timer">
                        <TextInput value={data.campaign_end_label} onChange={v => set("campaign_end_label", v)} />
                    </Field>
                </div>
            </Section>

            {/* ===== STATS OFFSETS ===== */}
            <Section title="Stats Offsets" icon="📈" color={C.gold} open={openSections.stats} onToggle={() => toggle("stats")}>
                <p style={{ fontSize: 12, color: C.tl, marginBottom: 16, lineHeight: 1.5 }}>These numbers are added to the real database counts. Set them to the starting count you want before any real contributions come in.</p>
                <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 16 }}>
                    <Field label="Total Sponsors Offset">
                        <NumberInput value={data.stats_total_sponsors_offset} onChange={v => set("stats_total_sponsors_offset", v)} />
                    </Field>
                    <Field label="Girls Sponsored Offset">
                        <NumberInput value={data.stats_girls_sponsored_offset} onChange={v => set("stats_girls_sponsored_offset", v)} />
                    </Field>
                    <Field label="Individual Count Offset">
                        <NumberInput value={data.stats_individual_count_offset} onChange={v => set("stats_individual_count_offset", v)} />
                    </Field>
                    <Field label="Group Count Offset">
                        <NumberInput value={data.stats_group_count_offset} onChange={v => set("stats_group_count_offset", v)} />
                    </Field>
                </div>
            </Section>

            {/* ===== HERO SECTION ===== */}
            <Section title="Hero Section" icon="🏠" color="#6366F1" open={openSections.hero} onToggle={() => toggle("hero")}>
                <Field label="Tagline Badge" hint="Badge text above heading (e.g. Women's Day Initiative 2025)">
                    <TextInput value={data.hero_tagline} onChange={v => set("hero_tagline", v)} />
                </Field>
                <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
                    <Field label="Heading Line 1"><TextInput value={data.hero_heading_1} onChange={v => set("hero_heading_1", v)} /></Field>
                    <Field label="Heading Line 2"><TextInput value={data.hero_heading_2} onChange={v => set("hero_heading_2", v)} /></Field>
                    <Field label="Heading Line 3 (italic/gold)"><TextInput value={data.hero_heading_3} onChange={v => set("hero_heading_3", v)} /></Field>
                    <Field label="Heading Line 4 (italic/gold)"><TextInput value={data.hero_heading_4} onChange={v => set("hero_heading_4", v)} /></Field>
                </div>
                <Field label="Description" hint="Paragraph below the heading">
                    <TextArea value={data.hero_description} onChange={v => set("hero_description", v)} rows={3} />
                </Field>
                <Field label="Hero Image URL" hint="Main hero image on the right">
                    <UrlInput value={data.hero_image_url} onChange={v => set("hero_image_url", v)} placeholder="https://..." />
                </Field>
            </Section>

            {/* ===== ORIGIN STORY ===== */}
            <Section title="Origin Story" icon="📖" color={C.greenM} open={openSections.origin} onToggle={() => toggle("origin")}>
                <Field label="Paragraph 1 (Large, green)" hint="Opening quote-style paragraph in Playfair Display">
                    <TextArea value={data.origin_para_1} onChange={v => set("origin_para_1", v)} rows={3} />
                </Field>
                <Field label="Paragraph 2 (Main body)" hint="Detailed origin story text">
                    <TextArea value={data.origin_para_2} onChange={v => set("origin_para_2", v)} rows={4} />
                </Field>
                <Field label="Paragraph 3 (Italic closing)" hint="Italic closing statement">
                    <TextArea value={data.origin_para_3} onChange={v => set("origin_para_3", v)} rows={2} />
                </Field>
            </Section>

            {/* ===== FOUNDERS ===== */}
            <Section title="Founders" icon="👥" color="#8B5CF6" open={openSections.founders} onToggle={() => toggle("founders")}>
                <ListEditor
                    items={getJSON("founders")}
                    onChange={v => setJSON("founders", v)}
                    itemLabel="Founder"
                    fields={[
                        { key: "name", label: "Name", placeholder: "Full name" },
                        { key: "role", label: "Role", placeholder: "e.g. Co-founder & CEO" },
                        { key: "img", label: "Photo URL", type: "url", placeholder: "https://..." },
                    ]}
                />
            </Section>

            {/* ===== TESTIMONIAL ===== */}
            <Section title="Testimonial" icon="💬" color={C.gold} open={openSections.testimonial} onToggle={() => toggle("testimonial")}>
                <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
                    <Field label="Name"><TextInput value={data.testimonial_name} onChange={v => set("testimonial_name", v)} /></Field>
                    <Field label="Role / Title"><TextInput value={data.testimonial_role} onChange={v => set("testimonial_role", v)} /></Field>
                </div>
                <Field label="Main Quote" hint="The primary testimonial quote">
                    <TextArea value={data.testimonial_quote} onChange={v => set("testimonial_quote", v)} rows={2} />
                </Field>
                <Field label="Expanded Story" hint="Longer description paragraph">
                    <TextArea value={data.testimonial_story} onChange={v => set("testimonial_story", v)} rows={3} />
                </Field>
                <Field label="Closing Quote" hint="Short closing line in green box">
                    <TextInput value={data.testimonial_closing} onChange={v => set("testimonial_closing", v)} />
                </Field>
            </Section>

            {/* ===== KARMIC PLEDGE ===== */}
            <Section title="Karmic Pledge" icon="🤝" color={C.green} open={openSections.pledge} onToggle={() => toggle("pledge")}>
                <Field label="Pledge Quote" hint="Italic quote in the green banner">
                    <TextArea value={data.karmic_pledge_quote} onChange={v => set("karmic_pledge_quote", v)} rows={2} />
                </Field>
                <Field label="Sub Text" hint="Smaller text below the quote">
                    <TextInput value={data.karmic_pledge_sub} onChange={v => set("karmic_pledge_sub", v)} />
                </Field>
            </Section>

            {/* ===== LIVE TICKER ===== */}
            <Section title="Live Ticker Activities" icon="🔴" color="#EF4444" open={openSections.ticker} onToggle={() => toggle("ticker")}>
                <p style={{ fontSize: 12, color: C.tl, marginBottom: 12, lineHeight: 1.5 }}>These entries rotate in the ticker at the top of the page showing recent activity.</p>
                <ListEditor
                    items={getJSON("live_ticker")}
                    onChange={v => setJSON("live_ticker", v)}
                    itemLabel="Activity"
                    fields={[
                        { key: "name", label: "Name", placeholder: "e.g. Priya S." },
                        { key: "action", label: "Action", placeholder: "e.g. sponsored a girl's education" },
                        { key: "city", label: "City", placeholder: "e.g. Mumbai" },
                        { key: "time", label: "Time Ago", placeholder: "e.g. 2 min ago" },
                        { key: "amount", label: "Amount", placeholder: "e.g. ₹8,000" },
                    ]}
                />
            </Section>

            {/* ===== RECENT SUPPORTERS ===== */}
            <Section title="Recent Supporters" icon="❤️" color="#EC4899" open={openSections.supporters} onToggle={() => toggle("supporters")}>
                <p style={{ fontSize: 12, color: C.tl, marginBottom: 12, lineHeight: 1.5 }}>Shown in the "Recent Sponsors" feed on the campaign page.</p>
                <ListEditor
                    items={getJSON("recent_supporters")}
                    onChange={v => setJSON("recent_supporters", v)}
                    itemLabel="Supporter"
                    fields={[
                        { key: "name", label: "Name", placeholder: "e.g. Anjali Mehta" },
                        { key: "amount", label: "Amount (₹)", type: "number", placeholder: "8000" },
                        { key: "time", label: "Time Ago", placeholder: "e.g. 12 min ago" },
                        { key: "type", label: "Type", placeholder: "individual or group" },
                        { key: "city", label: "City", placeholder: "e.g. Mumbai" },
                    ]}
                />
            </Section>

            {/* ===== OPPORTUNITY GAP STATS ===== */}
            <Section title="Opportunity Gap Statistics" icon="📉" color="#0EA5E9" open={openSections.gap} onToggle={() => toggle("gap")}>
                <p style={{ fontSize: 12, color: C.tl, marginBottom: 12, lineHeight: 1.5 }}>Four stat cards shown in "The Opportunity Gap" section.</p>
                <ListEditor
                    items={getJSON("opportunity_gap_stats")}
                    onChange={v => setJSON("opportunity_gap_stats", v)}
                    itemLabel="Stat"
                    fields={[
                        { key: "num", label: "Number", placeholder: "e.g. 250M+" },
                        { key: "label", label: "Label", placeholder: "e.g. youth population" },
                        { key: "sub", label: "Sub Text", placeholder: "e.g. India's largest untapped potential" },
                    ]}
                />
            </Section>

            {/* ===== FELLOWSHIP PILLARS ===== */}
            <Section title="Fellowship Pillars" icon="🏛️" color="#8B5CF6" open={openSections.pillars} onToggle={() => toggle("pillars")}>
                <p style={{ fontSize: 12, color: C.tl, marginBottom: 12, lineHeight: 1.5 }}>Four pillar cards shown under "The Ilika Fellowship" section. Icons are assigned automatically.</p>
                <ListEditor
                    items={getJSON("fellowship_pillars")}
                    onChange={v => setJSON("fellowship_pillars", v)}
                    itemLabel="Pillar"
                    fields={[
                        { key: "title", label: "Title", placeholder: "e.g. Guided" },
                        { key: "desc", label: "Description", type: "textarea", placeholder: "Describe what this pillar covers..." },
                    ]}
                />
            </Section>

            {/* ===== IMPACT CALCULATOR ===== */}
            <Section title="Impact Calculator" icon="💡" color="#F59E0B" open={openSections.impact} onToggle={() => toggle("impact")}>
                <p style={{ fontSize: 12, color: C.tl, marginBottom: 12, lineHeight: 1.5 }}>Tab-selectable cards showing what each amount covers.</p>
                <ListEditor
                    items={getJSON("impact_items")}
                    onChange={v => setJSON("impact_items", v)}
                    itemLabel="Plan"
                    fields={[
                        { key: "amount", label: "Amount", placeholder: "e.g. 8,000" },
                        { key: "period", label: "Period", placeholder: "e.g. /month" },
                        { key: "impacts", label: "Impact Items", type: "list", placeholder: "e.g. 1 girl's tuition fees" },
                    ]}
                />
            </Section>

            {/* ===== FAQ ===== */}
            <Section title="FAQ / Common Questions" icon="❓" color="#6366F1" open={openSections.faq} onToggle={() => toggle("faq")}>
                <ListEditor
                    items={getJSON("faq_items")}
                    onChange={v => setJSON("faq_items", v)}
                    itemLabel="Question"
                    fields={[
                        { key: "q", label: "Question", placeholder: "Where does my money go?" },
                        { key: "a", label: "Answer", type: "textarea", placeholder: "100% funds the Ilika Fellowship..." },
                    ]}
                />
            </Section>

            {/* ===== FOOTER ===== */}
            <Section title="Footer" icon="📄" color={C.tl} open={openSections.footer} onToggle={() => toggle("footer")}>
                <Field label="Tagline" hint="Shown below 'ilika' logo">
                    <TextInput value={data.footer_tagline} onChange={v => set("footer_tagline", v)} />
                </Field>
                <Field label="Organization Line" hint="Copyright / registration line">
                    <TextInput value={data.footer_org} onChange={v => set("footer_org", v)} />
                </Field>
            </Section>

            {/* ===== BOTTOM ACTIONS ===== */}
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginTop: 20, padding: "16px 0", borderTop: `1px solid ${C.brd}` }}>
                <button onClick={handleReset} style={{ background: C.redS, border: `1px solid #FECACA`, color: C.red, padding: "8px 20px", borderRadius: 8, fontSize: 12, fontWeight: 600, cursor: "pointer", fontFamily: "inherit" }}>⟲ Reset All to Defaults</button>
                <button onClick={handleSave} disabled={saving || !dirty} style={{ background: dirty ? `linear-gradient(135deg,${C.green},${C.greenL})` : C.bg, color: dirty ? C.white : C.tl, border: dirty ? "none" : `1px solid ${C.brd}`, padding: "10px 28px", borderRadius: 8, fontSize: 14, fontWeight: 600, cursor: dirty ? "pointer" : "default", fontFamily: "inherit", opacity: saving ? 0.7 : 1 }}>{saving ? "Saving..." : "Save All Changes"}</button>
            </div>
        </div>
    );
}
