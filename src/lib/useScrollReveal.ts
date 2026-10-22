import { useEffect, useRef } from "react";

export function useScrollReveal<T extends HTMLElement>(pageKey: string) {
  const ref = useRef<T>(null);
  useEffect(() => {
    const root = ref.current;
    if (!root || window.matchMedia("(prefers-reduced-motion: reduce)").matches)
      return;
    const observer = new IntersectionObserver(
      (entries) => {
        for (const entry of entries) {
          if (entry.isIntersecting) {
            (entry.target as HTMLElement).dataset.reveal = "visible";
            observer.unobserve(entry.target);
          }
        }
      },
      { threshold: 0.06 },
    );
    const elements = root.querySelectorAll<HTMLElement>(
      ".lp-section, .mode-card, .lobby-section, .wallet-card, .rank-panel, .team-panel, .panel-page",
    );
    for (const element of elements) {
      if (element.getBoundingClientRect().top < window.innerHeight) continue;
      element.dataset.reveal = "pending";
      observer.observe(element);
    }
    return () => {
      observer.disconnect();
      for (const element of elements) delete element.dataset.reveal;
    };
  }, [pageKey]);
  return ref;
}
