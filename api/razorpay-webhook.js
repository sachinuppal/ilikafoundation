// Razorpay Webhook Handler — Vercel Serverless Function
// Handles ALL 41 active Razorpay events
// Endpoint: POST /api/razorpay-webhook

import crypto from "crypto";
import { createClient } from "@supabase/supabase-js";
import { sendEmail, ADMIN_EMAIL } from "./send-email.js";

const WEBHOOK_SECRET = process.env.RAZORPAY_WEBHOOK_SECRET;
const SUPABASE_URL = process.env.VITE_SUPABASE_URL;
const SUPABASE_KEY = process.env.VITE_SUPABASE_ANON_KEY;

// ===== SIGNATURE VERIFICATION =====
function verifySignature(body, signature) {
    if (!WEBHOOK_SECRET) return false;
    const expected = crypto.createHmac("sha256", WEBHOOK_SECRET).update(body).digest("hex");
    try {
        return crypto.timingSafeEqual(Buffer.from(expected, "hex"), Buffer.from(signature, "hex"));
    } catch {
        return false;
    }
}

// ===== HELPERS =====
function getSupabase() {
    if (!SUPABASE_URL || !SUPABASE_KEY) return null;
    return createClient(SUPABASE_URL, SUPABASE_KEY);
}

async function logWebhookEvent(supabase, eventType, eventId, payload, contributionId = null, status = "processed", errorMsg = null) {
    if (!supabase) return;
    await supabase.from("webhook_events").insert({
        event_type: eventType,
        razorpay_event_id: eventId,
        payload,
        contribution_id: contributionId,
        status,
        error_message: errorMsg,
    }).catch(err => console.warn("[Webhook] Failed to log event:", err.message));
}

async function findContribution(supabase, { email, amount, status, paymentId, subscriptionId }) {
    let query = supabase.from("contributions").select("*");
    if (paymentId) query = query.eq("razorpay_payment_id", paymentId);
    else if (subscriptionId) query = query.eq("razorpay_subscription_id", subscriptionId);
    else {
        if (email) query = query.eq("email", email);
        if (amount) query = query.eq("amount", amount);
        if (status) query = query.eq("payment_status", status);
    }
    query = query.order("created_at", { ascending: false }).limit(1);
    const { data } = await query;
    return data?.[0] || null;
}

async function updateContribution(supabase, id, updates) {
    const { data, error } = await supabase.from("contributions").update(updates).eq("id", id).select().single();
    if (error) console.error(`[Webhook] Update contribution #${id} failed:`, error.message);
    return data;
}

// ===== MAIN HANDLER =====
export default async function handler(req, res) {
    if (req.method !== "POST") return res.status(405).json({ error: "Method not allowed" });

    const signature = req.headers["x-razorpay-signature"];
    if (!signature) return res.status(400).json({ error: "Missing signature" });

    const rawBody = typeof req.body === "string" ? req.body : JSON.stringify(req.body);
    if (!verifySignature(rawBody, signature)) {
        console.error("[Webhook] Signature verification failed");
        return res.status(401).json({ error: "Invalid signature" });
    }

    const event = typeof req.body === "string" ? JSON.parse(req.body) : req.body;
    const eventType = event.event;
    const payload = event.payload;
    const eventId = event.event_id || null;

    console.log(`[Webhook] ← ${eventType}`);

    const supabase = getSupabase();
    if (!supabase) {
        console.error("[Webhook] Supabase not configured");
        return res.status(500).json({ error: "Database not configured" });
    }

    try {
        // Route to handler by event group
        if (eventType.startsWith("payment.dispute")) {
            await handleDispute(supabase, eventType, payload, eventId);
        } else if (eventType.startsWith("payment.downtime")) {
            await handleDowntime(supabase, eventType, payload, eventId);
        } else if (eventType.startsWith("payment.")) {
            await handlePayment(supabase, eventType, payload, eventId);
        } else if (eventType.startsWith("subscription.")) {
            await handleSubscription(supabase, eventType, payload, eventId);
        } else if (eventType.startsWith("refund.")) {
            await handleRefund(supabase, eventType, payload, eventId);
        } else if (eventType.startsWith("order.") || eventType.startsWith("invoice.")) {
            await handleOrderInvoice(supabase, eventType, payload, eventId);
        } else if (eventType.startsWith("settlement.")) {
            await handleSettlement(supabase, eventType, payload, eventId);
        } else {
            // fund_account.*, payment_link.*, account.* — log only
            await logWebhookEvent(supabase, eventType, eventId, payload, null, "ignored");
            console.log(`[Webhook] Logged (no action): ${eventType}`);
        }

        return res.status(200).json({ status: "ok", event: eventType });
    } catch (err) {
        console.error("[Webhook] Error:", err);
        await logWebhookEvent(supabase, eventType, eventId, payload, null, "failed", err.message);
        return res.status(500).json({ error: "Processing error" });
    }
}

