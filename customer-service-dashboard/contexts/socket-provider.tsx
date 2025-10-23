"use client";

import React, { createContext, useContext, useEffect, useState } from "react";
import { io, Socket } from "socket.io-client";
import { useToast } from "@/components/ui/use-toast";
import { useAuth } from "@/contexts/auth-context"// 👈 import your auth context

interface SocketContextValue {
  socket: Socket | null;
  isConnected: boolean;
}

const SocketContext = createContext<SocketContextValue>({
  socket: null,
  isConnected: false,
});

// 全局连接状态管理 - 使用单例模式
class GlobalSocketManager {
  private static instance: GlobalSocketManager;
  private socket: Socket | null = null;
  private isConnected = false;
  private listeners: Set<(socket: Socket | null, isConnected: boolean) => void> = new Set();

  private constructor() {}

  public static getInstance(): GlobalSocketManager {
    if (!GlobalSocketManager.instance) {
      GlobalSocketManager.instance = new GlobalSocketManager();
    }
    return GlobalSocketManager.instance;
  }

  public getSocket(): Socket | null {
    return this.socket;
  }

  public getIsConnected(): boolean {
    return this.isConnected;
  }

  public setSocket(socket: Socket | null): void {
    this.socket = socket;
    this.notifyListeners();
  }

  public setIsConnected(isConnected: boolean): void {
    this.isConnected = isConnected;
    this.notifyListeners();
  }

  public addListener(listener: (socket: Socket | null, isConnected: boolean) => void): void {
    this.listeners.add(listener);
  }

  public removeListener(listener: (socket: Socket | null, isConnected: boolean) => void): void {
    this.listeners.delete(listener);
  }

  private notifyListeners(): void {
    this.listeners.forEach(listener => listener(this.socket, this.isConnected));
  }
}

const globalSocketManager = GlobalSocketManager.getInstance();

