export const registerSchema = {
  parse: (data: any) => data,
};

export const loginSchema = {
  parse: (data: any) => data,
};

export const changePasswordSchema = {
  parse: (data: any) => data,
};

export const tripSchema = {
  parse: (data: any) => data,
};

export const incidentSchema = {
  parse: (data: any) => data,
};

export const updateProfileSchema = {
  parse: (data: any) => data,
};

export const paginationSchema = {
  parse: (data: any) => data,
};

export const incidentQuerySchema = {
  parse: (data: any) => data,
};

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

export const sanitizeUser = (user: any) => {
  const { passwordHash, loginAttempts, lockedUntil, ...safe } = user;
  return safe;
};

export const validate = (_schema: any) => {
  return (_req: any, _res: any, next: any) => {
    next();
  };
};