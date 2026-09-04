export class Toast {
  constructor(container, messageNode, duration = 3000) {
    this.container = container;
    this.messageNode = messageNode;
    this.duration = duration;
    this.timer = null;
  }

  show(message) {
    if (!this.container || !this.messageNode) return;
    this.messageNode.textContent = message;
    this.container.classList.add("is-visible");
    window.clearTimeout(this.timer);
    this.timer = window.setTimeout(() => {
      this.container.classList.remove("is-visible");
    }, this.duration);
  }
}
