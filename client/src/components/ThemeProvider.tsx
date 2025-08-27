import { createContext, useContext, useEffect, useState, type ReactNode } from "react"

type Theme = "dark" | "light" | "system"

type ThemeProviderProps = {
  children: ReactNode
  defaultTheme?: Theme
  storageKey?: string
}

type ThemeProviderState = {
  theme: Theme
  setTheme: (theme: Theme) => void
  resolvedTheme: "dark" | "light"
}

const initialState: ThemeProviderState = {
  theme: "system",
  setTheme: () => null,
  resolvedTheme: "light",
}

const ThemeProviderContext = createContext<ThemeProviderState>(initialState)

export function ThemeProvider({
  children,
  defaultTheme = "system",
  storageKey = "nutritrack-theme",
  ...props
}: ThemeProviderProps) {
  const [theme, setThemeState] = useState<Theme>(() => {
    const savedTheme = localStorage.getItem(storageKey) as Theme
    return savedTheme || defaultTheme
  })
  
  const [resolvedTheme, setResolvedTheme] = useState<"dark" | "light">("light")

  const applyTheme = (newTheme: Theme) => {
    try {
      console.log('ThemeProvider: Applying theme:', newTheme)
      const root = window.document.documentElement
      const body = window.document.body
      
      // Remove existing theme classes
      root.classList.remove("light", "dark")
      body.classList.remove("light", "dark")
      root.removeAttribute("data-theme")
      body.removeAttribute("data-theme")
      
      let finalTheme: "dark" | "light" = "light"
      
      if (newTheme === "system") {
        finalTheme = window.matchMedia("(prefers-color-scheme: dark)").matches ? "dark" : "light"
      } else {
        finalTheme = newTheme
      }
      
      console.log('ThemeProvider: Final theme:', finalTheme)
      
      // Apply theme classes and data attributes
      root.classList.add(finalTheme)
      body.classList.add(finalTheme)
      root.setAttribute("data-theme", finalTheme)
      body.setAttribute("data-theme", finalTheme)
      
      // Set DaisyUI theme attribute on html element
      root.setAttribute("data-theme", finalTheme)
    
      // Apply CSS custom properties for shadcn/ui compatibility
      if (finalTheme === "dark") {
        root.style.setProperty("--background", "222.2 84% 4.9%")
        root.style.setProperty("--foreground", "210 40% 98%")
        root.style.setProperty("--card", "222.2 84% 4.9%")
        root.style.setProperty("--card-foreground", "210 40% 98%")
        root.style.setProperty("--popover", "222.2 84% 4.9%")
        root.style.setProperty("--popover-foreground", "210 40% 98%")
        root.style.setProperty("--primary", "142.1 70.6% 45.3%")
        root.style.setProperty("--primary-foreground", "144.9 80.4% 10%")
        root.style.setProperty("--secondary", "217.2 32.6% 17.5%")
        root.style.setProperty("--secondary-foreground", "210 40% 98%")
        root.style.setProperty("--muted", "217.2 32.6% 17.5%")
        root.style.setProperty("--muted-foreground", "215 20.2% 65.1%")
        root.style.setProperty("--accent", "217.2 32.6% 17.5%")
        root.style.setProperty("--accent-foreground", "210 40% 98%")
        root.style.setProperty("--destructive", "0 62.8% 30.6%")
        root.style.setProperty("--destructive-foreground", "210 40% 98%")
        root.style.setProperty("--border", "217.2 32.6% 17.5%")
        root.style.setProperty("--input", "217.2 32.6% 17.5%")
        root.style.setProperty("--ring", "142.1 70.6% 45.3%")
      } else {
        root.style.setProperty("--background", "0 0% 98%")
        root.style.setProperty("--foreground", "222.2 84% 4.9%")
        root.style.setProperty("--card", "0 0% 98%")
        root.style.setProperty("--card-foreground", "222.2 84% 4.9%")
        root.style.setProperty("--popover", "0 0% 98%")
        root.style.setProperty("--popover-foreground", "222.2 84% 4.9%")
        root.style.setProperty("--primary", "142.1 76.2% 36.3%")
        root.style.setProperty("--primary-foreground", "355.7 100% 97.3%")
        root.style.setProperty("--secondary", "210 40% 94%")
        root.style.setProperty("--secondary-foreground", "222.2 84% 4.9%")
        root.style.setProperty("--muted", "210 40% 94%")
        root.style.setProperty("--muted-foreground", "215.4 16.3% 46.9%")
        root.style.setProperty("--accent", "210 40% 94%")
        root.style.setProperty("--accent-foreground", "222.2 84% 4.9%")
        root.style.setProperty("--destructive", "0 84.2% 60.2%")
        root.style.setProperty("--destructive-foreground", "210 40% 98%")
        root.style.setProperty("--border", "214.3 31.8% 91.4%")
        root.style.setProperty("--input", "214.3 31.8% 91.4%")
        root.style.setProperty("--ring", "142.1 76.2% 36.3%")
      }
    
      setResolvedTheme(finalTheme)
    
      // Add transition class
      root.classList.add("theme-transition")
      body.classList.add("theme-transition")
    
      setTimeout(() => {
        root.classList.remove("theme-transition")
        body.classList.remove("theme-transition")
      }, 300)
    } catch (error) {
      console.error('ThemeProvider: Error applying theme:', error)
    }
  }

  useEffect(() => {
    applyTheme(theme)
  }, [theme])

  useEffect(() => {
    if (theme !== "system") return

    const mediaQuery = window.matchMedia("(prefers-color-scheme: dark)")
    
    const handleChange = () => {
      applyTheme("system")
    }

    mediaQuery.addEventListener("change", handleChange)
    return () => mediaQuery.removeEventListener("change", handleChange)
  }, [theme])

  const value = {
    theme,
    setTheme: (newTheme: Theme) => {
      localStorage.setItem(storageKey, newTheme)
      setThemeState(newTheme)
    },
    resolvedTheme,
  }

  return (
    <ThemeProviderContext.Provider {...props} value={value}>
      {children}
    </ThemeProviderContext.Provider>
  )
}

export function useTheme() {
  const context = useContext(ThemeProviderContext)

  if (context === undefined)
    throw new Error("useTheme must be used within a ThemeProvider")

  return context
} 