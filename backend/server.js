require('dotenv').config();
const express = require('express');
const cors = require('cors');

const authRoutes = require('./routes/auth');
const reflectionRoutes = require('./routes/reflections');
const userRoutes = require('./routes/user');

const app = express();
const PORT = process.env.PORT || 5000;

app.use(cors());
app.use(express.json());

// Routes
app.use('/api/auth', authRoutes);
app.use('/api/reflections', reflectionRoutes);
app.use('/api/user', userRoutes);

app.get('/api/health', (req, res) => {
    res.json({ status: 'ok', message: 'Practice Backend is running!' });
});

app.listen(PORT, () => {
    console.log(`Server running on http://localhost:${PORT}`);
});
