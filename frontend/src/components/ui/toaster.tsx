import { useToast } from "@/components/ui/use-toast"
import { X } from "lucide-react"

export function Toaster() {
  const { toasts, dismiss } = useToast()

  return (
    <div className="fixed top-4 right-4 z-[100] flex max-h-screen w-full flex-col gap-2 md:max-w-[380px]">
      {toasts.map(function ({ id, title, description, variant, action, ...props }) {
        return (
          <div
            key={id}
            className={`
              grid grid-cols-[1fr_auto] items-start gap-4 rounded-2xl border p-5 shadow-xl transition-all duration-300
              animate-in slide-in-from-right-full
              ${variant === 'destructive' 
                ? 'bg-white border-rose-100 text-rose-900 shadow-rose-500/5' 
                : 'bg-white border-slate-100 text-slate-900 shadow-slate-500/5'}
            `}
            {...props}
          >
            <div className="grid gap-1.5 px-1">
              {title && <h3 className="text-sm font-black leading-none">{title}</h3>}
              {description && (
                <div className="text-[13px] font-medium opacity-70 leading-relaxed pr-2">
                  {description}
                </div>
              )}
            </div>
            <div className="flex flex-col gap-2">
              {action}
              <button 
                onClick={() => dismiss(id)}
                className="p-1 rounded-lg hover:bg-slate-100 transition-colors text-slate-400 hover:text-slate-600"
              >
                <X className="h-4 w-4" />
              </button>
            </div>
          </div>
        )
      })}
    </div>
  )
}
