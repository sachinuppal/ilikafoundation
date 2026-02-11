// Razorpay Webhook Handler — Vercel Serverless Function
// Endpoint: POST /api/razorpay-webhook
// Receives payment events from Razorpay, verifies signature, updates Supabase

import crypto from "crypto";
import { createClient } from "@supabase/supabase-js";

const WEBHOOK_SECRET = process.env.RAZORPAY_WEBHOOK_SECRET;
const SUPABASE_URL = process.env.VITE_SUPABASE_URL;
const SUPABASE_KEY = process.env.VITE_SUPABASE_ANON_KEY;

function verifySignature(body, signature) {
    if (!WEBHOOK_SECRET) return false;
    const expectedSignature = crypto
        .createHmac("sha256", WEBHOOK_SECRET)
        .update(body)
        .digest("hex");
    return crypto.timingSafeEqual(
        Buffer.from(expectedSignature, "hex"),
        Buffer.from(signature, "hex")
    );
}

export default async function handler(req, res) {
    // Only accept POST
    if (req.method !== "POST") {
        return res.status(405).json({ error: "Method not allowed" });
    }

    // Verify Razorpay signature
    const signature = req.headers["x-razorpay-signature"];
    if (!signature) {
        return res.status(400).json({ error: "Missing signature header" });
    }

    const rawBody = typeof req.body === "string" ? req.body : JSON.stringify(req.body);

    if (!verifySignature(rawBody, signature)) {
        console.error("[Webhook] Signature verification failed");
        return res.status(401).json({ error: "Invalid signature" });
    }

    // Parse event
    const event = typeof req.body === "string" ? JSON.parse(req.body) : req.body;
    const eventType = event.event;
    const payload = event.payload;

    console.log(`[Webhook] Received event: ${eventType}`);

    // Initialize Supabase
    if (!SUPABASE_URL || !SUPABASE_KEY) {
        console.error("[Webhook] Supabase not configured");
        return res.status(500).json({ error: "Database not configured" });
    }

    const supabase = createClient(SUPABASE_URL, SUPABASE_KEY);

    try {
        switch (eventType) {
            case "payment.captured": {
                const payment = payload.payment?.entity;
                if (!payment) break;

                const paymentId = payment.id;
                const email = payment.email;
                const amount = payment.amount / 100; // paise → INR
                const notes = payment.notes || {};

                console.log(`[Webhook] Payment captured: ${paymentId} | ₹${amount} | ${email}`);

                // Find the contribution by email + amount + Pending status
                const { data: contrib } = await supabase
                    .from("contributions")
                    .select("*")
                    .eq("email", email)
                    .eq("amount", amount)
                    .eq("payment_status", "Pending")
                    .order("created_at", { ascending: false })
                    .limit(1)
                    .single();

                if (contrib) {
                    await supabase
                        .from("contributions")
                        .update({
                            payment_status: "Success",
                            razorpay_payment_id: paymentId,
                            subscription_status: "active",
                            total_payments_made: (contrib.total_payments_made || 0) + 1,
                            next_payment_date: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString(),
                        })
                        .eq("id", contrib.id);

                    console.log(`[Webhook] Updated contribution #${contrib.id} → Success`);
                } else {
                    console.warn(`[Webhook] No matching pending contribution found for ${email} / ₹${amount}`);
                }
                break;
            }

            case "payment.failed": {
                const payment = payload.payment?.entity;
                if (!payment) break;

                const email = payment.email;
                const amount = payment.amount / 100;

                console.log(`[Webhook] Payment failed: ${email} | ₹${amount}`);

                const { data: contrib } = await supabase
                    .from("contributions")
                    .select("*")
                    .eq("email", email)
                    .eq("amount", amount)
                    .eq("payment_status", "Pending")
                    .order("created_at", { ascending: false })
                    .limit(1)
                    .single();

                if (contrib) {
                    await supabase
                        .from("contributions")
                        .update({
                            payment_status: "Failed",
                            razorpay_payment_id: payment.id,
                        })
                        .eq("id", contrib.id);

                    console.log(`[Webhook] Updated contribution #${contrib.id} → Failed`);
                }
                break;
            }

            case "subscription.charged": {
                const sub = payload.subscription?.entity;
                const payment = payload.payment?.entity;
                if (!payment) break;

                const email = payment.email;
                console.log(`[Webhook] Subscription charged: ${email}`);

                // Update total payments for recurring
                const { data: contribs } = await supabase
                    .from("contributions")
                    .select("*")
                    .eq("email", email)
                    .eq("payment_status", "Success")
                    .eq("subscription_status", "active")
                    .order("created_at", { ascending: false })
                    .limit(1);

                if (contribs?.length > 0) {
                    await supabase
                        .from("contributions")
                        .update({
                            total_payments_made: (contribs[0].total_payments_made || 0) + 1,
                            next_payment_date: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString(),
                        })
                        .eq("id", contribs[0].id);
                }
                break;
            }

            case "subscription.cancelled": {
                const sub = payload.subscription?.entity;
                if (!sub) break;

                console.log(`[Webhook] Subscription cancelled`);
                break;
            }

            default:
                console.log(`[Webhook] Unhandled event: ${eventType}`);
        }

        return res.status(200).json({ status: "ok", event: eventType });
    } catch (err) {
        console.error("[Webhook] Processing error:", err);
        return res.status(500).json({ error: "Internal processing error" });
    }
}
