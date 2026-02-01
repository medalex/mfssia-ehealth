import { createHash } from 'crypto';

export function generateSha256Hash(price:number, delivery_date:number, quantity:number, product_name:string) {

    const strings = [`${price}`, `${quantity}`, `${delivery_date}`, `${product_name}`];
    const concatenatedResults = strings.join(';');
    const sanitized = concatenatedResults.replace(/(^"|"$)/g, '');
    const hashResult = createHash('sha256').update(sanitized).digest('hex');
  
    return hashResult;
  }

  export function generatePatientDataHash(
      givenName: string, 
      familyName: string, 
      birthDate: string, 
      digitalSignature: string, 
      gender: string, 
      phoneNo: string) {
    const strings = [`${givenName.toLocaleLowerCase()}`, `${familyName.toLocaleLowerCase()}`, `${birthDate}`, `${digitalSignature.toLocaleLowerCase()}`, `${gender.toLocaleLowerCase()}`, `${phoneNo}`];
    const concatenatedResults = strings.join(';');
    const sanitized = concatenatedResults.replace(/(^"|"$)/g, '');

    return createHash('sha256').update(sanitized).digest('hex');  
  }