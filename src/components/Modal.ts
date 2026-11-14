type ModalDisplayOptions = {
	title: string;
	content: any;
	isLarge?: boolean;
	onClose?: (() => void) | null;
	closeBtn?: boolean;
	closeOnOutsideClick?: boolean;
	/** Replaces the default hide() behavior for the close button and outside-click. */
	closeHandler?: (() => void) | null;
	headerLeft?: Node | null;
	contentScrollTop?: number | null;
	/** Optional class appended to `.ll-modal` for per-modal styling/identification. */
	modalId?: string | null;
	targetDocument?: Document | null;
};

type ModalTransitionOptions = {
	title?: string;
	content: any;
	isLarge?: boolean;
	onClose?: (() => void) | null;
	closeHandler?: (() => void) | null;
	headerLeft?: Node | null;
	contentScrollTop?: number | null;
	/** Optional class appended to `.ll-modal`. Replaces any previously set modalId class. */
	modalId?: string | null;
	/** Optional new header title. Omit to keep the current one. */
	title?: string | null;
};

class _HTMLGenericModal extends HTMLElement {
	private _onClose: (() => void) | null;
	private _currentModalId: string | null;
	private _closeKeyDocument: Document | null;
	private _closeKeyListener: ((event: KeyboardEvent) => void) | null;

	constructor() {
		super();
		this.classList.add("LyssnaLyricsModal");
		this._onClose = null;
		this._currentModalId = null;
		this._closeKeyDocument = null;
		this._closeKeyListener = null;
	}

	private _getWindow(): Window {
		return this.ownerDocument.defaultView ?? window;
	}

	private _clearCloseKeyListener(): void {
		if (this._closeKeyDocument && this._closeKeyListener) {
			this._closeKeyDocument.removeEventListener("keydown", this._closeKeyListener);
		}
		this._closeKeyDocument = null;
		this._closeKeyListener = null;
	}

	private _setCloseHandler(closeHandler: () => void): void {
		this._clearCloseKeyListener();
		this._closeKeyDocument = this.ownerDocument;
		this._closeKeyListener = (event: KeyboardEvent) => {
			if (event.key !== "Escape" || event.defaultPrevented) return;
			event.preventDefault();
			closeHandler();
		};
		this._closeKeyDocument.addEventListener("keydown", this._closeKeyListener);
	}

	private _applyModalId(modalId: string | null | undefined): void {
		const modalEl = this.querySelector(".ll-modal");
		if (this._currentModalId && modalEl) {
			modalEl.classList.remove(this._currentModalId);
		}
		const nextId = typeof modalId === "string" && modalId.length > 0 ? `llmodal-${modalId}` : null;
		if (nextId && modalEl) {
			modalEl.classList.add(nextId);
		}
		this._currentModalId = nextId;
	}

	hide(): void {
        const capturedOnClose = this._onClose;
		const targetWindow = this._getWindow();
        this._onClose = null;
        this._currentModalId = null;
		this._clearCloseKeyListener();
        const _removeFromDom = (timeoutDuration: number) => {
            targetWindow.setTimeout(() => {
                this?.remove();
                if (typeof capturedOnClose === "function") {
                    capturedOnClose();
                }
            }, timeoutDuration)
        };

        const genericModal = this?.querySelector(".ll-modal-overlay-animated");
        if (genericModal) {
            genericModal.classList.remove("Active");
            _removeFromDom((0.22 * 1000) + 30);
        } else {
            _removeFromDom(0);
        }
	}

	/**
	 * Instantly swap modal content without hiding/re-animating.
	 * Use for modal-to-modal transitions where the frame should stay visible.
	 */
	private _applyHeaderLeft(headerLeft: Node | null | undefined): void {
		const header = this.querySelector(".ll-modal-header");
		if (!header) return;

		header.querySelector(".ll-modal-header-left")?.remove();
		if (!headerLeft) return;

		const slot = this.ownerDocument.createElement("div");
		slot.className = "ll-modal-header-left";
		slot.append(headerLeft);
		header.prepend(slot);
	}

	private _restoreContentScroll(scrollTop: number): void {
		const targetWindow = this._getWindow();
		const scrollTargets = Array.from(this.querySelectorAll<HTMLElement>("main, .ll-modal-main-section, .ll-modal-container-large, .ll-modal-container, .ll-modal-content, .llm, .ll-sp-settings-scroll"));

		const applyScroll = () => {
			for (const target of scrollTargets) {
				target.scrollTop = scrollTop;
			}
		};

		applyScroll();
		targetWindow.requestAnimationFrame(applyScroll);
		targetWindow.setTimeout(applyScroll, 0);
		targetWindow.setTimeout(applyScroll, 50);
	}

	private _resetContentScroll(): void {
		for (const target of Array.from(this.querySelectorAll<HTMLElement>("main, .ll-modal-main-section, .ll-modal-container-large, .ll-modal-container, .ll-modal-content, .llm, .ll-sp-settings-scroll"))) {
			target.scrollTop = 0;
		}
	}

