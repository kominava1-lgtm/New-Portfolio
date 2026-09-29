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
const aboutDialogSummary = document.getElementById('aboutDialogSummary');
const aboutDialogClose = aboutDialog?.querySelector('.about-dialog-close');

if (aboutDialog && aboutDialogTitle && aboutDialogSummary) {
  const openAboutDialog = (card) => {
    aboutDialogTitle.textContent = card.querySelector('.card-title')?.textContent.trim() || 'About';
    aboutDialogSummary.textContent = card.dataset.aboutInfo || '';
    aboutDialog.showModal();
  };

  aboutCards.forEach((card) => {
    card.addEventListener('click', () => openAboutDialog(card));
    card.addEventListener('keydown', (event) => {
      if (event.key === 'Enter' || event.key === ' ') {
        event.preventDefault();
        openAboutDialog(card);
      }
    });
  });

  aboutDialogClose?.addEventListener('click', () => aboutDialog.close());
  aboutDialog.addEventListener('click', (event) => {
    if (event.target === aboutDialog) aboutDialog.close();
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
