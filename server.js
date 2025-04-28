const express = require('express');
const multer = require('multer');
const cors = require('cors');
const nodemailer = require('nodemailer');
const dotenv = require('dotenv');
const { PDFDocument } = require('pdf-lib'); // Import PDF-lib

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
    
    // Get the company name from the form data
    const { company, otherCompany } = req.body;

    // Determine the display name for the sender (Company Name)
    const displayName = company === 'Other' ? otherCompany : company;

    // Load the existing PDF document
    const pdfDoc = await PDFDocument.load(pdfFile.buffer);

    // Add header and footer (adjust as necessary)
    const pages = pdfDoc.getPages();
    pages.forEach(page => {
      const { width, height } = page.getSize();

      // Header
      page.drawText('Your Company Header', {
        x: 50,
        y: height - 50,
        size: 12,
        color: rgb(0, 0, 0),
      });

      // Footer
      page.drawText('Your Company Footer', {
        x: 50,
        y: 30,
        size: 12,
        color: rgb(0, 0, 0),
      });
    });

    // Serialize the PDF with the header and footer added
    const modifiedPdfBytes = await pdfDoc.save();

    const transporter = nodemailer.createTransport({
      service: 'gmail',
      auth: {
        user: process.env.EMAIL_USER,
        pass: process.env.EMAIL_PASS,
      },
    });

    // Set up email options
    const mailOptions = {
      from: `"${displayName}" <${process.env.EMAIL_USER}>`, // Set display name with email
      to: process.env.RECEIVER_EMAIL,
      subject: 'New Order Form Submission',
      text: `A new order form has been submitted by ${displayName}.`,
      attachments: [
        {
          filename: 'order.pdf',
          content: modifiedPdfBytes, // Use the modified PDF
        },
        ...(imageFile
          ? [{
              filename: imageFile.originalname,
              content: imageFile.buffer,
            }]
          : []),
      ],
    };

    // Send the email
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
