import type { GlobalThemeOverrides } from 'naive-ui'

/**
 * Naive UI 主题覆盖 —— 与 variables.css 的两套配色一一对应。
 * 浅色取「明亮精工」(钴蓝 + 珊瑚)，暗色取「暗房质感」(酸性柠檬绿 + 暖橙)。
 */
const FONT = "'Manrope', -apple-system, BlinkMacSystemFont, 'PingFang SC', 'Microsoft YaHei', sans-serif"
const FONT_MONO = "'Space Mono', 'SF Mono', ui-monospace, monospace"

export const lightOverrides: GlobalThemeOverrides = {
  common: {
    primaryColor: '#2b41c8',
    primaryColorHover: '#3a4fda',
    primaryColorPressed: '#1b2da0',
    primaryColorSuppl: '#3a4fda',
    infoColor: '#2b41c8',
    infoColorHover: '#3a4fda',
    infoColorPressed: '#1b2da0',
    successColor: '#2e9c6a',
    successColorHover: '#37b07a',
    warningColor: '#b9831c',
    errorColor: '#df6234',
    errorColorHover: '#e8784f',
    textColorBase: '#15171c',
    textColor1: '#15171c',
    textColor2: '#3c414d',
    textColor3: '#8b909d',
    bodyColor: '#faf9f5',
    cardColor: '#ffffff',
    modalColor: '#ffffff',
    popoverColor: '#ffffff',
    borderColor: '#eae6dc',
    dividerColor: '#eae6dc',
    inputColor: '#ffffff',
    borderRadius: '11px',
    borderRadiusSmall: '8px',
    fontFamily: FONT,
    fontFamilyMono: FONT_MONO,
    fontWeightStrong: '700',
  },
  Card: { borderRadius: '18px', color: '#ffffff' },
  Button: { borderRadiusMedium: '11px', fontWeight: '700' },
  DataTable: { thColor: '#fcfbf8', borderColor: '#eae6dc', thFontWeight: '700' },
  Tag: { borderRadius: '8px' },
}

export const darkOverrides: GlobalThemeOverrides = {
  common: {
    primaryColor: '#a6e22e',
    primaryColorHover: '#c8fb4f',
    primaryColorPressed: '#8fd024',
    primaryColorSuppl: '#c8fb4f',
    infoColor: '#63e6ce',
    successColor: '#63e6ce',
    successColorHover: '#7cecd6',
    warningColor: '#f0b33c',
    errorColor: '#ff7a4d',
    errorColorHover: '#ff9068',
    textColorBase: '#eceef3',
    textColor1: '#eceef3',
    textColor2: '#a7aebd',
    textColor3: '#697084',
    bodyColor: '#0b0c10',
    cardColor: '#15171e',
    modalColor: '#15171e',
    popoverColor: '#1a1d26',
    borderColor: 'rgba(255, 255, 255, 0.12)',
    dividerColor: 'rgba(255, 255, 255, 0.08)',
    inputColor: '#1a1d26',
    borderRadius: '11px',
    borderRadiusSmall: '8px',
    fontFamily: FONT,
    fontFamilyMono: FONT_MONO,
    fontWeightStrong: '700',
  },
  Card: { borderRadius: '18px', color: '#15171e' },
  Button: { borderRadiusMedium: '11px', fontWeight: '700', textColorPrimary: '#10130a' },
  DataTable: { thColor: 'rgba(255,255,255,0.02)', borderColor: 'rgba(255,255,255,0.08)', thFontWeight: '700' },
  Tag: { borderRadius: '8px' },
}
