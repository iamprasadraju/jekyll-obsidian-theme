#!/usr/bin/env ruby
# frozen_string_literal: true

# Obsidian Vault Sync for Jekyll
# Syncs a local Obsidian vault into the _notes/ directory
#
# Usage:
#   ruby sync.rb                        # Sync using vault_path from _config.yml
#   ruby sync.rb sync                   # Same as above
#   ruby sync.rb /path/to/vault         # Override vault path
#   ruby sync.rb sync /path/to/vault    # Same as above
#   ruby sync.rb watch                  # Continuous sync (polls every 2s)
#   ruby sync.rb watch /path/to/vault   # Watch with override path
#   ruby sync.rb status                 # Show sync status
#   ruby sync.rb status /path/to/vault  # Status with override path

require "fileutils"
require "yaml"
require "json"
require "digest"
require "find"
require "set"
require "optparse"

module ObsidianSync
  ATTACHMENT_EXTENSIONS = %w[
    png jpg jpeg gif svg webp bmp ico
    pdf doc docx xls xlsx ppt pptx
    mp3 mp4 webm ogg wav flac
    zip tar gz 7z
    csv txt
  ].freeze

  MARKDOWN_EXTENSION = ".md"

  class Config
    attr_reader :vault_path, :notes_dir, :attachments_dir, :ignore_patterns,
                :auto_frontmatter, :incremental, :orphan_cleanup

    def initialize(config_path = "_config.yml")
      @notes_dir = "_notes"
      @attachments_dir = "assets/attachments"
      @ignore_patterns = [".obsidian", ".trash", ".git"]
      @auto_frontmatter = true
      @incremental = true
      @orphan_cleanup = true
      @vault_path = nil

      load_config(config_path) if File.exist?(config_path)
    end

    def vault_path=(path)
      @vault_path = File.expand_path(path)
    end

    def attachment_extensions
      ATTACHMENT_EXTENSIONS
    end

    private

    def load_config(path)
      config = YAML.safe_load(File.read(path), permitted_classes: [Date]) || {}
      obsidian = config.dig("obsidian") || {}
      sync = obsidian["sync"] || {}

      @vault_path = File.expand_path(sync["vault_path"]) if sync["vault_path"]
      @notes_dir = sync["notes_dir"] || @notes_dir
      @attachments_dir = sync["attachments_dir"] || @attachments_dir
      @auto_frontmatter = sync.key?("auto_frontmatter") ? sync["auto_frontmatter"] : @auto_frontmatter
      @incremental = sync.key?("incremental") ? sync["incremental"] : @incremental
      @orphan_cleanup = sync.key?("orphan_cleanup") ? sync["orphan_cleanup"] : @orphan_cleanup

      if sync["ignore"].is_a?(Array)
        @ignore_patterns = (@ignore_patterns + sync["ignore"]).uniq
      end
    end
  end

  class State
    STATE_FILE = ".sync-state.json"

    def initialize
      @data = load
    end

    def file_hash(relative_path)
      @data.dig("files", relative_path, "hash")
    end

    def update_file(relative_path, hash)
      @data["files"] ||= {}
      @data["files"][relative_path] = {
        "hash" => hash,
        "synced_at" => Time.now.iso8601
      }
    end

    def remove_file(relative_path)
      @data["files"]&.delete(relative_path)
    end

    def synced_files
      @data["files"]&.keys || []
    end

    def save
      @data["last_sync"] = Time.now.iso8601
      File.write(STATE_FILE, JSON.pretty_generate(@data))
    end

    def clear!
      @data = { "files" => {}, "last_sync" => nil }
    end

    private

    def load
      if File.exist?(STATE_FILE)
        JSON.parse(File.read(STATE_FILE))
      else
        { "files" => {}, "last_sync" => nil }
      end
    rescue JSON::ParserError
      { "files" => {}, "last_sync" => nil }
    end
  end

  class Syncer
    DEMO_DIR = "_demo"

    def initialize(config)
      @config = config
      @state = State.new
      @stats = { synced: 0, skipped: 0, attachments: 0, cleaned: 0, errors: 0 }
    end

    def sync
      validate_vault!

      puts "\e[36mObsidian Sync\e[0m"
      puts "  Vault:      #{@config.vault_path}"
      puts "  Notes:      #{@config.notes_dir}/"
      puts "  Attachments: #{@config.attachments_dir}/"
      puts ""

      ensure_directories
      clean_orphans if @config.orphan_cleanup
      walk_vault
      save_state

      print_summary
      @stats
    end

    def status
      validate_vault!

      vault_files = collect_vault_files
      synced = @state.synced_files.to_set

      new_files = []
      modified_files = []
      deleted_files = []

      vault_files.each do |rel_path|
        full_path = File.join(@config.vault_path, rel_path)
        current_hash = file_hash(full_path)
        is_attachment = !rel_path.end_with?(MARKDOWN_EXTENSION)
        state_key = is_attachment ? "att:#{rel_path}" : rel_path

        if @state.file_hash(state_key).nil?
          new_files << rel_path
        elsif @state.file_hash(state_key) != current_hash
          modified_files << rel_path
        end
      end

      synced.each do |rel_path|
        raw_path = rel_path.sub(/^att:/, "")
        deleted_files << raw_path unless vault_files.include?(raw_path)
      end

      puts "\e[36mSync Status\e[0m"
      puts ""

      if new_files.empty? && modified_files.empty? && deleted_files.empty?
        puts "  \e[32mEverything is up to date.\e[0m"
        return
      end

      unless new_files.empty?
        puts "  \e[32mNew files (#{new_files.size}):\e[0m"
        new_files.each { |f| puts "    + #{f}" }
        puts ""
      end

      unless modified_files.empty?
        puts "  \e[33mModified files (#{modified_files.size}):\e[0m"
        modified_files.each { |f| puts "    ~ #{f}" }
        puts ""
      end

      unless deleted_files.empty?
        puts "  \e[31mDeleted files (#{deleted_files.size}):\e[0m"
        deleted_files.each { |f| puts "    - #{f}" }
        puts ""
      end
    end

    def watch(interval = 2)
      validate_vault!

      puts "\e[36mWatching vault for changes...\e[0m (Ctrl+C to stop)"
      puts "  Vault: #{@config.vault_path}"
      puts ""

      sync

      loop do
        sleep interval
        changes = detect_changes
        next if changes.empty?

        puts "\n\e[33mDetected #{changes.size} change(s), syncing...\e[0m"
        sync
      end
    rescue Interrupt
      puts "\n\e[36mWatch stopped.\e[0m"
    end

    def print_summary
      puts ""
      puts "  \e[32mSync complete:\e[0m"
      puts "    Notes synced:    #{@stats[:synced]}"
      puts "    Attachments:     #{@stats[:attachments]}"
      puts "    Skipped:         #{@stats[:skipped]}"
      puts "    Cleaned:         #{@stats[:cleaned]}" if @stats[:cleaned] > 0
      puts "    Errors:          #{@stats[:errors]}" if @stats[:errors] > 0
      puts ""
    end

    def install_demo_notes
      unless File.directory?(DEMO_DIR)
        puts "\e[33mNo demo notes found at #{DEMO_DIR}/\e[0m"
        return
      end

      ensure_directories
      count = 0

      Find.find(DEMO_DIR) do |path|
        next if File.directory?(path)

        relative = path.sub("#{DEMO_DIR}/", "")
        dest = File.join(@config.notes_dir, relative)
        FileUtils.mkdir_p(File.dirname(dest))
        FileUtils.cp(path, dest)
        count += 1
      end

      puts "\e[36mDemo Notes Installed\e[0m"
      puts "  Copied #{count} files from #{DEMO_DIR}/ to #{@config.notes_dir}/"
      puts "  Run \e[33mruby sync.rb /path/to/vault\e[0m to replace with your vault notes."
      puts ""
    end

    private

    def validate_vault!
      unless @config.vault_path
        abort "\e[31mError:\e[0m No vault path configured.\n" \
              "Set obsidian.sync.vault_path in _config.yml or pass as argument:\n" \
              "  ruby sync.rb /path/to/vault"
      end

      unless File.directory?(@config.vault_path)
        abort "\e[31mError:\e[0m Vault directory not found: #{@config.vault_path}"
      end
    end

    def ensure_directories
      FileUtils.mkdir_p(@config.notes_dir)
      FileUtils.mkdir_p(@config.attachments_dir)
    end

    def collect_vault_files
      files = []
      Find.find(@config.vault_path) do |path|
        if File.directory?(path)
          basename = File.basename(path)
          if @config.ignore_patterns.include?(basename)
            Find.prune
          end
          next
        end

        relative = relative_vault_path(path)
        next unless relative

        ext = File.extname(path).downcase
        next unless ext == MARKDOWN_EXTENSION || @config.attachment_extensions.include?(ext.sub(".", ""))

        files << relative
      end
      files
    end

    def walk_vault
      Find.find(@config.vault_path) do |path|
        if File.directory?(path)
          basename = File.basename(path)
          if @config.ignore_patterns.include?(basename)
            Find.prune
          end
          next
        end

        relative = relative_vault_path(path)
        next unless relative

        ext = File.extname(path).downcase

        if ext == MARKDOWN_EXTENSION
          sync_note(path, relative)
        elsif @config.attachment_extensions.include?(ext.sub(".", ""))
          sync_attachment(path, relative)
        end
      end
    end

    def sync_note(source_path, relative_path)
      current_hash = file_hash(source_path)

      if @config.incremental && @state.file_hash(relative_path) == current_hash
        @stats[:skipped] += 1
        return
      end

      dest_path = File.join(@config.notes_dir, relative_path)
      FileUtils.mkdir_p(File.dirname(dest_path))

      content = File.read(source_path)
      content = normalize_frontmatter(content, source_path, relative_path)

      File.write(dest_path, content)
      @state.update_file(relative_path, current_hash)
      @stats[:synced] += 1
    rescue StandardError => e
      @stats[:errors] += 1
      $stderr.puts "  \e[31mError syncing #{relative_path}: #{e.message}\e[0m"
    end

    def sync_attachment(source_path, relative_path)
      current_hash = file_hash(source_path)

      if @config.incremental && @state.file_hash("att:#{relative_path}") == current_hash
        @stats[:skipped] += 1
        return
      end

      dest_path = File.join(@config.attachments_dir, relative_path)
      FileUtils.mkdir_p(File.dirname(dest_path))
      FileUtils.cp(source_path, dest_path)

      @state.update_file("att:#{relative_path}", current_hash)
      @stats[:attachments] += 1
    rescue StandardError => e
      @stats[:errors] += 1
      $stderr.puts "  \e[31mError syncing attachment #{relative_path}: #{e.message}\e[0m"
    end

    def clean_orphans
      # Collect all vault note paths
      vault_notes = Set.new
      Find.find(@config.vault_path) do |path|
        if File.directory?(path)
          basename = File.basename(path)
          Find.prune if @config.ignore_patterns.include?(basename)
          next
        end
        next unless File.extname(path).downcase == MARKDOWN_EXTENSION
        relative = relative_vault_path(path)
        vault_notes << relative if relative
      end

      # Scan _notes/ and remove anything not in vault
      notes_dir = @config.notes_dir
      return unless File.directory?(notes_dir)

      Find.find(notes_dir) do |path|
        next if File.directory?(path)
        relative = path.sub("#{notes_dir}/", "")
        next unless File.extname(path).downcase == MARKDOWN_EXTENSION

        unless vault_notes.include?(relative)
          File.delete(path)
          @stats[:cleaned] += 1
          @state.remove_file(relative)
        end
      end

      # Clean empty directories
      Dir.glob(File.join(notes_dir, "**", "*")).reverse_each do |dir|
        Dir.rmdir(dir) if File.directory?(dir) && Dir.empty?(dir)
      end

      # Clean orphaned attachments
      vault_attachments = Set.new
      Find.find(@config.vault_path) do |path|
        if File.directory?(path)
          basename = File.basename(path)
          Find.prune if @config.ignore_patterns.include?(basename)
          next
        end
        next if File.extname(path).downcase == MARKDOWN_EXTENSION
        relative = relative_vault_path(path)
        next unless relative && @config.attachment_extensions.include?(File.extname(path).downcase.sub(".", ""))
        vault_attachments << relative
      end

      att_dir = @config.attachments_dir
      if File.directory?(att_dir)
        Find.find(att_dir) do |path|
          next if File.directory?(path)
          relative = path.sub("#{att_dir}/", "")
          unless vault_attachments.include?(relative)
            File.delete(path)
            @stats[:cleaned] += 1
            @state.remove_file("att:#{relative}")
          end
        end
        Dir.glob(File.join(att_dir, "**", "*")).reverse_each do |dir|
          Dir.rmdir(dir) if File.directory?(dir) && Dir.empty?(dir)
        end
      end
    end

    def detect_changes
      vault_files = collect_vault_files
      changes = []

      vault_files.each do |rel_path|
        full_path = File.join(@config.vault_path, rel_path)
        current_hash = file_hash(full_path)
        is_attachment = !rel_path.end_with?(MARKDOWN_EXTENSION)
        state_key = is_attachment ? "att:#{rel_path}" : rel_path

        if @state.file_hash(state_key) != current_hash
          changes << { path: rel_path, type: is_attachment ? :attachment : :note }
        end
      end

      changes
    end

    def save_state
      @state.save
    end

    # ── Front Matter Normalization ──────────────────────────

    def normalize_frontmatter(content, source_path, relative_path)
      return content unless @config.auto_frontmatter

      if content.match?(/\A---\s*\n/)
        # Has front matter — ensure title and date exist
        parts = content.split(/\A---\s*\n/, 2)
        if parts.length < 2
          return generate_default_frontmatter(relative_path) + content
        end

        yaml_part, rest = parts[1].split(/\n---\s*\n/, 2)
        return content unless rest

        begin
          fm = YAML.safe_load(yaml_part, permitted_classes: [Date]) || {}
        rescue Psych::SyntaxError
          return content
        end

        needs_update = false

        unless fm["title"]
          fm["title"] = title_from_path(relative_path)
          needs_update = true
        end

        unless fm["date"]
          fm["date"] = File.mtime(source_path).strftime("%Y-%m-%d")
          needs_update = true
        end

        if needs_update
          "---\n#{fm.to_yaml.sub(/\A---\n/, "").chomp}\n---\n#{rest}"
        else
          content
        end
      else
        # No front matter — generate default
        generate_default_frontmatter(relative_path) + content
      end
    end

    def generate_default_frontmatter(relative_path)
      title = title_from_path(relative_path)
      date = Time.now.strftime("%Y-%m-%d")

      <<~FRONTMATTER
        ---
        title: "#{title}"
        date: #{date}
        tags: []
        ---

      FRONTMATTER
    end

    def title_from_path(relative_path)
      basename = File.basename(relative_path, MARKDOWN_EXTENSION)
      basename.gsub(/[-_]/, " ").split.map(&:capitalize).join(" ")
    end

    # ── Helpers ─────────────────────────────────────────────

    def relative_vault_path(full_path)
      relative = full_path.sub(@config.vault_path + "/", "")
      return nil if relative == full_path
      relative
    end

    def file_hash(path)
      Digest::MD5.hexdigest(File.read(path))
    rescue StandardError
      nil
    end
  end
