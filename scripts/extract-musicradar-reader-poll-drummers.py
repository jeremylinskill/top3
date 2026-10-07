#!/usr/bin/env python3

import csv
import html
import re
import urllib.request
from pathlib import Path

PART1_URL = (
    "https://www.musicradar.com/news/drums/"
    "50-greatest-drummers-of-all-time-part-1-224206"
)

PART2_URL = (
    "https://www.musicradar.com/news/drums/"
    "50-greatest-drummers-of-all-time-part-2-225815"
)

OUTPUT_PATH = Path(
    "data/musician-catalogue/"
    "editorial-rankings-musicradar-reader-poll-drummers.csv"
)

SOURCE_ID = "musicradar_50_greatest_drummers_reader_poll_2009"

HEADERS = {
    "User-Agent": "Mozilla/5.0",
    "Accept-Language": "en-US,en;q=0.9",
}

TOP_5 = {
    1: "John Bonham",
    2: "Buddy Rich",
    3: "Keith Moon",
    4: "Neil Peart",
    5: "Mike Portnoy",
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


def clean_heading(value: str) -> str:
    value = re.sub(
        r"<[^>]+>",
        " ",
        value,
    )

    value = html.unescape(value)

    return " ".join(
        value.split()
    )


def extract_h3_names(raw: str) -> list[str]:
    headings = re.findall(
        r"<h3[^>]*>(.*?)</h3>",
        raw,
        re.I | re.S,
    )

    names = []

    ignored = {
        "?",
        "Countdown: 25-1",
        "5th place...",
        "4th place...",
        "3rd place...",
        "2nd place...",
        "1st place...",
    }

    for heading in headings:
        text = clean_heading(
            heading
        )

        if (
            not text
            or text in ignored
        ):
            continue

        names.append(text)

    return names


def main() -> None:
    part1_names = extract_h3_names(
        fetch(PART1_URL)
    )

    part2_names = extract_h3_names(
        fetch(PART2_URL)
    )

    if len(part1_names) != 25:
        raise RuntimeError(
            "Expected 25 drummer names "
            f"from Part 1, got {len(part1_names)}"
        )

    if len(part2_names) != 20:
        raise RuntimeError(
            "Expected 20 drummer names "
            f"from Part 2 before Top 5, "
            f"got {len(part2_names)}"
        )

    entries = dict(TOP_5)

    # Part 2 is presented from rank 25 down to 6.
    for index, name in enumerate(
        part2_names
    ):
        rank = 25 - index
        entries[rank] = name

    # Part 1 is presented from rank 50 down to 26.
    for index, name in enumerate(
        part1_names
    ):
        rank = 50 - index
        entries[rank] = name

    expected_ranks = set(
        range(1, 51)
    )

    actual_ranks = set(entries)

    missing = sorted(
        expected_ranks
        - actual_ranks
    )

    unexpected = sorted(
        actual_ranks
        - expected_ranks
    )

    if (
        missing
        or unexpected
        or len(entries) != 50
    ):
        raise RuntimeError(
            "MusicRadar extraction "
            "failed validation: "
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

        for rank in range(
            1,
            51,
        ):
            name = entries[rank]

            writer.writerow({
                "source_id":
                    SOURCE_ID,
                "source_rank":
                    rank,
                "source_entry_name":
                    name,
                "musician_name":
                    name,
            })

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

    for rank in range(46, 51):
        print(
            f"{rank}: {entries[rank]}"
        )


if __name__ == "__main__":
    main()
