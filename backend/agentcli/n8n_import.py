"""n8n Workflow Import — parse n8n workflow export JSON into SplitterAI Plan.

Maps n8n node types to SplitterAI AgentRole (coder, auditor, planner, tester, unassigned),
derives subtask instructions from node names & parameters, and calculates DAG group numbers.
"""

from __future__ import annotations

from typing import Any
from .schemas import AgentRole, Plan, Subtask

# Best-guess n8n node type -> SplitterAI AgentRole lookup table
TYPE_ROLE_MAP: dict[str, AgentRole] = {
    # Coder
    "n8n-nodes-base.code": AgentRole.coder,
    "n8n-nodes-base.function": AgentRole.coder,
    "n8n-nodes-base.functionItem": AgentRole.coder,
    "n8n-nodes-base.executeCommand": AgentRole.coder,
    "n8n-nodes-base.httpRequest": AgentRole.coder,
    "n8n-nodes-base.postgres": AgentRole.coder,
    "n8n-nodes-base.mySql": AgentRole.coder,

    # Auditor
    "n8n-nodes-base.if": AgentRole.auditor,
    "n8n-nodes-base.switch": AgentRole.auditor,
    "n8n-nodes-base.filter": AgentRole.auditor,
    "n8n-nodes-base.crypto": AgentRole.auditor,

    # Planner
    "n8n-nodes-base.scheduleTrigger": AgentRole.planner,
    "n8n-nodes-base.manualTrigger": AgentRole.planner,
    "n8n-nodes-base.webhook": AgentRole.planner,
    "n8n-nodes-base.start": AgentRole.planner,
    "n8n-nodes-base.set": AgentRole.planner,
}


def derive_instruction(node: dict[str, Any]) -> str:
    """Derive human-readable instruction string from an n8n node name and parameters."""
    name = node.get("name", "Unnamed Node")
    node_type = str(node.get("type", ""))
    params = node.get("parameters", {}) or {}

    if "httpRequest" in node_type:
        method = params.get("method", "GET")
        url = params.get("url", "")
        if url:
            return f"HTTP Request: {method} {url}"
        return f"HTTP Request: {name}"

    if "code" in node_type or "function" in node_type:
        js_code = params.get("jsCode") or params.get("pythonCode") or params.get("code")
        if js_code and isinstance(js_code, str):
            snippet = js_code.strip().split("\n")[0][:60]
            return f"Execute Code '{name}': {snippet}"
        return f"Execute Code: {name}"

    if "if" in node_type or "switch" in node_type or "filter" in node_type:
        return f"Evaluate Condition ({name})"

    if "trigger" in node_type.lower() or "webhook" in node_type.lower():
        return f"Trigger Event: {name}"

    return f"{name}"


def parse_n8n_workflow(raw_json: dict[str, Any]) -> Plan:
    """Parse n8n export JSON dictionary into a SplitterAI Plan.

    Args:
        raw_json: Parsed n8n workflow JSON containing 'nodes' and 'connections'.

    Returns:
        Plan: SplitterAI Plan object with decomposed Subtasks.

    Raises:
        ValueError: If JSON structure is invalid or missing required n8n schema.
    """
    if not isinstance(raw_json, dict) or "nodes" not in raw_json or not isinstance(raw_json.get("nodes"), list):
        raise ValueError("Invalid n8n export format: JSON must be an object containing a 'nodes' array.")

    nodes_list = raw_json.get("nodes", [])
    connections = raw_json.get("connections", {}) or {}

    if not nodes_list:
        raise ValueError("n8n workflow contains no nodes.")

    # Map n8n node names to node dicts
    node_by_name: dict[str, dict[str, Any]] = {n.get("name"): n for n in nodes_list if n.get("name")}

    # Build dependency graph: target_name -> set of source_node_names
    parents: dict[str, set[str]] = {n_name: set() for n_name in node_by_name}

    if isinstance(connections, dict):
        for source_name, conn_data in connections.items():
            if not isinstance(conn_data, dict):
                continue
            for conn_type, outputs in conn_data.items():
                if not isinstance(outputs, list):
                    continue
                for output_group in outputs:
                    if not isinstance(output_group, list):
                        continue
                    for target_item in output_group:
                        if isinstance(target_item, dict):
                            target_name = target_item.get("node")
                            if target_name in parents:
                                parents[target_name].add(source_name)

    # Compute topological group numbers (same group = parallel execution)
    group_map: dict[str, int] = {}
    cyclic_nodes: set[str] = set()

    def get_node_group(n_name: str, visited: set[str]) -> int:
        if n_name in group_map:
            return group_map[n_name]
        if n_name in visited:
            cyclic_nodes.add(n_name)
            return 1  # Cycle safety fallback

        visited.add(n_name)
        node_parents = parents.get(n_name, set())
        if not node_parents:
            group_map[n_name] = 1
            return 1

        parent_groups = [get_node_group(p, visited.copy()) for p in node_parents]
        max_parent_group = max(parent_groups) if parent_groups else 0
        group = max_parent_group + 1
        group_map[n_name] = group
        return group

    for name in node_by_name:
        get_node_group(name, set())

    # Build Subtasks list
    subtasks: list[Subtask] = []
    idx = 1

    sorted_names = sorted(node_by_name.keys(), key=lambda nm: (group_map.get(nm, 1), nm))

    for name in sorted_names:
        node = node_by_name[name]
        node_type = str(node.get("type", ""))
        role = TYPE_ROLE_MAP.get(node_type, AgentRole.unassigned)
        instruction = derive_instruction(node)
        if name in cyclic_nodes:
            instruction = f"[Warning: Cyclic Dependency] {instruction}"
        group = group_map.get(name, 1)

        subtask = Subtask(
            id=f"t{idx}",
            role=role,
            group=group,
            instruction=instruction,
        )
        subtasks.append(subtask)
        idx += 1

    return Plan(subtasks=subtasks)

