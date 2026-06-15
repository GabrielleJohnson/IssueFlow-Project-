"use client";

import gsap from "gsap";
import { ScrollToPlugin } from "gsap/ScrollToPlugin";
import { ScrollTrigger } from "gsap/ScrollTrigger";
import { useEffect } from "react";

gsap.registerPlugin(ScrollTrigger, ScrollToPlugin);

const FORM_SELECTOR = "input, textarea, select, button, [contenteditable='true']";

export function LandingAnimations() {
  useEffect(() => {
    const reduceMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;

    if (reduceMotion) {
      return;
    }

    let targetScroll = window.scrollY;
    let scrollTween: gsap.core.Tween | null = null;

    const ctx = gsap.context(() => {
      gsap.from(".hero-copy > *", {
        y: 30,
        opacity: 0,
        duration: 1,
        ease: "power3.out",
        stagger: 0.12
      });

      gsap.utils.toArray<HTMLElement>(".gsap-reveal").forEach((section) => {
        gsap.from(section, {
          y: 52,
          opacity: 0,
          duration: 0.95,
          ease: "power3.out",
          scrollTrigger: {
            trigger: section,
            start: "top 84%"
          }
        });
      });

      gsap.utils.toArray<HTMLElement>(".gsap-card").forEach((card) => {
        gsap.from(card, {
          y: 34,
          opacity: 0,
          duration: 0.78,
          ease: "power2.out",
          scrollTrigger: {
            trigger: card,
            start: "top 90%"
          }
        });
      });
    });

    function maxScroll() {
      return document.documentElement.scrollHeight - window.innerHeight;
    }

    function scrollToPosition(y: number, duration = 0.95) {
      targetScroll = Math.max(0, Math.min(y, maxScroll()));
      scrollTween?.kill();
      scrollTween = gsap.to(window, {
        duration,
        ease: "power3.out",
        scrollTo: { y: targetScroll, autoKill: true },
        overwrite: "auto",
        onUpdate: () => ScrollTrigger.update()
      });
    }

    function handleWheel(event: WheelEvent) {
      const target = event.target as HTMLElement | null;

      if (target?.closest(FORM_SELECTOR) || event.ctrlKey) {
        return;
      }

      event.preventDefault();
      const delta = Math.sign(event.deltaY) * Math.min(Math.abs(event.deltaY), 120);
      scrollToPosition(targetScroll + delta * 2.2, 0.82);
    }

    function handleAnchorClick(event: MouseEvent) {
      const link = (event.target as HTMLElement).closest<HTMLAnchorElement>('a[href^="#"]');
      const hash = link?.getAttribute("href");

      if (!hash || hash === "#") {
        return;
      }

      const target = document.querySelector(hash);

      if (!target) {
        return;
      }

      event.preventDefault();
      scrollToPosition((target as HTMLElement).offsetTop - 72, 1.25);
    }

    function syncTargetScroll() {
      targetScroll = window.scrollY;
    }

    window.addEventListener("wheel", handleWheel, { passive: false });
    window.addEventListener("scroll", syncTargetScroll, { passive: true });
    document.addEventListener("click", handleAnchorClick);

    return () => {
      window.removeEventListener("wheel", handleWheel);
      window.removeEventListener("scroll", syncTargetScroll);
      document.removeEventListener("click", handleAnchorClick);
      scrollTween?.kill();
      ctx.revert();
      ScrollTrigger.getAll().forEach((trigger) => trigger.kill());
    };
  }, []);

  return null;
}
