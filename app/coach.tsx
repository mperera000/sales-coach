"use client";

import { useChat } from "@ai-sdk/react";
import { DefaultChatTransport } from "ai";
import { useEffect, useMemo, useRef, useState } from "react";
import type { CoachSession, Difficulty, Mode, Scenario } from "@/lib/session";

const modeCards: { id: Mode; index: string; title: string; detail: string }[] =
  [
    {
      id: "cold-call",
      index: "01",
      title: "Cold call roleplay",
      detail: "You are the SDR. The coach is the prospect.",
    },
    {
      id: "interview",
      index: "02",
      title: "Hiring manager interview",
      detail: "Two rounds. The second one scores whether you used the notes.",
    },
    {
      id: "research",
      index: "03",
      title: "Industry playbook",
      detail: "Openers, objections, and a gatekeeper line for your market.",
    },
  ];

const scenarioOptions: { id: Scenario; label: string }[] = [
  { id: "saas", label: "SaaS / tech" },
  { id: "healthcare", label: "Healthcare" },
  { id: "finance", label: "Finance" },
  { id: "logistics", label: "Logistics" },
  { id: "custom", label: "Custom" },
];

const difficultyOptions: { id: Difficulty; label: string }[] = [
  { id: "easy", label: "Easy" },
  { id: "medium", label: "Medium" },
  { id: "hard", label: "Hard" },
];

function textOf(message: { parts: Array<{ type: string; text?: string }> }) {
  return message.parts
    .filter((part) => part.type === "text" && part.text)
    .map((part) => part.text)
    .join("");
}

function isKickoff(text: string) {
  return text.startsWith("[[kickoff]]");
}

type SpeechResult = {
  isFinal: boolean;
  0: { transcript: string };
};

type SpeechRec = {
  continuous: boolean;
  interimResults: boolean;
  lang: string;
  onresult: ((event: { resultIndex: number; results: ArrayLike<SpeechResult> }) => void) | null;
  onerror: ((event: { error: string }) => void) | null;
  onend: (() => void) | null;
  start: () => void;
  stop: () => void;
};

function createRecognizer(): SpeechRec | null {
  if (typeof window === "undefined") return null;
  const browser = window as Window & {
    SpeechRecognition?: new () => SpeechRec;
    webkitSpeechRecognition?: new () => SpeechRec;
  };
  const Recognizer = browser.SpeechRecognition ?? browser.webkitSpeechRecognition;
  return Recognizer ? new Recognizer() : null;
}

function speak(text: string) {
  if (typeof window === "undefined" || !window.speechSynthesis) return;
  window.speechSynthesis.cancel();
  const line = new SpeechSynthesisUtterance(text);
  line.lang = "en-US";
  line.rate = 1;
  const voice = window.speechSynthesis
    .getVoices()
    .find((item) => item.lang.startsWith("en") && /natural|samantha|google/i.test(item.name));
  if (voice) line.voice = voice;
  window.speechSynthesis.speak(line);
}

export function CoachApp() {
  const [session, setSession] = useState<CoachSession | null>(null);
  const [mode, setMode] = useState<Mode>("cold-call");
  const [scenario, setScenario] = useState<Scenario>("saas");
  const [difficulty, setDifficulty] = useState<Difficulty>("medium");
  const [persona, setPersona] = useState("");
  const [product, setProduct] = useState("");

  function start() {
    if (mode === "research" && product.trim().length < 2) return;
    if ((mode === "cold-call" || mode === "research") && scenario === "custom" && persona.trim().length < 2) {
      return;
    }
    setSession({ mode, scenario, difficulty, persona, product });
  }

  if (!session) {
    return (
      <Setup
        mode={mode}
        scenario={scenario}
        difficulty={difficulty}
        persona={persona}
        product={product}
        onMode={setMode}
        onScenario={setScenario}
        onDifficulty={setDifficulty}
        onPersona={setPersona}
        onProduct={setProduct}
        onStart={start}
      />
    );
  }

  return (
    <Room
      key={`${session.mode}-${session.scenario}-${session.difficulty}`}
      session={session}
      onLeave={() => setSession(null)}
    />
  );
}

