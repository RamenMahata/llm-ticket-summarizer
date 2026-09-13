import { useEffect, useRef, useState } from "react";
import { clearHistory, getHistory, sendMessage } from "./api.js";

function Message({ message }) {
  const isAssistant = message.role === "assistant";

  return (
    <article className={`message ${isAssistant ? "message-assistant" : "message-user"}`}>
      <div className="message-meta">
        <span>{isAssistant ? "Assistant" : "You"}</span>
        <span>{isAssistant ? "Support intelligence" : "Customer context"}</span>
      </div>
      <p>{message.content}</p>
    </article>
  );
}

function TypingMessage() {
  return (
    <article className="message message-assistant typing-message" role="status" aria-label="Assistant is typing">
      <div className="message-meta"><span>Assistant</span><span>Thinking</span></div>
      <div className="typing-dots" aria-hidden="true"><span /><span /><span /></div>
    </article>
  );
}

export default function App() {
  const [draft, setDraft] = useState("");
  const [messages, setMessages] = useState([]);
  const [loadingHistory, setLoadingHistory] = useState(true);
  const [sending, setSending] = useState(false);
  const [clearing, setClearing] = useState(false);
  const [error, setError] = useState("");
  const transcriptRef = useRef(null);

  async function loadHistory(showLoading = true) {
    if (showLoading) {
      setLoadingHistory(true);
    }

    try {
      setMessages(await getHistory());
      setError("");
    } catch (loadError) {
      setError(loadError.message);
    } finally {
      if (showLoading) {
        setLoadingHistory(false);
      }
    }
  }

  useEffect(() => {
    loadHistory();
  }, []);

  useEffect(() => {
    if (transcriptRef.current) {
      transcriptRef.current.scrollTop = transcriptRef.current.scrollHeight;
    }
  }, [messages, sending]);

  async function handleSubmit(event) {
    event.preventDefault();
    const trimmedDraft = draft.trim();

    if (!trimmedDraft) {
      setError("Write a message before sending it.");
      return;
    }

    const previousMessages = messages;
    setMessages([...messages, { role: "user", content: trimmedDraft }]);
    setSending(true);
    setError("");

    try {
      const response = await sendMessage(trimmedDraft);
      setMessages([...previousMessages, { role: "user", content: trimmedDraft }, { role: "assistant", content: response }]);
      setDraft("");
      await loadHistory(false);
    } catch (submitError) {
      setMessages(previousMessages);
      setError(submitError.message);
    } finally {
      setSending(false);
      setLoadingHistory(false);
    }
  }

  async function handleClear() {
    setClearing(true);
    setError("");

    try {
      await clearHistory();
      setMessages([]);
    } catch (clearError) {
      setError(clearError.message);
    } finally {
      setClearing(false);
    }
  }

  const busy = sending || clearing;

  return (
    <main className="app-shell">
      <header className="topbar">
        <a className="brand" href="/" aria-label="Ticket Brief home">
          <span className="brand-mark">TB</span>
          <span>Ticket Brief / Chat</span>
        </a>
        <span className="status"><span className="status-dot" /> Conversation active</span>
      </header>

      <section className="intro">
        <p className="eyebrow">Support intelligence / Conversation</p>
        <h1>Talk through the ticket, one clear step at a time.</h1>
        <p className="intro-copy">Ask a question, add context, or paste the customer story. The assistant keeps the thread in view.</p>
      </section>

      <section className="chat-shell panel">
        <div className="chat-heading">
          <div>
            <p className="eyebrow">Shared support thread</p>
            <h2>Conversation</h2>
          </div>
          <button className="text-button" type="button" onClick={handleClear} disabled={busy || messages.length === 0}>
            {clearing ? "Clearing..." : "Clear conversation"}
          </button>
        </div>

        <div className="transcript" ref={transcriptRef} aria-live="polite">
          {loadingHistory ? (
            <p className="state-message">Loading conversation...</p>
          ) : messages.length === 0 ? (
            <div className="empty-conversation">
              <span className="empty-icon" aria-hidden="true">+</span>
              <h3>Start the conversation</h3>
              <p>Ask about a customer issue or paste a ticket to begin.</p>
            </div>
          ) : (
            messages.map((message, index) => (
              <Message key={`${message.role}-${index}`} message={message} />
            ))
          )}
          {sending && <TypingMessage />}
        </div>

        <form className="chat-composer" onSubmit={handleSubmit}>
          <label className="sr-only" htmlFor="message">Message assistant</label>
          <textarea
            id="message"
            value={draft}
            onChange={(event) => setDraft(event.target.value)}
            onKeyDown={(event) => {
              if (event.key === "Enter" && !event.shiftKey) {
                event.preventDefault();
                event.currentTarget.form.requestSubmit();
              }
            }}
            placeholder="Ask a follow-up or paste a customer issue..."
            disabled={busy}
            rows="3"
          />
          <div className="composer-footer">
            <span className="helper-text">{draft.length} characters / Shift + Enter for a new line</span>
            <button className="primary-button" type="submit" disabled={busy}>
              {sending ? "Thinking..." : "Send message"}
              <span aria-hidden="true">-&gt;</span>
            </button>
          </div>
        </form>
      </section>

      {error && (
        <div className="error-banner" role="alert">
          <strong>Something went wrong.</strong> {error}
          <button type="button" onClick={() => setError("")} aria-label="Dismiss error">x</button>
        </div>
      )}

      <footer className="footer">
        <span>Shared workspace</span>
        <span>In-memory conversation</span>
        <span>Refresh clears nothing</span>
      </footer>
    </main>
  );
}