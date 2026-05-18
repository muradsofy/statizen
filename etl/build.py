"""Orchestrator: download -> parse -> validate -> write /data/*.json.

Emits the `scope` ("region" Phase 1) and `source` fields on every value row
from day one so the Phase 2 national-context layer slots in without a schema
migration (vault ADR 0004).

Stub — implemented in build Phase 1.
"""


def main() -> None:
    raise NotImplementedError("build.py: implemented in build Phase 1")


if __name__ == "__main__":
    main()
