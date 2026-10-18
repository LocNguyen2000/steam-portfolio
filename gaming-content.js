const gamingContentList = document.querySelector("[data-content-list]");
const gamingConfig = window.GUESTBOOK_CONFIG;

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
  card.className = `project-card ${item.card_class ?? ""}`.trim();

  const art = document.createElement("div");
  art.className = "project-art content-art";
  art.setAttribute("aria-hidden", "true");
  const imageUrl = safeContentUrl(item.image_url);
  if (imageUrl) {
    const image = document.createElement("img");
    image.src = imageUrl;
    image.alt = "";
    art.append(image);
  } else {
    appendTextElement(art, "span", "", "</>");
  }

  const copy = document.createElement("div");
  copy.className = "project-copy";
  appendTextElement(copy, "p", "project-type", item.content_type);
  appendTextElement(copy, "h3", "", item.title);
  appendTextElement(copy, "p", "", item.summary);

  const tagList = document.createElement("div");
  tagList.className = "tag-list";
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

async function loadGamingContent() {
  const posts = await loadPublishedPosts();
  document.querySelector("[data-content-count]").textContent =
    `${String(posts.length).padStart(2, "0")} ITEMS`;
  if (posts.length === 0) {
    appendTextElement(
      gamingContentList,
      "p",
      "content-loading",
      "No published posts yet.",
    );
    return;
  }

  gamingContentList.replaceChildren(...posts.map(renderGamingItem));
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
      "id,content_type,title,summary,image_url,tags,card_class,link_label,link_url,link_new_tab,sort_order,is_published",
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
    appendTextElement(
      gamingContentList,
      "p",
      "content-loading",
      "Posts could not be loaded. Check the Supabase connection and posts table, then refresh.",
    );
  });
}
