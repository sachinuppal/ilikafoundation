// Razorpay Checkout Service
// Uses Standard Checkout (client-side) — no backend required
// Set VITE_RAZORPAY_KEY_ID in .env to enable payments

const RAZORPAY_KEY = import.meta.env.VITE_RAZORPAY_KEY_ID;

export const isRazorpayConfigured = !!RAZORPAY_KEY && !RAZORPAY_KEY.includes('YOUR_KEY');

/**
 * Open Razorpay Checkout modal
 * @param {Object} options
 * @param {number} options.amount - Amount in INR (will be converted to paise)
 * @param {string} options.name - Donor name
 * @param {string} options.email - Donor email
 * @param {string} options.phone - Donor phone
 * @param {string} options.description - Payment description
 * @param {string} options.paymentType - 'individual' or 'group'
 * @param {string} options.paymentPreference - 'monthly' or 'annual'
 * @param {Function} options.onSuccess - Callback with { razorpay_payment_id }
 * @param {Function} options.onFailure - Callback with error
 */
export function openRazorpayCheckout({
    amount,
    name,
    email,
    phone,
    description = "Ilika Fellowship Sponsorship",
    paymentType = "individual",
    paymentPreference = "monthly",
    onSuccess,
    onFailure,
}) {
    if (!isRazorpayConfigured) {
        // Dev mode — simulate success after 1.5s
        console.warn("[Razorpay] Key not configured. Simulating payment...");
        setTimeout(() => {
            onSuccess({
                razorpay_payment_id: `pay_sim_${Date.now()}`,
                razorpay_order_id: null,
                razorpay_signature: null,
            });
        }, 1500);
        return;
    }

    if (typeof window.Razorpay === "undefined") {
        onFailure(new Error("Razorpay SDK not loaded. Please refresh and try again."));
        return;
    }

    const options = {
        key: RAZORPAY_KEY,
        amount: amount * 100, // Convert to paise
        currency: "INR",
        name: "Ilika Foundation",
        description,
        image: "https://static.wixstatic.com/media/e3859a_09bd59c846ab436e91d393ae5718133b~mv2.jpeg/v1/fill/w_120,h_120,al_c,q_85/e3859a_09bd59c846ab436e91d393ae5718133b~mv2.jpeg",
        prefill: {
            name,
            email,
            contact: phone,
        },
        notes: {
            payment_type: paymentType,
            payment_preference: paymentPreference,
            platform: "ilika-campaign",
        },
        theme: {
            color: "#2D5016",
            backdrop_color: "rgba(45, 80, 22, 0.15)",
        },
        modal: {
            ondismiss: () => {
                onFailure(new Error("Payment cancelled by user"));
            },
        },
        handler: (response) => {
            onSuccess({
                razorpay_payment_id: response.razorpay_payment_id,
                razorpay_order_id: response.razorpay_order_id || null,
                razorpay_signature: response.razorpay_signature || null,
            });
        },
    };

    try {
        const rzp = new window.Razorpay(options);
        rzp.on("payment.failed", (response) => {
            onFailure(new Error(response.error?.description || "Payment failed"));
        });
        rzp.open();
    } catch (err) {
        onFailure(err);
    }
}
