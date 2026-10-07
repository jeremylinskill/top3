#!/usr/bin/env python3

import csv
import html
import re
import urllib.request
from pathlib import Path

URL = (
    "https://beats-rhymes-lists.com/"
    "lists/rappers/"
)

OUTPUT = Path(
    "data/musician-catalogue/"
    "editorial-rankings-beats-rhymes-lists-mcs.csv"
)

HEADERS = {
    "User-Agent": "Mozilla/5.0",
    "Accept-Language": "en-US,en;q=0.9",
}


def clean_name(value):
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

    pattern = re.compile(
        r'<div[^>]*class=["\'][^"\']*'
        r'header-wrapper-nowrap[^"\']*["\'][^>]*>'
        r'.*?<div[^>]*class=["\'][^"\']*'
        r'header-count[^"\']*["\'][^>]*>'
        r'\s*(\d+)\s*</div>'
        r'(.*?)</h2>',
        re.I | re.S,
    )

    extracted = []

    for match in pattern.finditer(raw):
        source_rank = int(
            match.group(1)
        )
        name = clean_name(
            match.group(2)
        )

        extracted.append(
            {
                "source_rank":
                    source_rank,
                "name":
                    name,
            }
        )

    if len(extracted) != 100:
        raise RuntimeError(
            "Expected 100 ranked entries, "
            f"found {len(extracted)}"
        )

    rows = []

    for entry in extracted:
        source_rank = entry[
            "source_rank"
        ]
        name = entry["name"]

        rank = source_rank
        correction_note = ""

        # Source markup contains:
        # 18 Kool G Rap
        # 18 Drake
        # 16 Black Thought
        # so Drake is clearly the missing #17.
        if (
            source_rank == 18
            and name == "Drake"
        ):
            rank = 17
            correction_note = (
                "Source markup incorrectly "
                "labels Drake #18; corrected "
                "to missing rank #17."
            )

        rows.append(
            {
                "source_id":
                    "beats_rhymes_lists_top_100_rappers",
                "source_rank":
                    rank,
                "source_entry_name":
                    name,
                "musician_name":
                    name,
                "source_correction_note":
                    correction_note,
            }
        )

    rows.sort(
        key=lambda row:
            row["source_rank"]
    )

    ranks = [
        row["source_rank"]
        for row in rows
    ]

    expected = list(
        range(1, 101)
    )

    if ranks != expected:
        raise RuntimeError(
            "Ranks are not contiguous "
            "from 1–100."
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
                "source_correction_note",
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
    print(
        "Contiguous:",
        ranks == expected,
    )

    print()
    print("Top 5:")

    for row in rows[:5]:
        print(
            f'{row["source_rank"]}: '
            f'{row["musician_name"]}'
        )

    print()
    print("Ranks 20–15:")

    for row in rows:
        if 15 <= row["source_rank"] <= 20:
            suffix = (
                " [corrected source typo]"
                if row[
                    "source_correction_note"
                ]
                else ""
            )
            print(
                f'{row["source_rank"]}: '
                f'{row["musician_name"]}'
                f'{suffix}'
            )


if __name__ == "__main__":
    main()
