import { useState, useEffect, useRef } from "react";

// ─── Constants ────────────────────────────────────────────────────────────────
const INTERVIEW_SYSTEM = `You are conducting a user research interview for "Let's Go!" — an AI-powered car buying advisor for India. Your role is a warm, genuinely curious human interviewer.

ABSOLUTE RULES — never break these:
- Ask ONE question per message. Never stack questions.
- Always acknowledge what the participant said before moving on. One sentence of reflection, then your next question.
- Write in flowing natural sentences. Never use bullet points, lists, or headers.
- The topics below are a MAP to navigate, not a checklist to complete. Touch each theme lightly — 1 to 2 exchanges maximum — then move on. Only go deeper if the participant says something emotionally charged or surprising.
- Never exhaust a topic. If you have enough signal, move on even if you could ask more.
- Never mention you are following a script or structure.
- Never ask someone to walk you through a past purchase step by step — that goes too deep. A single light question about how they generally make decisions is enough.

HOW TO PACE THE CONVERSATION:
Think of this as three acts, not a checklist.

ACT 1 — GET TO KNOW THEM (exchanges 1–8):
Open with who they are and where they are in life right now. Cover these themes lightly — one question each, move on when you have the signal:
Who they are and where they live. Who they live with and what their life looks like day to day. What they do for work and how they get around. What a good weekend looks like for them. What they are working towards in life right now — one question, light touch. How they generally make decisions — gut or research — one question only, do not ask for examples or past purchase walkthroughs.

Around exchange 6–8, introduce the car naturally. Ask what they currently drive, and whether they are actively looking for a new car or have bought one recently. Frame it conversationally — something like "Given everything you've told me about how you get around — are you thinking about a new car, or have you recently gone through that process?" This is the branching point. Listen carefully to their answer and then follow the right track below.

ACT 2 — THE CAR STORY (exchanges 9–22):
There are two versions of this act depending on what the participant says. Follow the one that matches their situation.

TRACK A — PLANNING TO BUY (active decision):
Use this if they are currently researching or planning to buy within the next few months.
Cover: What triggered the thought of buying now. What they are looking for — body type, size, fuel, budget — let them lead. What research they have done and what has frustrated them. Who else is involved in the decision — partner, family. What cars are on their shortlist and how they got there. What is still holding them back from deciding. What they would regret most in 3 years. What an ideal car advisor would look like for someone like them.

TRACK B — RECENTLY BOUGHT (within the last year):
Use this if they bought a car in the last 12 months.
Cover: What triggered the purchase at that point in their life. How they started the research and what sources they used. What confused or frustrated them most during the process. Who else was involved and how that affected the decision. What they ultimately bought and why that car won. How they feel about the decision now that they are living with it — any regrets, any surprises. What they wish had existed to make the process easier. What an ideal car advisor would have done differently for them.
The retrospective angle is valuable — push gently on "how do you feel about it now" and "is there anything you'd do differently". These answers are often the most honest in the whole conversation.

ACT 3 — WRAP UP (exchanges 23–27):
Ask if anything went unsaid. Then ask: "If you had to describe this whole car-buying process in one word or phrase, what would it be?" Close warmly and genuinely.

FEEDBACK (final exchange — always last):
After your warm closing, ask one final question: "Before we finish — how did this conversation feel for you? Was it useful, and is there anything about the format or the questions that you'd change?" Wait for their response, acknowledge it warmly with one sentence, then end the conversation.

After your final acknowledgement — and only then — add this exact string on a new line by itself:
[INTERVIEW_COMPLETE]

TONE: Warm. Curious. Light. Move like a good conversation, not an interview. The participant should feel understood, not interrogated. If something they say is interesting, stay with it briefly — but always keep moving forward.`;

const SYNTHESIS_SYSTEM = `You are a senior user research analyst. Given a research interview transcript, produce a structured synthesis as a JSON object. Return ONLY valid JSON — no markdown fences, no preamble, no explanation.`;

// ─── Storage helpers (Vercel KV via API) ─────────────────────────────────────
const db = {
  async get(key) {
    try {
      const res = await fetch('/api/data', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'get', key }),
      });
      const json = await res.json();
      return json.data ?? null;
    } catch { return null; }
  },
  async set(key, val) {
    try {
      await fetch('/api/data', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'set', key, value: val }),
      });
      return true;
    } catch (e) { console.error('KV error', e); return false; }
  },
};

// ─── API helper — calls our own /api/chat proxy ───────────────────────────────
async function claude(system, messages, maxTokens = 900) {
  const res = await fetch("/api/chat", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ system, messages, max_tokens: maxTokens }),
  });
  const data = await res.json();
  if (data.error) throw new Error(data.error);
  return data.content?.map(b => b.text || "").join("") || "";
}

// ─── Colours ──────────────────────────────────────────────────────────────────
const S = {
  navy: "#1A3A5C", blue: "#2563EB", teal: "#0E7490",
  amber: "#D97706", green: "#15803D", red: "#DC2626",
  gray: "#64748B", light: "#F1F5F9", white: "#FFFFFF", black: "#0F172A",
  blueLight: "#EFF6FF", tealLight: "#F0FDFA",
};

// ─── Tiny shared components ───────────────────────────────────────────────────
function Logo({ size = 28 }) {
  return (
    <span style={{ fontFamily: "Georgia, serif", fontWeight: 700, fontSize: size, color: S.blue, letterSpacing: "-0.5px" }}>
      Let's <span style={{ color: S.teal }}>Go!</span>
    </span>
  );
}

function Badge({ label, color = S.blue, bg = S.blueLight }) {
  return (
    <span style={{ display: "inline-block", padding: "2px 10px", borderRadius: 99, fontSize: 11, fontWeight: 700, color, background: bg, letterSpacing: "0.3px", textTransform: "uppercase" }}>
      {label}
    </span>
  );
}

function Spinner() {
  return (
    <span style={{ display: "inline-flex", gap: 4, alignItems: "center", padding: "4px 0" }}>
      {[0, 1, 2].map(i => (
        <span key={i} style={{
          width: 7, height: 7, borderRadius: "50%", background: S.teal,
          animation: "bounce 1.2s ease-in-out infinite",
          animationDelay: `${i * 0.2}s`,
        }} />
      ))}
      <style>{`@keyframes bounce{0%,80%,100%{transform:scale(0.6);opacity:0.4}40%{transform:scale(1);opacity:1}}`}</style>
    </span>
  );
}

