import csv
import html
import re
import time
import urllib.parse
import urllib.request
from pathlib import Path

ROOT = Path("data/musician-catalogue")

OUTPUT_PATH = (
    ROOT
    / "editorial-rankings-rolling-stone-guitarists.csv"
)

BASE_URL = (
    "https://au.rollingstone.com/music/music-lists/"
    "250-greatest-guitarists-all-time-51028/"
)

SOURCE_ID = "rolling-stone-250-guitarists-2023"

USER_AGENT = "Top3App/0.1 musician-catalogue-builder"

ENTRY_PATTERN = re.compile(
    r'data-list-item="(?P<rank>\d+)"'
    r'[^>]*?'
    r'data-list-title="(?P<title>[^"]+)"',
    re.DOTALL,
)


def fetch_page(page_number):
    url = (
        BASE_URL
        + "?"
        + urllib.parse.urlencode({
            "list_page": page_number,
        })
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


def main():
    entries_by_rank = {}

    for page_number in range(1, 6):
        print(
            f"Fetching Rolling Stone page "
            f"{page_number}/5..."
        )

        page_html = fetch_page(
            page_number
        )

        matches = list(
            ENTRY_PATTERN.finditer(
                page_html
            )
        )

        print(
            f"  Found {len(matches)} ranked entries"
        )

        for match in matches:
            rank = int(
                match.group("rank")
            )

            title = html.unescape(
                match.group("title")
            ).strip()

            existing = entries_by_rank.get(
                rank
            )

            if (
                existing is not None
                and existing != title
            ):
                raise RuntimeError(
                    f"Conflicting entry for rank "
                    f"{rank}: "
                    f"{existing!r} vs {title!r}"
                )

            entries_by_rank[rank] = title

        time.sleep(1.0)

    expected_ranks = set(
        range(1, 251)
    )

    actual_ranks = set(
        entries_by_rank
    )

    missing_ranks = sorted(
        expected_ranks - actual_ranks
    )

    unexpected_ranks = sorted(
        actual_ranks - expected_ranks
    )

    if missing_ranks:
        raise RuntimeError(
            "Missing Rolling Stone ranks: "
            + ", ".join(
                str(rank)
                for rank in missing_ranks
            )
        )

    if unexpected_ranks:
        raise RuntimeError(
            "Unexpected Rolling Stone ranks: "
            + ", ".join(
                str(rank)
                for rank in unexpected_ranks
            )
        )

    rows = [
        {
            "source_id": SOURCE_ID,
            "source_rank": rank,
            "source_entry_name":
                entries_by_rank[rank],
        }
        for rank in range(1, 251)
    ]

    with OUTPUT_PATH.open(
        "w",
        newline="",
    ) as handle:
        writer = csv.DictWriter(
            handle,
            fieldnames=[
                "source_id",
                "source_rank",
                "source_entry_name",
            ],
        )

        writer.writeheader()
        writer.writerows(rows)

    print()
    print(
        f"Wrote {len(rows)} Rolling Stone "
        f"ranked entries to {OUTPUT_PATH}"
    )

    print()
    print("Top 10:")
    for row in rows[:10]:
        print(
            f'  {row["source_rank"]:>3}. '
            f'{row["source_entry_name"]}'
        )


if __name__ == "__main__":
    main()
