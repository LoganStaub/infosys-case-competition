import json
import logging

from flask import Blueprint, render_template, request, jsonify

from services.groq_client import generate_json_reply
from services.resume_parser import extract_resume_text, ResumeParseError

logger = logging.getLogger(__name__)

chatbot_bp = Blueprint("chatbot", __name__)

# Known career tracks with real-interview-format research. A resume or a
# student's own typed answer isn't limited to these - anything outside
# this list still works, just without the extra grounding notes (see the
# fallback text in build_system_prompt).
INTERVIEW_FORMAT_NOTES = {
    "Data Analyst": (
        "Real process: recruiter screen, then a hiring-manager conversation, "
        "then a SQL/Python technical test, then often a take-home case study "
        "or dataset walkthrough. Technical questions center on SQL (joins, "
        "window functions, CTEs), basic statistics (mean/median, correlation "
        "vs. causation, hypothesis testing), and explaining a finding to a "
        "non-technical stakeholder. Behavioral questions often ask about "
        "handling messy or incomplete data."
    ),
    "Business Analyst": (
        "Real process centers on requirements-gathering ability: how you "
        "elicit and document what stakeholders actually need (interviews, "
        "workshops, user stories, process diagrams). Technical questions "
        "touch basic SQL, APIs, and Agile/Scrum vocabulary (user stories, "
        "backlog, sprint planning). Behavioral questions heavily feature "
        "stakeholder conflict - contradictory requirements, difficult "
        "stakeholders, scope disagreements."
    ),
    "Software Developer": (
        "Real process often starts with an online coding assessment "
        "(data structures & algorithms) before any live interview, followed "
        "by one or more live coding rounds. Candidates are expected to talk "
        "through their reasoning out loud while solving a problem, not just "
        "arrive at the right answer silently. Also expect questions on git, "
        "debugging a specific bug you've hit, unit testing, and walking "
        "through a past project."
    ),
    "IT Project Manager": (
        "Real process mixes STAR-format behavioral questions (a time you "
        "handled scope creep, a schedule slip, a difficult stakeholder) with "
        "methodology questions (Agile vs. Waterfall, how you estimate "
        "timelines, how you track and mitigate risk). Entry-level candidates "
        "are expected to know PM vocabulary and show structured thinking "
        "even with limited real-world project experience."
    ),
    "IT Consultant": (
        "Real process often includes a case-study round: you're given a "
        "client scenario (e.g. a technology adoption decision) and graded on "
        "*how* you structure your thinking - clarify the problem, break it "
        "down logically (MECE-style), ask clarifying questions, then close "
        "with a clear recommendation backed by 2-3 specific reasons. It's "
        "process over 'right answer.' Conceptual familiarity with major tech "
        "categories (cloud platforms, ERP/CRM) is often expected."
    ),
}

DEFAULT_TIME_LIMIT_SECONDS = 120

# Interview ends automatically after this many questions have been asked,
# at which point the model gives a wrap-up summary instead of another
# question (see build_conclusion_prompt).
TOTAL_QUESTIONS = 7


def build_resume_analysis_prompt() -> str:
    return (
        "You are helping a student prepare for a mock job interview. You "
        "will be given the text extracted from their resume. Your job is "
        "to identify the single job/career they are most likely targeting, "
        "using context clues: a personal summary or objective statement "
        "near the top is the strongest signal if present, otherwise infer "
        "from their most recent/relevant experience and the skills they "
        "emphasize.\n\n"
        "Respond with ONLY a JSON object, no other text, in this exact "
        "shape:\n"
        '{"inferred_career": string or null, "confidence": "high" | '
        '"medium" | "low", "reasoning": a one-sentence explanation}\n\n'
        "Set inferred_career to null if the resume doesn't give you enough "
        "to confidently name a specific target role. inferred_career "
        "should be a short job title (e.g. \"Data Analyst\"), not a "
        "sentence."
    )


