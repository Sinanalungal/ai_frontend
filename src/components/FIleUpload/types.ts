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
  
  export interface Annotation {
    class: string;
    roi_xyxy: Array<{
      coordinates: number[];
      visible: boolean;
      id: string;
      label: string;
    }>;
  }
  
  export interface UploadResponse {
    message: string;
    data: {
      inference_time: number;
      results: Annotation[];
      unique_id: string;
    };
  }
  