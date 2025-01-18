import React, { useState, useEffect } from 'react';
import { X } from 'lucide-react';
import { Card } from '@/components/ui/card';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Input } from '@/components/ui/input';

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
    if (selectedTooth && selectedPathology) {
      if (selectedPathology !== "Other" && !isReady) {
        handleSelectionSubmit(selectedTooth, selectedPathology);
      }
    }
  }, [selectedTooth, selectedPathology, isReady, handleSelectionSubmit]);

  const handleCustomPathologyKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter' && customPathology.trim()) {
      setIsReady(true);
      handleSelectionSubmit(selectedTooth, selectedPathology, customPathology);
    }
  };

  const handleClose = () => {
    handleSelectionSubmit("", "");
  };

  return (
    <Card className="w-[180px] relative bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60 rounded-lg shadow-lg border-muted">
      <button
        onClick={handleClose}
        className="absolute right-2 top-2 p-1 hover:bg-muted rounded-sm transition-colors"
      >
        <X className="h-3 w-3 text-muted-foreground" />
      </button>

      <div className="p-3 space-y-2">
        <div className="space-y-1.5">
          <label className="text-[11px] font-medium text-muted-foreground">
            Tooth No.
          </label>
          <Select
            value={selectedTooth}
            onValueChange={setSelectedTooth}
          >
            <SelectTrigger className="h-7 text-xs bg-muted/50">
              <SelectValue placeholder="Select tooth" />
            </SelectTrigger>
            <SelectContent>
              {toothNumberOptions.map(num => (
                <SelectItem key={num} value={num} className="text-xs">
                  {num}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        <div className="space-y-1.5">
          <label className="text-[11px] font-medium text-muted-foreground">
            Pathology
          </label>
          <Select
            value={selectedPathology}
            onValueChange={(value) => {
              setSelectedPathology(value);
              setCustomPathology("");
              setIsReady(false);
            }}
          >
            <SelectTrigger className="h-7 text-xs bg-muted/50">
              <SelectValue placeholder="Select pathology" />
            </SelectTrigger>
            <SelectContent>
              {pathologyOptions.map(option => (
                <SelectItem key={option} value={option} className="text-xs">
                  {option}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        {selectedPathology === "Other" && (
          <div className="space-y-1.5">
            <Input
              type="text"
              placeholder="Type and press Enter"
              className="h-7 text-xs bg-muted/50"
              value={customPathology}
              onChange={(e) => setCustomPathology(e.target.value)}
              onKeyDown={handleCustomPathologyKeyDown}
            />
            <p className="text-[10px] text-muted-foreground italic">
              Press Enter to save
            </p>
          </div>
        )}
      </div>
    </Card>
  );
};

export default SelectionUI;