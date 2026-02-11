// Data service layer — uses Supabase when configured, falls back to in-memory
import { supabase, isSupabaseConfigured } from './supabaseClient.js';

// ===== IN-MEMORY FALLBACK STORE =====
let memGroups = [];
let memContribs = [];

// ===== GROUPS =====
export async function createGroup({ name, email, phone }) {
    const group_id = Math.floor(1000 + Math.random() * 9000);
    const slug = `${name.toLowerCase().replace(/[^a-z0-9]/g, "-").replace(/-+/g, "-").replace(/^-|-$/g, "")}-fundraiser-${group_id}`;

    const groupData = {
        group_id,
        slug,
        initiator_name: name,
        initiator_email: email,
        initiator_phone: phone,
        total_slots: 4,
        filled_slots: 1,
        status: "Open",
        created_at: new Date().toISOString(),
    };

    if (isSupabaseConfigured) {
        const { data, error } = await supabase.from("groups").insert(groupData).select().single();
        if (error) throw error;
        // Also insert the initiator's contribution
        await supabase.from("contributions").insert({
            group_id: data.group_id,
            donor_name: name,
            email,
            phone,
            type: "group",
            payment_status: "Pending",
            amount: 2000,
        });
        return data;
    } else {
        memGroups.push(groupData);
        memContribs.push({
            group_id,
            donor_name: name,
            email,
            phone,
            type: "group",
            payment_status: "Success",
            razorpay_subscription_id: `sub_${Date.now()}`,
            created_at: new Date().toISOString(),
        });
        return groupData;
    }
}

export async function getGroupBySlug(slug) {
    if (isSupabaseConfigured) {
        const { data, error } = await supabase.from("groups").select("*").eq("slug", slug).single();
        if (error) throw error;
        return data;
    } else {
        return memGroups.find(g => g.slug === slug) || null;
    }
}

export async function joinGroup(group_id, { name, email, phone }) {
    if (isSupabaseConfigured) {
        // Insert contribution
        await supabase.from("contributions").insert({
            group_id,
            donor_name: name,
            email,
            phone,
            type: "group",
            payment_status: "Pending",
            amount: 2000,
        });
        // Increment filled_slots
        const { data: group } = await supabase.from("groups").select("*").eq("group_id", group_id).single();
        const newFilled = (group.filled_slots || 0) + 1;
        const newStatus = newFilled >= group.total_slots ? "Complete" : "Open";
        const { data, error } = await supabase
            .from("groups")
            .update({ filled_slots: newFilled, status: newStatus })
            .eq("group_id", group_id)
            .select()
            .single();
        if (error) throw error;
        return data;
    } else {
        memGroups = memGroups.map(g =>
            g.group_id === group_id
                ? { ...g, filled_slots: g.filled_slots + 1, status: g.filled_slots + 1 >= g.total_slots ? "Complete" : "Open" }
                : g
        );
        memContribs.push({
            group_id,
            donor_name: name,
            email,
            phone,
            type: "group",
            payment_status: "Success",
            razorpay_subscription_id: `sub_${Date.now()}`,
            created_at: new Date().toISOString(),
        });
        return memGroups.find(g => g.group_id === group_id);
    }
}

/** Revert a group join when payment fails/cancels */
export async function unjoinGroup(group_id, email) {
    if (isSupabaseConfigured) {
        // Delete the pending contribution
        await supabase
            .from("contributions")
            .delete()
            .eq("group_id", group_id)
            .eq("email", email)
            .eq("payment_status", "Pending");
        // Decrement filled_slots
        const { data: group } = await supabase.from("groups").select("*").eq("group_id", group_id).single();
        if (group && group.filled_slots > 0) {
            await supabase
                .from("groups")
                .update({ filled_slots: group.filled_slots - 1, status: "Open" })
                .eq("group_id", group_id);
        }
    } else {
        memContribs = memContribs.filter(c => !(c.group_id === group_id && c.email === email && c.payment_status === "Pending"));
        memGroups = memGroups.map(g =>
            g.group_id === group_id ? { ...g, filled_slots: Math.max(0, g.filled_slots - 1), status: "Open" } : g
        );
    }
}

