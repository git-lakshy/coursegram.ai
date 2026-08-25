"""Ingest all public roadmap.sh roadmaps into local JSON seed files.

The public index endpoint no longer exists, so slugs are scraped from the
roadmaps listing page and each roadmap's content JSON is fetched from
https://roadmap.sh/{slug}.json. Topic names are extracted into a flat
ordered list per slug so the rest of the app can treat ingested roadmaps
the same way as the curated seeds. Re-run any time to refresh.
"""

import json
import re
from pathlib import Path
from urllib.request import Request, urlopen

LISTING_URL = "https://roadmap.sh/roadmaps"
ROADMAP_URL_TEMPLATE = "https://roadmap.sh/{slug}.json"
DATA_DIR = Path(__file__).parent / "data" / "ingested" / "roadmapsh"
SKIP_SLUGS = {"python", "frontend"}  # already curated as graph seeds
NON_ROADMAP_SLUGS = {
    "about",
    "guides",
    "videos",
    "login",
    "signup",
    "roadmaps",
    "best-practices",
    "questions",
    "account",
    "settings",
    "terms",
    "privacy",
    "faq",
}

TAG_PATTERN = re.compile(r"<[^>]+>")
SLUG_PATTERN = re.compile(r"^([a-z0-9-]+)$")


def fetch_json(url: str):
    request = Request(url, headers={"User-Agent": "Mozilla/5.0 coursegram-ingest"})
    with urlopen(request, timeout=30) as response:
        return json.load(response)


def scrape_slugs() -> list[str]:
    request = Request(LISTING_URL, headers={"User-Agent": "Mozilla/5.0 coursegram-ingest"})
    with urlopen(request, timeout=30) as response:
        html = response.read().decode("utf-8", "replace")
    found = re.findall(r'href="/([a-z0-9-]+)"', html)
    slugs = []
    for slug in found:
        if slug in NON_ROADMAP_SLUGS or slug in slugs:
            continue
        if not SLUG_PATTERN.match(slug):
            continue
        slugs.append(slug)
    return slugs


def clean_label(text: str) -> str:
    cleaned = TAG_PATTERN.sub("", str(text)).replace("`", "")
    return re.sub(r"\s+", " ", cleaned).strip()


SKIP_LABELS = {"", "horizontal node", "vertical node"}
LABEL_MAX_LENGTH = 60
JUNK_PATTERNS = (
    "roadmap.sh",
    "roadmap",
    "http",
    "related",
    "detailed version",
    "click here",
    "community",
    "youtube",
    "twitter",
    "discord",
    "newsletter",
    "subscribe",
    "official documentation",
)


def is_junk_label(label: str) -> bool:
    lowered = label.lower()
    if len(label) > LABEL_MAX_LENGTH:
        return True
    return any(pattern in lowered for pattern in JUNK_PATTERNS)


def collect_topics(nodes: list, out: list[str], seen: set[str]) -> None:
    """Walk roadmap nodes and collect topic labels in visual order.

    Roadmap content nodes carry their label in data.label. Nodes without a
    meaningful label are connectors or containers and are skipped. Labels
    that are navigation boilerplate rather than skills are filtered out.
    Nodes are ordered top to bottom, left to right by canvas position.
    """
    labeled = []
    for node in nodes:
        if not isinstance(node, dict):
            continue
        data = node.get("data") or {}
        label = clean_label(data.get("label", ""))
        if label in SKIP_LABELS or is_junk_label(label):
            continue
        position = node.get("position") or {}
        labeled.append((position.get("y", 0), position.get("x", 0), label))
    for _, _, label in sorted(labeled, key=lambda item: (item[0], item[1])):
        if label.lower() not in seen:
            seen.add(label.lower())
            out.append(label)


def topic_to_id(name: str) -> str:
    return re.sub(r"[^a-z0-9]+", "-", name.lower()).strip("-")


def ingest() -> None:
    slugs = scrape_slugs()
    print(f"found {len(slugs)} candidate slugs")

    DATA_DIR.mkdir(parents=True, exist_ok=True)
    saved = 0
    for slug in slugs:
        if slug in SKIP_SLUGS:
            continue
        try:
            content = fetch_json(ROADMAP_URL_TEMPLATE.format(slug=slug))
        except Exception:
            continue  # listing links that are not roadmap content pages
        if not isinstance(content, dict) or "nodes" not in content:
            continue

        topics: list[str] = []
        collect_topics(content.get("nodes", []) or [], topics, set())
        record = {
            "slug": slug,
            "title": content.get("title", slug),
            "source": f"https://roadmap.sh/{slug}",
            "description": content.get("description", ""),
            "topics": topics,
        }
        out_path = DATA_DIR / f"{slug}.json"
        with out_path.open("w", encoding="utf-8") as file:
            json.dump(record, file, ensure_ascii=False, indent=2)

        graph = {
            "slug": slug,
            "source": record["source"],
            "nodes": [
                {"id": topic_to_id(topic), "name": topic, "prerequisites": []}
                for topic in topics
            ],
        }
        graph_path = DATA_DIR / f"{slug}.graph.json"
        with graph_path.open("w", encoding="utf-8") as file:
            json.dump(graph, file, ensure_ascii=False, indent=2)

        saved += 1
        print(f"saved {slug}: {len(topics)} topics")

    print(f"ingested {saved} roadmaps into {DATA_DIR}")


if __name__ == "__main__":
    ingest()
