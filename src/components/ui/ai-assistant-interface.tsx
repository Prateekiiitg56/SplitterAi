"use client";

import type React from "react";
import { useState, useRef } from "react";
import { useNavigate } from "react-router-dom";
import {
  Search,
  Mic,
  ArrowUp,
  Plus,
  FileText,
  BrainCircuit,
  Sparkles,
  Loader2,
  ArrowRight,
} from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";

/* ── Agent data ───────────────────────────────────────────────── */

type AgentStatus = "active" | "idle" | "error";

interface Agent {
  id: string;
  label: string;
  desc: string;
  status: AgentStatus;
  model?: string;
  currentTask?: string;
}

const agents: Agent[] = [
  {
    id: "planner",
    label: "Planner",
    desc: "Decomposes tasks into subtasks and assigns them to workers",
    status: "idle",
    model: "gemini/gemini-2.5-flash",
  },
  {
    id: "coder",
    label: "Coder",
    desc: "Writes, edits, and runs code using sandboxed tools",
    status: "active",
    model: "groq/llama-3.3-70b-versatile",
    currentTask: "Creating factorial.py with input validation",
  },
  {
    id: "auditor",
    label: "Auditor",
    desc: "Reviews code for bugs, security issues, and quality",
    status: "active",
    model: "gemini/gemini-2.5-flash",
    currentTask: "Reviewing scripts for PEP 8 compliance",
  },
  {
    id: "tester",
    label: "Tester",
    desc: "Writes and runs tests, verifies correctness",
    status: "active",
    model: "groq/llama-3.3-70b-versatile",
    currentTask: "Running all scripts and verifying output",
  },
];

const suggestions = [
  "Create a REST API with Express and add tests",
  "Audit the login page for XSS vulnerabilities",
  "Write a Python CLI tool with argument parsing",
  "Build three independent utility scripts in parallel",
  "Fix the auth middleware and test the fix",
];

/* ── Node graph icon (planner → 4 workers) ────────────────────── */

function NetworkIcon() {
  return (
    <svg width="40" height="40" viewBox="0 0 40 40" fill="none" xmlns="http://www.w3.org/2000/svg">
      {/* Edges */}
      <line x1="20" y1="20" x2="20" y2="6" stroke="#A1A1AA" strokeWidth="1.5" />
      <line x1="20" y1="20" x2="34" y2="20" stroke="#A1A1AA" strokeWidth="1.5" />
      <line x1="20" y1="20" x2="20" y2="34" stroke="#A1A1AA" strokeWidth="1.5" />
      <line x1="20" y1="20" x2="6" y2="20" stroke="#A1A1AA" strokeWidth="1.5" />
      {/* Center node (planner) */}
      <circle cx="20" cy="20" r="4" fill="#18181B" />
      {/* Worker nodes */}
      <circle cx="20" cy="6" r="3" fill="#A1A1AA" />
      <circle cx="34" cy="20" r="3" fill="#A1A1AA" />
      <circle cx="20" cy="34" r="3" fill="#A1A1AA" />
      <circle cx="6" cy="20" r="3" fill="#A1A1AA" />
    </svg>
  );
}

/* ── Status indicator ─────────────────────────────────────────── */

function StatusBadge({ status }: { status: AgentStatus }) {
  if (status === "active") {
    return (
      <span className="flex items-center gap-[var(--sp-1)]">
        <span className="w-1.5 h-1.5 rounded-full bg-green animate-pulse-dot" />
        <span className="t-caption text-green">Active</span>
      </span>
    );
  }
  if (status === "error") {
    return (
      <span className="flex items-center gap-[var(--sp-1)]">
        <span className="w-1.5 h-1.5 rounded-full bg-red" />
        <span className="t-caption text-red">Error</span>
      </span>
    );
  }
  return <span className="t-caption text-text-3">Idle</span>;
}

/* ── Agent card icon (monochrome, role-based shape) ───────────── */

function AgentIcon({ role }: { role: string }) {
  const base = "w-5 h-5 text-text-2";
  switch (role) {
    case "planner":
      return (
        <svg className={base} viewBox="0 0 20 20" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round">
          <rect x="3" y="3" width="14" height="14" rx="2" />
          <line x1="3" y1="8" x2="17" y2="8" />
          <line x1="8" y1="8" x2="8" y2="17" />
        </svg>
      );
    case "coder":
      return (
        <svg className={base} viewBox="0 0 20 20" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
          <polyline points="7,5 3,10 7,15" />
          <polyline points="13,5 17,10 13,15" />
        </svg>
      );
    case "auditor":
      return (
        <svg className={base} viewBox="0 0 20 20" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round">
          <path d="M10 2L3 6v5c0 4.4 3 7.5 7 9 4-1.5 7-4.6 7-9V6l-7-4z" />
          <polyline points="7,10 9,12 13,8" />
        </svg>
      );
    case "tester":
      return (
        <svg className={base} viewBox="0 0 20 20" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round">
          <path d="M8 2v5L5 14c-.5 1.5.5 4 5 4s5.5-2.5 5-4L12 7V2" />
          <line x1="6" y1="2" x2="14" y2="2" />
        </svg>
      );
    default:
      return null;
  }
}

