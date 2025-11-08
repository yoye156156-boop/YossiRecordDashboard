import { useEffect } from "react";

export default function Toast({ message, onClose, duration = 3000 }) {
  useEffect(() => {
    const timer = setTimeout(() => {
      onClose?.();
    }, duration);
    return () => clearTimeout(timer);
  }, [duration, onClose]);

  if (!message) return null;

  return (
    <div className="fixed bottom-6 right-6 bg-green-600 text-white px-4 py-2 rounded-xl shadow-lg text-sm animate-fade-in-up">
      {message}
    </div>
  );
}
