const changelogMounts = document.querySelectorAll("[data-changelog]");

if (changelogMounts.length > 0) {
  fetch(new URL("./changelog.html", document.currentScript.src))
    .then((response) => {
      if (!response.ok) {
        throw new Error(`Request failed with status ${response.status}`);
      }
      return response.text();
    })
    .then((markup) => {
      const changelogDocument = new DOMParser().parseFromString(
        markup,
        "text/html",
      );
      const changelog = changelogDocument.querySelector(".changelog-panel");

      if (!changelog) {
        throw new Error("The shared changelog panel is missing.");
      }

      changelogMounts.forEach((mount) => {
        const panel = changelog.cloneNode(true);
        mount.replaceChildren(panel);

        if (
          "IntersectionObserver" in window &&
          document.documentElement.classList.contains("motion-ready") &&
          !window.matchMedia("(prefers-reduced-motion: reduce)").matches
        ) {
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
      });
    })
    .catch((error) => {
      console.error("Unable to load the shared changelog.", error);
      changelogMounts.forEach((mount) => {
        const message = document.createElement("section");
        message.className = "panel changelog-panel";
        message.setAttribute("role", "alert");
        message.textContent =
          "The shared changelog could not be loaded. Check that changelog.html is available and open this page through a local web server instead of a file:// URL.";
        mount.replaceChildren(message);
      });
    });
}
