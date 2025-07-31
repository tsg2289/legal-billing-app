/**
 * Simple request logging middleware
 */
export function requestLogger(req, res, next) {
  const start = Date.now();
  
  // Log request
  console.log(`📥 ${req.method} ${req.path} - ${new Date().toISOString()}`);
  
  // Log response
  res.on('finish', () => {
    const duration = Date.now() - start;
    const status = res.statusCode;
    const statusEmoji = status >= 200 && status < 300 ? '✅' : 
                       status >= 400 && status < 500 ? '⚠️' : '❌';
    
    console.log(`${statusEmoji} ${req.method} ${req.path} - ${status} (${duration}ms)`);
  });
  
  next();
}

/**
 * Error logging middleware
 */
export function errorLogger(err, req, res, next) {
  console.error('❌ Error:', {
    method: req.method,
    path: req.path,
    error: err.message,
    stack: process.env.NODE_ENV === 'development' ? err.stack : undefined,
    timestamp: new Date().toISOString()
  });
  
  next(err);
} 