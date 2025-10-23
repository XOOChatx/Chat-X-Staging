import { z } from 'zod';
import { executablePath as getChromeExec } from 'puppeteer';

const envSchema = z.object({
  NODE_ENV: z.enum(['development', 'production', 'test']).default('development'),
  PORT: z.string().transform(Number).default('3001'),
  ADMIN_TOKEN: z.string().default('tsxGHrwJilVt+VRbyMuxGB0r5/BrX+C8nmrGCxzpoUw='),
  SESS_SECRET: z.string().default('session-encryption-key-change-in-production'),
  REFRESH_SECRET: z.string().default('refresh-token-secret-change-in-production'),
  DATABASE_PATH: z.string().default('./data/sessions.db'),
  AUDIT_LOG_PATH: z.string().default('./data/audit.log'),
  CORS_ORIGIN: z.string().default('https://staging.evolution-x.io'),
  API_BASE_URL: z.string().default('https://chat-x-staging.up.railway.app'),
  // WhatsApp
  WA_DATA_ROOT: z.string().default('./.wa-sessions'),
  WA_USE_CHROME: z.string().optional(),
  WA_HEADLESS: z.string().default('true'),
  // Telegram
  TG_API_ID: z.string().default('29393286'),
  TG_API_HASH: z.string().default('b5888e16f0142310e30ed8523bee765a'),
  // Postgres
  PG_HOST: z.string().default('localhost'),
  PG_PORT: z.string().transform(Number).default('5432'),
  PG_DB: z.string().default('chatx'),
  PG_USER: z.string().default('postgres'),
  PG_PASSWORD: z.string().default('1234'),
  PG_SCHEMA: z.string().default('CHATX'),
  PG_URL: z.string().default('postgresql://postgres:IebpGJnADFFxslkpMHwfQYmgNYBWLjbj@metro.proxy.rlwy.net:21891/railway'),
});

function loadEnv() {
  // 由于.env文件被忽略，直接在代码中设置环境变量
  if (!process.env.TG_API_ID) {
    process.env.TG_API_ID = '29393286';
    process.env.TG_API_HASH = 'b5888e16f0142310e30ed8523bee765a';
    process.env.WA_USE_CHROME = 'true';
    process.env.WA_HEADLESS = 'true';
    // Do not force no-sandbox for multi-device; open-wa warns against it
    process.env.ADMIN_TOKEN = 'tsxGHrwJilVt+VRbyMuxGB0r5/BrX+C8nmrGCxzpoUw=';
    console.log('🔧 设置默认环境变量');
  }

  // 智能设置 Chrome 路径（优先使用已安装或 Puppeteer 提供的路径）
  const fs = require('fs');
  try {
    const possiblePaths = [
      process.env.CHROME_PATH,
      process.env.PUPPETEER_EXECUTABLE_PATH,
      '/usr/bin/google-chrome-stable',
      '/usr/bin/google-chrome',
      '/usr/bin/chromium-browser',
      '/usr/bin/chromium',
      '/opt/google/chrome/chrome'
    ].filter(Boolean) as string[];

    let chosenPath: string | undefined;

    for (const p of possiblePaths) {
      if (p && fs.existsSync(p)) {
        chosenPath = p;
        break;
      }
    }

    if (!chosenPath) {
      // 尝试使用 Puppeteer 下载/缓存的 Chrome 路径
      const puppeteerPath = getChromeExec();
      if (puppeteerPath && fs.existsSync(puppeteerPath)) {
        chosenPath = puppeteerPath;
      }
    }

    if (chosenPath) {
      process.env.CHROME_PATH = chosenPath;
      process.env.PUPPETEER_EXECUTABLE_PATH = chosenPath;
      process.env.PUPPETEER_SKIP_CHROMIUM_DOWNLOAD = process.env.PUPPETEER_SKIP_CHROMIUM_DOWNLOAD || 'true';
      console.log('✅ Chrome路径已设置:', chosenPath);
    } else {
      // 未能找到可用的 Chrome，允许 Puppeteer 下载
      delete process.env.CHROME_PATH;
      delete process.env.PUPPETEER_EXECUTABLE_PATH;
      process.env.PUPPETEER_SKIP_CHROMIUM_DOWNLOAD = 'false';
      console.log('⚠️ 未找到可用的Chrome，允许Puppeteer下载浏览器');
    }
  } catch (e) {
    console.log('⚠️ Chrome路径检测失败，将允许Puppeteer下载:', (e as any)?.message || e);
    delete process.env.CHROME_PATH;
    delete process.env.PUPPETEER_EXECUTABLE_PATH;
    process.env.PUPPETEER_SKIP_CHROMIUM_DOWNLOAD = 'false';
  }

  // Do not auto-enable no-sandbox for multi-device

  // 调试环境变量读取
  console.log('🔧 环境变量调试:');
  console.log('   TG_API_ID:', process.env.TG_API_ID || '未设置');
  console.log('   TG_API_HASH:', process.env.TG_API_HASH ? process.env.TG_API_HASH.substring(0, 8) + '...' : '未设置');
  console.log('   WA_USE_CHROME:', process.env.WA_USE_CHROME || '未设置');
  // no WA_CHROMIUM_NO_SANDBOX log
  console.log('   CHROME_PATH:', process.env.CHROME_PATH || '未设置');
  console.log('   PUPPETEER_EXECUTABLE_PATH:', process.env.PUPPETEER_EXECUTABLE_PATH || '未设置');
  console.log('   PUPPETEER_SKIP_CHROMIUM_DOWNLOAD:', process.env.PUPPETEER_SKIP_CHROMIUM_DOWNLOAD || '未设置');
  console.log('   ADMIN_TOKEN:', process.env.ADMIN_TOKEN || '未设置');

  const env = {
    NODE_ENV: process.env.NODE_ENV,
    PORT: process.env.PORT,
    ADMIN_TOKEN: process.env.ADMIN_TOKEN,
    SESS_SECRET: process.env.SESS_SECRET,
    REFRESH_SECRET: process.env.REFRESH_SECRET || process.env.SESS_SECRET, // ✅ add thi
    DATABASE_PATH: process.env.DATABASE_PATH,
    AUDIT_LOG_PATH: process.env.AUDIT_LOG_PATH,
    CORS_ORIGIN: process.env.CORS_ORIGIN,
    API_BASE_URL: process.env.API_BASE_URL,
    WA_DATA_ROOT: process.env.WA_DATA_ROOT,
    WA_USE_CHROME: process.env.WA_USE_CHROME,
    WA_HEADLESS: process.env.WA_HEADLESS,
    TG_API_ID: process.env.TG_API_ID,
    TG_API_HASH: process.env.TG_API_HASH,
    PG_HOST: process.env.PG_HOST,
    PG_PORT: process.env.PG_PORT,
    PG_DB: process.env.PG_DB,
    PG_USER: process.env.PG_USER,
    PG_PASSWORD: process.env.PG_PASSWORD,
    PG_SCHEMA: process.env.PG_SCHEMA,
  };

  const result = envSchema.safeParse(env);
  
  if (!result.success) {
    console.error('❌ 环境变量配置错误:', result.error.format());
    process.exit(1);
  }

  console.log('✅ 环境变量加载成功');
  return result.data;
}

export const config = loadEnv();

export type Config = typeof config;
