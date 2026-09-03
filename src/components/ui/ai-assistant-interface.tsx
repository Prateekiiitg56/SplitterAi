"use client";

import { useState, useRef } from "react";
import { useNavigate } from "react-router-dom";
import {
  Paperclip,
  Mic,
  ChevronDown,
  ArrowRight,
  X,
  FileText,
  Layers,
  Code,
  ShieldCheck,
  TestTube,
  CheckCircle2,
  XCircle,
  AlertCircle,
  Clock,
  Play,
} from "lucide-react";
import {
  mockAgents,
  mockSessions,
  ROLE_META,
  type AgentRole,
  type AgentStatus,
} from "../../data";

/* ── Agent Icon Map ───────────────────────────────────────────── */
const agentIconMap: Record<AgentRole, React.ReactNode> = {
  planner: <Layers size={16} strokeWidth={1.5} />,
  coder: <Code size={16} strokeWidth={1.5} />,
  auditor: <ShieldCheck size={16} strokeWidth={1.5} />,
  tester: <TestTube size={16} strokeWidth={1.5} />,
};

/* ── Role icon chip tints ─────────────────────────────────────── */
const roleChipStyle: Record<AgentRole, { bg: string; color: string }> = {
  planner: { bg: "rgba(61,139,95,0.08)", color: "#3D8B5F" },
  coder: { bg: "rgba(37,99,235,0.08)", color: "#2563EB" },
  auditor: { bg: "rgba(217,119,6,0.08)", color: "#D97706" },
  tester: { bg: "rgba(139,92,246,0.08)", color: "#8B5CF6" },
};

/* ── Role subtitles ───────────────────────────────────────────── */
const roleSubtitles: Record<AgentRole, string> = {
  planner: "TASK DECOMPOSITION & ORCHESTRATION",
  coder: "CODE GENERATION & EDITING",
  auditor: "SECURITY & CODE REVIEW",
  tester: "TEST AUTOMATION & VERIFICATION",
};

/* ── Status Pill ──────────────────────────────────────────────── */
function StatusPill({ status }: { status: AgentStatus }) {
  const isActive = status === "active";
  return (
    <span
      className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[12px] font-medium border"
      style={{
        background: isActive ? "rgba(37,99,235,0.06)" : "var(--color-surface)",
        borderColor: isActive ? "rgba(37,99,235,0.15)" : "var(--color-border)",
        color: isActive ? "#2563EB" : "var(--color-text-3)",
      }}
    >
      <span
        className={`w-1.5 h-1.5 rounded-full flex-shrink-0 ${isActive ? "animate-pulse-dot" : ""}`}
        style={{ background: isActive ? "#2563EB" : "var(--color-text-3)" }}
      />
      {isActive ? "Running" : "Idle"}
    </span>
  );
}

/* ── Run Status Icon ──────────────────────────────────────────── */
function RunStatusIcon({ status }: { status: string }) {
  switch (status) {
    case "done": return <CheckCircle2 size={14} style={{ color: "var(--color-green)" }} />;
    case "error": return <XCircle size={14} style={{ color: "var(--color-red)" }} />;
    case "executing":
    case "planning": return <span className="w-2.5 h-2.5 rounded-full animate-pulse-dot" style={{ background: "var(--color-blue)" }} />;
    default: return <AlertCircle size={14} style={{ color: "var(--color-text-3)" }} />;
  }
}

/* ── Agent Card ───────────────────────────────────────────────── */
function AgentCard({ role, onNavigate }: { role: AgentRole; onNavigate: (path: string) => void }) {
  const agent = mockAgents.find((a) => a.role === role)!;
  const meta = ROLE_META[role];
  const chip = roleChipStyle[role];

  return (
    <div
      onClick={() => onNavigate(`/agent/${role}`)}
      className="card cursor-pointer transition-all"
      style={{ padding: "16px 20px" }}
    >
      {/* Top row: icon chip + name + status pill */}
      <div className="flex items-center justify-between mb-2">
        <div className="flex items-center gap-2.5">
          <div
            className="w-7 h-7 rounded-lg flex items-center justify-center flex-shrink-0"
            style={{ background: chip.bg, color: chip.color }}
          >
            {agentIconMap[role]}
          </div>
          <span className="text-[14px] font-semibold" style={{ color: "var(--color-text-1)" }}>
            {meta.label}
          </span>
        </div>
        <StatusPill status={agent.status} />
      </div>

      {/* Role subtitle */}
      <p className="t-micro mb-2">{roleSubtitles[role]}</p>

      {/* Description */}
      <p className="t-body mb-3" style={{ lineHeight: "18px" }}>
        {meta.desc}
      </p>

      {/* Model chip */}
      {agent.model && (
        <div className="mb-3">
          <span className="chip-inset">{agent.model}</span>
        </div>
      )}

      {/* Footer: Configure link */}
      <div className="flex items-center justify-end">
        <span
          className="inline-flex items-center gap-1 text-[13px] font-medium cursor-pointer transition-colors"
          style={{ color: "var(--color-text-2)" }}
        >
          Configure <ArrowRight size={13} />
        </span>
      </div>
    </div>
  );
}

