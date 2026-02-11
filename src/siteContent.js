// Centralized site content store
// All mock/placeholder data lives here so admins can replace it via CSV upload
// Data is persisted to Supabase (table: site_content) and cached in localStorage

import { supabase, isSupabaseConfigured } from "./supabaseClient.js";

const STORAGE_KEY = "ilika_site_content";
const SUPABASE_TABLE = "site_content";

// ========== DEFAULT DATA (current mock values) ==========

const DEFAULTS = {
    // Campaign Progress
    campaign_raised: 1016000,
    campaign_goal: 1440000,
    campaign_supporters: 127,
    campaign_days_left: 25,
    campaign_end_date: "2026-03-08",
    campaign_end_label: "Campaign ends 8th March 2026",
    campaign_target_girls: 15,

    // Stats offsets (added to real DB counts)
    stats_total_sponsors_offset: 127,
    stats_girls_sponsored_offset: 15,
    stats_individual_count_offset: 42,
    stats_group_count_offset: 23,

    // Live Ticker Activities (JSON array)
    live_ticker: JSON.stringify([
        { name: "Priya S.", action: "sponsored a girl's education", time: "2 min ago", city: "Mumbai", amount: "₹8,000" },
        { name: "Rahul & 3 friends", action: "completed a group sponsorship", time: "8 min ago", city: "Delhi", amount: "₹8,000" },
        { name: "Sneha M.", action: "started a new group", time: "14 min ago", city: "Bangalore", amount: "₹2,000" },
        { name: "Arjun K.", action: "chose annual sponsorship", time: "19 min ago", city: "Pune", amount: "₹96,000" },
        { name: "Meera & friends", action: "completed a group sponsorship", time: "25 min ago", city: "Chennai", amount: "₹8,000" },
        { name: "A corporate team", action: "sponsored 3 girls", time: "31 min ago", city: "Hyderabad", amount: "₹24,000" },
    ]),

    // Recent Supporters (JSON array)
    recent_supporters: JSON.stringify([
        { name: "Anjali Mehta", amount: 8000, time: "12 min ago", type: "individual", city: "Mumbai" },
        { name: "Vikram + 3", amount: 2000, time: "28 min ago", type: "group", city: "Delhi" },
        { name: "Deepika R.", amount: 96000, time: "1 hour ago", type: "individual", city: "Bangalore", annual: true },
        { name: "Karthik S.", amount: 2000, time: "2 hours ago", type: "group", city: "Chennai" },
        { name: "Anonymous", amount: 8000, time: "3 hours ago", type: "individual", city: "Pune" },
        { name: "Riya + 3", amount: 2000, time: "4 hours ago", type: "group", city: "Hyderabad" },
        { name: "Sameer J.", amount: 8000, time: "5 hours ago", type: "individual", city: "Kolkata" },
    ]),

    // Testimonial
    testimonial_name: "Komal Gupta",
    testimonial_role: "Ilika Fellow",
    testimonial_quote: "My buddy has been deeply involved in guiding me, helping me discover my strengths, and providing me with the right direction.",
    testimonial_story: "Through Ilika's mentorship, Komal received internship opportunities and was encouraged to pursue real-world projects. She went from being unsure about her future to confidently pursuing her dream career.",
    testimonial_closing: "I feel proud and thankful to be a part of Ilika.",

    // Opportunity Gap Statistics (JSON array)
    opportunity_gap_stats: JSON.stringify([
        { num: "250M+", label: "youth population", sub: "India's largest untapped potential" },
        { num: "71%", label: "never reach college", sub: "Gross Enrollment Ratio: 28.4%" },
        { num: "₹8K", label: "/mo per girl", sub: "Education + mentorship + career" },
    ]),

    // Fellowship Pillars (JSON array)
    fellowship_pillars: JSON.stringify([
        { title: "Guided", desc: "Paired with a dedicated guide through every challenge and milestone of her undergraduate journey." },
        { title: "Nurtured", desc: "Beyond tuition — learning tools, life skills coaching, well-being support, and holistic development." },
        { title: "Connected", desc: "Lifelong access to mentors, experts, and industry leaders. Doors that talent alone cannot open." },
        { title: "Empowered", desc: "Career training, internships, and real-world exposure. She graduates ready to lead." },
    ]),

    // Impact Calculator (JSON array)
    impact_items: JSON.stringify([
        { amount: "8,000", period: "/month", impacts: ["1 girl's tuition fees", "A dedicated buddy mentor", "Learning tools & resources", "Life skills workshops"] },
        { amount: "96,000", period: "/year", impacts: ["1 girl's full-year fellowship", "End-to-end career support", "Internship placements", "Access to professional network"] },
    ]),

    // Founders (JSON array)
    founders: JSON.stringify([
        { name: "Akshay Lalchandani", role: "Co-founder & CEO", img: "https://static.wixstatic.com/media/e3859a_0039d3cb70cd479f8e1ee08da1ca3c66~mv2.jpg/v1/crop/x_77,y_130,w_1385,h_1309/fill/w_403,h_381,al_c,q_80,usm_0.66_1.00_0.01,enc_avif,quality_auto/IMG_3512_JPG.jpg", linkedin: "https://www.linkedin.com/in/akshay-lalchandani-6676b3147/" },
        { name: "Malay Shah", role: "Co-founder & CFO", img: "https://static.wixstatic.com/media/e3859a_2d6ab1fbf7f5407fac701951477e7cf7~mv2.jpg/v1/crop/x_0,y_22,w_1536,h_1453/fill/w_403,h_381,al_c,q_80,usm_0.66_1.00_0.01,enc_avif,quality_auto/IMG_3545_JPG.jpg", linkedin: "https://www.linkedin.com/in/malay-samir-shah/" },
        { name: "Anisha Patnaik", role: "Co-founder", img: "https://static.wixstatic.com/media/db90ba_5a1b1cc1de514e6db830bde94648446b~mv2.jpg/v1/crop/x_0,y_29,w_1080,h_1021/fill/w_403,h_381,al_c,q_80,usm_0.66_1.00_0.01,enc_avif,quality_auto/Anisha.jpg", linkedin: "https://www.linkedin.com/in/anishapatnaik/" },
    ]),

    // Top Donors Leaderboard (JSON array — no amounts shown)
    top_donors: JSON.stringify([
        { name: "Anjali Mehta", city: "Mumbai" },
        { name: "Vikram Sharma", city: "Delhi" },
        { name: "Deepika Raghavan", city: "Bangalore" },
        { name: "Karthik Subramanian", city: "Chennai" },
        { name: "Sameer Joshi", city: "Kolkata" },
    ]),

    // FAQ (JSON array)
    faq_items: JSON.stringify([
        { q: "Where does my money go?", a: "100% funds the Ilika Fellowship — tuition, mentorship, learning tools, career training, and network access for one girl. Ilika publishes audited financials annually." },
        { q: "Do I get a tax benefit?", a: "Yes. All donations qualify for 80G tax exemption. You'll receive your certificate immediately after payment. 50% of your donation is deductible from taxable income." },
        { q: "Can I cancel anytime?", a: "Yes. Your Razorpay subscription can be cancelled at any point. We hope you'll stay, but there's zero lock-in." },
        { q: "How is this different from other donation platforms?", a: "You're not just paying fees. You're funding an entire ecosystem — a personal mentor, career training, internships, professional networks. And every Fellow takes the Karmic Pledge to pay it forward." },
        { q: "How will I know my sponsorship is making a difference?", a: "You'll receive regular progress updates, milestone reports, and direct impact stories from the Fellow your sponsorship supports." },
    ]),

    // Hero text
    hero_tagline: "Women's Day Initiative 2026",
    hero_heading_1: "She has the talent.",
    hero_heading_2: "She has the dream.",
    hero_heading_3: "She just needs someone",
    hero_heading_4: "to believe in her.",
    hero_description: "For millions of girls in India, the dream of education isn't stopped by a lack of ambition — it's stopped by a lack of access. This Women's Day, you can change that for one girl, forever.",
    hero_image_url: "https://static.wixstatic.com/media/e3859a_09bd59c846ab436e91d393ae5718133b~mv2.jpeg/v1/fill/w_720,h_884,al_c,q_85,enc_avif,quality_auto/e3859a_09bd59c846ab436e91d393ae5718133b~mv2.jpeg",

    // Origin story
    origin_para_1: "At 17, three friends came together with a simple belief: if opportunity had reached us, it was our duty to extend it to those it hadn't.",
    origin_para_2: "What began as pooling their own pocket money to help one child get to school has grown into Ilika — an ecosystem where support is not charity, but justice. Today, Akshay, Malay, and Anisha stand beside young people from underserved communities, providing not just tuition fees, but mentorship, tools, networks, and the opportunities that talent alone cannot unlock.",
    origin_para_3: "Because when one child rises, the cycle of opportunity begins — and generational poverty starts to end.",

    // Karmic Pledge
    karmic_pledge_quote: "We don't pay gratitude back. We pay it forward — turning a stranger's kindness into someone else's chance.",
    karmic_pledge_sub: "Every Fellow pledges to support a future student. Your sponsorship starts a chain that never ends.",

    // Footer
    footer_tagline: "Adopt Her Future — Women's Day Initiative",
    footer_org: "© 2026 Twelve Ten Empowering Possibilities Foundation · Section 8 · 80G Registered",
};

