#!/usr/bin/env python3

from __future__ import annotations

import argparse
import csv
import html
import json
import runpy
import re
import socket
import time
import unicodedata
import urllib.error
import urllib.request
from collections import defaultdict
from pathlib import Path
from urllib.parse import urlparse

ROOT = Path("data/musician-catalogue")
MUSICIANS_PATH = ROOT / "musicians.csv"
ALIASES_PATH = ROOT / "musician-aliases.csv"
ROLES_PATH = ROOT / "musician_roles.csv"
OUTPUT_PATH = ROOT / "apple-music-resolution-audit.csv"
ENV_PATH = Path(".env")


def normalize(value: str) -> str:
    value = html.unescape(value)
    value = unicodedata.normalize(
        "NFKD",
        value,
    )
    value = "".join(
        char
        for char in value
        if not unicodedata.combining(char)
    )
    value = value.casefold()
    value = value.replace(".", "")
    value = value.replace("&", " and ")
    value = re.sub(
        r"[^a-z0-9]+",
        " ",
        value,
    )
    return re.sub(
        r"\s+",
        " ",
        value,
    ).strip()


def read_csv(
    path: Path,
) -> list[dict[str, str]]:
    with path.open(
        newline="",
        encoding="utf-8",
    ) as f:
        return list(
            csv.DictReader(f)
        )


def load_env() -> dict[str, str]:
    values: dict[str, str] = {}

    for raw_line in ENV_PATH.read_text(
        encoding="utf-8"
    ).splitlines():
        line = raw_line.strip()

        if (
            not line
            or line.startswith("#")
            or "=" not in line
        ):
            continue

        key, value = line.split(
            "=",
            1,
        )

        values[
            key.strip()
        ] = value.strip().strip(
            "\"'"
        )

    return values


def search_apple_music(
    url: str,
    publishable_key: str,
    query: str,
) -> list[dict[str, object]]:
    query = html.unescape(query)

    for attempt in range(1, 4):
        request = urllib.request.Request(
            f"{url}/functions/v1/apple-music-search",
            data=json.dumps({
                "mode": "resolve",
                "resource": "artists",
                "query": query,
            }).encode("utf-8"),
            headers={
                "apikey":
                    publishable_key,
                "Content-Type":
                    "application/json",
            },
            method="POST",
        )

        try:
            with urllib.request.urlopen(
                request,
                timeout=45,
            ) as response:
                payload = json.loads(
                    response.read().decode(
                        "utf-8"
                    )
                )

            results = payload.get(
                "results",
                [],
            )

            return (
                results
                if isinstance(results, list)
                else []
            )
        except (
            urllib.error.URLError,
            TimeoutError,
            socket.timeout,
        ) as error:
            if attempt >= 3:
                raise

            delay = attempt * 2

            print(
                f"  RETRY: {type(error).__name__}; "
                f"waiting {delay}s"
            )

            time.sleep(delay)

    return []



