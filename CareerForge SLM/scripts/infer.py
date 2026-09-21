import argparse
import json
import sys
from pathlib import Path

from mlx_lm import generate, load

sys.path.insert(0, str(Path(__file__).resolve().parent))
from prompts import SYSTEM_PROMPT, build_user_prompt  # noqa: E402

ROOT = Path(__file__).resolve().parents[1]
MODEL_ID = "mlx-community/Qwen3-4B-Instruct-2507-4bit"
DEFAULT_ADAPTER = ROOT / "adapters" / "careerforge-qwen3-4b"


def parse_args() -> argparse.Namespace:
    parser = argparse.ArgumentParser()
    parser.add_argument("--resume", type=Path, required=True)
    parser.add_argument("--job", type=Path, required=True)
    parser.add_argument("--adapter", type=Path, default=DEFAULT_ADAPTER)
    parser.add_argument("--no-adapter", action="store_true")
    parser.add_argument("--max-tokens", type=int, default=1400)
    return parser.parse_args()


def extract_json(text: str) -> dict:
    cleaned = text.strip()
    if cleaned.startswith("```"):
        cleaned = cleaned.removeprefix("```json").removeprefix("```")
        cleaned = cleaned.removesuffix("```").strip()
    return json.loads(cleaned)


def main() -> None:
    args = parse_args()
    resume = args.resume.read_text(encoding="utf-8")
    job = args.job.read_text(encoding="utf-8")

    adapter_path = None if args.no_adapter else str(args.adapter)
    if adapter_path and not args.adapter.exists():
        raise FileNotFoundError(
            f"Adapter not found at {args.adapter}. Train it first or use --no-adapter."
        )

    model, tokenizer = load(MODEL_ID, adapter_path=adapter_path)
    messages = [
        {"role": "system", "content": SYSTEM_PROMPT},
        {"role": "user", "content": build_user_prompt(resume, job)},
    ]
    prompt = tokenizer.apply_chat_template(
        messages,
        tokenize=False,
        add_generation_prompt=True,
    )
    raw = generate(
        model,
        tokenizer,
        prompt=prompt,
        max_tokens=args.max_tokens,
        verbose=True,
    )

    try:
        analysis = extract_json(raw)
    except json.JSONDecodeError as exc:
        output_dir = ROOT / "outputs"
        output_dir.mkdir(exist_ok=True)
        (output_dir / "invalid_raw_output.txt").write_text(raw, encoding="utf-8")
        raise SystemExit(
            f"Model did not return valid JSON: {exc}. Raw output was saved."
        ) from exc

    output_dir = ROOT / "outputs"
    output_dir.mkdir(exist_ok=True)
    output_path = output_dir / "latest_analysis.json"
    output_path.write_text(
        json.dumps(analysis, indent=2, ensure_ascii=False), encoding="utf-8"
    )
    print(f"\nSaved parsed analysis to {output_path}")


if __name__ == "__main__":
    main()
