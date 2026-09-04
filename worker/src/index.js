import { INTERVIEW_FORMAT_NOTES } from "./data.js";

// ---------------------------------------------------------------------------
// CONFIG
// ---------------------------------------------------------------------------

// Swap "*" for your actual GitHub Pages URL once deployed, e.g.
// "https://yourusername.github.io" — tighter, but "*" is fine for a class demo.
const ALLOWED_ORIGIN = "*";

const GROQ_MODEL = "openai/gpt-oss-120b";
const SUPPORTED_MODES = new Set(["mixed", "behavioral", "technical"]);
const MAX_MESSAGE_LENGTH = 3000;
const MAX_HISTORY_ITEMS = 20;

// ---------------------------------------------------------------------------
// SYSTEM PROMPT — grounds the bot in real interview research (from Tanner),
// kept in plain conversational text so the frontend needs no changes.
// ---------------------------------------------------------------------------

/**
 * Creates a session-specific system prompt from validated request metadata.
 * Separating stage instructions keeps the model aligned with the five-question UI.
 */
function buildInterviewPrompt(role, mode, answeredQuestions, isStarting) {
  const focusInstruction = mode === "mixed"
    ? "Alternate between behavioral and technical questions across the session."
    : `Ask ${mode} questions only, while keeping them specific to the role.`;
  const stageInstruction = isStarting
    ? "Open with question 1 only. Do not give feedback yet."
    : answeredQuestions >= 5
      ? "The student just answered question 5. Give feedback on this answer, then provide the final session summary. Do not ask another question."
      : `The student just answered question ${answeredQuestions}. Give feedback, a stronger example answer, and then ask question ${answeredQuestions + 1}.`;

  return `You are a friendly but rigorous mock interviewer helping a BYU Information Systems student practice for entry-level internship interviews.

Selected role: ${role}
Question focus: ${mode}
Role-specific interview research: ${INTERVIEW_FORMAT_NOTES[role]}

How to run the conversation:
- Ask exactly one question at a time and keep every question specific to ${role}.
- ${focusInstruction}
- After an answer, use three short labeled sections: "What worked", "Improve", and "Stronger example". Cite concrete evidence from the student's answer. If it is vague, incorrect, or avoids the question, say so constructively and explain what is missing.
- For behavioral answers, evaluate situation, task, action, result, specificity, and reflection. For technical answers, evaluate correctness, reasoning, tradeoffs, verification, and communication.
- Make the stronger example 3-5 sentences and realistic for an entry-level student. Never invent experience the student did not claim to have.
- Keep your own writing concise and conversational — this is a chat, not a report.
- If the student seems stuck, offer a small hint rather than giving away the answer.
- In the final summary, cite moments from this session and include the strongest skill, highest-priority improvement, and two concrete next practice steps.

Current stage: ${stageInstruction}`;
}

// ---------------------------------------------------------------------------
// REQUEST HANDLING
// ---------------------------------------------------------------------------

/** Return headers required for browser requests from the static frontend. */
function corsHeaders() {
  return {
    "Access-Control-Allow-Origin": ALLOWED_ORIGIN,
    "Access-Control-Allow-Methods": "POST, OPTIONS",
    "Access-Control-Allow-Headers": "Content-Type",
  };
}

export default {
  // Cloudflare Workers call this method for every incoming HTTP request.
  async fetch(request, env) {
    // Browsers send OPTIONS before cross-origin POST requests.
    if (request.method === "OPTIONS") {
      return new Response(null, { headers: corsHeaders() });
    }

    if (request.method !== "POST") {
      return new Response("Use POST", { status: 405, headers: corsHeaders() });
    }

    let body;
    try {
      body = await request.json();
    } catch {
      return jsonResponse({ error: "Invalid JSON body" }, 400);
    }

    const {
      module,
      message,
      history = [],
      role,
      mode = "mixed",
      answeredQuestions = 0,
      isStarting = false,
    } = body;

    if (module !== "interview") {
      return jsonResponse({ error: "Unsupported module." }, 400);
    }
    if (typeof message !== "string" || !message.trim()) {
      return jsonResponse({ error: "Write a response before sending it." }, 400);
    }
    if (message.length > MAX_MESSAGE_LENGTH) {
      return jsonResponse({ error: `Responses must be ${MAX_MESSAGE_LENGTH} characters or fewer.` }, 400);
    }
    if (!Object.hasOwn(INTERVIEW_FORMAT_NOTES, role)) {
      return jsonResponse({ error: "Choose a supported career path before starting." }, 400);
    }
    if (!SUPPORTED_MODES.has(mode)) {
      return jsonResponse({ error: "Choose a valid interview focus." }, 400);
    }
    if (!Array.isArray(history)) {
      return jsonResponse({ error: "Conversation history must be an array." }, 400);
    }

    // Retain only recent, correctly shaped messages to control prompt size and
    // prevent callers from injecting unsupported chat roles.
    const safeHistory = history
      .slice(-MAX_HISTORY_ITEMS)
      .filter((item) => item && ["user", "assistant"].includes(item.role) && typeof item.content === "string")
      .map((item) => ({ role: item.role, content: item.content.slice(0, MAX_MESSAGE_LENGTH) }));
    const questionCount = Math.min(5, Math.max(0, Number(answeredQuestions) || 0));

    // The trusted system prompt always precedes untrusted conversation content.
    const messages = [
      { role: "system", content: buildInterviewPrompt(role, mode, questionCount, Boolean(isStarting)) },
      ...safeHistory,
      { role: "user", content: message.trim() },
    ];

    try {
      if (!env.GROQ_API_KEY) {
        return jsonResponse({ error: "The interview service is not configured." }, 503);
      }

      // Forward the normalized conversation to Groq using a server-side secret.
      const groqRes = await fetch("https://api.groq.com/openai/v1/chat/completions", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "Authorization": `Bearer ${env.GROQ_API_KEY}`,
        },
        body: JSON.stringify({
          model: GROQ_MODEL,
          messages,
          temperature: 0.4,
        }),
      });

      if (!groqRes.ok) {
        return jsonResponse({ error: "The interviewer is temporarily unavailable. Please try again." }, 502);
      }

      const data = await groqRes.json();
      const reply = data.choices?.[0]?.message?.content;

      if (typeof reply !== "string" || !reply.trim()) {
        return jsonResponse({ error: "The interviewer returned an empty response. Please try again." }, 502);
      }

      return jsonResponse({ reply });
    } catch {
      return jsonResponse({ error: "The interview service could not be reached. Please try again." }, 500);
    }
  },
};

/**
 * Build a consistent JSON response with CORS headers.
 * @param {object} obj - Serializable response body.
 * @param {number} status - HTTP status code.
 */
function jsonResponse(obj, status = 200) {
  return new Response(JSON.stringify(obj), {
    status,
    headers: { "Content-Type": "application/json", ...corsHeaders() },
  });
}