// ===== PAYMENT EVENTS =====
// payment.authorized, payment.captured, payment.failed

async function handlePayment(supabase, eventType, payload, eventId) {
    const payment = payload.payment?.entity;
    if (!payment) return;

    const email = payment.email;
    const amount = payment.amount / 100;
    const paymentId = payment.id;
    const failureReason = payment.error_description || payment.error_reason || null;

    switch (eventType) {
        case "payment.authorized": {
            const contrib = await findContribution(supabase, { email, amount, status: "Pending" });
            if (contrib) {
                await updateContribution(supabase, contrib.id, {
                    payment_status: "Authorized",
                    razorpay_payment_id: paymentId,
                });
                await logWebhookEvent(supabase, eventType, eventId, payload, contrib.id);
                await sendEmail(email, "payment_authorized", { ...contrib, razorpay_payment_id: paymentId, amount }, supabase);
            } else {
                await logWebhookEvent(supabase, eventType, eventId, payload, null, "ignored", "No matching contribution");
            }
            break;
        }

        case "payment.captured": {
            // Try matching by payment ID first (if authorized earlier), then by email+amount+pending
            let contrib = await findContribution(supabase, { paymentId });
            if (!contrib) contrib = await findContribution(supabase, { email, amount, status: "Authorized" });
            if (!contrib) contrib = await findContribution(supabase, { email, amount, status: "Pending" });

            if (contrib) {
                const updated = await updateContribution(supabase, contrib.id, {
                    payment_status: "Success",
                    razorpay_payment_id: paymentId,
                    subscription_status: "active",
                    total_payments_made: (contrib.total_payments_made || 0) + 1,
                    next_payment_date: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString(),
                });
                await logWebhookEvent(supabase, eventType, eventId, payload, contrib.id);
                await sendEmail(email, "payment_success", { ...contrib, ...updated, razorpay_payment_id: paymentId, amount }, supabase);
                console.log(`[Webhook] ✅ Payment captured: #${contrib.id} → Success`);
            } else {
                await logWebhookEvent(supabase, eventType, eventId, payload, null, "ignored", "No matching contribution");
            }
            break;
        }

        case "payment.failed": {
            const contrib = await findContribution(supabase, { email, amount, status: "Pending" })
                || await findContribution(supabase, { email, amount, status: "Authorized" });

            if (contrib) {
                await updateContribution(supabase, contrib.id, {
                    payment_status: "Failed",
                    razorpay_payment_id: paymentId,
                    failure_reason: failureReason,
                    retry_count: (contrib.retry_count || 0),
                });
                await logWebhookEvent(supabase, eventType, eventId, payload, contrib.id);
                await sendEmail(email, "payment_failed", { ...contrib, razorpay_payment_id: paymentId, amount, failure_reason: failureReason }, supabase);
                console.log(`[Webhook] ❌ Payment failed: #${contrib.id}`);
            } else {
                await logWebhookEvent(supabase, eventType, eventId, payload, null, "ignored", "No matching contribution");
            }
            break;
        }
    }
}

// ===== SUBSCRIPTION EVENTS =====
// subscription.authenticated, .activated, .charged, .pending, .halted, .paused, .resumed, .cancelled, .completed, .updated

