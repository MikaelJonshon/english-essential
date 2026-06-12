from __future__ import annotations

import json
from pathlib import Path
import urllib.parse
import urllib.request

ROOT = Path(__file__).resolve().parents[1]
ENV_PATH = ROOT / ".env"
MODULE_ID = "0b706808-698a-4716-a3ca-3dc34142eb4b"
LESSON_TITLE = "Escrever 1"
LESSON_ORDER_INDEX = 8

ITEMS = [
    (1, "Leia, ouça e escreva a frase correta.", "The boy is swimming", "assets/m1/l1/images/boy_swimming.jpeg", "assets/m1/l1/audio/the_boy_is_swimming.mp3", "The boy is swimming"),
    (2, "Leia, ouça e escreva a frase correta.", "The girl is eating", "assets/m1/l1/images/girl_eating.jpg", "assets/m1/l1/audio/the_girl_is_eating.mp3", "The girl is eating"),
    (3, "Leia, ouça e escreva a frase correta.", "A woman is running", "assets/m1/l1/images/woman_running.jpeg", "assets/m1/l1/audio/a_woman_is_running.mp3", "A woman is running"),
    (4, "Leia, ouça e escreva a frase correta.", "The girls are reading", "assets/m1/l1/images/girls_reading.jpeg", "assets/m1/l1/audio/the_girls_are_reading.mp3", "The girls are reading"),
    (5, "Leia, ouça e escreva a frase correta.", "A man is writing", "assets/m1/l1/images/man_writing.jpeg", "assets/m1/l1/audio/a_man_is_writing.mp3", "A man is writing"),
    (6, "Leia, ouça e escreva a frase correta.", "The boy is walking", "assets/m1/l1/images/boy_walking_reading.png", "assets/m1/l1/audio/the_boy_is_walking.mp3", "The boy is walking"),
    (7, "Leia, ouça e escreva a frase correta.", "The girl is reading", "assets/m1/l1/images/girl_reading.jpg", "assets/m1/l1/audio/the_girl_is_reading.mp3", "The girl is reading"),
    (8, "Leia, ouça e escreva a frase correta.", "A woman is writing", "assets/m1/l1/images/woman_writing.jpg", "assets/m1/l1/audio/a_woman_is_writing.mp3", "A woman is writing"),
    (9, "Leia, ouça e escreva a frase correta.", "The boys are swimming", "assets/m1/l1/images/boys_swimming_reading.png", "assets/m1/l1/audio/the_boys_are_swimming.mp3", "The boys are swimming"),
    (10, "Leia, ouça e escreva a frase correta.", "The man is running", "assets/m1/l1/images/man_running_reading.png", "assets/m1/l1/audio/the_man_is_running.mp3", "The man is running"),
]


def load_env(path: Path) -> dict[str, str]:
    values: dict[str, str] = {}
    for raw in path.read_text(encoding="utf-8").splitlines():
        line = raw.strip()
        if not line or line.startswith("#") or "=" not in line:
            continue
        key, value = line.split("=", 1)
        values[key] = value
    return values


def request_json(url: str, method: str, headers: dict[str, str], payload=None):
    body = None if payload is None else json.dumps(payload, ensure_ascii=False).encode("utf-8")
    req = urllib.request.Request(url, data=body, headers=headers, method=method)
    with urllib.request.urlopen(req, timeout=30) as resp:
        raw = resp.read().decode("utf-8")
        return json.loads(raw) if raw else None


env = load_env(ENV_PATH)
base_url = env["SUPABASE_URL"].rstrip("/")
service_key = env["SUPABASE_SERVICE_ROLE_KEY"]
headers = {
    "apikey": service_key,
    "Authorization": f"Bearer {service_key}",
    "Content-Type": "application/json",
    "Prefer": "return=representation",
}

existing = request_json(
    f"{base_url}/rest/v1/lessons?select=id&module_id=eq.{MODULE_ID}&title=eq.{urllib.parse.quote(LESSON_TITLE, safe='')}",
    "GET",
    headers,
)
if existing:
    lesson_id = existing[0]["id"]
else:
    created = request_json(
        f"{base_url}/rest/v1/lessons",
        "POST",
        headers,
        {
            "module_id": MODULE_ID,
            "title": LESSON_TITLE,
            "content": "Exercícios de escrita com imagem para o aluno digitar a frase correta.",
            "order_index": LESSON_ORDER_INDEX,
        },
    )
    lesson_id = created[0]["id"]

old = request_json(f"{base_url}/rest/v1/exercises?select=id&lesson_id=eq.{lesson_id}", "GET", headers) or []
for row in old:
    request_json(f"{base_url}/rest/v1/exercise_options?exercise_id=eq.{row['id']}", "DELETE", headers)
request_json(f"{base_url}/rest/v1/exercises?lesson_id=eq.{lesson_id}", "DELETE", headers)

created_rows = []
for order_index, question, correct_answer, image_url, audio_url, explanation in ITEMS:
    created = request_json(
        f"{base_url}/rest/v1/exercises",
        "POST",
        headers,
        {
            "lesson_id": lesson_id,
            "question": question,
            "question_type": "text",
            "correct_answer": correct_answer,
            "explanation": explanation,
            "image_url": image_url,
            "audio_url": audio_url,
            "order_index": order_index,
        },
    )
    created_rows.append({"id": created[0]["id"], "order_index": created[0]["order_index"]})

print(json.dumps({"lesson_id": lesson_id, "exercises": created_rows}, ensure_ascii=False, indent=2))
