import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import * as DKG from 'dkg.js';
import { ResultType } from '../../constants/resultType';
import { IAssetResponse, IBlockchain } from '../../interfaces/IAssetResponse';
import { Contract } from './Contract';
import { Gateway } from './Gateway';
import { SecurityLicense } from './SecurityLicense';
import { System } from './System';

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
      name: 'otp::testnet',
      publicKey: this.walletPublicKey,
      privateKey: this.walletPrivateKey,
    };

  
    
    this.dkgInstance = new DKG({
      endpoint: this.dkgHostname,
      port: this.dkgPort,
      useSSL: false,
      loglevel: 'trace',
      blockchain: this.blockchain,
      maxNumberOfRetries: 30,
      frequency: 2,
      contentType: 'all'
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
      const ethers = require("ethers");

      const response = await this.dkgInstance.asset.create({public: assetData}, {
        epochsNum: 2//,
        //visibility: 'public',      
        //tokenAmount: ethers.utils.parseEther('5'),
        //localStore: true
      });
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

  async findSystemByUuid(systemUuid: string):Promise<any> {
    try {
      
      var query = "PREFIX mfssia:<http://schema.org/> "
               + "PREFIX rdf: <http://www.w3.org/1999/02/22-rdf-syntax-ns#> "
               + "SELECT ?s ?p ?o WHERE {"
               + "?s rdf:type mfssia:System . "
               + "?s mfssia:uuid '" + systemUuid + "' . "
               + "?s ?p ?o . "
               + "}";
                
      console.log("Startng query: " + query);
      const result = await this.dkgInstance.graph.query( query, "SELECT");
      
      console.log(JSON.stringify(result));

      let system:System = this.mapSystem(result.data);

    

      return JSON.stringify(system);
    }
    catch (error) {
      throw new Error(error);
    }
  }

  async findContractByUuid(contractUuid: string):Promise<Contract> {
    try {
      
      var query = "PREFIX mfssia:<http://schema.org/> "
               + "PREFIX rdf: <http://www.w3.org/1999/02/22-rdf-syntax-ns#> "
               + "SELECT ?s ?p ?o WHERE {"
               + "?s rdf:type mfssia:Contract . "
               + "?s mfssia:uuid '" + contractUuid + "' . "
               + "?s ?p ?o . "
               + "}";
                
      console.log("Startng query: " + query);

      const result = await this.dkgInstance.graph.query( query, "SELECT");

      Logger.log('queryResult: ' + JSON.stringify(result));

      let contract:Contract = this.mapContract(result.data);

      Logger.log(JSON.stringify(contract));
        
      return contract;
    }
    catch (error) {
      throw new Error(error);
    }
  }

  async findGatewayByUuid(uuid: string):Promise<Gateway> {
    try {
      
      var query = "PREFIX mfssia:<http://schema.org/> "
               + "PREFIX rdf: <http://www.w3.org/1999/02/22-rdf-syntax-ns#> "
               + "SELECT ?s ?p ?o WHERE {"
               + "?s rdf:type mfssia:Gateway . "
               + "?s mfssia:uuid '" + uuid + "' . "
               + "?s ?p ?o . "
               + "}";
                
      console.log("Startng query: " + query);
      const result = await this.dkgInstance.graph.query( query, "SELECT");
      
      console.log(result);

      let gateway:Gateway = this.mapGateway(result.data);
        
      return gateway;
    }
    catch (error) {
      throw new Error(error);
    }
  }

  async findGatewayByProducerAndConsumerNetworks(producerNetwork: string, consumerNetwork: string):Promise<Gateway> {
    try {
      
      const query = "PREFIX mfssia:<http://schema.org/> "
               + "PREFIX rdf: <http://www.w3.org/1999/02/22-rdf-syntax-ns#> "
               + "SELECT ?s ?p ?o WHERE {"
               + "?s rdf:type mfssia:Gateway . "
               + "?s mfssia:producerNetwork '" + producerNetwork + "' . "
               + "?s mfssia:consumerNetwork '" + consumerNetwork + "' . "
               + "?s ?p ?o . "
               + "}";
                
      console.log("Startng query: " + query);
      const result = await this.dkgInstance.graph.query( query, "SELECT");
      
      console.log(result);

      let gateway:Gateway = this.mapGateway(result.data);
        
      return gateway;
    }
    catch (error) {
      throw new Error(error);
    }
  }

  async findSecurityLicenseByUuid(uuid: string):Promise<SecurityLicense> {
    try {
      
      var query = "PREFIX mfssia:<http://schema.org/> "
               + "PREFIX rdf: <http://www.w3.org/1999/02/22-rdf-syntax-ns#> "
               + "SELECT ?s ?p ?o WHERE {"
               + "?s rdf:type mfssia:SecurityLicense . "
               + "?s mfssia:uuid '" + uuid + "' . "
               + "?s ?p ?o . "
               + "}";
                
      console.log("Startng query: " + query);
      const result = await this.dkgInstance.graph.query( query, "SELECT");
      
      console.log(result);

      let securityLicense:SecurityLicense = this.mapSecurityLicense(result.data);
        
      return securityLicense;
    }
    catch (error) {
      throw new Error(error);
    }
  }

  async findSecurityLicenseByOwner(owner: string):Promise<SecurityLicense> {
    try {
      
      var query = "PREFIX mfssia:<http://schema.org/> "
               + "PREFIX rdf: <http://www.w3.org/1999/02/22-rdf-syntax-ns#> "
               + "SELECT ?s ?p ?o WHERE {"
               + "?s rdf:type mfssia:SecurityLicense . "
               + "?s mfssia:owner '" + owner + "' . "
               + "?s ?p ?o . "
               + "}";
                
      console.log("Startng query: " + query);
      const result = await this.dkgInstance.graph.query( query, "SELECT");
      
      console.log(result);

      let securityLicense:SecurityLicense = this.mapSecurityLicense(result.data);
        
      return securityLicense;
    }
    catch (error) {
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

  private mapSystem(sparqlResult: any): System {
    let system = new System();

    console.log(sparqlResult);
    sparqlResult.forEach( (element:any) => {
      element.o = element.o.toString().replace(/\"/g, "");

      if (element.p == "http://schema.org/uuid") {
        system.uuid = element.o;
      }

      if (element.p == "http://schema.org/timestamp") {
          system.timestamp = element.o;
      }

      if (element.p == "http://schema.org/network") {
          system.network = element.o;
      }

      if (element.p == "http://schema.org/contract_id") {
          system.contracts.push(element.o);
      }
      });
    
    return system;
  }

  private mapGateway(sparqlResult:any): Gateway {
    if (!Array.isArray(sparqlResult) || !sparqlResult.length) {
      return null;
    }

    console.log(sparqlResult);
    let gateway = new Gateway();

    sparqlResult.forEach( (element:any) => {
      element.o = element.o.toString().replace(/\"/g, "");

      if (element.p == "http://schema.org/uuid") {
          gateway.uuid = element.o;
      }

      if (element.p == "http://schema.org/timestamp") {
          gateway.timestamp = element.o;
      }

      if (element.p == "http://schema.org/consumerNetwork") {
          gateway.consumerNetwork = element.o;
      }

      if (element.p == "http://schema.org/producerNetwork") {
          gateway.providerNetwork = element.o;
      }
    });

    return gateway;
}

private mapSecurityLicense(sparqlResult:any): SecurityLicense {
  let securityLicense = new SecurityLicense();

  sparqlResult.forEach( (element:any) => {
    element.o = element.o.toString().replace(/\"/g, "");
    if (element.p == "http://schema.org/uuid") {
        securityLicense.uuid = element.o;
    }

    if (element.p == "http://schema.org/timestamp") {
        securityLicense.timestamp = element.o;
    }

    if (element.p == "http://schema.org/issuer") {
        securityLicense.issuer = element.o;
    }

    if (element.p == "http://schema.org/licenseNo") {
        securityLicense.licenseNo = element.o;
    }

    if (element.p == "http://schema.org/systemUUID") {
        securityLicense.systemUUID = element.o;
    }
  
    if (element.p == "http://schema.org/validTill") {
        securityLicense.validTill = element.o;
    }

    if (element.p == "http://schema.org/owner") {
      securityLicense.owner = element.o;
  }
  });
 
  Logger.log(JSON.stringify(securityLicense));

  return securityLicense;
}

  private mapContract(sparqlResult: any): Contract {
    let contract = new Contract();
    
    sparqlResult.forEach( (element:any) => {
      element.o = element.o.toString().replace(/\"/g, "");
      if (element.p == "http://schema.org/uuid") {
          contract.uuid = element.o;
      }

      if (element.p == "http://schema.org/timestamp") {
          contract.timestamp = element.o;
      }
      
      if (element.p == "http://schema.org/contractNo") {
          contract.contractNo = element.o;
      }

      if (element.p == "http://schema.org/consumer_network") {
          contract.consumerNetwork = element.o;
      }

      if (element.p == "http://schema.org/producer_network") {
          contract.producerNetwork = element.o;
      }

      if (element.p == "http://schema.org/price") {
          contract.price = element.o;
      }

      if (element.p == "http://schema.org/quantity") {
          contract.quantity = element.o;
      }

      if (element.p == "http://schema.org/delivery_interval") {
          contract.deliveryInterval = element.o;
      }

      if (element.p == "http://schema.org/product_name") {
          contract.productName = element.o;
      }
    });

    return contract;
  }
}
