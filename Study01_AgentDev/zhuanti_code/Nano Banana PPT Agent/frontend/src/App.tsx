import { useState } from 'react';
import { LoginPage } from './components/login/LoginPage';
import { EditorPageWithBackend } from './components/editor/EditorPageWithBackend';

type Page = 'login' | 'editor';

export default function App() {
  const [currentPage, setCurrentPage] = useState<Page>('login');
  const [sessionId, setSessionId] = useState<string | null>(null);

  const handleStartCreation = (newSessionId: string) => {
    setSessionId(newSessionId);
    setCurrentPage('editor');
  };

  const handleBackToHome = () => {
    setSessionId(null);
    setCurrentPage('login');
  };

  return (
    <>
      {currentPage === 'login' && (
        <LoginPage onStartCreation={handleStartCreation} />
      )}
      {currentPage === 'editor' && sessionId && (
        <EditorPageWithBackend sessionId={sessionId} onBackToHome={handleBackToHome} />
      )}
    </>
  );
}
