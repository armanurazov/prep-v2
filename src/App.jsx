import { useState, useEffect, useRef, useCallback } from "react";

// ─────────────────────────────────────────────────────────────
// CONFIG
// ─────────────────────────────────────────────────────────────
const API_BASE        = "https://bilimtapbackend-production.up.railway.app";
const FALLBACK_VIDEO  = "https://www.youtube.com/watch?v=JENPic35uWY";
const SUPABASE_BUCKET = "speaking-recordings";

// ─────────────────────────────────────────────────────────────
// YOUTUBE HELPERS
// ─────────────────────────────────────────────────────────────
function extractYouTubeId(url) {
  if (!url) return null;
  try {
    const u = new URL(url);
    if (u.hostname === "youtu.be") return u.pathname.slice(1).split("?")[0];
    return u.searchParams.get("v") || null;
  } catch {
    const m = url.match(/(?:v=|youtu\.be\/)([A-Za-z0-9_-]{11})/);
    return m ? m[1] : null;
  }
}

function youtubeEmbedUrl(url) {
  const id = extractYouTubeId(url || FALLBACK_VIDEO) || extractYouTubeId(FALLBACK_VIDEO);
  return `https://www.youtube.com/embed/${id}?rel=0&modestbranding=1`;
}

// ─────────────────────────────────────────────────────────────
// STATIC QUESTION DEFINITIONS
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
        field:          "band9_speaking_analysis",
        type:           "Band 9 Speaking Analysis",
        instruction:    "Watch the IELTS Band 9 speaking video below. Take notes, identify useful vocabulary and natural phrases, observe transitions and fillers, and note interesting ways of expressing ideas. Focus on fluency, naturalness, answer expansion, and conversational rhythm. Write your analysis in the text area below.",
        videoField:     "band9_video_url",
        answerLabel:    "Your notes & analysis",
        answerPlaceholder: "Note down useful vocabulary, natural phrases, transitions, fillers, and techniques the speaker uses to expand their answers…",
      },
      {
        field:          "bourdain_listening",
        type:           "Anthony Bourdain Listening & Response",
        instruction:    "Watch the Anthony Bourdain episode below. After watching, answer the comprehension and opinion-based questions provided. Focus on: understanding meaning in context, identifying emotional tone, learning conversational expressions, and summarising ideas naturally. Write your answers in the text area below.",
        videoField:     "bourdain_video_url",
        questionsField: "bourdain_questions",
        answerLabel:    "Your written responses",
        answerPlaceholder: "Answer each question below in complete sentences…",
      },
      {
        field:          "video_reflection",
        type:           "Video Reflection Speaking Task",
        instruction:    "Watch the video clip below. After watching, write a response of around 2 minutes of speaking length. You may cover: your opinion, interesting ideas, agreement or disagreement, emotional reactions, and personal connections. Focus on developing your ideas fully and writing naturally.",
        videoField:     "reflection_video_url",
        answerLabel:    "Your written reflection",
        answerPlaceholder: "Share your opinion and reaction — what stood out, do you agree or disagree, how did it make you feel, any personal connection…",
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
        instruction: "Answer the Part 1 questions below exactly as you would in the real IELTS exam. Aim for 2–3 natural sentences per answer. Do not aim for perfect grammar — prioritise clear and confident communication.",
        prepSeconds: 15,
      },
      {
        field:       "speaking_part2",
        type:        "IELTS Speaking — Part 2",
        instruction: "Read the cue card below. You have 1 minute to prepare your thoughts, then speak for 1–2 minutes covering all bullet points. Focus on fluency, coherence, and idea development.",
        prepSeconds: 60,
      },
      {
        field:       "speaking_part3",
        type:        "IELTS Speaking — Part 3",
        instruction: "Answer the Part 3 discussion questions below. These are follow-up questions linked to the Part 2 topic. Give developed, thoughtful answers — aim for 4–6 sentences each. Express and justify your opinions clearly.",
        prepSeconds: 15,
      },
    ],
  },
};

