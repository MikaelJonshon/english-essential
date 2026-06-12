from __future__ import annotations

import json
import urllib.parse
import urllib.request
from pathlib import Path


ROOT = Path(__file__).resolve().parents[1]
MODULE_ID = "0b706808-698a-4716-a3ca-3dc34142eb4b"
LESSON_TITLE = "Ler 1"


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
    req = urllib.request.Request(url, data=body, method=method, headers=headers)
    with urllib.request.urlopen(req, timeout=30) as response:
        text = response.read().decode("utf-8")
        return json.loads(text) if text else None


env = load_env(ROOT / ".env")
base_url = env["SUPABASE_URL"].rstrip("/")
service_key = env["SUPABASE_SERVICE_ROLE_KEY"]
headers = {
    "apikey": service_key,
    "Authorization": f"Bearer {service_key}",
    "Content-Type": "application/json",
    "Prefer": "return=representation",
}

lesson_query = urllib.parse.quote(LESSON_TITLE, safe="")
existing = request_json(
    f"{base_url}/rest/v1/lessons?select=id&module_id=eq.{MODULE_ID}&title=eq.{lesson_query}",
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
            "content": "Leitura e interpretação de frases do vocabulário da Lição 1.",
            "order_index": 7,
        },
    )
    lesson_id = created[0]["id"]

old_exercises = request_json(
    f"{base_url}/rest/v1/exercises?select=id&lesson_id=eq.{lesson_id}",
    "GET",
    headers,
) or []
for exercise in old_exercises:
    request_json(
        f"{base_url}/rest/v1/exercise_options?exercise_id=eq.{exercise['id']}",
        "DELETE",
        headers,
    )
request_json(
    f"{base_url}/rest/v1/exercises?lesson_id=eq.{lesson_id}",
    "DELETE",
    headers,
)

items = [
    {
        "order_index": 1,
        "question_type": "image_choice",
        "question": "Leia a frase e escolha a imagem correta: The boy is swimming.",
        "correct_answer": "The boy is swimming",
        "explanation": "The boy is swimming = O menino está nadando.",
        "image_url": None,
        "options": [
            ("The boy is swimming", True, "assets/m1/l1/images/boy_swimming_reading.jpeg"),
            ("The boy is walking", False, "assets/m1/l1/images/boy_walking_reading.png"),
            ("The man is running", False, "assets/m1/l1/images/man_running_reading.png"),
            ("The girl is reading", False, "assets/m1/l1/images/girl_reading_reading.png"),
        ],
    },
    {
        "order_index": 2,
        "question_type": "image_choice",
        "question": "Leia a frase e escolha a imagem correta: The girl is eating.",
        "correct_answer": "The girl is eating",
        "explanation": "The girl is eating = A menina está comendo.",
        "image_url": None,
        "options": [
            ("The girl is eating", True, "assets/m1/l1/images/girl_eating_reading.jpeg"),
            ("The girl is reading", False, "assets/m1/l1/images/girl_reading_reading.png"),
            ("The woman is writing", False, "assets/m1/l1/images/woman_writing_reading.png"),
            ("The woman is running", False, "assets/m1/l1/images/woman_running_reading.jpeg"),
        ],
    },
    {
        "order_index": 3,
        "question_type": "multiple_choice",
        "question": "Leia e complete: The woman is ___.",
        "correct_answer": "running",
        "explanation": "The woman is running = A mulher está correndo.",
        "image_url": "assets/m1/l1/images/woman_running_reading.jpeg",
        "options": [("running", True, None), ("writing", False, None), ("reading", False, None), ("eating", False, None)],
    },
    {
        "order_index": 4,
        "question_type": "is_or_are",
        "question": "Leia e complete: The girls ___ reading.",
        "correct_answer": "ARE",
        "explanation": "Usamos ARE com girls porque está no plural.",
        "image_url": "assets/m1/l1/images/girls_reading_reading.jpeg",
        "options": [("IS", False, None), ("ARE", True, None)],
    },
    {
        "order_index": 5,
        "question_type": "multiple_choice",
        "question": "Leia e observe a imagem: A man is writing. A frase está correta?",
        "correct_answer": "Yes",
        "explanation": "Yes. A man is writing = Um homem está escrevendo.",
        "image_url": "assets/m1/l1/images/man_writing_reading.png",
        "options": [("Yes", True, None), ("No", False, None)],
    },
    {
        "order_index": 6,
        "question_type": "multiple_choice",
        "question": "Leia e observe a imagem: The boy is swimming. A frase está correta?",
        "correct_answer": "No",
        "explanation": "No. The boy is walking = O menino está caminhando.",
        "image_url": "assets/m1/l1/images/boy_walking_reading.png",
        "options": [("Yes", False, None), ("No", True, None)],
    },
    {
        "order_index": 7,
        "question_type": "word_order",
        "question": "Leia as palavras e monte a frase que descreve a imagem.",
        "correct_answer": "The girl is reading",
        "explanation": "The girl is reading = A menina está lendo.",
        "image_url": "assets/m1/l1/images/girl_reading_reading.png",
        "options": [("The", True, None), ("girl", True, None), ("is", True, None), ("reading", True, None)],
    },
    {
        "order_index": 8,
        "question_type": "multiple_choice",
        "question": "Leia e escolha a frase que descreve a imagem.",
        "correct_answer": "The woman is writing",
        "explanation": "The woman is writing = A mulher está escrevendo.",
        "image_url": "assets/m1/l1/images/woman_writing_reading.png",
        "options": [
            ("The woman is writing", True, None),
            ("The woman is running", False, None),
            ("The woman is reading", False, None),
            ("The woman is swimming", False, None),
        ],
    },
    {
        "order_index": 9,
        "question_type": "multiple_choice",
        "question": "Leia: The boys are swimming. Quem está nadando?",
        "correct_answer": "The boys",
        "explanation": "The boys = Os meninos. ARE indica o plural.",
        "image_url": "assets/m1/l1/images/boys_swimming_reading.png",
        "options": [("The boys", True, None), ("The man", False, None), ("The woman", False, None), ("The girls", False, None)],
    },
    {
        "order_index": 10,
        "question_type": "multiple_choice",
        "question": "Leia e escolha a frase correta.",
        "correct_answer": "The man is running",
        "explanation": "The man is running = O homem está correndo.",
        "image_url": "assets/m1/l1/images/man_running_reading.png",
        "options": [
            ("The man is writing", False, None),
            ("The man is running", True, None),
            ("The boys are swimming", False, None),
            ("The girl is reading", False, None),
        ],
    },
]

created_rows = []
for item in items:
    exercise = request_json(
        f"{base_url}/rest/v1/exercises",
        "POST",
        headers,
        {
            "lesson_id": lesson_id,
            "question": item["question"],
            "question_type": item["question_type"],
            "correct_answer": item["correct_answer"],
            "explanation": item["explanation"],
            "image_url": item["image_url"],
            "audio_url": None,
            "order_index": item["order_index"],
        },
    )[0]
    option_payload = [
        {
            "exercise_id": exercise["id"],
            "option_text": option_text,
            "is_correct": is_correct,
            "image_url": image_url,
        }
        for option_text, is_correct, image_url in item["options"]
    ]
    request_json(f"{base_url}/rest/v1/exercise_options", "POST", headers, option_payload)
    created_rows.append({"id": exercise["id"], "order_index": exercise["order_index"]})

print(json.dumps({"lesson_id": lesson_id, "exercises": created_rows}, ensure_ascii=False, indent=2))
