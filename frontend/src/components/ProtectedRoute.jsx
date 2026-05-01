import { Navigate } from 'react-router-dom';
import { useAuthStore } from '../store/authStore';
import Layout from './Layout';

export default function ProtectedRoute({ children }) {
  const token = useAuthStore((state) => state.token);

  if (!token) {
    return <Navigate to="/login" replace />;
  }

  return <Layout>{children}</Layout>;
}
