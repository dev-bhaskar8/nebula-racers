# Nebula Racers

A fast-paced, multiplayer space racing game built with Three.js for the 2025 Vibe Coding Game Jam.

## Game Concept

In Nebula Racers, players pilot sleek spacecraft through vibrant cosmic environments, racing against other players in real-time through procedurally generated tracks.

## Features

- Real-time multiplayer racing (simulated AI players)
- Procedurally generated race tracks through space
- Low-poly aesthetic with shader-based visual effects
- Simple but satisfying ship controls with drift mechanics
- Collectible boost items and obstacles
- Minimalist UI with clear visual feedback
- Server-side leaderboards with separate rankings for different lap counts
- Customizable ship colors and race length options

## How to Play

1. Enter your name and click "START RACE"
2. Choose your ship color and number of laps (3, 5, or 10)
3. Use the arrow keys to control your ship:
   - Up Arrow: Accelerate
   - Down Arrow: Brake
   - Left/Right Arrows: Turn
   - Spacebar: Use boost (when available)
4. Complete the selected number of laps as fast as you can
5. Try to beat your best time and climb the leaderboard

## Project Structure

This game uses a minimalist file structure:

- `index.html`: Main HTML entry point
- `style.css`: Styling for the game
- `script.js`: Game logic and Three.js implementation
- `server.js`: Express server with leaderboard API endpoints
- `leaderboard.json`: Server-side storage for leaderboard data
- `npmstart.sh`: Script to start the server with Cloudflare tunnel and generate GitHub Pages site
- `docs/`: GitHub Pages site that redirects to the latest tunnel URL

## Technical Implementation

- Three.js for 3D rendering
- Procedural track generation with circular path
- Low-poly geometric shapes for ships, obstacles, and boost items
- Express.js server for leaderboard data persistence
- Client-side localStorage fallback if server is unavailable
- Cloudflare tunneling for public access without port forwarding

## Running the Game

### Local Development
1. Install dependencies: `npm install`
2. Start the server: `npm start`
3. Open `http://localhost:1010` in your browser

### Public Access with Cloudflare Tunnel
1. Install Cloudflare CLI: `brew install cloudflared` (Mac) or see [Cloudflare docs](https://developers.cloudflare.com/cloudflare-one/connections/connect-networks/downloads/) for other platforms
2. Run the script: `./npmstart.sh`
3. The script will:
   - Start the Node.js server on port 1010
   - Create a Cloudflare tunnel with a public URL
   - Generate a GitHub Pages site in the `docs/` folder
   - Display the tunnel URL in the terminal
4. Share the GitHub Pages URL with others (once pushed to GitHub)

## GitHub Pages Setup
1. Push this repository to GitHub
2. Go to repository settings > Pages
3. Set the source to "GitHub Actions" or "Deploy from a branch" and select the `docs` folder
4. Your game will be accessible via the GitHub Pages URL, which will redirect to the latest tunnel

## License

This project was created for the 2025 Vibe Coding Game Jam. 