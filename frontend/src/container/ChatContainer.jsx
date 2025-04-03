import React, { useEffect, useRef } from 'react';
import useWebSocket from '../components/WebSocketManager';
import handleServerMessage from '../components/HandleServerMessage';
import MarkdownMessage from '../components/MarkdownMessage';

function ChatContainer({ messages, setMessages }) {
    const messagesEndRef = useRef(null);
    const { connectWebSocket } = useWebSocket((data) => handleServerMessage(data, setMessages));

    useEffect(() => {
        connectWebSocket();
    }, []);

    useEffect(() => {
        messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
    }, [messages]);

    const getMessageStyle = (type) => {
        const baseStyle = 'mb-2 p-2 flex flex-col text-justify pl-3 pr-3 max-w-full break-words';
        switch(type) {
            case 'user':
                return `${baseStyle} text-right text-white font-semibold mb-10 mt-10`;
            case 'ai':
                return `${baseStyle} text-white font-semibold mb-10 mt-10`;
            case 'error':
                return `bg-red-100/50 text-red-900 font-semibold text-black text-sm text-center mx-50 mb-2 py-1 rounded-lg shadow-lg`;
            case 'status':
                return `text-white text-sm text-center mx-50 mb-2 py-1 rounded-lg shadow-lg bg-blue-100/20`;
            case 'partial':
                return `${baseStyle} bg-purple-100 text-purple-900 italic`;
            default:
                return `${baseStyle} bg-gray-50/20`;
        }
    };

    const renderMessageContent = (msg) => {
        if (msg.type === 'ai') {
            return (
                <div className="max-w-none">
                    <MarkdownMessage content={msg.text} />
                </div>
            );
        }
        return <div className="whitespace-pre-wrap">{msg.text}</div>;
    };

    return (
        <div className="flex-1 mb-4 overflow-auto flex justify-center items-center">
            <div className="max-w-250 w-full p-6 rounded-lg">
                <div className="items-center">
                    {messages.length === 0 ? (
                        <div className="h-full flex flex-col items-center justify-center text-center text-gray-400 dark:text-gray-500 bg-blue-200/10 backdrop-blur-lg p-6 rounded-lg">
                            <div className="w-24 h-24 mb-4 opacity-50">
                                <svg viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                                    <path d="M8 10H8.01M12 10H12.01M16 10H16.01M8 14H8.01M12 14H12.01M16 14H16.01M8 18H8.01M12 18H12.01M16 18H16.01" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                                    <path d="M3 10V18C3 19.1046 3.89543 20 5 20H19C20.1046 20 21 19.1046 21 18V10C21 8.89543 20.1046 8 19 8H5C3.89543 8 3 8.89543 3 10Z" stroke="currentColor" strokeWidth="2"/>
                                    <path d="M7 8V6C7 4.89543 7.89543 4 9 4H15C16.1046 4 17 4.89543 17 6V8" stroke="currentColor" strokeWidth="2"/>
                                </svg>
                            </div>
                            <h3 className="text-lg font-medium">No messages yet</h3>
                            <div className="mt-1">Start a conversation by typing below</div>
                        </div>
                    ) : (
                        <div className="space-y-4">
                            {messages.map((msg) => (
                                <div key={msg.id} className={getMessageStyle(msg.type)}>
                                    <div className="flex items-start gap-3">
                                        {msg.type === 'ai' && (
                                            <div className="flex-shrink-0 w-8 h-8 rounded-full bg-blue-600 flex items-center justify-center text-white font-bold text-sm p-6 border-2">
                                                AI
                                            </div>
                                        )}
                                        <div className="flex-1 min-w-0">
                                            {renderMessageContent(msg)}
                                            <div className="text-xs mt-2 text-gray-500 dark:text-gray-400">
                                                {msg.timestamp}
                                            </div>
                                        </div>
                                        {msg.type === 'user' && (
                                            <div className="flex-shrink-0 w-8 h-8 rounded-full bg-purple-950/50 flex items-center justify-center text-white font-bold text-sm p-6 border-2">
                                                ME
                                            </div>
                                        )}
                                    </div>
                                </div>
                            ))}
                            <div ref={messagesEndRef} />
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
}

export default ChatContainer;