export const SocketProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [socket, setSocket] = useState<Socket | null>(null);
  const [isConnected, setIsConnected] = useState(false);
  const { toast } = useToast();
  const { user , fetchCurrentUser} = useAuth(); // 👈 get current user

  useEffect(() => {
    fetchCurrentUser();
  }, []);

  // 监听账户状态变化，重新连接WebSocket
  useEffect(() => {
    const handleAccountStatusChange = () => {
      console.log("🔄 检测到账户状态变化，重新连接WebSocket");
      if (socket && !socket.connected) {
        console.log("🔌 重新连接WebSocket...");
        socket.connect();
      }
    };

    // 监听账户相关事件
    window.addEventListener('accountAdded', handleAccountStatusChange);
    window.addEventListener('refreshAccounts', handleAccountStatusChange);
    window.addEventListener('accountDataChanged', handleAccountStatusChange);

    return () => {
      window.removeEventListener('accountAdded', handleAccountStatusChange);
      window.removeEventListener('refreshAccounts', handleAccountStatusChange);
      window.removeEventListener('accountDataChanged', handleAccountStatusChange);
    };
  }, [socket]);

  // 监听全局状态变化
  useEffect(() => {
    const handleGlobalStateChange = (newSocket: Socket | null, newIsConnected: boolean) => {
      setSocket(newSocket);
      setIsConnected(newIsConnected);
    };

    globalSocketManager.addListener(handleGlobalStateChange);
    
    // 初始化时获取当前状态
    setSocket(globalSocketManager.getSocket());
    setIsConnected(globalSocketManager.getIsConnected());

    return () => {
      globalSocketManager.removeListener(handleGlobalStateChange);
    };
  }, []);

  useEffect(() => {
    // Wait until user info is loaded
    if (!user) return;
  
    const API_BASE = process.env.NEXT_PUBLIC_API_BASE as string
    if (!API_BASE) return;
    
    // 如果全局已经有连接，跳过重复创建
    const currentSocket = globalSocketManager.getSocket();
    if (currentSocket && currentSocket.connected) {
      console.log("⚠️ 全局WebSocket已连接，跳过重复创建", {
        socketId: currentSocket.id,
        isConnected: currentSocket.connected
      });
      return;
    }
    
    // 如果全局已经有连接，先断开
    if (currentSocket) {
      console.log("🔄 断开现有全局WebSocket连接，准备重新连接");
      currentSocket.disconnect();
    }
    
    console.log("🔌 创建新的WebSocket连接");
    const s = io(API_BASE, {
      path: "/socket.io",
      transports: ["websocket", "polling"],
      reconnection: true,
      reconnectionAttempts: 5,
      reconnectionDelay: 1000,
      timeout: 20000,
    });
  
    // 更新全局状态
    globalSocketManager.setSocket(s);
  
    s.on("connect", () => {
      console.log("✅ Connected to Socket.IO server");
      console.log("✅ Socket ID:", s.id);
      console.log("✅ Transport:", s.io.engine.transport.name);
      globalSocketManager.setIsConnected(true);
      
      // 将WebSocket客户端暴露到全局，供账户连接后使用
      if (typeof window !== 'undefined') {
        (window as any).websocketClient = {
          socket: s, // 暴露socket对象，用于发送事件
          connect: () => {
            console.log("🔌 通过全局接口重新连接WebSocket");
            if (!s.connected) {
              s.connect();
            }
          },
          disconnect: () => {
            console.log("🔌 通过全局接口断开WebSocket");
            s.disconnect();
          },
          getConnectionStatus: () => ({
            isConnected: s.connected,
            socketId: s.id,
            transport: s.io.engine.transport.name
          })
        };
        console.log("🔌 全局WebSocket客户端已设置，包含socket对象");
      }
      
      // 监听账号相关事件
      s.on('newMessage', (data) => {
        console.log('📨 [SocketProvider] 收到新消息:', {
          chatId: data?.chatInfo?.id,
          accountId: data?.accountId,
          content: data?.message?.content?.slice(0, 50)
        });
      });
      
      s.on('accountStatusChanged', (data) => {
        console.log('🔄 [SocketProvider] 账号状态变化:', {
          accountId: data?.accountId,
          status: data?.status
        });
      });
      
      s.on('chatUpdated', (data) => {
        console.log('🔄 [SocketProvider] 聊天更新:', {
          chatId: data?.id,
          platform: data?.platform,
          accountId: data?.accountId
        });
      });
    });
  
    s.on("disconnect", (reason) => {
      if (user.role_id === 1) return; // ✅ Only skip for SUPERADMIN
      console.warn("❌ Disconnected from server:", reason);
      globalSocketManager.setIsConnected(false);
    });
  
    s.on("wa:logout", (payload) => {
      if (user.role_id === 1) return; // ✅ Only skip for SUPERADMIN
      console.warn("⚠️ WhatsApp Session Logged Out:", payload);
      toast({
        title: "WhatsApp Session Logged Out",
        description: `Account ${payload.displayName || payload.accountId} has been logged out.`,
        variant: "destructive",
        duration: 99999999999,
      });
    });
  
    return () => {
      console.log("🧹 Cleaning up socket connection");
      // 只有当前socket是全局socket时才清理
      if (globalSocketManager.getSocket() === s) {
        globalSocketManager.setSocket(null);
        globalSocketManager.setIsConnected(false);
      }
      s.disconnect();
    };
  }, [user, toast]); // ✅ include user here!
  

  return (
    <SocketContext.Provider value={{ socket, isConnected }}>
      {children}
    </SocketContext.Provider>
  );
};

export const useSocket = () => useContext(SocketContext);

// 导出全局连接状态检查函数
export const getGlobalSocketStatus = () => {
  const socket = globalSocketManager.getSocket();
  return {
    socket,
    isConnected: globalSocketManager.getIsConnected(),
    socketId: socket?.id,
    transport: socket?.io?.engine?.transport?.name
  };
};