import React, { useState, useEffect, useRef } from 'react';
import { v4 as uuidv4 } from 'uuid';
import useWebSocket from '../components/WebSocketManager';
import handleServerMessage from '../components/HandleServerMessage';

function InputPromp({ setMessages }) {
    const [input, setInput] = useState('');
    const [isListening, setIsListening] = useState(false);
    const messagesEndRef = useRef(null);
    const recognitionTimeout = useRef(null);

    const { ws, isConnected, connectWebSocket } = useWebSocket((data) => handleServerMessage(data, setMessages));

    useEffect(() => {
        console.log("WebSocket Connected:", isConnected);
    }, [isConnected]);

    useEffect(() => {
        console.log("Listening Status:", isListening);
    }, [isListening]);

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
        if (recognitionTimeout.current) clearTimeout(recognitionTimeout.current);
        addMessage('Voice recognition stopped', 'status');
    };

    const sendMessage = () => {
        if (input.trim() && ws.current?.readyState === WebSocket.OPEN) {
            try {
                addMessage(input, 'user');
                ws.current.send(JSON.stringify({ action: 'send_text', text: input }));
                setInput('');
            } catch (error) {
                console.error('Error sending message:', error);
                addMessage('Failed to send message', 'error');
            }
        }
    };

    const handleKeyPress = (e) => {
        if (e.key === 'Enter' && !isListening) {
            sendMessage();
        }
    };

    return (
        <div className='flex justify-center items-center'>
            <div className="rounded-lg shadow-lg p-6 max-w-250 w-full bg-blue-200/10 backdrop-blur-lg">
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
                            <button 
                                onClick={startListening} 
                                disabled={!isConnected} 
                                className={`p-3 rounded-lg flex items-center justify-center transition-colors ${isConnected ? 'bg-blue-600 hover:bg-blue-700 text-white' : 'bg-gray-200 dark:bg-gray-700 text-gray-500 dark:text-gray-400 cursor-not-allowed'}`} 
                                title={isConnected ? "Start voice input" : "Connect to server first"}
                            >
                                <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
                                    <path fillRule="evenodd" d="M7 4a3 3 0 016 0v4a3 3 0 11-6 0V4zm4 10.93A7.001 7.001 0 0017 8a1 1 0 10-2 0A5 5 0 015 8a1 1 0 00-2 0 7.001 7.001 0 006 6.93V17H6a1 1 0 100 2h8a1 1 0 100-2h-3v-2.07z" clipRule="evenodd" />
                                </svg>
                            </button>
                        ) : (
                            <button 
                                onClick={stopListening} 
                                className="p-3 rounded-lg bg-red-600 hover:bg-red-700 text-white flex items-center justify-center transition-colors" 
                                title="Stop listening"
                            >
                                <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
                                    <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8 7a1 1 0 00-1 1v4a1 1 0 102 0V8a1 1 0 00-1-1zm4 0a1 1 0 00-1 1v4a1 1 0 102 0V8a1 1 0 00-1-1z" clipRule="evenodd" />
                                </svg>
                            </button>
                        )}
                        
                        <button 
                            onClick={sendMessage} 
                            disabled={isListening || !input.trim() || !isConnected} 
                            className={`p-3 rounded-lg flex items-center justify-center transition-colors ${!isListening && input.trim() && isConnected ? 'bg-green-600 hover:bg-green-700 text-white' : 'bg-gray-200 dark:bg-gray-700 text-gray-500 dark:text-gray-400 cursor-not-allowed'}`} 
                            title={!isConnected ? "Connect to server first" : !input.trim() ? "Enter a message" : "Send message"}
                        >
                            <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
                                <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-8.707l-3-3a1 1 0 00-1.414 1.414L10.586 9H7a1 1 0 100 2h3.586l-1.293 1.293a1 1 0 101.414 1.414l3-3a1 1 0 000-1.414z" clipRule="evenodd" />
                            </svg>
                        </button>
                    </div>
                </div>
            </div>
        </div>
    );
}

export default InputPromp;
