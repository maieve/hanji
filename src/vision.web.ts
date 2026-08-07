type Result={text:string;words:{text:string;confidence:number;x:number;y:number;width:number;height:number}[]};
export async function recognizeDrawing(_data:string):Promise<Result>{return {text:'',words:[]}}
