import { useState, useEffect, useRef } from "react";
import { useNavigate } from "react-router-dom";
import {
  C, Heart, Users, User, Check, Arrow, Leaf, Quote, Star, Shield, BookOpen,
  Handshake, TrendUp, Clock, Facepile, LiveTicker, GlobalStyles,
  CampaignProgress, RecentSupporters, UrgencyBanner, GirlsProgress, TopDonors,
  inp, lbl, Share
} from "./shared.jsx";
import { createIndividualContribution, createGroup, getCampaignStats, updatePaymentStatus, cancelContribution, getReferralStats } from "./dataService.js";
import { openRazorpayCheckout, isRazorpayConfigured } from "./razorpayService.js";
import { generateDonationReceipt } from "./invoiceService.js";
import { StatusToast, ToastStyles, useToast } from "./statusToast.jsx";
import { getContent, getContentJSON, loadContentFromDB } from "./siteContent.js";
import ilikaLogo from "./assets/ilika-logo.png";

export default function IlikaCampaign() {
  const navigate = useNavigate();
  const [opt, setOpt] = useState(null);
  const [indF, setIndF] = useState({ name: "", email: "", phone: "", company: "", payment: "monthly", panNumber: "", donorType: "individual" });
  const [grpF, setGrpF] = useState({ name: "", email: "", phone: "" });
  const [done, setDone] = useState(false);
  const [m, setM] = useState(false);
  const [stats, setStats] = useState({
    totalSponsors: Number(getContent("stats_total_sponsors_offset")) || 0,
    girlsSponsored: Number(getContent("stats_girls_sponsored_offset")) || 0,
    individualCount: Number(getContent("stats_individual_count_offset")) || 0,
    groupCount: Number(getContent("stats_group_count_offset")) || 0,
  });
  const [submitting, setSubmitting] = useState(false);
  const [paymentProcessing, setPaymentProcessing] = useState(false);
  const [lastPayment, setLastPayment] = useState(null);
  const [showModal, setShowModal] = useState(false);
  const [showRetention, setShowRetention] = useState(false);
  const [referredBy, setReferredBy] = useState(null);
  const [referralLeaders, setReferralLeaders] = useState([]);
  const sponsorRef = useRef(null);
  const { toast, showToast, showCustomToast, dismissToast } = useToast();

  useEffect(() => {
    setM(true);
    // Capture referral code from URL
    const params = new URLSearchParams(window.location.search);
    const ref = params.get("ref");
    if (ref) setReferredBy(ref.trim());
    loadContentFromDB().then(() => loadStats());
  }, []);

  const scrollToSponsor = () => { sponsorRef.current?.scrollIntoView({ behavior: "smooth" }); };

  async function loadStats() {
    try {
      const s = await getCampaignStats();
      setStats({
        totalSponsors: Number(getContent("stats_total_sponsors_offset")) + s.totalSponsors,
        girlsSponsored: Number(getContent("stats_girls_sponsored_offset")) + s.girlsSponsored,
        individualCount: Number(getContent("stats_individual_count_offset")) + s.individualCount,
        groupCount: Number(getContent("stats_group_count_offset")) + s.groupCount,
      });
    } catch (e) { /* keep defaults */ }
    // Load referral leaderboard
    try {
      const leaders = await getReferralStats();
      setReferralLeaders(leaders.filter(l => l.conversions > 0).slice(0, 10));
    } catch (e) { /* silent */ }
  }

  const submitInd = async () => {
    if (!indF.name || !indF.email || !indF.phone) return;
    setSubmitting(true);
    try {
      const contrib = await createIndividualContribution({ ...indF, referredBy });
      setSubmitting(false);
      setPaymentProcessing(true);
      // Open Razorpay checkout
      openRazorpayCheckout({
        amount: indF.payment === "annual" ? 96000 : 8000,
        name: indF.name,
        email: indF.email,
        phone: indF.phone,
        description: indF.payment === "annual" ? "Ilika Fellowship — Annual Sponsorship" : "Ilika Fellowship — Monthly Sponsorship",
        paymentType: "individual",
        paymentPreference: indF.payment,
        onSuccess: async (response) => {
          try {
            await updatePaymentStatus(contrib.id, response.razorpay_payment_id, "Success");
          } catch (e) { console.error("Failed to update payment status:", e); }
          setLastPayment({ id: contrib.id, paymentId: response.razorpay_payment_id, referralCode: contrib.referral_code });
          setPaymentProcessing(false);
          setDone(true);
          showToast("payment_success");
        },
        onFailure: (err) => {
          setPaymentProcessing(false);
          // Cancel the pending contribution in DB
          cancelContribution(contrib.id).catch(() => { });
          if (err.message !== "Payment cancelled by user") {
            showToast("payment_failed");
          } else {
            showCustomToast("info", "Payment Cancelled", "No charges were made. You can try again anytime.");
          }
        },
      });
    } catch (err) {
      showCustomToast("failed", "Submission Error", err.message);
      setSubmitting(false);
    }
  };

  const submitGrp = async () => {
    if (!grpF.name || !grpF.email || !grpF.phone) return;
    setSubmitting(true);
    try {
      const group = await createGroup(grpF);
      setSubmitting(false);
      setPaymentProcessing(true);
      // Open Razorpay for initial group contribution
      openRazorpayCheckout({
        amount: 2000,
        name: grpF.name,
        email: grpF.email,
        phone: grpF.phone,
        description: "Ilika Fellowship — Group Sponsorship (₹2,000/person)",
        paymentType: "group",
        paymentPreference: "monthly",
        onSuccess: async () => {
          setPaymentProcessing(false);
          showToast("payment_success");
          setTimeout(() => navigate(`/group/${group.slug}`), 1500);
        },
        onFailure: (err) => {
          setPaymentProcessing(false);
          // Cancel the pending group contribution
          cancelContribution(group.initiator_contribution_id || 0).catch(() => { });
          if (err.message !== "Payment cancelled by user") {
            showToast("payment_failed");
          } else {
            showCustomToast("info", "Payment Cancelled", "Your group was created but payment was not completed. You can pay later from the group page.");
          }
          // Still navigate to group page so they can complete payment later
          navigate(`/group/${group.slug}`);
        },
      });
    } catch (err) {
      alert("Error: " + err.message);
      setSubmitting(false);
    }
  };

  const an = (d = 0) => ({ opacity: m ? 1 : 0, transform: m ? "translateY(0)" : "translateY(24px)", transition: `all 0.9s cubic-bezier(0.16,1,0.3,1) ${d}s` });
  const secStyle = { maxWidth: 760, margin: "0 auto", padding: "0 28px" };

  return (
    <div style={{ minHeight: "100vh", background: C.bg, color: C.td, fontFamily: "'DM Sans', sans-serif", overflow: "hidden" }}>
      <link href="https://fonts.googleapis.com/css2?family=Playfair+Display:ital,wght@0,400;0,500;0,600;0,700;1,400;1,500;1,600&family=DM+Sans:wght@300;400;500;600;700&display=swap" rel="stylesheet" />
      <GlobalStyles />
      <ToastStyles />
      <StatusToast toast={toast} onDismiss={dismissToast} />

      {/* Ambient */}
      <div style={{ position: "fixed", inset: 0, pointerEvents: "none" }}>
        <div style={{ position: "absolute", top: "-15%", right: "-5%", width: 500, height: 500, background: `radial-gradient(circle, ${C.green}06 0%, transparent 70%)`, borderRadius: "50%" }} />
        <div style={{ position: "absolute", bottom: "-10%", left: "-8%", width: 400, height: 400, background: `radial-gradient(circle, ${C.gold}06 0%, transparent 70%)`, borderRadius: "50%" }} />
      </div>

      <div style={{ position: "relative", zIndex: 1 }}>
        {/* Nav with Facepile */}
        <nav style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "16px 28px", maxWidth: 1100, margin: "0 auto" }}>
          <img src={ilikaLogo} alt="Ilika Foundation" style={{ height: 96, width: "auto" }} />
          <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
            <Facepile count={4} size={24} />
            <span style={{ fontSize: 12, color: C.tl, fontWeight: 500 }}>{stats.totalSponsors} sponsors</span>
          </div>
        </nav>

        {/* ============ HERO ============ */}
        <section style={{ maxWidth: 1100, margin: "0 auto", padding: "40px 28px 32px", ...an(0) }}>
          <div style={{ display: "flex", alignItems: "center", gap: 48, flexWrap: "wrap" }}>
            {/* Left - Text content */}
            <div style={{ flex: "1 1 420px", minWidth: 320 }}>
              <div style={{ marginBottom: 20 }}><LiveTicker /></div>
              <div style={{ display: "inline-flex", alignItems: "center", gap: 8, padding: "7px 20px", borderRadius: 24, background: C.greenS, marginBottom: 24, fontSize: 13, color: C.green, fontWeight: 500 }}><Leaf s={14} /> {getContent("hero_tagline")}</div>
              <h1 style={{ fontFamily: "'Playfair Display', serif", fontSize: "clamp(28px, 4vw, 46px)", lineHeight: 1.15, marginBottom: 20, fontWeight: 400, color: C.green }}>
                {getContent("hero_heading_1")}<br />{getContent("hero_heading_2")}<br /><span style={{ fontStyle: "italic", color: C.gold }}>{getContent("hero_heading_3")}<br />{getContent("hero_heading_4")}</span>
              </h1>
              <p style={{ fontSize: "clamp(14px, 1.8vw, 17px)", lineHeight: 1.8, color: C.tm, maxWidth: 480, marginBottom: 28, fontWeight: 300 }}>
                {getContent("hero_description")}
              </p>
              {/* Hero CTAs with pricing — equal width, side by side */}
              <div style={{ display: "flex", gap: 12, marginBottom: 24 }}>
                <button onClick={() => { setOpt(1); setDone(false); setShowModal(true); setShowRetention(false); scrollToSponsor(); }} style={{ flex: 1, background: `linear-gradient(135deg,${C.gold},${C.goldL})`, color: C.white, border: "none", padding: "14px 16px", borderRadius: 8, fontSize: 15, fontWeight: 600, cursor: "pointer", fontFamily: "inherit", display: "flex", alignItems: "center", justifyContent: "center", gap: 8, boxShadow: `0 4px 20px ${C.gold}33`, whiteSpace: "nowrap" }}>Sponsor a Girl — {"\u20B9"}8,000/mo <Arrow /></button>
                <button onClick={() => { setOpt(2); setDone(false); setShowModal(true); setShowRetention(false); scrollToSponsor(); }} style={{ flex: 1, background: C.white, color: C.green, border: `2px solid ${C.green}`, padding: "14px 16px", borderRadius: 8, fontSize: 15, fontWeight: 600, cursor: "pointer", fontFamily: "inherit", display: "flex", alignItems: "center", justifyContent: "center", gap: 8, whiteSpace: "nowrap" }}>Split with Friends — {"\u20B9"}2,000/mo <Users s={16} /></button>
              </div>
              <p style={{ fontSize: 12, color: C.tl, marginBottom: 0 }}>80G tax exemption {"\u00B7"} Secure Razorpay {"\u00B7"} Cancel anytime</p>
            </div>
            {/* Right - Hero image */}
            <div style={{ flex: "1 1 340px", minWidth: 280, maxWidth: 440, position: "relative" }}>
              <div style={{ borderRadius: 24, overflow: "hidden", boxShadow: "0 8px 40px rgba(45,80,22,0.12)", border: `3px solid ${C.white}`, position: "relative" }}>
                <img src={getContent("hero_image_url")} alt="Ilika Fellow" style={{ width: "100%", height: "auto", display: "block", objectFit: "cover" }} />
                <div style={{ position: "absolute", bottom: 0, left: 0, right: 0, background: "linear-gradient(transparent, rgba(45,80,22,0.85))", padding: "48px 24px 20px", color: C.white }}>
                  <div style={{ fontSize: 14, fontWeight: 600, marginBottom: 4 }}>Her story can change.</div>
                  <div style={{ fontSize: 12, opacity: 0.85 }}>With your support, she'll rise.</div>
                </div>
              </div>
              {/* Floating badge */}
              <div style={{ position: "absolute", top: -12, right: -12, background: C.gold, color: C.white, borderRadius: 12, padding: "10px 16px", fontSize: 12, fontWeight: 600, boxShadow: "0 4px 16px rgba(200,150,46,0.3)", display: "flex", alignItems: "center", gap: 6, zIndex: 2 }}><Heart s={14} /> {stats.girlsSponsored}+ Futures Changed</div>
            </div>
          </div>
        </section>

        {/* ============ CAMPAIGN PROGRESS + URGENCY + GIRLS TICKER ============ */}
        <section style={{ ...secStyle, padding: "16px 28px", ...an(0.08) }}>
          <CampaignProgress />
          <GirlsProgress />
          <div style={{ marginTop: 12 }}><UrgencyBanner /></div>
        </section>

        {/* ============ ORIGIN STORY ============ */}
        <section style={{ ...secStyle, padding: "48px 28px", ...an(0.12) }}>
          <div style={{ background: C.white, borderRadius: 20, padding: "40px 36px", border: `1px solid ${C.brdL}`, boxShadow: "0 2px 12px rgba(0,0,0,0.03)", position: "relative", overflow: "hidden" }}>
            <div style={{ position: "absolute", top: 20, right: 24, color: C.green }}><Quote s={48} /></div>
            <div style={{ fontSize: 11, textTransform: "uppercase", letterSpacing: 2, color: C.gold, fontWeight: 600, marginBottom: 16 }}>How It Started</div>
            <p style={{ fontFamily: "'Playfair Display', serif", fontSize: "clamp(18px, 2.5vw, 24px)", lineHeight: 1.6, color: C.green, marginBottom: 20, fontWeight: 400, maxWidth: 600 }}>
              {getContent("origin_para_1")}
            </p>
            <p style={{ fontSize: 15, lineHeight: 1.8, color: C.tm, marginBottom: 16 }}>
              {getContent("origin_para_2")}
            </p>
            <p style={{ fontSize: 15, lineHeight: 1.8, color: C.tm, marginBottom: 0, fontStyle: "italic" }}>
              {getContent("origin_para_3")}
            </p>
            <div style={{ display: "flex", flexWrap: "wrap", gap: 16, marginTop: 24, paddingTop: 24, borderTop: `1px solid ${C.brdL}` }}>
              {(() => {
                const linkedInMap = {
                  "Akshay Lalchandani": "https://www.linkedin.com/in/akshay-lalchandani-6676b3147/",
                  "Malay Shah": "https://www.linkedin.com/in/malay-samir-shah/",
                  "Anisha Patnaik": "https://www.linkedin.com/in/anishapatnaik/",
                };
                return getContentJSON("founders").map((f, i) => {
                  const li = linkedInMap[f.name] || f.linkedin || null;
                  return (
                    <a key={i} href={li || "#"} target="_blank" rel="noopener noreferrer" style={{ display: "flex", alignItems: "center", gap: 10, textDecoration: "none", cursor: li ? "pointer" : "default" }}>
                      <img src={f.img} alt={f.name} style={{ width: 40, height: 40, borderRadius: "50%", objectFit: "cover", border: `2px solid ${C.brdL}` }} />
                      <div>
                        <div style={{ fontSize: 13, fontWeight: 600, color: C.td, display: "flex", alignItems: "center", gap: 4 }}>
                          {f.name}
                          {li && <svg width="14" height="14" viewBox="0 0 24 24" fill="#0A66C2" style={{ flexShrink: 0 }}><path d="M20.447 20.452h-3.554v-5.569c0-1.328-.027-3.037-1.852-3.037-1.853 0-2.136 1.445-2.136 2.939v5.667H9.351V9h3.414v1.561h.046c.477-.9 1.637-1.85 3.37-1.85 3.601 0 4.267 2.37 4.267 5.455v6.286zM5.337 7.433a2.062 2.062 0 01-2.063-2.065 2.064 2.064 0 112.063 2.065zm1.782 13.019H3.555V9h3.564v11.452zM22.225 0H1.771C.792 0 0 .774 0 1.729v20.542C0 23.227.792 24 1.771 24h20.451C23.2 24 24 23.227 24 22.271V1.729C24 .774 23.2 0 22.222 0h.003z" /></svg>}
                        </div>
                        <div style={{ fontSize: 11, color: C.tl }}>{f.role}</div>
                      </div>
                    </a>
                  );
                });
              })()}
            </div>
          </div>
        </section>

        {/* ============ THE GAP — EMOTIONAL DATA ============ */}
        <section style={{ ...secStyle, padding: "48px 28px", ...an(0.16) }}>
          <div style={{ textAlign: "center", marginBottom: 32 }}>
            <div style={{ fontSize: 11, textTransform: "uppercase", letterSpacing: 2, color: C.gold, fontWeight: 600, marginBottom: 12 }}>The Opportunity Gap</div>
            <h2 style={{ fontFamily: "'Playfair Display', serif", fontSize: "clamp(24px, 3.5vw, 36px)", lineHeight: 1.25, color: C.green, marginBottom: 16 }}>It's not a lack of talent.<br />It's the cost of a seat in the classroom.</h2>
            <p style={{ fontSize: 15, lineHeight: 1.8, color: C.tm, maxWidth: 560, margin: "0 auto" }}>Less than 29% of Indian youth enroll in higher education. For girls from low-income families, the barriers go far beyond tuition — it's the absence of mentorship, technology, exposure, and someone who says "you belong here."</p>
          </div>
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(160px, 1fr))", gap: 16 }}>
            {getContentJSON("opportunity_gap_stats").map((d, i) => (
              <div key={i} style={{ background: C.white, borderRadius: 14, padding: "20px 16px", border: `1px solid ${C.brdL}`, textAlign: "center" }}>
                <div style={{ fontFamily: "'Playfair Display', serif", fontSize: 28, color: i === 3 ? C.gold : C.green, fontWeight: 600, marginBottom: 4 }}>{d.num}</div>
                <div style={{ fontSize: 13, color: C.td, fontWeight: 500, marginBottom: 4, lineHeight: 1.4 }}>{d.label}</div>
                <div style={{ fontSize: 11, color: C.tl, lineHeight: 1.4 }}>{d.sub}</div>
              </div>
            ))}
          </div>
        </section>

        {/* ============ FELLOWSHIP PILLARS ============ */}
        <section style={{ ...secStyle, padding: "48px 28px", ...an(0.2) }}>
          <div style={{ textAlign: "center", marginBottom: 32 }}>
            <div style={{ fontSize: 11, textTransform: "uppercase", letterSpacing: 2, color: C.gold, fontWeight: 600, marginBottom: 12 }}>The Ilika Fellowship</div>
            <h2 style={{ fontFamily: "'Playfair Display', serif", fontSize: "clamp(22px, 3.5vw, 32px)", lineHeight: 1.25, color: C.green, marginBottom: 16 }}>You're not paying for a degree.<br />You're building an ecosystem around her.</h2>
          </div>
          <div style={{ display: "grid", gridTemplateColumns: "repeat(2, 1fr)", gap: 16 }}>
            {[
              { icon: <BookOpen s={22} />, title: "Guided", desc: "Paired with a dedicated guide through every challenge and milestone of her undergraduate journey.", color: C.green },
              { icon: <Heart s={22} />, title: "Nurtured", desc: "Beyond tuition — learning tools, life skills coaching, well-being support, and holistic development.", color: C.gold },
              { icon: <Users s={22} />, title: "Connected", desc: "Lifelong access to mentors, experts, and industry leaders. Doors that talent alone cannot open.", color: C.greenM },
              { icon: <TrendUp s={22} />, title: "Empowered", desc: "Career training, internships, and real-world exposure. She graduates ready to lead.", color: "#6B8B9E" },
            ].map((p, i) => (
              <div key={i} style={{ background: C.white, borderRadius: 14, padding: "24px 20px", border: `1px solid ${C.brdL}` }}>
                <div style={{ width: 44, height: 44, borderRadius: 12, background: `${p.color}10`, display: "flex", alignItems: "center", justifyContent: "center", color: p.color, marginBottom: 16 }}>{p.icon}</div>
                <h4 style={{ fontSize: 16, fontWeight: 600, color: C.td, marginBottom: 8 }}>{p.title}</h4>
                <p style={{ fontSize: 14, lineHeight: 1.7, color: C.tl, margin: 0 }}>{p.desc}</p>
              </div>
            ))}
          </div>
          {/* Karmic Pledge */}
          <div style={{ marginTop: 20, background: `linear-gradient(135deg,${C.green},${C.greenL})`, borderRadius: 14, padding: "24px 28px", color: C.white, textAlign: "center" }}>
            <div style={{ fontSize: 11, textTransform: "uppercase", letterSpacing: 2, opacity: 0.7, marginBottom: 8 }}>The Karmic Pledge</div>
            <p style={{ fontFamily: "'Playfair Display', serif", fontSize: "clamp(15px, 2vw, 19px)", lineHeight: 1.6, margin: 0, fontWeight: 400, fontStyle: "italic", maxWidth: 500, marginLeft: "auto", marginRight: "auto" }}>"{getContent("karmic_pledge_quote")}"</p>
            <p style={{ fontSize: 12, marginTop: 10, opacity: 0.75 }}>{getContent("karmic_pledge_sub")}</p>
          </div>
        </section>

        {/* ============ TESTIMONIAL + TOP DONORS + RECENT SUPPORTERS ============ */}
        <section style={{ ...secStyle, padding: "48px 28px", ...an(0.24) }}>
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(300px, 1fr))", gap: 20 }}>
            {/* Testimonials — stacked vertically */}
            <div style={{ display: "flex", flexDirection: "column", gap: 20 }}>
              {[
                { initial: "K", name: getContent("testimonial_name"), role: getContent("testimonial_role"), quote: getContent("testimonial_quote"), story: getContent("testimonial_story"), closing: getContent("testimonial_closing") },
                { initial: "S", name: "Sajiya Khan", role: "Ilika Fellow", quote: "I'm deeply grateful to Ilika for supporting my education.", story: "Before their help, my family struggled to make ends meet, and my parents were worried about my future. Ilika not only sponsored my education but also provided additional courses and training that boosted my confidence and helped me grow overall. Because of their support, I've learned new skills and made great progress in my studies.", closing: "I feel proud and thankful to be a part of Ilika." },
              ].map((t, i) => (
                <div key={i} style={{ background: C.white, borderRadius: 16, padding: "28px 24px", border: `1px solid ${C.brdL}`, position: "relative" }}>
                  <div style={{ position: "absolute", top: 16, left: 20, color: C.gold }}><Quote s={36} /></div>
                  <div style={{ display: "flex", alignItems: "center", gap: 12, marginBottom: 16 }}>
                    <div style={{ width: 44, height: 44, borderRadius: "50%", background: C.gold, display: "flex", alignItems: "center", justifyContent: "center", color: "#fff", fontSize: 16, fontWeight: 600 }}>{t.initial}</div>
                    <div><div style={{ fontWeight: 600, color: C.td }}>{t.name}</div><div style={{ fontSize: 12, color: C.tl }}>{t.role}</div></div>
                    <div style={{ marginLeft: "auto", display: "flex", gap: 2, color: C.gold }}>{[1, 2, 3, 4, 5].map(j => <Star key={j} />)}</div>
                  </div>
                  <p style={{ fontFamily: "'Playfair Display', serif", fontSize: 16, lineHeight: 1.7, color: C.green, marginBottom: 12 }}>"{t.quote}"</p>
                  <p style={{ fontSize: 13, lineHeight: 1.7, color: C.tm, marginBottom: 12 }}>{t.story}</p>
                  <div style={{ padding: "10px 14px", background: C.greenS, borderRadius: 8, fontSize: 12, color: C.green, fontStyle: "italic" }}>"{t.closing}"</div>
                </div>
              ))}
            </div>
            {/* Top Donors + Recent Supporters */}
            <div style={{ display: "flex", flexDirection: "column", gap: 20 }}>
              <div style={{ background: C.white, borderRadius: 16, padding: "24px 24px", border: `1px solid ${C.brdL}` }}>
                <TopDonors />
              </div>
              <div style={{ background: C.white, borderRadius: 16, padding: "24px 24px", border: `1px solid ${C.brdL}` }}>
                <RecentSupporters limit={5} />
              </div>
            </div>
          </div>
        </section>

        {/* ============ REFERRAL LEADERBOARD ============ */}
        {referralLeaders.length > 0 && (
          <section style={{ ...secStyle, padding: "48px 28px", ...an(0.26) }}>
            <div style={{ background: C.white, borderRadius: 16, padding: "28px 24px", border: `1px solid ${C.brdL}` }}>
              <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 20 }}>
                <div style={{ width: 36, height: 36, borderRadius: "50%", background: `linear-gradient(135deg, ${C.gold}, #F59E0B)`, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 18 }}>🏆</div>
                <div>
                  <h3 style={{ fontFamily: "'Playfair Display', serif", fontSize: 18, margin: 0, color: C.green }}>Impact Champions</h3>
                  <p style={{ fontSize: 12, color: C.tl, margin: 0 }}>Donors who brought others to the cause</p>
                </div>
              </div>
              <div style={{ overflowX: "auto" }}>
                <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 13 }}>
                  <thead>
                    <tr style={{ borderBottom: `2px solid ${C.brdL}` }}>
                      <th style={{ textAlign: "left", padding: "10px 12px", color: C.tl, fontWeight: 600, fontSize: 11, textTransform: "uppercase", letterSpacing: 1 }}>#</th>
                      <th style={{ textAlign: "left", padding: "10px 12px", color: C.tl, fontWeight: 600, fontSize: 11, textTransform: "uppercase", letterSpacing: 1 }}>Donor Name</th>
                      <th style={{ textAlign: "center", padding: "10px 12px", color: C.tl, fontWeight: 600, fontSize: 11, textTransform: "uppercase", letterSpacing: 1 }}>Donors Invited</th>
                      <th style={{ textAlign: "right", padding: "10px 12px", color: C.tl, fontWeight: 600, fontSize: 11, textTransform: "uppercase", letterSpacing: 1 }}>Funding Raised</th>
                    </tr>
                  </thead>
                  <tbody>
                    {referralLeaders.map((r, i) => (
                      <tr key={r.code} style={{ borderBottom: `1px solid ${C.brdL}`, background: i === 0 ? `${C.gold}08` : "transparent" }}>
                        <td style={{ padding: "12px", fontWeight: 700, color: i < 3 ? C.gold : C.tl }}>{i === 0 ? "🥇" : i === 1 ? "🥈" : i === 2 ? "🥉" : i + 1}</td>
                        <td style={{ padding: "12px", fontWeight: 600, color: C.td }}>{r.name}</td>
                        <td style={{ padding: "12px", textAlign: "center", fontWeight: 600, color: C.green }}>{r.conversions}</td>
                        <td style={{ padding: "12px", textAlign: "right", fontWeight: 600, color: C.td }}>{"\u20B9"}{r.fundingRaised.toLocaleString("en-IN")}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          </section>
        )}

        {/* ============ TRUST SIGNALS — 80G + Section 8 only ============ */}
        <section style={{ ...secStyle, padding: "24px 28px", ...an(0.28) }}>
          <div style={{ display: "flex", flexWrap: "wrap", justifyContent: "center", gap: 12 }}>
            <a href="https://www.ilikafoundation.org/_files/ugd/e3859a_b8ae915404fb40db8afd8324792046b1.pdf" target="_blank" rel="noopener noreferrer" style={{ display: "flex", alignItems: "center", gap: 6, padding: "8px 18px", borderRadius: 20, background: C.white, border: `1px solid ${C.brdL}`, fontSize: 13, color: C.green, textDecoration: "none", fontWeight: 500 }}><Shield s={14} /> 80G Tax Exemption Certificate</a>
            <a href="https://www.ilikafoundation.org/_files/ugd/e3859a_d1f4bc28f83841bea4a53b820354e49d.pdf" target="_blank" rel="noopener noreferrer" style={{ display: "flex", alignItems: "center", gap: 6, padding: "8px 18px", borderRadius: 20, background: C.white, border: `1px solid ${C.brdL}`, fontSize: 13, color: C.green, textDecoration: "none", fontWeight: 500 }}><Check s={14} /> Section 8 Registration</a>
          </div>
        </section>

        {/* ============ SPONSORSHIP OPTIONS ============ */}
        <section ref={sponsorRef} style={{ ...secStyle, padding: "48px 28px", ...an(0.3) }}>
          <div style={{ textAlign: "center", marginBottom: 28 }}>
            <div style={{ fontSize: 11, textTransform: "uppercase", letterSpacing: 2, color: C.gold, fontWeight: 600, marginBottom: 12 }}>Take Action</div>
            <h2 style={{ fontFamily: "'Playfair Display', serif", fontSize: "clamp(22px, 3.5vw, 34px)", lineHeight: 1.25, color: C.green, marginBottom: 12 }}>Choose how you'd like to<br /><span style={{ fontStyle: "italic", color: C.gold }}>change her story</span></h2>
          </div>
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(280px, 1fr))", gap: 20, marginBottom: 16 }}>
            {[
              { o: 1, icon: <User s={20} />, label: "Sponsor Individually", price: "\u20B98,000", unit: "/month", desc: "You alone power one girl's complete education and career journey. Her future, championed by you.", color: C.gold, soft: C.goldS, micro: "Most popular", sponsors: `${stats.individualCount} sponsors this month` },
              { o: 2, icon: <Users s={20} />, label: "Sponsor with Friends", price: "\u20B92,000", unit: "/person/month", desc: "4 friends. Each contributes \u20B92,000/month. Together, you fund one girl completely. Shared purpose, shared joy.", color: C.green, soft: C.greenS, micro: "Best for groups", sponsors: `${stats.groupCount} groups formed` },
            ].map(o => (
              <div key={o.o} onClick={() => { setOpt(o.o); setDone(false); setShowModal(true); setShowRetention(false); }} style={{ background: C.white, border: opt === o.o ? `2px solid ${o.color}` : `1px solid ${C.brd}`, borderRadius: 16, padding: "28px 24px", cursor: "pointer", transition: "all 0.3s ease", transform: opt === o.o ? "scale(1.01)" : "scale(1)", boxShadow: opt === o.o ? `0 4px 20px ${o.color}15` : "0 1px 4px rgba(0,0,0,0.04)", position: "relative", overflow: "hidden" }}>
                <div style={{ position: "absolute", top: 0, right: 0, background: o.color, color: C.white, fontSize: 10, fontWeight: 600, padding: "4px 12px", borderBottomLeftRadius: 8, textTransform: "uppercase", letterSpacing: 0.5 }}>{o.micro}</div>
                <div style={{ display: "flex", alignItems: "center", gap: 12, marginBottom: 16 }}>
                  <div style={{ width: 42, height: 42, borderRadius: 10, background: o.soft, display: "flex", alignItems: "center", justifyContent: "center", color: o.color }}>{o.icon}</div>
                  <div><div style={{ fontWeight: 600, fontSize: 16, color: C.td }}>{o.label}</div></div>
                </div>
                <div style={{ fontFamily: "'Playfair Display', serif", fontSize: 28, color: o.color, marginBottom: 8 }}>{o.price}<span style={{ fontSize: 14, color: C.tl }}>{o.unit}</span></div>
                <p style={{ color: C.tl, fontSize: 14, lineHeight: 1.6, margin: "0 0 16px 0" }}>{o.desc}</p>
                <div style={{ paddingTop: 12, borderTop: `1px solid ${C.brdL}` }}><Facepile count={o.o === 1 ? 4 : 5} size={22} label={o.sponsors} /></div>
              </div>
            ))}
          </div>
        </section>

        {/* ============ MODAL OVERLAY ============ */}
        {showModal && (opt === 1 || opt === 2) && (
          <div style={{ position: "fixed", top: 0, left: 0, right: 0, bottom: 0, zIndex: 9999, display: "flex", alignItems: "center", justifyContent: "center", padding: 20 }} onClick={(e) => { if (e.target === e.currentTarget && !done) { setShowRetention(true); } }}>
            {/* Backdrop */}
            <div style={{ position: "absolute", top: 0, left: 0, right: 0, bottom: 0, background: "rgba(0,0,0,0.55)", backdropFilter: "blur(8px)", WebkitBackdropFilter: "blur(8px)" }} />

            {/* Retention Prompt */}
            {showRetention && !done && (
              <div style={{ position: "absolute", top: 0, left: 0, right: 0, bottom: 0, zIndex: 10001, display: "flex", alignItems: "center", justifyContent: "center", padding: 20 }}>
                <div style={{ position: "absolute", top: 0, left: 0, right: 0, bottom: 0, background: "rgba(0,0,0,0.4)" }} />
                <div style={{ position: "relative", background: C.white, borderRadius: 20, padding: "40px 32px", maxWidth: 400, width: "100%", textAlign: "center", boxShadow: "0 20px 60px rgba(0,0,0,0.3)", animation: "modalIn 0.3s ease" }}>
                  <button onClick={() => { setShowRetention(false); setShowModal(false); setOpt(null); }} style={{ position: "absolute", top: 14, right: 14, background: "none", border: "none", fontSize: 22, cursor: "pointer", color: C.tl, lineHeight: 1 }}>×</button>
                  <div style={{ fontSize: 52, marginBottom: 16 }}>🙏</div>
                  <h3 style={{ fontFamily: "'Playfair Display', serif", fontSize: 22, color: C.green, marginBottom: 12 }}>Please don't go yet!</h3>
                  <p style={{ color: C.tm, fontSize: 14, lineHeight: 1.7, marginBottom: 24 }}>
                    {opt === 1
                      ? "Just \u20B98,000/month can transform a girl's entire future \u2014 education, mentorship, career training, and a lifelong network. Your contribution can make this possible."
                      : "Just \u20B92,000/month with 3 friends can sponsor a girl's complete education. Together, you can change her story forever."}
                  </p>
                  <button onClick={() => setShowRetention(false)} style={{ width: "100%", background: `linear-gradient(135deg,${C.green},${C.greenL})`, color: C.white, border: "none", padding: "15px", borderRadius: 10, fontSize: 15, fontWeight: 600, cursor: "pointer", fontFamily: "inherit", marginBottom: 12, boxShadow: `0 4px 20px ${C.green}33` }}>Yes, I will help ❤️</button>
                  <button onClick={() => { setShowRetention(false); setShowModal(false); setOpt(null); }} style={{ background: "none", border: "none", color: C.tl, fontSize: 13, cursor: "pointer", fontFamily: "inherit", padding: "8px" }}>Sorry, not today</button>
                </div>
              </div>
            )}

            {/* Modal Content */}
            <div style={{ position: "relative", zIndex: 10000, maxWidth: 520, width: "100%", maxHeight: "90vh", overflowY: "auto", animation: "modalIn 0.35s ease" }}>
              {/* Close Button */}
              {!done && (
                <button onClick={() => setShowRetention(true)} style={{ position: "absolute", top: 14, right: 14, zIndex: 10, width: 32, height: 32, borderRadius: "50%", background: "rgba(0,0,0,0.06)", border: "none", fontSize: 18, cursor: "pointer", color: C.tl, display: "flex", alignItems: "center", justifyContent: "center", lineHeight: 1 }}>×</button>
              )}

              {/* Individual Form */}
              {opt === 1 && !done && (
                <div style={{ background: C.white, borderRadius: 20, padding: "36px 32px", boxShadow: "0 20px 60px rgba(0,0,0,0.2)" }}>
                  <h3 style={{ fontFamily: "'Playfair Display', serif", fontSize: 22, marginBottom: 4, color: C.green }}>You're about to change a life</h3>
                  <p style={{ color: C.tl, fontSize: 13, marginBottom: 24 }}>Just a few details. Takes less than 60 seconds.</p>
                  {[{ k: "name", l: "Full Name", p: "Your full name", t: "text" }, { k: "email", l: "Email", p: "you@email.com", t: "email" }, { k: "phone", l: "Phone", p: "+91 XXXXX XXXXX", t: "tel" }, { k: "company", l: "Company (Optional)", p: "Company name", t: "text" }].map(f => <div key={f.k} style={{ marginBottom: 16 }}><label style={lbl}>{f.l}</label><input type={f.t} value={indF[f.k]} onChange={e => setIndF({ ...indF, [f.k]: e.target.value })} placeholder={f.p} style={inp} /></div>)}
                  {/* Donor Type Toggle */}
                  <div style={{ marginBottom: 16 }}>
                    <label style={lbl}>Donation Type</label>
                    <div style={{ display: "flex", gap: 10 }}>
                      {[{ v: "individual", l: "Individual" }, { v: "corporate", l: "Corporate" }].map(o => (
                        <button key={o.v} onClick={() => setIndF({ ...indF, donorType: o.v })} style={{ flex: 1, padding: "10px 12px", borderRadius: 8, cursor: "pointer", fontFamily: "inherit", textAlign: "center", background: indF.donorType === o.v ? C.greenS : C.bg, border: indF.donorType === o.v ? `2px solid ${C.green}` : `1px solid ${C.brd}`, color: indF.donorType === o.v ? C.green : C.tm, fontSize: 14, fontWeight: 600 }}>{o.l}</button>
                      ))}
                    </div>
                  </div>
                  {/* PAN Number (Optional) */}
                  <div style={{ marginBottom: 16 }}>
                    <label style={lbl}>PAN Number (Optional — for 80G tax receipt)</label>
                    <input type="text" value={indF.panNumber} onChange={e => setIndF({ ...indF, panNumber: e.target.value.toUpperCase() })} placeholder="e.g. ABCDE1234F" maxLength={10} style={inp} />
                  </div>
                  <div style={{ marginBottom: 24 }}><label style={{ ...lbl, marginBottom: 10 }}>Payment</label><div style={{ display: "flex", gap: 10 }}>{[{ v: "monthly", l: "\u20B98,000/month", s: "Monthly" }, { v: "annual", l: "\u20B996,000/year", s: "Save \u20B9600 \u00B7 Annual" }].map(o => <button key={o.v} onClick={() => setIndF({ ...indF, payment: o.v })} style={{ flex: 1, padding: "14px 12px", borderRadius: 8, cursor: "pointer", fontFamily: "inherit", textAlign: "center", background: indF.payment === o.v ? C.goldS : C.bg, border: indF.payment === o.v ? `2px solid ${C.gold}` : `1px solid ${C.brd}`, color: indF.payment === o.v ? C.gold : C.tm }}><div style={{ fontSize: 15, fontWeight: 600 }}>{o.l}</div><div style={{ fontSize: 11, marginTop: 2, opacity: 0.7 }}>{o.s}</div></button>)}</div></div>
                  <button onClick={submitInd} disabled={submitting} style={{ width: "100%", background: `linear-gradient(135deg,${C.gold},${C.goldL})`, color: C.white, border: "none", padding: "15px", borderRadius: 8, fontSize: 15, fontWeight: 600, cursor: submitting ? "wait" : "pointer", fontFamily: "inherit", boxShadow: `0 4px 20px ${C.gold}33`, display: "flex", alignItems: "center", justifyContent: "center", gap: 8, opacity: submitting ? 0.7 : 1 }}>{submitting ? "Processing..." : <>Sponsor Now — {indF.payment === "monthly" ? "₹8,000/mo" : "₹96,000/yr"} <Arrow /></>}</button>
                  <p style={{ textAlign: "center", fontSize: 11, color: C.tl, marginTop: 10 }}>Secure Razorpay {"\u00B7"} 80G tax receipt {"\u00B7"} Cancel anytime</p>
                </div>
              )}

              {/* Individual Success — Enhanced with WhatsApp share + referral */}
              {opt === 1 && done && (
                <div style={{ background: C.greenS, border: `1px solid ${C.green}22`, borderRadius: 20, padding: 40, textAlign: "center", boxShadow: "0 20px 60px rgba(0,0,0,0.2)" }}>
                  <button onClick={() => { setShowModal(false); setOpt(null); setDone(false); }} style={{ position: "absolute", top: 14, right: 14, zIndex: 10, width: 32, height: 32, borderRadius: "50%", background: "rgba(0,0,0,0.06)", border: "none", fontSize: 18, cursor: "pointer", color: C.tl, display: "flex", alignItems: "center", justifyContent: "center", lineHeight: 1 }}>×</button>
                  <div style={{ color: C.green, marginBottom: 12 }}><Check s={36} /></div>
                  <h3 style={{ fontFamily: "'Playfair Display', serif", fontSize: 24, marginBottom: 8, color: C.green }}>Thank You, {indF.name.split(" ")[0]}!</h3>
                  <p style={{ color: C.tm, fontSize: 14, lineHeight: 1.6, marginBottom: 12 }}>Your payment of {indF.payment === "monthly" ? "\u20B98,000" : "\u20B996,000"} has been received. You are now sponsoring a girl's education!</p>
                  <p style={{ color: C.tl, fontSize: 13, marginBottom: 16 }}>Tax receipt and fellowship updates will be sent to {indF.email}</p>
                  <button onClick={() => generateDonationReceipt({ donorName: indF.name, email: indF.email, phone: indF.phone, amount: indF.payment === "annual" ? 96000 : 8000, paymentId: lastPayment?.paymentId || "N/A", type: "individual", paymentPreference: indF.payment, date: new Date().toISOString(), contributionId: lastPayment?.id, panNumber: indF.panNumber, donorType: indF.donorType, company: indF.company })} style={{ background: C.white, border: `1px solid ${C.green}44`, color: C.green, padding: "12px 28px", borderRadius: 8, fontSize: 14, fontWeight: 600, cursor: "pointer", fontFamily: "inherit", display: "inline-flex", alignItems: "center", gap: 8, marginBottom: 16, boxShadow: "0 2px 8px rgba(0,0,0,0.06)" }}>📄 Download 80G Receipt (PDF)</button>
                  {/* Share + Referral CTA */}
                  <div style={{ background: C.white, borderRadius: 12, padding: "20px", border: `1px solid ${C.brdL}`, marginTop: 12 }}>
                    <p style={{ fontSize: 15, color: C.green, marginBottom: 4, fontWeight: 600, fontFamily: "'Playfair Display', serif" }}>Multiply your impact</p>
                    <p style={{ fontSize: 13, color: C.tm, marginBottom: 16, lineHeight: 1.5 }}>Share this with your friends and family — invite them to sponsor a girl or start their own group campaign.</p>
                    <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
                      <a href={`https://wa.me/?text=${encodeURIComponent(`I just sponsored a girl's education through Ilika Foundation! 🎓 This Women's Day, you can change a girl's future too — just ₹8,000/mo or ₹2,000/mo with friends.\n\nJoin here: ${window.location.origin}${lastPayment?.referralCode ? `?ref=${lastPayment.referralCode}` : ""}`)}`} target="_blank" rel="noopener noreferrer" style={{ display: "flex", alignItems: "center", justifyContent: "center", gap: 8, background: "#25D366", color: C.white, border: "none", padding: "12px 24px", borderRadius: 8, fontSize: 14, fontWeight: 600, cursor: "pointer", fontFamily: "inherit", textDecoration: "none" }}>💬 Share on WhatsApp</a>
                      <button onClick={() => { setDone(false); setOpt(2); }} style={{ background: C.white, border: `2px solid ${C.green}`, color: C.green, padding: "12px 24px", borderRadius: 8, fontSize: 14, fontWeight: 600, cursor: "pointer", fontFamily: "inherit", display: "flex", alignItems: "center", justifyContent: "center", gap: 8 }}><Users s={16} /> Start a Group Campaign</button>
                    </div>
                  </div>
                </div>
              )}

              {/* Group Form */}
              {opt === 2 && (
                <div style={{ background: C.white, borderRadius: 20, padding: "36px 32px", boxShadow: "0 20px 60px rgba(0,0,0,0.2)" }}>
                  <h3 style={{ fontFamily: "'Playfair Display', serif", fontSize: 22, marginBottom: 4, color: C.green }}>Start a Group</h3>
                  <p style={{ color: C.tl, fontSize: 13, marginBottom: 24 }}>You'll get a unique link to share with 3 friends. Once all 4 join, one girl's future is funded.</p>
                  {["name", "email", "phone"].map(f => <div key={f} style={{ marginBottom: 16 }}><label style={lbl}>{f === "name" ? "Your Name" : f.charAt(0).toUpperCase() + f.slice(1)}</label><input type={f === "email" ? "email" : f === "phone" ? "tel" : "text"} value={grpF[f]} onChange={e => setGrpF({ ...grpF, [f]: e.target.value })} placeholder={f === "name" ? "Your full name" : f === "email" ? "you@email.com" : "+91 XXXXX XXXXX"} style={inp} /></div>)}
                  <button onClick={submitGrp} disabled={submitting} style={{ width: "100%", background: `linear-gradient(135deg,${C.green},${C.greenL})`, color: C.white, border: "none", padding: "15px", borderRadius: 8, fontSize: 15, fontWeight: 600, cursor: submitting ? "wait" : "pointer", fontFamily: "inherit", boxShadow: `0 4px 20px ${C.green}33`, display: "flex", alignItems: "center", justifyContent: "center", gap: 8, opacity: submitting ? 0.7 : 1 }}>{submitting ? "Creating Group..." : <>Create Group & Get Link <Arrow /></>}</button>
                  <p style={{ textAlign: "center", fontSize: 11, color: C.tl, marginTop: 10 }}>You're sponsor #1 of 4 {"\u00B7"} Share via WhatsApp, text, or email</p>
                </div>
              )}
            </div>
          </div>
        )}

        {/* ============ CLOSING CTA ============ */}
        <section style={{ ...secStyle, padding: "48px 28px 64px", ...an(0.35) }}>
          <div style={{ background: `linear-gradient(135deg,${C.green},${C.greenL})`, borderRadius: 20, padding: "48px 36px", textAlign: "center", color: C.white, position: "relative", overflow: "hidden" }}>
            <div style={{ position: "absolute", top: -30, right: -30, width: 200, height: 200, background: "rgba(255,255,255,0.03)", borderRadius: "50%" }} />
            <h2 style={{ fontFamily: "'Playfair Display', serif", fontSize: "clamp(20px, 3.5vw, 32px)", lineHeight: 1.3, marginBottom: 16, fontWeight: 400, position: "relative" }}>Right now, somewhere in India, a girl is wondering<br />if anyone believes she deserves a chance.</h2>
            <p style={{ fontSize: 15, lineHeight: 1.7, opacity: 0.85, maxWidth: 480, margin: "0 auto 24px", position: "relative" }}>You do. {"\u20B9"}8,000/month — or {"\u20B9"}2,000 with three friends — is all it takes.</p>
            <div style={{ display: "flex", flexWrap: "wrap", justifyContent: "center", gap: 12, position: "relative" }}>
              <button onClick={() => { setOpt(1); setDone(false); setShowModal(true); setShowRetention(false); scrollToSponsor(); }} style={{ background: C.gold, color: C.white, border: "none", padding: "14px 32px", borderRadius: 8, fontSize: 15, fontWeight: 600, cursor: "pointer", fontFamily: "inherit", display: "flex", alignItems: "center", gap: 8 }}>Sponsor a Girl <Arrow /></button>
              <button onClick={() => { setOpt(2); setDone(false); setShowModal(true); setShowRetention(false); scrollToSponsor(); }} style={{ background: "rgba(255,255,255,0.15)", color: C.white, border: "1px solid rgba(255,255,255,0.3)", padding: "14px 32px", borderRadius: 8, fontSize: 15, fontWeight: 600, cursor: "pointer", fontFamily: "inherit", display: "flex", alignItems: "center", gap: 8 }}>Start a Group <Users s={16} /></button>
            </div>
            <div style={{ marginTop: 16, position: "relative" }}><Facepile count={6} size={26} label={<span style={{ color: "rgba(255,255,255,0.75)" }}>Join {stats.totalSponsors} sponsors who already said yes</span>} /></div>
          </div>
        </section>

        {/* ============ FAQ / OBJECTION HANDLING ============ */}
        <section style={{ ...secStyle, padding: "0 28px 48px", ...an(0.38) }}>
          <div style={{ textAlign: "center", marginBottom: 24 }}><h3 style={{ fontFamily: "'Playfair Display', serif", fontSize: 20, color: C.green }}>Common Questions</h3></div>
          {getContentJSON("faq_items").map((faq, i) => (
            <details key={i} style={{ background: C.white, borderRadius: 10, border: `1px solid ${C.brdL}`, marginBottom: 8, cursor: "pointer" }}>
              <summary style={{ padding: "16px 20px", fontSize: 14, fontWeight: 600, color: C.td, listStyle: "none", display: "flex", justifyContent: "space-between", alignItems: "center" }}>{faq.q}<span style={{ color: C.tl, fontSize: 18, fontWeight: 300 }}>+</span></summary>
              <div style={{ padding: "0 20px 16px", fontSize: 14, lineHeight: 1.7, color: C.tm }}>{faq.a}</div>
            </details>
          ))}
        </section>

        {/* Footer */}
        <footer style={{ textAlign: "center", padding: "40px 28px", borderTop: `1px solid ${C.brdL}` }}>
          <img src={ilikaLogo} alt="Ilika Foundation" style={{ height: 80, width: "auto", marginBottom: 8 }} />
          <p style={{ color: C.tx, fontSize: 12, marginBottom: 4 }}>{getContent("footer_tagline")}</p>
          <p style={{ color: C.tx, fontSize: 11 }}>{getContent("footer_org")}</p>
        </footer>
      </div>

      {/* ============ STICKY BOTTOM CTA BAR ============ */}
      <div style={{ position: "fixed", bottom: 0, left: 0, right: 0, background: C.white, borderTop: `1px solid ${C.brd}`, padding: "10px 20px", display: "flex", alignItems: "center", justifyContent: "space-between", gap: 12, zIndex: 100, boxShadow: "0 -2px 12px rgba(0,0,0,0.06)" }}>
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ fontSize: 12, color: C.tl }}>{stats.totalSponsors} sponsors {"\u00B7"} {Number(getContent("campaign_days_left"))} days left</div>
          <div style={{ fontFamily: "'Playfair Display', serif", fontSize: 16, color: C.green, fontWeight: 600 }}>From {"\u20B9"}2,000/mo</div>
        </div>
        <button onClick={() => { setOpt(opt || 1); setDone(false); setShowModal(true); setShowRetention(false); scrollToSponsor(); }} style={{ background: `linear-gradient(135deg,${C.gold},${C.goldL})`, color: C.white, border: "none", padding: "12px 28px", borderRadius: 8, fontSize: 14, fontWeight: 600, cursor: "pointer", fontFamily: "inherit", whiteSpace: "nowrap", boxShadow: `0 2px 12px ${C.gold}33` }}>Sponsor Now</button>
      </div>
      {/* Bottom padding for sticky bar */}
      <div style={{ height: 60 }} />
    </div>
  );
}
