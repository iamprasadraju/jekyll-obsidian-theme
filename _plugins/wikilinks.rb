# Wikilinks Plugin for Jekyll - Obsidian Theme
# Full-featured wikilink, callout, tag, and graph processing
#
# Supported syntax:
#   [[note-name]]              → links to note
#   [[note-name|Display]]      → link with custom text
#   [[folder/note-name]]       → link to note in folder
#   [[note#heading]]           → link to heading in note
#   [[note#heading|Display]]   → link to heading with custom text
#   ![[note-name]]             → embed full note content
#   ![[note-name#heading]]     → embed section of note
#   > [!note]                  → callout blocks
#   #tag                       → inline tags (in content, not code)

module Jekyll
  module WikilinksHelpers
    # ── Lookup Table ──────────────────────────────────────
    def build_note_lookup(site)
      lookup = {}
      site.collections.each do |name, collection|
        collection.docs.each do |doc|
          slug = doc.basename_without_ext
          lookup[slug.downcase] = doc

          # Relative path without collection dir: _notes/concepts/foo.md → concepts/foo
          rel_path = doc.relative_path.sub(/^_[^\/]+\//, "").sub(/\.md$/, "").sub(/^\//, "")
          lookup[rel_path.downcase] = doc

          # Title
          if doc.data["title"]
            lookup[doc.data["title"].downcase] = doc
          end

          # Aliases from front matter
          if doc.data["aliases"].is_a?(Array)
            doc.data["aliases"].each do |a|
              lookup[a.to_s.downcase] = doc
            end
          end
        end
      end
      lookup
    end

    # ── Preserve Code Blocks ──────────────────────────────
    # Replaces fenced code blocks and inline code with placeholders
    # so wikilink/tag processing doesn't corrupt them
    def preserve_code_blocks(content)
      blocks = []
      preserved = content.dup

      # Fenced code blocks: ```lang ... ```
      preserved = preserved.gsub(/```[^\n]*\n[\s\S]*?```/) do |m|
        blocks << m
        "%%CODEBLOCK_#{blocks.length - 1}%%"
      end

      # Inline code: `...`
      preserved = preserved.gsub(/`[^`\n]+`/) do |m|
        blocks << m
        "%%CODEBLOCK_#{blocks.length - 1}%%"
      end

      [preserved, blocks]
    end

    def restore_code_blocks(content, blocks)
      restored = content.dup
      blocks.each_with_index do |block, i|
        restored = restored.gsub("%%CODEBLOCK_#{i}%%", block)
      end
      restored
    end

    # ── Wikilink Processing ───────────────────────────────
    # Matches [[target]], [[target|display]], [[target#heading]], [[target#heading|display]]
    # Also matches embeds: ![[target]] and ![[target#heading]]
    def process_wikilinks(content, lookup, doc_url, backlinks, embeds = {}, baseurl = "")
      # Preserve code blocks first
      preserved, blocks = preserve_code_blocks(content)

      # Process embeds first: ![[target]] or ![[target#heading]]
      processed = preserved.gsub(/!\[\[([^\]|#]+?)(?:#([^\]|]+?))?(?:\|([^\]]+?))?\]\]/) do
        target = $1.strip
        heading = $2&.strip
        display = $3&.strip

        doc = resolve_wikilink(target, lookup)
        if doc
          embed_key = "#{doc.url}#{heading ? '#' + heading_slug(heading) : ''}"
          embeds[embed_key] ||= 0
          embeds[embed_key] += 1

          # Prevent infinite recursion
          if embeds[embed_key] > 3
            "<div class='embed-error'>Circular embed: #{target}</div>"
          else
            embed_content = get_embed_content(doc, heading)
            # Recursively process embedded content
            embed_content = process_wikilinks(embed_content, lookup, doc_url, backlinks, embeds, baseurl)
            "<div class='note-embed' data-embed-source='#{doc.url}'>" \
              "<div class='note-embed-title'><a href='#{baseurl}#{doc.url}'>#{doc.data['title'] || target}</a></div>" \
              "<div class='note-embed-content'>#{embed_content}</div>" \
            "</div>"
          end
        else
          "<div class='embed-error embed-broken'>Note not found: #{target}</div>"
        end
      end

      # Process standard wikilinks: [[target]], [[target|display]], [[target#heading]]
      processed = processed.gsub(/\[\[([^\]|#]+?)(?:#([^\]|]+?))?(?:\|([^\]]+?))?\]\]/) do
        target = $1.strip
        heading = $2&.strip
        display = $3&.strip || (heading ? "#{target} > #{heading}" : target)

        doc = resolve_wikilink(target, lookup)
        if doc
          url = "#{baseurl}#{doc.url}"
          url += "##{heading_slug(heading)}" if heading

          # Track backlink
          backlinks[doc.url] ||= []
          backlinks[doc.url] << { "source" => doc_url, "context" => nil }

          "<a href='#{url}' class='wikilink' data-wikilink-target='#{target}'>#{display}</a>"
        else
          "<a href='javascript:void(0)' class='wikilink-broken' data-wikilink-target='#{target}' title='Note not found: #{target}'>#{display}</a>"
        end
      end

      # Restore code blocks
      restore_code_blocks(processed, blocks)
    end

    def resolve_wikilink(target, lookup)
      return nil unless target
      lookup[target.downcase]
    end

    def heading_slug(heading)
      return nil unless heading
      heading.downcase.gsub(/[^\w\s-]/, "").gsub(/\s+/, "-").gsub(/-+/, "-").gsub(/^-|-$/, "")
    end

    def get_embed_content(doc, heading = nil)
      raw = doc.content.dup
      if heading
        # Extract content under the specified heading
        slug = heading_slug(heading)
        lines = raw.split("\n")
        capturing = false
        captured = []
        target_level = 0

        lines.each do |line|
          if line =~ /^(\#{1,6})\s+(.+)/
            current_level = $1.length
            current_slug = heading_slug($2)
            if current_slug == slug
              capturing = true
              target_level = current_level
              next
            elsif capturing && current_level <= target_level
              break
            end
          end
          captured << line if capturing
        end
        captured.join("\n").strip
      else
        raw
      end
    end

    # ── Tag Processing ────────────────────────────────────
    def collect_tags(content, doc_url, tags_index)
      stripped, _ = preserve_code_blocks(content)
      stripped = stripped.gsub(/<[^>]+>/, "")

      stripped.scan(/(?:^|[\s\.,;!?\)\]])#([a-zA-Z][\w\/-]*)/).each do |match|
        tag = match[0].downcase
        tags_index[tag] ||= []
        tags_index[tag] << doc_url unless tags_index[tag].include?(doc_url)

        # Also index parent tags for hierarchy: #parent/child → index #parent
        parts = tag.split("/")
        if parts.length > 1
          parent = parts[0]
          tags_index[parent] ||= []
          tags_index[parent] << doc_url unless tags_index[parent].include?(doc_url)
        end
      end
    end

    # ── Callout Processing ────────────────────────────────
    # Converts > [!type] blockquotes to .callout HTML
    def process_callouts(content)
      processed = content.dup

      # Kramdown renders callout syntax as:
      # <blockquote>\n  <p>[!type]\nbody text...</p>\n</blockquote>
      # The [!type] is always at the start of the <p> content

      # Primary regex: handles [!type] followed by body text in same <p>
      processed = processed.gsub(
        /<blockquote>\s*<p>\[!(\w+)\]\s*\n([\s\S]*?)<\/p>\s*<\/blockquote>/
      ) do
        type = $1.downcase
        body = $2.to_s.strip

        icon = callout_icon(type)
        title_text = type.capitalize

        "<div class='callout' data-callout='#{type}'>" \
          "<div class='callout-header'>" \
            "<span class='callout-icon'>#{icon}</span>" \
            "<span class='callout-title'>#{title_text}</span>" \
            "<span class='callout-fold'><svg viewBox='0 0 24 24'><path fill='currentColor' d='M7 10l5 5 5-5z'/></svg></span>" \
          "</div>" \
          "<div class='callout-content'><p>#{body}</p></div>" \
        "</div>"
      end

      processed
    end

    def callout_icon(type)
      icons = {
        "note"     => '<svg viewBox="0 0 24 24"><path fill="currentColor" d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm1 15h-2v-6h2v6zm0-8h-2V7h2v2z"/></svg>',
        "tip"      => '<svg viewBox="0 0 24 24"><path fill="currentColor" d="M9 21c0 .55.45 1 1 1h4c.55 0 1-.45 1-1v-1H9v1zm3-19C8.14 2 5 5.14 5 9c0 2.38 1.19 4.47 3 5.74V17c0 .55.45 1 1 1h6c.55 0 1-.45 1-1v-2.26c1.81-1.27 3-3.36 3-5.74 0-3.86-3.14-7-7-7z"/></svg>',
        "info"     => '<svg viewBox="0 0 24 24"><path fill="currentColor" d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm1 15h-2v-6h2v6zm0-8h-2V7h2v2z"/></svg>',
        "warning"  => '<svg viewBox="0 0 24 24"><path fill="currentColor" d="M1 21h22L12 2 1 21zm12-3h-2v-2h2v2zm0-4h-2v-4h2v4z"/></svg>',
        "danger"   => '<svg viewBox="0 0 24 24"><path fill="currentColor" d="M15.73 3H8.27L3 8.27v7.46L8.27 21h7.46L21 15.73V8.27L15.73 3zM17 15.75l-1.41 1.41L12 13.58l-3.59 3.59L7 15.75 10.59 12.16 7 8.41 8.41 7l3.59 3.59L15.59 7 17 8.41 13.41 12.16 17 15.75z"/></svg>',
        "example"  => '<svg viewBox="0 0 24 24"><path fill="currentColor" d="M3 13h2v-2H3v2zm0 4h2v-2H3v2zm0-8h2V7H3v2zm4 4h14v-2H7v2zm0 4h14v-2H7v2zM7 7v2h14V7H7z"/></svg>',
        "quote"    => '<svg viewBox="0 0 24 24"><path fill="currentColor" d="M6 17h3l2-4V7H5v6h3zm8 0h3l2-4V7h-6v6h3z"/></svg>',
      }
      icons[type] || icons["note"]
    end

    # ── Context Extraction ────────────────────────────────
    def extract_context(raw_content, target_url, lookup)
      # Find lines containing wikilink references to the target
      # Search in raw content before HTML processing
      doc = nil
      lookup.each { |_k, v| doc = v if v.url == target_url }
      return nil unless doc

      target_slug = doc.basename_without_ext.downcase
      context_lines = []

      raw_content.split("\n").each do |line|
        # Match any [[...]] that resolves to target
        if line =~ /\[\[([^\]|#]+)/
          link_target = $1.strip.downcase
          if link_target == target_slug || lookup[link_target]&.url == target_url
            clean = line.gsub(/[\[\]\|]/, "").gsub(/\s+/, " ").strip
            context_lines << clean[0..150] if clean.length > 0
          end
        end
      end

      context_lines.first
    end
  end

  # ═══════════════════════════════════════════════════════
  # Main Generator
  # ═══════════════════════════════════════════════════════
  class WikilinksGenerator < Generator
    include WikilinksHelpers
    safe true
    priority :high

    def generate(site)
      lookup = build_note_lookup(site)
      backlinks = {}
      tags_index = {}
      raw_contents = {}

      # ── Process collection documents ──
      site.collections.each do |name, collection|
        collection.docs.each do |doc|
          next unless doc.output_ext == ".html"

          # Store raw content BEFORE any processing (for search index + context)
          raw_contents[doc.url] = doc.content.dup

          # Collect tags from raw content
          collect_tags(doc.content, doc.url, tags_index)

          # Collect tags from front matter
          if doc.data["tags"].is_a?(Array)
            doc.data["tags"].each do |tag|
              tag_down = tag.to_s.downcase
              tags_index[tag_down] ||= []
              tags_index[tag_down] << doc.url unless tags_index[tag_down].include?(doc.url)
              # Parent tag hierarchy
              parts = tag_down.split("/")
              if parts.length > 1
                parent = parts[0]
                tags_index[parent] ||= []
                tags_index[parent] << doc.url unless tags_index[parent].include?(doc.url)
              end
            end
          end

          # Process wikilinks (modifies content)
          doc.content = process_wikilinks(doc.content, lookup, doc.url, backlinks, {}, site.baseurl)

          # NOTE: callout processing happens in post_convert hook (after Kramdown HTML conversion)
        end
      end

      # ── Process pages ──
      site.pages.each do |page|
        next unless page.output_ext == ".html"
        raw_contents[page.url] = page.content.dup
        page.content = process_wikilinks(page.content, lookup, page.url, backlinks, {}, site.baseurl)
        # NOTE: callout processing happens in post_convert hook
      end

      # ── Deduplicate backlinks ──
      backlinks.each do |target_url, sources|
        backlinks[target_url] = sources.uniq { |s| s["source"] }
      end

      # ── Extract backlink context from raw content ──
      backlinks.each do |target_url, sources|
        sources.each do |source_info|
          raw = raw_contents[source_info["source"]]
          if raw
            source_info["context"] = extract_context(raw, target_url, lookup)
          end
        end
      end

      # ── Store site data ──
      site.data["backlinks"] = backlinks
      site.data["tags"] = tags_index
      site.data["raw_contents"] = raw_contents
    end
  end

  # ═══════════════════════════════════════════════════════
  # Tag Page Generator
  # ═══════════════════════════════════════════════════════
  class TagPageGenerator < Generator
    safe true
    priority :low

    def generate(site)
      return unless site.data["tags"]

      # Individual tag pages
      site.data["tags"].each do |tag, note_urls|
        next if tag.include?("/") # Skip child tags, they're on the parent page
        site.pages << TagPage.new(site, tag, note_urls)
      end

      # Tags index page
      site.pages << TagsIndexPage.new(site, site.data["tags"])
    end
  end

  class TagPage < Page
    def initialize(site, tag, note_urls)
      @site = site
      @base = site.source
      @dir = "tags/#{tag}"
      @name = "index.html"

      process(@name)
      read_yaml(File.join(@base, "_layouts"), "tag.html")

      data["tag"] = tag
      data["title"] = "##{tag}"
      data["notes"] = note_urls
      data["permalink"] = "/tags/#{tag}/"
    end
  end

  class TagsIndexPage < Page
    def initialize(site, tags)
      @site = site
      @base = site.source
      @dir = "tags"
      @name = "index.html"

      process(@name)
      read_yaml(File.join(@base, "_layouts"), "tags.html")

      data["title"] = "Tags"
      data["tags"] = tags.map { |tag, urls| { "name" => tag, "count" => urls.length } }
                         .sort_by { |t| -t["count"] }
      data["permalink"] = "/tags/"
    end
  end

  # ═══════════════════════════════════════════════════════
  # Search Index Generator
  # ═══════════════════════════════════════════════════════
  class SearchIndexGenerator < Generator
    safe true
    priority :low

    def generate(site)
      index = []
      raw_contents = site.data["raw_contents"] || {}

      site.collections.each do |name, collection|
        collection.docs.each do |doc|
          next unless doc.output_ext == ".html"

          # Use raw content (before wikilink/HTML processing) for clean search text
          raw = raw_contents[doc.url] || doc.content
          # Strip wikilinks, tags, markdown formatting
          plain = raw.gsub(/\[\[([^\]|]*\|)?([^\]]*)\]\]/, '\2')  # [[link|text]] → text
                     .gsub(/!\[\[[^\]]*\]\]/, "")                   # ![[embed]] → removed
                     .gsub(/#[a-zA-Z][\w\/-]*/, "")                # #tags → removed
                     .gsub(/```[\s\S]*?```/, "")                    # code blocks → removed
                     .gsub(/`[^`]+`/, "")                           # inline code → removed
                     .gsub(/[#*_~>\[\]()!|]/, "")                   # markdown chars
                     .gsub(/\s+/, " ")
                     .strip[0..600]

          index << {
            "title" => doc.data["title"] || doc.basename_without_ext,
            "url" => "#{site.baseurl}#{doc.url}",
            "path" => doc.relative_path.sub(/^_[^\/]+\//, "").sub(/\.md$/, ""),
            "content" => plain,
            "tags" => (doc.data["tags"] || []).join(" "),
            "date" => doc.data["date"]&.to_s
          }
        end
      end

      site.static_files << SearchIndexFile.new(site, site.dest, "", "search-index.json", index)
    end
  end

  class SearchIndexFile < Jekyll::StaticFile
    def initialize(site, dir, name, dest_name, data)
      super(site, dir, name, dest_name)
      @data = data
    end

    def write(dest)
      dest_path = destination(dest)
      FileUtils.mkdir_p(File.dirname(dest_path))
      File.write(dest_path, JSON.pretty_generate(@data))
      true
    end
  end

  # ═══════════════════════════════════════════════════════
  # Graph Data Generator
  # ═══════════════════════════════════════════════════════
  class GraphDataGenerator < Generator
    safe true
    priority :low

    def generate(site)
      nodes = []
      edges = []
      node_ids = {}

      site.collections.each do |name, collection|
        collection.docs.each do |doc|
          next unless doc.output_ext == ".html"

          node_id = nodes.length
          node_ids[doc.url] = node_id

          path_parts = doc.relative_path.split("/")
          group = path_parts.length > 2 ? path_parts[1] : "root"

          nodes << {
            "id" => node_id,
            "label" => doc.data["title"] || doc.basename_without_ext,
            "url" => "#{site.baseurl}#{doc.url}",
            "group" => group
          }
        end
      end

      # Create edges from backlinks
      if site.data["backlinks"]
        site.data["backlinks"].each do |target_url, sources|
          target_id = node_ids[target_url]
          next unless target_id

          sources.each do |source_info|
            source_id = node_ids[source_info["source"]]
            next unless source_id
            edges << { "from" => source_id, "to" => target_id }
          end
        end
      end

      # Deduplicate edges
      edges.uniq!

      # ─── Add test nodes for graph performance testing ───
      test_count = site.config.dig("obsidian", "graph", "test_nodes") || 0
      if test_count > 0
        test_groups = %w[test-concepts test-daily test-guides test-projects test-research test-people test-places test-ideas]
        real_node_count = nodes.length
        srand(42) # Deterministic random for reproducible layouts

        test_count.times do |i|
          node_id = real_node_count + i
          group = test_groups[i % test_groups.length]
          label = "#{group.sub('test-', '').capitalize} #{'%03d' % (i + 1)}"

          nodes << {
            "id" => node_id,
            "label" => label,
            "url" => "#test-node-#{node_id}",
            "group" => group
          }
        end

        # Create edges between test nodes (2-4 per node)
        (real_node_count...(real_node_count + test_count)).each do |from_id|
          num_edges = 2 + rand(3)
          num_edges.times do
            to_id = real_node_count + rand(test_count)
            next if to_id == from_id
            edges << { "from" => from_id, "to" => to_id }
          end
        end

        # Connect some test nodes to real nodes (10% of test nodes)
        (test_count / 10).times do
          test_id = real_node_count + rand(test_count)
          real_id = rand(real_node_count)
          edges << { "from" => test_id, "to" => real_id }
        end
      end

      # Assign sequential edge IDs
      edges.each_with_index { |edge, i| edge["id"] = i }

      graph_data = { "nodes" => nodes, "edges" => edges }
      site.static_files << GraphDataFile.new(site, site.dest, "", "graph-data.json", graph_data)
    end
  end

  class GraphDataFile < Jekyll::StaticFile
    def initialize(site, dir, name, dest_name, data)
      super(site, dir, name, dest_name)
      @data = data
    end

    def write(dest)
      dest_path = destination(dest)
      FileUtils.mkdir_p(File.dirname(dest_path))
      File.write(dest_path, JSON.pretty_generate(@data))
      true
    end
  end

  # ═══════════════════════════════════════════════════════
  # Post-Convert Hook for Callouts
  # Runs AFTER Kramdown converts markdown to HTML
  # ═══════════════════════════════════════════════════════
  module CalloutConverter
    def self.process(content)
      return content if content.nil? || !content.include?("<blockquote>")

      # Pattern: <blockquote> whitespace <p>[!type] optional_title newline body</p> whitespace </blockquote>
      content.gsub(
        /<blockquote>\s*<p>\[!(\w+)\]\s*\n([\s\S]*?)<\/p>\s*<\/blockquote>/
      ) do
        type = $1.downcase
        body = $2.to_s.strip

        icon = callout_icon(type)
        title_text = type.capitalize

        "<div class='callout' data-callout='#{type}'>" \
          "<div class='callout-header'>" \
            "<span class='callout-icon'>#{icon}</span>" \
            "<span class='callout-title'>#{title_text}</span>" \
            "<span class='callout-fold'><svg viewBox='0 0 24 24'><path fill='currentColor' d='M7 10l5 5 5-5z'/></svg></span>" \
          "</div>" \
          "<div class='callout-content'><p>#{body}</p></div>" \
        "</div>"
      end
    end

    def self.callout_icon(type)
      icons = {
        "note"     => '<svg viewBox="0 0 24 24"><path fill="currentColor" d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm1 15h-2v-6h2v6zm0-8h-2V7h2v2z"/></svg>',
        "tip"      => '<svg viewBox="0 0 24 24"><path fill="currentColor" d="M9 21c0 .55.45 1 1 1h4c.55 0 1-.45 1-1v-1H9v1zm3-19C8.14 2 5 5.14 5 9c0 2.38 1.19 4.47 3 5.74V17c0 .55.45 1 1 1h6c.55 0 1-.45 1-1v-2.26c1.81-1.27 3-3.36 3-5.74 0-3.86-3.14-7-7-7z"/></svg>',
        "info"     => '<svg viewBox="0 0 24 24"><path fill="currentColor" d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm1 15h-2v-6h2v6zm0-8h-2V7h2v2z"/></svg>',
        "warning"  => '<svg viewBox="0 0 24 24"><path fill="currentColor" d="M1 21h22L12 2 1 21zm12-3h-2v-2h2v2zm0-4h-2v-4h2v4z"/></svg>',
        "danger"   => '<svg viewBox="0 0 24 24"><path fill="currentColor" d="M15.73 3H8.27L3 8.27v7.46L8.27 21h7.46L21 15.73V8.27L15.73 3zM17 15.75l-1.41 1.41L12 13.58l-3.59 3.59L7 15.75 10.59 12.16 7 8.41 8.41 7l3.59 3.59L15.59 7 17 8.41 13.41 12.16 17 15.75z"/></svg>',
        "example"  => '<svg viewBox="0 0 24 24"><path fill="currentColor" d="M3 13h2v-2H3v2zm0 4h2v-2H3v2zm0-8h2V7H3v2zm4 4h14v-2H7v2zm0 4h14v-2H7v2zM7 7v2h14V7H7z"/></svg>',
        "quote"    => '<svg viewBox="0 0 24 24"><path fill="currentColor" d="M6 17h3l2-4V7H5v6h3zm8 0h3l2-4V7h-6v6h3z"/></svg>',
      }
      icons[type] || icons["note"]
    end
  end

  # ═══════════════════════════════════════════════════════
  # File Tree Generator
  # Builds a recursive folder tree for the sidebar
  # ═══════════════════════════════════════════════════════
  class FileTreeGenerator < Generator
    safe true
    priority :low

    def generate(site)
      tree = { "name" => "_notes", "type" => "folder", "children" => [] }

      site.collections.each do |name, collection|
        collection.docs.each do |doc|
          next unless doc.output_ext == ".html"

          # Get relative path: _notes/Machine Learning/Supervised/Regression.md
          # → ["Machine Learning", "Supervised", "Regression.md"]
          parts = doc.relative_path.sub(/^_[^\/]+\//, "").sub(/^\//, "").split("/")
          next if parts.empty?

          insert_into_tree(tree, parts, doc)
        end
      end

      # Sort each level: folders first, then files, alphabetical
      sort_tree(tree)

      site.data["file_tree"] = tree
    end

    private

    def insert_into_tree(node, parts, doc)
      if parts.length == 1
        # Leaf: add note
        node["children"] << {
          "name" => parts[0],
          "type" => "note",
          "title" => doc.data["title"] || doc.basename_without_ext,
          "url" => doc.url
        }
      else
        # Folder: find or create child folder
        folder_name = parts[0]
        folder = node["children"].find { |c| c["type"] == "folder" && c["name"] == folder_name }

        unless folder
          folder = { "name" => folder_name, "type" => "folder", "children" => [] }
          node["children"] << folder
        end

        insert_into_tree(folder, parts[1..], doc)
      end
    end

    def sort_tree(node)
      return unless node["children"]

      node["children"].each { |child| sort_tree(child) }

      node["children"].sort_by! do |child|
        type_order = child["type"] == "folder" ? 0 : 1
        name = child["type"] == "note" ? (child["title"] || child["name"]) : child["name"]
        [type_order, name.downcase]
      end
    end
  end
end

# Register the post_convert hook
Jekyll::Hooks.register [:documents, :pages], :post_convert do |doc|
  if doc.content && doc.content.include?("<blockquote>")
    doc.content = Jekyll::CalloutConverter.process(doc.content)
  end
end
