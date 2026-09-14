let scrollLockCount = 0;

const isModalContent = (el) => {
  return el && (el.closest(".store-info-modal") || el.closest(".sort-modal-sheet") ||
         el.closest(".cart-drawer") || el.closest(".quickbuy-modal") ||
         el.closest(".product-modal-card") || el.closest(".product-modal-container"));
};

const preventScroll = (e) => {
  if (!isModalContent(e.target)) {
    e.preventDefault();
  }
};

export function lockBodyScroll() {
  if (scrollLockCount === 0) {
    document.body.style.overflow = "hidden";
    document.documentElement.style.overflow = "hidden";
    document.addEventListener("wheel", preventScroll, { passive: false });
    document.addEventListener("touchmove", preventScroll, { passive: false });
  }
  scrollLockCount++;
  return () => {
    scrollLockCount--;
    if (scrollLockCount === 0) {
      document.body.style.overflow = "";
      document.documentElement.style.overflow = "";
      document.removeEventListener("wheel", preventScroll);
      document.removeEventListener("touchmove", preventScroll);
    }
  };
}
