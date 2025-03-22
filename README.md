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

## Technical Implementation

- Three.js for 3D rendering
- Procedural track generation with circular path
- Low-poly geometric shapes for ships, obstacles, and boost items
- Express.js server for leaderboard data persistence
- Client-side localStorage fallback if server is unavailable

## Running the Game

1. Install dependencies: `npm install`
2. Start the server: `npm start`
3. Open `http://localhost:3000` in your browser

## License

This project was created for the 2025 Vibe Coding Game Jam. 