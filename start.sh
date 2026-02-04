#!/bin/bash
set -e

echo "🚀 Starting Relationship Intel..."

# Check if API dependencies installed
if [ ! -d "api/node_modules" ]; then
  echo "Installing API dependencies..."
  cd api && npm install && cd ..
fi

# Run initial sync if database doesn't exist
if [ ! -f "data/relationship-intel.db" ]; then
  echo "📧 Running initial email sync..."
  cd api && node sync-emails.js && cd ..
fi

# Start API server
echo "🌐 Starting API server on port 3001..."
cd api && node server.js &
API_PID=$!

echo "✅ Relationship Intel running!"
echo "   API: http://localhost:3001"
echo "   Web: Open web-simple/index.html in browser"
echo ""
echo "   PID: $API_PID"
echo "   To stop: kill $API_PID"

# Keep script running
wait $API_PID
