const express = require('express');
const multer = require('multer');
const nodemailer = require('nodemailer');
const PDFDocument = require('pdfkit');
const fs = require('fs');
const cors = require('cors');
const app = express();
const upload = multer({ dest: 'uploads/' });

app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

app.post('/send-pdf', upload.single('photo'), async (req, res) => {
  try {
    const formData = req.body;
    const photoPath = req.file ? req.file.path : null;

    const pdfPath = `form_${Date.now()}.pdf`;
    const doc = new PDFDocument();
    doc.pipe(fs.createWriteStream(pdfPath));

    doc.fontSize(18).text('Form Submission Details', { underline: true });
    doc.moveDown();

    for (const [key, value] of Object.entries(formData)) {
      doc.fontSize(12).text(`${key}: ${value}`);
    }

    doc.end();

    const transporter = nodemailer.createTransport({
      service: 'gmail',
      auth: {
        user: process.env.EMAIL_USER,
        pass: process.env.EMAIL_PASS
      }
    });

    const attachments = [{ filename: 'form.pdf', path: pdfPath }];
    if (photoPath) attachments.push({ filename: 'photo.jpg', path: photoPath });

    await transporter.sendMail({
      from: process.env.EMAIL_USER,
      to: process.env.EMAIL_USER,
      subject: 'New Form Submission',
      text: 'Please find the form and photo attached.',
      attachments
    });

    fs.unlinkSync(pdfPath);
    if (photoPath) fs.unlinkSync(photoPath);

    res.json({ success: true, message: 'Form submitted and email sent.' });
  } catch (error) {
    console.error(error);
    res.status(500).json({ success: false, error: 'Server error.' });
  }
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});
