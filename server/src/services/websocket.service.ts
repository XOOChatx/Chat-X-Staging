/**
 * WebSocket 服务 - 管理实时消息推送
 */

import { Server as SocketIOServer } from 'socket.io';
import { UnifiedMessage } from '../types/unified-message.types';
import { MessageTypes } from '@open-wa/wa-automate';

export interface WebSocketMessage {
  message: {
    id: string;
    chatId: string;
    sender: string;
    content: string;
    timestamp: number;
    isOwn: boolean;
    messageType: 'text' | 'image' | 'video' | 'audio' | 'file' | 'sticker' | 'location' | 'voice' |'system';
    status: 'sent' | 'delivered' | 'read';
    geo?: {
      lat: number;
      long: number;
    };
  };
  chatInfo: {
    id: string;
    platform: string;
    accountId: string;
    groupId?: string;
    name: string;
    avatar?: string;
    type: string;
    username?: string;
    memberCount?: number;
    lastMessage: string;
    lastMessageTime: number;
    lastMessageSender: string;
    unreadCount: number;
    status: string;
    createdAt: number;
    updatedAt: number;
  };
  accountId: string;
}

export interface MediaDownloadNotification {
  filePath: string;
  messageId: string;
  mediaType: 'image' | 'video' | 'audio' | 'sticker' | 'document';
  accountId: string;
}

interface AccountConnectionEvent {
  platform: 'whatsapp' | 'telegram';
  sessionId: string;
  accountName?: string;
  workspaceId?: number;
  brandId?: number;
}

class WebSocketService {
  private io: SocketIOServer | null = null;
  private isAccountListenerInitialized = false;

  emit(event: string, data: any) {
    if (!this.io) {
      console.error('❌ Socket.IO not initialized in WebSocketService');
      return false;
    }

    try {
      this.io.emit(event, data);
      console.log(`📡 WebSocket event emitted: ${event}`, data);
      return true;
    } catch (error) {
      console.error(`❌ Failed to emit event ${event}:`, error);
      return false;
    }
  }

  /**
   * 设置Socket.IO实例
   */
  setSocketIO(io: SocketIOServer) {
    this.io = io;
    console.log('✅ WebSocket服务已初始化');
    
    // 初始化账户事件监听
    this.initializeAccountListener();
  }

  /**
   * 初始化账户事件监听
   */
  private initializeAccountListener(): void {
    if (this.isAccountListenerInitialized) {
      console.log('🔌 账户事件监听器已经初始化');
      return;
    }

    console.log('🔌 初始化账户事件监听器');
    
    // 监听账户添加事件
    process.on('accountAdded', this.handleAccountAdded.bind(this));
    
    // 监听账户状态变化事件
    process.on('accountStatusChanged', this.handleAccountStatusChanged.bind(this));
    
    // 监听账户数据变化事件
    process.on('accountDataChanged', this.handleAccountDataChanged.bind(this));

    this.isAccountListenerInitialized = true;
    console.log('✅ 账户事件监听器初始化完成');
  }

  /**
   * 处理账户添加事件
   */
  private handleAccountAdded(event: AccountConnectionEvent): void {
    console.log('🔄 [WebSocketService] 收到账户添加事件:', event);

    // 重新加载sessions数据，确保获取最新的账户信息
    try {
      const { sessionStateService } = require('./session-state.service');
      sessionStateService.reloadSessions();
      console.log('🔄 [WebSocketService] 已重新加载sessions数据');
    } catch (error) {
      console.error('❌ [WebSocketService] 重新加载sessions数据失败:', error);
    }

    // 广播账户状态变化
    this.broadcastAccountStatusChange(event.sessionId, 'connected');

    // 启动账户的WebSocket监听
    this.startAccountWebSocketListening(event);
  }

  /**
   * 启动账户的WebSocket监听
   */
  private async startAccountWebSocketListening(event: AccountConnectionEvent): Promise<void> {
    try {
      console.log(`🔌 [WebSocketService] 启动账户 ${event.sessionId} 的WebSocket监听`);
      
      // 检查sessionId是否有效
      if (!event.sessionId) {
        console.warn(`⚠️ [WebSocketService] sessionId 为空，跳过启动监听`);
        return;
      }
      
      // 根据平台启动相应的监听
      switch (event.platform) {
        case 'telegram': {
          const { ProviderRegistry } = await import('../provider/provider-registry');
          const tgProvider = ProviderRegistry.get('tg');
          
          if (tgProvider && 'startAccountListening' in tgProvider) {
            await (tgProvider as any).startAccountListening(event.sessionId);
            console.log(`✅ [WebSocketService] Telegram账户 ${event.sessionId} 监听已启动`);
          } else {
            console.warn(`⚠️ [WebSocketService] Telegram Provider 未找到或没有 startAccountListening 方法`);
          }
          break;
        }
        
        case 'whatsapp': {
          const { ProviderRegistry } = await import('../provider/provider-registry');
          const waProvider = ProviderRegistry.get('wa');
          
          if (waProvider && 'startAccountListening' in waProvider) {
            await (waProvider as any).startAccountListening(event.sessionId);
            console.log(`✅ [WebSocketService] WhatsApp账户 ${event.sessionId} 监听已启动`);
          } else {
            console.warn(`⚠️ [WebSocketService] WhatsApp Provider 未找到或没有 startAccountListening 方法`);
          }
          break;
        }
        
        default:
          console.warn(`⚠️ [WebSocketService] 不支持的平台: ${event.platform}`);
          break;
      }
    } catch (error) {
      console.error(`❌ [WebSocketService] 启动账户监听失败:`, error);
    }
  }

