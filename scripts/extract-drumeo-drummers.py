#!/usr/bin/env python3

import csv
import html
import re
import urllib.request
from pathlib import Path

BASE_URL = (
    "https://www.drumeo.com/beat/"
    "the-top-100-drummers-of-all-time/"
)

OUTPUT_PATH = Path(
    "data/musician-catalogue/"
    "editorial-rankings-drumeo-drummers.csv"
)

SOURCE_ID = "drumeo_100_greatest_drummers"

HEADERS = {
    "User-Agent": "Mozilla/5.0",
    "Accept-Language": "en-US,en;q=0.9",
}


def fetch(url: str) -> str:
    request = urllib.request.Request(
        url,
        headers=HEADERS,
    )

    with urllib.request.urlopen(
        request,
        timeout=30,
    ) as response:
        return response.read().decode(
            "utf-8",
            errors="replace",
        )


def clean_text(value: str) -> str:
    value = re.sub(
        r"<[^>]+>",
        "",
        value,
    )

    value = html.unescape(value)

    return " ".join(
        value.split()
    )


def main() -> None:
    raw = fetch(BASE_URL)

    headings = re.findall(
        r"<h[1-6][^>]*>(.*?)</h[1-6]>",
        raw,
        re.I | re.S,
    )

    entries: dict[int, str] = {}

    for heading in headings:
        text = clean_text(heading)

        match = re.match(
            r"^(\d{1,3})\.\s+(.+)$",
            text,
        )

        if not match:
            continue

        rank = int(match.group(1))
        name = match.group(2).strip()

        if not 1 <= rank <= 100:
            continue

        if rank in entries:
            raise RuntimeError(
                f"Duplicate Drumeo rank: {rank}"
            )

        entries[rank] = name

    expected_ranks = set(
        range(1, 101)
    )

    actual_ranks = set(entries)

    missing = sorted(
        expected_ranks - actual_ranks
    )

    unexpected = sorted(
        actual_ranks - expected_ranks
    )

    if (
        missing
        or unexpected
        or len(entries) != 100
    ):
        raise RuntimeError(
            "Drumeo extraction failed validation: "
            f"entries={len(entries)}, "
            f"missing={missing}, "
            f"unexpected={unexpected}"
        )

    OUTPUT_PATH.parent.mkdir(
        parents=True,
        exist_ok=True,
    )

    with OUTPUT_PATH.open(
        "w",
        newline="",
        encoding="utf-8",
    ) as csv_file:
        writer = csv.DictWriter(
            csv_file,
            fieldnames=[
                "source_id",
                "source_rank",
                "source_entry_name",
                "musician_name",
            ],
        )

        writer.writeheader()

        for rank in range(1, 101):
            name = entries[rank]

            writer.writerow(
                {
                    "source_id":
                        SOURCE_ID,
                    "source_rank":
                        rank,
                    "source_entry_name":
                        name,
                    "musician_name":
                        name,
                }
            )

    print(
        f"Entries extracted: {len(entries)}"
    )
    print(
        f"Rank range: "
        f"{min(entries)}–{max(entries)}"
    )
    print(
        f"Missing ranks: {missing}"
    )
    print(
        f"Wrote: {OUTPUT_PATH}"
    )

    print()
    print("Top 5:")

    for rank in range(1, 6):
        print(
            f"{rank}: {entries[rank]}"
        )

    print()
    print("Bottom 5:")

    for rank in range(96, 101):
        print(
            f"{rank}: {entries[rank]}"
        )


if __name__ == "__main__":
    main()
