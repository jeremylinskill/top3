import csv
import json
import time
import urllib.parse
import urllib.request
from pathlib import Path

ROOT = Path("data/musician-catalogue")

SOURCE_PATH = (
    ROOT
    / "candidates-guitarist-enriched.csv"
)

OUTPUT_PATH = (
    ROOT
    / "candidates-guitarist-signals.csv"
)

USER_AGENT = "Top3App/0.1 musician-catalogue-builder"
MUSICBRAINZ_API = "https://musicbrainz.org/ws/2/artist/"

LIMIT = 100


def fetch_musicbrainz_guitarists():
    matches = {}
    offset = 0

    while True:
        params = {
            "query": "tag:guitarist AND type:person",
            "fmt": "json",
            "limit": LIMIT,
            "offset": offset,
        }

        url = (
            MUSICBRAINZ_API
            + "?"
            + urllib.parse.urlencode(params)
        )

        request = urllib.request.Request(
            url,
            headers={
                "User-Agent": USER_AGENT,
                "Accept": "application/json",
            },
        )

        with urllib.request.urlopen(
            request,
            timeout=60,
        ) as response:
            data = json.load(response)

        artists = data.get(
            "artists",
            [],
        )

        for artist in artists:
            artist_id = artist.get("id")

            if not artist_id:
                continue

            matches[artist_id] = {
                "name": artist.get(
                    "name",
                    "",
                ),
                "score": int(
                    artist.get(
                        "score",
                        0,
                    ) or 0
                ),
            }

        print(
            f"  MusicBrainz: "
            f"{min(offset + len(artists), data.get('count', 0))}"
            f"/{data.get('count', 0)}"
        )

        offset += len(artists)

        searchable_count = min(
            data.get(
                "count",
                0,
            ),
            500,
        )

        if (
            not artists
            or offset >= searchable_count
        ):
            break

        time.sleep(1.1)

    return matches


def main():
    if not SOURCE_PATH.exists():
        raise SystemExit(
            f"Source file not found: {SOURCE_PATH}"
        )

    with SOURCE_PATH.open(
        newline="",
    ) as handle:
        rows = list(
            csv.DictReader(handle)
        )

    print(
        "Fetching MusicBrainz guitarist-tag matches..."
    )

    matches = fetch_musicbrainz_guitarists()

    matched_count = 0

    for row in rows:
        musicbrainz_id = row.get(
            "musicbrainz_id",
            "",
        )

        match = matches.get(
            musicbrainz_id
        )

        row[
            "musicbrainz_guitarist"
        ] = "true" if match else "false"

        row[
            "musicbrainz_guitarist_score"
        ] = (
            str(match["score"])
            if match
            else ""
        )

        if match:
            matched_count += 1

    rows.sort(
        key=lambda row: (
            -int(
                row.get(
                    "sitelinks",
                    "0",
                )
                or 0
            ),
            row["name"].casefold(),
        )
    )

    fieldnames = list(
        rows[0].keys()
    )

    with OUTPUT_PATH.open(
        "w",
        newline="",
    ) as handle:
        writer = csv.DictWriter(
            handle,
            fieldnames=fieldnames,
        )

        writer.writeheader()
        writer.writerows(rows)

    print()
    print(
        f"MusicBrainz guitarist matches: "
        f"{matched_count}/{len(rows)}"
    )
    print(
        f"Wrote {len(rows)} candidates "
        f"to {OUTPUT_PATH}"
    )


if __name__ == "__main__":
    main()
