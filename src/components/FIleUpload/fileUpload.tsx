import React, { useCallback, useEffect, useState, useRef } from 'react';
import { useDropzone } from 'react-dropzone';
import { MdOutlineCloudUpload, MdOutlineFileDownload } from "react-icons/md";
import { RiDeleteBinLine } from "react-icons/ri";
import Switch from 'react-switch';
import axios from 'axios';
import { toast } from 'sonner';
import { FaSquareFull, FaCircle, FaArrowsAlt, FaMousePointer, FaEdit, FaUndo } from "react-icons/fa";
import { BsDash, BsBoundingBoxCircles } from "react-icons/bs";
import Toolbar from '../Reusable/Toolbar';
import AnnotationsList from './AnnotationsList';
import LoadingSpinner from '../Loading/Loading';
import SelectionUI from './SelectionUI';


/**
 * Interface representing a drawing annotation.
 */
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


/**
 * Interface for annotation data containing class and regions of interest (ROI).
 */
interface Annotation {
  class: string;
  roi_xyxy: Array<{
    coordinates: number[];
    visible: boolean;
    id: string;
    label: string;
  }>;
}

/**
 * Interface representing the response structure from an upload request.
 */
interface UploadResponse {
  message: string;
  data: {
    inference_time: number;
    results: Annotation[];
    unique_id: string;
  };
}

const SNAP_THRESHOLD = 10;

/**
 * FileUpload component handles file uploads and annotations.
 */
