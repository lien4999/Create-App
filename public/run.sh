#!/bin/bash
cd "/home/gg/Desktop/Create App" || exit 1

echo "======================================================"
echo "🚀 جاري تشغيل منصة Create App على http://localhost:3000"
echo "======================================================"

# Kill any existing process on port 3000
fuser -k 3000/tcp >/dev/null 2>&1 || true

# Open browser after 1.5 seconds
(sleep 1.5 && xdg-open "http://localhost:3000" >/dev/null 2>&1) &

# Start the server
node server/server.js

