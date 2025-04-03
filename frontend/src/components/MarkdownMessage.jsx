import React, { useState } from 'react';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import { Prism as SyntaxHighlighter } from 'react-syntax-highlighter';
import { vscDarkPlus } from 'react-syntax-highlighter/dist/esm/styles/prism';
import { Clipboard } from 'lucide-react';
import CopyButton from './ui/CopyButton';

const cleanContent = (content) => {
    if (!content) return '';
    return content.replace(/^AI Response:\s*/, '').trim();
};

const MarkdownMessage = ({ content }) => {
    const [copied, setCopied] = useState(false);

    const handleCopy = (text) => {
        navigator.clipboard.writeText(text).then(() => {
            setCopied(true);
            setTimeout(() => setCopied(false), 2000);
        });
    };

    return (
        <ReactMarkdown
            remarkPlugins={[remarkGfm]}
            unwrapDisallowed
            disallowedElements={['p']}
            components={{
                code({ node, inline, className, children, ...props }) {
                    const match = className ? /language-(\w+)/.exec(className) : null;
                    const codeString = String(children).replace(/\n$/, '');

                    if (inline) {
                        return (
                            <code
                                className="bg-gray-100 dark:bg-gray-700/50 px-1.5 py-0.5 rounded-2xl text-sm font-mono"
                                {...props}
                            >
                                {children}
                            </code>
                        );
                    }

                    return match ? (
                        <div className="relative rounded-lg overflow-hidden my-2 bg-gray-900">
                            <div className="absolute top-2 right-2">
                                <CopyButton size="sm" variant="outline" onClick={() => handleCopy(codeString)}>
                                    <Clipboard className="w-4 h-4" />
                                </CopyButton>
                            </div>
                            <SyntaxHighlighter
                                language={match[1]}
                                style={vscDarkPlus}
                                PreTag="div"
                                showLineNumbers
                                wrapLines
                                {...props}
                            >
                                {codeString}
                            </SyntaxHighlighter>
                        </div>
                    ) : (
                        <pre className="bg-gray-100 dark:bg-gray-800 p-3 rounded overflow-x-auto relative">
                            <div className="absolute top-2 right-2">
                                <CopyButton size="sm" variant="outline" onClick={() => handleCopy(codeString)}>
                                    <Clipboard className="w-4 h-4 mr-1" /> {copied ? 'Copied!' : 'Copy'}
                                </CopyButton>
                            </div>
                            <code className={className} {...props}>
                                {children}
                            </code>
                        </pre>
                    );
                },
            }}
        >
            {cleanContent(content)}
        </ReactMarkdown>
    );
};

export default MarkdownMessage;
