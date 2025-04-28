const express = require('express');
const multer = require('multer');
const cors = require('cors');
const nodemailer = require('nodemailer');
const dotenv = require('dotenv');

dotenv.config();

const app = express();
const port = process.env.PORT || 3000;

// Enable CORS
app.use(cors());

// Set up Multer for file uploads
const upload = multer({
  limits: { fileSize: 20 * 1024 * 1024 }, // 20MB limit
});

// POST endpoint to receive the form
app.post('/send-pdf', upload.any(), async (req, res) => {
  try {
    const pdfFile = req.files.find(f => f.originalname.endsWith('.pdf'));
    const imageFile = req.files.find(f => f.mimetype.startsWith('image/'));
    const companyName = req.body.company || 'Unknown Company'; // Get the company name from form data

    const transporter = nodemailer.createTransport({
      service: 'gmail',
      auth: {
        user: process.env.EMAIL_USER,
        pass: process.env.EMAIL_PASS,
      },
    });

    const mailOptions = {
      from: `"${companyName}" <${process.env.EMAIL_USER}>`, // Corrected
      to: process.env.RECEIVER_EMAIL,
      subject: 'New Order Form Submission',
      text: `A new order form has been submitted by ${companyName}.`, // Corrected
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
