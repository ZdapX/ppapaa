require('dotenv').config();
const express = require('express');
const multer = require('multer');
const path = require('path');
const { v4: uuidv4 } = require('uuid');
const { connectDB, Media } = require('../db');
const cloudinary = require('cloudinary').v2;

// Cloudinary config (isi di .env)
cloudinary.config({
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
  api_key: process.env.CLOUDINARY_API_KEY,
  api_secret: process.env.CLOUDINARY_API_SECRET
});

const app = express();
const PORT = process.env.PORT || 3000;

connectDB();

app.set('view engine', 'ejs');
app.set('views', path.join(__dirname, '../views'));
app.use(express.urlencoded({ extended: true }));

// Pake memory storage (nggak nyentuh disk)
const storage = multer.memoryStorage();
const upload = multer({ 
  storage, 
  limits: { fileSize: 50 * 1024 * 1024 } // 50MB max
});

const getFileType = (mime) => {
  if (mime.startsWith('image/')) return 'image';
  if (mime.startsWith('video/')) return 'video';
  if (mime.startsWith('audio/')) return 'audio';
  return 'file';
};

app.get('/', (req, res) => {
  res.render('index');
});

app.post('/upload', upload.single('media'), async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).send('Tidak ada file yang diupload');
    }

    const file = req.file;
    const fileType = getFileType(file.mimetype);
    
    // Upload ke Cloudinary
    const uploadPromise = new Promise((resolve, reject) => {
      const uploadStream = cloudinary.uploader.upload_stream(
        {
          resource_type: 'auto',
          public_id: `${uuidv4()}`,
          folder: 'media_to_url'
        },
        (error, result) => {
          if (error) reject(error);
          else resolve(result);
        }
      );
      uploadStream.end(file.buffer);
    });

    const cloudResult = await uploadPromise;
    const baseUrl = process.env.BASE_URL || `http://localhost:${PORT}`;
    const fileUrl = `${baseUrl}/f/${cloudResult.public_id}`;

    const mediaDoc = new Media({
      filename: cloudResult.public_id,
      originalName: file.originalname,
      mimeType: file.mimetype,
      fileType: fileType,
      size: file.size,
      url: fileUrl,
      cloudUrl: cloudResult.secure_url
    });

    await mediaDoc.save();

    res.redirect(`/upload/${mediaDoc._id}`);
  } catch (err) {
    console.error(err);
    res.status(500).send(`Upload gagal: ${err.message}`);
  }
});

app.get('/upload/:id', async (req, res) => {
  try {
    const media = await Media.findById(req.params.id);
    if (!media) return res.status(404).send('File tidak ditemukan');
    res.render('upload', { media, baseUrl: process.env.BASE_URL || `http://localhost:${PORT}` });
  } catch (err) {
    res.status(500).send('Error');
  }
});

app.get('/f/:filename', async (req, res) => {
  try {
    const { filename } = req.params;
    const media = await Media.findOne({ filename });

    if (!media) return res.status(404).send('File tidak ditemukan');

    res.render('file', {
      media,
      fileUrl: media.cloudUrl,
      rawUrl: media.cloudUrl
    });
  } catch (err) {
    res.status(500).send('Error');
  }
});

app.get('/download/:filename', async (req, res) => {
  try {
    const media = await Media.findOne({ filename: req.params.filename });
    if (!media) return res.status(404).send('File not found');
    
    // Redirect ke Cloudinary dengan flag download
    const downloadUrl = media.cloudUrl.replace('/upload/', '/upload/fl_attachment/');
    res.redirect(downloadUrl);
  } catch (err) {
    res.status(500).send('Error');
  }
});

app.listen(PORT, () => {
  console.log(`Server running on http://localhost:${PORT}`);
});

module.exports = app;
