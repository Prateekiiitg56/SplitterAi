import React, { useState, useRef, useEffect } from "react";
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
  Layers,
  Trash2,
  Plus,
  Loader2,
  X,
  Sparkles,
  Send,
  User,
  Users,
  Bot,
  MessageSquare,
  Zap,
} from "lucide-react";
import { AVAILABLE_MODELS, ROLE_META } from "../../data";
import { useApp } from "../../context/AppContext";
import { useUI, executionModes } from "../../context/UIContext";
import type { AgentRole, Subtask } from "../../types";
import { sendChatMessage } from "../../lib/api";
import { AgentIcon } from "../Badges";

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

  // ── 1. Single Agent Selector State ─────────────────────────────
  const [selectedAgentRole, setSelectedAgentRole] = useState<AgentRole>("coder");
  const [agentDropdownOpen, setAgentDropdownOpen] = useState(false);

  // ── 2. Active Session Agents Roster (Starts with 1 agent) ─────
  const [sessionAgents, setSessionAgents] = useState<AgentRole[]>(["coder"]);
  const [showAddAgentModal, setShowAddAgentModal] = useState(false);

  // ── 3. Conversational Thread History ───────────────────────────
  const [chatMessages, setChatMessages] = useState<ChatMessage[]>([
    {
      id: "msg-welcome",
      sender: "agent",
      role: "coder",
      text: "Hey! I'm your Coder Agent. Type a message to chat 1-on-1, or add more agents to split work in parallel.",
      timestamp: new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }),
    },
  ]);

  const [inputValue, setInputValue] = useState("");
  const [isSending, setIsSending] = useState(false);
  const chatEndRef = useRef<HTMLDivElement>(null);

  // ── 4. Plan & Confirm Split Draft State ─────────────────────────
  const [isPlanning, setIsPlanning] = useState(false);
  const [draftPlan, setDraftPlan] = useState<{ taskTitle: string; subtasks: Subtask[] } | null>(null);

  useEffect(() => {
    chatEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [chatMessages.length, isSending]);

  // Helper: Detect if message is a multi-agent split request
  const isMultiAgentSplitRequest = (msg: string) => {
    if (sessionAgents.length < 2) return false;
    const lower = msg.toLowerCase();
    return (
      lower.includes("split") ||
      lower.includes("together") ||
      lower.includes("divide") ||
      lower.includes("build an app") ||
      lower.includes("build a website") ||
      lower.includes("create a project") ||
      lower.includes("work on this task")
    );
  };

  // Handle Sending Message
  const handleSend = async (overrideText?: string) => {
    const textToSubmit = (overrideText || inputValue).trim();
    if (!textToSubmit || isSending) return;

    const ts = new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });

    // Append User Message to thread
    const userMsg: ChatMessage = {
      id: `user-${Date.now()}`,
      sender: "user",
      text: textToSubmit,
      timestamp: ts,
    };

    setChatMessages((prev) => [...prev, userMsg]);
    setInputValue("");

    // Check if multi-agent splitting should trigger (2+ agents AND split task requested)
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

    // Default 1-on-1 Conversational Turn
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

  // Add agent to session roster
  const handleAddAgentToSession = (role: AgentRole) => {
    if (!sessionAgents.includes(role)) {
      setSessionAgents([...sessionAgents, role]);
    }
    setShowAddAgentModal(false);
  };

  // Remove agent from session roster
  const handleRemoveAgentFromSession = (role: AgentRole) => {
    if (sessionAgents.length <= 1) return;
    setSessionAgents(sessionAgents.filter((r) => r !== role));
    if (selectedAgentRole === role) {
      const remaining = sessionAgents.filter((r) => r !== role);
      setSelectedAgentRole(remaining[0] || "coder");
    }
  };

  // Confirm Multi-Agent Execution Launch
  const handleConfirmAndLaunch = async () => {
    if (!draftPlan) return;
    const projectId = `proj-${Date.now()}`;
    await executeTaskWithPlan(draftPlan.taskTitle, draftPlan.subtasks);
    setDraftPlan(null);
    navigate(`/projects/${projectId}`);
  };

  const selectedMeta = ROLE_META[selectedAgentRole] || ROLE_META.coder;

  return (
    <div className="flex flex-1 min-w-0 min-h-0 bg-[#0B0C10] text-white font-sans select-none overflow-hidden relative z-10">
      
      {/* ── MAIN CHAT WORKSPACE (LEFT/CENTER) ───────────────────── */}
      <div className="flex-1 flex flex-col min-w-0 border-r border-white/[0.08] bg-[#090A0F]">
        
        {/* Chat Top Header: Agent Selector & Model Settings */}
        <div className="h-14 px-6 border-b border-white/[0.08] bg-[#101420] flex items-center justify-between flex-shrink-0">
          
          {/* Agent Picker Dropdown */}
          <div className="relative">
            <button
              onClick={() => setAgentDropdownOpen(!agentDropdownOpen)}
              className="flex items-center gap-2.5 px-3.5 py-1.5 rounded-xl bg-white/[0.04] border border-white/10 hover:bg-white/[0.08] transition-colors cursor-pointer"
            >
              <div
                className="w-6 h-6 rounded-lg flex items-center justify-center"
                style={{ backgroundColor: `${selectedMeta.color}22` }}
              >
                <AgentIcon role={selectedAgentRole} size={14} />
              </div>
              <span className="text-[13.5px] font-bold text-white">{selectedMeta.label} Agent</span>
              <ChevronDown size={14} className="text-neutral-400" />
            </button>

            {agentDropdownOpen && (
              <div className="absolute left-0 top-full mt-2 w-[220px] rounded-xl border border-white/10 bg-[#141824] shadow-xl p-1.5 z-50">
                <div className="text-[10px] font-mono uppercase tracking-wider text-neutral-400 px-2 py-1 font-bold">
                  TALK TO AGENT
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
                      className={`flex items-center justify-between w-full p-2 rounded-lg text-[12.5px] font-semibold text-left transition-colors cursor-pointer ${
                        isSel ? "bg-[#2B2358] text-white" : "hover:bg-white/[0.06] text-neutral-300"
                      }`}
                    >
                      <div className="flex items-center gap-2">
                        <AgentIcon role={r} size={14} />
                        <span>{meta.label}</span>
                      </div>
                      {isSel && <Check size={13} className="text-[#9D8CFC]" />}
                    </button>
                  );
                })}
              </div>
            )}
          </div>

          {/* Model Badge */}
          <div className="flex items-center gap-2 text-[12px] font-mono text-neutral-400">
            <Cpu size={14} className="text-[#9D8CFC]" />
            <span>Model: <strong className="text-indigo-300">{selectedModel.label}</strong></span>
          </div>
        </div>

        {/* Chat Thread Messages */}
        <div className="flex-1 overflow-y-auto p-6 space-y-4 font-sans text-[13.5px]">
          {chatMessages.map((msg) => {
            const isUser = msg.sender === "user";
            const roleMeta = msg.role ? ROLE_META[msg.role] : selectedMeta;

            return (
              <div
                key={msg.id}
                className={`flex gap-3 max-w-[80%] ${isUser ? "ml-auto flex-row-reverse" : ""}`}
              >
                <div
                  className={`w-8 h-8 rounded-xl flex items-center justify-center flex-shrink-0 text-white ${
                    isUser ? "bg-indigo-600" : "bg-[#141824] border border-white/10"
                  }`}
                  style={!isUser && roleMeta ? { backgroundColor: `${roleMeta.color}22` } : {}}
                >
                  {isUser ? <User size={15} /> : <AgentIcon role={msg.role || "coder"} size={16} />}
                </div>

                <div className="space-y-1">
                  <div className={`flex items-center gap-2 text-[11px] font-mono text-neutral-400 ${isUser ? "justify-end" : ""}`}>
                    <span className="font-bold text-white">{isUser ? "You" : `${roleMeta?.label} Agent`}</span>
                    <span>{msg.timestamp}</span>
                  </div>

                  <div
                    className={`p-3.5 rounded-2xl text-[13.5px] leading-relaxed whitespace-pre-wrap ${
                      isUser
                        ? "bg-[#6E56CF] text-white rounded-tr-none"
                        : "bg-[#141824] text-neutral-200 border border-white/10 rounded-tl-none"
                    }`}
                  >
                    {msg.text}
                  </div>
                </div>
              </div>
            );
          })}

          {isSending && (
            <div className="flex gap-3 text-neutral-400">
              <div className="w-8 h-8 rounded-xl bg-[#141824] border border-white/10 flex items-center justify-center">
                <Loader2 size={16} className="animate-spin text-[#9D8CFC]" />
              </div>
              <div className="p-3 rounded-2xl bg-[#141824] border border-white/10 text-[13px] font-mono text-neutral-400 italic">
                {selectedMeta.label} Agent is thinking...
              </div>
            </div>
          )}

          <div ref={chatEndRef} />
        </div>

        {/* Input Bar */}
        <div className="p-4 border-t border-white/[0.08] bg-[#101420] flex flex-col gap-2">
          <div className="flex items-center gap-2 bg-[#141824] border border-white/10 rounded-xl p-2.5">
            <textarea
              value={inputValue}
              onChange={(e) => setInputValue(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter" && !e.shiftKey) {
                  e.preventDefault();
                  handleSend();
                }
              }}
              placeholder={`Message ${selectedMeta.label} Agent (or type "split building website" to trigger multi-agent DAG)...`}
              rows={1}
              className="flex-1 bg-transparent text-[13.5px] text-white placeholder:text-neutral-500 outline-none resize-none"
            />

            <button
              onClick={() => handleSend()}
              disabled={!inputValue.trim() || isSending}
              className="px-3.5 py-1.5 rounded-lg bg-[#6E56CF] hover:bg-[#5E46BF] disabled:opacity-40 text-white text-[12.5px] font-semibold transition-colors cursor-pointer flex items-center gap-1.5"
            >
              <Send size={13} />
              <span>Send</span>
            </button>
          </div>

          <div className="flex items-center justify-between text-[11px] font-mono text-neutral-500 px-1">
            <span>Press Enter to send conversational message</span>
            <span>{sessionAgents.length} Agent(s) Active in Session</span>
          </div>
        </div>
      </div>

      {/* ── RIGHT-SIDE "AGENTS" PANEL ─────────────────────────────── */}
      <div className="w-[340px] flex-shrink-0 flex flex-col bg-[#101420] overflow-y-auto p-5 space-y-6">
        
        <div className="flex items-center justify-between border-b border-white/[0.08] pb-3">
          <div className="flex items-center gap-2">
            <Users size={16} className="text-[#9D8CFC]" />
            <h3 className="text-[14px] font-bold text-white uppercase tracking-wider font-mono">
              SESSION AGENTS ({sessionAgents.length})
            </h3>
          </div>

          <button
            onClick={() => setShowAddAgentModal(true)}
            className="flex items-center gap-1 px-2.5 py-1 rounded-lg bg-[#6E56CF]/20 hover:bg-[#6E56CF]/30 text-[#9D8CFC] text-[11.5px] font-semibold transition-colors cursor-pointer border border-[#6E56CF]/30"
          >
            <Plus size={12} />
            <span>Add Agent</span>
          </button>
        </div>

        {/* Explanation Banner */}
        <div className="p-3 rounded-xl bg-[#141824] border border-white/10 text-[11.5px] text-neutral-400 leading-relaxed font-mono">
          {sessionAgents.length === 1 ? (
            <p>1 agent active — chat turns are 1-on-1. Click "+ Add Agent" to bring another agent into this session for parallel work splitting.</p>
          ) : (
            <p>✨ {sessionAgents.length} agents active in session! Addressing the group with a task (e.g. "split building this website") will engage multi-agent DAG execution.</p>
          )}
        </div>

        {/* Active Agents Roster List */}
        <div className="space-y-2.5">
          {sessionAgents.map((role) => {
            const meta = ROLE_META[role];
            const isCurrentSelected = selectedAgentRole === role;

            return (
              <div
                key={role}
                onClick={() => setSelectedAgentRole(role)}
                className={`p-3.5 rounded-xl border flex items-center justify-between transition-all cursor-pointer ${
                  isCurrentSelected
                    ? "border-[#9D8CFC] bg-[#1A2032] shadow-sm"
                    : "border-white/[0.08] bg-[#141824] hover:border-white/20"
                }`}
              >
                <div className="flex items-center gap-3">
                  <div
                    className="w-8 h-8 rounded-lg flex items-center justify-center flex-shrink-0"
                    style={{ backgroundColor: `${meta.color}22` }}
                  >
                    <AgentIcon role={role} size={16} />
                  </div>

                  <div>
                    <h4 className="text-[13.5px] font-bold text-white flex items-center gap-1.5">
                      <span>{meta.label}</span>
                      {isCurrentSelected && (
                        <span className="text-[9.5px] font-mono px-1.5 py-0.2 rounded bg-indigo-500/20 text-indigo-300 font-bold">
                          Active Chat
                        </span>
                      )}
                    </h4>
                    <span className="text-[10.5px] font-mono text-neutral-400 capitalize">{meta.label} Role</span>
                  </div>
                </div>

                {sessionAgents.length > 1 && (
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      handleRemoveAgentFromSession(role);
                    }}
                    className="text-neutral-500 hover:text-red-400 p-1 cursor-pointer"
                    title="Remove from Session"
                  >
                    <X size={13} />
                  </button>
                )}
              </div>
            );
          })}
        </div>

        {/* ── PLAN-AND-CONFIRM INLINE REVIEW (Triggered when 2+ agents split work) ── */}
        {draftPlan && (
          <div className="p-4 rounded-xl border border-[#9D8CFC] bg-[#141824] space-y-3 animate-fade-in">
            <div className="flex items-center justify-between text-[12px] font-bold text-white border-b border-white/10 pb-2">
              <span className="flex items-center gap-1 text-[#9D8CFC]">
                <Zap size={13} />
                <span>MULTI-AGENT SPLIT PROPOSED</span>
              </span>
              <button onClick={() => setDraftPlan(null)} className="text-neutral-500 hover:text-white">
                <X size={12} />
              </button>
            </div>

            <p className="text-[11.5px] text-neutral-300 font-mono">
              Task: "{draftPlan.taskTitle}"
            </p>

            <div className="space-y-1.5 font-mono text-[11px]">
              {draftPlan.subtasks.map((st, i) => (
                <div key={st.id} className="p-2 rounded bg-[#101218] border border-white/5 text-neutral-300 flex items-center justify-between">
                  <span className="truncate flex-1">{i + 1}. {st.instruction}</span>
                  <span className="text-[9.5px] font-bold uppercase text-indigo-300 px-1.5 py-0.5 rounded bg-indigo-500/20 ml-2">
                    {st.role}
                  </span>
                </div>
              ))}
            </div>

            <button
              onClick={handleConfirmAndLaunch}
              className="w-full py-2 rounded-xl bg-[#6E56CF] hover:bg-[#5E46BF] text-white text-[12px] font-bold transition-colors cursor-pointer flex items-center justify-center gap-1.5 shadow-md"
            >
              <Play size={13} />
              <span>Confirm & Start Execution</span>
            </button>
          </div>
        )}
      </div>

      {/* ── ADD AGENT MODAL ─────────────────────────────────────── */}
      {showAddAgentModal && (
        <div className="fixed inset-0 bg-black/70 backdrop-blur-xs flex items-center justify-center p-4 z-50">
          <div className="bg-[#141824] rounded-2xl border border-white/10 p-6 w-full max-w-[400px] space-y-4 shadow-2xl">
            <div className="flex items-center justify-between pb-2 border-b border-white/10">
              <h3 className="text-[16px] font-bold text-white flex items-center gap-2">
                <Plus size={16} className="text-[#9D8CFC]" />
                Add Agent to Session
              </h3>
              <button onClick={() => setShowAddAgentModal(false)} className="text-neutral-500 hover:text-white">
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
                    className={`p-3 rounded-xl border flex flex-col items-center gap-1.5 text-[12px] font-bold capitalize transition-all cursor-pointer ${
                      isAlreadyIn
                        ? "border-white/5 bg-white/5 text-neutral-500 opacity-50 cursor-not-allowed"
                        : "border-white/10 bg-[#101218] text-white hover:border-[#9D8CFC] hover:bg-[#1A2032]"
                    }`}
                  >
                    <AgentIcon role={r} size={18} />
                    <span>{meta.label} Agent</span>
                    {isAlreadyIn && <span className="text-[9.5px] font-mono text-neutral-500 font-normal">Added</span>}
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
