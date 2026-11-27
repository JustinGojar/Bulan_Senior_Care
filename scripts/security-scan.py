"""Redacted secret and exposed-file checks. Heuristics, not a guarantee of no secrets."""
import argparse
import pathlib
import re
import subprocess
import sys

ROOT = pathlib.Path(__file__).resolve().parents[1]
PATTERNS = {
    "private key": rb"-----BEGIN (?:RSA |EC |OPENSSH )?PRIVATE KEY-----",
    "GitHub token": rb"\b(?:gh[pousr]_[A-Za-z0-9]{30,}|github_pat_[A-Za-z0-9_]{40,})",
    "AWS access key": rb"\b(?:AKIA|ASIA)[A-Z0-9]{16}\b",
    "provider secret": rb"\b(?:sk_live_|sk-proj-|xkeysib-)[A-Za-z0-9_-]{20,}",
    "Laravel app key": rb"(?m)^APP_KEY=base64:[A-Za-z0-9+/]{40,}={0,2}\s*$",
    "assigned API credential": rb'''(?i)(?:api[_-]?key|client[_-]?secret|access[_-]?token)\s*[=:]\s*["'][A-Za-z0-9/+_=-]{32,}["']''',
}


def git(*args):
    return subprocess.check_output(["git", *args], cwd=ROOT)


def inspect(label, contents):
    results = []
    for kind, pattern in PATTERNS.items():
        for match in re.finditer(pattern, contents):
            line = contents[:match.start()].count(b"\n") + 1
            results.append(f"{label}:{line}: possible {kind} (value redacted)")
    return results


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--history", action="store_true", help="also scan text blobs in locally available Git history")
    args = parser.parse_args()
    findings = []
    tracked = git("ls-files", "-z").decode().split("\0")
    for name in filter(None, tracked):
        path = ROOT / name
        if path.name.startswith(".env") and path.name != ".env.example":
            findings.append(f"{name}: environment file must not be tracked")
        if not path.is_file() or path.stat().st_size > 2_000_000:
            continue
        data = path.read_bytes()
        if b"\0" not in data:
            findings.extend(inspect(name, data))
    for folder in ["backend/public", "frontend/public", "frontend/.output/public"]:
        for path in (ROOT / folder).rglob("*"):
            if path.is_file() and (path.name.startswith(".env") or path.name == ".git"
                                   or path.suffix.lower() in [".sql", ".sqlite", ".pem", ".key", ".log", ".bak", ".map"]):
                findings.append(f"{path.relative_to(ROOT)}: sensitive file in public output")
    if args.history:
        objects = git("rev-list", "--objects", "--all").decode().splitlines()
        process = subprocess.Popen(["git", "cat-file", "--batch"], cwd=ROOT, stdin=subprocess.PIPE, stdout=subprocess.PIPE)
        count = 0
        for entry in objects:
            oid, _, name = entry.partition(" ")
            process.stdin.write((oid + "\n").encode())
            process.stdin.flush()
            header = process.stdout.readline().split()
            if len(header) != 3:
                continue
            size = int(header[2])
            data = process.stdout.read(size)
            process.stdout.read(1)
            if header[1] == b"blob" and size <= 2_000_000 and b"\0" not in data:
                count += 1
                findings.extend(inspect(f"history {oid[:12]} {name}", data))
        process.stdin.close()
        process.stdout.close()
        process.wait()
        print(f"Scanned {count} text blobs in local Git history.")
    for finding in findings:
        print(finding)
    print(f"Checked tracked files and public output: {len(findings)} candidate finding(s). Secret values are never printed.")
    return int(bool(findings))


if __name__ == "__main__":
    sys.exit(main())
