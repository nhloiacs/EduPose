FROM python:3.12-slim

ENV PYTHONDONTWRITEBYTECODE=1 \
  PYTHONUNBUFFERED=1

RUN apt-get update && apt-get install -y --no-install-recommends \
  libgl1 \
  libglib2.0-0 \
  libxcb1 \
  && rm -rf /var/lib/apt/lists/*

WORKDIR /app

# Buat user non-root demi keamanan
RUN addgroup --system fastapi && adduser --system --ingroup fastapi fastapi

COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt

COPY . .

RUN chown -R fastapi:fastapi /app

USER fastapi

EXPOSE 8000

CMD ["uvicorn", "app.main:app", "--host", "0.0.0.0", "--port", "8000"]
