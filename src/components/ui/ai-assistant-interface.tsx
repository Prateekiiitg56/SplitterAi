import React, { useState, useRef, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import {
  ChevronDown,
  Play,
  Check,
  Cpu,
  Trash2,
  Plus,
  Loader2,
  X,
  Sparkles,
  Send,
  User,
  Users,
  Paperclip,
} from "lucide-react";
import { AVAILABLE_MODELS, ROLE_META } from "../../data";
import { useApp } from "../../context/AppContext";
import { useUI, executionModes } from "../../context/UIContext";
import type { AgentRole, Subtask } from "../../types";
import { sendChatMessage } from "../../lib/api";
import { AgentIcon, StatusDot } from "../Badges";
import Background3D from "../Background3D";

interface ChatMessage {
  id: string;
  sender: "user" | "agent";
  role?: AgentRole;
  text: string;
  timestamp: string;
}

export function AIAssistantInterface() {
  const navigate = useNavigate();
  const { executeTaskWithPlan } = useApp();
  const { selectedModel, setSelectedModel, selectedMode, setSelectedMode } = useUI();

  // ── Single Agent & Roster State ────────────────────────────────
  const [selectedAgentRole, setSelectedAgentRole] = useState<AgentRole>("coder");
  const [agentDropdownOpen, setAgentDropdownOpen] = useState(false);
  const [modelDropdownOpen, setModelDropdownOpen] = useState(false);
  const [sessionAgents, setSessionAgents] = useState<AgentRole[]>(["coder"]);
  const [showAddAgentModal, setShowAddAgentModal] = useState(false);

  // ── Conversational Thread History ──────────────────────────────
  const [chatMessages, setChatMessages] = useState<ChatMessage[]>([]);
  const [inputValue, setInputValue] = useState("");
  const [isSending, setIsSending] = useState(false);
  const chatEndRef = useRef<HTMLDivElement>(null);

  // ── Draft Plan State ───────────────────────────────────────────
  const [isPlanning, setIsPlanning] = useState(false);
  const [draftPlan, setDraftPlan] = useState<{ taskTitle: string; subtasks: Subtask[] } | null>(null);

  useEffect(() => {
    if (chatMessages.length > 0) {
      chatEndRef.current?.scrollIntoView({ behavior: "smooth" });
    }
  }, [chatMessages.length, isSending]);

  const isMultiAgentSplitRequest = (msg: string) => {
    if (sessionAgents.length < 2) return false;
    const lower = msg.toLowerCase();
    return (
      lower.includes("split") ||
      lower.includes("together") ||
      lower.includes("divide") ||
      lower.includes("build an app") ||
      lower.includes("build a website") ||
      lower.includes("create a project")
    );
  };

  const handleSend = async (overrideText?: string) => {
    const textToSubmit = (overrideText || inputValue).trim();
    if (!textToSubmit || isSending) return;

    const ts = new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });

    const userMsg: ChatMessage = {
      id: `user-${Date.now()}`,
      sender: "user",
      text: textToSubmit,
      timestamp: ts,
    };

    setChatMessages((prev) => [...prev, userMsg]);
    setInputValue("");

    if (isMultiAgentSplitRequest(textToSubmit)) {
      setIsPlanning(true);
      setTimeout(() => {
        const generatedSubtasks: Subtask[] = sessionAgents.map((role, idx) => ({
          id: `st-${idx + 1}`,
          role: role,
          group: idx < 2 ? 1 : 2,
          instruction:
            role === "planner"
              ? `Plan architecture & subtask division for: "${textToSubmit}"`
              : role === "coder"
              ? `Write code implementation for: "${textToSubmit}"`
              : role === "auditor"
              ? `Audit code security and PEP8 compliance`
              : `Run unit tests & verify correctness`,
          status: "pending",
          steps: 0,
        }));

        setDraftPlan({ taskTitle: textToSubmit, subtasks: generatedSubtasks });
        setIsPlanning(false);
      }, 800);
      return;
    }

    setIsSending(true);
    try {
      const resp = await sendChatMessage(selectedAgentRole, textToSubmit);
      const agentMsg: ChatMessage = {
        id: `agent-${Date.now()}`,
        sender: "agent",
        role: selectedAgentRole,
        text: resp.reply,
        timestamp: resp.timestamp || ts,
      };
      setChatMessages((prev) => [...prev, agentMsg]);
    } catch (err: any) {
      const errorMsg: ChatMessage = {
        id: `agent-err-${Date.now()}`,
        sender: "agent",
        role: selectedAgentRole,
        text: `⚠️ API Error (${selectedMeta.label}): ${err?.message || "Failed to connect to LLM provider."}`,
        timestamp: ts,
      };
      setChatMessages((prev) => [...prev, errorMsg]);
    } finally {
      setIsSending(false);
    }
  };

  const handleAddAgentToSession = (role: AgentRole) => {
    if (!sessionAgents.includes(role)) {
      setSessionAgents([...sessionAgents, role]);
    }
    setShowAddAgentModal(false);
  };

  const handleConfirmAndLaunch = async () => {
    if (!draftPlan) return;
    const projectId = `proj-${Date.now()}`;
    await executeTaskWithPlan(draftPlan.taskTitle, draftPlan.subtasks);
    setDraftPlan(null);
    navigate(`/projects/${projectId}`);
  };

  const selectedMeta = ROLE_META[selectedAgentRole] || ROLE_META.coder;

  return (
    <div className="relative flex-1 flex flex-col items-center justify-center min-h-0 bg-[var(--bg)] text-[var(--text)] font-sans select-none overflow-hidden z-10">
      
      {/* 3D Constellation Node Canvas */}
      <Background3D />

      {/* Main Home Content Box */}
      <main className="relative z-10 max-w-[600px] w-full flex flex-col items-center px-6 py-8 pointer-events-none">
        <div className="contents pointer-events-auto w-full">
          
          {/* Home Mark Logo */}
          <div className="home-mark w-9 h-9 rounded-lg border border-[#2A4A66] bg-[var(--panel)] flex items-center justify-center text-[var(--accent)] mb-5 shadow-[0_0_24px_rgba(72,180,255,0.15)]">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" className="w-4 h-4">
              <circle cx="12" cy="5" r="2.4" /><circle cx="5" cy="19" r="2.4" /><circle cx="19" cy="19" r="2.4" /><path d="M12 7.4V12M12 12L6.3 17M12 12l5.7 5" />
            </svg>
          </div>

          <h1 className="home-title text-[24px] font-semibold text-center tracking-tight mb-2">
            Split the work. Run it in parallel.
          </h1>

          <p className="home-sub text-[13.5px] text-[var(--dim)] text-center max-w-[420px] mb-7 leading-relaxed">
            Talk to one agent like a normal chat, or bring more into the room when a task is ready to be divided and run at once.
          </p>

          {/* Active Chat Thread View (If messages exist) */}
          {chatMessages.length > 0 && (
            <div className="w-full max-h-[220px] overflow-y-auto mb-4 space-y-3 bg-[var(--panel)] border border-[var(--border-soft)] p-4 rounded-[var(--radius)]">
              {chatMessages.map((msg) => (
                <div key={msg.id} className={`flex gap-2.5 ${msg.sender === 'user' ? 'justify-end' : ''}`}>
                  <div className={`p-2.5 rounded-lg text-[12.5px] max-w-[85%] ${msg.sender === 'user' ? 'bg-[var(--accent)] text-[#070A10] font-medium' : 'bg-[var(--panel-2)] text-[var(--text)] border border-[var(--border)]'}`}>
                    {msg.text}
                  </div>
                </div>
              ))}
              {isSending && (
                <div className="text-[11.5px] font-mono text-[var(--faint)] flex items-center gap-2">
                  <Loader2 size={12} className="animate-spin text-[var(--accent)]" />
                  <span>{selectedMeta.label} is replying...</span>
                </div>
              )}
              <div ref={chatEndRef} />
            </div>
          )}

          {/* Input Box Wrapper */}
          <div className="home-inputwrap w-full">
            
            {/* Agent & Model Picker Header Bar */}
            <div className="agent-picker flex items-center justify-between gap-2 mb-2 text-[11.5px] text-[var(--faint)]">
              <div className="relative">
                <button
                  onClick={() => setAgentDropdownOpen(!agentDropdownOpen)}
                  className="agent-name text-[var(--dim)] hover:text-[var(--text)] flex items-center gap-1.5 cursor-pointer font-medium"
                >
                  <AgentIcon role={selectedAgentRole} size={13} className="text-[var(--accent)]" />
                  <span>{selectedMeta.label} — {selectedModel.label}</span>
                  <span className="caret text-[9px]">▾</span>
                </button>

                {agentDropdownOpen && (
                  <div className="absolute left-0 top-full mt-1.5 w-[220px] rounded-md border border-[var(--border)] bg-[var(--panel)] shadow-2xl p-1.5 z-50">
                    <div className="font-mono text-[10px] uppercase text-[var(--faint)] px-2 py-1 font-bold">
                      SELECT ACTIVE AGENT
                    </div>
                    {(["planner", "coder", "auditor", "tester"] as AgentRole[]).map((r) => {
                      const meta = ROLE_META[r];
                      const isSel = selectedAgentRole === r;
                      return (
                        <button
                          key={r}
                          onClick={() => {
                            setSelectedAgentRole(r);
                            setAgentDropdownOpen(false);
                          }}
                          className={`flex items-center justify-between w-full p-2 rounded text-[12px] font-medium text-left cursor-pointer ${
                            isSel ? "bg-[var(--panel-2)] text-[var(--text)]" : "hover:bg-[var(--panel-2)] text-[var(--dim)]"
                          }`}
                        >
                          <div className="flex items-center gap-2">
                            <AgentIcon role={r} size={13} />
                            <span>{meta.label}</span>
                          </div>
                          {isSel && <Check size={12} className="text-[var(--accent)]" />}
                        </button>
                      );
                    })}
                  </div>
                )}
              </div>

              <span className="font-mono text-[10.5px] text-[var(--faint)]">{sessionAgents.length} Active Agent(s)</span>
            </div>

            {/* Input Box Container */}
            <div className="input-box bg-[var(--panel)] border border-[var(--border)] rounded-[var(--radius)] p-3.5 flex flex-col gap-2">
              <textarea
                value={inputValue}
                onChange={(e) => setInputValue(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === "Enter" && !e.shiftKey) {
                    e.preventDefault();
                    handleSend();
                  }
                }}
                placeholder={`Message the ${selectedMeta.label} agent, or describe a task to split across a team…`}
                rows={2}
                className="w-full bg-transparent border-none text-[var(--text)] font-sans text-[13.5px] resize-none outline-none min-h-[44px] leading-relaxed placeholder:text-[var(--faint)]"
              />

              <div className="input-row flex items-center justify-between pt-2 border-t border-[var(--border-soft)]">
                <div className="input-left flex items-center gap-3.5">
                  <button
                    onClick={() => setShowAddAgentModal(true)}
                    className="text-action flex items-center gap-1.5 text-[11.5px] text-[var(--faint)] hover:text-[var(--dim)] transition-colors cursor-pointer"
                  >
                    <Plus size={12} />
                    <span>Add agent</span>
                  </button>

                  <button className="text-action flex items-center gap-1.5 text-[11.5px] text-[var(--faint)] hover:text-[var(--dim)] transition-colors cursor-pointer">
                    <Paperclip size={12} />
                    <span>Attach</span>
                  </button>
                </div>

                <button
                  onClick={() => handleSend()}
                  disabled={!inputValue.trim() || isSending}
                  className="send-btn flex items-center gap-1.5 text-[var(--text)] hover:text-[var(--accent)] hover:border-[var(--accent)] font-medium text-[12px] px-2.5 py-1 border border-[var(--border)] rounded-md transition-colors disabled:opacity-40 cursor-pointer"
                >
                  <span>Send</span>
                  <Send size={12} />
                </button>
              </div>
            </div>

            {/* Prompt Hint */}
            <div className="home-hint mt-4 text-[11.5px] text-[var(--faint)] text-center">
              Try:{" "}
              <button onClick={() => handleSend("build a login page with tests")} className="font-medium text-[var(--dim)] hover:underline cursor-pointer">
                build a login page with tests
              </button>
              ,{" "}
              <button onClick={() => handleSend("audit these three scripts")} className="font-medium text-[var(--dim)] hover:underline cursor-pointer">
                audit these three scripts
              </button>
              , or{" "}
              <button onClick={() => handleSend("split a REST API across the team")} className="font-medium text-[var(--dim)] hover:underline cursor-pointer">
                split a REST API across the team
              </button>
            </div>
          </div>
        </div>
      </main>

      {/* Plan-and-Confirm Review Drawer Modal */}
      {draftPlan && (
        <div className="fixed inset-0 bg-black/75 backdrop-blur-xs flex items-center justify-center p-4 z-50">
          <div className="bg-[var(--panel)] border border-[var(--border)] rounded-[var(--radius)] p-6 max-w-[500px] w-full space-y-4 shadow-2xl">
            <div className="flex items-center justify-between border-b border-[var(--border-soft)] pb-3">
              <h3 className="text-[15px] font-semibold text-[var(--text)] flex items-center gap-2">
                <Sparkles size={16} className="text-[var(--accent)]" />
                <span>Multi-Agent Task Split Proposed</span>
              </h3>
              <button onClick={() => setDraftPlan(null)} className="text-[var(--faint)] hover:text-[var(--text)] cursor-pointer">
                <X size={15} />
              </button>
            </div>

            <p className="text-[12.5px] text-[var(--dim)] font-mono">
              Task: "{draftPlan.taskTitle}"
            </p>

            <div className="space-y-2 max-h-[240px] overflow-y-auto font-mono text-[11.5px]">
              {draftPlan.subtasks.map((st, idx) => (
                <div key={st.id} className="p-2.5 rounded bg-[var(--panel-2)] border border-[var(--border-soft)] flex items-center justify-between gap-2">
                  <span className="truncate flex-1 text-[var(--text)]">{idx + 1}. {st.instruction}</span>
                  <span className="text-[10px] uppercase font-bold text-[var(--accent)] px-1.5 py-0.5 rounded bg-[var(--accent-dim)]">
                    {st.role}
                  </span>
                </div>
              ))}
            </div>

            <div className="flex items-center justify-end gap-2 pt-2 border-t border-[var(--border-soft)]">
              <button
                onClick={() => setDraftPlan(null)}
                className="px-3.5 py-1.5 rounded text-[12px] border border-[var(--border)] text-[var(--dim)] hover:text-[var(--text)] cursor-pointer"
              >
                Cancel
              </button>

              <button
                onClick={handleConfirmAndLaunch}
                className="px-4 py-1.5 rounded bg-[var(--accent)] text-[var(--bg)] font-semibold text-[12px] hover:opacity-90 cursor-pointer flex items-center gap-1.5"
              >
                <Play size={13} />
                <span>Start Project & Launch</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Add Agent Modal */}
      {showAddAgentModal && (
        <div className="fixed inset-0 bg-black/75 backdrop-blur-xs flex items-center justify-center p-4 z-50">
          <div className="bg-[var(--panel)] rounded-[var(--radius)] border border-[var(--border)] p-5 w-full max-w-[380px] space-y-4 shadow-2xl">
            <div className="flex items-center justify-between pb-2 border-b border-[var(--border-soft)]">
              <h3 className="text-[14.5px] font-semibold text-[var(--text)] flex items-center gap-2">
                <Plus size={15} className="text-[var(--accent)]" />
                Add Agent to Session
              </h3>
              <button onClick={() => setShowAddAgentModal(false)} className="text-[var(--faint)] hover:text-[var(--text)] cursor-pointer">
                <X size={15} />
              </button>
            </div>

            <div className="grid grid-cols-2 gap-2">
              {(["planner", "coder", "auditor", "tester"] as AgentRole[]).map((r) => {
                const isAlreadyIn = sessionAgents.includes(r);
                const meta = ROLE_META[r];

                return (
                  <button
                    key={r}
                    disabled={isAlreadyIn}
                    onClick={() => handleAddAgentToSession(r)}
                    className={`p-3 rounded border flex flex-col items-center gap-1 text-[12px] font-medium capitalize cursor-pointer transition-colors ${
                      isAlreadyIn
                        ? "border-[var(--border-soft)] bg-[var(--panel-2)] text-[var(--faint)] opacity-50 cursor-not-allowed"
                        : "border-[var(--border)] bg-[var(--panel-2)] text-[var(--text)] hover:border-[var(--accent)]"
                    }`}
                  >
                    <AgentIcon role={r} size={16} />
                    <span>{meta.label} Agent</span>
                  </button>
                );
              })}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export default AIAssistantInterface;
