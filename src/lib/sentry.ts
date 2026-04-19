import * as Sentry from '@sentry/node';
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

Sentry.init({
  dsn: process.env.SENTRY_DSN,
  environment: process.env.NODE_ENV,
  tracesSampleRate: 1.0,
  beforeSend(event) {
    // Filter out some errors in development
    if (process.env.NODE_ENV === 'development') {
      return null;
    }
    return event;
  },
});

// Error handling middleware
export function setupErrorHandling(app: any) {
  app.use(Sentry.Handlers.errorHandler());
  
  app.use((err: any, req: any, res: any, next: any) => {
    const statusCode = err.statusCode || 500;
    
    // Log to database
    prisma.auditLog.create({
      data: {
        action: 'ERROR',
        entityType: 'error',
        entityId: err.message?.substring(0, 100),
        metadata: {
          statusCode,
          stack: err.stack,
          path: req.path,
          method: req.method
        },
        ipAddress: req.ip,
        userAgent: req.headers['user-agent']
      }
    }).catch(console.error);

    res.status(statusCode).json({
      error: process.env.NODE_ENV === 'production' 
        ? 'Internal server error' 
        : err.message
    });
  });
}

export { Sentry, prisma };