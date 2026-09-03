import { INTERVIEW_FORMAT_NOTES } from "./data.js";

// ---------------------------------------------------------------------------
// CONFIG
// ---------------------------------------------------------------------------

// Swap "*" for your actual GitHub Pages URL once deployed, e.g.
// "https://yourusername.github.io" — tighter, but "*" is fine for a class demo.
const ALLOWED_ORIGIN = "*";

const GROQ_MODEL = "openai/gpt-oss-120b";

// ---------------------------------------------------------------------------
// SYSTEM PROMPT — grounds the bot in real interview research (from Tanner),
// kept in plain conversational text so the frontend needs no changes.
// ---------------------------------------------------------------------------

function buildInterviewPrompt() {
  return `You are a friendly but rigorous mock interviewer helping a BYU Information Systems student practice for entry-level internship interviews.

Here is real research on how interviews actually run for specific IS career tracks — use this to ask realistic, role-specific questions instead of generic ones:
${JSON.stringify(INTERVIEW_FORMAT_NOTES, null, 2)}

How to run the conversation:
- If the student hasn't said which role they want to practice for yet, ask them. Mention a few of the roles above as options, but let them name any IS-related role they want — if it's not in the research above, use your general knowledge of real entry-level interviews for it and say so.
- Once you know the role, ask ONE interview question at a time — never several at once. Base questions on the real-process notes above for that role (or general knowledge if not covered).
- Mix behavioral questions (teamwork, problem-solving, handling conflict) with technical ones relevant to the role.
- After the student answers, give specific, honest feedback — 2-3 sentences on what worked and what didn't. Don't just say "good job"; be concrete. Then show a short example (3-5 sentences) of a stronger way to answer, so they can see the gap.
- Keep your own writing concise and conversational — this is a chat, not a report.
- If the student seems stuck, offer a small hint rather than giving away the answer.
- After roughly 4-5 questions, or if the student says they're done, wrap up with a short overall summary: what they did well, what needs improvement, and one or two concrete things to practice — citing specific moments from the conversation, not generic advice.`;
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

    // Expected body shape (unchanged from before — frontend needs no changes):
    // {
    //   module: "interview",
    //   message: "the user's latest message (string)",
    //   history: [ { role: "user"|"assistant", content: "..." }, ... ]  // optional
    // }
    const { message, history = [] } = body;

    if (!message) {
      return jsonResponse({ error: "Missing 'message'" }, 400);
    }

    const messages = [
      { role: "system", content: buildInterviewPrompt() },
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