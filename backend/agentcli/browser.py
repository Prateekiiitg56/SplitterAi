"""browser_check tool: open a workspace page in headless Chromium, drive it, and report what broke.

Serves the workspace over a local HTTP server (so ES modules and fetch() work), then collects
console errors, uncaught exceptions and failed requests, runs the agent's interaction steps,
checks for horizontal overflow at desktop and mobile widths, and optionally saves screenshots
that the worker attaches for the model to look at.
"""

from __future__ import annotations

import functools
import threading
from http.server import SimpleHTTPRequestHandler, ThreadingHTTPServer
from pathlib import Path
from typing import Any

from .sandbox import Sandbox

SCREENSHOT_DIR = ".splitter/screenshots"
SCREENSHOT_MARK = "SCREENSHOT: "
VIEWPORTS = {"desktop": (1280, 800), "mobile": (390, 844)}
ACTION_TIMEOUT_MS = 3000
LOAD_TIMEOUT_MS = 15000
MAX_ACTIONS = 40


class _QuietHandler(SimpleHTTPRequestHandler):
    def log_message(self, *args: Any) -> None:
        pass


def _serve_root(root: Path, path: str) -> tuple[Path, str] | str:
    """Vite projects are checked from their build output; everything else from the workspace."""
    if (root / "package.json").exists() and (root / "vite.config.js").exists() and path in ("", "index.html"):
        if not (root / "dist" / "index.html").exists():
            return "Error: this is a Vite project and dist/index.html is missing. Run `npm run build` first."
        return root / "dist", "index.html"
    return root, path or "index.html"


def _run_action(page: Any, step: dict) -> str:
    kind = str(step.get("action", "")).lower()
    selector = step.get("selector")
    value = "" if step.get("value") is None else str(step.get("value"))
    label = f"{kind}({selector or ''}{', ' + repr(value) if value else ''})"
    try:
        if kind == "click":
            page.click(selector, timeout=ACTION_TIMEOUT_MS)
        elif kind == "fill":
            page.fill(selector, value, timeout=ACTION_TIMEOUT_MS)
        elif kind == "press":
            if selector:
                page.press(selector, value, timeout=ACTION_TIMEOUT_MS)
            else:
                page.keyboard.press(value)
        elif kind == "expect_text":
            text = page.inner_text(selector, timeout=ACTION_TIMEOUT_MS) if selector else page.inner_text("body")
            actual = page.input_value(selector) if not text.strip() and selector else text
            if value not in actual:
                return f"FAIL {label}: found {actual.strip()[:200]!r}"
        elif kind == "expect_visible":
            if not page.is_visible(selector):
                return f"FAIL {label}: element is not visible"
        elif kind == "wait":
            page.wait_for_timeout(min(int(value or 300), 3000))
        else:
            return f"FAIL {label}: unknown action (use click, fill, press, expect_text, expect_visible, wait)"
        return f"ok   {label}"
    except Exception as e:
        return f"FAIL {label}: {str(e).splitlines()[0][:200]}"


def browser_check(sandbox: Sandbox, path: str = "index.html", actions: list | None = None,
                  screenshot: bool = False) -> str:
    try:
        from playwright.sync_api import sync_playwright
    except ImportError:
        return "Skipped: Playwright is not installed on the server (pip install playwright && playwright install chromium)."

    root = sandbox.resolve_path(".")
    served = _serve_root(root, path)
    if isinstance(served, str):
        return served
    serve_dir, page_path = served
    sandbox.resolve_path(str((serve_dir / page_path).relative_to(root)))  # refuses escapes
    if not (serve_dir / page_path).is_file():
        return f"Error: {page_path} does not exist"

    server = ThreadingHTTPServer(("127.0.0.1", 0), functools.partial(_QuietHandler, directory=str(serve_dir)))
    threading.Thread(target=server.serve_forever, daemon=True).start()
    url = f"http://127.0.0.1:{server.server_address[1]}/{page_path}"
    lines: list[str] = [f"Loaded {page_path}"]
    try:
        with sync_playwright() as p:
            browser = p.chromium.launch()
            try:
                for name, (width, height) in VIEWPORTS.items():
                    page = browser.new_page(viewport={"width": width, "height": height})
                    problems: list[str] = []
                    page.on("console", lambda m: m.type == "error" and problems.append(f"console error: {m.text[:300]}"))
                    page.on("pageerror", lambda e: problems.append(f"uncaught exception: {str(e)[:300]}"))
                    page.on("requestfailed", lambda r: problems.append(f"request failed: {r.url} ({r.failure})"))
                    page.on("response", lambda r: r.status >= 400 and problems.append(f"HTTP {r.status}: {r.url}"))
                    page.goto(url, wait_until="networkidle", timeout=LOAD_TIMEOUT_MS)

                    if name == "desktop":
                        results = [_run_action(page, step) for step in (actions or [])[:MAX_ACTIONS] if isinstance(step, dict)]
                        if results:
                            lines.append("Actions:")
                            lines += [f"  {r}" for r in results]
                    overflow = page.evaluate("document.documentElement.scrollWidth - window.innerWidth")
                    if overflow > 1:
                        problems.append(f"page scrolls horizontally by {overflow}px (content wider than the viewport)")
                    if screenshot:
                        shot = root / SCREENSHOT_DIR / f"{name}.jpg"
                        shot.parent.mkdir(parents=True, exist_ok=True)
                        page.screenshot(path=str(shot), type="jpeg", quality=70, full_page=True)
                        lines.append(f"{SCREENSHOT_MARK}{SCREENSHOT_DIR}/{name}.jpg")
                    lines.append(f"{name} {width}x{height}: " + ("no problems" if not problems else "PROBLEMS"))
                    lines += [f"  - {msg}" for msg in dict.fromkeys(problems)]
                    page.close()
            finally:
                browser.close()
    except Exception as e:
        lines.append(f"Error: browser check failed: {str(e).splitlines()[0][:300]}")
    finally:
        server.shutdown()
        server.server_close()
    return "\n".join(lines)


TOOL_DEFINITION = {
    "type": "function",
    "function": {
        "name": "browser_check",
        "description": (
            "Open a page of the workspace in a real headless browser (desktop 1280px and mobile 390px). "
            "Reports console errors, uncaught exceptions, failed requests and horizontal overflow, runs your "
            "interaction steps on the desktop page, and with screenshot=true shows you screenshots of both widths. "
            "Vite projects are checked from dist/ (run `npm run build` first)."
        ),
        "parameters": {
            "type": "object",
            "properties": {
                "path": {"type": "string", "description": "Page to open, relative to the workspace. Default index.html."},
                "actions": {
                    "type": "array",
                    "description": (
                        "Steps run in order, e.g. [{\"action\":\"click\",\"selector\":\"[data-key='7']\"}, "
                        "{\"action\":\"press\",\"value\":\"Enter\"}, {\"action\":\"expect_text\",\"selector\":\"#display\",\"value\":\"14\"}]. "
                        "action is one of click, fill, press, expect_text, expect_visible, wait."
                    ),
                    "items": {
                        "type": "object",
                        "properties": {
                            "action": {"type": "string"},
                            "selector": {"type": "string"},
                            "value": {"type": "string"},
                        },
                        "required": ["action"],
                    },
                },
                "screenshot": {"type": "boolean", "description": "Capture desktop and mobile screenshots for you to review."},
            },
            "required": [],
        },
    },
}
