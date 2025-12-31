// POKRABS Backend Entry Point
import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';

dotenv.config();

const app = express();
const PORT = process.env.PORT || 3001;

// Middleware
app.use(cors());
app.use(express.json());

// Health check endpoint
app.get('/health', (req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

// API routes will be added here
// app.use('/api/projects', projectsRouter);
// app.use('/api/problems', problemsRouter);

// Start server
app.listen(PORT, () => {
  console.log(`🚀 POKRABS backend server running on http://localhost:${PORT}`);
});

