"""Local CareerForge website and Resume Checker API.

Run with the project's MLX environment: python api.py
"""

import json
import logging
import os
import sys
import threading
from http.server import SimpleHTTPRequestHandler, ThreadingHTTPServer
from pathlib import Path

ROOT = Path(__file__).resolve().parent
SITE = ROOT.parent if (ROOT.parent / "index.html").is_file() else ROOT.parent / "CareerForge"
MODEL_ID = "mlx-community/Qwen3-4B-Instruct-2507-4bit"
ADAPTER = ROOT / "adapters" / "careerforge-qwen3-4b"
MAX_BODY = 150_000
MAX_TEXT = 60_000

sys.path.insert(0, str(ROOT / "scripts"))
from prompts import SYSTEM_PROMPT, build_user_prompt  # noqa: E402


class ResumeModel:
    def __init__(self):
        self.lock = threading.Lock()
        self.model = None
        self.tokenizer = None

    def analyze(self, resume, job_description):
        with self.lock:
            if self.model is None:
                if not (ADAPTER / "adapters.safetensors").is_file():
                    raise RuntimeError("Resume Checker adapter is missing.")
                from mlx_lm import load

                self.model, self.tokenizer = load(MODEL_ID, adapter_path=str(ADAPTER))

            from mlx_lm import generate

            prompt = self.tokenizer.apply_chat_template(
                [
                    {"role": "system", "content": SYSTEM_PROMPT},
                    {"role": "user", "content": build_user_prompt(resume, job_description)},
                ],
                tokenize=False,
                add_generation_prompt=True,
            )
            raw = generate(self.model, self.tokenizer, prompt=prompt, max_tokens=1400, verbose=False)

        cleaned = raw.strip()
        if cleaned.startswith("```json"):
            cleaned = cleaned[7:]
        if cleaned.startswith("```"):
            cleaned = cleaned[3:]
        if cleaned.endswith("```"):
            cleaned = cleaned[:-3]
        try:
            result = json.loads(cleaned.strip())
        except json.JSONDecodeError as exc:
            raise ValueError("The model returned an invalid response. Please try again.") from exc
        if not isinstance(result, dict) or not isinstance(result.get("overall_score"), int):
            raise ValueError("The model returned an incomplete analysis. Please try again.")
        return result


MODEL = ResumeModel()


class Handler(SimpleHTTPRequestHandler):
    def __init__(self, *args, **kwargs):
        super().__init__(*args, directory=str(SITE), **kwargs)

    def respond(self, status, data):
        payload = json.dumps(data, ensure_ascii=False).encode("utf-8")
        self.send_response(status)
        self.send_header("Content-Type", "application/json; charset=utf-8")
        self.send_header("Cache-Control", "no-store")
        self.send_header("Content-Length", str(len(payload)))
        self.end_headers()
        self.wfile.write(payload)

    def do_GET(self):
        if self.path == "/api/health":
            self.respond(200, {"status": "ok", "adapter_available": (ADAPTER / "adapters.safetensors").is_file()})
        else:
            super().do_GET()

    def do_POST(self):
        if self.path != "/api/resume-check":
            self.respond(404, {"error": "Unknown API endpoint."})
            return
        try:
            length = int(self.headers.get("Content-Length", "0"))
            if length <= 0 or length > MAX_BODY:
                self.respond(413, {"error": "Request is empty or too large."})
                return
            data = json.loads(self.rfile.read(length))
            resume = data.get("resume")
            job = data.get("job_description")
            if not isinstance(resume, str) or not isinstance(job, str) or not resume.strip() or not job.strip():
                self.respond(400, {"error": "Resume and job description are required."})
                return
            if len(resume) > MAX_TEXT or len(job) > MAX_TEXT:
                self.respond(413, {"error": "Resume or job description is too long."})
                return
        except (ValueError, AttributeError, TypeError):
            self.respond(400, {"error": "Invalid JSON request."})
            return
        try:
            self.respond(200, MODEL.analyze(resume, job))
        except ValueError as exc:
            self.respond(502, {"error": str(exc)})
        except Exception:
            logging.exception("Model inference failed")
            self.respond(503, {"error": "Resume Checker is unavailable. Check the API server and MLX installation."})


if __name__ == "__main__":
    if not SITE.is_dir():
        raise SystemExit(f"Website directory not found: {SITE}")
    port = int(os.environ.get("PORT", "8000"))
    server = ThreadingHTTPServer(("127.0.0.1", port), Handler)
    print(f"CareerForge running at http://127.0.0.1:{port}", flush=True)
    server.serve_forever()