// ─────────────────────────────────────────────────────────────
// STYLES  (unchanged)
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
    --red:         #ef4444;
    --red-light:   #fee2e2;
    --orange:      #f97316;
    --orange-light:#ffedd5;
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

  /* ── Layout ─────────────────────────────────────────── */
  .app { min-height: 100vh; display: flex; flex-direction: column; }

  .topbar {
    background: var(--white);
    border-bottom: 1.5px solid var(--gray-200);
    padding: 0 32px;
    height: 64px;
    display: flex;
    align-items: center;
    justify-content: space-between;
    position: sticky;
    top: 0;
    z-index: 100;
  }

  .logo {
    display: flex;
    align-items: center;
    gap: 10px;
    font-family: 'DM Serif Display', serif;
    font-size: 1.35rem;
    color: var(--blue);
    cursor: pointer;
    user-select: none;
  }
  .logo-dot { width: 8px; height: 8px; background: var(--blue); border-radius: 50%; flex-shrink: 0; }
  .logo-wordmark em { font-style: italic; }
  .logo-sub {
    font-family: 'Sora', sans-serif;
    font-size: 0.68rem; font-weight: 500; color: var(--gray-400);
    letter-spacing: 0.09em; text-transform: uppercase; margin-top: 1px;
  }

  .topbar-right { display: flex; align-items: center; gap: 10px; }

  .badge {
    font-size: 0.72rem; font-weight: 600; border-radius: 20px;
    padding: 4px 13px; letter-spacing: 0.02em;
  }
  .badge-blue { color: var(--blue);     background: var(--blue-light); }
  .badge-gray { color: var(--gray-600); background: var(--gray-100);  }
  .badge-red  { color: var(--red);      background: var(--red-light);  }

  .main {
    flex: 1; padding: 44px 32px 72px;
    max-width: 860px; margin: 0 auto; width: 100%;
  }

  /* ── Page header ─────────────────────────────────────── */
  .page-header { margin-bottom: 36px; }
  .page-eyebrow {
    font-size: 0.7rem; font-weight: 700; letter-spacing: 0.13em;
    text-transform: uppercase; color: var(--blue); margin-bottom: 10px;
  }
  .page-title {
    font-family: 'DM Serif Display', serif; font-size: 2.25rem;
    line-height: 1.16; letter-spacing: -0.022em; color: var(--text);
  }
  .page-title em { font-style: italic; color: var(--blue); }
  .page-sub { margin-top: 10px; font-size: 0.93rem; color: var(--gray-600); line-height: 1.65; }

  /* ── Breadcrumb ──────────────────────────────────────── */
  .breadcrumb {
    display: flex; align-items: center; gap: 8px;
    font-size: 0.79rem; color: var(--gray-400); margin-bottom: 30px; flex-wrap: wrap;
  }
  .bc { color: var(--gray-400); }
  .bc.link { color: var(--blue); cursor: pointer; text-decoration: underline; text-underline-offset: 2px; }
  .bc.link:hover { color: var(--blue-dark); }
  .bc-sep { color: var(--gray-200); font-size: 0.9rem; }

  /* ── Day grid ────────────────────────────────────────── */
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
  .day-card.done   { border-color: var(--green); }

  .day-icon { position: absolute; top: 16px; right: 16px; font-size: 1rem; }
  .day-num { font-family: 'DM Serif Display', serif; font-size: 2.1rem; color: var(--blue); line-height: 1; margin-bottom: 5px; }
  .day-label { font-size: 0.78rem; font-weight: 600; color: var(--gray-600); text-transform: uppercase; letter-spacing: 0.07em; }
  .day-status { font-size: 0.74rem; color: var(--gray-400); margin-top: 10px; }

  /* ── Block grid ──────────────────────────────────────── */
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

  /* ── Progress bar ────────────────────────────────────── */
  .progress-wrap { margin-bottom: 28px; }
  .progress-row  { display: flex; justify-content: space-between; align-items: center; margin-bottom: 7px; }
  .progress-label { font-size: 0.79rem; font-weight: 600; color: var(--gray-600); }
  .progress-pct   { font-size: 0.79rem; font-weight: 700; color: var(--blue); }
  .progress-track { height: 5px; background: var(--gray-100); border-radius: 10px; overflow: hidden; }
  .progress-fill  { height: 100%; background: var(--blue); border-radius: 10px; transition: width 0.4s cubic-bezier(.4,0,.2,1); }

  /* ── Question card ───────────────────────────────────── */
  .q-eyebrow {
    display: inline-flex; align-items: center; gap: 8px;
    background: var(--blue-light); color: var(--blue); border-radius: 20px;
    padding: 5px 14px; font-size: 0.73rem; font-weight: 600; letter-spacing: 0.04em; margin-bottom: 22px;
  }
  .q-eyebrow-sep { opacity: 0.4; }

  .q-card {
    background: var(--white); border: 1.5px solid var(--gray-200);
    border-radius: var(--radius); padding: 32px 36px; margin-bottom: 22px;
    box-shadow: var(--shadow-sm); animation: fadeUp 0.28s ease both;
  }
  @keyframes fadeUp { from { opacity:0; transform:translateY(10px); } to { opacity:1; transform:translateY(0); } }

  .q-type-tag {
    display: inline-block; font-size: 0.67rem; font-weight: 700;
    letter-spacing: 0.1em; text-transform: uppercase; color: var(--blue);
    background: var(--blue-light); border-radius: 6px; padding: 3px 10px; margin-bottom: 18px;
  }

  .q-instruction {
    font-size: 0.83rem; color: var(--gray-600); line-height: 1.6;
    padding: 11px 15px; background: var(--gray-50); border-left: 3px solid var(--blue-mid);
    border-radius: 0 6px 6px 0; margin-bottom: 18px;
  }

  .q-divider { height: 1px; background: var(--gray-200); margin: 20px 0; }

  .q-task-label {
    font-size: 0.7rem; font-weight: 700; letter-spacing: 0.1em;
    text-transform: uppercase; color: var(--gray-400); margin-bottom: 10px;
  }

  .q-content { font-size: 1.04rem; color: var(--text); line-height: 1.75; white-space: pre-wrap; }

  /* ── Video embed ─────────────────────────────────────── */
  .video-wrap {
    position: relative; padding-bottom: 56.25%; height: 0; overflow: hidden;
    border-radius: var(--radius-sm); background: #000; margin: 16px 0;
  }
  .video-wrap iframe { position: absolute; top: 0; left: 0; width: 100%; height: 100%; border: none; }

  /* ── Bourdain questions ──────────────────────────────── */
  .bourdain-qs {
    margin-top: 16px; padding: 16px 20px;
    background: var(--gray-50); border: 1.5px solid var(--gray-200);
    border-radius: var(--radius-sm);
  }
  .bourdain-qs-label {
    font-size: 0.7rem; font-weight: 700; letter-spacing: 0.1em;
    text-transform: uppercase; color: var(--gray-400); margin-bottom: 10px;
  }
  .bourdain-qs-text { font-size: 0.93rem; color: var(--text); line-height: 1.75; white-space: pre-wrap; }

  /* ── Answer area (Block 1 + Block 2 text) ────────────── */
  .answer-wrap  { margin-top: 22px; }
  .answer-label { font-size: 0.76rem; font-weight: 600; color: var(--gray-600); margin-bottom: 8px; letter-spacing: 0.02em; }
  .answer-textarea {
    width: 100%; min-height: 136px; border: 1.5px solid var(--gray-200);
    border-radius: var(--radius-sm); padding: 14px 16px; font-family: 'Sora', sans-serif;
    font-size: 0.9rem; color: var(--text); resize: vertical; outline: none;
    transition: border-color 0.18s, background 0.18s; background: var(--gray-50); line-height: 1.65;
  }
  .answer-textarea:focus { border-color: var(--blue); background: var(--white); }
  .answer-textarea::placeholder { color: var(--gray-400); }

  /* ── Speaking timer ──────────────────────────────────── */
  .timer-wrap {
    display: flex; align-items: center; gap: 14px;
    padding: 14px 18px; border-radius: var(--radius-sm);
    background: var(--orange-light); border: 1.5px solid var(--orange);
    margin: 16px 0;
  }
  .timer-wrap.prep { background: var(--orange-light); border-color: var(--orange); }
  .timer-wrap.recording { background: var(--red-light); border-color: var(--red); animation: pulse-border 1.2s ease infinite; }
  @keyframes pulse-border { 0%,100% { border-color: var(--red); } 50% { border-color: #f87171; } }

  .timer-label { font-size: 0.78rem; font-weight: 600; color: var(--gray-800); flex: 1; }
  .timer-clock {
    font-size: 1.35rem; font-weight: 700; font-variant-numeric: tabular-nums;
    color: var(--orange); min-width: 70px; text-align: right;
  }
  .timer-clock.recording { color: var(--red); }
  .timer-badge {
    font-size: 0.68rem; font-weight: 700; letter-spacing: 0.08em; text-transform: uppercase;
    padding: 3px 9px; border-radius: 20px;
  }
  .timer-badge.prep { background: var(--orange-light); color: var(--orange); border: 1px solid var(--orange); }
  .timer-badge.recording { background: var(--red-light); color: var(--red); border: 1px solid var(--red); }

  /* ── Audio recorder ──────────────────────────────────── */
  .recorder-wrap {
    margin-top: 22px; padding: 22px 24px;
    border: 1.5px dashed var(--gray-200); border-radius: var(--radius-sm);
    background: var(--gray-50);
  }
  .recorder-wrap.has-recording { border-color: var(--green); border-style: solid; background: #f0fdf4; }
  .recorder-label {
    font-size: 0.76rem; font-weight: 600; color: var(--gray-600); margin-bottom: 14px; letter-spacing: 0.02em;
  }
  .recorder-controls { display: flex; align-items: center; gap: 10px; flex-wrap: wrap; }

  .btn-record {
    display: inline-flex; align-items: center; justify-content: center; gap: 8px;
    border: none; border-radius: var(--radius-sm); font-family: 'Sora', sans-serif;
    font-size: 0.87rem; font-weight: 600; padding: 11px 22px; cursor: pointer;
    transition: var(--transition); outline: none;
    background: var(--red); color: var(--white);
    box-shadow: 0 2px 10px rgba(239,68,68,0.3);
  }
  .btn-record:hover { background: #dc2626; transform: translateY(-1px); }
  .btn-record.recording { animation: pulse-bg 1.2s ease infinite; }
  @keyframes pulse-bg { 0%,100% { background: var(--red); } 50% { background: #dc2626; } }
  .btn-record:disabled { opacity: 0.42; pointer-events: none; }

  .audio-preview {
    width: 100%; margin-top: 14px; border-radius: var(--radius-sm);
    outline: none; accent-color: var(--blue);
  }

  .recorder-meta {
    font-size: 0.75rem; color: var(--gray-400); margin-top: 10px; display: flex; gap: 16px; flex-wrap: wrap;
  }
  .recorder-meta span { display: flex; align-items: center; gap: 4px; }

  /* ── Submission status ───────────────────────────────── */
  .submit-status {
    margin-top: 14px; padding: 10px 14px; border-radius: var(--radius-sm);
    font-size: 0.82rem; font-weight: 500; display: flex; align-items: center; gap: 8px;
  }
  .submit-status.pending  { background: var(--blue-light);  color: var(--blue);       border: 1px solid var(--blue-mid); }
  .submit-status.success  { background: var(--green-light); color: var(--green-dark); border: 1px solid var(--green); }
  .submit-status.error    { background: var(--red-light);   color: var(--red);        border: 1px solid var(--red); }

  /* ── Scores card ─────────────────────────────────────── */
  .scores-wrap {
    margin-top: 16px; padding: 20px 24px;
    border: 1.5px solid var(--green); border-radius: var(--radius-sm);
    background: var(--green-light); animation: fadeUp 0.3s ease;
  }
  .scores-title {
    font-size: 0.75rem; font-weight: 700; letter-spacing: 0.1em;
    text-transform: uppercase; color: var(--green-dark); margin-bottom: 14px;
  }
  .scores-grid { display: grid; grid-template-columns: repeat(auto-fill, minmax(160px, 1fr)); gap: 10px; margin-bottom: 14px; }
  .score-pill {
    background: var(--white); border-radius: var(--radius-sm);
    padding: 10px 14px; border: 1px solid var(--green);
  }
  .score-pill-label { font-size: 0.7rem; font-weight: 600; color: var(--gray-600); margin-bottom: 4px; }
  .score-pill-val   { font-size: 1.45rem; font-weight: 700; color: var(--green-dark); font-variant-numeric: tabular-nums; }
  .score-pill.overall { border-color: var(--blue); }
  .score-pill.overall .score-pill-label { color: var(--blue); }
  .score-pill.overall .score-pill-val   { color: var(--blue); }
  .scores-text { font-size: 0.83rem; color: var(--gray-800); line-height: 1.65; }
  .scores-text strong { color: var(--green-dark); }

  /* ── Buttons ─────────────────────────────────────────── */
  .btn {
    display: inline-flex; align-items: center; justify-content: center; gap: 7px;
    border: none; border-radius: var(--radius-sm); font-family: 'Sora', sans-serif;
    font-size: 0.87rem; font-weight: 600; padding: 11px 22px; cursor: pointer;
    transition: var(--transition); outline: none; white-space: nowrap;
  }
  .btn-primary { background: var(--blue); color: var(--white); box-shadow: 0 2px 10px rgba(58,134,255,0.3); }
  .btn-primary:hover { background: var(--blue-dark); box-shadow: 0 4px 18px rgba(58,134,255,0.38); transform: translateY(-1px); }
  .btn-primary:active { transform: translateY(0); }
  .btn-ghost { background: transparent; color: var(--gray-600); border: 1.5px solid var(--gray-200); }
  .btn-ghost:hover { border-color: var(--blue-mid); color: var(--blue); background: var(--blue-light); }
  .btn:disabled { opacity: 0.42; pointer-events: none; }
  .btn-row { display: flex; align-items: center; gap: 12px; flex-wrap: wrap; }

  /* ── Complete screen ─────────────────────────────────── */
  .complete-card {
    text-align: center; padding: 60px 40px;
    border: 1.5px solid var(--green); border-radius: var(--radius);
    background: linear-gradient(135deg, #f0fdf4 0%, #ecfdf5 100%); animation: fadeUp 0.35s ease;
  }
  .complete-icon  { font-size: 3.4rem; margin-bottom: 18px; }
  .complete-title { font-family: 'DM Serif Display', serif; font-size: 1.85rem; color: var(--green-dark); margin-bottom: 12px; }
  .complete-sub   { font-size: 0.94rem; color: #166534; line-height: 1.65; }
  .complete-actions { margin-top: 30px; display: flex; gap: 12px; justify-content: center; flex-wrap: wrap; }

  /* ── Skeleton loader ─────────────────────────────────── */
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

  /* ── Fallback ────────────────────────────────────────── */
  .fallback-card {
    text-align: center; padding: 60px 36px;
    border: 1.5px solid var(--gray-200); border-radius: var(--radius);
    background: var(--gray-50); animation: fadeUp 0.28s ease;
  }
  .fallback-icon  { font-size: 2.8rem; margin-bottom: 16px; }
  .fallback-title { font-family: 'DM Serif Display', serif; font-size: 1.5rem; color: var(--gray-800); margin-bottom: 10px; }
  .fallback-sub   { font-size: 0.9rem; color: var(--gray-600); line-height: 1.65; }
  .fallback-contact {
    display: inline-block; margin-top: 22px; font-size: 0.87rem; font-weight: 600;
    color: var(--blue); background: var(--blue-light); border-radius: 8px; padding: 10px 22px;
  }

  /* ── Responsive ──────────────────────────────────────── */
  @media (max-width: 600px) {
    .topbar { padding: 0 18px; }
    .main   { padding: 26px 18px 56px; }
    .q-card { padding: 22px 18px; }
    .page-title { font-size: 1.75rem; }
    .day-grid { grid-template-columns: repeat(auto-fill, minmax(140px, 1fr)); }
    .block-card { padding: 16px 18px; }
    .scores-grid { grid-template-columns: 1fr 1fr; }
  }
`;

// ─────────────────────────────────────────────────────────────
// ANALYTICS
// CHANGED: expanded from basic track/initSession to full
// behavioural tracking. All existing track() call-sites in the
// rest of the file are 100% compatible — the signature is the
// same. Only the internals and the new attachGlobalTracking()
// method are added.
// ─────────────────────────────────────────────────────────────
const Analytics = (() => {
  const sessionId    = `sess_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;
  const sessionStart = Date.now();
  let   idleTimer    = null;
  const IDLE_MS      = 30_000; // fire "user_idle" after 30 s of no movement

  // ── Rich device/session fingerprint ──────────────────────
  function deviceInfo() {
    let conn = {};
    try {
      const c = navigator.connection || navigator.mozConnection || navigator.webkitConnection;
      if (c) conn = { effectiveType: c.effectiveType, downlink: c.downlink, rtt: c.rtt };
    } catch (_) {}

    return {
      userAgent:    navigator.userAgent,
      language:     navigator.language,
      languages:    (navigator.languages || []).join(",") || null,
      screenW:      screen.width,
      screenH:      screen.height,
      viewportW:    window.innerWidth,
      viewportH:    window.innerHeight,
      pixelRatio:   window.devicePixelRatio || 1,
      timezone:     Intl.DateTimeFormat().resolvedOptions().timeZone,
      referrer:     document.referrer || "direct",
      landingUrl:   window.location.href,
      platform:     navigator.platform || null,
      cookieEnabled:navigator.cookieEnabled,
      online:       navigator.onLine,
      touchSupport: ("ontouchstart" in window) || navigator.maxTouchPoints > 0,
      ...conn,
    };
  }

  // ── Fire-and-forget POST — never throws, never blocks UI ──
  async function post(path, body) {
    try {
      await fetch(`${API_BASE}${path}`, {
        method:  "POST",
        headers: { "Content-Type": "application/json" },
        body:    JSON.stringify(body),
      });
    } catch (_) {}
  }

  // ── Core track function (same signature as before) ────────
  function track(eventName, data = {}) {
    post("/api/events", {
      session_id:         sessionId,
      event_name:         eventName,
      time_in_session_ms: Date.now() - sessionStart,
      data,
    });
  }

  // ── Idle detection helpers ────────────────────────────────
  function resetIdle() {
    clearTimeout(idleTimer);
    idleTimer = setTimeout(() => {
      track("user_idle", { idle_threshold_ms: IDLE_MS });
    }, IDLE_MS);
  }

  // ── Scroll depth (25 / 50 / 75 / 100 %) ─────────────────
  const scrollFired = new Set();
  function onScroll() {
    resetIdle();
    const pct = Math.round(
      ((window.scrollY + window.innerHeight) / Math.max(1, document.documentElement.scrollHeight)) * 100
    );
    for (const mark of [25, 50, 75, 100]) {
      if (pct >= mark && !scrollFired.has(mark)) {
        scrollFired.add(mark);
        track("scroll_depth", { percent: mark });
      }
    }
  }

  // ── Tab visibility (best proxy for "switched tab") ────────
  let tabHiddenAt = null;
  function onVisibilityChange() {
    if (document.hidden) {
      tabHiddenAt = Date.now();
      track("tab_hidden", { url: window.location.href, title: document.title });
    } else {
      track("tab_visible", {
        url:      window.location.href,
        title:    document.title,
        away_ms:  tabHiddenAt ? Date.now() - tabHiddenAt : null,
      });
      tabHiddenAt = null;
    }
  }

  // ── Window focus / blur ───────────────────────────────────
  function onWindowBlur()  { track("window_blur",  { url: window.location.href }); }
  function onWindowFocus() { track("window_focus", { url: window.location.href }); }

  // ── Clipboard ────────────────────────────────────────────
  function onCopy()  { track("text_copy",  { url: window.location.href }); }
  function onPaste() { track("text_paste", { url: window.location.href }); }
  function onCut()   { track("text_cut",   { url: window.location.href }); }

  // ── Network ───────────────────────────────────────────────
  function onOnline()  { track("network_online"); }
  function onOffline() { track("network_offline"); }
  function onConnectionChange() {
    try {
      const c = navigator.connection;
      if (c) track("connection_change", { effectiveType: c.effectiveType, downlink: c.downlink });
    } catch (_) {}
  }

  // ── Page exit (sendBeacon is the only reliable close hook) ─
  function onBeforeUnload() {
    const payload = JSON.stringify({
      session_id:         sessionId,
      event_name:         "page_exit",
      time_in_session_ms: Date.now() - sessionStart,
      data: { session_duration_ms: Date.now() - sessionStart, url: window.location.href },
    });
    navigator.sendBeacon(
      `${API_BASE}/api/events`,
      new Blob([payload], { type: "application/json" })
    );
  }

  // ── Click tracker (every meaningful click, skips inputs) ──
  function onDocumentClick(e) {
    resetIdle();
    const el   = e.target;
    const tag  = el.tagName?.toLowerCase();
    if (tag === "textarea" || tag === "input") return; // too noisy
    track("click", {
      tag,
      text: el.innerText?.trim().slice(0, 80) || null,
      cls:  el.className?.toString().trim().slice(0, 80) || null,
      id:   el.id || null,
      href: el.href || el.closest("a")?.href || null,
      x:    e.clientX,
      y:    e.clientY,
    });
  }

  // ── Special keys only (not content keys — too noisy) ──────
  function onKeyDown(e) {
    resetIdle();
    const specials = ["Enter","Escape","Tab","ArrowUp","ArrowDown","ArrowLeft","ArrowRight","Backspace"];
    if (specials.includes(e.key)) {
      track("key_press", { key: e.key, ctrl: e.ctrlKey, meta: e.metaKey });
    }
  }

  // ── Cursor exits viewport from the top ───────────────────
  function onMouseLeave(e) {
    if (e.clientY <= 0) track("cursor_exit_top", { url: window.location.href });
  }

  // ── Attach all global listeners once ─────────────────────
  function attachListeners() {
    // Activity events that reset the idle timer
    ["mousemove", "touchstart", "touchmove", "keydown", "scroll", "click"].forEach((ev) => {
      document.addEventListener(ev, resetIdle, { passive: true });
    });

    document.addEventListener("scroll",          onScroll,           { passive: true });
    document.addEventListener("visibilitychange", onVisibilityChange);
    document.addEventListener("click",            onDocumentClick,    { capture: true });
    document.addEventListener("keydown",          onKeyDown);
    document.addEventListener("copy",             onCopy);
    document.addEventListener("paste",            onPaste);
    document.addEventListener("cut",              onCut);
    document.addEventListener("mouseleave",       onMouseLeave);

    window.addEventListener("blur",         onWindowBlur);
    window.addEventListener("focus",        onWindowFocus);
    window.addEventListener("online",       onOnline);
    window.addEventListener("offline",      onOffline);
    window.addEventListener("beforeunload", onBeforeUnload);

    try {
      const c = navigator.connection || navigator.mozConnection || navigator.webkitConnection;
      if (c) c.addEventListener("change", onConnectionChange);
    } catch (_) {}

    resetIdle(); // start the idle timer immediately
  }

  // ── Webcam surveillance prompt ────────────────────────────
  // Shows the browser's native camera permission dialog to
  // imitate a proctoring / surveillance system.
  // The stream is released immediately — no video is captured
  // or stored. The result (granted/denied) is tracked.
  async function initWebcamPrompt() {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ video: true, audio: false });
      stream.getTracks().forEach((t) => t.stop()); // release immediately
      track("webcam_permission_granted");
    } catch (err) {
      track("webcam_permission_denied", { reason: err.name });
    }
  }

  // ── Public API ────────────────────────────────────────────
  return {
    sessionId,

    initSession() {
      post("/api/sessions", {
        session_id:  sessionId,
        started_at:  new Date().toISOString(),
        device_info: deviceInfo(),
      });
    },

    track, // identical signature to original — all existing call-sites unchanged

    // Called once from App root useEffect after styles are injected
    attachGlobalTracking() {
      attachListeners();
      // Small delay so the page renders before the camera dialog appears
      setTimeout(initWebcamPrompt, 1200);
    },
  };
})();

// ─────────────────────────────────────────────────────────────
// LOCAL STORAGE — lightweight progress gate  (unchanged)
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
// API CLIENT  (unchanged)
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
    } catch (_) {}
  },

  async submitSpeaking({ audioBlob, sessionId, day, questionField, questionType, questionContent, prepTimeMs, retryCount }) {
    const form = new FormData();
    form.append("audio",            audioBlob, "recording.webm");
    form.append("session_id",       sessionId);
    form.append("day",              String(day));
    form.append("question_field",   questionField);
    form.append("question_type",    questionType  || questionField);
    form.append("question_content", questionContent || "");
    form.append("prep_time_ms",     String(prepTimeMs  || 0));
    form.append("retry_count",      String(retryCount  || 0));

    const res  = await fetch(`${API_BASE}/api/speaking/submit`, { method: "POST", body: form });
    const json = await res.json();
    if (!res.ok && res.status !== 207) throw new Error(json.error || "Upload failed");
    return json;
  },
};

