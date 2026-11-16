"""Render the README images drawn in HTML: cover and design tokens.

    python3 docs/src/render.py    (Playwright for Python; CHROME_PATH optional)
"""

import os
from pathlib import Path

from playwright.sync_api import sync_playwright

SRC = Path(__file__).parent
ASSETS = SRC.parent / "assets"

PAGES = [
    ("cover.html", "cover.png", 1280, 640),
    ("design-tokens.html", "design-tokens.png", 1280, 520),
]

with sync_playwright() as p:
    browser = p.chromium.launch(executable_path=os.environ.get("CHROME_PATH"))
    for src, out, w, h in PAGES:
        page = browser.new_page(viewport={"width": w, "height": h})
        page.goto((SRC / src).resolve().as_uri())
        page.wait_for_load_state("networkidle")
        page.wait_for_timeout(500)
        page.screenshot(path=str(ASSETS / out))
        page.close()
    browser.close()
