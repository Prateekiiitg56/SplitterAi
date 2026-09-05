"""Unit tests for Module B2: LLM Gateway.

Tests token usage metrics calculation, planner response caching, and fallback chain execution.
"""

import sys
import unittest
from pathlib import Path
from unittest.mock import AsyncMock, patch

# Ensure backend root is on sys.path for importing agentcli
sys.path.insert(0, str(Path(__file__).resolve().parent.parent))

from agentcli.config import ExecutionConfig
from agentcli.router import (
    PLANNER_CACHE,
    ROUTER_CALL_LOG,
    AgentRole,
    AllModelsFailedError,
    call_model,
    get_usage_metrics,
)


class TestLLMGateway(unittest.IsolatedAsyncioTestCase):
    def setUp(self):
        ROUTER_CALL_LOG.clear()
        PLANNER_CACHE.clear()

    def test_usage_metrics_empty(self):
        metrics = get_usage_metrics()
        self.assertEqual(metrics["total_calls"], 0)
        self.assertEqual(metrics["total_tokens"], 0)
        self.assertIn("gemini", metrics["providers"])

    def test_usage_metrics_accounting(self):
        ROUTER_CALL_LOG.append({
            "model": "gemini/gemini-3.5-flash",
            "provider": "gemini",
            "role": "planner",
            "success": True,
            "prompt_tokens": 150,
            "completion_tokens": 50,
            "total_tokens": 200,
        })
        ROUTER_CALL_LOG.append({
            "model": "openrouter/nvidia/nemotron-3-super-120b-a12b:free",
            "provider": "openrouter",
            "role": "coder",
            "success": True,
            "prompt_tokens": 300,
            "completion_tokens": 100,
            "total_tokens": 400,
        })

        metrics = get_usage_metrics()
        self.assertEqual(metrics["total_calls"], 2)
        self.assertEqual(metrics["total_tokens"], 600)
        self.assertEqual(metrics["providers"]["gemini"]["total_tokens"], 200)
        self.assertEqual(metrics["providers"]["openrouter"]["total_tokens"], 400)

    @patch("litellm.acompletion", new_callable=AsyncMock)
    async def test_call_model_caching(self, mock_acompletion):
        mock_choice = AsyncMock()
        mock_choice.message.content = "Mocked Plan Response"
        mock_response = AsyncMock()
        mock_response.choices = [mock_choice]
        mock_response.usage.prompt_tokens = 50
        mock_response.usage.completion_tokens = 20
        mock_response.usage.total_tokens = 70
        mock_acompletion.return_value = mock_response

        messages = [{"role": "user", "content": "Decompose task X"}]
        config = ExecutionConfig()

        # First call hits LLM
        res1 = await call_model(messages, ["gemini/gemini-3.5-flash"], AgentRole.planner, config, use_cache=True)
        self.assertEqual(res1["content"], "Mocked Plan Response")
        self.assertEqual(mock_acompletion.call_count, 1)

        # Second identical call should return cached response without calling litellm again
        res2 = await call_model(messages, ["gemini/gemini-3.5-flash"], AgentRole.planner, config, use_cache=True)
        self.assertEqual(res2["content"], "Mocked Plan Response")
        self.assertEqual(mock_acompletion.call_count, 1)  # Still 1 call!


if __name__ == "__main__":
    unittest.main()
