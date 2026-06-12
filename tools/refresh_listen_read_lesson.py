from __future__ import annotations

import json
import urllib.request


def load_env(path: str) -> dict[str, str]:
    data: dict[str, str] = {}
    with open(path, "r", encoding="utf-8") as fh:
        for raw in fh:
            line = raw.strip()
            if not line or line.startswith("#") or "=" not in line:
                continue
            k, v = line.split("=", 1)
            data[k] = v
    return data


def request_json(url: str, method: str, headers: dict[str, str], payload=None):
    body = None if payload is None else json.dumps(payload, ensure_ascii=False).encode("utf-8")
    req = urllib.request.Request(url, data=body, method=method, headers=headers)
    with urllib.request.urlopen(req) as resp:
        text = resp.read().decode("utf-8")
        return json.loads(text) if text else None


ENV = load_env("C:/Users/kaelj/OneDrive/Desktop/English Essential/.env")
BASE_URL = ENV["SUPABASE_URL"].rstrip("/")
SERVICE_KEY = ENV["SUPABASE_SERVICE_ROLE_KEY"]
HEADERS = {
    "apikey": SERVICE_KEY,
    "Authorization": f"Bearer {SERVICE_KEY}",
    "Content-Type": "application/json",
    "Prefer": "return=representation",
}

LESSON_ID = "7a69ea06-d95b-43a9-b82f-8975f2c05a27"

EXERCISES = [
    {
        "id": "afc64f4a-dcc6-441a-ab64-96b06aaba30f",
        "order_index": 31,
        "question_type": "listening",
        "question": "Ouça e marque a frase correta.",
        "correct_answer": None,
        "explanation": '"The boy is swimming" = O menino está nadando.',
        "image_url": "assets/m1/l1/images/boy_swimming.jpeg",
        "audio_url": "assets/m1/l1/audio/the_boy_is_swimming.mp3",
        "options": [
            ("The boy is swimming", True),
            ("He is swimming", False),
            ("The girl is eating", False),
            ("A man is writing", False),
        ],
    },
    {
        "id": "b4151d01-ea0f-4a85-9baf-5f70a221a35a",
        "order_index": 32,
        "question_type": "text",
        "question": "Complete: The boy is ____.",
        "correct_answer": "swimming",
        "explanation": '"Swimming" completa a frase "The boy is swimming".',
        "image_url": "assets/m1/l1/images/swimming.jpg",
        "audio_url": "assets/m1/l1/audio/the_boy_is_swimming.mp3",
        "options": [],
    },
    {
        "id": "5ed7aa3b-a228-4495-a599-13fbd6b4dab1",
        "order_index": 33,
        "question_type": "multiple_choice",
        "question": "Leia a frase e marque a que combina com a imagem.",
        "correct_answer": None,
        "explanation": 'A frase correta é "The boy is swimming".',
        "image_url": "assets/m1/l1/images/boy_swimming.jpeg",
        "audio_url": None,
        "options": [
            ("The boy is swimming", True),
            ("The boy is running", False),
            ("The boy is eating", False),
            ("The boy is writing", False),
        ],
    },
    {
        "id": "1381d150-6255-4954-9e61-6858fef56d40",
        "order_index": 34,
        "question_type": "word_order",
        "question": "Ouça e organize as palavras.",
        "correct_answer": "He is swimming",
        "explanation": '"He is swimming" = Ele está nadando.',
        "image_url": "assets/m1/l1/images/swimming.jpg",
        "audio_url": "assets/m1/l1/audio/he_is_swimming.mp3",
        "options": [
            ("He", True),
            ("is", True),
            ("swimming", True),
            ("boy", False),
            ("are", False),
            ("they", False),
        ],
    },
    {
        "id": "95b0516c-632e-4b06-a30a-85b515a321f0",
        "order_index": 35,
        "question_type": "listening",
        "question": "Ouça e marque a frase correta.",
        "correct_answer": None,
        "explanation": '"The girl is eating" = A menina está comendo.',
        "image_url": "assets/m1/l1/images/girl_eating.jpg",
        "audio_url": "assets/m1/l1/audio/the_girl_is_eating.mp3",
        "options": [
            ("The girl is eating", True),
            ("She is eating", False),
            ("The girl is reading", False),
            ("The girl is writing", False),
        ],
    },
    {
        "id": "91a69a49-66cb-4180-a333-72790f31683b",
        "order_index": 36,
        "question_type": "text",
        "question": "Complete: She is ____.",
        "correct_answer": "eating",
        "explanation": '"Eating" completa a frase "She is eating".',
        "image_url": "assets/m1/l1/images/eating.jpg",
        "audio_url": "assets/m1/l1/audio/she_is_eating.mp3",
        "options": [],
    },
    {
        "id": "53224ed8-c37a-4037-8dbf-8a725d96a138",
        "order_index": 37,
        "question_type": "multiple_choice",
        "question": "Qual frase descreve a imagem?",
        "correct_answer": None,
        "explanation": 'A frase correta é "A woman is running".',
        "image_url": "assets/m1/l1/images/woman_running.jpeg",
        "audio_url": None,
        "options": [
            ("A woman is running", True),
            ("She is running", False),
            ("A woman is reading", False),
            ("She is writing", False),
        ],
    },
    {
        "id": "fa473676-ab75-41bd-a456-0ac2d7eee98f",
        "order_index": 38,
        "question_type": "word_order",
        "question": "Ouça e organize as palavras.",
        "correct_answer": "She is running",
        "explanation": '"She is running" = Ela está correndo.',
        "image_url": "assets/m1/l1/images/running.jpg",
        "audio_url": "assets/m1/l1/audio/she_is_running.mp3",
        "options": [
            ("She", True),
            ("is", True),
            ("running", True),
            ("woman", False),
            ("they", False),
            ("are", False),
        ],
    },
    {
        "id": "dc9b2aee-f37e-4150-b845-bf8f1260e8ca",
        "order_index": 39,
        "question_type": "listening",
        "question": "Ouça e marque a frase correta.",
        "correct_answer": None,
        "explanation": '"The girls are reading" = As meninas estão lendo.',
        "image_url": "assets/m1/l1/images/girls_reading.jpeg",
        "audio_url": "assets/m1/l1/audio/the_girls_are_reading.mp3",
        "options": [
            ("The girls are reading", True),
            ("They are reading", False),
            ("The girls are writing", False),
            ("The girls are swimming", False),
        ],
    },
    {
        "id": "f3f162b2-2fc2-4d28-93c9-6fb31e2dead8",
        "order_index": 40,
        "question_type": "text",
        "question": "Complete: A man is ____.",
        "correct_answer": "writing",
        "explanation": '"Writing" completa a frase "A man is writing".',
        "image_url": "assets/m1/l1/images/man_writing.jpeg",
        "audio_url": "assets/m1/l1/audio/a_man_is_writing.mp3",
        "options": [],
    },
]

