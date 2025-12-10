import { BrowserRouter as Router, Routes, Route, useParams } from 'react-router-dom';
import Home from './pages/Home';
import Series from './pages/Series';
import Latest from './pages/Latest';
import Popular from './pages/Popular';
import Simulcast from './pages/Simulcast';
import Watchlist from './pages/Watchlist';
import ComingSoon from './pages/ComingSoon';
import Watch from './pages/Watch';

// Wrapper pour ComingSoon avec param
const ComingSoonWrapper = () => {
  const { page } = useParams();
  const pageName = page ? page.charAt(0).toUpperCase() + page.slice(1) : 'This Page';
  return <ComingSoon pageName={pageName} />;
};

function App() {
  return (
    <Router>
      <Routes>
        <Route path="/" element={<Home />} />
        <Route path="/:locale?" element={<Home />} />

        <Route path="/series/:id" element={<Series />} />
        <Route path="/:locale/series/:id" element={<Series />} />

        <Route path="/watch/:id" element={<Watch />} />
        <Route path="/watch/:id/:slug" element={<Watch />} />
        <Route path="/:locale/watch/:id" element={<Watch />} />
        <Route path="/:locale/watch/:id/:slug" element={<Watch />} />

        <Route path="/latest" element={<Latest />} />
        <Route path="/:locale/latest" element={<Latest />} />

        <Route path="/popular" element={<Popular />} />
        <Route path="/:locale/popular" element={<Popular />} />

        <Route path="/simulcast" element={<Simulcast />} />
        <Route path="/:locale/simulcast" element={<Simulcast />} />

        <Route path="/watchlist" element={<Watchlist />} />
        <Route path="/:locale/watchlist" element={<Watchlist />} />

        <Route path="/coming-soon/:page" element={<ComingSoonWrapper />} />
        <Route path="/:locale/coming-soon/:page" element={<ComingSoonWrapper />} />

        <Route path="*" element={<Home />} />
      </Routes>
    </Router>
  );
}

export default App;
