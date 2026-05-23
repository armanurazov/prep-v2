import { useState, useEffect, useRef } from "react";

// ─────────────────────────────────────────────────────────────
// CONFIG
// ─────────────────────────────────────────────────────────────
const API_BASE = "https://bilimtapbackend-production.up.railway.app";

// ─────────────────────────────────────────────────────────────
// STATIC QUESTION DEFINITIONS
// Instructions never change. Only `content` (task text) comes
// from the DB. `field` maps to the DB column name.
//
// Block 2 uses a special `variant` key to control rendering:
//   "band9"     → note-taking prompts + single textarea
//   "bourdain"  → questions listed below video link, one textarea each
//   "reflection"→ open textarea for thoughts / feelings
//
// Block 3 uses `part` to control the speaking timer UI.
// ─────────────────────────────────────────────────────────────
const BLOCK_DEFINITIONS = {
  1: {
    title: "Language Construction & Natural Expression",
    desc:  "Sentence formation, grammar accuracy, natural phrasing, vocabulary in context.",
    questions: [
      {
        field:       "natural_english_rewrite",
        type:        "Natural English Rewrite",
        instruction: "Rewrite the paragraph below so it sounds natural, fluent, and conversational — like a native English speaker. Focus on sentence flow, natural vocabulary, and realistic phrasing. Do NOT make it unnecessarily academic or complex.",
      },
      {
        field:       "stylistic_correction",
        type:        "Stylistic Correction",
        instruction: "The paragraph below contains stylistic mistakes — unnatural phrasing, repetitive wording, poor transitions, or awkward structure. Rewrite it while preserving the original meaning. Focus on readability, coherence, and tone consistency.",
      },
      {
        field:       "grammar_correction",
        type:        "Grammar Correction",
        instruction: "The paragraph below contains grammatical mistakes. Identify the errors and rewrite the paragraph with correct grammar and improved sentence clarity. Focus on verb forms, articles, prepositions, sentence structure, and agreement. Do not significantly change the meaning.",
      },
      {
        field:       "collocation_replacement",
        type:        "Collocation Replacement",
        instruction: "Replace the basic or unnatural word combinations in the text below with more natural English collocations. Focus on commonly used native combinations that sound natural in context. Example: 'very big' → 'massive', 'make homework' → 'do homework', 'strong rain' → 'heavy rain'.",
      },
      {
        field:       "advanced_paraphrasing",
        type:        "Advanced Paraphrasing",
        instruction: "Paraphrase the paragraph below, which is written at approximately IELTS Band 8–9 level. Do not change the meaning, do not introduce grammar mistakes, and maintain natural fluent English. Focus on sentence restructuring and vocabulary variation. Avoid word-for-word replacement.",
      },
      {
        field:       "sentence_pattern_repetition",
        type:        "Sentence Pattern Repetition",
        instruction: "You will see a sentence pattern commonly used in natural English conversation. Create 5 original sentences using the exact same grammatical structure, but with completely different topics each time. Focus on speed, fluency, and flexibility.",
      },
    ],
  },

  2: {
    title: "Input, Analysis & Response",
    desc:  "Exposure to natural English, listening comprehension, vocabulary acquisition, speaking spontaneity.",
    questions: [
      {
        field:    "band9_speaking_analysis",
        type:     "Band 9 Speaking Analysis",
        variant:  "band9",
        // Instruction is shown as a header — prompts are rendered separately
        instruction: "Watch the IELTS Band 9 speaking video linked in today's task. While watching, take notes and write your analysis below using the prompts provided.",
        // These prompts are rendered as labelled textareas — answer is stored as one JSON string
        prompts: [
          { key: "vocab",       label: "Useful vocabulary & collocations",          placeholder: "List words or phrases worth noting…" },
          { key: "phrases",     label: "Natural phrases & transitions",              placeholder: "Write down any transitions, fillers, or expressions…" },
          { key: "expansion",   label: "How does the speaker expand their answers?", placeholder: "Describe techniques they use to develop ideas…" },
          { key: "improvement", label: "What would you borrow for your own speaking?", placeholder: "Note anything you want to try in your own answers…" },
        ],
      },
      {
        field:    "bourdain_listening",
        type:     "Anthony Bourdain Listening & Response",
        variant:  "bourdain",
        instruction: "Watch the Anthony Bourdain episode linked in today's task. Then answer each question below in complete sentences.",
        // Each question gets its own textarea — stored as one JSON string keyed by index
        questions: [
          "What location or culture did this episode focus on? Describe it briefly.",
          "What expressions or phrases stood out to you? Why?",
          "What was the emotional tone of the segment? How did it make you feel?",
          "What did you learn or find most interesting?",
        ],
      },
      {
        field:    "video_reflection",
        type:     "Video Reflection",
        variant:  "reflection",
        instruction: "Watch the video linked in today's task. Afterwards, share your honest reaction below. There is no right or wrong answer — write freely about your opinion, how the video made you feel, whether you agree or disagree with the ideas, and any personal connection it brought up.",
      },
    ],
  },

  3: {
    title: "IELTS Speaking Simulation",
    desc:  "Full exam conditions — Part 1, Part 2, and Part 3 discussion questions.",
    questions: [
      {
        field:       "speaking_part1",
        type:        "IELTS Speaking — Part 1",
        part:        1,
        instruction: "Answer the Part 1 questions below as you would in the real IELTS exam. Write 2–3 natural sentences per question. Prioritise clear, confident communication over perfect grammar.",
      },
      {
        field:       "speaking_part2",
        type:        "IELTS Speaking — Part 2",
        part:        2,
        // No preparation countdown — just a speaking timer that counts up
        instruction: "Read the cue card below. Take as much preparation time as you need, then start the timer and write your spoken response as if speaking for 1–2 minutes. Cover all the bullet points on the card.",
      },
      {
        field:       "speaking_part3",
        type:        "IELTS Speaking — Part 3",
        part:        3,
        instruction: "Answer the Part 3 discussion questions below. Give developed, thoughtful answers — aim for 4–6 sentences each. Express and justify your opinions clearly.",
      },
    ],
  },
};

