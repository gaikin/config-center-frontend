export const designTokens = {
  color: {
    background: "#f5f7fb",
    backgroundAccent: "#eef2f7",
    surface: "#ffffff",
    surfaceMuted: "#f5f7fa",
    surfaceGlass: "rgba(255, 255, 255, 0.96)",
    topRegionBg: "#ffffff",
    topRegionBgEnd: "#ffffff",
    topRegionText: "#1f2937",
    topRegionTextMuted: "rgba(76, 86, 106, 0.86)",
    topRegionBorder: "rgba(226, 232, 240, 0.95)",
    textPrimary: "#1f2937",
    textSecondary: "#4c566a",
    textTertiary: "#7a8599",
    border: "#e2e8f0",
    borderStrong: "#cbd5e1",
    primary: "#1677ff",
    primaryHover: "#4096ff",
    primarySoft: "rgba(22, 119, 255, 0.12)",
    success: "#2f9e44",
    warning: "#d46b08",
    danger: "#d4380d",
    focusRing: "rgba(22, 119, 255, 0.2)"
  },
  spacing: {
    4: "4px",
    8: "8px",
    12: "12px",
    16: "16px",
    24: "24px",
    32: "32px",
    40: "40px",
    48: "48px"
  },
  radius: {
    8: "6px",
    12: "8px",
    16: "12px",
    20: "14px"
  },
  shadow: {
    level1: "0 1px 2px rgba(15, 23, 42, 0.04), 0 4px 10px rgba(15, 23, 42, 0.05)",
    level2: "0 10px 24px rgba(15, 23, 42, 0.08)",
    level3: "0 16px 36px rgba(15, 23, 42, 0.12)"
  },
  typography: {
    32: { size: "32px", lineHeight: "40px", weight: 600 },
    24: { size: "24px", lineHeight: "32px", weight: 600 },
    20: { size: "20px", lineHeight: "28px", weight: 600 },
    16: { size: "16px", lineHeight: "24px", weight: 500 },
    14: { size: "14px", lineHeight: "20px", weight: 400 },
    12: { size: "12px", lineHeight: "16px", weight: 400 }
  }
} as const;

export const antdThemeToken = {
  colorPrimary: designTokens.color.primary,
  colorPrimaryHover: designTokens.color.primaryHover,
  colorInfo: designTokens.color.primary,
  colorText: designTokens.color.textPrimary,
  colorTextSecondary: designTokens.color.textSecondary,
  colorTextDescription: designTokens.color.textTertiary,
  colorBgBase: designTokens.color.background,
  colorBgLayout: designTokens.color.background,
  colorBgContainer: designTokens.color.surface,
  colorFillAlter: designTokens.color.surfaceMuted,
  colorBorderSecondary: designTokens.color.border,
  colorBorder: designTokens.color.border,
  controlOutline: designTokens.color.focusRing,
  colorSuccess: designTokens.color.success,
  colorWarning: designTokens.color.warning,
  colorError: designTokens.color.danger,
  borderRadius: 8,
  borderRadiusSM: 6,
  borderRadiusLG: 12,
  lineWidth: 1,
  boxShadow: designTokens.shadow.level2,
  boxShadowSecondary: designTokens.shadow.level1,
  fontSize: 14,
  fontSizeSM: 12,
  fontSizeLG: 16,
  fontSizeHeading1: 32,
  fontSizeHeading2: 24,
  fontSizeHeading3: 20,
  fontSizeHeading4: 16,
  fontSizeHeading5: 14,
  lineHeight: 20 / 14,
  lineHeightSM: 16 / 12,
  lineHeightLG: 24 / 16,
  lineHeightHeading1: 40 / 32,
  lineHeightHeading2: 32 / 24,
  lineHeightHeading3: 28 / 20,
  lineHeightHeading4: 24 / 16,
  lineHeightHeading5: 20 / 14
} as const;

export const antdComponentTokens = {
  Layout: {
    bodyBg: designTokens.color.background,
    headerBg: "transparent",
    siderBg: "transparent",
    triggerBg: designTokens.color.surface
  },
  Card: {
    borderRadiusLG: 12,
    boxShadow: designTokens.shadow.level1,
    bodyPadding: 16,
    headerPadding: 16,
    headerHeight: 48
  },
  Menu: {
    itemHeight: 40,
    itemPaddingInline: 12,
    itemMarginInline: 8,
    itemMarginBlock: 5,
    itemBorderRadius: 6,
    activeBarHeight: 0,
    itemColor: designTokens.color.textSecondary,
    itemHoverBg: "rgba(22, 119, 255, 0.08)",
    itemHoverColor: designTokens.color.primaryHover,
    itemSelectedBg: "rgba(22, 119, 255, 0.14)",
    itemSelectedColor: designTokens.color.primary
  },
  Button: {
    controlHeight: 40,
    borderRadius: 6,
    paddingInline: 16,
    fontWeight: 500
  },
  Input: {
    controlHeight: 40,
    borderRadius: 6,
    paddingInline: 12
  },
  Select: {
    controlHeight: 40,
    optionHeight: 40
  },
  Drawer: {
    colorBgElevated: designTokens.color.surface
  },
  Typography: {
    titleMarginTop: 24,
    titleMarginBottom: 16
  }
} as const;