function Setup({
  mode,
  scenario,
  difficulty,
  persona,
  product,
  onMode,
  onScenario,
  onDifficulty,
  onPersona,
  onProduct,
  onStart,
}: {
  mode: Mode;
  scenario: Scenario;
  difficulty: Difficulty;
  persona: string;
  product: string;
  onMode: (mode: Mode) => void;
  onScenario: (scenario: Scenario) => void;
  onDifficulty: (difficulty: Difficulty) => void;
  onPersona: (value: string) => void;
  onProduct: (value: string) => void;
  onStart: () => void;
}) {
  const needsPersona = (mode === "cold-call" || mode === "research") && scenario === "custom";
  const blocked =
    (mode === "research" && product.trim().length < 2) ||
    (needsPersona && persona.trim().length < 2);

  return (
    <main className="mx-auto flex min-h-full w-full max-w-5xl flex-col px-6 py-10">
      <p className="font-mono text-xs tracking-[0.22em] text-[var(--signal)] uppercase">
        SalesCoach
      </p>
      <h1 className="mt-4 max-w-xl text-4xl leading-tight font-medium tracking-tight">
        Practice the call before you burn the lead.
      </h1>
      <p className="mt-4 max-w-lg text-[var(--muted)]">
        Pick a mode. The coach stays in character until you ask for feedback,
        then scores the call and rewrites the weakest line.
      </p>

      <div className="mt-10 grid gap-3 md:grid-cols-3">
        {modeCards.map((card) => {
          const selected = mode === card.id;
          return (
            <button
              key={card.id}
              type="button"
              onClick={() => onMode(card.id)}
              className={`rounded-2xl border px-4 py-5 text-left transition ${
                selected
                  ? "border-[var(--signal)] bg-[var(--paper)] text-[var(--ink)]"
                  : "border-[var(--line)] bg-transparent text-[var(--paper)] hover:border-[var(--paper)]"
              }`}
            >
              <span className="font-mono text-xs tracking-widest uppercase opacity-60">
                {card.index}
              </span>
              <span className="mt-3 block text-lg font-medium">{card.title}</span>
              <span
                className={`mt-2 block text-sm ${selected ? "text-[var(--ink)]/70" : "text-[var(--muted)]"}`}
              >
                {card.detail}
              </span>
            </button>
          );
        })}
      </div>

      {(mode === "cold-call" || mode === "research") && (
        <div className="mt-8 grid gap-6 md:grid-cols-2">
          <fieldset>
            <legend className="font-mono text-xs tracking-widest text-[var(--muted)] uppercase">
              Prospect
            </legend>
            <div className="mt-3 flex flex-wrap gap-2">
              {scenarioOptions.map((option) => (
                <Choice
                  key={option.id}
                  label={option.label}
                  selected={scenario === option.id}
                  onClick={() => onScenario(option.id)}
                />
              ))}
            </div>
          </fieldset>
          {mode === "cold-call" && (
          <fieldset>
            <legend className="font-mono text-xs tracking-widest text-[var(--muted)] uppercase">
              Difficulty
            </legend>
            <div className="mt-3 flex flex-wrap gap-2">
              {difficultyOptions.map((option) => (
                <Choice
                  key={option.id}
                  label={option.label}
                  selected={difficulty === option.id}
                  onClick={() => onDifficulty(option.id)}
                />
              ))}
            </div>
          </fieldset>
          )}
          {scenario === "custom" && (
            <label className="grid gap-2 text-sm md:col-span-2">
              Who are you calling?
              <input
                value={persona}
                onChange={(event) => onPersona(event.target.value)}
                placeholder="Ops director at a 40-person logistics company"
                className="rounded-xl border border-[var(--line)] bg-transparent px-3 py-3 outline-none focus:border-[var(--signal)]"
              />
            </label>
          )}
          {(mode === "research" || scenario === "custom") && (
            <label className="grid gap-2 text-sm md:col-span-2">
              What are you selling?
              <input
                value={product}
                onChange={(event) => onProduct(event.target.value)}
                placeholder="A tool that books freight exceptions faster"
                className="rounded-xl border border-[var(--line)] bg-transparent px-3 py-3 outline-none focus:border-[var(--signal)]"
              />
            </label>
          )}
        </div>
      )}

      <button
        type="button"
        onClick={onStart}
        disabled={blocked}
        className="mt-8 w-fit rounded-full bg-[var(--signal)] px-6 py-3 text-sm font-medium text-white disabled:opacity-40"
      >
        {mode === "research" ? "Build playbook" : "Start"}
      </button>
    </main>
  );
}

function Choice({
  label,
  selected,
  onClick,
}: {
  label: string;
  selected: boolean;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`rounded-full border px-3 py-1.5 text-sm ${
        selected
          ? "border-[var(--signal)] bg-[var(--signal)] text-white"
          : "border-[var(--line)] text-[var(--paper)]"
      }`}
    >
      {label}
    </button>
  );
}