const FileUpload = () => {
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [checkType, setCheckType] = useState<'qc' | 'path'>('qc');
  const [isAnnotationEnabled, setIsAnnotationEnabled] = useState(true);
  const [_uploadResponse, setUploadResponse] = useState<UploadResponse | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [annotations, setAnnotations] = useState<Annotation[]>([]);
  const [imageSize, setImageSize] = useState({ width: 0, height: 0 });
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  // const [zoomLevel, setZoomLevel] = useState<any>(window.devicePixelRatio);
  // const [timer, setTimer] = useState<any | null>(null);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [drawings, setDrawings] = useState<Drawing[]>([]);
  const [isDrawing, setIsDrawing] = useState(false);
  const [currentTool, setCurrentTool] = useState<string>("select");
  const [startPoint, setStartPoint] = useState<{ x: number; y: number } | null>(null);
  const [currentPoints, setCurrentPoints] = useState<number[]>([]);
  const [isPolygonDrawing, setIsPolygonDrawing] = useState(false);
  const [isTransforming, setIsTransforming] = useState(false);
  const [selectedShape, setSelectedShape] = useState<string | null>(null);
  const [transformOrigin, setTransformOrigin] = useState<{ x: number, y: number } | null>(null);
  const [selectedDrawingId, setSelectedDrawingId] = useState<string | null>(null);
  const [isDraggingPoint, setIsDraggingPoint] = useState(false);
  const [selectedPointIndex, setSelectedPointIndex] = useState<number | null>(null);
  const [draggedPointOffset, setDraggedPointOffset] = useState<{ x: number, y: number } | null>(null);
  const [drawingHistory, setDrawingHistory] = useState<Drawing[][]>([]);
  const [showSelecting, setShowSelecting] = useState(false)
  const [_selectionPosition, setSelectionPosition] = useState({ x: 0, y: 0 });
  const [editingDrawing, setEditingDrawing] = useState<{
    id: string;
    toothNumber: string;
    pathology: string;
    customPathology: string;
  } | null>(null);

  const toothNumberOptions = [" ", "1", "2", "3", "4", "5", "6", "7", "8"];
  const pathologyOptions = [...["Cavity", "Missing", "Fracture", "Decay"], "Other"];



  /**
   * Function to get the scaled point coordinates from a mouse event.
   */
  const getScaledPoint = (e: React.MouseEvent<HTMLCanvasElement>) => {
    const canvas = canvasRef.current;
    if (!canvas) return null;

    const rect = canvas.getBoundingClientRect();
    return {
      x: e.clientX - rect.left,
      y: e.clientY - rect.top
    };
  };

  // Function to remove the selected image
  const handleRemoveImage = () => {
    setSelectedFile(null);
    setUploadResponse(null);
    setAnnotations([]);
    setDrawings([]);
    setDrawingHistory([]);
    setIsDrawing(false);
    setIsPolygonDrawing(false);
    setCurrentPoints([]);

    // Clear the canvas
    const canvas = canvasRef.current;
    if (canvas) {
      const ctx = canvas.getContext('2d');
      if (ctx) {
        ctx.clearRect(0, 0, canvas.width, canvas.height);
      }
    }
  };

  // Function to handle undo operation
  const handleUndo = () => {
    if (drawingHistory.length > 0) {
      const previousState = drawingHistory[drawingHistory.length - 1];
      setDrawings(previousState);
      setDrawingHistory(history => history.slice(0, -1));
      if (showSelecting) {
        setShowSelecting(false)
      }
    }
  };

  /**
   * Function to handle file upload to the server.
   */
  const handleUpload = async () => {
    if (!selectedFile) return;

    setIsLoading(true);
    const formData = new FormData();
    formData.append("file", selectedFile);
    formData.append("model_name", checkType);

    try {
      const res = await axios.post(`${import.meta.env.VITE_API_URL}/api/inference/`, formData, {
        headers: {
          "Content-Type": "multipart/form-data",
          'ngrok-skip-browser-warning': '1',
        },
      });

      const responseData = res.data as UploadResponse;
      setUploadResponse(responseData);
      processApiResponse(responseData);
    } catch (error) {
      console.error(error);
      toast.error('Failed to process image');
    } finally {
      setIsLoading(false);
    }
  };

  /**
   * Function to find the nearest point within a drawing.
   * Checks distance against a threshold to determine proximity.
   */
  const findNearestPoint = (x: number, y: number) => {
    const threshold = 10;

    for (const drawing of drawings) {
      if (!drawing.visible) continue;

      switch (drawing.type) {
        case "rectangle": {
          const points = [
            [drawing.points[0], drawing.points[1]], // top-left
            [drawing.points[2], drawing.points[1]], // top-right
            [drawing.points[2], drawing.points[3]], // bottom-right
            [drawing.points[0], drawing.points[3]]  // bottom-left
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
                originalY: points[i][1]
              };
            }
          }
          break;
        }
        case "line": {
          const points = [
            [drawing.points[0], drawing.points[1]], // start
            [drawing.points[2], drawing.points[3]]  // end
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
                originalY: points[i][1]
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
                originalY: drawing.points[i + 1]
              };
            }
          }
          break;
        }
      }
    }
    return null;
  };



  /**
   * Drawing shapes function for start drawing
   */
  const startDrawing = (e: React.MouseEvent<HTMLCanvasElement>) => {
    if (!isAnnotationEnabled || currentTool === "select") return;

    const canvas = canvasRef.current;
    if (!canvas) return;

    const point = getScaledPoint(e);
    if (!point) return;

    const { x, y } = point;

    // Clear any existing temporary drawings when starting a new one
    if (isDrawing || (isPolygonDrawing && currentTool !== "polygon")) {
      setIsDrawing(false);
      setIsPolygonDrawing(false);
      setCurrentPoints([]);
      setStartPoint(null);
      drawAnnotations(); // Redraw to clear any temporary drawings
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
          y: y - nearestPoint.originalY
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
        const distance = Math.sqrt(Math.pow(x - startX, 2) + Math.pow(y - startY, 2));

        if (distance < SNAP_THRESHOLD && currentPoints.length >= 6) {
          // Save history before completing polygon
          setDrawingHistory(history => [...history, [...drawings]]);
          const newDrawing: Drawing = {
            type: "polygon",
            points: [...currentPoints],
            label: `Polygon ${drawings.length + 1}`,
            id: `drawing-${Date.now()}`,
            visible: true,
            transform: { scale: 1, rotation: 0, translate: { x: 0, y: 0 } }
          };
          setDrawings([...drawings, newDrawing]);
          setIsPolygonDrawing(false);
          setCurrentPoints([]);
          setShowSelecting(true)
        } else {
          setCurrentPoints(prev => [...prev, x, y]);
        }
      }
    } else if (currentTool === "point") {
      // Save history before adding point
      setDrawingHistory(history => [...history, [...drawings]]);
      const newDrawing: Drawing = {
        type: "point",
        points: [x, y],
        label: `Point ${drawings.length + 1}`,
        id: `drawing-${Date.now()}`,
        visible: true,
        transform: { scale: 1, rotation: 0, translate: { x: 0, y: 0 } }
      };
      setDrawings([...drawings, newDrawing]);
      setShowSelecting(true)
    } else {
      setIsDrawing(true);
      setStartPoint({ x, y });
    }
  };

  /**
   * Handling Shapes for Drawing
   */
  const drawShape = (ctx: CanvasRenderingContext2D, drawing: Drawing) => {
    if (!drawing.visible) return;

    ctx.beginPath();
    ctx.strokeStyle = '#00FF00';
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
      ctx.font = '14px Arial';
      const textMetrics = ctx.measureText(drawing.label);
      ctx.fillStyle = 'rgba(0, 255, 0, 0.7)';
      ctx.fillRect(points[0], points[1] - 20, textMetrics.width + 10, 20);
      ctx.fillStyle = '#FFFFFF';
      ctx.fillText(drawing.label, points[0] + 5, points[1] - 5);
    }
  };


  /**
   * Handling Mouse Drawing Events
   */
  const draw = (e: React.MouseEvent<HTMLCanvasElement>) => {
    if (!isAnnotationEnabled) return;

    const canvas = canvasRef.current;
    if (!canvas) return;

    const rect = canvas.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    if (isTransforming && selectedShape) {
      const drawing = drawings.find(d => d.id === selectedShape);
      if (!drawing || !transformOrigin) return;

      const dx = x - transformOrigin.x;
      const dy = y - transformOrigin.y;

      setDrawings(drawings.map(d => {
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
      }));

      setTransformOrigin({ x, y });
      return;
    }

    const point = getScaledPoint(e);
    if (!point) return;

    if (isDraggingPoint && selectedDrawingId !== null && selectedPointIndex !== null) {
      const offsetX = draggedPointOffset ? point.x - draggedPointOffset.x : point.x;
      const offsetY = draggedPointOffset ? point.y - draggedPointOffset.y : point.y;

      setDrawings(prev => prev.map(drawing => {
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
      }));

      drawAnnotations();
      return;
    }

    if (isDrawing || isPolygonDrawing) {
      drawAnnotations();

      if (currentTool === "polygon" && isPolygonDrawing) {
        ctx.beginPath();
        ctx.strokeStyle = '#00FF00';
        ctx.lineWidth = 2;
        ctx.moveTo(currentPoints[0], currentPoints[1]);
        for (let i = 2; i < currentPoints.length; i += 2) {
          ctx.lineTo(currentPoints[i], currentPoints[i + 1]);
        }
        ctx.lineTo(x, y);

        const startX = currentPoints[0];
        const startY = currentPoints[1];
        const distance = Math.sqrt(Math.pow(x - startX, 2) + Math.pow(y - startY, 2));
        if (distance < SNAP_THRESHOLD && currentPoints.length >= 6) {
          ctx.lineTo(startX, startY);
        }

        ctx.stroke();
      } else if (startPoint) {
        drawShape(ctx, { type: currentTool, points: [startPoint.x, startPoint.y, x, y], visible: true, label: '' } as any);
      }
    }
  };

  /**
   * Handling Transform Button Rendering
   */
  const renderTransformButton = (drawing: Drawing) => {
    if (!drawing.visible) return null;

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

  /**
   * Ending the Drawing Process
   */
  const endDrawing = (e: React.MouseEvent<HTMLCanvasElement>) => {
    if (isDraggingPoint) {
      setIsDraggingPoint(false);
      setSelectedDrawingId(null);
      setSelectedPointIndex(null);
      setDraggedPointOffset(null);
      return;
    }

    if ((!isDrawing && !isPolygonDrawing) || !isAnnotationEnabled) return;

    const canvas = canvasRef.current;
    if (!canvas) return;

    const rect = canvas.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;

    // Set the selection UI position near the shape
    setSelectionPosition({ x, y });

    // Save current state to history before adding new drawing
    setDrawingHistory(history => [...history, [...drawings]]);

    let newDrawing: Drawing | null = null;

    if (currentTool === "polygon") {
      if (e.detail === 2) {
        newDrawing = {
          type: "polygon",
          points: [...currentPoints],
          label: "", // Empty label initially
          id: `drawing-${Date.now()}`,
          visible: true
        };
        setIsPolygonDrawing(false);
        setCurrentPoints([]);
      }
    } else if (currentTool === "point") {
      newDrawing = {
        type: "point",
        points: [x, y],
        label: "", // Empty label initially
        id: `drawing-${Date.now()}`,
        visible: true
      };
      setIsDrawing(false);
    } else if (startPoint) {
      newDrawing = {
        type: currentTool,
        points: [startPoint.x, startPoint.y, x, y],
        label: "", // Empty label initially
        id: `drawing-${Date.now()}`,
        visible: true
      };
      setIsDrawing(false);
      setStartPoint(null);
    }

    if (newDrawing) {
      setDrawings([...drawings, newDrawing]);
      setShowSelecting(true);
    }
  };


  const handleSelectionSubmit = (toothNumber: string, pathology: string, customPathology?: string) => {
    setDrawings(prev => {
      const lastDrawing = prev[prev.length - 1];
      if (lastDrawing) {
        // Create label based on pathology selection
        const label = pathology === "Other" && customPathology
          ? `${toothNumber}  ${customPathology}`
          : `${toothNumber}  ${pathology}`;

        const updatedDrawing = {
          ...lastDrawing,
          label,
          toothNumber,
          pathology,
          customPathology
        };
        return [...prev.slice(0, -1), updatedDrawing];
      }
      return prev;
    });
    setShowSelecting(false);
  };


  // useEffect(() => {
  //   const handleZoom = () => {
  //     setZoomLevel(window.devicePixelRatio);

  //     if (timer) {
  //       clearTimeout(timer);
  //     }

  //     const newTimer = setTimeout(() => {
  //       handleUpload();
  //     }, 2000);

  //     setTimer(newTimer as any);
  //   };

  //   window.addEventListener("resize", handleZoom);

  //   return () => {
  //     window.removeEventListener("resize", handleZoom);
  //     if (timer) {
  //       clearTimeout(timer);
  //     }
  //   };
  // }, [zoomLevel, timer]);



  // Tools
  const tools = [
    {
      id: "undo",
      icon: <FaUndo size={20} color="white" />,
      label: "Undo",
      onclickFn: handleUndo
    },
    {
      id: "select",
      icon: <FaMousePointer size={20} color="white" />,
      label: "Select Tool",
      onclickFn: () => {
        setCurrentTool("select");
        setIsDrawing(false);
        setIsPolygonDrawing(false);
      }
    },
    {
      id: "reshape",
      icon: <FaEdit size={20} color="white" />,
      label: "Reshape Tool",
      onclickFn: () => {
        setCurrentTool("reshape");
        setIsDrawing(false);
        setIsPolygonDrawing(false);
      }
    },
    {
      id: "rectangle",
      icon: <FaSquareFull size={20} color="white" />,
      label: "Rectangle Tool",
      onclickFn: () => setCurrentTool("rectangle")
    },
    {
      id: "line",
      icon: <BsDash size={20} color="white" />,
      label: "Line Tool",
      onclickFn: () => setCurrentTool("line")
    },
    {
      id: "point",
      icon: <FaCircle size={20} color="white" />,
      label: "Point Tool",
      onclickFn: () => setCurrentTool("point")
    },
    {
      id: "polygon",
      icon: <BsBoundingBoxCircles size={20} color="white" />,
      label: "Polygon Tool",
      onclickFn: () => setCurrentTool("polygon")
    }
  ];


  useEffect(() => {
    const handleMouseUp = () => {
      setIsTransforming(false);
      setSelectedShape(null);
      setTransformOrigin(null);
    };

    window.addEventListener('mouseup', handleMouseUp);
    return () => window.removeEventListener('mouseup', handleMouseUp);
  }, []);



  const processApiResponse = (responseData: UploadResponse) => {
    // const newAnnotations: Annotation[] = [];
    const classMap = new Map<string, Annotation>();

    responseData.data.results.forEach((result, index) => {
      const className = result.class;

      if (!classMap.has(className)) {
        classMap.set(className, {
          class: className,
          roi_xyxy: []
        });
      }

      const annotation = classMap.get(className)!;
      annotation.roi_xyxy.push({
        coordinates: result.roi_xyxy[0] as any,
        visible: true,
        id: `${className}-${index}`,
        label: (index + 1).toString()
      });
    });

    setAnnotations(Array.from(classMap.values()));
  };

  // Drawing management functions
  const toggleDrawingVisibility = (drawingId: string) => {
    setDrawings(prev => prev.map(drawing => ({
      ...drawing,
      visible: drawing.id === drawingId ? !drawing.visible : drawing.visible
    })));
  };

  const drawAnnotations = useCallback(() => {
    const canvas = canvasRef.current;
    const container = containerRef.current;
    if (!canvas || !container || !imageSize.width || !imageSize.height) return;

    const imageElement = container.querySelector('img');
    if (!imageElement) return;

    const displayedWidth = imageElement.clientWidth;
    const displayedHeight = imageElement.clientHeight;

    canvas.width = displayedWidth;
    canvas.height = displayedHeight;
    canvas.style.width = `${displayedWidth}px`;
    canvas.style.height = `${displayedHeight}px`;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    ctx.clearRect(0, 0, canvas.width, canvas.height);

    if (!isAnnotationEnabled) return;

    // Calculate scale factors for API annotations
    const scaleX = displayedWidth / imageSize.width;
    const scaleY = displayedHeight / imageSize.height;

    // First, draw API annotations
    annotations.forEach(annotation => {
      annotation.roi_xyxy.forEach(coord => {
        if (!coord.visible) return;

        const [x1, y1, x2, y2] = coord.coordinates;

        const scaledX1 = x1 * scaleX;
        const scaledY1 = y1 * scaleY;
        const scaledX2 = x2 * scaleX;
        const scaledY2 = y2 * scaleY;

        // Draw API annotation rectangle
        ctx.strokeStyle = '#FF0000';
        ctx.lineWidth = 2;
        ctx.strokeRect(scaledX1, scaledY1, scaledX2 - scaledX1, scaledY2 - scaledY1);

        // Draw API annotation label with number first, then name
        const label = `${coord.label} ${annotation.class}`;  // Changed this line to put number first
        ctx.font = '14px Arial';
        const textMetrics = ctx.measureText(label);
        const textHeight = 20;

        // Label background
        ctx.fillStyle = 'rgba(255, 0, 0, 0.7)';
        ctx.fillRect(scaledX1, scaledY1 - textHeight, textMetrics.width + 10, textHeight);

        // Label text
        ctx.fillStyle = '#FFFFFF';
        ctx.fillText(label, scaledX1 + 5, scaledY1 - 5);
      });
    });

    drawings.forEach(drawing => {
      if (!drawing.visible) return;

      ctx.beginPath();
      ctx.strokeStyle = '#00FF00';
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
      }

      // Draw label for drawing
      if (drawing.visible) {
        ctx.font = '14px Arial';
        ctx.fillStyle = 'rgba(0, 255, 0, 0.7)';
        const textMetrics = ctx.measureText(drawing.label);
        ctx.fillRect(
          drawing.points[0],
          drawing.points[1] - 20,
          textMetrics.width + 10,
          20
        );
        ctx.fillStyle = '#FFFFFF';
        ctx.fillText(drawing.label, drawing.points[0] + 5, drawing.points[1] - 5);
      }
    });
  }, [annotations, isAnnotationEnabled, imageSize, drawings]);

  useEffect(() => {
    drawAnnotations();
  }, [drawAnnotations]);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    canvas.style.cursor = currentTool === "select" ? "default" : "crosshair";
  }, [currentTool]);

  const updateAnnotationLabel = (className: string, coordId: string, newLabel: string) => {
    setAnnotations(prev => prev.map(ann => {
      if (ann.class === className) {
        return {
          ...ann,
          roi_xyxy: ann.roi_xyxy.map(coord => ({
            ...coord,
            label: coord.id === coordId ? newLabel : coord.label
          }))
        };
      }
      return ann;
    }));
    setEditingId(null); // Exit edit mode after updating
  };


  const toggleAnnotationVisibility = (className: string, coordId: string) => {
    setAnnotations(prev => prev.map(ann => {
      if (ann.class === className) {
        return {
          ...ann,
          roi_xyxy: ann.roi_xyxy.map(coord => ({
            ...coord,
            visible: coord.id === coordId ? !coord.visible : coord.visible
          }))
        };
      }
      return ann;
    }));
  };

  const handleDelete = (className: string, coordId: string) => {
    setAnnotations(prev => prev.map(ann => {
      if (ann.class === className) {
        return {
          ...ann,
          roi_xyxy: ann.roi_xyxy.filter(coord => coord.id !== coordId)
        };
      }
      return ann;
    }).filter(ann => ann.roi_xyxy.length > 0));
  };

  const handleKeyPress = (e: React.KeyboardEvent, className: string, coordId: string, label: string) => {
    if (e.key === 'Enter') {
      updateAnnotationLabel(className, coordId, label);
      setEditingId(null);
    }
  };
  // const updateDrawingLabel = (drawingId: string, newLabel: string) => {
  //   setDrawings(prev => prev.map(drawing => ({
  //     ...drawing,
  //     label: drawing.id === drawingId ? newLabel : drawing.label
  //   })));
  // };

  const deleteDrawing = (drawingId: string) => {
    setDrawings(prev => prev.filter(drawing => drawing.id !== drawingId));
  };



  const handleDownloadWithAnnotations = () => {
    if (!selectedFile) {
      toast.error('No image to download');
      return;
    }

    const tempCanvas = document.createElement('canvas');
    const tempCtx = tempCanvas.getContext('2d');
    if (!tempCtx) return;

    tempCanvas.width = imageSize.width;
    tempCanvas.height = imageSize.height;

    const img = new Image();
    img.onload = () => {
      // Get the currently displayed image dimensions
      const displayedImage = containerRef.current?.querySelector('img');
      if (!displayedImage) return;

      const displayedWidth = displayedImage.clientWidth;
      const displayedHeight = displayedImage.clientHeight;

      // Calculate scale factors
      const scaleX = imageSize.width / displayedWidth;
      const scaleY = imageSize.height / displayedHeight;

      tempCtx.drawImage(img, 0, 0, imageSize.width, imageSize.height);

      if (isAnnotationEnabled) {
        // Draw API annotations
        annotations.forEach(annotation => {
          annotation.roi_xyxy.forEach(coord => {
            if (!coord.visible) return;

            const [x1, y1, x2, y2] = coord.coordinates;

            tempCtx.strokeStyle = '#FF0000';
            tempCtx.lineWidth = 2;
            tempCtx.font = '14px Arial';

            tempCtx.strokeRect(x1, y1, x2 - x1, y2 - y1);

            const label = `${annotation.class} ${coord.label}`;
            const textMetrics = tempCtx.measureText(label);
            const textHeight = 20;
            tempCtx.fillStyle = 'rgba(255, 0, 0, 0.7)';
            tempCtx.fillRect(x1, y1 - textHeight, textMetrics.width + 10, textHeight);

            tempCtx.fillStyle = '#FFFFFF';
            tempCtx.fillText(label, x1 + 5, y1 - 5);
          });
        });

        // Draw custom drawings with scaling
        drawings.forEach(drawing => {
          if (!drawing.visible) return;

          tempCtx.beginPath();
          tempCtx.strokeStyle = '#00FF00';
          tempCtx.lineWidth = 2 * scaleX; // Scale line width

          // Scale font size
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

              // Draw label
              const textMetrics = tempCtx.measureText(drawing.label);
              const textHeight = 20 * scaleY;
              tempCtx.fillStyle = 'rgba(0, 255, 0, 0.7)';
              tempCtx.fillRect(
                scaledX1,
                scaledY1 - textHeight,
                textMetrics.width + (10 * scaleX),
                textHeight
              );
              tempCtx.fillStyle = '#FFFFFF';
              tempCtx.fillText(drawing.label, scaledX1 + (5 * scaleX), scaledY1 - (5 * scaleY));
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

              // Draw label
              const textMetrics = tempCtx.measureText(drawing.label);
              const textHeight = 20 * scaleY;
              tempCtx.fillStyle = 'rgba(0, 255, 0, 0.7)';
              tempCtx.fillRect(
                scaledX1,
                scaledY1 - textHeight,
                textMetrics.width + (10 * scaleX),
                textHeight
              );
              tempCtx.fillStyle = '#FFFFFF';
              tempCtx.fillText(drawing.label, scaledX1 + (5 * scaleX), scaledY1 - (5 * scaleY));
              break;
            }
            case "point": {
              const scaledX = drawing.points[0] * scaleX;
              const scaledY = drawing.points[1] * scaleY;

              // Draw the point
              tempCtx.beginPath();
              tempCtx.arc(scaledX, scaledY, 3 * scaleX, 0, Math.PI * 2);
              tempCtx.fill();
              tempCtx.stroke();

              // Draw label
              const textMetrics = tempCtx.measureText(drawing.label);
              const textHeight = 20 * scaleY;
              tempCtx.fillStyle = 'rgba(0, 255, 0, 0.7)';
              tempCtx.fillRect(
                scaledX,
                scaledY - textHeight,
                textMetrics.width + (10 * scaleX),
                textHeight
              );
              tempCtx.fillStyle = '#FFFFFF';
              tempCtx.fillText(drawing.label, scaledX + (5 * scaleX), scaledY - (5 * scaleY));
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

                // Draw label
                const textMetrics = tempCtx.measureText(drawing.label);
                const textHeight = 20 * scaleY;
                tempCtx.fillStyle = 'rgba(0, 255, 0, 0.7)';
                tempCtx.fillRect(
                  scaledPoints[0],
                  scaledPoints[1] - textHeight,
                  textMetrics.width + (10 * scaleX),
                  textHeight
                );
                tempCtx.fillStyle = '#FFFFFF';
                tempCtx.fillText(drawing.label, scaledPoints[0] + (5 * scaleX), scaledPoints[1] - (5 * scaleY));
              }
              break;
            }
          }
        });
      }

      tempCanvas.toBlob((blob) => {
        if (blob) {
          const url = URL.createObjectURL(blob);
          const link = document.createElement('a');
          link.href = url;
          link.download = `annotated_${selectedFile.name}`;
          document.body.appendChild(link);
          link.click();
          document.body.removeChild(link);
          URL.revokeObjectURL(url);
          toast.success('Download completed');
        }
      }, 'image/png');
    };

    img.src = URL.createObjectURL(selectedFile);
  };

  /**
   * Callback function triggered when files are dropped.
   */
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
          height: img.height
        });
      };
      img.src = URL.createObjectURL(file);
    }
  }, []);

  /**
   * Droping functions or images types.
   */
  const { getRootProps, getInputProps, isDragActive, isDragReject } = useDropzone({
    onDrop,
    accept: {
      'image/*': ['.jpeg', '.png', '.gif', '.jpg']
    },
    multiple: false
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
    <div className="xl:flex grid min-h-screen bg-black w-full  max-w-[2000px] mx-auto">
      {isLoading && <LoadingSpinner />}

      <main className="w-4/5  max-xl:w-full flex flex-col">
        <header className="h-24 max-[400px]:mx-auto flex items-center justify-start text-[50px] font-bold text-white px-10 pt-10">
          <img src="/hhhh.png" className="h-12" alt="Vi.Ai-logo" />
        </header>

        <section className="flex justify-center items-center p-4 gap-5">
          <div className="flex items-center max-[400px]:flex-col max-[400px]:gap-2 max-[400px]:mt-3">
            <label
              className={`mr-2 max-[400px]:text-sm  text-lg font-medium ${checkType === "qc" ? "text-white" : "text-gray-500"}`}
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
              className={`ml-2 max-[400px]:text-sm  font-medium text-lg ${checkType === "path" ? "text-white" : "text-gray-500"}`}
            >
              Pathology Check
            </label>
          </div>
        </section>

        <section className="sm:mx-10 my-4 border-2 border-[#393838] border-dotted rounded-lg p-4 h-[650px]">
          <div
            {...(!selectedFile ? getRootProps() : {})}
            className={`relative border-2 border-[#393838] border-dotted rounded-lg p-4 h-full flex flex-col items-center justify-center cursor-pointer 
                                  ${isDragActive ? "bg-gray-700" : "hover:bg-gray-800"}
                                  ${isDragReject ? "border-red-500" : ""} 
                                  transition-colors duration-300`}
          >

            {selectedFile ? (
              <>
                <div className="text-center relative" ref={containerRef}>
                  <p className="text-gray-500 text-xs mb-2">{"< " + selectedFile.name + " >"}</p>
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
                        cursor: currentTool === "select" ? "default" : "crosshair"
                      }}
                      onMouseDown={startDrawing}
                      onMouseMove={draw}
                      onMouseUp={endDrawing}
                      onMouseLeave={() => setIsDrawing(false)}
                    />
                    {drawings.map(drawing => renderTransformButton(drawing))}
                  </div>
                </div>

                {showSelecting &&
                  <div className='absolute h-full w-full bg-transparent flex justify-center items-center'>
                    <SelectionUI
                      canvasRef={canvasRef}
                      handleSelectionSubmit={handleSelectionSubmit}
                      toothNumberOptions={toothNumberOptions}
                      pathologyOptions={pathologyOptions}
                    />
                  </div>
                }

                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    handleUpload();
                  }}
                  className="bg-white text-red-800 px-4 py-2 rounded mt-2"
                >
                  {isLoading ? "Processing..." : "Run AI"}
                </button>
              </>
            ) : (
              <><input {...getInputProps()} />
                <div className="flex flex-col items-center justify-center">
                  <MdOutlineCloudUpload size={64} className="text-[#393838] mb-4" />
                  <p className="text-[#393838] text-lg flex text-center max-[400px]:text-xs">
                    {isDragActive
                      ? "Drop the image here ..."
                      : "Drag and drop an image here, or click to select a file"}
                  </p>
                </div></>
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

          <div className="flex max-[400px]:flex-col  items-center">
            <label className="max-[400px]:mr-0 mr-4 text-lg font-bold">Annotation</label>
            <label
              className={`mr-2 text-lg font-medium ${!isAnnotationEnabled ? "text-white" : "text-gray-500"
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
              className={`max-[400px]:ml-0 ml-2 font-medium text-lg ${isAnnotationEnabled ? "text-white" : "text-gray-500"
                }`}
            >
              On
            </label>
          </div>
        </section>
      </main>

      <aside className="bg-black max-xl:w-full w-1/5 flex flex-col pt-24 px-4">
        <h2 className="text-[30px] font-bold text-white max-sm:text-lg mb-4">OPG Analysis</h2>
        {renderAnnotationsList()}
      </aside>
    </div>
  );

};



export default FileUpload;