import 'dotenv/config';
import express from 'express';
import mongoose from 'mongoose';
import cors from 'cors';
import multer from 'multer';

const app = express();
app.use((req, res, next) => { 
  console.log(req.method, req.url); 
  next(); 
});

const PORT = process.env.PORT || 3000;
const ORIGIN = process.env.ALLOW_ORIGIN?.split(',') || '*';

// ---------- MIDDLEWARE ----------
app.use(cors({ origin: ORIGIN, credentials: true }));
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// ---------- DATABASE ----------
if (!process.env.MONGODB_URI) {
  console.error("❌ Missing MONGODB_URI env var");
  process.exit(1);
}

try {
  await mongoose.connect(process.env.MONGODB_URI);
  console.log("✅ MongoDB Connected");
} catch (err) {
  console.error("❌ MongoDB Connection Error:", err.message);
  process.exit(1);
}

// ---------- MODELS ----------
const User = mongoose.model('User', new mongoose.Schema({
  email: { type: String, unique: true, required: true },
  name: String,
  createdAt: { type: Date, default: Date.now }
}));

const Donation = mongoose.model('Donation', new mongoose.Schema({
  amount: Number,
  userEmail: String,
  status: { type: String, default: 'created' },
  createdAt: { type: Date, default: Date.now }
}));

// ---------- ROUTES ----------

// Health check
app.get('/', (req, res) => res.send('OK'));
app.get('/health', (req, res) => res.json({ ok: true }));

// Register
app.post('/api/register', async (req, res) => {
  try {
    const { email, name } = req.body;
    if (!/^[^@]+@thapar\.edu$/.test(email)) {
      return res.status(400).json({ error: "Only @thapar.edu emails allowed" });
    }
    const user = await User.findOneAndUpdate(
      { email },
      { name },
      { upsert: true, new: true }
    );
    res.status(201).json({ ok: true, user });
  } catch (e) {
    res.status(400).json({ error: e.message });
  }
});

// Login
app.post('/api/login', async (req, res) => {
  try {
    const { email } = req.body;
    const user = await User.findOne({ email });
    if (!user) return res.status(404).json({ error: "User not found" });
    res.json({ ok: true, user });
  } catch (e) {
    res.status(400).json({ error: e.message });
  }
});

// Upload — for now, local only (Cloudinary later)
const upload = multer({ dest: 'uploads/' });
app.post('/api/upload', upload.array('files', 10), (req, res) => {
  const files = (req.files || []).map(f => ({
    original: f.originalname,
    savedAs: f.filename
  }));
  res.json({ ok: true, files });
});

// Donation placeholder
app.post('/api/donate', async (req, res) => {
  try {
    const { amount, userEmail } = req.body;
    if (!amount || amount <= 0)
      return res.status(400).json({ error: "Invalid amount" });
    const entry = await Donation.create({ amount, userEmail, status: 'success' });
    res.json({ ok: true, donation: entry });
  } catch (e) {
    res.status(400).json({ error: e.message });
  }
});

// ---------- START ----------
app.listen(PORT, () => console.log(`🚀 Backend running on ${PORT}`));