/* ── Main component ───────────────────────────────────────────── */

export function AIAssistantInterface() {
  const navigate = useNavigate();
  const [inputValue, setInputValue] = useState("");
  const [searchEnabled, setSearchEnabled] = useState(false);
  const [deepResearchEnabled, setDeepResearchEnabled] = useState(false);
  const [reasonEnabled, setReasonEnabled] = useState(false);
  const [uploadedFiles, setUploadedFiles] = useState<string[]>([]);
  const [showUploadAnim, setShowUploadAnim] = useState(false);
  const [showSuggestions, setShowSuggestions] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  const handleUpload = () => {
    setShowUploadAnim(true);
    setTimeout(() => {
      setUploadedFiles((p) => [...p, `plan-${p.length + 1}.json`]);
      setShowUploadAnim(false);
    }, 1200);
  };

  const handleSend = () => {
    if (inputValue.trim()) navigate("/run");
  };

  const pickSuggestion = (s: string) => {
    setInputValue(s);
    setShowSuggestions(false);
    inputRef.current?.focus();
  };

  return (
    <div className="flex-1 overflow-y-auto bg-surface">
      <div className="max-w-[720px] mx-auto px-[var(--sp-4)] pt-[var(--sp-12)] pb-[var(--sp-8)]">

        {/* ── Network icon ─────────────────────────────────── */}
        <div className="mb-[var(--sp-8)]">
          <NetworkIcon />
        </div>

        {/* ── Headline ─────────────────────────────────────── */}
        <div className="mb-[var(--sp-8)]">
          <h1 className="t-headline mb-[var(--sp-2)]">What should the agents do?</h1>
          <p className="t-body">
            Describe a task — the planner will decompose it and assign workers.
          </p>
        </div>

        {/* ── Agent cards (2×2) ─────────────────────────────── */}
        <div className="grid grid-cols-2 gap-[var(--sp-4)] mb-[var(--sp-8)]">
          {agents.map((agent, i) => (
            <motion.button
              key={agent.id}
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: i * 0.05, duration: 0.2 }}
              onClick={() => navigate(`/agent/${agent.id}`)}
              className="flex flex-col text-left rounded-[var(--radius)] border border-border bg-raised p-[var(--sp-6)] hover:bg-hover transition-colors cursor-pointer group"
            >
              {/* Row 1: icon + title + status */}
              <div className="flex items-center gap-[var(--sp-3)] mb-[var(--sp-2)]">
                <AgentIcon role={agent.id} />
                <span className="t-label flex-1">{agent.label}</span>
                <StatusBadge status={agent.status} />
              </div>

              {/* Description (clamped to 2 lines) */}
              <p className="t-body text-text-2 mb-[var(--sp-3)]" style={{ display: "-webkit-box", WebkitLineClamp: 2, WebkitBoxOrient: "vertical", overflow: "hidden" }}>
                {agent.desc}
              </p>

              {/* Model name */}
              {agent.model && (
                <span className="t-mono mt-auto">{agent.model}</span>
              )}
            </motion.button>
          ))}
        </div>

        {/* ── Input bar (unified container) ─────────────────── */}
        <div className="rounded-[var(--radius)] border border-border bg-raised overflow-hidden mb-[var(--sp-8)]">
          {/* Text input row */}
          <div className="flex items-center gap-[var(--sp-2)] px-[var(--sp-4)] py-[var(--sp-3)]">
            <input
              ref={inputRef}
              type="text"
              placeholder="Describe a task…"
              value={inputValue}
              onChange={(e) => setInputValue(e.target.value)}
              onKeyDown={(e) => { if (e.key === "Enter") handleSend(); }}
              onFocus={() => setShowSuggestions(true)}
              className="flex-1 text-[14px] text-text-1 outline-none bg-transparent placeholder:text-text-3"
            />
            <button
              onClick={handleSend}
              disabled={!inputValue.trim()}
              className={`w-7 h-7 flex items-center justify-center rounded-full transition-colors cursor-pointer ${
                inputValue.trim()
                  ? "bg-accent text-white hover:opacity-90"
                  : "bg-hover text-text-3 cursor-not-allowed"
              }`}
            >
              <ArrowUp className="w-3.5 h-3.5" />
            </button>
          </div>

          {/* Uploaded files */}
          {uploadedFiles.length > 0 && (
            <div className="px-[var(--sp-4)] pb-[var(--sp-3)]">
              <div className="flex flex-wrap gap-[var(--sp-2)]">
                {uploadedFiles.map((file, i) => (
                  <div key={i} className="flex items-center gap-[var(--sp-1)] bg-hover py-1 px-2 rounded-[var(--radius-sm)] border border-border">
                    <FileText className="w-3 h-3 text-text-2" />
                    <span className="text-[12px] text-text-1">{file}</span>
                    <button
                      onClick={() => setUploadedFiles((p) => p.filter((_, j) => j !== i))}
                      className="text-text-3 hover:text-text-1 cursor-pointer ml-1"
                    >
                      <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round">
                        <line x1="18" y1="6" x2="6" y2="18" /><line x1="6" y1="6" x2="18" y2="18" />
                      </svg>
                    </button>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Divider */}
          <div className="border-t border-border" />

          {/* Pills row */}
          <div className="flex items-center gap-[var(--sp-2)] px-[var(--sp-4)] py-[var(--sp-3)]">
            <TogglePill active={searchEnabled} onClick={() => setSearchEnabled(!searchEnabled)} icon={<Search className="w-3.5 h-3.5" />} label="Search" />
            <TogglePill active={deepResearchEnabled} onClick={() => setDeepResearchEnabled(!deepResearchEnabled)} icon={<Sparkles className="w-3.5 h-3.5" />} label="Deep Research" />
            <TogglePill active={reasonEnabled} onClick={() => setReasonEnabled(!reasonEnabled)} icon={<BrainCircuit className="w-3.5 h-3.5" />} label="Reason" />

            <div className="flex-1" />

            <button className="p-1.5 text-text-3 hover:text-text-2 transition-colors cursor-pointer">
              <Mic className="w-4 h-4" />
            </button>
          </div>

          {/* Divider */}
          <div className="border-t border-border" />

          {/* Upload row */}
          <div className="px-[var(--sp-4)] py-[var(--sp-3)]">
            <button
              onClick={handleUpload}
              className="flex items-center gap-[var(--sp-2)] text-text-2 text-[13px] hover:text-text-1 transition-colors cursor-pointer"
            >
              {showUploadAnim ? (
                <motion.div className="flex gap-1" initial="hidden" animate="visible"
                  variants={{ hidden: {}, visible: { transition: { staggerChildren: 0.1 } } }}>
                  {[0, 1, 2].map((i) => (
                    <motion.div key={i} className="w-1 h-1 bg-accent rounded-full"
                      variants={{
                        hidden: { opacity: 0, y: 4 },
                        visible: { opacity: 1, y: 0, transition: { duration: 0.35, repeat: Infinity, repeatType: "mirror", delay: i * 0.1 } },
                      }}
                    />
                  ))}
                </motion.div>
              ) : (
                <Plus className="w-3.5 h-3.5" />
              )}
              <span>Upload manual plan</span>
            </button>
          </div>
        </div>

        {/* ── Suggestions ──────────────────────────────────── */}
        <AnimatePresence>
          {showSuggestions && !inputValue.trim() && (
            <motion.div
              initial={{ opacity: 0, y: 6 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: 6 }}
              transition={{ duration: 0.15 }}
            >
              <p className="t-caption text-text-3 mb-[var(--sp-2)]">Suggestions</p>
              <div className="divide-y divide-border">
                {suggestions.map((s, i) => (
                  <button
                    key={i}
                    onClick={() => pickSuggestion(s)}
                    className="flex items-center gap-[var(--sp-3)] w-full text-left py-[var(--sp-2)] px-[var(--sp-1)] hover:bg-hover rounded-[var(--radius-sm)] transition-colors cursor-pointer"
                  >
                    <ArrowRight className="w-3.5 h-3.5 text-text-3 flex-shrink-0" />
                    <span className="text-[14px] text-text-1">{s}</span>
                  </button>
                ))}
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </div>
  );
}

/* ── Toggle pill ──────────────────────────────────────────────── */

function TogglePill({ active, onClick, icon, label }: {
  active: boolean; onClick: () => void; icon: React.ReactNode; label: string;
}) {
  return (
    <button
      onClick={onClick}
      className={`flex items-center gap-[var(--sp-1)] px-[var(--sp-3)] py-[5px] rounded-[var(--radius-sm)] text-[12px] font-medium transition-colors cursor-pointer ${
        active
          ? "bg-accent/10 text-accent"
          : "bg-hover text-text-3 hover:text-text-2"
      }`}
    >
      {icon}
      <span>{label}</span>
    </button>
  );
}
