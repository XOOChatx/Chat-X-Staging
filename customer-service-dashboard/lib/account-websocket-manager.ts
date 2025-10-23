/**
 * 统一的账户WebSocket监听管理器
 * 负责监听所有平台的账户连接事件并启动WebSocket监听
 */

interface AccountConnectionEvent {
  platform: 'whatsapp' | 'telegram';
  sessionId: string;
  accountName?: string;
  workspaceId?: number;
  brandId?: number;
}

class AccountWebSocketManager {
  private static instance: AccountWebSocketManager;
  private isInitialized = false;

  private constructor() {}

  public static getInstance(): AccountWebSocketManager {
    if (!AccountWebSocketManager.instance) {
      AccountWebSocketManager.instance = new AccountWebSocketManager();
    }
    return AccountWebSocketManager.instance;
  }

  /**
   * 初始化WebSocket监听管理器
   */
  public initialize(): void {
    if (this.isInitialized) {
      console.log('🔌 AccountWebSocketManager 已经初始化，跳过重复初始化');
      return;
    }

    console.log('🔌 初始化 AccountWebSocketManager');
    
    // 监听账户添加事件
    window.addEventListener('accountAdded', this.handleAccountAdded.bind(this));
    
    // 监听账户数据变化事件
    window.addEventListener('accountDataChanged', this.handleAccountDataChanged.bind(this));
    
    // 监听账户刷新事件
    window.addEventListener('refreshAccounts', this.handleRefreshAccounts.bind(this));

    this.isInitialized = true;
    console.log('✅ AccountWebSocketManager 初始化完成');
  }

  /**
   * 处理账户添加事件
   */
  private handleAccountAdded = (event: Event): void => {
    const customEvent = event as CustomEvent<AccountConnectionEvent>;
    const { platform, sessionId, accountName, workspaceId, brandId } = customEvent.detail;
    
    console.log('🔄 [AccountWebSocketManager] 收到账户添加事件:', {
      platform,
      sessionId,
      accountName,
      workspaceId,
      brandId
    });

    // 启动WebSocket监听
    this.startWebSocketListening(platform, sessionId);
  }

  /**
   * 处理账户数据变化事件
   */
  private handleAccountDataChanged = (): void => {
    console.log('🔄 [AccountWebSocketManager] 账户数据已变化，检查WebSocket状态');
    this.ensureWebSocketConnected();
  }

  /**
   * 处理账户刷新事件
   */
  private handleRefreshAccounts = (): void => {
    console.log('🔄 [AccountWebSocketManager] 账户列表已刷新，检查WebSocket状态');
    this.ensureWebSocketConnected();
  }

  /**
   * 启动WebSocket监听
   */
  private startWebSocketListening(platform: string, sessionId: string): void {
    console.log(`🔌 [AccountWebSocketManager] 启动 ${platform} 账户的WebSocket监听:`, sessionId);
    
    // 检查WebSocket客户端状态
    this.checkWebSocketClientStatus();
    
    // 确保WebSocket连接
    this.ensureWebSocketConnected();
  }

  /**
   * 检查WebSocket客户端状态
   */
  private checkWebSocketClientStatus(): void {
    console.log('🔍 [AccountWebSocketManager] 检查WebSocket客户端状态:', {
      hasWebSocketClient: !!(window as any).websocketClient,
      hasConnectMethod: !!(window as any).websocketClient?.connect,
      windowType: typeof window
    });
  }

  /**
   * 确保WebSocket连接
   */
  private ensureWebSocketConnected(): void {
    if (typeof window === 'undefined') {
      console.warn('⚠️ [AccountWebSocketManager] window未定义，跳过WebSocket连接');
      return;
    }

    const wsClient = (window as any).websocketClient;
    
    if (!wsClient) {
      console.warn('⚠️ [AccountWebSocketManager] WebSocket客户端不存在，等待SocketProvider初始化');
      // 延迟重试
      setTimeout(() => {
        this.ensureWebSocketConnected();
      }, 1000);
      return;
    }

    console.log('🔍 [AccountWebSocketManager] WebSocket客户端详情:', {
      connect: typeof wsClient.connect,
      disconnect: typeof wsClient.disconnect,
      getConnectionStatus: typeof wsClient.getConnectionStatus
    });

    // 检查当前连接状态
    const status = wsClient.getConnectionStatus?.();
    if (status?.isConnected) {
      console.log('✅ [AccountWebSocketManager] WebSocket已连接，无需重复连接');
      return;
    }

    if (wsClient.connect) {
      console.log('🔌 [AccountWebSocketManager] 调用WebSocket连接方法');
      wsClient.connect();

      // 检查连接状态
      setTimeout(() => {
        const status = wsClient.getConnectionStatus?.();
        console.log('🔍 [AccountWebSocketManager] WebSocket连接状态:', status);
      }, 1000);
    } else {
      console.warn('⚠️ [AccountWebSocketManager] WebSocket客户端没有connect方法');
    }
  }

  /**
   * 手动触发WebSocket连接（用于测试）
   */
  public manualConnect(): void {
    console.log('🔌 [AccountWebSocketManager] 手动触发WebSocket连接');
    this.ensureWebSocketConnected();
  }

  /**
   * 销毁监听器
   */
  public destroy(): void {
    if (!this.isInitialized) return;

    console.log('🧹 [AccountWebSocketManager] 销毁监听器');
    
    window.removeEventListener('accountAdded', this.handleAccountAdded.bind(this));
    window.removeEventListener('accountDataChanged', this.handleAccountDataChanged.bind(this));
    window.removeEventListener('refreshAccounts', this.handleRefreshAccounts.bind(this));

    this.isInitialized = false;
  }
}

// 导出单例实例
export const accountWebSocketManager = AccountWebSocketManager.getInstance();

// 导出类型
export type { AccountConnectionEvent };
