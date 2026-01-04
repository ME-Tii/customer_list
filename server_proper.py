#!/usr/bin/env python3
import http.server
import socketserver
import json
import os
from urllib.parse import urlparse, parse_qs
import http.cookies

class CustomerListHandler(http.server.SimpleHTTPRequestHandler):
    def __init__(self, *args, **kwargs):
        super().__init__(*args, directory=os.path.dirname(os.path.abspath(__file__)), **kwargs)
    
    def do_GET(self):
        parsed_path = urlparse(self.path)
        
        # Serve login page as default
        if parsed_path.path == '/':
            self.serve_file('auth.html')
            return
        elif parsed_path.path == '/dashboard' or parsed_path.path == '/dashboard.html':
            self.serve_file('dashboard.html')
            return
        elif parsed_path.path == '/chat' or parsed_path.path == '/chat.html':
            self.serve_file('chat.html')
            return
        elif parsed_path.path == '/user-access' or parsed_path.path == '/user-access.html':
            self.serve_file('user-access.html')
            return
        elif parsed_path.path == '/verification' or parsed_path.path == '/verification.html':
            self.serve_file('verification.html')
            return
        elif parsed_path.path == '/api/messages':
            self.handle_get_messages()
            return
        elif parsed_path.path == '/api/users':
            self.handle_get_users()
            return
        else:
            # Try to serve static files
            if os.path.exists(parsed_path.path[1:]):
                self.serve_file(parsed_path.path[1:])
            else:
                self.send_error(404)
    
    def do_POST(self):
        parsed_path = urlparse(self.path)
        
        if parsed_path.path == '/api/login':
            self.handle_login()
            return
        elif parsed_path.path == '/api/messages':
            self.handle_add_message()
            return
        elif parsed_path.path == '/api/customers':
            self.handle_add_customer()
            return
        else:
            self.send_error(404)
    
    def serve_file(self, filename):
        try:
            with open(filename, 'rb') as f:
                content = f.read()
            
            # Determine content type
            if filename.endswith('.html'):
                content_type = 'text/html'
            elif filename.endswith('.css'):
                content_type = 'text/css'
            elif filename.endswith('.js'):
                content_type = 'application/javascript'
            elif filename.endswith('.json'):
                content_type = 'application/json'
            else:
                content_type = 'text/plain'
            
            self.send_response(200)
            self.send_header('Content-type', content_type)
            self.send_cors_headers()
            self.end_headers()
            self.wfile.write(content)
        except FileNotFoundError:
            self.send_error(404)
    
    def send_cors_headers(self):
        self.send_header('Access-Control-Allow-Origin', '*')
        self.send_header('Access-Control-Allow-Methods', 'GET, POST, OPTIONS')
        self.send_header('Access-Control-Allow-Headers', 'Content-Type')
    
    def send_json_response(self, data, status_code=200):
        self.send_response(status_code)
        self.send_header('Content-type', 'application/json')
        self.send_cors_headers()
        self.end_headers()
        self.wfile.write(json.dumps(data).encode())
    
    def handle_login(self):
        try:
            content_length = int(self.headers['Content-Length'])
            post_data = self.rfile.read(content_length)
            data = json.loads(post_data.decode('utf-8'))
            
            username = data.get('username')
            password = data.get('password')
            
            # Load users from file
            users = self.load_users()
            
            user_found = False
            logged_user = None
            for user in users:
                if user['username'] == username and user['password'] == password:
                    user_found = True
                    logged_user = user
                    break
            
            if user_found:
                self.send_response(200)
                self.send_header('Content-type', 'application/json')
                self.send_cors_headers()
                self.send_header('Set-Cookie', f'session=username={username}; accessGranted={logged_user.get("accessGranted", False)}; Path=/; HttpOnly')
                self.end_headers()
                self.wfile.write(json.dumps({
                    'message': 'Login successful',
                    'username': username,
                    'accessGranted': logged_user.get('accessGranted', False)
                }).encode())
            else:
                self.send_json_response({'error': 'Invalid username or password'}, 401)
        except Exception as e:
            self.send_json_response({'error': str(e)}, 500)
    
    def handle_get_messages(self):
        try:
            messages = self.load_messages()
            self.send_json_response(messages)
        except Exception as e:
            self.send_json_response({'error': str(e)}, 500)
    
    def handle_add_message(self):
        try:
            content_length = int(self.headers['Content-Length'])
            post_data = self.rfile.read(content_length)
            data = json.loads(post_data.decode('utf-8'))
            
            messages = self.load_messages()
            messages.append(data)
            self.save_messages(messages)
            
            self.send_json_response({'success': True})
        except Exception as e:
            self.send_json_response({'error': str(e)}, 500)
    
    def handle_get_users(self):
        try:
            users = self.load_users()
            self.send_json_response(users)
        except Exception as e:
            self.send_json_response({'error': str(e)}, 500)
    
    def handle_add_customer(self):
        try:
            content_length = int(self.headers['Content-Length'])
            post_data = self.rfile.read(content_length)
            data = json.loads(post_data.decode('utf-8'))
            
            customers = self.load_customers()
            customers.append(data)
            self.save_customers(customers)
            
            self.send_json_response({'success': True})
        except Exception as e:
            self.send_json_response({'error': str(e)}, 500)
    
    def load_users(self):
        try:
            with open('users.json', 'r') as f:
                return json.load(f)
        except FileNotFoundError:
            return []
    
    def load_messages(self):
        try:
            with open('messages.json', 'r') as f:
                return json.load(f)
        except FileNotFoundError:
            return []
    
    def save_messages(self, messages):
        with open('messages.json', 'w') as f:
            json.dump(messages, f, indent=2)
    
    def load_customers(self):
        try:
            with open('customers.xml', 'r') as f:
                # Simple XML parsing for now
                content = f.read()
                # Return empty list for now
                return []
        except FileNotFoundError:
            return []
    
    def save_customers(self, customers):
        # Simple XML generation for now
        xml_content = '<?xml version="1.0" encoding="UTF-8"?>\n<customers>\n'
        for customer in customers:
            xml_content += f'  <customer>\n'
            for key, value in customer.items():
                xml_content += f'    <{key}>{value}</{key}>\n'
            xml_content += f'  </customer>\n'
        xml_content += '</customers>'
        
        with open('customers.xml', 'w') as f:
            f.write(xml_content)

if __name__ == '__main__':
    PORT = 3000
    Handler = CustomerListHandler
    
    with socketserver.TCPServer(("", PORT), Handler) as httpd:
        print(f"Server running at http://localhost:{PORT}")
        print(f"Login page: http://localhost:{PORT}/")
        httpd.serve_forever()