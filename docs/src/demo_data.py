"""Sample data for the README screenshots. Nothing here is real.

Builds the JSON the app's API routes would return, so the real UI can be
captured without a Supabase project or an account. Used by capture.py.
"""

from datetime import datetime, timedelta, timezone

NOW = datetime.now(timezone.utc).replace(microsecond=0)


def iso(dt: datetime) -> str:
    return dt.isoformat().replace("+00:00", "Z")


MACHINES = [
    ("m-tbar", "Plate Loaded T-Bar Row", "upper", "Gymleco"),
    ("m-srow", "Plate Loaded Seated Row", "upper", "Panatta"),
    ("m-curl", "Cable Machine - Bicep Curl", "upper", "Gymleco"),
    ("m-back", "Reverse Hyper Extension & Back Extension", "core", "Hammer Strength"),
    ("m-incl", "Plate Loaded Incline Chest Press", "upper", "Panatta"),
    ("m-decl", "Decline Chest Press Machine", "upper", "Hammer Strength"),
    ("m-stch", "Standing Chest Press", "upper", "Gymleco"),
    ("m-fly", "Cable Machine - Chest Fly", "upper", "Gymleco"),
    ("m-tri", "Tricep Pushdown", "upper", "Gymleco"),
    ("m-legp", "Plate Loaded Leg Press", "lower", "Gymleco"),
    ("m-shp", "Shoulder Press Machine", "upper", "Hammer Strength"),
    ("m-lat", "Lateral Raise Machine", "upper", "Hammer Strength"),
    ("m-row", "Rowing Machine", "cardio", "Concept 2"),
    ("m-ski", "Ski Erg", "cardio", "Concept 2"),
    ("m-bike", "Stationary Bike", "cardio", "Concept 2"),
    ("m-legx", "Plate Loaded Leg Extension", "lower", "Hammer Strength"),
    ("m-curlx", "Iso Lying Leg Curl", "lower", "Hammer Strength"),
    ("m-calf", "Calf Raise", "lower", "Hammer Strength"),
]

machines = {
    mid: {
        "id": mid,
        "name": name,
        "category": cat,
        "brand": brand,
        "description": f"Sample description for the {name.lower()}.",
        "video_url": None,
    }
    for mid, name, cat, brand in MACHINES
}

# (id, name, notes, weekdays 0=Sun..6=Sat, items: machine, sets, reps, rest, weight, last weight)
ROUTINES = [
    ("r-pull", "Pull Day", "Back and biceps. Row, pull, curl.", [1], [
        ("m-tbar", 4, 8, 90, 35, 37.5),
        ("m-srow", 4, 10, 75, 45, 45),
        ("m-curl", 4, 12, 45, 15, 17.5),
        ("m-back", 3, 12, 60, 0, 0),
    ]),
    ("r-chest", "Chest Day", "Push focus. Upper, mid and lower chest.", [3], [
        ("m-incl", 4, 8, 90, 40, 42.5),
        ("m-decl", 3, 10, 75, 35, 35),
        ("m-stch", 3, 10, 60, 25, 27.5),
        ("m-fly", 3, 12, 60, 15, 15),
        ("m-tri", 3, 12, 45, 20, 22.5),
    ]),
    ("r-legs", "Leg Day", "Quads, hamstrings and calves.", [5], [
        ("m-legp", 4, 10, 90, 80, 90),
        ("m-legx", 3, 12, 60, 30, 32.5),
        ("m-curlx", 3, 12, 60, 25, 25),
        ("m-calf", 3, 15, 45, 40, 40),
    ]),
    ("r-full", "Full Body Express", "30-minute circuit for busy days.", [], [
        ("m-legp", 3, 10, 60, 80, None),
        ("m-incl", 3, 10, 60, 35, None),
        ("m-srow", 3, 10, 60, 40, None),
        ("m-shp", 3, 10, 60, 25, None),
    ]),
    ("r-cond", "Conditioning", "Cardio and core. Recovery-day option.", [6], [
        ("m-row", 1, 1, 0, 0, None),
        ("m-ski", 1, 1, 0, 0, None),
        ("m-bike", 1, 1, 0, 0, None),
    ]),
]


def build_routines():
    out = []
    for rid, name, notes, days, items in ROUTINES:
        routine_items = []
        for pos, (mid, sets, reps, rest, weight, last) in enumerate(items):
            item = {
                "id": f"{rid}-i{pos}",
                "routine_id": rid,
                "machine_id": mid,
                "position": pos,
                "sets": sets,
                "reps": reps,
                "rest_seconds": rest,
                "default_weight": weight,
                "machine": machines[mid],
                "last_weight": last,
                "last_actual_reps": reps if last is not None else None,
                "last_recorded_at": iso(NOW - timedelta(days=7)) if last is not None else None,
            }
            routine_items.append(item)
        out.append({
            "id": rid,
            "name": name,
            "notes": notes,
            "assigned_weekdays": days,
            "created_at": iso(NOW - timedelta(days=60)),
            "updated_at": iso(NOW - timedelta(days=7)),
            "routine_items": routine_items,
        })
    return out


routines = build_routines()
routines_by_id = {r["id"]: r for r in routines}

HISTORY = [  # (days ago, routine, minutes, total kg)
    (2, "r-cond", 35, 0),
    (3, "r-legs", 58, 4120),
    (5, "r-chest", 61, 2310),
    (7, "r-pull", 52, 2180),
    (10, "r-legs", 55, 3980),
    (12, "r-chest", 63, 2250),
]


def build_history():
    out = []
    for n, (days, rid, minutes, kg) in enumerate(HISTORY):
        r = routines_by_id[rid]
        start = NOW - timedelta(days=days, hours=2)
        sets = []
        for it in r["routine_items"]:
            for s in range(1, it["sets"] + 1):
                sets.append({
                    "id": f"h{n}-{it['id']}-{s}",
                    "session_id": f"h{n}",
                    "routine_item_id": it["id"],
                    "set_number": s,
                    "target_reps": it["reps"],
                    "actual_reps": it["reps"],
                    "weight": it["default_weight"],
                    "completed_at": iso(start),
                })
        out.append({
            "id": f"h{n}",
            "routine_id": rid,
            "started_at": iso(start),
            "ended_at": iso(start + timedelta(minutes=minutes)),
            "status": "completed",
            "routine": {k: v for k, v in r.items() if k != "routine_items"},
            "workout_sets": sets,
            "routine_items": r["routine_items"],
            "duration_minutes": minutes,
            "total_weight": kg,
        })
    return out


history = build_history()

PROGRESS = [  # machine, sessions, first, latest, max
    ("m-incl", 9, 30, 42.5, 42.5),
    ("m-tbar", 8, 25, 37.5, 37.5),
    ("m-legp", 8, 60, 90, 90),
    ("m-curl", 8, 10, 17.5, 17.5),
    ("m-tri", 7, 15, 22.5, 22.5),
    ("m-legx", 6, 25, 32.5, 32.5),
    ("m-shp", 4, 20, 25, 25),
    ("m-row", 5, 0, 0, 0),
]

metrics = {
    "total_workouts": 34,
    "total_volume": 81240,
    "avg_duration_minutes": 56,
    "total_duration_minutes": 1904,
    "workouts_this_week": 3,
    "current_streak": 4,
    "machine_progress": [
        {
            "machine_id": mid,
            "machine_name": machines[mid]["name"],
            "brand": machines[mid]["brand"],
            "category": machines[mid]["category"],
            "sessions_count": n,
            "first_weight": first,
            "latest_weight": latest,
            "max_weight": mx,
        }
        for mid, n, first, latest, mx in PROGRESS
    ],
}
