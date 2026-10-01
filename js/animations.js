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

    // base.css sets `scroll-behavior: smooth` on <html>. ScrollTrigger.refresh()
    // jumps the scroll position to measure every trigger; with smooth scroll
    // those jumps get animated and the measurements come out wrong (the
    // statement pin started at a negative offset after a resize). Turn it
    // off just for the duration of each refresh.
    var rootStyle = document.documentElement.style;
    ScrollTrigger.addEventListener("refreshInit", function () {
      rootStyle.scrollBehavior = "auto";
    });
    ScrollTrigger.addEventListener("refresh", function () {
      rootStyle.scrollBehavior = "";
    });
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

  // Testimonials: desktop = cards swing into a fan on a wide orbit, plus a
  // momentum "push" when the mouse sweeps over a card. Mobile = fade-up.
  // Own matchMedia so it can switch layouts on resize; reverted from the
  // reduced-motion cleanup below.
  var testimonialsMedia = null;

  function buildTestimonialFan() {
    var fan = document.querySelector("[data-testimonials-grid]");
    if (!fan) return;
    var orbits = fan.querySelectorAll(".testimonial-orbit");
    if (!orbits.length) return;

    var hasInertia = typeof InertiaPlugin !== "undefined";
    if (hasInertia) gsap.registerPlugin(InertiaPlugin);

    testimonialsMedia = gsap.matchMedia();

    var cards = fan.querySelectorAll(".testimonial-card");

    testimonialsMedia.add({
      isDesktop: "(min-width: 992px)",
      isMobile: "(max-width: 991px)",
    }, function (context) {
      // Start each breakpoint from a clean slate. Relying on matchMedia's
      // revert wasn't enough: crossing from desktop to mobile, the mobile
      // fade-up captured the fan's leftover x/rotation as its end state and
      // left cards shifted off-screen (horizontal scroll on mobile).
      gsap.killTweensOf(orbits);
      gsap.killTweensOf(cards);
      gsap.set(orbits, { clearProps: "transform,opacity" });
      gsap.set(cards, { clearProps: "transform" });

      if (context.conditions.isMobile) {
        orbits.forEach(function (orbit) {
          gsap.from(orbit, {
            y: 60,
            opacity: 0,
            scale: 0.96,
            duration: 0.9,
            ease: "power3.out",
            scrollTrigger: {
              trigger: orbit,
              start: "top 88%",
              toggleActions: "play none none none",
            },
          });
        });
        return;
      }

      fan.classList.add("testimonial-fan--orbit");

      // Resting fan: middle card straight, the others spread out, tilted
      // and dropped a little more the further they are from the middle.
      var middle = (orbits.length - 1) / 2;
      orbits.forEach(function (orbit, index) {
        var offset = index - middle;
        gsap.set(orbit, { x: 300 * offset, y: 45 * offset * offset, rotation: 5 * offset });
      });

      // Entry: every orbit starts rotated 40deg (card off-screen right)
      // and springs back into the fan.
      var swingIn = gsap.from(orbits, {
        rotation: 40,
        duration: 1.5,
        stagger: 0.07,
        ease: "elastic.out(1, 0.75)",
        scrollTrigger: {
          trigger: fan,
          start: "top 70%",
          toggleActions: "play none none none",
        },
      });

      // Reset once the section is fully below the viewport again, so the
      // entry replays next time it's scrolled into view.
      ScrollTrigger.create({
        trigger: fan,
        start: "top bottom",
        onLeaveBack: function () {
          swingIn.pause(0);
        },
      });

      var canHover = window.matchMedia("(hover: hover) and (pointer: fine)").matches;
      if (!hasInertia || !canHover) return function () {
        fan.classList.remove("testimonial-fan--orbit");
      };

      // Track mouse velocity (px per frame) over the fan.
      var lastX = 0;
      var lastY = 0;
      var velocityX = 0;
      var velocityY = 0;
      var frame = null;
      var clampMove = gsap.utils.clamp(-320, 320);
      var clampSpin = gsap.utils.clamp(-55, 55);

      function trackPointer(event) {
        if (frame) return;
        frame = requestAnimationFrame(function () {
          velocityX = event.clientX - lastX;
          velocityY = event.clientY - lastY;
          lastX = event.clientX;
          lastY = event.clientY;
          frame = null;
        });
      }

      // On enter, push the card with the mouse's momentum. The spin comes
      // from torque: where the card was hit (offset from its center)
      // crossed with the direction the mouse was moving.
      function pushCard(event) {
        var card = event.currentTarget;
        var box = card.getBoundingClientRect();
        var offsetX = event.clientX - (box.left + box.width / 2);
        var offsetY = event.clientY - (box.top + box.height / 2);
        var lever = Math.hypot(offsetX, offsetY) || 1;
        var torque = (offsetX * velocityY - offsetY * velocityX) / lever;

        gsap.to(card, {
          inertia: {
            x: { velocity: clampMove(velocityX * 55), end: 0 },
            y: { velocity: clampMove(velocityY * 55), end: 0 },
            rotation: { velocity: clampSpin(torque * 40), end: 0 },
            resistance: 130,
          },
        });
      }

      fan.addEventListener("mousemove", trackPointer);
      cards.forEach(function (card) {
        card.addEventListener("mouseenter", pushCard);
      });

      return function () {
        fan.classList.remove("testimonial-fan--orbit");
        fan.removeEventListener("mousemove", trackPointer);
        cards.forEach(function (card) {
          card.removeEventListener("mouseenter", pushCard);
        });
      };
    });
  }

  // Closing footer: clone the content into an accent-colored layer that is
  // only visible inside a circle following the mouse ("flashlight").
  // Mouse only — on touch there's no cursor to follow, so no clone at all.
  var closingSpot = null;
  var closingRoot = null;
  var closingHandlers = null;

  function buildClosingSpotlight() {
    closingRoot = document.querySelector("[data-closing]");
    var layer = closingRoot && closingRoot.querySelector("[data-closing-layer]");
    if (!layer) return;
    if (!window.matchMedia("(hover: hover) and (pointer: fine)").matches) return;

    closingSpot = layer.cloneNode(true);
    closingSpot.classList.add("closing__layer--spot");
    closingSpot.removeAttribute("data-closing-layer");
    // Decorative duplicate: hidden from screen readers, not focusable.
    closingSpot.setAttribute("aria-hidden", "true");
    closingSpot.setAttribute("inert", "");
    closingSpot.querySelectorAll("[id], [data-partners-row]").forEach(function (node) {
      node.removeAttribute("id");
      node.removeAttribute("data-partners-row");
    });
    closingRoot.appendChild(closingSpot);

    var moveX = gsap.quickTo(closingSpot, "--spot-x", { duration: 0.4, ease: "back.out(1.7)", unit: "%" });
    var moveY = gsap.quickTo(closingSpot, "--spot-y", { duration: 0.4, ease: "back.out(1.7)", unit: "%" });

    closingHandlers = {
      move: function (event) {
        var box = closingRoot.getBoundingClientRect();
        moveX(gsap.utils.mapRange(box.left, box.right, 0, 100, event.clientX));
        moveY(gsap.utils.mapRange(box.top, box.bottom, 0, 100, event.clientY));
      },
      // Circle grows in on enter and shrinks away on leave.
      enter: function (event) {
        var box = closingRoot.getBoundingClientRect();
        gsap.set(closingSpot, {
          "--spot-x": gsap.utils.mapRange(box.left, box.right, 0, 100, event.clientX) + "%",
          "--spot-y": gsap.utils.mapRange(box.top, box.bottom, 0, 100, event.clientY) + "%",
        });
        gsap.to(closingSpot, { "--spot-r": "11rem", duration: 0.5, ease: "back.out(1.7)" });
      },
      leave: function () {
        gsap.to(closingSpot, { "--spot-r": "0rem", duration: 0.35, ease: "power2.in" });
      },
    };

    closingRoot.addEventListener("mousemove", closingHandlers.move);
    closingRoot.addEventListener("mouseenter", closingHandlers.enter);
    closingRoot.addEventListener("mouseleave", closingHandlers.leave);
  }

  function removeClosingSpotlight() {
    if (!closingSpot) return;
    closingRoot.removeEventListener("mousemove", closingHandlers.move);
    closingRoot.removeEventListener("mouseenter", closingHandlers.enter);
    closingRoot.removeEventListener("mouseleave", closingHandlers.leave);
    closingSpot.remove();
    closingSpot = null;
  }

  function buildScrollReveals() {
    // Word-by-word "light up" scrubbed to scroll position: every word starts
    // dim and brightens in reading order as the text scrolls up.
    function scrubWords(text, start, end) {
      var split = new SplitText(text, { type: "words" });
      gsap.set(split.words, { opacity: 0.25 });
      gsap.to(split.words, {
        opacity: 1,
        stagger: 0.05,
        ease: "none",
        scrollTrigger: { trigger: text, start: start, end: end, scrub: true },
      });
    }

    // About paragraph.
    var aboutText = document.querySelector("[data-split-about]");
    if (aboutText) scrubWords(aboutText, "top 80%", "bottom 40%");

    // CTA-to-works heading: short (two lines), so a shorter scroll window.
    var ctaText = document.querySelector("[data-split-cta]");
    if (ctaText) scrubWords(ctaText, "top 85%", "bottom 50%");

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

    // Statement: pin the stage for the track's 300vh and slide the sentence
    // along the curve from off-screen right to off-screen left.
    var statement = document.querySelector("[data-statement]");
    var statementText = statement && statement.querySelector("[data-statement-text]");
    if (statementText) {
      var curve = statement.querySelector("#statement-path");
      var viewBoxWidth = 1516; // keep in sync with the SVG viewBox

      // Distance along the path where it crosses a given x (paths are
      // left-to-right, so x grows with length; sampling is plenty precise).
      var lengthAtX = function (x) {
        var total = curve.getTotalLength();
        for (var len = 0; len <= total; len += 4) {
          if (curve.getPointAtLength(len).x >= x) return len;
        }
        return total;
      };

      statement.classList.add("statement--animated");

      // Function-based values + invalidateOnRefresh: re-measured on resize,
      // since the text length changes with the mobile font size.
      gsap.fromTo(
        statementText,
        { attr: { startOffset: function () { return lengthAtX(viewBoxWidth) + 40; } } },
        {
          attr: {
            startOffset: function () {
              return lengthAtX(0) - statementText.getComputedTextLength() - 40;
            },
          },
          ease: "none",
          scrollTrigger: {
            trigger: statement.querySelector(".statement__track"),
            start: "top top",
            end: "bottom bottom",
            pin: statement.querySelector(".statement__stage"),
            pinSpacing: false, // the 300vh track already provides the scroll room
            scrub: true,
            invalidateOnRefresh: true,
            // Created after the [data-reveal-group] triggers further down the
            // page; refresh this pin first so their positions account for it.
            refreshPriority: 1,
          },
        }
      );

      // The text is measured in the web font; re-measure once it has loaded.
      if (document.fonts && document.fonts.ready) {
        document.fonts.ready.then(function () {
          ScrollTrigger.refresh();
        });
      }
    }

    buildTestimonialFan();
    buildClosingSpotlight();

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
          var statement = document.querySelector("[data-statement]");
          if (statement) statement.classList.remove("statement--animated");
          if (testimonialsMedia) {
            testimonialsMedia.revert();
            testimonialsMedia = null;
          }
          removeClosingSpotlight();
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
