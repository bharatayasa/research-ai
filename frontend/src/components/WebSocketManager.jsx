import { useState, useRef } from 'react';

const useWebSocket = (onMessageReceived, setMessages) => {
    const [isConnected, setIsConnected] = useState(false);
    const [isConnecting, setIsConnecting] = useState(false);
    const [connectionStatus, setConnectionStatus] = useState('Connecting...');
    const ws = useRef(null);

    const connectWebSocket = () => {
        setIsConnecting(true);
        setConnectionStatus('Connecting...');

        try {
            ws.current = new WebSocket('ws://localhost:8765');

            ws.current.onopen = () => {
                setIsConnected(true);
                setIsConnecting(false);
                setConnectionStatus('Connected');
            };

            ws.current.onmessage = (event) => {
                try {
                    const data = JSON.parse(event.data);
                    if (onMessageReceived && typeof onMessageReceived === 'function') {
                        onMessageReceived(data, setMessages);
                    } else {
                        console.error('onMessageReceived is not a valid function');
                    }
                } catch (error) {
                    console.error('Error parsing message:', error);
                }
            };

            ws.current.onclose = () => {
                setIsConnected(false);
                setIsConnecting(false);
                setConnectionStatus('Disconnected');
            };

            ws.current.onerror = (error) => {
                console.error('WebSocket error:', error);
                setIsConnecting(false);
                setConnectionStatus('Connection error');
            };
        } catch (error) {
            console.error('WebSocket initialization error:', error);
            setIsConnecting(false);
            setConnectionStatus('Connection failed');
        }
    };

    return { ws, isConnected, isConnecting, connectionStatus, connectWebSocket };
};

export default useWebSocket;
