# CareerForge Resume SLM — MLX QLoRA Starter

This project fine-tunes `mlx-community/Qwen3-4B-Instruct-2507-4bit` on an
Apple Silicon Mac using MLX-LM. It is configured for a Mac mini M4 Pro with
24 GB unified memory.

The included annotations are only a smoke test. They prove that downloading,
dataset formatting, LoRA training, evaluation, and inference all run. They are
not enough to produce a trustworthy resume checker.

## 1. Check the Mac

Use macOS 15 or newer if possible. In Terminal:

```bash
uname -m
sw_vers
python3 --version
```

`uname -m` must print `arm64`. Use Python 3.10–3.12. If the command-line tools
are missing, install them once:

```bash
xcode-select --install
```

## 2. Create the environment

From this project's directory:

```bash
python3 -m venv .venv
source .venv/bin/activate
python -m pip install --upgrade pip
python -m pip install -r requirements.txt
```

Every later command assumes `.venv` is active.

## 3. Verify MLX and download the base model

```bash
python scripts/check_environment.py
python scripts/download_and_test.py
```

The second command downloads the approximately 2.3 GB, 4-bit MLX model from
Hugging Face into the local Hugging Face cache. The first run is slower.

## 4. Build the demonstration dataset

```bash
python scripts/prepare_data.py
python scripts/validate_data.py
```

This creates:

```text
data/processed/train.jsonl
data/processed/valid.jsonl
data/processed/test.jsonl
```

Each JSONL line is a chat conversation containing a system instruction, one
resume/job-description request, and a JSON-only assistant answer. The training
configuration masks the prompt, so loss is calculated on the assistant answer.

## 5. Run a short QLoRA smoke test

```bash
mlx_lm.lora --config config/lora_smoke.yaml
```

The trained adapter is written to:

```text
adapters/careerforge-qwen3-4b/
```

The smoke run uses only 40 iterations. Its purpose is to catch installation,
memory, and data-format errors—not to produce a useful model.

If macOS shows memory pressure, close other large applications and change
`max_seq_length` from `4096` to `2048` in the YAML file. You can also reduce
`num_layers` from `16` to `8`.

## 6. Evaluate adapter loss

```bash
mlx_lm.lora \
  --model mlx-community/Qwen3-4B-Instruct-2507-4bit \
  --adapter-path adapters/careerforge-qwen3-4b \
  --data data/processed \
  --test \
  --test-batches -1 \
  --max-seq-length 4096
```

Perplexity/loss is only a training diagnostic. The important product metrics
are JSON validity, unsupported-fact rate, expert agreement, skill-match
precision/recall, and rewrite usefulness.

## 7. Run the fine-tuned checker

```bash
python scripts/infer.py \
  --resume examples/resume.txt \
  --job examples/job_description.txt
```

The script loads the base model plus the adapter and writes the parsed response
to `outputs/latest_analysis.json`.

To use the checker from the CareerForge website, keep this directory inside the
`CareerForge` website repository and run from this directory with the MLX
environment active:

```bash
python api.py
```

Open `http://127.0.0.1:8000` in the browser. The same local server serves the
website and `POST /api/resume-check`, so no CORS setup is needed. Send JSON with
`resume` and `job_description` strings; the response is the model's analysis
JSON. `GET /api/health` reports whether the adapter file is present. The model
loads on the first request, which can take some time. Resume text is processed
in memory and is not written to an output file by the API. This server binds to
localhost and is intended for local development.

To compare against the original model:

```bash
python scripts/infer.py \
  --resume examples/resume.txt \
  --job examples/job_description.txt \
  --no-adapter
```

## 8. Replace the smoke data with real annotations

Edit `data/source/annotations.json`. Every item must contain:

```json
{
  "id": "unique-id",
  "resume": "Deidentified resume text",
  "job_description": "Target job description",
  "analysis": {
    "overall_score": 72,
    "category_scores": {
      "job_relevance": 75,
      "impact": 60,
      "clarity": 80,
      "completeness": 72
    },
    "matched_skills": ["Python"],
    "missing_skills": ["AWS"],
    "strengths": [],
    "issues": [],
    "rewrites": [],
    "limitations": []
  }
}
```

Then rerun `prepare_data.py`. Keep all resumes deidentified and consented. Do
not place raw student resumes in Git.

For a real experiment, start with at least several hundred carefully reviewed
pairs; a few thousand diverse pairs are preferable. Split by person before
training so versions of the same resume cannot appear in multiple splits.

For a real dataset, calculate training iterations as:

```text
iterations = ceil(number_of_training_examples / batch_size) * epochs
```

With 1,000 training examples, batch size 1, and 2 epochs, start near 2,000
iterations. Gradient accumulation changes the frequency of optimizer updates;
it does not change how many examples are read per iteration.

Create a copy of `config/lora_smoke.yaml`, increase `iters`, and keep a fixed
test set untouched until the final evaluation.

## 9. Fuse the adapter only after evaluation

You can serve the base model and adapter separately. If you need one fused MLX
model after evaluation:

```bash
mlx_lm.fuse \
  --model mlx-community/Qwen3-4B-Instruct-2507-4bit \
  --adapter-path adapters/careerforge-qwen3-4b \
  --save-path models/careerforge-resume-qwen3-4b
```

Do not commit the fused model or raw training data to the CareerForge GitHub
repository. Commit the scripts, configuration, schema, and API code. Store the
model in a model registry or private Hugging Face repository.

## Important limitations

- A language model should not be the sole source of a numeric hiring score.
- Keep deterministic keyword, section, date, and formatting checks outside the
  model and provide those results as grounded input.
- Reject rewrites that introduce numbers, skills, organizations, or outcomes
  absent from the original resume.
- Resume analysis can affect employment decisions. Test for inconsistent
  treatment across majors, writing styles, names, nationalities, and career
  histories before any real deployment.