def audit_band_profiles(args: argparse.Namespace) -> None:
    source_path = ROOT / (
        f"wikidata-apple-music-audit-"
        f"{args.role}-{args.start}-{args.limit}.csv"
    )

    if not source_path.exists():
        raise SystemExit(
            f"Run the --wikidata audit first: {source_path}"
        )

    source_rows = read_csv(source_path)

    associations: dict[str, set[str]] = defaultdict(set)

    for row in source_rows:
        if row.get("identity_review_status") != "suggested_unverified":
            continue

        for band in row.get("suggested_bands", "").split(" | "):
            band = band.strip()

            if band:
                associations[band].add(row["musician_name"])

    env = load_env()
    url = env.get("EXPO_PUBLIC_SUPABASE_URL", "")
    key = env.get("EXPO_PUBLIC_SUPABASE_PUBLISHABLE_KEY", "")

    if (
        urlparse(url).hostname
        != "kkltzygebomopysklaqq.supabase.co"
        or not key
    ):
        raise SystemExit("Safety check failed: DEV Supabase required.")

    output_path = ROOT / (
        f"band-profiles-{args.role}-{args.start}-{args.limit}.csv"
    )

    fieldnames = [
        "band_name",
        "associated_musicians",
        "status",
        "exact_name_candidate_count",
        "profiles_examined",
        "candidate_profiles_json",
        "notes",
    ]

    existing = read_csv(output_path) if output_path.exists() else []

    completed = {
        row["band_name"]: row
        for row in existing
        if row.get("status") != "request_error"
        and row["band_name"] in associations
    }

    output_rows = list(completed.values())

    def save_checkpoint():
        with output_path.open(
            "w",
            newline="",
            encoding="utf-8",
        ) as handle:
            writer = csv.DictWriter(
                handle,
                fieldnames=fieldnames,
            )
            writer.writeheader()
            writer.writerows(output_rows)

    bands = sorted(associations)

    print(
        f"Auditing {len(bands)} documented bands; "
        f"{len(completed)} already completed."
    )

    for index, band in enumerate(bands, 1):
        if band in completed:
            continue

        print(f"[{index}/{len(bands)}] {band}")

        report = {
            "band_name": band,
            "associated_musicians": " | ".join(
                sorted(associations[band])
            ),
            "status": "",
            "exact_name_candidate_count": "0",
            "profiles_examined": "0",
            "candidate_profiles_json": "[]",
            "notes": "",
        }

        try:
            results = search_apple_music(url, key, band)

            exact = {}
            for artist in results:
                title = str(artist.get("title", "")).strip()
                artist_id = str(artist.get("id", "")).strip()

                match = re.fullmatch(
                    r"apple-music-artist-(\d+)",
                    artist_id,
                )

                if normalize(title) == normalize(band) and match:
                    exact[match.group(1)] = title

            report["exact_name_candidate_count"] = str(len(exact))

            if not exact:
                report["status"] = "no_exact_name_match"
                print("  No exact-name profiles")
            else:
                ids = list(exact)[:5]

                request = urllib.request.Request(
                    f"{url}/functions/v1/apple-music-search",
                    data=json.dumps({
                        "mode": "enrich",
                        "resource": "artists",
                        "ids": ids,
                        "includePreview": True,
                    }).encode("utf-8"),
                    headers={
                        "apikey": key,
                        "Content-Type": "application/json",
                    },
                    method="POST",
                )

                with urllib.request.urlopen(
                    request,
                    timeout=120,
                ) as response:
                    payload = json.load(response)

                enriched = payload.get("results")

                if not isinstance(enriched, list):
                    raise ValueError(
                        "Unexpected Apple Music enrichment response."
                    )

                profiles = []

                for artist in enriched:
                    profiles.append({
                        "id": str(artist.get("id", "")).replace(
                            "apple-music-artist-", ""
                        ),
                        "name": artist.get("title", ""),
                        "genre": artist.get("subtitle", ""),
                        "preview_song": artist.get("previewSongTitle", ""),
                        "recording_artist": artist.get(
                            "previewRecordingArtist", ""
                        ),
                        "apple_music_url": artist.get(
                            "appleMusicUrl", ""
                        ),
                    })

                report["profiles_examined"] = str(len(profiles))
                report["candidate_profiles_json"] = json.dumps(
                    profiles,
                    ensure_ascii=False,
                )
                report["status"] = (
                    "multiple_name_candidates"
                    if len(exact) > 1
                    else "single_name_candidate"
                )

                if len(exact) > len(ids):
                    report["notes"] = (
                        "Additional exact-name profiles not examined."
                    )

                print(
                    f"  {len(exact)} exact-name candidate(s); "
                    f"{len(profiles)} profiles examined"
                )

        except (OSError, ValueError) as error:
            report["status"] = "request_error"
            report["notes"] = str(error)
            print(f"  ERROR: {error}")

        output_rows = [
            row for row in output_rows
            if row["band_name"] != band
        ]
        output_rows.append(report)
        save_checkpoint()

        time.sleep(1.0)

    print(f"\\nWrote: {output_path}")
    print("All artist profiles remain unverified.")


