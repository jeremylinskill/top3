import csv
import html
import re
import urllib.request
from pathlib import Path

ROOT = Path("data/musician-catalogue")

OUTPUT_PATH = (
    ROOT
    / "editorial-rankings-udiscover-guitarists.csv"
)

URL = (
    "https://www.udiscovermusic.com/stories/"
    "best-guitarists-in-music-history/"
)

SOURCE_ID = "udiscover-75-guitarists-2026"

USER_AGENT = "Top3App/0.1 musician-catalogue-builder"

HEADING_PATTERN = re.compile(
    r"<h2[^>]*>\s*"
    r"(?P<rank>\d+)\s*:\s*"
    r"(?P<title>.*?)"
    r"</h2>",
    re.IGNORECASE | re.DOTALL,
)

TAG_PATTERN = re.compile(
    r"<[^>]+>"
)

CONTEXT_PATTERN = re.compile(
    r"^(?P<name>.*?)\s*"
    r"\((?P<context>[^()]*)\)\s*$"
)


def clean_text(value):
    value = html.unescape(value)

    value = TAG_PATTERN.sub(
        "",
        value,
    )

    return " ".join(
        value.split()
    )


def main():
    request = urllib.request.Request(
        URL,
        headers={
            "User-Agent": USER_AGENT,
        },
    )

    with urllib.request.urlopen(
        request,
        timeout=60,
    ) as response:
        page_html = response.read().decode(
            "utf-8",
            errors="replace",
        )

    entries_by_rank = {}

    for match in HEADING_PATTERN.finditer(
        page_html
    ):
        rank = int(
            match.group("rank")
        )

        if rank < 1 or rank > 75:
            continue

        source_entry_name = clean_text(
            match.group("title")
        )

        context_match = CONTEXT_PATTERN.match(
            source_entry_name
        )

        if context_match:
            musician_name = clean_text(
                context_match.group("name")
            )

            source_context = clean_text(
                context_match.group("context")
            )
        else:
            musician_name = source_entry_name
            source_context = ""

        existing = entries_by_rank.get(
            rank
        )

        row = {
            "source_id": SOURCE_ID,
            "source_rank": rank,
            "source_entry_name":
                source_entry_name,
            "musician_name":
                musician_name,
            "source_context":
                source_context,
        }

        if (
            existing is not None
            and existing != row
        ):
            raise RuntimeError(
                f"Conflicting entry for rank "
                f"{rank}: "
                f"{existing!r} vs {row!r}"
            )

        entries_by_rank[rank] = row

    expected_ranks = set(
        range(1, 76)
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
            "Missing uDiscover ranks: "
            + ", ".join(
                str(rank)
                for rank in missing_ranks
            )
        )

    if unexpected_ranks:
        raise RuntimeError(
            "Unexpected uDiscover ranks: "
            + ", ".join(
                str(rank)
                for rank in unexpected_ranks
            )
        )

    rows = [
        entries_by_rank[rank]
        for rank in range(1, 76)
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
            ],
        )

        writer.writeheader()
        writer.writerows(rows)

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
