import { Injectable, Logger } from "@nestjs/common";
import { DKGConnectorService } from "src/providers/DKGConnector/dkgConnector.service";
import { AssetRequest } from "./asset.request";

@Injectable()
export class AssetService {
    constructor(private readonly dkgConnector: DKGConnectorService) {};

    async publish(asset: AssetRequest) {
        let dkgAsset = this.mapToAsset(asset.content, asset.schema, asset.type);

        return await this.dkgConnector.dkgInstance.asset.create({public: dkgAsset}, {epochsNum: 2});
    }

    
      private mapToAsset(asset: Object, schema: string, type: string): Record<string, string> | any {        
        let newAsset = {};
        newAsset['@context'] = schema;
        newAsset['@type'] = type;

        Object.keys(asset).forEach( (key) => {
            const value = asset[key as keyof typeof asset];
            newAsset[key] = value;    
        } )
        
        Logger.debug('newAsset = ' + newAsset);
        
        return newAsset;
    }

}