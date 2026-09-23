#!/usr/bin/env sh
# Generate a throwaway self-signed certificate for the local HTTPS test server.
# Writes repro/certs/key.pem and repro/certs/cert.pem (git-ignored).
set -eu
dir="$(cd "$(dirname "$0")" && pwd)/certs"
mkdir -p "$dir"
openssl req -x509 -newkey rsa:2048 -nodes -days 7 \
  -subj "/CN=127.0.0.1" \
  -addext "subjectAltName=IP:127.0.0.1" \
  -keyout "$dir/key.pem" -out "$dir/cert.pem" 2>/dev/null
echo "wrote $dir/cert.pem and $dir/key.pem"
