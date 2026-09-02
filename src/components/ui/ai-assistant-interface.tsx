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
  CheckCircle2,
  XCircle,
  Cpu,
  ArrowRight,
  Code,
  ShieldCheck,
  TestTube,
  LayoutDashboard,
} from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";

/* ── Agent data ───────────────────────────────────────────────── */

type AgentStatus = "active" | "idle" | "error";

interface AgentCard {
  id: string;
  role: string;
  label: string;
  desc: string;
  color: string;
  bg: string;
  icon: React.ReactNode;
  status: AgentStatus;
  model?: string;
  currentTask?: string;
  runs: number;
  successRate: number;
}

const agents: AgentCard[] = [
  {
    id: "planner",
    role: "planner",
    label: "Planner",
    desc: "Decomposes tasks into subtasks and assigns them to workers",
    color: "#7C3AED",
    bg: "#7C3AED14",
    icon: <LayoutDashboard className="w-5 h-5" />,
    status: "idle",
    model: "gemini/gemini-2.5-flash",
    runs: 8,
    successRate: 100,
  },
  {
    id: "coder",
    role: "coder",
    label: "Coder",
    desc: "Writes, edits, and runs code using sandboxed tools",
    color: "#1A73E8",
    bg: "#1A73E814",
    icon: <Code className="w-5 h-5" />,
    status: "active",
    model: "groq/llama-3.3-70b-versatile",
    currentTask: "Creating factorial.py with input validation",
    runs: 24,
    successRate: 92,
  },
  {
    id: "auditor",
    role: "auditor",
    label: "Auditor",
    desc: "Reviews code for bugs, security issues, and quality",
    color: "#E8710A",
    bg: "#E8710A14",
    icon: <ShieldCheck className="w-5 h-5" />,
    status: "active",
    model: "gemini/gemini-2.5-flash",
    currentTask: "Reviewing scripts for PEP 8 compliance",
    runs: 9,
    successRate: 100,
  },
  {
    id: "tester",
    role: "tester",
    label: "Tester",
    desc: "Writes and runs tests, verifies correctness",
    color: "#0E9F6E",
    bg: "#0E9F6E14",
    icon: <TestTube className="w-5 h-5" />,
    status: "active",
    model: "groq/llama-3.3-70b-versatile",
    currentTask: "Running all scripts and verifying output",
    runs: 11,
    successRate: 82,
  },
];

const taskSuggestions = [
  "Create a REST API with Express and add tests",
  "Audit the login page for XSS vulnerabilities",
  "Write a Python CLI tool with argument parsing",
  "Build three independent utility scripts in parallel",
  "Fix the auth middleware and test the fix",
];

/* ── Component ────────────────────────────────────────────────── */

