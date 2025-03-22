const express = require('express');
const path = require('path');
const fs = require('fs');
const app = express();
const PORT = process.env.PORT || 3000;

// Add JSON middleware
app.use(express.json());

// Serve static files
app.use(express.static('./'));

// Leaderboard data file path
const leaderboardFilePath = path.join(__dirname, 'leaderboard.json');

// Initialize leaderboard file if it doesn't exist
if (!fs.existsSync(leaderboardFilePath)) {
    const initialData = {
        leaderboard_3: [],
        leaderboard_5: [],
        leaderboard_10: []
    };
    fs.writeFileSync(leaderboardFilePath, JSON.stringify(initialData, null, 2));
    console.log('Created initial leaderboard file');
}

// API endpoint to get leaderboard data
app.get('/api/leaderboard/:lapCount', (req, res) => {
    try {
        const lapCount = req.params.lapCount;
        const validLapCounts = ['3', '5', '10'];
        
        if (!validLapCounts.includes(lapCount)) {
            return res.status(400).json({ error: 'Invalid lap count. Must be 3, 5, or 10.' });
        }
        
        const leaderboardData = JSON.parse(fs.readFileSync(leaderboardFilePath, 'utf8'));
        const lapLeaderboard = leaderboardData[`leaderboard_${lapCount}`] || [];
        
        return res.json(lapLeaderboard);
    } catch (error) {
        console.error('Error getting leaderboard:', error);
        return res.status(500).json({ error: 'Failed to get leaderboard data' });
    }
});

// API endpoint to add a new leaderboard entry
app.post('/api/leaderboard/:lapCount', (req, res) => {
    try {
        const lapCount = req.params.lapCount;
        const validLapCounts = ['3', '5', '10'];
        
        if (!validLapCounts.includes(lapCount)) {
            return res.status(400).json({ error: 'Invalid lap count. Must be 3, 5, or 10.' });
        }
        
        const { name, time, position } = req.body;
        
        if (!name || time === undefined || position === undefined) {
            return res.status(400).json({ error: 'Missing required fields: name, time, position' });
        }
        
        // Read existing data
        const leaderboardData = JSON.parse(fs.readFileSync(leaderboardFilePath, 'utf8'));
        const leaderboardKey = `leaderboard_${lapCount}`;
        
        // Ensure array exists
        if (!leaderboardData[leaderboardKey]) {
            leaderboardData[leaderboardKey] = [];
        }
        
        // Add new entry
        leaderboardData[leaderboardKey].push({
            name,
            time,
            position,
            laps: parseInt(lapCount),
            date: new Date().toISOString()
        });
        
        // Sort by time (ascending)
        leaderboardData[leaderboardKey].sort((a, b) => a.time - b.time);
        
        // Keep only top 50 entries
        leaderboardData[leaderboardKey] = leaderboardData[leaderboardKey].slice(0, 50);
        
        // Save updated data
        fs.writeFileSync(leaderboardFilePath, JSON.stringify(leaderboardData, null, 2));
        
        return res.status(201).json({ success: true, message: 'Leaderboard entry added' });
    } catch (error) {
        console.error('Error adding leaderboard entry:', error);
        return res.status(500).json({ error: 'Failed to add leaderboard entry' });
    }
});

// Serve the game
app.get('/', (req, res) => {
    res.sendFile(path.join(__dirname, 'index.html'));
});

// Start server
app.listen(PORT, () => {
    console.log(`Nebula Racers server running on port ${PORT}`);
    console.log(`Open http://localhost:${PORT} to play the game`);
}); 