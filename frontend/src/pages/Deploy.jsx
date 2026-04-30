import { useState } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { useAuthStore } from '../store/authStore'

export default function Deploy() {
  const { listingId } = useParams()
  const navigate = useNavigate()
  const { token } = useAuthStore()
  
  const [name, setName] = useState('')
  const [dockerImage, setDockerImage] = useState('')
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)

  const handleDeploy = async (e) => {
    e.preventDefault()
    setError('')
    setLoading(true)

    try {
      const res = await fetch('http://localhost:8000/deployments', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({
          listing_id: listingId,
          name,
          docker_image: dockerImage
        })
      })

      if (!res.ok) {
        const data = await res.json()
        throw new Error(data.detail || 'Failed to create deployment')
      }

      navigate('/') // Go back to dashboard to see the deployment
    } catch (err) {
      setError(err.message)
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="min-h-screen bg-gray-100 flex flex-col items-center justify-center p-4">
      <div className="bg-white p-8 rounded-lg shadow-md max-w-md w-full border-t-4 border-blue-500">
        <h1 className="text-2xl font-bold text-gray-800 mb-6">Deploy Application</h1>
        
        {error && <div className="bg-red-100 text-red-700 p-3 rounded mb-4">{error}</div>}

        <form onSubmit={handleDeploy} className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">App Name</label>
            <input 
              type="text" 
              required
              className="w-full px-3 py-2 border rounded focus:outline-none focus:ring focus:border-blue-300"
              value={name}
              onChange={e => setName(e.target.value)}
              placeholder="e.g. my-web-app"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Docker Image</label>
            <input 
              type="text" 
              required
              className="w-full px-3 py-2 border rounded focus:outline-none focus:ring focus:border-blue-300"
              value={dockerImage}
              onChange={e => setDockerImage(e.target.value)}
              placeholder="e.g. nginx:latest"
            />
          </div>
          
          <button 
            type="submit" 
            disabled={loading}
            className="w-full bg-blue-600 text-white py-2 rounded hover:bg-blue-700 transition disabled:opacity-50"
          >
            {loading ? 'Deploying...' : 'Deploy Now'}
          </button>
        </form>
      </div>
    </div>
  )
}
