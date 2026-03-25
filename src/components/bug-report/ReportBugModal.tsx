"use client"

import { useState, useRef } from "react"
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Bug, X, Loader2, AlertCircle, ImageIcon, Plus, Send } from "lucide-react"

interface ReportBugModalProps {
  isOpen: boolean
  onClose: () => void
}

interface ScreenshotFile {
  file: File
  preview: string
}

export function ReportBugModal({ isOpen, onClose }: ReportBugModalProps) {
  const [title, setTitle] = useState("")
  const [description, setDescription] = useState("")
  const [reporterName, setReporterName] = useState("")
  const [reporterEmail, setReporterEmail] = useState("")
  const [screenshots, setScreenshots] = useState<ScreenshotFile[]>([])
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [submitted, setSubmitted] = useState(false)
  const [issueUrl, setIssueUrl] = useState<string | null>(null)
  const fileInputRef = useRef<HTMLInputElement>(null)

  const resetForm = () => {
    setTitle("")
    setDescription("")
    setReporterName("")
    setReporterEmail("")
    setScreenshots([])
    setError(null)
    setSubmitted(false)
    setIssueUrl(null)
  }

  const handleClose = () => {
    if (!isSubmitting) {
      resetForm()
      onClose()
    }
  }

  const addFiles = (fileList: FileList | File[]) => {
    const allowed = ["image/png", "image/jpeg", "image/gif"]
    const newScreenshots: ScreenshotFile[] = []

    for (const file of Array.from(fileList)) {
      if (!allowed.includes(file.type)) {
        setError(`"${file.name}" is not a supported image type (PNG, JPEG, or GIF)`)
        return
      }
      if (file.size > 10 * 1024 * 1024) {
        setError(`"${file.name}" exceeds the 10 MB limit`)
        return
      }
      newScreenshots.push({ file, preview: URL.createObjectURL(file) })
    }

    setError(null)
    setScreenshots((prev) => [...prev, ...newScreenshots])
  }

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files.length > 0) addFiles(e.target.files)
    if (fileInputRef.current) fileInputRef.current.value = ""
  }

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault()
    if (e.dataTransfer.files.length > 0) addFiles(e.dataTransfer.files)
  }

  const removeScreenshot = (index: number) => {
    setScreenshots((prev) => {
      URL.revokeObjectURL(prev[index].preview)
      return prev.filter((_, i) => i !== index)
    })
  }

  const handleSubmit = async () => {
    if (!title.trim()) { setError("Title is required"); return }
    if (!description.trim()) { setError("Description is required"); return }

    setIsSubmitting(true)
    setError(null)

    try {
      const formData = new FormData()
      formData.append("title", title.trim())
      formData.append("description", description.trim())
      if (reporterName.trim()) formData.append("reporterName", reporterName.trim())
      if (reporterEmail.trim()) formData.append("reporterEmail", reporterEmail.trim())
      formData.append("screenshotCount", String(screenshots.length))
      screenshots.forEach((s, i) => formData.append(`screenshot-${i}`, s.file))

      const res = await fetch("/api/bug-reports", { method: "POST", body: formData })

      const data = await res.json()
      if (!res.ok) {
        throw new Error(data.error || "Failed to submit bug report")
      }

      setIssueUrl(data.issueUrl ?? null)
      setSubmitted(true)
    } catch (err) {
      setError(err instanceof Error ? err.message : "An error occurred")
    } finally {
      setIsSubmitting(false)
    }
  }

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && handleClose()}>
      <DialogContent className="sm:max-w-xl max-h-[90vh] overflow-y-auto p-6">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 text-gray-900">
            <Bug className="h-5 w-5 text-amber-500" />
            Report a Bug
          </DialogTitle>
          <DialogDescription>
            Describe the issue you encountered and it will be filed as a GitHub issue for our team to review.
          </DialogDescription>
        </DialogHeader>

        {submitted ? (
          <div className="mt-6 text-center space-y-3">
            <div className="w-12 h-12 rounded-full bg-green-100 flex items-center justify-center mx-auto">
              <Send className="h-5 w-5 text-green-600" />
            </div>
            <p className="font-medium text-gray-900">Bug report submitted!</p>
            {issueUrl ? (
              <>
                <p className="text-sm text-gray-500">Thank you. A GitHub issue has been filed and our team will look into it.</p>
                <a
                  href={issueUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-sm text-blue-600 hover:underline"
                >
                  View GitHub issue →
                </a>
              </>
            ) : (
              <p className="text-sm text-gray-500">
                Report received, but we couldn't automatically file a GitHub issue.
                Please contact us at{" "}
                <a href="mailto:calbioscape@gmail.com" className="text-blue-600 hover:underline">
                  calbioscape@gmail.com
                </a>
                {" "}if the issue persists.
              </p>
            )}
            <button
              onClick={handleClose}
              className="mt-2 px-4 py-2 rounded-md bg-blue-600 text-white text-sm font-medium hover:bg-blue-700 transition-colors"
            >
              Close
            </button>
          </div>
        ) : (
          <div className="space-y-4 mt-4">
            {error && (
              <div className="p-3 bg-red-50 border border-red-200 rounded-md flex items-center gap-3 text-red-700 text-sm">
                <AlertCircle className="h-4 w-4 flex-shrink-0" />
                <span>{error}</span>
              </div>
            )}

            {/* Title */}
            <div className="space-y-1.5">
              <Label htmlFor="bug-title" className="text-gray-700">
                Title <span className="text-red-500">*</span>
              </Label>
              <Input
                id="bug-title"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                placeholder="Brief description of the issue..."
                disabled={isSubmitting}
                maxLength={200}
              />
            </div>

            {/* Description */}
            <div className="space-y-1.5">
              <Label htmlFor="bug-description" className="text-gray-700">
                Description <span className="text-red-500">*</span>
              </Label>
              <textarea
                id="bug-description"
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                placeholder="What happened? What did you expect? Steps to reproduce..."
                disabled={isSubmitting}
                maxLength={5000}
                rows={5}
                className="flex w-full rounded-md border border-input bg-transparent px-3 py-2 text-sm shadow-xs placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring/50 disabled:cursor-not-allowed disabled:opacity-50 resize-none"
              />
            </div>

            {/* Optional reporter info */}
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label htmlFor="reporter-name" className="text-gray-700">Name <span className="text-gray-400 font-normal">(optional)</span></Label>
                <Input
                  id="reporter-name"
                  value={reporterName}
                  onChange={(e) => setReporterName(e.target.value)}
                  placeholder="Your name"
                  disabled={isSubmitting}
                />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="reporter-email" className="text-gray-700">Email <span className="text-gray-400 font-normal">(optional)</span></Label>
                <Input
                  id="reporter-email"
                  type="email"
                  value={reporterEmail}
                  onChange={(e) => setReporterEmail(e.target.value)}
                  placeholder="your@email.com"
                  disabled={isSubmitting}
                />
              </div>
            </div>

            {/* Screenshots */}
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <Label className="text-gray-700">
                  Screenshots <span className="text-gray-400 font-normal">(optional)</span>
                </Label>
                {screenshots.length > 0 && (
                  <button
                    type="button"
                    onClick={() => fileInputRef.current?.click()}
                    disabled={isSubmitting}
                    className="text-xs text-blue-600 hover:text-blue-700 flex items-center gap-1 disabled:opacity-50"
                  >
                    <Plus className="h-3 w-3" /> Add more
                  </button>
                )}
              </div>

              {screenshots.length > 0 && (
                <div className="grid grid-cols-2 gap-2">
                  {screenshots.map((s, index) => (
                    <div key={index} className="relative rounded-md border border-gray-200 overflow-hidden group">
                      <img
                        src={s.preview}
                        alt={`Screenshot ${index + 1}`}
                        className="w-full h-28 object-cover bg-gray-50"
                      />
                      <button
                        type="button"
                        onClick={() => removeScreenshot(index)}
                        disabled={isSubmitting}
                        className="absolute top-1 right-1 p-0.5 bg-white/90 rounded-full text-gray-400 hover:text-red-500 transition-colors opacity-0 group-hover:opacity-100"
                      >
                        <X className="h-3.5 w-3.5" />
                      </button>
                      <div className="absolute bottom-0 left-0 right-0 bg-black/40 px-2 py-0.5">
                        <p className="text-xs text-white truncate">{s.file.name}</p>
                      </div>
                    </div>
                  ))}
                </div>
              )}

              <div
                className="border-2 border-dashed border-gray-200 rounded-md p-4 text-center hover:border-amber-400 transition-colors cursor-pointer"
                onDrop={handleDrop}
                onDragOver={(e) => e.preventDefault()}
                onClick={() => fileInputRef.current?.click()}
              >
                <input
                  ref={fileInputRef}
                  type="file"
                  accept="image/png,image/jpeg,image/gif"
                  multiple
                  onChange={handleFileSelect}
                  className="hidden"
                />
                <ImageIcon className="h-6 w-6 text-gray-300 mx-auto mb-1" />
                <p className="text-sm text-gray-400">
                  {screenshots.length > 0 ? "Drop more images or click to browse" : "Drop images here or click to browse"}
                </p>
                <p className="text-xs text-gray-300 mt-0.5">PNG, JPEG, or GIF · max 10 MB each</p>
              </div>
            </div>

            {/* Actions */}
            <div className="flex gap-3 pt-1">
              <button
                type="button"
                onClick={handleClose}
                disabled={isSubmitting}
                className="flex-1 px-4 py-2 rounded-md border border-gray-300 text-gray-700 text-sm font-medium hover:bg-gray-50 transition-colors disabled:opacity-50"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleSubmit}
                disabled={isSubmitting || !title.trim() || !description.trim()}
                className="flex-1 px-4 py-2 rounded-md bg-blue-600 text-white text-sm font-medium hover:bg-blue-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
              >
                {isSubmitting ? (
                  <>
                    <Loader2 className="h-4 w-4 animate-spin" />
                    Submitting...
                  </>
                ) : (
                  <>
                    <Send className="h-4 w-4" />
                    Submit Report
                  </>
                )}
              </button>
            </div>
          </div>
        )}
      </DialogContent>
    </Dialog>
  )
}
