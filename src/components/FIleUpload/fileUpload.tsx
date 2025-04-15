import React, { useCallback, useEffect, useState, useRef } from "react";
import { useDropzone } from "react-dropzone";
import { MdOutlineCloudUpload, MdOutlineFileDownload } from "react-icons/md";
import { RiDeleteBinLine } from "react-icons/ri";
import Switch from "react-switch";
import axios from "axios";
import { toast } from "sonner";
import {
  FaSquareFull,
  FaCircle,
  FaArrowsAlt,
  FaMousePointer,
  FaEdit,
  FaUndo,
} from "react-icons/fa";
import { BsDash, BsBoundingBoxCircles } from "react-icons/bs";
import Toolbar from "../Reusable/Toolbar";
import AnnotationsList from "./AnnotationsList";
import LoadingSpinner from "../Loading/Loading";
import SelectionUI from "./SelectionUI";

export interface Drawing {
  type: string;
  points: number[];
  label: string;
  id: string;
  visible: boolean;
  transform?: any;
  toothNumber?: string;
  pathology?: string;
  customPathology?: string;
}

interface Annotation {
  class: string;
  roi_xyxy: Array<{
    coordinates: number[];
    poly?: number[][]; // Optional polygon coordinates
    visible: boolean;
    id: string;
    label: string;
  }>;
}

interface UploadResponse {
  message: string;
  data: {
    inference_time: number;
    results: Array<{
      class: string;
      roi_xyxy: number[][];
      poly?: number[][][]; // Optional in response
    }>;
    unique_id: string;
  };
}

const SNAP_THRESHOLD = 10;