// ─────────────────────────────────────────────────────────────
// STYLES
// ─────────────────────────────────────────────────────────────
const styles = `
  @import url('https://fonts.googleapis.com/css2?family=Sora:wght@300;400;500;600;700&family=DM+Serif+Display:ital@0;1&display=swap');

  :root {
    --blue:        #3A86FF;
    --blue-dark:   #1a6fef;
    --blue-light:  #e8f1ff;
    --blue-mid:    #82b0ff;
    --green:       #22c55e;
    --green-light: #dcfce7;
    --green-dark:  #15803d;
    --white:       #ffffff;
    --gray-50:     #f8faff;
    --gray-100:    #f0f4ff;
    --gray-200:    #dde6f5;
    --gray-400:    #9aacc8;
    --gray-600:    #5a718a;
    --gray-800:    #2c3e56;
    --text:        #1a2a3a;
    --radius:      14px;
    --radius-sm:   8px;
    --shadow-sm:   0 2px 16px rgba(58,134,255,0.10);
    --shadow-md:   0 6px 32px rgba(58,134,255,0.14);
    --transition:  all 0.22s cubic-bezier(.4,0,.2,1);
  }

  *, *::before, *::after { box-sizing: border-box; margin: 0; padding: 0; }

  body {
    font-family: 'Sora', sans-serif;
    background: var(--white);
    color: var(--text);
    min-height: 100vh;
    -webkit-font-smoothing: antialiased;
  }

  /* ── Layout ──────────────────────────────────────── */
  .app { min-height: 100vh; display: flex; flex-direction: column; }

  .topbar {
    background: var(--white);
    border-bottom: 1.5px solid var(--gray-200);
    padding: 0 32px; height: 64px;
    display: flex; align-items: center; justify-content: space-between;
    position: sticky; top: 0; z-index: 100;
  }
  .logo {
    display: flex; align-items: center; gap: 10px;
    font-family: 'DM Serif Display', serif; font-size: 1.35rem;
    color: var(--blue); cursor: pointer; user-select: none;
  }
  .logo-dot { width: 8px; height: 8px; background: var(--blue); border-radius: 50%; flex-shrink: 0; }
  .logo-wordmark em { font-style: italic; }
  .logo-sub {
    font-family: 'Sora', sans-serif; font-size: 0.68rem; font-weight: 500;
    color: var(--gray-400); letter-spacing: 0.09em; text-transform: uppercase; margin-top: 1px;
  }
  .topbar-right { display: flex; align-items: center; gap: 10px; }
  .badge { font-size: 0.72rem; font-weight: 600; border-radius: 20px; padding: 4px 13px; letter-spacing: 0.02em; }
  .badge-blue { color: var(--blue);     background: var(--blue-light); }
  .badge-gray { color: var(--gray-600); background: var(--gray-100);  }

  .main { flex: 1; padding: 44px 32px 72px; max-width: 860px; margin: 0 auto; width: 100%; }

  /* ── Page header ─────────────────────────────────── */
  .page-header { margin-bottom: 36px; }
  .page-eyebrow { font-size: 0.7rem; font-weight: 700; letter-spacing: 0.13em; text-transform: uppercase; color: var(--blue); margin-bottom: 10px; }
  .page-title { font-family: 'DM Serif Display', serif; font-size: 2.25rem; line-height: 1.16; letter-spacing: -0.022em; color: var(--text); }
  .page-title em { font-style: italic; color: var(--blue); }
  .page-sub { margin-top: 10px; font-size: 0.93rem; color: var(--gray-600); line-height: 1.65; }

  /* ── Breadcrumb ──────────────────────────────────── */
  .breadcrumb { display: flex; align-items: center; gap: 8px; font-size: 0.79rem; color: var(--gray-400); margin-bottom: 30px; flex-wrap: wrap; }
  .bc { color: var(--gray-400); }
  .bc.link { color: var(--blue); cursor: pointer; text-decoration: underline; text-underline-offset: 2px; }
  .bc.link:hover { color: var(--blue-dark); }
  .bc-sep { color: var(--gray-200); font-size: 0.9rem; }

  /* ── Day grid ────────────────────────────────────── */
  .day-grid { display: grid; grid-template-columns: repeat(auto-fill, minmax(186px, 1fr)); gap: 16px; }
  .day-card {
    border: 1.5px solid var(--gray-200); border-radius: var(--radius);
    padding: 24px 22px; cursor: pointer; transition: var(--transition);
    background: var(--white); position: relative; overflow: hidden;
  }
  .day-card::after {
    content: ''; position: absolute; top: 0; left: 0; right: 0; height: 3px;
    background: var(--blue); transform: scaleX(0); transform-origin: left; transition: transform 0.24s ease;
  }
  .day-card:hover::after { transform: scaleX(1); }
  .day-card:hover { border-color: var(--blue); box-shadow: var(--shadow-md); transform: translateY(-2px); }
  .day-card.locked { opacity: 0.4; pointer-events: none; cursor: default; }
  .day-card.done { border-color: var(--green); }
  .day-icon { position: absolute; top: 16px; right: 16px; font-size: 1rem; }
  .day-num { font-family: 'DM Serif Display', serif; font-size: 2.1rem; color: var(--blue); line-height: 1; margin-bottom: 5px; }
  .day-label { font-size: 0.78rem; font-weight: 600; color: var(--gray-600); text-transform: uppercase; letter-spacing: 0.07em; }
  .day-status { font-size: 0.74rem; color: var(--gray-400); margin-top: 10px; }

  /* ── Block grid ──────────────────────────────────── */
  .block-grid { display: flex; flex-direction: column; gap: 13px; }
  .block-card {
    border: 1.5px solid var(--gray-200); border-radius: var(--radius);
    padding: 20px 26px; display: flex; align-items: center; gap: 18px;
    cursor: pointer; transition: var(--transition); background: var(--white);
  }
  .block-card:hover:not(.locked) { border-color: var(--blue); box-shadow: var(--shadow-sm); transform: translateX(4px); }
  .block-card.locked  { opacity: 0.42; pointer-events: none; }
  .block-card.done    { border-color: var(--green); background: #f0fdf4; }
  .block-card.current { border-color: var(--blue);  background: var(--blue-light); }
  .block-num {
    width: 46px; height: 46px; border-radius: 11px;
    display: flex; align-items: center; justify-content: center;
    font-family: 'DM Serif Display', serif; font-size: 1.35rem; flex-shrink: 0;
    background: var(--blue-light); color: var(--blue); transition: var(--transition);
  }
  .block-card.done    .block-num { background: var(--green-light); color: var(--green-dark); }
  .block-card.current .block-num { background: var(--blue);        color: var(--white); }
  .block-info { flex: 1; min-width: 0; }
  .block-title { font-weight: 600; font-size: 0.97rem; color: var(--text); margin-bottom: 3px; }
  .block-desc  { font-size: 0.8rem;  color: var(--gray-600); line-height: 1.45; }
  .block-meta  { font-size: 0.73rem; color: var(--gray-400); margin-top: 6px; }
  .block-arrow { color: var(--blue-mid); font-size: 1rem; flex-shrink: 0; }

  /* ── Progress bar ────────────────────────────────── */
  .progress-wrap { margin-bottom: 28px; }
  .progress-row  { display: flex; justify-content: space-between; align-items: center; margin-bottom: 7px; }
  .progress-label { font-size: 0.79rem; font-weight: 600; color: var(--gray-600); }
  .progress-pct   { font-size: 0.79rem; font-weight: 700; color: var(--blue); }
  .progress-track { height: 5px; background: var(--gray-100); border-radius: 10px; overflow: hidden; }
  .progress-fill  { height: 100%; background: var(--blue); border-radius: 10px; transition: width 0.4s cubic-bezier(.4,0,.2,1); }

  /* ── Question card ───────────────────────────────── */
  .q-eyebrow {
    display: inline-flex; align-items: center; gap: 8px;
    background: var(--blue-light); color: var(--blue);
    border-radius: 20px; padding: 5px 14px;
    font-size: 0.73rem; font-weight: 600; letter-spacing: 0.04em; margin-bottom: 22px;
  }
  .q-eyebrow-sep { opacity: 0.4; }
  .q-card {
    background: var(--white); border: 1.5px solid var(--gray-200);
    border-radius: var(--radius); padding: 32px 36px; margin-bottom: 22px;
    box-shadow: var(--shadow-sm); animation: fadeUp 0.28s ease both;
  }
  @keyframes fadeUp { from { opacity: 0; transform: translateY(10px); } to { opacity: 1; transform: translateY(0); } }
  .q-type-tag {
    display: inline-block; font-size: 0.67rem; font-weight: 700;
    letter-spacing: 0.1em; text-transform: uppercase;
    color: var(--blue); background: var(--blue-light);
    border-radius: 6px; padding: 3px 10px; margin-bottom: 18px;
  }
  .q-instruction {
    font-size: 0.83rem; color: var(--gray-600); line-height: 1.6;
    padding: 11px 15px; background: var(--gray-50);
    border-left: 3px solid var(--blue-mid); border-radius: 0 6px 6px 0; margin-bottom: 18px;
  }
  .q-divider { height: 1px; background: var(--gray-200); margin: 20px 0; }
  .q-task-label { font-size: 0.7rem; font-weight: 700; letter-spacing: 0.1em; text-transform: uppercase; color: var(--gray-400); margin-bottom: 10px; }
  .q-content { font-size: 1.04rem; color: var(--text); line-height: 1.75; white-space: pre-wrap; }

  /* ── Answer area ─────────────────────────────────── */
  .answer-wrap  { margin-top: 22px; }
  .answer-label { font-size: 0.76rem; font-weight: 600; color: var(--gray-600); margin-bottom: 8px; letter-spacing: 0.02em; }
  .answer-textarea {
    width: 100%; min-height: 136px;
    border: 1.5px solid var(--gray-200); border-radius: var(--radius-sm);
    padding: 14px 16px; font-family: 'Sora', sans-serif; font-size: 0.9rem;
    color: var(--text); resize: vertical; outline: none;
    transition: border-color 0.18s, background 0.18s;
    background: var(--gray-50); line-height: 1.65;
  }
  .answer-textarea:focus { border-color: var(--blue); background: var(--white); }
  .answer-textarea::placeholder { color: var(--gray-400); }
  .answer-textarea.short { min-height: 90px; }

  /* ── Block 2 specific ────────────────────────────── */
  .b2-video-link {
    display: inline-flex; align-items: center; gap: 8px;
    background: var(--blue); color: var(--white);
    border-radius: var(--radius-sm); padding: 10px 18px;
    font-size: 0.85rem; font-weight: 600; text-decoration: none;
    margin-bottom: 22px; transition: var(--transition);
  }
  .b2-video-link:hover { background: var(--blue-dark); }

  .b2-prompt-group { margin-bottom: 20px; }
  .b2-prompt-label {
    font-size: 0.78rem; font-weight: 700; color: var(--text);
    margin-bottom: 6px; display: block;
  }
  .b2-q-item { margin-bottom: 22px; }
  .b2-q-num {
    display: inline-flex; align-items: center; justify-content: center;
    width: 24px; height: 24px; border-radius: 50%;
    background: var(--blue-light); color: var(--blue);
    font-size: 0.72rem; font-weight: 700; flex-shrink: 0;
    margin-right: 8px; vertical-align: middle;
  }
  .b2-q-text {
    font-size: 0.93rem; color: var(--text); line-height: 1.55;
    margin-bottom: 8px; font-weight: 500;
  }

  /* ── Block 3 speaking timer ──────────────────────── */
  .speaking-timer {
    display: inline-flex; align-items: center; gap: 10px;
    background: var(--gray-100); border: 1.5px solid var(--gray-200);
    border-radius: var(--radius-sm); padding: 10px 18px;
    margin-bottom: 20px;
  }
  .speaking-timer.running { background: var(--blue-light); border-color: var(--blue-mid); }
  .timer-display {
    font-family: 'DM Serif Display', serif; font-size: 1.5rem;
    color: var(--blue); letter-spacing: 0.02em; min-width: 56px;
  }
  .timer-label { font-size: 0.76rem; font-weight: 600; color: var(--gray-600); }
  .timer-btn {
    font-size: 0.8rem; font-weight: 600; border: 1.5px solid var(--blue);
    color: var(--blue); background: var(--white); border-radius: 6px;
    padding: 4px 12px; cursor: pointer; transition: var(--transition);
  }
  .timer-btn:hover { background: var(--blue); color: var(--white); }
  .timer-btn.stop { border-color: var(--gray-400); color: var(--gray-600); }
  .timer-btn.stop:hover { background: var(--gray-200); }

  /* ── Buttons ─────────────────────────────────────── */
  .btn {
    display: inline-flex; align-items: center; justify-content: center; gap: 7px;
    border: none; border-radius: var(--radius-sm);
    font-family: 'Sora', sans-serif; font-size: 0.87rem; font-weight: 600;
    padding: 11px 22px; cursor: pointer; transition: var(--transition); outline: none; white-space: nowrap;
  }
  .btn-primary { background: var(--blue); color: var(--white); box-shadow: 0 2px 10px rgba(58,134,255,0.3); }
  .btn-primary:hover { background: var(--blue-dark); box-shadow: 0 4px 18px rgba(58,134,255,0.38); transform: translateY(-1px); }
  .btn-primary:active { transform: translateY(0); }
  .btn-ghost { background: transparent; color: var(--gray-600); border: 1.5px solid var(--gray-200); }
  .btn-ghost:hover { border-color: var(--blue-mid); color: var(--blue); background: var(--blue-light); }
  .btn:disabled { opacity: 0.42; pointer-events: none; }
  .btn-row { display: flex; align-items: center; gap: 12px; flex-wrap: wrap; }

  /* ── Complete screen ─────────────────────────────── */
  .complete-card {
    text-align: center; padding: 60px 40px;
    border: 1.5px solid var(--green); border-radius: var(--radius);
    background: linear-gradient(135deg, #f0fdf4 0%, #ecfdf5 100%);
    animation: fadeUp 0.35s ease;
  }
  .complete-icon  { font-size: 3.4rem; margin-bottom: 18px; }
  .complete-title { font-family: 'DM Serif Display', serif; font-size: 1.85rem; color: var(--green-dark); margin-bottom: 12px; }
  .complete-sub   { font-size: 0.94rem; color: #166534; line-height: 1.65; }
  .complete-actions { margin-top: 30px; display: flex; gap: 12px; justify-content: center; flex-wrap: wrap; }

  /* ── Skeleton ────────────────────────────────────── */
  .skeleton {
    background: linear-gradient(90deg, var(--gray-100) 25%, var(--gray-200) 50%, var(--gray-100) 75%);
    background-size: 200% 100%; animation: shimmer 1.4s infinite; border-radius: 8px;
  }
  @keyframes shimmer { 0% { background-position: 200% 0; } 100% { background-position: -200% 0; } }
  .sk-h1 { height: 30px; width: 50%; margin-bottom: 14px; }
  .sk-h2 { height: 16px; margin-bottom: 10px; }
  .sk-h2.w75 { width: 75%; }
  .sk-h2.w45 { width: 45%; }
  .sk-card { height: 220px; border-radius: var(--radius); margin-top: 24px; }

  /* ── Fallback ────────────────────────────────────── */
  .fallback-card {
    text-align: center; padding: 60px 36px;
    border: 1.5px solid var(--gray-200); border-radius: var(--radius);
    background: var(--gray-50); animation: fadeUp 0.28s ease;
  }
  .fallback-icon  { font-size: 2.8rem; margin-bottom: 16px; }
  .fallback-title { font-family: 'DM Serif Display', serif; font-size: 1.5rem; color: var(--gray-800); margin-bottom: 10px; }
  .fallback-sub   { font-size: 0.9rem; color: var(--gray-600); line-height: 1.65; }
  .fallback-contact { display: inline-block; margin-top: 22px; font-size: 0.87rem; font-weight: 600; color: var(--blue); background: var(--blue-light); border-radius: 8px; padding: 10px 22px; }

  /* ── Responsive ──────────────────────────────────── */
  @media (max-width: 600px) {
    .topbar { padding: 0 18px; }
    .main   { padding: 26px 18px 56px; }
    .q-card { padding: 22px 18px; }
    .page-title { font-size: 1.75rem; }
    .day-grid { grid-template-columns: repeat(auto-fill, minmax(140px, 1fr)); }
    .block-card { padding: 16px 18px; }
  }
`;

