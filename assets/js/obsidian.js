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
    var sunIcons = document.querySelectorAll(".icon-sun")
    var moonIcons = document.querySelectorAll(".icon-moon")
    var label = document.querySelector(".theme-label")

    sunIcons.forEach(function (icon) {
      icon.style.display = theme === "dark" ? "block" : "none"
    })
    moonIcons.forEach(function (icon) {
      icon.style.display = theme === "dark" ? "none" : "block"
    })
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

    // On desktop, toggle collapsed class on app-layout
    var appLayout = document.querySelector(".app-layout")
    if (appLayout) {
      if (side === "left" && window.innerWidth > 1024) {
        appLayout.classList.toggle("sidebar-collapsed", !isOpen)
      }
      if (side === "right" && window.innerWidth > 1024) {
        appLayout.classList.toggle("sidebar-right-collapsed", !isOpen)
      }
    }
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
    var baseUrl = getBaseUrl()
    fetch(baseUrl + "search-index.json")
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
    document.body.style.overflow = "hidden"
    input.focus()
    if (input.value.trim()) {
      performSearch(input.value)
    }
  }

  function closeSearch() {
    var modal = document.getElementById("search-modal")
    if (!modal) return
    modal.classList.remove("is-open")
    document.body.style.overflow = ""
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

    // Escape HTML first, then apply highlighting safely
    var escaped = escapeHtml(snippet)

    // Highlight matching words within escaped HTML
    for (var w = 0; w < words.length; w++) {
      var re = new RegExp("(" + escapeRegex(escapeHtml(words[w])) + ")", "gi")
      escaped = escaped.replace(re, '<mark>$1</mark>')
    }

    return (
      (start > 0 ? "..." : "") +
      escaped +
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
  // Graph View (force-graph - Barnes-Hut O(n log n))
  // ═══════════════════════════════════════════════════════
  var graphInstance = null
  var graphLibLoaded = false
  var graphLoadCallback = null
  var graphDataCache = null
  var graphHoveredNode = null
  var graphAdjacency = {}
  var graphFilters = { tags: {}, folders: {}, showOrphans: true, showLabels: true, linkDepth: 1 }
  var graphColorGroups = []
  var graphAllNodes = []
  var graphAllLinks = []
  var graphVisibleNodes = []
  var graphVisibleLinks = []
  var graphShowLabels = true

  var NODE_COLOR_DARK = "#a9a9b2"
  var NODE_COLOR_LIGHT = "#52525b"
  var NODE_HOVER_COLOR = "#a78bfa"
  var NODE_HOVER_COLOR_LIGHT = "#7c3aed"
  var FOCUSED_RING_COLOR = "#a78bfa"
  var HOVER_TRANSITION_SPEED = 0.15
  var DIM_OPACITY = 0.12
  var EDGE_DEFAULT_DARK = "rgba(43, 43, 43, 0.8)"
  var EDGE_DEFAULT_LIGHT = "rgba(156, 163, 175, 0.35)"
  var EDGE_HIGHLIGHT_DARK = "rgba(167, 139, 250, 0.7)"
  var EDGE_HIGHLIGHT_LIGHT = "rgba(124, 58, 237, 0.5)"
  var LABEL_COLOR_DARK = "#d1d5db"
  var LABEL_COLOR_LIGHT = "#374151"

  function getBaseUrl() {
    var el = document.querySelector('link[href*="main.css"]')
    return el ? el.href.replace(/assets\/css\/.*/, "") : "/"
  }

  function loadGraphLib(callback) {
    if (graphLibLoaded) {
      callback()
      return
    }
    if (graphLoadCallback) {
      var orig = graphLoadCallback
      graphLoadCallback = function () {
        orig()
        callback()
      }
      return
    }
    graphLoadCallback = callback

    var script = document.createElement("script")
    script.src = getBaseUrl() + "assets/js/vendor/force-graph.min.js"
    script.onload = function () {
      graphLibLoaded = true
      if (graphLoadCallback) {
        graphLoadCallback()
        graphLoadCallback = null
      }
    }
    script.onerror = function () {
      console.warn("Failed to load force-graph")
      graphLoadCallback = null
    }
    document.head.appendChild(script)
  }

  function loadGraphData(callback) {
    if (graphDataCache) {
      callback(graphDataCache)
      return
    }
    fetch(getBaseUrl() + "graph-data.json")
      .then(function (r) { return r.json() })
      .then(function (data) {
        graphDataCache = data
        callback(data)
      })
      .catch(function (err) {
        console.warn("Could not load graph data:", err)
      })
  }

  function buildAdjacency(nodes, edges) {
    var adj = {}
    nodes.forEach(function (n) { adj[n.id] = { neighbors: new Set(), edges: new Set() } })
    edges.forEach(function (e, i) {
      if (adj[e.from]) { adj[e.from].neighbors.add(e.to); adj[e.from].edges.add(i) }
      if (adj[e.to]) { adj[e.to].neighbors.add(e.from); adj[e.to].edges.add(i) }
    })
    return adj
  }

  function hashString(str) {
    var hash = 0
    for (var i = 0; i < str.length; i++) {
      hash = ((hash << 5) - hash) + str.charCodeAt(i)
      hash |= 0
    }
    return Math.abs(hash)
  }

  function tagToColor(tag) {
    var hash = hashString(tag)
    var h = hash % 360
    var s = 55 + (hash % 20)
    var l = 55 + (hash % 15)
    return 'hsl(' + h + ', ' + s + '%, ' + l + '%)'
  }

  function getNodeColor(n, isDark) {
    var configColorMap = {}
    for (var i = 0; i < graphColorGroups.length; i++) {
      configColorMap[graphColorGroups[i].tag] = graphColorGroups[i].color
    }

    if (n.tags && n.tags.length > 0) {
      for (var j = 0; j < n.tags.length; j++) {
        var t = n.tags[j]
        if (configColorMap[t]) return configColorMap[t]
        return tagToColor(t)
      }
    }

    return isDark ? NODE_COLOR_DARK : NODE_COLOR_LIGHT
  }

  function filterNodesAndLinks(data, currentPath, applyLinkDepth) {
    var backlinkCounts = {}
    data.edges.forEach(function (e) {
      backlinkCounts[e.to] = (backlinkCounts[e.to] || 0) + 1
      backlinkCounts[e.from] = (backlinkCounts[e.from] || 0) + 1
    })

    var isDark = document.documentElement.getAttribute("data-theme") !== "light"
    var visibleNodeIds = new Set()

    data.nodes.forEach(function (n) {
      if (n.url.indexOf("#") === 0) return
      if (!graphFilters.showOrphans && n.orphan) return
      if (graphFilters.folders[n.group] === false) return
      if (n.tags) {
        for (var i = 0; i < n.tags.length; i++) {
          if (graphFilters.tags[n.tags[i]] === false) return
        }
      }
      visibleNodeIds.add(n.id)
    })

    if (applyLinkDepth && graphFilters.linkDepth > 0 && currentPath) {
      var currentNode = null
      for (var i = 0; i < data.nodes.length; i++) {
        if (data.nodes[i].url === currentPath) {
          currentNode = data.nodes[i]
          break
        }
      }
      if (currentNode) {
        var depthNodes = new Set([currentNode.id])
        var frontier = new Set([currentNode.id])
        for (var d = 0; d < graphFilters.linkDepth; d++) {
          var nextFrontier = new Set()
          frontier.forEach(function (fid) {
            data.edges.forEach(function (e) {
              if (e.from === fid && visibleNodeIds.has(e.to)) {
                nextFrontier.add(e.to)
                depthNodes.add(e.to)
              }
              if (e.to === fid && visibleNodeIds.has(e.from)) {
                nextFrontier.add(e.from)
                depthNodes.add(e.from)
              }
            })
          })
          frontier = nextFrontier
        }
        visibleNodeIds = depthNodes
      }
    }

    var nodes = data.nodes.filter(function (n) { return visibleNodeIds.has(n.id) }).map(function (n) {
      var isFocused = n.url === currentPath
      var links = backlinkCounts[n.id] || 0
      return {
        id: n.id,
        name: n.label,
        url: n.url,
        group: n.group,
        tags: n.tags || [],
        orphan: n.orphan || false,
        color: getNodeColor(n, isDark),
        val: isFocused ? 4 : 1 + Math.sqrt(links) * 0.5,
        isFocused: isFocused,
        hoverOpacity: 1,
        targetOpacity: 1,
      }
    })

    var links = data.edges.filter(function (e) {
      return visibleNodeIds.has(e.from) && visibleNodeIds.has(e.to)
    }).map(function (e, i) {
      return { source: e.from, target: e.to, index: i }
    })

    return { nodes: nodes, links: links }
  }

  function renderNodeCanvas(n, ctx, globalScale, isDark, hoveredNode, adjacency) {
    var color = n.color
    var opacity = n.hoverOpacity
    var labelColor = isDark ? LABEL_COLOR_DARK : LABEL_COLOR_LIGHT

    if (hoveredNode !== null) {
      if (n.id === hoveredNode) {
        color = isDark ? NODE_HOVER_COLOR : NODE_HOVER_COLOR_LIGHT
        n.targetOpacity = 1
      } else if (adjacency[hoveredNode] && adjacency[hoveredNode].neighbors.has(n.id)) {
        n.targetOpacity = 1
      } else {
        n.targetOpacity = DIM_OPACITY
      }
    } else {
      n.targetOpacity = 1
    }

    n.hoverOpacity += (n.targetOpacity - n.hoverOpacity) * HOVER_TRANSITION_SPEED
    if (Math.abs(n.hoverOpacity - n.targetOpacity) < 0.01) {
      n.hoverOpacity = n.targetOpacity
    }
    opacity = n.hoverOpacity

    var r = Math.sqrt(n.val) * 2
    ctx.globalAlpha = opacity

    if (n.isFocused && hoveredNode === null) {
      ctx.beginPath()
      ctx.arc(n.x, n.y, r + 2, 0, 2 * Math.PI, false)
      ctx.strokeStyle = FOCUSED_RING_COLOR
      ctx.lineWidth = 2 / globalScale
      ctx.stroke()
    }

    ctx.beginPath()
    ctx.arc(n.x, n.y, r, 0, 2 * Math.PI, false)
    ctx.fillStyle = color
    ctx.fill()

    if (graphShowLabels && n.name) {
      var showLabel = true
      if (hoveredNode !== null) {
        showLabel = n.id === hoveredNode || (adjacency[hoveredNode] && adjacency[hoveredNode].neighbors.has(n.id))
      }

      if (showLabel) {
        var fontSize = 10 / globalScale
        ctx.font = fontSize + "px -apple-system, BlinkMacSystemFont, sans-serif"
        var textWidth = ctx.measureText(n.name).width
        var labelY = n.y + r + 2 / globalScale

        ctx.fillStyle = isDark ? "rgba(21, 21, 21, 0.7)" : "rgba(255, 255, 255, 0.7)"
        ctx.fillRect(n.x - textWidth / 2 - 2, labelY - 1, textWidth + 4, fontSize + 2)

        ctx.fillStyle = labelColor
        ctx.textAlign = "center"
        ctx.textBaseline = "top"
        ctx.fillText(n.name, n.x, labelY)
      }
    }

    ctx.globalAlpha = 1
  }

  function initGraphView() {
    if (graphInstance) {
      graphInstance._cleanupGraphKeys && graphInstance._cleanupGraphKeys()
      graphInstance._destructor && graphInstance._destructor()
      graphInstance = null
    }
    graphHoveredNode = null

    var container = document.getElementById("graph-canvas")
    if (!container) return
    container.innerHTML = ""

    loadGraphLib(function () {
      if (typeof ForceGraph === "undefined") {
        console.warn("ForceGraph not loaded")
        return
      }

      loadGraphData(function (data) {
        var isDark = document.documentElement.getAttribute("data-theme") !== "light"
        var currentPath = window.location.pathname

        graphColorGroups = (data.filters && data.filters.color_groups) || []
        graphAllNodes = data.nodes
        graphAllLinks = data.edges

        var cached = {}
        try { cached = JSON.parse(localStorage.getItem("graph-pos") || "{}") } catch (e) { /* ignore */ }

        var filtered = filterNodesAndLinks(data, currentPath, false)
        graphVisibleNodes = filtered.nodes
        graphVisibleLinks = filtered.links

        graphAdjacency = buildAdjacency(graphAllNodes, graphAllLinks)

        var nodes = filtered.nodes.map(function (n) {
          return n
        })

        var links = filtered.links

        var fg = ForceGraph()(container)
          .graphData({ nodes: nodes, links: links })
          .backgroundColor("transparent")
          .autoPauseRedraw(false)
          .linkColor(function (link) {
            if (graphHoveredNode !== null) {
              var adj = graphAdjacency[graphHoveredNode]
              if (adj && adj.edges.has(link.index)) {
                return isDark ? EDGE_HIGHLIGHT_DARK : EDGE_HIGHLIGHT_LIGHT
              }
              return isDark ? "rgba(107,114,128,0.06)" : "rgba(156,163,175,0.08)"
            }
            return isDark ? EDGE_DEFAULT_DARK : EDGE_DEFAULT_LIGHT
          })
          .linkWidth(function (link) {
            if (graphHoveredNode !== null) {
              var adj = graphAdjacency[graphHoveredNode]
              if (adj && adj.edges.has(link.index)) return 1.2
              return 0.3
            }
            return 0.5
          })
          .nodeColor(function (n) { return n.color })
          .nodeVal(function (n) {
            if (graphHoveredNode !== null) {
              if (n.id === graphHoveredNode) return n.val * 1.5
              var adj = graphAdjacency[graphHoveredNode]
              if (adj && adj.neighbors.has(n.id)) return n.val * 1.2
              return n.val * 0.5
            }
            return n.val
          })
          .nodeCanvasObject(function (n, ctx, globalScale) {
            renderNodeCanvas(n, ctx, globalScale, isDark, graphHoveredNode, graphAdjacency)
          })
          .onNodeHover(function (node) {
            graphHoveredNode = node ? node.id : null
            container.style.cursor = node ? "pointer" : "default"
          })
          .d3AlphaDecay(0.02)
          .d3VelocityDecay(0.4)
          .warmupTicks(400)
          .cooldownTicks(0)
          .cooldownTime(0)
          .minZoom(0.05)
          .maxZoom(10)
          .onNodeClick(function (n) {
            if (n.url && n.url.indexOf("#") !== 0) window.location.href = n.url
          })

        function doZoomToFit() {
          fg.zoomToFit(600, 60)
          setTimeout(function () {
            var positions = {}
            fg.graphData().nodes.forEach(function (n) {
              if (n.x !== undefined && n.y !== undefined) {
                positions[n.url] = [n.x, n.y]
              }
            })
            localStorage.setItem("graph-pos", JSON.stringify(positions))
          }, 200)
        }

        function handleGraphResize() {
          if (!container) return
          var w = container.clientWidth
          var h = container.clientHeight
          if (w > 0 && h > 0) {
            fg.width(w).height(h)
          }
        }

        var resizeTimer = null
        function onResize() {
          clearTimeout(resizeTimer)
          resizeTimer = setTimeout(handleGraphResize, 100)
        }

        window.addEventListener('resize', onResize)

        var zoomDone = false
        fg.onEngineStop(function () {
          if (!zoomDone) {
            zoomDone = true
            doZoomToFit()
          }
        })

        setTimeout(function () {
          if (!zoomDone) {
            zoomDone = true
            doZoomToFit()
          }
        }, 600)

        function handleGraphKeys(e) {
          var graphEl = document.getElementById("graph-view")
          if (!graphEl || !graphEl.classList.contains("is-open")) return
          var step = e.shiftKey ? 100 : 40
          var center = fg.center()
          var scale = fg.zoom()
          var handled = false
          switch (e.key) {
            case "ArrowLeft": fg.centerAt(center.x - step / scale, undefined, 200); handled = true; break
            case "ArrowRight": fg.centerAt(center.x + step / scale, undefined, 200); handled = true; break
            case "ArrowUp": fg.centerAt(undefined, center.y - step / scale, 200); handled = true; break
            case "ArrowDown": fg.centerAt(undefined, center.y + step / scale, 200); handled = true; break
            case "+": case "=": fg.zoom(scale * 1.3, 300); handled = true; break
            case "-": case "_": fg.zoom(scale * 0.7, 300); handled = true; break
            case "0": fg.zoomToFit(600, 60); handled = true; break
          }
          if (handled) e.preventDefault()
        }
        document.addEventListener("keydown", handleGraphKeys)
        fg._cleanupGraphKeys = function () {
          document.removeEventListener("keydown", handleGraphKeys)
          window.removeEventListener('resize', onResize)
          clearTimeout(resizeTimer)
        }

        fg._refreshGraph = function () {
          var filtered = filterNodesAndLinks(graphDataCache, currentPath, false)
          fg.graphData({ nodes: filtered.nodes, links: filtered.links })
        }

        graphInstance = fg
      })
    })
  }

  function initGraphFilters() {
    loadGraphData(function (data) {
      var tagContainer = document.getElementById("tag-filters")
      var folderContainer = document.getElementById("folder-filters")
      if (!tagContainer || !folderContainer) return

      var filters = data.filters || {}
      var tags = filters.tags || []
      var folders = filters.folders || []
      graphColorGroups = filters.color_groups || []

      var colorMap = {}
      graphColorGroups.forEach(function (g) { colorMap[g.tag] = g.color })

      tagContainer.innerHTML = ""
      tags.forEach(function (tag) {
        if (graphFilters.tags[tag] === undefined) graphFilters.tags[tag] = true
        var item = document.createElement("label")
        item.className = "filter-item"
        var dot = document.createElement("span")
        dot.className = "filter-color-dot"
        dot.style.background = colorMap[tag] || tagToColor(tag)
        var cb = document.createElement("input")
        cb.type = "checkbox"
        cb.checked = graphFilters.tags[tag]
        cb.addEventListener("change", function () {
          graphFilters.tags[tag] = cb.checked
          if (graphInstance) graphInstance._refreshGraph()
        })
        var span = document.createElement("span")
        span.textContent = tag
        item.appendChild(cb)
        item.appendChild(dot)
        item.appendChild(span)
        tagContainer.appendChild(item)
      })

      folderContainer.innerHTML = ""
      folders.forEach(function (folder) {
        if (graphFilters.folders[folder] === undefined) graphFilters.folders[folder] = true
        var item = document.createElement("label")
        item.className = "filter-item"
        var cb = document.createElement("input")
        cb.type = "checkbox"
        cb.checked = graphFilters.folders[folder]
        cb.addEventListener("change", function () {
          graphFilters.folders[folder] = cb.checked
          if (graphInstance) graphInstance._refreshGraph()
        })
        var span = document.createElement("span")
        span.textContent = folder
        item.appendChild(cb)
        item.appendChild(span)
        folderContainer.appendChild(item)
      })

      var showOrphansCb = document.getElementById("show-orphans")
      var showLabelsCb = document.getElementById("show-labels")
      var linkDepthSlider = document.getElementById("link-depth")
      var linkDepthValue = document.getElementById("link-depth-value")

      if (showOrphansCb) {
        showOrphansCb.checked = graphFilters.showOrphans
        showOrphansCb.addEventListener("change", function () {
          graphFilters.showOrphans = showOrphansCb.checked
          if (graphInstance) graphInstance._refreshGraph()
        })
      }

      if (showLabelsCb) {
        showLabelsCb.checked = graphShowLabels
        showLabelsCb.addEventListener("change", function () {
          graphShowLabels = showLabelsCb.checked
        })
      }

      if (linkDepthSlider) {
        linkDepthSlider.value = graphFilters.linkDepth
        if (linkDepthValue) linkDepthValue.textContent = graphFilters.linkDepth
        linkDepthSlider.addEventListener("input", function () {
          graphFilters.linkDepth = parseInt(linkDepthSlider.value)
          if (linkDepthValue) linkDepthValue.textContent = linkDepthSlider.value
          if (graphInstance) graphInstance._refreshGraph()
        })
      }

      var resetTagBtn = document.querySelector('[data-action="reset-tag-filters"]')
      if (resetTagBtn) {
        resetTagBtn.addEventListener("click", function () {
          tags.forEach(function (tag) { graphFilters.tags[tag] = true })
          tagContainer.querySelectorAll("input[type='checkbox']").forEach(function (cb) { cb.checked = true })
          if (graphInstance) graphInstance._refreshGraph()
        })
      }

      var resetFolderBtn = document.querySelector('[data-action="reset-folder-filters"]')
      if (resetFolderBtn) {
        resetFolderBtn.addEventListener("click", function () {
          folders.forEach(function (folder) { graphFilters.folders[folder] = true })
          folderContainer.querySelectorAll("input[type='checkbox']").forEach(function (cb) { cb.checked = true })
          if (graphInstance) graphInstance._refreshGraph()
        })
      }
    })
  }

  // ─── Sidebar Mini Graph ─────────────────────────────────
  var miniGraphInstance = null

  function initMiniGraph() {
    var container = document.getElementById("graph-mini-canvas")
    if (!container) return

    loadGraphLib(function () {
      if (typeof ForceGraph === "undefined") return

      loadGraphData(function (data) {
        var isDark = document.documentElement.getAttribute("data-theme") !== "light"
        var currentUrl = window.location.pathname

        var currentNode = data.nodes.find(function (n) { return n.url === currentUrl })
        if (!currentNode) return

        var neighborIds = new Set([currentNode.id])
        data.edges.forEach(function (e) {
          if (e.from === currentNode.id) neighborIds.add(e.to)
          if (e.to === currentNode.id) neighborIds.add(e.from)
        })

        var defaultColor = isDark ? NODE_COLOR_DARK : NODE_COLOR_LIGHT
        var focusedColor = isDark ? NODE_HOVER_COLOR : NODE_HOVER_COLOR_LIGHT
        var hoverColor = isDark ? NODE_HOVER_COLOR : NODE_HOVER_COLOR_LIGHT
        var configColorMap = {}
        var colorGroups = (data.filters && data.filters.color_groups) || []
        for (var i = 0; i < colorGroups.length; i++) {
          configColorMap[colorGroups[i].tag] = colorGroups[i].color
        }

        var miniAdjacency = buildAdjacency(
          data.nodes.filter(function (n) { return neighborIds.has(n.id) }),
          data.edges.filter(function (e) { return neighborIds.has(e.from) && neighborIds.has(e.to) })
        )

        var nodes = data.nodes
          .filter(function (n) { return neighborIds.has(n.id) && n.url.indexOf("#") !== 0 })
          .map(function (n) {
            var color = defaultColor
            if (n.tags && n.tags.length > 0) {
              var t = n.tags[0]
              color = configColorMap[t] || tagToColor(t)
            }
            return {
              id: n.id,
              name: n.label,
              url: n.url,
              color: n.id === currentNode.id ? focusedColor : color,
              val: n.id === currentNode.id ? 4 : 1.5,
              isFocused: n.id === currentNode.id,
              hoverOpacity: 1,
              targetOpacity: 1,
            }
          })

        var edgeIndex = 0
        var links = data.edges
          .filter(function (e) { return neighborIds.has(e.from) && neighborIds.has(e.to) })
          .map(function (e) { return { source: e.from, target: e.to, index: edgeIndex++ } })

        var miniHoveredNode = null

        miniGraphInstance = ForceGraph()(container)
          .graphData({ nodes: nodes, links: links })
          .backgroundColor("transparent")
          .autoPauseRedraw(false)
          .showPointerCursor(true)
          .linkColor(function (link) {
            if (miniHoveredNode !== null) {
              var adj = miniAdjacency[miniHoveredNode]
              if (adj && adj.edges.has(link.index)) {
                return isDark ? EDGE_HIGHLIGHT_DARK : EDGE_HIGHLIGHT_LIGHT
              }
              return isDark ? "rgba(107,114,128,0.06)" : "rgba(156,163,175,0.08)"
            }
            return isDark ? EDGE_DEFAULT_DARK : EDGE_DEFAULT_LIGHT
          })
          .linkWidth(function (link) {
            if (miniHoveredNode !== null) {
              var adj = miniAdjacency[miniHoveredNode]
              if (adj && adj.edges.has(link.index)) return 1.5
              return 0.3
            }
            return 0.5
          })
          .nodeColor(function (n) { return n.color })
          .nodeVal(function (n) {
            if (miniHoveredNode !== null) {
              if (n.id === miniHoveredNode) return n.val * 1.5
              var adj = miniAdjacency[miniHoveredNode]
              if (adj && adj.neighbors.has(n.id)) return n.val * 1.2
              return n.val * 0.5
            }
            return n.val
          })
          .nodeCanvasObject(function (n, ctx, globalScale) {
            var color = n.color
            var opacity = 1

            if (miniHoveredNode !== null) {
              if (n.id === miniHoveredNode || (miniAdjacency[miniHoveredNode] && miniAdjacency[miniHoveredNode].neighbors.has(n.id))) {
                color = hoverColor
                opacity = 1
              } else {
                opacity = 0.12
              }
            } else if (n.isFocused) {
              color = focusedColor
            }

            var r = Math.sqrt(n.val) * 2
            ctx.globalAlpha = opacity

            if (n.isFocused && miniHoveredNode === null) {
              ctx.beginPath()
              ctx.arc(n.x, n.y, r + 2, 0, 2 * Math.PI, false)
              ctx.strokeStyle = FOCUSED_RING_COLOR
              ctx.lineWidth = 2 / globalScale
              ctx.stroke()
            }

            ctx.beginPath()
            ctx.arc(n.x, n.y, r, 0, 2 * Math.PI, false)
            ctx.fillStyle = color
            ctx.fill()

            if (n.name) {
              var showLabel = true
              if (miniHoveredNode !== null) {
                showLabel = n.id === miniHoveredNode || (miniAdjacency[miniHoveredNode] && miniAdjacency[miniHoveredNode].neighbors.has(n.id))
              }
              if (showLabel) {
                var fontSize = 9 / globalScale
                ctx.font = fontSize + "px -apple-system, sans-serif"
                var textWidth = ctx.measureText(n.name).width
                var labelY = n.y + r + 2 / globalScale

                ctx.fillStyle = isDark ? "rgba(21, 21, 21, 0.7)" : "rgba(255, 255, 255, 0.7)"
                ctx.fillRect(n.x - textWidth / 2 - 2, labelY - 1, textWidth + 4, fontSize + 2)

                ctx.fillStyle = isDark ? LABEL_COLOR_DARK : LABEL_COLOR_LIGHT
                ctx.globalAlpha = opacity
                ctx.textAlign = "center"
                ctx.textBaseline = "top"
                ctx.fillText(n.name, n.x, labelY)
              }
            }

            ctx.globalAlpha = 1
          })
          .onNodeHover(function (node) {
            miniHoveredNode = node ? node.id : null
          })
          .d3AlphaDecay(0.0228)
          .d3VelocityDecay(0.4)
          .warmupTicks(80)
          .cooldownTime(5000)
          .onNodeClick(function (n) {
            if (n.url && n.url.indexOf("#") !== 0) window.location.href = n.url
          })
          .enableZoomInteraction(false)
          .enablePanInteraction(false)
          .minZoom(0.3)
          .maxZoom(5)
          .onEngineStop(function () {
            miniGraphInstance.zoomToFit(600, 40)
          })
      })
    })
  }

  // ═══════════════════════════════════════════════════════
  // TOC Active Heading Tracking + Click Navigation
  // ═══════════════════════════════════════════════════════
  function initTocTracking() {
    var tocLinks = document.querySelectorAll(".toc-link")
    if (tocLinks.length === 0) return

    var contentWrapper = document.querySelector(".pane-content-scroll")
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
  // Inline Sliding Panes (Andy Matuschak style)
  // ═══════════════════════════════════════════════════════
  var panesContainer = null
  var paneStack = []             // array of { el, url, width }
  var defaultPaneWidth = 625
  var MIN_PANE_WIDTH = 250

  // Restore saved width
  var _savedPW = localStorage.getItem("pane-width")
  if (_savedPW) defaultPaneWidth = parseInt(_savedPW, 10) || 625

  // ─── Scroll to show a pane ────────────────────────────
  function focusPane(entry, animated) {
    if (!panesContainer || !entry) return
    var paneLeft = entry.el.offsetLeft
    var paneW = entry.el.offsetWidth
    var containerW = panesContainer.clientWidth
    var scrollLeft = panesContainer.scrollLeft
    var behavior = animated ? "smooth" : "auto"

    if (scrollLeft > paneLeft) {
      panesContainer.scrollTo({ left: paneLeft, top: 0, behavior: behavior })
    } else if (scrollLeft + containerW < paneLeft + paneW) {
      panesContainer.scrollTo({
        left: paneLeft + paneW - containerW,
        top: 0,
        behavior: behavior
      })
    }
  }

  // ─── Mark active pane ─────────────────────────────────
  function setActivePane(entry) {
    paneStack.forEach(function (e) {
      e.el.classList.toggle("is-active", e === entry)
    })
  }

  // ─── Open a new pane ──────────────────────────────────
  function openPane(url, title, afterIndex) {
    if (!panesContainer) {
      panesContainer = document.getElementById("panes-container")
      if (!panesContainer) return
    }

    // Breadcrumb behavior: if opening from pane at index N,
    // close all panes after N first.
    if (typeof afterIndex === "number" && afterIndex >= 0) {
      while (paneStack.length > afterIndex + 1) {
        var removed = paneStack.pop()
        removed.el.remove()
      }
    }

    // Add .has-panes to activate fixed-width root pane
    panesContainer.classList.add("has-panes")
    document.documentElement.style.setProperty("--pane-width", defaultPaneWidth + "px")

    var safeTitle = escapeHtml(title || url)
    var paneW = defaultPaneWidth

    // Build pane element
    var paneEl = document.createElement("div")
    paneEl.className = "pane slide-pane"
    paneEl.style.width = paneW + "px"
    paneEl.setAttribute("data-pane-url", url)

    paneEl.innerHTML =
      '<div class="pane-spine">' +
        '<div class="pane-spine-title">' + safeTitle + '</div>' +
        '<button class="pane-spine-close" data-action="close-pane" aria-label="Close">' +
          '<svg viewBox="0 0 24 24"><path fill="currentColor" d="M19 6.41L17.59 5 12 10.59 6.41 5 5 6.41 10.59 12 5 17.59 6.41 19 12 13.41 17.59 19 19 17.59 13.41 12z"/></svg>' +
        '</button>' +
      '</div>' +
      '<div class="pane-body">' +
        '<div class="pane-resize-handle"></div>' +
        '<div class="pane-content-scroll">' +
          '<div class="pane-loading"></div>' +
        '</div>' +
      '</div>'

    panesContainer.appendChild(paneEl)

    var entry = { el: paneEl, url: url, width: paneW }
    paneStack.push(entry)

    setActivePane(entry)

    // Init resize
    var handle = paneEl.querySelector(".pane-resize-handle")
    initPaneResize(handle, entry)

    // Click on spine scrolls to pane
    var spine = paneEl.querySelector(".pane-spine")
    spine.addEventListener("click", function (e) {
      if (e.target.closest(".pane-spine-close")) return
      setActivePane(entry)
      focusPane(entry, true)
    })

    // Scroll to new pane
    requestAnimationFrame(function () {
      focusPane(entry, true)
    })

    // Fetch page content
    fetch(url)
      .then(function (r) {
        if (!r.ok) throw new Error("HTTP " + r.status)
        return r.text()
      })
      .then(function (html) {
        var parser = new DOMParser()
        var doc = parser.parseFromString(html, "text/html")
        var noteContent = doc.querySelector(".note-content")
        var scrollArea = paneEl.querySelector(".pane-content-scroll")

        if (noteContent) {
          rewriteLinks(noteContent, paneStack.indexOf(entry))
          scrollArea.innerHTML = noteContent.innerHTML
          reinitPane(paneEl)
        } else {
          scrollArea.innerHTML = '<p style="color:var(--text-muted);">Could not load content.</p>'
        }
      })
      .catch(function (err) {
        console.warn("Pane fetch failed:", err)
        var scrollArea = paneEl.querySelector(".pane-content-scroll")
        scrollArea.innerHTML = '<p style="color:var(--text-muted);">Failed to load: ' + escapeHtml(err.message) + '</p>'
      })

    return entry
  }

  // ─── Close a specific pane ────────────────────────────
  function closePane(entry) {
    var idx = paneStack.indexOf(entry)
    if (idx === -1) return

    // Also close all panes after this one (breadcrumb trail)
    while (paneStack.length > idx) {
      var removed = paneStack.pop()
      removed.el.classList.add("is-closing")

      ;(function (el) {
        var done = false
        function onDone() {
          if (done) return
          done = true
          el.remove()
        }
        el.addEventListener("animationend", onDone, { once: true })
        setTimeout(onDone, 200)
      })(removed.el)
    }

    // If no more slide panes, remove .has-panes
    if (paneStack.length === 0 && panesContainer) {
      panesContainer.classList.remove("has-panes")
    }

    // Focus last remaining pane
    if (paneStack.length > 0) {
      var last = paneStack[paneStack.length - 1]
      setActivePane(last)
      focusPane(last, true)
    }
  }

  function closeTopPane() {
    if (paneStack.length === 0) return false
    closePane(paneStack[paneStack.length - 1])
    return true
  }

  function closeAllPanes() {
    while (paneStack.length > 0) {
      var removed = paneStack.pop()
      removed.el.remove()
    }
    if (panesContainer) {
      panesContainer.classList.remove("has-panes")
    }
  }

  // ─── Pane Resize ─────────────────────────────────────
  function initPaneResize(handle, entry) {
    if (!handle || !entry) return
    var startX = 0
    var startW = 0

    function onMouseDown(e) {
      e.preventDefault()
      e.stopPropagation()
      startX = e.clientX || (e.touches && e.touches[0].clientX) || 0
      startW = entry.el.offsetWidth
      handle.classList.add("is-active")
      document.body.classList.add("is-grabbing")

      document.addEventListener("mousemove", onMouseMove)
      document.addEventListener("mouseup", onMouseUp)
      document.addEventListener("touchmove", onMouseMove, { passive: false })
      document.addEventListener("touchend", onMouseUp)
    }

    function onMouseMove(e) {
      e.preventDefault()
      var clientX = e.clientX || (e.touches && e.touches[0].clientX) || 0
      var dx = clientX - startX
      var newW = Math.max(MIN_PANE_WIDTH, startW + dx)
      entry.el.style.width = newW + "px"
      entry.width = newW
    }

    function onMouseUp() {
      handle.classList.remove("is-active")
      document.body.classList.remove("is-grabbing")
      document.removeEventListener("mousemove", onMouseMove)
      document.removeEventListener("mouseup", onMouseUp)
      document.removeEventListener("touchmove", onMouseMove)
      document.removeEventListener("touchend", onMouseUp)

      defaultPaneWidth = entry.width
      localStorage.setItem("pane-width", entry.width)
    }

    handle.addEventListener("mousedown", onMouseDown)
    handle.addEventListener("touchstart", onMouseDown, { passive: false })
  }

  // ─── Link Rewriting (inside fetched pane content) ────
  function rewriteLinks(container, paneIndex) {
    container.querySelectorAll("a[href]").forEach(function (a) {
      var href = a.getAttribute("href")
      if (!href) return

      if (href.match(/^https?:\/\//)) return
      if (href.startsWith("#")) return
      if (href.startsWith("mailto:")) return
      if (href.startsWith("/tags/")) return
      if (a.classList.contains("tag")) return

      a.setAttribute("data-pane-href", href)
      a.setAttribute("data-pane-title", a.textContent || href)
      a.setAttribute("data-pane-index", paneIndex)
      a.classList.add("pane-link")
    })
  }

  // ─── Re-init interactive elements inside a pane ──────
  function reinitPane(paneEl) {
    paneEl.querySelectorAll("pre, .highlight, div.highlighter-rouge").forEach(function (block) {
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

    paneEl.querySelectorAll(
      "h1[id], h2[id], h3[id], h4[id], h5[id], h6[id]"
    ).forEach(function (heading) {
      if (!heading.querySelector(".heading-anchor")) {
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
      // Close top pane first
      if (paneStack.length > 0) {
        closeTopPane()
        return
      }

      var searchModal = document.getElementById("search-modal")
      if (searchModal && searchModal.classList.contains("is-open")) {
        closeSearch()
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
          // Wait for popup CSS animation to finish before initializing graph
          // so force-graph reads correct container dimensions
          setTimeout(function () {
            initGraphView()
          }, 350)
        }
        break

      case "close-graph":
        var graphEl2 = document.getElementById("graph-view")
        if (graphEl2) {
          if (graphInstance) {
            graphInstance._cleanupGraphKeys && graphInstance._cleanupGraphKeys()
            graphInstance._destructor && graphInstance._destructor()
            graphInstance = null
          }
          var canvasContainer = document.getElementById("graph-canvas")
          if (canvasContainer) canvasContainer.innerHTML = ""
          graphEl2.classList.remove("is-open")
          var filterPanel = document.getElementById("graph-filter-panel")
          if (filterPanel) filterPanel.classList.remove("is-open")
          var filterBtn = document.getElementById("graph-filter-btn")
          if (filterBtn) filterBtn.classList.remove("is-active")
        }
        break

      case "toggle-graph-filter":
        var filterPanel = document.getElementById("graph-filter-panel")
        var filterBtn = document.getElementById("graph-filter-btn")
        if (filterPanel) {
          filterPanel.classList.toggle("is-open")
          if (filterBtn) filterBtn.classList.toggle("is-active")
          if (filterPanel.classList.contains("is-open") && graphDataCache) {
            initGraphFilters()
          }
        }
        break

      case "zoom-in":
        if (graphInstance) {
          var scale = graphInstance.zoom()
          graphInstance.zoom(scale * 1.3, 300)
        }
        break

      case "zoom-out":
        if (graphInstance) {
          var scale2 = graphInstance.zoom()
          graphInstance.zoom(scale2 * 0.7, 300)
        }
        break

      case "zoom-fit":
        if (graphInstance) {
          graphInstance.zoomToFit(600, 60)
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

      case "close-pane":
        e.stopPropagation()
        var spineEl = target.closest(".pane-spine")
        if (spineEl) {
          var paneEl = spineEl.closest(".slide-pane")
          var entry = null
          for (var si = 0; si < paneStack.length; si++) {
            if (paneStack[si].el === paneEl) {
              entry = paneStack[si]
              break
            }
          }
          if (entry) closePane(entry)
        }
        break
    }
  }

  // ─── Link Click Interception for Panes ────────────────────
  function handleLinkClick(e) {
    var link = e.target.closest("a")
    if (!link) return

    // Don't intercept if modifier key is held (open in new tab/window)
    if (e.metaKey || e.ctrlKey || e.shiftKey || e.altKey) return

    var href = link.getAttribute("href")
    if (!href) return

    // Link inside an already-opened pane (breadcrumb trail)
    if (link.classList.contains("pane-link")) {
      var paneHref = link.getAttribute("data-pane-href")
      if (paneHref) {
        e.preventDefault()
        var idx = parseInt(link.getAttribute("data-pane-index"), 10)
        openPane(paneHref, link.getAttribute("data-pane-title") || link.textContent || paneHref, idx)
        return
      }
    }

    // Skip external links
    if (href.match(/^https?:\/\//)) return

    // Skip anchors
    if (href.startsWith("#")) return

    // Skip mailto
    if (href.startsWith("mailto:")) return

    // Skip tag links
    if (link.classList.contains("tag")) return

    // Skip links in sidebar
    if (link.closest(".sidebar-left") || link.closest(".sidebar-right")) return

    // Skip links that explicitly opt out
    if (link.hasAttribute("data-no-pane")) return

    // Intercept wikilinks and internal note links on the root page
    if (link.classList.contains("wikilink") || link.classList.contains("backlink-link")) {
      e.preventDefault()
      // afterIndex = -1 means "from root page" — don't truncate any existing panes,
      // but we want breadcrumb trail from root, so pass 0 to close everything after root
      openPane(href, link.textContent || href, 0)
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

    // Restore sidebar state from localStorage
    var leftState = localStorage.getItem("obsidian-sidebar-left")
    var rightState = localStorage.getItem("obsidian-sidebar-right")
    var leftSidebar = document.querySelector(".sidebar-left")
    var rightSidebar = document.querySelector(".sidebar-right")
    var appLayout = document.querySelector(".app-layout")
    if (leftSidebar && appLayout) {
      if (leftState === "closed") {
        leftSidebar.classList.remove("is-open")
        if (window.innerWidth > 1024) {
          appLayout.classList.add("sidebar-collapsed")
        }
      }
    }
    if (rightSidebar && appLayout) {
      if (rightState === "closed") {
        rightSidebar.classList.remove("is-open")
        if (window.innerWidth > 1024) {
          appLayout.classList.add("sidebar-right-collapsed")
        }
      }
    }

    // Reset collapsed classes when crossing mobile breakpoint
    var resizeTimer
    window.addEventListener("resize", function () {
      clearTimeout(resizeTimer)
      resizeTimer = setTimeout(function () {
        if (window.innerWidth <= 1024 && appLayout) {
          appLayout.classList.remove("sidebar-collapsed")
          appLayout.classList.remove("sidebar-right-collapsed")
        }
      }, 150)
    })

    // Event delegation for all data-action elements
    document.addEventListener("click", handleAction)

    // Inline panes: link interception
    document.addEventListener("click", handleLinkClick)
    panesContainer = document.getElementById("panes-container")

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

    // Sidebar mini graph
    initMiniGraph()

    // Detect Mac and update shortcut label
    var shortcutLabel = document.getElementById("search-shortcut-label")
    if (shortcutLabel && navigator.platform.indexOf("Mac") !== -1) {
      shortcutLabel.textContent = "\u2318K"
    }
  }

  // Run on DOM ready
  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", init)
  } else {
    init()
  }
})()
