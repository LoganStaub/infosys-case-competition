const sendBtn = document.getElementById('send-btn');
const input = document.getElementById('chat-input');
const messages = document.getElementById('chat-messages');

const WORKER_URL = "https://is-career-launchpad.is-career-launchpad.workers.dev";

let conversationHistory = [];

function addMessage(text, className) {
  const msg = document.createElement('div');
  msg.className = `message ${className}`;
  msg.textContent = text;
  messages.appendChild(msg);
  messages.scrollTop = messages.scrollHeight;
}

async function sendMessage() {
  const userText = input.value.trim();
  if (userText === '') return;

  addMessage(userText, 'user');
  input.value = '';
  sendBtn.disabled = true;

  addMessage('Thinking...', 'system typing-indicator');

  try {
    const response = await fetch(WORKER_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        module: 'interview',
        message: userText,
        history: conversationHistory
      })
    });

    const data = await response.json();

    document.querySelector('.typing-indicator')?.remove();

    if (data.reply) {
      addMessage(data.reply, 'system');
      conversationHistory.push({ role: 'user', content: userText });
      conversationHistory.push({ role: 'assistant', content: data.reply });
    } else {
      addMessage('Something went wrong — no response from the interviewer.', 'system error');
    }
  } catch (err) {
    document.querySelector('.typing-indicator')?.remove();
    addMessage('Connection error — check your internet and try again.', 'system error');
  } finally {
    sendBtn.disabled = false;
  }
}

sendBtn.addEventListener('click', sendMessage);
input.addEventListener('keypress', (e) => {
  if (e.key === 'Enter') sendMessage();
});