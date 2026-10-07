import csv
import html
import re
import urllib.request
from pathlib import Path

ROOT = Path("data/musician-catalogue")

OUTPUT_PATH = (
    ROOT
    / "editorial-rankings-spin-guitarists.csv"
)

BASE_URL = (
    "https://www.spinmagazine.com/2012/05/"
    "greatest-guitarists-all-time/"
)

SOURCE_ID = "spin-100-guitarists-2012"

USER_AGENT = "Top3App/0.1 musician-catalogue-builder"

HEADING_PATTERN = re.compile(
    r"<h2\b[^>]*>(.*?)</h2>",
    re.IGNORECASE | re.DOTALL,
)

RANK_PATTERN = re.compile(
    r"^(\d{1,3})\.\s*(.+)$"
)

TAG_PATTERN = re.compile(
    r"<[^>]+>"
)

CONTEXT_PATTERN = re.compile(
    r"^(?P<name>.*?)\s*"
    r"\((?P<context>[^()]*)\)\s*$"
)


def clean_text(value):
    value = TAG_PATTERN.sub(
        "",
        value,
    )

    value = html.unescape(value)

    return " ".join(
        value.split()
    )


def fetch_page(page_number):
    url = (
        BASE_URL
        if page_number == 1
        else f"{BASE_URL}{page_number}/"
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

    for page_number in range(1, 11):
        page_html = fetch_page(
            page_number
        )

        page_count = 0

        for heading in HEADING_PATTERN.findall(
            page_html
        ):
            text = clean_text(
                heading
            )

            match = RANK_PATTERN.match(
                text
            )

            if not match:
                continue

            rank = int(
                match.group(1)
            )

            if rank < 1 or rank > 100:
                continue

            source_entry_name = clean_text(
                match.group(2)
            )

            context_match = (
                CONTEXT_PATTERN.match(
                    source_entry_name
                )
            )

            if context_match:
                musician_name = clean_text(
                    context_match.group(
                        "name"
                    )
                )

                source_context = clean_text(
                    context_match.group(
                        "context"
                    )
                )
            else:
                musician_name = (
                    source_entry_name
                )
                source_context = ""

            row = {
                "source_id":
                    SOURCE_ID,
                "source_rank":
                    rank,
                "source_entry_name":
                    source_entry_name,
                "musician_name":
                    musician_name,
                "source_context":
                    source_context,
                "source_page":
                    page_number,
            }

            existing = entries_by_rank.get(
                rank
            )

            if (
                existing is not None
                and existing != row
            ):
                raise RuntimeError(
                    f"Conflicting entry for "
                    f"rank {rank}: "
                    f"{existing!r} vs "
                    f"{row!r}"
                )

            entries_by_rank[rank] = row
            page_count += 1

        print(
            f"Page {page_number}: "
            f"{page_count} ranked entries"
        )

    expected_ranks = set(
        range(1, 101)
    )

    actual_ranks = set(
        entries_by_rank
    )

    missing_ranks = sorted(
        expected_ranks - actual_ranks
    )

    if missing_ranks:
        raise RuntimeError(
            "Missing SPIN ranks: "
            + ", ".join(
                str(rank)
                for rank in missing_ranks
            )
        )

    rows = [
        entries_by_rank[rank]
        for rank in range(1, 101)
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
                "musician_name",
                "source_context",
                "source_page",
            ],
        )

        writer.writeheader()
        writer.writerows(rows)

    print()
    print(
        f"Ranked entries: {len(rows)}"
    )
    print(
        f"Wrote {OUTPUT_PATH}"
    )

    print()
    print("Top 10:")

    for row in rows[:10]:
        context = (
            f' ({row["source_context"]})'
            if row["source_context"]
            else ""
        )

        print(
            f'  {row["source_rank"]:>2}. '
            f'{row["musician_name"]}'
            f'{context}'
        )


if __name__ == "__main__":
    main()
