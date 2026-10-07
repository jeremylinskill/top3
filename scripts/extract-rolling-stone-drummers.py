#!/usr/bin/env python3

import csv
import json
import urllib.request
from pathlib import Path

BASE_URL = (
    "https://www.rollingstone.com/music/music-lists/"
    "100-greatest-drummers-of-all-time-77933/"
)

OUTPUT_PATH = Path(
    "data/musician-catalogue/"
    "editorial-rankings-rolling-stone-drummers.csv"
)

SOURCE_ID = "rolling_stone_100_greatest_drummers"

HEADERS = {
    "User-Agent": "Mozilla/5.0",
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


def extract_gallery_exports(raw: str) -> dict:
    marker = "var pmcGalleryExports = "
    marker_start = raw.find(marker)

    if marker_start == -1:
        raise RuntimeError(
            "pmcGalleryExports not found"
        )

    start = raw.find(
        "{",
        marker_start,
    )

    if start == -1:
        raise RuntimeError(
            "Opening pmcGalleryExports object not found"
        )

    depth = 0
    in_string = False
    escape = False

    for index in range(
        start,
        len(raw),
    ):
        char = raw[index]

        if in_string:
            if escape:
                escape = False
            elif char == "\\":
                escape = True
            elif char == '"':
                in_string = False

            continue

        if char == '"':
            in_string = True

        elif char == "{":
            depth += 1

        elif char == "}":
            depth -= 1

            if depth == 0:
                return json.loads(
                    raw[start:index + 1]
                )

    raise RuntimeError(
        "Closing pmcGalleryExports object not found"
    )


def extract_entries(
    data: dict,
) -> dict[int, str]:
    entries: dict[int, str] = {}

    for item in data.get(
        "gallery",
        [],
    ):
        rank = item.get(
            "positionDisplay"
        )

        title = item.get(
            "title"
        )

        if not isinstance(
            rank,
            int,
        ):
            continue

        if (
            not isinstance(title, str)
            or not title.strip()
        ):
            continue

        if 1 <= rank <= 100:
            entries[rank] = (
                title.strip()
            )

    return entries


def discover_gallery_urls(
    data: dict,
) -> list[str]:
    urls = [BASE_URL]

    generated_ranges = (
        data.get(
            "listNavBar",
            {},
        )
        .get(
            "generatedRanges",
            {},
        )
    )

    for ranges in (
        generated_ranges.values()
    ):
        if not isinstance(
            ranges,
            list,
        ):
            continue

        for range_item in ranges:
            if not isinstance(
                range_item,
                dict,
            ):
                continue

            link = range_item.get(
                "link"
            )

            if (
                isinstance(link, str)
                and link
                and link not in urls
            ):
                urls.append(link)

    return urls


def main() -> None:
    base_raw = fetch(
        BASE_URL
    )

    base_data = (
        extract_gallery_exports(
            base_raw
        )
    )

    gallery_count = int(
        base_data.get(
            "galleryCount",
            0,
        )
    )

    if gallery_count != 100:
        raise RuntimeError(
            "Expected Rolling Stone "
            "galleryCount 100, "
            f"got {gallery_count}"
        )

    urls = discover_gallery_urls(
        base_data
    )

    entries: dict[int, str] = {}

    for url in urls:
        raw = fetch(url)

        data = (
            extract_gallery_exports(
                raw
            )
        )

        page_entries = (
            extract_entries(data)
        )

        entries.update(
            page_entries
        )

    expected_ranks = set(
        range(1, 101)
    )

    actual_ranks = set(
        entries
    )

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
        or len(entries) != 100
    ):
        raise RuntimeError(
            "Rolling Stone extraction "
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
            101,
        ):
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
        f"URLs fetched: "
        f"{len(urls)}"
    )
    print(
        f"Entries extracted: "
        f"{len(entries)}"
    )
    print(
        f"Rank range: "
        f"{min(entries)}–"
        f"{max(entries)}"
    )
    print(
        f"Missing ranks: "
        f"{missing}"
    )
    print(
        f"Wrote: "
        f"{OUTPUT_PATH}"
    )

    print()
    print("Top 5:")

    for rank in range(
        1,
        6,
    ):
        print(
            f"{rank}: "
            f"{entries[rank]}"
        )

    print()
    print("Bottom 5:")

    for rank in range(
        96,
        101,
    ):
        print(
            f"{rank}: "
            f"{entries[rank]}"
        )


if __name__ == "__main__":
    main()
