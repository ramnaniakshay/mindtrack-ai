import express from 'express';
import cors from 'cors';
import path from 'path';
import { fileURLToPath } from 'url';
import { runMigrations, getPool } from './db.js';
import { checkSafety } from './safety.js';
import { getGeminiChatResponse, getGeminiJournalAnalysis } from './gemini.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
const PORT = process.env.PORT || 3000;

app.use(cors());
app.use(express.json());

// Serving built frontend bundle in production
app.use(express.static(path.join(__dirname, 'dist')));

// Health Check
app.get('/health', (req, res) => {
  res.status(200).json({ status: 'healthy', timestamp: new Date() });
});

// Settings API
app.get('/api/settings', async (req, res) => {
  try {
    const db = getPool();
    const result = await db.query('SELECT * FROM settings');
    const settingsMap = {};
    result.rows.forEach(row => {
      settingsMap[row.key] = row.value;
    });
    res.json(settingsMap);
  } catch (err) {
    console.error("GET settings error:", err.message);
    res.status(500).json({ error: "Failed to retrieve settings" });
  }
});

app.post('/api/settings', async (req, res) => {
  const { key, value } = req.body;
  if (!key || typeof key !== 'string' || key.trim() === '') {
    return res.status(400).json({ error: "key must be a non-empty string" });
  }
  if (key.length > 100) {
    return res.status(400).json({ error: "key cannot exceed 100 characters" });
  }
  if (value === undefined || value === null) {
    return res.status(400).json({ error: "value is required" });
  }
  try {
    const db = getPool();
    await db.query(
      'INSERT INTO settings (key, value) VALUES ($1, $2) ON CONFLICT (key) DO UPDATE SET value = EXCLUDED.value',
      [key, JSON.stringify(value)]
    );
    res.json({ success: true });
  } catch (err) {
    console.error("POST settings error:", err.message);
    res.status(500).json({ error: "Failed to update settings" });
  }
});

// Mood Logs API
app.get('/api/moods', async (req, res) => {
  try {
    const db = getPool();
    const result = await db.query('SELECT * FROM mood_logs ORDER BY logged_at DESC LIMIT 30');
    res.json(result.rows);
  } catch (err) {
    console.error("GET moods error:", err.message);
    res.status(500).json({ error: "Failed to fetch mood logs" });
  }
});

app.post('/api/moods', async (req, res) => {
  const { mood, energy, stress, tags } = req.body;
  if (!mood || typeof mood !== 'string' || mood.trim() === '') {
    return res.status(400).json({ error: "mood must be a non-empty string" });
  }
  
  const parsedEnergy = Number(energy);
  const parsedStress = Number(stress);

  if (isNaN(parsedEnergy) || !Number.isInteger(parsedEnergy) || parsedEnergy < 1 || parsedEnergy > 10) {
    return res.status(400).json({ error: "energy must be an integer between 1 and 10" });
  }
  if (isNaN(parsedStress) || !Number.isInteger(parsedStress) || parsedStress < 1 || parsedStress > 10) {
    return res.status(400).json({ error: "stress must be an integer between 1 and 10" });
  }

  if (tags !== undefined && !Array.isArray(tags)) {
    return res.status(400).json({ error: "tags must be an array of strings" });
  }
  if (Array.isArray(tags) && !tags.every(t => typeof t === 'string')) {
    return res.status(400).json({ error: "all tags must be strings" });
  }

  try {
    const db = getPool();
    const result = await db.query(
      'INSERT INTO mood_logs (mood, energy, stress, tags) VALUES ($1, $2, $3, $4) RETURNING *',
      [mood, parsedEnergy, parsedStress, tags || []]
    );
    res.status(201).json(result.rows[0]);
  } catch (err) {
    console.error("POST moods error:", err.message);
    res.status(500).json({ error: "Failed to log mood" });
  }
});

// Journals API
app.get('/api/journals', async (req, res) => {
  try {
    const db = getPool();
    const result = await db.query('SELECT * FROM journals ORDER BY logged_at DESC');
    res.json(result.rows);
  } catch (err) {
    console.error("GET journals error:", err.message);
    res.status(500).json({ error: "Failed to fetch journals" });
  }
});