// ─── SCREEN: Welcome ──────────────────────────────────────────────────────────
function WelcomeScreen({ onStart, onAdmin }) {
  const [name, setName] = useState("");
  const [hover, setHover] = useState(false);
  const ready = name.trim().length > 0;

  return (
    <div style={{ minHeight: "100vh", background: `linear-gradient(135deg, ${S.navy} 0%, #0F2640 60%, #0A1628 100%)`, display: "flex", alignItems: "center", justifyContent: "center", fontFamily: "system-ui, sans-serif", padding: 20 }}>
      <div style={{ width: "100%", maxWidth: 460 }}>
        <div style={{ textAlign: "center", marginBottom: 40 }}>
          <div style={{ fontFamily: "Georgia, serif", fontSize: 54, fontWeight: 700, color: S.white, letterSpacing: "-1px", marginBottom: 6 }}>
            Let's <span style={{ color: S.blue }}>Go!</span>
          </div>
          <div style={{ fontSize: 15, color: "#93C5FD", fontStyle: "italic", marginBottom: 4 }}>User Research Interview</div>
          <div style={{ fontSize: 11, color: "#475569", letterSpacing: "1.5px", textTransform: "uppercase" }}>MVP · Phase 1</div>
        </div>

        <div style={{ background: "rgba(255,255,255,0.05)", backdropFilter: "blur(12px)", border: "1px solid rgba(255,255,255,0.1)", borderRadius: 20, padding: 36 }}>
          <p style={{ color: "#CBD5E1", fontSize: 14, lineHeight: 1.8, marginBottom: 28, marginTop: 0 }}>
            This is a research conversation — not a test. There are no right or wrong answers.
            We'll start by talking about <em>you</em>, before cars come up at all. It usually takes about 60 minutes.
          </p>

          <label style={{ display: "block", fontSize: 11, fontWeight: 700, color: "#94A3B8", letterSpacing: "1px", textTransform: "uppercase", marginBottom: 8 }}>
            Your first name
          </label>
          <input
            value={name}
            onChange={e => setName(e.target.value)}
            onKeyDown={e => e.key === "Enter" && ready && onStart(name.trim())}
            placeholder="e.g. Arjun"
            autoFocus
            style={{
              width: "100%", boxSizing: "border-box",
              padding: "13px 16px", borderRadius: 10,
              border: `1.5px solid ${ready ? S.blue : "rgba(255,255,255,0.15)"}`,
              background: "rgba(255,255,255,0.08)", color: S.white,
              fontSize: 16, outline: "none", marginBottom: 16,
              transition: "border-color 0.2s",
            }}
          />

          <button
            onClick={() => ready && onStart(name.trim())}
            onMouseEnter={() => setHover(true)}
            onMouseLeave={() => setHover(false)}
            style={{
              width: "100%", padding: 14, borderRadius: 10, border: "none",
              background: ready ? (hover ? "#1D4ED8" : S.blue) : "rgba(255,255,255,0.1)",
              color: ready ? S.white : "#475569",
              fontSize: 16, fontWeight: 700, cursor: ready ? "pointer" : "default",
              transition: "all 0.2s", letterSpacing: "0.3px",
            }}
          >
            Begin conversation →
          </button>
        </div>

        <div style={{ textAlign: "center", marginTop: 20 }}>
          <button onClick={onAdmin} style={{ background: "none", border: "none", color: "#334155", fontSize: 12, cursor: "pointer" }}>
            View research results ↗
          </button>
        </div>
      </div>
    </div>
  );
}