def build_system_prompt(career: str) -> str:
    """The instructions that shape how the AI behaves as an interviewer."""
    format_notes = INTERVIEW_FORMAT_NOTES.get(
        career,
        "No specific research notes are available for this track yet - "
        "use your general knowledge of real entry-level interviews for it.",
    )
    return (
        f"You are a friendly but rigorous technical interviewer conducting "
        f"a mock interview for an entry-level '{career}' role, for a "
        f"college Information Systems student who is practicing.\n\n"
        f"Real interview format for this role (base your questions on this, "
        f"not generic questions):\n{format_notes}\n\n"
        "Rules:\n"
        "- Ask one interview question at a time. Do not ask several at once.\n"
        "- Mix behavioral questions (e.g. teamwork, problem-solving) with "
        f"technical ones relevant to '{career}'.\n"
        "- Keep your own writing concise - this is a conversation, not an "
        "essay.\n"
        "- If the student seems stuck, offer a small hint rather than the "
        "answer.\n\n"
        "Respond with ONLY a JSON object, no other text, in this exact "
        "shape:\n"
        '{"feedback": string or null, "stronger_response": string or null, '
        '"next_question": string, "time_limit_seconds": integer}\n\n'
        "- feedback: 2-3 sentences on what worked and what didn't in the "
        "student's last answer - specific, not generic praise. Set both "
        "feedback and stronger_response to null for the very first "
        "question, since there's nothing to evaluate yet.\n"
        "- stronger_response: a short example (3-5 sentences) showing a "
        "stronger way to answer the question they just answered, so they "
        "can see the gap.\n"
        "- next_question: the next interview question to ask.\n"
        "- time_limit_seconds: how long a candidate should reasonably get "
        "to answer next_question, scaled to its difficulty - roughly "
        "60-90 for a quick/simple question, 120-180 for a typical "
        "behavioral or technical question, 240-300 for a multi-part or "
        "case-study-style question."
    )


def build_conclusion_prompt(career: str) -> str:
    """Instructions for the final turn, once TOTAL_QUESTIONS have been
    asked: give feedback on the last answer as usual, then wrap up with an
    overall performance summary instead of another question."""
    return (
        f"You are wrapping up a mock interview for an entry-level "
        f"'{career}' role. The student has just answered the final "
        f"question. First give brief feedback on that last answer, then "
        f"look back across the whole interview and provide an overall "
        f"performance summary.\n\n"
        "Respond with ONLY a JSON object, no other text, in this exact "
        "shape:\n"
        '{"feedback": string, "stronger_response": string, "summary": '
        '{"went_well": string, "needs_improvement": string, '
        '"how_to_improve": string}}\n\n'
        "- feedback: 2-3 sentences on the student's last answer "
        "specifically.\n"
        "- stronger_response: a short example (3-5 sentences) showing a "
        "stronger way to answer that last question.\n"
        "- summary.went_well: 2-4 sentences on what the student did well "
        "across the whole interview, citing specific answers.\n"
        "- summary.needs_improvement: 2-4 sentences on what needs "
        "improvement across the whole interview - specific, not generic.\n"
        "- summary.how_to_improve: 2-4 sentences of concrete, actionable "
        "advice for how the student can practice or adjust to address the "
        "improvement areas just named."
    )


def _parse_structured_reply(raw_json: str) -> dict:
    """Defensively parse the model's JSON reply, filling in safe defaults
    for anything missing or malformed rather than crashing. Groq's JSON
    mode guarantees valid JSON syntax but not that our exact fields show
    up, so this is a real (if rare) case to handle, not just paranoia."""
    try:
        data = json.loads(raw_json)
    except (json.JSONDecodeError, TypeError):
        logger.warning("Non-JSON reply from model: %r", raw_json)
        data = {}

    if not isinstance(data, dict):
        data = {}

    next_question = data.get("next_question")
    if not isinstance(next_question, str) or not next_question.strip():
        next_question = (
            "Sorry, something went wrong generating the next question - "
            "try sending your answer again."
        )

    time_limit = data.get("time_limit_seconds")
    if not isinstance(time_limit, (int, float)) or time_limit <= 0:
        time_limit = DEFAULT_TIME_LIMIT_SECONDS

    feedback = data.get("feedback")
    if not isinstance(feedback, str):
        feedback = None

    stronger_response = data.get("stronger_response")
    if not isinstance(stronger_response, str):
        stronger_response = None

    return {
        "feedback": feedback,
        "stronger_response": stronger_response,
        "next_question": next_question,
        "time_limit_seconds": int(time_limit),
        "concluded": False,
    }


