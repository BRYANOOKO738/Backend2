const express = require("express");
const con = require("./db");
const router = express.Router();
const bcrypt = require("bcrypt");

// Register end point
router.post('/register', (req, res) => {
  const { Firstname, Lastname, Password, email } = req.body;
  
  // Check if all fields are provided
  if (!Firstname || !Lastname || !email || !Password) {
    return res.status(400).json({ error: 'All fields are required' });
  }

  const checkEmailSql = 'SELECT * FROM users WHERE email = ?';
  con.query(checkEmailSql, [email], async (err, results) => {
    if (err) {
      console.error('Error checking email:', err);
      return res.status(500).json({ error: 'Server error' });
    }

    if (results.length > 0) {
      return res.status(400).json({ error: 'User is already registered' });
    }

    try {
      const hash = await bcrypt.hash(Password, 10);
      const sql = 'INSERT INTO users(Firstname,Lastname,Password, email) VALUES (?, ?, ?, ?)';
      
      con.query(sql, [Firstname, Lastname, hash, email], (err, result) => {
        if (err) {
          console.error('Error while inserting:', err);
          return res.status(500).json({ error: 'Error while inserting' });
        } else {
          res.status(200).json({ message: 'Registered successfully' });
        }
      });
    } catch (error) {
      console.error('Error hashing password:', error);
      res.status(500).json({ error: 'Server error' });
    }
  });
});

// Login endpoint
router.post('/Login', async (req, res) => {
    const { email, Password } = req.body;

    if (!email || !Password) {
        return res.status(400).json({ error: 'Email and Password are required' });
    }

    const sql = 'SELECT * FROM users WHERE email = ?';
    con.query(sql, [email], async (err, result) => {
        if (err || result.length === 0) {
            return res.status(404).json({ error: 'Invalid credentials' });
        }
        
        try {
            const user = result[0];
            const match = await bcrypt.compare(Password, user.Password);
            if (match) {
                res.json({ message: `You have logged in successfully as: ${user.firstname}, ${user.email}` });
            } else {
                res.status(404).json({ error: 'Invalid credentials' });
          }
          console.log('Password received:', req.body.password); // Log password received from the frontend

        } catch (error) {
            console.error('Error comparing passwords:', error);
            res.status(500).json({ error: 'Server error' });
        }
    });
});


// Route to book a visit to a residency
router.post('/bookVisit/:id', async (req, res) => {
    const { email, date } = req.body;
    const { id } = req.params;

    try {
        // Check if the user has already booked this residency
        const sql='SELECT bookedVisits FROM users WHERE email = ?'
        con.query(sql, [email], (err, results) => {
            if (err) throw err;

            let bookedVisits = results[0]?.bookedVisits ? JSON.stringify(results[0].bookedVisits) : [];

            if (bookedVisits.some(visit => visit.id === id)) {
                return res.status(400).json({ message: "This residency is already booked by you" });
            }

            // If not already booked, add the new booking
            bookedVisits.push({ id, date });

            con.query('UPDATE users SET bookedVisits = ? WHERE email = ?', [JSON.parse(bookedVisits), email], (err, updateResult) => {
                if (err) throw err;

                res.send("Your visit is booked successfully");
            });
        });
    } catch (err) {
        res.status(500).send('Error while booking the visit');
        console.error(err.message);
    }
});

router.post('/getAllBookedVisits', (req, res) => {
    const { email } = req.body; // Assuming you are sending email as a query parameter in a GET request.
    
    const sql = 'SELECT bookedVisits FROM users WHERE email = ?';
    
    try {
        con.query(sql, [email], (err, result) => {
            if (err) {
                console.error('Error while fetching result:', err);
                return res.status(500).send('Encountered some error');
            }
            res.status(200).json(result[0] || 'Bookings not found');
        });
    } catch (error) {
        console.error('Unexpected error:', error);
        res.status(500).send('An unexpected error occurred');
    }
});

router.post('/cancelBooking/:id',async (req, res) => {
  const { email } = req.body;
  const { id } = req.params;

  try {
    // Fetch bookedVisits for the user with the given email
    const [userRows] = await con.execute(
      'SELECT bookedVisits FROM users WHERE email = ?',
      [email]
    );

    if (userRows.length === 0) {
      return res.status(404).json({ message: "User not found" });
    }

    // Parse the bookedVisits JSON data
    let bookedVisits = JSON.parse(userRows[0].bookedVisits);

    // Find the index of the booking to be canceled
    const index = bookedVisits.findIndex(visit => visit.id === id);

    if (index === -1) {
      return res.status(404).json({ message: "Booking not found" });
    }

    // Remove the booking from the array
    bookedVisits.splice(index, 1);

    // Update the user's bookedVisits in the database
    await con.execute(
      'UPDATE users SET bookedVisits = ? WHERE email = ?',
      [JSON.stringify(bookedVisits), email]
    );

    res.send("Booking cancelled successfully");
  } catch (err) {
    res.status(500).json({ message: 'An error occurred while cancelling the booking' });
  }
});

router.post('/toFav/:rid', async (req, res) => {
  const { email } = req.body;
  const { rid } = req.params;

  try {
    // Fetch the user by email
    con.query('SELECT favResidenciesID FROM users WHERE email = ?', [email], (err, userRows) => {
      if (err) {
        return res.status(500).json({ message: 'Database query error' });
      }
      
      if (userRows.length === 0) {
        return res.status(404).json({ message: "User not found" });
      }

      // Parse favResidenciesID JSON
      let favResidenciesID = JSON.parse(userRows[0].favResidenciesID);

      if (favResidenciesID.includes(rid)) {
        // Remove the residency ID from favorites
        favResidenciesID = favResidenciesID.filter(id => id !== rid);
        con.query('UPDATE users SET favResidenciesID = ? WHERE email = ?', [JSON.stringify(favResidenciesID), email], (err) => {
          if (err) {
            return res.status(500).json({ message: 'Error updating favorites' });
          }
          res.send({ message: "Removed from favorites", user: { favResidenciesID } });
        });
      } else {
        // Add the residency ID to favorites
        favResidenciesID.push(rid);
        con.query('UPDATE users SET favResidenciesID = ? WHERE email = ?', [JSON.stringify(favResidenciesID), email], (err) => {
          if (err) {
            return res.status(500).json({ message: 'Error updating favorites' });
          }
          res.send({ message: "Updated favorites", user: { favResidenciesID } });
        });
      }
    });
  } catch (err) {
    res.status(500).json({ message: 'An error occurred while updating favorites' });
  }
});

module.exports = router;