async function handleSubscription(supabase, eventType, payload, eventId) {
    const sub = payload.subscription?.entity;
    const payment = payload.payment?.entity;
    if (!sub) return;

    const subscriptionId = sub.id;
    const email = sub.customer_email || sub.notes?.email || payment?.email;
    const subStatus = eventType.replace("subscription.", ""); // 'activated', 'paused', etc.

    // Map Razorpay subscription status → our DB status
    const statusMap = {
        authenticated: "authenticated",
        activated: "active",
        charged: "active",
        pending: "pending",
        halted: "halted",
        paused: "paused",
        resumed: "active",
        cancelled: "cancelled",
        completed: "completed",
        updated: null, // no status change for 'updated'
    };

    // Find contribution by subscription ID or email
    let contrib = await findContribution(supabase, { subscriptionId });
    if (!contrib && email) {
        const { data } = await supabase.from("contributions").select("*")
            .eq("email", email).order("created_at", { ascending: false }).limit(1);
        contrib = data?.[0] || null;
    }

    if (!contrib) {
        await logWebhookEvent(supabase, eventType, eventId, payload, null, "ignored", "No matching contribution");
        return;
    }

    const updates = { razorpay_subscription_id: subscriptionId };
    if (statusMap[subStatus] !== undefined && statusMap[subStatus] !== null) {
        updates.subscription_status = statusMap[subStatus];
    }

    switch (subStatus) {
        case "charged": {
            updates.total_payments_made = (contrib.total_payments_made || 0) + 1;
            updates.next_payment_date = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString();
            if (payment) updates.razorpay_payment_id = payment.id;
            break;
        }
        case "cancelled": {
            updates.cancelled_at = new Date().toISOString();
            break;
        }
    }

    await updateContribution(supabase, contrib.id, updates);
    await logWebhookEvent(supabase, eventType, eventId, payload, contrib.id);

    // Send emails based on subscription event
    const emailMap = {
        authenticated: null, // no email for auth
        activated: "subscription_activated",
        charged: "subscription_charged",
        pending: null,
        halted: "subscription_halted",
        paused: "subscription_paused",
        resumed: "subscription_resumed",
        cancelled: "subscription_cancelled",
        completed: "subscription_cancelled", // reuse template
        updated: null,
    };

    const template = emailMap[subStatus];
    if (template && email) {
        await sendEmail(email, template, {
            ...contrib,
            ...updates,
            amount: contrib.amount,
            total_payments_made: updates.total_payments_made || contrib.total_payments_made,
        }, supabase);
    }

    // Admin alert for critical subscription events
    if (["halted", "cancelled"].includes(subStatus)) {
        await sendEmail(ADMIN_EMAIL, "admin_dispute", {
            ...contrib,
            dispute_status: `subscription_${subStatus}`,
            dispute_reason: `Subscription ${subStatus} for ${contrib.donor_name}`,
        }, supabase);
    }

    console.log(`[Webhook] 📋 Subscription ${subStatus}: #${contrib.id}`);
}

// ===== REFUND EVENTS =====
// refund.created, .processed, .failed, .speed_changed

async function handleRefund(supabase, eventType, payload, eventId) {
    const refund = payload.refund?.entity;
    if (!refund) return;

    const paymentId = refund.payment_id;
    const refundId = refund.id;
    const refundAmount = refund.amount / 100;
    const refundStatus = eventType.replace("refund.", ""); // 'created', 'processed', etc.

    const contrib = await findContribution(supabase, { paymentId });

    if (!contrib) {
        await logWebhookEvent(supabase, eventType, eventId, payload, null, "ignored", "No matching contribution");
        return;
    }

    const updates = {
        razorpay_refund_id: refundId,
        refund_amount: refundAmount,
    };

    switch (refundStatus) {
        case "created":
            updates.refund_status = "created";
            break;
        case "processed":
            updates.refund_status = "processed";
            updates.payment_status = "Refunded";
            updates.refunded_at = new Date().toISOString();
            break;
        case "failed":
            updates.refund_status = "failed";
            break;
        case "speed_changed":
            // Just log, no status change
            break;
    }

    await updateContribution(supabase, contrib.id, updates);
    await logWebhookEvent(supabase, eventType, eventId, payload, contrib.id);

    // Notify donor on refund processed
    if (refundStatus === "processed" && contrib.email) {
        await sendEmail(contrib.email, "refund_processed", { ...contrib, refund_amount: refundAmount }, supabase);
    }

    // Admin alert for failed refunds
    if (refundStatus === "failed") {
        await sendEmail(ADMIN_EMAIL, "admin_dispute", {
            ...contrib,
            dispute_status: "refund_failed",
            dispute_reason: `Refund of ₹${refundAmount} failed for ${contrib.donor_name}`,
        }, supabase);
    }

    console.log(`[Webhook] 💸 Refund ${refundStatus}: #${contrib.id} | ₹${refundAmount}`);
}

// ===== DISPUTE EVENTS =====
// payment.dispute.created, .won, .lost, .closed, .under_review, .action_required

