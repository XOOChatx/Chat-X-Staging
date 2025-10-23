import { CorsOptions } from 'cors';

/**
 * Allowed origins shared between HTTP and WebSocket.
 * Add all domains where your frontend or admin dashboard may run.
 */
export const ALLOWED_ORIGINS = [
  'https://frontend-production-56b7.up.railway.app',
  'https://www.evolution-x.io',
  'https://evolution-x.io', // 🔥 Added without www subdomain
  'http://localhost:3000',
  'https://localhost:3000',
  'http://localhost:3001',
  'https://localhost:3001',
];

/**
 * Express CORS configuration.
 * ✅ Handles dynamic origin checking
 * ✅ Always responds to preflight (OPTIONS) requests
 * ✅ Supports cookies and credentials
 */
export const corsOptions: CorsOptions = {
  origin: (origin, callback) => {
    // Allow requests with no origin (e.g. curl, server-to-server)
    if (!origin) return callback(null, true);

    console.log('🌐 CORS检查来源:', origin);
    const isAllowed = ALLOWED_ORIGINS.includes(origin);

    if (isAllowed) {
      console.log('✅ CORS允许:', origin);
      callback(null, true);
    } else {
      console.warn('❌ CORS拒绝来源:', origin);
      callback(new Error('Not allowed by CORS'));
    }
  },
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS', 'PATCH'],
  allowedHeaders: [
    'Content-Type',
    'Authorization',
    'X-Requested-With',
    'Accept',
    'Origin',
    'Access-Control-Request-Method',
    'Access-Control-Request-Headers'
  ],
  exposedHeaders: ['X-Request-Id'],
  optionsSuccessStatus: 200,
};
