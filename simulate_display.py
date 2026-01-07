#!/usr/bin/env python3

import json

# Simulate what JavaScript should be doing
def simulate_user_display():
    # Data from APIs
    online_users = [{"username": "KidWhyLit", "accessGranted": True}]
    all_users = [
        {"username": "KidWhyLit", "email": "thomasseitz22@gmail.com", "accessGranted": True},
        {"username": "user1", "email": "user1@gmail.com", "accessGranted": True},
        {"username": "user2", "email": "user2@gmail.com", "accessGranted": False},
        {"username": "user3", "email": "user3@gmail.com", "accessGranted": False},
        {"username": "user4", "email": "user4@gmail.com", "accessGranted": False}
    ]
    
    current_user = "KidWhyLit"
    
    # Filter out current user from all users
    other_users = [user for user in all_users if user['username'] != current_user]
    
    # Check who is online
    online_usernames = {user['username'] for user in online_users}
    
    print("🎯 SIMULATING USER DISPLAY")
    print(f"Current user: {current_user}")
    print(f"Online users: {len(online_users)}")
    print(f"All other users: {len(other_users)}")
    
    print("\n📱 Online Users Section:")
    if online_users:
        for user in online_users:
            print(f"   🟢 {user['username']}")
    else:
        print("   No users online")
    
    print("\n👥 All Users Section:")
    if other_users:
        for user in other_users:
            is_online = user['username'] in online_usernames
            status = "🟢 ONLINE" if is_online else "⚫ offline"
            print(f"   {status} {user['username']}")
    else:
        print("   No users found")
    
    print(f"\n🔧 HTML that should be generated for All Users:")
    for user in other_users:
        is_online = user['username'] in online_usernames
        indicator_class = "online-indicator" if is_online else "offline-indicator"
        print(f'<div class="all-user"><div class="{indicator_class}"></div><div>{user["username"]}</div><button class="private-chat-btn">💬</button></div>')

if __name__ == "__main__":
    simulate_user_display()