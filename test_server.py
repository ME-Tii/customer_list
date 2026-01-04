#!/usr/bin/env python3
import http.server
import socketserver
import socket
import sys

def start_server(port):
    class MyHandler(http.server.SimpleHTTPRequestHandler):
        def do_GET(self):
            self.send_response(200)
            self.send_header('Content-type', 'text/html')
            self.end_headers()
            self.wfile.write(b'<h1>Server is working!</h1><p>Port: ' + str(port).encode() + b'</p>')
        
        def end_headers(self):
            self.send_header('Access-Control-Allow-Origin', '*')
            super().end_headers()
    
    # Bind to all interfaces explicitly
    server_address = ('0.0.0.0', port)
    httpd = socketserver.TCPServer(server_address, MyHandler)
    
    local_ip = socket.gethostbyname(socket.gethostname())
    
    print(f"Server started on port {port}")
    print(f"Local: http://localhost:{port}")
    print(f"Network: http://{local_ip}:{port}")
    print("Press Ctrl+C to stop")
    
    try:
        httpd.serve_forever()
    except KeyboardInterrupt:
        print("\nServer stopped")
        httpd.server_close()

if __name__ == "__main__":
    port = int(sys.argv[1]) if len(sys.argv) > 1 else 8080
    start_server(port)