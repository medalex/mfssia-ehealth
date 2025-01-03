import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import * as DKG from 'dkg.js';
import { IAssetResponse, IBlockchain } from '../../interfaces/IAssetResponse';

@Injectable()
export class DKGConnectorService {
  // eslint-disable-next-line prettier/prettier  
  private readonly dkgHostname: string;
  private readonly dkgPort: string;
  private readonly dataProviderWallet: string;
  private readonly walletPublicKey: string;
  private readonly walletPrivateKey: string;
  private readonly blockchain: IBlockchain;

  public readonly dkgInstance: DKG;
  

  constructor(private configService: ConfigService) {
    this.dkgHostname = this.configService.get<string>('dkg.hostname');
    this.dkgPort = this.configService.get<string>('dkg.port');
    this.dataProviderWallet = this.configService.get<string>('dkg.dataProviderWallet');
    this.walletPublicKey = this.configService.get<string>('wallet.publicKey');
    this.walletPrivateKey = this.configService.get<string>('wallet.privateKey');
    
    this.blockchain = {
      name: 'otp:20430',
      publicKey: this.walletPublicKey,
      privateKey: this.walletPrivateKey,
      hubContract: "0xBbfF7Ea6b2Addc1f38A0798329e12C08f03750A6",
      rpc: "https://lofar-testnet.origin-trail.network",
      gasPrice: "1000000",
      transactionPollingTimeout: "600"            
    };

  
    
    this.dkgInstance = new DKG({
      endpoint: this.dkgHostname,
      port: this.dkgPort,
      useSSL: false,
      loglevel: 'trace',
      blockchain: this.blockchain,
      maxNumberOfRetries: 30,
      frequency: 2,
      contentType: 'all',
      environment: "testnet"
    });
  }

  async getDkgNode(): Promise<any> {
    try {
      const responseBody = await this.dkgInstance.node.info();
      return JSON.stringify(responseBody, null, 2);
    } catch (error) {
      throw new Error(error);
    }
  }
  async createAssetOnDKG(assetData: Record<string, string> | any,): Promise<IAssetResponse | any> {
    console.log({ assetData: JSON.stringify(assetData) });
    console.log({ blockchain: JSON.stringify(this.blockchain) });
    
    try {
      //const ethers = require("ethers");

      const response = await this.dkgInstance.asset.create({public: assetData}, {epochsNum: 2});
      console.log({ response });
 
      return response;
    } catch (error) {
      console.trace(error);
      throw new Error(error);
    }
  }

  async readAnAssetFromDKG(UAL: string) {
    try {
      console.log({ UAL });
      const response = await this.dkgInstance.asset.get(UAL, {
        validate: true,
        commitOffset: 0,
        maxNumberOfRetries: 5,
        blockchain: this.blockchain
      });
      console.log({ response: response });     
      console.log("============================")
      console.log(JSON.stringify(response, null, 2));
      
      return response;
    } catch (error) {
      console.trace(error);
      throw new Error(error);
    }
  }

  async updateAnAssetOnDKG(Ual: string) {
    try {
      const { UAL } = await this.dkgInstance.asset.update(
        Ual,
        {
          '@context': 'https://schema.org',
          '@type': 'Product',
          description:
            '0.7 cubic feet countertop microwave. Has six preset cooking categories and convenience features like Add-A-Minute and Child Lock.',
          name: 'Kenmore Black 17" Microwave',
          image: 'kenmore-microwave-17in.jpg',
        },
        {
          visibility: 'public',
          holdingTimeInYears: 1,
          tokenAmount: 10,
          blockchain: this.blockchain,
        },
      );

      return UAL;
    } catch (error) {
      throw new Error(error);
    }
  }  
}
