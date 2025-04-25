const express = require('express');
const multer = require('multer');
const cors = require('cors');
const nodemailer = require('nodemailer');
const dotenv = require('dotenv');
const session = require('express-session');
const bodyParser = require('body-parser');

dotenv.config();

const app = express();
const port = process.env.PORT || 3000;

// Enable CORS
app.use(cors({
  origin: true,
  credentials: true
}));

// Body parser for login form
app.use(bodyParser.urlencoded({ extended: true }));
app.use(bodyParser.json());

// Set up session middleware
app.use(session({
  secret: process.env.SESSION_SECRET || 'supersecretkey',
  resave: false,
  saveUninitialized: false,
  cookie: {
    httpOnly: true,
    secure: false, // set to true if using HTTPS
    maxAge: 1 * 60 * 60 * 1000 // 1 hour
  }
}));

// Simple login route
app.post('/login', (req, res) => {
  const { username, password } = req.body;

  // You can use environment variables for better security
  const VALID_USER = process.env.LOGIN_USER || 'admin';
  const VALID_PASS = process.env.LOGIN_PASS || 'password123';

  if (username === VALID_USER && password === VALID_PASS) {
    req.session.authenticated = true;
    res.status(200).json({ message: 'Logged in successfully' });
  } else {
    res.status(401).json({ message: 'Invalid credentials' });
  }
});

// Middleware to protect routes
function isAuthenticated(req, res, next) {
  if (req.session.authenticated) {
    return next();
  } else {
    res.status(401).json({ message: 'Unauthorized' });
  }
}

// Set up Multer for file uploads
const upload = multer({
  limits: { fileSize: 20 * 1024 * 1024 }, // 20MB limit
});

// Protected POST endpoint
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
        ...(imageFile
          ? [{
              filename: imageFile.originalname,
              content: imageFile.buffer,
            }]
          : []),
      ],
    };

    await transporter.sendMail(mailOptions);
    res.status(200).send('Email sent successfully');
  } catch (error) {
    console.error('Email sending failed:', error);
    res.status(500).send('Email sending failed');
  }
});

app.listen(port, () => {
  console.log(`Server is running on port ${port}`);
});
