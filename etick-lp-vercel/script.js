(() => {
  const ranges = [0, 0.16, 0.33, 0.5, 0.66, 0.82];
  const section = document.querySelector("[data-product-story]");
  const video = document.querySelector(".product-media__video");
  const steps = Array.from(document.querySelectorAll("[data-commercial-step]"));
  const markers = Array.from(document.querySelectorAll("[data-commercial-marker]"));

  if (!section || !video || steps.length === 0) return;

  const connection = navigator.connection;
  const reducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  const constrainedConnection =
    connection?.saveData ||
    connection?.effectiveType === "slow-2g" ||
    connection?.effectiveType === "2g" ||
    (typeof navigator.deviceMemory === "number" && navigator.deviceMemory <= 2);

  let ready = false;
  let raf = 0;
  let targetTime = 0;
  let sectionTop = 0;
  let travel = 1;
  let activeChapter = -1;
  const frameDuration = 1 / 24;

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

  const measure = () => {
    sectionTop = window.scrollY + section.getBoundingClientRect().top;
    travel = Math.max(1, section.offsetHeight - window.innerHeight);
  };

  const applyTarget = () => {
    if (!ready || video.seeking || !Number.isFinite(video.duration) || video.duration <= 0) return;
    if (Math.abs(video.currentTime - targetTime) < frameDuration * 0.55) return;
    video.currentTime = targetTime;
  };

  const update = () => {
    raf = 0;
    const progress = Math.min(1, Math.max(0, (window.scrollY - sectionTop) / travel));

    if (ready && Number.isFinite(video.duration) && video.duration > 0) {
      const finalFrame = Math.max(0, Math.floor(video.duration / frameDuration) - 1);
      const frame = Math.round(progress * finalFrame);
      targetTime = Math.min(video.duration - 0.001, frame * frameDuration);
    }

    section.style.setProperty("--scrub-progress", String(progress));

    let nextChapter = 0;
    for (let index = 1; index < ranges.length; index += 1) {
      if (progress >= ranges[index]) nextChapter = index;
    }
    activateChapter(nextChapter);
    applyTarget();
  };

  const scheduleUpdate = () => {
    if (!raf) raf = window.requestAnimationFrame(update);
  };

  const handleResize = () => {
    measure();
    scheduleUpdate();
  };

  video.addEventListener("loadeddata", () => {
    ready = true;
    video.dataset.ready = "true";
    video.pause();
    scheduleUpdate();
  });
  video.addEventListener("seeked", applyTarget);

  section.dataset.scrub = "enabled";
  activateChapter(0);
  measure();
  scheduleUpdate();

  window.addEventListener("scroll", scheduleUpdate, { passive: true });
  window.addEventListener("resize", handleResize);
  window.addEventListener("orientationchange", handleResize);

  if (!reducedMotion && !constrainedConnection) {
    window.setTimeout(() => {
      video.src = video.dataset.src;
      video.preload = "auto";
      video.load();
    }, 80);
  }
})();
