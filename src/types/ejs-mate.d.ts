// Type declaration for ejs-mate (no official @types package available)
declare module 'ejs-mate' {
  import { RequestHandler } from 'express';
  const ejsMate: (...args: any[]) => any;
  export = ejsMate;
}
