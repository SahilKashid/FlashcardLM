// This file must be imported before any other imports in the application entry point
// to ensure it catches warnings emitted during module initialization.

if (typeof window !== 'undefined') {
  const originalWarn = console.warn;
  const originalError = console.error;

  const shouldSuppress = (args: any[]) => {
    // Check all arguments for the specific KaTeX warning message
    return args.some(arg => 
      typeof arg === 'string' && 
      (arg.includes("KaTeX doesn't work in quirks mode") || 
       arg.includes("Make sure your website has a suitable doctype"))
    );
  };

  console.warn = (...args: any[]) => {
    if (shouldSuppress(args)) return;
    originalWarn.apply(console, args);
  };

  console.error = (...args: any[]) => {
    if (shouldSuppress(args)) return;
    originalError.apply(console, args);
  };
}

export {};
