import React from 'react';
import ChatApp from './chat/ChatApp.jsx'

function App() {

  return (
  <div className="relative h-screen">
      <div className="fixed inset-0 bg-gradient-to-br from-indigo-950 from-10% via-sky-850 via-30% to-emerald-900 to-90% -z-10"/>

      <div className="max-w-full mx-auto h-full flex flex-col relative">
        <ChatApp />
      </div>
  </div>
  );
}

export default App;