'use client'

import { useState, useRef } from 'react'
import { useDropzone } from 'react-dropzone'
import { CloudArrowUpIcon } from '@heroicons/react/24/outline'

export default function UploadGame() {
  const [uploading, setUploading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const fileInputRef = useRef<HTMLInputElement>(null)

  const onDrop = async (acceptedFiles: File[]) => {
    setUploading(true)
    setError(null)

    try {
      const formData = new FormData()
      formData.append('file', acceptedFiles[0])

      const response = await fetch('/api/upload', {
        method: 'POST',
        body: formData,
      })

      if (!response.ok) {
        const errorData = await response.json()
        throw new Error(errorData.error || 'Upload failed')
      }

      // Refresh the page to show the new game
      window.location.reload()
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to upload game file. Please try again.')
    } finally {
      setUploading(false)
    }
  }

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop,
    accept: {
      'application/zip': ['.zip'],
    },
    maxFiles: 1,
    noClick: true,
    noKeyboard: true,
  })

  return (
    <div className="relative">
      <button
        className="p-2 rounded-full bg-realm-accent hover:bg-realm-primary transition-colors shadow-md"
        title="Upload Game"
        onClick={() => fileInputRef.current?.click()}
        disabled={uploading}
        aria-label="Upload Game"
      >
        <CloudArrowUpIcon className="h-6 w-6 text-white" />
      </button>
      <input
        {...getInputProps()}
        ref={fileInputRef}
        style={{ display: 'none' }}
        disabled={uploading}
      />
      {error && (
        <div className="absolute right-0 mt-2 w-64 bg-red-100 border border-red-400 text-red-700 px-4 py-2 rounded shadow-lg z-10 text-xs">
          {error}
        </div>
      )}
      {uploading && (
        <div className="absolute right-0 mt-2 w-32 bg-yellow-100 border border-yellow-400 text-yellow-700 px-2 py-1 rounded shadow-lg z-10 text-xs">
          Uploading...
        </div>
      )}
    </div>
  )
} 