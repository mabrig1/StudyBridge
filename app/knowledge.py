"""Bounded, source-grounded retrieval for StudyBridge student notes."""
from __future__ import annotations
import re
from collections import Counter

STOP = set("a an and are as at be by can could did do does for from has have how i if in into is it its may of on or our should so than that the their them there these this to was were what when where which who why will with you your about me please explain describe give show some tell very using based definition".split())
MAX_UNITS = 60
MAX_UNIT_CHARS = 15000

def words(text: str) -> list[str]:
    return [w for w in re.findall(r"[\w]+", text.lower(), flags=re.UNICODE) if len(w) > 2 and w not in STOP]

def validate_course(course: dict) -> list[dict]:
    units = course.get("units") or []
    if not isinstance(units, list) or len(units) > MAX_UNITS:
        raise ValueError("Course must contain at most 60 units")
    clean = []
    seen = set()
    for u in units:
        if not isinstance(u, dict):
            raise ValueError("Invalid course unit")
        uid = str(u.get("id", ""))[:32]
        if not re.fullmatch(r"[a-zA-Z0-9_-]{1,32}", uid) or uid in seen:
            raise ValueError("Invalid or duplicate unit ID")
        seen.add(uid)
        content = str(u.get("text", ""))[:MAX_UNIT_CHARS + 1]
        if len(content) > MAX_UNIT_CHARS:
            raise ValueError("A unit exceeds the 15,000 character limit")
        clean.append({"id": uid, "title": str(u.get("title", ""))[:160], "text": content})
    return clean

def retrieve(query: str, units: list[dict], limit: int = 4) -> list[dict]:
    toks = words(query)
    if not toks:
        return []
    q = set(toks)
    rated = []
    for index, unit in enumerate(units):
        title = Counter(words(unit["title"]))
        body = Counter(words(unit["text"]))
        coverage = sum(1 for w in q if title[w] or body[w])
        score = sum(4 if title[w] else min(body[w], 3) for w in q)
        if score > 0:
            rated.append((coverage, score, -index, unit))
    rated.sort(reverse=True, key=lambda x: x[:3])
    return [x[3] for x in rated[:limit]]

def relevant_sentences(query: str, units: list[dict], max_sentences: int = 3) -> list[tuple[str, str]]:
    q = set(words(query))
    matches = []
    for unit in units:
        for position, s in enumerate(re.split(r"(?<=[.!?])\s+|\n+", unit["text"])):
            s = s.strip()
            if len(s) < 12:
                continue
            overlap = len(q.intersection(words(s)))
            matches.append((overlap, -position, unit["id"], s))
    matches.sort(reverse=True)
    return [(uid, text) for score, _, uid, text in matches[:max_sentences] if score > 0]

def local_answer(question: str, course: dict, lang: str = "English") -> dict:
    units = validate_course(course)
    found = retrieve(question, units)
    if not found:
        return {"answer": "I couldn't find that in this course material. Try another question or add the relevant notes. The offline coach does not invent answers.", "citations": [], "mode": "offline"}
    sentences = relevant_sentences(question, found)
    if not sentences:
        return {"answer": "I found a related unit, but not enough matching detail to answer reliably. Please read the source unit or ask your lecturer.", "citations": [u["id"] for u in found], "mode": "offline"}
    names = {u["id"]: u["title"] for u in found}
    lines = [f'**{names[uid]}**: {s} [{uid}]' for uid, s in sentences]
    prefix = "From your uploaded notes (offline extract; not an AI-generated explanation):\n\n"
    if lang != "English":
        prefix = "Offline excerpts are shown in the source language. To receive a translated explanation, enable Online AI in Settings.\n\n"
    return {"answer": prefix + "\n\n".join(lines), "citations": list(dict.fromkeys(uid for uid, _ in sentences)), "mode": "offline"}
