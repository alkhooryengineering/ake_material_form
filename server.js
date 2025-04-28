const express = require('express');
const multer = require('multer');
const cors = require('cors');
const nodemailer = require('nodemailer');
const dotenv = require('dotenv');
const PDFDocument = require('pdfkit'); // Import PDFKit

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
    // Get form data
    const { company, otherCompany, email } = req.body;

    // Determine the display name for the sender (Company Name)
    const displayName = company === 'Other' ? otherCompany : company;

    // Create a new PDF document
    const doc = new PDFDocument();

    // Pipe the PDF to a buffer so we can send it via email
    const pdfBuffer = [];
    doc.on('data', chunk => pdfBuffer.push(chunk));
    doc.on('end', () => {
      const finalBuffer = Buffer.concat(pdfBuffer);

      // Set up email options
      const transporter = nodemailer.createTransport({
        service: 'gmail',
        auth: {
          user: process.env.EMAIL_USER,
          pass: process.env.EMAIL_PASS,
        },
      });

      // Set up email content and attachments
      const mailOptions = {
        from: `"${displayName}" <${process.env.EMAIL_USER}>`, // Set display name with email
        to: process.env.RECEIVER_EMAIL,
        subject: 'New Order Form Submission',
        text: `A new order form has been submitted by ${displayName}.`,
        attachments: [
          {
            filename: 'order.pdf',
            content: finalBuffer,
          },
        ],
      };

      // Send the email
      transporter.sendMail(mailOptions, (error, info) => {
        if (error) {
          console.error('Error sending email:', error);
          return res.status(500).send('Email sending failed');
        }
        console.log('Email sent:', info.response);
        res.status(200).send('Email sent successfully');
      });
    });

    // Add the header
    doc.fontSize(18).text('Order Form', { align: 'center' });
    doc.moveDown(1);

    // Add form content (example: company name, email)
    doc.fontSize(12).text(`Company: ${displayName}`);
    doc.text(`Email: ${email}`);
    doc.moveDown(1);

    // Add the footer (page number, etc.)
    doc.page.margins.bottom = 50; // Reserve space for footer
    doc.on('pageAdded', () => {
      doc.fontSize(10).text('Footer Content - Page ' + doc.pageCount, {
        align: 'center',
        valign: 'bottom',
      });
    });

    // Finalize and end the document
    doc.end();

  } catch (error) {
    console.error('Error generating PDF:', error);
    res.status(500).send('PDF generation failed');
  }
});

// Start server
app.listen(port, () => {
  console.log(`Server is running on port ${port}`);
});