app.post('/api/journals', async (req, res) => {
  const { title, content } = req.body;
  if (!title || typeof title !== 'string' || title.trim() === '') {
    return res.status(400).json({ error: "title must be a non-empty string" });
  }
  if (title.length > 255) {
    return res.status(400).json({ error: "title cannot exceed 255 characters" });
  }
  if (!content || typeof content !== 'string' || content.trim() === '') {
    return res.status(400).json({ error: "content must be a non-empty string" });
  }

  // Safety Intercept Check
  const safety = checkSafety(content);
  if (!safety.safe) {
    return res.status(400).json({
      error: "Safety concerns detected",
      safety
    });
  }

  try {
    // Run GenAI / Local Heuristics analysis
    const analysis = await getGeminiJournalAnalysis(content);
    const db = getPool();
    const result = await db.query(
      'INSERT INTO journals (title, content, sentiment, stress_score, triggers, cognitive_distortions) VALUES ($1, $2, $3, $4, $5, $6) RETURNING *',
      [
        title,
        content,
        analysis.sentiment,
        analysis.stressScore,
        analysis.triggers,
        analysis.cognitiveDistortions
      ]
    );
    res.status(201).json(result.rows[0]);
  } catch (err) {
    console.error("POST journal error:", err.message);
    res.status(500).json({ error: "Failed to save journal" });
  }
});

app.delete('/api/journals/:id', async (req, res) => {
  const { id } = req.params;
  const parsedId = Number(id);
  if (isNaN(parsedId) || !Number.isInteger(parsedId) || parsedId <= 0) {
    return res.status(400).json({ error: "id must be a valid positive integer" });
  }
  try {
    const db = getPool();
    await db.query('DELETE FROM journals WHERE id = $1', [parsedId]);
    res.json({ success: true });
  } catch (err) {
    console.error("DELETE journal error:", err.message);
    res.status(500).json({ error: "Failed to delete journal" });
  }
});

// Chat Companion API
app.get('/api/chat', async (req, res) => {
  try {
    const db = getPool();
    const result = await db.query('SELECT * FROM chats ORDER BY logged_at ASC LIMIT 50');
    res.json(result.rows);
  } catch (err) {
    console.error("GET chat error:", err.message);
    res.status(500).json({ error: "Failed to fetch chat logs" });
  }
});

app.post('/api/chat', async (req, res) => {
  const { message } = req.body;
  if (!message || typeof message !== 'string' || message.trim() === '') {
    return res.status(400).json({ error: "message must be a non-empty string" });
  }

  const db = getPool();

  // 1. Safety check
  const safety = checkSafety(message);
  if (!safety.safe) {
    try {
      // Save user message
      await db.query('INSERT INTO chats (role, message) VALUES ($1, $2)', ['user', message]);
      // Save security intercept message
      const systemMsg = `${safety.message}\n\n**Emergency Support Contacts:**\n` +
        safety.helplines.map(h => `- **${h.name}**: ${h.number}`).join('\n');
      const responseResult = await db.query('INSERT INTO chats (role, message) VALUES ($1, $2) RETURNING *', ['model', systemMsg]);
      return res.status(200).json({
        reply: systemMsg,
        safety
      });
    } catch (dbErr) {
      console.error("Failed to write safety event to DB:", dbErr.message);
      return res.status(500).json({ error: "Database error during safety intercept" });
    }
  }

  try {
    // Fetch last 10 chat messages to maintain context
    const contextResult = await db.query('SELECT role, message FROM chats ORDER BY logged_at DESC LIMIT 10');
    const history = contextResult.rows.reverse();

    // Query target exam setting for personalization context
    let examContext = "Exams";
    try {
      const settingsResult = await db.query("SELECT value FROM settings WHERE key = 'exam_goal'");
      if (settingsResult.rows.length > 0) {
        examContext = settingsResult.rows[0].value.exam || "Exams";
      }
    } catch (settingErr) {
      console.warn("Could not query target exam settings:", settingErr.message);
    }

    // Generate companion response passing the examContext
    const reply = await getGeminiChatResponse(history, message, examContext);

    // Write user message & companion message to DB
    await db.query('INSERT INTO chats (role, message) VALUES ($1, $2)', ['user', message]);
    const responseResult = await db.query('INSERT INTO chats (role, message) VALUES ($1, $2) RETURNING *', ['model', reply]);

    res.json({ reply });
  } catch (err) {
    console.error("POST chat error:", err.message);
    res.status(500).json({ error: "Failed to process chat companion response" });
  }
});

// Fallback path to index.html for Vite client routing
app.get('*', (req, res) => {
  res.sendFile(path.join(__dirname, 'dist', 'index.html'));
});

// Initialize DB and launch server
async function startServer() {
  try {
    await runMigrations();
    app.listen(PORT, () => {
      console.log(`Server successfully started on port ${PORT}`);
    });
  } catch (err) {
    console.error("Critical: failed to start application server:", err.message);
    process.exit(1);
  }
}

// Only start the server if this file is run directly (not in tests)
if (process.argv[1] && process.argv[1].endsWith('server.js')) {
  startServer();
}

export default app;
