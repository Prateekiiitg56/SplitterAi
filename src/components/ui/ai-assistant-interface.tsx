"use client";

import { useState, useRef } from "react";
import { useNavigate } from "react-router-dom";
import {
  Paperclip,
  Mic,
  Plus,
  ArrowRight,
  Settings,
  Layers,
  Code,
  ShieldCheck,
  TestTube,
  CheckCircle2,
  XCircle,
  AlertCircle,
  Clock,
} from "lucide-react";
import {
  mockAgents,
  mockSessions,
  ROLE_META,
  type AgentRole,
  type AgentStatus,
} from "../../data";
import Background3D from "../Background3D";

/* ── Palette constants — Light content ────────────────────────── */
const C = {
  // Surfaces
  bg: "#FBE9D0",
  card: "#FFFFFF",
  cardHover: "#FFF8F0",
  elevated: "#FFF5EB",

  // Brand
  brand: "#244855",
  accent: "#E64833",
  accentHover: "#D13D2B",
  warm: "#874F41",
  sage: "#90AEAD",
  cream: "#FBE9D0",

  // Text
  text: "#244855",
  textSec: "#874F41",
  textMuted: "#90AEAD",

  // Borders
  border: "rgba(135, 79, 65, 0.1)",
  borderStrong: "rgba(135, 79, 65, 0.18)",
  borderAccent: "rgba(230, 72, 51, 0.2)",

  // Status
  green: "#2E9E6E",

  // Shadows
  shadow: "0 1px 3px rgba(36,72,85,0.06), 0 4px 16px rgba(36,72,85,0.04)",
  shadowHover: "0 2px 8px rgba(36,72,85,0.08), 0 8px 28px rgba(36,72,85,0.06)",
} as const;

/* ── Agent Icon Map ───────────────────────────────────────────── */
const agentIconMap: Record<AgentRole, React.ReactNode> = {
  planner: <Layers size={18} />,
  coder: <Code size={18} />,
  auditor: <ShieldCheck size={18} />,
  tester: <TestTube size={18} />,
};

/* ── Status Badge ─────────────────────────────────────────────── */
function StatusPill({ status }: { status: AgentStatus }) {
  const isActive = status === "active";
  return (
    <span
      className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[11px] font-medium"
      style={{
        background: isActive ? "rgba(230,72,51,0.08)" : "rgba(144,174,173,0.12)",
        border: `1px solid ${isActive ? "rgba(230,72,51,0.2)" : "rgba(144,174,173,0.2)"}`,
        color: isActive ? C.accent : C.textMuted,
      }}
    >
      <span
        className={`w-1.5 h-1.5 rounded-full flex-shrink-0 ${isActive ? "animate-pulse-dot" : ""}`}
        style={{ background: isActive ? C.accent : C.textMuted }}
      />
      {isActive ? "Running" : "Idle"}
    </span>
  );
}

/* ── Session Status Icon ──────────────────────────────────────── */
function RunStatusIcon({ status }: { status: string }) {
  switch (status) {
    case "done":
      return <CheckCircle2 size={14} style={{ color: C.green }} className="flex-shrink-0" />;
    case "error":
      return <XCircle size={14} style={{ color: C.accent }} className="flex-shrink-0" />;
    case "executing":
    case "planning":
      return <span className="w-2.5 h-2.5 rounded-full animate-pulse-dot flex-shrink-0" style={{ background: C.accent }} />;
    default:
      return <AlertCircle size={14} style={{ color: C.textMuted }} className="flex-shrink-0" />;
  }
}

/* ── Role Labels ──────────────────────────────────────────────── */
const roleLabels: Record<AgentRole, string> = {
  planner: "DISPATCHER & ORCHESTRATOR",
  coder: "CODING AGENT",
  auditor: "SECURITY & REVIEW AGENT",
  tester: "TESTING AGENT",
};

/* ================================================================
   MAIN COMPONENT
   ================================================================ */
