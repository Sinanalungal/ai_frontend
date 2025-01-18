import React, { useState, useEffect } from "react";
import { X } from "lucide-react";
import { Card } from "@/components/ui/card";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Input } from "@/components/ui/input";

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

  const handleCustomPathologyKeyDown = (
    e: React.KeyboardEvent<HTMLInputElement>
  ) => {
    if (e.key === "Enter" && customPathology.trim()) {
      setIsReady(true);
      handleSelectionSubmit(selectedTooth, selectedPathology, customPathology);
    }
  };

  const handleClose = () => {
    handleSelectionSubmit("", "");
  };

  return (
    <Card className="w-[240px] relative bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60 rounded-lg shadow-lg border-muted">
      <button
        onClick={handleClose}
        className="absolute -right-1 -top-2 bg-white p-0.5 hover:bg-muted rounded-sm transition-colors"
      >
        <X className="h-3 w-3 text-muted-foreground" />
      </button>

      <div className="p-3 space-y-2.5">
        <div className="flex items-center justify-between gap-2">
          <label className="text-[11px] font-medium text-muted-foreground whitespace-nowrap min-w-[52px]">
            Tooth No.
          </label>
          <Select value={selectedTooth} onValueChange={setSelectedTooth}>
            <SelectTrigger className="h-7 text-xs bg-muted/50 min-w-[120px]">
              <SelectValue placeholder="Select tooth" />
            </SelectTrigger>
            <SelectContent>
              <div className="max-h-[200px] overflow-y-auto">
                <SelectItem key={" "} value={" "} className="text-xs">
                  None
                </SelectItem>
                {toothNumberOptions.map((num) => (
                  <SelectItem key={num} value={num} className="text-xs">
                    {num}
                  </SelectItem>
                ))}
              </div>
            </SelectContent>
          </Select>
        </div>

        <div className="flex items-center justify-between gap-2">
          <label className="text-[11px] font-medium text-muted-foreground whitespace-nowrap min-w-[52px]">
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
            <SelectTrigger className="h-7 text-xs bg-muted/50 min-w-[120px]">
              <SelectValue placeholder="Select type" />
            </SelectTrigger>
            <SelectContent>
              <div className="max-h-[200px] overflow-y-auto">
                {pathologyOptions.map((option) => (
                  <SelectItem key={option} value={option} className="text-xs">
                    {option}
                  </SelectItem>
                ))}
              </div>
            </SelectContent>
          </Select>
        </div>

        {selectedPathology === "Other" && (
          <div className="space-y-1.5 text-xs pl-[60px]">
            <Input
              type="text"
              // placeholder="Type and press Enter"
              className="h-7 text-[10px] text-white  bg-muted/50"
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