	transition({ title, content, isLarge, onClose = null, closeHandler = null, headerLeft = null, contentScrollTop = null, modalId = null }: ModalTransitionOptions): void {
		const previousOnClose = this._onClose;
		this._onClose = onClose;
		const hidePopup = closeHandler ?? this.hide.bind(this);
		const closeButton = this.querySelector(".ll-modal-close-btn");
		if (closeButton) {
			(closeButton as HTMLButtonElement).onclick = hidePopup;
		}
		this._setCloseHandler(hidePopup);
		if (title) {
			const modal = this.querySelector(".ll-modal");
			const modalTitle = this.querySelector(".ll-modal-title");
			if (modal) modal.setAttribute("aria-label", title);
			if (modalTitle) modalTitle.textContent = title;
		}
		if (typeof isLarge === "boolean") {
			const container = this.querySelector(".ll-modal-container, .ll-modal-container-large");
			if (container) {
				container.classList.toggle("ll-modal-container-large", isLarge);
				container.classList.toggle("ll-modal-container", !isLarge);
			}
		}
		this._applyHeaderLeft(headerLeft);
		this._applyModalId(modalId);
		const main = this.querySelector("main");
		if (main) {
			main.innerHTML = "";
			if (typeof content === "string") {
				main.innerHTML = content;
			} else if (content instanceof Node || (content && typeof content === "object" && "nodeType" in content)) {
				main.append(content);
			}
			this._restoreContentScroll(contentScrollTop ?? 0);
		}
		if (typeof previousOnClose === "function") {
			previousOnClose();
		}
	}

	/**
	 * Display the modal.
	 * @param {Object} options
	 * @param {string} options.title
	 * @param {any} options.content
	 * @param {boolean} [options.isLarge]
	 * @param {function} [options.onClose] - Optional callback to run when modal is closed
	 * @param {boolean} [options.closeBtn=true] - Show modal close button
	 * @param {boolean} [options.closeOnOutsideClick=true] - Allow closing modal by clicking outside
	 */
	display({ title, content, isLarge = false, onClose = null, closeBtn = true, closeOnOutsideClick = true, closeHandler = null, headerLeft = null, modalId = null, targetDocument = null }: ModalDisplayOptions): void {
		// If a previous onClose exists, call it before displaying a new popup
		this._clearCloseKeyListener();
		if (typeof this._onClose === "function") {
			this._onClose();
		}
		this._onClose = onClose;
		// Reset tracked modalId since innerHTML below replaces the previous `.ll-modal` element.
		this._currentModalId = null;
		this.innerHTML = `
<div class="ll-modal-overlay ll-modal-overlay-animated">
	<div class="ll-modal" tabindex="-1" role="dialog" aria-label="${title}" aria-modal="true">
		<div class="${isLarge ? "ll-modal-container-large" : "ll-modal-container"}">
			<div class="ll-modal-header">
				<h1 class="ll-modal-title" as="h1">${title}</h1>
				${closeBtn ? '<button aria-label="Close" class="ll-modal-close-btn"><svg width="16" height="16" viewBox="0 0 16 16" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" xmlns="http://www.w3.org/2000/svg" aria-hidden="true"><path d="m3 3 10 10M13 3 3 13"/></svg></button>' : ""}
			</div>
			<div class="ll-modal-main-section">
				<main class="ll-modal-content"></main>
			</div>
		</div>
	</div>
</div>`;

		const hidePopup = closeHandler ?? this.hide.bind(this);
		const closeButton = this.querySelector(".ll-modal-close-btn");
		if (closeButton) {
			(closeButton as HTMLButtonElement).onclick = hidePopup;
		}
		this._applyHeaderLeft(headerLeft);
		this._applyModalId(modalId);
		const main = this.querySelector("main");
		// Listen for click events on Overlay
		const overlay = this.querySelector(".ll-modal-overlay");
		if (overlay) {
			// Only a press that also started on the overlay closes the modal. A drag that
			// began inside (a slider) and ended outside clicks the overlay too.
			let pressedOverlay = false;
			overlay.addEventListener("pointerdown", (event: PointerEvent) => {
				pressedOverlay = event.target === event.currentTarget;
			});
			overlay.addEventListener("click", (event: MouseEvent) => {
				if (closeOnOutsideClick && pressedOverlay && event.target === event.currentTarget) hidePopup();
			});
		}

		if (main) {
			if (typeof content === "string") {
				main.innerHTML = content;
			} else if (content instanceof Node || (content && typeof content === "object" && "nodeType" in content)) {
				main.append(content);
			} else if (content !== null && content !== undefined) {
				main.append(String(content));
			}
			this._resetContentScroll();
		}
		(targetDocument ?? this.ownerDocument).body.append(this);
		this._setCloseHandler(hidePopup);

        this._getWindow().setTimeout(() => {
            const genericModal = this.querySelector(".ll-modal-overlay-animated");
            if (genericModal) genericModal.classList.add("Active");
        }, 50);
	}
}
customElements.define("lyssna-lyrics-modal", _HTMLGenericModal);
export const PopupModal = new _HTMLGenericModal();
