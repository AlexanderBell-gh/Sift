(function() {
  var saved = localStorage.getItem('sift_theme');
  var dark = saved === 'dark';
  if (dark) document.documentElement.classList.add('dark');
})();
