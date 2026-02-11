// Email Service — Vercel Serverless Function
// Uses Resend for transactional emails to donors and admin alerts
// Endpoint: POST /api/send-email (internal use only — called by webhook + cron)

import { Resend } from "resend";
import { createClient } from "@supabase/supabase-js";

const resend = new Resend(process.env.RESEND_API_KEY);
const ADMIN_EMAIL = process.env.ADMIN_EMAIL || "sachinuppal@gmail.com";
const FROM_EMAIL = process.env.FROM_EMAIL || "Ilika Foundation <onboarding@resend.dev>";
const SUPABASE_URL = process.env.VITE_SUPABASE_URL;
const SUPABASE_KEY = process.env.VITE_SUPABASE_ANON_KEY;

// ===== EMAIL TEMPLATES =====

const templates = {
    // --- DONOR EMAILS ---
    payment_success: (data) => ({
        subject: `✅ Thank you for sponsoring a girl's future, ${data.donor_name}!`,
        html: `
            <div style="font-family:'DM Sans',Arial,sans-serif;max-width:600px;margin:0 auto;background:#FDFBF7;border-radius:16px;overflow:hidden">
                <div style="background:linear-gradient(135deg,#2D5016,#4A7A2E);padding:32px;text-align:center">
                    <h1 style="color:#fff;margin:0;font-size:24px">🎉 Payment Successful!</h1>
                </div>
                <div style="padding:32px">
                    <p style="color:#2C2C2C;font-size:16px;line-height:1.6">Dear <strong>${data.donor_name}</strong>,</p>
                    <p style="color:#2C2C2C;font-size:16px;line-height:1.6">Your sponsorship payment of <strong>₹${(data.amount || 0).toLocaleString("en-IN")}</strong> has been received successfully.</p>
                    <div style="background:#fff;border:1px solid #E8E0D0;border-radius:12px;padding:20px;margin:20px 0">
                        <table style="width:100%;border-collapse:collapse">
                            <tr><td style="padding:8px 0;color:#7A7060;font-size:14px">Payment ID</td><td style="padding:8px 0;color:#2C2C2C;font-weight:600;text-align:right;font-size:14px">${data.razorpay_payment_id || "N/A"}</td></tr>
                            <tr><td style="padding:8px 0;color:#7A7060;font-size:14px">Amount</td><td style="padding:8px 0;color:#2D5016;font-weight:600;text-align:right;font-size:14px">₹${(data.amount || 0).toLocaleString("en-IN")}</td></tr>
                            <tr><td style="padding:8px 0;color:#7A7060;font-size:14px">Type</td><td style="padding:8px 0;color:#2C2C2C;text-align:right;font-size:14px">${data.type === "individual" ? "Individual Sponsorship" : "Group Sponsorship"}</td></tr>
                            <tr><td style="padding:8px 0;color:#7A7060;font-size:14px">Date</td><td style="padding:8px 0;color:#2C2C2C;text-align:right;font-size:14px">${new Date().toLocaleDateString("en-IN", { day: "numeric", month: "long", year: "numeric" })}</td></tr>
                        </table>
                    </div>
                    <p style="color:#2C2C2C;font-size:16px;line-height:1.6">Your 80G tax receipt will be generated and available for download from your sponsorship confirmation page.</p>
                    <p style="color:#7A7060;font-size:14px;line-height:1.6;margin-top:24px">With gratitude,<br><strong>Ilika Foundation</strong></p>
                </div>
            </div>
        `,
    }),

    payment_failed: (data) => ({
        subject: `⚠️ Payment failed — your sponsorship needs attention`,
        html: `
            <div style="font-family:'DM Sans',Arial,sans-serif;max-width:600px;margin:0 auto;background:#FDFBF7;border-radius:16px;overflow:hidden">
                <div style="background:linear-gradient(135deg,#B44D12,#D97706);padding:32px;text-align:center">
                    <h1 style="color:#fff;margin:0;font-size:24px">⚠️ Payment Failed</h1>
                </div>
                <div style="padding:32px">
                    <p style="color:#2C2C2C;font-size:16px;line-height:1.6">Dear <strong>${data.donor_name}</strong>,</p>
                    <p style="color:#2C2C2C;font-size:16px;line-height:1.6">Your payment of <strong>₹${(data.amount || 0).toLocaleString("en-IN")}</strong> could not be processed.</p>
                    ${data.failure_reason ? `<p style="color:#B44D12;font-size:14px;background:#FEF3C7;padding:12px 16px;border-radius:8px;margin:16px 0"><strong>Reason:</strong> ${data.failure_reason}</p>` : ""}
                    <p style="color:#2C2C2C;font-size:16px;line-height:1.6">Don't worry — you can try again anytime:</p>
                    <div style="text-align:center;margin:24px 0">
                        <a href="https://ilikafoundation.vercel.app" style="background:linear-gradient(135deg,#2D5016,#4A7A2E);color:#fff;padding:14px 32px;border-radius:8px;text-decoration:none;font-weight:600;font-size:15px;display:inline-block">Try Again →</a>
                    </div>
                    <p style="color:#7A7060;font-size:13px;line-height:1.6">This is attempt ${data.retry_count || 1} of 3. If you continue to face issues, please contact us.</p>
                </div>
            </div>
        `,
    }),

    payment_authorized: (data) => ({
        subject: `🔄 Payment authorized — processing your sponsorship`,
        html: `
            <div style="font-family:'DM Sans',Arial,sans-serif;max-width:600px;margin:0 auto;background:#FDFBF7;border-radius:16px;overflow:hidden">
                <div style="background:linear-gradient(135deg,#1E40AF,#3B82F6);padding:32px;text-align:center">
                    <h1 style="color:#fff;margin:0;font-size:24px">🔄 Payment Authorized</h1>
                </div>
                <div style="padding:32px">
                    <p style="color:#2C2C2C;font-size:16px;line-height:1.6">Dear <strong>${data.donor_name}</strong>,</p>
                    <p style="color:#2C2C2C;font-size:16px;line-height:1.6">Your payment of <strong>₹${(data.amount || 0).toLocaleString("en-IN")}</strong> has been authorized and is being processed. You'll receive a confirmation once it's captured.</p>
                    <p style="color:#7A7060;font-size:14px;line-height:1.6;margin-top:24px">With gratitude,<br><strong>Ilika Foundation</strong></p>
                </div>
            </div>
        `,
    }),

    // --- SUBSCRIPTION LIFECYCLE EMAILS ---
    subscription_activated: (data) => ({
        subject: `🎉 Your monthly sponsorship is now active!`,
        html: `
            <div style="font-family:'DM Sans',Arial,sans-serif;max-width:600px;margin:0 auto;background:#FDFBF7;border-radius:16px;overflow:hidden">
                <div style="background:linear-gradient(135deg,#2D5016,#4A7A2E);padding:32px;text-align:center">
                    <h1 style="color:#fff;margin:0;font-size:24px">🎉 Subscription Active!</h1>
                </div>
                <div style="padding:32px">
                    <p style="color:#2C2C2C;font-size:16px;line-height:1.6">Dear <strong>${data.donor_name}</strong>,</p>
                    <p style="color:#2C2C2C;font-size:16px;line-height:1.6">Your recurring sponsorship of <strong>₹${(data.amount || 0).toLocaleString("en-IN")}/month</strong> is now active. A girl's future is being transformed because of your generosity.</p>
                    <p style="color:#7A7060;font-size:14px;line-height:1.6;margin-top:24px">With gratitude,<br><strong>Ilika Foundation</strong></p>
                </div>
            </div>
        `,
    }),

    subscription_paused: (data) => ({
        subject: `⏸️ Your sponsorship has been paused`,
        html: `
            <div style="font-family:'DM Sans',Arial,sans-serif;max-width:600px;margin:0 auto;background:#FDFBF7;border-radius:16px;overflow:hidden">
                <div style="background:linear-gradient(135deg,#B44D12,#D97706);padding:32px;text-align:center">
                    <h1 style="color:#fff;margin:0;font-size:24px">⏸️ Subscription Paused</h1>
                </div>
                <div style="padding:32px">
                    <p style="color:#2C2C2C;font-size:16px;line-height:1.6">Dear <strong>${data.donor_name}</strong>,</p>
                    <p style="color:#2C2C2C;font-size:16px;line-height:1.6">Your monthly sponsorship has been paused. You can resume it anytime — the girl you're sponsoring is counting on you! 🙏</p>
                    <div style="text-align:center;margin:24px 0">
                        <a href="https://ilikafoundation.vercel.app" style="background:linear-gradient(135deg,#2D5016,#4A7A2E);color:#fff;padding:14px 32px;border-radius:8px;text-decoration:none;font-weight:600;font-size:15px;display:inline-block">Resume Sponsorship →</a>
                    </div>
                </div>
            </div>
        `,
    }),

    subscription_resumed: (data) => ({
        subject: `▶️ Your sponsorship has been resumed — thank you!`,
        html: `
            <div style="font-family:'DM Sans',Arial,sans-serif;max-width:600px;margin:0 auto;background:#FDFBF7;border-radius:16px;overflow:hidden">
                <div style="background:linear-gradient(135deg,#2D5016,#4A7A2E);padding:32px;text-align:center">
                    <h1 style="color:#fff;margin:0;font-size:24px">▶️ Subscription Resumed!</h1>
                </div>
                <div style="padding:32px">
                    <p style="color:#2C2C2C;font-size:16px;line-height:1.6">Dear <strong>${data.donor_name}</strong>,</p>
                    <p style="color:#2C2C2C;font-size:16px;line-height:1.6">Welcome back! Your monthly sponsorship of <strong>₹${(data.amount || 0).toLocaleString("en-IN")}</strong> has been resumed. Thank you for continuing to support a girl's education! ❤️</p>
                </div>
            </div>
        `,
    }),

    subscription_cancelled: (data) => ({
        subject: `Your sponsorship has been cancelled`,
        html: `
            <div style="font-family:'DM Sans',Arial,sans-serif;max-width:600px;margin:0 auto;background:#FDFBF7;border-radius:16px;overflow:hidden">
                <div style="background:linear-gradient(135deg,#6B7280,#9CA3AF);padding:32px;text-align:center">
                    <h1 style="color:#fff;margin:0;font-size:24px">Subscription Cancelled</h1>
                </div>
                <div style="padding:32px">
                    <p style="color:#2C2C2C;font-size:16px;line-height:1.6">Dear <strong>${data.donor_name}</strong>,</p>
                    <p style="color:#2C2C2C;font-size:16px;line-height:1.6">Your sponsorship has been cancelled. We're sorry to see you go. If you ever want to return, we'd love to have you back.</p>
                    <div style="text-align:center;margin:24px 0">
                        <a href="https://ilikafoundation.vercel.app" style="background:linear-gradient(135deg,#2D5016,#4A7A2E);color:#fff;padding:14px 32px;border-radius:8px;text-decoration:none;font-weight:600;font-size:15px;display:inline-block">Sponsor Again →</a>
                    </div>
                </div>
            </div>
        `,
    }),

    subscription_halted: (data) => ({
        subject: `🚨 Action needed — your sponsorship payment couldn't be charged`,
        html: `
            <div style="font-family:'DM Sans',Arial,sans-serif;max-width:600px;margin:0 auto;background:#FDFBF7;border-radius:16px;overflow:hidden">
                <div style="background:linear-gradient(135deg,#DC2626,#EF4444);padding:32px;text-align:center">
                    <h1 style="color:#fff;margin:0;font-size:24px">🚨 Payment Issue</h1>
                </div>
                <div style="padding:32px">
                    <p style="color:#2C2C2C;font-size:16px;line-height:1.6">Dear <strong>${data.donor_name}</strong>,</p>
                    <p style="color:#2C2C2C;font-size:16px;line-height:1.6">We were unable to charge your payment method for your monthly sponsorship. Your subscription has been halted.</p>
                    <p style="color:#2C2C2C;font-size:16px;line-height:1.6">Please update your payment method or try a new payment to keep a girl's education going:</p>
                    <div style="text-align:center;margin:24px 0">
                        <a href="https://ilikafoundation.vercel.app" style="background:linear-gradient(135deg,#2D5016,#4A7A2E);color:#fff;padding:14px 32px;border-radius:8px;text-decoration:none;font-weight:600;font-size:15px;display:inline-block">Update Payment →</a>
                    </div>
                </div>
            </div>
        `,
    }),

    subscription_charged: (data) => ({
        subject: `✅ Monthly sponsorship payment received — ₹${(data.amount || 0).toLocaleString("en-IN")}`,
        html: `
            <div style="font-family:'DM Sans',Arial,sans-serif;max-width:600px;margin:0 auto;background:#FDFBF7;border-radius:16px;overflow:hidden">
                <div style="background:linear-gradient(135deg,#2D5016,#4A7A2E);padding:32px;text-align:center">
                    <h1 style="color:#fff;margin:0;font-size:24px">✅ Monthly Payment Received</h1>
                </div>
                <div style="padding:32px">
                    <p style="color:#2C2C2C;font-size:16px;line-height:1.6">Dear <strong>${data.donor_name}</strong>,</p>
                    <p style="color:#2C2C2C;font-size:16px;line-height:1.6">Your monthly sponsorship payment of <strong>₹${(data.amount || 0).toLocaleString("en-IN")}</strong> has been received. Payment #${data.total_payments_made || 1}. Thank you for your continued support!</p>
                </div>
            </div>
        `,
    }),

    refund_processed: (data) => ({
        subject: `💸 Refund of ₹${(data.refund_amount || data.amount || 0).toLocaleString("en-IN")} processed`,
        html: `
            <div style="font-family:'DM Sans',Arial,sans-serif;max-width:600px;margin:0 auto;background:#FDFBF7;border-radius:16px;overflow:hidden">
                <div style="background:linear-gradient(135deg,#1E40AF,#3B82F6);padding:32px;text-align:center">
                    <h1 style="color:#fff;margin:0;font-size:24px">💸 Refund Processed</h1>
                </div>
                <div style="padding:32px">
                    <p style="color:#2C2C2C;font-size:16px;line-height:1.6">Dear <strong>${data.donor_name}</strong>,</p>
                    <p style="color:#2C2C2C;font-size:16px;line-height:1.6">A refund of <strong>₹${(data.refund_amount || data.amount || 0).toLocaleString("en-IN")}</strong> has been processed to your original payment method. It may take 5-7 business days to reflect.</p>
                </div>
            </div>
        `,
    }),

    // --- ADMIN ALERT EMAILS ---
    admin_dispute: (data) => ({
        subject: `🚨 DISPUTE: ${data.dispute_status} — ₹${(data.amount || 0).toLocaleString("en-IN")} from ${data.donor_name}`,
        html: `
            <div style="font-family:'DM Sans',Arial,sans-serif;max-width:600px;margin:0 auto;background:#1a1a1a;border-radius:16px;overflow:hidden">
                <div style="background:#DC2626;padding:24px;text-align:center">
                    <h1 style="color:#fff;margin:0;font-size:20px">🚨 Payment Dispute Alert</h1>
                </div>
                <div style="padding:24px;color:#e0e0e0">
                    <table style="width:100%;border-collapse:collapse">
                        <tr><td style="padding:6px 0;color:#999">Donor</td><td style="padding:6px 0;text-align:right">${data.donor_name} (${data.email})</td></tr>
                        <tr><td style="padding:6px 0;color:#999">Amount</td><td style="padding:6px 0;text-align:right;color:#EF4444;font-weight:700">₹${(data.amount || 0).toLocaleString("en-IN")}</td></tr>
                        <tr><td style="padding:6px 0;color:#999">Dispute Status</td><td style="padding:6px 0;text-align:right;text-transform:uppercase;font-weight:600">${data.dispute_status}</td></tr>
                        <tr><td style="padding:6px 0;color:#999">Dispute ID</td><td style="padding:6px 0;text-align:right">${data.dispute_id || "N/A"}</td></tr>
                        <tr><td style="padding:6px 0;color:#999">Reason</td><td style="padding:6px 0;text-align:right">${data.dispute_reason || "Not specified"}</td></tr>
                        <tr><td style="padding:6px 0;color:#999">Payment ID</td><td style="padding:6px 0;text-align:right">${data.razorpay_payment_id || "N/A"}</td></tr>
                    </table>
                    <div style="text-align:center;margin:20px 0">
                        <a href="https://dashboard.razorpay.com" style="background:#3B82F6;color:#fff;padding:12px 24px;border-radius:8px;text-decoration:none;font-weight:600;display:inline-block">View in Razorpay →</a>
                    </div>
                </div>
            </div>
        `,
    }),

    admin_downtime: (data) => ({
        subject: `⚠️ Razorpay ${data.event_type.includes("started") ? "DOWNTIME" : data.event_type.includes("resolved") ? "RECOVERED" : "UPDATE"}`,
        html: `
            <div style="font-family:'DM Sans',Arial,sans-serif;max-width:600px;margin:0 auto;background:#1a1a1a;border-radius:16px;overflow:hidden">
                <div style="background:${data.event_type.includes("resolved") ? "#2D5016" : "#B44D12"};padding:24px;text-align:center">
                    <h1 style="color:#fff;margin:0;font-size:20px">${data.event_type.includes("resolved") ? "✅ Payment Systems Recovered" : "⚠️ Payment Downtime Alert"}</h1>
                </div>
                <div style="padding:24px;color:#e0e0e0">
                    <p>Event: <strong>${data.event_type}</strong></p>
                    <p>Time: <strong>${new Date().toLocaleString("en-IN", { timeZone: "Asia/Kolkata" })}</strong></p>
                    <p style="color:#999;font-size:13px">New payments may be affected during downtime.</p>
                </div>
            </div>
        `,
    }),

    admin_settlement: (data) => ({
        subject: `💰 Settlement processed — check Razorpay dashboard`,
        html: `
            <div style="font-family:'DM Sans',Arial,sans-serif;max-width:600px;margin:0 auto;background:#1a1a1a;border-radius:16px;overflow:hidden">
                <div style="background:#2D5016;padding:24px;text-align:center">
                    <h1 style="color:#fff;margin:0;font-size:20px">💰 Settlement Processed</h1>
                </div>
                <div style="padding:24px;color:#e0e0e0">
                    <p>A settlement has been processed by Razorpay. Please check your dashboard for details.</p>
                    <div style="text-align:center;margin:20px 0">
                        <a href="https://dashboard.razorpay.com" style="background:#B8860B;color:#fff;padding:12px 24px;border-radius:8px;text-decoration:none;font-weight:600;display:inline-block">View Settlement →</a>
                    </div>
                </div>
            </div>
        `,
    }),

    admin_failed_summary: (data) => ({
        subject: `📊 ${data.count} failed payments need attention`,
        html: `
            <div style="font-family:'DM Sans',Arial,sans-serif;max-width:600px;margin:0 auto;background:#1a1a1a;border-radius:16px;overflow:hidden">
                <div style="background:#B44D12;padding:24px;text-align:center">
                    <h1 style="color:#fff;margin:0;font-size:20px">📊 Failed Payment Summary</h1>
                </div>
                <div style="padding:24px;color:#e0e0e0">
                    <p><strong>${data.count}</strong> contributions have failed payments requiring attention.</p>
                    <p><strong>${data.maxRetries}</strong> have exhausted all retry attempts.</p>
                    <div style="text-align:center;margin:20px 0">
                        <a href="https://ilikafoundation.vercel.app/admin" style="background:#B8860B;color:#fff;padding:12px 24px;border-radius:8px;text-decoration:none;font-weight:600;display:inline-block">View Admin Panel →</a>
                    </div>
                </div>
            </div>
        `,
    }),

    retry_reminder: (data) => ({
        subject: `🙏 Your sponsorship payment needs attention (attempt ${data.retry_count}/3)`,
        html: `
            <div style="font-family:'DM Sans',Arial,sans-serif;max-width:600px;margin:0 auto;background:#FDFBF7;border-radius:16px;overflow:hidden">
                <div style="background:linear-gradient(135deg,#B44D12,#D97706);padding:32px;text-align:center">
                    <h1 style="color:#fff;margin:0;font-size:24px">🙏 Please don't give up!</h1>
                </div>
                <div style="padding:32px">
                    <p style="color:#2C2C2C;font-size:16px;line-height:1.6">Dear <strong>${data.donor_name}</strong>,</p>
                    <p style="color:#2C2C2C;font-size:16px;line-height:1.6">Your payment of <strong>₹${(data.amount || 0).toLocaleString("en-IN")}</strong> wasn't successful. A girl's future is at stake — please try again:</p>
                    <div style="text-align:center;margin:24px 0">
                        <a href="https://ilikafoundation.vercel.app" style="background:linear-gradient(135deg,#2D5016,#4A7A2E);color:#fff;padding:14px 32px;border-radius:8px;text-decoration:none;font-weight:600;font-size:15px;display:inline-block">Complete My Sponsorship →</a>
                    </div>
                    <p style="color:#7A7060;font-size:13px">This is reminder ${data.retry_count} of 3.</p>
                </div>
            </div>
        `,
    }),

    final_reminder: (data) => ({
        subject: `We miss you, ${data.donor_name} — one last chance to change a life`,
        html: `
            <div style="font-family:'DM Sans',Arial,sans-serif;max-width:600px;margin:0 auto;background:#FDFBF7;border-radius:16px;overflow:hidden">
                <div style="background:linear-gradient(135deg,#6B7280,#9CA3AF);padding:32px;text-align:center">
                    <h1 style="color:#fff;margin:0;font-size:24px">We miss you 💛</h1>
                </div>
                <div style="padding:32px">
                    <p style="color:#2C2C2C;font-size:16px;line-height:1.6">Dear <strong>${data.donor_name}</strong>,</p>
                    <p style="color:#2C2C2C;font-size:16px;line-height:1.6">We've tried reaching out about your sponsorship payment of <strong>₹${(data.amount || 0).toLocaleString("en-IN")}</strong>, but it hasn't gone through.</p>
                    <p style="color:#2C2C2C;font-size:16px;line-height:1.6">If you still want to sponsor a girl's education, you can restart anytime:</p>
                    <div style="text-align:center;margin:24px 0">
                        <a href="https://ilikafoundation.vercel.app" style="background:linear-gradient(135deg,#2D5016,#4A7A2E);color:#fff;padding:14px 32px;border-radius:8px;text-decoration:none;font-weight:600;font-size:15px;display:inline-block">Sponsor a Girl →</a>
                    </div>
                </div>
            </div>
        `,
    }),
};

