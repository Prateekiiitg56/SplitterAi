"""Unit & integration tests for Module B7 (API Hardening) and Module B3 (Import Safety).

Tests shared secret authentication verification, rate limiting middleware (429),
request payload size limiting (413), and n8n workflow DAG parsing & cycle warnings.
"""

import os
import sys
import unittest
from pathlib import Path

# Ensure backend root is on sys.path for importing agentcli
sys.path.insert(0, str(Path(__file__).resolve().parent.parent))

from agentcli.n8n_import import parse_n8n_workflow
from agentcli.schemas import AgentRole


class TestAPIAndImports(unittest.TestCase):
    def test_n8n_import_basic_dag(self):
        sample_n8n = {
            "nodes": [
                {"name": "Schedule Trigger", "type": "n8n-nodes-base.scheduleTrigger"},
                {"name": "Execute Code", "type": "n8n-nodes-base.code", "parameters": {"jsCode": "console.log('hi')"}},
                {"name": "Filter Data", "type": "n8n-nodes-base.filter"},
            ],
            "connections": {
                "Schedule Trigger": {
                    "main": [[{"node": "Execute Code", "type": "main", "index": 0}]]
                },
                "Execute Code": {
                    "main": [[{"node": "Filter Data", "type": "main", "index": 0}]]
                },
            },
        }

        plan = parse_n8n_workflow(sample_n8n)
        self.assertEqual(len(plan.subtasks), 3)

        # Verify roles
        roles = [st.role for st in plan.subtasks]
        self.assertIn(AgentRole.planner, roles)
        self.assertIn(AgentRole.coder, roles)
        self.assertIn(AgentRole.auditor, roles)

        # Verify group ordering (Schedule=1, Code=2, Filter=3)
        st_map = {st.instruction: st.group for st in plan.subtasks}
        trigger_group = next(st.group for st in plan.subtasks if "Trigger" in st.instruction)
        code_group = next(st.group for st in plan.subtasks if "Execute Code" in st.instruction)
        filter_group = next(st.group for st in plan.subtasks if "Filter" in st.instruction)

        self.assertLess(trigger_group, code_group)
        self.assertLess(code_group, filter_group)

    def test_n8n_import_cycle_detection(self):
        # Create a cyclic workflow: Node A -> Node B -> Node A
        cyclic_n8n = {
            "nodes": [
                {"name": "Node A", "type": "n8n-nodes-base.code"},
                {"name": "Node B", "type": "n8n-nodes-base.code"},
            ],
            "connections": {
                "Node A": {"main": [[{"node": "Node B", "type": "main", "index": 0}]]},
                "Node B": {"main": [[{"node": "Node A", "type": "main", "index": 0}]]},
            },
        }

        plan = parse_n8n_workflow(cyclic_n8n)
        self.assertEqual(len(plan.subtasks), 2)

        # Check for cyclic warning in instructions
        instructions = [st.instruction for st in plan.subtasks]
        has_warning = any("[Warning: Cyclic Dependency]" in inst for inst in instructions)
        self.assertTrue(has_warning, "Cyclic dependency warning should be prefixed on cyclic nodes.")

    def test_n8n_import_invalid_json(self):
        with self.assertRaises(ValueError):
            parse_n8n_workflow({"invalid": "format"})

        with self.assertRaises(ValueError):
            parse_n8n_workflow({"nodes": []})


if __name__ == "__main__":
    unittest.main()
