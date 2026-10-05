"""Tiny stdio MCP server used by tests/test_integrations.py."""

from mcp.server.mcpserver import MCPServer

server = MCPServer("echo")


@server.tool()
def add(a: int, b: int) -> int:
    """Add two numbers."""
    return a + b


@server.tool()
def shout(text: str) -> str:
    """Uppercase the text."""
    return text.upper()


if __name__ == "__main__":
    server.run()
