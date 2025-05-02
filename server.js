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

    // 📸 Collect all photo files (photo0, photo1, ..., photo4)
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

    // ✅ Extract required fields from form
    const vehicle = req.body.vehicle || 'Not provided';
    const akeDepartment = req.body.ake_department || req.body.other_department || 'Not provided';
    const reasonOfTrip = req.body.reason_of_trip || 'Not provided';
    const date = req.body.date_field || 'Not provided';
    const driverName = req.body.driver_name || 'Not provided';

    const mailOptions = {
      from: `"${displayName || 'AKE Vehicle Form'}" <${process.env.EMAIL_USER}>`,
      to: process.env.RECEIVER_EMAIL,
      subject: 'New Vehicle Form Submission',
    /*  text: `A new vehicle form has been submitted.\n */
/* Details:*/
/* - Vehicle: ${vehicle}*/
/* - AKE Department: ${akeDepartment}*/
/* - Reason of Trip: ${reasonOfTrip}*/
/* - Date: ${date}*/
/* - Driver Name: ${driverName}*/
/* `, */

html: `
  <p>A new vehicle form has been submitted with the following details:</p>
  <table border="1" cellpadding="10" cellspacing="0" style="border-collapse: collapse; font-family: Arial, sans-serif; width: 100%;">
    <tr style="background-color: #f2f2f2;">
      <th>Vehicle</th>
      <th>AKE Department</th>
      <th>Reason of Trip</th>
      <th>Date</th>
      <th>Driver Name</th>
    </tr>
    <tr>
      <td>${vehicle}</td>
      <td>${akeDepartment}</td>
      <td>${reasonOfTrip}</td>
      <td>${date}</td>
      <td>${driverName}</td>
    </tr>
  </table>
`
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
