import { Routes, Route } from 'react-router-dom';
import { MoviePlayerPage, TVPlayerPage } from './pages';

function App() {
  return (
    <Routes>
      {/* Home route */}

      {/* Movie route: /movie/{tmdbId} */}
      <Route path="/movie/:tmdbId" element={<MoviePlayerPage />} />

      {/* TV Show route: /tv/{tmdbId}/{season}/{episode} */}
      <Route path="/tv/:tmdbId/:season/:episode" element={<TVPlayerPage />} />
    </Routes>
  );
}

export default App;
