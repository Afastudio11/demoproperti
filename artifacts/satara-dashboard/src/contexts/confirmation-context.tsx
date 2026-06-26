import React, { createContext, useContext, useState, useRef } from "react";
import {
  AlertDialog,
  AlertDialogContent,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogCancel,
  AlertDialogAction,
} from "@/components/ui/alert-dialog";

interface ConfirmOptions {
  title: string;
  description: string;
  confirmText?: string;
  cancelText?: string;
  variant?: "default" | "destructive";
}

type ConfirmContextType = (options: ConfirmOptions) => Promise<boolean>;

const ConfirmationContext = createContext<ConfirmContextType | null>(null);

export function ConfirmationProvider({ children }: { children: React.ReactNode }) {
  const [state, setState] = useState<{
    isOpen: boolean;
    title: string;
    description: string;
    confirmText?: string;
    cancelText?: string;
    variant?: "default" | "destructive";
  }>({
    isOpen: false,
    title: "",
    description: "",
  });

  const resolverRef = useRef<((value: boolean) => void) | null>(null);

  const confirm = (options: ConfirmOptions): Promise<boolean> => {
    setState({
      isOpen: true,
      title: options.title,
      description: options.description,
      confirmText: options.confirmText || "Hapus",
      cancelText: options.cancelText || "Batal",
      variant: options.variant || "default",
    });

    return new Promise<boolean>((resolve) => {
      resolverRef.current = resolve;
    });
  };

  const handleCancel = () => {
    setState((prev) => ({ ...prev, isOpen: false }));
    if (resolverRef.current) {
      resolverRef.current(false);
      resolverRef.current = null;
    }
  };

  const handleConfirm = () => {
    setState((prev) => ({ ...prev, isOpen: false }));
    if (resolverRef.current) {
      resolverRef.current(true);
      resolverRef.current = null;
    }
  };

  return (
    <ConfirmationContext.Provider value={confirm}>
      {children}
      <AlertDialog open={state.isOpen} onOpenChange={(open) => {
        if (!open) handleCancel();
      }}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>{state.title}</AlertDialogTitle>
            <AlertDialogDescription>{state.description}</AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel onClick={handleCancel}>
              {state.cancelText}
            </AlertDialogCancel>
            <AlertDialogAction
              onClick={handleConfirm}
              className={state.variant === "destructive" ? "bg-red-600 hover:bg-red-700 text-white" : ""}
            >
              {state.confirmText}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </ConfirmationContext.Provider>
  );
}

export function useConfirm() {
  const context = useContext(ConfirmationContext);
  if (!context) {
    throw new Error("useConfirm must be used within a ConfirmationProvider");
  }
  return context;
}
