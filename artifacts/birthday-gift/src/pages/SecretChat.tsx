import { useEffect, useState } from "react";

type ChatMessage = {
  id: string;
  name: string;
  text: string;
  when: string;
  kind: "user" | "system";
};

const STORAGE_KEY = "birthday-gift-chat-messages";
const NAME_KEY = "birthday-gift-chat-name";
const CHANNEL_NAME = "birthday-gift-chat-channel";

function createMessage(text: string, name: string, kind: ChatMessage["kind"]): ChatMessage {
  return {
    id: `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
    name,
    text,
    when: new Date().toISOString(),
    kind,
  };
}

function formatTime(iso: string) {
  if (!iso) return "";
  const date = new Date(iso);
  return date.toLocaleTimeString([], { hour: "numeric", minute: "2-digit" });
}

export default function SecretChat() {
  const [name, setName] = useState("");
  const [draft, setDraft] = useState("");
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [isOpen, setIsOpen] = useState(true);

  useEffect(() => {
    if (typeof window === "undefined") return;

    const storedName = window.localStorage.getItem(NAME_KEY) ?? "";
    setName(storedName);

    const saved = window.localStorage.getItem(STORAGE_KEY);
    if (saved) {
      try {
        const parsed = JSON.parse(saved) as ChatMessage[];
        setMessages(parsed);
        return;
      } catch {
        // ignore malformed data and fall back to welcome message
      }
    }

    const welcome = createMessage("welcome to the visitor chat — type your name and send a message.", "system", "system");
    setMessages([welcome]);
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify([welcome]));
  }, []);

  useEffect(() => {
    if (typeof window === "undefined") return;
    window.localStorage.setItem(NAME_KEY, name);
  }, [name]);

  useEffect(() => {
    if (typeof window === "undefined" || typeof BroadcastChannel === "undefined") return;

    const channel = new BroadcastChannel(CHANNEL_NAME);
    const handleMessage = (event: MessageEvent<{ type: string; messages: ChatMessage[] }>) => {
      if (event.data?.type === "chat-update") {
        setMessages(event.data.messages);
      }
    };

    channel.addEventListener("message", handleMessage as EventListener);
    window.addEventListener("storage", (event) => {
      if (event.key === STORAGE_KEY && event.newValue) {
        try {
          setMessages(JSON.parse(event.newValue) as ChatMessage[]);
        } catch {
          // ignore
        }
      }
    });

    return () => {
      channel.removeEventListener("message", handleMessage as EventListener);
      channel.close();
    };
  }, []);

  const saveMessages = (next: ChatMessage[]) => {
    setMessages(next);
    if (typeof window !== "undefined") {
      window.localStorage.setItem(STORAGE_KEY, JSON.stringify(next));
    }

    if (typeof window !== "undefined" && typeof BroadcastChannel !== "undefined") {
      const channel = new BroadcastChannel(CHANNEL_NAME);
      channel.postMessage({ type: "chat-update", messages: next });
      channel.close();
    }
  };

  const handleSubmit = (event: React.FormEvent) => {
    event.preventDefault();
    const cleanedName = name.trim();
    const cleanedDraft = draft.trim();

    if (!cleanedName || cleanedName.length < 2 || !cleanedDraft) return;

    const nextMessage = createMessage(cleanedDraft, cleanedName, "user");
    const nextMessages = [...messages, nextMessage].slice(-30);
    saveMessages(nextMessages);
    setDraft("");
  };

  return (
    <div className="secret-chat-page">
      <div className="secret-chat-shell">
        <div className="secret-chat-header">
          <div>
            <p className="secret-chat-eyebrow">visitor chat</p>
            <h1>inside the website chat</h1>
          </div>
          <button className="secret-chat-minimize" onClick={() => setIsOpen((prev) => !prev)}>
            {isOpen ? "−" : "＋"}
          </button>
        </div>

        <p className="secret-chat-text">
          enter your name and send a message to the shared visitor room.
        </p>

        {isOpen && (
          <>
            <form className="secret-chat-form" onSubmit={handleSubmit}>
              <input
                className="secret-chat-input"
                type="text"
                placeholder="type your name"
                value={name}
                onChange={(event) => setName(event.target.value)}
                maxLength={20}
              />
              <textarea
                className="secret-chat-textarea"
                placeholder="write a message"
                value={draft}
                onChange={(event) => setDraft(event.target.value)}
                rows={3}
                maxLength={160}
              />
              <button className="secret-chat-submit" type="submit">
                send
              </button>
            </form>

            <div className="secret-chat-log">
              {messages.map((message) => (
                <div key={message.id} className={`secret-chat-bubble ${message.kind === "system" ? "system" : "user"}`}>
                  <div className="secret-chat-bubble-top">
                    <span>{message.name}</span>
                    <small>{formatTime(message.when)}</small>
                  </div>
                  <p>{message.text}</p>
                </div>
              ))}
            </div>
          </>
        )}

        <a className="secret-chat-link" href="/">
          back to the gift
        </a>
      </div>
    </div>
  );
}
