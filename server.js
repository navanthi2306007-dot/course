const express = require('express');
const sqlite3 = require('sqlite3').verbose();
const cors = require('cors');
const bodyParser = require('body-parser');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const path = require('path');
const fs = require('fs');

const app = express();
const PORT = process.env.PORT || 3000;
const JWT_SECRET = process.env.JWT_SECRET || 'your-secret-key-change-in-production';

// Middleware
app.use(cors());
app.use(bodyParser.json());
app.use(bodyParser.urlencoded({ extended: true }));
app.use(express.static(__dirname));

// Database initialization
const dbPath = path.join(__dirname, 'portal.db');
const db = new sqlite3.Database(dbPath, (err) => {
  if (err) {
    console.error('Error opening database:', err.message);
  } else {
    console.log('Connected to SQLite database');
    initDatabase();
  }
});

// Initialize database tables
function initDatabase() {
  // Registrations table
  db.run(`CREATE TABLE IF NOT EXISTS registrations (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    name TEXT NOT NULL,
    email TEXT NOT NULL,
    phone TEXT,
    program TEXT NOT NULL,
    type TEXT NOT NULL,
    notes TEXT,
    time TEXT NOT NULL,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP
  )`, (err) => {
    if (err) {
      console.error('Error creating registrations table:', err.message);
    } else {
      console.log('Registrations table ready');
    }
  });

  // Users table for admin login
  db.run(`CREATE TABLE IF NOT EXISTS users (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    username TEXT UNIQUE NOT NULL,
    password TEXT NOT NULL,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP
  )`, (err) => {
    if (err) {
      console.error('Error creating users table:', err.message);
    } else {
      // Create default admin user if it doesn't exist
      const defaultPassword = bcrypt.hashSync('admin123', 10);
      db.run(`INSERT OR IGNORE INTO users (username, password) VALUES (?, ?)`, 
        ['admin', defaultPassword], (err) => {
        if (err) {
          console.error('Error creating default admin:', err.message);
        } else {
          console.log('Default admin user created (username: admin, password: admin123)');
        }
      });
    }
  });
}

// JWT authentication middleware
function authenticateToken(req, res, next) {
  const authHeader = req.headers['authorization'];
  const token = authHeader && authHeader.split(' ')[1];

  if (!token) {
    return res.status(401).json({ message: 'Access token required' });
  }

  jwt.verify(token, JWT_SECRET, (err, user) => {
    if (err) {
      return res.status(403).json({ message: 'Invalid or expired token' });
    }
    req.user = user;
    next();
  });
}

// API Routes

// Health check
app.get('/api/health', (req, res) => {
  res.json({ status: 'ok', message: 'Server is running' });
});

// Login endpoint
app.post('/api/login', (req, res) => {
  const { username, password } = req.body;

  if (!username || !password) {
    return res.status(400).json({ message: 'Username and password required' });
  }

  db.get('SELECT * FROM users WHERE username = ?', [username], async (err, user) => {
    if (err) {
      return res.status(500).json({ message: 'Database error' });
    }

    if (!user) {
      return res.status(401).json({ message: 'Invalid username or password' });
    }

    const isValidPassword = await bcrypt.compare(password, user.password);
    if (!isValidPassword) {
      return res.status(401).json({ message: 'Invalid username or password' });
    }

    const token = jwt.sign(
      { id: user.id, username: user.username },
      JWT_SECRET,
      { expiresIn: '24h' }
    );

    res.json({
      message: 'Login successful',
      token: token,
      user: { id: user.id, username: user.username }
    });
  });
});

// Registration endpoint
app.post('/api/register', (req, res) => {
  const { name, email, phone, program, type, notes, time } = req.body;

  // Validation
  if (!name || !email || !program || !type) {
    return res.status(400).json({ 
      message: 'Name, email, program, and type are required' 
    });
  }

  // Email validation
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  if (!emailRegex.test(email)) {
    return res.status(400).json({ message: 'Invalid email format' });
  }

  const registrationTime = time || new Date().toLocaleString();

  db.run(
    `INSERT INTO registrations (name, email, phone, program, type, notes, time)
     VALUES (?, ?, ?, ?, ?, ?, ?)`,
    [name, email, phone || null, program, type, notes || null, registrationTime],
    function(err) {
      if (err) {
        console.error('Registration error:', err.message);
        return res.status(500).json({ message: 'Failed to save registration' });
      }

      res.json({
        message: 'Registration successful',
        id: this.lastID
      });
    }
  );
});

