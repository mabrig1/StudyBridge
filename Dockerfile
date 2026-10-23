FROM python:3.12-slim
WORKDIR /opt/studybridge
COPY requirements.txt ./
RUN pip install --no-cache-dir -r requirements.txt
COPY app ./app
COPY index.html sw.js manifest.webmanifest favicon.svg ./
EXPOSE 8000
CMD ["uvicorn", "app.main:app", "--host", "0.0.0.0", "--port", "8000"]
