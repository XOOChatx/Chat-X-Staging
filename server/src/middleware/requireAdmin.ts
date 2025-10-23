import { Request, Response, NextFunction } from 'express';
import { config } from '../config/env';
import { ErrorResponse } from '../types/auth';

export interface AuthenticatedRequest extends Request {
  isAdmin: boolean;
}

/**
 * 管理员身份验证中间件
 * 检查请求头中的 Authorization: Bearer <ADMIN_TOKEN>
 */
export function requireAdmin(req: AuthenticatedRequest, res: Response, next: NextFunction) {
  const authHeader = req.headers.authorization;
  
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    // 确保无论失败/成功都返回CORS头，避免浏览器拦截
    const origin = req.headers.origin as string | undefined;
    const allowedOrigins = ['https://www.evolution-x.io','https://evolution-x.io','https://frontend-production-56b7.up.railway.app'];
    if (origin && allowedOrigins.includes(origin)) {
      res.header('Access-Control-Allow-Origin', origin);
      res.header('Access-Control-Allow-Credentials', 'true');
      res.header('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
      res.header('Access-Control-Allow-Headers', 'Content-Type, Authorization, X-Requested-With, Accept, Origin');
    }
    const errorResponse: ErrorResponse = {
      ok: false,
      code: 'AUTH_FORBIDDEN',
      message: '缺少授权头或格式错误'
    };
    return res.status(401).json(errorResponse);
  }

  const token = authHeader.slice(7); // 移除 'Bearer ' 前缀
  
  if (token !== config.ADMIN_TOKEN) {
    const origin = req.headers.origin as string | undefined;
    const allowedOrigins = ['https://www.evolution-x.io','https://evolution-x.io','https://frontend-production-56b7.up.railway.app'];
    if (origin && allowedOrigins.includes(origin)) {
      res.header('Access-Control-Allow-Origin', origin);
      res.header('Access-Control-Allow-Credentials', 'true');
      res.header('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
      res.header('Access-Control-Allow-Headers', 'Content-Type, Authorization, X-Requested-With, Accept, Origin');
    }
    const errorResponse: ErrorResponse = {
      ok: false,
      code: 'AUTH_FORBIDDEN',
      message: '无效的管理员令牌'
    };
    return res.status(403).json(errorResponse);
  }

  req.isAdmin = true;
  next();
}
