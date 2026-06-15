import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';

dotenv.config();

const app = express();
const PORT = Number(process.env.PORT ?? 3001);
const FRONTEND_ORIGIN = process.env.FRONTEND_ORIGIN ?? 'http://localhost:5173';

app.use(cors({ origin: FRONTEND_ORIGIN }));
app.use(express.json());

// Health check — used by MangoAI to verify the server is running
app.get('/api/health', (_req, res) => {
  res.json({ ok: true, port: PORT });
});

// Add your API routes here
// Example:
// app.get('/api/items', (_req, res) => { res.json({ items: [] }); });
// app.post('/api/items', (req, res) => { const { name } = req.body; /* ... */ res.status(201).json({ name }); });

app.listen(PORT, '127.0.0.1', () => {
  console.log(`Backend running on http://127.0.0.1:${PORT}`);
});
