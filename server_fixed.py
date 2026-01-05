#!/usr/bin/env python3
import http.server
import socketserver
import json
import os
from urllib.parse import urlparse, parse_qs
import http.cookies
import cgi
import io
import re

class CustomerListHandler(http.server.SimpleHTTPRequestHandler):
    # Class variable to track active sessions
    active_sessions = {}
    
    def __init__(self, *args, **kwargs):
        super().__init__(*args, **kwargs)
    
    def do_GET(self):
        parsed_path = urlparse(self.path)
        
        # Serve login page as default
        if parsed_path.path == '/':
            self.path = '/auth.html'
            return super().do_GET()
        # Protected routes - require authentication
        elif parsed_path.path == '/dashboard' or parsed_path.path == '/dashboard.html':
            return self.serve_protected_page('/dashboard.html')
        elif parsed_path.path == '/chat' or parsed_path.path == '/chat.html':
            return self.serve_protected_page('/chat.html')
        elif parsed_path.path == '/user-access' or parsed_path.path == '/user-access.html':
            return self.serve_protected_page('/user-access.html')
        elif parsed_path.path == '/verification' or parsed_path.path == '/verification.html':
            return self.serve_protected_page('/verification.html')
        elif parsed_path.path == '/data-directory' or parsed_path.path == '/data-directory.html':
            return self.serve_protected_page('/data-directory.html')
        elif parsed_path.path == '/analytics':
            return self.serve_protected_page('/analytics/index.html')
        elif parsed_path.path.startswith('/tests/'):
            # Protect tests directory - require authentication
            if self.is_authenticated():
                test_path = parsed_path.path[7:]  # Remove '/tests/' prefix
                self.path = f'/tests/{test_path}'
                return super().do_GET()
            else:
                self.redirect_to_login()
                return
        elif parsed_path.path.startswith('/analytics/'):
            # Protect analytics directory - require authentication
            if self.is_authenticated():
                analytics_path = parsed_path.path[11:]  # Remove '/analytics/' prefix
                if analytics_path == '':
                    self.path = '/analytics/index.html'
                else:
                    self.path = f'/analytics/{analytics_path}'
                return super().do_GET()
            else:
                self.redirect_to_login()
                return
        elif parsed_path.path == '/api/messages':
            self.handle_get_messages()
            return
        elif parsed_path.path == '/api/users':
            self.handle_get_users()
            return
        elif parsed_path.path == '/api/users/me':
            if self.is_authenticated():
                self.handle_get_current_user()
            else:
                self.send_json_response({'error': 'Authentication required'}, 401)
            return
        elif parsed_path.path == '/api/users/me':
            if self.is_authenticated():
                self.handle_get_current_user()
            else:
                self.send_json_response({'error': 'Authentication required'}, 401)
            return
        elif parsed_path.path == '/api/online-users':
            self.handle_get_online_users()
            return
        elif parsed_path.path == '/api/logout':
            if self.is_authenticated():
                self.handle_logout()
            else:
                self.send_json_response({'error': 'Authentication required'}, 401)
            return
        elif parsed_path.path == '/api/private-messages':
            if self.is_authenticated():
                self.handle_get_private_messages()
            else:
                self.send_json_response({'error': 'Authentication required'}, 401)
            return
        elif parsed_path.path == '/api/private-messages/send':
            if self.is_authenticated():
                self.handle_send_private_message()
            else:
                self.send_json_response({'error': 'Authentication required'}, 401)
            return
        elif parsed_path.path.startswith('/uploads/'):
            # Serve uploaded files - no authentication required for image display
            file_path = parsed_path.path[1:]  # Remove leading '/'
            try:
                with open(file_path, 'rb') as f:
                    content = f.read()
                
                # Determine content type
                if file_path.endswith('.jpg') or file_path.endswith('.jpeg'):
                    content_type = 'image/jpeg'
                elif file_path.endswith('.png'):
                    content_type = 'image/png'
                elif file_path.endswith('.gif'):
                    content_type = 'image/gif'
                elif file_path.endswith('.pdf'):
                    content_type = 'application/pdf'
                elif file_path.endswith('.txt'):
                    content_type = 'text/plain'
                else:
                    content_type = 'application/octet-stream'
                
                self.send_response(200)
                self.send_header('Content-type', content_type)
                self.send_cors_headers()
                self.end_headers()
                self.wfile.write(content)
            except FileNotFoundError:
                self.send_error(404, 'File not found')
            except Exception as e:
                print(f"Error serving file {file_path}: {e}")
                self.send_error(500, 'Internal server error')
        else:
            # Try to serve static files
            return super().do_GET()
    
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
        """Check if user is authenticated via session cookie"""
        cookie_header = self.headers.get('Cookie')
        print(f"Auth check - Cookie header: {cookie_header}")
        if not cookie_header:
            print("No cookie header found")
            return False
        
        # Parse cookies - look for username in any format
        import re
        
        # Try to find username in cookie string
        username_match = re.search(r'username=([^;]+)', cookie_header)
        if username_match:
            username = username_match.group(1).strip()
            print(f"Found username in cookie: {username}")
            if username:
                # Verify user exists in users list
                users = self.load_users()
                for user in users:
                    if user['username'] == username:
                        print(f"User {username} authenticated successfully")
                        return True
        
        # Also check for session cookie format
        if 'session=' in cookie_header:
            session_part = cookie_header.split('session=')[1].split(';')[0].strip()
            if 'username=' in session_part:
                username_part = session_part.split('username=')[1].strip()
                print(f"Found username in session: {username_part}")
                if username_part:
                    # Verify user exists in users list
                    users = self.load_users()
                    for user in users:
                        if user['username'] == username_part:
                            print(f"User {username_part} authenticated via session")
                            return True
        
        print("Authentication failed")
        return False
    
    def redirect_to_login(self):
        """Redirect user to login page"""
        self.send_response(302)
        self.send_header('Location', '/')
        self.end_headers()
    
    def serve_protected_page(self, page_path):
        """Serve a page only if user is authenticated"""
        if self.is_authenticated():
            try:
                with open(page_path.lstrip('/'), 'r') as f:
                    content = f.read()
                self.send_response(200)
                self.send_header('Content-type', 'text/html')
                self.end_headers()
                self.wfile.write(content.encode())
            except FileNotFoundError:
                self.send_error(404, f'Page {page_path} not found')
        else:
            self.redirect_to_login()
    
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
            
            if user_found and logged_user:
                # Update lastSeen for the logged-in user
                from datetime import datetime
                logged_user['lastSeen'] = datetime.now().isoformat()
                self.save_users(users)
                
                # Track active session
                CustomerListHandler.active_sessions[username] = datetime.now().isoformat()
                
                # Add login notification to chat
                self.add_system_message(f"{username} has logged in")
                
                access_granted = logged_user.get('accessGranted', False) if logged_user else False
                self.send_response(200)
                self.send_header('Content-type', 'application/json')
                self.send_cors_headers()
                self.send_header('Set-Cookie', f'session=username={username}; accessGranted={access_granted}; Path=/; HttpOnly')
                self.end_headers()
                self.wfile.write(json.dumps({
                    'message': 'Login successful',
                    'username': username,
                    'accessGranted': access_granted
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
            content_type = self.headers.get('Content-Type', '')
            
            print(f"handle_add_message called with content_type: {content_type}")
            
            # Check if it's a file upload
            if 'multipart/form-data' in content_type:
                # Use cgi module for reliable multipart parsing
                import cgi
                import io
                import os
                import uuid
                
                # Read all data
                content_length = int(self.headers['Content-Length'])
                post_data = self.rfile.read(content_length)
                
                # Use cgi for multipart parsing (more reliable)
                form = cgi.FieldStorage(
                    fp=io.BytesIO(post_data),
                    headers=self.headers,
                    environ={'REQUEST_METHOD': 'POST'}
                )
                
                message_data = {}
                
                # Extract form data
                if 'username' in form:
                    message_data['username'] = form.getvalue('username', '').strip()
                if 'content' in form:
                    content = form.getvalue('content', '').strip()
                    if content:  # Only include if not empty
                        message_data['content'] = content
                if 'timestamp' in form:
                    message_data['timestamp'] = form.getvalue('timestamp', '').strip()
                
                # Handle file upload if present
                if 'file' in form and form['file'].filename:
                    file_item = form['file']
                    filename = file_item.filename
                    
                    if filename:
                        # Create safe filename
                        file_ext = os.path.splitext(filename)[1]
                        safe_filename = f"{uuid.uuid4().hex}{file_ext}"
                        
                        # Ensure uploads directory exists
                        uploads_dir = 'uploads'
                        if not os.path.exists(uploads_dir):
                            os.makedirs(uploads_dir)
                        
                        # Save file
                        file_path = os.path.join(uploads_dir, safe_filename)
                        with open(file_path, 'wb') as f:
                            f.write(file_item.file.read())
                        
                        message_data['filename'] = safe_filename
                        message_data['originalname'] = filename
                        message_data['filetype'] = file_item.type or 'application/octet-stream'
                        
                        print(f"File uploaded: {filename} -> {safe_filename}")
                        print(f"File type: {file_item.type}")
                        print(f"Message data: {message_data}")
                    else:
                        print("File selected but no filename found")
                
                # Ensure required fields are present
                if 'username' not in message_data:
                    message_data['username'] = 'anonymous'
                if 'timestamp' not in message_data:
                    from datetime import datetime
                    message_data['timestamp'] = datetime.now().isoformat()
                
            else:
                # Handle regular JSON message
                content_length = int(self.headers.get('Content-Length', '0'))
                post_data = self.rfile.read(content_length)
                message_data = json.loads(post_data.decode('utf-8'))
            
            messages = self.load_messages()
            messages.append(message_data)
            self.save_messages(messages)
            
            self.send_json_response({'success': True, 'message': message_data})
            
        except Exception as e:
            print(f"Error in handle_add_message: {e}")
            import traceback
            traceback.print_exc()
            self.send_json_response({'error': str(e)}, 500)
    
    def add_system_message(self, content):
        try:
            from datetime import datetime
            messages = self.load_messages()
            system_message = {
                'username': 'SYSTEM',
                'content': content,
                'timestamp': datetime.now().isoformat()
            }
            messages.append(system_message)
            self.save_messages(messages)
        except Exception as e:
            print(f"Error adding system message: {e}")
    
    def handle_get_users(self):
        try:
            users = self.load_users()
            self.send_json_response(users)
        except Exception as e:
            self.send_json_response({'error': str(e)}, 500)
    
    def handle_get_online_users(self):
        try:
            from datetime import datetime, timedelta
            
            # Clean up old sessions (inactive for more than 2 minutes - shorter timeout)
            cutoff_time = datetime.now() - timedelta(minutes=2)
            active_usernames = []
            
            print(f"Active sessions before cleanup: {len(CustomerListHandler.active_sessions)}")
            
            for username, last_seen in CustomerListHandler.active_sessions.items():
                try:
                    last_seen_time = datetime.fromisoformat(last_seen)
                    if last_seen_time > cutoff_time:
                        active_usernames.append(username)
                    else:
                        # Remove inactive session
                        del CustomerListHandler.active_sessions[username]
                        print(f"Removed inactive session for: {username}")
                except:
                    # Remove malformed session
                    del CustomerListHandler.active_sessions[username]
                    print(f"Removed malformed session for: {username}")
            
            print(f"Active sessions after cleanup: {len(active_usernames)}")
            print(f"Active users: {active_usernames}")
            
            # Get user details for active users
            users = self.load_users()
            online_users = []
            
            for user in users:
                if user['username'] in active_usernames:
                    online_users.append({
                        'username': user['username'], 
                        'accessGranted': user.get('accessGranted', False)
                    })
            
            print(f"Returning {len(online_users)} online users")
            self.send_json_response(online_users)
        except Exception as e:
            print(f"Error in handle_get_online_users: {e}")
            import traceback
            traceback.print_exc()
            self.send_json_response({'error': str(e)}, 500)
    
    def handle_get_current_user(self):
        try:
            # Get username from cookie
            cookie_header = self.headers.get('Cookie')
            username = None
            
            if cookie_header:
                if 'username=' in cookie_header:
                    parts = cookie_header.split('username=')
                    if len(parts) > 1:
                        username_part = parts[1].split(';')[0].strip()
                        if username_part:
                            username = username_part
            
            if username:
                # Get user details
                users = self.load_users()
                for user in users:
                    if user['username'] == username:
                        self.send_json_response({
                            'username': user['username'],
                            'email': user.get('email', ''),
                            'role': user.get('role', 'user'),
                            'accessGranted': user.get('accessGranted', False),
                            'created_at': user.get('created_at', ''),
                            'lastSeen': user.get('lastSeen', '')
                        })
                        return
                
                # User not found in users list but has cookie
                self.send_json_response({'error': 'User not found'}, 404)
            else:
                self.send_json_response({'error': 'No session found'}, 401)
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
                content = f.read()
                return []
        except FileNotFoundError:
            return []
    
    def save_customers(self, customers):
        xml_content = '<?xml version="1.0" encoding="UTF-8"?>\n<customers>\n'
        for customer in customers:
            xml_content += f'  <customer>\n'
            for key, value in customer.items():
                xml_content += f'    <{key}>{value}</{key}>\n'
            xml_content += f'  </customer>\n'
        xml_content += '</customers>'
        
        with open('customers.xml', 'w') as f:
            f.write(xml_content)
    
    def handle_update_user_access(self):
        try:
            content_length = int(self.headers['Content-Length'])
            post_data = self.rfile.read(content_length)
            data = json.loads(post_data.decode('utf-8'))
            
            username = data.get('username')
            access_granted = data.get('accessGranted')
            
            users = self.load_users()
            user_found = False
            
            for user in users:
                if user['username'] == username:
                    user['accessGranted'] = access_granted
                    user_found = True
                    break
            
            if user_found:
                self.save_users(users)
                self.send_json_response({'success': True, 'message': 'Access updated successfully'})
            else:
                self.send_json_response({'error': 'User not found'}, 404)
        except Exception as e:
            self.send_json_response({'error': str(e)}, 500)
    
    def handle_register_user(self):
        try:
            content_length = int(self.headers['Content-Length'])
            post_data = self.rfile.read(content_length)
            data = json.loads(post_data.decode('utf-8'))
            
            username = data.get('username')
            email = data.get('email')
            password = data.get('password')
            
            users = self.load_users()
            
            # Check if user already exists
            for user in users:
                if user['username'] == username:
                    self.send_json_response({'error': 'Username already exists'}, 400)
                    return
            
            # Create new user
            from datetime import datetime
            new_user = {
                'username': username,
                'email': email,
                'password': password,
                'role': data.get('role', 'user'),
                'accessGranted': data.get('accessGranted', False),
                'created_at': data.get('createdAt', datetime.now().isoformat())
            }
            
            users.append(new_user)
            self.save_users(users)
            
            self.send_json_response({'success': True, 'message': 'User registered successfully'})
        except Exception as e:
            self.send_json_response({'error': str(e)}, 500)
    
    def handle_delete_user(self):
        try:
            content_length = int(self.headers['Content-Length'])
            post_data = self.rfile.read(content_length)
            data = json.loads(post_data.decode('utf-8'))
            
            username = data.get('username')
            
            users = self.load_users()
            original_length = len(users)
            
            # Remove user
            users = [user for user in users if user['username'] != username]
            
            if len(users) < original_length:
                self.save_users(users)
                self.send_json_response({'success': True, 'message': f'User "{username}" deleted successfully'})
            else:
                self.send_json_response({'error': 'User not found'}, 404)
        except Exception as e:
            self.send_json_response({'error': str(e)}, 500)
    
    def save_users(self, users):
        with open('users.json', 'w') as f:
            json.dump(users, f, indent=2)
    
    def handle_logout(self):
        try:
            # Get username from cookie for notification
            username = self.get_username_from_cookie()
            
            if username:
                # Remove from active sessions
                if username in CustomerListHandler.active_sessions:
                    del CustomerListHandler.active_sessions[username]
                    print(f"Logged out and removed session for: {username}")
                
                # Add logout notification to chat
                self.add_system_message(f"{username} has logged out")
            
            # Remove from active sessions
            if username != "Unknown user":
                CustomerListHandler.active_sessions.pop(username, None)
            
            # Add logout notification to chat
            self.add_system_message(f"{username} has logged out")
            
            # Clear the session cookie
            self.send_response(200)
            self.send_header('Content-type', 'application/json')
            self.send_cors_headers()
            self.send_header('Set-Cookie', 'session=; Path=/; HttpOnly; Max-Age=0')
            self.end_headers()
            self.wfile.write(json.dumps({'message': 'Logout successful'}).encode())
        except Exception as e:
            self.send_json_response({'error': str(e)}, 500)
    
    def handle_get_private_messages(self):
        try:
            # Get current user from cookie
            username = self.get_username_from_cookie()
            if not username:
                self.send_json_response({'error': 'Not authenticated'}, 401)
                return
            
            # Load all private messages and filter for this user (as sender OR receiver)
            private_messages = self.load_private_messages()
            user_messages = []
            
            for message_list in private_messages.values():
                for message in message_list:
                    # Include messages where current user is sender OR receiver
                    if (message.get('from_user') == username) or (message.get('to_user') == username):
                        user_messages.append(message)
            
            # Sort by timestamp
            user_messages.sort(key=lambda x: x.get('timestamp', ''))
            
            print(f"Private messages for {username}: {len(user_messages)} messages")
            self.send_json_response(user_messages)
        except Exception as e:
            print(f"Error in handle_get_private_messages: {e}")
            self.send_json_response({'error': str(e)}, 500)
    
    def handle_send_private_message(self):
        try:
            # Get current user from cookie
            from_user = self.get_username_from_cookie()
            if not from_user:
                self.send_json_response({'error': 'Not authenticated'}, 401)
                return
            
            content_type = self.headers.get('Content-Type', '')
            
            if content_type.startswith('multipart/form-data'):
                # Handle file upload in private message - simpler approach
                import cgi
                import io
                
                # Use cgi for multipart parsing (more reliable)
                form = cgi.FieldStorage(
                    fp=io.BytesIO(self.rfile.read(int(self.headers['Content-Length']))),
                    headers=self.headers,
                    environ={'REQUEST_METHOD': 'POST'}
                )
                
                # Extract form data
                to_user = form.getvalue('to_user', '').strip()
                content = form.getvalue('content', '').strip()
                timestamp = form.getvalue('timestamp', '')
                
                message_data = {
                    'from_user': from_user,
                    'to_user': to_user,
                    'content': content,
                    'timestamp': timestamp
                }
                
                # Handle file upload if present
                if 'file' in form and form['file'].filename:
                    file_item = form['file']
                    filename = file_item.filename
                    
                    if filename:
                        import os
                        import uuid
                        
                        file_ext = os.path.splitext(filename)[1]
                        safe_filename = f"{uuid.uuid4().hex}{file_ext}"
                        
                        uploads_dir = 'uploads'
                        if not os.path.exists(uploads_dir):
                            os.makedirs(uploads_dir)
                        
                        file_path = os.path.join(uploads_dir, safe_filename)
                        with open(file_path, 'wb') as f:
                            f.write(file_item.file.read())
                        
                        message_data['filename'] = safe_filename
                        message_data['originalname'] = filename
                        message_data['filetype'] = file_item.type or 'application/octet-stream'
            
            else:
                # Handle regular JSON message
                content_length = int(self.headers.get('Content-Length', '0'))
                post_data = self.rfile.read(content_length)
                message_data = json.loads(post_data.decode('utf-8'))
                message_data['from_user'] = from_user
            
            # Validate required fields
            if not message_data.get('to_user'):
                self.send_json_response({'error': 'To user is required'}, 400)
                return
            
            # Add timestamp if not present
            if 'timestamp' not in message_data or not message_data['timestamp']:
                from datetime import datetime
                message_data['timestamp'] = datetime.now().isoformat()
            
            # Save private message
            private_messages = self.load_private_messages()
            to_user = message_data['to_user']
            
            if to_user not in private_messages:
                private_messages[to_user] = []
            
            private_messages[to_user].append(message_data)
            
            # Also save to sender's sent messages
            if from_user not in private_messages:
                private_messages[from_user] = []
            
            # Mark as sent message for sender
            sender_message = message_data.copy()
            sender_message['sent'] = 'true'
            private_messages[from_user].append(sender_message)
            
            self.save_private_messages(private_messages)
            
            print(f"Private message sent: {message_data}")
            self.send_json_response({'success': True, 'message': message_data})
            
        except Exception as e:
            print(f"Error in handle_send_private_message: {e}")
            import traceback
            traceback.print_exc()
            self.send_json_response({'error': str(e)}, 500)
    
    def get_username_from_cookie(self):
        """Extract username from cookie"""
        cookie_header = self.headers.get('Cookie')
        if not cookie_header:
            return None
        
        # Look for username= followed by actual username value
        import re
        match = re.search(r'username=([^;]+)', cookie_header)
        if match:
            username = match.group(1).strip()
            if username:
                # Verify user exists in users list
                users = self.load_users()
                for user in users:
                    if user['username'] == username:
                        return username
        
        # Also check for session cookie format
        if 'session=' in cookie_header:
            session_part = cookie_header.split('session=')[1].split(';')[0].strip()
            if 'username=' in session_part:
                username_part = session_part.split('username=')[1].strip()
                if username_part:
                    # Verify user exists in users list
                    users = self.load_users()
                    for user in users:
                        if user['username'] == username_part:
                            return username_part
        
        return None
    
    def load_private_messages(self):
        """Load private messages from file"""
        try:
            import os
            if os.path.exists('private_messages.json'):
                with open('private_messages.json', 'r') as f:
                    return json.load(f)
        except:
            pass
        return {}
    
    def save_private_messages(self, messages):
        """Save private messages to file"""
        try:
            import os
            with open('private_messages.json', 'w') as f:
                json.dump(messages, f, indent=2)
        except Exception as e:
            print(f"Error saving private messages: {e}")
    
    def handle_heartbeat(self):
        try:
            # Get username from cookie first (preferred method)
            username = self.get_username_from_cookie()
            
            # If not in cookie, try to get from POST body
            if not username and self.headers.get('Content-Type') == 'application/json':
                content_length = int(self.headers['Content-Length'])
                post_data = self.rfile.read(content_length)
                data = json.loads(post_data.decode('utf-8'))
                username = data.get('username')
            
            if username:
                # Update last seen time for this session
                from datetime import datetime
                current_time = datetime.now().isoformat()
                CustomerListHandler.active_sessions[username] = current_time
                print(f"Heartbeat from {username} at {current_time}")
                print(f"Total active sessions: {len(CustomerListHandler.active_sessions)}")
                self.send_json_response({'status': 'active', 'timestamp': current_time})
            else:
                cookie_header = self.headers.get('Cookie', 'No cookie')
                print(f"Heartbeat failed - no username found. Cookie: {cookie_header}")
                self.send_json_response({'error': 'No session found'}, 401)
        except Exception as e:
            print(f"Error in handle_heartbeat: {e}")
            import traceback
            traceback.print_exc()
            self.send_json_response({'error': str(e)}, 500)
    
    def handle_scan_test_folders(self):
        """Scan test folders and find latest test results to determine pass/fail status"""
        try:
            import os
            import glob
            from datetime import datetime
            import xml.etree.ElementTree as ET
            
            # Define test folder mappings
            test_folders = {
                'BACS Symbol Coding': 'tests/mccb-001-symbol-coding',
                'Animal Naming': 'tests/mccb-002-animal_naming',
                'Trail Making': 'tests/mccb-003-trail-making',
                'CPT-IP': 'tests/mccb-004-cpt-ip',
                'WMS-III Spatial Span': 'tests/mccb-005-wms-iii-spatial-span',
                'Letter-Number Span': 'tests/mccb-006-letter-number-span',
                'HVLT-R': 'tests/mccb-007-hvlt-r',
                'BVMT-R': 'tests/mccb-008-bvmt-r',
                'NAB Mazes': 'tests/mccb-009-nab-mazes'
            }
            
            results = []
            
            for test_name, folder_path in test_folders.items():
                if not os.path.exists(folder_path):
                    continue
                
                # Find XML files in main folder first
                xml_files = glob.glob(os.path.join(folder_path, '*.xml'))
                
                # If no XML files in main folder, check data subdirectory
                if not xml_files:
                    data_path = os.path.join(folder_path, 'data')
                    if os.path.exists(data_path):
                        xml_files = glob.glob(os.path.join(data_path, '*.xml'))
                if not xml_files:
                    results.append({
                        'testType': test_name,
                        'score': 0,
                        'date': 'No data',
                        'status': 'No file found'
                    })
                    continue
                
                # Get the latest file by modification time
                latest_file = max(xml_files, key=os.path.getmtime)
                file_date = datetime.fromtimestamp(os.path.getmtime(latest_file)).strftime('%Y-%m-%d')
                
                # Parse XML to extract score
                try:
                    tree = ET.parse(latest_file)
                    root = tree.getroot()
                    
                    # Extract score based on test type
                    score = self.extract_score_from_xml(root, test_name)
                    
                    results.append({
                        'testType': test_name,
                        'score': score,
                        'date': file_date,
                        'status': 'Found data'
                    })
                    
                except Exception as e:
                    results.append({
                        'testType': test_name,
                        'score': 0,
                        'date': file_date,
                        'status': f'Parse error: {str(e)}'
                    })
            
            self.send_json_response({
                'success': True,
                'results': results,
                'message': f'Scanned {len(results)} test folders'
            })
            
        except Exception as e:
            self.send_json_response({
                'success': False,
                'error': str(e)
            }, 500)
    
    def extract_score_from_xml(self, root, test_type):
        """Extract percentage score from XML based on test type"""
        try:
            if test_type == 'BACS Symbol Coding':
                percentage_elem = root.find('.//Percentage')
                return float(percentage_elem.text) if percentage_elem is not None else 0
            
            elif test_type == 'Animal Naming':
                # Look for percentage or calculate from correct/total
                percentage_elem = root.find('.//Percentage')
                if percentage_elem is not None:
                    return float(percentage_elem.text)
                
                # Alternative: calculate from score/max
                score_elem = root.find('.//Score')
                max_elem = root.find('.//Max')
                if score_elem is not None and max_elem is not None:
                    return (float(score_elem.text) / float(max_elem.text)) * 100
                return 0
            
            elif test_type == 'Trail Making':
                percentage_elem = root.find('.//Percentage')
                return float(percentage_elem.text) if percentage_elem is not None else 0
            
            elif test_type == 'CPT-IP':
                percentage_elem = root.find('.//Percentage')
                return float(percentage_elem.text) if percentage_elem is not None else 0
            
            elif test_type == 'WMS-III Spatial Span':
                score_elem = root.find('.//Score')
                max_elem = root.find('.//Max')
                if score_elem is not None and max_elem is not None:
                    return (float(score_elem.text) / float(max_elem.text)) * 100
                return 0
            
            elif test_type == 'Letter-Number Span':
                score_elem = root.find('.//Score')
                max_elem = root.find('.//Max')
                if score_elem is not None and max_elem is not None:
                    return (float(score_elem.text) / float(max_elem.text)) * 100
                return 0
            
            elif test_type == 'HVLT-R':
                percentage_elem = root.find('.//Percentage')
                return float(percentage_elem.text) if percentage_elem is not None else 0
            
            elif test_type == 'BVMT-R':
                percentage_elem = root.find('.//Percentage')
                return float(percentage_elem.text) if percentage_elem is not None else 0
            
            elif test_type == 'NAB Mazes':
                score_elem = root.find('.//Score')
                max_elem = root.find('.//Max')
                if score_elem is not None and max_elem is not None:
                    return (float(score_elem.text) / float(max_elem.text)) * 100
                return 0
            
            return 0
            
        except Exception:
            return 0
    
    def handle_process_folder_files(self):
        """Process XML files from user-selected folder"""
        try:
            import io
            import cgi
            
            # Parse multipart form data
            content_type = self.headers.get('Content-Type', '')
            
            if not content_type.startswith('multipart/form-data'):
                self.send_json_response({'error': 'Expected multipart form data'}, 400)
                return
            
            # Extract boundary from content type
            boundary = content_type.split('boundary=')[1].encode()
            
            # Read and parse the multipart data
            content_length = int(self.headers['Content-Length'])
            data = self.rfile.read(content_length)
            
            # Simple parsing to extract files
            all_results = []
            parts = data.split(b'--' + boundary)
            
            for part in parts:
                if b'Content-Disposition: form-data' in part and b'filename=' in part:
                    # Extract filename and content
                    lines = part.split(b'\r\n')
                    filename = None
                    file_content = None
                    
                    for line in lines:
                        if b'filename=' in line:
                            # Extract filename
                            filename_part = line.split(b'filename=')[1]
                            filename = filename_part.strip(b'"').decode('utf-8')
                        elif line.strip() == b'' and file_content is None:
                            # Found empty line, content starts after this
                            content_start = lines.index(line) + 1
                            file_content = b'\r\n'.join(lines[content_start:])
                            # Remove trailing boundary markers
                            if file_content.endswith(b'\r\n'):
                                file_content = file_content[:-2]
                            break
                    
                    with open('debug.log', 'a') as f:
                        f.write(f"Final filename: {filename}\n")
                        f.write(f"Ends with .xml: {filename.endswith('.xml') if filename else 'No filename'}\n")
                    
                    if filename and filename.endswith('.xml'):
                        # Parse XML content to extract score
                        try:
                            import xml.etree.ElementTree as ET
                            # Convert bytes to string for XML parsing
                            xml_string = file_content.decode('utf-8') if file_content else ''
                            print(f"XML content length for {filename}: {len(xml_string)}")
                            
                            root = ET.fromstring(xml_string)
                            
                            # Determine test type and extract score
                            test_type = self.determine_test_type(filename, root)
                            score = self.extract_score_from_xml(root, test_type)
                            file_date = self.get_file_date(filename)
                            
                            result = {
                                'testType': test_type,
                                'score': score,
                                'date': file_date,
                                'filename': filename,
                                'status': 'Processed'
                            }
                            all_results.append(result)
                            print(f"Added result: {result}")
                            
                        except Exception as e:
                            print(f"Error parsing XML {filename}: {e}")
                            xml_string = file_content.decode('utf-8') if file_content else ''
                            preview = xml_string[:200] if xml_string else 'No content'
                            print(f"XML content preview: {preview}")
                            print(f"XML content preview: {xml_string[:200] if xml_string else 'No content'}")

            
            # Group by test type and keep only the most recent result for each
            results_by_type = {}
            
            for result in all_results:
                test_type = result['testType']
                if test_type not in results_by_type:
                    results_by_type[test_type] = []
                results_by_type[test_type].append(result)
            
            # Keep only most recent result for each test type
            final_results = []
            for test_type, results in results_by_type.items():
                if len(results) == 1:
                    final_results.append(results[0])
                else:
                    # Sort by date (most recent first) and take the first one
                    sorted_results = sorted(results, key=lambda x: (
                        x['date'],  # Primary sort by date
                        x.get('filename', '')  # Secondary sort by filename as fallback
                    ), reverse=True)
                    final_results.append(sorted_results[0])
            
            results = final_results
            
            self.send_json_response({
                'success': True,
                'results': results,
                'processed': len(results),
                'message': f'Processed {len(results)} XML files ({len(all_results)} total files, kept most recent per test type)'
            })
            
        except Exception as e:
            print(f"Exception in handle_process_folder_files: {e}")
            import traceback
            traceback.print_exc()
            self.send_json_response({
                'success': False,
                'error': str(e)
            }, 500)
    
    def determine_test_type(self, filename, root):
        """Determine test type based on filename or XML content"""
        filename_lower = filename.lower()
        
        if 'bacs' in filename_lower or 'symbol' in filename_lower:
            return 'BACS Symbol Coding'
        elif 'animal' in filename_lower:
            return 'Animal Naming'
        elif 'trail' in filename_lower:
            return 'Trail Making'
        elif 'cpt' in filename_lower:
            return 'CPT-IP'
        elif 'wms' in filename_lower or 'spatial' in filename_lower:
            return 'WMS-III Spatial Span'
        elif 'letter' in filename_lower or 'span' in filename_lower:
            return 'Letter-Number Span'
        elif 'hvlt' in filename_lower:
            return 'HVLT-R'
        elif 'bvmt' in filename_lower:
            return 'BVMT-R'
        elif 'nab' in filename_lower or 'maze' in filename_lower:
            return 'NAB Mazes'
        else:
            return 'Unknown Test'
    
    def get_file_date(self, filename):
        """Extract date from filename or use current date"""
        import re
        from datetime import datetime
        
        # Look for date patterns in filename
        date_patterns = [
            r'(\d{4}-\d{2}-\d{2})',  # YYYY-MM-DD
            r'(\d{2}-\d{2}-\d{4})',  # MM-DD-YYYY
        ]
        
        for pattern in date_patterns:
            match = re.search(pattern, filename)
            if match:
                date_str = match.group(1)
                try:
                    # Try to parse and format consistently
                    if len(date_str.split('-')[0]) == 4:  # YYYY-MM-DD
                        return date_str
                    else:  # MM-DD-YYYY, convert to YYYY-MM-DD
                        parts = date_str.split('-')
                        return f"{parts[2]}-{parts[0]:0>2}-{parts[1]:0>2}"
                except:
                    pass
        
        # Return current date if no date found
        return datetime.now().strftime('%Y-%m-%d')
    
    def do_POST(self):
        parsed_path = urlparse(self.path)
        
        if parsed_path.path == '/api/login':
            self.handle_login()
            return
        elif parsed_path.path == '/api/register':
            self.handle_register_user()
            return
        # Protected endpoints - require authentication
        elif parsed_path.path == '/api/messages':
            if self.is_authenticated():
                self.handle_add_message()
            else:
                self.send_json_response({'error': 'Authentication required'}, 401)
            return
        elif parsed_path.path == '/api/customers':
            if self.is_authenticated():
                self.handle_add_customer()
            else:
                self.send_json_response({'error': 'Authentication required'}, 401)
            return
        elif parsed_path.path == '/api/users/access':
            if self.is_authenticated():
                self.handle_update_user_access()
            else:
                self.send_json_response({'error': 'Authentication required'}, 401)
            return
        elif parsed_path.path == '/api/users/update-access':
            if self.is_authenticated():
                self.handle_update_user_access()
            else:
                self.send_json_response({'error': 'Authentication required'}, 401)
            return
        elif parsed_path.path == '/api/users/register':
            if self.is_authenticated():
                self.handle_register_user()
            else:
                self.send_json_response({'error': 'Authentication required'}, 401)
            return
        elif parsed_path.path == '/api/users/delete':
            if self.is_authenticated():
                self.handle_delete_user()
            else:
                self.send_json_response({'error': 'Authentication required'}, 401)
            return
        elif parsed_path.path == '/api/logout':
            self.handle_logout()
            return
        elif parsed_path.path == '/api/heartbeat':
            self.handle_heartbeat()
            return
        elif parsed_path.path == '/api/private-messages':
            if self.is_authenticated():
                self.handle_get_private_messages()
            else:
                self.send_json_response({'error': 'Authentication required'}, 401)
            return
        elif parsed_path.path == '/api/private-messages/send':
            if self.is_authenticated():
                self.handle_send_private_message()
            else:
                self.send_json_response({'error': 'Authentication required'}, 401)
            return
        elif parsed_path.path == '/api/scan-test-folders':
            if self.is_authenticated():
                self.handle_scan_test_folders()
            else:
                self.send_json_response({'error': 'Authentication required'}, 401)
            return
        elif parsed_path.path == '/api/process-folder-files':
            with open('debug.log', 'a') as f:
                f.write(f"Received POST to /api/process-folder-files\n")
            if self.is_authenticated():
                with open('debug.log', 'a') as f:
                    f.write("Authentication successful\n")
                self.handle_process_folder_files()
            else:
                with open('debug.log', 'a') as f:
                    f.write("Authentication failed\n")
                self.send_json_response({'error': 'Authentication required'}, 401)
            return
        else:
            self.send_response(404)
            self.send_header('Content-type', 'application/json')
            self.end_headers()
            self.wfile.write(json.dumps({'error': 'Endpoint not found'}).encode())
    
    def do_OPTIONS(self):
        self.send_response(200)
        self.send_cors_headers()
        self.end_headers()

if __name__ == '__main__':
    import os
    import socket
    
    # Use PORT from environment variable (Render) or default to 8004
    PORT = int(os.environ.get('PORT', 3000))
    Handler = CustomerListHandler
    
    # Get local IP address
    hostname = socket.gethostname()
    local_ip = socket.gethostbyname(hostname)
    
    with socketserver.TCPServer(("", PORT), Handler) as httpd:
        print(f"Server running on port {PORT}")
        print(f"Local access: http://localhost:{PORT}")
        print(f"Network access: http://{local_ip}:{PORT}")
        print(f"Login page: http://localhost:{PORT}/ or http://{local_ip}:{PORT}/")
        httpd.serve_forever()