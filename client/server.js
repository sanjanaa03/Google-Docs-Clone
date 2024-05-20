import express from 'express';
import mongoose from 'mongoose';
import bcrypt from 'bcryptjs';
import session from 'express-session';
import path from 'path';
import { fileURLToPath } from 'url';
import { dirname } from 'path';

const __filename = fileURLToPath(import.meta.url);
const _dirname = dirname(_filename);

const app = express();

// MongoDB connection
mongoose.connect('mongodb://localhost:27017/google-docs-clone', {
  useNewUrlParser: true,
  useUnifiedTopology: true,
}).then(() => {
  console.log('MongoDB connected successfully');
}).catch(err => {
  console.error('MongoDB connection error:', err);
});

// User schema
const User = mongoose.model('User', {
  email: String,
  password: String,
});

// Express session setup
app.use(session({
  secret: 'secret-key',
  resave: false,
  saveUninitialized: false,
}));

app.use(express.urlencoded({ extended: true }));
app.use(express.json());

// Serve static files (HTML, CSS, JS)
app.use(express.static(path.join(__dirname, 'client')));

// Middleware to check if user is logged in
const isLoggedIn = (req, res, next) => {
  if (req.session.userId) {
    next(); // User is logged in, proceed to the next middleware
  } else {
    // User is not logged in, redirect to login page
    res.redirect('/login.html');
  }
};

// Serve home.html as the main page
app.get('/', (req, res) => {
  res.sendFile(path.join(__dirname, 'client', 'home.html'));
});

// Serve index.html if user is logged in
app.get('/index.html', isLoggedIn, (req, res) => {
  res.sendFile(path.join(__dirname, 'client', 'index.html'));
});

// Register endpoint
app.post('/register', async (req, res) => {
  const { email, password } = req.body;

  // Check if user already exists
  const existingUser = await User.findOne({ email });
  if (existingUser) {
    return res.status(400).send('User already exists');
  }

  // Hash the password
  const hashedPassword = await bcrypt.hash(password, 10);

  // Create a new user
  const user = new User({
    email,
    password: hashedPassword,
  });
  await user.save();

  res.status(201).send('User registered successfully');
});

// Login endpoint
app.post('/login', async (req, res) => {
  const { email, password } = req.body;

  // Check if user exists
  const user = await User.findOne({ email });
  if (!user) {
    return res.status(400).send('Invalid email or password');
  }

  // Check password
  const isValidPassword = await bcrypt.compare(password, user.password);
  if (!isValidPassword) {
    return res.status(400).send('Invalid email or password');
  }

  // Set user session
  req.session.userId = user._id;

  // Redirect to index.html after successful login
  res.redirect('/index.html');
});

// Logout endpoint
app.post('/logout', (req, res) => {
  req.session.destroy();
  res.redirect('/login.html');
});

const PORT = 3000;
app.listen(PORT, () => {
  console.log("Server is running on port ${PORT}");
});