const guestbookMounts = document.querySelectorAll("[data-guestbook]");
const guestbookConfig = window.GUESTBOOK_CONFIG;
const guestbookIsConfigured =
  typeof guestbookConfig?.url === "string" &&
  typeof guestbookConfig?.anonKey === "string" &&
  guestbookConfig.url.startsWith("https://") &&
  guestbookConfig.anonKey.length > 0;

function observeGuestbookPanel(panel) {
  if (
    !("IntersectionObserver" in window) ||
    !document.documentElement.classList.contains("motion-ready") ||
    window.matchMedia("(prefers-reduced-motion: reduce)").matches
  ) {
    return;
  }

  panel.classList.add("reveal-on-scroll");
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
  observer.observe(panel);
}

function renderGuestbookEntry(entry, container) {
  const item = document.createElement("li");
  item.className = "guestbook-entry";

  const header = document.createElement("div");
  header.className = "guestbook-entry-header";

  const name = document.createElement("strong");
  name.textContent = entry.name;
  header.append(name);

  const date = new Date(entry.created_at);
  if (!Number.isNaN(date.getTime())) {
    const time = document.createElement("time");
    time.dateTime = date.toISOString();
    time.textContent = new Intl.DateTimeFormat(undefined, {
      dateStyle: "medium",
    }).format(date);
    header.append(time);
  }

  const message = document.createElement("p");
  message.textContent = entry.message;
  item.append(header, message);
  container.append(item);
}

async function loadGuestbookEntries(list, status) {
  status.textContent = "Loading messages…";
  const url = new URL("/rest/v1/guestbook_entries", guestbookConfig.url);
  url.search = new URLSearchParams({
    select: "name,message,created_at",
    order: "created_at.desc",
    limit: "50",
  }).toString();

  const response = await fetch(url, {
    headers: {
      apikey: guestbookConfig.anonKey,
      Authorization: `Bearer ${guestbookConfig.anonKey}`,
    },
  });
  if (!response.ok) {
    throw new Error(
      `Loading guest-book messages failed (${response.status}): ${await response.text()}`,
    );
  }

  const entries = await response.json();
  if (!Array.isArray(entries)) {
    throw new Error("The guest-book response was not a list of entries.");
  }

  list.replaceChildren();
  entries.forEach((entry) => renderGuestbookEntry(entry, list));
  status.textContent =
    entries.length === 0
      ? "No messages yet. You can be the first to sign!"
      : `Showing ${entries.length} recent ${entries.length === 1 ? "message" : "messages"}.`;
}

async function submitGuestbookEntry(form, list, entriesStatus, status, button) {
  const formData = new FormData(form);
  const entry = {
    name: String(formData.get("name") ?? "").trim(),
    message: String(formData.get("message") ?? "").trim(),
  };

  if (!entry.name || !entry.message) {
    status.textContent = "Please enter your name and a message.";
    return;
  }

  button.disabled = true;
  status.textContent = "Signing guest book…";
  try {
    const response = await fetch(
      new URL("/rest/v1/guestbook_entries", guestbookConfig.url),
      {
        method: "POST",
        headers: {
          apikey: guestbookConfig.anonKey,
          Authorization: `Bearer ${guestbookConfig.anonKey}`,
          "Content-Type": "application/json",
          Prefer: "return=minimal",
        },
        body: JSON.stringify(entry),
      },
    );
    if (!response.ok) {
      throw new Error(
        `Submitting guest-book message failed (${response.status}): ${await response.text()}`,
      );
    }

    form.reset();
    form.querySelector("[data-character-count]").textContent = "0 / 500";
    status.textContent = "Thanks for signing the guest book!";
    try {
      await loadGuestbookEntries(list, entriesStatus);
    } catch (error) {
      console.error("Message was saved, but the guest book did not refresh.", error);
      entriesStatus.textContent =
        "Your message was saved, but the list could not be refreshed. Reload the page to see it.";
    }
  } catch (error) {
    console.error("Unable to submit the guest-book message.", error);
    status.textContent =
      "Your message could not be submitted. Please try again in a moment.";
  } finally {
    button.disabled = false;
  }
}

guestbookMounts.forEach((mount) => {
  fetch(new URL("./guestbook.html", document.currentScript.src))
    .then((response) => {
      if (!response.ok) {
        throw new Error(`Request failed with status ${response.status}`);
      }
      return response.text();
    })
    .then((markup) => {
      const guestbookDocument = new DOMParser().parseFromString(
        markup,
        "text/html",
      );
      const panel = guestbookDocument.querySelector(".guestbook-panel");
      if (!panel) {
        throw new Error("The shared guest-book panel is missing.");
      }

      const guestbook = panel.cloneNode(true);
      mount.replaceChildren(guestbook);
      observeGuestbookPanel(guestbook);

      const form = guestbook.querySelector("[data-guestbook-form]");
      const list = guestbook.querySelector("[data-guestbook-list]");
      const entriesStatus = guestbook.querySelector("[data-entries-status]");
      const status = guestbook.querySelector("[data-guestbook-status]");
      const button = guestbook.querySelector("[data-submit-button]");
      const messageInput = form.elements.message;
      const characterCount = guestbook.querySelector("[data-character-count]");

      messageInput.addEventListener("input", () => {
        characterCount.textContent = `${messageInput.value.length} / 500`;
      });

      if (!guestbookIsConfigured) {
        status.textContent =
          "Guest book setup is incomplete. Add your Supabase project URL and publishable key in guestbook-config.js.";
        entriesStatus.textContent =
          "Messages will appear here after the guest book is configured.";
        button.disabled = true;
        form.querySelectorAll("input, textarea").forEach((input) => {
          input.disabled = true;
        });
        return;
      }

      form.addEventListener("submit", (event) => {
        event.preventDefault();
        submitGuestbookEntry(form, list, entriesStatus, status, button);
      });

      loadGuestbookEntries(list, entriesStatus).catch((error) => {
        console.error("Unable to load guest-book messages.", error);
        entriesStatus.textContent =
          "Messages could not be loaded. Please refresh the page to try again.";
      });
    })
    .catch((error) => {
      console.error("Unable to load the shared guest book.", error);
      mount.textContent =
        "The guest book could not be loaded. Check that guestbook.html is available and open this page through a local web server instead of a file:// URL.";
    });
});
