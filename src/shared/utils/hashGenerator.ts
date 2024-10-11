import { Console } from 'console';
import { createHash } from 'crypto';

export function generateSha256Hash(price:number, delivery_date:number, quantity:number, product_name:string) {

    const strings = [`${price}`, `${quantity}`, `${delivery_date}`, `${product_name}`];
    const concatenatedResults = strings.join(';');

    console.log(concatenatedResults);

    const sanitized = concatenatedResults.replace(/(^"|"$)/g, '');

    console.log(sanitized);
    const hashResult = createHash('sha256').update(sanitized).digest('hex');
  
    return hashResult;
  }