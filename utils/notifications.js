import { Toast } from "../components/toast.js";

export function createNotificationService(toastElement, messageElement) {
  const toast = new Toast(toastElement, messageElement);
  return {
    info(message) {
      toast.show(message);
    },
    success(message) {
      toast.show(message);
    },
    warning(message) {
      toast.show(message);
    }
  };
}
