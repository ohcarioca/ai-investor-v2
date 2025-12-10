// Type declaration for bs58 package
// This file provides basic type definitions for the bs58 library
declare module 'bs58' {
  export function encode(buffer: Uint8Array | number[]): string;
  export function decode(string: string): Uint8Array;
}
