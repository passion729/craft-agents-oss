/**
 * AppearanceSettingsPage
 *
 * Visual customization settings: theme mode, color theme, typography,
 * workspace-specific theme overrides, and CLI tool icon mappings.
 */

import { useState, useEffect, useMemo, useCallback } from 'react'
import { useTranslation } from 'react-i18next'
import { LANGUAGES, type LanguageCode } from '@craft-agent/shared/i18n'
import type { ColumnDef } from '@tanstack/react-table'
import { PanelHeader } from '@/components/app-shell/PanelHeader'
import { ScrollArea } from '@/components/ui/scroll-area'
import { HeaderMenu } from '@/components/ui/HeaderMenu'
import { EditPopover, EditButton, getEditConfig } from '@/components/ui/EditPopover'
import { useTheme } from '@/context/ThemeContext'
import { useAppShellContext } from '@/context/AppShellContext'
import { routes } from '@/lib/navigate'
import { Input } from '@/components/ui/input'
import { Monitor, Sun, Moon } from 'lucide-react'
import type { DetailsPageMeta } from '@/lib/navigation-registry'
import type { BodyFontPreset, MonoFontPreset, ToolIconMapping } from '../../../shared/types'

import {
  SettingsSection,
  SettingsCard,
  SettingsRow,
  SettingsSegmentedControl,
  SettingsMenuSelect,
  SettingsToggle,
} from '@/components/settings'
import * as storage from '@/lib/local-storage'
import { useWorkspaceIcons } from '@/hooks/useWorkspaceIcon'
import { Info_DataTable, SortableHeader } from '@/components/info/Info_DataTable'
import { Info_Badge } from '@/components/info/Info_Badge'
import type { PresetTheme } from '@config/theme'

export const meta: DetailsPageMeta = {
  navigator: 'settings',
  slug: 'appearance',
}

// ============================================
// Tool Icons Table
// ============================================

/**
 * Column definitions for the tool icon mappings table.
 * Shows a preview icon, tool name, and the CLI commands that trigger it.
 */
const getToolIconColumns = (t: (key: string) => string): ColumnDef<ToolIconMapping>[] => [
  {
    accessorKey: 'iconDataUrl',
    header: () => <span className="p-1.5 pl-2.5">{t("settings.appearance.iconHeader")}</span>,
    cell: ({ row }) => (
      <div className="p-1.5 pl-2.5">
        <img
          src={row.original.iconDataUrl}
          alt={row.original.displayName}
          className="w-5 h-5 object-contain"
        />
      </div>
    ),
    size: 60,
    enableSorting: false,
  },
  {
    accessorKey: 'displayName',
    header: ({ column }) => <SortableHeader column={column} title={t("settings.appearance.toolHeader")} />,
    cell: ({ row }) => (
      <div className="p-1.5 pl-2.5 font-medium">
        {row.original.displayName}
      </div>
    ),
    size: 150,
  },
  {
    accessorKey: 'commands',
    header: () => <span className="p-1.5 pl-2.5">{t("settings.appearance.commandsHeader")}</span>,
    cell: ({ row }) => (
      <div className="p-1.5 pl-2.5 flex flex-wrap gap-1">
        {row.original.commands.map(cmd => (
          <Info_Badge key={cmd} color="muted" className="font-mono">
            {cmd}
          </Info_Badge>
        ))}
      </div>
    ),
    meta: { fillWidth: true },
    enableSorting: false,
  },
]

// ============================================
// Main Component
// ============================================

