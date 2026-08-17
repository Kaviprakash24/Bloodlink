// Global Error Handler Middleware
export const notFound = (req, res, next) => {
    const error = new Error(`Not Found - ${req.originalUrl}`);
    res.status(404);
    next(error);
};

export const errorHandler = (err, req, res, next) => {
    // If status code is 200 but we're in the error handler, set it to 500
    let statusCode = res.statusCode === 200 ? 500 : res.statusCode;
    
    // Prevent sensitive database error codes from returning 500 when they shouldn't
    let message = err.message;
    
    // Check for Mongoose bad ObjectId
    if (err.name === 'CastError' && err.kind === 'ObjectId') {
        statusCode = 404;
        message = 'Resource not found';
    }

    // Check for MongoDB Duplicate Key
    if (err.code === 11000) {
        statusCode = 409;
        message = 'Duplicate field value entered';
    }

    // Do NOT expose stack traces in production
    res.status(statusCode).json({
        message,
        stack: process.env.NODE_ENV === 'production' ? null : err.stack,
    });
};
