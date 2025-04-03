import React, { useState, useEffect, useRef } from 'react';
import useWebSocket from '../components/WebSocketManager';
import handleServerMessage from '../components/HandleServerMessage';

function HeaderContainer() {
    const [messages, setMessages] = useState([]);
    const messagesEndRef = useRef(null);

    const scrollToBottom = () => {
        messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
    };

    useEffect(scrollToBottom, [messages]);
    const { ws, isConnected, isConnecting, connectWebSocket } = useWebSocket(handleServerMessage, setMessages);

    useEffect(() => {
        connectWebSocket();
    }, []);

    const reconnectWebSocket = () => {
        if (!isConnecting && ws.current?.readyState !== WebSocket.OPEN) {
            connectWebSocket();
        }
    };

    return (
        <div className="flex justify-between mb-6 mt-5">
            <div className="flex items-center gap-3">
                <h1 className="text-2xl font-bold bg-gradient-to-r from-blue-600 to-purple-600 bg-clip-text text-transparent">
                    Deep Talk
                </h1>
            </div>

            <div className="flex items-center gap-2">
                <div className={`text-xs py-1 px-3 rounded-full flex items-center gap-1 ${
                    isConnected ? 'bg-green-100 text-green-800 dark:bg-green-900/20 dark:text-green-300' : 
                    isConnecting ? 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900/20 dark:text-yellow-300' : 
                    'bg-red-100 text-red-800 dark:bg-red-900/20 dark:text-red-300'
                    }`}>
                    <span className={`inline-block w-2 h-2 rounded-full ${
                        isConnected ? 'bg-green-500' : 
                        isConnecting ? 'bg-yellow-500' : 'bg-red-500'
                        }`}>
                    </span>
                    {isConnected ? 'Connected' : isConnecting ? 'Connecting...' : 'Disconnected'}
                </div>
                <button
                    onClick={reconnectWebSocket}
                    disabled={isConnecting || isConnected}
                    className="p-2 rounded-lg hover:bg-gray-200 dark:hover:bg-gray-700 transition-colors disabled:opacity-50"
                    title="Reconnect"
                >
                    <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
                        <path fillRule="evenodd" d="M4 2a1 1 0 011 1v2.101a7.002 7.002 0 0111.601 2.566 1 1 0 11-1.885.666A5.002 5.002 0 005.999 7H9a1 1 0 010 2H4a1 1 0 01-1-1V3a1 1 0 011-1zm.008 9.057a1 1 0 011.276.61A5.002 5.002 0 0014.001 13H11a1 1 0 110-2h5a1 1 0 011 1v5a1 1 0 11-2 0v-2.101a7.002 7.002 0 01-11.601-2.566 1 1 0 01.61-1.276z" clipRule="evenodd" />
                    </svg>
                </button>
            </div>

        </div>
    );
}

export default HeaderContainer;