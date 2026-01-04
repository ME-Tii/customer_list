#!/usr/bin/env python3
import os
import json
import glob
import shutil
from http.server import HTTPServer, BaseHTTPRequestHandler
from urllib.parse import urlparse, parse_qs
import sys

class DataHandler(BaseHTTPRequestHandler):
    def do_OPTIONS(self):
        self.send_response(200)
        self.send_header('Access-Control-Allow-Origin', '*')
        self.send_header('Access-Control-Allow-Methods', 'GET, POST, OPTIONS')
        self.send_header('Access-Control-Allow-Headers', 'Content-Type')
        self.end_headers()
    
    def do_POST(self):
        content_length = int(self.headers['Content-Length'])
        post_data = self.rfile.read(content_length)
        
        self.send_response(200)
        self.send_header('Access-Control-Allow-Origin', '*')
        self.send_header('Content-Type', 'application/json')
        self.end_headers()
        
        if self.path == '/clear-data-folders':
            response = self.clear_data_folders()
        elif self.path == '/save-data':
            response = self.save_data_with_user(post_data)
        elif self.path == '/save-merged-xml':
            response = self.save_merged_xml(post_data)
        elif self.path == '/scan-test-folders':
            response = self.scan_test_folders()
        else:
            response = {'success': False, 'error': 'Unknown endpoint'}
        
        self.wfile.write(json.dumps(response).encode())
    
    def save_data_with_user(self, post_data):
        try:
            data = json.loads(post_data.decode('utf-8'))
            current_dir = os.path.dirname(os.path.abspath(__file__))
            detected_data_path = os.path.join(current_dir, 'detected_data.json')
            
            # Add user information to each test record
            user_name = data.get('userName', 'Anonymous')
            for test in data.get('testData', []):
                test['userName'] = user_name
            
            # Save to detected_data.json
            with open(detected_data_path, 'w') as f:
                json.dump(data.get('testData', []), f, indent=2)
            
            return {
                'success': True,
                'message': f'Data saved for user: {user_name}',
                'user': user_name,
                'testCount': len(data.get('testData', []))
            }
        except Exception as e:
            return {
                'success': False,
                'error': str(e)
            }
    
    def save_merged_xml(self, post_data):
        try:
            data = json.loads(post_data.decode('utf-8'))
            xml_content = data.get('xmlContent', '')
            file_name = data.get('fileName', 'merged_results.xml')
            
            # Get paths
            current_dir = os.path.dirname(os.path.abspath(__file__))
            parent_dir = os.path.dirname(current_dir)
            merged_tests_dir = os.path.join(parent_dir, 'merged_tests')
            
            # Ensure merged_tests directory exists
            os.makedirs(merged_tests_dir, exist_ok=True)
            
            # Save the merged XML file
            file_path = os.path.join(merged_tests_dir, file_name)
            with open(file_path, 'w', encoding='utf-8') as f:
                f.write(xml_content)
            
            return {
                'success': True,
                'message': f'Merged XML file saved: {file_name}',
                'filePath': file_path,
                'fileName': file_name
            }
        except Exception as e:
            return {
                'success': False,
                'error': str(e)
            }
    
    def scan_test_folders(self):
        try:
            # Get current directory and look for test data folders
            current_dir = os.path.dirname(os.path.abspath(__file__))
            parent_dir = os.path.dirname(current_dir)
            
            # Define test folder patterns (only local test data folders)
            test_folder_patterns = [
                os.path.join(parent_dir, '1.cpt_ip', '*.xml'),
                os.path.join(parent_dir, '2.hvlt_r', '*.xml'),
                os.path.join(parent_dir, '3.bvmt_r', '*.xml'),
                os.path.join(parent_dir, '4.animal_naming', '*.xml'),
                os.path.join(parent_dir, '5.trail_making', '*.xml'),
                os.path.join(parent_dir, '6.letter_number_span', '*.xml'),
                os.path.join(parent_dir, '7.wms_iii_spatial_span', '*.xml'),
                os.path.join(parent_dir, '8.nab_mazes', '*.xml')
            ]
            
            latest_files = {}
            folder_info = {}
            
            # Scan each test folder and find the latest file
            for pattern in test_folder_patterns:
                folder_files = []
                for file_path in glob.glob(pattern):
                    if os.path.isfile(file_path):
                        folder_files.append(file_path)
                
                # Get the latest file for this folder
                if folder_files:
                    latest_file = max(folder_files, key=os.path.getmtime)
                    folder_name = os.path.basename(os.path.dirname(latest_file))
                    latest_files[folder_name] = {
                        'path': latest_file,
                        'name': os.path.basename(latest_file),
                        'modified': os.path.getmtime(latest_file)
                    }
                    folder_info[folder_name] = [os.path.basename(latest_file)]
            
            return {
                'success': True,
                'message': f'Found latest XML file from {len(latest_files)} test data folders',
                'totalFiles': len(latest_files),
                'folders': folder_info,
                'latestFiles': latest_files,
                'files': [info['name'] for info in latest_files.values()]
            }
        except Exception as e:
            return {
                'success': False,
                'error': str(e)
            }
    
    def clear_data_folders(self):
        try:
            # Get current directory and look for data folders
            current_dir = os.path.dirname(os.path.abspath(__file__))
            parent_dir = os.path.dirname(current_dir)
            
            # Common data folder patterns
            data_patterns = [
                os.path.join(parent_dir, '*', '*.xml'),
                os.path.join(parent_dir, '*', '*', '*.xml'),
                os.path.join(current_dir, '*.xml'),
                os.path.join(current_dir, 'detected_data.json')
            ]
            
            deleted_files = []
            deleted_folders = []
            
            # Clear XML files from all subdirectories
            for pattern in data_patterns:
                for file_path in glob.glob(pattern):
                    try:
                        if os.path.isfile(file_path):
                            os.remove(file_path)
                            deleted_files.append(file_path)
                    except Exception as e:
                        print(f"Error deleting {file_path}: {e}")
            
            # Clear detected_data.json
            detected_data_path = os.path.join(current_dir, 'detected_data.json')
            if os.path.exists(detected_data_path):
                try:
                    os.remove(detected_data_path)
                    deleted_files.append(detected_data_path)
                except Exception as e:
                    print(f"Error deleting {detected_data_path}: {e}")
            
            # Look for and clear common test data folders
            for item in os.listdir(parent_dir):
                item_path = os.path.join(parent_dir, item)
                if os.path.isdir(item_path) and any(x in item.lower() for x in ['test', 'data', 'bacs', 'animal', 'trail', 'cpt', 'wms']):
                    try:
                        # Clear XML files from this directory
                        xml_files = glob.glob(os.path.join(item_path, '*.xml'))
                        for xml_file in xml_files:
                            os.remove(xml_file)
                            deleted_files.append(xml_file)
                        
                        # If directory is now empty, remove it
                        if not os.listdir(item_path):
                            shutil.rmtree(item_path)
                            deleted_folders.append(item_path)
                    except Exception as e:
                        print(f"Error clearing folder {item_path}: {e}")
            
            return {
                'success': True,
                'message': f'Successfully deleted {len(deleted_files)} files and {len(deleted_folders)} folders',
                'deleted_files': deleted_files,
                'deleted_folders': deleted_folders
            }
            
        except Exception as e:
            return {
                'success': False,
                'error': str(e)
            }
    
    def log_message(self, format, *args):
        # Suppress default logging
        pass

def run_server():
    port = 8001
    server_address = ('', port)
    httpd = HTTPServer(server_address, DataHandler)
    print(f"Backend server running on port {port}")
    print("Data clearing service available at http://localhost:8001")
    httpd.serve_forever()

if __name__ == '__main__':
    try:
        run_server()
    except KeyboardInterrupt:
        print("\nServer stopped")
        sys.exit(0)
