# Base image with Python 3.11 and Debian slim for small size
FROM python:3.11.9

# Set working directory
WORKDIR /app

# Install system-level dependencies required for PDF/image handling
RUN apt-get update && apt-get install -y --no-install-recommends \
    libopenjp2-7 \
    libfontconfig1 \
    libharfbuzz0b \
    libjpeg-dev \
    zlib1g-dev \
    libfreetype6-dev \
    liblcms2-2 \
    libwebp-dev \
    libtiff6 \
    build-essential \
    poppler-utils \
    curl \
    && apt-get clean \
    && rm -rf /var/lib/apt/lists/*

# Create uploads directory in a writable location for OpenShift
RUN mkdir -p /tmp/uploads && chmod -R 777 /tmp/uploads

# Copy requirements file
COPY requirements.txt .

# Remove incorrect fitz if present and install dependencies
RUN pip uninstall -y fitz || true
RUN pip install --no-cache-dir -r requirements.txt
RUN pip install --no-cache-dir PyMuPDF==1.23.22

# Copy the application code
COPY . .

# Make sure port is declared
EXPOSE 8080

# Optional: Health check for OpenShift
HEALTHCHECK CMD curl --fail http://localhost:8080/ || exit 1

# Run the app with waitress on port 8080
CMD ["waitress-serve", "--listen=0.0.0.0:8080", "app:app"]
