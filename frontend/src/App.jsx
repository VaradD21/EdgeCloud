import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import Login              from './pages/Login';
import Register           from './pages/Register';
import Dashboard          from './pages/Dashboard';
import Marketplace        from './pages/Marketplace';
import Deploy             from './pages/Deploy';
import Deployments        from './pages/Deployments';
import DeploymentDetails  from './pages/DeploymentDetails';
import Credits            from './pages/Credits';
import Settings           from './pages/Settings';
import Nodes              from './pages/Nodes';
import ProtectedRoute     from './components/ProtectedRoute';

function Protected({ children }) {
  return <ProtectedRoute>{children}</ProtectedRoute>;
}

function App() {
  return (
    <Router>
      <Routes>
        <Route path="/login"    element={<Login />} />
        <Route path="/register" element={<Register />} />

        <Route path="/"                   element={<Protected><Dashboard /></Protected>} />
        <Route path="/marketplace"        element={<Protected><Marketplace /></Protected>} />
        <Route path="/deploy/:listingId"  element={<Protected><Deploy /></Protected>} />
        <Route path="/deployments"        element={<Protected><Deployments /></Protected>} />
        <Route path="/deployments/:id"    element={<Protected><DeploymentDetails /></Protected>} />
        <Route path="/credits"            element={<Protected><Credits /></Protected>} />
        <Route path="/settings"           element={<Protected><Settings /></Protected>} />
        <Route path="/nodes"              element={<Protected><Nodes /></Protected>} />
      </Routes>
    </Router>
  );
}

export default App;
