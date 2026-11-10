'use client'

import { useEffect, useState } from 'react'

export function BuildingOverlay({ briefId }: { briefId: string }) {
  const [messages, setMessages] = useState<string[]>([])
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    const es = new EventSource(`/api/briefs/${briefId}/build`)

    es.addEventListener('progress', (e) => {
      const { message } = JSON.parse(e.data) as { message: string }
      setMessages(prev => [...prev, message])
    })

    es.addEventListener('build_complete', () => {
      es.close()
      window.location.replace(`/dashboard/briefs/${briefId}`)
    })

    es.addEventListener('build_error', (e) => {
      const { error } = JSON.parse(e.data) as { error: string }
      setError(error)
      es.close()
    })

    es.onerror = () => {
      if (es.readyState === EventSource.CLOSED) return
      setError('Connection lost. Please refresh.')
      es.close()
    }

    return () => es.close()
  }, [briefId])

  return (
    <div className="absolute inset-0 bg-white/95 flex items-center justify-center z-50">
      <div className="max-w-xs w-full text-center px-6">
        {!error && (
          <div className="flex justify-center mb-4">
            <div className="w-6 h-6 border-2 border-gray-900 border-t-transparent rounded-full animate-spin" />
          </div>
        )}
        <p className="text-sm font-medium text-gray-900 mb-3">
          {error ? 'Build failed' : 'Building your brief map…'}
        </p>
        <div className="space-y-1 text-left">
          {messages.map((m, i) => (
            <p key={i} className="text-xs text-gray-400">{m}</p>
          ))}
        </div>
        {error && (
          <p className="mt-4 text-xs text-red-500">{error}</p>
        )}
      </div>
    </div>
  )
}
