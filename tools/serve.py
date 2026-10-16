"""Statischer Server für die Entwicklung: wie `python -m http.server`, aber ohne Browser-Cache, damit Änderungen sofort sichtbar sind.
Aufruf:  python tools/serve.py [port]   (Standard 4173, nur 127.0.0.1)"""
import functools
import http.server
import os
import sys


class NoCache(http.server.SimpleHTTPRequestHandler):
    def end_headers(self):
        self.send_header("Cache-Control", "no-store")
        super().end_headers()

    def log_message(self, *a):  # ruhig bleiben
        pass


root = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
port = int(sys.argv[1]) if len(sys.argv) > 1 else 4173
handler = functools.partial(NoCache, directory=root)
http.server.ThreadingHTTPServer(("127.0.0.1", port), handler).serve_forever()
