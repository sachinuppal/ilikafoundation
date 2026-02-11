// Donation Receipt — PDF Generator
// Matches the official Ilika Foundation receipt format
// Uses jspdf for client-side PDF generation

import { jsPDF } from "jspdf";
import { ILIKA_LOGO, SIGNATORY_STAMP } from "./invoiceAssets.js";

/**
 * Convert a number to Indian words (e.g. 96000 → "Rupees Ninety Six Thousand Only")
 */
function amountInWords(num) {
    const ones = ["", "One", "Two", "Three", "Four", "Five", "Six", "Seven", "Eight", "Nine",
        "Ten", "Eleven", "Twelve", "Thirteen", "Fourteen", "Fifteen", "Sixteen", "Seventeen", "Eighteen", "Nineteen"];
    const tens = ["", "", "Twenty", "Thirty", "Forty", "Fifty", "Sixty", "Seventy", "Eighty", "Ninety"];

    if (num === 0) return "Rupees Zero Only";
    let words = "";
    if (num >= 10000000) { words += amountInWordsHelper(Math.floor(num / 10000000)) + " Crore "; num %= 10000000; }
    if (num >= 100000) { words += amountInWordsHelper(Math.floor(num / 100000)) + " Lakh "; num %= 100000; }
    if (num >= 1000) { words += amountInWordsHelper(Math.floor(num / 1000)) + " Thousand "; num %= 1000; }
    if (num >= 100) { words += ones[Math.floor(num / 100)] + " Hundred "; num %= 100; }
    if (num > 0) { words += amountInWordsHelper(num); }
    return "Rupees " + words.trim() + " Only";
}

function amountInWordsHelper(num) {
    const ones = ["", "One", "Two", "Three", "Four", "Five", "Six", "Seven", "Eight", "Nine",
        "Ten", "Eleven", "Twelve", "Thirteen", "Fourteen", "Fifteen", "Sixteen", "Seventeen", "Eighteen", "Nineteen"];
    const tens = ["", "", "Twenty", "Thirty", "Forty", "Fifty", "Sixty", "Seventy", "Eighty", "Ninety"];
    if (num < 20) return ones[num];
    return tens[Math.floor(num / 10)] + (num % 10 ? " " + ones[num % 10] : "");
}

