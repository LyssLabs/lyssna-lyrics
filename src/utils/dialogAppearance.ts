import { PopupModal } from "../components/Modal.ts";
import { $liquidGlassDialogs } from "./stores.ts";

let initialized = false;
export function initDialogAppearance(): void {
  if (initialized) return;
  initialized = true;
  // The modal keeps this class when moved into Cinema or a popout document.
  $liquidGlassDialogs.subscribe(enabled => PopupModal.classList.toggle("LyssnaLiquidGlass", enabled));
}
