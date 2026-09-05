"""Unit tests for Module B4: Orchestration & Worker.

Tests group execution, step timeout handling, and cancellation policies.
"""

import asyncio
import sys
import tempfile
import unittest
from pathlib import Path
from unittest.mock import AsyncMock, patch

# Ensure backend root is on sys.path for importing agentcli
sys.path.insert(0, str(Path(__file__).resolve().parent.parent))

from agentcli.config import ExecutionConfig
from agentcli.orchestrator import Orchestrator
from agentcli.sandbox import Sandbox
from agentcli.schemas import AgentRole, Plan, Subtask, SubtaskStatus
from agentcli.worker import AgentWorker


class TestOrchestratorAndWorker(unittest.IsolatedAsyncioTestCase):
    def setUp(self):
        self.tmp_dir = tempfile.TemporaryDirectory(prefix="orch_test_")
        self.tmp_workspace = Path(self.tmp_dir.name).resolve()
        self.sandbox = Sandbox(self.tmp_workspace)
        self.config = ExecutionConfig()

    def tearDown(self):
        self.tmp_dir.cleanup()

    @patch("agentcli.worker.call_model", new_callable=AsyncMock)
    async def test_worker_step_timeout(self, mock_call_model):
        # Simulate a hanging LLM call that times out
        async def slow_call(*args, **kwargs):
            await asyncio.sleep(5)
            return {"content": "done"}

        mock_call_model.side_effect = slow_call
        self.config.step_timeout = 1  # 1 second step timeout

        worker = AgentWorker(AgentRole.planner, self.config, self.sandbox)
        subtask = Subtask(id="t1", role=AgentRole.planner, group=1, instruction="Test instruction")

        res_subtask = await worker.run(subtask)
        self.assertEqual(res_subtask.status, SubtaskStatus.error)
        self.assertIn("timed out after 1s", res_subtask.error or "")

    @patch("agentcli.orchestrator.Orchestrator._run_subtask", new_callable=AsyncMock)
    async def test_orchestrator_group_execution(self, mock_run):
        # Setup mock subtask runs
        async def side_effect(st):
            st.status = SubtaskStatus.success
            st.output = f"Result for {st.id}"
            return st

        mock_run.side_effect = side_effect

        plan = Plan(subtasks=[
            Subtask(id="t1", role=AgentRole.planner, group=1, instruction="Task 1"),
            Subtask(id="t2", role=AgentRole.coder, group=1, instruction="Task 2"),
            Subtask(id="t3", role=AgentRole.auditor, group=2, instruction="Task 3"),
        ])

        orchestrator = Orchestrator(self.config, self.sandbox)
        result = await orchestrator.execute(plan)

        self.assertEqual(result.status, "done")
        self.assertEqual(len(result.subtasks), 3)
        self.assertEqual(result.results["t1"], "Result for t1")

    @patch("agentcli.orchestrator.Orchestrator._run_subtask", new_callable=AsyncMock)
    async def test_orchestrator_abort_on_group_error(self, mock_run):
        # Fail Group 1 task
        async def side_effect(st):
            if st.group == 1:
                st.status = SubtaskStatus.error
                st.error = "Group 1 failed"
            else:
                st.status = SubtaskStatus.success
            return st

        mock_run.side_effect = side_effect
        self.config.abort_on_group_error = True

        plan = Plan(subtasks=[
            Subtask(id="t1", role=AgentRole.planner, group=1, instruction="Task 1"),
            Subtask(id="t2", role=AgentRole.coder, group=2, instruction="Task 2"),
        ])

        orchestrator = Orchestrator(self.config, self.sandbox)
        result = await orchestrator.execute(plan)

        self.assertEqual(result.status, "error")
        # Group 2 should be cancelled
        t2_res = next(s for s in result.subtasks if s.id == "t2")
        self.assertEqual(t2_res.status, SubtaskStatus.error)
        self.assertIn("Cancelled due to prerequisite group failure", t2_res.error or "")


if __name__ == "__main__":
    unittest.main()
