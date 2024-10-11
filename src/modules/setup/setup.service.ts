import { Injectable, Logger } from '@nestjs/common';
import * as path from 'path';
import { readFile } from 'fs/promises';
import { getCurrentTimestamp } from '../../shared/utils/timestampUtils';
import { DKGConnectorService } from '../../providers/DKGConnector/dkgConnector.service';
import { IAssetResponse } from '../../interfaces/IAssetResponse';

@Injectable()
export class DKGInitialSetupService {
  constructor(private readonly dkgConnector: DKGConnectorService ) {}

  private insertTimestamp(templateBody: string) {
    let readyData = this.replaceValuesInTemplate(templateBody);

    return this.replaceValuesInTemplate(readyData);
  }

  private replaceValuesInTemplate(templateString: any) {
    Object.values(templateString).forEach(function (value: any) {
      Logger.log("value: " + value);
    });

    Object.entries(templateString).forEach(function(key: any, value: any) {
      templateString["timestamp"] = getCurrentTimestamp();
    })

    Object.values(templateString).forEach(function (value: any) {
      Logger.log("value: " + value);
    });

    return templateString;
  }

  private setValueToTemplate(templateString: string, placehloder: string, value: string) {
    Logger.log("templateString: " + templateString);
    String(templateString).replaceAll(placehloder, value);

    return templateString;

  }

  private async loadTemplate(file) {
    try {
      const templateFilePath = path.join(
        __dirname,
        `../../../src/resources/DKGPublish/${file}`
      );
      const data = JSON.parse(await readFile(`${templateFilePath}`, 'utf8'));

      return data;
    } catch (err) {
      Logger.log(`Error loading file from disk: ${err}`);
    }
  }
  async publishSystem(index: number): Promise<IAssetResponse> {
    console.log(index);
    try {
      let system1AssetLoaded = await this.loadTemplate(`system${index}.json`);

      const insertTimestampJsonAsset = this.insertTimestamp(system1AssetLoaded);
      const assetCreatedOnDKG = await this.dkgConnector.createAssetOnDKG(insertTimestampJsonAsset);
      
      Logger.log({ system1: assetCreatedOnDKG });

      return assetCreatedOnDKG;
    } catch (error) {
      Logger.log(`Error loading file system1 json asset : ${error}`);
    }
  }

  async publishGateway(index: number): Promise<IAssetResponse> {
    try {
      const gatewayAssetLoaded = await this.loadTemplate(`gateway${index}.json`);
      Logger.log({ gateway: gatewayAssetLoaded });
      const insertTimestampJsonAsset = this.insertTimestamp(gatewayAssetLoaded);
      const assetCreatedOnDKG = await this.dkgConnector.createAssetOnDKG(insertTimestampJsonAsset);
      Logger.log({ gateway: assetCreatedOnDKG });

      return assetCreatedOnDKG;
    } catch (error) {
      Logger.log(`Error loading file gateway json asset : ${error}`);
    }
  }

  async publishSecurityLicense(index: number): Promise<IAssetResponse> {
    try {
      const securityLicense1AssetLoaded = await this.loadTemplate(`securityLicense${index}.json`);
      const insertTimestampJsonAsset = this.insertTimestamp(securityLicense1AssetLoaded);
      const assetCreatedOnDKG = await this.dkgConnector.createAssetOnDKG(insertTimestampJsonAsset);
      Logger.log({ license1: assetCreatedOnDKG });

      return assetCreatedOnDKG;
    } catch (error) {
      Logger.log(`Error loading file license1 json asset : ${error}`);
    }
  }

  async publishContract(): Promise<IAssetResponse> {
    try {
      const contractAssetLoadedTemplate = await this.loadTemplate('contract.json');
      const contractWIthTimeStamp = this.insertTimestamp(contractAssetLoadedTemplate);

      console.log("New contract: " + JSON.stringify(contractWIthTimeStamp));

      let existingContract = await this.dkgConnector.findContractByUuid(contractWIthTimeStamp.uuid);

      console.log("Existing contract: " + JSON.stringify(existingContract));

      let result;

      if (existingContract.uuid) {
        result = existingContract;
      } else {
        const assetCreatedOnDKG = await this.dkgConnector.createAssetOnDKG(contractWIthTimeStamp);
        result = assetCreatedOnDKG;
        Logger.log({ contract: assetCreatedOnDKG });
      }

    return result;
    } catch (error) {
      Logger.error(error);
      Logger.log(`Error loading file contract json asset : ${error}`);
    }
  }

  async getNodeInfo(): Promise<any> {
    return await this.dkgConnector.getDkgNode();
  }

  async queryAsset(UAL: string): Promise<any> {
    return await this.dkgConnector.readAnAssetFromDKG(UAL);
  }

  async publishContract2(): Promise<IAssetResponse> {
    try {
      const contractAssetLoadedTemplate = await this.loadTemplate('contract2.json');
      const contractWIthTimeStamp = this.insertTimestamp(contractAssetLoadedTemplate);

      console.log("New contract: " + JSON.stringify(contractWIthTimeStamp));

      let existingContract = await this.dkgConnector.findContractByUuid(contractWIthTimeStamp.uuid);

      console.log("Existing contract: " + JSON.stringify(existingContract));

      let result;

      if (existingContract.uuid) {
        result = existingContract;
      } else {
        const assetCreatedOnDKG = await this.dkgConnector.createAssetOnDKG(contractWIthTimeStamp);
        result = assetCreatedOnDKG;
        Logger.log({ contract: assetCreatedOnDKG });
      }

    return result;
    } catch (error) {
      Logger.error(error);
      Logger.log(`Error loading file contract json asset : ${error}`);
    }
  }

}
