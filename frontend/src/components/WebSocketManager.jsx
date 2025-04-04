import { useState, useRef, useEffect } from 'react';

const useWebSocket = (onMessageReceived, setMessages) => {
    const [isConnected, setIsConnected] = useState(false);
    const [isConnecting, setIsConnecting] = useState(false);
    const ws = useRef(null);
    const reconnectAttempts = useRef(0);
    const maxReconnectAttempts = 5;
    const reconnectInterval = 3000; // 3 detik

    const connectWebSocket = () => {
        if (isConnecting || (ws.current && ws.current.readyState === WebSocket.OPEN)) {
            return;
        }

        setIsConnecting(true);
        reconnectAttempts.current += 1;

        try {
            ws.current = new WebSocket('ws://localhost:8765');

            ws.current.onopen = () => {
                setIsConnected(true);
                setIsConnecting(false);
                reconnectAttempts.current = 0;
                console.log('WebSocket connected');
            };

            ws.current.onmessage = (event) => {
                try {
                    const data = JSON.parse(event.data);
                    if (onMessageReceived && typeof onMessageReceived === 'function') {
                        onMessageReceived(data, setMessages);
                    }
                } catch (error) {
                    console.error('Error parsing message:', error);
                }
            };

            ws.current.onclose = () => {
                setIsConnected(false);
                setIsConnecting(false);
                
                // Coba reconnect jika bukan karena close manual
                if (reconnectAttempts.current < maxReconnectAttempts) {
                    setTimeout(() => connectWebSocket(), reconnectInterval);
                }
            };

            ws.current.onerror = (error) => {
                console.error('WebSocket error:', error);
                setIsConnecting(false);
                setIsConnected(false);
                ws.current.close();
            };

        } catch (error) {
            console.error('WebSocket initialization error:', error);
            setIsConnecting(false);
            setIsConnected(false);
        }
    };

    const disconnectWebSocket = () => {
        if (ws.current) {
            ws.current.onclose = null;
            ws.current.close();
            ws.current = null;
        }
        setIsConnected(false);
        setIsConnecting(false);
        reconnectAttempts.current = 0;
    };

    // Cleanup saat unmount
    useEffect(() => {
        return () => {
            disconnectWebSocket();
        };
    }, []);

    return { 
        ws, 
        isConnected, 
        isConnecting, 
        connectWebSocket, 
        disconnectWebSocket 
    };
};

export default useWebSocket;
