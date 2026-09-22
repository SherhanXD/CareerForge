"""Local CareerForge website, Life Logger, and Resume Checker API.

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
from prompts import (  # noqa: E402
    LIFE_LOGGER_SYSTEM_PROMPT,
    SYSTEM_PROMPT,
    build_life_logger_prompt,
    build_user_prompt,
)


class CareerForgeModel:
    def __init__(self):
        self.lock = threading.Lock()
        self.model = None
        self.tokenizer = None

    def generate_json(self, system_prompt, user_prompt, max_tokens):
        with self.lock:
            if self.model is None:
                if not (ADAPTER / "adapters.safetensors").is_file():
                    raise RuntimeError("CareerForge adapter is missing.")
                from mlx_lm import load

                self.model, self.tokenizer = load(MODEL_ID, adapter_path=str(ADAPTER))

            from mlx_lm import generate

            prompt = self.tokenizer.apply_chat_template(
                [
                    {"role": "system", "content": system_prompt},
                    {"role": "user", "content": user_prompt},
                ],
                tokenize=False,
                add_generation_prompt=True,
            )
            raw = generate(self.model, self.tokenizer, prompt=prompt, max_tokens=max_tokens, verbose=False)

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
        if not isinstance(result, dict):
            raise ValueError("The model returned an incomplete response. Please try again.")
        return result

    def analyze(self, resume, job_description):
        result = self.generate_json(
            SYSTEM_PROMPT,
            build_user_prompt(resume, job_description),
            max_tokens=1400,
        )
        if not isinstance(result.get("overall_score"), int):
            raise ValueError("The model returned an incomplete analysis. Please try again.")
        return result

    def reflect(self, entry, follow_up_answers, reflection_prompt=""):
        result = self.generate_json(
            LIFE_LOGGER_SYSTEM_PROMPT,
            build_life_logger_prompt(entry, follow_up_answers, reflection_prompt),
            max_tokens=1100,
        )
        required_strings = ("resume_bullet", "story")
        required_lists = ("skills", "follow_up_questions", "limitations")
        if any(not isinstance(result.get(key), str) for key in required_strings):
            raise ValueError("The model returned an incomplete reflection. Please try again.")
        if any(not isinstance(result.get(key), list) for key in required_lists):
            raise ValueError("The model returned an incomplete reflection. Please try again.")
        if not all(isinstance(item, str) for key in required_lists for item in result[key]):
            raise ValueError("The model returned an invalid reflection. Please try again.")
        result["skills"] = result["skills"][:4]
        result["follow_up_questions"] = result["follow_up_questions"][:4]
        if len(result["follow_up_questions"]) < 2:
            raise ValueError("The model did not return enough follow-up questions. Please try again.")
        return result


MODEL = CareerForgeModel()


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
        if self.path not in ("/api/resume-check", "/api/life-logger"):
            self.respond(404, {"error": "Unknown API endpoint."})
            return
        try:
            length = int(self.headers.get("Content-Length", "0"))
            if length <= 0 or length > MAX_BODY:
                self.respond(413, {"error": "Request is empty or too large."})
                return
            data = json.loads(self.rfile.read(length))
        except (ValueError, AttributeError, TypeError):
            self.respond(400, {"error": "Invalid JSON request."})
            return
        if not isinstance(data, dict):
            self.respond(400, {"error": "The JSON request must be an object."})
            return

        if self.path == "/api/life-logger":
            entry = data.get("entry")
            answers = data.get("follow_up_answers", {})
            reflection_prompt = data.get("reflection_prompt", "")
            if not isinstance(entry, str) or not entry.strip():
                self.respond(400, {"error": "A life log entry is required."})
                return
            if not isinstance(answers, dict) or not all(
                isinstance(question, str) and isinstance(answer, str)
                for question, answer in answers.items()
            ):
                self.respond(400, {"error": "Follow-up answers must be text."})
                return
            if not isinstance(reflection_prompt, str):
                self.respond(400, {"error": "The reflection prompt must be text."})
                return
            if (
                len(entry) + len(reflection_prompt) > MAX_TEXT
                or sum(len(key) + len(value) for key, value in answers.items()) > MAX_TEXT
            ):
                self.respond(413, {"error": "The life log entry is too long."})
                return
            try:
                self.respond(200, MODEL.reflect(entry, answers, reflection_prompt))
            except ValueError as exc:
                self.respond(502, {"error": str(exc)})
            except Exception:
                logging.exception("Life Logger inference failed")
                self.respond(503, {"error": "Life Logger is unavailable. Check the API server and MLX installation."})
            return

        resume = data.get("resume")
        job = data.get("job_description")
        if not isinstance(resume, str) or not isinstance(job, str) or not resume.strip() or not job.strip():
            self.respond(400, {"error": "Resume and job description are required."})
            return
        if len(resume) > MAX_TEXT or len(job) > MAX_TEXT:
            self.respond(413, {"error": "Resume or job description is too long."})
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