/** Cancel a contribution when payment is dismissed/cancelled */
export async function cancelContribution(contributionId) {
    if (isSupabaseConfigured) {
        await supabase
            .from("contributions")
            .update({ payment_status: "Cancelled" })
            .eq("id", contributionId)
            .eq("payment_status", "Pending");
    } else {
        memContribs = memContribs.map(c =>
            c.id === contributionId && c.payment_status === "Pending"
                ? { ...c, payment_status: "Cancelled" }
                : c
        );
    }
}

// ===== INDIVIDUAL CONTRIBUTIONS =====

/** Generate a short referral code from the donor name, e.g. "sachin-uppal-x3k7" */
function generateReferralCode(name) {
    const slug = name.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "").slice(0, 20);
    const rand = Math.random().toString(36).slice(2, 6);
    return `${slug}-${rand}`;
}

export async function createIndividualContribution({ name, email, phone, company, payment, referredBy, panNumber, donorType }) {
    const referralCode = generateReferralCode(name);
    const contribData = {
        donor_name: name,
        email,
        phone,
        company: company || null,
        type: "individual",
        payment_preference: payment,
        payment_status: "Pending",
        amount: payment === "annual" ? 96000 : 8000,
        referral_code: referralCode,
        referred_by: referredBy || null,
        pan_number: panNumber || null,
        donor_type: donorType || "individual",
    };

    if (isSupabaseConfigured) {
        const { data, error } = await supabase.from("contributions").insert(contribData).select().single();
        if (error) throw error;
        return data;
    } else {
        const entry = {
            ...contribData,
            id: Date.now(),
            payment_status: "Success",
            razorpay_subscription_id: `sub_${Date.now()}`,
            created_at: new Date().toISOString(),
        };
        memContribs.push(entry);
        return entry;
    }
}

// ===== MANUAL OFFLINE PAYMENT =====
export async function createManualContribution({ name, email, phone, company, amount, panNumber, donorType, paymentMethod, notes }) {
    const contribData = {
        donor_name: name,
        email,
        phone,
        company: company || null,
        type: "individual",
        payment_preference: "one-time",
        payment_status: "Success",
        amount: Number(amount),
        referral_code: null,
        referred_by: null,
        pan_number: panNumber || null,
        donor_type: donorType || "individual",
        payment_method: paymentMethod || "offline",
        notes: notes || null,
        razorpay_payment_id: `MANUAL_${Date.now()}`,
    };

    if (isSupabaseConfigured) {
        const { data, error } = await supabase.from("contributions").insert(contribData).select().single();
        if (error) {
            // Retry without optional new columns if they don't exist in DB yet
            const { payment_method, notes, ...coreData } = contribData;
            const { data: d2, error: e2 } = await supabase.from("contributions").insert(coreData).select().single();
            if (e2) throw e2;
            return { ...d2, payment_method, notes };
        }
        return data;
    } else {
        const entry = {
            ...contribData,
            id: Date.now(),
            created_at: new Date().toISOString(),
        };
        memContribs.push(entry);
        return entry;
    }
}

export async function getReferralStats() {
    if (!isSupabaseConfigured) return [];
    const { data, error } = await supabase
        .from("contributions")
        .select("referral_code, donor_name, email, referred_by, amount")
        .eq("payment_status", "Success")
        .not("referral_code", "is", null);
    if (error) throw error;

    // Build a map: referral_code → { name, email, conversions, fundingRaised }
    const refMap = {};
    for (const d of data) {
        if (d.referral_code && !refMap[d.referral_code]) {
            refMap[d.referral_code] = { name: d.donor_name, email: d.email, code: d.referral_code, conversions: 0, fundingRaised: 0 };
        }
    }
    // Count conversions and sum funding raised by referred donors
    for (const d of data) {
        if (d.referred_by && refMap[d.referred_by]) {
            refMap[d.referred_by].conversions++;
            refMap[d.referred_by].fundingRaised += d.amount || 0;
        }
    }
    return Object.values(refMap).sort((a, b) => b.conversions - a.conversions || b.fundingRaised - a.fundingRaised);
}

// ===== ADMIN DATA =====
export async function getAllGroups() {
    if (isSupabaseConfigured) {
        const { data, error } = await supabase.from("groups").select("*").order("created_at", { ascending: false });
        if (error) throw error;
        return data;
    } else {
        return [...memGroups];
    }
}

export async function getAllContributions() {
    if (isSupabaseConfigured) {
        const { data, error } = await supabase.from("contributions").select("*").order("created_at", { ascending: false });
        if (error) throw error;
        return data;
    } else {
        return [...memContribs];
    }
}

