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


def request_json(url: str, method: str, headers: dict[str, str], payload: dict | list | None = None):
    body = None if payload is None else json.dumps(payload, ensure_ascii=False).encode("utf-8")
    req = urllib.request.Request(url, data=body, method=method, headers=headers)
    with urllib.request.urlopen(req) as resp:
        text = resp.read().decode("utf-8")
        return json.loads(text) if text else None


env = load_env(r"C:\Users\kaelj\OneDrive\Desktop\English Essential\.env")
base_url = env["SUPABASE_URL"].rstrip("/")
service_key = env["SUPABASE_SERVICE_ROLE_KEY"]

common_headers = {
    "apikey": service_key,
    "Authorization": f"Bearer {service_key}",
    "Content-Type": "application/json",
    "Prefer": "return=representation",
}

lesson_id = "42a2e67f-e928-4052-95d2-abaec23bab15"

items = [
    {
        "order_index": 31,
        "question": "Ouça, leia e monte a frase correta.",
        "correct_answer": "The boy is swimming",
        "explanation": '"The boy is swimming" = O menino está nadando.',
        "image_url": "assets/m1/l1/images/boy_swimming.jpg",
        "audio_url": "assets/m1/l1/audio/the_boy_is_swimming.mp3",
        "options": ["The", "boy", "is", "swimming", "he", "are"],
    },
    {
        "order_index": 32,
        "question": "Ouça, leia e monte a frase correta.",
        "correct_answer": "He is swimming",
        "explanation": '"He is swimming" = Ele está nadando.',
        "image_url": "assets/m1/l1/images/boy_swimming.jpg",
        "audio_url": "assets/m1/l1/audio/he_is_swimming.mp3",
        "options": ["He", "is", "swimming", "boy", "are", "they"],
    },
    {
        "order_index": 33,
        "question": "Ouça, leia e monte a frase correta.",
        "correct_answer": "The girl is eating",
        "explanation": '"The girl is eating" = A menina está comendo.',
        "image_url": "assets/m1/l1/images/girl_eating.jpg",
        "audio_url": "assets/m1/l1/audio/the_girl_is_eating.mp3",
        "options": ["The", "girl", "is", "eating", "she", "are"],
    },
    {
        "order_index": 34,
        "question": "Ouça, leia e monte a frase correta.",
        "correct_answer": "She is eating",
        "explanation": '"She is eating" = Ela está comendo.',
        "image_url": "assets/m1/l1/images/girl_eating.jpg",
        "audio_url": "assets/m1/l1/audio/she_is_eating.mp3",
        "options": ["She", "is", "eating", "girl", "they", "are"],
    },
    {
        "order_index": 35,
        "question": "Ouça, leia e monte a frase correta.",
        "correct_answer": "A woman is running",
        "explanation": '"A woman is running" = Uma mulher está correndo.',
        "image_url": "assets/m1/l1/images/women_running.jpg",
        "audio_url": "assets/m1/l1/audio/a_woman_is_running.mp3",
        "options": ["A", "woman", "is", "running", "she", "men"],
    },
    {
        "order_index": 36,
        "question": "Ouça, leia e monte a frase correta.",
        "correct_answer": "She is running",
        "explanation": '"She is running" = Ela está correndo.',
        "image_url": "assets/m1/l1/images/women_running.jpg",
        "audio_url": "assets/m1/l1/audio/she_is_running.mp3",
        "options": ["She", "is", "running", "woman", "they", "are"],
    },
    {
        "order_index": 37,
        "question": "Ouça, leia e monte a frase correta.",
        "correct_answer": "The girls are reading",
        "explanation": '"The girls are reading" = As meninas estão lendo.',
        "image_url": "assets/m1/l1/images/girls_reading.jpg",
        "audio_url": "assets/m1/l1/audio/the_girls_are_reading.mp3",
        "options": ["The", "girls", "are", "reading", "they", "is"],
    },
    {
        "order_index": 38,
        "question": "Ouça, leia e monte a frase correta.",
        "correct_answer": "They are reading",
        "explanation": '"They are reading" = Eles/Elas estão lendo.',
        "image_url": "assets/m1/l1/images/girls_reading.jpg",
        "audio_url": "assets/m1/l1/audio/they_are_reading.mp3",
        "options": ["They", "are", "reading", "girls", "she", "is"],
    },
    {
        "order_index": 39,
        "question": "Ouça, leia e monte a frase correta.",
        "correct_answer": "A man is writing",
        "explanation": '"A man is writing" = Um homem está escrevendo.',
        "image_url": "assets/m1/l1/images/man_writing.jpg",
        "audio_url": "assets/m1/l1/audio/a_man_is_writing.mp3",
        "options": ["A", "man", "is", "writing", "he", "are"],
    },
    {
        "order_index": 40,
        "question": "Ouça, leia e monte a frase correta.",
        "correct_answer": "He is writing",
        "explanation": '"He is writing" = Ele está escrevendo.',
        "image_url": "assets/m1/l1/images/man_writing.jpg",
        "audio_url": "assets/m1/l1/audio/he_is_writing.mp3",
        "options": ["He", "is", "writing", "man", "they", "are"],
    },
]


def post_exercise(item):
    payload = {
        "lesson_id": lesson_id,
        "question": item["question"],
        "question_type": "word_order",
        "correct_answer": item["correct_answer"],
        "explanation": item["explanation"],
        "image_url": item["image_url"],
        "audio_url": item["audio_url"],
        "order_index": item["order_index"],
    }
    created = request_json(
        f"{base_url}/rest/v1/exercises",
        "POST",
        common_headers,
        payload,
    )
    if not created:
        raise RuntimeError(f"Failed creating exercise {item['order_index']}")
    row = created[0]
    correct_words = set(item["correct_answer"].split())
    opt_payload = [
        {
            "exercise_id": row["id"],
            "option_text": word,
            "is_correct": word in correct_words,
        }
        for word in item["options"]
    ]
    created_opts = request_json(
        f"{base_url}/rest/v1/exercise_options",
        "POST",
        common_headers,
        opt_payload,
    )
    return {"order_index": row["order_index"], "id": row["id"], "options": len(created_opts or [])}


results = [post_exercise(item) for item in items]
print(json.dumps(results, ensure_ascii=False, indent=2))
