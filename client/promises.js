if (typeof Promise === 'undefined')
  throw new Exception("Implement promise polyfill");

// For browsers without ES6 promises, load polyfill
