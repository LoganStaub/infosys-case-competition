// DOM references for session configuration, conversation display, and controls.
const sendBtn = document.getElementById('send-btn');
const startBtn = document.getElementById('start-btn');
const resetBtn = document.getElementById('reset-btn');
const input = document.getElementById('chat-input');
const messages = document.getElementById('chat-messages');
const careerSelect = document.getElementById('career-select');
const questionMode = document.getElementById('question-mode');
const setupStatus = document.getElementById('setup-status');
const sessionLabel = document.getElementById('session-label');
const questionProgress = document.getElementById('question-progress');

// The frontend sends requests to the deployed Cloudflare Worker. Five questions
// creates a focused practice session that can reasonably fit within 30 minutes.
const WORKER_URL = 'https://is-career-launchpad.is-career-launchpad.workers.dev';
const TOTAL_QUESTIONS = 5;

let conversationHistory = [];
let selectedCareer = '';
let selectedMode = 'mixed';
let currentQuestion = 0;
let sessionActive = false;
let requestPending = false;

/**
 * Adds a safely escaped chat bubble and keeps the newest message visible.
 * textContent is intentional: model output is never interpreted as HTML.
 * @param {string} text - Message to display.
 * @param {string} className - Visual message type such as `user` or `system`.
 * @returns {HTMLDivElement} The created message element.
 */
function addMessage(text, className) {
  const message = document.createElement('div');
  message.className = `message ${className}`;
  message.textContent = text;
  messages.appendChild(message);
  messages.scrollTop = messages.scrollHeight;
  return message;
}

// Derive every disabled/enabled state from the session state variables. Keeping
// this logic centralized prevents controls from disagreeing after errors/resets.
function updateControls() {
  const canRespond = sessionActive && !requestPending && currentQuestion <= TOTAL_QUESTIONS;
  input.disabled = !canRespond;
  sendBtn.disabled = !canRespond;
  startBtn.disabled = requestPending || sessionActive;
  resetBtn.disabled = !sessionActive && conversationHistory.length === 0;
  careerSelect.disabled = sessionActive || requestPending;
  questionMode.disabled = sessionActive || requestPending;
  questionProgress.textContent = `Question ${currentQuestion} of ${TOTAL_QUESTIONS}`;
}

/** Toggle the request lock while waiting for the worker. */
function setPending(isPending) {
  requestPending = isPending;
  updateControls();
}

/**
 * Sends either the opening instruction or a student response to the worker.
 * Successful exchanges are appended to history so later feedback has context.
 * @param {string} message - Instruction or student answer.
 * @param {{displayUser?: boolean, isStarting?: boolean}} options - Request behavior.
 */
async function requestInterviewer(message, { displayUser = true, isStarting = false } = {}) {
  if (requestPending) return;

  if (displayUser) addMessage(message, 'user');
  input.value = '';
  setPending(true);
  const typingMessage = addMessage('Interviewer is thinking…', 'system typing-indicator');

  try {
    const response = await fetch(WORKER_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        module: 'interview',
        message,
        history: conversationHistory,
        role: selectedCareer,
        mode: selectedMode,
        answeredQuestions: currentQuestion,
        isStarting
      })
    });

    const data = await response.json().catch(() => ({}));
    if (!response.ok) throw new Error(data.error || `Request failed with status ${response.status}`);
    if (!data.reply) throw new Error('The interviewer returned an empty response.');

    typingMessage.remove();
    addMessage(data.reply, 'system feedback-note');
    conversationHistory.push({ role: 'user', content: message });
    conversationHistory.push({ role: 'assistant', content: data.reply });

    if (isStarting) {
      currentQuestion = 1;
    } else if (currentQuestion >= TOTAL_QUESTIONS) {
      sessionActive = false;
      input.placeholder = 'Interview complete. Reset the session to practice again.';
      setupStatus.textContent = 'Interview complete — review your feedback and final summary.';
    } else {
      currentQuestion += 1;
    }
  } catch (error) {
    typingMessage.remove();
    addMessage(`${error.message} Please try again or reset the session.`, 'system error');
    if (isStarting) sessionActive = false;
  } finally {
    setPending(false);
    if (!input.disabled) input.focus();
  }
}

// Validate setup, reset any earlier conversation, and ask the worker for question one.
function startInterview() {
  selectedCareer = careerSelect.value;
  selectedMode = questionMode.value;
  setupStatus.textContent = '';

  if (!selectedCareer) {
    setupStatus.textContent = 'Choose a career path before starting.';
    careerSelect.focus();
    return;
  }

  conversationHistory = [];
  currentQuestion = 0;
  sessionActive = true;
  messages.replaceChildren();
  sessionLabel.textContent = `${selectedCareer} · ${questionMode.options[questionMode.selectedIndex].text}`;
  input.placeholder = 'Write a specific answer. Use Shift+Enter for a new line.';
  updateControls();
  requestInterviewer(`Begin my ${selectedMode} mock interview for ${selectedCareer}. Ask question one.`, {
    displayUser: false,
    isStarting: true
  });
}

// Reject blank or extremely thin answers locally before spending an API request.
function sendMessage() {
  const userText = input.value.trim();
  setupStatus.textContent = '';

  if (!sessionActive || requestPending) return;
  if (!userText) {
    setupStatus.textContent = 'Write an answer before sending it.';
    input.focus();
    return;
  }
  if (userText.length < 20) {
    setupStatus.textContent = 'Give the interviewer a little more detail—aim for at least one complete thought.';
    input.focus();
    return;
  }

  requestInterviewer(userText);
}

// Restore the complete interview interface to its initial state without reloading.
function resetSession() {
  conversationHistory = [];
  selectedCareer = '';
  selectedMode = 'mixed';
  currentQuestion = 0;
  sessionActive = false;
  requestPending = false;
  careerSelect.value = '';
  questionMode.value = 'mixed';
  input.value = '';
  input.placeholder = 'Start an interview above to unlock responses.';
  sessionLabel.textContent = 'No interview started';
  setupStatus.textContent = 'Session reset. Choose a career when you are ready.';
  messages.replaceChildren();
  addMessage('Choose a career path above to begin your mock interview.', 'system');
  updateControls();
  careerSelect.focus();
}

// Enter submits for speed; Shift+Enter remains available for structured answers.
startBtn.addEventListener('click', startInterview);
resetBtn.addEventListener('click', resetSession);
sendBtn.addEventListener('click', sendMessage);
input.addEventListener('keydown', (event) => {
  if (event.key === 'Enter' && !event.shiftKey) {
    event.preventDefault();
    sendMessage();
  }
});

updateControls();
