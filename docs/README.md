# Nebula Racers - GitHub Pages Redirect

This is a simple GitHub Pages site that redirects to the latest Cloudflare tunnel URL for the Nebula Racers game.

## How to Use

1. When you start the game server with Cloudflare tunnel, copy the tunnel URL
2. Visit this GitHub Pages site
3. Enter the tunnel URL in the input field and click "Update"
4. The site will save the URL and redirect you to the game

## Game Information

Nebula Racers is a fast-paced, multiplayer space racing game built with Three.js. Race against your friends through procedurally generated space tracks!

## Hosting and Setup

This site provides a convenient way to share a consistent URL for your game while still using the free Cloudflare tunnels which generate random URLs each time.

### Start the server with:

```bash
# Install cloudflared if you haven't already
# On macOS:
brew install cloudflared

# Start the server and tunnel
npm start  # Starts the Node.js server on port 1010
cloudflared tunnel --url http://localhost:1010  # Creates the tunnel
```

When the tunnel starts, it will output a URL like `https://random-words-here.trycloudflare.com`. 
Copy this URL and enter it on this GitHub Pages site to update the redirect.

Current tunnel URL: https://ocean-cameroon-my-serves.trycloudflare.com

Last updated: Wed Mar 26 19:10:25 IST 2025
