import { CAREER_PATHS, INTERVIEW_BANKS } from "./data.js";

// ---------------------------------------------------------------------------
// CONFIG
// ---------------------------------------------------------------------------

// Swap "*" for your actual GitHub Pages URL once you know it, e.g.
// "https://yourusername.github.io" — tighter, but "*" is fine for a class demo.
const ALLOWED_ORIGIN = "*";

const GROQ_MODEL = "openai/gpt-oss-120b";

// ---------------------------------------------------------------------------
// SYSTEM PROMPTS — this is what keeps each bot grounded and on-task.
// ---------------------------------------------------------------------------

function buildDiscoveryPrompt() {
  return `You are the Career Discovery guide inside the IS Career Launchpad, a tool for BYU Information Systems students exploring career paths.

Here is the ONLY data you may use for facts, skills, salary ranges, and sourcing:
${JSON.stringify(CAREER_PATHS, null, 2)}

Rules:
- Only discuss the career paths listed above. If asked about a path not listed, say it's not covered in this tool yet and name the paths that ARE covered.
- Never invent salary figures, skills, or facts that aren't in the data above. If the user asks something the data doesn't cover, say so honestly.
- When you state a salary range or stat, mention where it's from (the "source" field), briefly.
- Keep answers conversational and short — this is a chat interface, not a report. Use plain language a first-semester student would understand.
- If the student seems undecided, ask a clarifying question about what they enjoy or are good at to help narrow down a path, rather than just listing everything at once.`;
}

function buildInterviewPrompt() {
  return `You are the Interview Prep coach inside the IS Career Launchpad, a tool for BYU Information Systems students practicing for internship interviews.

Here is the ONLY bank of roles and questions you may draw from:
${JSON.stringify(INTERVIEW_BANKS, null, 2)}

Rules:
- Ask one question at a time from the bank above, for the role the student says they're prepping for.
- After the student answers, give specific, constructive feedback: what was strong, what was missing, and how to tighten it — using the "strongAnswerNotes" for that question as your guide.
- Don't just say "good job" — be specific and a little critical where it's warranted. Vague praise doesn't help someone prep.
- If asked about a role not in the bank, say so and list the roles that ARE covered.
- Keep the tone like a supportive but honest mock-interviewer, not a lecture.`;
}

// ---------------------------------------------------------------------------
// REQUEST HANDLING
// ---------------------------------------------------------------------------

function corsHeaders() {
  return {
    "Access-Control-Allow-Origin": ALLOWED_ORIGIN,
    "Access-Control-Allow-Methods": "POST, OPTIONS",
    "Access-Control-Allow-Headers": "Content-Type",
  };
}

export default {
  async fetch(request, env) {
    // Preflight
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

    // Expected body shape (this is the contract your frontend teammate needs):
    // {
    //   module: "discovery" | "interview",
    //   message: "the user's latest message (string)",
    //   history: [ { role: "user"|"assistant", content: "..." }, ... ]  // optional, prior turns
    // }
    const { module, message, history = [] } = body;

    if (!module || !message) {
      return jsonResponse({ error: "Missing 'module' or 'message'" }, 400);
    }

    const systemPrompt =
      module === "discovery" ? buildDiscoveryPrompt() :
      module === "interview" ? buildInterviewPrompt() :
      null;

    if (!systemPrompt) {
      return jsonResponse({ error: "module must be 'discovery' or 'interview'" }, 400);
    }

    const messages = [
      { role: "system", content: systemPrompt },
      ...history,
      { role: "user", content: message },
    ];

    try {
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
        const errText = await groqRes.text();
        return jsonResponse({ error: "Groq request failed", detail: errText }, 502);
      }

      const data = await groqRes.json();
      const reply = data.choices?.[0]?.message?.content ?? "No response generated.";

      return jsonResponse({ reply });
    } catch (err) {
      return jsonResponse({ error: "Worker error", detail: String(err) }, 500);
    }
  },
};

function jsonResponse(obj, status = 200) {
  return new Response(JSON.stringify(obj), {
    status,
    headers: { "Content-Type": "application/json", ...corsHeaders() },
  });
}
