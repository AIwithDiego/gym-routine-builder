"""Capture the README screenshots from the real UI with sample data.

The app needs a Supabase project and a member account, so for the README the
UI runs locally with the sign-in proxy removed and every /api/* call answered
from demo_data.py. The screens are the real components; the data is made up.

    cp -r . /tmp/grb-demo && rm /tmp/grb-demo/src/proxy.ts
    (cd /tmp/grb-demo && npm ci && npx next dev -p 3123)
    python3 docs/src/capture.py http://localhost:3123 docs/assets
    ffmpeg -f concat -i docs/assets/_frames/list.txt \
      -vf "fps=12,scale=320:-1,split[a][b];[a]palettegen=max_colors=96[p];[b][p]paletteuse" \
      docs/assets/walkthrough.gif
"""

import json
import os
import re
import sys
from pathlib import Path

from playwright.sync_api import Route, sync_playwright

sys.path.insert(0, str(Path(__file__).parent))
import demo_data as d  # noqa: E402

BASE = sys.argv[1] if len(sys.argv) > 1 else "http://localhost:3123"
OUT = Path(sys.argv[2] if len(sys.argv) > 2 else "docs/assets")
OUT.mkdir(parents=True, exist_ok=True)

SESSION_ID = "demo-session"
HIDE_DEV_OVERLAY = (
    "document.addEventListener('DOMContentLoaded', () => {"
    "const s = document.createElement('style');"
    "s.textContent = 'nextjs-portal { display: none !important; }';"
    "document.head.appendChild(s); });"
)
recorded = []


def session_payload():
    r = d.routines_by_id["r-pull"]
    return {
        "id": SESSION_ID,
        "routine_id": r["id"],
        "started_at": d.iso(d.NOW),
        "ended_at": None,
        "status": "in_progress",
        "routine": r,
        "workout_sets": recorded,
    }


def handle(route: Route):
    req = route.request
    path = re.sub(r"^https?://[^/]+", "", req.url).split("?")[0]
    method = req.method
    body = None
    if path == "/api/routines" and method == "GET":
        body = d.routines
    elif m := re.fullmatch(r"/api/routines/([\w-]+)", path):
        body = d.routines_by_id.get(m.group(1))
    elif m := re.fullmatch(r"/api/routines/([\w-]+)/weekdays", path):
        body = d.routines_by_id.get(m.group(1))
    elif path == "/api/workouts/history":
        body = d.history
    elif path == "/api/workouts/in-progress":
        body = None
    elif path == "/api/machines":
        body = list(d.machines.values())
    elif path == "/api/workouts/metrics":
        body = d.metrics
    elif path == "/api/workouts/start":
        body = session_payload()
    elif path == f"/api/workouts/{SESSION_ID}":
        body = session_payload()
    elif path == f"/api/workouts/{SESSION_ID}/set":
        data = json.loads(req.post_data or "{}")
        s = {
            "id": f"set-{len(recorded)}",
            "session_id": SESSION_ID,
            "actual_reps": data.get("target_reps"),
            "completed_at": d.iso(d.NOW),
            **data,
        }
        recorded.append(s)
        body = s
    elif path.endswith("/finish"):
        body = {"ok": True}
    route.fulfill(status=200, content_type="application/json", body=json.dumps(body))


def main():
    with sync_playwright() as p:
        browser = p.chromium.launch(executable_path=os.environ.get("CHROME_PATH"))
        ctx = browser.new_context(
            viewport={"width": 390, "height": 844},
            device_scale_factor=2,
            is_mobile=True,
            has_touch=True,
            locale="en-IE",
            color_scheme="dark",
        )
        ctx.route("**/api/**", handle)
        # Hide the Next.js dev overlay badge in local captures.
        ctx.add_init_script(HIDE_DEV_OVERLAY)
        page = ctx.new_page()

        def shot(name):
            page.wait_for_timeout(700)
            page.screenshot(path=str(OUT / f"{name}.png"))

        page.goto(f"{BASE}/")
        page.wait_for_selector("text=Pull Day")
        shot("today-planned-routine")

        page.wait_for_timeout(1200)
        page.get_by_role("button", name=re.compile("weekly plan", re.I)).first.click()
        page.wait_for_timeout(1000)
        shot("weekly-plan-sheet")
        page.keyboard.press("Escape")
        page.goto(f"{BASE}/")
        page.wait_for_selector("text=Pull Day")
        page.wait_for_timeout(800)

        page.get_by_role("link", name=re.compile("Preview workout", re.I)).first.click()
        page.wait_for_selector("text=Last")
        shot("routine-preview-last-weight")

        page.get_by_role("button", name=re.compile("^Start", re.I)).first.click()
        page.wait_for_url(re.compile(SESSION_ID))
        page.wait_for_timeout(800)
        shot("workout-work-set")

        page.get_by_role("button", name=re.compile("complete|done|next", re.I)).first.click()
        page.wait_for_timeout(2500)
        shot("workout-rest-timer")

        page.goto(f"{BASE}/metrics")
        page.wait_for_selector("text=Progress", timeout=10000)
        shot("metrics-progress")

        ctx.close()
        walkthrough(browser)
        browser.close()


def walkthrough(browser):
    """Stills for the README GIF: Today > preview > start > one set > rest."""
    recorded.clear()
    frames = OUT / "_frames"
    frames.mkdir(exist_ok=True)
    ctx = browser.new_context(
        viewport={"width": 390, "height": 844},
        is_mobile=True,
        has_touch=True,
        locale="en-IE",
        color_scheme="dark",
    )
    ctx.route("**/api/**", handle)
    ctx.add_init_script(HIDE_DEV_OVERLAY)
    page = ctx.new_page()
    n = 0

    def still(seconds):
        nonlocal n
        page.screenshot(path=str(frames / f"{n:02d}.png"))
        with open(frames / "list.txt", "a") as f:
            f.write(f"file '{n:02d}.png'\nduration {seconds}\n")
        n += 1

    (frames / "list.txt").write_text("")
    page.goto(f"{BASE}/")
    page.get_by_role("link", name=re.compile("Preview workout", re.I)).first.wait_for()
    page.wait_for_timeout(800)
    still(2.0)
    page.get_by_role("link", name=re.compile("Preview workout", re.I)).first.click()
    page.wait_for_selector("text=Last")
    page.wait_for_timeout(600)
    still(2.5)
    page.get_by_role("button", name=re.compile("^Start", re.I)).first.click()
    page.wait_for_url(re.compile(SESSION_ID))
    page.get_by_role("button", name=re.compile("complete", re.I)).first.wait_for()
    page.wait_for_timeout(600)
    still(1.5)
    page.get_by_role("button", name="+2.5").first.click()
    page.wait_for_timeout(400)
    still(1.5)
    page.get_by_role("button", name=re.compile("complete", re.I)).first.click()
    page.wait_for_timeout(900)
    for _ in range(4):
        still(1.0)
        page.wait_for_timeout(1000)
    still(1.5)  # concat demuxer needs the last frame listed twice
    ctx.close()


if __name__ == "__main__":
    main()