function Room({
  session,
  onLeave,
}: {
  session: CoachSession;
  onLeave: () => void;
}) {
  const sessionRef = useRef(session);
  sessionRef.current = session;
  const [input, setInput] = useState("");
  const [listening, setListening] = useState(false);
  const [hearCoach, setHearCoach] = useState(session.mode === "cold-call" || session.mode === "interview");
  const [micNote, setMicNote] = useState<string | null>(null);
  const scroller = useRef<HTMLDivElement>(null);
  const recognitionRef = useRef<SpeechRec | null>(null);
  const spokenRef = useRef<string | null>(null);
  const draftRef = useRef("");
  const saidRef = useRef("");
  const busyRef = useRef(false);

  const transport = useMemo(
    () =>
      new DefaultChatTransport({
        api: "/api/chat",
        body: () => sessionRef.current,
      }),
    [],
  );

  const { messages, sendMessage, status, error, stop } = useChat({ transport });
  const busy = status === "submitted" || status === "streaming";
  busyRef.current = busy;

  useEffect(() => {
    const direction =
      session.mode === "research"
        ? "[[kickoff]] Build the industry playbook now for the industry and product in this session."
        : session.mode === "interview"
          ? "[[kickoff]] Start the interview. Greet me and ask the first behavioral question."
          : "[[kickoff]] The call just connected. Pick up with one short hello, then wait.";
    const timer = window.setTimeout(() => {
      void sendMessage({ text: direction });
    }, 0);
    return () => window.clearTimeout(timer);
  }, [sendMessage, session.mode]);

  useEffect(() => {
    scroller.current?.scrollTo({ top: scroller.current.scrollHeight });
  }, [messages, status]);

  useEffect(() => {
    if (!hearCoach) {
      window.speechSynthesis?.cancel();
      return;
    }
    if (status !== "ready") return;
    const last = [...messages].reverse().find((message) => message.role === "assistant");
    if (!last || spokenRef.current === last.id) return;
    const text = textOf(last).trim();
    if (!text) return;
    spokenRef.current = last.id;
    speak(text);
  }, [hearCoach, messages, status]);

  useEffect(() => {
    return () => {
      recognitionRef.current?.stop();
      window.speechSynthesis?.cancel();
    };
  }, []);

  async function toggleMic() {
    if (listening) {
      recognitionRef.current?.stop();
      setListening(false);
      return;
    }
    if (!window.isSecureContext) {
      setMicNote("Open http://localhost:3000 in Chrome. The microphone does not work from the network address.");
      return;
    }
    const recognition = createRecognizer();
    if (!recognition) {
      setMicNote("This browser can't record speech. Type the line, or open the app in Chrome.");
      return;
    }
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      stream.getTracks().forEach((track) => track.stop());
    } catch {
      setMicNote("Click the lock icon in the address bar, set Microphone to Allow, then tap Record again.");
      return;
    }
    window.speechSynthesis?.cancel();
    draftRef.current = input.trim();
    saidRef.current = "";
    recognition.continuous = false;
    recognition.interimResults = true;
    recognition.lang = "en-US";
    let sent = false;
    const sendSpokenLine = () => {
      if (sent) return;
      sent = true;
      const text = [draftRef.current, saidRef.current].filter(Boolean).join(" ").trim();
      saidRef.current = "";
      setListening(false);
      if (!text || busyRef.current) {
        if (text) setInput(text);
        return;
      }
      void sendMessage({ text });
      setInput("");
    };
    recognition.onresult = (event) => {
      let said = "";
      for (let index = 0; index < event.results.length; index += 1) {
        said += event.results[index][0].transcript;
      }
      saidRef.current = said.trim();
      const prefix = draftRef.current;
      setInput(prefix ? `${prefix} ${saidRef.current}` : saidRef.current);
    };
    recognition.onerror = (event) => {
      if (event.error === "aborted" || event.error === "no-speech") return;
      setListening(false);
      if (event.error === "not-allowed") {
        setMicNote("Click the lock icon in the address bar, set Microphone to Allow, then tap Record again.");
        return;
      }
      setMicNote("Recording stopped. Tap Record and speak right away.");
    };
    recognition.onend = () => sendSpokenLine();
    recognitionRef.current = recognition;
    try {
      recognition.start();
    } catch {
      setMicNote("Tap Record once more. The mic was still closing.");
      return;
    }
    setListening(true);
    setMicNote(null);
  }

  function submit(text: string) {
    const trimmed = text.trim();
    if (!trimmed || busy) return;
    void sendMessage({ text: trimmed });
    setInput("");
  }

  const visible = messages.filter((message) => !isKickoff(textOf(message)));

  return (
    <main className="mx-auto flex h-dvh w-full max-w-3xl flex-col px-4 py-4">
      <header className="flex items-center justify-between gap-3 border-b border-[var(--line)] pb-3">
        <div>
          <p className="font-mono text-xs tracking-[0.18em] text-[var(--signal)] uppercase">
            {session.mode === "cold-call"
              ? `${session.difficulty} ${session.scenario} call`
              : session.mode === "interview"
                ? "Two-round interview"
                : `${session.scenario} playbook`}
          </p>
          <p className="text-sm text-[var(--muted)]">
            {session.mode === "research"
              ? "Openers, objections, and the line for the gatekeeper."
              : session.mode === "interview"
                ? "Round 2 is graded on whether you used the coaching."
                : "Say Pause, End Call, or Feedback when you want the score."}
          </p>
        </div>
        <div className="flex gap-2">
          <button
            type="button"
            onClick={() => setHearCoach((on) => !on)}
            className={`rounded-full border px-3 py-1.5 text-sm ${
              hearCoach
                ? "border-[var(--signal)] bg-[var(--signal)] text-white"
                : "border-[var(--line)]"
            }`}
          >
            {hearCoach ? "Voice on" : "Voice off"}
          </button>
          <button
            type="button"
            onClick={onLeave}
            className="rounded-full border border-[var(--line)] px-3 py-1.5 text-sm"
          >
            New session
          </button>
        </div>
      </header>

      <div ref={scroller} className="flex-1 space-y-4 overflow-y-auto py-6">
        {visible.length === 0 && !error && (
          <p className="text-sm text-[var(--muted)]">Connecting the call…</p>
        )}
        {visible.map((message) => {
          const mine = message.role === "user";
          return (
            <article
              key={message.id}
              className={`max-w-[85%] rounded-2xl px-4 py-3 text-sm leading-6 whitespace-pre-wrap ${
                mine
                  ? "ml-auto bg-[var(--paper)] text-[var(--ink)]"
                  : "border border-[var(--line)]"
              }`}
            >
              <p className="mb-1 font-mono text-[10px] tracking-widest uppercase opacity-50">
                {mine ? "You" : "Coach"}
              </p>
              {textOf(message)}
            </article>
          );
        })}
        {error && (
          <p className="rounded-xl border border-[var(--signal)] px-4 py-3 text-sm">
            {error.message}
          </p>
        )}
      </div>

      <form
        className="border-t border-[var(--line)] pt-3"
        onSubmit={(event) => {
          event.preventDefault();
          submit(input);
        }}
      >
        {session.mode !== "research" && (
          <div className="mb-3 flex flex-wrap gap-2">
            {["Pause", "End Call", "Feedback"].map((cue) => (
              <button
                key={cue}
                type="button"
                disabled={busy}
                onClick={() => submit(cue)}
                className="rounded-full border border-[var(--line)] px-3 py-1 text-xs tracking-wide uppercase disabled:opacity-40"
              >
                {cue}
              </button>
            ))}
            {busy && (
              <button
                type="button"
                onClick={() => stop()}
                className="rounded-full px-3 py-1 text-xs text-[var(--muted)]"
              >
                Stop
              </button>
            )}
          </div>
        )}
        {listening && (
          <p className="mb-2 text-sm text-[var(--muted)]">Pause when you finish. That sends the line.</p>
        )}
        {micNote && <p className="mb-2 text-sm text-[var(--muted)]">{micNote}</p>}
        <div className="flex gap-2">
          <button
            type="button"
            onClick={toggleMic}
            disabled={busy}
            className={`rounded-full border px-4 text-sm disabled:opacity-40 ${
              listening
                ? "border-[var(--signal)] bg-[var(--signal)] text-white"
                : "border-[var(--line)]"
            }`}
          >
            {listening ? "Listening" : "Record"}
          </button>
          <input
            value={input}
            onChange={(event) => setInput(event.target.value)}
            disabled={busy}
            placeholder={
              session.mode === "cold-call"
                ? "Say your opener…"
                : "Your answer…"
            }
            className="flex-1 rounded-full border border-[var(--line)] bg-transparent px-4 py-3 text-sm outline-none focus:border-[var(--signal)] disabled:opacity-50"
          />
          <button
            type="submit"
            disabled={busy || input.trim().length === 0}
            className="rounded-full bg-[var(--signal)] px-5 text-sm font-medium text-white disabled:opacity-40"
          >
            Send
          </button>
        </div>
      </form>
    </main>
  );
}
