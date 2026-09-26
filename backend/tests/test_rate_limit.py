"""Rate limiting applies to expensive write calls only, not dashboard reads."""

import os
import sys
import unittest
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parent.parent))

from fastapi.testclient import TestClient

import server


class RateLimitScopeTest(unittest.TestCase):
    def setUp(self):
        self._prev = os.environ.get("RATE_LIMIT_PER_MINUTE")
        os.environ["RATE_LIMIT_PER_MINUTE"] = "2"
        server._rate_limit_records.clear()
        self.client = TestClient(server.app)

    def tearDown(self):
        server._rate_limit_records.clear()
        if self._prev is None:
            os.environ.pop("RATE_LIMIT_PER_MINUTE", None)
        else:
            os.environ["RATE_LIMIT_PER_MINUTE"] = self._prev

    def test_reads_are_not_limited(self):
        for _ in range(5):
            self.assertEqual(self.client.get("/agents").status_code, 200)

    def test_writes_are_limited_and_keep_cors_headers(self):
        headers = {"Origin": "http://localhost:5173"}
        codes = [self.client.post("/plan", json={}, headers=headers).status_code for _ in range(3)]
        self.assertEqual(codes[:2], [400, 400])
        last = self.client.post("/plan", json={}, headers=headers)
        self.assertEqual(last.status_code, 429)
        self.assertEqual(last.headers.get("access-control-allow-origin"), "http://localhost:5173")


if __name__ == "__main__":
    unittest.main()