export function AIAssistantInterface() {
  let navigate = (path: string) => { window.location.href = path; };
  try {
    const nav = useNavigate();
    if (typeof nav === "function") navigate = nav;
  } catch (e) { /* fallback */ }

  const [inputValue, setInputValue] = useState("");
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  const plannerAgent = mockAgents.find((a) => a.role === "planner")!;
  const workerAgents = mockAgents.filter((a) => a.role !== "planner");

  const handleSend = () => { if (inputValue.trim()) navigate("/run"); };
  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" && (e.ctrlKey || e.metaKey)) { e.preventDefault(); handleSend(); }
  };

  return (
    <div
      className="flex-1 overflow-y-auto relative"
      style={{
        background: `
          radial-gradient(ellipse at 15% 10%, rgba(230,72,51,0.05) 0%, transparent 50%),
          radial-gradient(ellipse at 85% 30%, rgba(36,72,85,0.05) 0%, transparent 50%),
          radial-gradient(ellipse at 50% 80%, rgba(144,174,173,0.06) 0%, transparent 50%),
          linear-gradient(180deg, #FBE9D0 0%, #F3E0C8 50%, #EDD8C4 100%)
        `,
      }}
    >
      <Background3D />
      <div className="relative z-10" style={{ maxWidth: 1200, margin: "0 auto", padding: "32px 32px 48px" }}>

        {/* ── Page Introduction ──────────────────────────────── */}
        <div style={{ maxWidth: 900, marginBottom: 32 }} className="relative">
          <div
            className="absolute pointer-events-none"
            style={{
              top: -60,
              left: -80,
              width: 500,
              height: 250,
              background: "radial-gradient(ellipse at center, rgba(230,72,51,0.06) 0%, transparent 65%)",
            }}
          />
          <h1 className="t-hero relative" style={{ marginBottom: 8 }}>
            What should the agents do?
          </h1>
          <p className="t-subhead relative">
            Describe the task and let the Planner coordinate the right agents automatically.
          </p>
        </div>

        {/* ── Planner Orchestration Card ─────────────────────── */}
        <div
          onClick={() => navigate("/agent/planner")}
          className="cursor-pointer transition-all duration-150 group"
          style={{
            background: C.card,
            border: `1px solid ${C.borderAccent}`,
            borderRadius: 12,
            padding: "20px 24px",
            minHeight: 104,
            marginBottom: 0,
            borderTop: "2px solid rgba(230,72,51,0.4)",
            boxShadow: C.shadow,
          }}
          onMouseEnter={(e) => {
            e.currentTarget.style.boxShadow = C.shadowHover;
            e.currentTarget.style.borderColor = "rgba(230,72,51,0.3)";
          }}
          onMouseLeave={(e) => {
            e.currentTarget.style.boxShadow = C.shadow;
            e.currentTarget.style.borderColor = C.borderAccent;
            e.currentTarget.style.borderTop = "2px solid rgba(230,72,51,0.4)";
          }}
        >
          <div className="flex items-center justify-between gap-4 mb-3">
            <div className="flex items-center gap-3">
              <div
                className="w-9 h-9 rounded-lg flex items-center justify-center flex-shrink-0"
                style={{
                  background: "rgba(230,72,51,0.08)",
                  border: "1px solid rgba(230,72,51,0.15)",
                  color: C.accent,
                }}
              >
                {agentIconMap.planner}
              </div>
              <span className="t-card-title">{ROLE_META.planner.label}</span>
              <span
                className="px-2 py-0.5 rounded text-[10px] font-semibold uppercase"
                style={{
                  background: "rgba(36,72,85,0.06)",
                  border: `1px solid ${C.border}`,
                  color: C.textMuted,
                  letterSpacing: "0.06em",
                }}
              >
                {roleLabels.planner}
              </span>
            </div>
            <div className="flex items-center gap-3">
              <StatusPill status={plannerAgent.status} />
              <div className="flex items-center gap-1.5 text-[12px] transition-colors" style={{ color: C.textMuted }}>
                <Settings size={13} />
                <span>Configure</span>
                <ArrowRight size={12} />
              </div>
            </div>
          </div>

          <p className="t-body mb-3" style={{ maxWidth: 700 }}>
            {ROLE_META.planner.desc}
          </p>

          {plannerAgent.model && (
            <span
              className="inline-block px-2.5 py-1 rounded-md font-mono text-[11px]"
              style={{
                background: "rgba(36,72,85,0.05)",
                border: `1px solid ${C.border}`,
                color: C.brand,
              }}
            >
              {plannerAgent.model}
            </span>
          )}
        </div>

        {/* ── Connector ─────────────────────────────────────── */}
        <div className="flex flex-col items-center" style={{ padding: "4px 0" }}>
          <div style={{ width: 1, height: 16, background: "rgba(135,79,65,0.15)" }} />
          <div
            className="rounded-full"
            style={{
              width: 8,
              height: 8,
              background: C.accent,
              boxShadow: "0 0 8px rgba(230,72,51,0.25)",
            }}
          />
          <div style={{ width: 1, height: 16, background: "rgba(135,79,65,0.15)" }} />
        </div>

        {/* ── Worker Agent Cards Grid ────────────────────────── */}
        <div
          className="grid gap-4 mb-8"
          style={{ gridTemplateColumns: "repeat(auto-fit, minmax(280px, 1fr))" }}
        >
          {workerAgents.map((agent) => (
            <div
              key={agent.role}
              onClick={() => navigate(`/agent/${agent.role}`)}
              className="flex flex-col cursor-pointer transition-all duration-150 group"
              style={{
                background: C.card,
                border: `1px solid ${C.border}`,
                borderRadius: 12,
                padding: "20px",
                minHeight: 200,
                boxShadow: C.shadow,
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.borderColor = C.borderStrong;
                e.currentTarget.style.boxShadow = C.shadowHover;
                e.currentTarget.style.transform = "translateY(-1px)";
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.borderColor = C.border;
                e.currentTarget.style.boxShadow = C.shadow;
                e.currentTarget.style.transform = "translateY(0)";
              }}
            >
              <div className="flex items-center justify-between gap-3 mb-2">
                <div className="flex items-center gap-2.5">
                  <div
                    className="w-9 h-9 rounded-lg flex items-center justify-center flex-shrink-0"
                    style={{
                      background: "rgba(36,72,85,0.08)",
                      border: "1px solid rgba(36,72,85,0.12)",
                      color: C.brand,
                    }}
                  >
                    {agentIconMap[agent.role]}
                  </div>
                  <span className="t-card-title">{ROLE_META[agent.role].label}</span>
                </div>
                <StatusPill status={agent.status} />
              </div>

              <span className="mb-2" style={{ fontSize: 10, fontWeight: 600, letterSpacing: "0.06em", textTransform: "uppercase" as const, color: C.textMuted }}>
                {roleLabels[agent.role]}
              </span>

              <p className="t-body mb-4" style={{ fontSize: 13, lineHeight: "19px" }}>
                {ROLE_META[agent.role].desc}
              </p>

              <div className="mt-auto space-y-3 pt-3" style={{ borderTop: `1px solid ${C.border}` }}>
                {agent.model && (
                  <span
                    className="inline-block px-2.5 py-1 rounded-md font-mono text-[11px]"
                    style={{
                      background: "rgba(36,72,85,0.05)",
                      border: `1px solid ${C.border}`,
                      color: C.brand,
                    }}
                  >
                    {agent.model}
                  </span>
                )}
                <div className="flex items-center gap-1.5 text-[12px] transition-colors" style={{ color: C.textMuted }}>
                  <Settings size={13} />
                  <span>Configure</span>
                  <ArrowRight size={12} className="ml-auto" />
                </div>
              </div>
            </div>
          ))}
        </div>

        {/* ── Task Composer ──────────────────────────────────── */}
        <div
          className="mb-8"
          style={{
            background: C.card,
            border: `1px solid ${C.border}`,
            borderRadius: 14,
            overflow: "hidden",
            boxShadow: C.shadow,
          }}
        >
          <div className="px-5 pt-4 pb-2" style={{ fontSize: 10, fontWeight: 600, letterSpacing: "0.06em", textTransform: "uppercase" as const, color: C.textMuted }}>
            TASK INSTRUCTION
          </div>

          <div className="px-5 pb-3">
            <textarea
              ref={textareaRef}
              value={inputValue}
              onChange={(e) => setInputValue(e.target.value)}
              onKeyDown={handleKeyDown}
              placeholder='Describe a task (e.g. "Build a REST API with Express and add unit tests")'
              rows={4}
              className="w-full bg-transparent text-[14px] outline-none resize-none"
              style={{ minHeight: 100, lineHeight: "22px", color: C.text }}
            />
          </div>

          <div
            className="flex items-center gap-2 px-5 py-3"
            style={{
              borderTop: `1px solid ${C.border}`,
              background: "rgba(36,72,85,0.02)",
            }}
          >
            {[
              { icon: <Paperclip size={15} />, title: "Attach file" },
              { icon: <Mic size={15} />, title: "Voice input" },
              { icon: <Plus size={15} />, title: "Add context" },
            ].map((btn) => (
              <button
                key={btn.title}
                className="p-2 rounded-lg transition-all cursor-pointer"
                style={{ color: C.textMuted }}
                title={btn.title}
                onMouseEnter={(e) => {
                  e.currentTarget.style.color = C.warm;
                  e.currentTarget.style.background = "rgba(36,72,85,0.05)";
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.color = C.textMuted;
                  e.currentTarget.style.background = "transparent";
                }}
              >
                {btn.icon}
              </button>
            ))}

            <span className="flex-1 text-[12px] text-center hidden md:block" style={{ color: C.textMuted }}>
              Planner will determine the execution plan
            </span>

            <button
              onClick={handleSend}
              disabled={!inputValue.trim()}
              className="inline-flex items-center gap-2 px-5 py-2.5 rounded-lg text-[13px] font-semibold transition-all"
              style={{
                background: inputValue.trim() ? C.accent : "rgba(144,174,173,0.12)",
                color: inputValue.trim() ? "#FFFFFF" : C.textMuted,
                border: `1px solid ${inputValue.trim() ? C.accent : "rgba(144,174,173,0.2)"}`,
                cursor: inputValue.trim() ? "pointer" : "not-allowed",
                boxShadow: inputValue.trim() ? "0 2px 8px rgba(230,72,51,0.25)" : "none",
              }}
            >
              <span>Run Agents</span>
              <span className="text-[10px] font-mono" style={{ opacity: 0.7 }}>Ctrl ↵</span>
            </button>
          </div>
        </div>

        {/* ── Execution Status ───────────────────────────────── */}
        <div
          className="mb-8"
          style={{
            background: C.card,
            border: `1px solid ${C.border}`,
            borderRadius: 12,
            padding: "24px",
            boxShadow: C.shadow,
          }}
        >
          <p style={{ fontSize: 10, fontWeight: 600, letterSpacing: "0.06em", textTransform: "uppercase" as const, color: C.textMuted, marginBottom: 12 }}>
            EXECUTION STATUS
          </p>
          <div className="flex flex-col items-center py-6 gap-2">
            <div
              className="w-10 h-10 rounded-full flex items-center justify-center mb-2"
              style={{ background: "rgba(36,72,85,0.05)", border: `1px solid ${C.border}` }}
            >
              <Clock size={18} style={{ color: C.textMuted }} />
            </div>
            <p className="text-[15px] font-medium" style={{ color: C.text }}>Ready to execute</p>
            <p className="text-[13px] text-center" style={{ maxWidth: 400, color: C.textMuted }}>
              Submit a task above and the Planner will generate an execution plan.
            </p>
          </div>
        </div>

        {/* ── Recent Runs ────────────────────────────────────── */}
        {mockSessions.length > 0 && (
          <div
            style={{
              background: C.card,
              border: `1px solid ${C.border}`,
              borderRadius: 12,
              overflow: "hidden",
              boxShadow: C.shadow,
            }}
          >
            <div className="flex items-center justify-between px-5 pt-5 pb-3">
              <div>
                <h2 className="t-section mb-0.5">Recent Runs</h2>
                <p className="text-[13px]" style={{ color: C.textMuted }}>Your latest agent executions</p>
              </div>
              <button
                onClick={() => navigate("/run")}
                className="text-[12px] font-medium transition-colors cursor-pointer"
                style={{ color: C.accent }}
                onMouseEnter={(e) => { e.currentTarget.style.color = C.accentHover }}
                onMouseLeave={(e) => { e.currentTarget.style.color = C.accent }}
              >
                View all →
              </button>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-left">
                <thead>
                  <tr style={{ borderTop: `1px solid ${C.border}`, borderBottom: `1px solid ${C.border}` }}>
                    {["STATUS", "TASK", "AGENTS", "DURATION", "CREATED"].map((col) => (
                      <th
                        key={col}
                        className="px-5 py-2.5"
                        style={{ fontSize: 10, fontWeight: 600, letterSpacing: "0.06em", textTransform: "uppercase" as const, color: C.textMuted }}
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
                      className="cursor-pointer transition-colors duration-150"
                      style={{ borderBottom: `1px solid ${C.border}` }}
                      onMouseEnter={(e) => { e.currentTarget.style.background = "rgba(36,72,85,0.03)" }}
                      onMouseLeave={(e) => { e.currentTarget.style.background = "transparent" }}
                    >
                      <td className="px-5 py-3"><RunStatusIcon status={session.status} /></td>
                      <td className="px-5 py-3 text-[13px]" style={{ maxWidth: 400, color: C.text }}>
                        <span className="truncate block">{session.task}</span>
                      </td>
                      <td className="px-5 py-3 text-[12px] font-mono" style={{ color: C.textSec }}>
                        {session.subtaskCount} agents
                      </td>
                      <td className="px-5 py-3 text-[12px] font-mono tabular-nums" style={{ color: C.textMuted }}>—</td>
                      <td className="px-5 py-3 text-[12px] font-mono" style={{ color: C.textMuted }}>{session.createdAt}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
