#!/usr/bin/env python3
"""Drift check: compare the live Japan Places OpenAPI spec against SYNC.json.

Exit codes: 0 = in sync, 2 = drift detected, 3 = fetch/parse error.
Used by the sora capture-fleet stream `mcp_drift` (daily): a non-zero exit
lands in the fleet status as a failure, which queues the follow-up work
item "re-run generator + smoke + republish".
"""
import argparse
import json
import socket
import subprocess
import sys
import urllib.request
from pathlib import Path

# sora's IPv6 egress blackholes SYNs (urllib hangs walking AAAA records);
# force AF_INET for this checker's HTTP fetches. Harmless elsewhere.
_orig_getaddrinfo = socket.getaddrinfo


def _ipv4_getaddrinfo(host, port, family=0, type=0, proto=0, flags=0):
    return _orig_getaddrinfo(host, port, socket.AF_INET, type, proto, flags)


socket.getaddrinfo = _ipv4_getaddrinfo

DEFAULT_URL = "https://japan-places.local-connect-design.trade/api/v1/openapi"


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument("--sync", default=str(Path(__file__).resolve().parent.parent / "SYNC.json"))
    ap.add_argument("--url", default=DEFAULT_URL)
    ap.add_argument("--timeout", type=int, default=30)
    args = ap.parse_args()

    try:
        with open(args.sync, encoding="utf-8") as f:
            sync = json.load(f)
    except Exception as e:
        print(f"ERROR: cannot read SYNC.json ({args.sync}): {e}")
        return 3

    live = None
    last_err = None
    for _attempt in range(3):
        try:
            req = urllib.request.Request(
                args.url,
                headers={"accept": "application/json", "Accept-Encoding": "identity"},
            )
            with urllib.request.urlopen(req, timeout=args.timeout) as res:
                live = json.loads(res.read().decode("utf-8"))
            break
        except Exception as e:  # IncompleteRead and transient network errors retry
            last_err = e
    if live is None:
        # Fallback: some proxies truncate urllib reads; curl handles them.
        try:
            out = subprocess.run(
                ["curl", "-fsS", "--max-time", str(args.timeout), args.url],
                capture_output=True, timeout=args.timeout + 10, check=True,
            )
            live = json.loads(out.stdout.decode("utf-8"))
        except Exception as e:
            last_err = e
    if live is None:
        print(f"ERROR: cannot fetch live spec {args.url}: {last_err}")
        return 3

    live_hash = live.get("info", {}).get("x-catalog-hash")
    sync_hash = sync.get("catalog_hash")
    live_paths = set(live.get("paths", {}).keys())
    sync_paths = set(sync.get("paths_covered", []))

    added = sorted(live_paths - sync_paths)
    removed = sorted(sync_paths - live_paths)
    hash_ok = live_hash == sync_hash
    paths_ok = not added and not removed

    if hash_ok and paths_ok:
        print(f"IN SYNC catalog_hash={live_hash} paths={len(live_paths)}")
        return 0

    print("DRIFT DETECTED")
    print(f"catalog_hash: sync={sync_hash} live={live_hash}")
    if added:
        print(f"added: {added}")
    if removed:
        print(f"removed: {removed}")
    return 2


if __name__ == "__main__":
    sys.exit(main())
