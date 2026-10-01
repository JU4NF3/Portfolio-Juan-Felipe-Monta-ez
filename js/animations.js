/* GSAP ScrollTrigger + SplitText animations, one per section.
   Every animated element starts fully visible in plain CSS — gsap.from()
   is what applies the opacity:0 starting state, only inside the "noReduce"
   branch below. So if GSAP fails to load from the CDN (offline, blocked,
   etc.) or the visitor prefers reduced motion, the page stays fully
   readable with no animation wiring at all. */

window.PortfolioAnimations = (function () {
  var hasGsap = typeof gsap !== "undefined";
  var heroIntroTimeline = null;

  if (hasGsap) {
    gsap.registerPlugin(ScrollTrigger, SplitText);
  }

  function buildHeroIntro() {
    var heroTitle = document.querySelector("[data-split-hero]");
    var heroRest = document.querySelectorAll("[data-hero-fade]");

    var tl = gsap.timeline({ paused: true });

    if (heroTitle) {
      // Word-level split (not chars): char-by-char splitting breaks up the
      // shape of words and reads as "broken" text on desktop. Animating
      // whole words in stays clean and still reveals nicely.
      var split = new SplitText(heroTitle, { type: "words" });
      tl.from(split.words, {
        opacity: 0,
        y: 24,
        duration: 0.6,
        stagger: 0.05,
        ease: "power3.out",
      });
    }

    if (heroRest.length) {
      tl.from(
        heroRest,
        { opacity: 0, y: 16, duration: 0.5, stagger: 0.1, ease: "power2.out" },
        heroTitle ? "-=0.3" : 0
      );
    }

    return tl;
  }

  function buildScrollReveals() {
    // About: word-by-word reveal scrubbed to scroll position.
    var aboutText = document.querySelector("[data-split-about]");
    if (aboutText) {
      var splitWords = new SplitText(aboutText, { type: "words" });
      gsap.set(splitWords.words, { opacity: 0.25 });
      gsap.to(splitWords.words, {
        opacity: 1,
        stagger: 0.05,
        ease: "none",
        scrollTrigger: {
          trigger: aboutText,
          start: "top 80%",
          end: "bottom 40%",
          scrub: true,
        },
      });
    }

    // Generic stagger-in for any section marked with [data-reveal-group]:
    // each direct child animates in once, on first entry.
    document.querySelectorAll("[data-reveal-group]").forEach(function (group) {
      var items = group.children;
      gsap.from(items, {
        opacity: 0,
        y: 24,
        duration: 0.6,
        stagger: 0.12,
        ease: "power2.out",
        scrollTrigger: {
          trigger: group,
          start: "top 85%",
          toggleActions: "play none none none",
        },
      });
    });

    // Services: icons spin while the list scrolls through the viewport.
    // Alternating direction and slightly different speeds per row.
    var serviceIcons = document.querySelectorAll("[data-service-icon]");
    if (serviceIcons.length) {
      serviceIcons.forEach(function (icon, index) {
        var turns = 1 + (index % 3) * 0.5;
        gsap.to(icon, {
          rotation: (index % 2 ? -360 : 360) * turns,
          ease: "none",
          scrollTrigger: {
            trigger: "[data-services-grid]",
            start: "top bottom",
            end: "bottom top",
            scrub: true,
          },
        });
      });
    }

    // Works: clip-path wipe + image settle, driven by CSS transitions.
    // Adding .works-list--reveal arms the hidden state (so without JS the
    // media stay visible); each media then gets .is-in-view once on entry.
    var worksList = document.querySelector("[data-works-grid]");
    if (worksList) {
      worksList.classList.add("works-list--reveal");
      worksList.querySelectorAll(".work-media").forEach(function (media) {
        ScrollTrigger.create({
          trigger: media,
          start: "top 85%",
          once: true,
          onEnter: function () {
            media.classList.add("is-in-view");
          },
        });
      });
    }

    // CTA-to-works: simple fade + scale on entry.
    var worksCta = document.querySelector("[data-reveal-cta]");
    if (worksCta) {
      gsap.from(worksCta, {
        opacity: 0,
        scale: 0.96,
        duration: 0.6,
        ease: "power2.out",
        scrollTrigger: {
          trigger: worksCta,
          start: "top 85%",
          toggleActions: "play none none none",
        },
      });
    }
  }

  if (hasGsap) {
    gsap.matchMedia().add(
      {
        reduce: "(prefers-reduced-motion: reduce)",
        noReduce: "(prefers-reduced-motion: no-preference)",
      },
      function (context) {
        if (context.conditions.reduce) {
          // Everything is already visible via CSS defaults; nothing to wire up.
          heroIntroTimeline = null;
          return;
        }
        heroIntroTimeline = buildHeroIntro();

        // buildScrollReveals() reads the rendered cards (services, works,
        // testimonials, partners), which main.js fills in from #info-data.
        // That happens synchronously today, but wait on the ready
        // flag/event anyway so this stays correct if main.js's data source
        // ever goes back to something async (a fetched info.json, etc.).
        if (window.PortfolioContentReady) {
          buildScrollReveals();
        } else {
          window.addEventListener("portfolio:content-ready", buildScrollReveals, { once: true });
        }

        // If the visitor switches to reduced motion mid-session, drop the
        // armed state so the works media aren't left hidden.
        return function () {
          window.removeEventListener("portfolio:content-ready", buildScrollReveals);
          var worksList = document.querySelector("[data-works-grid]");
          if (worksList) worksList.classList.remove("works-list--reveal");
        };
      }
    );
  }

  function playHeroIntro() {
    if (heroIntroTimeline) {
      heroIntroTimeline.play();
    }
  }

  return { playHeroIntro: playHeroIntro };
})();
