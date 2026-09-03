"use client";

import React, { useState, useRef } from "react";
import { useNavigate } from "react-router-dom";
import {
  ChevronDown,
  Settings2,
  Mic,
  Send,
  Plus,
  ArrowUpRight,
  MoreVertical,
  Store,
  BarChart3,
  ClipboardList,
  Wand2,
  Code2,
  Boxes,
  PenTool,
  Check,
  Cpu,
  Layers,
  Zap,
  Search,
  ShieldCheck,
  Play,
} from "lucide-react";
import { AVAILABLE_MODELS } from "../../data";

const recentProjects = [
  {
    initial: "S",
    color: "#5B8DEF",
    name: "Soax Dashboard",
    updated: "Updated 2h ago",
    progress: 72,
    tags: ["Next.js", "TypeScript", "Tailwind"],
  },
  {
    initial: "A",
    color: "#39C08A",
    name: "API Service",
    updated: "Updated 1d ago",
    progress: 58,
    tags: ["Node.js", "Express", "MongoDB"],
  },
  {
    initial: "L",
    color: "#E8A23D",
    name: "Landing Page",
    updated: "Updated 2d ago",
    progress: 90,
    tags: ["React", "TypeScript", "Framer"],
  },
  {
    initial: "D",
    color: "#9B6BE0",
    name: "Design System",
    updated: "Updated 3d ago",
    progress: 84,
    tags: ["Figma", "Storybook", "CSS"],
  },
];

const launchAgents = [
  {
    role: "coder",
    icon: Code2,
    color: "#7C6FF0",
    name: "Code Assistant",
    desc: "Write, refactor and debug code effortlessly.",
  },
  {
    role: "auditor",
    icon: BarChart3,
    color: "#39C08A",
    name: "Data Analyst",
    desc: "Analyze, visualize and extract insights.",
  },
  {
    role: "tester",
    icon: Boxes,
    color: "#3E8DF0",
    name: "DevOps Engineer",
    desc: "Deploy, monitor and manage infrastructure.",
  },
  {
    role: "planner",
    icon: PenTool,
    color: "#E05FA8",
    name: "UI/UX Designer",
    desc: "Design beautiful interfaces and experiences.",
  },
];

const suggestions = [
  { icon: Store, label: "Create an online store" },
  { icon: BarChart3, label: "Analyze this GitHub repository" },
  { icon: ClipboardList, label: "Create a registration form" },
  { icon: Wand2, label: "Create animation in Python" },
];

const executionModes = [
  { id: 'Planning', label: 'Planning Mode', desc: 'Decomposes task into DAG graph of parallel workers', icon: Layers },
  { id: 'Fast Execution', label: 'Fast Execution', desc: 'Direct single-agent tool execution without graph', icon: Zap },
  { id: 'Deep Research', label: 'Deep Research', desc: 'Multi-source search & architecture synthesis', icon: Search },
  { id: 'Code Audit', label: 'Code Audit', desc: 'PEP 8 quality & OWASP security vulnerability audit', icon: ShieldCheck },
];

function SectionHeading({ children, action }: { children: React.ReactNode; action?: React.ReactNode }) {
  return (
    <div className="flex items-center justify-between mb-4 select-none">
      <h2 className="text-[18px] font-semibold text-white tracking-tight">
        {children}
      </h2>
      {action}
    </div>
  );
}

