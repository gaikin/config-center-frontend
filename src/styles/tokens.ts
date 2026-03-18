export const designTokens = {
  color: {
    background: "#edf1f5",
    backgroundAccent: "#e7ecf2",
    surface: "#ffffff",
    surfaceMuted: "#f3f5f8",
    surfaceGlass: "rgba(255, 255, 255, 0.96)",
    topRegionBg: "#121b2a",
    topRegionBgEnd: "#1c293b",
    topRegionText: "#f3f6fa",
    topRegionTextMuted: "rgba(243, 246, 250, 0.92)",
    topRegionBorder: "rgba(255, 255, 255, 0.14)",
    textPrimary: "#1f2937",
    textSecondary: "#334155",
    textTertiary: "#5f6d80",
    border: "#d0d8e3",
    borderStrong: "#a8b4c5",
    primary: "#1f4b7a",
    primaryHover: "#163a5f",
    primarySoft: "rgba(31, 75, 122, 0.1)",
    success: "#2f6f55",
    warning: "#916736",
    danger: "#a34747",
    focusRing: "rgba(31, 75, 122, 0.28)"
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
    level1: "0 1px 2px rgba(15, 23, 42, 0.05), 0 2px 6px rgba(15, 23, 42, 0.06)",
    level2: "0 6px 18px rgba(15, 23, 42, 0.1)",
    level3: "0 12px 28px rgba(15, 23, 42, 0.14)"
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
    itemHoverBg: "rgba(31, 75, 122, 0.08)",
    itemHoverColor: designTokens.color.primaryHover,
    itemSelectedBg: designTokens.color.primarySoft,
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