def main() -> None:
    parser = argparse.ArgumentParser()

    parser.add_argument(
        "--limit",
        type=int,
        default=10,
        help="Maximum number of musicians to audit.",
    )

    parser.add_argument(
        "--start",
        type=int,
        default=0,
        help="Zero-based starting position.",
    )

    parser.add_argument(
        "--role",
        choices=["vocalist", "guitarist", "drummer", "bassist", "mc", "dj"],
        help="Audit active, approved musicians missing Apple Music IDs, in role ranking order.",
    )

    parser.add_argument(
        "--wikidata",
        action="store_true",
        help="Include unverified Wikidata identity candidates in a separate audit.",
    )

    parser.add_argument(
        "--band-profiles",
        action="store_true",
        help="Audit band profiles from an existing Wikidata report.",
    )

    args = parser.parse_args()

    if args.start < 0 or args.limit < 1:
        parser.error("--start must be non-negative and --limit must be positive.")

    if args.band_profiles:
        if not args.role:
            parser.error("--band-profiles requires --role.")

        audit_band_profiles(args)
        return

    musicians = read_csv(
        MUSICIANS_PATH
    )

    aliases = read_csv(
        ALIASES_PATH
    )

    aliases_by_musician: dict[
        str,
        list[str],
    ] = defaultdict(list)

    for row in aliases:
        if (
            row.get("active", "")
            .strip()
            .lower()
            != "true"
        ):
            continue

        aliases_by_musician[
            row["musician_id"]
        ].append(
            row["alias"]
        )

    ids_by_normalized_name: dict[
        str,
        list[str],
    ] = defaultdict(list)

    for row in musicians:
        ids_by_normalized_name[
            normalize(row["name"])
        ].append(
            row["id"]
        )

    ambiguous_names = {
        key
        for key, ids
        in ids_by_normalized_name.items()
        if len(ids) > 1
    }

    env = load_env()

    supabase_url = env.get(
        "EXPO_PUBLIC_SUPABASE_URL",
        "",
    )

    publishable_key = env.get(
        "EXPO_PUBLIC_SUPABASE_PUBLISHABLE_KEY",
        "",
    )

    if (
        not supabase_url
        or not publishable_key
    ):
        raise SystemExit(
            "Missing Supabase environment variables."
        )

    if urlparse(supabase_url).hostname != "kkltzygebomopysklaqq.supabase.co":
        raise SystemExit("Safety check failed: resolver requires DEV Supabase.")

    candidates = musicians

    if args.role:
        musicians_by_id = {row["id"]: row for row in musicians}

        ranked_roles = sorted(
            (
                row for row in read_csv(ROLES_PATH)
                if row["role"] == args.role
                and row["approved"].strip().lower() == "true"
            ),
            key=lambda row: int(row["rank"]),
        )

        candidates = [
            musicians_by_id[row["musician_id"]]
            for row in ranked_roles
            if row["musician_id"] in musicians_by_id
            and musicians_by_id[row["musician_id"]]["active"].strip().lower() == "true"
            and not musicians_by_id[row["musician_id"]]["apple_music_artist_id"].strip()
        ]

    selected = candidates[args.start:args.start + args.limit]

    output_path = (
        ROOT / f"apple-music-audit-{args.role}-{args.start}-{args.limit}.csv"
        if args.role
        else OUTPUT_PATH
    )

    if args.wikidata:
        output_path = output_path.with_name(
            "wikidata-" + output_path.name
        )

    print(f"Selected {len(selected)} of {len(candidates)} eligible musicians.")

    audit_rows: list[
        dict[str, str]
    ] = []

    for index, musician in enumerate(
        selected,
        start=args.start + 1,
    ):
        musician_id = musician["id"]
        name = musician["name"]

        canonical_normalized = normalize(
            name
        )

        accepted_names = [
            name,
            *aliases_by_musician.get(
                musician_id,
                [],
            ),
        ]

        accepted_normalized = {
            normalize(value)
            for value in accepted_names
        }

        print(
            f"[{index}/{len(candidates)}] "
            f"{name}"
        )

        if (
            canonical_normalized
            in ambiguous_names
        ):
            audit_rows.append({
                "musician_id":
                    musician_id,
                "musician_name":
                    name,
                "status":
                    "ambiguous_catalogue_name",
                "apple_music_artist_id":
                    "",
                "apple_music_title":
                    "",
                "accepted_names":
                    " | ".join(
                        accepted_names
                    ),
                "matched_candidates":
                    "",
                "notes":
                    "Skipped because multiple catalogue musicians share this normalized canonical name.",
            })

            print(
                "  SKIP: ambiguous catalogue name"
            )
            continue

        try:
            results = search_apple_music(
                supabase_url,
                publishable_key,
                name,
            )
        except (
            urllib.error.URLError,
            TimeoutError,
            socket.timeout,
            json.JSONDecodeError,
        ) as error:
            audit_rows.append({
                "musician_id":
                    musician_id,
                "musician_name":
                    name,
                "status":
                    "request_error",
                "apple_music_artist_id":
                    "",
                "apple_music_title":
                    "",
                "accepted_names":
                    " | ".join(
                        accepted_names
                    ),
                "matched_candidates":
                    "",
                "notes":
                    str(error),
            })

            print(
                f"  ERROR: {error}"
            )
            continue

        matching_results = []

        for result in results:
            title = str(
                result.get(
                    "title",
                    "",
                )
            ).strip()

            if (
                normalize(title)
                not in accepted_normalized
            ):
                continue

            raw_id = str(
                result.get(
                    "id",
                    "",
                )
            ).strip()

            apple_id = re.sub(
                r"^apple-music-artist-",
                "",
                raw_id,
            )

            if not apple_id:
                continue

            matching_results.append({
                "id": apple_id,
                "title": title,
            })

        if not matching_results:
            audit_rows.append({
                "musician_id":
                    musician_id,
                "musician_name":
                    name,
                "status":
                    "no_match",
                "apple_music_artist_id":
                    "",
                "apple_music_title":
                    "",
                "accepted_names":
                    " | ".join(
                        accepted_names
                    ),
                "matched_candidates":
                    "",
                "notes":
                    "",
            })

            print(
                "  NO MATCH"
            )
            continue

        chosen = matching_results[0] if len(matching_results) == 1 else None

        audit_rows.append({
            "musician_id":
                musician_id,
            "musician_name":
                name,
            "status":
                "single_candidate" if chosen else "multiple_candidates",
            "apple_music_artist_id":
                chosen["id"] if chosen else "",
            "apple_music_title":
                chosen["title"] if chosen else "",
            "accepted_names":
                " | ".join(
                    accepted_names
                ),
            "matched_candidates":
                " | ".join(
                    f'{item["title"]}:{item["id"]}'
                    for item in matching_results
                ),
            "notes":
                "",
        })

        if chosen:
            print(
                f'  SINGLE CANDIDATE (unverified): '
                f'{chosen["title"]} ({chosen["id"]})'
            )
        else:
            print(
                f'  REVIEW: {len(matching_results)} same-name candidates'
            )
            for item in matching_results:
                print(f'    {item["title"]} ({item["id"]})')

    if args.wikidata:
        helper = runpy.run_path(
            str(Path(__file__).with_name(
                "find-editorial-guitarists-wikidata.py"
            )),
            run_name="wikidata_search_helper",
        )

        search_wikidata = helper["search_wikidata"]

        print("\nWIKIDATA IDENTITY DISCOVERY (unverified)")

        for index, row in enumerate(audit_rows, 1):
            name = row["musician_name"]

            try:
                candidates = search_wikidata(
                    name,
                    attempts=3,
                )
            except (
                urllib.error.URLError,
                TimeoutError,
                OSError,
                ValueError,
                RuntimeError,
            ) as error:
                row["wikidata_status"] = "request_error"
                row["wikidata_candidates"] = ""
                print(
                    f"  [{index}/{len(audit_rows)}] "
                    f"{name}: ERROR {error}"
                )
            else:
                row["wikidata_status"] = (
                    "candidates_found"
                    if candidates
                    else "no_candidates"
                )

                row["wikidata_candidates"] = " | ".join(
                    f'{item.get("id", "")}: '
                    f'{item.get("label", "")} '
                    f'[{item.get("description", "")}]'
                    for item in candidates
                )

                print(
                    f"  [{index}/{len(audit_rows)}] "
                    f"{name}: {len(candidates)} candidate(s)"
                )

            time.sleep(1.5)

        enrichment_helper = runpy.run_path(
            str(Path(__file__).with_name(
                "enrich-musician-catalogue-candidates.py"
            )),
            run_name="wikidata_enrichment_helper",
        )

        fetch_entities = enrichment_helper["fetch_entities"]
        claim_values = enrichment_helper["claim_values"]
        claim_entity_ids = enrichment_helper["claim_entity_ids"]

        qids_by_musician = {
            row["musician_id"]: re.findall(
                r"\b(Q\d+): ",
                row.get("wikidata_candidates", ""),
            )
            for row in audit_rows
        }

        all_qids = list(dict.fromkeys(
            qid
            for qids in qids_by_musician.values()
            for qid in qids
        ))

        entities = {}

        for start in range(0, len(all_qids), 25):
            batch = all_qids[start:start + 25]
            entities.update(fetch_entities(batch, props="claims|labels|descriptions"))
            time.sleep(1.0)

        label_ids = set()

        for qid in all_qids:
            entity = entities.get(qid, {})

            for property_id in ("P106", "P1303", "P463"):
                label_ids.update(
                    claim_entity_ids(entity, property_id)
                )

        labels = {}

        sorted_label_ids = sorted(label_ids)

        for start in range(0, len(sorted_label_ids), 25):
            batch = sorted_label_ids[start:start + 25]
            labels.update(
                fetch_entities(batch, props="labels")
            )
            time.sleep(1.0)

        def named_entities(entity, property_id):
            result = []

            for qid in claim_entity_ids(entity, property_id):
                name = (
                    labels.get(qid, {})
                    .get("labels", {})
                    .get("en", {})
                    .get("value", qid)
                )

                result.append({
                    "wikidata_id": qid,
                    "name": name,
                })

            return result

        for row in audit_rows:
            evidence = []

            for qid in qids_by_musician[row["musician_id"]]:
                entity = entities.get(qid, {})

                evidence.append({
                    "wikidata_id": qid,
                    "wikidata_label": (
                        entity.get("labels", {})
                        .get("en", {})
                        .get("value", "")
                    ),
                    "wikidata_description": (
                        entity.get("descriptions", {})
                        .get("en", {})
                        .get("value", "")
                    ),
                    "musicbrainz_ids": claim_values(
                        entity, "P434"
                    ),
                    "apple_music_ids": claim_values(
                        entity, "P2850"
                    ),
                    "occupations": named_entities(
                        entity, "P106"
                    ),
                    "instruments": named_entities(
                        entity, "P1303"
                    ),
                    "bands": named_entities(
                        entity, "P463"
                    ),
                })

            row["wikidata_evidence_json"] = json.dumps(
                evidence,
                ensure_ascii=False,
            )

            role_keywords = {
                "vocalist": ("singer", "vocalist", "voice"),
                "guitarist": ("guitarist", "guitar"),
                "drummer": ("drummer", "drum kit", "percussionist"),
                "bassist": ("bassist", "bass guitar", "double bass"),
                "mc": ("rapper", "hip hop musician"),
                "dj": ("disc jockey", "turntablist", "dj"),
            }

            accepted = {
                normalize(name.strip())
                for name in row["accepted_names"].split(" | ")
            }

            supported = []

            for candidate in evidence:
                if normalize(candidate["wikidata_label"]) not in accepted:
                    continue

                terms = [
                    item["name"].casefold()
                    for field in ("occupations", "instruments")
                    for item in candidate[field]
                ]

                keywords = role_keywords.get(args.role, ())

                if any(
                    keyword in term
                    for keyword in keywords
                    for term in terms
                ):
                    supported.append(candidate)

            row["suggested_wikidata_id"] = ""
            row["suggested_musicbrainz_id"] = ""
            row["suggested_bands"] = ""

            if not args.role:
                row["identity_review_status"] = "role_required"
            elif len(supported) == 0:
                row["identity_review_status"] = "needs_review"
            elif len(supported) > 1:
                row["identity_review_status"] = "ambiguous_identity"
            else:
                chosen = supported[0]
                row["identity_review_status"] = "suggested_unverified"
                row["suggested_wikidata_id"] = chosen["wikidata_id"]

                musicbrainz_ids = chosen["musicbrainz_ids"]
                if len(musicbrainz_ids) == 1:
                    row["suggested_musicbrainz_id"] = musicbrainz_ids[0]

                row["suggested_bands"] = " | ".join(
                    item["name"] for item in chosen["bands"]
                )

        print(
            f"Enriched {len(all_qids)} unverified "
            "Wikidata candidates with identity and membership evidence."
        )

    fieldnames = [
        "musician_id",
        "musician_name",
        "status",
        "apple_music_artist_id",
        "apple_music_title",
        "accepted_names",
        "matched_candidates",
        "notes",
    ]

    if args.wikidata:
        fieldnames.extend([
            "wikidata_status",
            "wikidata_candidates",
            "wikidata_evidence_json",
            "identity_review_status",
            "suggested_wikidata_id",
            "suggested_musicbrainz_id",
            "suggested_bands",
        ])

    with output_path.open(
        "w",
        newline="",
        encoding="utf-8",
    ) as f:
        writer = csv.DictWriter(
            f,
            fieldnames=fieldnames,
        )

        writer.writeheader()
        writer.writerows(
            audit_rows
        )

    print()
    print(
        "Wrote:",
        output_path,
    )

    counts = defaultdict(int)

    for row in audit_rows:
        counts[
            row["status"]
        ] += 1

    for status in sorted(
        counts
    ):
        print(
            f"{status}: "
            f"{counts[status]}"
        )


if __name__ == "__main__":
    main()
