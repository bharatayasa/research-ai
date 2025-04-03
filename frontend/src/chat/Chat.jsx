import React, { useState, useEffect, useRef } from 'react';
import { v4 as uuidv4 } from 'uuid';
import MarkdownMessage from '../components/MarkdownMessage'
import useWebSocket from '../components/WebSocketManager';
import handleServerMessage from '../components/HandleServerMessage';

function App() {
    const [messages, setMessages] = useState([]);
    const [input, setInput] = useState('');
    const [isListening, setIsListening] = useState(false);
    const messagesEndRef = useRef(null);
    const recognitionTimeout = useRef(null);

    const scrollToBottom = () => {
        messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
    };

    useEffect(scrollToBottom, [messages]);
    const { ws, isConnected, isConnecting, connectWebSocket } = useWebSocket(handleServerMessage, setMessages);

    useEffect(() => {
        connectWebSocket();
    }, []);

    const addMessage = (text, type) => {
        setMessages(prev => [...prev, { 
            text, 
            type, 
            id: uuidv4(),
            complete: true,
            timestamp: new Date().toLocaleTimeString()
        }]);
    };

    const startListening = () => {
        if (ws.current?.readyState === WebSocket.OPEN) {
            try {
            ws.current.send(JSON.stringify({ action: 'start_listening' }));
            setIsListening(true);
            setInput('');
            addMessage('Starting voice recognition...', 'status');
            
            recognitionTimeout.current = setTimeout(() => {
                if (isListening) {
                stopListening();
                addMessage('Voice recognition timeout', 'error');
                }
            }, 10000);
            } catch (error) {
            console.error('Error starting listening:', error);
            addMessage('Failed to start voice recognition', 'error');
            setIsListening(false);
            }
        } else {
            addMessage('Not connected to server', 'error');
        }
    };

    const stopListening = () => {
        setIsListening(false);
        if (recognitionTimeout.current) {
        clearTimeout(recognitionTimeout.current);
        }
        addMessage('Voice recognition stopped', 'status');
    };

    const sendMessage = () => {
        if (input.trim() && ws.current?.readyState === WebSocket.OPEN) {
            try {
            addMessage(`${input}`, 'user');
            ws.current.send(JSON.stringify({ 
                action: 'send_text',
                text: input
            }));
                setInput('');
            } catch (error) {
                console.error('Error sending message:', error);
                addMessage('Failed to send message', 'error');
            }
        }
    };

    const reconnectWebSocket = () => {
        if (!isConnecting && ws.current?.readyState !== WebSocket.OPEN) {
            connectWebSocket();
        }
    };

    const handleKeyPress = (e) => {
        if (e.key === 'Enter' && !isListening) {
            sendMessage();
        }
    };

    const getMessageStyle = (type) => {
        const baseStyle = 'mb-2 p-2 flex flex-col text-justify pl-3 pr-3 max-w-full break-words';
        switch(type) {
            case 'user':
                return `${baseStyle} text-right text-white font-semibold mb-10 mt-10`;
            case 'ai':
                return `${baseStyle} text-white font-semibold mb-10 mt-10`;
            case 'error':
                return `${baseStyle} bg-red-100 text-red-900`;
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
            <ErrorBoundary fallback={<div className="text-red-500">Error rendering message</div>}>
                <MarkdownMessage content={msg.text} />
            </ErrorBoundary>
            {msg.showCursor && !msg.complete}
            </div>
        );
        }
        return (
        <div className="whitespace-pre-wrap">
            {msg.text}
            {msg.showCursor && !msg.complete}
        </div>
        );
    };

    class ErrorBoundary extends React.Component {
        state = { hasError: false };
        
        static getDerivedStateFromError() {
            return { hasError: true };
        }
        
        render() {
            if (this.state.hasError) {
                return this.props.fallback;
            }
                return this.props.children;
        }
    }

    return (
        <div className="bg-linear-to-br from-indigo-950 from-10% via-sky-850 via-30% to-emerald-900 to-90%">
            <div className="max-w-full mx-auto p-4 h-[100vh] flex flex-col">
                {/* Header */}
                <div className="flex justify-between items-center mb-6">
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
                            }`}></span>
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

                {/* Chat Container */}
                <div className="flex-1 mb-4 overflow-y-auto flex justify-center items-center">
                    <div className="max-w-250 w-full p-6 rounded-lg">
                        <div className="items-center">
                            {messages.length === 0 ? (
                                <div className="h-full flex flex-col items-center justify-center text-center text-gray-400 dark:text-gray-500 bg-gray-800/50 p-6 rounded-lg">
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

                {/* Input Area */}
                <div className='flex justify-center items-center'>
                    {/* <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 p-2 shadow-sm max-w-250 w-full"> */}
                    <div className="rounded-lg shadow-lg bg-blue-100/20 p-6 max-w-250 w-full">
                        <div className="flex gap-2">
                            <div className="flex-1 relative">
                                <input
                                    type="text"
                                    value={input}
                                    onChange={(e) => setInput(e.target.value)}
                                    onKeyDown={handleKeyPress}
                                    placeholder={isListening ? "Listening... Speak now" : "Type your message..."}
                                    disabled={isListening || !isConnected}
                                    className="text-amber-50 w-full p-3 pr-12 rounded-lg border border-gray-300 dark:border-gray-600 focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:bg-gray-100 dark:disabled:bg-gray-700 dark:bg-gray-900/50"
                                />
                                {isListening && (
                                    <div className="absolute right-3 top-1/2 transform -translate-y-1/2 flex items-center">
                                    <span className="relative flex h-3 w-3">
                                        <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-red-400 opacity-75"></span>
                                        <span className="relative inline-flex rounded-full h-3 w-3 bg-red-500"></span>
                                    </span>
                                    </div>
                                )}
                            </div>
                            
                            <div className="flex gap-2">
                                {!isListening ? (
                                    <button onClick={startListening} disabled={!isConnected} className={`p-3 rounded-lg flex items-center justify-center transition-colors ${isConnected ? 'bg-blue-600 hover:bg-blue-700 text-white' : 'bg-gray-200 dark:bg-gray-700 text-gray-500 dark:text-gray-400 cursor-not-allowed'}`} title={isConnected ? "Start voice input" : "Connect to server first"}>
                                        <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
                                            <path fillRule="evenodd" d="M7 4a3 3 0 016 0v4a3 3 0 11-6 0V4zm4 10.93A7.001 7.001 0 0017 8a1 1 0 10-2 0A5 5 0 015 8a1 1 0 00-2 0 7.001 7.001 0 006 6.93V17H6a1 1 0 100 2h8a1 1 0 100-2h-3v-2.07z" clipRule="evenodd" />
                                        </svg>
                                    </button>
                                ) : (
                                    <button onClick={stopListening} className="p-3 rounded-lg bg-red-600 hover:bg-red-700 text-white flex items-center justify-center transition-colors" title="Stop listening">
                                        <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
                                            <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8 7a1 1 0 00-1 1v4a1 1 0 102 0V8a1 1 0 00-1-1zm4 0a1 1 0 00-1 1v4a1 1 0 102 0V8a1 1 0 00-1-1z" clipRule="evenodd" />
                                        </svg>
                                    </button>
                                )}
                                
                                <button onClick={sendMessage} disabled={isListening || !input.trim() || !isConnected} className={`p-3 rounded-lg flex items-center justify-center transition-colors ${!isListening && input.trim() && isConnected ? 'bg-green-600 hover:bg-green-700 text-white' : 'bg-gray-200 dark:bg-gray-700 text-gray-500 dark:text-gray-400 cursor-not-allowed'}`} title={!isConnected ? "Connect to server first" : !input.trim() ? "Enter a message" : "Send message"}>
                                    <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
                                        <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-8.707l-3-3a1 1 0 00-1.414 1.414L10.586 9H7a1 1 0 100 2h3.586l-1.293 1.293a1 1 0 101.414 1.414l3-3a1 1 0 000-1.414z" clipRule="evenodd" />
                                    </svg>
                                </button>
                            </div>
                        </div>
                    </div>
                </div>

            </div>
        </div>
    );
}

export default App;