const FileUpload = () => {
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [checkType, setCheckType] = useState<"qc" | "path">("qc");
  const [isAnnotationEnabled, setIsAnnotationEnabled] = useState(true);
  const [uploadResponse, setUploadResponse] = useState<UploadResponse | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [annotations, setAnnotations] = useState<Annotation[]>([]);
  const [imageSize, setImageSize] = useState({ width: 0, height: 0 });
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [drawings, setDrawings] = useState<Drawing[]>([]);
  const [isDrawing, setIsDrawing] = useState(false);
  const [currentTool, setCurrentTool] = useState<string>("select");
  const [startPoint, setStartPoint] = useState<{ x: number; y: number } | null>(null);
  const [currentPoints, setCurrentPoints] = useState<number[]>([]);
  const [isPolygonDrawing, setIsPolygonDrawing] = useState(false);
  const [isTransforming, setIsTransforming] = useState(false);
  const [selectedShape, setSelectedShape] = useState<string | null>(null);
  const [transformOrigin, setTransformOrigin] = useState<{ x: number; y: number } | null>(null);
  const [selectedDrawingId, setSelectedDrawingId] = useState<string | null>(null);
  const [isDraggingPoint, setIsDraggingPoint] = useState(false);
  const [selectedPointIndex, setSelectedPointIndex] = useState<number | null>(null);
  const [draggedPointOffset, setDraggedPointOffset] = useState<{ x: number; y: number } | null>(null);
  const [drawingHistory, setDrawingHistory] = useState<Drawing[][]>([]);
  const [showSelecting, setShowSelecting] = useState(false);
  const [_selectionPosition, setSelectionPosition] = useState({ x: 0, y: 0 });
  const [editingDrawing, setEditingDrawing] = useState<{
    id: string;
    toothNumber: string;
    pathology: string;
    customPathology: string;
  } | null>(null);
  const [lastImageSize, setLastImageSize] = useState({ width: 0, height: 0 });

  const toothNumberOptions = [
    "11", "12", "13", "14", "15", "16", "17", "18",
    "21", "22", "23", "24", "25", "26", "27", "28",
    "31", "32", "33", "34", "35", "36", "37", "38",
    "41", "42", "43", "44", "45", "46", "47", "48"
  ];

  const pathologyOptions = [
    ...[
      "Caries",
      "Deep Caries",
      "Crown",
      "Filling",
      "Implant",
      "Misaligned Teeth",
      "Mandibular Canal",
      "Missing Teeth",
      "Periapical Lesion",
      "Retained Root",
      "Root Canal Treatment",
      "Root Piece",
      "Impacted Tooth",
      "Maxillary Sinus",
      "Bone Loss",
      "Fractured Teeth",
      "Permanent Teeth",
      "Primary Teeth",
      "Supra Eruption",
      "TAD (Temporary Anchorage Device)",
      "Abutment",
      "Attrition",
      "Bone Defect",
      "Gingival Former",
      "Metal Band",
      "Orthodontic Brackets",
      "Permanent Retainer",
      "Post-core",
      "Plating",
      "Wire",
      "Cyst",
      "Root Resorption",
      "Hyperdontia",
      "Hypodontia",
      "Amalgam Tattoo",
      "Periodontal Abscess",
      "Fibrous Dysplasia",
      "Enamel Hypoplasia",
      "Temporomandibular Joint (TMJ) Disorders",
      "Sinusitis",
      "Torus Mandibularis",
      "Zygomatic Process Abnormalities",
      "Cemento-Osseous Dysplasia",
      "Osteosclerosis",
      "Pulp Stones",
      "Dilaceration",
    ],
    "Other",
  ];

  const classColors = {
    'Caries': "rgba(255, 0, 0, 0.5)",             // Red
    'Crown': "rgba(255, 215, 0, 0.5)",            // Gold
    'Filling': "rgba(0, 128, 255, 0.5)",          // Blue
    'Implant': "rgba(192, 192, 192, 0.5)",        // Silver
    'Malaligned': "rgba(255, 20, 147, 0.5)",      // Deep pink
    'Mandibular Canal': "rgba(0, 0, 255, 0.5)",   // Blue
    'Missing teeth': "rgba(211, 211, 211, 0.5)",  // Light gray
    'Periapical lesion': "rgba(138, 43, 226, 0.5)", // Blue violet
    'Retained root': "rgba(205, 92, 92, 0.5)",    // Indian red
    'Root Canal Treatment': "rgba(75, 0, 130, 0.5)", // Indigo
    'Root Piece': "rgba(233, 150, 122, 0.5)",     // Dark salmon
    'impacted tooth': "rgba(255, 165, 0, 0.5)",   // Orange
    'maxillary sinus': "rgba(65, 105, 225, 0.5)", // Royal blue
    'Bone Loss': "rgba(139, 69, 19, 0.5)",        // Saddle brown
    'Fracture teeth': "rgba(255, 69, 0, 0.5)",    // Red-orange
    'Permanent Teeth': "rgba(46, 139, 87, 0.5)",  // Sea green
    'Supra Eruption': "rgba(34, 139, 34, 0.5)",   // Forest green
    'TAD': "rgba(219, 112, 147, 0.5)",            // Pale violet red
    'abutment': "rgba(218, 165, 32, 0.5)",        // Goldenrod
    'attrition': "rgba(210, 105, 30, 0.5)",       // Chocolate
    'bone defect': "rgba(160, 82, 45, 0.5)",      // Sienna
    'gingival former': "rgba(112, 128, 144, 0.5)", // Slate gray
    'metal band': "rgba(119, 136, 153, 0.5)",     // Slate gray
    'orthodontic brackets': "rgba(255, 182, 193, 0.5)", // Light pink
    'permanent retainer': "rgba(255, 105, 180, 0.5)", // Hot pink
    'post - core': "rgba(184, 134, 11, 0.5)",     // Dark goldenrod
    'plating': "rgba(128, 128, 128, 0.5)",        // Gray
    'wire': "rgba(169, 169, 169, 0.5)",           // Dark gray
    'Cyst': "rgba(148, 0, 211, 0.5)",             // Violet
    'Root resorption': "rgba(186, 85, 211, 0.5)", // Medium orchid
    'Primary teeth': "rgba(60, 179, 113, 0.5)"    // Medium sea green
  };

  const getScaledPoint = (e: React.MouseEvent<HTMLCanvasElement>) => {
    const canvas = canvasRef.current;
    if (!canvas) return null;

    const rect = canvas.getBoundingClientRect();
    return {
      x: e.clientX - rect.left,
      y: e.clientY - rect.top,
    };
  };

  const handleRemoveImage = () => {
    setSelectedFile(null);
    setUploadResponse(null);
    setAnnotations([]);
    setDrawings([]);
    setDrawingHistory([]);
    setIsDrawing(false);
    setIsPolygonDrawing(false);
    setCurrentPoints([]);
    setLastImageSize({ width: 0, height: 0 });

    const canvas = canvasRef.current;
    if (canvas) {
      const ctx = canvas.getContext("2d");
      if (ctx) {
        ctx.clearRect(0, 0, canvas.width, canvas.height);
      }
    }
  };

  const handleUndo = () => {
    if (drawingHistory.length > 0) {
      const previousState = drawingHistory[drawingHistory.length - 1];
      setDrawings(previousState);
      setDrawingHistory((history) => history.slice(0, -1));
      if (showSelecting) {
        setShowSelecting(false);
      }
    }
  };

  const handleUpload = async () => {
    if (!selectedFile) return;

    setIsLoading(true);
    setAnnotations([]); // Clear annotations to avoid mismatch during fetch
    setUploadResponse(null); // Reset response to ensure fresh data

    const formData = new FormData();
    formData.append("file", selectedFile);
    formData.append("model_name", checkType);

    try {
      const res = await axios.post(
        `${import.meta.env.VITE_API_URL}/api/inference/`,
        formData,
        {
          headers: {
            "Content-Type": "multipart/form-data",
            "ngrok-skip-browser-warning": "1",
          },
        }
      );

      const responseData = res.data as UploadResponse;
      setUploadResponse(responseData);
      processApiResponse(responseData);
    } catch (error) {
      console.error(error);
      toast.error("Failed to process image");
    } finally {
      setIsLoading(false);
    }
  };

  const findNearestPoint = (x: number, y: number) => {
    const threshold = 10;

    for (const drawing of drawings) {
      if (!drawing.visible) continue;

      switch (drawing.type) {
        case "rectangle": {
          const points = [
            [drawing.points[0], drawing.points[1]],
            [drawing.points[2], drawing.points[1]],
            [drawing.points[2], drawing.points[3]],
            [drawing.points[0], drawing.points[3]],
          ];

          for (let i = 0; i < points.length; i++) {
            const dx = points[i][0] - x;
            const dy = points[i][1] - y;
            const distance = Math.sqrt(dx * dx + dy * dy);

            if (distance < threshold) {
              return {
                drawingId: drawing.id,
                pointIndex: i,
                originalX: points[i][0],
                originalY: points[i][1],
              };
            }
          }
          break;
        }
        case "line": {
          const points = [
            [drawing.points[0], drawing.points[1]],
            [drawing.points[2], drawing.points[3]],
          ];

          for (let i = 0; i < points.length; i++) {
            const dx = points[i][0] - x;
            const dy = points[i][1] - y;
            const distance = Math.sqrt(dx * dx + dy * dy);

            if (distance < threshold) {
              return {
                drawingId: drawing.id,
                pointIndex: i,
                originalX: points[i][0],
                originalY: points[i][1],
              };
            }
          }
          break;
        }
        case "polygon": {
          for (let i = 0; i < drawing.points.length; i += 2) {
            const dx = drawing.points[i] - x;
            const dy = drawing.points[i + 1] - y;
            const distance = Math.sqrt(dx * dx + dy * dy);

            if (distance < threshold) {
              return {
                drawingId: drawing.id,
                pointIndex: i / 2,
                originalX: drawing.points[i],
                originalY: drawing.points[i + 1],
              };
            }
          }
          break;
        }
      }
    }
    return null;
  };

  const findShapeAtPoint = (x: number, y: number) => {
    for (const drawing of drawings) {
      if (!drawing.visible) continue;

      switch (drawing.type) {
        case "rectangle": {
          const [x1, y1, x2, y2] = drawing.points;
          if (x >= x1 && x <= x2 && y >= y1 && y <= y2) {
            return drawing.id;
          }
          break;
        }
        case "line": {
          const [x1, y1, x2, y2] = drawing.points;
          const distance = pointToLineDistance(x, y, x1, y1, x2, y2);
          if (distance < 10) {
            return drawing.id;
          }
          break;
        }
        case "polygon": {
          if (isPointInPolygon(x, y, drawing.points)) {
            return drawing.id;
          }
          break;
        }
        case "point": {
          const [px, py] = drawing.points;
          const distance = Math.sqrt((x - px) ** 2 + (y - py) ** 2);
          if (distance < 10) {
            return drawing.id;
          }
          break;
        }
      }
    }
    return null;
  };

  const pointToLineDistance = (
    x: number,
    y: number,
    x1: number,
    y1: number,
    x2: number,
    y2: number
  ) => {
    const A = x - x1;
    const B = y - y1;
    const C = x2 - x1;
    const D = y2 - y1;

    const dot = A * C + B * D;
    const len_sq = C * C + D * D;
    const param = len_sq !== 0 ? dot / len_sq : -1;

    let xx, yy;
    if (param < 0) {
      xx = x1;
      yy = y1;
    } else if (param > 1) {
      xx = x2;
      yy = y2;
    } else {
      xx = x1 + param * C;
      yy = y1 + param * D;
    }

    const dx = x - xx;
    const dy = y - yy;
    return Math.sqrt(dx * dx + dy * dy);
  };

  const isPointInPolygon = (x: number, y: number, points: number[]) => {
    let inside = false;
    for (let i = 0, j = points.length - 2; i < points.length; i += 2) {
      const xi = points[i];
      const yi = points[i + 1];
      const xj = points[j];
      const yj = points[j + 1];

      if ((yi > y) !== (yj > y) && x < ((xj - xi) * (y - yi)) / (yj - yi) + xi) {
        inside = !inside;
      }
      j = i;
    }
    return inside;
  };

  const startDrawing = (e: React.MouseEvent<HTMLCanvasElement>) => {
    if (!isAnnotationEnabled || (currentTool === "select" && !isTransforming)) return;

    const canvas = canvasRef.current;
    if (!canvas) return;

    const point = getScaledPoint(e);
    if (!point) return;

    const { x, y } = point;

    if (currentTool === "move") {
      const shapeId = findShapeAtPoint(x, y);
      if (shapeId) {
        setIsTransforming(true);
        setSelectedShape(shapeId);
        setTransformOrigin({ x, y });
        return;
      }
    }

    if (isDrawing || (isPolygonDrawing && currentTool !== "polygon")) {
      setIsDrawing(false);
      setIsPolygonDrawing(false);
      setCurrentPoints([]);
      setStartPoint(null);
      drawAnnotations();
      return;
    }

    if (currentTool === "reshape") {
      const nearestPoint = findNearestPoint(x, y);
      if (nearestPoint) {
        setSelectedDrawingId(nearestPoint.drawingId);
        setSelectedPointIndex(nearestPoint.pointIndex);
        setIsDraggingPoint(true);
        setDraggedPointOffset({
          x: x - nearestPoint.originalX,
          y: y - nearestPoint.originalY,
        });
        return;
      }
    } else if (currentTool === "polygon") {
      if (!isPolygonDrawing) {
        setIsPolygonDrawing(true);
        setCurrentPoints([x, y]);
      } else {
        const startX = currentPoints[0];
        const startY = currentPoints[1];
        const distance = Math.sqrt(
          Math.pow(x - startX, 2) + Math.pow(y - startY, 2)
        );

        if (distance < SNAP_THRESHOLD && currentPoints.length >= 6) {
          setDrawingHistory((history) => [...history, [...drawings]]);
          const newDrawing: Drawing = {
            type: "polygon",
            points: [...currentPoints],
            label: ``,
            id: `drawing-${Date.now()}`,
            visible: true,
            transform: { scale: 1, rotation: 0, translate: { x: 0, y: 0 } },
          };
          setDrawings([...drawings, newDrawing]);
          setIsPolygonDrawing(false);
          setCurrentPoints([]);
          setShowSelecting(true);
        } else {
          setCurrentPoints((prev) => [...prev, x, y]);
        }
      }
    } else if (currentTool === "point") {
      setDrawingHistory((history) => [...history, [...drawings]]);
      const newDrawing: Drawing = {
        type: "point",
        points: [x, y],
        label: ``,
        id: `drawing-${Date.now()}`,
        visible: true,
        transform: { scale: 1, rotation: 0, translate: { x: 0, y: 0 } },
      };
      setDrawings([...drawings, newDrawing]);
      setShowSelecting(true);
    } else {
      setIsDrawing(true);
      setStartPoint({ x, y });
    }
  };

  const drawShape = (ctx: CanvasRenderingContext2D, drawing: Drawing) => {
    if (!drawing.visible) return;

    ctx.beginPath();
    ctx.strokeStyle = "#00FF00";
    ctx.lineWidth = 2;

    const points = drawing.points;
    switch (drawing.type) {
      case "rectangle":
        const [x1, y1, x2, y2] = points;
        ctx.strokeRect(x1, y1, x2 - x1, y2 - y1);
        break;
      case "line":
        ctx.moveTo(points[0], points[1]);
        ctx.lineTo(points[2], points[3]);
        ctx.stroke();
        break;
      case "point":
        ctx.arc(points[0], points[1], 3, 0, Math.PI * 2);
        ctx.fill();
        break;
      case "polygon":
        ctx.moveTo(points[0], points[1]);
        for (let i = 2; i < points.length; i += 2) {
          ctx.lineTo(points[i], points[i + 1]);
        }
        ctx.closePath();
        ctx.stroke();
        break;
    }

    if (drawing.label) {
      ctx.font = "14px Arial";
      const textMetrics = ctx.measureText(drawing.label);
      ctx.fillStyle = "rgba(0, 255, 0, 0.7)";
      ctx.fillRect(points[0], points[1] - 20, textMetrics.width + 10, 20);
      ctx.fillStyle = "#FFFFFF";
      ctx.fillText(drawing.label, points[0] + 5, points[1] - 5);
    }
  };

  const draw = (e: React.MouseEvent<HTMLCanvasElement>) => {
    if (!isAnnotationEnabled) return;

    const canvas = canvasRef.current;
    if (!canvas) return;

    const rect = canvas.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;

    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    if (isTransforming && selectedShape && currentTool === "move") {
      const drawing = drawings.find((d) => d.id === selectedShape);
      if (!drawing || !transformOrigin) return;

      const dx = x - transformOrigin.x;
      const dy = y - transformOrigin.y;

      setDrawings(
        drawings.map((d) => {
          if (d.id === selectedShape) {
            return {
              ...d,
              points: d.points.map((point, index) =>
                index % 2 === 0 ? point + dx : point + dy
              ),
              transform: {
                ...d.transform,
                translate: {
                  x: (d.transform?.translate?.x || 0) + dx,
                  y: (d.transform?.translate?.y || 0) + dy,
                },
              },
            };
          }
          return d;
        })
      );

      setTransformOrigin({ x, y });
      drawAnnotations();
      return;
    }

    const point = getScaledPoint(e);
    if (!point) return;

    if (
      isDraggingPoint &&
      selectedDrawingId !== null &&
      selectedPointIndex !== null
    ) {
      const offsetX = draggedPointOffset
        ? point.x - draggedPointOffset.x
        : point.x;
      const offsetY = draggedPointOffset
        ? point.y - draggedPointOffset.y
        : point.y;

      setDrawings((prev) =>
        prev.map((drawing) => {
          if (drawing.id !== selectedDrawingId) return drawing;

          const newPoints = [...drawing.points];
          switch (drawing.type) {
            case "rectangle": {
              if (selectedPointIndex === 0) {
                newPoints[0] = offsetX;
                newPoints[1] = offsetY;
              } else if (selectedPointIndex === 1) {
                newPoints[2] = offsetX;
                newPoints[1] = offsetY;
              } else if (selectedPointIndex === 2) {
                newPoints[2] = offsetX;
                newPoints[3] = offsetY;
              } else if (selectedPointIndex === 3) {
                newPoints[0] = offsetX;
                newPoints[3] = offsetY;
              }
              break;
            }
            case "line": {
              const pointIndex = selectedPointIndex * 2;
              newPoints[pointIndex] = offsetX;
              newPoints[pointIndex + 1] = offsetY;
              break;
            }
            case "polygon": {
              newPoints[selectedPointIndex * 2] = offsetX;
              newPoints[selectedPointIndex * 2 + 1] = offsetY;
              break;
            }
          }
          return { ...drawing, points: newPoints };
        })
      );

      drawAnnotations();
      return;
    }

    if (isDrawing || isPolygonDrawing) {
      drawAnnotations();

      if (currentTool === "polygon" && isPolygonDrawing) {
        ctx.beginPath();
        ctx.strokeStyle = "#00FF00";
        ctx.lineWidth = 2;
        ctx.moveTo(currentPoints[0], currentPoints[1]);
        for (let i = 2; i < currentPoints.length; i += 2) {
          ctx.lineTo(currentPoints[i], currentPoints[i + 1]);
        }
        ctx.lineTo(x, y);

        const startX = currentPoints[0];
        const startY = currentPoints[1];
        const distance = Math.sqrt(
          Math.pow(x - startX, 2) + Math.pow(y - startY, 2)
        );
        if (distance < SNAP_THRESHOLD && currentPoints.length >= 6) {
          ctx.lineTo(startX, startY);
        }

        ctx.stroke();
      } else if (startPoint) {
        drawShape(ctx, {
          type: currentTool,
          points: [startPoint.x, startPoint.y, x, y],
          visible: true,
          label: "",
        } as any);
      }
    }
  };

  const renderTransformButton = (drawing: Drawing) => {
    if (!drawing.visible || currentTool !== "move") return null;

    const x = drawing.points[0] + (drawing.transform?.translate.x || 0);
    const y = drawing.points[1] + (drawing.transform?.translate.y || 0);

    return (
      <button
        className="absolute p-1 bg-green-500 rounded-full transform -translate-x-1/2 -translate-y-1/2 cursor-move"
        style={{ left: x, top: y }}
        onMouseDown={(e) => {
          e.stopPropagation();
          setIsTransforming(true);
          setSelectedShape(drawing.id);
          setTransformOrigin({ x: e.clientX, y: e.clientY });
        }}
      >
        <FaArrowsAlt size={12} color="white" />
      </button>
    );
  };

  const endDrawing = (e: React.MouseEvent<HTMLCanvasElement>) => {
    if (isDraggingPoint) {
      setIsDraggingPoint(false);
      setSelectedDrawingId(null);
      setSelectedPointIndex(null);
      setDraggedPointOffset(null);
      return;
    }

    if (!isDrawing && !isPolygonDrawing || !isAnnotationEnabled) return;

    const canvas = canvasRef.current;
    if (!canvas) return;

    const rect = canvas.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;

    setSelectionPosition({ x, y });

    setDrawingHistory((history) => [...history, [...drawings]]);

    let newDrawing: Drawing | null = null;

    if (currentTool === "polygon") {
      if (e.detail === 2) {
        newDrawing = {
          type: "polygon",
          points: [...currentPoints],
          label: "",
          id: `drawing-${Date.now()}`,
          visible: true,
        };
        setIsPolygonDrawing(false);
        setCurrentPoints([]);
      }
    } else if (currentTool === "point") {
      newDrawing = {
        type: "point",
        points: [x, y],
        label: "",
        id: `drawing-${Date.now()}`,
        visible: true,
      };
      setIsDrawing(false);
    } else if (startPoint) {
      newDrawing = {
        type: currentTool,
        points: [startPoint.x, startPoint.y, x, y],
        label: "",
        id: `drawing-${Date.now()}`,
        visible: true,
      };
      setIsDrawing(false);
      setStartPoint(null);
    }

    if (newDrawing) {
      setDrawings([...drawings, newDrawing]);
      setShowSelecting(true);
    }
  };

  const handleSelectionSubmit = (
    toothNumber: string,
    pathology: string,
    customPathology?: string
  ) => {
    setDrawings((prev) => {
      const lastDrawing = prev[prev.length - 1];
      if (lastDrawing) {
        const label =
          pathology === "Other" && customPathology
            ? `${toothNumber}  ${customPathology}`
            : `${toothNumber}  ${pathology}`;

        const updatedDrawing = {
          ...lastDrawing,
          label,
          toothNumber,
          pathology,
          customPathology,
        };
        return [...prev.slice(0, -1), updatedDrawing];
      }
      return prev;
    });
    setShowSelecting(false);
  };

  const tools = [
    {
      id: "undo",
      icon: <FaUndo size={20} color="white" />,
      label: "Undo",
      onclickFn: handleUndo,
    },
    {
      id: "select",
      icon: <FaMousePointer size={20} color="white" />,
      label: "Select Tool",
      onclickFn: () => {
        setCurrentTool("select");
        setIsDrawing(false);
        setIsPolygonDrawing(false);
        setIsTransforming(false);
      },
    },
    {
      id: "move",
      icon: <FaArrowsAlt size={20} color="white" />,
      label: "Move Tool",
      onclickFn: () => {
        setCurrentTool("move");
        setIsDrawing(false);
        setIsPolygonDrawing(false);
      },
    },
    {
      id: "reshape",
      icon: <FaEdit size={20} color="white" />,
      label: "Reshape Tool",
      onclickFn: () => {
        setCurrentTool("reshape");
        setIsDrawing(false);
        setIsPolygonDrawing(false);
        setIsTransforming(false);
      },
    },
    {
      id: "rectangle",
      icon: <FaSquareFull size={20} color="white" />,
      label: "Rectangle Tool",
      onclickFn: () => {
        setCurrentTool("rectangle");
        setIsTransforming(false);
      },
    },
    {
      id: "line",
      icon: <BsDash size={20} color="white" />,
      label: "Line Tool",
      onclickFn: () => {
        setCurrentTool("line");
        setIsTransforming(false);
      },
    },
    {
      id: "point",
      icon: <FaCircle size={20} color="white" />,
      label: "Point Tool",
      onclickFn: () => {
        setCurrentTool("point");
        setIsTransforming(false);
      },
    },
    {
      id: "polygon",
      icon: <BsBoundingBoxCircles size={20} color="white" />,
      label: "Polygon Tool",
      onclickFn: () => {
        setCurrentTool("polygon");
        setIsTransforming(false);
      },
    },
  ];

  useEffect(() => {
    const handleMouseUp = () => {
      if (isTransforming) {
        setIsTransforming(false);
        setSelectedShape(null);
        setTransformOrigin(null);
      }
    };

    window.addEventListener("mouseup", handleMouseUp);
    return () => window.removeEventListener("mouseup", handleMouseUp);
  }, [isTransforming]);

  const processApiResponse = (responseData: UploadResponse) => {
    const classMap = new Map<string, Annotation>();

    responseData.data.results.forEach((result, index) => {
      const className = result.class;

      if (!classMap.has(className)) {
        classMap.set(className, {
          class: className,
          roi_xyxy: [],
        });
      }

      const annotation = classMap.get(className)!;
      annotation.roi_xyxy.push({
        coordinates: result.roi_xyxy[0],
        poly: result.poly ? result.poly[0] : undefined, // Safely handle missing poly
        visible: true,
        id: `${className}-${index}`,
        label: (index + 1).toString(),
      });
    });

    setAnnotations(Array.from(classMap.values()));
  };

  const toggleDrawingVisibility = (drawingId: string) => {
    setDrawings((prev) =>
      prev.map((drawing) => ({
        ...drawing,
        visible: drawing.id === drawingId ? !drawing.visible : drawing.visible,
      }))
    );
  };

  const drawAnnotations = useCallback(() => {
    const canvas = canvasRef.current;
    const container = containerRef.current;
    if (!canvas || !container || !imageSize.width || !imageSize.height) return;

    const imageElement = container.querySelector("img");
    if (!imageElement) return;

    const displayedWidth = imageElement.clientWidth;
    const displayedHeight = imageElement.clientHeight;

    canvas.width = displayedWidth;
    canvas.height = displayedHeight;
    canvas.style.width = `${displayedWidth}px`;
    canvas.style.height = `${displayedHeight}px`;

    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    ctx.clearRect(0, 0, canvas.width, canvas.height);

    if (!isAnnotationEnabled) return;

    const scaleX = displayedWidth / imageSize.width;
    const scaleY = displayedHeight / imageSize.height;

    annotations.forEach((annotation, annIndex) => {
      annotation.roi_xyxy.forEach((coord) => {
        if (!coord.visible) return;
        console.log(coord,"this si the coord coming");
        
        if (checkType === "path" && coord.poly && coord.poly.length > 0) {
          ctx.beginPath();
          const color = classColors[annotation.class] || "rgba(255, 0, 0, 0.5)";
          ctx.fillStyle = color;

          ctx.shadowColor = "rgba(0, 0, 0, 0.5)";
          ctx.shadowBlur = 5;
          ctx.shadowOffsetX = 2 * (annIndex + 1);
          ctx.shadowOffsetY = 2 * (annIndex + 1);

          ctx.moveTo(coord.poly[0][0] * scaleX, coord.poly[0][1] * scaleY);
          for (let i = 1; i < coord.poly.length; i++) {
            ctx.lineTo(coord.poly[i][0] * scaleX, coord.poly[i][1] * scaleY);
          }
          ctx.closePath();
          ctx.fill();

          ctx.shadowColor = "transparent";
          ctx.shadowBlur = 0;
          ctx.shadowOffsetX = 0;
          ctx.shadowOffsetY = 0;
          // Name labels adding in this part ( only for the annotations that coming from the backend , not drawings )
          const label = `${coord.label} ${annotation.class}`.trim();
          if (label) {
            ctx.font = "14px Arial";
            const textMetrics = ctx.measureText(label);
            const textHeight = 20;
            const labelX = coord.poly[0][0] * scaleX;
            const labelY = coord.poly[0][1] * scaleY;

            ctx.fillStyle = "rgba(255, 0, 0, 0.7)";
            ctx.fillRect(
              labelX,
              labelY - textHeight,
              textMetrics.width + 10,
              textHeight
            );

            ctx.fillStyle = "#FFFFFF";
            ctx.fillText(label, labelX + 5, labelY - 5);
          }
        } else {
          const [x1, y1, x2, y2] = coord.coordinates;

          const scaledX1 = x1 * scaleX;
          const scaledY1 = y1 * scaleY;
          const scaledX2 = x2 * scaleX;
          const scaledY2 = y2 * scaleY;

          ctx.strokeStyle = "#FF0000";
          ctx.lineWidth = 2;
          ctx.strokeRect(
            scaledX1,
            scaledY1,
            scaledX2 - scaledX1,
            scaledY2 - scaledY1
          );

          const label = `${coord.label} ${annotation.class}`.trim();
          if (label) {
            ctx.font = "14px Arial";
            const textMetrics = ctx.measureText(label);
            const textHeight = 20;

            ctx.fillStyle = "rgba(255, 0, 0, 0.7)";
            ctx.fillRect(
              scaledX1,
              scaledY1 - textHeight,
              textMetrics.width + 10,
              textHeight
            );

            ctx.fillStyle = "#FFFFFF";
            ctx.fillText(label, scaledX1 + 5, scaledY1 - 5);
          }
        }
      });
    });

    drawings.forEach((drawing) => {
      if (!drawing.visible) return;

      ctx.beginPath();
      ctx.strokeStyle = "#00FF00";
      ctx.lineWidth = 2;

      switch (drawing.type) {
        case "rectangle":
          ctx.strokeRect(
            drawing.points[0],
            drawing.points[1],
            drawing.points[2] - drawing.points[0],
            drawing.points[3] - drawing.points[1]
          );
          break;

        case "line":
          ctx.moveTo(drawing.points[0], drawing.points[1]);
          ctx.lineTo(drawing.points[2], drawing.points[3]);
          ctx.stroke();
          break;

        case "polygon":
          if (drawing.points.length >= 4) {
            ctx.moveTo(drawing.points[0], drawing.points[1]);
            for (let i = 2; i < drawing.points.length; i += 2) {
              ctx.lineTo(drawing.points[i], drawing.points[i + 1]);
            }
            ctx.closePath();
            ctx.stroke();
          }
          break;

        case "point":
          ctx.arc(drawing.points[0], drawing.points[1], 3, 0, Math.PI * 2);
          ctx.fill();
          break;
      }

      if (drawing.label && drawing.label.trim()) {
        ctx.font = "14px Arial";
        const textMetrics = ctx.measureText(drawing.label);
        const textHeight = 20;

        ctx.fillStyle = "rgba(0, 255, 0, 0.7)";
        ctx.fillRect(
          drawing.points[0],
          drawing.points[1] - textHeight,
          textMetrics.width + 10,
          textHeight
        );

        ctx.fillStyle = "#FFFFFF";
        ctx.fillText(
          drawing.label.trim(),
          drawing.points[0] + 5,
          drawing.points[1] - 5
        );
      }
    });
  }, [annotations, isAnnotationEnabled, imageSize, drawings, checkType]);

  

  useEffect(() => {
    drawAnnotations();
  }, [drawAnnotations]);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    canvas.style.cursor = currentTool === "select" ? "default" : "crosshair";
  }, [currentTool]);

  // Resize handler with API refetch
  useEffect(() => {
    if (!selectedFile || !uploadResponse) return;

    const handleResize = () => {
      const imageElement = containerRef.current?.querySelector("img");
      if (!imageElement) return;

      const newWidth = imageElement.clientWidth;
      const newHeight = imageElement.clientHeight;

      if (
        Math.abs(newWidth - lastImageSize.width) > 10 ||
        Math.abs(newHeight - lastImageSize.height) > 10
      ) {
        setLastImageSize({ width: newWidth, height: newHeight });
        handleUpload(); // Refetch API data on significant resize
      }
    };

    window.addEventListener("resize", handleResize);
    handleResize(); // Initial call to set size

    return () => window.removeEventListener("resize", handleResize);
  }, [selectedFile, uploadResponse, lastImageSize, handleUpload]);

  // Handle checkType switch with API refetch
  useEffect(() => {
    if (selectedFile) {
      handleUpload(); // Refetch API data when checkType changes
    }
  }, [checkType, selectedFile]);

  const updateAnnotationLabel = (
    className: string,
    coordId: string,
    newLabel: string
  ) => {
    setAnnotations((prev) =>
      prev.map((ann) => {
        if (ann.class === className) {
          return {
            ...ann,
            roi_xyxy: ann.roi_xyxy.map((coord) => ({
              ...coord,
              label: coord.id === coordId ? newLabel : coord.label,
            })),
          };
        }
        return ann;
      })
    );
    setEditingId(null);
  };

  const toggleAnnotationVisibility = (className: string, coordId: string) => {
    setAnnotations((prev) =>
      prev.map((ann) => {
        if (ann.class === className) {
          return {
            ...ann,
            roi_xyxy: ann.roi_xyxy.map((coord) => ({
              ...coord,
              visible: coord.id === coordId ? !coord.visible : coord.visible,
            })),
          };
        }
        return ann;
      })
    );
  };

  const handleDelete = (className: string, coordId: string) => {
    setAnnotations((prev) =>
      prev
        .map((ann) => {
          if (ann.class === className) {
            return {
              ...ann,
              roi_xyxy: ann.roi_xyxy.filter((coord) => coord.id !== coordId),
            };
          }
          return ann;
        })
        .filter((ann) => ann.roi_xyxy.length > 0)
    );
  };

  const handleKeyPress = (
    e: React.KeyboardEvent,
    className: string,
    coordId: string,
    label: string
  ) => {
    if (e.key === "Enter") {
      updateAnnotationLabel(className, coordId, label);
      setEditingId(null);
    }
  };

  const deleteDrawing = (drawingId: string) => {
    setDrawings((prev) => prev.filter((drawing) => drawing.id !== drawingId));
  };

  const handleDownloadWithAnnotations = () => {
    if (!selectedFile) {
      toast.error("No image to download");
      return;
    }

    const tempCanvas = document.createElement("canvas");
    const tempCtx = tempCanvas.getContext("2d");
    if (!tempCtx) return;

    tempCanvas.width = imageSize.width;
    tempCanvas.height = imageSize.height;

    const img = new Image();
    img.onload = () => {
      const displayedImage = containerRef.current?.querySelector("img");
      if (!displayedImage) return;

      const displayedWidth = displayedImage.clientWidth;
      const displayedHeight = displayedImage.clientHeight;

      const scaleX = imageSize.width / displayedWidth;
      const scaleY = imageSize.height / displayedHeight;

      tempCtx.drawImage(img, 0, 0, imageSize.width, imageSize.height);

      if (isAnnotationEnabled) {
        annotations.forEach((annotation, annIndex) => {
          annotation.roi_xyxy.forEach((coord) => {
            if (!coord.visible) return;

            if (checkType === "path" && coord.poly && coord.poly.length > 0) {
              tempCtx.beginPath();
              const color = classColors[annotation.class] || "rgba(255, 0, 0, 0.5)";
              tempCtx.fillStyle = color;

              tempCtx.shadowColor = "rgba(0, 0, 0, 0.5)";
              tempCtx.shadowBlur = 5;
              tempCtx.shadowOffsetX = 2 * (annIndex + 1);
              tempCtx.shadowOffsetY = 2 * (annIndex + 1);

              tempCtx.moveTo(coord.poly[0][0], coord.poly[0][1]);
              for (let i = 1; i < coord.poly.length; i++) {
                tempCtx.lineTo(coord.poly[i][0], coord.poly[i][1]);
              }
              tempCtx.closePath();
              tempCtx.fill();

              tempCtx.shadowColor = "transparent";
              tempCtx.shadowBlur = 0;
              tempCtx.shadowOffsetX = 0;
              tempCtx.shadowOffsetY = 0;

              const label = `${annotation.class} ${coord.label}`;
              const textMetrics = tempCtx.measureText(label);
              const textHeight = 20;
              tempCtx.fillStyle = "rgba(255, 0, 0, 0.7)";
              tempCtx.fillRect(
                coord.poly[0][0],
                coord.poly[0][1] - textHeight,
                textMetrics.width + 10,
                textHeight
              );

              tempCtx.fillStyle = "#FFFFFF";
              tempCtx.fillText(label, coord.poly[0][0] + 5, coord.poly[0][1] - 5);
            } else {
              const [x1, y1, x2, y2] = coord.coordinates;

              tempCtx.strokeStyle = "#FF0000";
              tempCtx.lineWidth = 2;
              tempCtx.font = "14px Arial";

              tempCtx.strokeRect(x1, y1, x2 - x1, y2 - y1);

              const label = `${annotation.class} ${coord.label}`;
              const textMetrics = tempCtx.measureText(label);
              const textHeight = 20;
              tempCtx.fillStyle = "rgba(255, 0, 0, 0.7)";
              tempCtx.fillRect(
                x1,
                y1 - textHeight,
                textMetrics.width + 10,
                textHeight
              );

              tempCtx.fillStyle = "#FFFFFF";
              tempCtx.fillText(label, x1 + 5, y1 - 5);
            }
          });
        });

        drawings.forEach((drawing) => {
          if (!drawing.visible) return;

          tempCtx.beginPath();
          tempCtx.strokeStyle = "#00FF00";
          tempCtx.lineWidth = 2 * scaleX;
          const fontSize = Math.round(14 * scaleX);
          tempCtx.font = `${fontSize}px Arial`;

          switch (drawing.type) {
            case "rectangle": {
              const scaledX1 = drawing.points[0] * scaleX;
              const scaledY1 = drawing.points[1] * scaleY;
              const scaledX2 = drawing.points[2] * scaleX;
              const scaledY2 = drawing.points[3] * scaleY;

              tempCtx.strokeRect(
                scaledX1,
                scaledY1,
                scaledX2 - scaledX1,
                scaledY2 - scaledY1
              );

              const textMetrics = tempCtx.measureText(drawing.label);
              const textHeight = 20 * scaleY;
              tempCtx.fillStyle = "rgba(0, 255, 0, 0.7)";
              tempCtx.fillRect(
                scaledX1,
                scaledY1 - textHeight,
                textMetrics.width + 10 * scaleX,
                textHeight
              );
              tempCtx.fillStyle = "#FFFFFF";
              tempCtx.fillText(
                drawing.label,
                scaledX1 + 5 * scaleX,
                scaledY1 - 5 * scaleY
              );
              break;
            }

            case "line": {
              const scaledX1 = drawing.points[0] * scaleX;
              const scaledY1 = drawing.points[1] * scaleY;
              const scaledX2 = drawing.points[2] * scaleX;
              const scaledY2 = drawing.points[3] * scaleY;

              tempCtx.moveTo(scaledX1, scaledY1);
              tempCtx.lineTo(scaledX2, scaledY2);
              tempCtx.stroke();

              const textMetrics = tempCtx.measureText(drawing.label);
              const textHeight = 20 * scaleY;
              tempCtx.fillStyle = "rgba(0, 255, 0, 0.7)";
              tempCtx.fillRect(
                scaledX1,
                scaledY1 - textHeight,
                textMetrics.width + 10 * scaleX,
                textHeight
              );
              tempCtx.fillStyle = "#FFFFFF";
              tempCtx.fillText(
                drawing.label,
                scaledX1 + 5 * scaleX,
                scaledY1 - 5 * scaleY
              );
              break;
            }
            case "point": {
              const scaledX = drawing.points[0] * scaleX;
              const scaledY = drawing.points[1] * scaleY;

              tempCtx.beginPath();
              tempCtx.arc(scaledX, scaledY, 3 * scaleX, 0, Math.PI * 2);
              tempCtx.fill();
              tempCtx.stroke();

              const textMetrics = tempCtx.measureText(drawing.label);
              const textHeight = 20 * scaleY;
              tempCtx.fillStyle = "rgba(0, 255, 0, 0.7)";
              tempCtx.fillRect(
                scaledX,
                scaledY - textHeight,
                textMetrics.width + 10 * scaleX,
                textHeight
              );
              tempCtx.fillStyle = "#FFFFFF";
              tempCtx.fillText(
                drawing.label,
                scaledX + 5 * scaleX,
                scaledY - 5 * scaleY
              );
              break;
            }

            case "polygon": {
              if (drawing.points.length >= 4) {
                const scaledPoints = drawing.points.map((point, index) =>
                  index % 2 === 0 ? point * scaleX : point * scaleY
                );

                tempCtx.moveTo(scaledPoints[0], scaledPoints[1]);
                for (let i = 2; i < scaledPoints.length; i += 2) {
                  tempCtx.lineTo(scaledPoints[i], scaledPoints[i + 1]);
                }
                tempCtx.closePath();
                tempCtx.stroke();

                const textMetrics = tempCtx.measureText(drawing.label);
                const textHeight = 20 * scaleY;
                tempCtx.fillStyle = "rgba(0, 255, 0, 0.7)";
                tempCtx.fillRect(
                  scaledPoints[0],
                  scaledPoints[1] - textHeight,
                  textMetrics.width + 10 * scaleX,
                  textHeight
                );
                tempCtx.fillStyle = "#FFFFFF";
                tempCtx.fillText(
                  drawing.label,
                  scaledPoints[0] + 5 * scaleX,
                  scaledPoints[1] - 5 * scaleY
                );
              }
              break;
            }
          }
        });
      }

      tempCanvas.toBlob((blob) => {
        if (blob) {
          const url = URL.createObjectURL(blob);
          const link = document.createElement("a");
          link.href = url;
          link.download = `annotated_${selectedFile.name}`;
          document.body.appendChild(link);
          link.click();
          document.body.removeChild(link);
          URL.revokeObjectURL(url);
          toast.success("Download completed");
        }
      }, "image/png");
    };

    img.src = URL.createObjectURL(selectedFile);
  };

  const onDrop = useCallback((acceptedFiles: File[]) => {
    const file = acceptedFiles[0];
    if (file) {
      setUploadResponse(null);
      setAnnotations([]);
      setSelectedFile(file);

      const img = new Image();
      img.onload = () => {
        setImageSize({
          width: img.width,
          height: img.height,
        });
      };
      img.src = URL.createObjectURL(file);
    }
  }, []);

  const {
    getRootProps,
    getInputProps,
    isDragActive,
    isDragReject,
  } = useDropzone({
    onDrop,
    accept: {
      "image/*": [".jpeg", ".png", ".gif", ".jpg"],
    },
    multiple: false,
  });

  const renderAnnotationsList = () => (
    <AnnotationsList
      annotations={annotations}
      drawings={drawings}
      editingId={editingId}
      editingDrawing={editingDrawing}
      setEditingId={setEditingId}
      setEditingDrawing={setEditingDrawing}
      toggleAnnotationVisibility={toggleAnnotationVisibility}
      toggleDrawingVisibility={toggleDrawingVisibility}
      handleDelete={handleDelete}
      deleteDrawing={deleteDrawing}
      setDrawings={setDrawings}
      setAnnotations={setAnnotations}
      handleKeyPress={handleKeyPress}
    />
  );

  return (
    <div className="xl:flex grid min-h-screen bg-black w-full max-w-[2000px] mx-auto">
      {isLoading && <LoadingSpinner />}

      <main className="w-4/5 max-xl:w-full flex flex-col">
        <header className="h-24 max-[400px]:mx-auto flex items-center justify-start text-[50px] font-bold text-white px-10 pt-10">
          <img src="/hhhh.png" className="h-12" alt="Vi.Ai-logo" />
        </header>

        <section className="flex justify-center items-center p-4 gap-5">
          <div className="flex items-center max-[400px]:flex-col max-[400px]:gap-2 max-[400px]:mt-3">
            <label
              className={`mr-2 max-[400px]:text-sm text-lg font-medium ${
                checkType === "qc" ? "text-white" : "text-gray-500"
              }`}
            >
              Quality Check
            </label>
            <Switch
              checked={checkType === "path"}
              onChange={(checked) => setCheckType(checked ? "path" : "qc")}
              onColor="#8B2B91"
              offColor="#ccc"
              height={20}
              width={50}
              handleDiameter={20}
              uncheckedIcon={false}
              checkedIcon={false}
            />
            <label
              className={`ml-2 max-[400px]:text-sm font-medium text-lg ${
                checkType === "path" ? "text-white" : "text-gray-500"
              }`}
            >
              Pathology Check
            </label>
          </div>
        </section>

        <section className="sm:mx-10 my-4 border-2 border-[#393838] border-dotted rounded-lg p-4 h-[650px]">
          <div
            {...(!selectedFile ? getRootProps() : {})}
            className={`relative border-2 border-[#393838] border-dotted rounded-lg p-4 h-full flex flex-col items-center justify-center cursor-pointer 
                                  ${
                                    isDragActive
                                      ? "bg-gray-700"
                                      : "hover:bg-gray-800"
                                  }
                                  ${isDragReject ? "border-red-500" : ""} 
                                  transition-colors duration-300`}
          >
            {selectedFile ? (
              <>
                <div className="text-center relative" ref={containerRef}>
                  <p className="text-gray-500 text-xs mb-2">
                    {"< " + selectedFile.name + " >"}
                  </p>
                  <div className="relative inline-block">
                    <img
                      src={URL.createObjectURL(selectedFile)}
                      alt="Uploaded"
                      className="max-h-[500px] max-w-full object-contain mb-4"
                      style={{ width: "auto", height: "auto" }}
                    />
                    <canvas
                      ref={canvasRef}
                      className="absolute top-0 left-0"
                      style={{
                        width: "100%",
                        height: "100%",
                        cursor:
                          currentTool === "select" ? "default" : "crosshair",
                      }}
                      onMouseDown={startDrawing}
                      onMouseMove={draw}
                      onMouseUp={endDrawing}
                      onMouseLeave={() => setIsDrawing(false)}
                    />
                    {drawings.map((drawing) => renderTransformButton(drawing))}
                  </div>
                </div>

                {showSelecting && (
                  <div className="absolute h-full w-full bg-transparent flex justify-center items-center">
                    <SelectionUI
                      canvasRef={canvasRef}
                      handleSelectionSubmit={handleSelectionSubmit}
                      toothNumberOptions={toothNumberOptions}
                      pathologyOptions={pathologyOptions}
                    />
                  </div>
                )}

                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    handleUpload();
                  }}
                  className="bg-white text-red-800 px-4 py-2 rounded mt-2"
                  disabled={isLoading}
                >
                  {isLoading ? "Processing..." : "Run AI"}
                </button>
              </>
            ) : (
              <>
                <input {...getInputProps()} />
                <div className="flex flex-col items-center justify-center">
                  <MdOutlineCloudUpload
                    size={64}
                    className="text-[#393838] mb-4"
                  />
                  <p className="text-[#393838] text-lg flex text-center max-[400px]:text-xs">
                    {isDragActive
                      ? "Drop the image here ..."
                      : "Drag and drop an image here, or click to select a file"}
                  </p>
                </div>
              </>
            )}
          </div>
        </section>

        <section className="flex max-sm:flex-col max-sm:gap-3 justify-between items-center p-4 mx-10 my-4">
          <div className="flex gap-4">
            <Toolbar tools={tools} />

            {selectedFile && (
              <button
                className="flex items-center gap-2 px-4 py-2 bg-[#202020] rounded-md"
                onClick={handleRemoveImage}
              >
                <RiDeleteBinLine color="white" size={24} />
              </button>
            )}

            <button
              className="flex items-center gap-2 px-4 py-2 bg-[#202020] rounded-md"
              onClick={handleDownloadWithAnnotations}
            >
              <MdOutlineFileDownload color="white" size={24} />
            </button>
          </div>

          <div className="flex max-[400px]:flex-col items-center">
            <label className="max-[400px]:mr-0 mr-4 text-lg font-bold">
              Annotation
            </label>
            <label
              className={`mr-2 text-lg font-medium ${
                !isAnnotationEnabled ? "text-white" : "text-gray-500"
              }`}
            >
              Off
            </label>
            <Switch
              checked={isAnnotationEnabled}
              onChange={setIsAnnotationEnabled}
              className="mx-2"
              offColor="#ccc"
              height={20}
              width={50}
              handleDiameter={20}
              uncheckedIcon={false}
              checkedIcon={false}
            />
            <label
              className={`max-[400px]:ml-0 ml-2 font-medium text-lg ${
                isAnnotationEnabled ? "text-white" : "text-gray-500"
              }`}
            >
              On
            </label>
          </div>
        </section>
      </main>

      <aside className="bg-black max-xl:w-full w-1/5 flex flex-col pt-24 px-4">
        <h2 className="text-[30px] font-bold text-white max-sm:text-lg mb-4">
          OPG Analysis
        </h2>
        {renderAnnotationsList()}
      </aside>
    </div>
  );
};

export default FileUpload;