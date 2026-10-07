#!/usr/bin/env python3

import csv
import html
import re
import urllib.request
from pathlib import Path

URL = (
    "https://www.musicradar.com/news/"
    "the-30-best-bassists-of-all-time"
)

OUTPUT = Path(
    "data/musician-catalogue/"
    "editorial-rankings-musicradar-bassists.csv"
)

HEADERS = {
    "User-Agent": "Mozilla/5.0",
    "Accept-Language": "en-US,en;q=0.9",
}


def clean_heading(value):
    value = re.sub(
        r"<[^>]+>",
        " ",
        value,
    )
    value = html.unescape(value)
    value = re.sub(
        r"\s+",
        " ",
        value,
    )
    return value.strip()


def main():
    request = urllib.request.Request(
        URL,
        headers=HEADERS,
    )

    with urllib.request.urlopen(
        request,
        timeout=30,
    ) as response:
        raw = response.read().decode(
            "utf-8",
            errors="replace",
        )

    headings = re.findall(
        r"<h[1-6][^>]*>(.*?)</h[1-6]>",
        raw,
        flags=re.I | re.S,
    )

    entries = {}

    for heading in headings:
        text = clean_heading(heading)

        match = re.match(
            r"^(\d{1,2})\.\s+(.+)$",
            text,
        )

        if not match:
            continue

        rank = int(match.group(1))
        name = match.group(2).strip()

        if 1 <= rank <= 50:
            entries[rank] = name

    missing = [
        rank
        for rank in range(1, 51)
        if rank not in entries
    ]

    if missing:
        raise RuntimeError(
            f"Missing ranks: {missing}"
        )

    if len(entries) != 50:
        raise RuntimeError(
            f"Expected 50 entries, found {len(entries)}"
        )

    rows = [
        {
            "source_id":
                "musicradar_50_best_bassists_reader_poll",
            "source_rank":
                rank,
            "source_entry_name":
                entries[rank],
            "musician_name":
                entries[rank],
        }
        for rank in range(1, 51)
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
    print("Top 5:")

    for row in rows[:5]:
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