/* ── Main Interface ───────────────────────────────────────────── */
export function AIAssistantInterface() {
  let navigate = (path: string) => { window.location.href = path; };
  try {
    const nav = useNavigate();
    if (typeof nav === "function") navigate = nav;
  } catch (e) { /* fallback */ }

  const [inputValue, setInputValue] = useState("");
  const [attachments] = useState<string[]>(["project_spec.md", "schema.sql"]);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  const handleSend = () => {
    if (inputValue.trim()) navigate("/run");
  };
  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" && (e.ctrlKey || e.metaKey)) {
      e.preventDefault();
      handleSend();
    }
  };

  return (
    <div className="flex-1 overflow-y-auto" style={{ background: "var(--color-bg)" }}>
      <div style={{ maxWidth: 980, margin: "0 auto", padding: "24px 32px 48px" }}>

        {/* ── Breadcrumb ─────────────────────────────────────── */}
        <nav className="mb-5 text-[13px]" style={{ color: "var(--color-text-2)" }}>
          <span className="cursor-pointer hover:underline" onClick={() => navigate("/")}>SplitterAi</span>
          <span className="mx-1.5" style={{ color: "var(--color-text-3)" }}>/</span>
          <span style={{ color: "var(--color-text-1)", fontWeight: 500 }}>Home</span>
        </nav>

        {/* ── Task Composer Card ─────────────────────────────── */}
        <div className="card mb-4">
          {/* Card header */}
          <div className="flex items-center justify-between mb-5">
            <h2 className="t-section">New Task</h2>
            <button className="cursor-pointer" style={{ color: "var(--color-text-3)" }}>
              <ChevronDown size={16} strokeWidth={1.5} />
            </button>
          </div>

          {/* Field: Task Description */}
          <div className="mb-4">
            <label className="t-label block mb-1.5">Task description</label>
            <textarea
              ref={textareaRef}
              value={inputValue}
              onChange={(e) => setInputValue(e.target.value)}
              onKeyDown={handleKeyDown}
              placeholder="Describe the task for the agents (e.g. &quot;Build a REST API with Express and add unit tests&quot;)"
              rows={4}
              className="input-field w-full resize-none"
            />
          </div>

          {/* Attachment chips */}
          <div className="flex flex-wrap gap-2 mb-4">
            {attachments.map((file) => (
              <span key={file} className="chip text-[13px]">
                <FileText size={14} style={{ color: "var(--color-text-3)" }} />
                <span>{file}</span>
                <button className="cursor-pointer" style={{ color: "var(--color-text-3)" }}>
                  <X size={12} />
                </button>
              </span>
            ))}
          </div>

          {/* Config row: side-by-side dropdowns */}
          <div className="grid grid-cols-3 gap-3 mb-5">
            <div>
              <label className="t-label block mb-1.5">Mode</label>
              <div
                className="flex items-center justify-between px-3 h-9 rounded-lg border cursor-pointer"
                style={{ background: "var(--color-surface)", borderColor: "var(--color-border)" }}
              >
                <span className="text-[13px]" style={{ color: "var(--color-text-1)" }}>Multi-agent</span>
                <ChevronDown size={14} style={{ color: "var(--color-text-3)" }} />
              </div>
            </div>
            <div>
              <label className="t-label block mb-1.5">Planner Model</label>
              <div
                className="flex items-center justify-between px-3 h-9 rounded-lg border cursor-pointer"
                style={{ background: "var(--color-surface)", borderColor: "var(--color-border)" }}
              >
                <span className="text-[13px] font-mono truncate" style={{ color: "var(--color-text-1)" }}>gemini-2.5-flash</span>
                <ChevronDown size={14} style={{ color: "var(--color-text-3)" }} />
              </div>
            </div>
            <div>
              <label className="t-label block mb-1.5">Workspace</label>
              <div
                className="flex items-center justify-between px-3 h-9 rounded-lg border cursor-pointer"
                style={{ background: "var(--color-surface)", borderColor: "var(--color-border)" }}
              >
                <span className="text-[13px] font-mono truncate" style={{ color: "var(--color-text-1)" }}>D:/projects/webapp</span>
                <ChevronDown size={14} style={{ color: "var(--color-text-3)" }} />
              </div>
            </div>
          </div>

          {/* Action bar */}
          <div className="flex items-center justify-end gap-3 pt-4 border-t" style={{ borderColor: "var(--color-border-subtle)" }}>
            <button className="btn-ghost">Cancel</button>
            <button className="btn-secondary">
              <Paperclip size={14} />
              <span>Attach</span>
            </button>
            <button
              className="btn-primary"
              onClick={handleSend}
              style={{ opacity: inputValue.trim() ? 1 : 0.5 }}
            >
              <Play size={14} />
              <span>Run Task</span>
            </button>
          </div>
        </div>

        {/* ── Planner Card (full-width) ──────────────────────── */}
        <AgentCard role="planner" onNavigate={navigate} />

        {/* ── Visual connector ───────────────────────────────── */}
        <div className="flex flex-col items-center" style={{ padding: "4px 0" }}>
          <div className="w-px h-3" style={{ background: "var(--color-border-strong)" }} />
          <div className="w-2.5 h-2.5 rounded-full" style={{ background: "var(--color-accent)" }} />
          <div className="w-px h-3" style={{ background: "var(--color-border-strong)" }} />
        </div>

        {/* ── Worker Agent Cards (3-col grid) ────────────────── */}
        <div className="grid grid-cols-3 gap-4 mb-6">
          <AgentCard role="coder" onNavigate={navigate} />
          <AgentCard role="auditor" onNavigate={navigate} />
          <AgentCard role="tester" onNavigate={navigate} />
        </div>

        {/* ── History Card ───────────────────────────────────── */}
        {mockSessions.length > 0 && (
          <div className="card" style={{ padding: 0, overflow: "hidden" }}>
            <div className="flex items-center justify-between px-5 pt-5 pb-3">
              <div>
                <h2 className="t-section mb-0.5">History</h2>
                <p className="t-caption">Recent execution runs</p>
              </div>
              <button
                onClick={() => navigate("/run")}
                className="text-[13px] font-medium cursor-pointer"
                style={{ color: "var(--color-accent)" }}
              >
                View all →
              </button>
            </div>

            <table className="w-full text-left border-collapse">
              <thead>
                <tr style={{ borderTop: "1px solid var(--color-border-subtle)", borderBottom: "1px solid var(--color-border-subtle)" }}>
                  {["STATUS", "TASK", "WORKERS", "CREATED"].map((col) => (
                    <th
                      key={col}
                      className="px-5 py-2 t-micro"
                      style={{ background: "var(--color-elevated)" }}
                    >
                      {col}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {mockSessions.map((session) => (
                  <tr
                    key={session.id}
                    onClick={() => navigate("/run")}
                    className="cursor-pointer transition-colors"
                    style={{ borderBottom: "1px solid var(--color-border-subtle)" }}
                    onMouseEnter={(e) => e.currentTarget.style.background = "var(--color-surface-hover)"}
                    onMouseLeave={(e) => e.currentTarget.style.background = "transparent"}
                  >
                    <td className="px-5 py-3"><RunStatusIcon status={session.status} /></td>
                    <td className="px-5 py-3 text-[13px]" style={{ color: "var(--color-text-1)", maxWidth: 400 }}>
                      <span className="truncate block">{session.task}</span>
                    </td>
                    <td className="px-5 py-3 text-[12px] font-mono" style={{ color: "var(--color-text-2)" }}>
                      {session.subtaskCount} agents
                    </td>
                    <td className="px-5 py-3 text-[12px] font-mono" style={{ color: "var(--color-text-3)" }}>
                      {session.createdAt}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
