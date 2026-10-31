"""Hourly cron entry for Undertaker.

Kiro Crew rejects shell commands that compose paths at run time, so the cron
runs this script instead. It finds backend/run-due.mjs next to this file and
runs it with Node. No model call is made.
"""

import glob
import os
import shutil
import subprocess

APP_ROOT = os.path.dirname(os.path.abspath(__file__))
RUN_DUE = os.path.join(APP_ROOT, "backend", "run-due.mjs")


def _node() -> str:
    found = shutil.which("node")
    if found:
        return found
    # The gateway service may run without the user's PATH; fall back to the
    # Node that Kiro Crew ships with its engine.
    home = os.environ.get("KIROCREW_HOME") or os.path.expanduser("~/.kiro/crew")
    bundled = sorted(glob.glob(os.path.join(home, "engines", "*", "*", "node", "*", "bin", "node")))
    if bundled:
        return bundled[-1]
    raise RuntimeError("Node.js was not found on PATH or in the Kiro Crew engine folder.")


def run_due(ctx=None) -> str:
    result = subprocess.run([_node(), RUN_DUE], capture_output=True, text=True, timeout=110, cwd=APP_ROOT)
    if result.returncode != 0:
        raise RuntimeError(result.stderr.strip() or f"run-due exited with {result.returncode}")
    return result.stdout.strip()


if __name__ == "__main__":
    print(run_due())
