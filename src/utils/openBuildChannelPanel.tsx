import { PopupModal } from "../components/Modal.ts";
import BuildChannelPanel from "../components/ReactComponents/BuildChannelPanel.tsx";
import { createReactModalContent } from "./reactModalContent.tsx";

export function OpenBuildChannelPanel({ onBack, targetDocument = PopupModal.ownerDocument }: { onBack?: () => void; targetDocument?: Document } = {}) {
  const backButton = targetDocument.createElement("button");
  backButton.className = "ll-sp-btn ll-modal-header-back-btn";
  backButton.type = "button";
  backButton.textContent = "← Back";
  backButton.onclick = onBack ?? (() => {
    void import("./settings.ts").then(({ openSettingsPanel }) => openSettingsPanel(targetDocument));
  });

  const options = {
    title: "Build Channel",
    ...createReactModalContent(<BuildChannelPanel />, targetDocument),
    modalId: "buildChannelPanel",
    isLarge: true,
    headerLeft: backButton,
  };

  if (PopupModal.isConnected) {
    PopupModal.transition(options);
  } else {
    PopupModal.display({ ...options, targetDocument });
  }
}

/** Keep Lyssna's channel controls available with older installed launchers too. */
export function OpenBuildChannelManager() {
  OpenBuildChannelPanel();
}