// ========== RUNTIME STORE ==========

let _cache = null;

function getLocalOverrides() {
    try {
        const stored = localStorage.getItem(STORAGE_KEY);
        return stored ? JSON.parse(stored) : {};
    } catch { return {}; }
}

function saveLocalOverrides(overrides) {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(overrides));
}

// ========== PUBLIC API ==========

/** Get a single content value (checks overrides → falls back to default) */
export function getContent(key) {
    if (!_cache) _cache = { ...DEFAULTS, ...getLocalOverrides() };
    return _cache[key] ?? DEFAULTS[key];
}

/** Get a JSON content value as parsed object */
export function getContentJSON(key) {
    const val = getContent(key);
    if (typeof val === "string") {
        try { return JSON.parse(val); } catch { return val; }
    }
    return val;
}

/** Get all content (merged defaults + overrides) */
export function getAllContent() {
    if (!_cache) _cache = { ...DEFAULTS, ...getLocalOverrides() };
    return { ..._cache };
}

/** Get only the default values */
export function getDefaults() {
    return { ...DEFAULTS };
}

/** Invalidate in-memory cache so next getContent() re-reads from localStorage */
export function invalidateCache() {
    _cache = null;
}

/** Coerce a string value to its proper JS type based on the default type */
function coerceType(key, value) {
    const defaultVal = DEFAULTS[key];
    if (defaultVal === undefined) return value;
    if (typeof defaultVal === "number") {
        const n = Number(value);
        return isNaN(n) ? defaultVal : n;
    }
    return value;
}

