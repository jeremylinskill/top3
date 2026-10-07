#!/usr/bin/env python3

import csv
import re
import urllib.request
from pathlib import Path

URL = (
    "https://r.jina.ai/https://www.musicradar.com/"
    "news/dj/the-20-greatest-djs-of-all-time-399014"
)

OUTPUT = Path(
    "data/musician-catalogue/"
    "editorial-rankings-musicradar-greatest-djs.csv"
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

    headings = re.findall(
        r"(?m)^###\s+(.+?)\s*$",
        text,
    )

    names = [
        heading.strip()
        for heading in headings
        if heading.strip() != "Kings of clubs"
    ]

    if len(names) != 20:
        raise RuntimeError(
            f"Expected 20 DJs, found {len(names)}"
        )

    if len(set(names)) != len(names):
        raise RuntimeError(
            "Duplicate DJ names found."
        )

    rows = [
        {
            "source_id":
                "musicradar_20_greatest_djs",
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
