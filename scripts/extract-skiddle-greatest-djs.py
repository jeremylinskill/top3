#!/usr/bin/env python3

import csv
import re
import urllib.request
from pathlib import Path

URL = (
    "https://r.jina.ai/https://www.skiddle.com/"
    "news/all/The-best-DJs-of-all-time/57790/"
)

OUTPUT = Path(
    "data/musician-catalogue/"
    "editorial-rankings-skiddle-greatest-djs.csv"
)

HEADERS = {
    "User-Agent": "Mozilla/5.0",
}


def clean_name(value):
    # Remove Markdown links while preserving their text.
    previous = None

    while previous != value:
        previous = value
        value = re.sub(
            r"\[([^\]]+)\]\([^)]+\)",
            r"\1",
            value,
        )

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
        text = response.read().decode(
            "utf-8",
            errors="replace",
        )

    sections = re.split(
        r"(?m)^\s*\*\s+\*\s+\*\s*$",
        text,
    )

    names = []

    for section in sections:
        match = re.search(
            r'\[\*\*([^*]+)\*\*\]\([^)]+\)',
            section,
        )

        if not match:
            match = re.search(
                r'(?m)^\*\*([^*\n]+)\*\*\s*$',
                section,
            )

        if not match:
            continue

        name = clean_name(
            match.group(1)
        )

        if name.lower().startswith(
            (
                "from:",
                "genres:",
                "tickets for",
            )
        ):
            continue

        names.append(name)

    if len(names) != 35:
        raise RuntimeError(
            f"Expected 35 DJs, found {len(names)}"
        )

    rows = [
        {
            "source_id":
                "skiddle_35_best_djs",
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

    print("All entries:")

    for row in rows:
        print(
            f'{row["source_position"]}: '
            f'{row["musician_name"]}'
        )


if __name__ == "__main__":
    main()
