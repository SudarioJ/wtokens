import { useEffect, useRef, type ReactNode } from "react";
import { X } from "lucide-react";

export function Dialog({
  title,
  children,
  onClose,
}: {
  title: string;
  children: ReactNode;
  onClose: () => void;
}) {
  const ref = useRef<HTMLDialogElement>(null);
  useEffect(() => {
    const element = ref.current;
    element?.showModal();
    return () => element?.close();
  }, []);
  return (
    <dialog
      ref={ref}
      className="dialog"
      aria-labelledby="dialog-title"
      onCancel={(event) => {
        event.preventDefault();
        onClose();
      }}
    >
      <div className="dialog-heading">
        <div>
          <span className="eyebrow">WTOKENS / ARENA</span>
          <h2 id="dialog-title">{title}</h2>
        </div>
        <button
          className="icon-button"
          onClick={onClose}
          aria-label="Cerrar ventana"
        >
          <X size={21} />
        </button>
      </div>
      {children}
    </dialog>
  );
}
