import { MdOutlineEdit } from "react-icons/md";
import { RiDeleteBinLine } from "react-icons/ri";
import { IoEyeOutline } from "react-icons/io5";


interface Coord {
    id: string;
    label: string;
    visible: boolean;
  }
  
  interface Annotation {
    class: string;
    roi_xyxy: Coord[];
  }
  
  interface Drawing {
    id: string;
    label: string;
    visible: boolean;
    toothNumber?: string;
    pathology?: string;
    customPathology?: string;
  }
  
  interface AnnotationsListProps {
    annotations: Annotation[];
    drawings: Drawing[];
    editingId: string | null;
    editingDrawing: any;
    setEditingId: (id: string | null) => void;
    setEditingDrawing: any ;
    toggleAnnotationVisibility: (annotationClass: string, id: string) => void;
    toggleDrawingVisibility: (id: string) => void;
    handleDelete: (annotationClass: string, id: string) => void;
    deleteDrawing: (id: string) => void;
    setDrawings: any;
    setAnnotations: any;
    handleKeyPress: (e: React.KeyboardEvent<HTMLInputElement>, annotationClass: string, id: string, label: string) => void;
  }

const AnnotationsList: React.FC<AnnotationsListProps>  = ({
  annotations,
  drawings,
  editingId,
  editingDrawing,
  setEditingId,
  setEditingDrawing,
  toggleAnnotationVisibility,
  toggleDrawingVisibility,
  handleDelete,
  deleteDrawing,
  setDrawings,
  setAnnotations,
  handleKeyPress
}) => {
  return (
    <div className="h-[700px] border-2 border-[#393838] rounded-md border-dotted text-white p-4 overflow-auto">
      {/* Annotations Section */}
      {annotations.map((annotation) => (
        <div key={annotation.class} className="mb-4">
          {annotation.roi_xyxy.map((coord) => (
            <div
              key={coord.id}
              className="flex bg-[#202020] py-3 px-3 justify-between items-center mb-2"
            >
              <div className="flex items-center max-w-[60%]">
                {editingId === coord.id ? (
                  <input
                    type="text"
                    value={coord.label}
                    onChange={(e) => {
                      setAnnotations((prev:any) =>
                        prev.map((ann:any) => ({
                          ...ann,
                          roi_xyxy: ann.roi_xyxy.map((c:any) =>
                            c.id === coord.id ? { ...c, label: e.target.value } : c
                          ),
                        }))
                      );
                    }}
                    onBlur={() => setEditingId(null)}
                    onKeyPress={(e) =>
                      handleKeyPress(e, annotation.class, coord.id, coord.label)
                    }
                    className="w-16 px-2 py-1 bg-[#303030] text-white border border-gray-600 rounded"
                    autoFocus
                  />
                ) : (
                  <div className="flex gap-2 text-sm overflow-hidden">
                    <span className="text-white whitespace-nowrap">{coord.label}</span>
                    <span className="text-white truncate">{annotation.class}</span>
                  </div>
                )}
              </div>
              <div className="flex items-center space-x-3 flex-shrink-0">
                <button
                  className="cursor-pointer"
                  onClick={() => setEditingId(coord.id)}
                >
                  <MdOutlineEdit size={16} className="text-gray-400 hover:text-white" />
                </button>
                <button
                  className="cursor-pointer"
                  onClick={() => toggleAnnotationVisibility(annotation.class, coord.id)}
                >
                  <IoEyeOutline
                    size={20}
                    color={coord.visible ? "white" : "grey"}
                  />
                </button>
                <button
                  className="cursor-pointer"
                  onClick={() => handleDelete(annotation.class, coord.id)}
                >
                  <RiDeleteBinLine size={20} color="grey" />
                </button>
              </div>
            </div>
          ))}
        </div>
      ))}

      {/* Custom Drawings Section */}
      {drawings.length > 0 && (
        <div className="mb-4">
          <h3 className="font-bold mb-2">Other Regions</h3>
          {drawings.map((drawing:any) => (
            <div
              key={drawing.id}
              className="flex bg-[#202020] py-3 px-3 justify-between items-center mb-2"
            >
              {editingDrawing?.id === drawing.id ? (
                <div className="flex flex-col gap-2 max-w-[60%]">
                  <input
                    type="text"
                    className="w-full bg-[#707070] text-xs text-gray-300 px-2 py-1 rounded"
                    value={drawing.label}
                    onChange={(e) => {
                      setDrawings((prev:any) => prev.map((d:any) => {
                        if (d.id === drawing.id) {
                          return { ...d, label: e.target.value };
                        }
                        return d;
                      }));
                    }}
                    onBlur={() => setEditingDrawing(null)}
                    autoFocus
                  />
                </div>
              ) : (
                <>
                  <div className="max-w-[60%] overflow-hidden">
                    <span className="text-white text-sm block truncate" title={drawing.label}>
                      {drawing.label}
                    </span>
                  </div>
                  <div className="flex items-center space-x-3 flex-shrink-0">
                    <button
                      className="cursor-pointer"
                      onClick={() => setEditingDrawing({
                        id: drawing.id,
                        toothNumber: drawing.toothNumber || "1",
                        pathology: drawing.pathology || "Cavity",
                        customPathology: drawing.customPathology || ""
                      })}
                    >
                      <MdOutlineEdit size={16} className="text-gray-400 hover:text-white" />
                    </button>
                    <button
                      className="cursor-pointer"
                      onClick={() => toggleDrawingVisibility(drawing.id)}
                    >
                      <IoEyeOutline size={20} color={drawing.visible ? "white" : "grey"} />
                    </button>
                    <button
                      className="cursor-pointer"
                      onClick={() => deleteDrawing(drawing.id)}
                    >
                      <RiDeleteBinLine size={20} color="grey" />
                    </button>
                  </div>
                </>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

export default AnnotationsList;