const express = require("express");
const con = require("./db");
const multer = require("multer");
const fs = require("fs").promises;
const path = require("path");

const router = express.Router();

const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, 'uploads/');
  },
  filename: (req, file, cb) => {
    cb(null, `${Date.now()}-${file.originalname}`);
  },
});

const upload = multer({ 
  storage: storage,
  limits: { fileSize: 5 * 1024 * 1024 }, // 5MB file size limit
  fileFilter: (req, file, cb) => {
    const allowedTypes = ['image/jpeg', 'image/png', 'image/gif'];
    if (allowedTypes.includes(file.mimetype)) {
      cb(null, true);
    } else {
      cb(new Error('Invalid file type. Only JPEG, PNG and GIF are allowed.'));
    }
  }
});

router.post('/add-residency', upload.single('image'), async (req, res) => {
  try {
    const { title, description, price, country, city, address, facilities, userEmail } = req.body;
    const image = req.file;

    if (!image) {
      return res.status(400).json({ message: 'No file uploaded' });
    }

    const sql = 'INSERT INTO residency (title, description, price, address, city, country, image, facilities, userEmail) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)';
    const values = [title, description, price, address, city, country, image.filename, JSON.stringify(facilities), userEmail];

    const [result] = await con.promise().query(sql, values);

    res.status(200).json({ message: 'Residence created successfully', id: result.insertId });

  } catch (error) {
    console.error('Error adding property:', error);
    res.status(500).json({ message: 'An error occurred while processing your request' });
  }
});

router.get('/getresidency', async (req, res) => {
  try {
    const [rows] = await con.promise().query('SELECT * FROM residency');
    res.status(200).json(rows);
  } catch (error) {
    console.error('Error fetching residencies:', error);
    res.status(500).json({ message: 'An error occurred while fetching data' });
  }
});

router.get('/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const [rows] = await con.promise().query('SELECT * FROM residency WHERE id = ?', [id]);
    
    if (rows.length === 0) {
      return res.status(404).json({ message: 'Residency not found' });
    }
    
    res.status(200).json(rows[0]);
  } catch (error) {
    console.error('Error fetching residency:', error);
    res.status(500).json({ message: 'An error occurred while fetching data' });
  }
});

module.exports = router;