import { ApiProperty } from "@nestjs/swagger";
import { Expose } from "class-transformer";
import { IsNotEmpty } from "class-validator";

export class Contract {
    @ApiProperty()
    contractNo: string;
    @ApiProperty()
    producerNetwork: string;
    @ApiProperty()
    consumerNetwork: string;
    @ApiProperty()
    price:number;
    @ApiProperty()
    quantity: number;
    @ApiProperty()
    deliveryInterval: number;
    @ApiProperty()
    productName: string;
    @ApiProperty()
    uuid: string;
    @ApiProperty()
    timestamp: string;
}