"use client";

import { useState, useRef } from "react";
import { useNavigate } from "react-router-dom";
import {
  Plus,
  ChevronDown,
  Mic,
  Volume2,
  Clock,
  ChevronRight,
  MoreVertical,
  Bot,
  Play,
  Settings,
  FolderOpen,
  GitBranch,
  BookOpen,
  Users,
  Code,
  BarChart3,
  Infinity as InfinityIcon,
  PenTool,
} from "lucide-react";

export function AIAssistantInterface() {
  let navigate = (path: string) => { window.location.href = path; };
  try {
    const nav = useNavigate();
    if (typeof nav === "function") navigate = nav;
  } catch { /* fallback */ }

  const [inputValue, setInputValue] = useState("");
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

  const suggestions = [
    { icon: "✨", text: "Create an online store" },
    { icon: "📊", text: "Analyze this GitHub repository" },
    { icon: "🔐", text: "Create a registration form" },
    { icon: "🐍", text: "Create animation in Python" },
  ];

  const recentProjects = [
    {
      title: "Soax Dashboard",
      updated: "Updated 2h ago",
      color: "bg-[#2563EB]",
      tags: ["Next.js", "TypeScript", "Tailwind"],
    },
    {
      title: "API Service",
      updated: "Updated 1d ago",
      color: "bg-[#30A46C]",
      tags: ["Node.js", "Express", "MongoDB"],
    },
    {
      title: "Landing Page",
      updated: "Updated 2d ago",
      color: "bg-[#EAB308]",
      tags: ["React", "TypeScript", "Framer"],
    },
    {
      title: "Design System",
      updated: "Updated 3d ago",
      color: "bg-[#6E56CF]",
      tags: ["Figma", "Storybook", "CSS"],
    },
  ];

  const launchAgents = [
    {
      role: "coder",
      title: "Code Assistant",
      desc: "Write, refactor and debug code effortlessly.",
      color: "bg-[#6E56CF]",
      icon: <Code size={16} className="text-white" />,
    },
    {
      role: "auditor",
      title: "Data Analyst",
      desc: "Analyze, visualize and extract insights.",
      color: "bg-[#30A46C]",
      icon: <BarChart3 size={16} className="text-white" />,
    },
    {
      role: "tester",
      title: "DevOps Engineer",
      desc: "Deploy, monitor and manage infrastructure.",
      color: "bg-[#2563EB]",
      icon: <InfinityIcon size={16} className="text-white" />,
    },
    {
      role: "planner",
      title: "UI/UX Designer",
      desc: "Design beautiful interfaces and experiences.",
      color: "bg-[#D946EF]",
      icon: <PenTool size={16} className="text-white" />,
    },
  ];

  return (
    <div className="flex-1 overflow-y-auto bg-[#121723] text-white font-sans p-8 select-none">
      <div className="max-w-[1080px] mx-auto space-y-9">

        {/* ── 1. HERO HEADER WITH ORIGAMI MOTH ICON ───────────── */}
        <div className="flex items-center gap-5 justify-center pt-2">
          {/* Moth Icon Container */}
          <div className="w-16 h-16 rounded-2xl bg-[#192031] border border-[#2B354F] flex items-center justify-center shadow-md p-2 flex-shrink-0">
            <img
              src="/cicada-logo.png"
              alt="Cicada Logo"
              className="w-12 h-12 object-contain"
            />
          </div>

          <div>
            <p className="text-[15px] font-medium text-[#9D8CFC] tracking-tight">
              Hello Vlad, Welcome back!
            </p>
            <h1 className="text-[28px] font-bold text-white tracking-tight">
              How can I help you today?
            </h1>
          </div>
        </div>

        {/* ── 2. PROMPT COMPOSER BOX ──────────────────────────── */}
        <div className="bg-[#192031] rounded-2xl border border-[#2B354F] shadow-md overflow-hidden">
          <div className="p-4 pb-2">
            <textarea
              ref={textareaRef}
              value={inputValue}
              onChange={(e) => setInputValue(e.target.value)}
              onKeyDown={handleKeyDown}
              placeholder="Ask Diberdo to analyze my data and..."
              rows={3}
              className="w-full bg-transparent text-[14px] text-white placeholder:text-[#677294] outline-none resize-none leading-relaxed"
              style={{ minHeight: 70 }}
            />
          </div>

          <div className="flex items-center justify-between px-4 py-3 border-t border-[#232C42] bg-[#192031]">
            {/* Left Controls */}
            <div className="flex items-center gap-2">
              <button className="w-7 h-7 rounded-full border border-[#2D3754] text-[#9FA8C4] flex items-center justify-center hover:bg-[#232C42] transition-colors cursor-pointer">
                <Plus size={14} />
              </button>

              <button className="flex items-center gap-1.5 px-3 py-1 rounded-xl bg-[#232C42] border border-[#2D3754] text-[12.5px] font-medium text-white hover:border-[#3E4B73] transition-colors cursor-pointer">
                <span>GPT-5.5</span>
                <ChevronDown size={13} className="text-[#677294]" />
              </button>
            </div>

            {/* Right Controls */}
            <div className="flex items-center gap-2">
              <button className="flex items-center gap-1.5 px-3 py-1 rounded-xl bg-[#232C42] border border-[#2D3754] text-[12.5px] font-medium text-[#9FA8C4] hover:border-[#3E4B73] transition-colors cursor-pointer">
                <span>Planning</span>
                <ChevronDown size={13} className="text-[#677294]" />
              </button>

              <button className="w-7 h-7 rounded-full border border-[#2D3754] text-[#9FA8C4] flex items-center justify-center hover:bg-[#232C42] transition-colors cursor-pointer">
                <Mic size={14} />
              </button>

              <button
                onClick={handleSend}
                className="flex items-center gap-1.5 px-4 py-1.5 rounded-full bg-[#6E56CF] hover:bg-[#5E46BF] text-white text-[12.5px] font-medium transition-colors shadow-sm cursor-pointer"
              >
                <Volume2 size={13} />
                <span>Voice</span>
              </button>
            </div>
          </div>
        </div>

        {/* ── 3. SUGGESTION CHIPS ─────────────────────────────── */}
        <div className="space-y-3">
          <div className="flex flex-wrap justify-center gap-3">
            {suggestions.map((s) => (
              <button
                key={s.text}
                onClick={() => setInputValue(s.text)}
                className="flex items-center gap-2 px-4 py-2 rounded-full bg-[#192031] border border-[#2B354F] text-[12.5px] text-[#9FA8C4] hover:text-white hover:border-[#6E56CF] transition-colors cursor-pointer"
              >
                <span>{s.icon}</span>
                <span>{s.text}</span>
              </button>
            ))}
          </div>

          <div className="flex justify-center">
            <button className="flex items-center gap-1 text-[12px] text-[#677294] hover:text-[#9FA8C4] cursor-pointer">
              <span>More suggestions</span>
              <ChevronDown size={12} />
            </button>
          </div>
        </div>

        {/* ── 4. RECENT PROJECTS SECTION ──────────────────────── */}
        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Clock size={16} className="text-[#9D8CFC]" />
              <h2 className="text-[15px] font-semibold text-white">Recent Projects</h2>
            </div>
            <button
              onClick={() => navigate('/run')}
              className="text-[12.5px] font-medium text-[#9D8CFC] hover:underline cursor-pointer"
            >
              View all
            </button>
          </div>

          {/* Grid + Carousel Right Button */}
          <div className="relative flex items-center gap-3">
            <div className="grid grid-cols-4 gap-3 flex-1">
              {recentProjects.map((project) => (
                <div
                  key={project.title}
                  onClick={() => navigate('/run')}
                  className="p-4 rounded-xl bg-[#192031] border border-[#2B354F] hover:border-[#3D4A6E] transition-all cursor-pointer space-y-3 group"
                >
                  <div className="flex items-start justify-between">
                    <div className={`w-8 h-8 rounded-lg ${project.color} flex items-center justify-center text-white font-bold text-[12px]`}>
                      {project.title.charAt(0)}
                    </div>
                    <MoreVertical size={14} className="text-[#677294] group-hover:text-white" />
                  </div>

                  <div>
                    <h3 className="text-[13.5px] font-semibold text-white truncate">{project.title}</h3>
                    <p className="text-[11px] text-[#677294]">{project.updated}</p>
                  </div>

                  {/* Purple progress bar */}
                  <div className="w-full h-1 rounded-full bg-[#232C42] overflow-hidden">
                    <div className="h-full w-2/3 rounded-full bg-[#6E56CF]" />
                  </div>

                  {/* Tags */}
                  <div className="flex flex-wrap gap-1 pt-1">
                    {project.tags.map((tag) => (
                      <span key={tag} className="px-2 py-0.5 rounded bg-[#232C42] border border-[#2D3754] text-[10px] font-mono text-[#9FA8C4]">
                        {tag}
                      </span>
                    ))}
                  </div>
                </div>
              ))}
            </div>

            <button className="w-8 h-8 rounded-full bg-[#192031] border border-[#2B354F] text-[#9FA8C4] hover:text-white flex items-center justify-center flex-shrink-0 cursor-pointer">
              <ChevronRight size={16} />
            </button>
          </div>
        </div>

        {/* ── 5. LAUNCH AGENTS SECTION ────────────────────────── */}
        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <div>
              <div className="flex items-center gap-2">
                <Bot size={16} className="text-[#9D8CFC]" />
                <h2 className="text-[15px] font-semibold text-white">Launch Agents</h2>
              </div>
              <p className="text-[12px] text-[#677294] mt-0.5">
                AI agents ready to help you build, analyze and deploy.
              </p>
            </div>
            <button
              onClick={() => navigate('/agent/planner')}
              className="flex items-center gap-1.5 text-[12.5px] font-medium text-[#9D8CFC] hover:underline cursor-pointer"
            >
              <Settings size={13} />
              <span>Manage Agents</span>
            </button>
          </div>

          <div className="relative flex items-center gap-3">
            <div className="grid grid-cols-4 gap-3 flex-1">
              {launchAgents.map((agent) => (
                <div
                  key={agent.title}
                  onClick={() => navigate(`/agent/${agent.role}`)}
                  className="p-4 rounded-xl bg-[#192031] border border-[#2B354F] hover:border-[#3D4A6E] transition-all cursor-pointer space-y-3 flex flex-col justify-between"
                >
                  <div className="flex items-start gap-3">
                    <div className={`w-9 h-9 rounded-xl ${agent.color} flex items-center justify-center flex-shrink-0`}>
                      {agent.icon}
                    </div>
                    <div className="min-w-0">
                      <h3 className="text-[13.5px] font-semibold text-white truncate">{agent.title}</h3>
                      <p className="text-[11.5px] text-[#9FA8C4] line-clamp-2 leading-tight mt-0.5">{agent.desc}</p>
                    </div>
                  </div>

                  <div className="flex items-center justify-between pt-2">
                    <span className="flex items-center gap-1.5 text-[11px] text-[#30A46C] font-medium">
                      <span className="w-1.5 h-1.5 rounded-full bg-[#30A46C]" />
                      <span>Online</span>
                    </span>

                    <div className="w-6 h-6 rounded-full bg-[#6E56CF] text-white flex items-center justify-center cursor-pointer hover:bg-[#5E46BF] transition-colors">
                      <Play size={11} className="ml-0.5" fill="white" />
                    </div>
                  </div>
                </div>
              ))}
            </div>

            <button className="w-8 h-8 rounded-full bg-[#192031] border border-[#2B354F] text-[#9FA8C4] hover:text-white flex items-center justify-center flex-shrink-0 cursor-pointer">
              <ChevronRight size={16} />
            </button>
          </div>
        </div>

        {/* ── 6. QUICK ACTION BAR (BOTTOM) ────────────────────── */}
        <div className="p-3 rounded-2xl bg-[#192031] border border-[#2B354F] grid grid-cols-5 divide-x divide-[#2B354F]">
          {[
            { icon: <Plus size={16} className="text-[#9D8CFC]" />, title: 'New Project', sub: 'Start from scratch' },
            { icon: <FolderOpen size={16} className="text-[#9D8CFC]" />, title: 'Open Project', sub: 'Browse workspace' },
            { icon: <GitBranch size={16} className="text-[#9D8CFC]" />, title: 'Import Repository', sub: 'From GitHub, GitLab' },
            { icon: <BookOpen size={16} className="text-[#9D8CFC]" />, title: 'Documentation', sub: 'Read the docs' },
            { icon: <Users size={16} className="text-[#9D8CFC]" />, title: 'Community', sub: 'Join the community' },
          ].map((item) => (
            <button
              key={item.title}
              onClick={() => navigate('/run')}
              className="flex items-center gap-3 px-4 py-2 hover:bg-[#222B40] transition-colors cursor-pointer text-left rounded-lg"
            >
              <div className="w-8 h-8 rounded-lg bg-[#232C42] border border-[#2D3754] flex items-center justify-center flex-shrink-0">
                {item.icon}
              </div>
              <div className="min-w-0">
                <p className="text-[12.5px] font-semibold text-white truncate">{item.title}</p>
                <p className="text-[10.5px] text-[#677294] truncate">{item.sub}</p>
              </div>
            </button>
          ))}
        </div>

      </div>
    </div>
  );
}
