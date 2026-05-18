"""Scripted, manual-trigger downloader for stat.gov.az .xls files.

Per vault ADR 0003. Not scheduled. MUST validate each source link against the
live stat.gov.az page and fail loudly (non-zero exit) on 404 / unexpected
response rather than producing partial data. PROJECT.md filenames are NOT
assumed to resolve (vault Rule 00 / blocker B1) — verified at build Phase 1.

Stub — implemented in build Phase 1.
"""


def main() -> None:
    raise NotImplementedError("download.py: implemented in build Phase 1")


if __name__ == "__main__":
    main()
