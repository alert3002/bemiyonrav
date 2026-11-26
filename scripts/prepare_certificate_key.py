import base64
import os
import pathlib
import re
import sys

raw = os.environ.get("CERTIFICATE_PRIVATE_KEY", "")
raw = raw.replace("\r\n", "\n").replace("\r", "\n").replace("\\n", "\n")
raw = raw.strip().strip('"').strip("'").lstrip("\ufeff")


def as_pem(text):
    match = re.search(r"-----BEGIN ([A-Z0-9 ]+)-----([\s\S]+?)-----END \1-----", text)
    if not match:
        return None
    body = re.sub(r"\s+", "", match.group(2))
    if not body:
        return None
    lines = [body[index:index + 64] for index in range(0, len(body), 64)]
    return f"-----BEGIN {match.group(1)}-----\n" + "\n".join(lines) + f"\n-----END {match.group(1)}-----\n"


pem = as_pem(raw)
if pem is None:
    compact = re.sub(r"\s+", "", raw)
    try:
        decoded = base64.b64decode(compact, validate=True).decode("utf-8")
    except Exception:
        sys.exit("CERTIFICATE_PRIVATE_KEY is not a private key. Paste the file again, including BEGIN and END.")
    pem = as_pem(decoded)
    if pem is None:
        sys.exit("CERTIFICATE_PRIVATE_KEY decoded, but it is not a private key.")

destination = pathlib.Path(os.environ.get("CM_BUILD_DIR", "/tmp")) / "certificate_private_key.pem"
destination.write_text(pem)
print("Prepared the certificate private key")
