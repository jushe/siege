"use client";

import { createContext, useContext, useState, ReactNode, useCallback } from "react";

interface GlobalLoadingContextType {
  loading: boolean;
  message: string;
  startLoading: (message: string) => void;
  stopLoading: (toast?: string) => void;
  toast: string;
}

const GlobalLoadingContext = createContext<GlobalLoadingContextType>({
  loading: false,
  message: "",
  startLoading: () => {},
  stopLoading: () => {},
  toast: "",
});

export function useGlobalLoading() {
  return useContext(GlobalLoadingContext);
}

export function GlobalLoadingProvider({ children }: { children: ReactNode }) {
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState("");
  const [toast, setToast] = useState("");

  const startLoading = useCallback((msg: string) => {
    setLoading(true);
    setMessage(msg);
    setToast("");
  }, []);

  const stopLoading = useCallback((toastMsg?: string) => {
    setLoading(false);
    setMessage("");
    if (toastMsg) {
      setToast(toastMsg);
      setTimeout(() => setToast(""), 4000);
    }
  }, []);

  return (
    <GlobalLoadingContext.Provider value={{ loading, message, startLoading, stopLoading, toast }}>
      {children}

      {/* Overlay that blocks interaction */}
      {loading && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/20 backdrop-blur-[1px]">
          <div className="bg-white rounded-xl shadow-lg px-8 py-6 flex flex-col items-center gap-3 max-w-sm">
            <svg className="animate-spin h-8 w-8 text-blue-600" viewBox="0 0 24 24">
              <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none" />
              <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
            </svg>
            <p className="text-sm font-medium text-gray-700 text-center">{message}</p>
            <p className="text-xs text-gray-400">
              {message.includes("审查") || message.includes("Review")
                ? "约 1-2 分钟"
                : "约 1-2 分钟"}
            </p>
          </div>
        </div>
      )}

      {/* Toast notification */}
      {toast && (
        <div className="fixed bottom-6 right-6 z-50 animate-in slide-in-from-bottom-5">
          <div className="bg-green-600 text-white px-5 py-3 rounded-lg shadow-lg text-sm font-medium">
            ✓ {toast}
          </div>
        </div>
      )}
    </GlobalLoadingContext.Provider>
  );
}
