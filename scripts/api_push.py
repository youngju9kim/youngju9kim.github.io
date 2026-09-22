# -*- coding: utf-8 -*-
"""회사 프록시가 git push(git-receive-pack)를 막을 때, GitHub REST API 로 커밋을 올린다.

api.github.com 은 프록시를 통과하므로 Git Data API 로
  blob 생성 -> tree 생성 -> commit 생성 -> ref 갱신
순서로 커밋 하나를 만든다. 결과는 git push 와 동일하다.

주의: 사내 웹필터가 약 46KB 넘는 요청을 차단하므로 파일 하나가 33KB 를 넘으면 실패한다.
이미 GitHub 에 있는 blob 은 다시 올리지 않으므로 두 번째부터는 바뀐 파일만 전송된다.

사용법:
    py scripts/api_push.py            # HEAD 커밋 내용을 GitHub main 에 반영
    py scripts/api_push.py --cancel   # 진행 중인 워크플로를 먼저 취소하고 반영
"""
import base64
import json
import os
import subprocess
import sys
import time
import urllib.error
import urllib.request

# 사내 프록시가 TLS 를 가로채므로 certifi 번들로는 검증에 실패한다.
# Windows 인증서 저장소(사내 루트 CA 가 설치돼 있음)를 쓴다.
import truststore

truststore.inject_into_ssl()

REPO = "youngju9kim/youngju9kim.github.io"
BRANCH = "main"
API = "https://api.github.com"
PROJECT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
MAX_RAW_BYTES = 33 * 1024  # 웹필터 한계에서 역산한 파일 크기 상한


def git(*args: str, binary: bool = False):
    res = subprocess.run(["git", *args], capture_output=True, cwd=PROJECT, check=True)
    return res.stdout if binary else res.stdout.decode("utf-8")


def get_token() -> str:
    out = subprocess.run(
        ["git", "credential", "fill"],
        input="protocol=https\nhost=github.com\n\n",
        capture_output=True, text=True, cwd=PROJECT,
    ).stdout
    for line in out.splitlines():
        if line.startswith("password="):
            return line.split("=", 1)[1]
    raise SystemExit("GitHub 토큰을 찾지 못했습니다. 먼저 git 으로 GitHub 에 로그인하세요.")


TOKEN = get_token()


def api(method: str, path: str, body=None, retries: int = 4):
    url = path if path.startswith("http") else API + path
    data = json.dumps(body).encode() if body is not None else None
    for attempt in range(retries):
        req = urllib.request.Request(url, data=data, method=method)
        req.add_header("Authorization", "Bearer " + TOKEN)
        req.add_header("Accept", "application/vnd.github+json")
        req.add_header("Content-Type", "application/json")
        try:
            with urllib.request.urlopen(req, timeout=120) as resp:
                raw = resp.read()
                return json.loads(raw) if raw else {}
        except urllib.error.HTTPError as e:
            detail = e.read().decode("utf-8", "replace")
            if "비업무사이트차단" in detail:
                raise SystemExit(
                    f"[{method} {path}] 사내 웹필터가 차단했습니다 "
                    f"(요청 {len(data) if data else 0}B). 파일이 너무 큽니다."
                )
            if e.code < 500 and e.code != 429:
                raise SystemExit(f"[{method} {path}] HTTP {e.code}\n{detail[:300]}")
            if attempt == retries - 1:
                raise SystemExit(f"[{method} {path}] HTTP {e.code} (재시도 실패)")
        except urllib.error.URLError as e:
            if attempt == retries - 1:
                raise SystemExit(f"[{method} {path}] 연결 실패: {e.reason}")
        time.sleep(2 * (attempt + 1))
    raise SystemExit("unreachable")


def cancel_running_workflows() -> None:
    runs = api("GET", f"/repos/{REPO}/actions/runs?per_page=20")
    for r in runs.get("workflow_runs", []):
        if r["status"] in ("in_progress", "queued", "waiting"):
            print(f"  진행 중인 실행 취소: {r['name']} #{r['run_number']}")
            try:
                api("POST", f"/repos/{REPO}/actions/runs/{r['id']}/cancel")
            except SystemExit as e:
                print(f"    (취소 실패, 무시: {e})")