export function AIAssistantInterface() {
  const navigate = useNavigate();

  const [inputValue, setInputValue] = useState("");
  const [selectedModel, setSelectedModel] = useState(AVAILABLE_MODELS[0]);
  const [modelDropdownOpen, setModelDropdownOpen] = useState(false);
  const [selectedMode, setSelectedMode] = useState(executionModes[0]);
  const [modeDropdownOpen, setModeDropdownOpen] = useState(false);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  const handleSend = (overrideText?: string) => {
    const textToSubmit = (overrideText || inputValue).trim();
    if (!textToSubmit) return;

    navigate("/run", {
      state: {
        task: textToSubmit,
        model: selectedModel.id,
        mode: selectedMode.id,
      },
    });
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  return (
    <div className="flex-1 overflow-y-auto bg-[#0B0C10] text-neutral-200 font-sans select-none">
      <main className="px-8 py-8 max-w-[1200px] w-full mx-auto flex flex-col gap-8">
        
        {/* ── 1. Recent Projects ─────────────────────────────────── */}
        <section>
          <SectionHeading
            action={
              <button
                onClick={() => navigate('/run')}
                className="text-[13px] text-indigo-400 hover:text-indigo-300 flex items-center gap-1 cursor-pointer font-semibold transition-colors"
              >
                View all
                <ArrowUpRight size={13} />
              </button>
            }
          >
            Recent Projects
          </SectionHeading>

          <div className="grid grid-cols-4 gap-4">
            {recentProjects.map((p) => (
              <div
                key={p.name}
                onClick={() => navigate('/run')}
                className="rounded-xl border border-white/[0.08] bg-white/[0.02] p-5 flex flex-col justify-between gap-4 hover:border-white/[0.16] hover:bg-white/[0.03] transition-all cursor-pointer min-h-[176px] shadow-xs"
              >
                <div className="flex items-start justify-between">
                  <div
                    className="w-8 h-8 rounded-lg flex items-center justify-center text-[13px] font-bold text-white shadow-2xs"
                    style={{ backgroundColor: p.color }}
                  >
                    {p.initial}
                  </div>
                  <button className="p-1 rounded text-neutral-500 hover:text-white transition-colors" title="Options">
                    <MoreVertical size={15} />
                  </button>
                </div>

                <div>
                  <div className="text-[14px] font-semibold text-white truncate leading-snug">{p.name}</div>
                  <div className="text-[12px] text-neutral-500 mt-0.5">{p.updated}</div>
                </div>

                <div className="h-1.5 rounded-full bg-white/[0.06] overflow-hidden">
                  <div
                    className="h-full rounded-full transition-all duration-300"
                    style={{ width: `${p.progress}%`, backgroundColor: p.color }}
                  />
                </div>

                <div className="flex flex-wrap gap-1.5 pt-0.5">
                  {p.tags.map((t) => (
                    <span
                      key={t}
                      className="text-[11px] font-mono px-2 py-0.5 rounded-md bg-white/[0.05] text-neutral-400 border border-white/[0.04]"
                    >
                      {t}
                    </span>
                  ))}
                </div>
              </div>
            ))}
          </div>
        </section>

        {/* ── 2. Launch Agents ───────────────────────────────────── */}
        <section>
          <SectionHeading
            action={
              <button
                onClick={() => navigate('/agent/planner')}
                className="flex items-center gap-1.5 text-[13px] text-neutral-400 hover:text-neutral-200 cursor-pointer transition-colors font-medium"
              >
                <Settings2 size={14} />
                Manage Agents
              </button>
            }
          >
            Launch Agents
          </SectionHeading>

          <p className="text-[13px] text-neutral-500 -mt-2.5 mb-4 leading-relaxed max-w-[80ch]">
            AI agents ready to help you build, analyze and deploy.
          </p>

          <div className="grid grid-cols-4 gap-4">
            {launchAgents.map((a) => (
              <button
                key={a.name}
                onClick={() => navigate(`/agent/${a.role}`)}
                className="rounded-xl border border-white/[0.08] bg-white/[0.02] p-5 flex flex-col justify-between gap-3 text-left hover:border-white/[0.16] hover:bg-white/[0.03] transition-all cursor-pointer min-h-[156px] shadow-xs"
              >
                <div
                  className="w-9 h-9 rounded-lg flex items-center justify-center shadow-2xs"
                  style={{ backgroundColor: `${a.color}22` }}
                >
                  <a.icon size={17} style={{ color: a.color }} strokeWidth={1.75} />
                </div>

                <div>
                  <div className="text-[14px] font-semibold text-white">{a.name}</div>
                  <div className="text-[12.5px] text-neutral-400 mt-1 leading-relaxed line-clamp-2">
                    {a.desc}
                  </div>
                </div>
              </button>
            ))}
          </div>
        </section>

        {/* ── 3. Interactive Prompt Composer (Hero Section) ──────── */}
        <section className="pt-2">
          <div className="rounded-2xl border border-white/[0.08] bg-white/[0.02] p-8 flex flex-col items-center text-center shadow-md">
            
            {/* SplitterAI Logo Badge */}
            <div className="w-12 h-12 rounded-xl bg-[#192031] border border-white/10 flex items-center justify-center mb-4 p-2 shadow-xs">
              <img
                src="/splitterai-logo.png"
                alt="SplitterAI Logo"
                className="w-8 h-8 object-contain"
              />
            </div>

            <div className="text-[13px] text-indigo-400 mb-1 font-semibold tracking-tight">
              Hello Vlad, welcome back
            </div>

            <h1 className="text-[28px] font-bold text-white tracking-tight mb-6">
              How can I help you today?
            </h1>

            {/* Prompt Container */}
            <div className="w-full max-w-[720px]">
              <div className="rounded-xl border border-white/10 bg-[#101218] p-4.5 text-left shadow-xs flex flex-col gap-3">
                <textarea
                  ref={textareaRef}
                  value={inputValue}
                  onChange={(e) => setInputValue(e.target.value)}
                  onKeyDown={handleKeyDown}
                  placeholder="Ask SplitterAI agents to build code, analyze repositories, or run tasks..."
                  rows={2}
                  className="w-full bg-transparent text-[14px] text-white placeholder:text-neutral-500 outline-none resize-none leading-relaxed min-h-[64px]"
                />

                <div className="flex items-center justify-between pt-3 border-t border-white/[0.06] relative">
                  
                  {/* Interactive Model Selector Dropdown */}
                  <div className="relative">
                    <button
                      onClick={() => {
                        setModelDropdownOpen(!modelDropdownOpen);
                        setModeDropdownOpen(false);
                      }}
                      className="flex items-center gap-1.5 text-[13px] text-neutral-200 border border-white/10 rounded-lg px-3.5 py-1.5 hover:border-white/20 transition-colors cursor-pointer font-semibold bg-[#141824]"
                    >
                      <Cpu size={14} className="text-[#9D8CFC]" />
                      <span>{selectedModel.label}</span>
                      <ChevronDown size={13} className="text-neutral-500" />
                    </button>

                    {modelDropdownOpen && (
                      <div className="absolute left-0 bottom-full mb-2 w-[300px] rounded-xl bg-[#141824] border border-white/10 shadow-2xl p-1.5 space-y-1 z-50 text-left">
                        <div className="px-3 py-1.5 text-[10px] font-mono font-bold uppercase tracking-wider text-neutral-500">
                          SELECT ACTIVE MODEL
                        </div>
                        {AVAILABLE_MODELS.map((m) => (
                          <button
                            key={m.id}
                            onClick={() => {
                              setSelectedModel(m);
                              setModelDropdownOpen(false);
                            }}
                            className={`w-full flex items-center justify-between px-3 py-2 rounded-lg text-left transition-colors cursor-pointer ${
                              selectedModel.id === m.id
                                ? "bg-[#2B2358] text-white border border-[#48398C]"
                                : "hover:bg-white/[0.04] text-neutral-300 hover:text-white"
                            }`}
                          >
                            <div>
                              <p className="text-[12.5px] font-semibold leading-tight">{m.label}</p>
                              <p className="text-[10px] font-mono text-neutral-500 mt-0.5">{m.provider}</p>
                            </div>
                            {selectedModel.id === m.id && (
                              <Check size={14} className="text-[#9D8CFC] flex-shrink-0" />
                            )}
                          </button>
                        ))}
                      </div>
                    )}
                  </div>

                  <div className="flex items-center gap-3">
                    
                    {/* Interactive Mode Selector Dropdown */}
                    <div className="relative">
                      <button
                        onClick={() => {
                          setModeDropdownOpen(!modeDropdownOpen);
                          setModelDropdownOpen(false);
                        }}
                        className="text-[13px] text-neutral-300 border border-white/10 rounded-lg px-3.5 py-1.5 flex items-center gap-1.5 hover:border-white/20 transition-colors cursor-pointer font-semibold bg-[#141824]"
                      >
                        <selectedMode.icon size={13} className="text-[#9D8CFC]" />
                        <span>{selectedMode.id}</span>
                        <ChevronDown size={13} className="text-neutral-500" />
                      </button>

                      {modeDropdownOpen && (
                        <div className="absolute right-0 bottom-full mb-2 w-[320px] rounded-xl bg-[#141824] border border-white/10 shadow-2xl p-1.5 space-y-1 z-50 text-left">
                          <div className="px-3 py-1.5 text-[10px] font-mono font-bold uppercase tracking-wider text-neutral-500">
                            SELECT EXECUTION MODE
                          </div>
                          {executionModes.map((mode) => (
                            <button
                              key={mode.id}
                              onClick={() => {
                                setSelectedMode(mode);
                                setModeDropdownOpen(false);
                              }}
                              className={`w-full flex items-start gap-2.5 px-3 py-2 rounded-lg text-left transition-colors cursor-pointer ${
                                selectedMode.id === mode.id
                                  ? "bg-[#2B2358] text-white border border-[#48398C]"
                                  : "hover:bg-white/[0.04] text-neutral-300 hover:text-white"
                              }`}
                            >
                              <mode.icon size={15} className="text-[#9D8CFC] mt-0.5 flex-shrink-0" />
                              <div className="flex-1">
                                <p className="text-[12.5px] font-semibold leading-tight">{mode.label}</p>
                                <p className="text-[10.5px] text-neutral-400 mt-0.5 leading-relaxed">{mode.desc}</p>
                              </div>
                              {selectedMode.id === mode.id && (
                                <Check size={14} className="text-[#9D8CFC] flex-shrink-0 mt-0.5" />
                              )}
                            </button>
                          ))}
                        </div>
                      )}
                    </div>

                    {/* Mic button */}
                    <button className="p-2 text-neutral-400 hover:text-white cursor-pointer transition-colors rounded-lg hover:bg-white/[0.04]" title="Voice mic">
                      <Mic size={16} strokeWidth={1.75} />
                    </button>

                    {/* Send / Run Task Action Button */}
                    <button
                      onClick={() => handleSend()}
                      disabled={!inputValue.trim()}
                      className="flex items-center gap-2 text-[13px] text-white bg-[#6E56CF] hover:bg-[#5E46BF] border border-indigo-500/30 rounded-full px-5 py-2 font-semibold transition-all cursor-pointer shadow-sm active:scale-[0.98] disabled:opacity-40"
                    >
                      <Play size={13} className="fill-current" />
                      <span>Run Task</span>
                    </button>
                  </div>
                </div>
              </div>

              {/* Suggestion Chips */}
              <div className="flex flex-wrap items-center justify-center gap-2.5 mt-5">
                {suggestions.map((s) => (
                  <button
                    key={s.label}
                    onClick={() => {
                      setInputValue(s.label);
                      handleSend(s.label);
                    }}
                    className="flex items-center gap-2 text-[12.5px] font-medium text-neutral-300 border border-white/10 rounded-full px-4 py-1.5 hover:border-white/25 hover:text-white transition-colors cursor-pointer bg-white/[0.01]"
                  >
                    <s.icon size={13} strokeWidth={1.75} className="text-neutral-400" />
                    {s.label}
                  </button>
                ))}
                <button className="flex items-center gap-1 text-[12.5px] font-medium text-neutral-500 px-2.5 py-1.5 hover:text-neutral-300 cursor-pointer">
                  More suggestions
                  <ChevronDown size={13} />
                </button>
              </div>
            </div>

          </div>
        </section>

      </main>
    </div>
  );
}
