const express = require('express');
const multer = require('multer');
const cors = require('cors');
const nodemailer = require('nodemailer');
const dotenv = require('dotenv');
const { PDFDocument, rgb } = require('pdf-lib');  // Import rgb

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
    const headerImageFile = req.files.find(f => f.originalname === 'header.jpg');
    const footerImageFile = req.files.find(f => f.originalname === 'footer.jpg');
    const imageFile = req.files.find(f => f.mimetype.startsWith('image/'));

    // Check if the PDF file is received
    if (!pdfFile) {
      return res.status(400).send('PDF file is missing');
    }

    // Check if the header and footer images are provided
    if (!headerImageFile || !footerImageFile) {
      return res.status(400).send('Header and Footer images are missing');
    }

    // Get the company name from the form data
    const { company, otherCompany } = req.body;

    // Determine the display name for the sender (Company Name)
    const displayName = company === 'Other' ? otherCompany : company;

    const transporter = nodemailer.createTransport({
      service: 'gmail',
      auth: {
        user: process.env.EMAIL_USER,
        pass: process.env.EMAIL_PASS,
      },
    });

    // Load and modify the PDF
    const pdfDoc = await PDFDocument.load(pdfFile.buffer);

    // Embed header and footer images
    const headerImage = await pdfDoc.embedJpg(headerImageFile.buffer);
    const footerImage = await pdfDoc.embedJpg(footerImageFile.buffer);

    // Add header and footer to each page of the PDF
    const pages = pdfDoc.getPages();
    pages.forEach(page => {
      const { width, height } = page.getSize();

      // Place the header image at the top of the page
      page.drawImage(headerImage, {
        x: 0,
        y: height - headerImage.height,
        width: width,  // Ensure it spans the full page width
        height: headerImage.height,
      });

      // Place the footer image at the bottom of the page
      page.drawImage(footerImage, {
        x: 0,
        y: 0,
        width: width,  // Ensure it spans the full page width
        height: footerImage.height,
      });
    });

    // Save the modified PDF
    const modifiedPdfBytes = await pdfDoc.save();

    // Set up email options
    const mailOptions = {
      from: `"${displayName}" <${process.env.EMAIL_USER}>`,
      to: process.env.RECEIVER_EMAIL,
      subject: 'New Order Form Submission',
      text: `A new order form has been submitted by ${displayName}.`,
      attachments: [
        {
          filename: 'order.pdf',
          content: modifiedPdfBytes,
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
    console.error('Error processing request:', error);
    res.status(500).send('Internal server error');
  }
});

// Start server
app.listen(port, () => {
  console.log(`Server is running on port ${port}`);
});
