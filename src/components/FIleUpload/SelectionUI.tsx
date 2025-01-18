import React, { useState, useEffect } from 'react';

interface SelectionUIProps {
  toothNumberOptions: string[];
  pathologyOptions: string[];
  handleSelectionSubmit: (
    toothNumber: string,
    pathology: string,
    customPathology?: string
  ) => void;
  canvasRef: React.RefObject<HTMLCanvasElement>;
}

const SelectionUI: React.FC<SelectionUIProps> = ({
  toothNumberOptions,
  pathologyOptions,
  handleSelectionSubmit,
}) => {
  const [selectedTooth, setSelectedTooth] = useState<string>("");
  const [selectedPathology, setSelectedPathology] = useState<string>("");
  const [customPathology, setCustomPathology] = useState<string>("");
  const [isReady, setIsReady] = useState<boolean>(false);

  useEffect(() => {
    // Auto-submit when both fields are filled and either:
    // 1. The pathology is not "Other"
    // 2. The pathology is "Other" and custom pathology has been entered and user pressed Enter
    if (selectedTooth && selectedPathology) {
      if (selectedPathology !== "Other" && !isReady) {
        handleSelectionSubmit(
          selectedTooth,
          selectedPathology
        );
      }
    }
  }, [selectedTooth, selectedPathology, isReady, handleSelectionSubmit]);

  const handleCustomPathologyKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter' && customPathology.trim()) {
      setIsReady(true);
      handleSelectionSubmit(
        selectedTooth,
        selectedPathology,
        customPathology
      );
    }
  };

  const handleClose = () => {
    handleSelectionSubmit("", "");
  };


  return (
    <div className="w-[200px] relative bg-black bg-opacity-70 rounded-md p-3 space-y-2">
      
      <div onClick={handleClose} className='absolute right-2 top-0 text-xs text-white'>x</div>
      <div className="flex  flex-col gap-2">
        {/* Tooth Number Selection */}
        <div className="flex  items-center gap-1 justify-between">
          <label className="text-xs text-white font-medium">Tooth No</label>
          <select
            className="w-[90px] bg-[#707070] text-xs text-gray-300 px-2 py-1"
            value={selectedTooth}
            onChange={(e) => setSelectedTooth(e.target.value)}
          >
            <option value="">Select tooth</option>
            {toothNumberOptions.map(num => (
              <option key={num} value={num}>{num}</option>
            ))}
          </select>
        </div>

        {/* Pathology Selection */}
        <div className="flex items-center gap-1 justify-between">
          <label className="text-xs text-white font-medium">Pathology</label>
          <select
            className="w-[90px] bg-[#707070] text-xs text-gray-300 px-2 py-1"
            value={selectedPathology}
            onChange={(e) => {
              setSelectedPathology(e.target.value);
              setCustomPathology("");
              setIsReady(false);
            }}
          >
            <option value="">Select pathology</option>
            {pathologyOptions.map(option => (
              <option key={option} value={option}>{option}</option>
            ))}
          </select>
        </div>

        {/* Custom Pathology Input */}
        {selectedPathology === "Other" && (
          <div className="flex items-center gap-1 justify-between">
            <input
              type="text"
              placeholder="Enter pathology and press Enter"
              className="w-full bg-[#707070] text-xs text-gray-300 px-2 py-1 rounded"
              value={customPathology}
              onChange={(e) => setCustomPathology(e.target.value)}
              onKeyDown={handleCustomPathologyKeyDown}
            />
          </div>
        )}

        {selectedPathology === "Other" && (
          <p className="text-xs text-gray-400 italic">
            Press Enter to save custom pathology
          </p>
        )}
      </div>
    </div>
  );
};

export default SelectionUI;