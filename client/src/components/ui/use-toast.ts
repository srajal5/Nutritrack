import * as React from "react"
import {  ToastProps } from "./toast"

const ToastContext = React.createContext<{
  toast: (props: ToastProps) => void
} | undefined>(undefined)

export function useToast() {
  const context = React.useContext(ToastContext)
  if (!context) {
    throw new Error("useToast must be used within a ToastProvider")
  }
  return context
}

 