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
  ArrowRight,
  Terminal,
  Layers,
} from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { StatusBadge, AgentIcon } from "../Badges";

/* ── Agent Data Model ─────────────────────────────────────────── */

type AgentStatus = "active" | "idle" | "error";

interface Agent {
  id: string;
  label: string;
  desc: string;
  status: AgentStatus;
  model?: string;
  roleType: "dispatcher" | "worker";
}

const plannerAgent: Agent = {
  id: "planner",
  label: "Planner",
  desc: "Decomposes complex requests into executable subtasks, analyzes dependencies, and routes work to specialized worker agents in parallel or sequence.",
  status: "idle",
  model: "gemini/gemini-2.5-flash",
  roleType: "dispatcher",
};

const workerAgents: Agent[] = [
  {
    id: "coder",
    label: "Coder",
    desc: "Writes, refactors, and executes code within secure isolated sandboxes using tool access.",
    status: "active",
    model: "groq/llama-3.3-70b-versatile",
    roleType: "worker",
  },
  {
    id: "auditor",
    label: "Auditor",
    desc: "Reviews generated code for security flaws, edge cases, vulnerability patterns, and PEP 8 standards.",
    status: "active",
    model: "gemini/gemini-2.5-flash",
    roleType: "worker",
  },
  {
    id: "tester",
    label: "Tester",
    desc: "Generates test suites, executes test scripts in shell sandboxes, and verifies runtime output.",
    status: "active",
    model: "groq/llama-3.3-70b-versatile",
    roleType: "worker",
  },
];

const suggestions = [
  "Create a REST API with Express, TypeScript, and automated unit tests",
  "Audit the login handler for XSS, SQL injection, and authorization flaws",
  "Build a Python CLI tool with argument parsing and subcommands",
  "Decompose and run three independent utility scripts in parallel",
  "Fix expired JWT handling in auth middleware and verify test coverage",
];

/* ── Header / Logo Lockup Component ───────────────────────────── */

function BrandHeader() {
  const navigate = useNavigate();

  return (
    <header className="flex items-center justify-between mb-10 pb-4 border-b border-slate-200/80">
      {/* Inline Lockup: Icon + Name + Divider + Breadcrumb */}
      <div className="flex items-center gap-3">
        {/* Node graph icon */}
        <div className="w-8 h-8 rounded-lg bg-slate-900 flex items-center justify-center text-white shadow-xs flex-shrink-0">
          <svg width="20" height="20" viewBox="0 0 40 40" fill="none" xmlns="http://www.w3.org/2000/svg">
            <line x1="20" y1="20" x2="20" y2="7" stroke="#94A3B8" strokeWidth="2.5" />
            <line x1="20" y1="20" x2="33" y2="20" stroke="#94A3B8" strokeWidth="2.5" />
            <line x1="20" y1="20" x2="20" y2="33" stroke="#94A3B8" strokeWidth="2.5" />
            <line x1="20" y1="20" x2="7" y2="20" stroke="#94A3B8" strokeWidth="2.5" />
            <circle cx="20" cy="20" r="4.5" fill="#38BDF8" />
            <circle cx="20" cy="7" r="3.5" fill="#E2E8F0" />
            <circle cx="33" cy="20" r="3.5" fill="#E2E8F0" />
            <circle cx="20" cy="33" r="3.5" fill="#E2E8F0" />
            <circle cx="7" cy="20" r="3.5" fill="#E2E8F0" />
          </svg>
        </div>

        <span className="text-[17px] font-bold text-slate-900 tracking-tight" style={{ fontFamily: 'var(--font-sans)' }}>
          agentcli
        </span>

        {/* Thin vertical divider */}
        <div className="h-4 w-px bg-slate-300" />

        {/* Breadcrumb / Tag */}
        <span className="text-[12px] font-medium text-slate-500 font-mono">
          multi-agent-orchestrator
        </span>
      </div>

      {/* Right-aligned Live Workspace Pill */}
      <button
        onClick={() => navigate('/run')}
        className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-slate-200 bg-white text-[13px] font-medium text-slate-700 hover:bg-slate-50 hover:border-slate-300 transition-colors shadow-xs cursor-pointer"
      >
        <span>Live Workspace</span>
        <ArrowRight className="w-3.5 h-3.5 text-slate-400" />
      </button>
    </header>
  );
}



