(() => {
  const ranges = [0, 0.16, 0.33, 0.5, 0.66, 0.82];
  const section = document.querySelector("[data-product-story]");
  const media = document.querySelector(".product-media");
  const canvas = document.querySelector(".product-media__canvas");
  const steps = Array.from(document.querySelectorAll("[data-commercial-step]"));
  const markers = Array.from(document.querySelectorAll("[data-commercial-marker]"));
  if (!section || !media || !canvas || steps.length === 0) return;

  const context = canvas.getContext("2d", { alpha: false });
  const connection = navigator.connection;
  const reducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  const constrainedConnection = connection?.saveData || connection?.effectiveType === "2g";
  const variant = window.matchMedia("(max-width: 50rem)").matches ? "mobile" : "desktop";
  const frameCount = variant === "mobile" ? 60 : 96;
  const frames = new Array(frameCount);
  let desiredFrame = 0;
  let displayedFrame = -1;
  let raf = 0;
  let sectionTop = 0;
  let travel = 1;
  let activeChapter = -1;

  const source = (index) => `assets/label-roll-sequence/${variant}/frame-${String(index + 1).padStart(3, "0")}.webp`;

  const activateChapter = (index) => {
    if (index === activeChapter) return;
    activeChapter = index;
    section.dataset.chapter = String(index);
    steps.forEach((step, stepIndex) => {
      const active = stepIndex === index;
      step.dataset.active = String(active);
      step.setAttribute("aria-hidden", String(!active));
      step.toggleAttribute("inert", !active);
    });
    markers.forEach((marker, markerIndex) => {
      marker.dataset.active = String(markerIndex === index);
    });
  };

  const resizeCanvas = () => {
    const rect = media.getBoundingClientRect();
    const ratio = Math.min(window.devicePixelRatio || 1, 1.5);
    canvas.width = Math.max(1, Math.round(rect.width * ratio));
    canvas.height = Math.max(1, Math.round(rect.height * ratio));
  };

  const draw = (image) => {
    const canvasRatio = canvas.width / canvas.height;
    const imageRatio = image.naturalWidth / image.naturalHeight;
    let sw = image.naturalWidth;
    let sh = image.naturalHeight;
    let sx = 0;
    let sy = 0;
    if (imageRatio > canvasRatio) {
      sw = image.naturalHeight * canvasRatio;
      sx = (image.naturalWidth - sw) / 2;
    } else {
      sh = image.naturalWidth / canvasRatio;
      sy = (image.naturalHeight - sh) / 2;
    }
    context.drawImage(image, sx, sy, sw, sh, 0, 0, canvas.width, canvas.height);
    canvas.dataset.ready = "true";
  };

  const renderDesiredFrame = () => {
    const exact = frames[desiredFrame];
    if (exact?.complete && exact.naturalWidth > 0) {
      if (displayedFrame !== desiredFrame) {
        displayedFrame = desiredFrame;
        draw(exact);
      }
      return;
    }
    for (let distance = 1; distance < frameCount; distance += 1) {
      for (const candidate of [desiredFrame - distance, desiredFrame + distance]) {
        const nearby = frames[candidate];
        if (nearby?.complete && nearby.naturalWidth > 0) {
          if (displayedFrame !== candidate) {
            displayedFrame = candidate;
            draw(nearby);
          }
          return;
        }
      }
    }
  };

  const measure = () => {
    sectionTop = window.scrollY + section.getBoundingClientRect().top;
    travel = Math.max(1, section.offsetHeight - window.innerHeight);
    resizeCanvas();
    displayedFrame = -1;
    renderDesiredFrame();
  };

  const update = () => {
    raf = 0;
    const progress = Math.min(1, Math.max(0, (window.scrollY - sectionTop) / travel));
    desiredFrame = Math.round(progress * (frameCount - 1));
    section.style.setProperty("--scrub-progress", String(progress));
    let nextChapter = 0;
    for (let index = 1; index < ranges.length; index += 1) {
      if (progress >= ranges[index]) nextChapter = index;
    }
    activateChapter(nextChapter);
    renderDesiredFrame();
  };

  const scheduleUpdate = () => {
    if (!raf) raf = window.requestAnimationFrame(update);
  };

  const loadFrame = (index) => {
    const image = new Image();
    image.decoding = "async";
    image.onload = () => {
      if (Math.abs(index - desiredFrame) <= 2) scheduleUpdate();
    };
    image.src = source(index);
    frames[index] = image;
  };

  section.dataset.scrub = "enabled";
  section.dataset.media = constrainedConnection || reducedMotion ? "poster" : "frames";
  activateChapter(0);
  loadFrame(0);
  if (!constrainedConnection && !reducedMotion) {
    window.setTimeout(() => {
      for (let index = 1; index < frameCount; index += 1) loadFrame(index);
    }, 100);
  }
  measure();
  scheduleUpdate();
  window.addEventListener("scroll", scheduleUpdate, { passive: true });
  window.addEventListener("resize", measure);
  window.addEventListener("orientationchange", measure);
})();
