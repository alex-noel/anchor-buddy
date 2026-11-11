#!/usr/bin/env python3
"""Build/verify planning artifacts. Uses only the Python standard library."""

import argparse
import csv
import io
import json
import re
from pathlib import Path

ROOT = Path(__file__).resolve().parent
ORDER = ["FOUNDATION", "DATA", "SAFE", "APP", "WATCH", "OPS", "QA"]
FINAL_INPUTS = {
    "APP-02": ["SAFE-02"],
    "APP-03": ["DATA-05", "SAFE-03"],
    "APP-07": ["WATCH-01", "WATCH-02"],
    "APP-08": ["WATCH-03"],
    "OPS-03": ["DATA-08"],
    "OPS-04": ["WATCH-01", "WATCH-02", "WATCH-03", "QA-01", "QA-02", "SAFE-04"],
    "QA-01": [f"APP-{number:02}" for number in range(2, 9)],
    "QA-02": ["WATCH-01", "WATCH-02"],
}
SLOTS = {
    "lead": ["FOUNDATION-01", "FOUNDATION-02", "QA-04"],
    "W1": ["OPS-04", "SAFE-01", "DATA-04", "SAFE-03", "QA-02"],
    "W2": ["DATA-01", "OPS-02", "APP-05", "OPS-03", "DATA-08"],
    "W3": ["APP-01", "DATA-02", "DATA-03", "DATA-06", "APP-04"],
    "W4": ["WATCH-01", "APP-02", "DATA-05", "DATA-07", "APP-06", "WATCH-04"],
    "W5": ["WATCH-02", "WATCH-03", "APP-08", "APP-03", "SAFE-04"],
    "W6": ["OPS-01", "QA-01", "SAFE-02", "APP-07", "QA-03"],
}
# Inclusive working-day targets; external gates can prevent final completion.
DAYS = {
    "FOUNDATION-01": (1, 1), "FOUNDATION-02": (1, 2),
    "DATA-01": (2, 3), "DATA-02": (4, 5), "DATA-03": (5, 6),
    "DATA-04": (4, 5), "DATA-05": (5, 6), "DATA-06": (6, 7),
    "DATA-07": (6, 7), "DATA-08": (8, 9),
    "SAFE-01": (3, 4), "SAFE-02": (5, 6), "SAFE-03": (6, 7),
    "SAFE-04": (8, 9),
    "APP-01": (2, 4), "APP-02": (4, 5), "APP-03": (7, 8),
    "APP-04": (7, 8), "APP-05": (5, 6), "APP-06": (7, 8),
    "APP-07": (7, 9), "APP-08": (6, 7),
    "WATCH-01": (2, 4), "WATCH-02": (2, 4), "WATCH-03": (4, 6),
    "WATCH-04": (7, 10),
    "OPS-01": (2, 4), "OPS-02": (3, 5), "OPS-03": (6, 9),
    "OPS-04": (1, 9),
    "QA-01": (4, 9), "QA-02": (7, 9), "QA-03": (8, 10),
    "QA-04": (1, 10),
}


def parse_metadata(text):
    assert text.startswith("---\n"), "Missing frontmatter"
    metadata = {}
    for line in text.split("---", 2)[1].strip().splitlines():
        key, value = line.split(":", 1)
        value = value.strip()
        if value.startswith("["):
            value = [item.strip() for item in value[1:-1].split(",") if item.strip()]
        elif value.isdigit() or value in ("true", "false", "null") or value.startswith('"'):
            value = json.loads(value)
        metadata[key] = value
    return metadata


def expand_ac_references(row, task_id):
    references = set()
    expressions = re.findall(r"AC(\d{2}(?:[–-](?:AC)?\d{2})?(?:,\s*(?:AC)?\d{2}(?:[–-](?:AC)?\d{2})?)*)", row)
    for expression in expressions:
        for low, high in re.findall(r"(\d{2})(?:[–-](?:AC)?(\d{2}))?", expression):
            references.update(range(int(low), int(high or low) + 1))
    # DATA briefs have an explicit final AC column containing short numbers.
    if task_id.startswith("DATA-"):
        last_cell = row.strip().strip("|").split("|")[-1]
        for low, high in re.findall(r"\b(\d{2})(?:[–-](\d{2}))?\b", last_cell):
            references.update(range(int(low), int(high or low) + 1))
    return references


