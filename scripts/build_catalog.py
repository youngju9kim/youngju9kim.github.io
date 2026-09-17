# -*- coding: utf-8 -*-
"""data/운동정보.tsv → src/features/exercise/exerciseCatalog.json 생성.

사용자가 작성한 표(운동명/부위/세트/횟수/휴식/단계1~3/주의사항/이미지1~3)가 원본이며,
앱이 필요로 하지만 표에 없는 메타데이터(영문명·기구종류·주동근·난이도·안전등급)는
아래 META 표에서 채운다. 표를 고친 뒤 이 스크립트를 다시 돌리면 앱 데이터가 갱신된다.

    py scripts/build_catalog.py
"""
import csv
import json
import os

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
SRC_TSV = os.path.join(ROOT, "data", "운동정보.tsv")
OUT_JSON = os.path.join(ROOT, "src", "features", "exercise", "exerciseCatalog.json")
PHOTO_DIR = os.path.join(ROOT, "public", "exercises")

CATEGORY = {
    "가슴": "CAT-CHEST",
    "등": "CAT-BACK",
    "어깨": "CAT-SHOULDER",
    "팔": "CAT-ARM",
    "하체": "CAT-LEG",
    "코어": "CAT-CORE",
}

# 운동명 → (슬러그, 영문명, 기구종류, 주동근, 보조근, 난이도, 안전등급)
META = {
    "레그프레스": ("leg-press", "Leg Press", "MCH-PLATE", "MUS-QUADRICEPS", ["MUS-GLUTES", "MUS-HAMSTRINGS"], "LV-1", "SAFE-A"),
    "레그익스텐션": ("leg-extension", "Leg Extension", "MCH-SELECTORIZED", "MUS-QUADRICEPS", [], "LV-1", "SAFE-A"),
    "시티드레그컬": ("seated-leg-curl", "Seated Leg Curl", "MCH-SELECTORIZED", "MUS-HAMSTRINGS", ["MUS-CALVES"], "LV-1", "SAFE-A"),
    "랫풀다운": ("lat-pulldown", "Lat Pulldown", "MCH-CABLE", "MUS-BACK", ["MUS-BICEPS", "MUS-SHOULDER"], "LV-1", "SAFE-A"),
    "체스트프레스": ("chest-press", "Machine Chest Press", "MCH-SELECTORIZED", "MUS-CHEST", ["MUS-SHOULDER", "MUS-TRICEPS"], "LV-1", "SAFE-A"),
    "펙덱": ("pec-deck", "Pec Deck Fly", "MCH-SELECTORIZED", "MUS-CHEST", ["MUS-SHOULDER"], "LV-1", "SAFE-A"),
    "인클라인체스트프레스": ("incline-chest-press", "Incline Chest Press", "MCH-SELECTORIZED", "MUS-CHEST", ["MUS-SHOULDER", "MUS-TRICEPS"], "LV-1", "SAFE-A"),
    "케이블크로스오버": ("cable-crossover", "Cable Crossover", "MCH-CABLE", "MUS-CHEST", ["MUS-SHOULDER"], "LV-2", "SAFE-B"),
    "해머스트렝스체스트프레스": ("hammer-chest-press", "Hammer Strength Chest Press", "MCH-PLATE", "MUS-CHEST", ["MUS-SHOULDER", "MUS-TRICEPS"], "LV-1", "SAFE-A"),
    "케이블플라이": ("cable-fly", "Cable Fly", "MCH-CABLE", "MUS-CHEST", ["MUS-SHOULDER"], "LV-2", "SAFE-B"),
    "시티드로우": ("seated-row", "Seated Cable Row", "MCH-CABLE", "MUS-BACK", ["MUS-BICEPS"], "LV-1", "SAFE-A"),
    "어시스트풀업": ("assisted-pullup", "Assisted Pull-up", "MCH-SELECTORIZED", "MUS-BACK", ["MUS-BICEPS", "MUS-SHOULDER"], "LV-2", "SAFE-B"),
    "머신로우": ("machine-row", "Machine Row", "MCH-PLATE", "MUS-BACK", ["MUS-BICEPS"], "LV-1", "SAFE-A"),
    "스트레이트암풀다운": ("straight-arm-pulldown", "Straight-arm Pulldown", "MCH-CABLE", "MUS-BACK", ["MUS-CORE"], "LV-2", "SAFE-B"),
    "케이블풀오버": ("cable-pullover", "Cable Pullover", "MCH-CABLE", "MUS-BACK", ["MUS-CORE"], "LV-2", "SAFE-B"),
    "머신숄더프레스": ("machine-shoulder-press", "Machine Shoulder Press", "MCH-SELECTORIZED", "MUS-SHOULDER", ["MUS-TRICEPS"], "LV-1", "SAFE-A"),
    "머신레터럴레이즈": ("machine-lateral-raise", "Machine Lateral Raise", "MCH-SELECTORIZED", "MUS-SHOULDER", [], "LV-1", "SAFE-A"),
    "리어델트플라이": ("rear-delt-fly", "Rear Delt Fly", "MCH-SELECTORIZED", "MUS-SHOULDER", ["MUS-BACK"], "LV-1", "SAFE-A"),
    "케이블페이스풀": ("cable-face-pull", "Cable Face Pull", "MCH-CABLE", "MUS-SHOULDER", ["MUS-BACK"], "LV-2", "SAFE-B"),
    "케이블레터럴레이즈": ("cable-lateral-raise", "Cable Lateral Raise", "MCH-CABLE", "MUS-SHOULDER", [], "LV-2", "SAFE-B"),
    "머신바이셉컬": ("machine-biceps-curl", "Machine Biceps Curl", "MCH-SELECTORIZED", "MUS-BICEPS", [], "LV-1", "SAFE-A"),
    "케이블바이셉컬": ("cable-biceps-curl", "Cable Biceps Curl", "MCH-CABLE", "MUS-BICEPS", [], "LV-2", "SAFE-B"),
    "케이블푸시다운": ("cable-pushdown", "Cable Pushdown", "MCH-CABLE", "MUS-TRICEPS", [], "LV-2", "SAFE-B"),
    "오버헤드케이블익스텐션": ("overhead-cable-extension", "Overhead Cable Extension", "MCH-CABLE", "MUS-TRICEPS", ["MUS-SHOULDER"], "LV-2", "SAFE-B"),
    "어시스트딥스": ("assisted-dips", "Assisted Dips", "MCH-SELECTORIZED", "MUS-TRICEPS", ["MUS-CHEST", "MUS-SHOULDER"], "LV-2", "SAFE-B"),
    "핵스쿼트": ("hack-squat", "Hack Squat", "MCH-PLATE", "MUS-QUADRICEPS", ["MUS-GLUTES"], "LV-2", "SAFE-B"),
    "힙어브덕션": ("hip-abduction", "Hip Abduction", "MCH-SELECTORIZED", "MUS-GLUTES", [], "LV-1", "SAFE-A"),
    "힙어덕션": ("hip-adduction", "Hip Adduction", "MCH-SELECTORIZED", "MUS-ADDUCTORS", [], "LV-1", "SAFE-A"),
    "스미스머신스쿼트": ("smith-squat", "Smith Machine Squat", "MCH-SMITH", "MUS-QUADRICEPS", ["MUS-GLUTES", "MUS-CORE"], "LV-2", "SAFE-B"),
    "스탠딩카프레이즈": ("standing-calf-raise", "Standing Calf Raise", "MCH-SELECTORIZED", "MUS-CALVES", [], "LV-1", "SAFE-A"),
    "윗몸일으키기": ("sit-up", "Sit-up", "MCH-BODYWEIGHT", "MUS-CORE", [], "LV-2", "SAFE-B"),
    "런지": ("lunge", "Lunge", "MCH-BODYWEIGHT", "MUS-QUADRICEPS", ["MUS-GLUTES", "MUS-CORE"], "LV-2", "SAFE-B"),
    "스쿼트": ("squat", "Bodyweight Squat", "MCH-BODYWEIGHT", "MUS-QUADRICEPS", ["MUS-GLUTES", "MUS-CORE"], "LV-2", "SAFE-B"),
    "플랭크": ("plank", "Plank", "MCH-BODYWEIGHT", "MUS-CORE", ["MUS-SHOULDER"], "LV-1", "SAFE-A"),
    "푸시업": ("push-up", "Push-up", "MCH-BODYWEIGHT", "MUS-CHEST", ["MUS-TRICEPS", "MUS-CORE"], "LV-2", "SAFE-B"),
    "글루트브리지": ("glute-bridge", "Glute Bridge", "MCH-BODYWEIGHT", "MUS-GLUTES", ["MUS-HAMSTRINGS", "MUS-CORE"], "LV-1", "SAFE-A"),
    "버드독": ("bird-dog", "Bird Dog", "MCH-BODYWEIGHT", "MUS-CORE", ["MUS-GLUTES"], "LV-1", "SAFE-A"),
    "마운틴클라이머": ("mountain-climber", "Mountain Climber", "MCH-BODYWEIGHT", "MUS-CORE", ["MUS-SHOULDER", "MUS-QUADRICEPS"], "LV-2", "SAFE-B"),
}