// ===== CORE SEND FUNCTION =====

async function sendEmail(to, templateName, data, supabase = null) {
    const template = templates[templateName];
    if (!template) {
        console.warn(`[Email] Unknown template: ${templateName}`);
        return null;
    }

    const { subject, html } = template(data);

    try {
        const result = await resend.emails.send({
            from: FROM_EMAIL,
            to,
            subject,
            html,
        });

        console.log(`[Email] Sent "${templateName}" to ${to} | ID: ${result.data?.id}`);

        // Log to database
        if (supabase) {
            await supabase.from("email_logs").insert({
                recipient: to,
                email_type: templateName,
                subject,
                contribution_id: data.id || null,
                status: "sent",
                resend_id: result.data?.id || null,
            }).catch(err => console.warn("[Email] Failed to log:", err.message));
        }

        return result;
    } catch (err) {
        console.error(`[Email] Failed to send "${templateName}" to ${to}:`, err.message);

        if (supabase) {
            await supabase.from("email_logs").insert({
                recipient: to,
                email_type: templateName,
                subject,
                contribution_id: data.id || null,
                status: "failed",
                error_message: err.message,
            }).catch(() => { });
        }

        return null;
    }
}

// ===== API HANDLER (for internal calls) =====

export default async function handler(req, res) {
    if (req.method !== "POST") {
        return res.status(405).json({ error: "Method not allowed" });
    }

    const { to, template, data } = req.body;

    if (!to || !template) {
        return res.status(400).json({ error: "Missing 'to' or 'template'" });
    }

    if (!process.env.RESEND_API_KEY) {
        console.warn("[Email] RESEND_API_KEY not set — skipping");
        return res.status(200).json({ status: "skipped", reason: "no_api_key" });
    }

    const supabase = (SUPABASE_URL && SUPABASE_KEY)
        ? createClient(SUPABASE_URL, SUPABASE_KEY)
        : null;

    const result = await sendEmail(to, template, data || {}, supabase);

    return res.status(200).json({ status: result ? "sent" : "failed" });
}

// ===== EXPORTED HELPERS (for use in other serverless functions) =====

export { sendEmail, templates, ADMIN_EMAIL };
