/**
 * @file Value transformer
 * @description Basic data conversion
 * @module transformer/value
 */
/* eslint-disable prettier/prettier */
 import { isNumberString, isNumber, isDateString } from 'class-validator'

 export function unknowToNumber(value: unknown): number | unknown {
   return isNumberString(value) ? Number(value) : value
 }
 
 export function numberToBoolean(value: number): boolean | number {
   return isNumber(value, {
     allowNaN: false,
     allowInfinity: false,
   })
     ? Boolean(value)
     : value
 }
 
 // https://www.progress.com/blogs/understanding-iso-8601-date-and-time-format
 export function unknowToDate(value: unknown): Date | unknown {
   return isDateString(value) ? new Date(value as string) : value
 }
 