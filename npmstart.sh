#!/bin/bash

# Kill any existing Node.js and cloudflared processes
pkill -f "node server.js" || true
pkill -f "cloudflared tunnel" || true

# Start the Node.js server in the background
echo "Starting Nebula Racers server on port 1010..."
npm start &
NODE_PID=$!

# Wait for the server to start
sleep 3

# Start Cloudflare tunnel
echo "Starting Cloudflare tunnel..."
echo "When the tunnel URL appears, copy it and update the GitHub Pages site manually."
cloudflared tunnel --url http://localhost:1010

# This script will terminate when cloudflared is stopped.
# The trap below ensures we clean up the Node.js server when this happens.
trap "pkill -P $$; exit" INT TERM EXIT 