def head_entries() -> list[tuple[str, str, str]]:
    """HEAD 커밋의 (mode, sha, path) 목록. git 이 계산한 blob sha 는 GitHub 과 동일하다."""
    out = git("ls-tree", "-r", "-z", "HEAD")
    entries = []
    for rec in out.split("\0"):
        if not rec:
            continue
        meta, path = rec.split("\t", 1)
        mode, _type, sha = meta.split()
        entries.append((mode, sha, path))
    return entries


def remote_blob_shas(commit_sha: str) -> set[str]:
    """원격에 이미 있는 blob sha 집합 (재업로드 방지)."""
    try:
        commit = api("GET", f"/repos/{REPO}/git/commits/{commit_sha}")
        tree = api("GET", f"/repos/{REPO}/git/trees/{commit['tree']['sha']}?recursive=1")
    except SystemExit:
        return set()
    return {e["sha"] for e in tree.get("tree", []) if e["type"] == "blob"}


def main() -> int:
    if "--cancel" in sys.argv:
        print("진행 중인 워크플로 정리 중...")
        cancel_running_workflows()

    entries = head_entries()
    subject = git("log", "-1", "--pretty=%B").strip()

    # 크기는 git 오브젝트 기준으로 본다(작업본은 CRLF 라 바이트 수가 다를 수 있다).
    oversized = []
    for _mode, sha, path in entries:
        size = int(git("cat-file", "-s", sha).strip())
        if size > MAX_RAW_BYTES:
            oversized.append((size, path))
    if oversized:
        print("웹필터 한계(33KB)를 넘는 파일이 있어 중단합니다:")
        for size, path in sorted(oversized, reverse=True):
            print(f"  {size/1024:8.1f} KB  {path}")
        return 1

    ref = api("GET", f"/repos/{REPO}/git/ref/heads/{BRANCH}")
    parent = ref["object"]["sha"]
    known = remote_blob_shas(parent)

    todo = [(m, s, p) for (m, s, p) in entries if s not in known]
    print(f"추적 파일 {len(entries)}개 · 새로 올릴 파일 {len(todo)}개 (기준 커밋 {parent[:8]})")

    started = time.time()
    for i, (_mode, sha, path) in enumerate(todo, 1):
        # 작업본이 아니라 git 오브젝트의 바이트를 올려야 sha 가 일치한다.
        # (Windows 작업본은 CRLF, git 오브젝트는 LF 라 내용이 다르다)
        content = git("cat-file", "blob", sha, binary=True)
        uploaded = api("POST", f"/repos/{REPO}/git/blobs",
                       {"content": base64.b64encode(content).decode(), "encoding": "base64"})
        if uploaded["sha"] != sha:
            raise SystemExit(f"blob sha 불일치: {path}\n  git={sha}\n  github={uploaded['sha']}")
        if i % 20 == 0 or i == len(todo):
            print(f"  {i}/{len(todo)} ({time.time()-started:.0f}초)", flush=True)

    print("트리 생성 중...")
    tree = [{"path": p, "mode": m, "type": "blob", "sha": s} for (m, s, p) in entries]
    tree_obj = api("POST", f"/repos/{REPO}/git/trees", {"tree": tree})

    print("커밋 생성 중...")
    commit = api("POST", f"/repos/{REPO}/git/commits",
                 {"message": subject, "tree": tree_obj["sha"], "parents": [parent]})

    print("브랜치 갱신 중...")
    api("PATCH", f"/repos/{REPO}/git/refs/heads/{BRANCH}",
        {"sha": commit["sha"], "force": True})

    print(f"\n완료. https://github.com/{REPO}/commit/{commit['sha']}")
    return 0


if __name__ == "__main__":
    sys.exit(main())
