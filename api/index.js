require('dotenv').config();
const express = require('express');
const multer = require('multer');
const path = require('path');
const { v4: uuidv4 } = require('uuid');
const fs = require('fs');
const { connectDB, Media } = require('../db');

const app = express();
const PORT = process.env.PORT || 3000;

connectDB();

app.set('view engine', 'ejs');
app.set('views', path.join(__dirname, '../views'));
app.use(express.urlencoded({ extended: true }));
app.use(express.static('public'));

const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    const uploadDir = path.join(__dirname, '../uploads');
    if (!fs.existsSync(uploadDir)) fs.mkdirSync(uploadDir, { recursive: true });
    cb(null, uploadDir);
  },
  filename: (req, file, cb) => {
    const ext = path.extname(file.originalname);
    const uniqueName = `${uuidv4()}${ext}`;
    cb(null, uniqueName);
  }
});

const upload = multer({ storage, limits: { fileSize: 100 * 1024 * 1024 } });

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
    const baseUrl = process.env.BASE_URL || `http://localhost:${PORT}`;
    const fileUrl = `${baseUrl}/f/${file.filename}`;

    const mediaDoc = new Media({
      filename: file.filename,
      originalName: file.originalname,
      mimeType: file.mimetype,
      fileType: fileType,
      size: file.size,
      url: fileUrl
    });

    await mediaDoc.save();

    res.redirect(`/upload/${mediaDoc._id}`);
  } catch (err) {
    console.error(err);
    res.status(500).send('Gagal upload file');
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

    const filePath = path.join(__dirname, '../uploads', filename);
    if (!fs.existsSync(filePath)) return res.status(404).send('File fisik tidak ada');

    res.render('file', {
      media,
      fileUrl: `${process.env.BASE_URL || `http://localhost:${PORT}`}/f/${filename}`,
      filePath: `/raw/${filename}`
    });
  } catch (err) {
    res.status(500).send('Error');
  }
});

app.get('/raw/:filename', async (req, res) => {
  const filePath = path.join(__dirname, '../uploads', req.params.filename);
  if (!fs.existsSync(filePath)) return res.status(404).send('File not found');
  res.sendFile(filePath);
});

app.get('/download/:filename', async (req, res) => {
  const filePath = path.join(__dirname, '../uploads', req.params.filename);
  if (!fs.existsSync(filePath)) return res.status(404).send('File not found');
  
  const media = await Media.findOne({ filename: req.params.filename });
  const originalName = media ? media.originalName : req.params.filename;
  res.download(filePath, originalName);
});

app.listen(PORT, () => {
  console.log(`Server running on http://localhost:${PORT}`);
});

module.exports = app;
