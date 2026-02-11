// Donation Receipt & 80G Tax Certificate — PDF Generator
// Uses jspdf for client-side PDF generation

import { jsPDF } from "jspdf";

/**
 * Generate a donation receipt / 80G tax deduction certificate
 * @param {Object} opts
 * @param {string} opts.donorName
 * @param {string} opts.email
 * @param {string} opts.phone
 * @param {number} opts.amount - in INR
 * @param {string} opts.paymentId - Razorpay payment ID
 * @param {string} opts.type - 'individual' or 'group'
 * @param {string} opts.paymentPreference - 'monthly' or 'annual'
 * @param {string} opts.date - ISO date string
 * @param {number} [opts.contributionId] - internal DB ID
 */
export function generateDonationReceipt({
    donorName,
    email,
    phone = "",
    amount,
    paymentId,
    type = "individual",
    paymentPreference = "monthly",
    date,
    contributionId,
}) {
    const doc = new jsPDF({ orientation: "portrait", unit: "mm", format: "a4" });
    const pageW = doc.internal.pageSize.getWidth();
    const margin = 20;
    const contentW = pageW - margin * 2;
    let y = 20;

    const receiptNo = `ILK-${new Date(date || Date.now()).getFullYear()}-${String(contributionId || Math.floor(Math.random() * 9999)).padStart(4, "0")}`;
    const receiptDate = new Date(date || Date.now()).toLocaleDateString("en-IN", {
        day: "numeric",
        month: "long",
        year: "numeric",
    });

    // ─── HEADER BAR ───
    doc.setFillColor(45, 80, 22); // C.green
    doc.rect(0, 0, pageW, 42, "F");

    doc.setTextColor(255, 255, 255);
    doc.setFont("helvetica", "bold");
    doc.setFontSize(24);
    doc.text("ilika", margin, y + 10);
    doc.setFontSize(10);
    doc.setFont("helvetica", "normal");
    doc.text("The Ilika Foundation", margin, y + 18);
    doc.setFontSize(8);
    doc.text("Empowering Girls Through Education", margin, y + 24);

    // Receipt number (right side)
    doc.setFontSize(9);
    doc.setFont("helvetica", "bold");
    doc.text(`Receipt No: ${receiptNo}`, pageW - margin, y + 10, { align: "right" });
    doc.setFont("helvetica", "normal");
    doc.text(`Date: ${receiptDate}`, pageW - margin, y + 18, { align: "right" });

    y = 52;

    // ─── TITLE ───
    doc.setTextColor(45, 80, 22);
    doc.setFont("helvetica", "bold");
    doc.setFontSize(16);
    doc.text("Donation Receipt", margin, y);
    doc.setFontSize(10);
    doc.setTextColor(100, 100, 100);
    doc.setFont("helvetica", "normal");
    doc.text("80G Tax Deduction Certificate", margin, y + 7);

    y += 18;

    // ─── DIVIDER ───
    doc.setDrawColor(220, 220, 220);
    doc.setLineWidth(0.3);
    doc.line(margin, y, pageW - margin, y);
    y += 8;

    // ─── DONOR INFO ───
    doc.setTextColor(80, 80, 80);
    doc.setFont("helvetica", "bold");
    doc.setFontSize(11);
    doc.text("Donor Information", margin, y);
    y += 8;

    doc.setFont("helvetica", "normal");
    doc.setFontSize(10);
    doc.setTextColor(60, 60, 60);

    const infoRows = [
        ["Name", donorName],
        ["Email", email],
        ...(phone ? [["Phone", phone]] : []),
        ["Sponsorship Type", type === "individual" ? "Individual Sponsorship" : "Group Sponsorship"],
        ["Payment Preference", paymentPreference === "annual" ? "Annual" : "Monthly"],
    ];

    infoRows.forEach(([label, value]) => {
        doc.setFont("helvetica", "bold");
        doc.setTextColor(120, 120, 120);
        doc.text(`${label}:`, margin, y);
        doc.setFont("helvetica", "normal");
        doc.setTextColor(40, 40, 40);
        doc.text(value, margin + 45, y);
        y += 7;
    });

    y += 6;

    // ─── PAYMENT DETAILS BOX ───
    doc.setFillColor(248, 246, 242); // cream bg
    doc.roundedRect(margin, y, contentW, 36, 3, 3, "F");

    doc.setFont("helvetica", "bold");
    doc.setFontSize(11);
    doc.setTextColor(45, 80, 22);
    doc.text("Payment Details", margin + 8, y + 9);

    doc.setFontSize(10);
    doc.setTextColor(60, 60, 60);
    doc.setFont("helvetica", "normal");

    doc.text("Amount:", margin + 8, y + 19);
    doc.setFont("helvetica", "bold");
    doc.setTextColor(45, 80, 22);
    doc.setFontSize(14);
    doc.text(`₹${amount.toLocaleString("en-IN")}`, margin + 35, y + 19);

    doc.setFontSize(9);
    doc.setFont("helvetica", "normal");
    doc.setTextColor(100, 100, 100);
    doc.text(`Razorpay ID: ${paymentId || "N/A"}`, margin + 8, y + 28);
    doc.text(`Transaction Date: ${receiptDate}`, pageW - margin - 8, y + 28, { align: "right" });

    y += 46;

    // ─── 80G SECTION ───
    doc.setDrawColor(220, 220, 220);
    doc.line(margin, y, pageW - margin, y);
    y += 10;

    doc.setFont("helvetica", "bold");
    doc.setFontSize(11);
    doc.setTextColor(45, 80, 22);
    doc.text("80G Tax Exemption Details", margin, y);
    y += 8;

    doc.setFont("helvetica", "normal");
    doc.setFontSize(9);
    doc.setTextColor(80, 80, 80);

    const taxInfo = [
        "This donation is eligible for tax deduction under Section 80G of the Income Tax Act, 1961.",
        "",
        "Organization: The Ilika Foundation",
        "PAN: AAETIXXX (To be updated with actual PAN)",
        "80G Registration No: AAETIXXX/80G/2024-25 (To be updated)",
        "80G Validity: Perpetuity / As per approval order",
        "",
        "The donor is entitled to claim tax deduction for 50% of the donation amount",
        "under Section 80G(5)(vi) of the Income Tax Act, subject to applicable limits.",
    ];

    taxInfo.forEach(line => {
        if (line === "") {
            y += 3;
        } else {
            doc.text(line, margin, y);
            y += 5;
        }
    });

    y += 10;

    // ─── SIGNATURE ───
    doc.setDrawColor(200, 200, 200);
    doc.line(margin, y, pageW - margin, y);
    y += 15;

    doc.setFont("helvetica", "normal");
    doc.setFontSize(9);
    doc.setTextColor(120, 120, 120);
    doc.text("For The Ilika Foundation", margin, y);
    y += 15;

    doc.setDrawColor(150, 150, 150);
    doc.line(margin, y, margin + 50, y);
    y += 5;
    doc.text("Authorized Signatory", margin, y);

    // Right side
    doc.setDrawColor(150, 150, 150);
    doc.line(pageW - margin - 50, y - 5, pageW - margin, y - 5);
    doc.text("Date & Seal", pageW - margin - 50, y);

    // ─── FOOTER ───
    y = doc.internal.pageSize.getHeight() - 20;
    doc.setDrawColor(220, 220, 220);
    doc.line(margin, y - 5, pageW - margin, y - 5);

    doc.setFontSize(7);
    doc.setTextColor(150, 150, 150);
    doc.setFont("helvetica", "normal");
    doc.text("This is a computer-generated receipt. For questions, contact: info@ilikafoundation.org", pageW / 2, y, { align: "center" });
    doc.text(`Generated on: ${new Date().toLocaleString("en-IN")}  |  Receipt: ${receiptNo}`, pageW / 2, y + 4, { align: "center" });

    // ─── DOWNLOAD ───
    doc.save(`Ilika-Receipt-${receiptNo}.pdf`);
    return receiptNo;
}

/**
 * Generate receipt for admin — takes a contribution object directly
 */
export function generateReceiptFromContribution(contrib) {
    return generateDonationReceipt({
        donorName: contrib.donor_name,
        email: contrib.email,
        phone: contrib.phone,
        amount: contrib.amount || 0,
        paymentId: contrib.razorpay_payment_id,
        type: contrib.type,
        paymentPreference: contrib.payment_preference,
        date: contrib.created_at,
        contributionId: contrib.id,
    });
}
