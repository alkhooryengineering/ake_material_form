const express = require('express');
const multer = require('multer');
const cors = require('cors');
const nodemailer = require('nodemailer');
const dotenv = require('dotenv');
const session = require('express-session');  // Import session

dotenv.config();

const app = express();
const port = process.env.PORT || 3000;

// Enable CORS
app.use(cors());

// Session setup
app.use(session({
  secret: 'your-secret-key',  // A strong secret key for session encryption
  resave: false,
  saveUninitialized: true,
  cookie: { secure: true }  // Set 'secure: true' if you're using HTTPS
}));

// Middleware to parse JSON and URL-encoded form data
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Set up Multer for file uploads
const upload = multer({
  limits: { fileSize: 20 * 1024 * 1024 }, // 20MB limit
});

// Dummy user data for authentication (this could be replaced by a database)
const users = [
  { username: 'admin', password: 'password123' }
];

// Authentication check middleware
function isAuthenticated(req, res, next) {
  if (req.session.user) {
    return next();
  } else {
    res.status(401).send('You are not logged in.');
  }
}

// POST endpoint to handle login
app.post('/login', (req, res) => {
  const { username, password } = req.body;
  const user = users.find(u => u.username === username && u.password === password);
  
  if (user) {
    req.session.user = user;  // Store user info in session
    res.status(200).json({ message: 'Logged in successfully' });
  } else {
    res.status(401).json({ message: 'Invalid credentials' });
  }
});

// POST endpoint to handle form submission (only accessible if logged in)
app.post('/send-pdf', isAuthenticated, upload.any(), async (req, res) => {
  try {
    const pdfFile = req.files.find(f => f.originalname.endsWith('.pdf'));
    const imageFile = req.files.find(f => f.mimetype.startsWith('image/'));
    const companyName = req.body.company || 'Unknown Company';

    const transporter = nodemailer.createTransport({
      service: 'gmail',
      auth: {
        user: process.env.EMAIL_USER,
        pass: process.env.EMAIL_PASS,
      },
    });

    const mailOptions = {
      from: `"${companyName}" <${process.env.EMAIL_USER}>`,
      to: process.env.RECEIVER_EMAIL,
      subject: 'New Order Form Submission',
      text: `A new order form has been submitted by ${companyName}.`,
      attachments: [
        {
          filename: 'order.pdf',
          content: pdfFile.buffer,
        },
        ...(imageFile ? [{
          filename: imageFile.originalname,
          content: imageFile.buffer,
        }] : []),
      ],
    };

    await transporter.sendMail(mailOptions);
    res.status(200).send('Email sent successfully');
  } catch (error) {
    console.error('Email sending failed:', error);
    res.status(500).send('Email sending failed');
  }
});

// POST endpoint to handle logout and destroy session
app.post('/logout', (req, res) => {
  req.session.destroy((err) => {
    if (err) {
      return res.status(500).json({ message: 'Failed to log out' });
    }
    res.status(200).json({ message: 'Logged out successfully' });
  });
});

// Start server
app.listen(port, () => {
  console.log(`Server is running on port ${port}`);
});
