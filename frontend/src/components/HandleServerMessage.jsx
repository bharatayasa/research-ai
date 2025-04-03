import { v4 as uuidv4 } from 'uuid';

const handleServerMessage = (data, setMessages) => {
    switch(data.type) {
        case 'status':
            handleStatusMessage(data.message, setMessages);
            break;
        case 'transcription':
            handleTranscription(data, setMessages);
            break;
        case 'partial_transcription':
            handlePartialTranscription(data.text, setMessages);
            break;
        case 'response_chunk':
            handleResponseChunk(data.text, setMessages);
            break;
        case 'response_complete':
            markLastMessageAsComplete(setMessages);
            break;
        case 'error':
            handleErrorMessage(data.message, setMessages);
            break;
        default:
            addMessage(`Unknown message type: ${data.type}`, 'error', setMessages);
    }
};

const handleStatusMessage = (message, setMessages) => {
    addMessage(message, 'status', setMessages);
    if (message.includes('Response time')) {
        setMessages(prev => {
            const lastMessage = prev[prev.length - 1];
            if (lastMessage?.type === 'ai') {
                return [
                    ...prev.slice(0, -1),
                    { 
                        ...lastMessage, 
                        text: `${lastMessage.text} (${message})`,
                        complete: true
                    }
                ];
            }
            return prev;
        });
    }
};

const handleTranscription = (data, setMessages, setInput, setIsListening) => {
    setMessages(prev => {
        const lastMessage = prev[prev.length - 1];
        if (lastMessage?.text.startsWith('🎤 Listening:')) {
            return [...prev.slice(0, -1), { 
                text: `You: ${data.text}`, 
                type: 'user', 
                id: uuidv4(),
                complete: true,
                timestamp: new Date().toLocaleTimeString()
            }];
        }
        return [...prev, { 
            text: `You: ${data.text}`, 
            type: 'user', 
            id: uuidv4(),
            complete: true,
            timestamp: new Date().toLocaleTimeString()
        }];
    });

    if (setInput) setInput(data.full_text);
    if (setIsListening) setIsListening(false);
};


const handlePartialTranscription = (text, setMessages) => {
    setMessages(prev => {
        const lastMessage = prev[prev.length - 1];
        
        if (lastMessage?.text.startsWith('🎤 Listening:')) {
            return [
                ...prev.slice(0, -1),
                {
                    text: `🎤 Listening: ${text}`,
                    type: 'partial',
                    id: uuidv4(),
                    complete: false,
                    timestamp: new Date().toLocaleTimeString()
                }
            ];
        }
        
        return [
            ...prev,
            {
                text: `🎤 Listening: ${text}`,
                type: 'partial',
                id: uuidv4(),
                complete: false,
                timestamp: new Date().toLocaleTimeString()
            }
        ];
    });
};

const markLastMessageAsComplete = (setMessages) => {
    setMessages(prev => {
        const lastMessage = prev[prev.length - 1];
        if (lastMessage?.type === 'ai') {
            return [
                ...prev.slice(0, -1),
                { 
                    ...lastMessage, 
                    complete: true
                }
            ];
        }
        return prev;
    });
};

const handleErrorMessage = (message, setMessages) => {
    addMessage(`❌ Error: ${message}`, 'error', setMessages);
};

const handleResponseChunk = (text, setMessages) => {
    setMessages(prev => {
        const lastMessage = prev[prev.length - 1];

        if (lastMessage?.type === 'ai' && !lastMessage.complete) {
            return [
                ...prev.slice(0, -1),
                { 
                    ...lastMessage, 
                    text: lastMessage.text + text,
                    id: uuidv4(),
                    timestamp: new Date().toLocaleTimeString()
                }
            ];
        }

        return [
            ...prev,
            { 
                text: text, 
                type: 'ai', 
                id: uuidv4(),
                complete: false,
                timestamp: new Date().toLocaleTimeString()
            }
        ];
    });
};

const addMessage = (text, type, setMessages) => {
    setMessages(prev => [...prev, { 
        text, 
        type, 
        id: uuidv4(),
        complete: true,
        timestamp: new Date().toLocaleTimeString()
    }]);
};

export default handleServerMessage;