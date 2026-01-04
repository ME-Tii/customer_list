#!/usr/bin/env python3
import http.server
import socketserver
import os
import socket

class AuthRedirectHandler(http.server.SimpleHTTPRequestHandler):
    def do_GET(self):
        if self.path == '/':
            self.path = '/auth.html'
        return super().do_GET()

PORT = 8080

with socketserver.TCPServer(('0.0.0.0', PORT), AuthRedirectHandler) as httpd:
    local_ip = socket.gethostbyname(socket.gethostname())
    print(f"Server running on port {PORT}")
    print(f"Local: http://localhost:{PORT}")
    print(f"Network: http://{local_ip}:{PORT}")
    httpd.serve_forever()