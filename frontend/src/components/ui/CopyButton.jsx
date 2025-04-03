import React from "react";

const CopyButton = ({ children, onClick, className = "", ...props }) => {
    return (
        <button
            onClick={onClick}
            className={`px-4 py-2 bg-slate-600/50 text-white rounded-lg hover:bg-slate-700 transition flex items-center ${className}`}
            {...props}
            >
            {children}
        </button>
    );
};

export default CopyButton;
