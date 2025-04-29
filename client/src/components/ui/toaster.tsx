import { useToast } from "@/hooks/use-toast"
import {
  Toast,
  ToastClose,
  ToastDescription,
  ToastProvider,
  ToastTitle,
  ToastViewport,
} from "@/components/ui/toast"

export function Toaster() {
  const { toasts } = useToast()

  // ใช้ Object.fromEntries และ Map เพื่อกำจัด toast ที่ซ้ำกัน (ใช้ title+description เป็น key)
  const uniqueToasts = Object.values(
    Object.fromEntries(
      toasts.map(toast => {
        // สร้าง key จาก title และ description
        const key = `${toast.title || ''}:${toast.description || ''}`;
        // Filter out any non-standard props that might cause issues with the Toast component
        const { id, title, description, action, ...safeProps } = toast;
        // Return a safe toast object with only the expected props
        return [key, { id, title, description, action, ...safeProps }];
      })
    )
  );
  
  return (
    <ToastProvider>
      {uniqueToasts.map(function ({ id, title, description, action, ...props }) {
        return (
          <Toast key={id} {...props}>
            <div className="grid gap-1">
              {title && <ToastTitle>{title}</ToastTitle>}
              {description && (
                <ToastDescription>{description}</ToastDescription>
              )}
            </div>
            {action}
            <ToastClose />
          </Toast>
        )
      })}
      <ToastViewport />
    </ToastProvider>
  )
}