export function AIAssistantInterface() {
  const navigate = useNavigate();
  const [inputValue, setInputValue] = useState("");
  const [searchEnabled, setSearchEnabled] = useState(false);
  const [deepResearchEnabled, setDeepResearchEnabled] = useState(false);
  const [reasonEnabled, setReasonEnabled] = useState(false);
  const [uploadedFiles, setUploadedFiles] = useState<string[]>([]);
  const [showUploadAnimation, setShowUploadAnimation] = useState(false);
  const [showSuggestions, setShowSuggestions] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  const handleUploadFile = () => {
    setShowUploadAnimation(true);
    setTimeout(() => {
      setUploadedFiles((prev) => [...prev, `plan-${prev.length + 1}.json`]);
      setShowUploadAnimation(false);
    }, 1200);
  };

  const handleSendMessage = () => {
    if (inputValue.trim()) {
      navigate("/run");
    }
  };

  const handleSuggestionSelect = (suggestion: string) => {
    setInputValue(suggestion);
    setShowSuggestions(false);
    inputRef.current?.focus();
  };

  return (
    <div className="flex-1 flex flex-col items-center justify-center bg-white p-6 overflow-y-auto">
      <div className="w-full max-w-3xl mx-auto flex flex-col items-center">

        {/* Animated logo */}
        <div className="mb-6 w-16 h-16 relative">
          <svg
            xmlns="http://www.w3.org/2000/svg"
            fill="none"
            viewBox="0 0 200 200"
            width="100%"
            height="100%"
          >
            <g clipPath="url(#cs_clip_1_ellipse-12)">
              <mask
                id="cs_mask_1_ellipse-12"
                style={{ maskType: "alpha" }}
                width="200" height="200" x="0" y="0"
                maskUnits="userSpaceOnUse"
              >
                <path fill="#fff" fillRule="evenodd"
                  d="M100 150c27.614 0 50-22.386 50-50s-22.386-50-50-50-50 22.386-50 50 22.386 50 50 50zm0 50c55.228 0 100-44.772 100-100S155.228 0 100 0 0 44.772 0 100s44.772 100 100 100z"
                  clipRule="evenodd" />
              </mask>
              <g mask="url(#cs_mask_1_ellipse-12)">
                <path fill="#fff" d="M200 0H0v200h200V0z" />
                <path fill="#1A73E8" fillOpacity="0.25" d="M200 0H0v200h200V0z" />
                <g filter="url(#filter0_f_844_2811)" className="animate-gradient">
                  <path fill="#1A73E8" d="M110 32H18v68h92V32z" />
                  <path fill="#7C3AED" d="M188-24H15v98h173v-98z" />
                  <path fill="#0E9F6E" d="M175 70H5v156h170V70z" />
                  <path fill="#E8710A" d="M230 51H100v103h130V51z" />
                </g>
              </g>
            </g>
            <defs>
              <filter id="filter0_f_844_2811" width="385" height="410" x="-75" y="-104"
                colorInterpolationFilters="sRGB" filterUnits="userSpaceOnUse">
                <feFlood floodOpacity="0" result="BackgroundImageFix" />
                <feBlend in="SourceGraphic" in2="BackgroundImageFix" result="shape" />
                <feGaussianBlur result="effect1_foregroundBlur_844_2811" stdDeviation="40" />
              </filter>
              <clipPath id="cs_clip_1_ellipse-12">
                <path fill="#fff" d="M0 0H200V200H0z" />
              </clipPath>
            </defs>
          </svg>
        </div>

        {/* Welcome */}
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.3 }}
          className="mb-8 text-center"
        >
          <h1 className="text-2xl font-bold bg-clip-text text-transparent bg-gradient-to-r from-blue-600 to-blue-400 mb-1">
            What should the agents do?
          </h1>
          <p className="text-gray-400 text-sm">
            Describe a task — the planner will decompose it and assign workers
          </p>
        </motion.div>

        {/* ── Agent cards ─────────────────────────────────────── */}
        <div className="w-full grid grid-cols-2 sm:grid-cols-4 gap-3 mb-6">
          {agents.map((agent, i) => (
            <motion.button
              key={agent.id}
              initial={{ opacity: 0, y: 12 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: i * 0.06, duration: 0.25 }}
              onClick={() => navigate(`/agent/${agent.role}`)}
              className="group relative flex flex-col items-center gap-2.5 p-4 rounded-xl border border-gray-200 bg-white hover:border-gray-300 transition-all text-center cursor-pointer"
            >
              {/* Status dot */}
              {agent.status === "active" && (
                <span
                  className="absolute top-2.5 right-2.5 w-2 h-2 rounded-full animate-pulse-dot"
                  style={{ backgroundColor: agent.color }}
                />
              )}

              {/* Icon */}
              <div
                className="w-10 h-10 rounded-xl flex items-center justify-center"
                style={{ backgroundColor: agent.bg, color: agent.color }}
              >
                {agent.icon}
              </div>

              {/* Label + status */}
              <div>
                <p className="text-sm font-medium text-gray-800">{agent.label}</p>
                <p className="text-[10px] mt-0.5" style={{
                  color: agent.status === "active" ? agent.color : "#9CA3AF",
                  fontWeight: 500,
                }}>
                  {agent.status === "active" ? "Active" : agent.status === "error" ? "Error" : "Idle"}
                </p>
              </div>

              {/* Current task on hover */}
              {agent.currentTask && (
                <div className="absolute inset-0 rounded-xl bg-white/95 flex flex-col items-center justify-center p-3 opacity-0 group-hover:opacity-100 transition-opacity duration-150">
                  <Loader2 size={14} className="animate-spin mb-1.5" style={{ color: agent.color }} />
                  <p className="text-[11px] text-gray-600 leading-snug text-center">{agent.currentTask}</p>
                </div>
              )}

              {/* Model at bottom */}
              <p className="text-[9px] text-gray-400 truncate max-w-full" style={{ fontFamily: "monospace" }}>
                {agent.model}
              </p>
            </motion.button>
          ))}
        </div>

        {/* ── Input area ──────────────────────────────────────── */}
        <div className="w-full bg-white border border-gray-200 rounded-xl shadow-sm overflow-hidden mb-4">
          <div className="p-4">
            <input
              ref={inputRef}
              type="text"
              placeholder="Describe a task for the agents…"
              value={inputValue}
              onChange={(e) => setInputValue(e.target.value)}
              onKeyDown={(e) => { if (e.key === "Enter") handleSendMessage(); }}
              onFocus={() => setShowSuggestions(true)}
              className="w-full text-gray-700 text-base outline-none placeholder:text-gray-400"
            />
          </div>

          {/* Uploaded plan files */}
          {uploadedFiles.length > 0 && (
            <div className="px-4 pb-3">
              <div className="flex flex-wrap gap-2">
                {uploadedFiles.map((file, index) => (
                  <div key={index} className="flex items-center gap-2 bg-gray-50 py-1 px-2 rounded-md border border-gray-200">
                    <FileText className="w-3 h-3 text-blue-600" />
                    <span className="text-xs text-gray-700">{file}</span>
                    <button
                      onClick={() => setUploadedFiles((prev) => prev.filter((_, i) => i !== index))}
                      className="text-gray-400 hover:text-gray-600 cursor-pointer"
                    >
                      <svg xmlns="http://www.w3.org/2000/svg" width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                        <line x1="18" y1="6" x2="6" y2="18" />
                        <line x1="6" y1="6" x2="18" y2="18" />
                      </svg>
                    </button>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Toggle buttons + send */}
          <div className="px-4 py-3 flex items-center justify-between">
            <div className="flex items-center gap-2">
              <button
                onClick={() => setSearchEnabled(!searchEnabled)}
                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-medium transition-colors cursor-pointer ${
                  searchEnabled ? "bg-blue-50 text-blue-600" : "bg-gray-100 text-gray-400 hover:bg-gray-200"
                }`}
              >
                <Search className="w-3.5 h-3.5" />
                <span>Search</span>
              </button>
              <button
                onClick={() => setDeepResearchEnabled(!deepResearchEnabled)}
                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-medium transition-colors cursor-pointer ${
                  deepResearchEnabled ? "bg-blue-50 text-blue-600" : "bg-gray-100 text-gray-400 hover:bg-gray-200"
                }`}
              >
                <Sparkles className="w-3.5 h-3.5" />
                <span>Deep Research</span>
              </button>
              <button
                onClick={() => setReasonEnabled(!reasonEnabled)}
                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-medium transition-colors cursor-pointer ${
                  reasonEnabled ? "bg-blue-50 text-blue-600" : "bg-gray-100 text-gray-400 hover:bg-gray-200"
                }`}
              >
                <BrainCircuit className="w-3.5 h-3.5" />
                <span>Reason</span>
              </button>
            </div>
            <div className="flex items-center gap-2">
              <button className="p-2 text-gray-400 hover:text-gray-600 transition-colors cursor-pointer">
                <Mic className="w-4 h-4" />
              </button>
              <button
                onClick={handleSendMessage}
                disabled={!inputValue.trim()}
                className={`w-8 h-8 flex items-center justify-center rounded-full transition-colors cursor-pointer ${
                  inputValue.trim()
                    ? "bg-blue-600 text-white hover:bg-blue-700"
                    : "bg-gray-100 text-gray-400 cursor-not-allowed"
                }`}
              >
                <ArrowUp className="w-4 h-4" />
              </button>
            </div>
          </div>

          {/* Upload manual plan */}
          <div className="px-4 py-2 border-t border-gray-100">
            <button
              onClick={handleUploadFile}
              className="flex items-center gap-2 text-gray-500 text-sm hover:text-gray-800 transition-colors cursor-pointer"
            >
              {showUploadAnimation ? (
                <motion.div className="flex space-x-1" initial="hidden" animate="visible"
                  variants={{ hidden: {}, visible: { transition: { staggerChildren: 0.1 } } }}>
                  {[0, 1, 2].map((i) => (
                    <motion.div key={i} className="w-1.5 h-1.5 bg-blue-600 rounded-full"
                      variants={{
                        hidden: { opacity: 0, y: 5 },
                        visible: { opacity: 1, y: 0, transition: { duration: 0.4, repeat: Infinity, repeatType: "mirror", delay: i * 0.1 } },
                      }}
                    />
                  ))}
                </motion.div>
              ) : (
                <Plus className="w-4 h-4" />
              )}
              <span>Upload Manual Plan (JSON / YAML)</span>
            </button>
          </div>
        </div>

        {/* ── Task suggestions ────────────────────────────────── */}
        <AnimatePresence>
          {showSuggestions && !inputValue.trim() && (
            <motion.div
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: "auto" }}
              exit={{ opacity: 0, height: 0 }}
              className="w-full mb-4 overflow-hidden"
            >
              <div className="bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden">
                <div className="p-3 border-b border-gray-100">
                  <h3 className="text-xs font-medium text-gray-500">Try a task</h3>
                </div>
                <ul className="divide-y divide-gray-100">
                  {taskSuggestions.map((suggestion, index) => (
                    <motion.li
                      key={index}
                      initial={{ opacity: 0 }}
                      animate={{ opacity: 1 }}
                      transition={{ delay: index * 0.03 }}
                      onClick={() => handleSuggestionSelect(suggestion)}
                      className="px-3 py-2.5 hover:bg-gray-50 cursor-pointer transition-colors"
                    >
                      <div className="flex items-center gap-3">
                        <ArrowRight className="w-3.5 h-3.5 text-blue-500" />
                        <span className="text-sm text-gray-700">{suggestion}</span>
                      </div>
                    </motion.li>
                  ))}
                </ul>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </div>
  );
}