/* ── Main Landing Page Component ──────────────────────────────── */

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
      {/* 1. LAYOUT CONTAINER — Centered 1020px column */}
      <div className="max-w-[1020px] mx-auto px-6 md:px-8 py-8 md:py-12 flex flex-col min-h-full">

        {/* 2. HEADER / LOGO LOCKUP */}
        <BrandHeader />

        {/* 3. HIERARCHY — Prominent Headline & Subhead */}
        <div className="mb-10 max-w-3xl">
          <h1 className="text-[38px] font-bold text-slate-900 tracking-tight leading-[46px]">
            What should the agents do?
          </h1>
          <p className="text-[15.5px] text-slate-500 font-normal leading-relaxed mt-3">
            Submit a task instruction. The Planner agent breaks down subtasks, builds an execution DAG, and dispatches parallel worker agents in sandboxed runtimes.
          </p>
        </div>

        {/* Section Label Divider */}
        <div className="flex items-center gap-3 mb-6">
          <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider font-mono">
            AGENT ROSTER
          </span>
          <div className="flex-1 h-px bg-slate-200/80" />
        </div>

        {/* 4. AGENT GRID STRUCTURE */}
        {/* Top: Full-Width Horizontal Card for Planner (Dispatcher) */}
        <motion.div
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.2 }}
          onClick={() => navigate(`/agent/${plannerAgent.id}`)}
          className="rounded-xl border border-slate-200 bg-white p-6 card-depth hover:border-slate-300 transition-all duration-150 cursor-pointer group mb-5"
        >
          {/* Top Row: Icon + Name + Dispatcher Tag + Status */}
          <div className="flex items-center justify-between gap-4 mb-3">
            <div className="flex items-center gap-3">
              <div className="w-9 h-9 rounded-lg bg-sky-50 border border-sky-100 flex items-center justify-center flex-shrink-0 group-hover:bg-sky-100/70 transition-colors">
                <AgentIcon role={plannerAgent.id} />
              </div>
              <div>
                <div className="flex items-center gap-2">
                  <span className="text-[17px] font-semibold text-slate-900">{plannerAgent.label}</span>
                  <span className="px-2 py-0.5 rounded bg-sky-50 text-sky-700 text-[10px] font-bold tracking-wide uppercase font-mono">
                    DISPATCHER &amp; ORCHESTRATOR
                  </span>
                </div>
              </div>
            </div>
            <StatusBadge status={plannerAgent.status} />
          </div>

          {/* Description */}
          <p className="text-[13.5px] text-slate-600 leading-relaxed mb-4 max-w-4xl">
            {plannerAgent.desc}
          </p>

          {/* Bottom Row Separated by Thin Divider */}
          <div className="pt-3 border-t border-slate-100 flex items-center justify-between">
            <span className="text-[11px] font-mono text-slate-400">
              {plannerAgent.model}
            </span>
            <span className="text-[12px] font-medium text-slate-400 group-hover:text-accent transition-colors">
              Configure →
            </span>
          </div>
        </motion.div>

        {/* Workers Grid: 1x3 Grid for Coder, Auditor, Tester */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-5 mb-10">
          {workerAgents.map((agent, i) => (
            <motion.div
              key={agent.id}
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: (i + 1) * 0.05, duration: 0.2 }}
              onClick={() => navigate(`/agent/${agent.id}`)}
              className="flex flex-col text-left rounded-xl border border-slate-200 bg-white p-6 card-depth hover:border-slate-300 transition-all duration-150 cursor-pointer group"
            >
              {/* Top Row: Icon + Name + Status */}
              <div className="flex items-center gap-3 mb-3">
                <div className="w-8 h-8 rounded-lg bg-slate-100 flex items-center justify-center flex-shrink-0 group-hover:bg-slate-200/70 transition-colors">
                  <AgentIcon role={agent.id} />
                </div>
                <span className="text-[15.5px] font-semibold text-slate-900 flex-1">{agent.label}</span>
                <StatusBadge status={agent.status} />
              </div>

              {/* Description */}
              <p className="text-[13px] text-slate-600 leading-relaxed mb-4 min-h-[54px] line-clamp-3">
                {agent.desc}
              </p>

              {/* Bottom Row Separated by Thin Divider */}
              <div className="pt-3 border-t border-slate-100 flex items-center justify-between mt-auto">
                <span className="text-[11px] font-mono text-slate-400">
                  {agent.model}
                </span>
                <span className="text-[12px] font-medium text-slate-400 group-hover:text-accent transition-colors">
                  Configure →
                </span>
              </div>
            </motion.div>
          ))}
        </div>

        {/* Section Label Divider for Console */}
        <div className="flex items-center gap-3 mb-6">
          <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider font-mono">
            COMMAND CONSOLE
          </span>
          <div className="flex-1 h-px bg-slate-200/80" />
        </div>

        {/* 5. COMMAND CONSOLE — Single Bordered Container */}
        <div className="rounded-xl border border-slate-200 bg-white input-depth overflow-hidden transition-all duration-150 focus-within:border-accent/60 focus-within:ring-2 focus-within:ring-accent/15 mb-8">
          {/* Input Row with Accent Prompt Glyph '>' */}
          <div className="flex items-center gap-3 px-5 py-4">
            <span className="text-accent font-mono font-bold text-lg select-none leading-none -mt-0.5">
              &gt;
            </span>
            <input
              ref={inputRef}
              type="text"
              placeholder="Describe a task (e.g. 'Build a REST API with Express and add unit tests')"
              value={inputValue}
              onChange={(e) => setInputValue(e.target.value)}
              onKeyDown={(e) => { if (e.key === "Enter") handleSend(); }}
              onFocus={() => setShowSuggestions(true)}
              className="flex-1 text-[15px] text-slate-900 outline-none bg-transparent placeholder:text-slate-400"
            />

            {/* Mic + Send button vertically aligned */}
            <div className="flex items-center gap-2">
              <button className="p-2 text-slate-400 hover:text-slate-600 transition-colors cursor-pointer rounded-lg hover:bg-slate-100">
                <Mic className="w-4 h-4" />
              </button>
              <button
                onClick={handleSend}
                disabled={!inputValue.trim()}
                className={`w-9 h-9 flex items-center justify-center rounded-lg transition-all cursor-pointer ${
                  inputValue.trim()
                    ? "bg-accent text-white hover:bg-accent-hover shadow-xs active:scale-95"
                    : "bg-slate-100 text-slate-300 cursor-not-allowed"
                }`}
                title="Execute task"
              >
                <ArrowUp className="w-4 h-4 stroke-[2.5]" />
              </button>
            </div>
          </div>

          {/* Uploaded Files Sub-Row */}
          {uploadedFiles.length > 0 && (
            <div className="px-5 pb-3">
              <div className="flex flex-wrap gap-2">
                {uploadedFiles.map((file, i) => (
                  <div key={i} className="flex items-center gap-1.5 bg-slate-50 py-1 px-2.5 rounded-md border border-slate-200 text-xs">
                    <FileText className="w-3.5 h-3.5 text-slate-500" />
                    <span className="font-medium text-slate-700">{file}</span>
                    <button
                      onClick={() => setUploadedFiles((p) => p.filter((_, j) => j !== i))}
                      className="text-slate-400 hover:text-slate-600 cursor-pointer ml-1"
                    >
                      ✕
                    </button>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Internal Divider */}
          <div className="border-t border-slate-100" />

          {/* Function Toggles Row */}
          <div className="flex items-center gap-2 px-5 py-3 bg-slate-50/50">
            <TogglePill active={searchEnabled} onClick={() => setSearchEnabled(!searchEnabled)} icon={<Search className="w-3.5 h-3.5" />} label="Search" />
            <TogglePill active={deepResearchEnabled} onClick={() => setDeepResearchEnabled(!deepResearchEnabled)} icon={<Sparkles className="w-3.5 h-3.5" />} label="Deep Research" />
            <TogglePill active={reasonEnabled} onClick={() => setReasonEnabled(!reasonEnabled)} icon={<BrainCircuit className="w-3.5 h-3.5" />} label="Reason" />
          </div>

          {/* Internal Divider */}
          <div className="border-t border-slate-100" />

          {/* Upload Manual Plan Row */}
          <div className="px-5 py-3 bg-white">
            <button
              onClick={handleUpload}
              className="flex items-center gap-2 text-slate-500 text-[13px] font-medium hover:text-slate-800 transition-colors cursor-pointer"
            >
              {showUploadAnim ? (
                <motion.div className="flex gap-1" initial="hidden" animate="visible"
                  variants={{ hidden: {}, visible: { transition: { staggerChildren: 0.1 } } }}>
                  {[0, 1, 2].map((i) => (
                    <motion.div key={i} className="w-1.5 h-1.5 bg-accent rounded-full"
                      variants={{
                        hidden: { opacity: 0, y: 4 },
                        visible: { opacity: 1, y: 0, transition: { duration: 0.35, repeat: Infinity, repeatType: "mirror", delay: i * 0.1 } },
                      }}
                    />
                  ))}
                </motion.div>
              ) : (
                <Plus className="w-3.5 h-3.5 text-slate-400" />
              )}
              <span>Upload manual plan (JSON / YAML)</span>
            </button>
          </div>
        </div>

        {/* 6. SUGGESTIONS BLOCK */}
        <AnimatePresence>
          {showSuggestions && !inputValue.trim() && (
            <motion.div
              initial={{ opacity: 0, y: 6 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: 6 }}
              transition={{ duration: 0.15 }}
              className="mb-8"
            >
              <p className="text-[11px] font-bold text-slate-400 uppercase tracking-wider mb-3 font-mono">
                SUGGESTED TASKS
              </p>
              <div className="space-y-1">
                {suggestions.map((s, i) => (
                  <button
                    key={i}
                    onClick={() => pickSuggestion(s)}
                    className="flex items-center gap-3 w-full text-left py-2.5 px-3 hover:bg-white border border-transparent hover:border-slate-200/80 rounded-lg transition-all duration-150 cursor-pointer group"
                  >
                    <ArrowRight className="w-3.5 h-3.5 text-slate-400 group-hover:text-accent transition-colors flex-shrink-0" />
                    <span className="text-[14px] text-slate-700 group-hover:text-slate-900 font-normal">{s}</span>
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

/* ── Toggle Pill Component ────────────────────────────────────── */

function TogglePill({ active, onClick, icon, label }: {
  active: boolean; onClick: () => void; icon: React.ReactNode; label: string;
}) {
  return (
    <button
      onClick={onClick}
      className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-[12px] font-medium transition-all cursor-pointer ${
        active
          ? "bg-accent/10 border border-accent/20 text-accent"
          : "bg-slate-100/80 border border-transparent text-slate-600 hover:bg-slate-200/70 hover:text-slate-800"
      }`}
    >
      {icon}
      <span>{label}</span>
    </button>
  );
}
