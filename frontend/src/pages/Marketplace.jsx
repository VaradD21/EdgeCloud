import { useState, useEffect } from 'react'
import { useNavigate, Link } from 'react-router-dom'
import { useAuthStore } from '../store/authStore'

export default function Marketplace() {
  const { token } = useAuthStore()
  const [listings, setListings] = useState([])
  const [loading, setLoading] = useState(true)

  // Filters
  const [minCpu, setMinCpu] = useState('')
  const [minRam, setMinRam] = useState('')
  const [maxPrice, setMaxPrice] = useState('')

  const fetchListings = async () => {
    setLoading(true)
    try {
      const params = new URLSearchParams()
      if (minCpu) params.append('min_cpu', minCpu)
      if (minRam) params.append('min_ram', minRam)
      if (maxPrice) params.append('max_price', maxPrice)

      const res = await fetch(`http://localhost:8000/listings?${params.toString()}`, {
        headers: { 'Authorization': `Bearer ${token}` }
      })
      if (!res.ok) throw new Error('Failed to fetch')
      const data = await res.json()
      setListings(data)
    } catch (err) {
      console.error(err)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchListings()
  }, [minCpu, minRam, maxPrice])

  return (
    <div className="min-h-screen bg-gray-100 p-8">
      <div className="max-w-6xl mx-auto">
        <h1 className="text-3xl font-bold text-blue-600 mb-8">Edgecloud Marketplace</h1>
        
        {/* Filters */}
        <div className="bg-white p-4 rounded shadow mb-8 flex flex-wrap gap-4 items-end">
          <div>
            <label className="block text-sm text-gray-600 mb-1">Min CPU (cores)</label>
            <input 
              type="number" 
              className="border rounded px-3 py-2 w-32" 
              value={minCpu} 
              onChange={e => setMinCpu(e.target.value)} 
              placeholder="e.g. 4"
            />
          </div>
          <div>
            <label className="block text-sm text-gray-600 mb-1">Min RAM (GB)</label>
            <input 
              type="number" 
              className="border rounded px-3 py-2 w-32" 
              value={minRam} 
              onChange={e => setMinRam(e.target.value)} 
              placeholder="e.g. 16"
            />
          </div>
          <div>
            <label className="block text-sm text-gray-600 mb-1">Max Price ($/hr)</label>
            <input 
              type="number" 
              className="border rounded px-3 py-2 w-32" 
              value={maxPrice} 
              onChange={e => setMaxPrice(e.target.value)} 
              placeholder="e.g. 0.5"
            />
          </div>
          <button 
            onClick={fetchListings}
            className="bg-blue-600 text-white px-4 py-2 rounded hover:bg-blue-700"
          >
            Apply Filters
          </button>
        </div>

        {/* Listings Grid */}
        {loading ? (
          <p>Loading listings...</p>
        ) : listings.length === 0 ? (
          <p className="text-gray-500">No listings found matching your criteria.</p>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {listings.map(listing => (
              <div key={listing.id} className="bg-white p-6 rounded-lg shadow-md border-t-4 border-blue-500 hover:shadow-lg transition">
                <div className="flex justify-between items-start mb-4">
                  <h2 className="text-xl font-bold">{listing.cpu} Cores</h2>
                  <span className="bg-green-100 text-green-800 text-sm font-semibold px-2 py-1 rounded">
                    ${listing.price_per_hour}/hr
                  </span>
                </div>
                <div className="mb-4 text-gray-600">
                  <p><strong>RAM:</strong> {listing.ram} GB</p>
                  <p><strong>Host:</strong> {listing.host_display_name || 'Anonymous'}</p>
                  <p>
                    <strong>Rating:</strong>{' '}
                    <span className="text-yellow-600 font-bold">
                      {listing.host_rating !== null ? `${listing.host_rating} ★` : 'New'}
                    </span>
                  </p>
                  <p>
                    <strong>Status:</strong>{' '}
                    <span className={listing.node_status === 'online' ? 'text-green-600 font-semibold' : 'text-red-600 font-semibold'}>
                      {listing.node_status === 'online' ? 'Online' : 'Offline'}
                    </span>
                  </p>
                </div>
                {listing.node_status === 'online' ? (
                  <Link 
                    to={`/deploy/${listing.id}`}
                    className="block text-center w-full bg-gray-900 text-white py-2 rounded hover:bg-gray-800 transition"
                  >
                    Rent Node
                  </Link>
                ) : (
                  <button 
                    disabled
                    className="block text-center w-full bg-gray-300 text-gray-500 py-2 rounded cursor-not-allowed"
                  >
                    Node Offline
                  </button>
                )}
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}
