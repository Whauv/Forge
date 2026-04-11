# Agents

This folder contains the backend agent implementations used by Forge.

- `ingest_agent.py` ingests repos, docs, and raw text into the vector store.
- `analysis_agent.py` and `architect_agent.py` turn retrieved context into structured plans.
- `coder_agent.py` and `tester_agent.py` generate diffs and validate them.
- `deploy_agent.py` and `feedback_agent.py` handle PR creation and solution-template feedback capture.
- `utils.py` contains shared Gemini and payload helpers.