// ─────────────────────────────────────────────────────────────
// ANALYTICS  (fire-and-forget, never blocks UI)
// ─────────────────────────────────────────────────────────────
const Analytics = (() => {
  const sessionId    = `sess_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;
  const sessionStart = Date.now();

  function deviceInfo() {
    return {
      userAgent: navigator.userAgent,
      language:  navigator.language,
      screenW:   screen.width,
      screenH:   screen.height,
      timezone:  Intl.DateTimeFormat().resolvedOptions().timeZone,
      referrer:  document.referrer || "direct",
    };
  }

  async function post(path, body) {
    try {
      await fetch(`${API_BASE}${path}`, {
        method:  "POST",
        headers: { "Content-Type": "application/json" },
        body:    JSON.stringify(body),
      });
    } catch (_) { /* silent — analytics must never break the UI */ }
  }

  return {
    sessionId,
    initSession() {
      post("/api/sessions", {
        session_id:  sessionId,
        started_at:  new Date().toISOString(),
        device_info: deviceInfo(),
      });
    },
    track(eventName, data = {}) {
      post("/api/events", {
        session_id:         sessionId,
        event_name:         eventName,
        time_in_session_ms: Date.now() - sessionStart,
        data,
      });
    },
  };
})();

// ─────────────────────────────────────────────────────────────
// LOCAL STORAGE — progress gate
// ─────────────────────────────────────────────────────────────
const Progress = {
  _key: "ielts_progress",
  _get() {
    try { return JSON.parse(localStorage.getItem(this._key) || "{}"); }
    catch { return {}; }
  },
  isDone(day, block) { return this._get()[`d${day}_b${block}`] === "done"; },
  markDone(day, block) {
    const p = this._get();
    p[`d${day}_b${block}`] = "done";
    try { localStorage.setItem(this._key, JSON.stringify(p)); } catch {}
  },
};

// ─────────────────────────────────────────────────────────────
// API CLIENT
// ─────────────────────────────────────────────────────────────
const Api = {
  async getContent(day, block) {
    const res = await fetch(`${API_BASE}/api/questions?day=${day}&block=${block}`);
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    const json = await res.json();
    return json.day_content ?? null;
  },

  async saveAnswer(payload) {
    try {
      await fetch(`${API_BASE}/api/answers`, {
        method:  "POST",
        headers: { "Content-Type": "application/json" },
        body:    JSON.stringify(payload),
      });
    } catch (_) { /* silent */ }
  },
};

// ─────────────────────────────────────────────────────────────
// SHARED COMPONENTS
// ─────────────────────────────────────────────────────────────
function TopBar({ day, onLogoClick }) {
  return (
    <header className="topbar">
      <div className="logo" onClick={onLogoClick}>
        <div className="logo-dot" />
        <div className="logo-wordmark">
          IELTS <em>Prep</em>
          <div className="logo-sub">Daily Practice</div>
        </div>
      </div>
      <div className="topbar-right">
        {day && <span className="badge badge-blue">Day {day}</span>}
        <span className="badge badge-gray">Live</span>
      </div>
    </header>
  );
}

function Breadcrumb({ items }) {
  return (
    <nav className="breadcrumb" aria-label="breadcrumb">
      {items.map((item, i) => (
        <span key={i}>
          <span className={`bc${item.onClick ? " link" : ""}`} onClick={item.onClick ?? undefined}>
            {item.label}
          </span>
          {i < items.length - 1 && <span className="bc-sep" aria-hidden>›</span>}
        </span>
      ))}
    </nav>
  );
}

function ProgressBar({ current, total }) {
  const pct = total > 0 ? Math.round((current / total) * 100) : 0;
  return (
    <div className="progress-wrap">
      <div className="progress-row">
        <span className="progress-label">Question {current} of {total}</span>
        <span className="progress-pct">{pct}%</span>
      </div>
      <div className="progress-track" role="progressbar" aria-valuenow={pct} aria-valuemin={0} aria-valuemax={100}>
        <div className="progress-fill" style={{ width: `${pct}%` }} />
      </div>
    </div>
  );
}

function SkeletonLoader() {
  return (
    <div aria-label="Loading…" aria-busy>
      <div className="skeleton sk-h1" />
      <div className="skeleton sk-h2 w75" />
      <div className="skeleton sk-h2 w45" />
      <div className="skeleton sk-card" />
    </div>
  );
}

function Fallback({ onRetry }) {
  return (
    <div className="fallback-card" role="alert">
      <div className="fallback-icon">🤔</div>
      <div className="fallback-title">Content unavailable right now</div>
      <div className="fallback-sub">
        We couldn't load today's questions. Please try again in a moment,
        <br />or contact your brother for help.
      </div>
      {onRetry && (
        <button className="btn btn-ghost" style={{ marginTop: 20 }} onClick={onRetry}>
          Try again
        </button>
      )}
      <div className="fallback-contact">📞 Call: +7 776 154 24 37</div>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────
// SPEAKING TIMER  (Block 3 Part 2 only)
// Counts up from 0. No countdown. No prep phase.
// User starts it when they're ready to speak.
// ─────────────────────────────────────────────────────────────
function SpeakingTimer() {
  const [seconds,  setSeconds]  = useState(0);
  const [running,  setRunning]  = useState(false);
  const intervalRef = useRef(null);

  useEffect(() => {
    if (running) {
      intervalRef.current = setInterval(() => setSeconds(s => s + 1), 1000);
    } else {
      clearInterval(intervalRef.current);
    }
    return () => clearInterval(intervalRef.current);
  }, [running]);

  const fmt = (s) => {
    const m = Math.floor(s / 60);
    const sec = s % 60;
    return `${String(m).padStart(2, "0")}:${String(sec).padStart(2, "0")}`;
  };

  const handleReset = () => {
    setRunning(false);
    setSeconds(0);
  };

  return (
    <div className={`speaking-timer${running ? " running" : ""}`}>
      <div>
        <div className="timer-label">{running ? "Speaking time" : "Ready when you are"}</div>
        <div className="timer-display">{fmt(seconds)}</div>
      </div>
      {!running ? (
        <button className="timer-btn" onClick={() => setRunning(true)}>
          ▶ Start timer
        </button>
      ) : (
        <>
          <button className="timer-btn stop" onClick={() => setRunning(false)}>⏸ Pause</button>
          <button className="timer-btn stop" onClick={handleReset}>↺ Reset</button>
        </>
      )}
    </div>
  );
}

// ─────────────────────────────────────────────────────────────
// BLOCK 2 ANSWER PANELS
// Each variant renders differently — all typed, no mic.
// ─────────────────────────────────────────────────────────────

// Band 9 — note-taking with 4 labelled prompts
// answer stored as JSON: { vocab, phrases, expansion, improvement }
function Band9AnswerPanel({ prompts, value, onChange }) {
  const parsed = (() => {
    try { return JSON.parse(value || "{}"); }
    catch { return {}; }
  })();

  const handleChange = (key, text) => {
    onChange(JSON.stringify({ ...parsed, [key]: text }));
  };

  return (
    <div className="answer-wrap">
      {prompts.map((p) => (
        <div key={p.key} className="b2-prompt-group">
          <label className="b2-prompt-label">{p.label}</label>
          <textarea
            className="answer-textarea short"
            placeholder={p.placeholder}
            value={parsed[p.key] || ""}
            onChange={(e) => handleChange(p.key, e.target.value)}
            aria-label={p.label}
          />
        </div>
      ))}
    </div>
  );
}

// Bourdain — 4 numbered questions, one textarea each
// answer stored as JSON: { "0": "...", "1": "...", ... }
function BourdainAnswerPanel({ questions, value, onChange }) {
  const parsed = (() => {
    try { return JSON.parse(value || "{}"); }
    catch { return {}; }
  })();

  const handleChange = (idx, text) => {
    onChange(JSON.stringify({ ...parsed, [idx]: text }));
  };

  return (
    <div className="answer-wrap">
      {questions.map((q, i) => (
        <div key={i} className="b2-q-item">
          <div className="b2-q-text">
            <span className="b2-q-num">{i + 1}</span>
            {q}
          </div>
          <textarea
            className="answer-textarea short"
            placeholder="Your answer…"
            value={parsed[i] || ""}
            onChange={(e) => handleChange(i, e.target.value)}
            aria-label={`Question ${i + 1}`}
          />
        </div>
      ))}
    </div>
  );
}

// Video Reflection — single open textarea for free response
function ReflectionAnswerPanel({ value, onChange }) {
  return (
    <div className="answer-wrap">
      <div className="answer-label">Your thoughts</div>
      <textarea
        className="answer-textarea"
        style={{ minHeight: 180 }}
        placeholder="Share your reaction honestly — your opinion, how it made you feel, whether you agree or disagree, and any personal connection it brought up…"
        value={value || ""}
        onChange={(e) => onChange(e.target.value)}
        aria-label="Video reflection"
      />
    </div>
  );
}

// ─────────────────────────────────────────────────────────────
// PAGE 1 — DAY NAVIGATION
// ─────────────────────────────────────────────────────────────
function DayPage({ onSelectDay }) {
  return (
    <main className="main">
      <header className="page-header">
        <p className="page-eyebrow">📅 Study Plan</p>
        <h1 className="page-title">Choose your <em>study day</em></h1>
        <p className="page-sub">
          Complete each day in order. Day 1 is available now — more days unlock as you progress.
        </p>
      </header>

      <div className="day-grid">
        {Array.from({ length: 30 }, (_, i) => i + 1).map((day) => {
          const isAvailable = day === 1;
          const isDone      = [1, 2, 3].every((b) => Progress.isDone(day, b));
          return (
            <div
              key={day}
              className={`day-card${!isAvailable ? " locked" : ""}${isDone ? " done" : ""}`}
              onClick={() => {
                if (!isAvailable) return;
                Analytics.track("day_selected", { day });
                onSelectDay(day);
              }}
              role="button"
              tabIndex={isAvailable ? 0 : -1}
              aria-label={`Day ${day}${!isAvailable ? ", locked" : ""}`}
            >
              <span className="day-icon" aria-hidden>
                {isDone ? "✅" : !isAvailable ? "🔒" : "📖"}
              </span>
              <div className="day-num">{String(day).padStart(2, "0")}</div>
              <div className="day-label">Day {day}</div>
              <div className="day-status">
                {isDone ? "Completed" : isAvailable ? "Start now →" : "Locked"}
              </div>
            </div>
          );
        })}
      </div>
    </main>
  );
}

// ─────────────────────────────────────────────────────────────
// PAGE 2 — BLOCK NAVIGATION
// ─────────────────────────────────────────────────────────────
function BlockPage({ day, onSelectBlock, onBack }) {
  function getStatus(num) {
    if (Progress.isDone(day, num)) return "done";
    const prevDone = num === 1 || Progress.isDone(day, num - 1);
    return prevDone ? "current" : "locked";
  }

  return (
    <main className="main">
      <Breadcrumb items={[
        { label: "Days", onClick: () => { Analytics.track("nav_back_days"); onBack(); } },
        { label: `Day ${day}` },
      ]} />

      <header className="page-header">
        <p className="page-eyebrow">Day {day} — Blocks</p>
        <h1 className="page-title">Choose your <em>block</em></h1>
        <p className="page-sub">
          Complete blocks in order. Each block unlocks after the previous one is finished.
        </p>
      </header>

      <div className="block-grid">
        {[1, 2, 3].map((num) => {
          const def    = BLOCK_DEFINITIONS[num];
          const status = getStatus(num);
          return (
            <div
              key={num}
              className={`block-card ${status}`}
              onClick={() => {
                if (status === "locked") return;
                Analytics.track("block_selected", { day, block: num });
                onSelectBlock(num);
              }}
              role="button"
              tabIndex={status === "locked" ? -1 : 0}
              aria-label={`Block ${num}: ${def.title}`}
            >
              <div className="block-num" aria-hidden>
                {status === "done" ? "✓" : num}
              </div>
              <div className="block-info">
                <div className="block-title">Block {num}: {def.title}</div>
                <div className="block-desc">{def.desc}</div>
                <div className="block-meta">
                  {def.questions.length} questions ·{" "}
                  {status === "done"
                    ? "✅ Completed"
                    : status === "locked"
                    ? "🔒 Complete previous block first"
                    : "Ready to start"}
                </div>
              </div>
              <span className="block-arrow" aria-hidden>
                {status === "locked" ? "🔒" : "→"}
              </span>
            </div>
          );
        })}
      </div>
    </main>
  );
}

// ─────────────────────────────────────────────────────────────
// PAGE 3-5 — QUESTION PAGE
// ─────────────────────────────────────────────────────────────
function QuestionPage({ day, block, onBack, onComplete }) {
  const def = BLOCK_DEFINITIONS[block];

  const [dayContent, setDayContent] = useState(null);
  const [loading,    setLoading]    = useState(true);
  const [error,      setError]      = useState(false);
  const [current,    setCurrent]    = useState(0);
  const [answers,    setAnswers]    = useState({});
  const [done,       setDone]       = useState(false);

  const blockStartRef = useRef(Date.now());
  const qStartRef     = useRef(Date.now());
  const fetchCount    = useRef(0);

  // ── Fetch ───────────────────────────────────────────
  const fetchContent = () => {
    setLoading(true);
    setError(false);
    fetchCount.current += 1;
    const thisCall = fetchCount.current;

    Analytics.track("block_opened", { day, block });

    Api.getContent(day, block)
      .then((content) => {
        if (thisCall !== fetchCount.current) return;
        if (!content) { setError(true); return; }
        setDayContent(content);
        Analytics.track("content_loaded", { day, block });
      })
      .catch(() => {
        if (thisCall !== fetchCount.current) return;
        setError(true);
      })
      .finally(() => {
        if (thisCall !== fetchCount.current) return;
        setLoading(false);
        blockStartRef.current = Date.now();
        qStartRef.current     = Date.now();
      });
  };

  useEffect(fetchContent, [day, block]);
  useEffect(() => { qStartRef.current = Date.now(); }, [current]);

  // ── Save & advance ──────────────────────────────────
  const handleNext = async () => {
    const qDef        = def.questions[current];
    const timeSpentMs = Date.now() - qStartRef.current;
    const answerText  = answers[current] ?? "";

    await Api.saveAnswer({
      session_id:     Analytics.sessionId,
      day,
      block,
      question_field: qDef.field,
      question_type:  qDef.type,
      answer_text:    answerText,
      time_spent_ms:  timeSpentMs,
    });

    Analytics.track("question_answered", {
      day, block,
      question_field: qDef.field,
      answer_length:  answerText.length,
      time_spent_ms:  timeSpentMs,
    });

    if (current < def.questions.length - 1) {
      Analytics.track("next_question", { day, block, from: current, to: current + 1 });
      setCurrent((c) => c + 1);
    } else {
      Analytics.track("block_completed", { day, block, total_ms: Date.now() - blockStartRef.current });
      Progress.markDone(day, block);
      setDone(true);
    }
  };

  const handlePrev = () => {
    if (current > 0) {
      Analytics.track("prev_question", { day, block, from: current, to: current - 1 });
      setCurrent((c) => c - 1);
    }
  };

  // ── Render answer area based on question variant ────
  const renderAnswerArea = (qDef) => {
    const value    = answers[current] ?? "";
    const onChange = (v) => setAnswers((prev) => ({ ...prev, [current]: v }));

    // Block 2 variants
    if (qDef.variant === "band9") {
      return (
        <Band9AnswerPanel
          prompts={qDef.prompts}
          value={value}
          onChange={onChange}
        />
      );
    }

    if (qDef.variant === "bourdain") {
      return (
        <BourdainAnswerPanel
          questions={qDef.questions}
          value={value}
          onChange={onChange}
        />
      );
    }

    if (qDef.variant === "reflection") {
      return <ReflectionAnswerPanel value={value} onChange={onChange} />;
    }

    // Block 3 Part 2 — speaking timer above the textarea, no prep countdown
    if (block === 3 && qDef.part === 2) {
      return (
        <div className="answer-wrap">
          <SpeakingTimer />
          <div className="answer-label">Your spoken response (written)</div>
          <textarea
            className="answer-textarea"
            placeholder="Write your answer as if you were speaking aloud. Cover all the bullet points on the cue card…"
            value={value}
            onChange={(e) => onChange(e.target.value)}
            aria-label="Speaking Part 2 response"
          />
        </div>
      );
    }

    // Default — all Block 1 questions and Block 3 Parts 1 & 3
    return (
      <div className="answer-wrap">
        <div className="answer-label">Your answer</div>
        <textarea
          className="answer-textarea"
          placeholder="Write your answer here…"
          value={value}
          onChange={(e) => onChange(e.target.value)}
          aria-label={`Answer for ${qDef.type}`}
        />
      </div>
    );
  };

  // ── Shared breadcrumbs ──────────────────────────────
  const crumbs = [
    { label: "Days",       onClick: onBack },
    { label: `Day ${day}`, onClick: onBack },
    { label: `Block ${block}` },
  ];

  if (loading) {
    return <main className="main"><Breadcrumb items={crumbs} /><SkeletonLoader /></main>;
  }

  if (error || !dayContent) {
    return <main className="main"><Breadcrumb items={crumbs} /><Fallback onRetry={fetchContent} /></main>;
  }

  if (done) {
    return (
      <main className="main">
        <Breadcrumb items={crumbs} />
        <div className="complete-card" role="status">
          <div className="complete-icon">🎉</div>
          <h2 className="complete-title">Block {block} Complete!</h2>
          <p className="complete-sub">
            You've finished all {def.questions.length} questions in Block {block}.<br />
            {block < 3
              ? "The next block is now unlocked. Keep going!"
              : `Amazing work — you've completed all blocks for Day ${day}! 🏆`}
          </p>
          <div className="complete-actions">
            <button className="btn btn-primary" onClick={onComplete}>
              {block < 3 ? `Continue to Block ${block + 1} →` : "🏆 Back to Days"}
            </button>
            <button className="btn btn-ghost" onClick={onBack}>Back to Blocks</button>
          </div>
        </div>
      </main>
    );
  }

  const qDef   = def.questions[current];
  const content = dayContent[qDef.field] ?? null;

  // Extract a video URL from content if present (used in Block 2)
  const videoUrl = (() => {
    if (!content) return null;
    const match = content.match(/https?:\/\/[^\s\n]+/);
    return match ? match[0] : null;
  })();

  return (
    <main className="main">
      <Breadcrumb items={crumbs} />

      <div className="q-eyebrow">
        <span>Block {block}</span>
        <span className="q-eyebrow-sep">·</span>
        <span>{def.title}</span>
      </div>

      <ProgressBar current={current + 1} total={def.questions.length} />

      <div className="q-card">
        <div className="q-type-tag">{qDef.type}</div>
        <div className="q-instruction">{qDef.instruction}</div>

        {content ? (
          <>
            <div className="q-divider" aria-hidden />
            <div className="q-task-label">Today's Task</div>

            {/* If a video URL is present, render a watch button, then the rest of the text */}
            {videoUrl ? (
              <>
                <a
                  href={videoUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="b2-video-link"
                >
                  ▶ Watch today's video
                </a>
                {/* Show any text below the URL (e.g. Bourdain questions context) */}
                <div className="q-content">
                  {content.replace(videoUrl, "").trim()}
                </div>
              </>
            ) : (
              <div className="q-content">{content}</div>
            )}
          </>
        ) : (
          <div className="fallback-sub" style={{ marginTop: 12 }}>
            ⚠️ No task content for this question today.
          </div>
        )}

        {renderAnswerArea(qDef)}
      </div>

      <div className="btn-row">
        <button className="btn btn-ghost" onClick={handlePrev} disabled={current === 0}>
          ← Previous
        </button>
        <button className="btn btn-primary" onClick={handleNext}>
          {current < def.questions.length - 1 ? "Next Question →" : "Finish Block ✓"}
        </button>
      </div>
    </main>
  );
}

