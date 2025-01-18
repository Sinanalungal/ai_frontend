import React, { useState } from "react";
import { IoMenuOutline } from "react-icons/io5";
import { motion, AnimatePresence } from "framer-motion";

interface Tool {
  id: string;
  icon: React.ReactNode;
  label: string;
  onclickFn: () => void;
}

interface ToolbarProps {
  tools: Tool[];
}

const Toolbar: React.FC<ToolbarProps> = ({ tools }) => {
  const [isVisible, setIsVisible] = useState(false);
  const [hoveredTool, setHoveredTool] = useState<string | null>(null);

  return (
    <div className="relative">
      {/* Mobile Menu Button */}
      <button
        className="lg:hidden p-2 bg-[#202020] rounded-md text-white"
        onClick={() => setIsVisible(!isVisible)}
      >
        <IoMenuOutline size={24} />
      </button>

      {/* Desktop Toolbar */}
      <div className="hidden lg:flex space-x-2">
        <div className="flex bg-[#202020] px-4 py-2 rounded-lg items-center space-x-4 relative">
          <AnimatePresence>
            <motion.div
              className="flex space-x-4"
              initial={{ opacity: 0, y: -10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              transition={{ duration: 0.3 }}
            >
              {tools.map((tool) => (
                <div key={tool.id} className="relative">
                  <motion.button
                    className="p-2 rounded-md hover:bg-gray-700"
                    onClick={() => tool.onclickFn()}
                    aria-label={tool.label}
                    whileHover={{ scale: 1.1 }}
                    whileTap={{ scale: 0.9 }}
                    onMouseEnter={() => setHoveredTool(tool.id)}
                    onMouseLeave={() => setHoveredTool(null)}
                  >
                    {tool.icon}
                  </motion.button>
                  
                  {/* Tooltip */}
                  <AnimatePresence>
                    {hoveredTool === tool.id && (
                      <motion.div
                        initial={{ opacity: 0, y: -5 }}
                        animate={{ opacity: 1, y: 0 }}
                        exit={{ opacity: 0, y: -5 }}
                        className="absolute left-1/2 bottom-full mb-2 -translate-x-1/2 px-2 py-1 bg-gray-900 text-white text-sm rounded whitespace-nowrap"
                      >
                        {tool.label}
                        <div className="absolute left-1/2 top-full -translate-x-1/2 -translate-y-1 border-4 border-transparent border-t-gray-900" />
                      </motion.div>
                    )}
                  </AnimatePresence>
                </div>
              ))}
            </motion.div>
          </AnimatePresence>
        </div>
      </div>

      {/* Mobile Dropdown Menu */}
      <AnimatePresence>
        {isVisible && (
          <motion.div
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            className="lg:hidden absolute top-full left-0 mt-2 bg-[#202020] rounded-md shadow-lg z-50 min-w-[150px]"
          >
            {tools.map((tool) => (
              <button
                key={tool.id}
                onClick={() => {
                  tool.onclickFn();
                  setIsVisible(false);
                }}
                className="flex items-center space-x-3 w-full p-3 text-white hover:bg-[#303030] transition-colors duration-200"
              >
                <span className="text-base">{tool.icon}</span>
                <span className="text-sm whitespace-nowrap">{tool.label}</span>
              </button>
            ))}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};

export default Toolbar;

