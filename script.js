const stage = document.getElementById('stage');
const viewButton = document.getElementById('viewBtn');

if (stage && viewButton) {
  const viewButtonLabel = viewButton.querySelector('i') || viewButton;
  const originalViewLabel = viewButtonLabel.textContent.trim();
  const highlightCard = stage.querySelector('.highlight-card');
  const detailLead = stage.querySelector('.detail .lead');
  const poster = stage.querySelector('.shot-column:first-child .poster-link > img');

  const alignPosterWithCard = () => {
    if (!highlightCard || !detailLead || !poster) return;

    if (!stage.classList.contains('expanded')) {
      poster.style.removeProperty('height');
      return;
    }

    const cardBottom = highlightCard.getBoundingClientRect().bottom;
    const posterTop = poster.getBoundingClientRect().top;
    const posterHeight = Math.max(0, cardBottom - posterTop);
    poster.style.height = `${posterHeight}px`;
  };

  if (highlightCard && detailLead && poster) {
    const posterLayoutObserver = new ResizeObserver(alignPosterWithCard);
    posterLayoutObserver.observe(highlightCard);
    posterLayoutObserver.observe(detailLead);
    window.addEventListener('resize', alignPosterWithCard);
  }

  viewButton.addEventListener('click', (event) => {
    event.preventDefault();

    const isExpanded = stage.classList.toggle('expanded');
    viewButtonLabel.textContent = isExpanded ? 'Collapse Project' : originalViewLabel;
    viewButton.setAttribute('aria-expanded', String(isExpanded));
    window.requestAnimationFrame(alignPosterWithCard);
  });

  viewButton.setAttribute('aria-expanded', 'false');
}

const reducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

document.querySelectorAll('.project-dropdown').forEach((dropdown) => {
  const summary = dropdown.querySelector('summary');
  const content = dropdown.querySelector('.project-dropdown-content');

  if (!summary || !content) return;

  summary.addEventListener('click', (event) => {
    event.preventDefault();

    if (dropdown.dataset.animating === 'true') return;

    const isOpen = dropdown.open;

    if (reducedMotion) {
      dropdown.open = !isOpen;
      content.style.removeProperty('height');
      content.style.removeProperty('opacity');
      return;
    }

    dropdown.dataset.animating = 'true';

    const finish = () => {
      if (isOpen) dropdown.open = false;

      content.style.removeProperty('height');
      content.style.removeProperty('opacity');
      delete dropdown.dataset.animating;
    };

    if (isOpen) {
      content.style.height = `${content.scrollHeight}px`;
      content.getBoundingClientRect();

      requestAnimationFrame(() => {
        content.style.height = '0px';
        content.style.opacity = '0';
      });
    } else {
      dropdown.open = true;
      content.style.height = '0px';
      content.style.opacity = '0';
      content.getBoundingClientRect();

      requestAnimationFrame(() => {
        content.style.height = `${content.scrollHeight}px`;
        content.style.opacity = '1';
      });
    }

    let fallbackTimer;
    const onTransitionEnd = (transitionEvent) => {
      if (transitionEvent.target !== content || transitionEvent.propertyName !== 'height') return;

      content.removeEventListener('transitionend', onTransitionEnd);
      window.clearTimeout(fallbackTimer);
      finish();
    };

    content.addEventListener('transitionend', onTransitionEnd);
    fallbackTimer = window.setTimeout(() => {
      content.removeEventListener('transitionend', onTransitionEnd);
      finish();
    }, 700);
  });
});

document.querySelectorAll('.dashboard-slider').forEach((slider) => {
  const originalSlides = Array.from(slider.querySelectorAll('.dashboard-slide'));
  if (originalSlides.length < 2) return;

  const makeClone = (slide) => {
    const clone = slide.cloneNode(true);
    clone.setAttribute('aria-hidden', 'true');
    clone.alt = '';
    return clone;
  };

  slider.prepend(makeClone(originalSlides[originalSlides.length - 1]));
  slider.append(makeClone(originalSlides[0]));

  let isPositioned = false;
  let previousStep = 0;
  let settleTimer;

  const slideStep = () => {
    const styles = window.getComputedStyle(slider);
    return slider.clientWidth + (parseFloat(styles.columnGap) || 0);
  };

  const moveWithoutAnimation = (index) => {
    const step = slideStep();
    if (!step) return;

    slider.style.scrollBehavior = 'auto';
    slider.style.scrollSnapType = 'none';
    slider.scrollLeft = index * step;

    requestAnimationFrame(() => {
      slider.style.removeProperty('scroll-behavior');
      slider.style.removeProperty('scroll-snap-type');
    });
  };

  const positionSlider = () => {
    const step = slideStep();
    if (!step) return;

    if (!isPositioned) {
      slider.style.scrollBehavior = 'auto';
      slider.scrollLeft = step;
      requestAnimationFrame(() => slider.style.removeProperty('scroll-behavior'));
      isPositioned = true;
    } else if (previousStep && step !== previousStep) {
      const currentIndex = Math.round(slider.scrollLeft / previousStep);
      moveWithoutAnimation(currentIndex);
    }

    previousStep = step;
  };

  const wrapAtEnds = () => {
    const step = slideStep();
    if (!step) return;

    const index = Math.round(slider.scrollLeft / step);
    if (index <= 0) {
      moveWithoutAnimation(originalSlides.length);
    } else if (index >= originalSlides.length + 1) {
      moveWithoutAnimation(1);
    }
  };

  slider.addEventListener('scroll', () => {
    window.clearTimeout(settleTimer);
    settleTimer = window.setTimeout(wrapAtEnds, 120);
  }, { passive: true });

  slider.addEventListener('scrollend', wrapAtEnds);
  new ResizeObserver(positionSlider).observe(slider);
});