/** Save overrides (used by admin upload) */
export async function saveContent(overrides) {
    // Merge with defaults and save to localStorage
    const merged = { ...DEFAULTS, ...overrides };
    saveLocalOverrides(merged);
    _cache = merged;

    // Batch persist to Supabase
    if (isSupabaseConfigured) {
        try {
            const rows = Object.entries(overrides).map(([key, value]) => ({
                key,
                value: typeof value === "object" ? JSON.stringify(value) : String(value),
            }));
            if (rows.length > 0) {
                const { error } = await supabase.from(SUPABASE_TABLE).upsert(rows, { onConflict: "key" });
                if (error) throw error;
            }
        } catch (err) {
            console.warn("[SiteContent] Failed to save to Supabase:", err.message);
            // localStorage was already saved, so data is not lost
        }
    }
}

/** Load content from Supabase (called once on app init) */
export async function loadContentFromDB() {
    if (!isSupabaseConfigured) return;
    try {
        const { data, error } = await supabase.from(SUPABASE_TABLE).select("key, value");
        if (error) throw error;
        if (data && data.length > 0) {
            const overrides = {};
            for (const row of data) {
                // Supabase stores everything as text — coerce back to proper types
                overrides[row.key] = coerceType(row.key, row.value);
            }
            saveLocalOverrides(overrides);
            _cache = { ...DEFAULTS, ...overrides };
        }
    } catch (err) {
        console.warn("[SiteContent] Failed to load from Supabase:", err.message);
        // Falls back to localStorage / defaults
    }
}

