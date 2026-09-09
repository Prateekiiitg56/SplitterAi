import { useState, useEffect } from 'react'
import { Download, Terminal, Check, Apple, Monitor, Cpu } from 'lucide-react'
import { Modal } from './primitives/Modal'
import { Button } from './primitives/Button'

interface DownloadAppModalProps {
  isOpen: boolean
  onClose: () => void
}

export default function DownloadAppModal({ isOpen, onClose }: DownloadAppModalProps) {
  const [copiedCli, setCopiedCli] = useState(false)

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && isOpen) {
        onClose()
      }
    }
    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [isOpen, onClose])

  if (!isOpen) return null

  const handleCopyCli = () => {
    navigator.clipboard.writeText('npm i -g @splitterai/cli')
    setCopiedCli(true)
    setTimeout(() => setCopiedCli(false), 2000)
  }

  const platforms = [
    {
      id: 'mac',
      name: 'macOS',
      arch: 'Apple Silicon & Intel (v1.4.2)',
      icon: Apple,
      file: 'SplitterAI-1.4.2-universal.dmg',
    },
    {
      id: 'win',
      name: 'Windows',
      arch: 'x64 Installer (v1.4.2)',
      icon: Monitor,
      file: 'SplitterAI-Setup-1.4.2.exe',
    },
    {
      id: 'linux',
      name: 'Linux',
      arch: 'AppImage / Deb (v1.4.2)',
      icon: Cpu,
      file: 'SplitterAI-1.4.2.AppImage',
    },
  ]

  return (
    <Modal open={isOpen} onClose={onClose} title="Get SplitterAI Desktop & CLI">
      <div className="space-y-5 text-[var(--text)] py-1">
        <p className="text-xs text-[var(--dim)] leading-relaxed">
          Native desktop performance with hardware-accelerated local agent isolation, multi-GPU task splitting, and background daemon support.
        </p>

        {/* Platform Downloads */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
          {platforms.map((p) => {
            const Icon = p.icon
            return (
              <div
                key={p.id}
                className="p-3.5 rounded-lg border border-[var(--border)] bg-[var(--panel-2)] hover:border-[var(--accent)] transition-all flex flex-col justify-between group"
              >
                <div>
                  <div className="flex items-center gap-2 mb-1.5">
                    <Icon size={16} className="text-[var(--accent)]" />
                    <span className="font-semibold text-xs text-[var(--text)]">{p.name}</span>
                  </div>
                  <div className="text-[10.5px] font-mono text-[var(--faint)] mb-3">{p.arch}</div>
                </div>

                <a
                  href={`#download-${p.id}`}
                  onClick={(e) => {
                    e.preventDefault()
                    alert(`Starting download: ${p.file}`)
                  }}
                  className="w-full text-center py-1.5 px-2 rounded text-[11px] font-medium bg-[var(--panel-3)] border border-[var(--border-soft)] hover:border-[var(--accent)] hover:text-[var(--accent)] transition-all flex items-center justify-center gap-1.5"
                >
                  <Download size={12} />
                  <span>Download</span>
                </a>
              </div>
            )
          })}
        </div>

        {/* CLI Option */}
        <div className="p-3.5 rounded-lg border border-[var(--border)] bg-[var(--panel)]">
          <div className="flex items-center justify-between mb-2">
            <div className="flex items-center gap-2">
              <Terminal size={14} className="text-[var(--accent)]" />
              <span className="font-semibold text-xs">SplitterAI CLI</span>
            </div>
            <span className="text-[10px] font-mono text-[var(--faint)]">Node.js 18+</span>
          </div>

          <div className="flex items-center justify-between bg-[var(--bg-inset)] border border-[var(--border)] rounded px-3 py-2 font-mono text-xs text-[var(--accent)]">
            <code>npm i -g @splitterai/cli</code>
            <button
              onClick={handleCopyCli}
              className="text-[var(--dim)] hover:text-[var(--text)] transition-colors flex items-center gap-1 text-[11px] font-sans"
              title="Copy to clipboard"
            >
              {copiedCli ? (
                <>
                  <Check size={12} className="text-emerald-400" />
                  <span className="text-emerald-400">Copied</span>
                </>
              ) : (
                <span>Copy</span>
              )}
            </button>
          </div>
        </div>

        <div className="flex justify-end pt-2 border-t border-[var(--border-soft)]">
          <Button variant="quiet" size="sm" onClick={onClose}>
            Close
          </Button>
        </div>
      </div>
    </Modal>
  )
}
