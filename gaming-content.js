const gamingContentList = document.querySelector("[data-content-list]");
const featuredContentList = document.querySelector("[data-featured-list]");
const featuredCarousel = document.querySelector("[data-featured-carousel]");
const featuredGameSpotlight = document.querySelector("[data-featured-game]");
const featuredGameCard = document.querySelector("[data-featured-game-card]");
const gamingConfig = window.GUESTBOOK_CONFIG;
const FEATURED_GAME_SLUGS = new Set(["game", "pixel-game"]);
const SIDEBAR_GAME_SLUG = "pixel-game";

function appendTextElement(parent, tagName, className, text) {
  const element = document.createElement(tagName);
  if (className) {
    element.className = className;
  }
  element.textContent = text;
  parent.append(element);
  return element;
}

function safeContentUrl(value) {
  if (typeof value !== "string") {
    return null;
  }

  try {
    const url = new URL(value, window.location.href);
    if (
      url.protocol !== "https:" &&
      !(url.protocol === "http:" && url.origin === window.location.origin)
    ) {
      return null;
    }
    return value;
  } catch {
    return null;
  }
}

function renderGamingItem(item) {
  if (
    !item ||
    typeof item.id !== "string" ||
    typeof item.title !== "string" ||
    typeof item.summary !== "string" ||
    !Array.isArray(item.tags) ||
    typeof item.content_type !== "string"
  ) {
    throw new Error("A row in the Supabase posts table has invalid data.");
  }

  const card = document.createElement("article");
  const isFeatured = FEATURED_GAME_SLUGS.has(item.slug) || item.featured === true;
  card.className = [
    "project-card",
    isFeatured ? "featured-slide" : "",
    item.card_class ?? "",
  ]
    .filter(Boolean)
    .join(" ");

  const art = document.createElement("div");
  art.className = "project-art content-art";
  if (!isFeatured) {
    art.setAttribute("aria-hidden", "true");
  }
  const imageUrl = safeContentUrl(item.image_url);
  if (imageUrl) {
    const image = document.createElement("img");
    image.src = imageUrl;
    image.alt = isFeatured ? item.title : "";
    art.append(image);
  } else {
    art.setAttribute("aria-hidden", "true");
    appendTextElement(art, "span", "", "</>");
  }

  const copy = document.createElement("div");
  copy.className = `project-copy${isFeatured ? " featured-slide-details" : ""}`;
  appendTextElement(copy, "p", "project-type", item.content_type);
  appendTextElement(copy, "h3", "", item.title);
  appendTextElement(copy, "p", "", item.summary);

  if (isFeatured && item.created_at) {
    const createdAt = new Date(item.created_at);
    if (Number.isNaN(createdAt.getTime())) {
      throw new Error(`Post "${item.title}" has an invalid creation date.`);
    }

    const createdAtLabel = document.createElement("div");
    createdAtLabel.className = "featured-created-at";
    appendTextElement(createdAtLabel, "span", "", "CREATED AT");
    const time = document.createElement("time");
    time.dateTime = item.created_at;
    time.textContent = new Intl.DateTimeFormat(undefined, {
      dateStyle: "medium",
      timeStyle: "short",
    }).format(createdAt);
    createdAtLabel.append(time);
    copy.append(createdAtLabel);
  }

  const tagList = document.createElement("div");
  tagList.className = `tag-list${isFeatured ? " featured-slide-tags" : ""}`;
  item.tags.forEach((tag) => appendTextElement(tagList, "span", "", tag));
  copy.append(tagList);

  const linkUrl = safeContentUrl(item.link_url);
  if (item.link_label && linkUrl) {
    const link = document.createElement("a");
    link.className = "project-demo-link";
    link.href = linkUrl;
    if (item.link_new_tab) {
      link.target = "_blank";
      link.rel = "noreferrer";
    }
    link.append(item.link_label, " ");
    const arrow = document.createElement("span");
    arrow.setAttribute("aria-hidden", "true");
    arrow.textContent = "↗";
    link.append(arrow);
    copy.append(link);
  }

  card.append(art, copy);
  return card;
}

function observeGamingContent(element) {
  if (
    !("IntersectionObserver" in window) ||
    !document.documentElement.classList.contains("motion-ready") ||
    window.matchMedia("(prefers-reduced-motion: reduce)").matches
  ) {
    return;
  }

  element.classList.add("reveal-on-scroll");
  const observer = new IntersectionObserver(
    (entries, currentObserver) => {
      entries.forEach((entry) => {
        if (entry.isIntersecting) {
          entry.target.classList.add("is-visible");
          currentObserver.unobserve(entry.target);
        }
      });
    },
    { threshold: 0.12, rootMargin: "0px 0px -32px 0px" },
  );
  observer.observe(element);
}