async function handleDispute(supabase, eventType, payload, eventId) {
    const dispute = payload.dispute?.entity || payload.payment?.dispute?.entity;
    const payment = payload.payment?.entity;
    if (!dispute && !payment) return;

    const disputeStatus = eventType.replace("payment.dispute.", ""); // 'created', 'won', etc.
    const paymentId = dispute?.payment_id || payment?.id;
    const disputeId = dispute?.id;
    const disputeReason = dispute?.reason_description || dispute?.reason_code || null;

    const contrib = paymentId ? await findContribution(supabase, { paymentId }) : null;

    if (contrib) {
        const updates = {
            dispute_status: disputeStatus === "created" ? "open" : disputeStatus,
            dispute_id: disputeId,
            dispute_reason: disputeReason,
        };

        // Final dispute states affect payment_status
        if (disputeStatus === "lost") {
            updates.payment_status = "Disputed";
        } else if (disputeStatus === "won" || disputeStatus === "closed") {
            updates.dispute_status = disputeStatus === "won" ? "won" : "closed";
        }

        await updateContribution(supabase, contrib.id, updates);
        await logWebhookEvent(supabase, eventType, eventId, payload, contrib.id);
    } else {
        await logWebhookEvent(supabase, eventType, eventId, payload, null, "ignored", "No matching contribution");
    }

    // ALWAYS alert admin for disputes
    await sendEmail(ADMIN_EMAIL, "admin_dispute", {
        ...(contrib || {}),
        email: contrib?.email || payment?.email || "unknown",
        donor_name: contrib?.donor_name || "Unknown Donor",
        amount: contrib?.amount || (payment?.amount ? payment.amount / 100 : 0),
        dispute_status: disputeStatus,
        dispute_id: disputeId,
        dispute_reason: disputeReason,
        razorpay_payment_id: paymentId,
    }, supabase);

    console.log(`[Webhook] ⚠️ Dispute ${disputeStatus}: payment ${paymentId}`);
}

// ===== ORDER / INVOICE EVENTS =====
// order.paid, order.notification.delivered, order.notification.failed
// invoice.paid, invoice.partially_paid, invoice.expired

async function handleOrderInvoice(supabase, eventType, payload, eventId) {
    const order = payload.order?.entity;
    const invoice = payload.invoice?.entity;
    const payment = payload.payment?.entity;
    const entity = order || invoice;

    if (eventType === "order.paid" && payment) {
        // Try to link order to contribution
        const contrib = await findContribution(supabase, { paymentId: payment.id });
        if (contrib) {
            await updateContribution(supabase, contrib.id, {
                razorpay_order_id: order?.id,
                payment_status: "Success",
            });
            await logWebhookEvent(supabase, eventType, eventId, payload, contrib.id);
        } else {
            await logWebhookEvent(supabase, eventType, eventId, payload, null, "processed");
        }
    } else if (eventType === "invoice.expired") {
        // Alert admin about expired invoices
        await sendEmail(ADMIN_EMAIL, "admin_dispute", {
            donor_name: "System",
            email: "N/A",
            amount: invoice?.amount ? invoice.amount / 100 : 0,
            dispute_status: "invoice_expired",
            dispute_reason: `Invoice ${invoice?.id} has expired`,
            razorpay_payment_id: invoice?.payment_id || "N/A",
        }, supabase);
        await logWebhookEvent(supabase, eventType, eventId, payload, null, "processed");
    } else {
        // All other order/invoice events — just log
        await logWebhookEvent(supabase, eventType, eventId, payload, null, "processed");
    }

    console.log(`[Webhook] 📦 ${eventType}`);
}

// ===== SETTLEMENT EVENTS =====
// settlement.processed

async function handleSettlement(supabase, eventType, payload, eventId) {
    await logWebhookEvent(supabase, eventType, eventId, payload, null, "processed");
    await sendEmail(ADMIN_EMAIL, "admin_settlement", { event_type: eventType }, supabase);
    console.log(`[Webhook] 💰 Settlement processed`);
}

// ===== DOWNTIME EVENTS =====
// payment.downtime.started, .updated, .resolved

async function handleDowntime(supabase, eventType, payload, eventId) {
    await logWebhookEvent(supabase, eventType, eventId, payload, null, "processed");
    await sendEmail(ADMIN_EMAIL, "admin_downtime", { event_type: eventType }, supabase);
    console.log(`[Webhook] ${eventType.includes("resolved") ? "✅" : "⚠️"} Downtime: ${eventType}`);
}
