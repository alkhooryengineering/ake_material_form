const express = require('express');
const multer = require('multer');
const cors = require('cors');
const dotenv = require('dotenv');

const axios = require("axios");

// New Brevo API-based mail sender
const sendEmailViaBrevo = async (mailOptions) => {
  try {




    const data = {
  sender: {
    email: process.env.EMAIL_USER,
    name: mailOptions.fromName || "AKE Vehicle Form"
  },
  to: [{ email: process.env.RECEIVER_EMAIL }],
  subject: mailOptions.subject,
  htmlContent: mailOptions.html,

  attachment: mailOptions.attachments?.map(file => ({
    content: file.content.toString("base64"),
    name: file.filename
  })) || [],

  // ✅ Correct tracking flags (per Brevo API)
  trackOpens: false,
  trackClicks: false
};

    




    const response = await axios.post(
      "https://api.brevo.com/v3/smtp/email",
      data,
      {
        headers: {
  'accept': 'application/json',
  'api-key': process.env.BREVO_API_KEY,
  'content-type': 'application/json',
}
      }
    );

    console.log("✅ Email sent via Brevo!", response.data);
  } catch (error) {
    console.error("❌ Brevo email sending failed:", error.response?.data || error.message);
    throw new Error("Email sending failed via Brevo");
  }
};






dotenv.config(); // Load environment variables

// DEBUG: check if env variables are loaded
console.log('BREVO_API_KEY loaded:', process.env.BREVO_API_KEY ? true : false);
console.log('EMAIL_USER loaded:', process.env.EMAIL_USER ? true : false);
console.log('RECEIVER_EMAIL loaded:', process.env.RECEIVER_EMAIL ? true : false);
console.log('PORT loaded:', process.env.PORT ? true : false);

const app = express();
const port = process.env.PORT || 3000;

// Enable CORS for GitHub Pages frontend
const allowedOrigins = ['https://alkhooryengineering.github.io'];

app.use(cors({
  origin: function (origin, callback) {
    console.log('Request origin:', origin); // optional debug
    if (!origin || allowedOrigins.includes(origin)) {
      callback(null, true);
    } else {
      callback(new Error('Not allowed by CORS'));
    }
  },
  methods: ['GET','POST'],
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

    // Generate dynamic PDF filename
    const now = new Date();
    const dateStr = now.toISOString().split('T')[0]; // e.g., "2025-07-26"
    const pdfFileName = `ake_${dateStr}.pdf`;

    const attachments = [
      {
        filename: pdfFileName,
        content: pdfFile.buffer,
      },
      ...imageFiles.map(file => ({
        filename: file.originalname,
        content: file.buffer,
      }))
    ];

    // Extract and filter relevant fields
    let fields = [];

    if (req.body.material_phase && req.body.material) {
      // Heuristically it's a MATERIAL form
      fields = [
        { label: 'Material Phase:', value: req.body.material_phase },
        { label: 'Company:', value: req.body.company },
        { label: 'AKE Department:', value: req.body.akeDepartment || req.body.otherDepartment },
        { label: 'Material:', value: req.body.material },
        { label: 'Quantity:', value: req.body.Quantity },
        { label: 'Date & Time:', value: req.body.date_field },
      ];
    } else {
      // Assume VEHICLE form
      fields = [
        { label: 'Trip Phase', value: req.body.trip_phase === 'start' ? 'Trip Start' : (req.body.trip_phase === 'end' ? 'Trip End' : '') },
        { label: 'Vehicle', value: req.body.vehicle },
        { label: 'Odometer', value: req.body.odometer },
        { label: 'Job Card', value: req.body.Job_Card || 'N/A' },
        { label: 'AKE Department', value: req.body.ake_department || req.body.other_department },
        { label: 'Reason of Trip', value: req.body.reason_of_trip },
        { label: 'Date & Time', value: req.body.date_field },
        { label: 'Driver Name', value: req.body.driver_name }
      ];
    }

    const filledFields = fields.filter(f => f.value && f.value.trim() !== '');

    let htmlContent = '';
    if (filledFields.length > 0) {
      htmlContent = '<p>' + filledFields.map(field => `${field.label}: ${field.value}`).join('<br>') + '</p>';
    }

    const subject = filledFields.length > 0
      ? (req.body.driver_name || 'Driver Name')
      : 'new form submitted';

    const mailOptions = {
      from: `${displayName || 'AKE Vehicle Form'} <${process.env.EMAIL_USER}>`,
      to: process.env.RECEIVER_EMAIL,
      subject,
      html: htmlContent,
      attachments,
    };


    
    await sendEmailViaBrevo({
  fromName: displayName || "AKE Vehicle Form",
  subject,
  html: htmlContent,
  attachments: attachments.map(file => ({
    filename: file.filename,
    content: file.content.toString('base64') // Convert buffer → base64 string
  })),
});



    
    res.status(200).send('Email sent successfully');

  } catch (error) {
    console.error('Email sending failed:', error);
    res.status(500).send('Email sending failed');
  }
});



app.get("/test-brevo", async (req, res) => {
  try {
    const response = await fetch("https://api.brevo.com/v3/account", {
      headers: { "api-key": process.env.BREVO_API_KEY },
    });
    const data = await response.json();
    res.json(data);
  } catch (err) {
    res.status(500).send(err.message);
  }
});








// Start server
app.listen(port, () => {
  console.log(`Server is running on port ${port}`);
});