// ─── SCREEN: Interview ────────────────────────────────────────────────────────
function InterviewScreen({ name, messages, loading, input, setInput, onSend, onWrapUp, userMsgCount }) {
  const bottomRef = useRef(null);
  const inputRef = useRef(null);
  const showWrapUp = userMsgCount >= 22 && !loading;

  useEffect(() => { bottomRef.current?.scrollIntoView({ behavior: "smooth" }); }, [messages, loading]);
  useEffect(() => { if (!loading) inputRef.current?.focus(); }, [loading]);

  const handleKey = e => {
    if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); onSend(); }
  };

  const phase = userMsgCount < 6 ? "Getting to know you"
    : userMsgCount < 14 ? "Your life & context"
    : userMsgCount < 20 ? "Your car journey"
    : "Wrapping up";
  const pct = Math.min(100, Math.round((userMsgCount / 28) * 100));

  return (
    <div style={{ height: "100vh", display: "flex", flexDirection: "column", background: "#F8FAFC" }}>
      {/* Top bar */}
      <div style={{ background: S.white, borderBottom: "1px solid #E2E8F0", padding: "12px 20px", display: "flex", alignItems: "center", justifyContent: "space-between", flexShrink: 0 }}>
        <Logo size={20} />
        <div style={{ display: "flex", alignItems: "center", gap: 16 }}>
          <div style={{ textAlign: "right" }}>
            <div style={{ fontSize: 11, color: S.gray, textTransform: "uppercase", letterSpacing: "0.6px" }}>{phase}</div>
            <div style={{ height: 4, width: 100, background: "#E2E8F0", borderRadius: 99, marginTop: 3, overflow: "hidden" }}>
              <div style={{ height: "100%", width: `${pct}%`, background: `linear-gradient(90deg, ${S.blue}, ${S.teal})`, borderRadius: 99, transition: "width 0.5s ease" }} />
            </div>
          </div>
          <div style={{ fontSize: 13, color: "#94A3B8" }}>Talking with <strong style={{ color: S.navy }}>{name}</strong></div>
        </div>
      </div>

      {/* Messages */}
      <div style={{ flex: 1, overflowY: "auto", padding: "24px 20px" }}>
        <div style={{ maxWidth: 680, margin: "0 auto", display: "flex", flexDirection: "column", gap: 20 }}>
          {messages.map((m, i) => (
            <div key={i} style={{ display: "flex", justifyContent: m.role === "user" ? "flex-end" : "flex-start" }}>
              {m.role === "assistant" && (
                <div style={{ width: 30, height: 30, borderRadius: "50%", background: `linear-gradient(135deg, ${S.blue}, ${S.teal})`, display: "flex", alignItems: "center", justifyContent: "center", marginRight: 10, flexShrink: 0, marginTop: 2, fontSize: 11, color: S.white, fontWeight: 700 }}>
                  LG
                </div>
              )}
              <div style={{
                maxWidth: m.isWelcome ? "88%" : "75%",
                padding: m.isWelcome ? "20px 22px" : "13px 17px",
                borderRadius: m.role === "user" ? "18px 18px 4px 18px" : "18px 18px 18px 4px",
                background: m.isWelcome ? `linear-gradient(135deg, ${S.navy}, ${S.teal})` : m.role === "user" ? `linear-gradient(135deg, ${S.blue}, ${S.teal})` : S.white,
                color: m.isWelcome ? S.white : m.role === "user" ? S.white : S.black,
                fontSize: m.isWelcome ? 14 : 14.5,
                lineHeight: m.isWelcome ? 1.85 : 1.75,
                boxShadow: m.role === "assistant" ? "0 1px 3px rgba(0,0,0,0.06)" : "none",
                border: m.isWelcome ? "none" : m.role === "assistant" ? "1px solid #F1F5F9" : "none",
                whiteSpace: "pre-line",
              }}>
                {m.content}
              </div>
              {m.role === "user" && (
                <div style={{ width: 30, height: 30, borderRadius: "50%", background: "#E2E8F0", display: "flex", alignItems: "center", justifyContent: "center", marginLeft: 10, flexShrink: 0, marginTop: 2, fontSize: 12, color: S.gray, fontWeight: 700 }}>
                  {name[0]?.toUpperCase()}
                </div>
              )}
            </div>
          ))}

          {loading && (
            <div style={{ display: "flex", alignItems: "flex-start", gap: 10 }}>
              <div style={{ width: 30, height: 30, borderRadius: "50%", background: `linear-gradient(135deg, ${S.blue}, ${S.teal})`, display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0, fontSize: 11, color: S.white, fontWeight: 700 }}>LG</div>
              <div style={{ background: S.white, border: "1px solid #F1F5F9", borderRadius: "18px 18px 18px 4px", padding: "12px 17px", boxShadow: "0 1px 3px rgba(0,0,0,0.06)" }}>
                <Spinner />
              </div>
            </div>
          )}
          <div ref={bottomRef} />
        </div>
      </div>

      {/* Input */}
      <div style={{ background: S.white, borderTop: "1px solid #E2E8F0", padding: "16px 20px", flexShrink: 0 }}>
        <div style={{ maxWidth: 680, margin: "0 auto" }}>
          {showWrapUp && (
            <div style={{ marginBottom: 10, textAlign: "center" }}>
              <button onClick={onWrapUp} style={{ background: "none", border: "1px solid #E2E8F0", borderRadius: 99, padding: "5px 16px", fontSize: 12, color: S.gray, cursor: "pointer" }}>
                Ready to wrap up →
              </button>
            </div>
          )}
          <div style={{ display: "flex", gap: 10 }}>
            <textarea
              ref={inputRef}
              value={input}
              onChange={e => setInput(e.target.value)}
              onKeyDown={handleKey}
              placeholder="Type your response…"
              disabled={loading}
              rows={2}
              style={{
                flex: 1, padding: "12px 15px", borderRadius: 12,
                border: `1.5px solid ${input ? S.blue : "#E2E8F0"}`,
                fontSize: 14.5, lineHeight: 1.5, resize: "none", outline: "none",
                color: S.black, background: S.white, transition: "border-color 0.2s",
                fontFamily: "system-ui, sans-serif",
              }}
            />
            <button
              onClick={onSend}
              disabled={loading || !input.trim()}
              style={{
                padding: "0 20px", borderRadius: 12, border: "none",
                background: input.trim() && !loading ? S.blue : "#E2E8F0",
                color: input.trim() && !loading ? S.white : "#94A3B8",
                cursor: input.trim() && !loading ? "pointer" : "default",
                fontSize: 20, transition: "all 0.2s", flexShrink: 0,
              }}
            >↑</button>
          </div>
          <div style={{ fontSize: 11, color: "#CBD5E1", textAlign: "center", marginTop: 8 }}>
            Enter to send · Shift+Enter for new line
          </div>
        </div>
      </div>
    </div>
  );
}

// ─── SCREEN: Synthesizing ─────────────────────────────────────────────────────
function SynthesizingScreen({ name }) {
  const [step, setStep] = useState(0);
  const steps = ["Reading the conversation…", "Identifying key themes…", "Mapping pain points…", "Generating synthesis…"];
  useEffect(() => {
    const t = setInterval(() => setStep(s => Math.min(s + 1, steps.length - 1)), 1900);
    return () => clearInterval(t);
  }, []);
  return (
    <div style={{ minHeight: "100vh", background: `linear-gradient(135deg, ${S.navy} 0%, #0F2640 100%)`, display: "flex", alignItems: "center", justifyContent: "center" }}>
      <div style={{ textAlign: "center", color: S.white }}>
        <Logo size={32} />
        <div style={{ marginTop: 32, marginBottom: 12, fontSize: 18, color: "#93C5FD" }}>Synthesising {name}'s session</div>
        <div style={{ fontSize: 14, color: "#64748B", minHeight: 24 }}>{steps[step]}</div>
        <div style={{ marginTop: 24, display: "flex", justifyContent: "center", gap: 6 }}>
          {steps.map((_, i) => (
            <div key={i} style={{ width: i <= step ? 24 : 6, height: 6, borderRadius: 99, background: i <= step ? S.blue : "#334155", transition: "all 0.4s" }} />
          ))}
        </div>
      </div>
    </div>
  );
}

