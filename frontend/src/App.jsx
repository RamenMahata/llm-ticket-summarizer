import { useEffect, useRef, useState } from "react";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import { clearHistory, getHistory, sendMessage } from "./api.js";

function Message({ message, onCopy }) {
  const isAssistant = message.role === "assistant";

  return (
    <article className={`message ${isAssistant ? "message-assistant" : "message-user"}`}>
      <div className="message-meta">
        <span>{isAssistant ? "Kindling" : "You"}</span>
        <span>{isAssistant ? "A calm second brain" : "Your context"}</span>
      </div>
      {isAssistant ? (
        <div className="message-content markdown-content">
          <ReactMarkdown
            remarkPlugins={[remarkGfm]}
            skipHtml
            components={{
              a: ({ node: _node, ...props }) => (
                <a {...props} target="_blank" rel="noopener noreferrer" />
              ),
            }}
          >
            {message.content}
          </ReactMarkdown>
        </div>
      ) : (
        <p className="message-content">{message.content}</p>
      )}
      {isAssistant && (
        <button className="message-action" type="button" onClick={() => onCopy(message.content)}>
          Copy response
        </button>
      )}
    </article>
  );
}

function TypingMessage() {
  return (
    <article className="message message-assistant typing-message" role="status" aria-label="Assistant is typing">
      <div className="message-meta"><span>Kindling</span><span>Thinking</span></div>
      <div className="typing-dots" aria-hidden="true"><span /><span /><span /></div>
    </article>
  );
}

