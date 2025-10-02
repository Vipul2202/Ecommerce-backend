const nodemailer = require('nodemailer');

// Enhanced logging function
const logEmail = (level, message, data = null) => {
  const timestamp = new Date().toISOString();
  console.log(`[${timestamp}] [EMAIL-${level}] ${message}`);
  if (data) {
    console.log(`[${timestamp}] [EMAIL-${level}] Data:`, JSON.stringify(data, null, 2));
  }
};

// Create multiple transporter configurations for DigitalOcean compatibility
const createTransporter = async () => {
  logEmail('INFO', 'Creating email transporter...');
  
  // Get credentials
  const emailUser = process.env.EMAIL_USER;
  const emailPass = process.env.EMAIL_PASS;
  
  logEmail('INFO', 'Email credentials check:', {
    user: emailUser ? `${emailUser.substring(0, 3)}***@${emailUser.split('@')[1]}` : 'NOT SET',
    pass: emailPass ? `***${emailPass.slice(-4)}` : 'NOT SET',
    isZoho: emailUser && emailUser.includes('@zoho.com')
  });

  // Zoho Mail Configuration (Primary - Port 465 with SSL)
  const zohoConfig = {
    host: 'smtp.zoho.com.au', // Updated from your config
    port: 465,
    secure: true, // SSL
    auth: {
      user: emailUser || 'carsaloonperth@gmail.com',
      pass: emailPass || 'bftoktcwzyknaura',
    },
    connectionTimeout: 20000,
    greetingTimeout: 10000,
    socketTimeout: 20000,
    tls: {
      rejectUnauthorized: false
    },
    debug: true, // Enable debug logging
    logger: true  // Enable logger
  };

  // Zoho Mail Port 587 (STARTTLS)
  const zohoPort587Config = {
    host: 'smtp.zoho.com.au', // Updated from your config
    port: 587,
    secure: false, // STARTTLS
    auth: {
      user: emailUser || 'carsaloonperth@gmail.com',
      pass: emailPass || 'bftoktcwzyknaura',
    },
    connectionTimeout: 20000,
    greetingTimeout: 10000,
    socketTimeout: 20000,
    tls: {
      rejectUnauthorized: false
    },
    debug: true,
    logger: true
  };

  // Zoho Mail Alternative Port (2525 - Often not blocked)
  const zohoAlternativeConfig = {
    host: 'smtp.zoho.com.au', // Updated from your config
    port: 2525,
    secure: false, // STARTTLS
    auth: {
      user: emailUser || 'carsaloonperth@gmail.com',
      pass: emailPass || 'bftoktcwzyknaura',
    },
    connectionTimeout: 20000,
    greetingTimeout: 10000,
    socketTimeout: 20000,
    tls: {
      rejectUnauthorized: false,
      ciphers: 'SSLv3'
    },
    debug: true,
    logger: true
  };

  // Gmail Configuration (Fallback)
  const gmailConfig = {
    service: 'gmail',
    auth: {
      user: emailUser || 'carsaloonperth@gmail.com',
      pass: emailPass || 'bftoktcwzyknaura',
    },
    connectionTimeout: 30000,
    greetingTimeout: 15000,
    socketTimeout: 30000,
    pool: true,
    maxConnections: 3,
    maxMessages: 50,
    rateDelta: 10000,
    rateLimit: 3,
    secure: true,
    port: 465,
    tls: {
      rejectUnauthorized: false
    },
    debug: true,
    logger: true
  };

  // Try configurations in order of preference
  const configs = [
    { name: 'Zoho Mail SSL (smtp.zoho.com.au:465)', config: zohoConfig },
    { name: 'Zoho Mail STARTTLS (smtp.zoho.com.au:587)', config: zohoPort587Config },
    { name: 'Zoho Mail Alternative (smtp.zoho.com.au:2525)', config: zohoAlternativeConfig },
    { name: 'Gmail SMTP (Fallback)', config: gmailConfig }
  ];
  
  for (let i = 0; i < configs.length; i++) {
    const { name, config } = configs[i];
    logEmail('INFO', `Trying configuration ${i + 1}/${configs.length}: ${name}`);
    
    try {
      const transporter = nodemailer.createTransport(config);
      
      // Add event listeners for detailed logging
      transporter.on('token', token => {
        logEmail('DEBUG', 'SMTP Token received:', token);
      });
      
      transporter.on('idle', () => {
        logEmail('DEBUG', 'SMTP Connection is idle');
      });
      
      transporter.on('error', error => {
        logEmail('ERROR', 'SMTP Connection error:', error);
      });
      
      // Test the connection with detailed logging
      logEmail('INFO', `Testing connection for ${name}...`);
      
      await new Promise((resolve, reject) => {
        transporter.verify((error, success) => {
          if (error) {
            logEmail('ERROR', `${name} verification failed:`, {
              message: error.message,
              code: error.code,
              command: error.command,
              response: error.response,
              responseCode: error.responseCode
            });
            reject(error);
          } else {
            logEmail('SUCCESS', `${name} verification successful!`);
            resolve(success);
          }
        });
      });
      
      logEmail('SUCCESS', `Using ${name} as email transporter`);
      return transporter;
      
    } catch (error) {
      logEmail('ERROR', `${name} failed:`, {
        message: error.message,
        code: error.code,
        stack: error.stack
      });
      continue;
    }
  }
  
  // If all fail, return the first one anyway (will fail gracefully)
  logEmail('WARN', 'All configurations failed, using Zoho SSL as fallback');
  return nodemailer.createTransport(zohoConfig);
};

let transporter;

// Initialize transporter asynchronously
(async () => {
  try {
    transporter = await createTransporter();
    
    // Test the connection with enhanced logging
    logEmail('INFO', 'Testing final transporter connection...');
    transporter.verify((error, success) => {
      if (error) {
        logEmail('ERROR', 'Final transporter verification failed:', {
          message: error.message,
          code: error.code,
          command: error.command,
          response: error.response
        });
      } else {
        logEmail('SUCCESS', 'Final transporter is ready to send messages');
      }
    });
  } catch (error) {
    logEmail('ERROR', 'Failed to create transporter:', error);
    // Fallback to basic Zoho configuration
    transporter = nodemailer.createTransport({
      host: 'smtp.zoho.com.au',
      port: 465,
      secure: true,
      auth: {
        user: process.env.EMAIL_USER || 'info@carsaloon.com.au',
        pass: process.env.EMAIL_PASS || 'kSXwtw5siPqP',
      },
      connectionTimeout: 20000,
      greetingTimeout: 10000,
      socketTimeout: 20000,
      tls: {
        rejectUnauthorized: false
      }
    });
  }
})();

module.exports = transporter;