function setupFeaturedCarousel(posts) {
  const previousButton = featuredCarousel.querySelector("[data-slide-previous]");
  const nextButton = featuredCarousel.querySelector("[data-slide-next]");
  const pagination = featuredCarousel.querySelector("[data-slide-pagination]");
  const slides = [...featuredContentList.querySelectorAll(".project-card")];

  slides.forEach((slide, index) => {
    slide.setAttribute("role", "group");
    slide.setAttribute("aria-roledescription", "slide");
    slide.setAttribute(
      "aria-label",
      `${index + 1} of ${slides.length}: ${posts[index].title}`,
    );
  });

  if (slides.length < 2) {
    previousButton.hidden = true;
    nextButton.hidden = true;
    pagination.hidden = true;
    return;
  }

  let currentSlide = 0;
  const paginationButtons = slides.map((slide, index) => {
    const button = document.createElement("button");
    button.type = "button";
    button.className = "featured-slide-thumbnail";
    button.setAttribute(
      "aria-label",
      `Show slide ${index + 1}: ${posts[index].title}`,
    );
    const imageUrl = safeContentUrl(posts[index].image_url);
    if (imageUrl) {
      const image = document.createElement("img");
      image.src = imageUrl;
      image.alt = "";
      button.append(image);
    } else {
      appendTextElement(button, "span", "", posts[index].title);
    }
    button.addEventListener("click", () => showSlide(index));
    pagination.append(button);
    return button;
  });

  function showSlide(index) {
    currentSlide = (index + slides.length) % slides.length;
    slides.forEach((slide, slideIndex) => {
      const isCurrent = slideIndex === currentSlide;
      slide.hidden = !isCurrent;
      slide.setAttribute("aria-hidden", String(!isCurrent));
      paginationButtons[slideIndex].setAttribute(
        "aria-current",
        String(isCurrent),
      );
    });
  }

  previousButton.addEventListener("click", () => showSlide(currentSlide - 1));
  nextButton.addEventListener("click", () => showSlide(currentSlide + 1));
  previousButton.hidden = false;
  nextButton.hidden = false;
  pagination.hidden = false;
  showSlide(0);
}

function renderFeaturedPosts(posts) {
  document.querySelector("[data-featured-count]").textContent =
    `${String(posts.length).padStart(2, "0")} FEATURES`;
  const featuredGame = posts.find((post) => post.slug === SIDEBAR_GAME_SLUG);
  const carouselPosts = posts.filter((post) => post.slug !== SIDEBAR_GAME_SLUG);

  if (featuredGame) {
    const gameCard = renderGamingItem(featuredGame);
    gameCard.classList.add("featured-game-card");
    featuredGameCard.replaceChildren(gameCard);
    featuredGameSpotlight.hidden = false;
  }

  if (carouselPosts.length === 0) {
    appendTextElement(
      featuredContentList,
      "p",
      "content-loading",
      "No other featured posts yet.",
    );
    featuredCarousel.setAttribute("aria-label", "Featured games and blogs");
  } else {
    featuredContentList.replaceChildren(...carouselPosts.map(renderGamingItem));
  }
  setupFeaturedCarousel(carouselPosts);
}

async function loadGamingContent() {
  const posts = await loadPublishedPosts();
  const featuredPosts = posts.filter((post) => FEATURED_GAME_SLUGS.has(post.slug));
  const regularPosts = posts.filter((post) => !FEATURED_GAME_SLUGS.has(post.slug));
  renderFeaturedPosts(featuredPosts);
  document.querySelector("[data-content-count]").textContent =
    `${String(regularPosts.length).padStart(2, "0")} ITEMS`;

  if (regularPosts.length === 0) {
    appendTextElement(
      gamingContentList,
      "p",
      "content-loading",
      "No published posts yet.",
    );
    return;
  }

  gamingContentList.replaceChildren(...regularPosts.map(renderGamingItem));
  gamingContentList.querySelectorAll(".project-card").forEach(observeGamingContent);
  document.querySelectorAll(".gaming-note-panel").forEach(observeGamingContent);
}

async function loadPublishedPosts() {
  if (
    typeof gamingConfig?.url !== "string" ||
    typeof gamingConfig?.anonKey !== "string" ||
    !gamingConfig.url.startsWith("https://") ||
    gamingConfig.anonKey.length === 0
  ) {
    throw new Error("Supabase is not configured in guestbook-config.js.");
  }

  const url = new URL("/rest/v1/posts", gamingConfig.url);
  url.search = new URLSearchParams({
    select:
      "id,content_type,title,summary,slug,image_url,tags,card_class,link_label,link_url,link_new_tab,created_at,sort_order,is_published",
    is_published: "eq.true",
    order: "sort_order.asc",
  }).toString();
  const response = await fetch(url, {
    headers: {
      apikey: gamingConfig.anonKey,
      Authorization: `Bearer ${gamingConfig.anonKey}`,
    },
  });
  if (!response.ok) {
    throw new Error(
      `Loading published posts failed (${response.status}): ${await response.text()}`,
    );
  }

  const posts = await response.json();
  if (!Array.isArray(posts)) {
    throw new Error("The Supabase posts response was not a list.");
  }
  return posts;
}

if (gamingContentList) {
  loadGamingContent().catch((error) => {
    console.error("Unable to load gaming and blog content.", error);
    gamingContentList.replaceChildren();
    document.querySelector("[data-content-count]").textContent = "ERROR";
    document.querySelector("[data-featured-count]").textContent = "ERROR";
    appendTextElement(
      gamingContentList,
      "p",
      "content-loading",
      "Posts could not be loaded. Check the Supabase connection and posts table, then refresh.",
    );
    appendTextElement(
      featuredContentList,
      "p",
      "content-loading",
      "Featured games and blogs could not be loaded. Check the Supabase connection and posts table, then refresh.",
    );
  });
}
