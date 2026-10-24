"use client";
import { useEffect, useRef } from "react";
import styles from "./service.module.css";
export default function Reveal({ children }: { children: React.ReactNode }) {
  const ref = useRef<HTMLDivElement>(null);
  useEffect(() => {
    const node = ref.current;
    if (!node || window.matchMedia("(prefers-reduced-motion: reduce)").matches || !("IntersectionObserver" in window)) return;
    if (node.getBoundingClientRect().top < window.innerHeight) return;
    node.dataset.reveal = "pending";
    const observer = new IntersectionObserver(([entry]) => {
      if (entry.isIntersecting) { node.dataset.reveal = "visible"; observer.disconnect(); }
    }, { threshold: 0.08 });
    observer.observe(node);
    return () => { observer.disconnect(); delete node.dataset.reveal; };
  }, []);
  return <div ref={ref} className={styles.reveal}>{children}</div>;
}
