"""Web project setup: per-project folders, stack choice, starter templates and the design guide."""

from __future__ import annotations

import re
import shutil
import uuid
from pathlib import Path

from .schemas import AgentRole, Plan

TEMPLATES_DIR = Path(__file__).resolve().parent / "templates"
STACKS = ("tailwind", "plain", "react")
DEFAULT_STACK = "tailwind"

_WEB_WORDS = re.compile(
    r"\b(web|website|webpage|web ?app|page|landing|html|css|ui|frontend|front-end|dashboard|react|tailwind|"
    r"calculator|game|form|portfolio|todo|to-do|blog|pricing|gallery|browser)\b",
    re.IGNORECASE,
)
_REACT_WORDS = re.compile(r"\b(react|jsx|tsx|vite|next\.?js)\b", re.IGNORECASE)
_PLAIN_WORDS = re.compile(
    r"\b(no framework|without (a )?framework|vanilla|plain (html|css|js|javascript)|without tailwind|no tailwind)\b",
    re.IGNORECASE,
)

STACK_NOTES = {
    "tailwind": """STACK: Tailwind CSS (browser CDN build, no npm, no build step).
Files: index.html (markup, Tailwind utility classes, and a <style type="text/tailwindcss"> block holding the @theme tokens and @layer components), app.js (behaviour, loaded as <script type="module">), plus extra pages or data files the task needs. Do not create styles.css unless a rule cannot be written with Tailwind.
Use the theme tokens (bg-bg, bg-surface, text-fg, text-muted, bg-accent, border-border, rounded-card, shadow-card...) and the .card, .btn + .btn-primary/.btn-ghost component classes instead of arbitrary hex colors.""",
    "plain": """STACK: plain HTML, CSS and JavaScript (no framework, no build step, no npm).
Files: index.html, styles.css (keep the :root design tokens at the top and use var(--token) everywhere), app.js (loaded with type="module"), plus extra pages or data files the task needs.""",
    "react": """STACK: React + Vite + Tailwind CSS v4.
Files: src/App.jsx and components under src/components/, styles in src/index.css (keep the @theme tokens there). Run `npm install` once, then `npm run build` after your changes so dist/ is up to date. The preview and the browser check load dist/index.html.""",
}


def detect_stack(task: str, requested: str | None = None) -> str:
    if requested in STACKS:
        return requested
    if _REACT_WORDS.search(task):
        return "react"
    if _PLAIN_WORDS.search(task):
        return "plain"
    return DEFAULT_STACK


def is_web_task(task: str, plan: Plan | None = None) -> bool:
    if plan and any(st.role == AgentRole.designer for st in plan.subtasks):
        return True
    return bool(_WEB_WORDS.search(task))


def new_project_dir(root: Path, task: str) -> Path:
    """A fresh folder under `root` named after the task, so projects never share files."""
    slug = "-".join(re.findall(r"[a-z0-9]+", task.lower())[:5])[:40] or "project"
    path = root / f"{slug}-{uuid.uuid4().hex[:6]}"
    path.mkdir(parents=True)
    return path


def apply_template(stack: str, workspace: Path) -> list[str]:
    """Copy the stack's starter files into an empty project. Returns the copied paths."""
    if any(workspace.iterdir()):
        return []
    source = TEMPLATES_DIR / stack
    copied = []
    for file in sorted(source.rglob("*")):
        if file.is_file():
            target = workspace / file.relative_to(source)
            target.parent.mkdir(parents=True, exist_ok=True)
            shutil.copyfile(file, target)
            copied.append(file.relative_to(source).as_posix())
    return copied


def design_context(stack: str, template_files: list[str] | None = None) -> str:
    """The design guide plus stack rules, appended to the task contract for web projects."""
    text = f"{STACK_NOTES[stack]}\n\n{(TEMPLATES_DIR / 'DESIGN_GUIDE.md').read_text(encoding='utf-8')}"
    if template_files:
        text += (
            "\n\nSTARTER FILES already in the workspace (read them first, extend them, keep their tokens): "
            + ", ".join(template_files)
        )
    return text


def planning_guidance(stack: str) -> str:
    """Extra planner rules for web tasks."""
    return f"""WEB TASKS: if the task produces a web page or browser app (a site, landing page, dashboard, calculator, game, form, tool with a UI...):
- {STACK_NOTES[stack].splitlines()[0]}
- {STACK_NOTES[stack].splitlines()[1]}
- The FIRST subtask has role "designer": it writes DESIGN.md (visual direction, the design tokens, every shared id, class/component name and state the other subtasks must use) and builds the page structure and styling. Name it after the product.
- Behaviour subtasks (role "coder") depend on the designer subtask and must read DESIGN.md and the markup first.
- Spell out the interactions the product needs in the instructions (e.g. for a calculator: chained operations, decimal, clear, backspace, divide by zero, keyboard input)."""