def main() -> int:
    with open(SRC_TSV, encoding="utf-8") as fp:
        rows = list(csv.DictReader(fp, delimiter="\t"))

    catalog = []
    problems = []

    for row in rows:
        name = (row["운동명"] or "").strip()
        if not name:
            continue
        if name not in META:
            problems.append(f"META 에 '{name}' 없음")
            continue
        slug, english, machine, primary, secondary, difficulty, safety = META[name]

        part = (row["부위"] or "").strip()
        if part not in CATEGORY:
            problems.append(f"{name}: 알 수 없는 부위 '{part}'")
            continue

        steps = [(row[f"단계{i}"] or "").strip() for i in (1, 2, 3)]
        steps = [s for s in steps if s]

        # 사진은 변환된 WebP 가 실제로 있는 단계만 연결한다.
        photos = []
        for i in (1, 2, 3):
            if os.path.exists(os.path.join(PHOTO_DIR, f"{slug}-{i}.webp")):
                photos.append(i)
        if not photos:
            problems.append(f"{name}: 사진 없음({slug}-*.webp)")

        reps = int(row["횟수"])
        catalog.append(
            {
                "id": slug,
                "displayName": name,
                "englishName": english,
                "category": CATEGORY[part],
                "machineType": machine,
                "primaryMuscle": primary,
                "secondaryMuscles": secondary,
                "difficulty": difficulty,
                "safety": safety,
                "sets": int(row["세트"]),
                "reps": reps,
                "restSec": int(row["휴식(초)"]),
                "steps": steps,
                "caution": (row["주의사항"] or "").strip(),
                "photoSteps": photos,
            }
        )

    catalog.sort(key=lambda e: (e["category"], e["id"]))
    with open(OUT_JSON, "w", encoding="utf-8") as fp:
        json.dump(catalog, fp, ensure_ascii=False, indent=2)

    print(f"운동 {len(catalog)}종 생성 → {os.path.relpath(OUT_JSON, ROOT)}")
    by_cat = {}
    for e in catalog:
        by_cat[e["category"]] = by_cat.get(e["category"], 0) + 1
    print("  " + ", ".join(f"{k}:{v}" for k, v in sorted(by_cat.items())))
    if problems:
        print("확인 필요:")
        for p in problems:
            print("  -", p)
        return 1
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