/** Reset to defaults */
export async function resetContent() {
    localStorage.removeItem(STORAGE_KEY);
    _cache = { ...DEFAULTS };
    if (isSupabaseConfigured) {
        try {
            const { error } = await supabase.from(SUPABASE_TABLE).delete().neq("key", "");
            if (error) throw error;
        } catch (err) {
            console.warn("[SiteContent] Failed to reset in Supabase:", err.message);
        }
    }
}

// ========== CSV TEMPLATE GENERATION ==========

/** Generate CSV template with all current values */
export function downloadTemplate() {
    const content = getAllContent();
    const rows = [["key", "value", "description"]];

    const descriptions = {
        campaign_raised: "Total amount raised in INR (number)",
        campaign_goal: "Fundraising goal in INR (number)",
        campaign_supporters: "Number of supporters shown (number)",
        campaign_days_left: "Days left shown in countdown (number)",
        campaign_end_date: "Campaign end date in YYYY-MM-DD format",
        campaign_end_label: "Label shown above countdown timer",
        stats_total_sponsors_offset: "Extra count added to total sponsors from DB",
        stats_girls_sponsored_offset: "Extra count added to girls sponsored from DB",
        stats_individual_count_offset: "Extra count added to individual sponsors from DB",
        stats_group_count_offset: "Extra count added to group count from DB",
        live_ticker: "JSON array: [{name, action, time, city, amount}]",
        recent_supporters: "JSON array: [{name, amount, time, type, city, annual?}]",
        testimonial_name: "Name of the person giving testimonial",
        testimonial_role: "Role/title of the testimonial person",
        testimonial_quote: "Main quote text",
        testimonial_story: "Expanded story paragraph",
        testimonial_closing: "Closing quote in green box",
        opportunity_gap_stats: "JSON array: [{num, label, sub}]",
        fellowship_pillars: "JSON array: [{title, desc}]",
        impact_items: "JSON array: [{amount, period, impacts:[]}]",
        founders: "JSON array: [{name, role, img}]",
        faq_items: "JSON array: [{q, a}]",
        hero_tagline: "Badge text above heading (e.g. Women's Day Initiative 2025)",
        hero_heading_1: "First line of hero heading",
        hero_heading_2: "Second line of hero heading",
        hero_heading_3: "Third line (italic, gold)",
        hero_heading_4: "Fourth line (italic, gold)",
        hero_description: "Paragraph below hero heading",
        hero_image_url: "URL for hero image",
        origin_para_1: "First paragraph of origin story (Playfair Display)",
        origin_para_2: "Second paragraph of origin story",
        origin_para_3: "Third paragraph (italic, closing)",
        karmic_pledge_quote: "Quote in the green Karmic Pledge box",
        karmic_pledge_sub: "Sub text below the pledge quote",
        footer_tagline: "Footer subtitle text",
        footer_org: "Footer organization copyright line",
    };

    for (const [key, value] of Object.entries(content)) {
        const val = typeof value === "object" ? JSON.stringify(value) : String(value);
        const desc = descriptions[key] || "";
        // Escape double quotes in CSV
        rows.push([key, `"${val.replace(/"/g, '""')}"`, desc]);
    }

    const csv = rows.map(r => r.join(",")).join("\n");
    const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `ilika-site-content-template.csv`;
    a.click();
    URL.revokeObjectURL(url);
}

/** Parse uploaded CSV and return overrides object */
export function parseCSV(text) {
    const lines = text.split("\n").filter(l => l.trim());
    if (lines.length < 2) throw new Error("CSV must have a header row and at least one data row");

    const overrides = {};
    // Skip header
    for (let i = 1; i < lines.length; i++) {
        const line = lines[i];
        // Parse CSV with quoted values
        const match = line.match(/^([^,]+),(".*"|[^,]*)/);
        if (!match) continue;

        const key = match[1].trim();
        let value = match[2].trim();

        // Remove surrounding quotes and unescape
        if (value.startsWith('"') && value.endsWith('"')) {
            value = value.slice(1, -1).replace(/""/g, '"');
        }

        // Only accept known keys
        if (key in DEFAULTS) {
            // Try to preserve number types
            const defaultVal = DEFAULTS[key];
            if (typeof defaultVal === "number") {
                const num = Number(value);
                overrides[key] = isNaN(num) ? value : num;
            } else {
                overrides[key] = value;
            }
        }
    }

    return overrides;
}
