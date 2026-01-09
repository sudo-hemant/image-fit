import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import { BrowserRouter, Routes, Route } from 'react-router-dom';
import { Home } from './pages/Home';
import { FitImage } from './pages/FitImage';
import { ResizeImage } from './pages/ResizeImage';
import { CompressImage } from './pages/CompressImage';
import { CropImage } from './pages/CropImage';
import './index.css';

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<Home />} />
        <Route path="/fit-image" element={<FitImage />} />
        <Route path="/resize-image" element={<ResizeImage />} />
        <Route path="/compress-image" element={<CompressImage />} />
        <Route path="/crop-image" element={<CropImage />} />
      </Routes>
    </BrowserRouter>
  </StrictMode>
);
