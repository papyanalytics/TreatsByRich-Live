export class Modal {
  constructor(element) {
    this.element = element;
  }

  open() {
    this.element?.classList.add("open");
    this.element?.setAttribute("aria-hidden", "false");
  }

  close() {
    this.element?.classList.remove("open");
    this.element?.setAttribute("aria-hidden", "true");
  }
}
