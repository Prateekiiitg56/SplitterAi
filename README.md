# AgentCLI — Multi-Agent AI Orchestration Console

A production-grade AI Agent Orchestration Dashboard and Developer Operations Console built with **React**, **TypeScript**, **TailwindCSS**, and **Three.js**.

AgentCLI provides a unified control center for decomposing complex prompt instructions, orchestrating multi-agent DAGs (Directed Acyclic Graphs), and inspecting real-time sandboxed worker execution logs.

---

## 🌟 Key Features

- **Root Planner & Worker Architecture**: Visual hierarchy connecting the **Planner** (Dispatcher & Orchestrator) to specialized worker agents (**Coder**, **Auditor**, **Tester**).
- **Interactive 3D Three.js Background**: Ambient, responsive 3D particle constellation and geometric wireframe nodes with interactive mouse parallax (`#244855`, `#E64833`, `#874F41`, `#90AEAD`).
- **Aesthetic Cinematic Palette**: Dark-and-light split layout featuring a Deep Teal dark navigation rail paired with a warm cream content canvas.
- **Task Composer**: Command console input with keyboard shortcuts (`Ctrl ↵` / `⌘ ↵`) for submitting task instructions.
- **Execution Log Streaming**: Live log viewer with status indicators, sandbox security alerts, and model fallback tracking.
- **Agent Roster & Configuration**: Dedicated detail views for each agent's metrics, success rates, subtasks history, and model assignments.
- **API Quotas & File Explorer**: Built-in monitoring for model provider rate limits and sandboxed workspace files.

---

## 🎨 Color Palette & Design System

The application utilizes a curated 5-color aesthetic palette inspired by modern developer infrastructure products (Linear, Vercel, Raycast):

| Swatch | Color Name | Hex Code | Purpose |
| :--- | :--- | :--- | :--- |
| 🟦 | **Deep Teal** | `#244855` | Sidebar background, primary text, brand badges |
| 🔴 | **Coral Accent** | `#E64833` | Primary CTA buttons, active status, node accents |
| 🟤 | **Warm Brown** | `#874F41` | Secondary text, borders, subtle indicators |
| 🟢 | **Sage** | `#90AEAD` | Metadata, model tags, muted labels |
| 🍦 | **Warm Cream** | `#FBE9D0` | Content background canvas, sidebar text |

---

## 🛠️ Tech Stack

- **Framework**: [React 19](https://react.dev/) + [TypeScript](https://www.typescriptlang.org/)
- **Build Tool**: [Vite](https://vitejs.dev/)
- **Styling**: [TailwindCSS v4](https://tailwindcss.com/)
- **3D Visualizations**: [Three.js](https://threejs.org/)
- **Icons**: [Lucide React](https://lucide.dev/)
- **Routing**: [React Router v7](https://reactrouter.com/)

---

## 📁 Project Structure

```text
SplitterAi/
├── src/
│   ├── components/
│   │   ├── ui/
│   │   │   └── ai-assistant-interface.tsx  # Main Home Console interface
│   │   ├── Background3D.tsx                # Interactive Three.js background
│   │   ├── Sidebar.tsx                     # 264px Navigation Rail
│   │   ├── TopBar.tsx                      # Header & Breadcrumb Navigation
│   │   ├── TaskInput.tsx                   # Task input component
│   │   ├── PlanView.tsx                    # Multi-agent subtask DAG view
│   │   ├── LogStream.tsx                   # Real-time execution log terminal
│   │   ├── FileExplorer.tsx                # Sandboxed workspace file tree
│   │   ├── QuotaBar.tsx                    # API rate-limit monitor
│   │   └── Badges.tsx                      # Shared status & role badges
│   ├── pages/
│   │   ├── HomePage.tsx                    # Home Console page wrapper
│   │   └── AgentPage.tsx                   # Individual agent detail page
│   ├── data.ts                             # Mock domain models & log streams
│   ├── App.tsx                             # App routes & shell layout
│   ├── index.css                           # Global styles & design system tokens
│   └── main.tsx                            # React entry point
├── package.json                            # Package dependencies & scripts
├── tsconfig.json                           # TypeScript configuration
└── vite.config.ts                          # Vite build configuration
```

---

## 🚀 Getting Started

### Prerequisites

Ensure you have **Node.js** (v18 or higher) and **npm** installed on your machine.

### Installation

1. **Clone the repository**:
   ```bash
   git clone https://github.com/Prateekiiitg56/SplitterAi.git
   cd SplitterAi
   ```

2. **Install dependencies**:
   ```bash
   npm install
   ```

3. **Start the development server**:
   ```bash
   npm run dev
   ```

4. Open your browser and navigate to `http://localhost:5173`.

---

## 📜 Available Scripts

In the project directory, you can run:

- `npm run dev` — Starts the local Vite development server with Hot Module Replacement (HMR).
- `npm run build` — Compiles TypeScript and builds the production-ready bundle into the `dist/` folder.
- `npm run preview` — Locally previews the built production app.

---

## 💡 Navigation Shortcuts

- `Home (Console)` → `/`
- `Run Execution` → `/run`
- `Agent Roster` → `/agent/planner`
- `Submit Task` → `Ctrl + Enter` / `⌘ + Enter`

---

## 📄 License

This project is open-source and available under the [MIT License](LICENSE).
