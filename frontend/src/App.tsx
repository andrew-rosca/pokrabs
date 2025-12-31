import { BrowserRouter, Routes, Route } from 'react-router-dom';

function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<div>POKRABS - Coming Soon</div>} />
        <Route path="/:problemId" element={<div>Problem Detail - Coming Soon</div>} />
      </Routes>
    </BrowserRouter>
  );
}

export default App;

