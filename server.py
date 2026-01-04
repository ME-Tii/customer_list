#!/usr/bin/env python3
from http.server import HTTPServer, BaseHTTPRequestHandler
from urllib.parse import urlparse, parse_qs
import json
import os
import xml.etree.ElementTree as ET
from datetime import datetime
import threading
import time

class CustomerHandler(BaseHTTPRequestHandler):
    def do_GET(self):
        parsed_path = urlparse(self.path)
        
        # Add CORS headers to all responses
        def send_cors_headers():
            self.send_header('Access-Control-Allow-Origin', '*')
            self.send_header('Access-Control-Allow-Methods', 'GET, POST, OPTIONS')
            self.send_header('Access-Control-Allow-Headers', 'Content-Type')
        
        if parsed_path.path == '/':
            self.serve_auth()
        elif parsed_path.path == '/dashboard':
            if self.is_authenticated():
                if self.has_access_granted():
                    user_info = self.get_user_from_cookie()
                    if user_info:
                        self.log_user_login(user_info.get('username', 'unknown'))
                    self.serve_dashboard()
                else:
                    self.send_response(302)
                    self.send_header('Location', '/verification')
                    self.end_headers()
            else:
                self.send_response(302)
                self.send_header('Location', '/')
                self.end_headers()
        elif parsed_path.path == '/user-access':
            if self.is_authenticated():
                self.serve_user_access()
            else:
                self.send_response(302)
                self.send_header('Location', '/')
                self.end_headers()
        elif parsed_path.path == '/verification':
            if self.is_authenticated():
                self.serve_verification()
            else:
                self.send_response(302)
                self.send_header('Location', '/')
                self.end_headers()
        elif parsed_path.path == '/chat':
            if self.is_authenticated():
                user_info = self.get_user_from_cookie()
                if user_info:
                    self.log_user_login(user_info.get('username', 'unknown'))
                self.serve_chat()
            else:
                self.send_response(302)
                self.send_header('Location', '/')
                self.end_headers()
        elif parsed_path.path == '/api/logout':
            if self.is_authenticated():
                user_info = self.get_user_from_cookie()
                if user_info:
                    self.log_user_logout(user_info.get('username', 'unknown'))
                self.send_response(200)
                self.send_header('Content-type', 'application/json')
                self.send_header('Access-Control-Allow-Origin', '*')
                self.send_header('Access-Control-Allow-Methods', 'GET, POST, OPTIONS')
                self.send_header('Access-Control-Allow-Headers', 'Content-Type')
                self.end_headers()
                self.wfile.write(json.dumps({'message': 'Logged out successfully'}).encode())
            else:
                self.send_json_response({'error': 'Not logged in'}, 401)
        elif parsed_path.path == '/api/messages':
            if self.is_authenticated():
                # Handle in do_GET and do_POST instead
                pass
            else:
                self.send_json_response({'error': 'Authentication required'}, 401)
        elif parsed_path.path == '/api/messages':
            if self.is_authenticated():
                self.get_messages()
            else:
                self.send_json_response({'error': 'Authentication required'}, 401)
        elif parsed_path.path == '/api/online-users':
            if self.is_authenticated():
                self.get_online_users()
            else:
                self.send_json_response({'error': 'Authentication required'}, 401)
            if self.is_authenticated():
                self.get_online_users()
            else:
                self.send_json_response({'error': 'Authentication required'}, 401)
        elif parsed_path.path == '/api/messages':
            if self.is_authenticated():
                self.get_messages()
            else:
                self.send_json_response({'error': 'Authentication required'}, 401)
        elif parsed_path.path == '/api/users':
            if self.is_authenticated():
                self.get_users()
            else:
                self.send_json_response({'error': 'Authentication required'}, 401)
        elif parsed_path.path == '/api/users/me':
            if self.is_authenticated():
                self.get_current_user()
            else:
                self.send_json_response({'error': 'Authentication required'}, 401)
        elif parsed_path.path == '/api/customers':
            if self.is_authenticated():
                self.get_customers()
            else:
                self.send_json_response({'error': 'Authentication required'}, 401)
        elif parsed_path.path == '/customers.xml':
            if self.is_authenticated():
                self.serve_xml()
            else:
                self.send_response(302)
                self.send_header('Location', '/')
                self.end_headers()
        else:
            self.send_error(404)
    
    def do_POST(self):
        parsed_path = urlparse(self.path)
        
        if parsed_path.path == '/api/login':
            self.handle_login()
        elif parsed_path.path == '/api/register':
            self.handle_register()
        elif parsed_path.path == '/api/users/access':
            self.update_user_access()
        elif parsed_path.path.startswith('/api/users/delete'):
            self.delete_user()
