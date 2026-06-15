"use client";

import gsap from "gsap";
import { ScrollToPlugin } from "gsap/ScrollToPlugin";
import { ScrollTrigger } from "gsap/ScrollTrigger";
import { useEffect } from "react";

gsap.registerPlugin(ScrollTrigger, ScrollToPlugin);

export function LandingAnimations() {
  useEffect(() => {
    const ctx = gsap.context(() => {
      gsap.from(".hero-copy > *", {
        y: 22,
        opacity: 0,
        duration: 0.8,
        ease: "power3.out",
        stagger: 0.1
      });

      gsap.utils.toArray<HTMLElement>(".gsap-reveal").forEach((section) => {
        gsap.from(section, {
          y: 36,
          opacity: 0,
          duration: 0.75,
          ease: "power3.out",
          scrollTrigger: {
            trigger: section,
            start: "top 82%"
          }
        });
      });

      gsap.utils.toArray<HTMLElement>(".gsap-card").forEach((card) => {
        gsap.from(card, {
          y: 24,
          opacity: 0,
          duration: 0.62,
          ease: "power2.out",
          scrollTrigger: {
            trigger: card,
            start: "top 88%"
          }
        });
      });
    });

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
      gsap.to(window, {
        duration: 0.85,
        ease: "power3.inOut",
        scrollTo: { y: target, offsetY: 72 }
      });
    }

    document.addEventListener("click", handleAnchorClick);

    return () => {
      document.removeEventListener("click", handleAnchorClick);
      ctx.revert();
      ScrollTrigger.getAll().forEach((trigger) => trigger.kill());
    };
  }, []);

  return null;
}
