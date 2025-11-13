import { createGlobalStyle } from 'styled-components';

export const GlobalStyle = createGlobalStyle`
  * {
    margin: 0;
    padding: 0;
    box-sizing: border-box;
  }

  body {
    font-family: 'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', 'Roboto',
      'Oxygen', 'Ubuntu', 'Cantarell', 'Fira Sans', 'Droid Sans', 'Helvetica Neue',
      sans-serif;
    -webkit-font-smoothing: antialiased;
    -moz-osx-font-smoothing: grayscale;
    background: linear-gradient(135deg, #eef2ff 0%, #f7f8fb 55%, #ffffff 100%);
    color: #0f172a;
    transition: background 0.3s ease, color 0.3s ease;
  }

  .dark-mode body {
    background: radial-gradient(circle at top, rgba(30, 41, 59, 0.8) 0%, #0b1120 70%);
    color: #e2e8f0;
  }

  #root {
    width: 100%;
    min-height: 100vh;
  }

  code {
    font-family: source-code-pro, Menlo, Monaco, Consolas, 'Courier New',
      monospace;
  }

  /* Scrollbar styling */
  ::-webkit-scrollbar {
    width: 6px;
    height: 6px;
  }

  ::-webkit-scrollbar-track {
    background: rgba(148, 163, 184, 0.2);
  }

  ::-webkit-scrollbar-thumb {
    background: rgba(79, 70, 229, 0.35);
    border-radius: 3px;
  }

  ::-webkit-scrollbar-thumb:hover {
    background: rgba(79, 70, 229, 0.55);
  }

  .dark-mode ::-webkit-scrollbar-track {
    background: rgba(30, 41, 59, 0.7);
  }

  .dark-mode ::-webkit-scrollbar-thumb {
    background: rgba(148, 163, 184, 0.45);
  }

  .dark-mode ::-webkit-scrollbar-thumb:hover {
    background: rgba(148, 163, 184, 0.65);
  }

  /* Screen reader only class */
  .sr-only {
    position: absolute;
    width: 1px;
    height: 1px;
    padding: 0;
    margin: -1px;
    overflow: hidden;
    clip: rect(0, 0, 0, 0);
    white-space: nowrap;
    border-width: 0;
  }

  /* Focus styles for accessibility */
  *:focus-visible {
    outline: 2px solid #3b82f6;
    outline-offset: 2px;
    border-radius: 4px;
  }

  /* Skip to main content link */
  .skip-link {
    position: absolute;
    top: -40px;
    left: 0;
    background: #3b82f6;
    color: white;
    padding: 8px;
    text-decoration: none;
    z-index: 100;
    border-radius: 4px;
  }

  .skip-link:focus {
    top: 0;
  }

  /* Reduce motion for users who prefer it */
  @media (prefers-reduced-motion: reduce) {
    *,
    *::before,
    *::after {
      animation-duration: 0.01ms !important;
      animation-iteration-count: 1 !important;
      transition-duration: 0.01ms !important;
    }
  }
`;

