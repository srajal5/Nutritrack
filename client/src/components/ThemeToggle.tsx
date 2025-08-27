import { Moon, Sun } from "lucide-react"
import { useTheme } from "@/components/ThemeProvider"
import { motion, AnimatePresence } from "framer-motion"

export function ThemeToggle() {
  const { theme, setTheme } = useTheme()

  const toggleTheme = () => {
    try {
      console.log('ThemeToggle: Current theme:', theme)
      const newTheme = theme === "light" ? "dark" : "light"
      console.log('ThemeToggle: Setting theme to:', newTheme)
      setTheme(newTheme)
      console.log('ThemeToggle: Theme set successfully')
    } catch (error) {
      console.error('ThemeToggle: Error toggling theme:', error)
    }
  }

  return (
    <button
      onClick={toggleTheme}
      className="btn btn-ghost btn-circle relative h-10 w-10 rounded-full bg-base-200/50 hover:bg-base-300/80 border border-base-300/50 hover:border-primary/50 transition-all duration-300 group overflow-hidden"
    >
      <motion.div
        className="absolute inset-0 bg-gradient-to-br from-primary/20 to-primary/10 opacity-0 group-hover:opacity-100 transition-opacity duration-300"
        initial={false}
        animate={{ scale: 1 }}
        whileHover={{ scale: 1.1 }}
        whileTap={{ scale: 0.95 }}
      />
      
      <AnimatePresence mode="wait" initial={false}>
        {theme === "light" ? (
          <motion.div
            key="sun"
            initial={{ rotate: -90, scale: 0, opacity: 0 }}
            animate={{ rotate: 0, scale: 1, opacity: 1 }}
            exit={{ rotate: 90, scale: 0, opacity: 0 }}
            transition={{ duration: 0.3, ease: "easeInOut" }}
            className="relative z-10"
          >
            <Sun className="h-5 w-5 text-amber-500 group-hover:text-amber-400 transition-colors duration-300" />
          </motion.div>
        ) : (
          <motion.div
            key="moon"
            initial={{ rotate: 90, scale: 0, opacity: 0 }}
            animate={{ rotate: 0, scale: 1, opacity: 1 }}
            exit={{ rotate: -90, scale: 0, opacity: 0 }}
            transition={{ duration: 0.3, ease: "easeInOut" }}
            className="relative z-10"
          >
            <Moon className="h-5 w-5 text-blue-400 group-hover:text-blue-300 transition-colors duration-300" />
          </motion.div>
        )}
      </AnimatePresence>

      {/* Ripple effect */}
      <motion.div
        className="absolute inset-0 rounded-full bg-primary/20"
        initial={{ scale: 0, opacity: 0 }}
        whileTap={{ scale: 2, opacity: 0 }}
        transition={{ duration: 0.4 }}
      />

      <span className="sr-only">Toggle theme</span>
    </button>
  )
} 