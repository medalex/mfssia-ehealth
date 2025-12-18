import { Injectable, Logger } from "@nestjs/common";
import { DkgService } from "src/providers/DKGConnector/dkgConnector.service";
import { AssetRequest } from "./asset.request";

@Injectable()
export class AssetService {
    private readonly logger = new Logger(AssetService.name);    
    constructor(private readonly dkgService: DkgService) {};

    async publish(asset: AssetRequest) {
        const dkgAsset = this.mapToAsset(asset.content, asset.schema, asset.type);

        return await this.dkgService.dkg.asset.create({public: dkgAsset}, {epochsNum: 2});
    }

    
    private mapToAsset(asset: Object, schema: string, type: string): Record<string, unknown> {        
        const newAsset: Record<string, unknown> = {
        '@context': schema,
        '@type': type,
        };

        Object.keys(asset).forEach( (key) => {
            const value = asset[key as keyof typeof asset];
            newAsset[key] = value;    
        } )
        
        this.logger.debug('newAsset = ' + newAsset);
        
        return newAsset;
    }

    async find(property: string, value: string, schema: string, type: string): Promise<Object> {        
        const query = `
            PREFIX mfssia: <${schema}>
            PREFIX rdf: <http://www.w3.org/1999/02/22-rdf-syntax-ns#>
            SELECT ?s ?p ?o WHERE {
                ?s rdf:type mfssia:${type} .
                ?s mfssia:${property} '${value}' .
                ?s ?p ?o .
            }`;

        this.logger.debug(`Executing SPARQL query: ${query}`);

        const result = await this.dkgService.dkg.graph.query(query, "SELECT");

        this.logger.debug(`SPARQL query result: ${JSON.stringify(result)}`);

        return result.data;   
    }

    async fidByUal(ual: string): Promise<unknown> {
        return await this.dkgService.readAsset(ual)
    };
}