// ===== LIVE TICKER DATA (from real contributions) =====
export async function getRecentTickerData() {
    if (!isSupabaseConfigured) return [];
    try {
        const { data, error } = await supabase
            .from("contributions")
            .select("donor_name, type, payment_preference, amount, created_at, payment_status")
            .eq("payment_status", "Success")
            .order("created_at", { ascending: false })
            .limit(10);
        if (error || !data || data.length === 0) return [];

        return data.map(c => {
            const firstName = (c.donor_name || "Someone").split(" ")[0];
            const isGroup = c.type === "group";
            const isAnnual = c.payment_preference === "annual";
            const action = isGroup
                ? "joined a group sponsorship"
                : isAnnual ? "chose annual sponsorship" : "sponsored a girl's education";
            const amount = `₹${(c.amount || 0).toLocaleString("en-IN")}`;

            // Relative time
            const diffMs = Date.now() - new Date(c.created_at).getTime();
            const diffMin = Math.floor(diffMs / 60000);
            const time = diffMin < 1 ? "just now"
                : diffMin < 60 ? `${diffMin} min ago`
                    : diffMin < 1440 ? `${Math.floor(diffMin / 60)} hr ago`
                        : `${Math.floor(diffMin / 1440)} day${Math.floor(diffMin / 1440) > 1 ? "s" : ""} ago`;

            return { name: `${firstName}${isGroup ? " & friends" : ""}`, action, time, city: "", amount };
        });
    } catch (e) {
        console.warn("[Ticker] Failed to load real data:", e.message);
        return [];
    }
}

// ===== LIVE STATS =====
export async function getCampaignStats() {
    if (isSupabaseConfigured) {
        const [{ count: totalSponsors }, { count: individualCount }, { count: groupCount }, { count: completedGroups }] = await Promise.all([
            supabase.from("contributions").select("*", { count: "exact", head: true }).eq("payment_status", "Success"),
            supabase.from("contributions").select("*", { count: "exact", head: true }).eq("type", "individual").eq("payment_status", "Success"),
            supabase.from("contributions").select("*", { count: "exact", head: true }).eq("type", "group").eq("payment_status", "Success"),
            supabase.from("groups").select("*", { count: "exact", head: true }).eq("status", "Complete"),
        ]);
        return {
            totalSponsors: totalSponsors || 0,
            individualCount: individualCount || 0,
            groupCount: groupCount || 0,
            girlsSponsored: (individualCount || 0) + (completedGroups || 0),
        };
    } else {
        const indCount = memContribs.filter(c => c.type === "individual" && c.payment_status === "Success").length;
        const grpComplete = memGroups.filter(g => g.filled_slots >= g.total_slots).length;
        return {
            totalSponsors: memContribs.filter(c => c.payment_status === "Success").length,
            individualCount: indCount,
            groupCount: memContribs.filter(c => c.type === "group").length,
            girlsSponsored: indCount + grpComplete,
        };
    }
}

// ===== PAYMENT STATUS UPDATES =====
export async function updatePaymentStatus(contributionId, razorpayPaymentId, status = "Success") {
    if (isSupabaseConfigured) {
        const { data, error } = await supabase
            .from("contributions")
            .update({
                payment_status: status,
                razorpay_payment_id: razorpayPaymentId,
                subscription_status: status === "Success" ? "active" : "cancelled",
                total_payments_made: 1,
                next_payment_date: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString(),
            })
            .eq("id", contributionId)
            .select()
            .single();
        if (error) throw error;
        return data;
    } else {
        memContribs = memContribs.map(c =>
            c.id === contributionId
                ? { ...c, payment_status: status, razorpay_payment_id: razorpayPaymentId, subscription_status: "active", total_payments_made: 1 }
                : c
        );
        return memContribs.find(c => c.id === contributionId);
    }
}

// ===== SUBSCRIPTION MANAGEMENT (ADMIN) =====
export async function getSubscriptionsByStatus(status = null) {
    if (isSupabaseConfigured) {
        let query = supabase.from("contributions").select("*").order("created_at", { ascending: false });
        if (status) query = query.eq("subscription_status", status);
        const { data, error } = await query;
        if (error) throw error;
        return data;
    } else {
        if (status) return memContribs.filter(c => (c.subscription_status || "active") === status);
        return [...memContribs];
    }
}

