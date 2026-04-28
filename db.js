const mongoose = require('mongoose');

const MONGODB_URI = process.env.MONGODB_URI;

if (!MONGODB_URI) {
  console.error('Error: MONGODB_URI tidak ditemukan di environment variables');
  console.error('Pastikan sudah di-set di Vercel atau file .env');
}

const connectDB = async () => {
  try {
    await mongoose.connect(MONGODB_URI, {
      useNewUrlParser: true,
      useUnifiedTopology: true,
    });
    console.log('✅ MongoDB berhasil terhubung');
  } catch (err) {
    console.error('❌ Gagal konek ke MongoDB:', err.message);
    console.error('Uri yang digunakan:', MONGODB_URI ? 'Uri ada (disembunyikan)' : 'Uri kosong');
  }
};

const mediaSchema = new mongoose.Schema({
  filename: {
    type: String,
    required: true,
    unique: true
  },
  originalName: {
    type: String,
    required: true
  },
  mimeType: {
    type: String,
    required: true
  },
  fileType: {
    type: String,
    enum: ['image', 'video', 'audio', 'file'],
    required: true
  },
  size: {
    type: Number,
    required: true
  },
  url: {
    type: String,
    required: true
  },
  cloudUrl: {
    type: String,
    required: true
  },
  uploadDate: {
    type: Date,
    default: Date.now
  }
});

// Index buat pencarian cepat
mediaSchema.index({ filename: 1 });
mediaSchema.index({ uploadDate: -1 });

const Media = mongoose.model('Media', mediaSchema);

module.exports = { connectDB, Media };
