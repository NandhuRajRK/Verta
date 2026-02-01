FROM python:3.11-slim

# Install system dependencies for LaTeX compilation
RUN apt-get update && apt-get install -y \
    wget \
    curl \
    gnupg \
    git \
    && rm -rf /var/lib/apt/lists/*

# Install Tectonic (modern LaTeX compiler - no TeX Live needed)
RUN curl -fsSL https://drop-sh.fullyjustified.net | sh && \
    mv tectonic /usr/local/bin/

# Alternatively, install pdflatex if preferred (uncomment below, comment out Tectonic)
# RUN apt-get update && apt-get install -y texlive-latex-base texlive-latex-extra \
#     && rm -rf /var/lib/apt/lists/*

WORKDIR /app

# Copy requirements first for better caching
COPY backend/requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt

# Copy backend code
COPY backend/ ./

# Create data directory for SQLite
RUN mkdir -p /data

# Environment variables
ENV VERTA_DB_PATH=/data/verta.db
ENV VERTA_DATA_DIR=/data
ENV PORT=8000

EXPOSE 8000

# Run the backend
CMD ["uvicorn", "app.main:app", "--host", "0.0.0.0", "--port", "8000"]
