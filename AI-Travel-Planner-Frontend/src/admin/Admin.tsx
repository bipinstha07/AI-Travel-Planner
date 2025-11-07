import { useEffect, useState } from 'react'

function Admin() {
  const [inputs, setInputs] = useState<string[]>([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const loadInputs = async () => {
    setLoading(true)
    setError(null)
    try {
      const resp = await fetch('http://localhost:8008/api/v1/inputs')
      const json = await resp.json()
      setInputs(Array.isArray(json.items) ? json.items : [])
    } catch (e: any) {
      setError(e?.message || 'Failed to load inputs')
    } finally {
      setLoading(false)
    }
  }

  const clearAll = async () => {
    setLoading(true)
    setError(null)
    try {
      await fetch('http://localhost:8008/api/v1/requests', { method: 'DELETE' })
      await loadInputs()
    } catch (e: any) {
      setError(e?.message || 'Failed to clear inputs')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    loadInputs()
  }, [])

  return (
    <div className="max-w-4xl mx-auto p-6">
      <h2 className="text-2xl font-semibold mb-4">Admin: Submitted Inputs</h2>
      <div className="flex gap-2 mb-4">
        <button onClick={loadInputs} className="px-3 py-2 bg-gray-100 hover:bg-gray-200 rounded">Refresh</button>
        <button onClick={clearAll} className="px-3 py-2 bg-red-500 text-white hover:bg-red-600 rounded">Clear All</button>
      </div>
      {loading && <div className="text-gray-700">Loading...</div>}
      {error && <div className="text-red-600">{error}</div>}
      <ul className="list-disc ml-5">
        {inputs.map((text, idx) => (
          <li key={idx} className="mb-1">{text}</li>
        ))}
        {inputs.length === 0 && !loading && (
          <li className="text-gray-600">No inputs yet</li>
        )}
      </ul>
    </div>
  )
}

export default Admin