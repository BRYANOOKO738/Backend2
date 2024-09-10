const express = require("express");
const mysql = require("mysql2");
const dotenv = require("dotenv");
const bcrypt = require("bcrypt");
const cors = require('cors');
const con = require("./routes/db");
const UserRoute = require('./routes/Users')
const ResidencyRoute=require('./routes/Residency')

dotenv.config();
const PORT =process.env.port
const app = express();

app.use(express.json());
app.use(cors());

app.use('/routes/Users', UserRoute)
app.use('/routes/Residency',ResidencyRoute)

app.listen(PORT, () => {
    console.log(`Server running on port ${PORT}`)
})
