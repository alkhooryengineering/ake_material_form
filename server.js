const express = require('express');
const multer = require('multer');
const cors = require('cors');
const nodemailer = require('nodemailer');
const dotenv = require('dotenv');

dotenv.config();

const app = express();
const port = process.env.PORT || 3000;

// ✅ Enable CORS for GitHub Pages frontend
const allowedOrigins = ['https://alkhooryengineering.github.io'];

app.use(cors({
  origin: function (origin, callback) {
    if (!origin || allowedOrigins.includes(origin)) {
      callback(null, true);
    } else {
      callback(new Error('Not allowed by CORS'));
    }
  },
  methods: ['GET', 'POST'],
  allowedHeaders: ['Content-Type']
}));

// Set up Multer for file uploads
const upload = multer({
  limits: { fileSize: 20 * 1024 * 1024 }, // 20MB limit
});

// POST endpoint to receive the form
app.post('/send-pdf', upload.any(), async (req, res) => {
  try {
    const pdfFile = req.files.find(f => f.originalname.endsWith('.pdf'));
    const imageFiles = req.files.filter(f => f.fieldname.startsWith('photo'));

    const { company, otherCompany } = req.body;
    const displayName = company === 'Other' ? otherCompany : company;

    const transporter = nodemailer.createTransport({
      service: 'gmail',
      auth: {
        user: process.env.EMAIL_USER,
        pass: process.env.EMAIL_PASS,
      },
    });

    const attachments = [
      {
        filename: 'order.pdf',
        content: pdfFile.buffer,
      },
      ...imageFiles.map(file => ({
        filename: file.originalname,
        content: file.buffer,
      }))
    ];

    // ✅ Extract and conditionally build form content
    const fields = [
      { label: 'Trip Status', value: req.body.trip_status === 'start' ? 'Trip Start' : 'Trip End' },
      { label: 'Vehicle', value: req.body.vehicle },
      { label: 'Odometer', value: req.body.odometer },
      { label: 'AKE Department', value: req.body.ake_department || req.body.other_department },
      { label: 'Reason of Trip', value: req.body.reason_of_trip },
      { label: 'Date', value: req.body.date_field },
      { label: 'Driver Name', value: req.body.driver_name }
    ];

    let htmlContent = '<p>';
    fields.forEach(field => {
      if (field.value && field.value.trim() !== '') {
        htmlContent += `${field.label}: ${field.value}<br>`;
      }
    });
    htmlContent += '</p>';

    // Log form data
    console.log('Form data:', req.body);

    const mailOptions = {
      from: `"${displayName || 'AKE Vehicle Form'}" <${process.env.EMAIL_USER}>`,
      to: process.env.RECEIVER_EMAIL,
      subject: 'New Vehicle Form Submission',
      html: htmlContent,
      attachments,
    };

    await transporter.sendMail(mailOptions);
    res.status(200).send('Email sent successfully');
  } catch (error) {
    console.error('Email sending failed:', error);
    res.status(500).send('Email sending failed');
  }
});

// Start server
app.listen(port, () => {
  console.log(`Server is running on port ${port}`);
});