/**
 * Generate a donation receipt matching the official Ilika Foundation format
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
 * @param {string} [opts.panNumber] - donor's PAN
 * @param {string} [opts.donorType] - 'individual' or 'corporate'
 * @param {string} [opts.company] - company name
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
    panNumber = "",
    donorType = "individual",
    company = "",
}) {
    const doc = new jsPDF({ orientation: "portrait", unit: "mm", format: "a4" });
    const pageW = doc.internal.pageSize.getWidth();
    const pageH = doc.internal.pageSize.getHeight();
    const margin = 18;
    const contentW = pageW - margin * 2;

    const receiptNo = String(contributionId || Math.floor(Math.random() * 999)).padStart(3, "0");
    const receiptDate = new Date(date || Date.now()).toLocaleDateString("en-IN", {
        day: "2-digit", month: "2-digit", year: "numeric",
    });

    // ─── BLUE BACKGROUND ───
    const bgColor = [182, 210, 230]; // light blue similar to the receipt
    doc.setFillColor(...bgColor);
    doc.rect(0, 0, pageW, pageH, "F");

    // ─── WHITE CONTENT AREA ───
    const boxX = 12, boxY = 12, boxW = pageW - 24, boxH = pageH - 24;
    doc.setFillColor(255, 255, 255);
    doc.setDrawColor(100, 140, 180);
    doc.setLineWidth(0.5);
    doc.roundedRect(boxX, boxY, boxW, boxH, 3, 3, "FD");

    let y = 22;

    // ─── HEADER — Logo + Organization Name ───
    // Actual Ilika logo image
    try {
        doc.addImage(ILIKA_LOGO, "PNG", margin, y - 2, 24, 24);
    } catch (e) {
        // Fallback circle if image fails
        doc.setFillColor(182, 210, 230);
        doc.circle(margin + 12, y + 10, 10, "F");
    }

    // Organization name
    doc.setFont("helvetica", "bold");
    doc.setFontSize(18);
    doc.setTextColor(40, 70, 110);
    doc.text("Twelve Ten Empowering Possibilities Foundation", margin + 28, y + 8);

    y += 28;

    // ─── ORG CONTACT INFO ROW ───
    doc.setFont("helvetica", "normal");
    doc.setFontSize(9);
    doc.setTextColor(40, 40, 40);

    // Left column
    doc.setFont("helvetica", "bold");
    doc.text("Phone No:", margin, y);
    doc.setFont("helvetica", "normal");
    doc.text("+91 98700 17184", margin + 22, y);
    y += 5;
    doc.setFont("helvetica", "bold");
    doc.text("Email ID:", margin, y);
    doc.setFont("helvetica", "normal");
    doc.text("contact@ilikafoundation.org", margin + 22, y);

    // Right column — Org PAN, 80G, Darpan
    const rightX = pageW / 2 + 15;
    let ry = y - 5;
    doc.setFont("helvetica", "bold");
    doc.text("PAN No:", rightX, ry);
    doc.setFont("helvetica", "normal");
    doc.text("AAKCT8082C", rightX + 25, ry);
    ry += 5;
    doc.setFont("helvetica", "bold");
    doc.text("Section 80G Reg No:", rightX, ry);
    doc.setFont("helvetica", "normal");
    doc.text("AAKCT8082CF20241*", rightX + 38, ry);
    ry += 5;
    doc.setFont("helvetica", "bold");
    doc.text("Darpan ID:", rightX, ry);
    doc.setFont("helvetica", "normal");
    doc.text("MH/2024/0399458", rightX + 25, ry);

    y += 12;

    // ─── DIVIDER ───
    doc.setDrawColor(100, 140, 180);
    doc.setLineWidth(0.3);
    doc.line(margin, y, pageW - margin, y);
    y += 12;

    // ─── DONATION RECEIPT TITLE ───
    doc.setFont("helvetica", "bold");
    doc.setFontSize(20);
    doc.setTextColor(40, 40, 40);
    doc.text("Donation Receipt", pageW / 2, y, { align: "center" });
    y += 14;

    // ─── RECEIPT NO + DATE ROW ───
    doc.setFontSize(11);
    doc.setFont("helvetica", "bold");
    doc.setTextColor(40, 40, 40);
    doc.text(`Receipt No. ${receiptNo}`, margin, y);
    doc.text(`Date: ${receiptDate}`, pageW - margin, y, { align: "right" });
    y += 14;

    // ─── "Received with thanks from:" ───
    doc.setFont("helvetica", "bold");
    doc.setFontSize(11);
    doc.setTextColor(40, 40, 40);
    doc.text("Received with thanks from:", margin, y);
    y += 12;

    // ─── DONOR INFO ROWS ───
    doc.setFontSize(10);
    const labelX = margin;
    const valueX = margin + 42;

    const rows = [
        ["Name:", donorName],
        ...(donorType === "corporate" && company ? [["Company:", company]] : []),
        ...(phone ? [["Contact Number:", phone]] : []),
        ["Email ID:", email],
        ...(panNumber ? [["PAN:", panNumber]] : []),
        ["Amount Received:", `INR ${amount.toLocaleString("en-IN")}/-`],
        ["Amount in Words:", amountInWords(amount)],
        ["Payment Mode:", "Razorpay Online"],
        ["Payment Details:", paymentId || "N/A"],
    ];

    rows.forEach(([label, value]) => {
        doc.setFont("helvetica", "bold");
        doc.setTextColor(40, 40, 40);
        doc.text(label, labelX, y);
        doc.setFont("helvetica", "normal");
        // Handle long values by wrapping
        const maxW = pageW - margin - valueX;
        const lines = doc.splitTextToSize(value, maxW);
        doc.text(lines, valueX, y);
        y += lines.length * 5 + 3;
    });

    y += 6;

    // ─── AUTHORIZED SIGNATORY SECTION ───
    y += 4;

    // Actual signatory stamp + signature image
    const stampImgW = 70;
    const stampImgH = 22;
    const stampImgX = pageW - margin - stampImgW;
    try {
        doc.addImage(SIGNATORY_STAMP, "PNG", stampImgX, y - 2, stampImgW, stampImgH);
    } catch (e) {
        // Fallback text if image fails
        doc.setFont("helvetica", "italic");
        doc.setFontSize(8);
        doc.text("[Stamp & Signature]", pageW - margin, y + 10, { align: "right" });
    }

    y += stampImgH + 2;

    // ─── PAGE 2: TERMS & CONDITIONS ───
    doc.addPage();

    // Light blue background for page 2
    doc.setFillColor(...bgColor);
    doc.rect(0, 0, pageW, pageH, "F");

    // White content area for page 2
    doc.setFillColor(255, 255, 255);
    doc.setDrawColor(100, 140, 180);
    doc.setLineWidth(0.5);
    doc.roundedRect(boxX, boxY, boxW, boxH, 3, 3, "FD");

    y = 30;

    doc.setFont("helvetica", "bold");
    doc.setFontSize(11);
    doc.setTextColor(40, 40, 40);
    doc.text("Terms & Conditions", margin, y);
    doc.setDrawColor(40, 40, 40);
    doc.setLineWidth(0.3);
    doc.line(margin, y + 1.5, margin + 38, y + 1.5); // underline
    y += 12;

    doc.setFont("helvetica", "normal");
    doc.setFontSize(9);
    doc.setTextColor(60, 60, 60);
    const terms = [
        "1.  Cheque/DD is subject to realization",
        "2.  PAN is compulsory for issuance of 80G receipts",
        "3.  We have received a provisional 80G registration certificate that is valid till AY2027-28.",
        "     We will apply for the final registration before the validity of this certificate ends,",
        "     as per prevailing regulations.",
        "4.  Deduction under Section 80G is subject to verification from Form 10BE issued annually.",
        "5.  Eligible for 50% deduction under Section 80G of the Income Tax Act, 1961 (subject to qualifying limits).",
    ];
    terms.forEach(line => {
        doc.text(line, margin, y);
        y += 6;
    });

    // ─── FOOTER (page 2 bottom) ───
    y = pageH - 30;
    doc.setDrawColor(100, 140, 180);
    doc.setLineWidth(0.3);
    doc.line(margin, y, pageW - margin, y);
    y += 7;

    doc.setFontSize(8);
    doc.setFont("helvetica", "normal");
    doc.setTextColor(40, 70, 110);
    doc.text("contact@ilikafoundation.org  |  www.ilikafoundation.org", pageW / 2, y, { align: "center" });
    y += 6;
    doc.setFontSize(7);
    doc.setTextColor(60, 60, 60);
    doc.text("Twelve Ten Empowering Possibilities Foundation", pageW / 2, y, { align: "center" });
    y += 4;
    doc.setFontSize(6.5);
    doc.text("396/10 Nirmal, Flat No. 4, North Avenue Road, Santacruz (West), Mumbai - 400054", pageW / 2, y, { align: "center" });

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
        panNumber: contrib.pan_number || "",
        donorType: contrib.donor_type || "individual",
        company: contrib.company || "",
    });
}
