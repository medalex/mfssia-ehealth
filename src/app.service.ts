import { Injectable } from '@nestjs/common';

@Injectable()
export class AppService {
  getHello(): string {
    return `Welcome to DKG API!, please go to this url http://[::1]:3001/api to view our documentation`;
  }
}
