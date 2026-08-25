"""Converter that turns flat roadmap seed lists into structured graph files.

Reads the flat topic name lists and writes a graph format with stable ids
and explicit prerequisites. Prerequisites default to empty; curated pairs
are applied from the overrides table below. Run once, then edit the
generated JSON by hand as the graph is refined.
"""

import json
from pathlib import Path

DATA_DIR = Path(__file__).parent / "data" / "curated" / "roadmaps"

# Curated prerequisite edges per slug: topic name to required topic names.
OVERRIDES = {
    "python": {
        "Variables and Data Types": ["Basic Syntax"],
        "Conditionals": ["Variables and Data Types"],
        "Loops": ["Conditionals"],
        "Functions": ["Loops"],
        "Lists": ["Functions"],
        "Tuples": ["Lists"],
        "Sets": ["Lists"],
        "Dictionaries": ["Lists"],
        "Object Oriented Programming": ["Functions"],
        "Classes": ["Object Oriented Programming"],
        "Inheritance": ["Classes"],
        "Methods": ["Classes"],
        "Encapsulation": ["Classes"],
        "Decorators": ["Functions"],
        "Lambdas": ["Functions"],
        "List Comprehensions": ["Lists", "Loops"],
        "Generator Expressions": ["Lambdas", "Loops"],
        "Type Annotations": ["Functions"],
        "Exceptions": ["Functions"],
        "File Handling": ["Functions"],
        "FastAPI": ["Type Annotations", "Pydantic"],
        "Flask": ["Functions"],
        "Django": ["Object Oriented Programming"],
        "pytest": ["Functions"],
        "Threading": ["GIL"],
        "Multiprocessing": ["GIL"],
        "Asynchrony": ["Functions"],
    },
    "frontend": {
        "HTML": ["How the internet works"],
        "CSS": ["HTML"],
        "JavaScript": ["HTML", "CSS"],
        "Git": ["How the internet works"],
        "GitHub": ["Git"],
        "GitLab": ["Git"],
        "React": ["JavaScript"],
        "Vue.js": ["JavaScript"],
        "Angular": ["JavaScript"],
        "Svelte": ["JavaScript"],
        "Solid JS": ["JavaScript"],
        "Tailwind": ["CSS"],
        "Vite": ["JavaScript", "npm"],
        "npm": ["JavaScript"],
        "yarn": ["npm"],
        "pnpm": ["npm"],
        "TypeScript": ["JavaScript"],
        "Next.js": ["React"],
        "Nuxt.js": ["Vue.js"],
        "SvelteKit": ["Svelte"],
        "Astro": ["JavaScript"],
        "GraphQL": ["JavaScript"],
        "Apollo": ["GraphQL"],
        "Relay Modern": ["GraphQL"],
        "Accessibility": ["HTML", "CSS"],
        "Service Workers": ["JavaScript"],
        "React Native": ["React"],
        "Node.js": ["JavaScript"],
        "Electron": ["Node.js"],
    },
}


def topic_to_id(name: str) -> str:
    return name.lower().replace(" ", "-").replace(".", "")


def convert(slug: str) -> None:
    flat_path = DATA_DIR / f"{slug}.json"
    with flat_path.open("r", encoding="utf-8") as file:
        payload = json.load(file)
    names = payload["topics"]
    overrides = OVERRIDES.get(slug, {})
    nodes = []
    for name in names:
        prereqs = [
            {"id": topic_to_id(p), "name": p} for p in overrides.get(name, [])
        ]
        nodes.append({"id": topic_to_id(name), "name": name, "prerequisites": prereqs})
    graph = {
        "slug": slug,
        "source": payload.get("source"),
        "nodes": nodes,
    }
    out_path = DATA_DIR / f"{slug}.graph.json"
    with out_path.open("w", encoding="utf-8") as file:
        json.dump(graph, file, ensure_ascii=False, indent=2)
    print(f"wrote {out_path.name}: {len(nodes)} nodes")


if __name__ == "__main__":
    for path in DATA_DIR.glob("*.json"):
        if path.stem.endswith(".graph"):
            continue
        convert(path.stem)
