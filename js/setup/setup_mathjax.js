window.MathJax = {
  tex: {
    inlineMath: [['$', '$'], ['\\(', '\\)']],
    displayMath: [['$$', '$$'], ['\\[', '\\]']],
    processEscapes: true,
    processEnvironments: true
  },
  startup: {
    ready: () => {
      console.log('MathJax is ready!');
      MathJax.startup.defaultReady();
    }
  }
};