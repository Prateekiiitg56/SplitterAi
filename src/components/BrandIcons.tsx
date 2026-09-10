import React from 'react'

interface IconProps {
  size?: number
  className?: string
}

/**
 * Agent Rainbow Badge SVG used for role and agent identity.
 */
export function AgentRainbowBadge({ size = 16, className = '' }: IconProps) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      className={`inline-block shrink-0 ${className}`}
    >
      <circle cx="12" cy="12" r="11" fill="#0B0E14" stroke="rgba(255,255,255,0.2)" strokeWidth="1" />
      {/* Outer vibrant multi-color gradient ring */}
      <circle cx="12" cy="12" r="8.5" stroke="url(#rainbow_grad)" strokeWidth="2.4" />
      {/* Center 4-point star icon */}
      <path
        d="M12 6.5L13.1 10.9L17.5 12L13.1 13.1L12 17.5L10.9 13.1L6.5 12L10.9 10.9L12 6.5Z"
        fill="#70E000"
      />
      <circle cx="12" cy="12" r="1.5" fill="#FFFFFF" />
      <defs>
        <linearGradient id="rainbow_grad" x1="0" y1="0" x2="24" y2="24" gradientUnits="userSpaceOnUse">
          <stop offset="0%" stopColor="#00E5FF" />
          <stop offset="25%" stopColor="#70E000" />
          <stop offset="50%" stopColor="#FFD600" />
          <stop offset="75%" stopColor="#FF6D00" />
          <stop offset="100%" stopColor="#D500F9" />
        </linearGradient>
      </defs>
    </svg>
  )
}

/**
 * Overlapping 4 colored circles icon for "Model Fusion"
 */
export function ModelFusionIcon({ size = 16 }: IconProps) {
  return (
    <div className="flex items-center -space-x-1.5 inline-flex" style={{ height: size }}>
      <span className="w-3.5 h-3.5 rounded-full bg-[#3B82F6] ring-1 ring-black/60 inline-block shrink-0 shadow-sm" />
      <span className="w-3.5 h-3.5 rounded-full bg-[#EC4899] ring-1 ring-black/60 inline-block shrink-0 shadow-sm" />
      <span className="w-3.5 h-3.5 rounded-full bg-[#F97316] ring-1 ring-black/60 inline-block shrink-0 shadow-sm" />
      <span className="w-3.5 h-3.5 rounded-full bg-[#F59E0B] ring-1 ring-black/60 inline-block shrink-0 shadow-sm" />
    </div>
  )
}

/**
 * Stripe MCP Logo
 */
export function StripeLogo({ size = 20 }: IconProps) {
  return (
    <svg width={size} height={size} viewBox="0 0 32 32" fill="none" xmlns="http://www.w3.org/2000/svg" className="shrink-0">
      <rect width="32" height="32" rx="8" fill="#635BFF" />
      <path
        d="M22.1 12.3c0-1.8-1.4-2.5-3.8-2.9l-2-.4c-1.2-.2-1.8-.6-1.8-1.2 0-.7.7-1.1 1.9-1.1 1.6 0 3.2.5 4.3 1.2l.9-3.2C20.4 4.1 18.6 3.6 16.5 3.6c-4.1 0-6.9 2.1-6.9 5.5 0 4.3 5.9 4.6 5.9 7 0 .9-.8 1.3-2.1 1.3-1.8 0-3.8-.7-5.1-1.7l-1 3.3c1.6 1 3.7 1.6 6.1 1.6 4.3 0 7.3-2.1 7.3-5.6 0-4.6-6-4.9-6-7.2"
        fill="#FFFFFF"
        transform="translate(1.5, 3.5)"
      />
    </svg>
  )
}

/**
 * Slack Logo
 */
export function SlackLogo({ size = 20 }: IconProps) {
  return (
    <svg width={size} height={size} viewBox="0 0 32 32" fill="none" xmlns="http://www.w3.org/2000/svg" className="shrink-0">
      <rect width="32" height="32" rx="8" fill="#1A1D21" />
      <g transform="translate(6, 6) scale(0.83)">
        <path d="M6 15a3 3 0 0 1-3-3 3 3 0 0 1 3-3h3v3a3 3 0 0 1-3 3zm0 3a3 3 0 0 1 3 3v3a3 3 0 0 1-3-3 3 3 0 0 1 0-6z" fill="#E01E5A" />
        <path d="M9 6a3 3 0 0 1 3-3 3 3 0 0 1 3 3v3h-3a3 3 0 0 1-3-3zm3 0a3 3 0 0 1 3-3 3 3 0 0 1 3 3v3a3 3 0 0 1-3 3 3 3 0 0 1-3-3z" fill="#36C5F0" />
        <path d="M18 9a3 3 0 0 1 3 3 3 3 0 0 1-3 3h-3v-3a3 3 0 0 1 3-3zm0-3a3 3 0 0 1-3-3V0a3 3 0 0 1 3 3 3 3 0 0 1 0 6z" fill="#2EB67D" />
        <path d="M15 18a3 3 0 0 1-3 3 3 3 0 0 1-3-3v-3h3a3 3 0 0 1 3 3zm-3 0a3 3 0 0 1-3 3 3 3 0 0 1-3-3v-3a3 3 0 0 1 3-3 3 3 0 0 1 3 3z" fill="#ECB22E" />
      </g>
    </svg>
  )
}

/**
 * Google Calendar Logo
 */
export function GoogleCalendarLogo({ size = 20 }: IconProps) {
  return (
    <svg width={size} height={size} viewBox="0 0 32 32" fill="none" xmlns="http://www.w3.org/2000/svg" className="shrink-0">
      <rect width="32" height="32" rx="8" fill="#FFFFFF" />
      <path d="M8 8H24V24H8V8Z" fill="#FFFFFF" />
      <path d="M20.5 8H24V24H20.5V8Z" fill="#4285F4" />
      <path d="M8 20.5H24V24H8V20.5Z" fill="#34A853" />
      <path d="M8 8H11.5V24H8V8Z" fill="#FBBC05" />
      <path d="M8 8H24V11.5H8V8Z" fill="#EA4335" />
      <text x="16" y="20.5" textAnchor="middle" fill="#4285F4" fontSize="11" fontWeight="bold" fontFamily="sans-serif">
        31
      </text>
    </svg>
  )
}

/**
 * Microsoft Excel Logo
 */
export function ExcelLogo({ size = 20 }: IconProps) {
  return (
    <svg width={size} height={size} viewBox="0 0 32 32" fill="none" xmlns="http://www.w3.org/2000/svg" className="shrink-0">
      <rect width="32" height="32" rx="8" fill="#107C41" />
      <path d="M7 10L14 7V25L7 22V10Z" fill="#185ABD" opacity="0.2" />
      <path d="M8 9.5L15 7.5V24.5L8 22.5V9.5Z" fill="#107C41" />
      <path
        d="M17 11H25V21H17V11ZM17 13.5H25M17 16H25M17 18.5H25M21 11V21"
        stroke="#FFFFFF"
        strokeWidth="1.2"
        strokeOpacity="0.8"
      />
      <text x="11.5" y="19" textAnchor="middle" fill="#FFFFFF" fontSize="12" fontWeight="bold" fontFamily="sans-serif">
        X
      </text>
    </svg>
  )
}
