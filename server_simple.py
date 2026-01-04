#!/usr/bin/env python3
from http.server import HTTPServer, BaseHTTPRequestHandler
from urllib.parse import urlparse, parse_qs
import json
import os
import xml.etree.ElementTree as ET
from datetime import datetime

class CustomerHandler(BaseHTTPRequestHandler):
    
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
    
    def is_authenticated(self):
        """Simple session-based authentication"""
        cookie_header = self.headers.get('Cookie')
        if cookie_header and 'session=' in cookie_header:
            return True
        return False
    
    def get_user_from_cookie(self):
        """Extract user info from cookie"""
        cookie_header = self.headers.get('Cookie')
        if not cookie_header or 'session=' not in cookie_header:
            return None
        
        try:
            session_data = cookie_header.split('session=')[1].split(';')[0]
            user_info = {}
            for part in session_data.split('; '):
                if '=' in part:
                    key, value = part.split('=', 1)
                    user_info[key] = value == 'true' if value.lower() in ['true', 'false'] else value
            return user_info
        except:
            return None
    
    def has_access_granted(self):
        """Check if current user has access granted"""
        user_info = self.get_user_from_cookie()
        if not user_info:
            return False
        
        # Also check database for most current access status
        users = self.load_users()
        username = user_info.get('username')
        for user in users:
            if user['username'] == username:
                return user.get('accessGranted', False)
        return False
    
    def load_users(self):
        """Load users from file"""
        if not os.path.exists('users.json'):
            return []
        
        try:
            with open('users.json', 'r') as f:
                return json.load(f)
        except:
            return []
    
    def save_users(self, users):
        """Save users to file"""
        with open('users.json', 'w') as f:
            json.dump(users, f, indent=2)
    
    def load_messages(self):
        """Load messages from file"""
        if not os.path.exists('messages.json'):
            return []
        
        try:
            with open('messages.json', 'r') as f:
                return json.load(f)
        except:
            return []
    
    def save_messages(self, messages):
        """Save messages to file"""
        with open('messages.json', 'w') as f:
            json.dump(messages, f, indent=2)
    
    def get_messages(self):
        """Get all chat messages"""
        messages = self.load_messages()
        self.send_json_response(messages)
    
    def add_message(self):
        """Add new chat message"""
        try:
            content_length = int(self.headers['Content-Length'])
            post_data = self.rfile.read(content_length)
            data = json.loads(post_data.decode('utf-8'))
            
            username = data.get('username')
            content = data.get('content')
            
            if not username or not content:
                self.send_json_response({'error': 'Username and content required'}, 400)
                return
            
            if len(content) > 500:
                self.send_json_response({'error': 'Message too long (max 500 characters)'}, 400)
                return
            
            # Create new message
            new_message = {
                'username': username,
                'content': content,
                'timestamp': datetime.now().isoformat()
            }
            
            # Load existing messages
            messages = self.load_messages()
            
            # Add new message (keep last 100)
            messages.append(new_message)
            if len(messages) > 100:
                messages = messages[-100:]
            
            # Save messages
            self.save_messages(messages)
            
            self.send_json_response({
                'message': 'Message sent successfully',
                'data': new_message
            }, 201)
            
        except json.JSONDecodeError:
            self.send_json_response({'error': 'Invalid JSON'}, 400)
        except Exception as e:
            self.send_json_response({'error': 'Server error'}, 500)
    
    def handle_login(self):
        """Handle login request"""
        try:
            content_length = int(self.headers['Content-Length'])
            post_data = self.rfile.read(content_length)
            data = json.loads(post_data.decode('utf-8'))
            
            username = data.get('username')
            password = data.get('password')
            
            if not username or not password:
                self.send_json_response({'error': 'Username and password required'}, 400)
                return
            
            users = self.load_users()
            
            user_found = False
            for user in users:
                if user['username'] == username and user['password'] == password:
                    user_found = True
                    break
            
            if user_found:
                self.send_response(200)
                self.send_header('Content-type', 'application/json')
                self.send_cors_headers()
                self.send_header('Set-Cookie', f'session=username={login_username}; accessGranted={logged_user.get("accessGranted", False)}; Path=/; HttpOnly')
                self.end_headers()
                self.wfile.write(json.dumps({
                    'message': 'Login successful',
                    'username': login_username,
                    'accessGranted': logged_user.get('accessGranted', False)
                }).encode())
            else:
                self.send_json_response({'error': 'Invalid username or password'}, 401)
    
    def get_messages(self):
        """Get all chat messages"""
        messages = self.load_messages()
        self.send_json_response(messages)
    
    def add_message(self):
                self.send_response(200)
                self.send_header('Content-type', 'application/json')
                self.send_cors_headers()
                self.send_header('Set-Cookie', f'session=username={username}; accessGranted={user.get("accessGranted", False)}; Path=/; HttpOnly')
                self.end_headers()
                self.wfile.write(json.dumps({
                    'message': 'Login successful',
                    'username': username,
                    'accessGranted': user.get('accessGranted', False)
                }).encode())
            else:
                self.send_json_response({'error': 'Invalid username or password'}, 401)
                
        except Exception as e:
            self.send_json_response({'error': 'Server error'}, 500)
    
    def handle_register(self):
        """Handle registration request"""
        try:
            content_length = int(self.headers['Content-Length'])
            post_data = self.rfile.read(content_length)
            data = json.loads(post_data.decode('utf-8'))
            
            username = data.get('username')
            password = data.get('password')
            email = data.get('email')
            
            if not username or not password or not email:
                self.send_json_response({'error': 'Username, password, and email required'}, 400)
                return
            
            if len(password) < 4:
                self.send_json_response({'error': 'Password must be at least 4 characters'}, 400)
                return
            
            users = self.load_users()
            
            # Check if username already exists
            for user in users:
                if user['username'] == username:
                    self.send_json_response({'error': 'Username already exists'}, 400)
                    return
            
            # Create new user
            new_user = {
                'username': username,
                'password': password,
                'email': email,
                'created_at': datetime.now().isoformat()
            }
            
            users.append(new_user)
            self.save_users(users)
            
            self.send_json_response({
                'message': 'Registration successful',
                'username': username
            }, 201)
            
        except Exception as e:
            self.send_json_response({'error': 'Server error'}, 500)
    
    def serve_auth(self):
        try:
            with open('auth.html', 'r') as f:
                content = f.read()
            
            self.send_response(200)
            self.send_header('Content-type', 'text/html')
            self.send_cors_headers()
            self.end_headers()
            self.wfile.write(content.encode())
        except FileNotFoundError:
            self.send_error(404, 'Auth page not found')
    
    def serve_dashboard(self):
        try:
            with open('dashboard.html', 'r') as f:
                content = f.read()
            
            self.send_response(200)
            self.send_header('Content-type', 'text/html')
            self.send_cors_headers()
            self.end_headers()
            self.wfile.write(content.encode())
        except FileNotFoundError:
            self.send_error(404, 'Dashboard not found')
    
    def serve_chat(self):
        try:
            with open('chat.html', 'r') as f:
                content = f.read()
            
            self.send_response(200)
            self.send_header('Content-type', 'text/html')
            self.send_cors_headers()
            self.end_headers()
            self.wfile.write(content.encode())
        except FileNotFoundError:
            self.send_error(404, 'Chat page not found')

def run_server():
    server_address = ('0.0.0.0', 8080)
    httpd = HTTPServer(server_address, CustomerHandler)
    print('Server running at http://0.0.0.0:8080')
    httpd.serve_forever()

if __name__ == '__main__':
    run_server()