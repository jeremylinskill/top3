import csv
import json
import sys
import time
import urllib.error
import urllib.parse
import urllib.request
from pathlib import Path

ROOT = Path("data/musician-catalogue")

USER_AGENT = "Top3App/0.1 musician-catalogue-builder"
WIKIDATA_API = "https://www.wikidata.org/w/api.php"

BATCH_SIZE = 25
TRANSIENT_HTTP_CODES = {429, 500, 502, 503, 504}


def claim_values(entity, property_id):
    values = []

    for claim in entity.get("claims", {}).get(property_id, []):
        value = (
            claim
            .get("mainsnak", {})
            .get("datavalue", {})
            .get("value")
        )

        if isinstance(value, str):
            values.append(value)

    return values


def fetch_entities(qids, attempts=8):
    params = {
        "action": "wbgetentities",
        "ids": "|".join(qids),
        "props": "claims",
        "format": "json",
    }

    url = (
        WIKIDATA_API
        + "?"
        + urllib.parse.urlencode(params)
    )

    request = urllib.request.Request(
        url,
        headers={
            "User-Agent": USER_AGENT,
        },
    )

    for attempt in range(1, attempts + 1):
        try:
            with urllib.request.urlopen(
                request,
                timeout=60,
            ) as response:
                return json.load(response)["entities"]

        except urllib.error.HTTPError as error:
            if (
                error.code not in TRANSIENT_HTTP_CODES
                or attempt == attempts
            ):
                raise

            retry_after = error.headers.get(
                "Retry-After"
            )

            try:
                retry_after_seconds = int(
                    retry_after
                )
            except (
                TypeError,
                ValueError,
            ):
                retry_after_seconds = 0

            wait_seconds = max(
                retry_after_seconds,
                min(
                    60,
                    5 * (2 ** (attempt - 1)),
                ),
            )

            print(
                f"  HTTP {error.code}; "
                f"retrying in {wait_seconds}s..."
            )

            time.sleep(wait_seconds)

        except urllib.error.URLError:
            if attempt == attempts:
                raise

            wait_seconds = attempt * 2

            print(
                f"  Network error; "
                f"retrying in {wait_seconds}s..."
            )

            time.sleep(wait_seconds)

    raise RuntimeError("Wikidata request failed.")


def main():
    if len(sys.argv) != 2:
        raise SystemExit(
            "Usage: python3 "
            "scripts/enrich-musician-catalogue-candidates.py "
            "<role>"
        )

    role = sys.argv[1].strip().lower()

    source_path = (
        ROOT
        / f"candidates-{role}.csv"
    )

    output_path = (
        ROOT
        / f"candidates-{role}-enriched.csv"
    )

    if not source_path.exists():
        raise SystemExit(
            f"Candidate file not found: {source_path}"
        )

    with source_path.open(
        newline="",
    ) as handle:
        source_rows = list(
            csv.DictReader(handle)
        )

    fieldnames = [
        "role",
        "wikidata_id",
        "name",
        "musicbrainz_id",
        "apple_music_artist_id",
        "sitelinks",
    ]

    completed_rows = []

    if output_path.exists():
        with output_path.open(
            newline="",
        ) as handle:
            completed_rows = list(
                csv.DictReader(handle)
            )

    completed_qids = {
        row["wikidata_id"]
        for row in completed_rows
    }

    pending_rows = [
        dict(row)
        for row in source_rows
        if row["wikidata_id"]
        not in completed_qids
    ]

    total = len(source_rows)

    if completed_rows:
        print(
            f"Resuming {role}: "
            f"{len(completed_rows)}/{total} "
            "already enriched."
        )
    else:
        print(
            f"Enriching {total} "
            f"{role} candidates..."
        )

    def save_checkpoint():
        with output_path.open(
            "w",
            newline="",
        ) as handle:
            writer = csv.DictWriter(
                handle,
                fieldnames=fieldnames,
            )
            writer.writeheader()
            writer.writerows(
                completed_rows
            )

    for start in range(
        0,
        len(pending_rows),
        BATCH_SIZE,
    ):
        batch = pending_rows[
            start:start + BATCH_SIZE
        ]

        qids = [
            row["wikidata_id"]
            for row in batch
            if row.get("wikidata_id")
        ]

        entities = fetch_entities(qids)

        for row in batch:
            qid = row.get(
                "wikidata_id",
                "",
            )
            entity = entities.get(
                qid,
                {},
            )

            musicbrainz_ids = claim_values(
                entity,
                "P434",
            )

            apple_music_ids = claim_values(
                entity,
                "P2850",
            )

            row["musicbrainz_id"] = (
                musicbrainz_ids[0]
                if musicbrainz_ids
                else ""
            )

            row["apple_music_artist_id"] = (
                apple_music_ids[0]
                if apple_music_ids
                else ""
            )

        completed_rows.extend(batch)
        save_checkpoint()

        print(
            f"  {len(completed_rows)}/{total}"
        )

        time.sleep(1.0)

    musicbrainz_count = sum(
        bool(row["musicbrainz_id"])
        for row in completed_rows
    )

    apple_music_count = sum(
        bool(row["apple_music_artist_id"])
        for row in completed_rows
    )

    print()
    print(
        f"Wrote {len(completed_rows)} records "
        f"to {output_path}"
    )
    print(
        f"MusicBrainz IDs: "
        f"{musicbrainz_count}/{total}"
    )
    print(
        f"Apple Music IDs: "
        f"{apple_music_count}/{total}"
    )


if __name__ == "__main__":
    main()
