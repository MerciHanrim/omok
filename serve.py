#!/usr/bin/env python3
# ============================================================
#  serve.py  —  COOP/COEP 헤더 붙은 로컬 개발 서버
#
#  왜 필요한가:
#   받은 Fairy-Stockfish는 멀티스레드 빌드라 SharedArrayBuffer가 필요하고,
#   그건 응답에 아래 두 헤더가 있어야 켜짐:
#     Cross-Origin-Opener-Policy: same-origin
#     Cross-Origin-Embedder-Policy: require-corp
#   python -m http.server 는 이 헤더를 못 줌 → 그래서 이 스크립트.
#
#  사용법 (저장소 루트 = index.html 있는 폴더에서):
#     python serve.py
#   그다음 브라우저에서:  http://localhost:8000
#   끄기:  Ctrl+C
#
#  ★ 반드시 index.html 있는 폴더에서 실행할 것.
#    (다른 데서 띄우면 디렉토리 목록만 뜸 — 인수인계서 2번 주의사항)
# ============================================================

import http.server
import socketserver

PORT = 8000

class COOPCOEPHandler(http.server.SimpleHTTPRequestHandler):
    def end_headers(self):
        # SharedArrayBuffer 활성화에 필요한 cross-origin isolation 헤더
        self.send_header("Cross-Origin-Opener-Policy", "same-origin")
        self.send_header("Cross-Origin-Embedder-Policy", "require-corp")
        # 캐시 끄기 — 수정한 파일이 바로 반영되게 (개발 중 편의)
        self.send_header("Cache-Control", "no-store")
        super().end_headers()

    # .wasm MIME 보정 (일부 환경에서 누락되면 로딩 실패)
    def guess_type(self, path):
        if path.endswith(".wasm"):
            return "application/wasm"
        if path.endswith(".js"):
            return "text/javascript"
        return super().guess_type(path)


def main():
    socketserver.TCPServer.allow_reuse_address = True
    with socketserver.TCPServer(("", PORT), COOPCOEPHandler) as httpd:
        print(f"오목 로컬 서버 실행 중 → http://localhost:{PORT}")
        print("  (COOP/COEP 헤더 적용됨 — SharedArrayBuffer 활성화)")
        print("  끄려면 Ctrl+C")
        try:
            httpd.serve_forever()
        except KeyboardInterrupt:
            print("\n서버를 종료합니다.")


if __name__ == "__main__":
    main()
