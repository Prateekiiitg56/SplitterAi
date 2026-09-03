import React, { useState, useRef } from "react";
import { useNavigate } from "react-router-dom";
import {
  ChevronDown,
  Play,
  ArrowRight,
  Store,
  BarChart3,
  ClipboardList,
  Wand2,
  Check,
  Cpu,
  Folder,
} from "lucide-react";
import { AVAILABLE_MODELS } from "../../data";
import { useApp } from "../../context/AppContext";
import { useUI, executionModes } from "../../context/UIContext";

const suggestions = [
  { icon: Store, label: "Create an online store" },
  { icon: BarChart3, label: "Analyze this GitHub repository" },
  { icon: ClipboardList, label: "Create a registration form" },
  { icon: Wand2, label: "Create animation in Python" },
];

export function AIAssistantInterface() {
  const navigate = useNavigate();
  const { sessions } = useApp();
  const { selectedModel, setSelectedModel, selectedMode, setSelectedMode } = useUI();

  const [inputValue, setInputValue] = useState("");
  const [modelDropdownOpen, setModelDropdownOpen] = useState(false);
  const [modeDropdownOpen, setModeDropdownOpen] = useState(false);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  const lastSession = sessions.length > 0 ? sessions[0] : null;

  const handleSend = (overrideText?: string) => {
    const textToSubmit = (overrideText || inputValue).trim();
    if (!textToSubmit) return;

    navigate("/projects/default", {
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
    <div className="flex-1 flex flex-col justify-center items-center bg-[#0B0C10] text-neutral-200 font-sans select-none p-8 overflow-y-auto relative z-10">
      <main className="max-w-[800px] w-full flex flex-col gap-6">
        
        {/* ── 1. Header & One-Line Product Description ───────────── */}
        <div className="flex flex-col items-center text-center gap-3">
          <div className="w-14 h-14 rounded-2xl bg-[#192031] border border-white/10 flex items-center justify-center p-2.5 shadow-md mb-1">
            <img
              src="/splitterai-logo.png"
              alt="SplitterAI Logo"
              className="w-9 h-9 object-contain"
            />
          </div>

          <h1 className="text-[32px] font-bold text-white tracking-tight">
            SplitterAI Orchestrator
          </h1>

          <p className="text-[14px] text-neutral-400 max-w-[62ch] leading-relaxed">
            Decomposes software instructions into parallel multi-agent DAG execution graphs across LLM model chains.
          </p>
        </div>

        {/* ── 2. Simple "Continue" Action for Existing Project ──────── */}
        {lastSession && (
          <div className="rounded-xl border border-white/[0.08] bg-white/[0.02] p-4 flex items-center justify-between hover:border-white/[0.14] transition-colors">
            <div className="flex items-center gap-3 min-w-0">
              <div className="w-8 h-8 rounded-lg bg-indigo-500/20 border border-indigo-500/30 flex items-center justify-center text-indigo-400 flex-shrink-0">
                <Folder size={16} />
              </div>
              <div className="min-w-0">
                <div className="flex items-center gap-2">
                  <span className="text-[11px] font-mono uppercase tracking-wider text-neutral-500 font-semibold">LAST ACTIVE WORKSPACE</span>
                  <span className="text-[10.5px] font-mono px-1.5 py-0.2 rounded bg-emerald-400/10 text-emerald-400 border border-emerald-400/20 font-semibold">Active</span>
                </div>
                <p className="text-[13.5px] font-semibold text-white truncate leading-snug">
                  {lastSession.task || lastSession.workspace.split(/[/\\]/).pop()}
                </p>
              </div>
            </div>

            <button
              onClick={() => navigate(`/projects/${lastSession.id || 'default'}`)}
              className="flex items-center gap-1.5 px-3.5 py-1.5 rounded-lg bg-white/[0.06] hover:bg-white/[0.12] text-white text-[12.5px] font-semibold transition-colors cursor-pointer flex-shrink-0 ml-4"
            >
              <span>Continue Project</span>
              <ArrowRight size={13} />
            </button>
          </div>
        )}

        {/* ── 3. Start New Task Composer ──────────────────────────── */}
        <div className="rounded-2xl border border-white/10 bg-[#101218] p-5 text-left shadow-lg flex flex-col gap-3">
          <textarea
            ref={textareaRef}
            value={inputValue}
            onChange={(e) => setInputValue(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder="Instruct agents to build code, refactor functions, or run tasks..."
            rows={3}
            className="w-full bg-transparent text-[14.5px] text-white placeholder:text-neutral-500 outline-none resize-none leading-relaxed min-h-[80px]"
          />

          <div className="flex items-center justify-between pt-3 border-t border-white/[0.08] relative">
            
            {/* Interactive Model Selector */}
            <div className="relative">
              <button
                onClick={() => {
                  setModelDropdownOpen(!modelDropdownOpen);
                  setModeDropdownOpen(false);
                }}
                className="flex items-center gap-2 px-3 py-1.5 rounded-lg bg-white/[0.04] border border-white/10 hover:bg-white/[0.08] text-[12.5px] font-medium text-white transition-colors cursor-pointer"
              >
                <Cpu size={14} className="text-indigo-400" />
                <span>{selectedModel.label}</span>
                <ChevronDown size={13} className="text-neutral-400" />
              </button>

              {modelDropdownOpen && (
                <div className="absolute left-0 bottom-full mb-2 w-[280px] rounded-xl border border-white/10 bg-[#141824] shadow-xl p-1.5 z-50">
                  <div className="text-[10px] font-mono uppercase tracking-wider text-neutral-400 px-2.5 py-1.5 font-bold">
                    SELECT MODEL CHAIN
                  </div>
                  {AVAILABLE_MODELS.map((m) => (
                    <button
                      key={m.id}
                      onClick={() => {
                        setSelectedModel(m);
                        setModelDropdownOpen(false);
                      }}
                      className="flex items-center justify-between w-full p-2 rounded-lg text-[12.5px] text-left hover:bg-white/[0.06] text-white transition-colors cursor-pointer"
                    >
                      <div>
                        <div className="font-semibold">{m.label}</div>
                        <div className="text-[10.5px] text-neutral-400">{m.provider}</div>
                      </div>
                      {selectedModel.id === m.id && <Check size={14} className="text-indigo-400" />}
                    </button>
                  ))}
                </div>
              )}
            </div>

            {/* Interactive Mode Selector & Submit Action */}
            <div className="flex items-center gap-3">
              <div className="relative">
                <button
                  onClick={() => {
                    setModeDropdownOpen(!modeDropdownOpen);
                    setModelDropdownOpen(false);
                  }}
                  className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-white/[0.04] border border-white/10 hover:bg-white/[0.08] text-[12.5px] font-medium text-white transition-colors cursor-pointer"
                >
                  <selectedMode.icon size={13} className="text-indigo-400" />
                  <span>{selectedMode.label}</span>
                  <ChevronDown size={13} className="text-neutral-400" />
                </button>

                {modeDropdownOpen && (
                  <div className="absolute right-0 bottom-full mb-2 w-[300px] rounded-xl border border-white/10 bg-[#141824] shadow-xl p-1.5 z-50">
                    <div className="text-[10px] font-mono uppercase tracking-wider text-neutral-400 px-2.5 py-1.5 font-bold">
                      EXECUTION MODE
                    </div>
                    {executionModes.map((mode) => (
                      <button
                        key={mode.id}
                        onClick={() => {
                          setSelectedMode(mode);
                          setModeDropdownOpen(false);
                        }}
                        className="flex items-start gap-2.5 w-full p-2.5 rounded-lg text-left hover:bg-white/[0.06] text-white transition-colors cursor-pointer"
                      >
                        <mode.icon size={15} className="text-indigo-400 mt-0.5 flex-shrink-0" />
                        <div>
                          <div className="text-[13px] font-semibold">{mode.label}</div>
                          <div className="text-[11px] text-neutral-400 leading-snug">{mode.desc}</div>
                        </div>
                      </button>
                    ))}
                  </div>
                )}
              </div>

              <button
                onClick={() => handleSend()}
                disabled={!inputValue.trim()}
                className="flex items-center gap-2 px-5 py-2 rounded-xl bg-[#6E56CF] hover:bg-[#5E46BF] disabled:opacity-40 text-white text-[13px] font-semibold transition-all cursor-pointer shadow-md active:scale-[0.98]"
              >
                <Play size={13} />
                <span>Run Task</span>
              </button>
            </div>
          </div>
        </div>

        {/* ── 4. Suggestion Chips ─────────────────────────────────── */}
        <div className="flex flex-wrap items-center justify-center gap-2 pt-1">
          {suggestions.map((s) => (
            <button
              key={s.label}
              onClick={() => handleSend(s.label)}
              className="flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-white/[0.03] border border-white/[0.08] hover:border-white/[0.16] hover:bg-white/[0.06] text-[12.5px] text-neutral-300 transition-colors cursor-pointer"
            >
              <s.icon size={13} className="text-neutral-500" />
              <span>{s.label}</span>
            </button>
          ))}
        </div>

      </main>
    </div>
  );
}

export default AIAssistantInterface;
