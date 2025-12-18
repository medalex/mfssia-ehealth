import { Injectable, Logger } from "@nestjs/common";
import { DkgService } from "src/providers/DKGConnector/dkgConnector.service";
import { AssetRequest } from "./asset.request";

@Injectable()
export class AssetService {
    constructor(private readonly dkgConnector: DkgService) {};

    async publish(asset: AssetRequest) {
        let dkgAsset = this.mapToAsset(asset.content, asset.schema, asset.type);

        return await this.dkgConnector.dkg.asset.create({public: dkgAsset}, {epochsNum: 2});
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

    async find(
        property: string, 
        value: string, 
        schema: string, 
        type: string
    ): Promise<Object> {
        try {
            const query = `
                PREFIX mfssia: <${schema}>
                PREFIX rdf: <http://www.w3.org/1999/02/22-rdf-syntax-ns#>
                SELECT ?s ?p ?o WHERE {
                    ?s rdf:type mfssia:${type} .
                    ?s mfssia:${property} '${value}' .
                    ?s ?p ?o .
                }
            `;

            Logger.log(`Starting query: ${query}`);

            const result = await this.dkgConnector.dkg.graph.query(query, "SELECT");

            console.log(`Result of the query: ${result}`);

            return result.data;
        }
        catch (error) {
            throw new Error(error);
        }    
    }
}