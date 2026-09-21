import json
from pathlib import Path

from jsonschema import Draft202012Validator

ROOT = Path(__file__).resolve().parents[1]
DATA = ROOT / "data" / "processed"

ANALYSIS_SCHEMA = {
    "type": "object",
    "additionalProperties": False,
    "required": [
        "overall_score",
        "category_scores",
        "matched_skills",
        "missing_skills",
        "strengths",
        "issues",
        "rewrites",
        "limitations",
    ],
    "properties": {
        "overall_score": {"type": "integer", "minimum": 0, "maximum": 100},
        "category_scores": {
            "type": "object",
            "additionalProperties": False,
            "required": ["job_relevance", "impact", "clarity", "completeness"],
            "properties": {
                key: {"type": "integer", "minimum": 0, "maximum": 100}
                for key in ["job_relevance", "impact", "clarity", "completeness"]
            },
        },
        "matched_skills": {"type": "array", "items": {"type": "string"}},
        "missing_skills": {"type": "array", "items": {"type": "string"}},
        "strengths": {
            "type": "array",
            "items": {
                "type": "object",
                "additionalProperties": False,
                "required": ["evidence", "reason"],
                "properties": {
                    "evidence": {"type": "string"},
                    "reason": {"type": "string"},
                },
            },
        },
        "issues": {
            "type": "array",
            "items": {
                "type": "object",
                "additionalProperties": False,
                "required": ["section", "excerpt", "severity", "reason", "suggestion"],
                "properties": {
                    "section": {"type": "string"},
                    "excerpt": {"type": "string"},
                    "severity": {"enum": ["low", "medium", "high"]},
                    "reason": {"type": "string"},
                    "suggestion": {"type": "string"},
                },
            },
        },
        "rewrites": {
            "type": "array",
            "items": {
                "type": "object",
                "additionalProperties": False,
                "required": ["original", "suggested", "facts_added"],
                "properties": {
                    "original": {"type": "string"},
                    "suggested": {"type": "string"},
                    "facts_added": {"const": False},
                },
            },
        },
        "limitations": {"type": "array", "items": {"type": "string"}},
    },
}


def main() -> None:
    validator = Draft202012Validator(ANALYSIS_SCHEMA)
    total = 0
    for split in ("train", "valid", "test"):
        path = DATA / f"{split}.jsonl"
        if not path.exists():
            raise FileNotFoundError(f"Missing {path}; run prepare_data.py first.")
        with path.open(encoding="utf-8") as handle:
            for line_number, line in enumerate(handle, start=1):
                record = json.loads(line)
                messages = record.get("messages", [])
                if [m.get("role") for m in messages] != ["system", "user", "assistant"]:
                    raise ValueError(f"{path}:{line_number}: invalid role sequence")
                analysis = json.loads(messages[-1]["content"])
                errors = list(validator.iter_errors(analysis))
                if errors:
                    raise ValueError(
                        f"{path}:{line_number}: {errors[0].message}"
                    )
                total += 1
    print(f"Validated {total} examples across all splits.")


if __name__ == "__main__":
    main()