  /**
   * 处理账户状态变化事件
   */
  private handleAccountStatusChanged(event: { accountId: string; status: string }): void {
    console.log('🔄 [WebSocketService] 收到账户状态变化事件:', event);
    
    // 广播账户状态变化
    this.broadcastAccountStatusChange(event.accountId, event.status);
    
  }

  /**
   * 处理账户数据变化事件
   */
  private handleAccountDataChanged(): void {
    console.log('🔄 [WebSocketService] 收到账户数据变化事件');
    
    // 可以在这里添加更多逻辑，比如：
    // - 刷新账户列表
    // - 更新统计信息
    // - 重新验证连接状态
  }

  emitToChat(chatId: string, event: string, data: any) {
    if (!this.io) {
      console.error('❌ Socket.IO not initialized in WebSocketService');
      return false;
    }
  
    try {
      this.io.to(`chat:${chatId}`).emit(event, data);
      console.log(`📡 [Socket] → chat:${chatId} event: ${event}`);
      return true;
    } catch (error) {
      console.error(`❌ Failed to emit to chat ${chatId}:`, error);
      return false;
    }
  }
  

  /**
   * 广播新消息给所有连接的客户端
   */
  broadcastNewMessage(data: UnifiedMessage) {
    if (!this.io) {
      console.warn('⚠️ WebSocket服务未初始化，无法广播新消息');
      return;
    }

    try {
      console.log('📡 [WebSocket] 广播新消息:', {
        chatId: data.chatInfo.id,
        platform: data.chatInfo.platform,
        accountId: data.accountId,
        messageType: data.message.messageType,
        content: data.message.content.substring(0, 50) + '...'
      });

      this.io.emit('newMessage', data);
    } catch (error) {
      console.error('❌ [WebSocket] 广播新消息失败:', error);
    }
  }

  

  /**
   * 广播媒体下载完成通知
   */
  broadcastMediaDownloaded(data: MediaDownloadNotification) {
    if (!this.io) {
      console.warn('⚠️ WebSocket服务未初始化，无法广播媒体下载通知');
      return;
    }

    try {
      console.log('📡 [WebSocket] 广播媒体下载完成通知:', {
        filePath: data.filePath,
        messageId: data.messageId,
        mediaType: data.mediaType,
        accountId: data.accountId
      });

      this.io.emit('mediaDownloaded', data);
    } catch (error) {
      console.error('❌ [WebSocket] 广播媒体下载通知失败:', error);
    }
  }

  /**
   * 广播聊天列表更新
   */
  broadcastChatUpdate(chatInfo: WebSocketMessage['chatInfo']) {
    if (!this.io) {
      console.warn('⚠️ WebSocket服务未初始化，无法广播聊天更新');
      return;
    }

    try {
      console.log('📡 [WebSocket] 广播聊天更新:', {
        chatId: chatInfo.id,
        platform: chatInfo.platform,
        lastMessage: chatInfo.lastMessage.substring(0, 30) + '...'
      });

      this.io.emit('chatUpdated', chatInfo);
    } catch (error) {
      console.error('❌ [WebSocket] 广播聊天更新失败:', error);
    }
  }

  /**
   * 广播账号状态变化
   */
  broadcastAccountStatusChange(accountId: string, status: string) {
    if (!this.io) {
      console.warn('⚠️ WebSocket服务未初始化，无法广播账号状态变化');
      return;
    }

    try {
      console.log('📡 [WebSocket] 广播账号状态变化:', { accountId, status });
      this.io.emit('accountStatusChanged', { accountId, status });
    } catch (error) {
      console.error('❌ [WebSocket] 广播账号状态变化失败:', error);
    }
  }

  /**
   * 手动触发账户状态广播
   */
  public broadcastAccountStatus(accountId: string, status: string): void {
    console.log(`📡 [WebSocketService] 手动广播账户状态: ${accountId} -> ${status}`);
    this.broadcastAccountStatusChange(accountId, status);
  }

  /**
   * 获取连接状态
   */
  getConnectionStatus() {
    if (!this.io) {
      return {
        isActive: false,
        connectedClients: 0
      };
    }

    return {
      isActive: true,
      connectedClients: this.io.sockets.sockets.size
    };
  }
}

// 创建单例实例
export const websocketService = new WebSocketService();
export default websocketService;