def patch_exercise(item):
    payload = {
        "lesson_id": LESSON_ID,
        "order_index": item["order_index"],
        "question_type": item["question_type"],
        "question": item["question"],
        "correct_answer": item["correct_answer"],
        "explanation": item["explanation"],
        "image_url": item["image_url"],
        "audio_url": item["audio_url"],
    }
    return request_json(
        f"{BASE_URL}/rest/v1/exercises?id=eq.{item['id']}",
        "PATCH",
        HEADERS,
        payload,
    )

def clear_options(exercise_id: str):
    req = urllib.request.Request(
        f"{BASE_URL}/rest/v1/exercise_options?exercise_id=eq.{exercise_id}",
        method="DELETE",
        headers={
            "apikey": SERVICE_KEY,
            "Authorization": f"Bearer {SERVICE_KEY}",
        },
    )
    urllib.request.urlopen(req).read()

def add_options(exercise_id: str, options: list[tuple[str, bool]]):
    payload = [
        {"exercise_id": exercise_id, "option_text": text, "is_correct": is_correct}
        for text, is_correct in options
    ]
    if payload:
        request_json(
            f"{BASE_URL}/rest/v1/exercise_options",
            "POST",
            HEADERS,
            payload,
        )

for item in EXERCISES:
    patch_exercise(item)
    clear_options(item["id"])
    add_options(item["id"], item["options"])

print(json.dumps({"updated": len(EXERCISES)}, ensure_ascii=False))