// ─── SCREEN: Done ─────────────────────────────────────────────────────────────
function DoneScreen({ synthesis, name, onAdmin, onNew }) {
  const [copied, setCopied] = useState(false);

  const plainText = synthesis ? [
    `PARTICIPANT: ${synthesis.participant_name}`,
    `PERSONA: ${synthesis.persona_match}`,
    `DESCRIPTION: ${synthesis.three_word_description}`,
    `\n— LIFE CONTEXT —`,
    `Life stage: ${synthesis.life_context?.life_stage}`,
    `Household: ${synthesis.life_context?.household}`,
    `Motivation: ${synthesis.life_context?.motivation}`,
    `Money relationship: ${synthesis.life_context?.money_relationship}`,
    `Decision style: ${synthesis.life_context?.decision_style}`,
    `Info sources: ${synthesis.life_context?.info_sources}`,
    `\n— CAR JOURNEY —`,
    `Trigger: ${synthesis.car_journey?.trigger}`,
    `Biggest confusion: ${synthesis.car_journey?.biggest_confusion}`,
    `What was missing: ${synthesis.car_journey?.what_was_missing}`,
    `Regret fear: ${synthesis.car_journey?.regret_fear}`,
    `Confidence trigger: ${synthesis.car_journey?.confidence_trigger}`,
    `Shortlist: ${synthesis.car_journey?.current_shortlist}`,
    `Timeline: ${synthesis.car_journey?.buying_timeline}`,
    `\n— BEST QUOTES —`,
    ...(synthesis.best_quotes || []).map((q, i) => `${i + 1}. "${q.quote}"\n   Why it matters: ${q.why_it_matters}`),
    `\n— BIGGEST SURPRISE —`,
    synthesis.biggest_surprise,
    `\n— PRODUCT IMPLICATION —`,
    synthesis.product_implication,
    `\n— PERSONA CONFIRMED —`,
    ...(synthesis.persona_confirmed || []).map(c => `• ${c}`),
    `\n— UPDATED / NEW INSIGHT —`,
    ...(synthesis.persona_updated || []).map(u => `• ${u}`),
  ].join("\n") : "";

  const copy = () => { navigator.clipboard.writeText(plainText); setCopied(true); setTimeout(() => setCopied(false), 2000); };

  if (!synthesis) return (
    <div style={{ minHeight: "100vh", display: "flex", alignItems: "center", justifyContent: "center" }}>
      <div style={{ textAlign: "center", fontFamily: "system-ui, sans-serif" }}>
        <div style={{ fontSize: 18, color: S.red, marginBottom: 12 }}>Could not generate synthesis.</div>
        <div style={{ fontSize: 14, color: S.gray, marginBottom: 20 }}>The conversation was saved. You can view it in the admin panel.</div>
        <button onClick={onAdmin} style={{ background: S.blue, color: S.white, border: "none", borderRadius: 8, padding: "10px 20px", cursor: "pointer", fontSize: 14 }}>Go to admin →</button>
      </div>
    </div>
  );

  return (
    <div style={{ minHeight: "100vh", background: "#F8FAFC", fontFamily: "system-ui, sans-serif" }}>
      <div style={{ background: S.white, borderBottom: "1px solid #E2E8F0", padding: "16px 24px", display: "flex", alignItems: "center", justifyContent: "space-between" }}>
        <Logo size={22} />
        <div style={{ display: "flex", gap: 10 }}>
          <button onClick={copy} style={{ padding: "8px 16px", borderRadius: 8, border: "1px solid #E2E8F0", background: copied ? S.green : S.white, color: copied ? S.white : S.gray, fontSize: 13, cursor: "pointer" }}>
            {copied ? "✓ Copied" : "Copy synthesis"}
          </button>
          <button onClick={onAdmin} style={{ padding: "8px 16px", borderRadius: 8, border: "none", background: S.blue, color: S.white, fontSize: 13, cursor: "pointer", fontWeight: 600 }}>
            View all sessions →
          </button>
        </div>
      </div>

      <div style={{ maxWidth: 760, margin: "0 auto", padding: "32px 24px" }}>
        {/* Hero banner */}
        <div style={{ background: `linear-gradient(135deg, ${S.navy}, ${S.teal})`, borderRadius: 16, padding: 28, color: S.white, marginBottom: 24 }}>
          <div style={{ fontSize: 12, color: "#93C5FD", marginBottom: 4, textTransform: "uppercase", letterSpacing: "1px" }}>Session complete</div>
          <div style={{ fontFamily: "Georgia, serif", fontSize: 26, fontWeight: 700, marginBottom: 8 }}>{synthesis.participant_name}</div>
          <div style={{ display: "flex", gap: 10, flexWrap: "wrap" }}>
            <Badge label={synthesis.persona_match} color={S.white} bg="rgba(255,255,255,0.15)" />
            <Badge label={synthesis.three_word_description} color="#93C5FD" bg="rgba(255,255,255,0.1)" />
            {synthesis.buyer_status && <Badge label={synthesis.buyer_status} color="#A7F3D0" bg="rgba(255,255,255,0.08)" />}
          </div>
        </div>

        {/* Two-col grid */}
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 16, marginBottom: 16 }}>
          <Card title="Life Context" accent={S.blue}>
            {[
              ["Life stage", synthesis.life_context?.life_stage],
              ["Household", synthesis.life_context?.household],
              ["Motivation", synthesis.life_context?.motivation],
              ["Money relationship", synthesis.life_context?.money_relationship],
              ["Decision style", synthesis.life_context?.decision_style],
              ["Info sources", synthesis.life_context?.info_sources],
            ].map(([k, v]) => v && <Field key={k} label={k} value={v} />)}
          </Card>
          <Card title="Car Journey" accent={S.teal}>
            {[
              ["Trigger", synthesis.car_journey?.trigger],
              ["Biggest confusion", synthesis.car_journey?.biggest_confusion],
              ["What was missing", synthesis.car_journey?.what_was_missing],
              ["Regret fear", synthesis.car_journey?.regret_fear],
              ["Cars considering / Bought", synthesis.car_journey?.current_shortlist || synthesis.car_journey?.car_purchased],
              ["Timeline / Purchase", synthesis.car_journey?.buying_timeline || synthesis.car_journey?.purchase_date_approx],
              ["Feeling about decision now", synthesis.car_journey?.feeling_about_decision_now],
              ["Wish had existed", synthesis.car_journey?.what_they_wish_existed],
            ].map(([k, v]) => v && <Field key={k} label={k} value={v} />)}
          </Card>
        </div>

        {/* Quotes */}
        {synthesis.best_quotes?.length > 0 && (
          <div style={{ marginBottom: 16 }}>
            <SectionLabel>Best Quotes</SectionLabel>
            <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
              {synthesis.best_quotes.map((q, i) => (
                <div key={i} style={{ background: S.white, borderRadius: 12, padding: 18, border: "1px solid #E2E8F0", borderLeft: `4px solid ${[S.blue, S.teal, S.amber][i % 3]}` }}>
                  <div style={{ fontSize: 14, color: S.navy, fontStyle: "italic", lineHeight: 1.65, marginBottom: 6 }}>"{q.quote}"</div>
                  <div style={{ fontSize: 12, color: S.gray, lineHeight: 1.5 }}>→ {q.why_it_matters}</div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Confirmed / Updated */}
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 16, marginBottom: 16 }}>
          <div style={{ background: "#F0FDF4", borderRadius: 12, padding: 18, border: "1px solid #BBF7D0" }}>
            <div style={{ fontSize: 11, fontWeight: 700, color: S.green, textTransform: "uppercase", letterSpacing: "0.8px", marginBottom: 12 }}>Persona Confirmed</div>
            {(synthesis.persona_confirmed || []).map((c, i) => <div key={i} style={{ fontSize: 13, color: S.black, lineHeight: 1.6, marginBottom: 6 }}>✓ {c}</div>)}
          </div>
          <div style={{ background: "#FFFBEB", borderRadius: 12, padding: 18, border: "1px solid #FDE68A" }}>
            <div style={{ fontSize: 11, fontWeight: 700, color: S.amber, textTransform: "uppercase", letterSpacing: "0.8px", marginBottom: 12 }}>Updated / New Insight</div>
            {(synthesis.persona_updated || []).map((u, i) => <div key={i} style={{ fontSize: 13, color: S.black, lineHeight: 1.6, marginBottom: 6 }}>→ {u}</div>)}
          </div>
        </div>

        {/* Surprise + Implication */}
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 16 }}>
          {synthesis.biggest_surprise && (
            <div style={{ background: S.white, borderRadius: 12, padding: 18, border: "1px solid #E2E8F0" }}>
              <div style={{ fontSize: 11, fontWeight: 700, color: S.gray, textTransform: "uppercase", letterSpacing: "0.8px", marginBottom: 8 }}>Biggest Surprise</div>
              <div style={{ fontSize: 13, color: S.black, lineHeight: 1.6 }}>{synthesis.biggest_surprise}</div>
            </div>
          )}
          {synthesis.product_implication && (
            <div style={{ background: S.blueLight, borderRadius: 12, padding: 18, border: "1px solid #BFDBFE" }}>
              <div style={{ fontSize: 11, fontWeight: 700, color: S.blue, textTransform: "uppercase", letterSpacing: "0.8px", marginBottom: 8 }}>Product Implication</div>
              <div style={{ fontSize: 13, color: S.navy, lineHeight: 1.6 }}>{synthesis.product_implication}</div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

function Card({ title, accent, children }) {
  return (
    <div style={{ background: S.white, borderRadius: 12, padding: 20, border: "1px solid #E2E8F0" }}>
      <div style={{ fontSize: 11, fontWeight: 700, color: accent, textTransform: "uppercase", letterSpacing: "0.8px", marginBottom: 14 }}>{title}</div>
      {children}
    </div>
  );
}

function Field({ label, value }) {
  return (
    <div style={{ marginBottom: 10 }}>
      <div style={{ fontSize: 10, color: S.gray, fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.5px" }}>{label}</div>
      <div style={{ fontSize: 13, color: S.black, lineHeight: 1.55, marginTop: 2 }}>{value}</div>
    </div>
  );
}

function SectionLabel({ children }) {
  return <div style={{ fontSize: 11, fontWeight: 700, color: S.navy, textTransform: "uppercase", letterSpacing: "0.8px", marginBottom: 12 }}>{children}</div>;
}

// ─── SCREEN: Admin ────────────────────────────────────────────────────────────
const ADMIN_PASSWORD = "Randompasskey1!";

async function downloadTranscript(p, synth) {
  // Fetch transcript from KV
  const res = await fetch('/api/data', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ action: 'get', key: `letsgo:transcript:${p.id}` }),
  });
  const json = await res.json();
  const transcript = json.data || [];

  const lines = [
    `LET'S GO! — RESEARCH INTERVIEW TRANSCRIPT`,
    `==========================================`,
    `Participant: ${p.name}`,
    `Date: ${p.date}`,
    `Persona: ${p.persona || 'See synthesis'}`,
    ``,
    `── CONVERSATION ──`,
    ``,
    ...transcript
      .filter(m => !m.content.startsWith('(The participant'))
      .map(m => `${m.role === 'user' ? p.name.toUpperCase() : 'INTERVIEWER'}:\n${m.content}\n`),
    ``,
    `── SYNTHESIS ──`,
    ``,
    synth ? [
      `Persona match: ${synth.persona_match}`,
      `Description: ${synth.three_word_description}`,
      ``,
      `LIFE CONTEXT`,
      `Life stage: ${synth.life_context?.life_stage || ''}`,
      `Household: ${synth.life_context?.household || ''}`,
      `Motivation: ${synth.life_context?.motivation || ''}`,
      `Money relationship: ${synth.life_context?.money_relationship || ''}`,
      `Decision style: ${synth.life_context?.decision_style || ''}`,
      ``,
      `CAR JOURNEY`,
      `Trigger: ${synth.car_journey?.trigger || ''}`,
      `Biggest confusion: ${synth.car_journey?.biggest_confusion || ''}`,
      `What was missing: ${synth.car_journey?.what_was_missing || ''}`,
      `Regret fear: ${synth.car_journey?.regret_fear || ''}`,
      `Cars considering: ${synth.car_journey?.current_shortlist || ''}`,
      `Timeline: ${synth.car_journey?.buying_timeline || ''}`,
      ``,
      `PARTICIPANT FEEDBACK`,
      `Overall feeling: ${synth.participant_feedback?.overall_feeling || ''}`,
      `What worked: ${synth.participant_feedback?.what_worked || ''}`,
      `What to improve: ${synth.participant_feedback?.what_to_improve || ''}`,
      ``,
      `BEST QUOTES`,
      ...(synth.best_quotes || []).map((q, i) => `${i+1}. "${q.quote}"\n   → ${q.why_it_matters}`),
      ``,
      `Biggest surprise: ${synth.biggest_surprise || ''}`,
      `Product implication: ${synth.product_implication || ''}`,
    ].join('\n') : 'Synthesis not available',
  ].join('\n');

  const blob = new Blob([lines], { type: 'text/plain' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `letsgo-${p.name.replace(/\s+/g, '-').toLowerCase()}-${p.date.replace(/\//g, '-')}.txt`;
  a.click();
  URL.revokeObjectURL(url);
}

function AdminScreen({ participants, onHome, onView, viewingPid, viewingSynth }) {
  const [password, setPassword] = useState('');
  const [unlocked, setUnlocked] = useState(false);
  const [pwError, setPwError] = useState(false);

  if (!unlocked) {
    return (
      <div style={{ minHeight: '100vh', background: `linear-gradient(135deg, ${S.navy} 0%, #0F2640 100%)`, display: 'flex', alignItems: 'center', justifyContent: 'center', fontFamily: 'system-ui, sans-serif' }}>
        <div style={{ width: '100%', maxWidth: 360, background: 'rgba(255,255,255,0.05)', backdropFilter: 'blur(12px)', border: '1px solid rgba(255,255,255,0.1)', borderRadius: 20, padding: 36 }}>
          <Logo size={22} />
          <div style={{ marginTop: 20, marginBottom: 6, fontSize: 16, fontWeight: 700, color: S.white }}>Admin access</div>
          <div style={{ fontSize: 13, color: '#64748B', marginBottom: 20 }}>Enter the admin password to view research sessions.</div>
          <input
            type="password"
            value={password}
            onChange={e => { setPassword(e.target.value); setPwError(false); }}
            onKeyDown={e => {
              if (e.key === 'Enter') {
                if (password === ADMIN_PASSWORD) setUnlocked(true);
                else setPwError(true);
              }
            }}
            placeholder="Password"
            autoFocus
            style={{ width: '100%', boxSizing: 'border-box', padding: '12px 14px', borderRadius: 10, border: `1.5px solid ${pwError ? S.red : 'rgba(255,255,255,0.15)'}`, background: 'rgba(255,255,255,0.08)', color: S.white, fontSize: 15, outline: 'none', marginBottom: 10 }}
          />
          {pwError && <div style={{ fontSize: 12, color: S.red, marginBottom: 10 }}>Incorrect password</div>}
          <button
            onClick={() => { if (password === ADMIN_PASSWORD) setUnlocked(true); else setPwError(true); }}
            style={{ width: '100%', padding: 12, borderRadius: 10, border: 'none', background: S.blue, color: S.white, fontSize: 15, fontWeight: 700, cursor: 'pointer' }}
          >
            Enter →
          </button>
        </div>
      </div>
    );
  }
  const statusColor = s => s === "complete" ? S.green : s === "in_progress" ? S.amber : S.gray;
  const statusBg   = s => s === "complete" ? "#F0FDF4" : s === "in_progress" ? "#FFFBEB" : "#F1F5F9";

  return (
    <div style={{ minHeight: "100vh", background: "#F8FAFC", fontFamily: "system-ui, sans-serif" }}>
      <div style={{ background: S.white, borderBottom: "1px solid #E2E8F0", padding: "16px 24px", display: "flex", alignItems: "center", gap: 16 }}>
        <button onClick={onHome} style={{ background: "none", border: "none", color: S.gray, cursor: "pointer", fontSize: 20 }}>←</button>
        <Logo size={22} />
        <span style={{ fontSize: 13, color: S.gray }}>/ Research Sessions</span>
        <Badge label={`${participants.filter(p => p.status === "complete").length} / ${participants.length} complete`} color={S.navy} bg={S.light} />
      </div>

      <div style={{ maxWidth: 960, margin: "0 auto", padding: "28px 24px" }}>
        {participants.length === 0 ? (
          <div style={{ textAlign: "center", padding: 80, color: S.gray }}>
            <div style={{ fontSize: 36, marginBottom: 12 }}>📋</div>
            <div style={{ fontSize: 16, marginBottom: 6 }}>No sessions yet</div>
            <div style={{ fontSize: 13 }}>Share the app URL with participants to get started.</div>
          </div>
        ) : (
          <div style={{ display: "grid", gridTemplateColumns: "260px 1fr", gap: 20 }}>
            {/* List */}
            <div>
              <div style={{ fontSize: 11, fontWeight: 700, color: S.gray, textTransform: "uppercase", letterSpacing: "0.8px", marginBottom: 12 }}>Participants</div>
              <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
                {participants.map(p => (
                  <div
                    key={p.id}
                    onClick={() => p.status === "complete" && onView(p)}
                    style={{
                      background: viewingPid?.id === p.id ? S.blueLight : S.white,
                      border: `1px solid ${viewingPid?.id === p.id ? S.blue : "#E2E8F0"}`,
                      borderRadius: 10, padding: "12px 14px",
                      cursor: p.status === "complete" ? "pointer" : "default",
                      transition: "all 0.15s",
                    }}
                  >
                    <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 4 }}>
                      <div style={{ fontWeight: 700, color: S.navy, fontSize: 14 }}>{p.name}</div>
                      <span style={{ fontSize: 10, fontWeight: 700, padding: "2px 8px", borderRadius: 99, color: statusColor(p.status), background: statusBg(p.status), textTransform: "uppercase" }}>
                        {p.status === "in_progress" ? "Active" : p.status}
                      </span>
                    </div>
                    <div style={{ fontSize: 11, color: S.gray }}>{p.date}</div>
                    {p.persona && <div style={{ fontSize: 11, color: S.teal, marginTop: 3 }}>{p.persona}</div>}
                    {p.status === 'complete' && (<button onClick={e => { e.stopPropagation(); downloadTranscript(p, viewingPid?.id === p.id ? viewingSynth : null); }} style={{ marginTop: 6, fontSize: 11, color: S.blue, background: 'none', border: '1px solid #BFDBFE', borderRadius: 6, padding: '3px 8px', cursor: 'pointer' }}>↓ Download transcript</button>)}
                  </div>
                ))}
              </div>
            </div>

            {/* Synthesis panel */}
            <div>
              {!viewingPid ? (
                <div style={{ background: S.white, borderRadius: 12, border: "1px solid #E2E8F0", padding: 60, textAlign: "center", color: S.gray }}>
                  <div style={{ fontSize: 28, marginBottom: 12 }}>👤</div>
                  <div style={{ fontSize: 14 }}>Select a completed session to view the synthesis</div>
                </div>
              ) : viewingSynth ? (
                <div style={{ background: S.white, borderRadius: 12, border: "1px solid #E2E8F0", overflow: "hidden" }}>
                  <div style={{ background: `linear-gradient(135deg, ${S.navy}, ${S.teal})`, padding: "20px 24px", color: S.white }}>
                    <div style={{ fontFamily: "Georgia, serif", fontSize: 20, fontWeight: 700, marginBottom: 6 }}>{viewingSynth.participant_name}</div>
                    <div style={{ display: "flex", gap: 8 }}>
                      <Badge label={viewingSynth.persona_match} color={S.white} bg="rgba(255,255,255,0.2)" />
                      <Badge label={viewingSynth.three_word_description} color="#93C5FD" bg="rgba(255,255,255,0.1)" />
                    </div>
                  </div>
                  <div style={{ padding: 20, overflowY: "auto", maxHeight: "calc(100vh - 280px)" }}>
                    {[
                      { label: "What triggered this", val: viewingSynth.car_journey?.trigger, color: S.blue },
                      { label: "Biggest confusion", val: viewingSynth.car_journey?.biggest_confusion, color: S.red },
                      { label: "Regret fear", val: viewingSynth.car_journey?.regret_fear, color: S.amber },
                      { label: "What was missing", val: viewingSynth.car_journey?.what_was_missing, color: S.teal },
                      { label: "Cars considering", val: viewingSynth.car_journey?.current_shortlist, color: S.navy },
                      { label: "Confidence trigger", val: viewingSynth.car_journey?.confidence_trigger, color: S.green },
                    ].map(({ label, val, color }) => val && (
                      <div key={label} style={{ marginBottom: 12, paddingBottom: 12, borderBottom: "1px solid #F1F5F9" }}>
                        <div style={{ fontSize: 10, fontWeight: 700, color, textTransform: "uppercase", letterSpacing: "0.6px", marginBottom: 3 }}>{label}</div>
                        <div style={{ fontSize: 13, color: S.black, lineHeight: 1.6 }}>{val}</div>
                      </div>
                    ))}
                    {viewingSynth.best_quotes?.[0] && (
                      <div style={{ background: S.blueLight, borderRadius: 10, padding: 14, marginBottom: 12, borderLeft: `4px solid ${S.blue}` }}>
                        <div style={{ fontSize: 13, color: S.navy, fontStyle: "italic", lineHeight: 1.6, marginBottom: 4 }}>"{viewingSynth.best_quotes[0].quote}"</div>
                        <div style={{ fontSize: 11, color: S.gray }}>→ {viewingSynth.best_quotes[0].why_it_matters}</div>
                      </div>
                    )}
                    {viewingSynth.product_implication && (
                      <div style={{ background: "#F0FDF4", borderRadius: 10, padding: 14, borderLeft: `4px solid ${S.green}` }}>
                    {viewingSynth.participant_feedback?.overall_feeling && (<div style={{ background: '#F5F3FF', borderRadius: 10, padding: 14, marginBottom: 12, borderLeft: '4px solid #6D28D9' }}><div style={{ fontSize: 10, fontWeight: 700, color: '#6D28D9', textTransform: 'uppercase', letterSpacing: '0.6px', marginBottom: 4 }}>Participant Feedback</div><div style={{ fontSize: 13, color: S.black, lineHeight: 1.6, marginBottom: 4 }}>{viewingSynth.participant_feedback.overall_feeling}</div>{viewingSynth.participant_feedback.what_to_improve && (<div style={{ fontSize: 12, color: S.gray }}>To improve: {viewingSynth.participant_feedback.what_to_improve}</div>)}</div>)}
                        <div style={{ fontSize: 10, fontWeight: 700, color: S.green, textTransform: "uppercase", letterSpacing: "0.6px", marginBottom: 4 }}>Product Implication</div>
                        <div style={{ fontSize: 13, color: S.black, lineHeight: 1.6 }}>{viewingSynth.product_implication}</div>
                      </div>
                    )}
                  </div>
                </div>
              ) : (
                <div style={{ background: S.white, borderRadius: 12, border: "1px solid #E2E8F0", padding: 40, textAlign: "center", color: S.gray }}>
                  Loading…
                </div>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

// ─── MAIN APP ─────────────────────────────────────────────────────────────────
export default function App() {
  const [screen, setScreen]           = useState("welcome");
  const [name, setName]               = useState("");
  const [pid, setPid]                 = useState("");
  const [messages, setMessages]       = useState([]);
  const [input, setInput]             = useState("");
  const [loading, setLoading]         = useState(false);
  const [synthesis, setSynthesis]     = useState(null);
  const [participants, setParticipants] = useState([]);
  const [viewingPid, setViewingPid]   = useState(null);
  const [viewingSynth, setViewingSynth] = useState(null);
  const [userMsgCount, setUserMsgCount] = useState(0);

  useEffect(() => {
    db.get("letsgo:participants").then(data => setParticipants(data || []));
  }, []);

  async function startInterview(participantName) {
    const id = `p_${Date.now()}`;
    setPid(id); setName(participantName); setUserMsgCount(0); setMessages([]);

    // Store participant in local state only — db write happens on completion
    const entry = { id, name: participantName, status: "in_progress", date: new Date().toLocaleDateString("en-IN") };
    setParticipants(prev => [...prev, entry]);
    setScreen("interview");
    setLoading(true);

    const welcomeMsg = { role: "assistant", content: `Welcome, and thank you for being here.

This is a research conversation for a product called Let's Go! — an AI-powered car buying advisor we're building for India.

Before we talk about cars at all, I'd love to spend some time just understanding you — how you live, how you get around, what you're working towards. That context is actually the most important part of what we're trying to learn.

There are no right or wrong answers. This isn't a quiz or a survey. Just an honest conversation, and your perspective genuinely shapes what we build.

You can stop at any point.

When you're ready — just tell me your name and we'll begin.`, isWelcome: true };
    setMessages([welcomeMsg]);

    const opening = [{ role: "user", content: `My name is ${participantName}. I'm ready to begin.` }];
    try {
      const reply = await claude(INTERVIEW_SYSTEM, opening);
      const done = reply.includes("[INTERVIEW_COMPLETE]");
      const clean = reply.replace("[INTERVIEW_COMPLETE]", "").trim();
      const msgs = [welcomeMsg, ...opening, { role: "assistant", content: clean }];
      setMessages(msgs);
      if (done) await runSynthesis(id, [...opening, { role: "assistant", content: clean }]);
    } catch (e) {
      setMessages([welcomeMsg, ...opening, { role: "assistant", content: "Sorry, there was an error starting the session. Please refresh and try again." }]);
    }
    setLoading(false);
  }

  async function sendMessage() {
    if (!input.trim() || loading) return;
    const userMsg = { role: "user", content: input.trim() };
    const newMsgs = [...messages, userMsg];
    setMessages(newMsgs); setInput(""); setLoading(true);
    setUserMsgCount(c => c + 1);

    try {
      const reply = await claude(INTERVIEW_SYSTEM, newMsgs);
      const done = reply.includes("[INTERVIEW_COMPLETE]");
      const clean = reply.replace("[INTERVIEW_COMPLETE]", "").trim();
      const finalMsgs = [...newMsgs, { role: "assistant", content: clean }];
      setMessages(finalMsgs);
      if (done) await runSynthesis(pid, finalMsgs);
    } catch (e) {
      setMessages(m => [...m, { role: "assistant", content: "I had trouble responding. Please try again." }]);
    }
    setLoading(false);
  }

  async function wrapUp() {
    if (loading) return;
    const wrapMsg = { role: "user", content: "(The participant has indicated they are ready to wrap up the interview.)" };
    const newMsgs = [...messages, wrapMsg];
    setLoading(true);
    try {
      const reply = await claude(INTERVIEW_SYSTEM, newMsgs);
      const clean = reply.replace("[INTERVIEW_COMPLETE]", "").trim();
      const finalMsgs = [...newMsgs, { role: "assistant", content: clean }];
      setMessages(finalMsgs);
      await runSynthesis(pid, finalMsgs);
    } catch { /* ignore */ }
    setLoading(false);
  }

  async function runSynthesis(id, transcript) {
    setScreen("synthesizing");
    const txt = transcript
      .filter(m => !m.content.startsWith("(The participant"))
      .map(m => `${m.role === "user" ? "PARTICIPANT" : "INTERVIEWER"}: ${m.content}`)
      .join("\n\n");

    const prompt = `Here is a user research interview transcript for "Let's Go!" — an AI-powered car buying advisor for India.\n\n${txt}\n\nProduce a synthesis JSON with this exact structure. Return only valid JSON, no markdown, no preamble:\n{\n  "participant_name": "string",\n  "buyer_status": "Planning to buy | Recently bought (within 1 year)",\n  "persona_match": "Newly-Wed Upgrader | Repeat Expert Buyer | Mixed | Other",\n  "three_word_description": "string (3 words)",\n  "life_context": {\n    "life_stage": "string",\n    "household": "string",\n    "motivation": "string",\n    "money_relationship": "string",\n    "decision_style": "string",\n    "info_sources": "string",\n    "social_pressure": "string"\n  },\n  "car_journey": {\n    "trigger": "string",\n    "biggest_confusion": "string",\n    "what_was_missing": "string",\n    "regret_fear": "string (for planning) or post_purchase_regret (for recent buyers)",\n    "confidence_trigger": "string (for planning) or what_made_them_decide (for recent buyers)",\n    "current_shortlist": "string (for planning) or car_purchased (for recent buyers)",\n    "buying_timeline": "string (for planning) or purchase_date_approx (for recent buyers)",\n    "feeling_about_decision_now": "string (recent buyers only — how they feel living with the choice)",\n    "what_they_wish_existed": "string (recent buyers only — what would have made the process easier)"\n  },\n  "participant_feedback": {\n    "overall_feeling": "string (how participant described the conversation experience)",\n    "what_worked": "string",\n    "what_to_improve": "string"\n  },\n  "persona_confirmed": ["string","string","string"],\n  "persona_updated": ["string","string","string"],\n  "best_quotes": [\n    {"quote": "string","why_it_matters": "string"},\n    {"quote": "string","why_it_matters": "string"},\n    {"quote": "string","why_it_matters": "string"}\n  ],\n  "biggest_surprise": "string",\n  "product_implication": "string"\n}`;

    try {
      const raw = await claude(SYNTHESIS_SYSTEM, [{ role: "user", content: prompt }], 2000);
      const clean = raw.replace(/```json|```/g, "").trim();
      const parsed = JSON.parse(clean);
      setSynthesis(parsed);

      // Save everything to db only now that session is complete
      const cleanTranscript = transcript.filter(m => !m.isWelcome);
      const list = await db.get("letsgo:participants") || [];
      const entry = { id, name: parsed.participant_name, status: "complete", persona: parsed.persona_match, date: new Date().toLocaleDateString("en-IN") };
      const existing = list.find(p => p.id === id);
      const updated = existing
        ? list.map(p => p.id === id ? { ...p, status: "complete", persona: parsed.persona_match } : p)
        : [...list, entry];
      await db.set("letsgo:participants", updated);
      await db.set(`letsgo:synthesis:${id}`, parsed);
      await db.set(`letsgo:transcript:${id}`, cleanTranscript);
      setParticipants(updated);
      setScreen("done");
    } catch {
      setSynthesis(null);
      setScreen("done");
    }
  }

  async function viewParticipant(p) {
    setViewingPid(p);
    const synth = await db.get(`letsgo:synthesis:${p.id}`);
    setViewingSynth(synth);
  }

  if (screen === "welcome")      return <WelcomeScreen onStart={startInterview} onAdmin={() => setScreen("admin")} />;
  if (screen === "interview")    return <InterviewScreen name={name} messages={messages} loading={loading} input={input} setInput={setInput} onSend={sendMessage} onWrapUp={wrapUp} userMsgCount={userMsgCount} />;
  if (screen === "synthesizing") return <SynthesizingScreen name={name} />;
  if (screen === "done")         return <DoneScreen synthesis={synthesis} name={name} onAdmin={async () => { const list = await db.get("letsgo:participants"); setParticipants(list || []); setScreen("admin"); }} onNew={() => { setName(""); setMessages([]); setScreen("welcome"); }} />;
  if (screen === "admin")        return <AdminScreen participants={participants} onHome={() => setScreen("welcome")} onView={viewParticipant} viewingPid={viewingPid} viewingSynth={viewingSynth} />;
  return null;
}
