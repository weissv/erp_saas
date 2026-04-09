import clsx from "clsx";
import { Modal } from "./Modal";

type AlertActionTone = "primary" | "secondary" | "destructive";

interface AlertAction {
  label: string;
  onClick: () => void;
  disabled?: boolean;
}

interface MacosAlertDialogProps {
  isOpen: boolean;
  title: string;
  description: string;
  onClose: () => void;
  primaryAction: AlertAction;
  cancelAction: AlertAction;
  destructiveAction?: AlertAction;
  closeOnBackdrop?: boolean;
  closeOnEscape?: boolean;
}

function AlertActionButton({
  action,
  tone,
}: {
  action: AlertAction;
  tone: AlertActionTone;
}) {
  return (
    <button
      type="button"
      onClick={action.onClick}
      disabled={action.disabled}
      className={clsx(
        "mezon-alert-dialog__action",
        tone === "primary" && "mezon-alert-dialog__action--primary",
        tone === "secondary" && "mezon-alert-dialog__action--secondary",
        tone === "destructive" && "mezon-alert-dialog__action--destructive"
      )}
    >
      {action.label}
    </button>
  );
}

export function MacosAlertDialog({
  isOpen,
  title,
  description,
  onClose,
  primaryAction,
  cancelAction,
  destructiveAction,
  closeOnBackdrop = true,
  closeOnEscape = true,
}: MacosAlertDialogProps) {
  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title={title}
      description={description}
      size="sm"
      eyebrow=""
      hideCloseButton
      closeOnBackdrop={closeOnBackdrop}
      closeOnEscape={closeOnEscape}
      frameClassName="mezon-alert-dialog-frame"
      overlayClassName="mezon-alert-dialog-overlay"
      surfaceClassName="mezon-alert-dialog"
      bodyClassName="mezon-alert-dialog__body"
      contentClassName="mezon-alert-dialog__content"
    >
      <div className="mezon-alert-dialog__actions">
        <AlertActionButton action={primaryAction} tone="primary" />
        {destructiveAction ? (
          <AlertActionButton action={destructiveAction} tone="destructive" />
        ) : null}
        <AlertActionButton action={cancelAction} tone="secondary" />
      </div>
    </Modal>
  );
}