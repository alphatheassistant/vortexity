import { FileContextProvider } from './components/FileContextProvider';
import { CodeBuddyChat } from './components/CodeBuddyChat';
import { FileExplorer } from './components/FileExplorer';
import { FileViewer } from './components/FileViewer';

function App() {
  return (
    <FileContextProvider>
      <div className="min-h-screen bg-gray-900 flex">
        <div className="w-64 border-r border-gray-700">
          <FileExplorer />
        </div>
        <div className="flex-1 flex flex-col">
          <div className="h-1/2 border-b border-gray-700">
            <FileViewer />
          </div>
          <div className="h-1/2">
            <CodeBuddyChat />
          </div>
        </div>
      </div>
    </FileContextProvider>
  );
}

export default App;
