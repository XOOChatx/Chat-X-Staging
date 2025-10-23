/**
 * Session清理服务
 * 在启动时检查数据库中的session记录与文件系统中的文件是否匹配
 * 删除不存在的session记录
 */

import fs from 'fs';
import path from 'path';
import { databaseService } from '../database/database.service';

export class SessionCleanupService {
  private sessionsDir: string;
  private dataDir: string;

  constructor() {
    this.sessionsDir = path.join(process.cwd(), 'sessions');
    this.dataDir = path.join(process.cwd(), 'data');
  }

  /**
   * 执行session清理
   */
  async cleanupOrphanedSessions(): Promise<void> {
    console.log('🧹 开始清理孤立的session记录...');
    
    try {
      // 清理WhatsApp sessions
      await this.cleanupWhatsAppSessions();
      
      // 清理Telegram sessions
      await this.cleanupTelegramSessions();
      
      console.log('✅ Session清理完成');
    } catch (error: any) {
      console.error('❌ Session清理失败:', error.message);
    }
  }

  /**
   * 清理WhatsApp sessions
   */
  private async cleanupWhatsAppSessions(): Promise<void> {
    console.log('🔍 检查WhatsApp sessions...');
    
    try {
      // 获取数据库中所有WhatsApp账户
      const accounts = await databaseService.getAllAccounts();
      const whatsappAccounts = accounts.filter((account: any) => account.platform === 'whatsapp');
      
      console.log(`📊 数据库中找到 ${whatsappAccounts.length} 个WhatsApp账户`);
      
      let cleanedCount = 0;
      
      for (const account of whatsappAccounts) {
        const sessionId = account.account_id;
        if (!sessionId) continue;
        
        // 检查对应的session文件是否存在
        const sessionFilePath = path.join(this.sessionsDir, `_IGNORE_${sessionId}`);
        const sessionDataFile = path.join(this.sessionsDir, `${sessionId}.data.json`);
        
        const sessionDirExists = fs.existsSync(sessionFilePath);
        const sessionDataExists = fs.existsSync(sessionDataFile);
        
        if (!sessionDirExists && !sessionDataExists) {
          console.log(`🗑️ 删除孤立的WhatsApp session记录: ${sessionId}`);
          
          // 删除数据库记录
          await databaseService.deleteAccountBySessionId(account.account_id);
          cleanedCount++;
        } else {
          console.log(`✅ WhatsApp session文件存在: ${sessionId}`);
        }
      }
      
      console.log(`🧹 WhatsApp sessions清理完成，删除了 ${cleanedCount} 个孤立记录`);
      
    } catch (error: any) {
      console.error('❌ WhatsApp sessions清理失败:', error.message);
    }
  }

  /**
   * 清理Telegram sessions
   */
  private async cleanupTelegramSessions(): Promise<void> {
    console.log('🔍 检查Telegram sessions...');
    
    try {
      // 获取数据库中所有Telegram账户
      const accounts = await databaseService.getAllAccounts();
      const telegramAccounts = accounts.filter((account: any) => account.platform === 'telegram');
      
      console.log(`📊 数据库中找到 ${telegramAccounts.length} 个Telegram账户`);
      
      // 读取Telegram sessions文件
      const telegramSessionsFile = path.join(this.dataDir, 'sessions.json');
      let telegramSessions: any[] = [];
      
      if (fs.existsSync(telegramSessionsFile)) {
        try {
          const fileContent = fs.readFileSync(telegramSessionsFile, 'utf8');
          telegramSessions = JSON.parse(fileContent);
        } catch (error: any) {
          console.warn('⚠️ 无法读取Telegram sessions文件:', error.message);
        }
      }
      
      let cleanedCount = 0;
      
      for (const account of telegramAccounts) {
        const sessionId = account.account_id;
        if (!sessionId) continue;
        
        // 检查Telegram sessions文件中是否存在对应的session
        const sessionExists = telegramSessions.some((session: any) => 
          session.id === sessionId || session.data?.session === sessionId
        );
        
        if (!sessionExists) {
          console.log(`🗑️ 删除孤立的Telegram session记录: ${sessionId}`);
          
          // 删除数据库记录
          await databaseService.deleteAccountBySessionId(account.account_id);
          cleanedCount++;
        } else {
          console.log(`✅ Telegram session文件存在: ${sessionId}`);
        }
      }
      
      console.log(`🧹 Telegram sessions清理完成，删除了 ${cleanedCount} 个孤立记录`);
      
    } catch (error: any) {
      console.error('❌ Telegram sessions清理失败:', error.message);
    }
  }

  /**
   * 检查session文件是否存在
   */
  private checkSessionFileExists(sessionId: string, platform: 'whatsapp' | 'telegram'): boolean {
    if (platform === 'whatsapp') {
      const sessionFilePath = path.join(this.sessionsDir, `_IGNORE_${sessionId}`);
      const sessionDataFile = path.join(this.sessionsDir, `${sessionId}.data.json`);
      return fs.existsSync(sessionFilePath) || fs.existsSync(sessionDataFile);
    } else if (platform === 'telegram') {
      const telegramSessionsFile = path.join(this.dataDir, 'sessions.json');
      if (!fs.existsSync(telegramSessionsFile)) return false;
      
      try {
        const fileContent = fs.readFileSync(telegramSessionsFile, 'utf8');
        const telegramSessions = JSON.parse(fileContent);
        return telegramSessions.some((session: any) => 
          session.id === sessionId || session.data?.session === sessionId
        );
      } catch {
        return false;
      }
    }
    
    return false;
  }
}

// 导出单例实例
export const sessionCleanupService = new SessionCleanupService();