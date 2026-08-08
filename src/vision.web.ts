type Result={text:string;words:{text:string;confidence:number;x:number;y:number;width:number;height:number;coordinateSpace?:'canvas'}[]};
export async function recognizeDrawing(_data:string):Promise<Result>{return {text:'',words:[]}}
export async function isLowPowerModeEnabled():Promise<boolean>{return false}
