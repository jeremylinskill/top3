import csv
import html
import re
import time
import urllib.request
from pathlib import Path

ROOT = Path("data/musician-catalogue")

OUTPUT_PATH = (
    ROOT
    / "editorial-rankings-guitar-world-guitarists.csv"
)

BASE_URL = (
    "https://www.guitarworld.com/features/"
    "the-100-greatest-guitarists-of-all-time"
)

SOURCE_ID = "guitar-world-100-guitarists"

USER_AGENT = "Top3App/0.1 musician-catalogue-builder"

PAGE_CATEGORIES = {
    1: "rock",
    2: "blues",
    3: "early_innovators",
    4: "metal",
    5: "shred",
    6: "alternative_indie",
    7: "contemporary",
    8: "trailblazers",
    9: "punk",
    10: "acoustic",
    11: "jazz_fusion",
}

HEADING_PATTERN = re.compile(
    r"<h2[^>]*>\s*"
    r"(?P<rank>\d+)\.\s*"
    r"(?P<name>.*?)"
    r"</h2>",
    re.IGNORECASE | re.DOTALL,
)

TAG_PATTERN = re.compile(
    r"<[^>]+>"
)


def fetch_page(page_number):
    if page_number == 1:
        url = BASE_URL
    else:
        url = (
            BASE_URL
            + f"/{page_number}"
        )

    request = urllib.request.Request(
        url,
        headers={
            "User-Agent": USER_AGENT,
        },
    )

    with urllib.request.urlopen(
        request,
        timeout=60,
    ) as response:
        return response.read().decode(
            "utf-8",
            errors="replace",
        )


def clean_name(value):
    value = html.unescape(value)

    value = TAG_PATTERN.sub(
        "",
        value,
    )

    return " ".join(
        value.split()
    )


def main():
    rows = []

    for page_number in range(1, 12):
        category = PAGE_CATEGORIES[
            page_number
        ]

        print(
            f"Fetching page {page_number}/11 "
            f"({category})..."
        )

        page_html = fetch_page(
            page_number
        )

        matches = list(
            HEADING_PATTERN.finditer(
                page_html
            )
        )

        print(
            f"  Found {len(matches)} musicians"
        )

        for match in matches:
            rows.append({
                "source_id": SOURCE_ID,
                "source_page": page_number,
                "source_category": category,
                "category_rank": int(
                    match.group("rank")
                ),
                "source_entry_name": clean_name(
                    match.group("name")
                ),
            })

        time.sleep(1.0)

    print()
    print(
        f"Total musician entries: {len(rows)}"
    )

    if len(rows) != 100:
        raise RuntimeError(
            f"Expected 100 Guitar World musicians, "
            f"found {len(rows)}"
        )

    with OUTPUT_PATH.open(
        "w",
        newline="",
    ) as handle:
        writer = csv.DictWriter(
            handle,
            fieldnames=[
                "source_id",
                "source_page",
                "source_category",
                "category_rank",
                "source_entry_name",
            ],
        )

        writer.writeheader()
        writer.writerows(rows)

    print(
        f"Wrote {OUTPUT_PATH}"
    )


if __name__ == "__main__":
    main()
