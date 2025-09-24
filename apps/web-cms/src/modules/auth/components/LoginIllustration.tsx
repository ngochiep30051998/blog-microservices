import React from 'react';

const LoginIllustration: React.FC = () => {
  return (
    <div className="w-full h-screen bg-gradient-to-br from-indigo-500 to-purple-600 relative overflow-hidden flex items-center justify-between px-12">
      
      {/* Illustration Container */}
      <div className="flex-1 flex items-center justify-center relative">
        {/* Background decorative elements */}
        <div className="absolute top-20 left-20 w-16 h-16 bg-white bg-opacity-10 rounded-full animate-pulse"></div>
        <div className="absolute top-10 right-20 w-8 h-8 bg-white bg-opacity-20 rounded-full animate-bounce delay-1000"></div>
        <div className="absolute bottom-20 left-10 w-12 h-12 bg-white bg-opacity-15 rounded-full animate-pulse delay-500"></div>
        
        {/* Main illustration - simplified representation */}
        <div className="relative w-96 h-96 flex items-center justify-center">
          {/* Person figure */}
          <div className="absolute left-16 bottom-24 z-20">
            <div className="w-12 h-12 bg-indigo-400 rounded-full mb-2"></div>
            <div className="w-8 h-16 bg-indigo-300 rounded-t-lg mx-2"></div>
            <div className="flex gap-1 mx-2">
              <div className="w-3 h-12 bg-indigo-300 rounded"></div>
              <div className="w-3 h-12 bg-indigo-300 rounded"></div>
            </div>
          </div>
          
          {/* Mobile device */}
          <div className="relative z-10 bg-white rounded-3xl p-4 shadow-2xl w-48 h-80 transform rotate-12">
            <div className="w-full h-full bg-gradient-to-b from-yellow-400 to-orange-500 rounded-2xl p-4">
              <div className="bg-white rounded-lg p-2 mb-4">
                <div className="w-8 h-8 bg-gray-200 rounded-full mx-auto"></div>
              </div>
              <div className="space-y-2">
                <div className="h-3 bg-white bg-opacity-80 rounded"></div>
                <div className="h-3 bg-white bg-opacity-60 rounded"></div>
                <div className="h-8 bg-white bg-opacity-90 rounded mt-4"></div>
              </div>
            </div>
          </div>
          
          {/* Security/Lock icon */}
          <div className="absolute top-16 left-8 z-30">
            <div className="w-16 h-16 bg-pink-500 rounded-full flex items-center justify-center shadow-lg">
              <svg className="w-8 h-8 text-white" fill="currentColor" viewBox="0 0 20 20">
                <path fillRule="evenodd" d="M5 9V7a5 5 0 0110 0v2a2 2 0 012 2v5a2 2 0 01-2 2H5a2 2 0 01-2-2v-5a2 2 0 012-2zm8-2v2H7V7a3 3 0 016 0z" clipRule="evenodd" />
              </svg>
            </div>
          </div>
          
          {/* Decorative shapes */}
          <div className="absolute bottom-12 right-12 w-32 h-20 bg-pink-400 rounded-full opacity-70 transform rotate-45"></div>
          <div className="absolute top-32 right-8 w-20 h-20 bg-purple-300 rounded-full opacity-60"></div>
        </div>
      </div>
      
      {/* Figma logo positioned bottom left */}
      <div className="absolute bottom-8 left-8">
        <div className="flex space-x-1">
          <div className="w-6 h-6 bg-red-500 rounded"></div>
          <div className="w-6 h-6 bg-blue-500 rounded-full"></div>
          <div className="w-6 h-6 bg-green-500 rounded"></div>
        </div>
      </div>
    </div>
  );
};

export default LoginIllustration;