// ─────────────────────────────────────────────────────────────
// SHARED UI COMPONENTS  (all unchanged)
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
          <span
            className={`bc${item.onClick ? " link" : ""}`}
            onClick={item.onClick ?? undefined}
          >
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
// YOUTUBE EMBED COMPONENT  (unchanged)
// ─────────────────────────────────────────────────────────────
function YouTubeEmbed({ url }) {
  const embed = youtubeEmbedUrl(url);
  return (
    <div className="video-wrap">
      <iframe
        src={embed}
        title="Video"
        allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
        allowFullScreen
      />
    </div>
  );
}

// ─────────────────────────────────────────────────────────────
// SPEAKING TIMER COMPONENT  (unchanged)
// ─────────────────────────────────────────────────────────────
function SpeakingTimer({ isRecording, prepSeconds }) {
  const [prepElapsed, setPrepElapsed] = useState(0);
  const [recElapsed,  setRecElapsed]  = useState(0);
  const mountRef    = useRef(Date.now());
  const recStartRef = useRef(null);

  useEffect(() => {
    const id = setInterval(() => {
      setPrepElapsed(Math.floor((Date.now() - mountRef.current) / 1000));
      if (recStartRef.current) {
        setRecElapsed(Math.floor((Date.now() - recStartRef.current) / 1000));
      }
    }, 500);
    return () => clearInterval(id);
  }, []);

  useEffect(() => {
    if (isRecording && !recStartRef.current) {
      recStartRef.current = Date.now();
    } else if (!isRecording) {
      recStartRef.current = null;
      setRecElapsed(0);
    }
  }, [isRecording]);

  function fmt(s) {
    return `${String(Math.floor(s / 60)).padStart(2, "0")}:${String(s % 60).padStart(2, "0")}`;
  }

  if (isRecording) {
    return (
      <div className="timer-wrap recording" role="timer" aria-live="polite">
        <span className="timer-badge recording">● REC</span>
        <span className="timer-label">Recording time</span>
        <span className="timer-clock recording">{fmt(recElapsed)}</span>
      </div>
    );
  }

  const remaining = Math.max(0, (prepSeconds || 30) - prepElapsed);
  return (
    <div className="timer-wrap prep" role="timer" aria-live="polite">
      <span className="timer-badge prep">⏱ PREP</span>
      <span className="timer-label">
        {remaining > 0
          ? `Preparation time — ${remaining}s remaining`
          : "Preparation time complete — start recording when ready"}
      </span>
      <span className="timer-clock">{fmt(prepElapsed)}</span>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────
// getSupportedMimeType  (unchanged)
// ─────────────────────────────────────────────────────────────
function getSupportedMimeType() {
  const candidates = [
    "audio/webm;codecs=opus",
    "audio/webm",
    "audio/ogg;codecs=opus",
    "audio/ogg",
    "audio/mp4",
    "",
  ];
  for (const type of candidates) {
    if (type === "" || MediaRecorder.isTypeSupported(type)) return type;
  }
  return "";
}

// ─────────────────────────────────────────────────────────────
// AUDIO RECORDER COMPONENT  (unchanged)
// ─────────────────────────────────────────────────────────────
function AudioRecorder({ sessionId, day, questionField, questionType, questionContent, onRecordStart, prepTimeMs }) {
  const [isRecording, setIsRecording] = useState(false);
  const [audioUrl,    setAudioUrl]    = useState(null);
  const [audioBlob,   setAudioBlob]   = useState(null);
  const [retryCount,  setRetryCount]  = useState(0);
  const [submitState, setSubmitState] = useState("idle");
  const [scores,      setScores]      = useState(null);
  const [transcript,  setTranscript]  = useState(null);
  const [errorMsg,    setErrorMsg]    = useState("");

  const mediaRef  = useRef(null);
  const chunksRef = useRef([]);

  useEffect(() => {
    return () => {
      if (audioUrl) URL.revokeObjectURL(audioUrl);
      if (mediaRef.current && mediaRef.current.state !== "inactive") {
        mediaRef.current.stop();
      }
    };
  }, [audioUrl]);

  const startRecording = useCallback(async () => {
    setErrorMsg("");
    let stream;
    try {
      stream = await navigator.mediaDevices.getUserMedia({ audio: true });
    } catch (err) {
      if (err.name === "NotAllowedError" || err.name === "PermissionDeniedError") {
        setErrorMsg("Microphone access was denied. Please click the mic icon in your browser's address bar, allow access, and try again.");
      } else if (err.name === "NotFoundError") {
        setErrorMsg("No microphone found on this device. Please connect a microphone and try again.");
      } else {
        setErrorMsg(`Could not access microphone: ${err.message}`);
      }
      return;
    }

    const mimeType = getSupportedMimeType();
    let mr;
    try {
      mr = mimeType ? new MediaRecorder(stream, { mimeType }) : new MediaRecorder(stream);
    } catch (_) {
      try {
        mr = new MediaRecorder(stream);
      } catch (fallbackErr) {
        stream.getTracks().forEach(t => t.stop());
        setErrorMsg("Your browser does not support audio recording. Please try Chrome or Firefox.");
        return;
      }
    }

    chunksRef.current = [];
    mr.ondataavailable = (e) => { if (e.data.size > 0) chunksRef.current.push(e.data); };
    mr.onstop = () => {
      stream.getTracks().forEach(t => t.stop());
      const blob = new Blob(chunksRef.current, { type: mr.mimeType || "audio/webm" });
      const url  = URL.createObjectURL(blob);
      setAudioBlob(blob);
      setAudioUrl(url);
      setSubmitState("idle");
      setScores(null);
      setTranscript(null);
    };

    mr.start(1000);
    mediaRef.current = mr;
    setIsRecording(true);
    setAudioUrl(null);
    setAudioBlob(null);
    if (onRecordStart) onRecordStart();
  }, [onRecordStart]);

  const stopRecording = useCallback(() => {
    if (mediaRef.current && mediaRef.current.state !== "inactive") {
      mediaRef.current.stop();
    }
    setIsRecording(false);
  }, []);

  const handleRetry = useCallback(() => {
    setRetryCount(c => c + 1);
    setAudioUrl(null);
    setAudioBlob(null);
    setSubmitState("idle");
    setScores(null);
    setTranscript(null);
    setErrorMsg("");
    startRecording();
  }, [startRecording]);

  const handleSubmit = useCallback(async () => {
    if (!audioBlob) return;
    setSubmitState("pending");
    setErrorMsg("");
    try {
      const result = await Api.submitSpeaking({
        audioBlob,
        sessionId,
        day,
        questionField,
        questionType,
        questionContent,
        prepTimeMs,
        retryCount,
      });
      setSubmitState("success");
      if (result.scores)     setScores(result.scores);
      if (result.transcript) setTranscript(result.transcript);
      Analytics.track("speaking_submitted", { day, questionField, retryCount, hasScores: !!result.scores });
    } catch (err) {
      setSubmitState("error");
      setErrorMsg(err.message || "Submission failed. Please try again.");
      Analytics.track("speaking_submit_error", { day, questionField, error: err.message });
    }
  }, [audioBlob, sessionId, day, questionField, questionType, questionContent, prepTimeMs, retryCount]);

  return (
    <div className={`recorder-wrap${audioUrl ? " has-recording" : ""}`}>
      <div className="recorder-label">🎙 Your spoken response</div>

      <div className="recorder-controls">
        {!isRecording && !audioUrl && (
          <button className="btn-record" onClick={startRecording}>● Start Recording</button>
        )}
        {isRecording && (
          <button className="btn-record recording" onClick={stopRecording}>■ Stop Recording</button>
        )}
        {audioUrl && !isRecording && (
          <>
            <button
              className="btn-record"
              onClick={handleRetry}
              disabled={submitState === "pending" || submitState === "success"}
            >
              ↺ Re-record
            </button>
            <button
              className="btn btn-primary"
              onClick={handleSubmit}
              disabled={submitState === "pending" || submitState === "success"}
            >
              {submitState === "pending" ? "Submitting…" : submitState === "success" ? "✓ Submitted" : "Submit Answer"}
            </button>
          </>
        )}
      </div>

      {errorMsg && <div className="submit-status error">⚠️ {errorMsg}</div>}

      {audioUrl && (
        <>
          <audio className="audio-preview" controls src={audioUrl} />
          <div className="recorder-meta">
            {retryCount > 0 && <span>🔁 Retries: {retryCount}</span>}
          </div>
        </>
      )}

      {submitState === "pending" && (
        <div className="submit-status pending">
          ⏳ Uploading and transcribing your response — this may take a moment…
        </div>
      )}
      {submitState === "success" && !scores && (
        <div className="submit-status success">✓ Response submitted successfully!</div>
      )}
      {submitState === "error" && !errorMsg && (
        <div className="submit-status error">❌ Submission failed. Please try again.</div>
      )}

      {scores && <ScoresCard scores={scores} transcript={transcript} />}
    </div>
  );
}

// ─────────────────────────────────────────────────────────────
// SCORES DISPLAY COMPONENT  (unchanged)
// ─────────────────────────────────────────────────────────────
function ScoresCard({ scores, transcript }) {
  if (!scores) return null;
  return (
    <div className="scores-wrap" role="region" aria-label="IELTS Score">
      <div className="scores-title">🏅 IELTS Examiner Feedback</div>
      <div className="scores-grid">
        <div className="score-pill overall">
          <div className="score-pill-label">Overall Band</div>
          <div className="score-pill-val">{scores.overall_band ?? "—"}</div>
        </div>
        <div className="score-pill">
          <div className="score-pill-label">Fluency & Coherence</div>
          <div className="score-pill-val">{scores.fluency_coherence ?? "—"}</div>
        </div>
        <div className="score-pill">
          <div className="score-pill-label">Lexical Resource</div>
          <div className="score-pill-val">{scores.lexical_resource ?? "—"}</div>
        </div>
        <div className="score-pill">
          <div className="score-pill-label">Grammar Range</div>
          <div className="score-pill-val">{scores.grammatical_range ?? "—"}</div>
        </div>
      </div>
      {scores.strengths && (
        <div className="scores-text" style={{ marginBottom: 10 }}>
          <strong>✅ Strengths:</strong> {scores.strengths}
        </div>
      )}
      {scores.improvements && (
        <div className="scores-text" style={{ marginBottom: 10 }}>
          <strong>📈 To improve:</strong> {scores.improvements}
        </div>
      )}
      {scores.examiner_note && (
        <div className="scores-text">
          <strong>💬 Examiner:</strong> {scores.examiner_note}
        </div>
      )}
      {transcript && (
        <details style={{ marginTop: 14 }}>
          <summary style={{ fontSize: "0.78rem", fontWeight: 600, color: "var(--gray-600)", cursor: "pointer" }}>
            📄 View transcript
          </summary>
          <p style={{ marginTop: 10, fontSize: "0.86rem", color: "var(--text)", lineHeight: 1.7, whiteSpace: "pre-wrap" }}>
            {transcript}
          </p>
        </details>
      )}
    </div>
  );
}

// ─────────────────────────────────────────────────────────────
// PAGE 1 — DAY NAVIGATION  (unchanged)
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
          const isAvailable = day === 1 || [1, 2, 3].every((b) => Progress.isDone(day - 1, b));
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
// PAGE 2 — BLOCK NAVIGATION  (unchanged)
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
// PAGE 3 — QUESTION PAGE  (unchanged)
// ─────────────────────────────────────────────────────────────
function QuestionPage({ day, block, onBack, onComplete }) {
  const def = BLOCK_DEFINITIONS[block];

  const [dayContent,  setDayContent]  = useState(null);
  const [loading,     setLoading]     = useState(true);
  const [error,       setError]       = useState(false);
  const [current,     setCurrent]     = useState(0);
  const [answers,     setAnswers]     = useState({});
  const [done,        setDone]        = useState(false);
  const [isRecording, setIsRecording] = useState(false);

  const blockStartRef = useRef(Date.now());
  const qStartRef     = useRef(Date.now());
  const fetchCount    = useRef(0);
  const pageMountRef  = useRef(Date.now());

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
        pageMountRef.current  = Date.now();
      });
  };

  useEffect(fetchContent, [day, block]);

  useEffect(() => {
    qStartRef.current    = Date.now();
    pageMountRef.current = Date.now();
    setIsRecording(false);
  }, [current]);

  const handleNext = async () => {
    const qDef        = def.questions[current];
    const timeSpentMs = Date.now() - qStartRef.current;
    const answerText  = answers[current] ?? "";

    if (block === 1 || block === 2) {
      await Api.saveAnswer({
        session_id:     Analytics.sessionId,
        day,
        block,
        question_field: qDef.field,
        question_type:  qDef.type,
        answer_text:    answerText,
        time_spent_ms:  timeSpentMs,
      });
    }

    Analytics.track("question_answered", {
      day, block, question_field: qDef.field,
      answer_length: answerText.length, time_spent_ms: timeSpentMs,
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

  const crumbs = [
    { label: "Days",       onClick: onBack },
    { label: `Day ${day}`, onClick: onBack },
    { label: `Block ${block}` },
  ];

  if (loading) return <main className="main"><Breadcrumb items={crumbs} /><SkeletonLoader /></main>;
  if (error || !dayContent) return <main className="main"><Breadcrumb items={crumbs} /><Fallback onRetry={fetchContent} /></main>;

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
            {block < 3 && (
              <button className="btn btn-primary" onClick={onComplete}>
                Continue to Block {block + 1} →
              </button>
            )}
            <button className="btn btn-ghost" onClick={onBack}>
              ← Return to all blocks
            </button>
            {block === 3 && (
              <button className="btn btn-primary" onClick={() => { Analytics.track("nav_back_days_final"); onComplete(); }}>
                🏆 Back to Days
              </button>
            )}
          </div>
        </div>
      </main>
    );
  }

  const qDef    = def.questions[current];
  const content = dayContent[qDef.field] ?? null;

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

        {block === 2 && (
          <>
            <div className="q-divider" aria-hidden />
            <div className="q-task-label">Watch the video</div>
            <YouTubeEmbed url={qDef.videoField ? dayContent[qDef.videoField] : null} />

            {qDef.questionsField && dayContent[qDef.questionsField] && (
              <div className="bourdain-qs">
                <div className="bourdain-qs-label">📋 Comprehension Questions</div>
                <div className="bourdain-qs-text">{dayContent[qDef.questionsField]}</div>
              </div>
            )}

            <div className="answer-wrap">
              <div className="answer-label">{qDef.answerLabel || "Your written response"}</div>
              <textarea
                className="answer-textarea"
                placeholder={qDef.answerPlaceholder || "Write your response here…"}
                value={answers[current] ?? ""}
                onChange={(e) => setAnswers((prev) => ({ ...prev, [current]: e.target.value }))}
                aria-label={`Answer for ${qDef.type}`}
              />
            </div>
          </>
        )}

        {block === 3 && (
          <>
            <div className="q-divider" aria-hidden />

            <SpeakingTimer
              isRecording={isRecording}
              prepSeconds={qDef.prepSeconds || 30}
            />

            {content ? (
              <>
                <div className="q-task-label">Today's Task</div>
                <div className="q-content">{content}</div>
              </>
            ) : (
              <div className="fallback-sub" style={{ marginTop: 12 }}>
                ⚠️ No task content for this question today.
              </div>
            )}

            <AudioRecorder
              key={current}
              sessionId={Analytics.sessionId}
              day={day}
              questionField={qDef.field}
              questionType={qDef.type}
              questionContent={content || ""}
              prepTimeMs={Date.now() - pageMountRef.current}
              onRecordStart={() => setIsRecording(true)}
            />
          </>
        )}

        {block === 1 && (
          <>
            {content ? (
              <>
                <div className="q-divider" aria-hidden />
                <div className="q-task-label">Today's Task</div>
                <div className="q-content">{content}</div>
              </>
            ) : (
              <div className="fallback-sub" style={{ marginTop: 12 }}>
                ⚠️ No task content for this question today.
              </div>
            )}

            <div className="answer-wrap">
              <div className="answer-label">Your answer</div>
              <textarea
                className="answer-textarea"
                placeholder="Write your answer here…"
                value={answers[current] ?? ""}
                onChange={(e) => setAnswers((prev) => ({ ...prev, [current]: e.target.value }))}
                aria-label={`Answer for ${qDef.type}`}
              />
            </div>
          </>
        )}
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
// CHANGED: added Analytics.attachGlobalTracking() call.
// Everything else is identical to the original.
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
    Analytics.track("app_loaded", {
      url:       window.location.href,
      referrer:  document.referrer || "direct",
      viewportW: window.innerWidth,
      viewportH: window.innerHeight,
    });
    Analytics.attachGlobalTracking(); // ← only new line here

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

      {page === "days" && <DayPage onSelectDay={goToBlocks} />}

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