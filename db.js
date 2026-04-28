const mongoose = require('mongoose');

const MONGODB_URI = process.env.MONGODB_URI;

if (!MONGODB_URI) {
  console.error('MONGODB_URI tidak ditemukan di .env');
}

const connectDB = async () => {
  try {
    await mongoose.connect(MONGODB_URI);
    console.log('MongoDB terhubung');
  } catch (err) {
    console.error('Gagal konek MongoDB:', err.message);
  }
};

const mediaSchema = new mongoose.Schema({
  filename: String,
  originalName: String,
  mimeType: String,
  fileType: String, // image, video, audio, file
  size: Number,
  url: String,
  uploadDate: { type: Date, default: Date.now }
});

const Media = mongoose.model('Media', mediaSchema);

module.exports = { connectDB, Media };
