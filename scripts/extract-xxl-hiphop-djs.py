#!/usr/bin/env python3

import csv
import re
import urllib.request
from pathlib import Path

URL = (
    "https://r.jina.ai/https://www.xxlmag.com/"
    "greatest-hip-hop-djs-all-time/"
)

OUTPUT = Path(
    "data/musician-catalogue/"
    "editorial-rankings-xxl-hiphop-djs.csv"
)

HEADERS = {
    "User-Agent": "Mozilla/5.0",
}


def clean_name(value):
    value = re.sub(
        r"\[([^\]]+)\]\([^)]+\)",
        r"\1",
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
        text = response.read().decode(
            "utf-8",
            errors="replace",
        )

    matches = re.findall(
        r"(?m)^\s*\*\s+##\s+(.+?)\s*$",
        text,
    )

    names = [
        clean_name(value)
        for value in matches
    ]

    if len(names) != 48:
        raise RuntimeError(
            f"Expected 48 DJs, found {len(names)}"
        )

    if len(set(names)) != len(names):
        raise RuntimeError(
            "Duplicate DJ names found."
        )

    rows = [
        {
            "source_id":
                "xxl_greatest_hiphop_djs",
            "source_rank":
                "",
            "source_position":
                index,
            "source_entry_name":
                name,
            "musician_name":
                name,
        }
        for index, name in enumerate(
            names,
            start=1,
        )
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
                "source_position",
                "source_entry_name",
                "musician_name",
            ],
        )
        writer.writeheader()
        writer.writerows(rows)

    print("Wrote:", OUTPUT)
    print("Entries:", len(rows))
    print("Ranking: unranked editorial membership")
    print()

    print("First 10:")

    for row in rows[:10]:
        print(
            f'{row["source_position"]}: '
            f'{row["musician_name"]}'
        )

    print()
    print("Last 5:")

    for row in rows[-5:]:
        print(
            f'{row["source_position"]}: '
            f'{row["musician_name"]}'
        )


if __name__ == "__main__":
    main()
