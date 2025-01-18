import { BrowserRouter, Route, Routes } from "react-router-dom";
import FileUploadPage from "../pages/FileUploadPage/fileUploadPage";



const PageRoute = ()=>{
    return(
        <BrowserRouter>
        <Routes>
        <Route path="/" element={<FileUploadPage />} />
        </Routes>
        </BrowserRouter>
    )
}

export default PageRoute;
