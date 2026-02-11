// Status Toast — reusable notification component for payment status messaging
import { useState, useEffect } from "react";

const TOAST_DURATION = 6000; // auto-dismiss after 6 seconds

const toastStyles = {
    success: {
        bg: "linear-gradient(135deg, #1B3A5C, #2A5A8C)",
        icon: "✅",
        border: "#2A5A8C",
    },
    failed: {
        bg: "linear-gradient(135deg, #B44D12, #D97706)",
        icon: "❌",
        border: "#D97706",
    },
    pending: {
        bg: "linear-gradient(135deg, #1E40AF, #3B82F6)",
        icon: "⏳",
        border: "#3B82F6",
    },
    info: {
        bg: "linear-gradient(135deg, #374151, #6B7280)",
        icon: "ℹ️",
        border: "#6B7280",
    },
    warning: {
        bg: "linear-gradient(135deg, #B44D12, #D97706)",
        icon: "⚠️",
        border: "#D97706",
    },
};

// Pre-defined messages for common payment states
export const TOAST_MESSAGES = {
    payment_success: {
        type: "success",
        title: "Payment Successful!",
        message: "Thank you! Check your email for the 80G tax receipt.",
    },
    payment_failed: {
        type: "failed",
        title: "Payment Failed",
        message: "Your payment couldn't be processed. Please try again or use a different payment method.",
    },
    payment_pending: {
        type: "pending",
        title: "Processing Payment...",
        message: "Your payment is being processed. We'll update you shortly.",
    },
    payment_authorized: {
        type: "pending",
        title: "Payment Authorized",
        message: "Your payment has been authorized and is being captured.",
    },
    subscription_active: {
        type: "success",
        title: "Subscription Active!",
        message: "Your monthly sponsorship is now active. Thank you for your support!",
    },
    subscription_paused: {
        type: "warning",
        title: "Subscription Paused",
        message: "Your monthly sponsorship has been paused. Resume anytime!",
    },
    subscription_cancelled: {
        type: "info",
        title: "Subscription Cancelled",
        message: "Your sponsorship has been cancelled. We hope to see you again!",
    },
    refund_processed: {
        type: "info",
        title: "Refund Processed",
        message: "Your refund has been processed. It may take 5-7 business days to reflect.",
    },
    network_error: {
        type: "failed",
        title: "Connection Error",
        message: "Unable to connect. Please check your internet and try again.",
    },
    razorpay_not_loaded: {
        type: "failed",
        title: "Payment System Error",
        message: "Payment system couldn't load. Please refresh the page and try again.",
    },
};

export function StatusToast({ toast, onDismiss }) {
    const [visible, setVisible] = useState(false);
    const [exiting, setExiting] = useState(false);

    useEffect(() => {
        if (toast) {
            setVisible(true);
            setExiting(false);
            const timer = setTimeout(() => dismiss(), TOAST_DURATION);
            return () => clearTimeout(timer);
        }
    }, [toast]);

    const dismiss = () => {
        setExiting(true);
        setTimeout(() => {
            setVisible(false);
            setExiting(false);
            onDismiss?.();
        }, 300);
    };

    if (!toast || !visible) return null;

    const style = toastStyles[toast.type] || toastStyles.info;

    return (
        <div style={{
            position: "fixed",
            top: 24,
            right: 24,
            zIndex: 10000,
            maxWidth: 400,
            minWidth: 320,
            background: style.bg,
            borderRadius: 14,
            padding: "18px 20px",
            color: "#fff",
            fontFamily: "'DM Sans', sans-serif",
            boxShadow: "0 8px 32px rgba(0,0,0,0.25), 0 2px 8px rgba(0,0,0,0.15)",
            border: `1px solid ${style.border}40`,
            animation: exiting ? "toastOut 0.3s ease forwards" : "toastIn 0.4s ease forwards",
            cursor: "pointer",
            backdropFilter: "blur(12px)",
        }} onClick={dismiss}>
            <div style={{ display: "flex", alignItems: "flex-start", gap: 12 }}>
                <span style={{ fontSize: 22, flexShrink: 0, marginTop: 1 }}>{style.icon}</span>
                <div style={{ flex: 1 }}>
                    <div style={{ fontWeight: 700, fontSize: 15, marginBottom: 4, letterSpacing: "-0.01em" }}>
                        {toast.title}
                    </div>
                    <div style={{ fontSize: 13, opacity: 0.9, lineHeight: 1.5 }}>
                        {toast.message}
                    </div>
                </div>
                <button
                    onClick={(e) => { e.stopPropagation(); dismiss(); }}
                    style={{
                        background: "rgba(255,255,255,0.15)",
                        border: "none",
                        color: "#fff",
                        width: 24,
                        height: 24,
                        borderRadius: 6,
                        cursor: "pointer",
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "center",
                        fontSize: 14,
                        flexShrink: 0,
                        marginTop: -2,
                    }}
                >✕</button>
            </div>

            {/* Progress bar */}
            <div style={{
                position: "absolute",
                bottom: 0,
                left: 0,
                right: 0,
                height: 3,
                borderRadius: "0 0 14px 14px",
                overflow: "hidden",
            }}>
                <div style={{
                    height: "100%",
                    background: "rgba(255,255,255,0.4)",
                    animation: `toastProgress ${TOAST_DURATION}ms linear forwards`,
                }} />
            </div>
        </div>
    );
}

// CSS keyframes injected once
export function ToastStyles() {
    return (
        <style>{`
            @keyframes toastIn {
                from { opacity: 0; transform: translateX(100%) scale(0.95); }
                to { opacity: 1; transform: translateX(0) scale(1); }
            }
            @keyframes toastOut {
                from { opacity: 1; transform: translateX(0) scale(1); }
                to { opacity: 0; transform: translateX(100%) scale(0.95); }
            }
            @keyframes toastProgress {
                from { width: 100%; }
                to { width: 0%; }
            }
        `}</style>
    );
}

// Hook for easy toast management
export function useToast() {
    const [toast, setToast] = useState(null);

    const showToast = (key) => {
        const msg = TOAST_MESSAGES[key];
        if (msg) setToast(msg);
    };

    const showCustomToast = (type, title, message) => {
        setToast({ type, title, message });
    };

    const dismissToast = () => setToast(null);

    return { toast, showToast, showCustomToast, dismissToast };
}