export default function AppearanceSettingsPage() {
  const { t, i18n } = useTranslation()
  const toolIconColumns = useMemo(() => getToolIconColumns(t), [t])

  const {
    mode,
    setMode,
    colorTheme,
    setColorTheme,
    bodyFontPreset,
    setBodyFontPreset,
    bodyFontCustom,
    setBodyFontCustom,
    monoFontPreset,
    setMonoFontPreset,
    monoFontCustom,
    setMonoFontCustom,
    baseFontSize,
    setBaseFontSize,
    activeWorkspaceId,
    setWorkspaceColorTheme,
    themeLoadError,
    themeResolvedFrom,
  } = useTheme()
  const { workspaces } = useAppShellContext()

  const [baseFontSizeInput, setBaseFontSizeInput] = useState(String(baseFontSize))
  const [baseFontSizeError, setBaseFontSizeError] = useState<string | null>(null)
  const [bodyFontCustomDraft, setBodyFontCustomDraft] = useState(bodyFontCustom)
  const [monoFontCustomDraft, setMonoFontCustomDraft] = useState(monoFontCustom)

  useEffect(() => {
    setBaseFontSizeInput(String(baseFontSize))
    setBaseFontSizeError(null)
  }, [baseFontSize])

  useEffect(() => {
    setBodyFontCustomDraft(bodyFontCustom)
  }, [bodyFontCustom])

  useEffect(() => {
    setMonoFontCustomDraft(monoFontCustom)
  }, [monoFontCustom])

  // Fetch workspace icons as data URLs (file:// URLs don't work in renderer)
  const workspaceIconMap = useWorkspaceIcons(workspaces)

  // Preset themes for the color theme dropdown
  const [presetThemes, setPresetThemes] = useState<PresetTheme[]>([])

  // Per-workspace theme overrides (workspaceId -> themeId or undefined)
  const [workspaceThemes, setWorkspaceThemes] = useState<Record<string, string | undefined>>({})

  // Tool icon mappings loaded from main process
  const [toolIcons, setToolIcons] = useState<ToolIconMapping[]>([])

  // Resolved path to tool-icons.json (needed for EditPopover and "Edit File" action)
  const [toolIconsJsonPath, setToolIconsJsonPath] = useState<string | null>(null)

  // Connection icon visibility toggle
  const [showConnectionIcons, setShowConnectionIcons] = useState(() =>
    storage.get(storage.KEYS.showConnectionIcons, true)
  )
  const handleConnectionIconsChange = useCallback((checked: boolean) => {
    setShowConnectionIcons(checked)
    storage.set(storage.KEYS.showConnectionIcons, checked)
  }, [])

  // Rich tool descriptions toggle (persisted in config.json, read by SDK subprocess)
  const [richToolDescriptions, setRichToolDescriptions] = useState(true)
  useEffect(() => {
    window.electronAPI?.getRichToolDescriptions?.().then(setRichToolDescriptions)
  }, [])
  const handleRichToolDescriptionsChange = useCallback(async (checked: boolean) => {
    setRichToolDescriptions(checked)
    await window.electronAPI?.setRichToolDescriptions?.(checked)
  }, [])

  // Load preset themes on mount
  useEffect(() => {
    const loadThemes = async () => {
      if (!window.electronAPI) {
        setPresetThemes([])
        return
      }
      try {
        const themes = await window.electronAPI.loadPresetThemes()
        setPresetThemes(themes)
      } catch (error) {
        console.error('Failed to load preset themes:', error)
        setPresetThemes([])
      }
    }
    loadThemes()
  }, [])

  // Load workspace themes on mount
  useEffect(() => {
    const loadWorkspaceThemes = async () => {
      if (!window.electronAPI?.getAllWorkspaceThemes) return
      try {
        const themes = await window.electronAPI.getAllWorkspaceThemes()
        setWorkspaceThemes(themes)
      } catch (error) {
        console.error('Failed to load workspace themes:', error)
      }
    }
    loadWorkspaceThemes()
  }, [])

  // Load tool icon mappings and resolve the config file path on mount
  useEffect(() => {
    const load = async () => {
      if (!window.electronAPI) return
      try {
        const [mappings, homeDir] = await Promise.all([
          window.electronAPI.getToolIconMappings(),
          window.electronAPI.getHomeDir(),
        ])
        setToolIcons(mappings)
        setToolIconsJsonPath(`${homeDir}/.craft-agent/tool-icons/tool-icons.json`)
      } catch (error) {
        console.error('Failed to load tool icon mappings:', error)
      }
    }
    load()
  }, [])

  // Handler for workspace theme change
  // Uses ThemeContext for the active workspace (immediate visual update) and IPC for other workspaces
  const handleWorkspaceThemeChange = useCallback(
    async (workspaceId: string, value: string) => {
      // 'default' means inherit from app default (null in storage)
      const themeId = value === 'default' ? null : value

      // If changing the current workspace, use context for immediate update
      if (workspaceId === activeWorkspaceId) {
        setWorkspaceColorTheme(themeId)
      } else {
        // For other workspaces, just persist via IPC
        await window.electronAPI?.setWorkspaceColorTheme?.(workspaceId, themeId)
      }

      // Update local state for UI
      setWorkspaceThemes(prev => ({
        ...prev,
        [workspaceId]: themeId ?? undefined
      }))
    },
    [activeWorkspaceId, setWorkspaceColorTheme]
  )

  // Theme options for dropdowns
  const themeOptions = useMemo(() => [
    { value: 'default', label: t("settings.appearance.useDefault") },
    ...presetThemes
      .filter(t => t.id !== 'default')
      .map(t => ({
        value: t.id,
        label: t.theme.name || t.id,
      })),
  ], [presetThemes, t])

  // Get current app default theme label for display (null when using 'default' to avoid redundant "Use Default (Default)")
  const appDefaultLabel = useMemo(() => {
    if (colorTheme === 'default') return null
    const preset = presetThemes.find(t => t.id === colorTheme)
    return preset?.theme.name || colorTheme
  }, [colorTheme, presetThemes])

  const bodyFontOptions = useMemo(() => [
    { value: 'system', label: t("settings.appearance.uiFontSystem") },
    { value: 'inter', label: t("settings.appearance.uiFontInter") },
    { value: 'custom', label: t("settings.appearance.fontCustom") },
  ], [t])

  const monoFontOptions = useMemo(() => [
    { value: 'jetbrains', label: t("settings.appearance.monoFontJetBrains") },
    { value: 'system', label: t("settings.appearance.monoFontSystem") },
    { value: 'custom', label: t("settings.appearance.fontCustom") },
  ], [t])

  const parseAndApplyBaseFontSize = useCallback((raw: string): boolean => {
    const trimmed = raw.trim()
    const parsed = Number(trimmed)
    const isInteger = Number.isInteger(parsed)
    const isInRange = parsed >= 12 && parsed <= 20

    if (!trimmed || !isInteger || !isInRange) {
      setBaseFontSizeError(
        t("settings.appearance.baseFontSizeError", { min: 12, max: 20 })
      )
      return false
    }

    setBaseFontSizeError(null)
    setBaseFontSize(parsed)
    return true
  }, [setBaseFontSize, t])

  return (
    <div className="h-full flex flex-col">
      <PanelHeader
        title={t("settings.appearance.title")}
        actions={<HeaderMenu route={routes.view.settings('appearance')} helpFeature="themes" />}
      />
      <div className="flex-1 min-h-0 mask-fade-y">
        <ScrollArea className="h-full">
          <div className="px-5 py-7 max-w-3xl mx-auto">
            <div className="space-y-8">

              {/* Default Theme */}
              <SettingsSection title={t("settings.appearance.defaultTheme")}>
                <SettingsCard>
                  <SettingsRow label={t("settings.appearance.mode")}>
                    <SettingsSegmentedControl
                      value={mode}
                      onValueChange={setMode}
                      options={[
                        { value: 'system', label: t("settings.appearance.system"), icon: <Monitor className="w-4 h-4" /> },
                        { value: 'light', label: t("settings.appearance.light"), icon: <Sun className="w-4 h-4" /> },
                        { value: 'dark', label: t("settings.appearance.dark"), icon: <Moon className="w-4 h-4" /> },
                      ]}
                    />
                  </SettingsRow>
                  <SettingsRow label={t("settings.appearance.colorTheme")}>
                    <SettingsMenuSelect
                      value={colorTheme}
                      onValueChange={setColorTheme}
                      options={themeOptions}
                    />
                  </SettingsRow>
                  <SettingsRow label={t("settings.appearance.uiFont")}>
                    <SettingsMenuSelect
                      value={bodyFontPreset}
                      onValueChange={(value) => setBodyFontPreset(value as BodyFontPreset)}
                      options={bodyFontOptions}
                    />
                  </SettingsRow>
                  {bodyFontPreset === 'custom' && (
                    <SettingsRow label={t("settings.appearance.uiFontCustom")}>
                      <div className="w-[320px] rounded-md shadow-minimal has-[:focus-visible]:bg-background">
                        <Input
                          value={bodyFontCustomDraft}
                          onChange={(e) => setBodyFontCustomDraft(e.target.value)}
                          onBlur={() => {
                            if (bodyFontCustomDraft !== bodyFontCustom) {
                              setBodyFontCustom(bodyFontCustomDraft)
                            }
                          }}
                          placeholder={t("settings.appearance.fontCustomPlaceholder")}
                          className="bg-muted/50 border-0 shadow-none focus-visible:ring-0 focus-visible:outline-none focus-visible:bg-transparent"
                        />
                      </div>
                    </SettingsRow>
                  )}
                  <SettingsRow label={t("settings.appearance.monoFont")}>
                    <SettingsMenuSelect
                      value={monoFontPreset}
                      onValueChange={(value) => setMonoFontPreset(value as MonoFontPreset)}
                      options={monoFontOptions}
                    />
                  </SettingsRow>
                  {monoFontPreset === 'custom' && (
                    <SettingsRow label={t("settings.appearance.monoFontCustom")}>
                      <div className="w-[320px] rounded-md shadow-minimal has-[:focus-visible]:bg-background">
                        <Input
                          value={monoFontCustomDraft}
                          onChange={(e) => setMonoFontCustomDraft(e.target.value)}
                          onBlur={() => {
                            if (monoFontCustomDraft !== monoFontCustom) {
                              setMonoFontCustom(monoFontCustomDraft)
                            }
                          }}
                          placeholder={t("settings.appearance.fontCustomPlaceholder")}
                          className="bg-muted/50 border-0 shadow-none focus-visible:ring-0 focus-visible:outline-none focus-visible:bg-transparent"
                        />
                      </div>
                    </SettingsRow>
                  )}
                  <SettingsRow
                    label={t("settings.appearance.baseFontSize")}
                    description={baseFontSizeError ?? undefined}
                  >
                    <div className="w-[120px] rounded-md shadow-minimal has-[:focus-visible]:bg-background">
                      <Input
                        value={baseFontSizeInput}
                        inputMode="numeric"
                        onChange={(e) => {
                          const value = e.target.value
                          setBaseFontSizeInput(value)
                          parseAndApplyBaseFontSize(value)
                        }}
                        onBlur={() => {
                          if (!parseAndApplyBaseFontSize(baseFontSizeInput)) {
                            setBaseFontSizeInput(String(baseFontSize))
                            setBaseFontSizeError(null)
                          }
                        }}
                        placeholder={t("settings.appearance.baseFontSizePlaceholder")}
                        className="bg-muted/50 border-0 shadow-none focus-visible:ring-0 focus-visible:outline-none focus-visible:bg-transparent"
                      />
                    </div>
                  </SettingsRow>
                  <SettingsRow label={t("settings.appearance.language")}>
                    <SettingsMenuSelect
                      value={(i18n.resolvedLanguage ?? i18n.language) as LanguageCode}
                      onValueChange={(value) => {
                        i18n.changeLanguage(value)
                        window.electronAPI?.changeLanguage?.(value)
                      }}
                      options={Object.entries(LANGUAGES).map(([code, config]) => ({
                        value: code,
                        label: config.nativeName,
                      }))}
                    />
                  </SettingsRow>
                </SettingsCard>
                {themeLoadError && (
                  <p className="mt-2 text-xs text-info">
                    {t("settings.appearance.themeWarning")} {themeLoadError} ({themeResolvedFrom === 'fallback' ? t("settings.appearance.usingBundledFallback") : t("settings.appearance.usingDefaultTheme")})
                  </p>
                )}
              </SettingsSection>

              {/* Workspace Themes */}
              {workspaces.length > 0 && (
                <SettingsSection
                  title={t("settings.appearance.workspaceThemes")}
                  description={t("settings.appearance.workspaceThemesDesc")}
                >
                  <SettingsCard>
                    {workspaces.map((workspace) => {
                      const wsTheme = workspaceThemes[workspace.id]
                      const hasCustomTheme = wsTheme !== undefined
                      return (
                        <SettingsRow
                          key={workspace.id}
                          label={
                            <div className="flex items-center gap-2">
                              {workspaceIconMap.get(workspace.id) ? (
                                <img
                                  src={workspaceIconMap.get(workspace.id)}
                                  alt=""
                                  className="w-4 h-4 rounded object-cover"
                                />
                              ) : (
                                <div className="w-4 h-4 rounded bg-foreground/10" />
                              )}
                              <span>{workspace.name}</span>
                            </div>
                          }
                        >
                          <SettingsMenuSelect
                            value={hasCustomTheme ? wsTheme : 'default'}
                            onValueChange={(value) => handleWorkspaceThemeChange(workspace.id, value)}
                            options={[
                              { value: 'default', label: appDefaultLabel ? t("settings.appearance.useDefaultWithTheme", { theme: appDefaultLabel }) : t("settings.appearance.useDefault") },
                              ...presetThemes
                                .filter(t => t.id !== 'default')
                                .map(t => ({
                                  value: t.id,
                                  label: t.theme.name || t.id,
                                })),
                            ]}
                          />
                        </SettingsRow>
                      )
                    })}
                  </SettingsCard>
                </SettingsSection>
              )}

              {/* Interface */}
              <SettingsSection title={t("settings.appearance.interface")}>
                <SettingsCard>
                  <SettingsToggle
                    label={t("settings.appearance.connectionIcons")}
                    description={t("settings.appearance.connectionIconsDesc")}
                    checked={showConnectionIcons}
                    onCheckedChange={handleConnectionIconsChange}
                  />
                  <SettingsToggle
                    label={t("settings.appearance.richToolDescriptions")}
                    description={t("settings.appearance.richToolDescriptionsDesc")}
                    checked={richToolDescriptions}
                    onCheckedChange={handleRichToolDescriptionsChange}
                  />
                </SettingsCard>
              </SettingsSection>

              {/* Tool Icons — shows the command → icon mapping used in turn cards */}
              <SettingsSection
                title={t("settings.appearance.toolIcons")}
                description={t("settings.appearance.toolIconsDesc")}
                action={
                  toolIconsJsonPath ? (
                    <EditPopover
                      trigger={<EditButton />}
                      {...getEditConfig('edit-tool-icons', toolIconsJsonPath)}
                      secondaryAction={{
                        label: t("settings.appearance.editFile"),
                        filePath: toolIconsJsonPath,
                      }}
                    />
                  ) : undefined
                }
              >
                <SettingsCard>
                  <Info_DataTable
                    columns={toolIconColumns}
                    data={toolIcons}
                    searchable={{ placeholder: t("settings.appearance.searchTools") }}
                    maxHeight={480}
                    emptyContent={t("settings.appearance.noToolIcons")}
                  />
                </SettingsCard>
              </SettingsSection>

            </div>
          </div>
        </ScrollArea>
      </div>
    </div>
  )
}