const aboutCards = document.querySelectorAll('.about-card');
const aboutDialog = document.getElementById('aboutCardDialog');
const aboutDialogTitle = document.getElementById('aboutDialogTitle');
const aboutDialogDetails = document.getElementById('aboutDialogDetails');
const aboutDialogSummary = document.getElementById('aboutDialogSummary');
const aboutDialogClose = aboutDialog?.querySelector('.about-dialog-close');

if (aboutDialog && aboutDialogTitle && aboutDialogDetails && aboutDialogSummary) {
  let revealOrigin = { x: window.innerWidth / 2, y: window.innerHeight / 2 };
  let isAnimating = false;
  let isClosing = false;
  let closeRequested = false;
  let revealAnimation;

  const getRevealRadius = (x, y) => Math.ceil(Math.hypot(
    Math.max(x, window.innerWidth - x),
    Math.max(y, window.innerHeight - y),
  ));

  const animateReveal = (opening) => {
    if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) return Promise.resolve();

    const { x, y } = revealOrigin;
    const radius = getRevealRadius(x, y);
    const start = `circle(${opening ? 0 : radius}px at ${x}px ${y}px)`;
    const end = `circle(${opening ? radius : 0}px at ${x}px ${y}px)`;
    revealAnimation?.cancel();
    revealAnimation = aboutDialog.animate(
      [{ clipPath: start }, { clipPath: end }],
      { duration: opening ? 560 : 420, easing: opening ? 'cubic-bezier(0.2, 0.75, 0.25, 1)' : 'cubic-bezier(0.55, 0, 0.8, 0.25)' },
    );
    return revealAnimation.finished.catch(() => {});
  };

  const getCardCenter = (card) => {
    const rect = card.getBoundingClientRect();
    return { x: rect.left + rect.width / 2, y: rect.top + rect.height / 2 };
  };

  const openAboutDialog = async (card, origin = getCardCenter(card)) => {
    if (aboutDialog.open || isAnimating) return;
    revealOrigin = origin;
    aboutDialogTitle.textContent = card.querySelector('.card-title')?.textContent.trim() || 'About';
    aboutDialogSummary.textContent = card.dataset.aboutInfo || '';
    const expandedDetails = Array.from(card.children)
      .filter((child) => !child.classList.contains('card-title'))
      .map((child) => child.cloneNode(true));
    expandedDetails.forEach((child) => {
      if (child.matches('.about-expanded-only')) child.removeAttribute('hidden');
      child.querySelectorAll('.about-expanded-only').forEach((details) => details.removeAttribute('hidden'));
    });
    aboutDialogDetails.replaceChildren(...expandedDetails);
    aboutDialog.showModal();
    isAnimating = true;
    await animateReveal(true);
    isAnimating = false;
    revealAnimation = null;
    if (closeRequested) {
      closeRequested = false;
      closeAboutDialog();
    }
  };

  aboutCards.forEach((card) => {
    card.addEventListener('click', (event) => openAboutDialog(card, { x: event.clientX, y: event.clientY }));
    card.addEventListener('keydown', (event) => {
      if (event.key === 'Enter' || event.key === ' ') {
        event.preventDefault();
        openAboutDialog(card);
      }
    });
  });

  const closeAboutDialog = async () => {
    if (!aboutDialog.open) return;
    if (isAnimating) {
      if (!isClosing) closeRequested = true;
      return;
    }
    isAnimating = true;
    isClosing = true;
    await animateReveal(false);
    aboutDialog.close();
    revealAnimation = null;
    isAnimating = false;
    isClosing = false;
  };

  aboutDialogClose?.addEventListener('click', closeAboutDialog);
  aboutDialog.addEventListener('cancel', (event) => {
    event.preventDefault();
    closeAboutDialog();
  });
  aboutDialog.addEventListener('click', (event) => {
    if (event.target === aboutDialog) closeAboutDialog();
  });
}

const videoThumbnail = document.querySelector('.video-thumbnail');
const videoDialog = document.getElementById('parkhaiveVideoDialog');
const projectVideo = videoDialog?.querySelector('video');
const videoEmptyState = videoDialog?.querySelector('.video-empty-state');
const closeVideoButton = videoDialog?.querySelector('.video-dialog-close');

if (videoThumbnail && videoDialog && projectVideo && videoEmptyState) {
  videoThumbnail.addEventListener('click', () => {
    const videoSrc = videoThumbnail.dataset.videoSrc.trim();

    if (videoSrc) {
      projectVideo.src = videoSrc;
      projectVideo.hidden = false;
      videoEmptyState.hidden = true;
      projectVideo.load();
    } else {
      projectVideo.hidden = true;
      videoEmptyState.hidden = false;
    }

    videoDialog.showModal();
  });

  closeVideoButton?.addEventListener('click', () => videoDialog.close());

  videoDialog.addEventListener('click', (event) => {
    if (event.target === videoDialog) videoDialog.close();
  });

  videoDialog.addEventListener('close', () => {
    projectVideo.pause();
    projectVideo.removeAttribute('src');
    projectVideo.load();
  });
}
