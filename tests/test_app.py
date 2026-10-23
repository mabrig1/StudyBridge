import io
from docx import Document
from fastapi.testclient import TestClient
from app.main import app, extract_text
from app.knowledge import local_answer, retrieve

client = TestClient(app)
COURSE = {"id": "ent", "name": "Entrepreneurship", "units": [
    {"id": "U1", "title": "Break-even point", "text": "The break-even point is where revenue equals total cost. Profit is zero at break-even."},
    {"id": "U2", "title": "Market research", "text": "Market research studies customer needs and business demand."}
]}

def test_index_and_health():
    r = client.get("/")
    assert r.status_code == 200 and "StudyBridge" in r.text
    r = client.get("/api/health")
    assert r.status_code == 200 and r.json()["status"] == "ok"

def test_offline_answer_cites_source():
    r = client.post("/api/ask", json={"question": "What is the break-even point?", "course": COURSE, "language": "English", "online": False})
    assert r.status_code == 200
    assert r.json()["mode"] == "offline"
    assert "U1" in r.json()["citations"] and "[U1]" in r.json()["answer"]

def test_missing_material_does_not_hallucinate():
    payload = local_answer("Where was the president born?", COURSE)
    assert not payload["citations"] and "couldn't find" in payload["answer"]

def test_retrieval_prefers_titles():
    assert retrieve("Describe market research", COURSE["units"])[0]["id"] == "U2"

def test_invalid_language_and_file_type():
    r = client.post("/api/ask", json={"question": "hello?", "course": COURSE, "language": "French", "online": False})
    assert r.status_code == 400
    r = client.post("/api/import", files={"file": ("evil.exe", b"hello world", "application/octet-stream")})
    assert r.status_code == 400

def test_txt_import():
    r = client.post("/api/import", files={"file": ("module.txt", b"Market research studies customers and demand.", "text/plain")})
    assert r.status_code == 200 and "Market research" in r.json()["text"]

def test_docx_import():
    d = Document()
    d.add_paragraph("Accountability improves public service delivery.")
    out = io.BytesIO()
    d.save(out)
    r = client.post("/api/import", files={"file": ("lesson.docx", out.getvalue(), "application/vnd.openxmlformats-officedocument.wordprocessingml.document")})
    assert r.status_code == 200 and "Accountability" in r.json()["text"]

def test_large_upload():
    r = client.post("/api/import", files={"file": ("oversized.txt", b"x" * (8*1024*1024+1), "text/plain")})
    assert r.status_code == 400

def test_pdf_import():
    from reportlab.pdfgen import canvas
    pdf = io.BytesIO()
    c = canvas.Canvas(pdf)
    c.drawString(50, 750, "Public administration explains accountability in government.")
    c.save()
    r = client.post("/api/import", files={"file": ("module.pdf", pdf.getvalue(), "application/pdf")})
    assert r.status_code == 200 and "accountability" in r.json()["text"]

def test_unconfigured_ai_is_offline(monkeypatch):
    monkeypatch.delenv("STUDYBRIDGE_AI_API_KEY", raising=False)
    r = client.post("/api/ask", json={"question": "What is break-even?", "course": COURSE, "language": "Igbo", "online": True})
    assert r.status_code == 200 and r.json()["mode"] == "offline"

def test_private_files_not_exposed():
    for name in (".env.example", "app/main.py", "requirements.txt", "tests/test_app.py"):
        assert client.get("/" + name).status_code == 404
