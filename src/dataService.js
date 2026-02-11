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

// ===== INDIVIDUAL CONTRIBUTIONS =====
export async function createIndividualContribution({ name, email, phone, company, payment }) {
    const contribData = {
        donor_name: name,
        email,
        phone,
        company: company || null,
        type: "individual",
        payment_preference: payment,
        payment_status: "Pending",
        amount: payment === "annual" ? 96000 : 8000,
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
