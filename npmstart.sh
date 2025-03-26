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

# Create a temporary file to store the tunnel output
TUNNEL_LOG=$(mktemp)

# Start Cloudflare tunnel and capture output to the temp file
echo "Starting Cloudflare tunnel..."
cloudflared tunnel --url http://localhost:1010 > "$TUNNEL_LOG" 2>&1 &
CLOUDFLARED_PID=$!

# Wait for the tunnel URL to be generated
echo "Waiting for tunnel URL to be generated..."
sleep 10

# Try to extract the tunnel URL with multiple approaches
function extract_tunnel_url {
    # Try different patterns to extract the URL
    URL=$(grep -o 'https://[a-zA-Z0-9-]*\.trycloudflare\.com' "$TUNNEL_LOG" | head -1)
    
    if [ -z "$URL" ]; then
        URL=$(grep -o "https://.*\.trycloudflare\.com" "$TUNNEL_LOG" | head -1 | tr -d ' ')
    fi
    
    if [ -z "$URL" ]; then
        URL=$(cat "$TUNNEL_LOG" | grep -A1 "Your quick Tunnel has been created" | grep "https://" | tr -d ' ' | tr -d '|')
    fi
    
    echo "$URL"
}

# Extract the tunnel URL
TUNNEL_URL=$(extract_tunnel_url)

if [ -z "$TUNNEL_URL" ]; then
    echo "Failed to extract tunnel URL. Printing log file content:"
    cat "$TUNNEL_LOG"
    echo "Please check the output above for the tunnel URL and enter it manually on the GitHub Pages site."
    # Continue running the tunnel in foreground
    cat "$TUNNEL_LOG"
    tail -f "$TUNNEL_LOG"
else
    echo "Found tunnel URL: $TUNNEL_URL"
    
    # Try to push to GitHub if git is available and we're in a git repository
    if command -v git &> /dev/null && git rev-parse --is-inside-work-tree &> /dev/null; then
        echo "Attempting to automatically push updated tunnel URL to GitHub..."
        
        # Pull latest changes from remote repository
        echo "Pulling latest changes from remote repository..."
        git pull origin main
        
        # Reset local repository to match remote main branch
        echo "Resetting local repository to match remote main branch..."
        git reset --hard origin/main
        
        # Update the tunnel URL file after reset
        echo '{"tunnelUrl":"'"$TUNNEL_URL"'","lastUpdated":"'"$(date)"'"}' > ./docs/tunnel-config.json
        
        if git add ./docs/tunnel-config.json && git commit -m "Update tunnel URL: $TUNNEL_URL" && git push; then
            echo "Successfully pushed tunnel URL to GitHub!"
            echo "GitHub Pages will automatically update in a few minutes."
        else
            echo "Failed to push to GitHub. You may need to push manually:"
            echo "git add ./docs/tunnel-config.json"
            echo "git commit -m \"Update tunnel URL\""
            echo "git push"
        fi
    else
        echo "Not in a git repository or git not available."
        echo "The tunnel URL has been saved to ./docs/tunnel-config.json"
        echo "You'll need to manually commit and push this file to update the GitHub Pages site."
    fi
    
    # Show the URL where the game can be accessed
    echo "Game is now accessible at: $TUNNEL_URL"
    echo "Your permanent shareable URL is: https://$(git config --get remote.origin.url | sed 's/.*github.com[:/]\(.*\)\.git/\1/' | sed 's/\//.github.io\//')/"
    
    # Continue running the tunnel in foreground
    echo "Tunnel is running. Press Ctrl+C to stop."
    tail -f "$TUNNEL_LOG"
fi

# When the script is interrupted, clean up
trap "pkill -P $$; exit" INT TERM EXIT 