// ─────────────────────────────────────────────────────────────
// APP ROOT
// ─────────────────────────────────────────────────────────────
export default function App() {
  const [page,  setPage]  = useState("days");
  const [day,   setDay]   = useState(null);
  const [block, setBlock] = useState(null);

  useEffect(() => {
    const el = document.createElement("style");
    el.textContent = styles;
    document.head.appendChild(el);
    Analytics.initSession();
    Analytics.track("app_loaded");
    return () => document.head.removeChild(el);
  }, []);

  const goToDays = () => {
    Analytics.track("nav_days");
    setPage("days"); setDay(null); setBlock(null);
  };

  const goToBlocks = (d) => {
    Analytics.track("nav_blocks", { day: d });
    setDay(d); setPage("blocks");
  };

  const goToQuestion = (b) => {
    Analytics.track("nav_question", { day, block: b });
    setBlock(b); setPage("question");
  };

  const handleBlockComplete = () => {
    if (block < 3) setPage("blocks");
    else goToDays();
  };

  return (
    <div className="app">
      <TopBar day={day} onLogoClick={goToDays} />

      {page === "days" && (
        <DayPage onSelectDay={goToBlocks} />
      )}

      {page === "blocks" && day && (
        <BlockPage day={day} onSelectBlock={goToQuestion} onBack={goToDays} />
      )}

      {page === "question" && day && block && (
        <QuestionPage
          day={day}
          block={block}
          onBack={() => setPage("blocks")}
          onComplete={handleBlockComplete}
        />
      )}
    </div>
  );
}