import { z } from 'zod';

// Auth schemas
export const registerSchema = z.object({
  name: z.string().min(2, 'Name must be at least 2 characters').max(50),
  email: z.string().email('Invalid email address'),
  password: z.string().min(6, 'Password must be at least 6 characters').max(100),
});

export const loginSchema = z.object({
  email: z.string().email('Invalid email address'),
  password: z.string().min(1, 'Password is required'),
});

export const changePasswordSchema = z.object({
  currentPassword: z.string().min(1, 'Current password is required'),
  newPassword: z.string().min(6, 'New password must be at least 6 characters').max(100),
});

// Trip schemas
export const tripSchema = z.object({
  startName: z.string().min(1, 'Start location is required').max(100),
  endName: z.string().min(1, 'End location is required').max(100),
  startLon: z.number(),
  startLat: z.number(),
  endLon: z.number(),
  endLat: z.number(),
  distanceKm: z.number().min(0),
  durationMin: z.number().min(0),
  vehicleType: z.enum(['driving', 'cycling', 'walking']).default('driving'),
  safetyScore: z.number().min(0).max(100).default(0),
  riskLevel: z.enum(['low', 'moderate', 'high']).default('low'),
  routeData: z.any().optional(),
});

// Incident schemas
export const incidentSchema = z.object({
  type: z.string().min(1, 'Incident type is required').max(50),
  lat: z.number().min(-90).max(90),
  lon: z.number().min(-180).max(180),
  description: z.string().max(500).optional(),
  severity: z.enum(['low', 'medium', 'high', 'critical']).default('medium'),
  images: z.array(z.string()).optional(),
});

// User update schema
export const updateProfileSchema = z.object({
  name: z.string().min(2).max(50).optional(),
  photo: z.string().url().optional(),
});

// Pagination schemas
export const paginationSchema = z.object({
  page: z.coerce.number().min(1).default(1),
  limit: z.coerce.number().min(1).max(100).default(20),
});

export const incidentQuerySchema = z.object({
  lat: z.coerce.number().min(-90).max(90).optional(),
  lon: z.coerce.number().min(-180).max(180).optional(),
  radius: z.coerce.number().min(1).max(100).default(10),
  page: z.coerce.number().min(1).default(1),
  limit: z.coerce.number().min(1).max(100).default(50),
});

// API response helpers
export class ApiResponse<T> {
  success: boolean;
  data?: T;
  error?: string;
  message?: string;
  meta?: {
    page?: number;
    limit?: number;
    total?: number;
    pages?: number;
  };

  constructor(data: T, message?: string) {
    this.success = true;
    this.data = data;
    this.message = message;
  }

  static error(message: string): ApiResponse<null> {
    return {
      success: false,
      error: message,
    };
  }

  static paginated<T>(data: T[], page: number, limit: number, total: number): ApiResponse<T[]> {
    const response = new ApiResponse(data);
    response.meta = {
      page,
      limit,
      total,
      pages: Math.ceil(total / limit),
    };
    return response;
  }
}

// Sanitize user object
export const sanitizeUser = (user: any) => {
  const { passwordHash, loginAttempts, lockedUntil, ...safe } = user;
  return safe;
};

// Validate middleware factory
export const validate = (schema: z.ZodSchema) => {
  return (req: any, res: any, next: any) => {
    try {
      req.validated = schema.parse(req.body);
      next();
    } catch (error) {
      if (error instanceof z.ZodError) {
        return res.status(400).json({
          error: 'Validation failed',
          details: error.errors.map(e => ({
            field: e.path.join('.'),
            message: e.message,
          })),
        });
      }
      next(error);
    }
  };
};