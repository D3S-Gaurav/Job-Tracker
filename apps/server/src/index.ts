import express from 'express';
import cors from 'cors';
import morgan from 'morgan';
import helmet from 'helmet';
import cookieParser from 'cookie-parser';
import dotenv from 'dotenv';

// Load environment variables first
dotenv.config();

// Routes
import authRoutes from './routes/auth.routes';
import jobRoutes from './routes/job.routes';
import adminRoutes from './routes/admin.routes';

// Middleware
import { errorHandler } from './middleware/error.middleware';
import { requestId, securityHeaders, sanitizeInput } from './middleware/common.middleware';
import { generalLimiter } from './middleware/rateLimiter.middleware';

const app = express();
const port = process.env.PORT || 4000;

// ─── Global Middleware ──────────────────────────────────────────────────────

// Request ID for traceability
app.use(requestId);

// Security
app.use(helmet());
app.use(securityHeaders);

// CORS (allow frontend origin)
const allowedOrigins = (process.env.CORS_ORIGINS || 'http://localhost:3000').split(',');
app.use(cors({
    origin: (origin, callback) => {
        // Allow requests with no origin (like mobile apps, curl, etc.)
        if (!origin) return callback(null, true);
        if (allowedOrigins.includes(origin)) {
            return callback(null, true);
        }
        return callback(new Error('Not allowed by CORS'));
    },
    credentials: true,
}));

// Rate limiting
app.use(generalLimiter);

// Body parsing & XSS protection
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));
app.use(cookieParser());
app.use(sanitizeInput);

// Logging
app.use(morgan(process.env.NODE_ENV === 'production' ? 'combined' : 'dev'));

// ─── API Routes ─────────────────────────────────────────────────────────────
app.use('/api/auth', authRoutes);
app.use('/api/jobs', jobRoutes);
app.use('/api/admin', adminRoutes);

// ─── Health Check ───────────────────────────────────────────────────────────
app.get('/', (_req, res) => {
    res.json({
        success: true,
        data: {
            service: 'Job Tracker API',
            version: '2.0.0',
            status: 'OPERATIONAL',
            timestamp: new Date().toISOString(),
            environment: process.env.NODE_ENV || 'development',
        },
    });
});

app.get('/api/health', (_req, res) => {
    res.json({
        success: true,
        data: {
            uptime: process.uptime(),
            timestamp: new Date().toISOString(),
            memory: process.memoryUsage(),
        },
    });
});

// ─── 404 Handler ────────────────────────────────────────────────────────────
app.use((_req, res) => {
    res.status(404).json({
        success: false,
        error: {
            code: 'NOT_FOUND',
            message: 'The requested endpoint does not exist',
        },
    });
});

// ─── Global Error Handler (must be last) ────────────────────────────────────
app.use(errorHandler);

// ─── Start Server ───────────────────────────────────────────────────────────
app.listen(port, () => {
    console.log(`\n🚀 Job Tracker API v2.0.0`);
    console.log(`   ├─ Port: ${port}`);
    console.log(`   ├─ Environment: ${process.env.NODE_ENV || 'development'}`);
    console.log(`   ├─ CORS: ${allowedOrigins.join(', ')}`);
    console.log(`   └─ Ready at: http://localhost:${port}\n`);
});

export default app;
