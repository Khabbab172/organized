import { BrowserRouter, Routes, Route } from 'react-router-dom';
import SearchResultsPage from './pages/SearchResultsPage';
import PdfViewerPage from './pages/PdfViewerPage';

export default function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<SearchResultsPage />} />
        <Route path="/viewer" element={<PdfViewerPage />} />
      </Routes>
    </BrowserRouter>
  );
}
