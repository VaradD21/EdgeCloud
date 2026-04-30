import { useEffect } from 'react'
import { useAuthStore } from '../store/authStore'
import { useNavigate, Link } from 'react-router-dom'

export default function Dashboard() {
  const { token, user, setUser, logout } = useAuthStore()
  const navigate = useNavigate()
  
  const [deployments, setDeployments] = useState([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const fetchUser = async () => {
      try {
        const res = await fetch('http://localhost:8000/auth/me', {
          headers: { 'Authorization': `Bearer ${token}` }
        })
        if (!res.ok) {
          if (res.status === 401) logout()
          return
        }
        const data = await res.json()
        setUser(data)
        fetchDeployments()
      } catch (err) {
        console.error(err)
        logout()
      }
    }

    const fetchDeployments = async () => {
      try {
        const res = await fetch('http://localhost:8000/deployments', {
          headers: { 'Authorization': `Bearer ${token}` }
        })
        if (res.ok) {
          const data = await res.json()
          setDeployments(data)
        }
      } catch (err) {
        console.error("Failed to fetch deployments", err)
      } finally {
        setLoading(false)
      }
    }

    if (token && !user) {
      fetchUser()
    } else if (user) {
      fetchDeployments()
    } else {
      setLoading(false)
    }
  }, [token, user, setUser, logout])

  const handleLogout = () => {
    logout()
    navigate('/login')
  }

  return (
    <div className="min-h-screen bg-gray-100 flex flex-col items-center justify-center p-4">
      <div className="bg-white p-8 rounded-lg shadow-md max-w-2xl w-full">
        <div className="flex justify-between items-center mb-6">
          <h1 className="text-3xl font-bold text-blue-600">Edgecloud Dashboard</h1>
          <div className="space-x-4">
            <Link to="/marketplace" className="px-4 py-2 bg-blue-100 text-blue-700 rounded hover:bg-blue-200">
              Browse Marketplace
            </Link>
            <button 
              onClick={handleLogout}
              className="px-4 py-2 bg-red-500 text-white rounded hover:bg-red-600"
            >
              Logout
            </button>
          </div>
        </div>
        
        {user ? (
          <div>
            <div className="bg-gray-50 p-4 rounded border">
              <h2 className="text-xl font-semibold mb-2">Welcome!</h2>
              <p className="text-gray-700"><strong>Email:</strong> {user.email}</p>
              <p className="text-gray-700"><strong>Role:</strong> <span className="capitalize">{user.role}</span></p>
            </div>
            
            <div className="mt-8 border-t pt-6">
              <h2 className="text-2xl font-bold text-gray-800 mb-4">My Deployments</h2>
              
              {loading ? (
                <p>Loading deployments...</p>
              ) : deployments.length === 0 ? (
                <p className="text-gray-500">You have no active deployments. Visit the marketplace to rent a node.</p>
              ) : (
                <div className="space-y-4">
                  {deployments.map(dep => (
                    <div key={dep.id} className="border p-4 rounded-lg bg-gray-50 flex justify-between items-center">
                      <div>
                        <h3 className="font-bold text-lg">{dep.name}</h3>
                        <p className="text-sm text-gray-600">Image: {dep.docker_image}</p>
                        <a href={`http://${dep.subdomain}`} target="_blank" rel="noreferrer" className="text-blue-500 text-sm hover:underline">
                          {dep.subdomain}
                        </a>
                      </div>
                      <span className={`px-3 py-1 rounded text-sm font-semibold ${dep.status === 'running' ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'}`}>
                        {dep.status}
                      </span>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        ) : (
          <p className="text-gray-600 text-center">Loading user details...</p>
        )}
      </div>
    </div>
  )
}
