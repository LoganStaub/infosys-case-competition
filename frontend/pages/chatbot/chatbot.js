// Interview Prep Chatbot - front-end logic
//
// Flow: upload resume (optional) -> confirm/enter target career -> chat,
// with a per-question countdown timer. Keeps the conversation as a plain
// array of {role, content} objects and resends the whole thing to
// /api/chat each turn, same pattern as before.

const resumePanel = document.getElementById("resumePanel");
const resumeInput = document.getElementById("resumeInput");
const resumeStatus = document.getElementById("resumeStatus");
const analyzeBtn = document.getElementById("analyzeBtn");
const skipResumeBtn = document.getElementById("skipResumeBtn");

const confirmPanel = document.getElementById("confirmPanel");
const confirmHeading = document.getElementById("confirmHeading");
const confirmSub = document.getElementById("confirmSub");
const careerInput = document.getElementById("careerInput");
const startBtn = document.getElementById("startBtn");

const chatPanel = document.getElementById("chatPanel");
const trackLabel = document.getElementById("trackLabel");
const transcript = document.getElementById("transcript");
const composerForm = document.getElementById("composerForm");
const composerInput = document.getElementById("composerInput");

const timerBar = document.getElementById("timerBar");
const timerFill = document.getElementById("timerFill");
const timerLabel = document.getElementById("timerLabel");

let career = "";
let history = []; // {role: "user" | "assistant", content: string}
let timerInterval = null;

// --- Step 1: resume upload -------------------------------------------

function setResumeStatus(text, isError = false) {
  resumeStatus.textContent = text;
  resumeStatus.hidden = false;
  resumeStatus.classList.toggle("status-note--error", isError);
}

analyzeBtn.addEventListener("click", async () => {
  const file = resumeInput.files[0];
  if (!file) {
    setResumeStatus("Choose a PDF or Word file first.", true);
    return;
  }

  analyzeBtn.disabled = true;
  setResumeStatus("Reading your resume…");

  const formData = new FormData();
  formData.append("resume", file);

  try {
    const res = await fetch("/api/analyze-resume", { method: "POST", body: formData });
    const data = await res.json();

    if (!res.ok) {
      setResumeStatus(data.error || "Something went wrong reading that file.", true);
      analyzeBtn.disabled = false;
      return;
    }

    goToConfirmStep(data.inferred_career, data.confidence);
  } catch (err) {
    setResumeStatus(`Network error: ${err.message}`, true);
    analyzeBtn.disabled = false;
  }
});

skipResumeBtn.addEventListener("click", () => {
  goToConfirmStep(null, null);
});

function goToConfirmStep(inferredCareer, confidence) {
  resumePanel.hidden = true;
  confirmPanel.hidden = false;

  if (inferredCareer) {
    careerInput.value = inferredCareer;
    confirmHeading.textContent = "Here's what we found";
    confirmSub.textContent = confidence === "low"
      ? "We're not fully confident in this guess — please double check it before continuing."
      : "Confirm this is right, or edit it, then start.";
  } else {
    careerInput.value = "";
    confirmHeading.textContent = "What role are you targeting?";
    confirmSub.textContent = "We couldn't tell from your resume (or you skipped that step) — enter the role yourself.";
  }
  careerInput.focus();
}

// --- Step 2: confirm career, start the interview -----------------------

startBtn.addEventListener("click", () => {
  const value = careerInput.value.trim();
  if (!value) {
    careerInput.focus();
    return;
  }
  career = value;
  trackLabel.textContent = career;
  trackLabel.hidden = false;

  confirmPanel.hidden = true;
  chatPanel.hidden = false;

  history = [{ role: "user", content: "Let's begin the interview." }];
  sendToCoach();
});

// --- Step 3: chat + timer ------------------------------------------------

function addMessage(role, content, extraClass = "") {
  const div = document.createElement("div");
  div.className = `msg msg--${role === "user" ? "student" : "coach"} ${extraClass}`.trim();
  div.textContent = content;
  transcript.appendChild(div);
  transcript.scrollTop = transcript.scrollHeight;
  return div;
}

function startTimer(totalSeconds) {
  stopTimer();
  composerInput.readOnly = false;
  timerBar.hidden = false;
  timerBar.classList.remove("timer-bar--expired");

  let remaining = totalSeconds;
  const render = () => {
    const mins = Math.floor(remaining / 60);
    const secs = remaining % 60;
    timerLabel.textContent = `${mins}:${String(secs).padStart(2, "0")}`;
    timerFill.style.width = `${Math.max(0, (remaining / totalSeconds) * 100)}%`;
  };
  render();

  timerInterval = setInterval(() => {
    remaining -= 1;
    if (remaining <= 0) {
      remaining = 0;
      render();
      stopTimer();
      composerInput.readOnly = true; // lock further typing; Send stays enabled
      timerBar.classList.add("timer-bar--expired");
      timerLabel.textContent = "Time's up — you can still submit";
      return;
    }
    render();
  }, 1000);
}

function stopTimer() {
  if (timerInterval) {
    clearInterval(timerInterval);
    timerInterval = null;
  }
}

async function sendToCoach() {
  const pending = addMessage("assistant", "Thinking…", "msg--pending");
  stopTimer();
  timerBar.hidden = true;

  try {
    const res = await fetch("/api/chat", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ career, history }),
    });
    const data = await res.json();

    pending.remove();

    if (data.error) {
      addMessage("assistant", `Something went wrong: ${data.error}`, "msg--error");
      return;
    }

    if (data.feedback) {
      let feedbackText = `Feedback: ${data.feedback}`;
      if (data.stronger_response) {
        feedbackText += `\n\nStronger response: ${data.stronger_response}`;
      }
      addMessage("assistant", feedbackText, "msg--feedback");
    }

    addMessage("assistant", data.next_question, "msg--question");
    history.push({ role: "assistant", content: JSON.stringify(data) });

    startTimer(data.time_limit_seconds);
  } catch (err) {
    pending.remove();
    addMessage("assistant", `Network error: ${err.message}`, "msg--error");
  }
}

composerForm.addEventListener("submit", (e) => {
  e.preventDefault();
  const text = composerInput.value.trim();
  if (!text) return;

  stopTimer();
  timerBar.hidden = true;
  composerInput.readOnly = false;

  history.push({ role: "user", content: text });
  addMessage("user", text);
  composerInput.value = "";

  sendToCoach();
});

// Let Enter submit, Shift+Enter add a newline
composerInput.addEventListener("keydown", (e) => {
  if (e.key === "Enter" && !e.shiftKey) {
    e.preventDefault();
    composerForm.requestSubmit();
  }
});
