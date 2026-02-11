// Cron Job: Retry Failed Payments & Send Reminders
// Runs every 6 hours via Vercel Cron
// Endpoint: GET /api/cron-payment-retry

import { createClient } from "@supabase/supabase-js";
import { sendEmail, ADMIN_EMAIL } from "./send-email.js";

const SUPABASE_URL = process.env.VITE_SUPABASE_URL;
const SUPABASE_KEY = process.env.VITE_SUPABASE_ANON_KEY;
const CRON_SECRET = process.env.CRON_SECRET;

export default async function handler(req, res) {
    // Only allow GET (Vercel Cron sends GET requests)
    if (req.method !== "GET") {
        return res.status(405).json({ error: "Method not allowed" });
    }

    // Security: verify cron secret or Vercel User-Agent
    const authHeader = req.headers.authorization;
    const userAgent = req.headers["user-agent"];
    const isVercelCron = userAgent?.includes("vercel-cron");
    const isValidSecret = CRON_SECRET && authHeader === `Bearer ${CRON_SECRET}`;

    if (!isVercelCron && !isValidSecret) {
        return res.status(401).json({ error: "Unauthorized" });
    }

    if (!SUPABASE_URL || !SUPABASE_KEY) {
        return res.status(500).json({ error: "Database not configured" });
    }

    const supabase = createClient(SUPABASE_URL, SUPABASE_KEY);
    const results = { reminders_sent: 0, final_notices: 0, admin_alerted: false, errors: [] };

    try {
        // ===== 1. FIND FAILED PAYMENTS NEEDING REMINDERS =====
        // Get failed contributions with retry_count < 3, not reminded in last 6 hours
        const sixHoursAgo = new Date(Date.now() - 6 * 60 * 60 * 1000).toISOString();

        const { data: failedPayments, error: fetchErr } = await supabase
            .from("contributions")
            .select("*")
            .eq("payment_status", "Failed")
            .lt("retry_count", 3)
            .order("created_at", { ascending: false });

        if (fetchErr) {
            console.error("[Cron] Failed to fetch payments:", fetchErr.message);
            results.errors.push(fetchErr.message);
        }

        const eligibleForReminder = (failedPayments || []).filter(c => {
            if (!c.last_reminder_sent_at) return true;
            return new Date(c.last_reminder_sent_at) < new Date(sixHoursAgo);
        });

        console.log(`[Cron] Found ${eligibleForReminder.length} failed payments eligible for reminder`);

        // Send reminders
        for (const contrib of eligibleForReminder) {
            const newRetryCount = (contrib.retry_count || 0) + 1;

            try {
                if (newRetryCount >= 3) {
                    // Final reminder
                    await sendEmail(contrib.email, "final_reminder", contrib, supabase);
                    results.final_notices++;
                } else {
                    // Regular retry reminder
                    await sendEmail(contrib.email, "retry_reminder", {
                        ...contrib,
                        retry_count: newRetryCount,
                    }, supabase);
                    results.reminders_sent++;
                }

                // Update retry tracking
                await supabase
                    .from("contributions")
                    .update({
                        retry_count: newRetryCount,
                        last_retry_at: new Date().toISOString(),
                        last_reminder_sent_at: new Date().toISOString(),
                    })
                    .eq("id", contrib.id);

            } catch (emailErr) {
                console.error(`[Cron] Failed to send reminder to ${contrib.email}:`, emailErr.message);
                results.errors.push(`${contrib.email}: ${emailErr.message}`);
            }
        }

        // ===== 2. CHECK FOR HALTED SUBSCRIPTIONS =====
        const fortyEightHoursAgo = new Date(Date.now() - 48 * 60 * 60 * 1000).toISOString();

        const { data: haltedSubs } = await supabase
            .from("contributions")
            .select("*")
            .eq("subscription_status", "halted")
            .order("created_at", { ascending: false });

        const staleHalted = (haltedSubs || []).filter(c =>
            !c.last_reminder_sent_at || new Date(c.last_reminder_sent_at) < new Date(fortyEightHoursAgo)
        );

        // Send halted subscription reminders to donors
        for (const contrib of staleHalted) {
            await sendEmail(contrib.email, "subscription_halted", contrib, supabase).catch(() => { });
            await supabase.from("contributions").update({
                last_reminder_sent_at: new Date().toISOString(),
            }).eq("id", contrib.id).catch(() => { });
        }

        // ===== 3. ADMIN SUMMARY =====
        const allFailed = failedPayments || [];
        const maxRetries = allFailed.filter(c => (c.retry_count || 0) >= 3);

        if (allFailed.length > 0) {
            await sendEmail(ADMIN_EMAIL, "admin_failed_summary", {
                count: allFailed.length,
                maxRetries: maxRetries.length,
            }, supabase);
            results.admin_alerted = true;
        }

        console.log(`[Cron] Complete:`, results);
        return res.status(200).json({ status: "ok", ...results, timestamp: new Date().toISOString() });

    } catch (err) {
        console.error("[Cron] Error:", err);
        return res.status(500).json({ error: "Cron processing error", message: err.message });
    }
}
