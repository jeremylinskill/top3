#!/usr/bin/env python3

import csv
import html
import re
import urllib.request
from pathlib import Path

URL = (
    "https://au.rollingstone.com/music/music-lists/"
    "50-greatest-bassists-of-all-time-13565/"
)

OUTPUT = Path(
    "data/musician-catalogue/"
    "editorial-rankings-rolling-stone-bassists.csv"
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

    headings = [
        clean_heading(value)
        for value in re.findall(
            r"<h[1-6][^>]*>(.*?)</h[1-6]>",
            raw,
            flags=re.I | re.S,
        )
    ]

    headings = [
        value
        for value in headings
        if value
    ]

    try:
        start = headings.index(
            "Thundercat"
        )
        end = headings.index(
            "James Jamerson"
        )
    except ValueError as exc:
        raise RuntimeError(
            "Could not locate ranked bassist headings"
        ) from exc

    names = headings[
        start:
        end + 1
    ]

    if len(names) != 50:
        raise RuntimeError(
            f"Expected 50 bassists, found {len(names)}"
        )

    rows = []

    for index, name in enumerate(names):
        rank = 50 - index

        rows.append({
            "source_id":
                "rolling_stone_50_greatest_bassists",
            "source_rank":
                rank,
            "source_entry_name":
                name,
            "musician_name":
                name,
        })

    rows.sort(
        key=lambda row: row["source_rank"]
    )

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

    ranks = [
        row["source_rank"]
        for row in rows
    ]

    print("Wrote:", OUTPUT)
    print("Entries:", len(rows))
    print(
        "Rank range:",
        f"{min(ranks)}–{max(ranks)}",
    )
    print(
        "Contiguous:",
        ranks == list(range(1, 51)),
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