export async function cancelSubscription(contributionId) {
    if (isSupabaseConfigured) {
        const { data, error } = await supabase
            .from("contributions")
            .update({
                subscription_status: "cancelled",
                cancelled_at: new Date().toISOString(),
            })
            .eq("id", contributionId)
            .select()
            .single();
        if (error) throw error;
        return data;
    } else {
        memContribs = memContribs.map(c =>
            c.id === contributionId
                ? { ...c, subscription_status: "cancelled", cancelled_at: new Date().toISOString() }
                : c
        );
        return memContribs.find(c => c.id === contributionId);
    }
}

// ===== REVENUE ANALYTICS =====
export async function getRevenueStats() {
    const contribs = isSupabaseConfigured
        ? (await supabase.from("contributions").select("*").eq("payment_status", "Success")).data || []
        : memContribs.filter(c => c.payment_status === "Success");

    const totalCollected = contribs.reduce((s, c) => s + (c.amount || 0), 0);
    const monthlyContribs = contribs.filter(c => c.payment_preference !== "annual");
    const annualContribs = contribs.filter(c => c.payment_preference === "annual");
    const mrr = monthlyContribs.reduce((s, c) => s + (c.amount || 0), 0);
    const arr = annualContribs.reduce((s, c) => s + (c.amount || 0), 0);
    const activeCount = contribs.filter(c => (c.subscription_status || "active") === "active").length;
    const cancelledCount = contribs.filter(c => c.subscription_status === "cancelled").length;

    return {
        totalCollected,
        mrr,
        arr,
        avgContribution: contribs.length > 0 ? Math.round(totalCollected / contribs.length) : 0,
        activeSubscriptions: activeCount,
        cancelledSubscriptions: cancelledCount,
        totalTransactions: contribs.length,
    };
}

// ===== CSV EXPORT =====
export async function exportContributionsCSV() {
    const contribs = isSupabaseConfigured
        ? (await supabase.from("contributions").select("*").order("created_at", { ascending: false })).data || []
        : [...memContribs];

    const headers = ["ID", "Donor Name", "Email", "Phone", "Company", "Type", "Amount", "Payment Preference", "Payment Status", "Subscription Status", "Razorpay Payment ID", "Dispute Status", "Refund Status", "Retry Count", "Group ID", "Created At"];
    const rows = contribs.map(c => [
        c.id, c.donor_name, c.email, c.phone || "", c.company || "", c.type,
        c.amount || 0, c.payment_preference || "", c.payment_status,
        c.subscription_status || "pending", c.razorpay_payment_id || "",
        c.dispute_status || "", c.refund_status || "", c.retry_count || 0,
        c.group_id || "", c.created_at || "",
    ]);

    const csv = [headers, ...rows].map(r => r.map(v => `"${String(v).replace(/"/g, '""')}"`).join(",")).join("\n");
    const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `ilika-contributions-${new Date().toISOString().split("T")[0]}.csv`;
    a.click();
    URL.revokeObjectURL(url);
}

// ===== WEBHOOK EVENT LOG =====
export async function getWebhookEvents(limit = 50, eventTypeFilter = null) {
    if (isSupabaseConfigured) {
        let query = supabase.from("webhook_events").select("*").order("created_at", { ascending: false }).limit(limit);
        if (eventTypeFilter) query = query.ilike("event_type", `%${eventTypeFilter}%`);
        const { data, error } = await query;
        if (error) throw error;
        return data || [];
    }
    return [];
}

// ===== FAILED & DISPUTED PAYMENTS =====
export async function getFailedPayments() {
    if (isSupabaseConfigured) {
        const { data, error } = await supabase.from("contributions").select("*")
            .eq("payment_status", "Failed").order("created_at", { ascending: false });
        if (error) throw error;
        return data || [];
    }
    return memContribs.filter(c => c.payment_status === "Failed");
}

export async function getDisputedPayments() {
    if (isSupabaseConfigured) {
        const { data, error } = await supabase.from("contributions").select("*")
            .not("dispute_status", "is", null).order("created_at", { ascending: false });
        if (error) throw error;
        return data || [];
    }
    return [];
}

// ===== EMAIL LOG =====
export async function getEmailLogs(limit = 50) {
    if (isSupabaseConfigured) {
        const { data, error } = await supabase.from("email_logs").select("*")
            .order("created_at", { ascending: false }).limit(limit);
        if (error) throw error;
        return data || [];
    }
    return [];
}
