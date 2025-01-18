import PageRoutes from './Routes/pageRouters'
import './App.css'
import { Toaster } from "sonner";
// import { X } from 'lucide-react';


function App() {

  return (
    <>
      {/* <NavBar /> */}
      <Toaster
            richColors
            closeButton
            toastOptions={{
              classNames: {
                closeButton: "p-1 hover:bg-gray-100 rounded-full"
              },
              // closeButton: ({ toast }: any) => (
              //   <button
              //     onClick={() => toast.dismiss()}
              //     className="p-1 hover:bg-gray-100 rounded-full"
              //   >
              //     <X className="h-4 w-4 text-gray-500" />
              //   </button>
              // )
            }}
          />
      <PageRoutes />
    </>
  )
}

export default App