end

# ── CLI Entry Point ──────────────────────────────────────────

if __FILE__ == $PROGRAM_NAME
  # Show help
  if ARGV.include?("--help") || ARGV.include?("-h")
    puts <<~HELP
      Obsidian Vault Sync for Jekyll

      Usage:
        ruby sync.rb [command] [vault_path] [options]

      Commands:
        sync      Sync vault to _notes/ (default)
        watch     Continuous sync (polls for changes)
        status    Show new/modified/deleted files
        setup     Install demo notes (when no vault configured)

      Options:
        --interval N  Polling interval in seconds (default: 2)
        --help, -h    Show this help

      Examples:
        ruby sync.rb                         # Sync using vault_path from _config.yml
        ruby sync.rb /path/to/vault          # Sync with explicit vault path
        ruby sync.rb watch                   # Watch mode with config vault path
        ruby sync.rb watch /path/to/vault    # Watch mode with explicit path
        ruby sync.rb status                  # Show sync status
    HELP
    exit 0
  end

  config = ObsidianSync::Config.new

  # Parse command and optional vault path from args
  command = "sync"
  args = ARGV.dup

  # Extract command if first arg is a known command
  if %w[sync watch status setup].include?(args[0])
    command = args.shift
  end

  # Remaining args: first non-flag is vault path
  vault_override = args.find { |a| !a.start_with?("-") }

  # Watch interval option
  interval = 2
  if idx = args.index("--interval")
    interval = (args[idx + 1] || 2).to_i
  end

  config.vault_path = vault_override if vault_override

  syncer = ObsidianSync::Syncer.new(config)

  case command
  when "sync"
    syncer.sync
  when "watch"
    syncer.watch(interval)
  when "status"
    syncer.status
  when "setup"
    syncer.install_demo_notes
  else
    $stderr.puts "Unknown command: #{command}"
    $stderr.puts "Usage: ruby sync.rb [sync|watch|status|setup] [vault_path] [--interval N]"
    exit 1
  end
end
