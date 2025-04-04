import React, { useState, useRef, useEffect } from 'react';
import useWebSocket from '../components/WebSocketManager';
import handleServerMessage from '../components/HandleServerMessage';
import HeaderContainer from '../container/HeaderContainer';
import ChatContainer from '../container/ChatContainer';
import InputPromp from '../container/InputPromp';

function ChatApp() {
    const [messages, setMessagesGlobal] = useState([]);
    const messagesEndRef = useRef(null);

    const { connectWebSocket } = useWebSocket((data) => handleServerMessage(data, setMessagesGlobal));

    useEffect(() => {
        connectWebSocket();
    }, []);

    return (

<div className="flex flex-col h-screen">
    <div className="fixed w-full top-0 z-50 bg-blue-200/10 backdrop-blur-lg shadow-2xl">
        <div className="max-w-full mx-auto">
            <div className="px-80 items-center gap-2">
                <HeaderContainer />
            </div>
        </div>
    </div>

    <div className="flex-1 mt-20 mb-24">
        <ChatContainer messages={messages} setMessages={setMessagesGlobal} />
    </div>

    <div className="sticky bottom-0 z-50">
        <div className="max-w-full mx-auto p-4">
            <InputPromp setMessages={setMessagesGlobal} />
        </div>
    </div>
</div>
    );
}

export default ChatApp;
