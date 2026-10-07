// ---------- CONFIG ----------
const API_URL = "https://m4oel0n9ub.execute-api.us-east-1.amazonaws.com/chat";

// Suggested questions shown under the hero input.
// "label" is what visitors see. "send" is the exact text sent to your Lex bot.
// Change "send" to match the sample utterances of your Lex intents.
const SUGGESTIONS = [
  { label: "What projects have you built?", send: "Tell me about your projects" },
  { label: "What are your skills?", send: "What are your skills" },
];

// Pull the readable reply out of whatever shape your Lambda returns.
function extractReply(data) {
  if (!data) return "";
  if (typeof data === "string") return data;
  if (typeof data.body === "string") {
    try { return extractReply(JSON.parse(data.body)); } catch (e) { return data.body; }
  }
  if (data.body && typeof data.body === "object") return extractReply(data.body);
  if (Array.isArray(data.messages)) {
    return data.messages.map((m) => (typeof m === "string" ? m : m.content || m.text || "")).filter(Boolean).join("\n");
  }
  const r = data.reply || data.response || data.text || data.message;
  return typeof r === "string" ? r : "";
}

document.addEventListener("DOMContentLoaded", () => {
  const $ = (id) => document.getElementById(id);
  $("year").textContent = new Date().getFullYear();

  // ----- Theme toggle (light by default, remembered) -----
  const root = document.documentElement;
  const themeBtn = $("theme-btn");
  const paintThemeBtn = () => {
    themeBtn.textContent = root.dataset.theme === "dark" ? "Light mode" : "Dark mode";
  };
  paintThemeBtn();
  themeBtn.addEventListener("click", () => {
    const next = root.dataset.theme === "dark" ? "light" : "dark";
    root.dataset.theme = next;
    try { localStorage.setItem("theme", next); } catch (e) {}
    paintThemeBtn();
  });

  // ----- Mobile menu -----
  const menuBtn = $("menu-btn");
  const navLinks = $("nav-links");
  const setMenu = (open) => {
    navLinks.classList.toggle("open", open);
    menuBtn.setAttribute("aria-expanded", String(open));
  };
  menuBtn.addEventListener("click", () => setMenu(!navLinks.classList.contains("open")));
  navLinks.querySelectorAll("a").forEach((a) => a.addEventListener("click", () => setMenu(false)));

  // ----- Contact form (opens the visitor's email app) -----
  $("contact-form").addEventListener("submit", (e) => {
    e.preventDefault();
    const f = e.target;
    const name = f.name.value.trim();
    const subject = encodeURIComponent("Portfolio message from " + name);
    const body = encodeURIComponent(f.message.value.trim() + "\n\nFrom: " + name + " (" + f.email.value.trim() + ")");
    window.location.href = "mailto:tejaswinimehta.work@gmail.com?subject=" + subject + "&body=" + body;
  });

  // ----- Chatbot -----
  const launcher = $("chat-launcher");
  const chatWindow = $("chat-window");
  const chatMessages = $("chat-messages");
  const chatInput = $("chat-input");
  const sendBtn = $("send-chat-btn");
  const sessionId = (crypto.randomUUID && crypto.randomUUID()) || Date.now() + "-" + Math.random().toString(16).slice(2);
  let greeted = false;
  let busy = false;

  const appendMessage = (text, className) => {
    const div = document.createElement("div");
    div.className = "msg " + className;
    div.textContent = text;
    chatMessages.appendChild(div);
    chatMessages.scrollTop = chatMessages.scrollHeight;
    return div;
  };

  const openChat = () => {
    chatWindow.hidden = false;
    launcher.setAttribute("aria-expanded", "true");
    if (!greeted) {
      greeted = true;
      appendMessage("Hi, I'm Tejaswini's portfolio assistant. Ask me about her skills, projects, experience or education.", "bot");
    }
    chatInput.focus();
  };
  const closeChat = () => {
    chatWindow.hidden = true;
    launcher.setAttribute("aria-expanded", "false");
    launcher.focus();
  };

  launcher.addEventListener("click", () => (chatWindow.hidden ? openChat() : closeChat()));
  $("close-chat-btn").addEventListener("click", closeChat);
  document.addEventListener("keydown", (e) => {
    if (e.key === "Escape" && !chatWindow.hidden) closeChat();
  });

  const sendMessage = async (text) => {
    text = (text || "").trim();
    if (!text || busy) return;

    if (chatWindow.hidden) openChat();
    appendMessage(text, "user");
    busy = true;
    sendBtn.disabled = true;
    const typing = appendMessage("Typing...", "bot typing");

    try {
      const res = await fetch(API_URL, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        // "text" is included as well in case your Lambda reads that key.
        body: JSON.stringify({ message: text, text: text, sessionId: sessionId }),
      });
      const raw = await res.text();
      if (!res.ok) throw new Error("Status " + res.status + ": " + raw);

      let data;
      try { data = JSON.parse(raw); } catch (e) { data = raw; }
      console.log("Chatbot response:", data);

      const reply = extractReply(data);
      typing.remove();
      appendMessage(reply || "I didn't get a reply. Please try rephrasing your question.", "bot");
    } catch (err) {
      console.error("Chatbot error:", err);
      typing.remove();
      appendMessage("I couldn't reach the assistant right now. You can email tejaswinimehta.work@gmail.com instead.", "error");
    } finally {
      busy = false;
      sendBtn.disabled = false;
      chatInput.focus();
    }
  };

  const submitChatInput = () => {
    const text = chatInput.value;
    chatInput.value = "";
    sendMessage(text);
  };
  sendBtn.addEventListener("click", submitChatInput);
  chatInput.addEventListener("keydown", (e) => {
    if (e.key === "Enter") submitChatInput();
  });

  // Hero input
  $("hero-ask").addEventListener("submit", (e) => {
    e.preventDefault();
    const input = $("hero-input");
    const text = input.value;
    input.value = "";
    sendMessage(text);
  });

  // Hero suggestions
  document.querySelectorAll(".suggest").forEach((btn) => {
    const item = SUGGESTIONS[Number(btn.dataset.ask)];
    if (!item) { btn.remove(); return; }
    btn.textContent = item.label;
    btn.addEventListener("click", () => sendMessage(item.send));
  });
});