/* Enhancement layer: reveals, counters, marquee, custom cursor. Vanilla, no deps. */
(function () {
  var reduce = window.matchMedia && window.matchMedia("(prefers-reduced-motion: reduce)").matches;

  document.addEventListener("DOMContentLoaded", function () {

    /* ---- scroll reveal with per-group stagger ---- */
    if (!reduce && "IntersectionObserver" in window) {
      var groups = [
        ".section-intro", ".about-content", ".timeline__block",
        ".cert-col", ".masonry__brick", ".stats__col", ".testimonials-header"
      ];
      var io = new IntersectionObserver(function (entries) {
        entries.forEach(function (e) {
          if (e.isIntersecting) { e.target.classList.add("is-in"); io.unobserve(e.target); }
        });
      }, { threshold: 0.12, rootMargin: "0px 0px -8% 0px" });

      groups.forEach(function (sel) {
        var els = document.querySelectorAll(sel);
        els.forEach(function (el, i) {
          el.classList.add("reveal");
          el.style.transitionDelay = Math.min(i * 80, 480) + "ms";
          io.observe(el);
        });
      });
    }

    /* ---- animated count-up for the stats section ---- */
    var counts = document.querySelectorAll(".stats__count");
    if (counts.length) {
      var countIO = new IntersectionObserver(function (entries) {
        entries.forEach(function (e) {
          if (!e.isIntersecting) return;
          countIO.unobserve(e.target);
          var el = e.target, suffix = el.getAttribute("data-suffix") || "";
          var target = parseInt((el.textContent || "").replace(/[^0-9]/g, ""), 10);
          if (!target) { return; }
          if (reduce) { el.textContent = target.toLocaleString() + suffix; return; }
          var dur = 1600, start = null;
          (function step(ts) {
            if (!start) start = ts;
            var p = Math.min((ts - start) / dur, 1);
            var eased = 1 - Math.pow(1 - p, 3);
            el.textContent = Math.round(target * eased).toLocaleString() + (p >= 1 ? suffix : "");
            if (p < 1) requestAnimationFrame(step);
          })(performance.now ? performance.now() : Date.now());
        });
      }, { threshold: 0.5 });
      counts.forEach(function (c) { countIO.observe(c); });
    }

    /* ---- "Select Works" marquee above the portfolio ---- */
    var works = document.getElementById("works");
    var wrap = works && works.querySelector(".masonry-wrap");
    if (wrap) {
      var words = ["Select Works", "Latest Projects", "Built by Vineet"];
      var unit = "";
      for (var k = 0; k < 6; k++) {
        var w = words[k % words.length];
        unit += '<span class="' + (k % 2 ? "fill" : "") + '">' + w + '</span><span>&#10022;</span>';
      }
      var m = document.createElement("div");
      m.className = "marquee";
      m.innerHTML = '<div class="marquee__track">' + unit + unit + '</div>';
      wrap.parentNode.insertBefore(m, wrap);
    }

    /* ---- custom cursor ---- */
    var fine = window.matchMedia && window.matchMedia("(hover: hover) and (pointer: fine)").matches;
    if (fine && !reduce) {
      var dot = document.createElement("div"); dot.className = "cursor-dot";
      var ring = document.createElement("div"); ring.className = "cursor-ring";
      document.body.appendChild(dot); document.body.appendChild(ring);
      var mx = 0, my = 0, rx = 0, ry = 0;
      document.addEventListener("mousemove", function (ev) {
        mx = ev.clientX; my = ev.clientY;
        dot.style.left = mx + "px"; dot.style.top = my + "px";
      });
      (function follow() {
        rx += (mx - rx) * 0.18; ry += (my - ry) * 0.18;
        ring.style.left = rx + "px"; ring.style.top = ry + "px";
        requestAnimationFrame(follow);
      })();
      var hoverSel = "a, button, .item-folio, .btn, .cert-col, .header-menu-toggle";
      document.querySelectorAll(hoverSel).forEach(function (el) {
        el.addEventListener("mouseenter", function () { ring.classList.add("grow"); });
        el.addEventListener("mouseleave", function () { ring.classList.remove("grow"); });
      });
    }
  });
})();