export default function App() {
  const [draft, setDraft] = useState("");
  const [messages, setMessages] = useState([]);
  const [pendingAssistant, setPendingAssistant] = useState(null);
  const [loadingHistory, setLoadingHistory] = useState(true);
  const [sending, setSending] = useState(false);
  const [clearing, setClearing] = useState(false);
  const [error, setError] = useState("");
  const [connection, setConnection] = useState("checking");
  const [copied, setCopied] = useState(false);
  const [confirmClear, setConfirmClear] = useState(false);
  const transcriptRef = useRef(null);
  const composerRef = useRef(null);

  async function loadHistory(showLoading = true) {
    if (showLoading) {
      setLoadingHistory(true);
    }

    try {
      setMessages(await getHistory());
      setError("");
      setConnection("connected");
    } catch (loadError) {
      setConnection("offline");
      setError("I could not reach the conversation right now. Check that the server is running and try again.");
    } finally {
      if (showLoading) {
        setLoadingHistory(false);
      }
    }
  }

  useEffect(() => {
    let active = true;

    async function start() {
      try {
        setLoadingHistory(true);
        setMessages(await getHistory());
        if (active) {
          setConnection("connected");
          setError("");
        }
      } catch (_loadError) {
        if (active) {
          setConnection("offline");
          setError("I could not reach the conversation right now. Check that the server is running and try again.");
        }
      } finally {
        if (active) {
          setLoadingHistory(false);
        }
      }
    }

    start();
    return () => { active = false; };
  }, []);

  useEffect(() => {
    if (transcriptRef.current) {
      transcriptRef.current.scrollTop = transcriptRef.current.scrollHeight;
    }
  }, [messages, pendingAssistant, sending]);

  async function handleSubmit(event) {
    event.preventDefault();
    const trimmedDraft = draft.trim();

    if (!trimmedDraft) {
      setError("Write a message before sending it.");
      return;
    }

    const previousMessages = messages;
    setMessages((currentMessages) => [...currentMessages, { role: "user", content: trimmedDraft }]);
    setPendingAssistant("");
    setSending(true);
    setError("");

    try {
      const response = await sendMessage(trimmedDraft, (delta) => {
        setPendingAssistant((currentContent) => currentContent + delta);
      });
      setMessages((currentMessages) => [
        ...currentMessages,
        { role: "assistant", content: response },
      ]);
      setPendingAssistant(null);
      setConnection("connected");
      setDraft("");
      await loadHistory(false);
    } catch (submitError) {
      setMessages(previousMessages);
      setPendingAssistant(null);
      setConnection("offline");
      setError(submitError.message || "Kindling could not answer right now. Please try again.");
    } finally {
      setSending(false);
      setLoadingHistory(false);
      composerRef.current?.focus();
    }
  }

  async function handleClear() {
    if (!confirmClear) {
      setConfirmClear(true);
      return;
    }

    setClearing(true);
    setError("");

    try {
      await clearHistory();
      setMessages([]);
      setConfirmClear(false);
      composerRef.current?.focus();
    } catch (clearError) {
      setError(clearError.message);
    } finally {
      setClearing(false);
    }
  }

  async function handleCopy(content) {
    try {
      await navigator.clipboard.writeText(content);
      setCopied(true);
      window.setTimeout(() => setCopied(false), 1800);
    } catch (_copyError) {
      setError("The response could not be copied.");
    }
  }

  function usePrompt(prompt) {
    setDraft(prompt);
    composerRef.current?.focus();
  }

  const busy = sending || clearing;
  const statusLabel = connection === "connected" ? "Ready to listen" : connection === "offline" ? "Offline" : "Connecting...";

  return (
    <main className="app-shell">
      <header className="topbar">
        <a className="brand" href="/" aria-label="Kindling home">
          <span className="brand-mark">K</span>
          <span>Kindling</span>
        </a>
        <span className={`status status-${connection}`}><span className="status-dot" /> {statusLabel}</span>
      </header>

      <section className="intro">
        <p className="eyebrow">Your calm second brain</p>
        <h1>Bring the messy part. We&apos;ll find the next step.</h1>
        <p className="intro-copy">Kindling helps you think through customer threads with a little more clarity and a lot less noise.</p>
      </section>

      <section className="chat-shell panel">
        <div className="chat-heading">
          <div>
            <p className="eyebrow">A private moment to untangle things</p>
            <h2>Talk it through</h2>
          </div>
          {messages.length > 0 && (confirmClear ? (
            <div className="clear-confirm">
              <span>Clear this thread?</span>
              <button className="text-button" type="button" onClick={handleClear} disabled={busy}>Yes, clear</button>
              <button className="quiet-button" type="button" onClick={() => setConfirmClear(false)} disabled={busy}>Keep it</button>
            </div>
          ) : (
            <button className="text-button" type="button" onClick={handleClear} disabled={busy}>
              Clear conversation
            </button>
          ))}
        </div>

        <div className="transcript" ref={transcriptRef} aria-live="polite">
          {loadingHistory ? (
            <p className="state-message">Loading conversation...</p>
          ) : messages.length === 0 ? (
            <div className="empty-conversation">
              <span className="empty-icon" aria-hidden="true">K</span>
              <h3>What&apos;s on your mind?</h3>
              <p>Start with a question or choose a nudge below.</p>
              <div className="prompt-list">
                {["Summarize this for me", "What should I do next?", "Draft a customer reply"].map((prompt) => (
                  <button className="prompt-button" type="button" key={prompt} onClick={() => usePrompt(prompt)}>{prompt}</button>
                ))}
              </div>
            </div>
          ) : (
            messages.map((message, index) => (
              <Message key={`${message.role}-${index}`} message={message} onCopy={handleCopy} />
            ))
          )}
          {pendingAssistant !== null && (
            pendingAssistant ? (
              <Message
                message={{role: "assistant", content: pendingAssistant}}
                onCopy={handleCopy}
              />
            ) : (
              <TypingMessage />
            )
          )}
        </div>

        <form className="chat-composer" onSubmit={handleSubmit}>
          <label className="sr-only" htmlFor="message">Message assistant</label>
          <textarea
            id="message"
            ref={composerRef}
            value={draft}
            onChange={(event) => setDraft(event.target.value)}
            onKeyDown={(event) => {
              if (event.key === "Enter" && !event.shiftKey) {
                event.preventDefault();
                event.currentTarget.form.requestSubmit();
              }
            }}
            placeholder="Tell me what happened..."
            disabled={busy}
            rows="3"
          />
          <div className="composer-footer">
            <span className="helper-text">{draft.length} characters / Shift + Enter for a new line</span>
            <button className="primary-button" type="submit" disabled={busy}>
              {sending ? "Thinking..." : "Send"}
              <span aria-hidden="true">-&gt;</span>
            </button>
          </div>
        </form>
      </section>

      {error && (
        <div className="error-banner" role="alert">
          <strong>Small snag.</strong> {error}
          <button type="button" onClick={() => setError("")} aria-label="Dismiss error">x</button>
        </div>
      )}

      {copied && <div className="copy-toast" role="status">Response copied</div>}

      <footer className="footer">
        <span>Kindling / AI companion</span>
        <span>Conversation lives in this workspace</span>
      </footer>
    </main>
  );
}