elif parsed_path.path == '/api/messages':
            # Temporarily skip auth check for GET to debug
            if self.command == 'GET' or self.is_authenticated():
                self.get_messages()
            else:
                self.send_json_response({'error': 'Authentication required'}, 401)
        elif parsed_path.path == '/api/customers':
            if self.is_authenticated():
                self.add_customer()
            else:
                self.send_json_response({'error': 'Authentication required'}, 401)
        else:
            self.send_error(404)
    
    def do_OPTIONS(self):
        # Handle preflight CORS requests
        self.send_response(200)
        self.send_header('Access-Control-Allow-Origin', '*')
        self.send_header('Access-Control-Allow-Methods', 'GET, POST, OPTIONS')
        self.send_header('Access-Control-Allow-Headers', 'Content-Type')
        self.end_headers()
    
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
            # Parse "username=test; accessGranted=false"
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
        username = user_info.get('username')
        if not username:
            return False
            
        users = self.load_users()
        for user in users:
            if user['username'] == username:
                return user.get('accessGranted', False)
        
        return False
    
    def send_json_response(self, data, status_code=200):
        self.send_response(status_code)
        self.send_header('Content-type', 'application/json')
        self.send_header('Access-Control-Allow-Origin', '*')
        self.send_header('Access-Control-Allow-Methods', 'GET, POST, OPTIONS')
        self.send_header('Access-Control-Allow-Headers', 'Content-Type')
        self.end_headers()
        self.wfile.write(json.dumps(data).encode())
    
    def serve_auth(self):
        try:
            with open('auth.html', 'r') as f:
                content = f.read()
            
            self.send_response(200)
            self.send_header('Content-type', 'text/html')
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
            self.end_headers()
            self.wfile.write(content.encode())
        except FileNotFoundError:
            self.send_error(404, 'Dashboard not found')
    
    def serve_user_access(self):
        try:
            with open('user-access.html', 'r') as f:
                content = f.read()
            
            self.send_response(200)
            self.send_header('Content-type', 'text/html')
            self.end_headers()
            self.wfile.write(content.encode())
        except FileNotFoundError:
            self.send_error(404, 'User access page not found')
    
    def serve_verification(self):
        try:
            with open('verification.html', 'r') as f:
                content = f.read()
            
            self.send_response(200)
            self.send_header('Content-type', 'text/html')
            self.end_headers()
            self.wfile.write(content.encode())
        except FileNotFoundError:
            self.send_error(404, 'Verification page not found')
    
    def log_user_login(self, username):
        """Log when user accesses a page"""
        self.log_activity(username, 'login')
    
    def log_user_logout(self, username):
        """Log when user logs out"""
        self.log_activity(username, 'logout')
    
    def serve_chat(self):
        try:
            with open('chat.html', 'r') as f:
                content = f.read()
            
            self.send_response(200)
            self.send_header('Content-type', 'text/html')
            self.end_headers()
            self.wfile.write(content.encode())
        except FileNotFoundError:
            self.send_error(404, 'Chat page not found')
    
    def handle_login(self):
        try:
            content_length = int(self.headers['Content-Length'])
            post_data = self.rfile.read(content_length)
            data = json.loads(post_data.decode('utf-8'))
            
            username = data.get('username')
            password = data.get('password')
            
            # Simple hardcoded users for testing
            users = self.load_users()
            
            user_data = None
            for user in users:
                if user['username'] == username and user['password'] == password:
                    user_data = user
                    break
            
            if user_data:
                # Set cookie with username and accessGranted status
                cookie_value = f"username={username}; accessGranted={user_data.get('accessGranted', False)}"
                self.send_response(200)
                self.send_header('Content-type', 'application/json')
                self.send_header('Access-Control-Allow-Origin', '*')
                self.send_header('Access-Control-Allow-Methods', 'GET, POST, OPTIONS')
                self.send_header('Access-Control-Allow-Headers', 'Content-Type')
                self.send_header('Set-Cookie', f'session={cookie_value}; Path=/; HttpOnly')
                self.end_headers()
                self.wfile.write(json.dumps({
                    'message': 'Login successful',
                    'username': username,
                    'accessGranted': user_data.get('accessGranted', False)
                }).encode())
            else:
                self.send_json_response({'error': 'Invalid username or password'}, 401)
                
        except Exception as e:
            self.send_json_response({'error': 'Server error'}, 500)
    
    def handle_register(self):
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
            
            # Add new user
            new_user = {
                'username': username,
                'password': password,  # Plain text for simplicity (use hashing in production)
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
    
    def update_user_access(self):
        try:
            content_length = int(self.headers['Content-Length'])
            post_data = self.rfile.read(content_length)
            data = json.loads(post_data.decode('utf-8'))
            
            username = data.get('username')
            access_granted = data.get('accessGranted')
            
            if not username:
                self.send_json_response({'error': 'Username required'}, 400)
                return
            
            users = self.load_users()
            
            for user in users:
                if user['username'] == username:
                    user['accessGranted'] = access_granted
                    user['lastSeen'] = datetime.now().isoformat()
                    self.save_users(users)
                    self.send_json_response({
                        'message': f'Access {"granted" if access_granted else "revoked"} for {username}'
                    })
                    return
            
            self.send_json_response({'error': 'User not found'}, 404)
            
        except Exception as e:
            self.send_json_response({'error': 'Server error'}, 500)
    
    def delete_user(self):
        try:
            content_length = int(self.headers['Content-Length'])
            post_data = self.rfile.read(content_length)
            data = json.loads(post_data.decode('utf-8'))
            
            username = data.get('username')
            
            if not username:
                self.send_json_response({'error': 'Username required'}, 400)
                return
            
            users = self.load_users()
            original_count = len(users)
            users = [user for user in users if user['username'] != username]
            
            if len(users) < original_count:
                self.save_users(users)
                self.send_json_response({'message': f'User {username} deleted successfully'})
            else:
                self.send_json_response({'error': 'User not found'}, 404)
            
        except Exception as e:
            self.send_json_response({'error': 'Server error'}, 500)
    
    def load_users(self):
        """Load users from file"""
        if not os.path.exists('users.json'):
            # Create default users
            default_users = [
                {'username': 'admin', 'password': 'admin123', 'email': 'admin@test.com', 'created_at': '2024-01-01'},
                {'username': 'test', 'password': 'test123', 'email': 'test@test.com', 'created_at': '2024-01-01'}
            ]
            self.save_users(default_users)
            return default_users
        
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
    
    def load_activity_log(self):
        """Load user activity log"""
        if not os.path.exists('activity.json'):
            return []
        
        try:
            with open('activity.json', 'r') as f:
                return json.load(f)
        except:
            return []
    
    def save_activity_log(self, activities):
        """Save user activity log"""
        with open('activity.json', 'w') as f:
            json.dump(activities, f, indent=2)
    
    def log_activity(self, username, action):
        """Log user login/logout activity"""
        activities = self.load_activity_log()
        
        activity = {
            'username': username,
            'action': action,  # 'login' or 'logout'
            'timestamp': datetime.now().isoformat()
        }
        
        activities.append(activity)
        
        # Keep only last 100 activities
        if len(activities) > 100:
            activities = activities[-100:]
        
        self.save_activity_log(activities)
    
    def save_messages(self, messages):
        """Save messages to file"""
        with open('messages.json', 'w') as f:
            json.dump(messages, f, indent=2)
    
    def get_messages(self):
        """Get all chat messages"""
        try:
            messages = self.load_messages()
            self.send_json_response(messages)
        except Exception as e:
            print(f"Error in get_messages: {e}")
            self.send_json_response({'error': f'Server error: {str(e)}'}, 500)
    
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
            
            # Add new message (keep last 100 messages)
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
    
    def get_online_users(self):
        """Get list of currently online users (based on recent logins)"""
        activities = self.load_activity_log()
        
        # Get users who logged in recently and haven't logged out
        ten_minutes_ago = datetime.now().timestamp() - 600
        online_users = set()
        
        # Process activities in reverse order (newest first)
        for activity in reversed(activities):
            try:
                activity_time = datetime.fromisoformat(activity['timestamp'].replace('Z', '+00:00')).timestamp()
                if activity_time < ten_minutes_ago:
                    continue  # Too old, skip
                    
                if activity['action'] == 'login':
                    online_users.add(activity['username'])
                elif activity['action'] == 'logout' and activity['username'] in online_users:
                    online_users.remove(activity['username'])
            except:
                continue
        
        online_list = [{'username': user} for user in online_users]
        self.send_json_response(online_list)
    
    def get_users(self):
        users = self.load_users()
        self.send_json_response(users)
    
    def get_current_user(self):
        # Get current user from cookie
        user_info = self.get_user_from_cookie()
        if not user_info:
            self.send_json_response({'error': 'No session found'}, 401)
            return
        
        # Find user in database
        users = self.load_users()
        username = user_info.get('username')
        
        for user in users:
            if user['username'] == username:
                self.send_json_response(user)
                return
        
        self.send_json_response({'error': 'User not found'}, 404)
    
    def get_customers(self):
        customers = self.parse_xml_customers()
        self.send_json_response(customers)
    
    def serve_xml(self):
        if not os.path.exists('customers.xml'):
            self.create_empty_xml()
        
        with open('customers.xml', 'r') as f:
            content = f.read()
        
        self.send_response(200)
        self.send_header('Content-type', 'application/xml')
        self.end_headers()
        self.wfile.write(content.encode())
    
    def create_empty_xml(self):
        root = ET.Element('customers')
        tree = ET.ElementTree(root)
        tree.write('customers.xml', encoding='utf-8', xml_declaration=True)
    
    def parse_xml_customers(self):
        if not os.path.exists('customers.xml'):
            return []
        
        tree = ET.parse('customers.xml')
        root = tree.getroot()
        
        customers = []
        for customer_elem in root.findall('customer'):
            id_elem = customer_elem.find('id')
            name_elem = customer_elem.find('name')
            surname_elem = customer_elem.find('surname')
            email_elem = customer_elem.find('email')
            newsletter_elem = customer_elem.find('newsletter')
            timestamp_elem = customer_elem.find('timestamp')
            
            customer = {
                'id': int(id_elem.text) if id_elem is not None and id_elem.text else 0,
                'name': name_elem.text if name_elem is not None and name_elem.text else '',
                'surname': surname_elem.text if surname_elem is not None and surname_elem.text else '',
                'email': email_elem.text if email_elem is not None and email_elem.text else '',
                'newsletter': (newsletter_elem.text or 'false').lower() == 'true' if newsletter_elem is not None else False,
                'timestamp': timestamp_elem.text if timestamp_elem is not None and timestamp_elem.text else ''
            }
            customers.append(customer)
        
        return customers
    
    def add_customer(self):
        try:
            content_length = int(self.headers['Content-Length'])
            post_data = self.rfile.read(content_length)
            data = json.loads(post_data.decode('utf-8'))
            
            # Validate required fields
            if not data.get('name') or not data.get('surname') or not data.get('email'):
                self.send_json_response({'error': 'Name, surname, and email are required'}, 400)
                return
            
            # Add customer to XML
            customer = self.add_customer_to_xml(data)
            
            self.send_json_response({
                'message': 'Customer registered successfully',
                'customer': customer
            }, 201)
            
        except json.JSONDecodeError:
            self.send_json_response({'error': 'Invalid JSON'}, 400)
        except Exception as e:
            self.send_json_response({'error': 'Server error'}, 500)
    
    def add_customer_to_xml(self, data):
        # Load existing XML or create new
        if os.path.exists('customers.xml'):
            tree = ET.parse('customers.xml')
            root = tree.getroot()
        else:
            root = ET.Element('customers')
            tree = ET.ElementTree(root)
        
        # Get next ID
        customers = self.parse_xml_customers()
        next_id = max([c['id'] for c in customers], default=0) + 1
        
        # Create customer element
        customer_elem = ET.SubElement(root, 'customer')
        
        id_elem = ET.SubElement(customer_elem, 'id')
        id_elem.text = str(next_id)
        
        name_elem = ET.SubElement(customer_elem, 'name')
        name_elem.text = data['name']
        
        surname_elem = ET.SubElement(customer_elem, 'surname')
        surname_elem.text = data['surname']
        
        email_elem = ET.SubElement(customer_elem, 'email')
        email_elem.text = data['email']
        
        newsletter_elem = ET.SubElement(customer_elem, 'newsletter')
        newsletter_elem.text = str(data.get('newsletter', False)).lower()
        
        timestamp_elem = ET.SubElement(customer_elem, 'timestamp')
        timestamp_elem.text = datetime.now().isoformat()
        
        # Save XML
        tree.write('customers.xml', encoding='utf-8', xml_declaration=True)
        
        return {
            'id': next_id,
            'name': data['name'],
            'surname': data['surname'],
            'email': data['email'],
            'newsletter': data.get('newsletter', False),
            'timestamp': timestamp_elem.text
        }

def run_server():
    server_address = ('0.0.0.0', 8080)
    httpd = HTTPServer(server_address, CustomerHandler)
    print('Server running at http://0.0.0.0:8080')
    print('Login: http://100.115.92.206:8080/')
    print('Dashboard: http://100.115.92.206:8080/dashboard')
    print('User Access: http://100.115.92.206:8080/user-access')
    print('Chat: http://100.115.92.206:8080/chat')
    print('Verification: http://100.115.92.206:8080/verification')
    print('API endpoint: http://100.115.92.206:8080/api/customers')
    print('XML file: http://100.115.92.206:8080/customers.xml')
    httpd.serve_forever()

if __name__ == '__main__':
    run_server()