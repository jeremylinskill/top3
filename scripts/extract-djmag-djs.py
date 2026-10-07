#!/usr/bin/env python3

import csv
import re
import urllib.request
from pathlib import Path

URL = (
    "https://r.jina.ai/https://"
    "djmag.com/top100djs"
)

OUTPUT = Path(
    "data/musician-catalogue/"
    "editorial-rankings-djmag-djs.csv"
)

HEADERS = {
    "User-Agent": "Mozilla/5.0",
}


def main():
    request = urllib.request.Request(
        URL,
        headers=HEADERS,
    )

    with urllib.request.urlopen(
        request,
        timeout=30,
    ) as response:
        text = response.read().decode(
            "utf-8",
            errors="replace",
        )

    pattern = re.compile(
        r"(?m)^\s*(\d{1,3})\s*$"
        r"\n+\s*##\s+"
        r"\[([^\]]+)\]"
        r"\("
        r"https://djmag\.com/"
        r"top100djs/2025/\d+/[^)]+"
        r"\)"
    )

    entries = {}

    for match in pattern.finditer(text):
        rank = int(match.group(1))
        name = match.group(2).strip()

        if 1 <= rank <= 100:
            entries[rank] = name

    missing = [
        rank
        for rank in range(1, 101)
        if rank not in entries
    ]

    if missing:
        raise RuntimeError(
            f"Missing ranks: {missing}"
        )

    if len(entries) != 100:
        raise RuntimeError(
            f"Expected 100 entries, found {len(entries)}"
        )

    rows = [
        {
            "source_id":
                "djmag_top_100_djs_2025",
            "source_rank":
                rank,
            "source_entry_name":
                entries[rank],
            "musician_name":
                entries[rank],
        }
        for rank in range(1, 101)
    ]

    OUTPUT.parent.mkdir(
        parents=True,
        exist_ok=True,
    )

    with OUTPUT.open(
        "w",
        newline="",
        encoding="utf-8",
    ) as f:
        writer = csv.DictWriter(
            f,
            fieldnames=[
                "source_id",
                "source_rank",
                "source_entry_name",
                "musician_name",
            ],
        )
        writer.writeheader()
        writer.writerows(rows)

    print("Wrote:", OUTPUT)
    print("Entries:", len(rows))
    print(
        "Rank range:",
        f'{rows[0]["source_rank"]}–'
        f'{rows[-1]["source_rank"]}',
    )

    print()
    print("Top 10:")

    for row in rows[:10]:
        print(
            f'{row["source_rank"]}: '
            f'{row["musician_name"]}'
        )

    print()
    print("Bottom 5:")

    for row in rows[-5:]:
        print(
            f'{row["source_rank"]}: '
            f'{row["musician_name"]}'
        )


if __name__ == "__main__":
    main()
