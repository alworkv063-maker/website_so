"""Локальный сервер для просмотра сайта.

    python3 serve.py          — открыть сайт
    python3 serve.py mobile   — открыть сайт в рамке телефона

Браузер откроется сам. Сервер виден и с телефона, если он в той же сети Wi-Fi.
Остановить — Control+C.
"""
import functools, http.server, os, socket, socketserver, subprocess, sys, threading, webbrowser

PORT = 4322
ROOT = os.path.dirname(os.path.abspath(__file__))


def is_private(ip):
    if not ip:
        return False
    p = ip.split(".")
    if len(p) != 4 or not all(c.isdigit() for c in p):
        return False
    a, b = int(p[0]), int(p[1])
    return a == 10 or (a == 172 and 16 <= b <= 31) or (a == 192 and b == 168)


def lan_ip():
    """адрес компьютера в домашней сети — по нему сайт открывается с телефона"""
    for iface in ("en0", "en1", "en2"):          # Wi-Fi и Ethernet на macOS
        try:
            out = subprocess.run(["ipconfig", "getifaddr", iface],
                                 capture_output=True, text=True, timeout=2).stdout.strip()
            if is_private(out):
                return out
        except (OSError, subprocess.SubprocessError):
            pass
    s = socket.socket(socket.AF_INET, socket.SOCK_DGRAM)
    try:
        s.connect(("8.8.8.8", 80))     # соединение не устанавливается, нужен только маршрут
        ip = s.getsockname()[0]
        return ip if is_private(ip) else None
    except OSError:
        return None
    finally:
        s.close()


class Handler(http.server.SimpleHTTPRequestHandler):
    def end_headers(self):
        # чтобы правки сразу были видны без ручной перезагрузки кэша
        self.send_header("Cache-Control", "no-store")
        super().end_headers()


socketserver.TCPServer.allow_reuse_address = True
handler = functools.partial(Handler, directory=ROOT)

page = "preview-mobile.html" if "mobile" in sys.argv[1:] else ""

with socketserver.TCPServer(("0.0.0.0", PORT), handler) as httpd:
    ip = lan_ip()
    print("Сайт:            http://localhost:%d" % PORT, flush=True)
    print("Превью телефона: http://localhost:%d/preview-mobile.html" % PORT, flush=True)
    if ip:
        print("С телефона:      http://%s:%d  (та же сеть Wi-Fi)" % (ip, PORT), flush=True)
    else:
        print("С телефона:      адрес не определён — посмотрите его в Системных\n"
              "                 настройках → Wi-Fi → Подробности → IP-адрес", flush=True)
    print("\nОстановить — Control+C", flush=True)

    threading.Timer(0.6, webbrowser.open,
                    ["http://localhost:%d/%s" % (PORT, page)]).start()
    try:
        httpd.serve_forever()
    except KeyboardInterrupt:
        print("\nСервер остановлен.")
