import { toast, Toaster } from 'sonner';
import './App.css'
import Home from './components/general/Home'
import MainWindow from './components/general/MainWindow';
import TitleBar from './components/general/TitleBar'
import { TooltipProvider } from './components/ui/tooltip';
import { Tabs, useUiStore } from './store/ui';
import { useEffect } from 'react';
import { api } from './api';

function App() {
  const { selectedTab } = useUiStore();

  useEffect(() => {
    const unsubscribe = api.onError((errorMessage) => {
      toast.error(errorMessage);
    });
    return unsubscribe;
  }, []);

  return (
    <TooltipProvider>
    <div className='absolute top-0 left-0 right-0 bottom-0 w-screen h-screen flex flex-col overflow-hidden'>
      <TitleBar />
      <div className='flex-1 flex min-h-0 w-full p-0 m-0'>
        {selectedTab === Tabs.PROFILE_SELECTOR ? <Home /> : <MainWindow />}
      </div>
    </div>
    <Toaster position="bottom-center" richColors closeButton />
    </TooltipProvider>
  )
}

export default App