def load_tasks():
    tasks, all_acs, all_tests = [], set(), set()
    files = sorted(ROOT.joinpath("tasks").glob("*.md"), key=lambda p: (ORDER.index(p.stem.rsplit("-", 1)[0]), p.stem))
    for path in files:
        text = path.read_text()
        meta = parse_metadata(text)
        task_id = meta["id"]
        assert path.stem == task_id, (path, task_id)
        assert meta["priority"] in ("P0", "P1")
        assert isinstance(meta["estimate_hours"], int) and meta["estimate_hours"] > 0
        acs = re.findall(r"^- (?:\*\*)?(" + re.escape(task_id) + r"-AC\d{2})", text, re.M)
        rows = re.findall(r"^\| [A-Z0-9-]+-T\d{2}[^\n]*", text, re.M)
        tests = [re.match(r"\| ([A-Z0-9-]+-T\d{2})", row)[1] for row in rows]
        assert len(acs) == len(set(acs)) and not all_acs.intersection(acs), f"Duplicate AC in {task_id}"
        assert len(tests) == len(set(tests)) and not all_tests.intersection(tests), f"Duplicate test in {task_id}"
        assert acs and tests, f"Missing AC/test list in {task_id}"
        defined = {int(ac.rsplit("AC", 1)[1]) for ac in acs}
        mapped = set()
        for row in rows:
            refs = expand_ac_references(row, task_id)
            assert refs, f"Unmapped test row in {task_id}: {row}"
            assert refs <= defined, f"Undefined AC mapping in {task_id}: {refs - defined}"
            mapped.update(refs)
        assert mapped == defined, f"Unmapped AC in {task_id}: {defined - mapped}"
        all_acs.update(acs)
        all_tests.update(tests)
        slot = [key for key, ids in SLOTS.items() if task_id in ids]
        assert len(slot) == 1, f"Missing/duplicate slot for {task_id}"
        start, end = DAYS[task_id]
        assert 1 <= start <= end <= 10
        meta.update({
            "brief": f"tasks/{task_id}.md",
            "common_instructions": "WORKER_INSTRUCTIONS.md",
            "status": "planned",
            "baseline_sha": None,
            "assigned_worker": None,
            "suggested_slot": slot[0],
            "target_start_workday": start,
            "target_finish_workday": end,
            "final_integration_inputs": FINAL_INPUTS.get(task_id, []),
            "acceptance_criteria": acs,
            "test_cases": tests,
        })
        tasks.append((meta, text))
    ids = {meta["id"] for meta, _ in tasks}
    assert ids == set(DAYS), "Schedule/task inventory mismatch"
    assert ids == {task for group in SLOTS.values() for task in group}, "Slot inventory mismatch"
    for meta, _ in tasks:
        for dep in meta["dependencies"] + meta["final_integration_inputs"]:
            assert dep in ids and dep != meta["id"], f"Invalid dependency: {meta['id']} -> {dep}"
    for meta, _ in tasks:
        meta["final_status_inputs"] = sorted(ids - {meta["id"]}) if meta["id"] == "QA-04" else []
    graph = {meta["id"]: meta["dependencies"] + meta["final_integration_inputs"] for meta, _ in tasks}
    visited, visiting = set(), set()

    def visit(task_id):
        assert task_id not in visiting, f"Dependency cycle through {task_id}"
        if task_id in visited:
            return
        visiting.add(task_id)
        for dep in graph[task_id]:
            visit(dep)
        visiting.remove(task_id)
        visited.add(task_id)

    for task_id in graph:
        visit(task_id)
    return tasks, len(all_acs), len(all_tests)


