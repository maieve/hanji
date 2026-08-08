export function pickColor(initialHex:string):Promise<string>{
 return new Promise(resolve=>{
  const input=document.createElement('input');input.type='color';input.value=/^#[0-9A-Fa-f]{6}$/.test(initialHex)?initialHex:'#20201E';input.style.position='fixed';input.style.opacity='0';document.body.appendChild(input);
  const finish=(value:string)=>{input.remove();resolve(value.toUpperCase())};
  input.addEventListener('change',()=>finish(input.value),{once:true});input.addEventListener('cancel',()=>finish(initialHex),{once:true});input.click();
 });
}
