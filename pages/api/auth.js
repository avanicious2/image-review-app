// pages/api/auth.js
import db from '../../lib/db';

export default async function handler(req, res) {
  console.log('=== Auth API Started ===');
  console.log('Request Method:', req.method);
  console.log('Request Headers:', JSON.stringify(req.headers, null, 2));
  console.log('Request Body:', JSON.stringify(req.body, null, 2));
  console.log('Environment Check:', {
    hasDbHost: !!process.env.DB_HOST,
    hasDbPort: !!process.env.DB_PORT,
    hasDbName: !!process.env.DB_NAME,
    hasDbUser: !!process.env.DB_USER,
    hasDbPassword: !!process.env.DB_PASSWORD,
    dbHost: process.env.DB_HOST,
    dbPort: process.env.DB_PORT,
    dbName: process.env.DB_NAME
  });
  
  if (req.method !== 'POST') {
    console.log('Invalid method attempted:', req.method);
    return res.status(405).json({ 
      message: 'Method not allowed',
      method: req.method 
    });
  }

  const { email, password } = req.body;
  
  if (!email || !password) {
    console.log('Missing credentials:', { 
      hasEmail: !!email, 
      hasPassword: !!password 
    });
    return res.status(400).json({ 
      error: 'Missing credentials',
      details: {
        email: !!email,
        password: !!password
      }
    });
  }

  console.log('Attempting authentication for email:', email);

  try {
    console.log('Database connection config:', {
      host: process.env.DB_HOST,
      port: process.env.DB_PORT,
      database: process.env.DB_NAME,
      user: process.env.DB_USER,
      hasPassword: !!process.env.DB_PASSWORD,
      ssl: {
        rejectUnauthorized: false
      }
    });

    const query = 'SELECT * FROM user_identities WHERE email = ? AND password = ?';
    console.log('Executing query:', query);
    console.log('Query parameters:', [email, '****']);

    const results = await db.query(query, [email, password]);
    console.log('Query execution completed');
    console.log('Results type:', typeof results);
    console.log('Results length:', results ? results.length : 'null');
    console.log('Raw results:', JSON.stringify(results, null, 2));
    
    if (!results || results.length === 0) {
      console.log('Authentication failed - No matching credentials found');
      console.log('=== Auth API Ended (Failed) ===');
      return res.status(401).json({ 
        error: 'Invalid credentials',
        details: 'No matching user found'
      });
    }

    console.log('Authentication successful');
    console.log('User details:', JSON.stringify(results[0], null, 2));
    
    try {
      await db.end();
      console.log('Database connection closed successfully');
    } catch (dbError) {
      console.error('Error closing database connection:', dbError);
    }

    console.log('=== Auth API Ended (Success) ===');
    return res.status(200).json(results[0]);

  } catch (error) {
    console.error('=== Auth API Error ===');
    console.error('Error type:', error.constructor.name);
    console.error('Error message:', error.message);
    console.error('Error stack:', error.stack);
    console.error('Error code:', error.code);
    console.error('Error state:', error.state);
    console.error('Full error object:', JSON.stringify(error, Object.getOwnPropertyNames(error), 2));
    
    try {
      await db.end();
      console.log('Database connection closed after error');
    } catch (dbError) {
      console.error('Error closing database connection:', dbError);
    }

    console.log('=== Auth API Ended (Error) ===');
    return res.status(500).json({ 
      error: 'Authentication failed',
      details: error.message,
      code: error.code,
      state: error.state
    });
  }
}