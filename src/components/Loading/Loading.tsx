const LoadingSpinner = () => {
    return (
      <div className="flex items-center justify-center h-full w-full bg-black bg-opacity-90 fixed top-0 left-0 z-50">
        <div className="text-center">
          <div className="w-12 h-12 border-4 border-gray-300 border-t-white rounded-full animate-spin"></div>
          <p className="text-white mt-2 text-lg">Processing...</p>
        </div>
      </div>
  
    );
  };

export default LoadingSpinner