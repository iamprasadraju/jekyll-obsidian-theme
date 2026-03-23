// Obsidian Theme - Core JavaScript
// Handles: theme toggle, sidebar state, keyboard shortcuts, TOC tracking,
//          callout folding, code copy, search, folder persistence, focus trap

;(function () {
  "use strict"

  // ═══════════════════════════════════════════════════════
  // Theme Management
  // ═══════════════════════════════════════════════════════
  function getTheme() {
    return localStorage.getItem("obsidian-theme") || "dark"
  }

  function setTheme(theme) {
    document.documentElement.setAttribute("data-theme", theme)
    localStorage.setItem("obsidian-theme", theme)
    updateThemeUI(theme)
  }

  function updateThemeUI(theme) {
    var sunIcon = document.querySelector(".icon-sun")
    var moonIcon = document.querySelector(".icon-moon")
    var label = document.querySelector(".theme-label")

    if (sunIcon) sunIcon.style.display = theme === "dark" ? "block" : "none"
    if (moonIcon) moonIcon.style.display = theme === "dark" ? "none" : "block"
    if (label) label.textContent = theme === "dark" ? "Light" : "Dark"
  }

  // ═══════════════════════════════════════════════════════
  // Sidebar Management
  // ═══════════════════════════════════════════════════════
  function toggleSidebar(side) {
    var selector = side === "left" ? ".sidebar-left" : ".sidebar-right"
    var overlaySelector =
      side === "left" ? ".sidebar-left-overlay" : ".sidebar-right-overlay"
    var sidebar = document.querySelector(selector)
    var overlay = document.querySelector(overlaySelector)
    if (!sidebar) return

    var isOpen = sidebar.classList.toggle("is-open")
    if (overlay) overlay.classList.toggle("is-open", isOpen)
    localStorage.setItem("obsidian-sidebar-" + side, isOpen ? "open" : "closed")
  }

  // ═══════════════════════════════════════════════════════
  // Search Modal
  // ═══════════════════════════════════════════════════════
  var fuse = null
  var searchIndex = null
  var selectedIndex = 0
  var searchResults = []
  var lastFocusedElement = null

  function loadSearchIndex() {
    var baseUrl = document.querySelector('link[rel="canonical"]')
    baseUrl = baseUrl ? baseUrl.href.replace(/\/[^\/]*$/, "") : ""
    fetch(baseUrl + "/search-index.json")
      .then(function (r) {
        return r.json()
      })
      .then(function (data) {
        searchIndex = data
        fuse = new Fuse(data, {
          keys: [
            { name: "title", weight: 2 },
            { name: "content", weight: 1 },
            { name: "tags", weight: 1.5 },
          ],
          threshold: 0.3,
          includeMatches: true,
          minMatchCharLength: 2,
        })
      })
      .catch(function (err) {
        console.warn("Could not load search index:", err)
      })
  }

  function openSearch() {
    var modal = document.getElementById("search-modal")
    var input = document.getElementById("search-input")
    if (!modal || !input) return

    lastFocusedElement = document.activeElement
    modal.classList.add("is-open")
    input.focus()
    if (input.value.trim()) {
      performSearch(input.value)
    }
  }

  function closeSearch() {
    var modal = document.getElementById("search-modal")
    if (!modal) return
    modal.classList.remove("is-open")
    // Don't clear input/results — preserve state for reopen
    if (lastFocusedElement) {
      lastFocusedElement.focus()
      lastFocusedElement = null
    }
  }

  function clearSearch() {
    var input = document.getElementById("search-input")
    var results = document.getElementById("search-results")
    if (input) input.value = ""
    if (results)
      results.innerHTML =
        '<div class="search-results-empty">Type to search notes...</div>'
    closeSearch()
  }

  function performSearch(query) {
    var container = document.getElementById("search-results")
    if (!container) return

    if (!fuse || !query.trim()) {
      container.innerHTML =
        '<div class="search-results-empty">Type to search notes...</div>'
      return
    }

    searchResults = fuse.search(query).slice(0, 20)
    selectedIndex = 0

    if (searchResults.length === 0) {
      container.innerHTML =
        '<div class="search-results-empty">No results found</div>'
      return
    }

    var html = ""
    searchResults.forEach(function (result, i) {
      var item = result.item
      var preview = buildSearchPreview(item.content, query)
      html +=
        '<a href="' +
        item.url +
        '" class="search-result' +
        (i === 0 ? " is-selected" : "") +
        '" data-index="' +
        i +
        '">' +
        '<span class="search-result-icon"><svg viewBox="0 0 24 24"><path fill="currentColor" d="M14 2H6c-1.1 0-2 .9-2 2v16c0 1.1.9 2 2 2h12c1.1 0 2-.9 2-2V8l-6-6zM6 20V4h7v5h5v11H6z"/></svg></span>' +
        '<div class="search-result-info">' +
        '<div class="search-result-title">' +
        escapeHtml(item.title) +
        "</div>" +
        (item.path
          ? '<div class="search-result-path">' +
            escapeHtml(item.path) +
            "</div>"
          : "") +
        (preview
          ? '<div class="search-result-preview">' + preview + "</div>"
          : "") +
        "</div></a>"
    })

    container.innerHTML = html
  }

  function buildSearchPreview(text, query) {
    if (!text) return ""
    var words = query.toLowerCase().split(/\s+/)
    var lower = text.toLowerCase()
    var bestPos = -1

    // Find first match position
    for (var w = 0; w < words.length; w++) {
      var pos = lower.indexOf(words[w])
      if (pos !== -1) {
        bestPos = pos
        break
      }
    }

    if (bestPos === -1) return escapeHtml(text.substring(0, 100)) + "..."

    var start = Math.max(0, bestPos - 40)
    var end = Math.min(text.length, bestPos + 80)
    var snippet = text.substring(start, end)

    // Highlight matching words
    for (var w = 0; w < words.length; w++) {
      var re = new RegExp("(" + escapeRegex(words[w]) + ")", "gi")
      snippet = snippet.replace(re, "<mark>$1</mark>")
    }

    return (
      (start > 0 ? "..." : "") +
      escapeHtml(snippet)
        .replace(/&lt;mark&gt;/g, "<mark>")
        .replace(/&lt;\/mark&gt;/g, "</mark>") +
      (end < text.length ? "..." : "")
    )
  }

  function escapeHtml(str) {
    if (!str) return ""
    var div = document.createElement("div")
    div.textContent = str
    return div.innerHTML
  }

  function escapeRegex(str) {
    return str.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")
  }

  function navigateSearchResults(direction) {
    var items = document.querySelectorAll(".search-result")
    if (items.length === 0) return

    items[selectedIndex].classList.remove("is-selected")
    selectedIndex = (selectedIndex + direction + items.length) % items.length
    items[selectedIndex].classList.add("is-selected")
    items[selectedIndex].scrollIntoView({ block: "nearest" })
  }

  function selectSearchResult() {
    var items = document.querySelectorAll(".search-result")
    if (items[selectedIndex]) {
      window.location.href = items[selectedIndex].getAttribute("href")
    }
  }

  // Focus trap for search modal
  function trapFocus(e) {
    var modal = document.getElementById("search-modal")
    if (!modal || !modal.classList.contains("is-open")) return

    var focusable = modal.querySelectorAll(
      'input, a[href], button, [tabindex]:not([tabindex="-1"])'
    )
    var first = focusable[0]
    var last = focusable[focusable.length - 1]

    if (e.key === "Tab") {
      if (e.shiftKey && document.activeElement === first) {
        e.preventDefault()
        last.focus()
      } else if (!e.shiftKey && document.activeElement === last) {
        e.preventDefault()
        first.focus()
      }
    }
  }

  // ═══════════════════════════════════════════════════════
  // Graph View (Lazy Load + Re-init Support)
  // ═══════════════════════════════════════════════════════
  var graphNetwork = null
  var visLoaded = false
  var visLoadCallback = null

  function loadVisJs(callback) {
    if (visLoaded) {
      callback()
      return
    }
    // Queue callback if already loading
    if (visLoadCallback) {
      var orig = visLoadCallback
      visLoadCallback = function () {
        orig()
        callback()
      }
      return
    }
    visLoadCallback = callback

    var base = document.querySelector('link[href*="main.css"]')
    base = base ? base.href.replace(/assets\/css\/.*/, "") : "/"
    var script = document.createElement("script")
    script.src = base + "assets/js/vendor/vis-network.min.js"
    script.onload = function () {
      visLoaded = true
      if (visLoadCallback) {
        visLoadCallback()
        visLoadCallback = null
      }
    }
    script.onerror = function () {
      console.warn("Failed to load vis-network")
      visLoadCallback = null
    }
    document.head.appendChild(script)
  }

  function initGraphView() {
    // Destroy existing network if any
    if (graphNetwork) {
      graphNetwork.destroy()
      graphNetwork = null
    }

    // Clear previous canvas content
    var canvasContainer = document.getElementById("graph-canvas")
    if (canvasContainer) canvasContainer.innerHTML = ""

    loadVisJs(function () {
      if (typeof vis === "undefined") {
        console.warn("Vis.js not loaded")
        return
      }

      var container = document.getElementById("graph-canvas")
      if (!container) return

      var base = document.querySelector('link[href*="main.css"]')
      base = base ? base.href.replace(/assets\/css\/.*/, "") : "/"

      fetch(base + "graph-data.json")
        .then(function (r) {
          return r.json()
        })
        .then(function (data) {
          var isDark =
            document.documentElement.getAttribute("data-theme") !== "light"

          var nodes = new vis.DataSet(
            data.nodes.map(function (n) {
              var isCurrent = n.url === window.location.pathname
              return {
                id: n.id,
                label: n.label,
                url: n.url,
                group: n.group,
                color: isCurrent
                  ? isDark
                    ? "#7c3aed"
                    : "#6d28d9"
                  : isDark
                    ? "#60a5fa"
                    : "#0969da",
                font: { color: isDark ? "#dcddde" : "#1f2328", size: 14 },
                shape: "dot",
                size: isCurrent ? 20 : 12,
              }
            })
          )

          var edges = new vis.DataSet(
            data.edges.map(function (e) {
              return {
                id: e.id,
                from: e.from,
                to: e.to,
                color: { color: isDark ? "#3f3f46" : "#d0d7de", opacity: 0.6 },
                width: 1,
              }
            })
          )

          graphNetwork = new vis.Network(
            container,
            { nodes: nodes, edges: edges },
            {
              physics: {
                enabled: true,
                barnesHut: {
                  gravitationalConstant: -3000,
                  centralGravity: 0.3,
                  springLength: 150,
                  springConstant: 0.04,
                },
              },
              interaction: {
                hover: true,
                tooltipDelay: 200,
                zoomView: true,
                dragView: true,
              },
              nodes: { borderWidth: 0, shadow: false },
              edges: { smooth: { type: "continuous" } },
            }
          )

          graphNetwork.on("click", function (params) {
            if (params.nodes.length > 0) {
              var node = nodes.get(params.nodes[0])
              if (node && node.url) window.location.href = node.url
            }
          })
        })
        .catch(function (err) {
          console.warn("Could not load graph data:", err)
          container.innerHTML =
            '<p style="padding:2rem;text-align:center;color:var(--text-muted);">Graph data not available. Run Jekyll build first.</p>'
        })
    })
  }

  // ═══════════════════════════════════════════════════════
  // TOC Active Heading Tracking + Click Navigation
  // ═══════════════════════════════════════════════════════
  function initTocTracking() {
    var tocLinks = document.querySelectorAll(".toc-link")
    if (tocLinks.length === 0) return

    var contentWrapper = document.querySelector(".content-wrapper")
    if (!contentWrapper) return

    var headings = []
    tocLinks.forEach(function (link) {
      var href = link.getAttribute("href")
      if (!href) return
      var id = href.replace("#", "")
      var heading = document.getElementById(id)
      if (heading) headings.push({ el: heading, link: link })
    })

    if (headings.length === 0) return

    // ── Click handler: immediate feedback + smooth scroll ──
    tocLinks.forEach(function (link) {
      link.addEventListener("click", function (e) {
        e.preventDefault()
        var href = link.getAttribute("href")
        if (!href) return
        var id = href.replace("#", "")
        var heading = document.getElementById(id)
        if (!heading) return

        // Immediate visual feedback
        tocLinks.forEach(function (l) {
          l.classList.remove("is-active")
        })
        link.classList.add("is-active")

        // Smooth scroll within the content wrapper
        heading.scrollIntoView({ behavior: "smooth", block: "start" })

        // Update URL hash without jumping
        if (history.pushState) {
          history.pushState(null, "", "#" + id)
        }
      })
    })

    // ── IntersectionObserver: closest-to-top wins ──
    var observer = new IntersectionObserver(
      function (entries) {
        // Collect all currently intersecting headings
        var visible = []
        entries.forEach(function (entry) {
          if (entry.isIntersecting) {
            visible.push(entry.target)
          }
        })

        if (visible.length === 0) return

        // Find the heading closest to the top of the viewport
        var closest = null
        var closestTop = Infinity
        visible.forEach(function (el) {
          var top = el.getBoundingClientRect().top
          if (top < closestTop) {
            closestTop = top
            closest = el
          }
        })

        if (!closest) return

        // Update active state
        tocLinks.forEach(function (l) {
          l.classList.remove("is-active")
        })
        var match = headings.find(function (h) {
          return h.el === closest
        })
        if (match) match.link.classList.add("is-active")
      },
      {
        root: contentWrapper,
        rootMargin: "0px 0px -80% 0px",
        threshold: 0,
      }
    )

    headings.forEach(function (h) {
      observer.observe(h.el)
    })
  }

  // ═══════════════════════════════════════════════════════
  // File Tree - Folder Persistence
  // ═══════════════════════════════════════════════════════
  function saveFolderState() {
    var states = {}
    document
      .querySelectorAll(".file-tree-folder[data-folder]")
      .forEach(function (folder) {
        states[folder.getAttribute("data-folder")] =
          folder.classList.contains("is-expanded")
      })
    localStorage.setItem("obsidian-folders", JSON.stringify(states))
  }

  function restoreFolderState() {
    try {
      var saved = JSON.parse(localStorage.getItem("obsidian-folders") || "{}")
      Object.keys(saved).forEach(function (folder) {
        var el = document.querySelector('[data-folder="' + folder + '"]')
        if (el) {
          if (saved[folder]) el.classList.add("is-expanded")
          else el.classList.remove("is-expanded")
        }
      })
    } catch (e) {
      /* ignore */
    }

    // Auto-expand folder containing active note
    var activeLink = document.querySelector(".file-tree-link.is-active")
    if (activeLink) {
      var parent = activeLink.closest(".file-tree-folder")
      while (parent) {
        parent.classList.add("is-expanded")
        parent = parent.parentElement
          ? parent.parentElement.closest(".file-tree-folder")
          : null
      }
    }

    // Update aria-expanded
    document.querySelectorAll(".file-tree-folder").forEach(function (folder) {
      var btn = folder.querySelector('[data-action="toggle-folder"]')
      if (btn)
        btn.setAttribute(
          "aria-expanded",
          folder.classList.contains("is-expanded")
        )
    })
  }

  // ═══════════════════════════════════════════════════════
  // Code Block Copy Button
  // ═══════════════════════════════════════════════════════
  function initCodeCopy() {
    document
      .querySelectorAll("pre, .highlight, div.highlighter-rouge")
      .forEach(function (block) {
        if (block.querySelector(".copy-btn")) return

        var btn = document.createElement("button")
        btn.className = "copy-btn"
        btn.textContent = "Copy"
        btn.setAttribute("aria-label", "Copy code")

        btn.addEventListener("click", function () {
          var code = block.querySelector("code")
          if (!code) return

          navigator.clipboard.writeText(code.textContent).then(function () {
            btn.textContent = "Copied!"
            btn.classList.add("copied")
            setTimeout(function () {
              btn.textContent = "Copy"
              btn.classList.remove("copied")
            }, 2000)
          })
        })

        block.style.position = "relative"
        block.appendChild(btn)
      })
  }

  // ═══════════════════════════════════════════════════════
  // Heading Anchors
  // ═══════════════════════════════════════════════════════
  function initHeadingAnchors() {
    document
      .querySelectorAll(
        ".note-content h1, .note-content h2, .note-content h3, .note-content h4, .note-content h5, .note-content h6"
      )
      .forEach(function (heading) {
        if (heading.id && !heading.querySelector(".heading-anchor")) {
          var anchor = document.createElement("a")
          anchor.className = "heading-anchor"
          anchor.href = "#" + heading.id
          anchor.textContent = "#"
          anchor.setAttribute("aria-label", "Link to " + heading.textContent)
          heading.prepend(anchor)
        }
      })
  }

  // ═══════════════════════════════════════════════════════
  // Keyboard Shortcuts
  // ═══════════════════════════════════════════════════════
  function handleKeyDown(e) {
    var isMac = navigator.platform.toUpperCase().indexOf("MAC") >= 0
    var modKey = isMac ? e.metaKey : e.ctrlKey

    // Ctrl/Cmd + K → Open search
    if (modKey && e.key === "k") {
      e.preventDefault()
      openSearch()
      return
    }

    // Ctrl/Cmd + B → Toggle left sidebar
    if (modKey && e.key === "b") {
      e.preventDefault()
      toggleSidebar("left")
      return
    }

    // Escape → Close modals/sidebars
    if (e.key === "Escape") {
      var searchModal = document.getElementById("search-modal")
      if (searchModal && searchModal.classList.contains("is-open")) {
        clearSearch()
        return
      }

      var graphView = document.getElementById("graph-view")
      if (graphView && graphView.classList.contains("is-open")) {
        graphView.classList.remove("is-open")
        return
      }

      // Close mobile sidebars
      if (window.innerWidth <= 1024) {
        var leftSidebar = document.querySelector(".sidebar-left")
        if (leftSidebar && leftSidebar.classList.contains("is-open")) {
          toggleSidebar("left")
          return
        }
      }
      if (window.innerWidth <= 1280) {
        var rightSidebar = document.querySelector(".sidebar-right")
        if (rightSidebar && rightSidebar.classList.contains("is-open")) {
          toggleSidebar("right")
          return
        }
      }
    }

    // Focus trap in search modal
    trapFocus(e)
  }

  // ═══════════════════════════════════════════════════════
  // Data-Action Event Delegation
  // ═══════════════════════════════════════════════════════
  function handleAction(e) {
    var target = e.target.closest("[data-action]")
    if (!target) return

    var action = target.getAttribute("data-action")

    switch (action) {
      case "toggle-theme":
        var current = getTheme()
        setTheme(current === "dark" ? "light" : "dark")
        break

      case "toggle-sidebar-left":
        toggleSidebar("left")
        break

      case "toggle-sidebar-right":
        toggleSidebar("right")
        break

      case "close-sidebar-left":
        var left = document.querySelector(".sidebar-left")
        if (left && left.classList.contains("is-open")) toggleSidebar("left")
        break

      case "close-sidebar-right":
        var right = document.querySelector(".sidebar-right")
        if (right && right.classList.contains("is-open")) toggleSidebar("right")
        break

      case "open-search":
        openSearch()
        break

      case "close-search":
        clearSearch()
        break

      case "open-graph":
        var graphEl = document.getElementById("graph-view")
        if (graphEl) {
          graphEl.classList.add("is-open")
          // Defer init to next frame so container has computed dimensions
          requestAnimationFrame(function () {
            requestAnimationFrame(function () {
              initGraphView()
            })
          })
        }
        break

      case "close-graph":
        var graphEl2 = document.getElementById("graph-view")
        if (graphEl2) {
          if (graphNetwork) {
            graphNetwork.destroy()
            graphNetwork = null
          }
          var canvasContainer = document.getElementById("graph-canvas")
          if (canvasContainer) canvasContainer.innerHTML = ""
          graphEl2.classList.remove("is-open")
        }
        break

      case "toggle-folder":
        e.preventDefault()
        var folder = target.closest(".file-tree-folder")
        if (folder) {
          folder.classList.toggle("is-expanded")
          target.setAttribute(
            "aria-expanded",
            folder.classList.contains("is-expanded")
          )
          saveFolderState()
        }
        break
    }
  }

  // ═══════════════════════════════════════════════════════
  // Search Input Handling
  // ═══════════════════════════════════════════════════════
  function initSearchInput() {
    var input = document.getElementById("search-input")
    if (!input) return

    input.addEventListener("input", function () {
      performSearch(this.value)
    })

    input.addEventListener("keydown", function (e) {
      if (e.key === "ArrowDown") {
        e.preventDefault()
        navigateSearchResults(1)
      } else if (e.key === "ArrowUp") {
        e.preventDefault()
        navigateSearchResults(-1)
      } else if (e.key === "Enter") {
        e.preventDefault()
        selectSearchResult()
      }
    })
  }

  // ═══════════════════════════════════════════════════════
  // Initialize
  // ═══════════════════════════════════════════════════════
  function init() {
    // Apply saved theme
    setTheme(getTheme())

    // Event delegation for all data-action elements
    document.addEventListener("click", handleAction)

    // Keyboard shortcuts
    document.addEventListener("keydown", handleKeyDown)

    // Search
    loadSearchIndex()
    initSearchInput()

    // Click outside search modal to close
    var searchModal = document.getElementById("search-modal")
    if (searchModal) {
      searchModal.addEventListener("click", function (e) {
        if (e.target === searchModal) closeSearch()
      })
    }

    // TOC tracking
    initTocTracking()

    // Code copy buttons
    initCodeCopy()

    // Heading anchors
    initHeadingAnchors()

    // File tree
    restoreFolderState()
  }

  // Run on DOM ready
  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", init)
  } else {
    init()
  }
})()
