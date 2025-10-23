import { Router } from "express";
import { requireAdmin } from "../middleware/requireAdmin";
// 使用最终简化版本，解决时序冲突
import { getWaQr, getWaStatus, getConnectedWaSessions, createNewSessionId } from "../services/wa-simple-final.service";
// import { getWaQr, getWaStatus } from "../services/wa.service";

const r = Router();

const ALLOWED_ORIGINS = ['https://www.staging.evolution-x.io','https://staging.evolution-x.io','https://frontend-staging-5ab3.up.railway.app'];

r.use((req: any, res: any, next: any) => {
  const origin = req.headers.origin;
  if (origin && ALLOWED_ORIGINS.includes(origin)) {
    res.header('Access-Control-Allow-Origin', origin);
    res.header('Access-Control-Allow-Credentials', 'true');
    res.header('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
    res.header('Access-Control-Allow-Headers', 'Content-Type, Authorization, X-Requested-With, Accept, Origin');
  }
  if (req.method === 'OPTIONS') return res.sendStatus(200); // preflight handled here
  next();
});

// @ts-ignore
r.get("/login/qr", requireAdmin, async (req: any, res: any) => {
  try {
    const id = String(req.query.sessionId);
    if (!id || id === 'undefined') {
      return res.status(400).json({ 
        ok: false, 
        code: "MISSING_SESSION_ID", 
        message: "必须提供sessionId参数" 
      });
    }
    console.log(`📱 请求WhatsApp QR码: ${id}`);
    
    // 🔒 BULLETPROOF CORS: Set headers directly in response (Railway-proof)
    const origin = req.headers.origin;
    if (origin && ['https://www.staging.evolution-x.io', 'https://staging.evolution-x.io', 'https://frontend-staging-5ab3.up.railway.app'].includes(origin)) {
      res.header('Access-Control-Allow-Origin', origin);
      res.header('Access-Control-Allow-Credentials', 'true');
      res.header('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
      res.header('Access-Control-Allow-Headers', 'Content-Type, Authorization, X-Requested-With, Accept, Origin');
      console.log('🔒 BULLETPROOF CORS: Direct headers set for QR endpoint:', origin);
    }
    
    const dataUrl = await getWaQr(id);
    
    console.log(`🔍 获取到QR数据: ${id}, 有数据: ${!!dataUrl}, 长度: ${dataUrl?.length || 0}`);
    
    if (dataUrl && dataUrl.length > 0) {
      console.log(`✅ 返回WhatsApp QR码: ${id}`);
      
      // Calculate QR expiration info
      const { getWaQr } = require('../services/wa-simple-final.service');
      const qrExpiryKey = `${id}_expires`;
      const qrExpiryTime = (global as any).lastQr?.get?.(qrExpiryKey);
      const remainingTime = qrExpiryTime ? Math.max(0, Math.floor((parseInt(qrExpiryTime) - Date.now()) / 1000)) : 60;
      
      // Add headers to indicate QR is ready and expiration info
      res.header('X-QR-Status', 'ready');
      res.header('X-QR-Expires-In', remainingTime.toString()); // Seconds until expiration
      res.header('X-QR-Refresh-After', '60'); // Suggest checking again after 60 seconds
      res.json({ dataUrl }); // 前端期望的格式
    } else {
      console.log(`⏳ WhatsApp QR码未就绪: ${id}`);
      res.header('X-QR-Status', 'pending');
      res.status(202).json({ pending: true });
    }
  } catch (error: any) {
    console.error("❌ WhatsApp QR生成失败:", error);
    // Set CORS headers even for error responses
    const origin = req.headers.origin;
    if (origin && ['https://www.staging.evolution-x.io', 'https://staging.evolution-x.io', 'https://frontend-staging-5ab3.up.railway.app'].includes(origin)) {
      res.header('Access-Control-Allow-Origin', origin);
      res.header('Access-Control-Allow-Credentials', 'true');
    }
    res.status(500).json({ 
      ok: false, 
      code: "INTERNAL_ERROR", 
      message: error.message || "生成WhatsApp二维码失败" 
    });
  }
});

// @ts-ignore
r.get("/login/status", requireAdmin, async (req: any, res: any) => {
  try {
    const id = String(req.query.sessionId);
    if (!id || id === 'undefined') {
      return res.status(400).json({ 
        ok: false, 
        code: "MISSING_SESSION_ID", 
        message: "必须提供sessionId参数" 
      });
    }
    const status = await getWaStatus(id);
    res.json({ ok: true, status });
  } catch (error: any) {
    console.error("❌ WhatsApp状态查询失败:", error);
    res.status(500).json({ 
      ok: false, 
      code: "INTERNAL_ERROR", 
      message: error.message || "查询WhatsApp状态失败" 
    });
  }
});

// 新的API：获取所有已连接的会话
// @ts-ignore
r.get("/sessions/connected", requireAdmin, async (req: any, res: any) => {
  try {
    const connectedSessions = getConnectedWaSessions();
    res.json({ sessions: connectedSessions });
  } catch (error: any) {
    console.error("❌ 获取已连接会话失败:", error);
    res.status(500).json({ 
      ok: false, 
      code: "INTERNAL_ERROR", 
      message: error.message || "获取已连接会话失败" 
    });
  }
});

// 新的API：创建新的Session ID
// @ts-ignore
r.post("/sessions/create", requireAdmin, async (req: any, res: any) => {
  try {
    const newSessionId = createNewSessionId();
    console.log(`🆕 创建新Session ID: ${newSessionId}`);
    res.json({ sessionId: newSessionId });
  } catch (error: any) {
    console.error("❌ 创建Session ID失败:", error);
    res.status(500).json({ 
      ok: false, 
      code: "INTERNAL_ERROR", 
      message: error.message || "创建Session ID失败" 
    });
  }
});

export default r;