def _parse_conclusion_reply(raw_json: str) -> dict:
    """Defensively parse the model's final-turn JSON reply, same rationale
    as _parse_structured_reply."""
    try:
        data = json.loads(raw_json)
    except (json.JSONDecodeError, TypeError):
        logger.warning("Non-JSON reply from model: %r", raw_json)
        data = {}

    if not isinstance(data, dict):
        data = {}

    feedback = data.get("feedback")
    if not isinstance(feedback, str) or not feedback.strip():
        feedback = None

    stronger_response = data.get("stronger_response")
    if not isinstance(stronger_response, str):
        stronger_response = None

    summary = data.get("summary")
    if not isinstance(summary, dict):
        summary = {}

    fallback_text = (
        "Sorry, something went wrong generating this part of the summary."
    )

    def _summary_field(key: str) -> str:
        value = summary.get(key)
        return value if isinstance(value, str) and value.strip() else fallback_text

    return {
        "feedback": feedback,
        "stronger_response": stronger_response,
        "concluded": True,
        "summary": {
            "went_well": _summary_field("went_well"),
            "needs_improvement": _summary_field("needs_improvement"),
            "how_to_improve": _summary_field("how_to_improve"),
        },
    }


@chatbot_bp.route("/chatbot")
def chatbot_page():
    # NOTE: placeholder URL/slot - confirm with Logan whether this becomes
    # /page1, /page2, or a new nav entry once the team finalizes page names.
    return render_template("pages/chatbot/chatbot.html")


@chatbot_bp.route("/api/analyze-resume", methods=["POST"])
def analyze_resume():
    if "resume" not in request.files:
        return jsonify({"error": "No file uploaded."}), 400

    try:
        resume_text = extract_resume_text(request.files["resume"])
    except ResumeParseError as exc:
        return jsonify({"error": str(exc)}), 400

    messages = [
        {"role": "system", "content": build_resume_analysis_prompt()},
        {"role": "user", "content": resume_text},
    ]
    # resume_text and the uploaded file both go out of scope once this
    # request finishes - nothing here writes either to disk.

    try:
        raw = generate_json_reply(messages, temperature=0.3, max_tokens=200)
    except Exception as exc:
        return jsonify({"error": str(exc)}), 500

    try:
        result = json.loads(raw)
    except (json.JSONDecodeError, TypeError):
        result = {}
    if not isinstance(result, dict):
        result = {}

    inferred_career = result.get("inferred_career")
    if not isinstance(inferred_career, str) or not inferred_career.strip():
        inferred_career = None

    confidence = result.get("confidence")
    if confidence not in ("high", "medium", "low"):
        confidence = "low"

    return jsonify({
        "inferred_career": inferred_career,
        "confidence": confidence,
    })


@chatbot_bp.route("/api/chat", methods=["POST"])
def chat():
    data = request.get_json(force=True)
    career = data.get("career", "").strip()
    if not career:
        return jsonify({"error": "No career specified."}), 400
    history = data.get("history", [])

    questions_asked = sum(1 for m in history if m.get("role") == "assistant")
    is_final_turn = questions_asked >= TOTAL_QUESTIONS

    prompt = build_conclusion_prompt(career) if is_final_turn else build_system_prompt(career)
    messages = [{"role": "system", "content": prompt}]
    messages.extend(history)

    try:
        raw = generate_json_reply(messages)
    except Exception as exc:
        return jsonify({"error": str(exc)}), 500

    if is_final_turn:
        return jsonify(_parse_conclusion_reply(raw))
    return jsonify(_parse_structured_reply(raw))
