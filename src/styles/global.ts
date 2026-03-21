import { createGlobalStyle } from "styled-components";
import { designTokens } from "./tokens";

const t = designTokens;

export const GlobalStyle = createGlobalStyle`
  :root {
    --color-bg: ${t.color.background};
    --color-bg-accent: ${t.color.backgroundAccent};
    --color-surface: ${t.color.surface};
    --color-surface-muted: ${t.color.surfaceMuted};
    --color-surface-glass: ${t.color.surfaceGlass};
    --color-top-region-bg: ${t.color.topRegionBg};
    --color-top-region-bg-end: ${t.color.topRegionBgEnd};
    --color-top-region-text: ${t.color.topRegionText};
    --color-top-region-text-muted: ${t.color.topRegionTextMuted};
    --color-top-region-border: ${t.color.topRegionBorder};
    --color-text-primary: ${t.color.textPrimary};
    --color-text-secondary: ${t.color.textSecondary};
    --color-text-tertiary: ${t.color.textTertiary};
    --color-border: ${t.color.border};
    --color-border-strong: ${t.color.borderStrong};
    --color-primary: ${t.color.primary};
    --color-primary-hover: ${t.color.primaryHover};
    --color-primary-soft: ${t.color.primarySoft};
    --color-success: ${t.color.success};
    --color-warning: ${t.color.warning};
    --color-danger: ${t.color.danger};
    --color-focus-ring: ${t.color.focusRing};

    --space-4: ${t.spacing[4]};
    --space-8: ${t.spacing[8]};
    --space-12: ${t.spacing[12]};
    --space-16: ${t.spacing[16]};
    --space-24: ${t.spacing[24]};
    --space-32: ${t.spacing[32]};
    --space-40: ${t.spacing[40]};
    --space-48: ${t.spacing[48]};

    --radius-8: ${t.radius[8]};
    --radius-12: ${t.radius[12]};
    --radius-16: ${t.radius[16]};
    --radius-20: ${t.radius[20]};

    --shadow-1: ${t.shadow.level1};
    --shadow-2: ${t.shadow.level2};
    --shadow-3: ${t.shadow.level3};

    --font-32: ${t.typography[32].size};
    --font-24: ${t.typography[24].size};
    --font-20: ${t.typography[20].size};
    --font-16: ${t.typography[16].size};
    --font-14: ${t.typography[14].size};
    --font-12: ${t.typography[12].size};

    --lh-32: ${t.typography[32].lineHeight};
    --lh-24: ${t.typography[24].lineHeight};
    --lh-20: ${t.typography[20].lineHeight};
    --lh-16: ${t.typography[16].lineHeight};
    --lh-14: ${t.typography[14].lineHeight};
    --lh-12: ${t.typography[12].lineHeight};
  }

  * {
    box-sizing: border-box;
  }

  html,
  body {
    margin: 0;
    font-family: "Source Han Sans SC", "PingFang SC", "Microsoft YaHei", "Segoe UI", sans-serif;
    background: var(--color-bg);
    min-height: 100vh;
    color: var(--color-text-primary);
    font-size: var(--font-14);
    line-height: var(--lh-14);
    letter-spacing: 0.1px;
    font-feature-settings: "tnum" 1;
    text-rendering: optimizeLegibility;
    -webkit-font-smoothing: auto;
  }

  #root {
    min-height: 100vh;
  }

  *::-webkit-scrollbar {
    width: 10px;
    height: 10px;
  }

  *::-webkit-scrollbar-thumb {
    border-radius: 999px;
    background: rgba(28, 36, 56, 0.24);
  }

  *::-webkit-scrollbar-thumb:hover {
    background: rgba(28, 36, 56, 0.4);
  }

  .ant-layout {
    background: transparent;
  }

  .ant-layout-sider,
  .ant-layout-header,
  .ant-layout-content {
    background: transparent;
  }

  .type-32 {
    font-size: var(--font-32);
    line-height: var(--lh-32);
    font-weight: ${t.typography[32].weight};
  }

  .type-24 {
    font-size: var(--font-24);
    line-height: var(--lh-24);
    font-weight: ${t.typography[24].weight};
  }

  .type-20 {
    font-size: var(--font-20);
    line-height: var(--lh-20);
    font-weight: ${t.typography[20].weight};
  }

  .type-16 {
    font-size: var(--font-16);
    line-height: var(--lh-16);
    font-weight: ${t.typography[16].weight};
  }

  .type-14 {
    font-size: var(--font-14);
    line-height: var(--lh-14);
    font-weight: ${t.typography[14].weight};
  }

  .type-12 {
    font-size: var(--font-12);
    line-height: var(--lh-12);
    font-weight: ${t.typography[12].weight};
  }

  .card-info {
    margin: 0;
    font-size: var(--font-14);
    line-height: var(--lh-14);
    color: var(--color-text-secondary);
    display: -webkit-box;
    -webkit-line-clamp: 3;
    -webkit-box-orient: vertical;
    overflow: hidden;
    text-overflow: ellipsis;
  }

  .ant-typography.ant-typography-secondary,
  .ant-typography-caption {
    color: var(--color-text-secondary) !important;
    font-weight: 500;
    letter-spacing: 0.1px;
    opacity: 1;
  }

  .ant-statistic-title {
    color: var(--color-text-secondary) !important;
    font-weight: 500;
  }

  .ant-statistic-content,
  .ant-statistic-content-value {
    color: var(--color-text-primary) !important;
  }

  .ant-form-item-label > label {
    color: var(--color-text-primary) !important;
    font-weight: 500;
  }

  .ant-table-thead > tr > th {
    color: var(--color-text-primary) !important;
    font-weight: 600;
    background: #f8fafc !important;
  }

  .ant-table-tbody > tr > td {
    color: var(--color-text-primary);
  }

  .ant-input::placeholder,
  .ant-select-selection-placeholder {
    color: var(--color-text-tertiary) !important;
    opacity: 0.9;
  }

  .ant-card {
    background: var(--color-surface);
    border-color: var(--color-border);
    box-shadow: var(--shadow-1);
    transition: border-color 120ms ease, background-color 120ms ease;
  }

  .ant-card:hover {
    border-color: var(--color-border-strong);
    box-shadow: 0 6px 18px rgba(15, 23, 42, 0.06);
  }

  .ant-menu-light {
    background: transparent;
  }

  .ant-menu-light .ant-menu-item {
    margin-inline: 6px;
  }

  .ant-menu-light .ant-menu-item-selected {
    box-shadow: inset 0 0 0 1px rgba(22, 119, 255, 0.24);
  }

  .ant-menu-light .ant-menu-item-selected::after {
    display: none;
  }

  .ant-menu-light .ant-menu-item .ant-menu-item-icon,
  .ant-menu-light .ant-menu-submenu-title .ant-menu-item-icon,
  .ant-btn .anticon {
    color: currentColor;
  }

  .ant-btn,
  .ant-input,
  .ant-select-selector,
  .ant-menu-item,
  .ant-tag {
    transition: color 120ms ease, background-color 120ms ease, border-color 120ms ease;
  }

  .ant-btn-primary {
    background: var(--color-primary);
    border-color: var(--color-primary);
  }

  .ant-btn-primary:hover {
    background: var(--color-primary-hover) !important;
    border-color: var(--color-primary-hover) !important;
  }

  .ant-alert-warning {
    border: 1px solid #ffd591;
    background: #fff7e6;
  }

  .ant-alert-warning .ant-alert-icon,
  .ant-alert-warning .ant-alert-message {
    color: #ad4e00;
  }

  .ant-alert-warning .ant-alert-description {
    color: #8c5200;
  }

  .ant-tag-warning,
  .ant-tag-gold,
  .ant-tag-orange {
    color: #ad4e00;
    border-color: #ffd591;
    background: #fff7e6;
  }

  .ant-message .ant-message-notice-content .ant-message-custom-content.ant-message-warning {
    color: #ad4e00;
  }

  .ant-select-focused .ant-select-selector,
  .ant-input:focus,
  .ant-input-affix-wrapper:focus,
  .ant-input-affix-wrapper-focused,
  .ant-input-number-focused,
  .ant-picker-focused,
  .ant-select-open .ant-select-selector,
  .ant-btn:focus-visible,
  .ant-menu-item:focus-visible,
  a:focus-visible {
    box-shadow: 0 0 0 var(--space-4) var(--color-focus-ring);
  }

  a {
    color: var(--color-primary);
  }

  @media (prefers-reduced-motion: reduce) {
    *,
    *::before,
    *::after {
      animation-duration: 1ms !important;
      animation-iteration-count: 1 !important;
      transition-duration: 1ms !important;
      scroll-behavior: auto !important;
    }
  }
`;
