import json
import random
import sys
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
sys.path.insert(0, str(Path(__file__).resolve().parent))

from prompts import SYSTEM_PROMPT, build_user_prompt  # noqa: E402

SOURCE = ROOT / "data" / "source" / "annotations.json"
OUTPUT = ROOT / "data" / "processed"


def to_chat_record(example: dict) -> dict:
    assistant_json = json.dumps(
        example["analysis"], ensure_ascii=False, separators=(",", ":")
    )
    return {
        "messages": [
            {"role": "system", "content": SYSTEM_PROMPT},
            {
                "role": "user",
                "content": build_user_prompt(
                    example["resume"], example["job_description"]
                ),
            },
            {"role": "assistant", "content": assistant_json},
        ]
    }


def write_jsonl(path: Path, records: list[dict]) -> None:
    with path.open("w", encoding="utf-8") as handle:
        for record in records:
            handle.write(json.dumps(record, ensure_ascii=False) + "\n")


def main() -> None:
    examples = json.loads(SOURCE.read_text(encoding="utf-8"))
    if len(examples) < 6:
        raise ValueError("Provide at least six examples to create three splits.")

    ids = [item["id"] for item in examples]
    if len(ids) != len(set(ids)):
        raise ValueError("Every annotation id must be unique.")

    rng = random.Random(42)
    rng.shuffle(examples)

    # Smoke-test split. For real data, group by person before splitting.
    n = len(examples)
    test_count = max(1, round(n * 0.15))
    valid_count = max(1, round(n * 0.15))
    train_count = n - valid_count - test_count
    if train_count < 1:
        raise ValueError("Not enough examples remain for training.")

    split_examples = {
        "train": examples[:train_count],
        "valid": examples[train_count : train_count + valid_count],
        "test": examples[train_count + valid_count :],
    }

    OUTPUT.mkdir(parents=True, exist_ok=True)
    for split, items in split_examples.items():
        records = [to_chat_record(item) for item in items]
        write_jsonl(OUTPUT / f"{split}.jsonl", records)
        print(f"{split}: {len(records)} examples")


if __name__ == "__main__":
    main()
