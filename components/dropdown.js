export function initDropdown(wrapper, toggle, expandedClass = "open") {
  if (!wrapper || !toggle) {
    return {
      close() {}
    };
  }

  const close = () => {
    wrapper.classList.remove(expandedClass);
    toggle.setAttribute("aria-expanded", "false");
  };

  const open = () => {
    wrapper.classList.add(expandedClass);
    toggle.setAttribute("aria-expanded", "true");
  };

  toggle.addEventListener("click", (event) => {
    event.stopPropagation();
    if (wrapper.classList.contains(expandedClass)) {
      close();
    } else {
      open();
    }
  });

  return { close, open };
}
