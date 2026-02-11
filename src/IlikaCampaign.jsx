import { useState, useEffect, useRef } from "react";
import { useNavigate } from "react-router-dom";
import {
  C, Heart, Users, User, Check, Arrow, Leaf, Quote, Star, Shield, BookOpen,
  Handshake, TrendUp, Clock, Facepile, LiveTicker, GlobalStyles,
  CampaignProgress, RecentSupporters, UrgencyBanner, ImpactCalculator,
  inp, lbl, Share
} from "./shared.jsx";
import { createIndividualContribution, createGroup, getCampaignStats, updatePaymentStatus } from "./dataService.js";
import { openRazorpayCheckout, isRazorpayConfigured } from "./razorpayService.js";

export default function IlikaCampaign() {
  const navigate = useNavigate();
  const [opt, setOpt] = useState(null);
  const [indF, setIndF] = useState({ name: "", email: "", phone: "", company: "", payment: "monthly" });
  const [grpF, setGrpF] = useState({ name: "", email: "", phone: "" });
  const [done, setDone] = useState(false);
  const [m, setM] = useState(false);
  const [stats, setStats] = useState({ totalSponsors: 127, girlsSponsored: 15, individualCount: 42, groupCount: 23 });
  const [submitting, setSubmitting] = useState(false);
  const [paymentProcessing, setPaymentProcessing] = useState(false);
  const sponsorRef = useRef(null);

  useEffect(() => { setM(true); loadStats(); }, []);

  const scrollToSponsor = () => { sponsorRef.current?.scrollIntoView({ behavior: "smooth" }); };

  async function loadStats() {
    try {
      const s = await getCampaignStats();
      setStats({
        totalSponsors: 127 + s.totalSponsors,
        girlsSponsored: 15 + s.girlsSponsored,
        individualCount: 42 + s.individualCount,
        groupCount: 23 + s.groupCount,
      });
    } catch (e) { /* keep defaults */ }
  }

  const submitInd = async () => {
    if (!indF.name || !indF.email || !indF.phone) return;
    setSubmitting(true);
    try {
      const contrib = await createIndividualContribution(indF);
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
          setPaymentProcessing(false);
          setDone(true);
        },
        onFailure: (err) => {
          setPaymentProcessing(false);
          if (err.message !== "Payment cancelled by user") alert("Payment failed: " + err.message);
        },
      });
    } catch (err) {
      alert("Error: " + err.message);
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
          navigate(`/group/${group.slug}`);
        },
        onFailure: (err) => {
          setPaymentProcessing(false);
          if (err.message !== "Payment cancelled by user") alert("Payment failed: " + err.message);
          // Still navigate to group page even if payment fails
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

      {/* Ambient */}
      <div style={{ position: "fixed", inset: 0, pointerEvents: "none" }}>
        <div style={{ position: "absolute", top: "-15%", right: "-5%", width: 500, height: 500, background: `radial-gradient(circle, ${C.green}06 0%, transparent 70%)`, borderRadius: "50%" }} />
        <div style={{ position: "absolute", bottom: "-10%", left: "-8%", width: 400, height: 400, background: `radial-gradient(circle, ${C.gold}06 0%, transparent 70%)`, borderRadius: "50%" }} />
      </div>

      <div style={{ position: "relative", zIndex: 1 }}>
        {/* Nav with Facepile */}
        <nav style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "16px 28px", maxWidth: 1100, margin: "0 auto" }}>
          <div style={{ fontFamily: "'Playfair Display', serif", fontSize: 24, fontWeight: 700, color: C.green }}>ilika</div>
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
              <div style={{ display: "inline-flex", alignItems: "center", gap: 8, padding: "7px 20px", borderRadius: 24, background: C.greenS, marginBottom: 24, fontSize: 13, color: C.green, fontWeight: 500 }}><Leaf s={14} /> Women's Day Initiative 2025</div>
              <h1 style={{ fontFamily: "'Playfair Display', serif", fontSize: "clamp(28px, 4vw, 46px)", lineHeight: 1.15, marginBottom: 20, fontWeight: 400, color: C.green }}>
                She has the talent.<br />She has the dream.<br /><span style={{ fontStyle: "italic", color: C.gold }}>She just needs someone<br />to believe in her.</span>
              </h1>
              <p style={{ fontSize: "clamp(14px, 1.8vw, 17px)", lineHeight: 1.8, color: C.tm, maxWidth: 480, marginBottom: 28, fontWeight: 300 }}>
                For millions of girls in India, the dream of education isn't stopped by a lack of ambition — it's stopped by a lack of access. This Women's Day, you can change that for one girl, forever.
              </p>
              {/* Hero CTAs with pricing */}
              <div style={{ display: "flex", flexWrap: "wrap", gap: 12, marginBottom: 24 }}>
                <button onClick={() => { setOpt(1); setDone(false); scrollToSponsor(); }} style={{ background: `linear-gradient(135deg,${C.gold},${C.goldL})`, color: C.white, border: "none", padding: "14px 32px", borderRadius: 8, fontSize: 15, fontWeight: 600, cursor: "pointer", fontFamily: "inherit", display: "flex", alignItems: "center", gap: 8, boxShadow: `0 4px 20px ${C.gold}33` }}>Sponsor a Girl — {"\u20B9"}8,000/mo <Arrow /></button>
                <button onClick={() => { setOpt(2); setDone(false); scrollToSponsor(); }} style={{ background: C.white, color: C.green, border: `2px solid ${C.green}`, padding: "14px 32px", borderRadius: 8, fontSize: 15, fontWeight: 600, cursor: "pointer", fontFamily: "inherit", display: "flex", alignItems: "center", gap: 8 }}>Split with Friends — {"\u20B9"}2,000/mo <Users s={16} /></button>
              </div>
              <p style={{ fontSize: 12, color: C.tl, marginBottom: 16 }}>80G tax exemption {"\u00B7"} Secure Razorpay {"\u00B7"} Cancel anytime</p>
              <Facepile count={7} size={34} label={<span><strong style={{ color: C.td }}>{stats.totalSponsors} sponsors</strong> have already joined</span>} />
            </div>
            {/* Right - Hero image */}
            <div style={{ flex: "1 1 340px", minWidth: 280, maxWidth: 440, position: "relative" }}>
              <div style={{ borderRadius: 24, overflow: "hidden", boxShadow: "0 8px 40px rgba(45,80,22,0.12)", border: `3px solid ${C.white}`, position: "relative" }}>
                <img src="https://static.wixstatic.com/media/e3859a_09bd59c846ab436e91d393ae5718133b~mv2.jpeg/v1/fill/w_720,h_884,al_c,q_85,enc_avif,quality_auto/e3859a_09bd59c846ab436e91d393ae5718133b~mv2.jpeg" alt="Ilika Fellow" style={{ width: "100%", height: "auto", display: "block", objectFit: "cover" }} />
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

        {/* ============ CAMPAIGN PROGRESS + URGENCY ============ */}
        <section style={{ ...secStyle, padding: "16px 28px", ...an(0.08) }}>
          <CampaignProgress />
          <div style={{ marginTop: 12 }}><UrgencyBanner /></div>
        </section>

        {/* ============ ORIGIN STORY ============ */}
        <section style={{ ...secStyle, padding: "48px 28px", ...an(0.12) }}>
          <div style={{ background: C.white, borderRadius: 20, padding: "40px 36px", border: `1px solid ${C.brdL}`, boxShadow: "0 2px 12px rgba(0,0,0,0.03)", position: "relative", overflow: "hidden" }}>
            <div style={{ position: "absolute", top: 20, right: 24, color: C.green }}><Quote s={48} /></div>
            <div style={{ fontSize: 11, textTransform: "uppercase", letterSpacing: 2, color: C.gold, fontWeight: 600, marginBottom: 16 }}>How It Started</div>
            <p style={{ fontFamily: "'Playfair Display', serif", fontSize: "clamp(18px, 2.5vw, 24px)", lineHeight: 1.6, color: C.green, marginBottom: 20, fontWeight: 400, maxWidth: 600 }}>
              At 17, three friends came together with a simple belief: if opportunity had reached us, it was our duty to extend it to those it hadn't.
            </p>
            <p style={{ fontSize: 15, lineHeight: 1.8, color: C.tm, marginBottom: 16 }}>
              What began as pooling their own pocket money to help one child get to school has grown into Ilika — an ecosystem where support is not charity, but justice. Today, Akshay, Malay, and Anisha stand beside young people from underserved communities, providing not just tuition fees, but mentorship, tools, networks, and the opportunities that talent alone cannot unlock.
            </p>
            <p style={{ fontSize: 15, lineHeight: 1.8, color: C.tm, marginBottom: 0, fontStyle: "italic" }}>
              Because when one child rises, the cycle of opportunity begins — and generational poverty starts to end.
            </p>
            <div style={{ display: "flex", flexWrap: "wrap", gap: 16, marginTop: 24, paddingTop: 24, borderTop: `1px solid ${C.brdL}` }}>
              {[{ n: "Akshay Lalchandani", r: "Co-founder & CEO", img: "https://static.wixstatic.com/media/e3859a_0039d3cb70cd479f8e1ee08da1ca3c66~mv2.jpg/v1/crop/x_77,y_130,w_1385,h_1309/fill/w_403,h_381,al_c,q_80,usm_0.66_1.00_0.01,enc_avif,quality_auto/IMG_3512_JPG.jpg" }, { n: "Malay Shah", r: "Co-founder & CFO", img: "https://static.wixstatic.com/media/e3859a_2d6ab1fbf7f5407fac701951477e7cf7~mv2.jpg/v1/crop/x_0,y_22,w_1536,h_1453/fill/w_403,h_381,al_c,q_80,usm_0.66_1.00_0.01,enc_avif,quality_auto/IMG_3545_JPG.jpg" }, { n: "Anisha Patnaik", r: "Co-founder", img: "https://static.wixstatic.com/media/db90ba_5a1b1cc1de514e6db830bde94648446b~mv2.jpg/v1/crop/x_0,y_29,w_1080,h_1021/fill/w_403,h_381,al_c,q_80,usm_0.66_1.00_0.01,enc_avif,quality_auto/Anisha.jpg" }].map((f, i) => (
                <div key={i} style={{ display: "flex", alignItems: "center", gap: 10 }}>
                  <img src={f.img} alt={f.n} style={{ width: 40, height: 40, borderRadius: "50%", objectFit: "cover", border: `2px solid ${C.brdL}` }} />
                  <div><div style={{ fontSize: 13, fontWeight: 600, color: C.td }}>{f.n}</div><div style={{ fontSize: 11, color: C.tl }}>{f.r}</div></div>
                </div>
              ))}
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
            {[
              { num: "250M+", label: "youth population", sub: "India's largest untapped potential" },
              { num: "71%", label: "never reach college", sub: "Gross Enrollment Ratio: 28.4%" },
              { num: "\u20B975K", label: "avg. annual tuition", sub: "Unaffordable for most families" },
              { num: "\u20B98K", label: "/mo changes everything", sub: "Education + mentorship + career" },
            ].map((d, i) => (
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
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(240px, 1fr))", gap: 16 }}>
            {[
              { icon: <BookOpen s={22} />, title: "Guided", desc: "Paired with a dedicated buddy mentor through every challenge and milestone of her undergraduate journey.", color: C.green },
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
            <p style={{ fontFamily: "'Playfair Display', serif", fontSize: "clamp(15px, 2vw, 19px)", lineHeight: 1.6, margin: 0, fontWeight: 400, fontStyle: "italic", maxWidth: 500, marginLeft: "auto", marginRight: "auto" }}>"We don't pay gratitude back. We pay it forward — turning a stranger's kindness into someone else's chance."</p>
            <p style={{ fontSize: 12, marginTop: 10, opacity: 0.75 }}>Every Fellow pledges to support a future student. Your sponsorship starts a chain that never ends.</p>
          </div>
        </section>

        {/* ============ TESTIMONIAL + RECENT SUPPORTERS ============ */}
        <section style={{ ...secStyle, padding: "48px 28px", ...an(0.24) }}>
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(300px, 1fr))", gap: 20 }}>
            {/* Testimonial */}
            <div style={{ background: C.white, borderRadius: 16, padding: "28px 24px", border: `1px solid ${C.brdL}`, position: "relative" }}>
              <div style={{ position: "absolute", top: 16, left: 20, color: C.gold }}><Quote s={36} /></div>
              <div style={{ display: "flex", alignItems: "center", gap: 12, marginBottom: 16 }}>
                <div style={{ width: 44, height: 44, borderRadius: "50%", background: C.gold, display: "flex", alignItems: "center", justifyContent: "center", color: "#fff", fontSize: 16, fontWeight: 600 }}>K</div>
                <div><div style={{ fontWeight: 600, color: C.td }}>Komal Gupta</div><div style={{ fontSize: 12, color: C.tl }}>Ilika Fellow</div></div>
                <div style={{ marginLeft: "auto", display: "flex", gap: 2, color: C.gold }}>{[1, 2, 3, 4, 5].map(i => <Star key={i} />)}</div>
              </div>
              <p style={{ fontFamily: "'Playfair Display', serif", fontSize: 16, lineHeight: 1.7, color: C.green, marginBottom: 12 }}>"My buddy has been deeply involved in guiding me, helping me discover my strengths, and providing me with the right direction."</p>
              <p style={{ fontSize: 13, lineHeight: 1.7, color: C.tm, marginBottom: 12 }}>Through Ilika's mentorship, Komal received internship opportunities and was encouraged to pursue real-world projects. She went from being unsure about her future to confidently pursuing her dream career.</p>
              <div style={{ padding: "10px 14px", background: C.greenS, borderRadius: 8, fontSize: 12, color: C.green, fontStyle: "italic" }}>"I feel proud and thankful to be a part of Ilika."</div>
            </div>
            {/* Recent supporters feed */}
            <div style={{ background: C.white, borderRadius: 16, padding: "28px 24px", border: `1px solid ${C.brdL}` }}>
              <RecentSupporters />
            </div>
          </div>
        </section>

        {/* ============ IMPACT CALCULATOR ============ */}
        <section style={{ ...secStyle, padding: "32px 28px", ...an(0.26) }}>
          <ImpactCalculator />
        </section>

        {/* ============ TRUST SIGNALS ============ */}
        <section style={{ ...secStyle, padding: "24px 28px", ...an(0.28) }}>
          <div style={{ display: "flex", flexWrap: "wrap", justifyContent: "center", gap: 10 }}>
            {[
              { icon: <Shield s={14} />, text: "80G Tax Exemption" },
              { icon: <Check s={14} />, text: "Section 8 Registered" },
              { icon: <BookOpen s={14} />, text: "Audited Financials" },
              { icon: <Heart s={14} />, text: `${stats.girlsSponsored}+ Fellows in ecosystem` },
              { icon: <Handshake s={14} />, text: "Karmic Pledge cycle" },
            ].map((t, i) => (
              <div key={i} style={{ display: "flex", alignItems: "center", gap: 6, padding: "6px 14px", borderRadius: 20, background: C.white, border: `1px solid ${C.brdL}`, fontSize: 12, color: C.tm }}><span style={{ color: C.green }}>{t.icon}</span>{t.text}</div>
            ))}
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
              <div key={o.o} onClick={() => { setOpt(o.o); setDone(false); }} style={{ background: C.white, border: opt === o.o ? `2px solid ${o.color}` : `1px solid ${C.brd}`, borderRadius: 16, padding: "28px 24px", cursor: "pointer", transition: "all 0.3s ease", transform: opt === o.o ? "scale(1.01)" : "scale(1)", boxShadow: opt === o.o ? `0 4px 20px ${o.color}15` : "0 1px 4px rgba(0,0,0,0.04)", position: "relative", overflow: "hidden" }}>
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
          <div style={{ background: C.white, borderRadius: 10, padding: "12px 20px", border: `1px solid ${C.brdL}`, textAlign: "center" }}>
            <p style={{ fontSize: 13, color: C.tm, margin: 0 }}>{"\u20B9"}8,000/mo covers tuition + mentor + tools + career training + network access — <strong style={{ color: C.green }}>the full Ilika ecosystem</strong></p>
          </div>
        </section>

        {/* ============ FORMS ============ */}
        {opt === 1 && !done && (
          <section style={{ maxWidth: 520, margin: "0 auto", padding: "0 28px 60px", animation: "fadeUp 0.4s ease" }}>
            <div style={{ background: C.white, borderRadius: 16, padding: 32, border: `1px solid ${C.brd}`, boxShadow: "0 2px 12px rgba(0,0,0,0.04)" }}>
              <h3 style={{ fontFamily: "'Playfair Display', serif", fontSize: 22, marginBottom: 4, color: C.green }}>You're about to change a life</h3>
              <p style={{ color: C.tl, fontSize: 13, marginBottom: 24 }}>Just a few details. Takes less than 60 seconds.</p>
              {[{ k: "name", l: "Full Name", p: "Your full name", t: "text" }, { k: "email", l: "Email", p: "you@email.com", t: "email" }, { k: "phone", l: "Phone", p: "+91 XXXXX XXXXX", t: "tel" }, { k: "company", l: "Company (Optional)", p: "Company name", t: "text" }].map(f => <div key={f.k} style={{ marginBottom: 16 }}><label style={lbl}>{f.l}</label><input type={f.t} value={indF[f.k]} onChange={e => setIndF({ ...indF, [f.k]: e.target.value })} placeholder={f.p} style={inp} /></div>)}
              <div style={{ marginBottom: 24 }}><label style={{ ...lbl, marginBottom: 10 }}>Payment</label><div style={{ display: "flex", gap: 10 }}>{[{ v: "monthly", l: "\u20B98,000/month", s: "Monthly" }, { v: "annual", l: "\u20B996,000/year", s: "Save \u20B9600 \u00B7 Annual" }].map(o => <button key={o.v} onClick={() => setIndF({ ...indF, payment: o.v })} style={{ flex: 1, padding: "14px 12px", borderRadius: 8, cursor: "pointer", fontFamily: "inherit", textAlign: "center", background: indF.payment === o.v ? C.goldS : C.bg, border: indF.payment === o.v ? `2px solid ${C.gold}` : `1px solid ${C.brd}`, color: indF.payment === o.v ? C.gold : C.tm }}><div style={{ fontSize: 15, fontWeight: 600 }}>{o.l}</div><div style={{ fontSize: 11, marginTop: 2, opacity: 0.7 }}>{o.s}</div></button>)}</div></div>
              <button onClick={submitInd} disabled={submitting} style={{ width: "100%", background: `linear-gradient(135deg,${C.gold},${C.goldL})`, color: C.white, border: "none", padding: "15px", borderRadius: 8, fontSize: 15, fontWeight: 600, cursor: submitting ? "wait" : "pointer", fontFamily: "inherit", boxShadow: `0 4px 20px ${C.gold}33`, display: "flex", alignItems: "center", justifyContent: "center", gap: 8, opacity: submitting ? 0.7 : 1 }}>{submitting ? "Processing..." : <>Sponsor Now — {indF.payment === "monthly" ? "\u20B98,000/mo" : "\u20B996,000/yr"} <Arrow /></>}</button>
              <p style={{ textAlign: "center", fontSize: 11, color: C.tl, marginTop: 10 }}>Secure Razorpay {"\u00B7"} 80G tax receipt {"\u00B7"} Cancel anytime</p>
            </div>
          </section>
        )}
        {opt === 1 && done && (
          <section style={{ maxWidth: 520, margin: "0 auto", padding: "0 28px 60px", textAlign: "center" }}>
            <div style={{ background: C.greenS, border: `1px solid ${C.green}22`, borderRadius: 16, padding: 40 }}>
              <div style={{ color: C.green, marginBottom: 12 }}><Check s={36} /></div>
              <h3 style={{ fontFamily: "'Playfair Display', serif", fontSize: 24, marginBottom: 8, color: C.green }}>Thank You, {indF.name.split(" ")[0]}!</h3>
              <p style={{ color: C.tm, fontSize: 14, lineHeight: 1.6, marginBottom: 12 }}>Redirecting to Razorpay for {indF.payment === "monthly" ? "\u20B98,000/month subscription" : "\u20B996,000 annual payment"}...</p>
              <p style={{ color: C.tl, fontSize: 13, marginBottom: 16 }}>Tax receipt and fellowship updates will be sent to {indF.email}</p>
              {/* Post-donation share prompt */}
              <div style={{ background: C.white, borderRadius: 10, padding: "16px", border: `1px solid ${C.brdL}`, marginTop: 16 }}>
                <p style={{ fontSize: 13, color: C.tm, marginBottom: 8, fontWeight: 500 }}>Double your impact — share with friends</p>
                <button onClick={() => { const t = `I just sponsored a girl's education through Ilika Foundation this Women's Day! 🎓 You can too: ilikafoundation.org`; if (navigator.share) navigator.share({ text: t }); else navigator.clipboard?.writeText(t); }} style={{ background: `linear-gradient(135deg,${C.green},${C.greenL})`, color: C.white, border: "none", padding: "10px 24px", borderRadius: 6, fontSize: 13, fontWeight: 600, cursor: "pointer", fontFamily: "inherit", display: "inline-flex", alignItems: "center", gap: 6 }}><Share s={14} />Share on WhatsApp</button>
              </div>
            </div>
          </section>
        )}
        {opt === 2 && (
          <section style={{ maxWidth: 520, margin: "0 auto", padding: "0 28px 60px", animation: "fadeUp 0.4s ease" }}>
            <div style={{ background: C.white, borderRadius: 16, padding: 32, border: `1px solid ${C.brd}`, boxShadow: "0 2px 12px rgba(0,0,0,0.04)" }}>
              <h3 style={{ fontFamily: "'Playfair Display', serif", fontSize: 22, marginBottom: 4, color: C.green }}>Start a Group</h3>
              <p style={{ color: C.tl, fontSize: 13, marginBottom: 24 }}>You'll get a unique link to share with 3 friends. Once all 4 join, one girl's future is funded.</p>
              {["name", "email", "phone"].map(f => <div key={f} style={{ marginBottom: 16 }}><label style={lbl}>{f === "name" ? "Your Name" : f.charAt(0).toUpperCase() + f.slice(1)}</label><input type={f === "email" ? "email" : f === "phone" ? "tel" : "text"} value={grpF[f]} onChange={e => setGrpF({ ...grpF, [f]: e.target.value })} placeholder={f === "name" ? "Your full name" : f === "email" ? "you@email.com" : "+91 XXXXX XXXXX"} style={inp} /></div>)}
              <button onClick={submitGrp} disabled={submitting} style={{ width: "100%", background: `linear-gradient(135deg,${C.green},${C.greenL})`, color: C.white, border: "none", padding: "15px", borderRadius: 8, fontSize: 15, fontWeight: 600, cursor: submitting ? "wait" : "pointer", fontFamily: "inherit", boxShadow: `0 4px 20px ${C.green}33`, display: "flex", alignItems: "center", justifyContent: "center", gap: 8, opacity: submitting ? 0.7 : 1 }}>{submitting ? "Creating Group..." : <>Create Group & Get Link <Arrow /></>}</button>
              <p style={{ textAlign: "center", fontSize: 11, color: C.tl, marginTop: 10 }}>You're sponsor #1 of 4 {"\u00B7"} Share via WhatsApp, text, or email</p>
            </div>
          </section>
        )}

        {/* ============ CLOSING CTA ============ */}
        <section style={{ ...secStyle, padding: "48px 28px 64px", ...an(0.35) }}>
          <div style={{ background: `linear-gradient(135deg,${C.green},${C.greenL})`, borderRadius: 20, padding: "48px 36px", textAlign: "center", color: C.white, position: "relative", overflow: "hidden" }}>
            <div style={{ position: "absolute", top: -30, right: -30, width: 200, height: 200, background: "rgba(255,255,255,0.03)", borderRadius: "50%" }} />
            <h2 style={{ fontFamily: "'Playfair Display', serif", fontSize: "clamp(20px, 3.5vw, 32px)", lineHeight: 1.3, marginBottom: 16, fontWeight: 400, position: "relative" }}>Right now, somewhere in India, a girl is wondering<br />if anyone believes she deserves a chance.</h2>
            <p style={{ fontSize: 15, lineHeight: 1.7, opacity: 0.85, maxWidth: 480, margin: "0 auto 24px", position: "relative" }}>You do. {"\u20B9"}8,000/month — or {"\u20B9"}2,000 with three friends — is all it takes.</p>
            <div style={{ display: "flex", flexWrap: "wrap", justifyContent: "center", gap: 12, position: "relative" }}>
              <button onClick={() => { setOpt(1); setDone(false); scrollToSponsor(); }} style={{ background: C.gold, color: C.white, border: "none", padding: "14px 32px", borderRadius: 8, fontSize: 15, fontWeight: 600, cursor: "pointer", fontFamily: "inherit", display: "flex", alignItems: "center", gap: 8 }}>Sponsor a Girl <Arrow /></button>
              <button onClick={() => { setOpt(2); setDone(false); scrollToSponsor(); }} style={{ background: "rgba(255,255,255,0.15)", color: C.white, border: "1px solid rgba(255,255,255,0.3)", padding: "14px 32px", borderRadius: 8, fontSize: 15, fontWeight: 600, cursor: "pointer", fontFamily: "inherit", display: "flex", alignItems: "center", gap: 8 }}>Start a Group <Users s={16} /></button>
            </div>
            <div style={{ marginTop: 16, position: "relative" }}><Facepile count={6} size={26} label={<span style={{ color: "rgba(255,255,255,0.75)" }}>Join {stats.totalSponsors} sponsors who already said yes</span>} /></div>
          </div>
        </section>

        {/* ============ FAQ / OBJECTION HANDLING ============ */}
        <section style={{ ...secStyle, padding: "0 28px 48px", ...an(0.38) }}>
          <div style={{ textAlign: "center", marginBottom: 24 }}><h3 style={{ fontFamily: "'Playfair Display', serif", fontSize: 20, color: C.green }}>Common Questions</h3></div>
          {[
            { q: "Where does my money go?", a: "100% funds the Ilika Fellowship — tuition, mentorship, learning tools, career training, and network access for one girl. Ilika publishes audited financials annually." },
            { q: "Do I get a tax benefit?", a: "Yes. All donations qualify for 80G tax exemption. You'll receive your certificate immediately after payment. 50% of your donation is deductible from taxable income." },
            { q: "Can I cancel anytime?", a: "Yes. Your Razorpay subscription can be cancelled at any point. We hope you'll stay, but there's zero lock-in." },
            { q: "How is this different from other donation platforms?", a: "You're not just paying fees. You're funding an entire ecosystem — a personal mentor, career training, internships, professional networks. And every Fellow takes the Karmic Pledge to pay it forward." },
            { q: "How will I know my sponsorship is making a difference?", a: "You'll receive regular progress updates, milestone reports, and direct impact stories from the Fellow your sponsorship supports." },
          ].map((faq, i) => (
            <details key={i} style={{ background: C.white, borderRadius: 10, border: `1px solid ${C.brdL}`, marginBottom: 8, cursor: "pointer" }}>
              <summary style={{ padding: "16px 20px", fontSize: 14, fontWeight: 600, color: C.td, listStyle: "none", display: "flex", justifyContent: "space-between", alignItems: "center" }}>{faq.q}<span style={{ color: C.tl, fontSize: 18, fontWeight: 300 }}>+</span></summary>
              <div style={{ padding: "0 20px 16px", fontSize: 14, lineHeight: 1.7, color: C.tm }}>{faq.a}</div>
            </details>
          ))}
        </section>

        {/* Footer */}
        <footer style={{ textAlign: "center", padding: "40px 28px", borderTop: `1px solid ${C.brdL}` }}>
          <div style={{ fontFamily: "'Playfair Display', serif", fontSize: 20, color: C.green, marginBottom: 8, fontWeight: 700 }}>ilika</div>
          <p style={{ color: C.tx, fontSize: 12, marginBottom: 4 }}>Adopt Her Future — Women's Day Initiative</p>
          <p style={{ color: C.tx, fontSize: 11 }}>{"\u00A9"} 2025 Twelve Ten Empowering Possibilities Foundation {"\u00B7"} Section 8 {"\u00B7"} 80G Registered</p>
        </footer>
      </div>

      {/* ============ STICKY BOTTOM CTA BAR ============ */}
      <div style={{ position: "fixed", bottom: 0, left: 0, right: 0, background: C.white, borderTop: `1px solid ${C.brd}`, padding: "10px 20px", display: "flex", alignItems: "center", justifyContent: "space-between", gap: 12, zIndex: 100, boxShadow: "0 -2px 12px rgba(0,0,0,0.06)" }}>
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ fontSize: 12, color: C.tl }}>{stats.totalSponsors} sponsors {"\u00B7"} 18 days left</div>
          <div style={{ fontFamily: "'Playfair Display', serif", fontSize: 16, color: C.green, fontWeight: 600 }}>From {"\u20B9"}2,000/mo</div>
        </div>
        <button onClick={() => { setOpt(opt || 1); setDone(false); scrollToSponsor(); }} style={{ background: `linear-gradient(135deg,${C.gold},${C.goldL})`, color: C.white, border: "none", padding: "12px 28px", borderRadius: 8, fontSize: 14, fontWeight: 600, cursor: "pointer", fontFamily: "inherit", whiteSpace: "nowrap", boxShadow: `0 2px 12px ${C.gold}33` }}>Sponsor Now</button>
      </div>
      {/* Bottom padding for sticky bar */}
      <div style={{ height: 60 }} />
    </div>
  );
}