// Get all registrations (admin only)
app.get('/api/registrations', authenticateToken, (req, res) => {
  db.all('SELECT * FROM registrations ORDER BY created_at DESC', [], (err, rows) => {
    if (err) {
      console.error('Error fetching registrations:', err.message);
      return res.status(500).json({ message: 'Failed to fetch registrations' });
    }

    res.json({ registrations: rows });
  });
});

// Get single registration by ID (admin only)
app.get('/api/registrations/:id', authenticateToken, (req, res) => {
  const { id } = req.params;

  db.get('SELECT * FROM registrations WHERE id = ?', [id], (err, row) => {
    if (err) {
      return res.status(500).json({ message: 'Database error' });
    }

    if (!row) {
      return res.status(404).json({ message: 'Registration not found' });
    }

    res.json({ registration: row });
  });
});

// Delete registration (admin only)
app.delete('/api/registrations/:id', authenticateToken, (req, res) => {
  const { id } = req.params;

  db.run('DELETE FROM registrations WHERE id = ?', [id], function(err) {
    if (err) {
      return res.status(500).json({ message: 'Database error' });
    }

    if (this.changes === 0) {
      return res.status(404).json({ message: 'Registration not found' });
    }

    res.json({ message: 'Registration deleted successfully' });
  });
});

// Clear all registrations (admin only)
app.delete('/api/registrations', authenticateToken, (req, res) => {
  db.run('DELETE FROM registrations', function(err) {
    if (err) {
      return res.status(500).json({ message: 'Database error' });
    }

    res.json({ 
      message: 'All registrations cleared successfully',
      deleted: this.changes 
    });
  });
});

// Export registrations as CSV (admin only)
app.get('/api/registrations/export/csv', authenticateToken, (req, res) => {
  db.all('SELECT * FROM registrations ORDER BY created_at DESC', [], (err, rows) => {
    if (err) {
      return res.status(500).json({ message: 'Database error' });
    }

    const headers = ['name', 'email', 'phone', 'program', 'type', 'notes', 'time', 'created_at'];
    const csvLines = [headers.join(',')];

    rows.forEach(row => {
      const line = headers.map(h => {
        const value = String(row[h] || '').replace(/"/g, '""');
        return `"${value}"`;
      }).join(',');
      csvLines.push(line);
    });

    res.setHeader('Content-Type', 'text/csv');
    res.setHeader('Content-Disposition', 'attachment; filename=registrations.csv');
    res.send(csvLines.join('\n'));
  });
});

// Get statistics (admin only)
app.get('/api/stats', authenticateToken, (req, res) => {
  // Aggregation returns a single row; use `db.get` to fetch it directly
  db.get(`
    SELECT 
      COUNT(*) as total,
      SUM(CASE WHEN type = 'course' THEN 1 ELSE 0 END) as courses,
      SUM(CASE WHEN type = 'workshop' THEN 1 ELSE 0 END) as workshops,
      COUNT(DISTINCT email) as unique_emails
    FROM registrations
  `, [], (err, row) => {
    if (err) {
      return res.status(500).json({ message: 'Database error' });
    }

    res.json({ stats: row });
  });
});

// Serve the HTML file
app.get('/', (req, res) => {
  // Serve the main frontend file that exists in the project
  res.sendFile(path.join(__dirname, 'navanthi.html'));
});

// Error handling middleware
app.use((err, req, res, next) => {
  console.error('Error:', err);
  res.status(500).json({ message: 'Internal server error' });
});

// Start server
app.listen(PORT, () => {
  console.log(`Server running on http://localhost:${PORT}`);
  console.log(`Default admin credentials: username: admin, password: admin123`);
  console.log(`Change the default password in production!`);
});

// Graceful shutdown
process.on('SIGINT', () => {
  db.close((err) => {
    if (err) {
      console.error('Error closing database:', err.message);
    } else {
      console.log('Database connection closed');
    }
    process.exit(0);
  });
});
