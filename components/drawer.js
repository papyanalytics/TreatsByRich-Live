export class Drawer {
  constructor(panel, backdrop) {
    this.panel = panel;
    this.backdrop = backdrop;
  }

  open() {
    this.panel?.classList.add("open");
    this.backdrop?.classList.add("open");
    this.panel?.setAttribute("aria-hidden", "false");
  }

  close() {
    this.panel?.classList.remove("open");
    this.backdrop?.classList.remove("open");
    this.panel?.setAttribute("aria-hidden", "true");
  }
}