def render_artifacts(tasks, ac_count, test_count):
    base_hours = sum(meta["estimate_hours"] for meta, _ in tasks)
    manifest = {
        "schema_version": 1,
        "project": "Anchor Buddy",
        "planning_date": "2026-11-11",
        "window_start": "2026-11-12",
        "window_end": "2026-11-25",
        "timezone": "Europe/Warsaw",
        "working_days": 10,
        "implementation_slots": 6,
        "dedicated_integrator": True,
        "base_task_hours": base_hours,
        "contingency_percent": 20,
        "hours_with_contingency": round(base_hours * 1.2, 1),
        "additional_team_review_coordination_hours": {"min": 35, "max": 45},
        "acceptance_criteria_count": ac_count,
        "test_case_count": test_count,
        "dependency_semantics": "Reviewed engineering code/contracts are prerequisites; missing external evidence remains blocked and never authorizes capability activation.",
        "final_input_semantics": "Later evidence needed for final acceptance, not an obstacle to independent early preparation. QA-04 consumes every task's status, including blocked/not-run; it does not require all tasks to pass.",
        "physical_watch_trials": {"runs_per_platform": 2, "minimum_hours_per_run": 8, "platforms": ["iOS", "Android"], "target_nights": ["2026-11-23/2026-11-24", "2026-11-24/2026-11-25"]},
        "tasks": [meta for meta, _ in tasks],
    }
    index = [
        "# Task index\n",
        f"**{len(tasks)} task briefs · {base_hours} base hours · {ac_count} acceptance criteria · {test_count} explicit test cases.**\n",
        "Attach [common worker instructions](WORKER_INSTRUCTIONS.md), the chosen full brief, baseline/prerequisite SHAs and the integrator's file reservation. [DISPATCH.md](DISPATCH.md) controls calendar sequencing and later integration inputs. The days below are targets; external gates can leave required ACs blocked.\n",
        "| Task | Instruction / outcome | Priority | Hours | Target days | Engineering prerequisites | Expert review |",
        "| --- | --- | --- | ---: | --- | --- | --- |",
    ]
    for meta, _ in tasks:
        deps = ", ".join(f"[{dep}](tasks/{dep}.md)" for dep in meta["dependencies"]) or "None"
        index.append(f"| [{meta['id']}]({meta['brief']}) | {meta['title']} | {meta['priority']} | {meta['estimate_hours']} | D{meta['target_start_workday']}–D{meta['target_finish_workday']} | {deps} | {'Required' if meta['expert_review'] else 'Standard'} |")
    index.extend(["", "## External gates", "", "A task with external gates can have correct merged engineering while required ACs remain blocked. It must not be marked done or activate an unapproved capability.", ""])
    for meta, _ in tasks:
        if meta["external_gate"]:
            index.append(f"- **[{meta['id']}]({meta['brief']}):** {meta['external_gate']}")
    output = io.StringIO(newline="")
    columns = ["id", "title", "priority", "estimate_hours", "lane", "suggested_slot", "target_start_workday", "target_finish_workday", "dependencies", "final_integration_inputs", "final_status_inputs", "expert_review", "external_gate", "status", "brief", "ac_count", "test_count"]
    writer = csv.DictWriter(output, fieldnames=columns, lineterminator="\n")
    writer.writeheader()
    for meta, _ in tasks:
        row = {key: meta.get(key) for key in columns}
        for key in ("dependencies", "final_integration_inputs", "final_status_inputs"):
            row[key] = ";".join(meta[key])
        row["ac_count"], row["test_count"] = len(meta["acceptance_criteria"]), len(meta["test_cases"])
        writer.writerow(row)
    book = [
        "# Anchor Buddy — complete two-week worker task book\n",
        "Generated from the common instructions and individual briefs. Edit the source files, then run `python3 docs/plans/2026-11-12-two-week/build_plan.py`. For dates, resources, ownership and final integration gates read [DISPATCH.md](DISPATCH.md); for scope read [README.md](README.md).\n",
        f"{len(tasks)} tasks; {base_hours} base hours; {ac_count} ACs; {test_count} test cases.\n",
        "---\n",
        ROOT.joinpath("WORKER_INSTRUCTIONS.md").read_text(),
    ]
    for meta, text in tasks:
        body = text.split("---", 2)[2].lstrip()
        book.extend(["\n---\n", f"Task source: [{meta['id']}]({meta['brief']}) · {meta['estimate_hours']}h · {meta['priority']} · prerequisites: {', '.join(meta['dependencies']) or 'none'}\n", body])
    return {
        "manifest.json": json.dumps(manifest, indent=2, ensure_ascii=False) + "\n",
        "dispatch.csv": output.getvalue(),
        "TASK_INDEX.md": "\n".join(index) + "\n",
        "ALL_TASKS.md": "\n".join(book),
    }


def validate_markdown_links():
    for path in ROOT.rglob("*.md"):
        text = path.read_text()
        for destination in re.findall(r"\]\(([^)]+)\)", text):
            if "://" in destination or destination.startswith(("#", "mailto:")):
                continue
            target = destination.split("#", 1)[0].strip("<>")
            assert path.parent.joinpath(target).exists(), f"Broken link in {path.name}: {target}"


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--check", action="store_true", help="Validate existing generated artifacts without writing")
    args = parser.parse_args()
    tasks, acs, tests = load_tasks()
    artifacts = render_artifacts(tasks, acs, tests)
    for name, content in artifacts.items():
        path = ROOT / name
        if args.check:
            assert path.exists() and path.read_bytes() == content.encode(), f"Generated artifact out of date: {name}"
        else:
            path.write_bytes(content.encode())
    validate_markdown_links()
    print(f"Validated {len(tasks)} tasks, {acs} mapped ACs, {tests} tests, {sum(m['estimate_hours'] for m, _ in tasks)} base hours; dependency graph and local Markdown links valid.")


if __name__ == "__main__":
    main()
