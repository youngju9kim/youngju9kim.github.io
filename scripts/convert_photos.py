# -*- coding: utf-8 -*-
"""사용자가 준비한 운동 사진을 앱 번들용 WebP 로 변환한다.

    py scripts/convert_photos.py

원본: K:\\...\\피트니스운동자료\\사진\\<한글운동명>_{1,2,3}.jpg
출력: public/exercises/<ascii-slug>-{1,2,3}.webp

한글 파일명은 URL·서비스워커 경로에서 인코딩 문제가 생길 수 있어 ASCII 슬러그로 바꾼다.
어떤 단계에 사진이 있는지는 build_catalog.py 가 이 폴더를 보고 판단하므로
여기서 따로 목록 파일을 만들지 않는다.

새 운동을 추가하려면 아래 SLUGS 에 한 줄 넣고 다시 실행하면 된다.
"""
import os
import sys

from PIL import Image

SRC = r"K:\My files\PA개인폴더(youngju9.kim)\Download\fitness_exercise_assets_final\피트니스운동자료\사진"
ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
OUT_DIR = os.path.join(ROOT, "public", "exercises")

MAX_SIDE = 720
QUALITY = 74

# 한글 운동명 → ASCII 슬러그. 이 슬러그가 앱의 운동 id 가 된다.
SLUGS = {
    # ── 머신·케이블 (2026-09-17 최초 38종) ──────────────────
    "글루트브리지": "glute-bridge",
    "랫풀다운": "lat-pulldown",
    "런지": "lunge",
    "레그익스텐션": "leg-extension",
    "레그프레스": "leg-press",
    "리어델트플라이": "rear-delt-fly",
    "마운틴클라이머": "mountain-climber",
    "머신레터럴레이즈": "machine-lateral-raise",
    "머신로우": "machine-row",
    "머신바이셉컬": "machine-biceps-curl",
    "머신숄더프레스": "machine-shoulder-press",
    "버드독": "bird-dog",
    "스미스머신스쿼트": "smith-squat",
    "스쿼트": "squat",
    "스탠딩카프레이즈": "standing-calf-raise",
    "스트레이트암풀다운": "straight-arm-pulldown",
    "시티드레그컬": "seated-leg-curl",
    "시티드로우": "seated-row",
    "어시스트딥스": "assisted-dips",
    "어시스트풀업": "assisted-pullup",
    "오버헤드케이블익스텐션": "overhead-cable-extension",
    "윗몸일으키기": "sit-up",
    "인클라인체스트프레스": "incline-chest-press",
    "체스트프레스": "chest-press",
    "케이블레터럴레이즈": "cable-lateral-raise",
    "케이블바이셉컬": "cable-biceps-curl",
    "케이블크로스오버": "cable-crossover",
    "케이블페이스풀": "cable-face-pull",
    "케이블푸시다운": "cable-pushdown",
    "케이블풀오버": "cable-pullover",
    "케이블플라이": "cable-fly",
    "펙덱": "pec-deck",
    "푸시업": "push-up",
    "플랭크": "plank",
    "해머스트렝스체스트프레스": "hammer-chest-press",
    "핵스쿼트": "hack-squat",
    "힙어덕션": "hip-adduction",
    "힙어브덕션": "hip-abduction",
    # ── 맨몸 운동 추가 (2026-09-28, 집에서 하는 운동 보강) ──
    "YTW레이즈": "ytw-raise",
    "데드버그": "dead-bug",
    "리버스런지": "reverse-lunge",
    "리버스스노우엔젤": "reverse-snow-angel",
    "리버스크런치": "reverse-crunch",
    "리버스플랭크": "reverse-plank",
    "바이시클크런치": "bicycle-crunch",
    "베어크롤": "bear-crawl",
    "사이드런지": "side-lunge",
    "사이드플랭크": "side-plank",
    "숄더탭플랭크": "shoulder-tap-plank",
    "슈퍼맨": "superman",
    "스핑크스푸시업": "sphinx-push-up",
    "싱글레그글루트브리지": "single-leg-glute-bridge",
    "월싯": "wall-sit",
    "인치웜": "inchworm",
    "점프스쿼트": "jump-squat",
    "카프레이즈": "bodyweight-calf-raise",
    "파이크푸시업": "pike-push-up",
    "할로우바디홀드": "hollow-body-hold",
}


def main() -> int:
    if not os.path.isdir(SRC):
        print(f"원본 폴더를 찾을 수 없습니다: {SRC}")
        return 1
    os.makedirs(OUT_DIR, exist_ok=True)

    unknown: set[str] = set()
    converted = 0
    names: set[str] = set()
    total_in = total_out = 0

    for fname in sorted(os.listdir(SRC)):
        if not fname.lower().endswith(".jpg"):
            continue
        base = os.path.splitext(fname)[0]
        name, _, idx = base.rpartition("_")
        if not name or not idx.isdigit():
            unknown.add(fname)
            continue
        slug = SLUGS.get(name)
        if slug is None:
            unknown.add(name)
            continue

        src_path = os.path.join(SRC, fname)
        out_path = os.path.join(OUT_DIR, f"{slug}-{int(idx)}.webp")

        im = Image.open(src_path).convert("RGB")
        im.thumbnail((MAX_SIDE, MAX_SIDE), Image.LANCZOS)
        im.save(out_path, "WEBP", quality=QUALITY, method=6)

        total_in += os.path.getsize(src_path)
        total_out += os.path.getsize(out_path)
        converted += 1
        names.add(name)

    print(f"변환 완료: {converted}장 / 운동 {len(names)}종")
    print(f"용량: {total_in/1024/1024:.1f}MB -> {total_out/1024/1024:.1f}MB")
    if unknown:
        print("SLUGS 에 없어 건너뛴 항목:")
        for u in sorted(unknown):
            print("  -", u)
        return 1
    return 0


if __name__ == "__main__":
    sys.exit(main())
