import React, { useEffect } from 'react';
import ChatApp from './chat/ChatApp.jsx';

function App() {

  useEffect(() => {
    const style = document.createElement('style');
    style.innerHTML = `
      @keyframes gradientShift {
        0% { background-position: 0% 50%; }
        50% { background-position: 100% 50%; }
        100% { background-position: 0% 50%; }
      }
    `;
    document.head.appendChild(style);

    return () => document.head.removeChild(style);
  }, []);

  return (
    <div className="relative h-screen">
      <div className="fixed inset-0 -z-10 backdrop-blur-2xl animate-spin duration-100" style={{
          background: 'linear-gradient(to bottom right, #1e1b4b 10%, #0c4a6e 30%, #064e3b 90%)',
          backgroundSize: '140% 140%',
          animation: 'gradientShift 10s ease infinite',
        }}
      />

      {/* <div className="fixed inset-0 bg-gradient-to-br from-indigo-950 from-10% via-sky-850 via-30% to-emerald-900 to-90% -z-10"/> */}

      <div className="max-w-full mx-auto h-full flex flex-col relative">
        <ChatApp />
      </div>
    </div>
  );
}

export default App;