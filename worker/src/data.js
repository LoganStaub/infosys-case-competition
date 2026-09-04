// ---------------------------------------------------------------------------
// Real interview-format research (originally written by Tanner for a
// different, JSON-structured chatbot design; ported here for the
// plain-conversation version of the interview prep bot).
//
// Each entry describes what happens in entry-level interviews for that role,
// so the chatbot asks realistic questions instead of generic ones. Keys must
// exactly match the role options in frontend/pages/interview/interview.html;
// the worker rejects unknown roles instead of silently changing behavior.
// ---------------------------------------------------------------------------

export const INTERVIEW_FORMAT_NOTES = {
  "Data Analyst": (
    "Real process: recruiter screen, then a hiring-manager conversation, " +
    "then a SQL/Python technical test, then often a take-home case study " +
    "or dataset walkthrough. Technical questions center on SQL (joins, " +
    "window functions, CTEs), basic statistics (mean/median, correlation " +
    "vs. causation, hypothesis testing), and explaining a finding to a " +
    "non-technical stakeholder. Behavioral questions often ask about " +
    "handling messy or incomplete data."
  ),
  "Business Analyst": (
    "Real process centers on requirements-gathering ability: how you " +
    "elicit and document what stakeholders actually need (interviews, " +
    "workshops, user stories, process diagrams). Technical questions " +
    "touch basic SQL, APIs, and Agile/Scrum vocabulary (user stories, " +
    "backlog, sprint planning). Behavioral questions heavily feature " +
    "stakeholder conflict - contradictory requirements, difficult " +
    "stakeholders, scope disagreements."
  ),
  "Software Developer": (
    "Real process often starts with an online coding assessment " +
    "(data structures & algorithms) before any live interview, followed " +
    "by one or more live coding rounds. Candidates are expected to talk " +
    "through their reasoning out loud while solving a problem, not just " +
    "arrive at the right answer silently. Also expect questions on git, " +
    "debugging a specific bug you've hit, unit testing, and walking " +
    "through a past project."
  ),
  "IT Project Manager": (
    "Real process mixes STAR-format behavioral questions (a time you " +
    "handled scope creep, a schedule slip, a difficult stakeholder) with " +
    "methodology questions (Agile vs. Waterfall, how you estimate " +
    "timelines, how you track and mitigate risk). Entry-level candidates " +
    "are expected to know PM vocabulary and show structured thinking " +
    "even with limited real-world project experience."
  ),
  "ERP / Systems Consultant": (
    "Real process often includes a case-study round: you're given a " +
    "client scenario (e.g. a technology adoption decision) and graded on " +
    "*how* you structure your thinking - clarify the problem, break it " +
    "down logically (MECE-style), ask clarifying questions, then close " +
    "with a clear recommendation backed by 2-3 specific reasons. It's " +
    "process over 'right answer.' Conceptual familiarity with major tech " +
    "categories (cloud platforms, ERP/CRM) is often expected."
  ),
  "Cybersecurity Analyst": (
    "Real process commonly includes security-fundamentals questions, a " +
    "scenario or log-analysis exercise, and behavioral questions about " +
    "handling incidents and communicating risk. Entry-level candidates " +
    "should understand networking, authentication and authorization, " +
    "common vulnerabilities, least privilege, incident-response steps, " +
    "and how to investigate without jumping to conclusions."
  ),
  "UX Designer / Product Manager": (
    "Real process often includes a portfolio or product-case walkthrough. " +
    "Candidates may be asked to critique an experience, define a user " +
    "problem, prioritize competing features, choose success metrics, or " +
    "explain how research changed a decision. Strong answers balance user " +
    "needs, technical constraints, accessibility, evidence, and business " +
    "goals instead of treating personal preference as research."
  ),
  "Cloud / Infrastructure Engineer": (
    "Real process mixes troubleshooting scenarios with fundamentals in " +
    "Linux, networking, identity, cloud services, automation, reliability, " +
    "and cost. Entry-level candidates may explain DNS and HTTP, diagnose a " +
    "service that cannot connect, compare scaling approaches, describe an " +
    "infrastructure project, or discuss how they would monitor and secure " +
    "a small cloud deployment."
  ),
};
