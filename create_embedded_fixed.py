#!/usr/bin/env python3

import json

# Create simple embedded data HTML
html_content = """<!DOCTYPE html>
<html>
<head>
    <title>Chat with Embedded Data</title>
    <style>
        body { font-family: monospace; background: #000; color: #00ff00; padding: 20px; }
        .section { margin: 20px 0; padding: 20px; background: rgba(0, 50, 0, 0.5); }
        .user { margin: 10px 0; padding: 10px; background: rgba(0, 30, 0, 0.5); }
        .online { color: #00ff00; }
        .offline { color: #888; }
        .online-indicator { width: 8px; height: 8px; background: #00ff00; border-radius: 50%; display: inline-block; margin-right: 10px; }
        .offline-indicator { width: 8px; height: 8px; background: #888; border-radius: 50%; display: inline-block; margin-right: 10px; }
        h2 { color: #00ffff; }
    </style>
</head>
<body>
    <h1>🚀 Chat with Embedded User Data (No API Calls)</h1>
    
    <div class="section">
        <h2>📱 ONLINE USERS (1)</h2>
        <div class="users">
            <div class="user"><span class="online-indicator"></span>🟢 KidWhyLit</div>
        </div>
    </div>
    
    <div class="section">
        <h2>👥 ALL USERS (4)</h2>
        <div class="users">
            <div class="user"><span class="offline-indicator"></span>⚫ user1</div>
            <div class="user"><span class="offline-indicator"></span>⚫ user2</div>
            <div class="user"><span class="offline-indicator"></span>⚫ user3</div>
            <div class="user"><span class="offline-indicator"></span>⚫ user4</div>
        </div>
    </div>
    
    <div class="section">
        <h2>🔧 DEBUG INFO</h2>
        <div>
            <p>✅ Current user: KidWhyLit</p>
            <p>✅ Online users: 1 - KidWhyLit</p>
            <p>✅ All other users: 4 - user1, user2, user3, user4</p>
            <p>🎯 This bypasses all API/network issues by embedding data directly in HTML</p>
            <p>📊 If this works, the issue was browser blocking fetch() calls</p>
            <p>🚀 Next step: Update real chat.html to work without fetch() calls</p>
        </div>
    </div>
</body>
</html>"""

# Write to file
with open('chat_embedded.html', 'w', encoding='utf-8') as f:
    f.write(html_content)

print("✅ Created chat_embedded.html")
print("📊 This page has user data embedded directly")  
print("🎯 Test this file: http://localhost:3000/chat_embedded.html")
print("🔍 If this works, issue was browser blocking API calls")